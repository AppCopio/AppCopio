// src/components/fibe/StepResumen.tsx
import * as React from "react";
import { Box, Typography, Grid, Card, CardContent, Divider } from "@mui/material";
import type { FormData } from "../../types/fibe";

export default function StepResumen({ data }: { data: FormData }) {
  return (
    <Box display="grid" gap={3}>
      <Box>
        <Typography variant="h6" gutterBottom>Hogar</Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2"><strong>Folio FIBE:</strong> {data.hogar.fibeFolio || "-"}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              <strong>Observaciones:</strong> {data.hogar.observations || "-"}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2">
              <strong>Necesidades:</strong> {data.hogar.selectedNeeds.length ? data.hogar.selectedNeeds.join(", ") : "-"}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom>Grupo familiar</Typography>
        <Grid container spacing={2}>
          {data.personas.map((p, i) => (
            <Grid key={i} item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Persona {i + 1} — {i === 0 ? "Jefe de hogar" : p.parentesco || "Sin parentesco"}
                  </Typography>
                  <Typography variant="body2"><strong>RUT:</strong> {p.rut || "-"}</Typography>
                  <Typography variant="body2">
                    <strong>Nombre:</strong> {`${p.nombre || "-"} ${p.primer_apellido || ""} ${p.segundo_apellido || ""}`.trim()}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nacionalidad:</strong>{" "}
                    {p.nacionalidad === "CH" ? "Chilena" : p.nacionalidad === "EXT" ? "Extranjera" : "-"}
                  </Typography>
                  <Typography variant="body2"><strong>Género:</strong> {p.genero || "-"}</Typography>
                  <Typography variant="body2"><strong>Edad:</strong> {p.edad === "" ? "-" : p.edad}</Typography>
                  <Typography variant="body2"><strong>Rubro:</strong> {p.rubro || "-"}</Typography>
                  <Typography variant="body2">
                    <strong>Condiciones:</strong>{" "}
                    {[
                      p.estudia && "Estudia",
                      p.trabaja && "Trabaja",
                      p.perdida_trabajo && "Pérdida de trabajo",
                      p.discapacidad && "Discapacidad",
                      p.dependencia && "Dependencia",
                    ].filter(Boolean).join(", ") || "-"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
