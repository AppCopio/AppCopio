import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/common/LoadingScreen";

type Props = {
  children: React.ReactNode;
  roles?: number[]; 
};

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, loadingAuth } = useAuth();
  console.log(user);
  const location = useLocation();

  if (loadingAuth) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.role_id)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
