// src/pages/ExampleFrontPage/ExampleFrontPage.tsx
import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

type DSVariant =
  | "titleHero"
  | "titlePage"
  | "subtitle"
  | "heading"
  | "subheading"
  | "bodyBase"
  | "bodyStrong"
  | "bodyEmphasis"
  | "bodyLink"
  | "bodySmall"
  | "bodySmallStrong"
  | "bodyCode";

const ITEMS: { label: string; variant: DSVariant; sample?: string }[] = [
  { label: "Title Hero · 72/120", variant: "titleHero", sample: "Centros de Acopio" },
  { label: "Title Page · 48/120", variant: "titlePage", sample: "Gestión de Centros" },
  { label: "Subtitle · 32/120", variant: "subtitle", sample: "Resumen general" },
  { label: "Heading · 24/120", variant: "heading", sample: "Inventario" },
  { label: "Subheading · 20/120", variant: "subheading", sample: "Últimos movimientos" },
  {
    label: "Body Base · 16/140",
    variant: "bodyBase",
    sample: "Texto de párrafo base para leer contenidos y descripciones.",
  },
  {
    label: "Body Strong · 16/140",
    variant: "bodyStrong",
    sample: "Texto con énfasis en peso para resaltar información.",
  },
  {
    label: "Body Emphasis · 16/140",
    variant: "bodyEmphasis",
    sample: "Texto en énfasis con estilo cursiva.",
  },
  {
    label: "Body Link · 16/140",
    variant: "bodyLink",
    sample: "Enlace de navegación o acción contextual.",
  },
  { label: "Body Small · 14/140", variant: "bodySmall", sample: "Texto auxiliar, metadatos o notas." },
  { label: "Body Small Strong · 14/140", variant: "bodySmallStrong", sample: "Texto auxiliar con énfasis." },
  { label: "Body Code · 16/100", variant: "bodyCode", sample: "GET /api/centers?active=true" },
];

export default function ExampleFrontPage() {
  const theme = useTheme();

  return (
    <Container sx={{ py: 6 }}>
      <Stack spacing={4}>
        {/* Encabezado */}
        <Box>
          <Typography variant="titlePage">Guía de Tipografía</Typography>
          <Typography variant="bodyBase" sx={{ mt: 1 }}>
            Vista previa de las variantes del <strong>Simple Design System</strong> usando{" "}
            <em>Montserrat</em> (títulos) e <em>Inter</em> (cuerpo).
          </Typography>
        </Box>

        {/* Variantes tipográficas */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subheading">Variantes</Typography>
          <Divider sx={{ my: 2 }} />
          <Stack spacing={3}>
            {ITEMS.map(({ label, variant, sample }) => {
              const spec = (theme.typography as any)[variant] || {};
              return (
                <Box key={variant}>
                  <Grid container spacing={2} alignItems="baseline">
                    <Grid item xs={12} md={3}>
                      <Stack spacing={0.5}>
                        <Typography variant="bodySmallStrong">{label}</Typography>
                        <Typography variant="bodySmall" sx={{ color: "text.secondary" }}>
                          {[
                            spec.fontFamily ? `font: ${spec.fontFamily}` : null,
                            spec.fontSize ? `size: ${spec.fontSize}` : null,
                            spec.lineHeight ? `lh: ${spec.lineHeight}` : null,
                            spec.fontWeight ? `w: ${spec.fontWeight}` : null,
                            spec.letterSpacing ? `ls: ${spec.letterSpacing}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} md={9}>
                      <Typography
                        variant={variant as any}
                        sx={
                          variant === "bodyCode"
                            ? {
                                display: "inline-block",
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: "action.hover",
                              }
                            : undefined
                        }
                      >
                        {sample || "Texto de ejemplo"}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              );
            })}
          </Stack>
        </Paper>

        {/* Botones + otros componentes */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="heading" align="center">
            Buttons
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={3}>
            {/* A) MUI base */}
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subheading">MUI base</Typography>
                  <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                    <Button variant="contained">Primario</Button>
                    <Button variant="outlined">Secundario</Button>
                    <Button variant="text">Texto</Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* B) Solo tipografía */}
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subheading">Tipografía aplicada</Typography>
                  <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                    <Button sx={(t) => t.typography.subheading}>Subheading</Button>
                    <Button sx={(t) => t.typography.bodyStrong}>Body Strong</Button>
                    <Button sx={(t) => t.typography.bodySmall}>Body Small</Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

{/* C) Nuestras variantes */}
<Grid item xs={12} md={8}>
  <Card variant="outlined">
    <CardContent>
      <Typography variant="subheading">Diseño (custom variants)</Typography>

      {/* 1) Looks básicos (tamaño normal) */}
      <Typography variant="bodySmallStrong" sx={{ mt: 2 }}>Looks (tamaño normal)</Typography>
      <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
        <Button>brand (default)</Button>
        <Button variant="softGray">softGray</Button>
        <Button variant="outlineGray">outlineGray</Button>
        <Button variant="textBare">textBare</Button>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* 2) brand con tamaños */}
      <Typography variant="bodySmallStrong">brand con tamaños</Typography>
      <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
        <Button size="small">brand small</Button>
        <Button>brand normal</Button>
        <Button size="large">brand large</Button>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* 3) textBare con tamaños */}
      <Typography variant="bodySmallStrong">textBare con tamaños</Typography>
      <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
        <Button variant="textBare" size="tiny">textBare tiny</Button>
        <Button variant="textBare" size="small">textBare small</Button>
        <Button variant="textBare">textBare normal</Button>
        <Button variant="textBare" size="large">textBare large</Button>
      </Stack>
    </CardContent>
  </Card>
</Grid>


            {/* D) Links & Chips */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="heading">Links & Chips</Typography>
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Typography variant="bodyBase">
                      Este es un <Link href="#" variant="bodyLink">enlace de ejemplo</Link> dentro de un párrafo.
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip label="Etiqueta (bodySmallStrong)" />
                      <Chip label="Otro Chip" variant="outlined" />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* E) Bloque de código */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="heading">Bloque de código (bodyCode)</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="bodyCode"
                      component="pre"
                      sx={{ p: 2, borderRadius: 1, bgcolor: "action.hover", overflow: "auto" }}
                    >{`curl -X POST https://api.example.com/centers \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "Centro Las Condes", "is_active": true }'`}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      </Stack>
    </Container>
  );
}
