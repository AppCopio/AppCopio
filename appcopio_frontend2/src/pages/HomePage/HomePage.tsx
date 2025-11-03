// src/pages/HomePage/HomePage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Typography, Stack, Paper } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import LoginIcon from '@mui/icons-material/Login';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            textAlign: 'center',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}
        >
          {/* Logos en una línea */}
          <Stack
            direction="row"
            spacing={{ xs: 2, md: 4 }}
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: { xs: 2, md: 3 }, px: { xs: 1, md: 3 } }}
          >
            {/* Logo FESW - Izquierda */}
            <Box
              component="img"
              src="/logos/feria_logo.png"
              alt="FESW USM"
              sx={{
                height: { xs: 40, sm: 50, md: 60 },
                objectFit: 'contain',
                flex: '0 0 auto',
              }}
            />

            {/* Logo AppCopio - Centro (más grande) */}
            <Box
              component="img"
              src="/logos/cromatico_horizontal.png"
              alt="AppCopio"
              sx={{
                height: { xs: 50, sm: 65, md: 80 },
                objectFit: 'contain',
                flex: '1 1 auto',
                maxWidth: '300px',
              }}
            />

            {/* Logo DIDECO - Derecha */}
            <Box
              component="img"
              src="/logos/DIDECO.png"
              alt="DIDECO Valparaíso"
              sx={{
                height: { xs: 40, sm: 50, md: 60 },
                objectFit: 'contain',
                flex: '0 0 auto',
              }}
            />
          </Stack>

          {/* Título */}
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 600,
              color: '#1A2B4A',
              mb: 0.5,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            }}
          >
            Sistema de Gestión de Centros
          </Typography>
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{
              fontWeight: 500,
              color: 'text.secondary',
              mb: 0.5,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.5rem' },
            }}
          >
            de Albergues y Albergues Comunitarios
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              mb: { xs: 3, md: 4 },
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            Valparaíso
          </Typography>

          {/* Botones de Acción */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 2, md: 4 }}
            justifyContent="center"
            sx={{ mb: 2 }}
          >
            {/* Botón Ver Mapa */}
            <Paper
              elevation={3}
              sx={{
                p: { xs: 3, md: 4 },
                width: { xs: '100%', md: 280 },
                borderRadius: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <MapIcon
                sx={{
                  fontSize: { xs: 48, md: 56 },
                  color: 'primary.main',
                  mb: 1.5,
                }}
              />
              <Typography variant="h6" gutterBottom fontWeight={600} sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                Ver Mapa de Centros
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2, minHeight: { xs: 'auto', md: 40 }, fontSize: { xs: '0.85rem', md: '0.875rem' } }}
              >
                Comunidad: Consulta centros activos y necesidades
              </Typography>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => navigate('/map')}
                sx={{
                  py: 1.25,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: { xs: '0.9rem', md: '1rem' },
                }}
              >
                Ver Mapa
              </Button>
            </Paper>

            {/* Botón Acceso Municipal */}
            <Paper
              elevation={3}
              sx={{
                p: { xs: 3, md: 4 },
                width: { xs: '100%', md: 280 },
                borderRadius: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <LoginIcon
                sx={{
                  fontSize: { xs: 48, md: 56 },
                  color: 'secondary.main',
                  mb: 1.5,
                }}
              />
              <Typography variant="h6" gutterBottom fontWeight={600} sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                Acceso Municipal
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2, minHeight: { xs: 'auto', md: 40 }, fontSize: { xs: '0.85rem', md: '0.875rem' } }}
              >
                Gestiona albergues y recursos
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                fullWidth
                onClick={() => navigate('/login')}
                sx={{
                  py: 1.25,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: { xs: '0.9rem', md: '1rem' },
                }}
              >
                Iniciar Sesión
              </Button>
            </Paper>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default HomePage;