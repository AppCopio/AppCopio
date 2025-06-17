// src/contexts/AuthContext.tsx
import { createContext, useState, useContext, type ReactNode } from 'react';

// La interfaz User no cambia
interface User {
  user_id: number;
  username: string;
  role: 'Emergencias' | 'Encargado';
  centerId?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // --- CAMBIO 1: INICIALIZACIÓN DEL ESTADO ---
  // Ahora, al iniciar, intentamos leer el usuario desde localStorage.
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = window.localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Error al leer el usuario del localStorage", error);
      return null;
    }
  });

  const login = (userData: User) => {
    // --- CAMBIO 2: GUARDAR EN LOCALSTORAGE AL HACER LOGIN ---
    try {
      window.localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Error al guardar el usuario en localStorage", error);
    }
  };

  const logout = () => {
    // --- CAMBIO 3: BORRAR DE LOCALSTORAGE AL HACER LOGOUT ---
    try {
      window.localStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error("Error al borrar el usuario de localStorage", error);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};