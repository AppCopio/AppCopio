// src/components/volunteers/VolunteerManagementPanel.tsx
/**
 * Panel de gestión de voluntarios para administradores de albergues
 * Permite ver, contactar y gestionar solicitudes de voluntarios
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Grid as Grid, // ⭐ CAMBIO: Usar Grid2 en lugar de Grid
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
  Divider,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  ContactPhone as ContactIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Description as DescriptionIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { VolunteerInfo } from '@/services/volunteer.service';
import { volunteerService } from '@/services/volunteer.service';

interface VolunteerManagementPanelProps {
  centerId: string;
  centerName: string;
}

export default function VolunteerManagementPanel({
  centerId,
  centerName,
}: VolunteerManagementPanelProps) {
  const [volunteers, setVolunteers] = useState<VolunteerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerInfo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'contact' | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Cargar voluntarios
  useEffect(() => {
    loadVolunteers();
  }, [centerId]);

  const loadVolunteers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await volunteerService.getVolunteersByCenter(centerId);
      setVolunteers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (
    volunteer: VolunteerInfo,
    type: 'accept' | 'reject' | 'contact'
  ) => {
    setSelectedVolunteer(volunteer);
    setActionType(type);
    setNotes('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedVolunteer(null);
    setActionType(null);
    setNotes('');
  };

  const handleAction = async () => {
    if (!selectedVolunteer || !actionType) return;

    setActionLoading(true);
    try {
      let newStatus: VolunteerInfo['status'];
      
      switch (actionType) {
        case 'accept':
          newStatus = 'aceptado';
          break;
        case 'reject':
          newStatus = 'rechazado';
          break;
        case 'contact':
          newStatus = 'contactado';
          break;
        default:
          return;
      }

      await volunteerService.updateVolunteerStatus(
        selectedVolunteer.volunteer_id,
        newStatus,
        notes || undefined
      );

      // Recargar lista
      await loadVolunteers();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (volunteerId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro de voluntario?')) {
      return;
    }

    try {
      await volunteerService.deleteVolunteer(volunteerId);
      await loadVolunteers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (status: VolunteerInfo['status']) => {
    const colors = {
      pendiente: 'warning',
      contactado: 'info',
      aceptado: 'success',
      rechazado: 'error',
    } as const;
    return colors[status];
  };

  const getStatusLabel = (status: VolunteerInfo['status']) => {
    const labels = {
      pendiente: 'Pendiente',
      contactado: 'Contactado',
      aceptado: 'Aceptado',
      rechazado: 'Rechazado',
    };
    return labels[status];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Gestión de Voluntarios
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {centerName}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
          Total de solicitudes: {volunteers.length}
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats - ⭐ ARREGLADO: Usando Grid2 con spacing */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {['pendiente', 'contactado', 'aceptado', 'rechazado'].map((status) => {
          const count = volunteers.filter((v) => v.status === status).length;
          return (
            <Grid size={{ xs: 6, sm: 3 }} key={status}>
              <Card sx={{ textAlign: 'center' }}>
                <CardContent>
                  <Typography variant="h4" color={getStatusColor(status as any)}>
                    {count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getStatusLabel(status as any)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Lista de voluntarios - ⭐ ARREGLADO: Usando Grid2 */}
      {volunteers.length === 0 ? (
        <Alert severity="info">
          No hay solicitudes de voluntarios para este albergue.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {volunteers.map((volunteer) => (
            <Grid size={{ xs: 12, md: 6 }} key={volunteer.volunteer_id}>
              <Card>
                <CardContent>
                  {/* Header con nombre y estado */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {volunteer.nombre}
                      </Typography>
                    </Box>
                    <Chip
                      label={getStatusLabel(volunteer.status)}
                      color={getStatusColor(volunteer.status)}
                      size="small"
                    />
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  {/* Información de contacto */}
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        <strong>Celular:</strong> {volunteer.celular}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        <strong>Email:</strong> {volunteer.email}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <SchoolIcon fontSize="small" color="action" sx={{ mt: 0.5 }} />
                      <Typography variant="body2">
                        <strong>Capacitaciones:</strong>{' '}
                        {volunteer.capacitaciones}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <DescriptionIcon fontSize="small" color="action" sx={{ mt: 0.5 }} />
                      <Typography variant="body2">
                        <strong>Servicios:</strong>{' '}
                        {volunteer.descripcion_servicios}
                      </Typography>
                    </Box>

                    {volunteer.notes && (
                      <Box sx={{ bgcolor: 'grey.100', p: 1.5, borderRadius: 1, mt: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          <strong>Notas:</strong>
                        </Typography>
                        <Typography variant="body2">{volunteer.notes}</Typography>
                      </Box>
                    )}
                  </Stack>

                  {/* Fechas */}
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                      Solicitud: {new Date(volunteer.created_at).toLocaleDateString()}
                    </Typography>
                    {volunteer.contacted_at && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Contactado: {new Date(volunteer.contacted_at).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>

                  {/* Acciones */}
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {volunteer.status === 'pendiente' && (
                      <>
                        <Tooltip title="Marcar como contactado">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ContactIcon />}
                            onClick={() => handleOpenDialog(volunteer, 'contact')}
                          >
                            Contactar
                          </Button>
                        </Tooltip>
                        <Tooltip title="Aceptar voluntario">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<AcceptIcon />}
                            onClick={() => handleOpenDialog(volunteer, 'accept')}
                          >
                            Aceptar
                          </Button>
                        </Tooltip>
                        <Tooltip title="Rechazar voluntario">
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<RejectIcon />}
                            onClick={() => handleOpenDialog(volunteer, 'reject')}
                          >
                            Rechazar
                          </Button>
                        </Tooltip>
                      </>
                    )}

                    {volunteer.status === 'contactado' && (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<AcceptIcon />}
                          onClick={() => handleOpenDialog(volunteer, 'accept')}
                        >
                          Aceptar
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<RejectIcon />}
                          onClick={() => handleOpenDialog(volunteer, 'reject')}
                        >
                          Rechazar
                        </Button>
                      </>
                    )}

                    <Box sx={{ flexGrow: 1 }} />

                    <Tooltip title="Eliminar registro">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(volunteer.volunteer_id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog de confirmación de acción */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'accept' && 'Aceptar Voluntario'}
          {actionType === 'reject' && 'Rechazar Voluntario'}
          {actionType === 'contact' && 'Marcar como Contactado'}
        </DialogTitle>
        <DialogContent>
          {selectedVolunteer && (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Voluntario:</strong> {selectedVolunteer.nombre}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notas (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agrega comentarios o notas sobre esta acción..."
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleAction}
            variant="contained"
            disabled={actionLoading}
            startIcon={actionLoading && <CircularProgress size={20} />}
            color={actionType === 'reject' ? 'error' : 'primary'}
          >
            {actionLoading ? 'Procesando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}