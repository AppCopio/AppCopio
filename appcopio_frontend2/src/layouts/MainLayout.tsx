import * as React from "react";
import { Outlet } from "react-router-dom";
import { Box, LinearProgress } from "@mui/material";
import Navbar from "@/components/layout/navbar/Navbar";
import OfflineBanner from "@/components/common/OfflineBanner";

function PageFallback() {
  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pt: 1 }}>
      <LinearProgress />
    </Box>
  );
}

export default function MainLayout() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <OfflineBanner />
      <Box component="main" sx={{ p: { xs: 2, md: 3 }, flex: 1 }}>
        <React.Suspense fallback={<PageFallback />}>
          <Outlet />
        </React.Suspense>
      </Box>
    </Box>
  );
}
