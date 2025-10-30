export type ActiveActivationRow = {
  activation_id: number;
  center_id: string;           // VARCHAR(10)
  started_at: string;          // timestamptz -> string en JS
  ended_at: string | null;
};

/**
 * Resumen de una activación en el historial
 * Usado para listar todas las activaciones de un centro
 */
export interface ActivationHistoryItem {
  activation_id: number;
  center_id: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  activated_by_name: string | null;
  activated_by: number;
  deactivated_by_name: string | null;
  deactivated_by: number | null;
  duration_days: number;
  total_families: number;
  total_people: number;
  total_managers: number;
  total_databases: number;
}

/**
 * Familia dentro de una activación
 */
export interface ActivationFamily {
  family_id: number;
  activation_id: number;
  observaciones: string | null;
  status: 'activo' | 'inactivo';
  departure_date: string | null;
  departure_reason: string | null;
  head_person_id: number;
  head_nombre: string;
  head_apellido: string;
  head_rut: string;
  members_count: number;
}

/**
 * Encargado dentro de una activación
 */
export interface ActivationManager {
  assignment_id: number;
  user_id: number;
  user_name: string;
  user_rut: string | null;
  user_phone: string | null;
  start_date: string;
  end_date: string | null;
  started_by_name: string | null;
  ended_by_name: string | null;
}

/**
 * Base de datos creada en una activación
 */
export interface ActivationDatabase {
  dataset_id: string;
  database_name: string;
  description: string | null;
  created_at: string;
  created_by_name: string | null;
  records_count: number;
}

/**
 * Estadísticas de inventario durante una activación
 */
export interface ActivationInventoryStats {
  total_movements: number;
  additions: number;
  subtractions: number;
  adjustments: number;
}

/**
 * Resumen numérico de una activación
 */
export interface ActivationSummary {
  total_families: number;
  total_people: number;
  total_managers: number;
  total_databases: number;
  active_managers: number;
}

/**
 * Información básica de una activación
 */
export interface ActivationInfo {
  activation_id: number;
  center_id: string;
  center_name: string;
  center_address: string | null;
  center_type: 'acopio' | 'albergue';
  center_capacity: number;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  activated_by_name: string | null;
  activated_by: number;
  deactivated_by_name: string | null;
  deactivated_by: number | null;
  duration_days: number;
}

/**
 * Detalle completo de una activación
 * Incluye toda la información relacionada
 */
export interface ActivationDetail {
  activation: ActivationInfo;
  families: ActivationFamily[];
  managers: ActivationManager[];
  databases: ActivationDatabase[];
  inventory_stats: ActivationInventoryStats;
  summary: ActivationSummary;
}
