// src/components/shifts/ShiftsCalendarView.tsx
import React from 'react';
import type { CenterShift } from '@/types/shift';

interface ShiftsCalendarViewProps {
  shifts: CenterShift[];
  onShiftClick: (shift: CenterShift) => void;
}

export default function ShiftsCalendarView({ shifts, onShiftClick }: ShiftsCalendarViewProps) {
  // Agrupar turnos por día
  const groupShiftsByDate = () => {
    const grouped: Record<string, CenterShift[]> = {};
    
    shifts.forEach(shift => {
      const date = new Date(shift.shift_start).toLocaleDateString('es-CL');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(shift);
    });
    
    return grouped;
  };

  const groupedShifts = groupShiftsByDate();
  const dates = Object.keys(groupedShifts).sort();

  if (dates.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
        No hay turnos para mostrar en el calendario
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {dates.map(date => (
        <div key={date} style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1a1a1a' }}>
            📅 {date}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {groupedShifts[date].map(shift => (
              <div
                key={shift.shift_id}
                onClick={() => onShiftClick(shift)}
                style={{
                  padding: '12px',
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{shift.assigned_user_name}</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                      {new Date(shift.shift_start).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(shift.shift_end).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: shift.status === 'programado' ? '#dbeafe' : 
                                 shift.status === 'en_curso' ? '#dcfce7' :
                                 shift.status === 'completado' ? '#f3f4f6' : '#fee2e2',
                      color: shift.status === 'programado' ? '#1e40af' :
                            shift.status === 'en_curso' ? '#166534' :
                            shift.status === 'completado' ? '#4b5563' : '#991b1b',
                    }}
                  >
                    {shift.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
