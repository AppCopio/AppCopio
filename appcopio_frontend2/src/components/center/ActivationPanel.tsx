
import React, { useState, useEffect } from 'react';
import { 
  PowerSettingsNew,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { Chip, Tooltip, CircularProgress } from '@mui/material';
import { getActiveActivation } from '@/services/centers.service';
import type { ActiveActivation } from '@/types/center';
import './ActivationPanel.css';

interface ActivationPanelProps {
  centerId: string;
  isActive: boolean;
}

// Extender ActiveActivation con campos opcionales que podrían venir del backend mejorado
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

  useEffect(() => {
    const loadActivation = async () => {
      setLoading(true);
      try {
        const data = await getActiveActivation(centerId);
        
        if (data) {
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

          setActivation({
            ...data,
            duration,
            durationDays: diffDays
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
      // Actualizar cada minuto para la duración
      const interval = setInterval(loadActivation, 60000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
      setActivation(null);
    }
  }, [centerId, isActive]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isActive) {
    return (
      <div className="activation-panel inactive">
        <div className="panel-header inactive-header">
          <div className="status-indicator inactive-indicator">
            <PowerSettingsNew className="status-icon" />
            <h3>Centro Inactivo</h3>
          </div>
        </div>
        <div className="panel-content">
          <p className="inactive-message">
            Este centro no está actualmente activado para responder a una emergencia.
          </p>
        </div>
      </div>
    );
  }

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
      <div className="panel-header">
        <div className="status-indicator active-indicator">
          <div className="icon-with-pulse">

            <CheckIcon className="status-icon active-icon" />
          </div>
          <h3>Centro Activo</h3>
        </div>
        <Chip 
          label={`ID: ${activation.activation_id}`}
          size="small"
          className="activation-id-chip"
        />
      </div>

      <div className="panel-content">
        <div className="info-grid">
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

          {/* Activado Por */}
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

          {/* Encargados Actuales */}
          {activation.assigned_users && activation.assigned_users.length > 0 && (
            <div className="info-card full-width">
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
        </div>

        {/* Badge de tiempo activo */}
        <div className="duration-badge">
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
      </div>
    </div>
  );
};

export default ActivationPanel;