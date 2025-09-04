import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useActivation } from "../../contexts/ActivationContext";

export default function RequireCenterActive({ redirectTo = "../details" }: { redirectTo?: string }) {
  const { loading, activation } = useActivation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !activation) {
      navigate(redirectTo, { replace: true, state: { toast: "Este centro no tiene una activación abierta." } });
    }
  }, [loading, activation, navigate, redirectTo]);

  if (loading) {
    return (
      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"center", height: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si hay activación, deja pasar a las subrutas
  return <Outlet />;
}
