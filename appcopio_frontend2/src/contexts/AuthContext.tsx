// src/contexts/AuthContext.tsx
import * as React from "react";
import { setAccessToken, api } from "@/lib/api";
import type { User } from "@/types/user";

const STORAGE_TOKEN_KEY = "appcopio:access_token";
const STORAGE_REFRESH_TOKEN_KEY = "appcopio:refresh_token";
const STORAGE_USER_KEY = "appcopio:user";

// Verificar validez del token cada 5 minutos
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000;

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
  const tokenCheckIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Rehidratar desde storage al montar
  React.useEffect(() => {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    const userStr = localStorage.getItem(STORAGE_USER_KEY);
    if (token) setAccessToken(token);
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error('[AuthContext] Error al parsear usuario del storage:', e);
        localStorage.removeItem(STORAGE_USER_KEY);
      }
    }
    setLoadingAuth(false);
  }, []);

  // Verificación periódica de la validez del token
  React.useEffect(() => {
    if (!user) {
      // Si no hay usuario, no verificar
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
      return;
    }

    // Verificar inmediatamente al montar si hay usuario
    checkTokenValidity();

    // Configurar verificación periódica
    tokenCheckIntervalRef.current = setInterval(() => {
      checkTokenValidity();
    }, TOKEN_CHECK_INTERVAL);

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
      }
    };
  }, [user]);

  async function checkTokenValidity() {
    try {
      // Intentar hacer una petición simple para verificar el token
      await api.get('/auth/me');
      // Token válido
    } catch (error: any) {
      if (error?.response?.status === 401) {
        console.warn('[AuthContext] 🚨 Token inválido detectado en verificación periódica');
        // El interceptor de api.ts ya intentará renovar automáticamente
        // Si eso falla, manejará el logout
      }
    }
  }

  async function login(username: string, password: string) {
    setLoadingAuth(true);
    try {
      const { data } = await api.post<{
        access_token: string;
        refresh_token?: string;
        user: User;
      }>("/auth/login", {
        username,
        password,
      });

      setAccessToken(data.access_token);
      setUser(data.user);
      localStorage.setItem(STORAGE_TOKEN_KEY, data.access_token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));

      // Guardar refresh token si existe (aunque usamos cookies httpOnly)
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
      console.log('[AuthContext] 🔄 Intentando renovar token...');

      // El refresh token está en cookie httpOnly, no necesitamos enviarlo
      const { data } = await api.post<{
        access_token: string;
        refresh_token?: string;
        user?: User;
      }>("/auth/refresh");

      setAccessToken(data.access_token);
      localStorage.setItem(STORAGE_TOKEN_KEY, data.access_token);

      // Actualizar refresh token si viene uno nuevo (aunque usamos cookies)
      if (data.refresh_token) {
        localStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, data.refresh_token);
      }

      // Actualizar user si viene actualizado
      if (data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
      }

      console.log('[AuthContext] ✅ Token renovado exitosamente');
      return true;
    } catch (e: any) {
      console.error('[AuthContext] ❌ Error al renovar token:', e);

      // Si el refresh falló, la sesión expiró definitivamente
      if (e?.response?.status === 401) {
        console.warn('[AuthContext] 🚨 Refresh token expirado - cerrando sesión');
        await logout();
      }

      return false;
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error('[AuthContext] Error al hacer logout en backend:', error);
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
