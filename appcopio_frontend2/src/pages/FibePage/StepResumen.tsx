// src/components/fibe/StepResumen.tsx
import * as React from "react";
import { Box, Typography, Card, CardContent, Divider } from "@mui/material";
import type { FormData } from "@/types/fibe";

type Props = { data: FormData };

export default function StepResumen({ data }: Props) {
  return (
    <Box display="grid" gap={3}>
      {/* --- HOGAR --- */}
      <Box>
        <Typography variant="h6" gutterBottom>Hogar</Typography>

        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          }}
        >
          <Box>
            <Typography variant="body2">
              <strong>Folio FIBE:</strong> {data.hogar.fibeFolio || "-"}
            </Typography>
          </Box>

          {/* Observaciones ocupa ancho completo */}
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              <strong>Observaciones:</strong> {data.hogar.observations || "-"}
            </Typography>
          </Box>

          {/* Necesidades ocupa ancho completo */}
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Typography variant="body2">
              <strong>Necesidades:</strong>{" "}
              {data.hogar.selectedNeeds.length
                ? data.hogar.selectedNeeds.join(", ")
                : "-"}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      {/* --- GRUPO FAMILIAR --- */}
      <Box>
        <Typography variant="h6" gutterBottom>Grupo familiar</Typography>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            alignItems: "stretch",
          }}
        >
          {data.personas.map((p, i) => {
            const fullName = `${p.nombre || ""} ${p.primer_apellido || ""} ${p.segundo_apellido || ""}`
              .replace(/\s+/g, " ")
              .trim();

            return (
              <Box key={i}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Persona {i + 1} — {i === 0 ? "Jefe de hogar" : p.parentesco || "Sin parentesco"}
                    </Typography>

                    <Typography variant="body2">
                      <strong>RUT:</strong> {p.rut || "-"}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Nombre:</strong> {fullName || "-"}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Nacionalidad:</strong>{" "}
                      {p.nacionalidad === "CH"
                        ? "Chilena"
                        : p.nacionalidad === "EXT"
                        ? "Extranjera"
                        : "-"}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Género:</strong> {p.genero || "-"}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Edad:</strong> {p.edad === "" ? "-" : p.edad}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Rubro:</strong> {p.rubro || "-"}
                    </Typography>

                    <Typography variant="body2">
                      <strong>Condiciones:</strong>{" "}
                      {[
                        p.estudia && "Estudia",
                        p.trabaja && "Trabaja",
                        p.perdida_trabajo && "Pérdida de trabajo",
                        p.discapacidad && "Discapacidad",
                        p.dependencia && "Dependencia",
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
