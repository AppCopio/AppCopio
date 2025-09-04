// src/components/center/OperationalStatusControl.tsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './OperationalStatusControl.css';

type OperationalStatus = 'Abierto' | 'Cerrado Temporalmente' | 'Capacidad Máxima';

interface OperationalStatusControlProps {
  centerId: string;
  currentStatus: OperationalStatus;
  currentNote?: string;
  onStatusChange: (newStatus: OperationalStatus, note?: string) => void;
  isUpdating?: boolean;
}

const getStatusClass = (status: OperationalStatus): string => {
    switch (status) {
      case 'Abierto':
        return 'status-open';
      case 'Cerrado Temporalmente':
        return 'status-closed';
      case 'Capacidad Máxima':
        return 'status-full';
      default:
        return 'status-unknown';
    }
  };

const OperationalStatusControl: React.FC<OperationalStatusControlProps> = ({
  centerId,
  currentStatus,
  onStatusChange,
  isUpdating = false
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Solo los encargados pueden cambiar el estado operativo
  if (user?.role_name !== 'Encargado') {
    return (
      <div className="operational-status-display">
        <span className={`status-indicator ${getStatusClass(currentStatus)}`}>
          {currentStatus}
        </span>
      </div>
    );
  }

  const statusOptions: OperationalStatus[] = [
    'Abierto',
    'Cerrado Temporalmente', 
    'Capacidad Máxima'
  ];

  const handleStatusSelect = (status: OperationalStatus) => {
    if (status !== currentStatus && !isUpdating) {
      onStatusChange(status);
    }
    setIsOpen(false);
  };

  

  const getStatusIcon = (status: OperationalStatus): string => {
    switch (status) {
      case 'Abierto':
        return '✅';
      case 'Cerrado Temporalmente':
        return '⏸️';
      case 'Capacidad Máxima':
        return '🚫';
      default:
        return '❓';
    }
  };

  const getStatusDescription = (status: OperationalStatus): string => {
    switch (status) {
      case 'Abierto':
        return 'El centro está disponible para recibir ayuda y personas';
      case 'Cerrado Temporalmente':
        return 'El centro está temporalmente cerrado';
      case 'Capacidad Máxima':
        return 'El centro ha alcanzado su capacidad máxima';
      default:
        return '';
    }
  };

  return (
    <div className="operational-status-control">
      <div className="current-status">
        <label htmlFor="status-selector">Estado Operativo del Centro:</label>
        <div className="status-selector-container">
          <button
            id="status-selector"
            className={`status-button ${getStatusClass(currentStatus)} ${isUpdating ? 'updating' : ''}`}
            onClick={() => setIsOpen(!isOpen)}
            disabled={isUpdating}
          >
            <span className="status-icon">{getStatusIcon(currentStatus)}</span>
            <span className="status-text">{currentStatus}</span>
            {isUpdating ? (
              <span className="loading-spinner">⏳</span>
            ) : (
              <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
            )}
          </button>
          
          {isOpen && !isUpdating && (
            <div className="status-dropdown">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  className={`status-option ${getStatusClass(status)} ${
                    status === currentStatus ? 'current' : ''
                  }`}
                  onClick={() => handleStatusSelect(status)}
                >
                  <span className="status-icon">{getStatusIcon(status)}</span>
                  <div className="status-info">
                    <span className="status-name">{status}</span>
                    <span className="status-description">
                      {getStatusDescription(status)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="status-help">
        <p className="help-text">
          <strong>Importante:</strong> Cambiar el estado afectará cómo se muestra tu centro en el mapa público y en los reportes municipales.
        </p>
      </div>
    </div>
  );
};

export default OperationalStatusControl;
