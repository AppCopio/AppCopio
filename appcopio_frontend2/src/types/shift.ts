// src/types/shift.ts

/**
 * Estado de un turno
 */
export type ShiftStatus = 'programado' | 'en_curso' | 'completado' | 'cancelado';

/**
 * Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Tipo de acción registrada en el historial
 */
export type ShiftHistoryAction = 'created' | 'updated' | 'cancelled' | 'completed';

/**
 * Turno de encargado de albergue completo
 */
export interface CenterShift {
  shift_id: string;
  center_id: string;
  center_name?: string;
  activation_id: number;
  assigned_user_id: number;
  assigned_user_name?: string;
  assigned_user_email?: string;
  
  shift_start: string; // ISO timestamp
  shift_end: string;   // ISO timestamp
  weekdays: Weekday[];
  
  notes?: string | null;
  status: ShiftStatus;
  
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
}

/**
 * Input para crear un nuevo turno
 */
export interface CreateShiftInput {
  center_id: string;
  activation_id?: number;
  assigned_user_id: number;
  shift_start: string; // ISO timestamp
  shift_end: string;   // ISO timestamp
  weekdays?: Weekday[];
  notes?: string;
}

/**
 * Input para actualizar un turno existente
 */
export interface UpdateShiftInput {
  shift_start?: string;
  shift_end?: string;
  weekdays?: Weekday[];
  notes?: string;
  status?: ShiftStatus;
}

/**
 * Detalle de un conflicto de turno
 */
export interface ShiftConflict {
  conflictType: 'overlap' | 'full_coverage_gap' | 'user_unavailable';
  message: string;
  conflictingShifts?: CenterShift[];
}

/**
 * Registro de historial de cambios en un turno
 */
export interface ShiftHistoryEntry {
  history_id: string;
  shift_id: string;
  action: ShiftHistoryAction;
  changed_by?: number | null;
  changed_by_name?: string;
  changed_at: string;
  previous_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  reason?: string | null;
}

/**
 * Opciones para filtrar listado de turnos
 */
export interface ShiftListOptions {
  include_history?: boolean;
  from_date?: string;
  to_date?: string;
}

/**
 * Estadísticas de turnos
 */
export interface ShiftStatistics {
  total_shifts: number;
  programado: number;
  en_curso: number;
  completado: number;
  cancelado: number;
  centers_with_shifts: number;
  users_assigned: number;
}
