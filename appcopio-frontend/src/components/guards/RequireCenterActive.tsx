import { useEffect } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useActivation } from "../../contexts/ActivationContext";
import ConfirmDialog from "../ConfirmDialog"; // Cambiar ruta por la real en Frontend2
import { createRoot } from "react-dom/client";

export default function RequireCenterActive(){  
  const { loading, activation } = useActivation();
  const navigate = useNavigate();  
  const { centerId } = useParams<{ centerId: string }>();  

  useEffect(() => {    
    if (!centerId) {      
      navigate("/centers", {       
        replace: true,        
        state: { toast: "Falta el identificador del centro." },
      });      
      return;    
    }    
    if (!loading && !activation) {   
      // TODO: mejorar control del usuario (actualmente solo redirige, no da la opción de cancelar y mantenerse en la página actual)   
      (async () => {
        await informarMotivoNavegación("Este centro no está activo actualmente."); 

        const uri = `/center/${encodeURIComponent(centerId)}/details`;
        navigate(uri, { replace: true, state: { toast: "Este centro no tiene una activación abierta." } });
      })();
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

function informarMotivoNavegación(message: React.ReactNode) {
  return new Promise<void>((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);

    const cleanup = () => {
      root.unmount();
      host.remove();
      resolve();
    };

    root.render(
      <ConfirmDialog
        open
        title="Centro cerrado"
        message={message}
        onClose={cleanup}
        onConfirm={cleanup}
        confirmText="Entendido"
        showCancel={false}
      />
    );
  });
}