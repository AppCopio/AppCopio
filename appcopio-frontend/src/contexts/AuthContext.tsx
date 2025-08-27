// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Se actualiza la interfaz del Usuario para incluir el token
interface User {
  user_id: number;
  username: string;
  role_name: string; // Ej: 'Administrador', 'Trabajador Municipal'
  es_apoyo_admin: boolean;
  assignedCenters: string[]; // Un arreglo con los IDs de los centros asignados
  token: string; // ¡Este es el campo que nos faltaba!
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Al cargar la app, se revisa si hay una sesión guardada en localStorage
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        // Se parsea el usuario guardado y se establece en el estado
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error al cargar la sesión del usuario:", error);
      localStorage.removeItem('user'); // Limpia el storage si está corrupto
    } finally {
      setIsLoading(false); // Termina la carga
    }
  }, []);

  // La función login ahora espera el objeto User completo, incluyendo el token
  const login = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
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