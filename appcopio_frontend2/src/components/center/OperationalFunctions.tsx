// src/components/center/OperationalFunctions.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  People as PeopleIcon,
  Groups as GroupsIcon,
  Assessment as AssessmentIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import { getCenterCapacity } from '@/services/centers.service';
import './OperationalFunctions.css';

interface OperationalFunctionsProps {
  centerId: string;
  isActive: boolean;
  onRefresh?: () => void;
}

interface Stats {
  capacity: {
    total_capacity: number;
    current_capacity: number;
    available_capacity: number;
  } | null;
  loading: boolean;
}

const OperationalFunctions: React.FC<OperationalFunctionsProps> = ({
  centerId,
  isActive,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    capacity: null,
    loading: true
  });

  const loadStats = async () => {
    setStats(prev => ({ ...prev, loading: true }));
    try {
      const capacityData = await getCenterCapacity(centerId);
      
      setStats({
        capacity: capacityData,
        loading: false
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (isActive) {
      loadStats();
    }
  }, [centerId, isActive]);

  const handleRefresh = () => {
    loadStats();
    onRefresh?.();
  };

  if (!isActive) {
    return (
      <div className="operational-functions-container">
        <div className="operational-header">
          <h3>Funcionalidades Operativas</h3>
        </div>
        <div className="inactive-message">
          <p>⚠️ El centro debe estar activo para acceder a las funcionalidades operativas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="operational-functions-container">
      <div className="operational-header">
        <h3>Funcionalidades Operativas</h3>
        <Tooltip title="Actualizar datos">
          <IconButton 
            onClick={handleRefresh} 
            size="small"
            disabled={stats.loading}
          >
            {stats.loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </div>

      <div className="operational-cards">
        {/* Card: Gestión de Personas */}
        <div 
          className="operational-card people-card"
          onClick={() => navigate(`/center/${centerId}/residents`)}
        >
          <div className="card-icon people-icon">
            <PeopleIcon fontSize="large" />
          </div>
          <div className="card-content">
            <h4>Gestión de Personas</h4>
            {stats.loading ? (
              <p className="card-loading">Cargando...</p>
            ) : (
              <>
                <p className="card-stat">
                  <span className="stat-current">{stats.capacity?.current_capacity ?? 0}</span>
                  <span className="stat-separator">/</span>
                  <span className="stat-total">{stats.capacity?.total_capacity ?? 0}</span>
                </p>
                <p className="card-label">Capacidad actual</p>
              </>
            )}
          </div>
        </div>

        {/* Card: Gestión de Grupos 
        <div 
          className="operational-card groups-card"
          onClick={() => navigate(`/center/${centerId}/groups`)}
        >
          <div className="card-icon groups-icon">
            <GroupsIcon fontSize="large" />
          </div>
          <div className="card-content">
            <h4>Gestión de Grupos</h4>
            <p className="card-sublabel">Familias y residentes</p>
          </div>
        </div>*/}

        {/* Card: Formulario FIBE */}
        <div 
          className="operational-card fibe-card"
          onClick={() => navigate(`/center/${centerId}/fibe`)}
        >
          <div className="card-icon fibe-icon">
            <AssignmentIcon fontSize="large" />
          </div>
          <div className="card-content">
            <h4>Formulario FIBE</h4>
            <p className="card-sublabel">Ficha de Información Básica de Emergencia</p>
          </div>
        </div>

        {/* Card: Registros de Activación */}
        <div 
          className="operational-card databases-card"
          onClick={() => navigate(`/center/${centerId}/databases`)}
        >
          <div className="card-icon databases-icon">
            <StorageIcon fontSize="large" />
          </div>
          <div className="card-content">
            <h4>Registros de Activación</h4>
            <p className="card-sublabel">Bases de datos por activación</p>
          </div>
        </div>

        {/* Card: Voluntarios */}
        <div 
          className="operational-card volunteer-card"
          onClick={() => navigate(`/center/${centerId}/volunteers`)}
        >
          <div className="card-icon volunteer-icon">
            <QuestionAnswerIcon fontSize="large" />
          </div>
          <div className="card-content">
            <h4>Servicios Voluntarios</h4>
            <p className="card-sublabel">Respuestas a formulario de contacto</p>
          </div>
        </div>

        {/* Card: Gestión de Turnos*/}
        <div 
          className="operational-card shifts-card"
          onClick={()=> navigate(`/center/${centerId}/shifts`)}
        >
          <div className="card-icon shifts-icon">
            <ScheduleIcon fontSize="large" />
          </div>
          <div className="card-content">
            <h4>Gestión de Turnos</h4>
            <p className="card-sublabel">Turnos de encargados de Albergue</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationalFunctions;