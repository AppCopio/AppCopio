// src/types/csv.ts
export type CSVModule =
  | 'centers' 
  | 'inventory' 
  | 'users' 
  | 'residents'
  | 'assignments'
  | 'updates';

export interface CSVUploadRequest {
  module: CSVModule;
  data: Array<Record<string, any>>;
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
  rut?: string; nombre?: string; username?: string; email?: string; role_id?: string|number;
  genero?: string; celular?: string; es_apoyo_admin?: string|number|boolean; is_active?: string|number|boolean;
  password?: string;
}

// CENTERS
export interface RawCenterRow {
  name?: string; address?: string; type?: string; capacity?: string|number;
  latitude?: string|number; longitude?: string|number;
  should_be_active?: string|number|boolean; comunity_charge_id?: string|number; municipal_manager_id?: string|number;
  // resto opcional (catastro / denormalizados)
  [k: string]: any;
}

// INVENTORY
export interface RawInventoryRow {
  center_id?: string;
  item_name?: string;
  category_id?: string|number;
  quantity?: string|number;
  unit?: string;
  notes?: string;
  user_id?: string|number;
}

// RESIDENTS (Persons)
export interface RawResidentRow {
  rut?: string; nombre?: string; primer_apellido?: string; segundo_apellido?: string;
  nacionalidad?: string; genero?: string; edad?: string|number;
  estudia?: string|number|boolean; trabaja?: string|number|boolean; perdida_trabajo?: string|number|boolean;
  rubro?: string; discapacidad?: string|number|boolean; dependencia?: string|number|boolean;
}

// ASSIGNMENTS
export interface RawAssignmentRow {
  user_id?: string|number;
  center_id?: string;
  role?: string;           // normRole
  changed_by?: string|number;
}

// UPDATES
export interface RawUpdateRow {
  center_id?: string;
  description?: string;
  urgency?: string;
  requested_by?: string|number;
}
