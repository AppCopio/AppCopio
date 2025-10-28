// src/types/csv.ts
export type CSVUploadModule =
  | 'centers' 
  | 'inventory' 
  | 'users' 
  | 'residents'
  | 'assignments'
  | 'updates';

// Alias para compatibilidad
export type CSVModule = CSVUploadModule;

export interface CSVUploadRequest {
  module: CSVModule;
  data: Array<Record<string, any>>;
  uploadedBy?: {
    user_id: number;
    username: string;
  };
}

export interface CSVUploadRowError {
  row: number;
  message: string;
  column?: string;
}

export interface CSVUploadResponse {
  success: boolean;
  message: string;
  results?: {
    totalRows: number;
    processedRows: number;
    createdRows?: number;
    updatedRows?: number;
    errorRows?: number;
    errors?: CSVUploadRowError[];
  };
}

// USERS
export interface RawUserRow {
  rut?: string; nombre?: string; username?: string; email?: string; role?: string; // Cambiado role_id por role
  genero?: string; celular?: string; es_apoyo_admin?: string|number|boolean; is_active?: string|number|boolean;
  password?: string;
}

// CENTERS
export interface RawCenterRow {
  name?: string; address?: string; type?: string; capacity?: string|number;
  latitude?: string|number; longitude?: string|number;
  should_be_active?: string|number|boolean; comunity_charge_username?: string; municipal_manager_username?: string; // Cambiado RUTs por usernames
  // resto opcional (catastro / denormalizados)
  [k: string]: any;
}

// INVENTORY
export interface RawInventoryRow {
  center_id?: string; // Mantenemos center_id como está (C001, C002, etc.)
  item_name?: string;
  category?: string; // Cambiado category_id por category (nombre de categoría)
  quantity?: string|number;
  unit?: string;
  notes?: string;
  updated_by?: string; // Cambiado username por updated_by para mayor claridad
}

// RESIDENTS (Persons)
export interface RawResidentRow {
  rut?: string; nombre?: string; primer_apellido?: string; segundo_apellido?: string;
  nacionalidad?: string; genero?: string; edad?: string|number;
  estudia?: string|number|boolean; trabaja?: string|number|boolean; perdida_trabajo?: string|number|boolean;
  rubro?: string; discapacidad?: string|number|boolean; dependencia?: string|number|boolean;
  jefe_hogar_rut?: string; // RUT del jefe de hogar (si no viene, la persona será jefe de su propio grupo)
  activation_id?: string|number; // ID de la activación donde se registra la persona
  parentesco?: string; // Relación con el jefe de hogar (ej: "Jefe de Hogar", "Cónyuge", "Hijo/a", etc.)
}

// ASSIGNMENTS
export interface RawAssignmentRow {
  username?: string; // Cambiado user_rut por username
  center_id?: string;
  role?: string;           // normRole
  changed_by_username?: string; // Cambiado changed_by_rut por changed_by_username
}

// UPDATES
export interface RawUpdateRow {
  center_id?: string;
  description?: string;
  urgency?: string;
  requested_by_username?: string; // Cambiado requested_by_rut por requested_by_username
}
