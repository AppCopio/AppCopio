// src/contexts/AuthContext.tsx
import * as React from "react";
import { setAccessToken,api } from "@/lib/api"; // usa default/named según tu lib
import type { User } from "@/types/user";

const STORAGE_TOKEN_KEY = "appcopio:access_token";
const STORAGE_REFRESH_TOKEN_KEY = "appcopio:refresh_token";
const STORAGE_USER_KEY  = "appcopio:user";

type AuthContextState = {
  user: User | null;
  isAuthenticated: boolean;
  loadingAuth: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
};

const AuthCtx = React.createContext<AuthContextState>({} as AuthContextState);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = React.useState(true);

  // 🚫 Sin refresh: solo rehidratamos desde storage al montar
  React.useEffect(() => {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    const userStr = localStorage.getItem(STORAGE_USER_KEY);
    if (token) setAccessToken(token);
    if (userStr) setUser(JSON.parse(userStr));
    setLoadingAuth(false);
  }, []);

  async function login(username: string, password: string) {
    setLoadingAuth(true);
    try {
      const { data } = await api.post<{ 
        access_token: string; 
        refresh_token?: string; 
        user: User 
      }>("/auth/login", {
        username,
        password,
      });
      
      setAccessToken(data.access_token);
      setUser(data.user);
      localStorage.setItem(STORAGE_TOKEN_KEY, data.access_token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
      
      // Guardar refresh token si existe
      if (data.refresh_token) {
        localStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, data.refresh_token);
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Credenciales inválidas.";
      throw new Error(msg);
    } finally {
      setLoadingAuth(false);
    }
  }

  async function refreshToken(): Promise<boolean> {
    try {
      const refreshTokenValue = localStorage.getItem(STORAGE_REFRESH_TOKEN_KEY);
      if (!refreshTokenValue) {
        console.warn('[AuthContext] No refresh token available');
        return false;
      }

      const { data } = await api.post<{
        access_token: string;
        refresh_token?: string;
        user?: User;
      }>("/auth/refresh", {
        refresh_token: refreshTokenValue,
      });

      setAccessToken(data.access_token);
      localStorage.setItem(STORAGE_TOKEN_KEY, data.access_token);
      
      // Actualizar refresh token si viene uno nuevo
      if (data.refresh_token) {
        localStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, data.refresh_token);
      }
      
      // Actualizar user si viene actualizado
      if (data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
      }

      console.log('[AuthContext] ✅ Token refreshed successfully');
      return true;
    } catch (e: any) {
      console.error('[AuthContext] ❌ Failed to refresh token:', e);
      
      // Si el refresh falló, probablemente el refresh token expiró
      if (e?.response?.status === 401) {
        console.warn('[AuthContext] 🚨 Refresh token expired - logging out');
        await logout();
      }
      
      return false;
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_REFRESH_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    }
  }

  return (
    <AuthCtx.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loadingAuth,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => React.useContext(AuthCtx);
