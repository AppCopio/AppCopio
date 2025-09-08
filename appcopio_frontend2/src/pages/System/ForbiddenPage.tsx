import * as React from "react";
import { Box, Typography, Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function ForbiddenPage() {
  return (
    <Box p={3} textAlign="center">
      <Typography variant="h4" gutterBottom>403 — Acceso denegado</Typography>
      <Typography color="text.secondary" paragraph>
        No tienes permisos para ver esta sección.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">Ir al inicio</Button>
    </Box>
  );
}
