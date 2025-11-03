// src/pages/MyShiftsPage/MyShiftsPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserShifts } from '@/services/shifts.service';
import type { CenterShift } from '@/types/shift';
import { formatShiftStatus } from '@/utils/shiftUtils';
import './MyShiftsPage.css';

export default function MyShiftsPage() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<CenterShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'current' | 'upcoming' | 'past'>('current');

  useEffect(() => {
    if (user?.user_id) {
      loadMyShifts();
    }
  }, [user?.user_id]);

  const loadMyShifts = async () => {
    if (!user?.user_id) {
      console.error('No hay usuario autenticado');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getUserShifts(user.user_id);
      setShifts(data);
    } catch (error) {
      console.error('Error al cargar mis turnos:', error);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  
  // Turnos en curso: estado 'en_curso' o turnos que están dentro del rango de fechas actual
  const currentShifts = shifts.filter(s => {
    const shiftStart = new Date(s.shift_start);
    const shiftEnd = new Date(s.shift_end);
    return s.status === 'en_curso' || (shiftStart <= now && shiftEnd >= now && s.status === 'programado');
  }).sort((a, b) => 
    new Date(a.shift_start).getTime() - new Date(b.shift_start).getTime()
  );
  
  // Turnos próximos: fechas futuras y estado programado
  const upcomingShifts = shifts.filter(s => {
    const shiftStart = new Date(s.shift_start);
    return shiftStart > now && (s.status === 'programado' || s.status === 'en_curso');
  }).sort((a, b) => 
    new Date(a.shift_start).getTime() - new Date(b.shift_start).getTime()
  );
  
  // Turnos anteriores: fechas pasadas o estados completado/cancelado
  const pastShifts = shifts.filter(s => {
    const shiftEnd = new Date(s.shift_end);
    return shiftEnd < now || s.status === 'completado' || s.status === 'cancelado';
  }).sort((a, b) =>
    new Date(b.shift_start).getTime() - new Date(a.shift_start).getTime()
  );

  const displayShifts = view === 'current' ? currentShifts : view === 'upcoming' ? upcomingShifts : pastShifts;

  const getWeekdayName = (dayNumber: number): string => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayNumber];
  };

  if (loading) {
    return (
      <div className="my-shifts-page">
        <div className="loading-state">Cargando mis turnos...</div>
      </div>
    );
  }

  return (
    <div className="my-shifts-page">
      <div className="page-header">
        <h1>Mis Turnos</h1>
        <p className="subtitle">Revisa tus turnos programados y completados</p>
      </div>

      <div className="view-toggle">
        <button
          className={view === 'current' ? 'active' : ''}
          onClick={() => setView('current')}
        >
          En Curso ({currentShifts.length})
        </button>
        <button
          className={view === 'upcoming' ? 'active' : ''}
          onClick={() => setView('upcoming')}
        >
          Próximos ({upcomingShifts.length})
        </button>
        <button
          className={view === 'past' ? 'active' : ''}
          onClick={() => setView('past')}
        >
          Anteriores ({pastShifts.length})
        </button>
      </div>

      {displayShifts.length === 0 ? (
        <div className="empty-state">
          {view === 'current'
            ? 'No tienes turnos en curso actualmente'
            : view === 'upcoming' 
              ? 'No tienes turnos próximos programados' 
              : 'No tienes turnos anteriores'}
        </div>
      ) : (
        <div className="shifts-grid">
          {displayShifts.map(shift => (
            <div key={shift.shift_id} className={`shift-card ${shift.status}`}>
              <div className="shift-card-header">
                <h3>{shift.center_name}</h3>
                <span className={`status-badge ${shift.status}`}>
                  {formatShiftStatus(shift.status)}
                </span>
              </div>

              <div className="shift-card-body">
                <div className="info-row">
                  <span className="icon">📅</span>
                  <span>
                    {new Date(shift.shift_start).toLocaleDateString('es-CL', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>

                <div className="info-row">
                  <span className="icon">🕐</span>
                  <span>
                    {new Date(shift.shift_start).toLocaleTimeString('es-CL', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                    {' - '}
                    {new Date(shift.shift_end).toLocaleTimeString('es-CL', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>

                {shift.weekdays && shift.weekdays.length > 0 && (
                  <div className="info-row">
                    <span className="icon">📆</span>
                    <span className="weekdays">
                      {shift.weekdays.map(d => getWeekdayName(d)).join(', ')}
                    </span>
                  </div>
                )}

                {shift.notes && (
                  <div className="shift-notes">
                    <span className="icon">📝</span>
                    <p>{shift.notes}</p>
                  </div>
                )}
              </div>

              {shift.created_by && (
                <div className="shift-card-footer">
                  <span>Asignado por ID: {shift.created_by}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
