// src/types/serviceRequest.ts

/**
 * Define los estados posibles de una solicitud de servicio.
 */
export type ServiceRequestStatus = 'pendiente' | 'en progreso' | 'completado' | 'cancelado';

/**
 * Categorías de servicios.
 */
export type ServiceCategory =
  | "salud"
  | "alimentacion"
  | "construccion"
  | "limpieza"
  | "logistica"
  | "educacion"
  | "legal"
  | "psicologico"
  | "tecnologia"
  | "otro";

/**
 * Niveles de urgencia.
 */
export type ServiceUrgency = "baja" | "media" | "alta" | "crítica";

export type ServiceDuration = 'horas' | 'dias' | 'semanas' | 'indefinido';

/**
 * Payload para CREAR una nueva solicitud de servicio.
 */
export interface ServiceRequestCreateData {
  titulo: string;
  descripcion: string;
  categoria: ServiceCategory;
  urgencia: ServiceUrgency;
  duracion_estimada: ServiceDuration;
}
/**
 * Payload para ACTUALIZAR una solicitud de servicio.
 */
export interface ServiceRequestUpdateData {
  titulo?: string;
  descripcion?: string;
  categoria?: ServiceCategory;
  urgencia?: ServiceUrgency;
  duracion_estimada?: ServiceDuration;
  status?: ServiceRequestStatus;
  notas_internas?: string;
}

/**
 * La entidad principal de Solicitud de Servicio.
 */
export interface ServiceRequestInfo extends ServiceRequestCreateData {
  service_request_id: string;
  center_id: string;
  activation_id: number;
  created_by: number;
  status: ServiceRequestStatus;
  created_at: string;
  updated_at: string;
  notas_internas?: string | null;
  completed_at?: string | null;
  center_name?: string;
  created_by_name?: string;
}

/**
 * Respuesta al crear un aviso
 */
export interface ServiceRequestCreateResponse {
  success: boolean;
  message: string;
  service_request_id?: string;
  created_at?: string;
}

/**
 * Filtros para listar avisos
 */
export interface ServiceRequestFilters {
  activation_id?: number;
  center_id?: string;
  status?: ServiceRequestStatus;
  categoria?: ServiceCategory;
  urgencia?: ServiceUrgency;
}