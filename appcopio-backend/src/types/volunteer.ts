/**
 * Define los estados posibles de una solicitud de voluntario.
 */
export type VolunteerStatus = 'pendiente' | 'contactado' | 'aceptado' | 'rechazado';

/**
 * Payload para CREAR una nueva solicitud de voluntario.
 */
export interface VolunteerContactData {
  nombre: string;
  celular: string;
  email: string;
  capacitaciones: string;
  descripcion_servicios: string;
}

/**
 * Payload para ACTUALIZAR el estado de un voluntario.
 */
export interface VolunteerStatusUpdateData {
  status: VolunteerStatus;
  notes?: string;
}

/**
 * La entidad principal de Voluntario.
 */
export interface VolunteerInfo extends VolunteerContactData {
  volunteer_id: string;
  center_id: string;
  status: VolunteerStatus;
  created_at: string;
  updated_at: string;
  notes?: string | null;
  contacted_at?: string | null; 
  //contacted_by?: number | null; // El ID (INT) del usuario que contactó, quizás sea bueno guardar esto?
  center_name?: string; 
  //contacted_by_name?: string | null;  
}

/**
 * Respuesta específica al crear una solicitud de voluntario.
 */
export interface VolunteerContactResponse {
  success: boolean;
  message: string;
  volunteer_id?: string;
  created_at?: string; 
}