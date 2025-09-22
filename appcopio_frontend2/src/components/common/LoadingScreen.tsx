import * as React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

export default function LoadingScreen() {
  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "80vh", gap: 3 }}>
      <CircularProgress />
    </Box>
  );
}
