// src/components/auth/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

type Props = {
  allowedRoleIds: number[];      
  checkSupportAdmin?: boolean;   
};

export default function ProtectedRoute({ allowedRoleIds, checkSupportAdmin }: Props) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return null; 

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isSupport = (user as any)?.es_apoyo_admin === true;
  const allowed = allowedRoleIds.includes(user.role_id) || (checkSupportAdmin && isSupport);

  if (!allowed) return <Navigate to="/" replace />;

  return <Outlet />;
}
