/**
 * Datos del formulario de contacto de voluntarios (para envío)
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
 * ✅ ACTUALIZADO: Estructura que devuelve el backend (VolunteerInfo)
 * Esta es la estructura REAL que devuelve el servicio volunteerContactService del backend
 */
export interface VolunteerContactResponse {
  volunteer_id: string;  // ID del registro
  center_id: string;
  created_at: string;
  updated_at: string | null;
  
  // Datos del formulario
  nombre: string;
  celular: string;
  email: string;
  capacitaciones: string;
  descripcion_servicios: string;
  
  // Campos de gestión
  notes: string | null;
  contacted_at: string | null;
  status: VolunteerStatus;
}

/**
 * Estados posibles de un contacto de voluntario
 */
export type VolunteerStatus = 'pendiente' | 'contactado' | 'aceptado' | 'rechazado';

/**
 * DTO para actualizar el estado de un voluntario
 */
export interface VolunteerStatusUpdate {
  status?: VolunteerStatus;
  notes?: string;
}