// src/contexts/AuthContext.tsx
import * as React from "react";
import { setAccessToken,api } from "@/lib/api"; // usa default/named según tu lib
import type { User } from "@/types/user";

const STORAGE_TOKEN_KEY = "appcopio:access_token";
const STORAGE_USER_KEY  = "appcopio:user";

type AuthContextState = {
  user: User | null;
  isAuthenticated: boolean;
  loadingAuth: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
      const { data } = await api.post<{ access_token: string; user: User }>("/auth/login", {
        username,
        password,
      });
      setAccessToken(data.access_token);
      setUser(data.user);
      localStorage.setItem(STORAGE_TOKEN_KEY, data.access_token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
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

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
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
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => React.useContext(AuthCtx);
