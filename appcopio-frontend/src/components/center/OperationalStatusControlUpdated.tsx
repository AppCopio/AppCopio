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

const OperationalStatusControl: React.FC<OperationalStatusControlProps> = ({
  centerId,
  currentStatus,
  currentNote = '',
  onStatusChange,
  isUpdating = false
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [publicNote, setPublicNote] = useState(currentNote);
  const [showNoteEditor, setShowNoteEditor] = useState(false);

  // Helper functions - declaradas al principio para evitar errores de hoisting
  const getStatusClass = (status: OperationalStatus): string => {
    switch (status) {
      case 'Abierto':
        return 'status-open';
      case 'Cerrado Temporalmente':
        return 'status-temporarily-closed';
      case 'Capacidad Máxima':
        return 'status-full-capacity';
      default:
        return '';
    }
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

  // Solo los encargados pueden cambiar el estado operativo
  if (user?.role !== 'Encargado') {
    return (
      <div className="operational-status-display">
        <span className={`status-indicator ${getStatusClass(currentStatus)}`}>
          {getStatusIcon(currentStatus)} {currentStatus}
        </span>
        {currentStatus === 'Cerrado Temporalmente' && currentNote && (
          <div className="public-note-display">
            <strong>Nota:</strong> {currentNote}
          </div>
        )}
      </div>
    );
  }

  const statusOptions: OperationalStatus[] = [
    'Abierto',
    'Cerrado Temporalmente', 
    'Capacidad Máxima'
  ];

  const handleStatusSelect = (newStatus: OperationalStatus) => {
    setIsOpen(false);
    
    if (newStatus === 'Cerrado Temporalmente') {
      setShowNoteEditor(true);
    } else {
      setPublicNote('');
      onStatusChange(newStatus);
    }
  };

  const handleNoteSubmit = () => {
    onStatusChange('Cerrado Temporalmente', publicNote);
    setShowNoteEditor(false);
  };

  const handleNoteCancel = () => {
    setPublicNote(currentNote);
    setShowNoteEditor(false);
  };

  if (showNoteEditor) {
    return (
      <div className="operational-status-control">
        <div className="note-editor">
          <h4>Configurar Cierre Temporal</h4>
          <p>Agregar una nota pública (opcional) para informar a los ciudadanos:</p>
          <textarea
            value={publicNote}
            onChange={(e) => setPublicNote(e.target.value)}
            placeholder="Ej: Cerrado por mantenimiento hasta las 14:00, Reapertura programada para mañana..."
            maxLength={200}
            rows={4}
            disabled={isUpdating}
          />
          <small>{publicNote.length}/200 caracteres</small>
          <div className="note-actions">
            <button 
              onClick={handleNoteSubmit}
              disabled={isUpdating}
              className="btn-confirm"
            >
              {isUpdating ? '⏳ Aplicando...' : 'Confirmar Cierre'}
            </button>
            <button 
              onClick={handleNoteCancel}
              disabled={isUpdating}
              className="btn-cancel"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      {currentStatus === 'Cerrado Temporalmente' && currentNote && (
        <div className="current-note">
          <strong>Nota actual:</strong> {currentNote}
          <button 
            onClick={() => setShowNoteEditor(true)}
            className="btn-edit-note"
            disabled={isUpdating}
          >
            Editar nota
          </button>
        </div>
      )}

      <div className="status-help">
        <p className="help-text">
          <strong>Importante:</strong> Cambiar el estado afectará cómo se muestra tu centro en el mapa público y en los reportes municipales.
        </p>
      </div>
    </div>
  );
};

export default OperationalStatusControl;
