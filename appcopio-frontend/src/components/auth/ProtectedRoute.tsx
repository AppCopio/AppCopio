// src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Definimos qué props puede recibir nuestro guardián
interface ProtectedRouteProps {
  allowedRoles: Array<'Emergencias' | 'Encargado'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  // 1. Chequeo: ¿Está el usuario autenticado?
  if (!isAuthenticated) {
    // Si no, lo redirigimos al login. 
    // 'replace' evita que el usuario pueda volver a la página protegida con el botón "atrás" del navegador.
    return <Navigate to="/login" replace />;
  }

  // 2. Chequeo: ¿Tiene el usuario el rol permitido para esta ruta?
  // Usamos 'user?' para asegurarnos de que user no sea null antes de acceder a 'role'
  if (user && !allowedRoles.includes(user.role)) {
    // Si no tiene el rol, lo redirigimos a una página de "No Autorizado" o al inicio.
    // Por ahora, lo enviaremos al inicio.
    console.warn(`Acceso denegado: El rol '${user.role}' no tiene permiso.`);
    return <Navigate to="/" replace />;
  }

  // 3. Si pasó ambos chequeos, le permitimos ver el contenido.
  // <Outlet /> renderizará la ruta hija que esté protegida (ej. AdminLayout o CenterLayout).
  return <Outlet />;
};

export default ProtectedRoute;