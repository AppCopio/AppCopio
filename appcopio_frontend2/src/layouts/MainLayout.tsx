import * as React from "react";
import { Outlet } from "react-router-dom";
import { Box, LinearProgress } from "@mui/material";
import Navbar from "@/components/layout/navbar/Navbar";
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
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <Box component="main" sx={{ p: { xs: 2, md: 3 }, flex: 1 }}>
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
