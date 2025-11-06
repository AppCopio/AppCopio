// src/pages/ShiftsPage/ShiftsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCenterShifts,
  cancelShift,
} from '@/services/shifts.service';
import CreateShiftModal from '@/components/shifts/CreateShiftModal';
import EditShiftModal from '@/components/shifts/EditShiftModal';
import ShiftHistoryModal from '@/components/shifts/ShiftHistoryModal';
import ShiftsCalendarView from '@/components/shifts/ShiftsCalendarView';
import type { CenterShift, ShiftListOptions, Weekday } from '@/types/shift';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { formatShiftStatus } from '@/utils/shiftUtils';
import './ShiftsPage.css';

const WEEKDAY_NAMES = [ 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function ShiftsPage() {
  const { centerId } = useParams<{ centerId: string }>();
  const { user } = useAuth();
  
  const [shifts, setShifts] = useState<CenterShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [includeHistory, setIncludeHistory] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Vistas y modales
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShift, setEditingShift] = useState<CenterShift | null>(null);
  const [historyShift, setHistoryShift] = useState<CenterShift | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Permisos
  const isAdmin = user?.role_id === 1;
  const isAdminSupport = !!user?.es_apoyo_admin;
  const canManage = isAdmin || isAdminSupport || (user?.role_id === 2); 

  useEffect(() => {
    if (centerId) {
      loadShifts();
    }
  }, [centerId, includeHistory, fromDate, toDate]);

  const loadShifts = async () => {
    if (!centerId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const options: ShiftListOptions = {
        include_history: includeHistory,
      };
      
      if (fromDate) options.from_date = new Date(fromDate).toISOString();
      if (toDate) options.to_date = new Date(toDate).toISOString();
      
      const data = await getCenterShifts(centerId, options);
      setShifts(data);
    } catch (err: any) {
      console.error('Error loading shifts:', err);
      setError(err?.response?.data?.error || 'Error al cargar los turnos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelShift = async (shiftId: string) => {
    const reason = prompt('¿Motivo de cancelación? (opcional)');
    if (reason === null) return; // Usuario canceló el prompt
    
    try {
      await cancelShift(shiftId, reason || undefined);
      alert('Turno cancelado exitosamente');
      loadShifts();
    } catch (err: any) {
      console.error('Error canceling shift:', err);
      alert(err?.response?.data?.error || 'Error al cancelar el turno');
    }
  };

  const handleExportCSV = () => {
    if (!centerId) return;
    
    try {
      setIsExporting(true);
      
      // Filtrar shifts según los filtros aplicados
      const shiftsToExport = getFilteredShifts();
      
      // Definir headers del CSV
      const headers = [
        'centro_id',
        'centro_nombre',
        'usuario_asignado',
        'fecha_inicio',
        'fecha_fin',
        'hora_inicio',
        'hora_fin',
        'dias_semana',
        'estado',
        'notas'
      ];
      
      // Función auxiliar para formatear fecha
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      };
      
      // Función auxiliar para formatear hora
      const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit',
        });
      };
      
      // Función auxiliar para formatear días de la semana
      const formatWeekdays = (weekdays: Weekday[]) => {
        return weekdays.map(day => WEEKDAY_NAMES[day]).join(', ');
      };
      
      type Row = Record<string, string | number | null | undefined>;
      
      // Mapear los turnos a filas del CSV
      const rows: Row[] = shiftsToExport.map((shift) => {
        const startDate = new Date(shift.shift_start);
        const endDate = new Date(shift.shift_end);
        
        return {
          centro_id: shift.center_id,
          centro_nombre: shift.center_name || `Centro ${shift.center_id}`,
          usuario_asignado: shift.assigned_user_name,
          fecha_inicio: formatDate(startDate),
          fecha_fin: formatDate(endDate),
          hora_inicio: formatTime(startDate),
          hora_fin: formatTime(endDate),
          dias_semana: formatWeekdays(shift.weekdays),
          estado: shift.status,
          notas: shift.notes || '',
        };
      });
      
      // Crear la matriz de datos
      const dataMatrix = rows.map((r) => headers.map((h) => (r[h] ?? '') as string | number));
      
      // Generar CSV usando Papa Parse
      const csvCore = Papa.unparse(
        {
          fields: headers,
          data: dataMatrix,
        },
        {
          delimiter: ';',
          quotes: true,
          newline: '\r\n',
        }
      );
      
      // Agregar separador para Excel y BOM para UTF-8
      const csv = 'sep=;\r\n' + csvCore;
      const csvWithBOM = '\uFEFF' + csv;
      
      // Crear blob y descargar
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `Turnos_Centro_${centerId}_${Date.now()}.csv`);
      
      alert('Turnos exportados exitosamente');
    } catch (err: any) {
      console.error('Error exporting shifts:', err);
      alert(err?.message || 'Error al exportar los turnos');
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setIncludeHistory(false);
    setFromDate('');
    setToDate('');
    setStatusFilter('all');
  };

  const getFilteredShifts = () => {
    let filtered = [...shifts];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    return filtered;
  };

  const filteredShifts = getFilteredShifts();

  if (isLoading) {
    return (
      <div className="shifts-page-container">
        <div className="loading-state">
          <p>Cargando turnos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shifts-page-container">
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={loadShifts} className="btn-create-shift">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shifts-page-container">
      <div className="shifts-header">
        <div>
          <h2>📅 Gestión de Turnos</h2>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>
            Centro {centerId}
          </p>
        </div>
        
        {canManage && (
          <div className="shifts-header-actions">
            <button
              className="btn-create-shift"
              onClick={() => setShowCreateModal(true)}
            >
              ➕ Asignar Turno
            </button>
            <button
              className="btn-export"
              onClick={handleExportCSV}
              disabled={isExporting || shifts.length === 0}
            >
              {isExporting ? '⏳ Exportando...' : '📥 Exportar CSV'}
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="shifts-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="fromDate">Desde:</label>
            <input
              type="date"
              id="fromDate"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="toDate">Hasta:</label>
            <input
              type="date"
              id="toDate"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="statusFilter">Estado:</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="programado">Programado</option>
              <option value="en_curso">En Curso</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeHistory}
                onChange={(e) => setIncludeHistory(e.target.checked)}
              />
              <span>Incluir historial</span>
            </label>
          </div>
          
          <button
            className="btn-clear-filters"
            onClick={clearFilters}
          >
            🔄 Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Toggle de vistas */}
      <div className="shifts-view-toggle">
        <button
          className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          📋 Lista
        </button>
        <button
          className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          📆 Calendario
        </button>
      </div>

      {/* Contenido */}
      <div className="shifts-content">
        {filteredShifts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No hay turnos registrados</h3>
            <p>
              {includeHistory
                ? 'No se encontraron turnos con los filtros aplicados'
                : 'No hay turnos activos. Asigna el primer turno para comenzar.'}
            </p>
            {canManage && (
              <button
                className="btn-create-shift"
                onClick={() => setShowCreateModal(true)}
              >
                ➕ Asignar Primer Turno
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="shifts-list">
            {filteredShifts.map((shift) => (
              <ShiftCard
                key={shift.shift_id}
                shift={shift}
                canManage={canManage}
                onEdit={() => setEditingShift(shift)}
                onCancel={() => handleCancelShift(shift.shift_id)}
                onViewHistory={() => setHistoryShift(shift)}
              />
            ))}
          </div>
        ) : (
          <ShiftsCalendarView
            shifts={filteredShifts}
            onShiftClick={(shift: CenterShift) => setHistoryShift(shift)}
          />
        )}
      </div>

      {/* Modales */}
      {showCreateModal && centerId && (
        <CreateShiftModal
          centerId={centerId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadShifts();
          }}
        />
      )}

      {editingShift && (
        <EditShiftModal
          shift={editingShift}
          onClose={() => setEditingShift(null)}
          onSuccess={() => {
            setEditingShift(null);
            loadShifts();
          }}
        />
      )}

      {historyShift && (
        <ShiftHistoryModal
          shift={historyShift}
          onClose={() => setHistoryShift(null)}
        />
      )}
    </div>
  );
}

// Componente de tarjeta de turno
interface ShiftCardProps {
  shift: CenterShift;
  canManage: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onViewHistory: () => void;
}

function ShiftCard({ shift, canManage, onEdit, onCancel, onViewHistory }: ShiftCardProps) {
  const startDate = new Date(shift.shift_start);
  const endDate = new Date(shift.shift_end);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="shift-card">
      <div className="shift-card-header">
        <div className="shift-info">
          <h4>{shift.center_name || `Centro ${shift.center_id}`}</h4>
          <p className="shift-user">👤 {shift.assigned_user_name}</p>
        </div>
        <span className={`shift-status ${shift.status}`}>
          {formatShiftStatus(shift.status)}
        </span>
      </div>

      <div className="shift-card-body">
        <div className="shift-detail">
          <strong>📅 Inicio:</strong>
          {formatDate(startDate)} {formatTime(startDate)}
        </div>
        <div className="shift-detail">
          <strong>📅 Fin:</strong>
          {formatDate(endDate)} {formatTime(endDate)}
        </div>
        <div className="shift-detail">
          <strong>📆 Días:</strong>
          <div className="shift-weekdays">
            {WEEKDAY_NAMES.map((day, index) => (
              <span
                key={index}
                className={`weekday-badge ${
                  shift.weekdays.includes(index as Weekday) ? 'active' : ''
                }`}
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>

      {shift.notes && (
        <div className="shift-notes">
          📝 {shift.notes}
        </div>
      )}

      <div className="shift-card-actions">
        {canManage && (shift.status === 'programado' || shift.status === 'en_curso') && (
          <>
            <button className="btn-action btn-edit" onClick={onEdit}>
              ✏️ Editar
            </button>
            <button className="btn-action btn-cancel" onClick={onCancel}>
              ❌ Cancelar
            </button>
          </>
        )}
        <button className="btn-action btn-history" onClick={onViewHistory}>
          📜 Ver Historial
        </button>
      </div>
    </div>
  );
}
