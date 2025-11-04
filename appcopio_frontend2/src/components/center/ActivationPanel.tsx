import React, { useState, useEffect } from 'react';
import { 
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { 
  Chip, 
  Tooltip, 
  CircularProgress, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Box,
  Typography
} from '@mui/material';
import { getActiveActivation } from '@/services/centers.service';
import { 
  listActivationAssignments,
  createActivationAssignment,
  endActivationAssignment 
} from '@/services/assignments.service';
import { listActiveUsersByRole } from '@/services/users.service';
import type { ActiveActivation } from '@/types/center';
import type { User } from '@/types/user';
import './ActivationPanel.css';

interface ActivationPanelProps {
  centerId: string;
  isActive: boolean;
}

interface ActivationInfo extends ActiveActivation {
  duration?: string;
  durationDays?: number;
  activated_by?: number;
  activated_by_name?: string;
  assigned_users?: Array<{
    user_id: number;
    nombre?: string;
  }>;
}

const ActivationPanel: React.FC<ActivationPanelProps> = ({ centerId, isActive }) => {
  const [activation, setActivation] = useState<ActivationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para agregar encargado
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [adding, setAdding] = useState(false);

  const loadActivation = async () => {
    setLoading(true);
    try {
      const data = await getActiveActivation(centerId);
      
      if (data) {
        const assignments = await listActivationAssignments(data.activation_id);
        const assigned_users = assignments.map(a => ({
          user_id: a.user_id,
          nombre: a.user_name
        }));
        
        const startDate = new Date(data.started_at);
        const now = new Date();
        const diffMs = now.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        let duration = '';
        if (diffDays > 0) {
          duration = `${diffDays} día${diffDays !== 1 ? 's' : ''}`;
          if (diffHours > 0) {
            duration += ` y ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
          }
        } else if (diffHours > 0) {
          duration = `${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
        } else {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          duration = `${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
        }
        
        setActivation({
          ...data,
          duration,
          durationDays: diffDays,
          assigned_users
        });
      } else {
        setActivation(null);
      }
    } catch (error) {
      console.error('Error loading activation:', error);
      setActivation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      loadActivation();
    } else {
      setActivation(null);
      setLoading(false);
    }
  }, [centerId, isActive]);

  // Cargar usuarios disponibles al abrir diálogo
  const handleOpenAddDialog = async () => {
    setAddDialogOpen(true);
    setLoadingUsers(true);
    try {
      const users = await listActiveUsersByRole(2);
      setAvailableUsers(users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
    setSelectedUser(null);
  };

  const handleAddEncargado = async () => {
    if (!selectedUser || !activation) return;
    
    setAdding(true);
    try {
      await createActivationAssignment(activation.activation_id, selectedUser.user_id);
      alert(`Encargado ${selectedUser.nombre || selectedUser.username} agregado exitosamente`);
      handleCloseAddDialog();
      await loadActivation(); // Recargar datos
    } catch (error: any) {
      console.error('Error adding encargado:', error);
      alert(error?.response?.data?.error || 'Error al agregar encargado');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveEncargado = async (userId: number, userName?: string) => {
    if (!activation) return;
    
    if (!window.confirm(`¿Deseas remover a ${userName || 'este encargado'}?`)) {
      return;
    }
    
    try {
      await endActivationAssignment(activation.activation_id, userId);
      alert('Encargado removido exitosamente');
      await loadActivation(); // Recargar datos
    } catch (error: any) {
      console.error('Error removing encargado:', error);
      alert(error?.response?.data?.error || 'Error al remover encargado');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Si el centro no está activo
  if (!isActive) {
    return (
      <div className="activation-panel inactive">
        <div className="panel-content">
          <p className="inactive-message">
            Este centro no está activo actualmente
          </p>
        </div>
      </div>
    );
  }

  // Mientras carga
  if (loading) {
    return (
      <div className="activation-panel loading">
        <div className="loading-content">
          <CircularProgress size={40} />
          <p>Cargando información de activación...</p>
        </div>
      </div>
    );
  }

  // Si no hay activación (error)
  if (!activation) {
    return (
      <div className="activation-panel error">
        <div className="panel-content">
          <p className="error-message">
            ⚠️ No se pudo cargar la información de la activación actual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="activation-panel active">
      {/* --- Cabecera (sin cambios) --- */}
      <div className="panel-header">
        <div className="status-indicator active-indicator">
          <div className="icon-with-pulse">
            <CheckIcon className="status-icon active-icon" />
            <div className="pulse-ring"></div> {/* Pulso añadido aquí */}
          </div>
          <h3>Centro Activo</h3>
        </div>
        <Chip
          label={`ID Act: ${activation.activation_id}`}
          size="small"
          className="activation-id-chip"
        />
      </div>

      {/* --- Contenido Principal (Reestructurado) --- */}
      <div className="panel-content">

        {/* --- 2. Rejilla Superior Fija (Nueva) --- */}
        <div className="top-info-grid">
          {/* Fecha de Activación */}
          <div className="info-card">
            <div className="card-icon-wrapper start-icon">
              <CalendarIcon />
            </div>
            <div className="card-info">
              <span className="card-label">Activado el</span>
              <span className="card-value">{formatDate(activation.started_at)}</span>
            </div>
          </div>

          {/* Duración */}
          <div className="info-card">
            <div className="card-icon-wrapper duration-icon">
              <ScheduleIcon />
            </div>
            <div className="card-info">
              <span className="card-label">Duración</span>
              <span className="card-value">{activation.duration}</span>
            </div>
          </div>

          {activation.activated_by_name && (
              <div className="info-card">
                <div className="card-icon-wrapper person-icon">
                  <PersonIcon />
                </div>
                <div className="card-info">
                  <span className="card-label">Activado por</span>
                  <Tooltip title={`Usuario ID: ${activation.activated_by}`}>
                    <span className="card-value">{activation.activated_by_name}</span>
                  </Tooltip>
                </div>
              </div>
            )}

          {/* Motivo de Activación (Nuevo) 
          <div className="info-card">
            <div className="card-icon-wrapper reason-icon"> {/* Nueva clase CSS 
              <InfoIcon />
            </div>
            <div className="card-info">
              <span className="card-label">Motivo Activación</span>
              <Tooltip title={activation.notes || 'No especificado'}>
                <Typography
                  variant="body2"
                  className="card-value" // Usamos clase card-value para consistencia
                  noWrap // Evita que el texto largo rompa el layout
                  sx={{ fontWeight: 600, cursor: 'default' }} // Estilo similar a card-value
                >
                  {activation.notes || 'No especificado'}
                </Typography>
              </Tooltip>
            </div>
          </div> */}
        </div> {/* Fin de top-info-grid */}

        {/* --- Sección Encargados (Ahora separada) --- */}
        {/* Encargados con botón para agregar más */}
            <div className="info-card full-width">
              <div className="card-icon-wrapper team-icon">
                <PeopleIcon />
              </div>
              <div className="card-info">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <span className="card-label">
                    Encargados asignados ({activation.assigned_users?.length || 0})
                  </span>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAddDialog}
                    variant="outlined"
                    color="primary"
                  >
                    Agregar
                  </Button>
                </Box>
                
                {activation.assigned_users && activation.assigned_users.length > 0 ? (
                  <div className="assigned-users">
                    {activation.assigned_users.map((user) => (
                      <Chip
                        key={user.user_id}
                        label={user.nombre || `Usuario ${user.user_id}`}
                        size="small"
                        className="user-chip"
                        avatar={
                          <div className="user-avatar">
                            {(user.nombre || 'U').charAt(0).toUpperCase()}
                          </div>
                        }
                        onDelete={() => handleRemoveEncargado(user.user_id, user.nombre)}
                        deleteIcon={
                          <Tooltip title="Remover encargado">
                            <CloseIcon />
                          </Tooltip>
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    No hay encargados asignados
                  </Typography>
                )}
              </div>
            </div>

      {/* Diálogo para agregar encargado */}
      <Dialog open={addDialogOpen} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Encargado</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Autocomplete
              value={selectedUser}
              onChange={(_, newValue) => setSelectedUser(newValue)}
              options={availableUsers}
              loading={loadingUsers}
              getOptionLabel={(option) => option?.nombre || option?.username || ""}
              isOptionEqualToValue={(option, value) => option?.user_id === value?.user_id}
              renderOption={(props, option) => (
                <li {...props} key={option.user_id}>
                  <Box sx={{ display: "flex", width: "100%", alignItems: "center", gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">{option?.nombre || option?.username}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.email}
                      </Typography>
                    </Box>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Seleccionar usuario"
                  placeholder="Buscar por nombre..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingUsers ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} disabled={adding}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAddEncargado} 
            variant="contained"
            disabled={!selectedUser || adding}
          >
            {adding ? 'Agregando...' : 'Agregar Encargado'}
          </Button>
        </DialogActions>
      </Dialog>{/* Fin de assigned-users-section */}

        {/* --- Badges de Duración (sin cambios en su posición relativa al final) --- */}
        <div className="duration-badge-container"> {/* Contenedor opcional para badges */}
          {activation.durationDays !== undefined && activation.durationDays >= 7 && (
            <Tooltip title="Este centro lleva más de una semana activo">
              <div className="warning-badge">
                ⚠️ Activación prolongada
              </div>
            </Tooltip>
          )}
          {activation.durationDays !== undefined && activation.durationDays < 1 && (
            <div className="new-badge">
              🆕 Activación reciente
            </div>
          )}
        </div>

      </div> {/* Fin de panel-content */}
    </div>
  );
};

export default ActivationPanel;