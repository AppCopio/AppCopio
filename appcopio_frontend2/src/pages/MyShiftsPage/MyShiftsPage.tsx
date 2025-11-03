// src/pages/MyShiftsPage/MyShiftsPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserShifts } from '@/services/shifts.service';
import type { CenterShift } from '@/types/shift';
import './MyShiftsPage.css';

export default function MyShiftsPage() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<CenterShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');

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
  const upcomingShifts = shifts.filter(s => new Date(s.shift_start) >= now).sort((a, b) => 
    new Date(a.shift_start).getTime() - new Date(b.shift_start).getTime()
  );
  const pastShifts = shifts.filter(s => new Date(s.shift_start) < now).sort((a, b) =>
    new Date(b.shift_start).getTime() - new Date(a.shift_start).getTime()
  );

  const displayShifts = view === 'upcoming' ? upcomingShifts : pastShifts;

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
          {view === 'upcoming' 
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
                  {shift.status}
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
