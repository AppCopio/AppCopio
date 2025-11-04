// src/components/shifts/CreateShiftModal.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createShift, getAvailableWorkers } from '@/services/shifts.service';
import type { CreateShiftInput, Weekday } from '@/types/shift';
import type { User } from '@/types/user';
import './CreateShiftModal.css';

interface CreateShiftModalProps {
  centerId: string;
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

export default function CreateShiftModal({ centerId, onClose, onSuccess }: CreateShiftModalProps) {
  const { user } = useAuth();
  
  const [workers, setWorkers] = useState<User[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  
  // Periodo del turno (fechas)
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState('');     // YYYY-MM-DD
  
  // Días de la semana que trabaja
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>([0, 1, 2, 3, 4]); // Lun-Vie por defecto
  
  // Horario diario (mismo para todos los días seleccionados)
  const [startTime, setStartTime] = useState('08:00'); // HH:mm
  const [endTime, setEndTime] = useState('18:00');     // HH:mm
  
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setIsLoadingWorkers(true);
      // Obtener trabajadores disponibles para este centro (asignados o sin asignación)
      const response = await getAvailableWorkers(centerId);
      setWorkers(response.users);
    } catch (error) {
      console.error('Error loading workers:', error);
      alert('Error al cargar trabajadores disponibles');
    } finally {
      setIsLoadingWorkers(false);
    }
  };

  const toggleWeekday = (day: Weekday) => {
    setSelectedWeekdays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      alert('Selecciona un trabajador');
      return;
    }
    
    if (!startDate || !endDate) {
      alert('Completa el periodo del turno (fecha inicio y fin)');
      return;
    }
    
    if (!startTime || !endTime) {
      alert('Completa el horario del turno');
      return;
    }
    
    if (selectedWeekdays.length === 0) {
      alert('Selecciona al menos un día de la semana');
      return;
    }
    
    // Validar que fecha fin sea posterior a fecha inicio
    const dateStart = new Date(startDate);
    const dateEnd = new Date(endDate);
    
    if (dateEnd < dateStart) {
      alert('La fecha de fin debe ser posterior o igual a la fecha de inicio');
      return;
    }
    
    // Validar que hora fin sea posterior a hora inicio
    if (endTime <= startTime) {
      alert('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }
    
    // Construir timestamps combinando fecha inicio con horario
    const shiftStart = new Date(`${startDate}T${startTime}:00`);
    const shiftEnd = new Date(`${endDate}T${endTime}:00`);
    
    if (!confirm('¿Confirmar asignación de turno?')) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const input: CreateShiftInput = {
        center_id: centerId,
        assigned_user_id: selectedUserId,
        shift_start: shiftStart.toISOString(),
        shift_end: shiftEnd.toISOString(),
        weekdays: selectedWeekdays,
        notes: notes.trim() || undefined,
      };
      
      await createShift(input);
      alert('Turno asignado exitosamente. Se enviará una notificación al trabajador.');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating shift:', error);
      const errorMsg = error?.response?.data?.error || 'Error al crear el turno';
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="shift-modal-overlay" onClick={onClose}>
      <div className="shift-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shift-modal-header">
          <h3>📅 Asignar Nuevo Turno</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="shift-modal-body">
          <form className="shift-form" onSubmit={handleSubmit}>
            {/* Selección de trabajador */}
            <div className="form-group">
              <label htmlFor="worker">
                Trabajador <span className="required">*</span>
              </label>
              {isLoadingWorkers ? (
                <p>Cargando trabajadores...</p>
              ) : (
                <select
                  id="worker"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  required
                >
                  <option value={0}>Selecciona un trabajador...</option>
                  {workers.map(worker => (
                    <option key={worker.user_id} value={worker.user_id}>
                      {worker.nombre} - {worker.email}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Periodo del turno */}
            <div className="form-section">
              <h4 className="section-title">📅 Periodo del Turno</h4>
              <div className="date-range-grid">
                <div className="form-group">
                  <label htmlFor="startDate">
                    Fecha inicio <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endDate">
                    Fecha fin <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <span className="help-text">
                Define el rango de fechas en que el trabajador tendrá este turno asignado
              </span>
            </div>

            {/* Días de la semana */}
            <div className="form-section">
              <h4 className="section-title">📆 Días de Trabajo</h4>
              <div className="weekdays-selector">
                {WEEKDAYS.map(({ value, label }) => (
                  <div key={value}>
                    <input
                      type="checkbox"
                      id={`weekday-${value}`}
                      className="weekday-checkbox"
                      checked={selectedWeekdays.includes(value as Weekday)}
                      onChange={() => toggleWeekday(value as Weekday)}
                    />
                    <label
                      htmlFor={`weekday-${value}`}
                      className="weekday-label"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
              <span className="help-text">
                Selecciona qué días de la semana trabajará el encargado
              </span>
            </div>

            {/* Horario del turno */}
            <div className="form-section">
              <h4 className="section-title">🕐 Horario Diario</h4>
              <div className="date-range-grid">
                <div className="form-group">
                  <label htmlFor="startTime">
                    Hora inicio <span className="required">*</span>
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="endTime">
                    Hora fin <span className="required">*</span>
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <span className="help-text">
                Mismo horario para todos los días seleccionados (ej: 08:00 - 18:00)
              </span>
            </div>

            {/* Resumen visual */}
            {selectedUserId > 0 && startDate && endDate && selectedWeekdays.length > 0 && startTime && endTime && (
              <div className="shift-summary">
                <h4 className="summary-title">📋 Resumen del Turno</h4>
                <div className="summary-content">
                  <div className="summary-row">
                    <span className="summary-label">Trabajador:</span>
                    <span className="summary-value">
                      {workers.find(w => w.user_id === selectedUserId)?.nombre || 'Seleccionado'}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Periodo:</span>
                    <span className="summary-value">
                      {new Date(startDate).toLocaleDateString('es-CL')} - {new Date(endDate).toLocaleDateString('es-CL')}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Días:</span>
                    <span className="summary-value">
                      {selectedWeekdays.map(d => WEEKDAYS[d].label).join(', ')}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Horario:</span>
                    <span className="summary-value">{startTime} - {endTime}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notas */}
            <div className="form-group">
              <label htmlFor="notes">Notas (opcional)</label>
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
            disabled={isSubmitting || isLoadingWorkers}
          >
            {isSubmitting ? 'Asignando...' : 'Asignar Turno'}
          </button>
        </div>
      </div>
    </div>
  );
}
