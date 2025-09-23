// src/services/csv.service.ts
import { api } from '@/lib/api';

export type CSVUploadModule = 
  | 'centers' 
  | 'inventory' 
  | 'users' 
  | 'residents'
  | 'assignments'
  | 'updates';

export interface CSVUploadRequest {
  module: CSVUploadModule;
  data: Record<string, any>[];
  options?: {
    updateExisting?: boolean;
    ignoreErrors?: boolean;
    dryRun?: boolean;
    centerId?: string;
  };
}

export interface CSVUploadResponse {
  success: boolean;
  message: string;
  results: {
    totalRows: number;
    processedRows: number;
    createdRows: number;
    updatedRows: number;
    errorRows: number;
    skippedRows: number;
  };
  errors?: CSVUploadError[];
  warnings?: CSVUploadWarning[];
  data?: any[];
}

export interface CSVUploadError {
  row: number;
  field?: string;
  message: string;
  code: string;
  value?: any;
}

export interface CSVUploadWarning {
  row: number;
  field?: string;
  message: string;
  value?: any;
}

export interface CSVTemplateInfo {
  module: CSVUploadModule;
  displayName: string;
  description: string;
  requiredColumns: string[];
  optionalColumns: string[];
  sampleData: Record<string, any>[];
  validationRules: {
    field: string;
    type: string;
    required: boolean;
    description: string;
  }[];
}

/**
 * Envía datos CSV procesados al backend para su importación
 */
export async function uploadCSVData(
  request: CSVUploadRequest,
  signal?: AbortSignal
): Promise<CSVUploadResponse> {
  try {
    const { data } = await api.post<CSVUploadResponse>(
      '/csv/upload',
      request,
      { signal }
    );
    return data;
  } catch (error) {
    console.error('Error uploading CSV data:', error);
    throw error;
  }
}

/**
 * Obtiene información sobre las plantillas CSV disponibles
 */
export async function getCSVTemplates(
  signal?: AbortSignal
): Promise<CSVTemplateInfo[]> {
  try {
    const { data } = await api.get<CSVTemplateInfo[]>(
      '/csv/templates',
      { signal }
    );
    return data;
  } catch (error) {
    console.error('Error fetching CSV templates:', error);
    return [];
  }
}

/**
 * Descarga una plantilla CSV de ejemplo para un módulo específico
 */
export async function downloadCSVTemplate(
  module: CSVUploadModule,
  signal?: AbortSignal
): Promise<string> {
  try {
    const { data } = await api.get<string>(
      `/csv/templates/${module}/download`,
      { 
        signal,
        headers: {
          'Accept': 'text/csv'
        }
      }
    );
    return data;
  } catch (error) {
    console.error(`Error downloading CSV template for ${module}:`, error);
    throw error;
  }
}

/**
 * Valida datos CSV en el servidor sin importarlos (dry run)
 */
export async function validateCSVData(
  request: Omit<CSVUploadRequest, 'options'>,
  signal?: AbortSignal
): Promise<CSVUploadResponse> {
  try {
    const validationRequest: CSVUploadRequest = {
      ...request,
      options: {
        dryRun: true
      }
    };

    return await uploadCSVData(validationRequest, signal);
  } catch (error) {
    console.error('Error validating CSV data:', error);
    throw error;
  }
}

// Configuraciones predefinidas para diferentes módulos
export const CSV_MODULE_CONFIGS = {
  centers: {
    displayName: 'Centros',
    description: 'Información de centros de acopio y albergues',
    requiredColumns: ['name', 'address', 'type'],
    optionalColumns: [
      'capacity', 'latitude', 'longitude', 'folio', 
      'nombre_dirigente', 'cargo_dirigente', 'telefono_contacto'
    ],
    validationRules: [
      { field: 'name', required: true, type: 'string' },
      { field: 'address', required: true, type: 'string' },
      { field: 'type', required: true, type: 'string' },
      { field: 'capacity', required: false, type: 'number' },
      { field: 'latitude', required: false, type: 'number' },
      { field: 'longitude', required: false, type: 'number' },
    ]
  },
  inventory: {
    displayName: 'Inventario',
    description: 'Ítems de inventario para centros',
    requiredColumns: ['center_id', 'name', 'category', 'quantity'],
    optionalColumns: ['unit', 'description'],
    validationRules: [
      { field: 'center_id', required: true, type: 'string' },
      { field: 'name', required: true, type: 'string' },
      { field: 'category', required: true, type: 'string' },
      { field: 'quantity', required: true, type: 'number' },
    ]
  },
  users: {
    displayName: 'Usuarios',
    description: 'Usuarios del sistema',
    requiredColumns: ['rut', 'nombre', 'username', 'email', 'role_id'],
    optionalColumns: ['genero', 'celular', 'es_apoyo_admin', 'is_active'],
    validationRules: [
      { field: 'rut', required: true, type: 'string' },
      { field: 'nombre', required: true, type: 'string' },
      { field: 'username', required: true, type: 'string' },
      { field: 'email', required: true, type: 'email' },
      { field: 'role_id', required: true, type: 'number' },
    ]
  },
  residents: {
    displayName: 'Residentes',
    description: 'Personas albergadas en centros',
    requiredColumns: ['center_id', 'rut', 'nombre', 'primer_apellido'],
    optionalColumns: [
      'segundo_apellido', 'edad', 'genero', 'nacionalidad',
      'estudia', 'trabaja', 'discapacidad', 'parentesco'
    ],
    validationRules: [
      { field: 'center_id', required: true, type: 'string' },
      { field: 'rut', required: true, type: 'string' },
      { field: 'nombre', required: true, type: 'string' },
      { field: 'primer_apellido', required: true, type: 'string' },
      { field: 'edad', required: false, type: 'number' },
    ]
  },
  assignments: {
    displayName: 'Asignaciones',
    description: 'Asignación de usuarios a centros',
    requiredColumns: ['user_id', 'center_id', 'role'],
    optionalColumns: [],
    validationRules: [
      { field: 'user_id', required: true, type: 'number' },
      { field: 'center_id', required: true, type: 'string' },
      { field: 'role', required: true, type: 'string' },
    ]
  },
  updates: {
    displayName: 'Solicitudes de Actualización',
    description: 'Solicitudes de actualización para centros',
    requiredColumns: ['center_id', 'description', 'urgency'],
    optionalColumns: ['requested_by'],
    validationRules: [
      { field: 'center_id', required: true, type: 'string' },
      { field: 'description', required: true, type: 'string' },
      { field: 'urgency', required: true, type: 'string' },
    ]
  }
};

/**
 * Genera opciones de validación para el parser CSV basadas en la configuración del módulo
 */
export function getCSVParseOptions(module: CSVUploadModule) {
  const config = CSV_MODULE_CONFIGS[module];
  if (!config) {
    throw new Error(`Configuración no encontrada para el módulo: ${module}`);
  }

  return {
    requiredColumns: config.requiredColumns,
    validationRules: config.validationRules.map(rule => ({
      field: rule.field,
      required: rule.required,
      type: rule.type as any,
      validate: rule.field === 'rut' ? (value: string) => {
        // Validación RUT chileno básica
        const cleanRut = value.replace(/[^0-9kK]/g, '');
        if (cleanRut.length < 2) return 'RUT debe tener al menos 2 caracteres';
        return null;
      } : undefined
    }))
  };
}
