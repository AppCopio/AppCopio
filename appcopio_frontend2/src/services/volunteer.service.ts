// src/services/volunteer.service.ts
/**
 * Servicio para gestionar contactos de voluntarios
 * Este servicio maneja las comunicaciones con el backend para
 * el formulario de contacto de servicios voluntarios en albergues
 */

import { api } from '@/lib/api';

/**
 * Datos del formulario de contacto de voluntarios
 */
export interface VolunteerContactData {
  nombre: string;
  celular: string;
  email: string;
  capacitaciones: string;
  descripcion_servicios: string;
}

/**
 * Respuesta del servidor al enviar un contacto de voluntario
 */
export interface VolunteerContactResponse {
  success: boolean;
  message: string;
  volunteer_id?: string;
  created_at?: string;
}

/**
 * Información de un voluntario registrado
 */
export interface VolunteerInfo extends VolunteerContactData {
  volunteer_id: string;
  center_id: string;
  center_name: string;
  status: 'pendiente' | 'contactado' | 'aceptado' | 'rechazado';
  created_at: string;
  updated_at: string;
  contacted_at?: string;
  contacted_by?: string;
  notes?: string;
}

/**
 * Servicio de voluntarios
 */
export const volunteerService = {
  /**
   * Envía una solicitud de contacto para servicios voluntarios
   * @param centerId - ID del centro/albergue
   * @param data - Datos del formulario de contacto
   * @returns Respuesta del servidor
   */
  async submitContact(
    centerId: string,
    data: VolunteerContactData
  ): Promise<VolunteerContactResponse> {
    try {
      const response = await api.post<VolunteerContactResponse>(
        `/api/centers/${centerId}/volunteer-contact`,
        data
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al enviar contacto de voluntario:', error);
      throw new Error(
        error.response?.data?.message || 
        'Error al enviar el formulario. Por favor intenta nuevamente.'
      );
    }
  },

  /**
   * Obtiene la lista de voluntarios de un centro específico
   * @param centerId - ID del centro/albergue
   * @returns Lista de voluntarios
   */
  async getVolunteersByCenter(centerId: string): Promise<VolunteerInfo[]> {
    try {
      const response = await api.get<VolunteerInfo[]>(
        `/api/centers/${centerId}/volunteers`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener voluntarios del centro:', error);
      throw new Error(
        error.response?.data?.message || 
        'Error al cargar la lista de voluntarios.'
      );
    }
  },

  /**
   * Actualiza el estado de un voluntario
   * @param volunteerId - ID del voluntario
   * @param status - Nuevo estado
   * @param notes - Notas opcionales
   * @returns Información actualizada del voluntario
   */
  async updateVolunteerStatus(
    volunteerId: string,
    status: VolunteerInfo['status'],
    notes?: string
  ): Promise<VolunteerInfo> {
    try {
      const response = await api.patch<VolunteerInfo>(
        `/api/volunteers/${volunteerId}/status`,
        { status, notes }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al actualizar estado de voluntario:', error);
      throw new Error(
        error.response?.data?.message || 
        'Error al actualizar el estado del voluntario.'
      );
    }
  },

  /**
   * Obtiene los detalles de un voluntario específico
   * @param volunteerId - ID del voluntario
   * @returns Información del voluntario
   */
  async getVolunteerById(volunteerId: string): Promise<VolunteerInfo> {
    try {
      const response = await api.get<VolunteerInfo>(
        `/api/volunteers/${volunteerId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener detalles del voluntario:', error);
      throw new Error(
        error.response?.data?.message || 
        'Error al cargar los detalles del voluntario.'
      );
    }
  },

  /**
   * Elimina un registro de voluntario
   * @param volunteerId - ID del voluntario
   */
  async deleteVolunteer(volunteerId: string): Promise<void> {
    try {
      await api.delete(`/api/volunteers/${volunteerId}`);
    } catch (error: any) {
      console.error('Error al eliminar voluntario:', error);
      throw new Error(
        error.response?.data?.message || 
        'Error al eliminar el registro del voluntario.'
      );
    }
  },

  /**
   * Obtiene estadísticas de voluntarios de un centro
   * @param centerId - ID del centro/albergue
   * @returns Estadísticas
   */
  async getVolunteerStats(centerId: string): Promise<{
    total: number;
    pendientes: number;
    contactados: number;
    aceptados: number;
    rechazados: number;
  }> {
    try {
      const response = await api.get(
        `/api/centers/${centerId}/volunteer-stats`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error al obtener estadísticas de voluntarios:', error);
      throw new Error(
        error.response?.data?.message || 
        'Error al cargar las estadísticas.'
      );
    }
  },
};

export default volunteerService;