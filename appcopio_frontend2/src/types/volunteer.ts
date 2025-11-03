/**
 * Datos del formulario de contacto de voluntarios
 */
export interface VolunteerContactCreate {
  nombre: string;
  rut: string;
  celular: string;
  email: string;
  capacitaciones: string;
  descripcion_servicios: string;
}

/**
 * Respuesta del backend con los datos del registro dinámico
 */
export interface VolunteerContactResponse {
  id: string; // ID del registro (record_id)
  dataset_id: string;
  version: number;
  created_at: string;
  created_by: string;
  data: {
    [key: string]: string | number | boolean | null; // Campos de texto (Nombre, Email, etc.)
  };
  select_values: {
    [key: string]: string[]; // Campos de selección (Status)
  };
}

/**
 * Estados posibles de un contacto de voluntario
 */
export type VolunteerStatus = 'pendiente' | 'contactado' | 'aceptado' | 'rechazado';