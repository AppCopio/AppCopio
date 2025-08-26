// src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles: string[];
  checkSupportAdmin?: boolean;
  checkCenterAssignment?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  allowedRoles, 
  checkSupportAdmin = false, 
  checkCenterAssignment = false 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { centerId } = useParams<{ centerId: string }>();

  // Mientras se carga la sesión, no mostrar nada para evitar parpadeos
  if (isLoading) {
    return <div>Cargando...</div>; 
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Comprobación de rol base
  const hasRequiredRole = allowedRoles.includes(user.role_name);
  
  // Comprobación de permiso de Apoyo Administrador
  const isSupportAdmin = checkSupportAdmin && user.es_apoyo_admin;

  // Comprobación de asignación de centro
  // Esta se activa solo si la ruta tiene un :centerId y la regla está habilitada
  let isAssignedToCenter = true; // Asumimos que es verdad por defecto
  if (checkCenterAssignment && centerId) {
    // Un admin o apoyo puede acceder a cualquier centro. Un trabajador solo a los asignados.
    isAssignedToCenter = 
      user.role_name === 'Administrador' || 
      user.es_apoyo_admin || 
      user.assignedCenters.includes(centerId);
  }

  // El usuario tiene acceso si cumple con alguna de las condiciones de permiso
  // y, si es necesario, está asignado al centro.
  if ((hasRequiredRole || isSupportAdmin) && isAssignedToCenter) {
    return <Outlet />; // Si tiene permiso, muestra el contenido de la ruta
  } else {
    // Si no tiene permisos, lo redirigimos (podría ser a una página de "Acceso Denegado")
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;