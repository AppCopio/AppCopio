import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Select,
  MenuItem,
  FormControl,
  Stack,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CheckCircle as AcceptedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
  Contacts as ContactedIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { volunteerService } from '@/services/volunteer.service';
import type { VolunteerContactResponse, VolunteerStatus } from '@/types/volunteer';

interface VolunteerContactPanelProps {
  activationId: number;
}

const STATUS_OPTIONS: VolunteerStatus[] = ['pendiente', 'contactado', 'aceptado', 'rechazado'];

const getStatusColor = (status: VolunteerStatus): 'success' | 'error' | 'info' | 'warning' => {
  switch (status) {
    case 'aceptado': return 'success';
    case 'rechazado': return 'error';
    case 'contactado': return 'info';
    case 'pendiente': return 'warning';
    default: return 'warning';
  }
};

const getStatusIcon = (status: VolunteerStatus) => {
  switch (status) {
    case 'aceptado': return <AcceptedIcon fontSize="small" />;
    case 'rechazado': return <RejectedIcon fontSize="small" />;
    case 'contactado': return <ContactedIcon fontSize="small" />;
    case 'pendiente': return <PendingIcon fontSize="small" />;
    default: return <PendingIcon fontSize="small" />;
  }
};

export default function VolunteerContactPanel({ activationId }: VolunteerContactPanelProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<VolunteerStatus | 'todos'>('todos');

  const {
    data: volunteers,
    isLoading,
    error,
    refetch
  } = useQuery<VolunteerContactResponse[], Error>({
    queryKey: ['volunteerContacts', activationId],
    queryFn: () => volunteerService.getVolunteerContactsByActivation(activationId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { volunteerId: string; status: VolunteerStatus; notes: string | undefined }) =>
      volunteerService.updateVolunteerContactStatus(data.volunteerId, data.status, data.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteerContacts', activationId] });
    },
    onError: (err: any) => {
      console.error('Error al actualizar estado:', err);
      alert('Error al actualizar: ' + (err.response?.data?.error || err.message));
    },
  });

  // Estadísticas
  const stats = useMemo(() => {
    if (!volunteers) return null;
    return {
      total: volunteers.length,
      pendiente: volunteers.filter(v => v.status === 'pendiente').length,
      contactado: volunteers.filter(v => v.status === 'contactado').length,
      aceptado: volunteers.filter(v => v.status === 'aceptado').length,
      rechazado: volunteers.filter(v => v.status === 'rechazado').length,
    };
  }, [volunteers]);

  // Filtrado
  const filteredVolunteers = useMemo(() => {
    if (!volunteers) return [];
    let filtered = volunteers;

    if (statusFilter !== 'todos') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.nombre.toLowerCase().includes(term) ||
        v.email.toLowerCase().includes(term) ||
        v.celular.includes(term)
      );
    }

    return filtered;
  }, [volunteers, statusFilter, searchTerm]);

  const handleStatusChange = (volunteerId: string, newStatus: VolunteerStatus) => {
    updateStatusMutation.mutate({ volunteerId, status: newStatus, notes: undefined });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error al cargar datos: {error.message}
      </Alert>
    );
  }

  if (!volunteers || volunteers.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <EmailIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No hay solicitudes de voluntarios
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Cuando los ciudadanos completen el formulario, aparecerán aquí
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Estadísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats?.total}</Typography>
                  <Typography variant="body2">Total</Typography>
                </Box>
                <TrendingIcon sx={{ fontSize: 40, opacity: 0.3 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid>
          <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats?.pendiente}</Typography>
                  <Typography variant="body2">Pendientes</Typography>
                </Box>
                <PendingIcon sx={{ fontSize: 40, opacity: 0.3 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid>
          <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats?.contactado}</Typography>
                  <Typography variant="body2">Contactados</Typography>
                </Box>
                <ContactedIcon sx={{ fontSize: 40, opacity: 0.3 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats?.aceptado}</Typography>
                  <Typography variant="body2">Aceptados</Typography>
                </Box>
                <AcceptedIcon sx={{ fontSize: 40, opacity: 0.3 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid>
          <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats?.rechazado}</Typography>
                  <Typography variant="body2">Rechazados</Typography>
                </Box>
                <RejectedIcon sx={{ fontSize: 40, opacity: 0.3 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <Tabs
            value={statusFilter}
            onChange={(_, v) => setStatusFilter(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Todos" value="todos" />
            <Tab label="Pendientes" value="pendiente" />
            <Tab label="Contactados" value="contactado" />
            <Tab label="Aceptados" value="aceptado" />
            <Tab label="Rechazados" value="rechazado" />
          </Tabs>

          <Tooltip title="Actualizar">
            <IconButton onClick={() => refetch()} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Tabla */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>Nombre</TableCell>
                <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>Contacto</TableCell>
                <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>Capacitaciones</TableCell>
                <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>Servicios</TableCell>
                <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>Notas</TableCell>
                <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>Fecha</TableCell>
                <TableCell sx={{ bgcolor: 'grey.100', fontWeight: 'bold', textAlign: 'center' }}>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVolunteers.map((volunteer) => (
                <TableRow 
                  key={volunteer.volunteer_id} 
                  hover
                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {volunteer.nombre}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="caption">{volunteer.email}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="caption">{volunteer.celular}</Typography>
                      </Stack>
                    </Stack>
                  </TableCell>

                  <TableCell sx={{ maxWidth: 180 }}>
                    <Typography variant="body2" noWrap>
                      {volunteer.capacitaciones || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>
                      {volunteer.descripcion_servicios || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ maxWidth: 150 }}>
                    <Typography variant="body2" noWrap color="text.secondary">
                      {volunteer.notes || '-'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(volunteer.created_at).toLocaleDateString('es-CL')}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ textAlign: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <Select
                        value={volunteer.status}
                        disabled={updateStatusMutation.isPending}
                        onChange={(e) =>
                          handleStatusChange(volunteer.volunteer_id, e.target.value as VolunteerStatus)
                        }
                        renderValue={(value) => (
                          <Chip
                            icon={getStatusIcon(value)}
                            label={value.charAt(0).toUpperCase() + value.slice(1)}
                            size="small"
                            color={getStatusColor(value)}
                          />
                        )}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <MenuItem key={status} value={status}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {getStatusIcon(status)}
                              <Typography>{status.charAt(0).toUpperCase() + status.slice(1)}</Typography>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider />

        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando {filteredVolunteers.length} de {volunteers.length} solicitudes
          </Typography>
          {statusFilter !== 'todos' && (
            <Chip
              label={`Filtro: ${statusFilter}`}
              size="small"
              onDelete={() => setStatusFilter('todos')}
              color={getStatusColor(statusFilter as VolunteerStatus)}
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
}