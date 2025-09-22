//CAMBIE LAS RUTAS QUE MODIFIQUE EN EL BACKEND :)
//registerFamilyDeparture ahora solo manda los datos necesarios pal backends
//tmb le meti try catch juju

// src/services/residents.service.ts
import {api} from "@/lib/api";
import {
  ActiveCenter,
  CapacityInfo,
  Person,
  ResidentGroup,
  DepartureReason,
} from "@/types/residents";

/**
 * Obtiene la información de capacidad (total, actual, disponible) de un centro.
 */
export async function getCenterCapacity(centerId: string, signal?: AbortSignal): Promise<CapacityInfo | null> {
  try {
    const { data } = await api.get<CapacityInfo>(`/centers/${centerId}/capacity`, { signal });
    return data;
  } catch (error) {
    console.error(`Error fetching capacity for center ${centerId}:`, error);
    return null;
  }
}

/**
 * Obtiene la lista de grupos familiares (jefes de hogar) activos en un centro.
 */
export async function listResidentGroups(centerId: string, signal?: AbortSignal): Promise<ResidentGroup[]> {
  try {
    const { data } = await api.get<ResidentGroup[]>(`/centers/${centerId}/residents`, { signal });
    return data ?? [];
  } catch (error) {
    console.error(`Error fetching resident groups for center ${centerId}:`, error);
    return [];
  }
}

/**
 * Obtiene la lista completa de personas albergadas en un centro, con filtros opcionales.
 */
export async function listPeopleByCenter(centerId: string, params?: Record<string, any>, signal?: AbortSignal): Promise<Person[]> {
  try {
    // Nota: El backend actualmente no implementa los filtros, pero la estructura está lista para cuando lo haga.
    const { data } = await api.get<Person[]>(`/centers/${centerId}/people`, { params, signal });
    return data ?? [];
  } catch (error) {
    console.error(`Error fetching people for center ${centerId}:`, error);
    return [];
  }
}
/**
export async function listPeopleByCenter(
  centerId: string,
  params: {
    nombre?: string;
    rut?: string;
    fechaIngreso?: string;
    fechaSalida?: string;
    edad?: string | number;
    genero?: string;
  }
): Promise<Person[]> {
  const { data } = await api.get(`/centers/${centerId}/people`, { params });
  return data;
}

 */

/**
 * Obtiene una lista de todos los centros de acopio/albergue que están actualmente activos.
 */
export async function listActiveCenters(signal?: AbortSignal): Promise<ActiveCenter[]> {
  try {
    // CAMBIO CRÍTICO: La ruta ahora es global y no depende de un centerId.
    const { data } = await api.get<ActiveCenter[]>(`/centers/status/active`, { signal });
    return data ?? [];
  } catch (error) {
    console.error("Error fetching active centers:", error);
    return [];
  }
}

/**
 * Registra la salida (egreso) de un grupo familiar de un centro.
 */
export async function registerFamilyDeparture(input: {
  familyId: number;
  departure_reason: DepartureReason;
  destination_activation_id: string | null;
  departure_date: string; // YYYY-MM-DD
}, signal?: AbortSignal): Promise<void> {
  try {
    const { familyId, ...payload } = input;
    await api.patch(`/family/${familyId}/depart`, payload, { signal });
  } catch (error) {
    console.error(`Error registering departure for family ${input.familyId}:`, error);
    throw error;
  }
}