// =======================================================
// COMPONENTE: Lista de Historial de Activaciones
// Ubicación: appcopio_frontend2/src/pages/activations/ActivationsHistoryPage.tsx
// =======================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  History as HistoryIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  People as PeopleIcon,
  Group as FamilyIcon,
  Person as ManagerIcon,
  Storage as DatabaseIcon,
  Visibility as ViewIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { getCenterActivationsHistory } from '@/services/centers.service';
import { paths } from '@/routes/paths';
import type { ActivationHistoryItem } from '@/types/center';
import { useScrollToTop } from '@/hooks/useScrollToTop';

export default function ActivationsHistoryPage() {
  useScrollToTop({ behavior: 'smooth' });
  const { centerId } = useParams<{ centerId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [activations, setActivations] = useState<ActivationHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) return;
    
    const controller = new AbortController();
    loadActivations(controller.signal);
    
    return () => controller.abort();
  }, [centerId]);

  const loadActivations = async (signal?: AbortSignal) => {
    if (!centerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getCenterActivationsHistory(centerId, signal);
      setActivations(data);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Error al cargar el historial de activaciones');
        console.error('Error loading activations:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (activationId: number) => {
    navigate(paths.center.activationDetail(centerId!, activationId));
  };

  const handleBack = () => {
    navigate(paths.center.details(centerId!));
  };

  const formatDuration = (days: number): string => {
    if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours}h`;
    }
    return `${Math.floor(days)} días`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <IconButton onClick={handleBack} size="small">
            <BackIcon />
          </IconButton>
          <HistoryIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Historial de Activaciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activations.length} activación{activations.length !== 1 ? 'es' : ''} registrada{activations.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Empty State */}
      {activations.length === 0 && !error && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No hay activaciones registradas
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Este centro aún no ha sido activado
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Lista de Activaciones */}
      <Stack spacing={2}>
        {activations.map((activation, index) => {
          const isActive = activation.ended_at === null;
          const isFirst = index === 0;

          return (
            <Card 
              key={activation.activation_id}
              sx={{
                borderLeft: isActive ? '4px solid' : '4px solid transparent',
                borderLeftColor: isActive ? 'success.main' : 'transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  {/* Header de la activación */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box>
                        {isActive ? (
                          <ActiveIcon sx={{ color: 'success.main', fontSize: 32 }} />
                        ) : (
                          <InactiveIcon sx={{ color: 'text.disabled', fontSize: 32 }} />
                        )}
                      </Box>
                      
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="h6" fontWeight="bold">
                            Activación #{activation.activation_id}
                          </Typography>
                          {isActive && (
                            <Chip 
                              label="ACTIVA" 
                              color="success" 
                              size="small"
                              sx={{ fontWeight: 'bold' }}
                            />
                          )}
                          {isFirst && !isActive && (
                            <Chip 
                              label="MÁS RECIENTE" 
                              color="info" 
                              size="small"
                            />
                          )}
                        </Stack>
                        
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(activation.started_at)} 
                          {activation.ended_at && ` - ${formatDate(activation.ended_at)}`}
                          {isActive && ' - Actualidad'}
                        </Typography>
                      </Box>
                    </Stack>

                    <Button
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      onClick={() => handleViewDetail(activation.activation_id)}
                      size="small"
                    >
                      Ver Detalle
                    </Button>
                  </Stack>

                  <Divider />

                  {/* Estadísticas */}
                  <Stack 
                    direction="row" 
                    spacing={3}
                    sx={{ 
                      flexWrap: 'wrap',
                      gap: 2
                    }}
                  >
                    <Tooltip title="Duración total">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <HistoryIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="medium">
                          {formatDuration(activation.duration_days)}
                        </Typography>
                      </Stack>
                    </Tooltip>

                    <Tooltip title="Personas albergadas">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PeopleIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="medium">
                          {activation.total_people} persona{activation.total_people !== 1 ? 's' : ''}
                        </Typography>
                      </Stack>
                    </Tooltip>

                    <Tooltip title="Familias albergadas">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <FamilyIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="medium">
                          {activation.total_families} familia{activation.total_families !== 1 ? 's' : ''}
                        </Typography>
                      </Stack>
                    </Tooltip>

                    <Tooltip title="Encargados asignados">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <ManagerIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="medium">
                          {activation.total_managers} encargado{activation.total_managers !== 1 ? 's' : ''}
                        </Typography>
                      </Stack>
                    </Tooltip>

                    {activation.total_databases > 0 && (
                      <Tooltip title="Bases de datos creadas">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <DatabaseIcon fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight="medium">
                            {activation.total_databases} BD
                          </Typography>
                        </Stack>
                      </Tooltip>
                    )}
                  </Stack>

                  {/* Notas */}
                  {activation.notes && (
                    <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Notas:
                      </Typography>
                      <Typography variant="body2">
                        {activation.notes}
                      </Typography>
                    </Box>
                  )}

                  {/* Footer con información de quién activó/desactivó */}
                  <Stack 
                    direction="row" 
                    justifyContent="space-between"
                    sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Activado por: <strong>{activation.activated_by_name || 'N/A'}</strong>
                    </Typography>
                    {activation.deactivated_by_name && (
                      <Typography variant="caption" color="text.secondary">
                        Desactivado por: <strong>{activation.deactivated_by_name}</strong>
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}