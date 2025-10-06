// src/services/csv.service.ts
import { CSVUploadModule, CSVParseOptions, CSVUploadResponse } from '@/types/csv';
import {api} from '@/lib/api'; // tu axios preconfigurado

export const CSV_MODULE_CONFIGS: Record<
  CSVUploadModule,
  {
    displayName: string;
    description: string;
    requiredColumns: string[];
    optionalColumns: string[];
    sampleRows?: Array<Record<string, any>>;
  }
> = {
  users: {
    displayName: 'Usuarios',
    description: 'Usuarios del sistema',
    requiredColumns: ['rut', 'nombre', 'username', 'email', 'role_id'],
    optionalColumns: ['genero', 'celular', 'es_apoyo_admin', 'is_active', 'password'],
    sampleRows: [
      { rut: '12.345.678-5', nombre: 'Juan Paredes', username: 'jparedes', email: 'jparedes@example.com', role_id: 1, genero: 'M', celular: '+56 9 1234 5678', es_apoyo_admin: 1, is_active: 1 }
    ]
  },
  centers: {
    displayName: 'Centros',
    description: 'Creación de Centros (básicos + catastro opcional)',
    requiredColumns: ['name', 'address', 'type', 'capacity', 'latitude', 'longitude'],
    optionalColumns: ['should_be_active', 'comunity_charge_id', 'municipal_manager_id', 'public_note', 'operational_status'],
    sampleRows: [
      { name: 'Liceo A N°1', address: 'Av. Siempre Viva 123', type: 'acopio', capacity: 500, latitude: -33.045, longitude: -71.62, should_be_active: 1, comunity_charge_id: 101, municipal_manager_id: 202 }
    ]
  },
  inventory: {
    displayName: 'Inventario',
    description: 'Agregar ítems a inventario por centro',
    requiredColumns: ['center_id', 'item_name', 'category_id', 'quantity', 'unit', 'user_id'],
    optionalColumns: ['notes'],
    sampleRows: [
      { center_id: 'CTR-001', item_name: 'Arroz 1kg', category_id: 1, quantity: 50, unit: 'kg', user_id: 10, notes: 'Donación JJVV' }
    ]
  },
  residents: {
    displayName: 'Personas',
    description: 'Registro de personas/residentes',
    requiredColumns: ['rut', 'nombre', 'primer_apellido', 'nacionalidad', 'genero', 'edad'],
    optionalColumns: ['segundo_apellido', 'estudia', 'trabaja', 'perdida_trabajo', 'rubro', 'discapacidad', 'dependencia'],
    sampleRows: [
      { rut: '18.765.432-1', nombre: 'Carla', primer_apellido: 'Rojas', segundo_apellido: '', nacionalidad: 'Chilena', genero: 'F', edad: 34, estudia: 0, trabaja: 1, perdida_trabajo: 0, rubro: 'Comercio', discapacidad: 0, dependencia: 0 }
    ]
  },
  assignments: {
    displayName: 'Asignaciones',
    description: 'Asignar usuarios a centros por rol',
    requiredColumns: ['user_id', 'center_id', 'role'],
    optionalColumns: ['changed_by'],
    sampleRows: [
      { user_id: 10, center_id: 'CTR-001', role: 'encargado', changed_by: 1 }
    ]
  },
  updates: {
    displayName: 'Solicitudes de Actualización',
    description: 'Crear solicitudes de actualización para centros',
    requiredColumns: ['center_id', 'description', 'urgency', 'requested_by'],
    optionalColumns: [],
    sampleRows: [
      { center_id: 'CTR-001', description: 'Actualizar stock de agua.', urgency: 'alta', requested_by: 10 }
    ]
  }
};

export function getCSVParseOptions(module: CSVUploadModule): CSVParseOptions {
  const cfg = CSV_MODULE_CONFIGS[module];
  return {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: 'greedy',
    requiredColumns: cfg.requiredColumns
  };
}

// Plantillas estáticas en /public (si las tienes)
const TEMPLATE_PUBLIC_PATH: Record<CSVUploadModule, string> = {
  users: '/csv-templates/users.csv',
  centers: '/csv-templates/centers.csv',
  inventory: '/csv-templates/inventory.csv',
  residents: '/csv-templates/residents.csv',
  assignments: '/csv-templates/assignments.csv',
  updates: '/csv-templates/updates.csv',
};
export function downloadStaticTemplate(module: CSVUploadModule) {
  const href = TEMPLATE_PUBLIC_PATH[module];
  const a = document.createElement('a');
  a.href = href;
  a.download = href.split('/').pop() || `${module}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Validar en servidor (si tienes endpoint de validación)
export async function validateCSVData(payload: { module: CSVUploadModule; data: any[] }) {
  const { data } = await api.post<CSVUploadResponse>('/csv/validate', payload);
  return data;
}

// Importar/guardar (tu endpoint actual)
export async function uploadCSVData(
  request: { module: CSVUploadModule; data: any[]; options?: { updateExisting?: boolean; ignoreErrors?: boolean } },
  signal?: AbortSignal
): Promise<CSVUploadResponse> {
  const { data } = await api.post<CSVUploadResponse>('/csv/upload', request, { signal });
  return data;
}
