import { useEffect } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useActivation } from "../../contexts/ActivationContext";

type Props = {
  redirectTo?: (centerId: string) => string;
};

export default function RequireCenterActive({ redirectTo }: Props){
  const { loading, activation } = useActivation();
  const navigate = useNavigate();
 
  const { centerId } = useParams<{ centerId: string }>();
  const path = redirectTo ? redirectTo(centerId) : `/center/${centerId}/details`;

  useEffect(() => {
    if (!loading && !activation) {
      navigate(path, { replace: true, state: { toast: "Este centro no tiene una activación abierta." } });
    }
  }, [loading, activation, navigate, centerId]);

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