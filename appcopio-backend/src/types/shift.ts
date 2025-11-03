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
 * Turno de encargado de albergue completo (con joins)
 */
export interface CenterShift {
    shift_id: string;
    center_id: string;
    center_name?: string; // JOIN desde Centers
    activation_id: number;
    assigned_user_id: number;
    assigned_user_name?: string; // JOIN desde Users
    assigned_user_email?: string; // JOIN desde Users
    
    shift_start: string; // ISO timestamp
    shift_end: string;   // ISO timestamp
    weekdays: Weekday[];
    
    notes?: string | null;
    status: ShiftStatus;
    
    created_by?: number | null;
    updated_by?: number | null;
    created_at: string; // ISO timestamp
    updated_at?: string | null;
    deleted_at?: string | null;
}

/**
 * Input para crear un nuevo turno
 */
export interface CreateShiftInput {
    center_id: string;
    activation_id?: number; // Opcional, se puede obtener del centro activo
    assigned_user_id: number;
    shift_start: string; // ISO timestamp
    shift_end: string;   // ISO timestamp
    weekdays?: Weekday[]; // Por defecto todos los días
    notes?: string;
    created_by: number;
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
    updated_by: number;
}

/**
 * Tipo de conflicto detectado en validación
 */
export type ConflictType = 'overlap' | 'full_coverage_gap' | 'user_unavailable';

/**
 * Detalle de un conflicto de turno
 */
export interface ShiftConflict {
    conflictType: ConflictType;
    message: string;
    conflictingShifts?: CenterShift[];
    missingCoverage?: { 
        day: Weekday; 
        hours: string[] 
    }[];
}

/**
 * Resultado de validación de turnos
 */
export interface ShiftValidationResult {
    isValid: boolean;
    conflicts: ShiftConflict[];
}

/**
 * Registro de historial de cambios en un turno
 */
export interface ShiftHistoryEntry {
    history_id: string;
    shift_id: string;
    action: ShiftHistoryAction;
    changed_by?: number | null;
    changed_by_name?: string; // JOIN desde Users
    changed_at: string; // ISO timestamp
    previous_data?: Record<string, any> | null;
    new_data?: Record<string, any> | null;
    reason?: string | null;
}

/**
 * Opciones para filtrar listado de turnos
 */
export interface ShiftListOptions {
    includeHistory?: boolean; // Incluir turnos completados/cancelados
    fromDate?: string; // ISO timestamp
    toDate?: string;   // ISO timestamp
    status?: ShiftStatus | ShiftStatus[];
    centerId?: string;
    userId?: number;
}

/**
 * Fila para exportación CSV
 */
export interface ShiftExportRow {
    centro: string;
    encargado: string;
    email: string;
    fecha_inicio: string;
    fecha_fin: string;
    hora_inicio: string;
    hora_fin: string;
    dias_semana: string;
    estado: string;
    notas: string;
}

/**
 * Estadísticas de turnos (para dashboards)
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
