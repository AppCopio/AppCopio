import React, { useState, useEffect } from 'react';
import { 
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { Chip, Tooltip, CircularProgress, Typography } from '@mui/material';
import { getActiveActivation } from '@/services/centers.service';
import { listActivationAssignments } from '@/services/assignments.service'; // NUEVO
import type { ActiveActivation } from '@/types/center';
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
  notes?: string;
}

const ActivationPanel: React.FC<ActivationPanelProps> = ({ centerId, isActive }) => {
  const [activation, setActivation] = useState<ActivationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivation = async () => {
      setLoading(true);
      try {
        // 1. Obtener la activación
        const data = await getActiveActivation(centerId);
        
        if (data) {
          // 2. Obtener los encargados asignados usando el endpoint existente
          const assignments = await listActivationAssignments(data.activation_id);
          
          // 3. Mapear assignments a formato simple
          const assigned_users = assignments.map(a => ({
            user_id: a.user_id,
            nombre: a.user_name || undefined
          }));
          
          // Calcular duración
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
          
          // 4. Combinar todo
          setActivation({
            ...data,
            duration,
            durationDays: diffDays,
            assigned_users // NUEVO: Agregamos los encargados
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

    if (isActive) {
      loadActivation();
    } else {
      setActivation(null);
      setLoading(false);
    }
  }, [centerId, isActive]);

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

          {/* Motivo de Activación (Nuevo) */}
          <div className="info-card">
            <div className="card-icon-wrapper reason-icon"> {/* Nueva clase CSS */}
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
          </div>
        </div> {/* Fin de top-info-grid */}

        {/* --- Sección Encargados (Ahora separada) --- */}
        <div className="assigned-users-section">
          {activation.assigned_users && activation.assigned_users.length > 0 && (
            // Ya no necesita 'full-width' porque está fuera de la rejilla principal
            <div className="info-card">
              <div className="card-icon-wrapper team-icon">
                <PeopleIcon />
              </div>
              <div className="card-info">
                <span className="card-label">Encargados asignados ({activation.assigned_users.length})</span>
                <div className="assigned-users">
                  {activation.assigned_users.map((user, index) => (
                    <Chip
                      key={index}
                      label={user.nombre || `Usuario ${user.user_id}`}
                      size="small"
                      className="user-chip"
                      avatar={
                        <div className="user-avatar">
                          {(user.nombre || 'U').charAt(0).toUpperCase()}
                        </div>
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div> {/* Fin de assigned-users-section */}

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