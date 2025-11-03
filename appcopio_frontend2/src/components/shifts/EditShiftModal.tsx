// src/components/shifts/EditShiftModal.tsx
import React, { useState } from 'react';
import { updateShift } from '@/services/shifts.service';
import type { CenterShift, UpdateShiftInput, Weekday } from '@/types/shift';
import './CreateShiftModal.css';

interface EditShiftModalProps {
  shift: CenterShift;
  onClose: () => void;
  onSuccess: () => void;
}

const WEEKDAYS = [
  { value: 0, label: 'Lun' },
  { value: 1, label: 'Mar' },
  { value: 2, label: 'Mié' },
  { value: 3, label: 'Jue' },
  { value: 4, label: 'Vie' },
  { value: 5, label: 'Sáb' },
  { value: 6, label: 'Dom' },

];

export default function EditShiftModal({ shift, onClose, onSuccess }: EditShiftModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize with current shift values
  const [shiftStart, setShiftStart] = useState(
    new Date(shift.shift_start).toISOString().slice(0, 16)
  );
  const [shiftEnd, setShiftEnd] = useState(
    new Date(shift.shift_end).toISOString().slice(0, 16)
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>(shift.weekdays);
  const [notes, setNotes] = useState(shift.notes || '');

  const toggleWeekday = (day: Weekday) => {
    setSelectedWeekdays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shiftStart || !shiftEnd) {
      alert('Completa las fechas de inicio y fin');
      return;
    }
    
    if (selectedWeekdays.length === 0) {
      alert('Selecciona al menos un día de la semana');
      return;
    }
    
    const start = new Date(shiftStart);
    const end = new Date(shiftEnd);
    
    if (end <= start) {
      alert('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }
    
    if (!confirm('¿Confirmar actualización de turno?')) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const input: UpdateShiftInput = {
        shift_start: start.toISOString(),
        shift_end: end.toISOString(),
        weekdays: selectedWeekdays,
        notes: notes.trim() || undefined,
      };
      
      await updateShift(shift.shift_id, input);
      alert('Turno actualizado exitosamente');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating shift:', error);
      alert(error?.response?.data?.error || 'Error al actualizar el turno');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="shift-modal-overlay" onClick={onClose}>
      <div className="shift-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shift-modal-header">
          <h3>✏️ Editar Turno</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="shift-modal-body">
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <p><strong>Trabajador:</strong> {shift.assigned_user_name}</p>
            <p><strong>Centro:</strong> {shift.center_name}</p>
          </div>

          <form className="shift-form" onSubmit={handleSubmit}>
            {/* Fechas y horas */}
            <div className="date-time-grid">
              <div className="form-group">
                <label htmlFor="shiftStart">
                  Inicio <span className="required">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="shiftStart"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="shiftEnd">
                  Fin <span className="required">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="shiftEnd"
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Días de la semana */}
            <div className="form-group">
              <label>
                Días de la semana <span className="required">*</span>
              </label>
              <div className="weekdays-selector">
                {WEEKDAYS.map(({ value, label }) => (
                  <div key={value}>
                    <input
                      type="checkbox"
                      id={`edit-weekday-${value}`}
                      className="weekday-checkbox"
                      checked={selectedWeekdays.includes(value as Weekday)}
                      onChange={() => toggleWeekday(value as Weekday)}
                    />
                    <label
                      htmlFor={`edit-weekday-${value}`}
                      className="weekday-label"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div className="form-group">
              <label htmlFor="notes">Notas</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional sobre el turno..."
              />
            </div>
          </form>
        </div>

        <div className="shift-modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Actualizando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
