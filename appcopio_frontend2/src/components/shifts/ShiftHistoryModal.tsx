// src/components/shifts/ShiftHistoryModal.tsx
import React, { useState, useEffect } from 'react';
import { getShiftHistory } from '@/services/shifts.service';
import type { CenterShift, ShiftHistoryEntry } from '@/types/shift';
import './CreateShiftModal.css';

interface ShiftHistoryModalProps {
  shift: CenterShift;
  onClose: () => void;
}

export default function ShiftHistoryModal({ shift, onClose }: ShiftHistoryModalProps) {
  const [history, setHistory] = useState<ShiftHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [shift.shift_id]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const data = await getShiftHistory(shift.shift_id);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
      alert('Error al cargar el historial');
    } finally {
      setIsLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return '📝 Creado';
      case 'updated': return '✏️ Actualizado';
      case 'cancelled': return '❌ Cancelado';
      case 'completed': return '✅ Completado';
      default: return action;
    }
  };

  return (
    <div className="shift-modal-overlay" onClick={onClose}>
      <div className="shift-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shift-modal-header">
          <h3>📜 Historial del Turno</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="shift-modal-body">
          <div style={{ marginBottom: '20px' }}>
            <p><strong>Trabajador:</strong> {shift.assigned_user_name}</p>
            <p><strong>Centro:</strong> {shift.center_name}</p>
          </div>

          {isLoading ? (
            <p>Cargando historial...</p>
          ) : history.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>
              No hay cambios registrados
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {history.map((entry) => (
                <div
                  key={entry.history_id}
                  style={{
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    borderLeft: '4px solid #2563eb',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>{getActionLabel(entry.action)}</strong>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      {new Date(entry.changed_at).toLocaleString('es-CL')}
                    </span>
                  </div>
                  
                  {entry.changed_by_name && (
                    <p style={{ fontSize: '14px', color: '#4b5563', margin: '4px 0' }}>
                      👤 Por: {entry.changed_by_name}
                    </p>
                  )}
                  
                  {entry.reason && (
                    <p style={{ fontSize: '14px', color: '#4b5563', margin: '4px 0' }}>
                      📝 Motivo: {entry.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shift-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
