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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Info as InfoIcon,
  People as FamilyIcon,
  Person as ManagerIcon,
  Storage as DatabaseIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { getActivationDetail } from '@/services/centers.service';
import { paths } from '@/routes/paths';
import type { ActivationDetail } from '@/types/center';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { isCancelError } from "@/lib/errors";

export default function ActivationDetailPage() {
  useScrollToTop({ behavior: 'smooth' });
  const { centerId, activationId } = useParams<{ centerId: string; activationId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ActivationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    if (!centerId || !activationId) return;
    
    const controller = new AbortController();
    loadDetail(controller.signal);
    
    return () => controller.abort();
  }, [centerId, activationId]);

  const loadDetail = async (signal?: AbortSignal) => {
  if (!centerId || !activationId) return;
  
  setLoading(true);
  setError(null);
  
  try {
    const data = await getActivationDetail(centerId, parseInt(activationId), signal);
    if (data) {
      setDetail(data);
    } else {
      setError('Activación no encontrada');
    }
  } catch (err: any) {
    // Ignorar errores de cancelación (AbortError o CanceledError)
     if (isCancelError(err)) {
      return;
    }
    setError('Error al cargar el detalle de la activación');
    console.error('Error loading activation detail:', err);
  } finally {
    setLoading(false);
  }
};

  const handleBack = () => {
    navigate(paths.center.activationsHistory(centerId!));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (days: number): string => {
    const wholeDays = Math.floor(days);
    const hours = Math.round((days - wholeDays) * 24);
    
    if (wholeDays === 0) {
      return `${hours} hora${hours !== 1 ? 's' : ''}`;
    }
    
    if (hours === 0) {
      return `${wholeDays} día${wholeDays !== 1 ? 's' : ''}`;
    }
    
    return `${wholeDays} día${wholeDays !== 1 ? 's' : ''} y ${hours} hora${hours !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !detail) {
    return (
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Alert severity="error">
          {error || 'No se pudo cargar el detalle de la activación'}
        </Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }} startIcon={<BackIcon />}>
          Volver al historial
        </Button>
      </Box>
    );
  }

  const isActive = detail.activation.ended_at === null;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <IconButton onClick={handleBack} size="small">
          <BackIcon />
        </IconButton>
        {isActive ? (
          <ActiveIcon sx={{ fontSize: 32, color: 'success.main' }} />
        ) : (
          <InactiveIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
        )}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h4" fontWeight="bold">
              Activación #{detail.activation.activation_id}
            </Typography>
            {isActive && (
              <Chip label="ACTIVA" color="success" size="small" />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {detail.activation.center_name}
          </Typography>
        </Box>
      </Stack>

      {/* Información General */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <InfoIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Información General
            </Typography>
          </Stack>

          <Stack spacing={2}>
            <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Inicio
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(detail.activation.started_at)}
                </Typography>
              </Box>

              {detail.activation.ended_at && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fin
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatDate(detail.activation.ended_at)}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Duración
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDuration(detail.activation.duration_days)}
                </Typography>
              </Box>
            </Stack>

            {detail.activation.notes && (
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Notas:
                </Typography>
                <Typography variant="body2">
                  {detail.activation.notes}
                </Typography>
              </Box>
            )}

            <Divider />

            <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Activado por
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {detail.activation.activated_by_name || 'N/A'}
                </Typography>
              </Box>

              {detail.activation.deactivated_by_name && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Desactivado por
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {detail.activation.deactivated_by_name}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Resumen Estadístico */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack alignItems="center" spacing={1}>
              <FamilyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="h4" fontWeight="bold">
                {detail.summary.total_families}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Familias
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack alignItems="center" spacing={1}>
              <FamilyIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
              <Typography variant="h4" fontWeight="bold">
                {detail.summary.total_people}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Personas
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack alignItems="center" spacing={1}>
              <ManagerIcon sx={{ fontSize: 40, color: 'info.main' }} />
              <Typography variant="h4" fontWeight="bold">
                {detail.summary.total_managers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Encargados
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Stack alignItems="center" spacing={1}>
              <DatabaseIcon sx={{ fontSize: 40, color: 'success.main' }} />
              <Typography variant="h4" fontWeight="bold">
                {detail.summary.total_databases}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bases de Datos
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Tabs con Detalle */}
      <Card>
        <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
          <Tab label={`Familias (${detail.families.length})`} icon={<FamilyIcon />} iconPosition="start" />
          <Tab label={`Encargados (${detail.managers.length})`} icon={<ManagerIcon />} iconPosition="start" />
          <Tab label={`Bases de Datos (${detail.databases.length})`} icon={<DatabaseIcon />} iconPosition="start" />
          <Tab label="Inventario" icon={<InventoryIcon />} iconPosition="start" />
        </Tabs>

        <CardContent>
          {/* Tab 0: Familias */}
          {currentTab === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Jefe de Hogar</TableCell>
                    <TableCell>RUT</TableCell>
                    <TableCell align="center">Miembros</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Observaciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.families.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No hay familias registradas en esta activación
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    detail.families.map((family) => (
                      <TableRow key={family.family_id}>
                        <TableCell>{family.family_id}</TableCell>
                        <TableCell>
                          {family.head_nombre} {family.head_apellido}
                        </TableCell>
                        <TableCell>{family.head_rut}</TableCell>
                        <TableCell align="center">{family.members_count}</TableCell>
                        <TableCell>
                          <Chip 
                            label={family.status} 
                            color={family.status === 'activo' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{family.observaciones || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 1: Encargados */}
          {currentTab === 1 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>RUT</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Inicio</TableCell>
                    <TableCell>Fin</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.managers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No hay encargados registrados
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    detail.managers.map((manager) => (
                      <TableRow key={manager.assignment_id}>
                        <TableCell>{manager.user_name}</TableCell>
                        <TableCell>{manager.user_rut || '-'}</TableCell>
                        <TableCell>{manager.user_phone || '-'}</TableCell>
                        <TableCell>
                          {new Date(manager.start_date).toLocaleDateString('es-CL')}
                        </TableCell>
                        <TableCell>
                          {manager.end_date 
                            ? new Date(manager.end_date).toLocaleDateString('es-CL')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={manager.end_date ? 'Finalizado' : 'Activo'}
                            color={manager.end_date ? 'default' : 'success'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 2: Bases de Datos */}
          {currentTab === 2 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="center">Registros</TableCell>
                    <TableCell>Creada el</TableCell>
                    <TableCell>Creada por</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.databases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No hay bases de datos creadas en esta activación
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    detail.databases.map((db) => (
                      <TableRow key={db.dataset_id}>
                       {/*<TableCell fontWeight="medium">{db.database_name}</TableCell>*/} 
                        <TableCell>{db.description || '-'}</TableCell>
                        <TableCell align="center">{db.records_count}</TableCell>
                        <TableCell>
                          {new Date(db.created_at).toLocaleDateString('es-CL')}
                        </TableCell>
                        <TableCell>{db.created_by_name || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 3: Inventario */}
          {currentTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Estadísticas de Movimientos de Inventario
              </Typography>
              
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Total de movimientos:</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {detail.inventory_stats.total_movements}
                  </Typography>
                </Stack>
                
                <Divider />
                
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Adiciones:</Typography>
                  <Typography variant="body1" color="success.main" fontWeight="medium">
                    +{detail.inventory_stats.additions}
                  </Typography>
                </Stack>
                
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Sustracciones:</Typography>
                  <Typography variant="body1" color="error.main" fontWeight="medium">
                    -{detail.inventory_stats.subtractions}
                  </Typography>
                </Stack>
                
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Ajustes:</Typography>
                  <Typography variant="body1" color="info.main" fontWeight="medium">
                    {detail.inventory_stats.adjustments}
                  </Typography>
                </Stack>
              </Stack>

              {detail.inventory_stats.total_movements === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No se registraron movimientos de inventario durante esta activación
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}