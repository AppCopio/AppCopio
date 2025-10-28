// src/types/csv.ts
export type CSVUploadModule =
  | 'users'
  | 'centers'
  | 'inventory'
  | 'residents'
  | 'assignments'
  | 'updates';

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

export interface CSVParseOptions {
  header: boolean;
  dynamicTyping: boolean | Record<string, boolean>;
  skipEmptyLines: boolean | 'greedy';
  requiredColumns?: string[];
}
