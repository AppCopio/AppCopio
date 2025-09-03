import React, { createContext, useContext, useEffect, useState } from "react";
import api, { setAccessToken } from "../lib/api";

type User = {
  user_id: number;
  nombre: string;
  imagen_perfil: string
  username: string;
  role_id: number;
  es_apoyo_admin: boolean;
  role_name: string;
  is_active: boolean;
} | null;

type Ctx = {
  isAuthenticated: boolean;
  user: User;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/auth/refresh");
        setAccessToken(data.access_token);
        setUser(data.user);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(username: string, password: string) {
    try {
      setIsLoading(true);
      const { data } = await api.post("/auth/login", {
        username,
        password,
      });
      setAccessToken(data.access_token);
      setUser(data.user);
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Credenciales inválidas.";
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    await api.post("/auth/logout");
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthCtx.Provider
      value={{ isAuthenticated: !!user, user, isLoading, login, logout }}
    >
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
