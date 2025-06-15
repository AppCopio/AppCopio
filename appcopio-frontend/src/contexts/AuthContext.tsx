// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, type ReactNode } from 'react';
// 1. Definimos la "forma" de nuestro usuario y del contexto
interface User {
  username: string;
  role: 'Emergencias' | 'Encargado';
  centerId?: string | null; // El ID del centro, opcional
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// 2. Creamos el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Creamos el "Proveedor" que envolverá nuestra aplicación
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (userData: User) => {
    setUser(userData);
    // En un futuro, aquí guardaríamos el token en localStorage
  };

  const logout = () => {
    setUser(null);
    // En un futuro, aquí borraríamos el token
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

// 4. Creamos un "hook" personalizado para usar el contexto fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};