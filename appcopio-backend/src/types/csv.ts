// src/types/csv.ts
export type CSVModule = "users";

export interface CSVUploadRequest {
  module: CSVModule;
  data: Array<Record<string, any>>;
}

export interface CSVUploadRowError {
  row: number;              // número de fila (excel-style): header=1 => primera fila de datos = 2
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

// ====== Específico de users (input crudo del CSV) ======
export interface RawUserRow {
  rut?: string;
  nombre?: string;
  username?: string;
  email?: string;
  role_id?: string | number;
  genero?: string;     
  celular?: string;
  es_apoyo_admin?: string | number | boolean;
  is_active?: string | number | boolean;
  password?: string;
}
