// src/components/auth/ProtectedRoute.tsx
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

  // 1. Mientras se carga la sesión, seguimos mostrando "Cargando..."
  if (isLoading) {
    return <div>Cargando...</div>; 
  }

  // --- INICIO DE LA LÓGICA MODIFICADA ---

  // 2. Si no estamos autenticados PERO SÍ tenemos conexión a internet,
  //    entonces estamos seguros de que debemos redirigir al login.
  if ((!isAuthenticated || !user) && navigator.onLine) {
    return <Navigate to="/login" replace />;
  }

  // 3. Si SÍ estamos autenticados, procedemos con todas las validaciones de roles y permisos.
  //    Este bloque solo se ejecuta si el objeto 'user' existe.
  if (isAuthenticated && user) {
    const hasRequiredRole = allowedRoles.includes(user.role_name);
    const isSupportAdmin = checkSupportAdmin && user.es_apoyo_admin;

    let isAssignedToCenter = true;
    if (checkCenterAssignment && centerId) {
      isAssignedToCenter = 
        user.role_name === 'Administrador' || 
        user.es_apoyo_admin || 
        (user.assignedCenters && user.assignedCenters.includes(centerId));
    }

    if ((hasRequiredRole || isSupportAdmin) && isAssignedToCenter) {
      return <Outlet />; // Tiene permiso, muestra el contenido.
    } else {
      // Está autenticado pero no tiene el rol/permiso, lo redirigimos.
      return <Navigate to="/" replace />;
    }
  }

  // 4. Caso final: si llegamos aquí, significa que NO estamos autenticados y NO hay internet.
  //    En este escenario, no hacemos nada y simplemente renderizamos <Outlet />.
  //    Confiamos en que el Service Worker mostrará el contenido de la página desde el caché.
  return <Outlet />;

  // --- FIN DE LA LÓGICA MODIFICADA ---
};

export default ProtectedRoute;