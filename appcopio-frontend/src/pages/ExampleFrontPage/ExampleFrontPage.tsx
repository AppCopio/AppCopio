// src/pages/ExampleFrontPage/ExampleFrontPage.tsx
import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Link,
  Paper,
  Stack,
  Typography,
  Card,
  CardContent,
} from "@mui/material";

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

          {/* Grid responsivo sin <Grid/> de MUI */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(240px, 320px) 1fr",
              },
              columnGap: 2,
              rowGap: 3,
              alignItems: "baseline",
            }}
          >
            {ITEMS.map(({ label, variant, sample }) => (
              <React.Fragment key={variant}>
                <Box>
                  <Stack spacing={0.5}>
                    <Typography variant="bodySmallStrong">{label}</Typography>
                  </Stack>
                </Box>
                <Box>
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
                </Box>
              </React.Fragment>
            ))}
          </Box>
        </Paper>

        {/* HTML con clases globales (.ds-*) */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subheading">Clases globales (.ds-*)</Typography>
          <Divider sx={{ my: 2 }} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 3,
            }}
          >
            {/* Titulares (Montserrat) */}
            <Box>
              <div className="ds-titleHero">Title Hero — .ds-titleHero</div>
              <div className="ds-titlePage" style={{ marginTop: 8 }}>Title Page — .ds-titlePage</div>
              <div className="ds-subtitle" style={{ marginTop: 8 }}>Subtitle — .ds-subtitle</div>
              <div className="ds-heading" style={{ marginTop: 8 }}>Heading — .ds-heading</div>
              <div className="ds-subheading" style={{ marginTop: 8 }}>Subheading — .ds-subheading</div>
            </Box>

            {/* Cuerpo, enlaces y código (Inter) */}
            <Box>
              <p className="ds-bodyBase">Body Base — .ds-bodyBase</p>
              <p className="ds-bodyStrong" style={{ marginTop: 8 }}>Body Strong — .ds-bodyStrong</p>
              <p className="ds-bodyEmphasis" style={{ marginTop: 8 }}>Body Emphasis — .ds-bodyEmphasis</p>
              <p className="ds-bodySmall" style={{ marginTop: 8 }}>Body Small — .ds-bodySmall</p>
              <p className="ds-bodySmallStrong" style={{ marginTop: 8 }}>Body Small Strong — .ds-bodySmallStrong</p>

              <p className="ds-bodyBase" style={{ marginTop: 8 }}>
                Enlace:{" "}
                <a href="#" className="ds-bodyLink">.ds-bodyLink</a>
              </p>

              <code className="ds-bodyCode">GET /api/centers</code>
              <pre className="ds-bodyCode" style={{ marginTop: 8 }}>{`curl -X POST https://api.example.com/centers \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "Centro Las Condes", "is_active": true }'`}</pre>
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="bodySmall" sx={{ color: "text.secondary" }}>
              Estas clases vienen de <code>MuiCssBaseline.styleOverrides</code>. Puedes usarlas en cualquier etiqueta nativa.
            </Typography>
          </Box>
        </Paper>

        {/* Botones + otros componentes */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="heading" align="center">
            Buttons
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Rejilla fluida a base de CSS Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 3,
            }}
          >
            {/* A) MUI base */}
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

            {/* B) Solo tipografía */}
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

            {/* C) Nuestras variantes — span 2 columnas en md+ */}
            <Box sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subheading">Diseño (custom variants)</Typography>

                  {/* 1) Looks básicos (tamaño normal) */}
                  <Typography variant="bodySmallStrong" sx={{ mt: 2 }}>
                    Looks (tamaño normal)
                  </Typography>
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
                    <Button variant="textBare" size="small">textBare tiny</Button>
                    <Button variant="textBare" size="small">textBare small</Button>
                    <Button variant="textBare">textBare normal</Button>
                    <Button variant="textBare" size="large">textBare large</Button>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* D) Links & Chips */}
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

            {/* E) Bloque de código */}
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
          </Box>
        </Paper>
      </Stack>
    </Container>
  );
}
