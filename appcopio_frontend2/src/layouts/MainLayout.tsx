import * as React from "react";
import { Outlet } from "react-router-dom";
import { Box, LinearProgress } from "@mui/material";
import VerticalNavbar, { DRAWER_WIDTH, DRAWER_WIDTH_COLLAPSED, APP_BAR_HEIGHT } from "@/components/layout/navbar/Navbar";
import { OfflineNotificationContainer, useAutoNotifications } from "@/offline/OfflineNotifications";

function PageFallback() {
  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pt: 1 }}>
      <LinearProgress />
    </Box>
  );
}

function MainLayoutContent() {
  // Hook que escucha eventos offline y muestra notificaciones
  useAutoNotifications();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <VerticalNavbar />
      
      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          // Ancho ajustado para el drawer
          width: { 
            xs: "100%", // En móvil ocupa todo el ancho
            md: `calc(100% - ${DRAWER_WIDTH}px)` // En desktop se ajusta al drawer
          },
          // Margen superior para el AppBar en móvil
          mt: { xs: `${APP_BAR_HEIGHT}px`, md: 0 },
          transition: (theme) =>
            theme.transitions.create(["width", "margin"], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        <React.Suspense fallback={<PageFallback />}>
          <Outlet />
        </React.Suspense>
      </Box>

      {/* Contenedor de notificaciones offline */}
      <OfflineNotificationContainer />
    </Box>
  );
}

export default function MainLayout() {
  return <MainLayoutContent />;
}