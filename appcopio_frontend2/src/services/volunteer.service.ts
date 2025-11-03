import { api } from '@/lib/api';
import type { 
  VolunteerContactCreate,
  VolunteerContactResponse,
  VolunteerStatus
} from '@/types/volunteer';

/**
 * Interfaz para la respuesta de activación activa
 */
interface ActiveActivation {
  activation_id: number;
  center_id: string;
  started_at: string;
  ended_at: string | null;
}

// Esta función ya estaba BIEN (la usa el formulario público)
async function createVolunteerContact(
  contactData: VolunteerContactCreate,
  activationId: number,
  centerId: string
): Promise<any> {
  
  // El backend espera este objeto
  const requestBody = {
    activation_id: activationId,
    center_id: centerId,
    contactData: contactData,
  };

  const response = await api.post(
    '/volunteers/contact', 
    requestBody
  );
  return response.data;
}

/**
 * Obtiene la activación activa de un centro (endpoint público)
 * NOTA: Esta función requiere que el backend tenga un endpoint público
 * Si falla, significa que el centro no tiene activación activa o el endpoint no existe
 */
async function getCenterActiveActivation(centerId: string): Promise<ActiveActivation | null> {
  try {
    // Intentamos obtener la activación del centro
    // Este endpoint debería ser público en el backend
    const response = await api.get<ActiveActivation>(
      `/centers/${centerId}/public-activation`
    );
    return response.data;
  } catch (error: any) {
    // Si es 404 o 204, el centro no tiene activación activa
    if (error.response?.status === 404 || error.response?.status === 204) {
      console.log(`Centro ${centerId} no tiene activación activa`);
      return null;
    }
    
    // Si es 401, el endpoint requiere auth - necesita ser público
    if (error.response?.status === 401) {
      console.error('El endpoint de activación requiere autenticación - debe ser público');
      throw new Error('No se puede verificar el estado del centro. Por favor contacta al administrador.');
    }
    
    // Otros errores
    console.error('Error al obtener activación del centro:', error);
    throw new Error('Error al verificar la activación del centro.');
  }
}

async function getVolunteerContactsByActivation(
  activationId: number
): Promise<VolunteerContactResponse[]> {
  const response = await api.get<VolunteerContactResponse[]>(
    `/volunteers/by-activation/${activationId}`
  );
  return response.data;
}

async function updateVolunteerContactStatus(
  volunteerId: string, 
  status: VolunteerStatus,
  notes: string | undefined
): Promise<VolunteerContactResponse> {
  const response = await api.put<VolunteerContactResponse>(
    `/volunteers/${volunteerId}/status`, 
    { status, notes } 
  );
  return response.data;
}

export const volunteerService = {
  createVolunteerContact,
  getCenterActiveActivation, // ✅ NUEVO - Para obtener activación de forma pública
  getVolunteerContactsByActivation,
  updateVolunteerContactStatus,
};