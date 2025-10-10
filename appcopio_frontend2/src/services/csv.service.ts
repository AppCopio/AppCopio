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
    description: 'Usuarios del sistema con credenciales de acceso',
    requiredColumns: ['rut', 'username', 'email', 'role'],
    optionalColumns: ['nombre', 'genero', 'celular', 'is_active', 'es_apoyo_admin', 'password'],
    sampleRows: [
      { rut: '12.345.678-5', username: 'jperez', email: 'juan.perez@email.com', role: 'Trabajador Municipal', nombre: 'Juan Pérez', genero: 'M', celular: '+56912345678', is_active: 1, es_apoyo_admin: 0, password: 'password123' }
    ]
  },
  centers: {
    displayName: 'Centros',
    description: 'Creación de Centros de Acopio con ubicación geográfica',
    requiredColumns: ['name', 'address', 'type', 'latitude', 'longitude'],
    optionalColumns: ['capacity', 'should_be_active', 'comunity_charge_username', 'municipal_manager_username'],
    sampleRows: [
      { name: 'Centro de Acopio Norte', type: 'Albergue', address: 'Av. Libertador 1234', latitude: -33.4489, longitude: -70.6693, capacity: 200, is_active: 1, should_be_active: 1, operational_status: 'abierto', public_note: 'Centro principal para emergencias', folio: 'FOL001', comunity_charge_username: 'jperez', municipal_manager_username: 'mgarcia' }
    ]
  },
  inventory: {
    displayName: 'Inventario',
    description: 'Agregar ítems al inventario de centros.',
    requiredColumns: ['center_id', 'item_name', 'category', 'quantity', 'unit'],
    optionalColumns: ['notes', 'updated_by'],
    sampleRows: [
      { center_id: 'C001', item_name: 'Arroz', category: 'Alimentos', quantity: 100, unit: 'kg', updated_by: 'jperez', notes: 'Donación JJVV' }
    ]
  },
  residents: {
    displayName: 'Personas',
    description: 'Registro de personas/residentes.',
    requiredColumns: ['rut', 'nombre', 'primer_apellido', 'nacionalidad', 'genero', 'edad'],
    optionalColumns: ['segundo_apellido', 'estudia', 'trabaja', 'perdida_trabajo', 'rubro', 'discapacidad', 'dependencia'],
    sampleRows: [
      { rut: '18.765.432-1', nombre: 'Ana', primer_apellido: 'Martínez', segundo_apellido: 'López', nacionalidad: 'Chilena', genero: 'F', edad: 34, estudia: 0, trabaja: 1, perdida_trabajo: 0, rubro: 'Comercio', discapacidad: 0, dependencia: 0 }
    ]
  },
  assignments: {
    displayName: 'Asignaciones',
    description: 'Asignar usuarios a centros .',
    requiredColumns: ['username', 'center_id', 'role'],
    optionalColumns: ['changed_by_username'],
    sampleRows: [
      { username: 'jperez', center_id: 'C001', role: 'trabajador municipal', changed_by_username: 'mgarcia' }
    ]
  },
  updates: {
    displayName: 'Solicitudes de Actualización',
    description: 'Crear solicitudes de actualización para centros.',
    requiredColumns: ['center_id', 'description', 'urgency', 'requested_by_username'],
    optionalColumns: [],
    sampleRows: [
      { center_id: 'C001', description: 'Actualizar stock de agua.', urgency: 'alta', requested_by_username: 'jperez' }
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
