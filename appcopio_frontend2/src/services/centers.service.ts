//llamada para obtener la activacion de un centro ahora ta consistente con backend GET /centers/:id/activation
// añadido una nueva función, listActiveCenters, lista centros activos con: GET /centers/status/active 
// le puse trycatchs tambien :)
// IMPORTANTE: meti getCenterCapacity y getCenterInventory, usenlos tan utiles segun yo.


// src/services/centers.service.ts (o centerApi.ts)
import { api } from "@/lib/api";
import type { Center, ActiveActivation, CenterData} from "@/types/center"; 
import type { InventoryItem } from "@/types/inventory"; 

// =================================================================
// 1. HELPERS: Normalización y Mapeo de Datos
// (Estos helpers son útiles para asegurar que la UI siempre reciba datos consistentes)
// =================================================================

function normalizeCenter(raw: any): Center {
  return {
    center_id: String(raw.center_id ?? ""),
    name: String(raw.name ?? ""),
    address: raw.address ?? null,
    type: raw.type === "Albergue" ? "Albergue" : "Acopio", // Simple validation
    is_active: Boolean(raw.is_active),
    operational_status: raw.operational_status ?? "abierto",
    public_note: raw.public_note ?? null,
    capacity: raw.capacity ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    fullnessPercentage: raw.fullnessPercentage ?? 0,
  };
}

export type OperationalStatusUI = "Abierto" | "Cerrado Temporalmente" | "Capacidad Máxima";
export type OperationalStatusBCK = "abierto" | "cerrado temporalmente" | "capacidad maxima";

// Función para mapear estados del backend al frontend  
export function mapStatusToBackend(status: OperationalStatusUI): string | undefined {
  switch (status) {
    case "Abierto": return "abierto";
    case "Cerrado Temporalmente": return "cerrado temporalmente";
    case "Capacidad Máxima": return "capacidad maxima";
    default: return undefined;
  }
}

// Función para mapear estados del backend al frontend  
export function mapStatusToFrontend(status?: OperationalStatusBCK): string | undefined {
  switch (status) {
    case 'abierto': return 'Abierto';
    case 'cerrado temporalmente': return 'Cerrado Temporalmente';
    case 'capacidad maxima': return 'Capacidad Máxima';
    default: return undefined;
  }
};

function isCanceled(err: any) {
  return err?.code === "ERR_CANCELED" || err?.name === "CanceledError";
}

// =================================================================
// 2. SERVICIOS: Endpoints de la API
// =================================================================

/**
 * Obtiene la lista completa de centros.
 */
export async function listCenters(signal?: AbortSignal): Promise<Center[]> {
  try {
    const { data } = await api.get<any[]>("/centers", { signal });
    return Array.isArray(data) ? data.map(normalizeCenter) : [];
  } catch (error) {
    console.error("Error fetching centers:", error);
    return [];
  }
}

/**
 * Obtiene los detalles de un único centro por su ID.
 */
export async function getOneCenter(centerId: string, signal?: AbortSignal): Promise<Center | null> {
  try {
    const { data } = await api.get<any>(`/centers/${centerId}`, { signal });
    return normalizeCenter(data);
  } catch (error) {
    console.error(`Error fetching center ${centerId}:`, error);
    return null;
  }
}

/**
 * Obtiene la activación abierta (si existe) para un centro.
 */
export async function getActiveActivation(centerId: string, signal?: AbortSignal): Promise<ActiveActivation | null> {
  try {
    // CAMBIO: Se actualizó la ruta según la refactorización del backend.
    const { data } = await api.get<ActiveActivation | null>(`/centers/${centerId}/activation`, { signal });
    return data;
  } catch (error) {
    console.error(`Error fetching active activation for center ${centerId}:`, error);
    return null;
  }
}

/**
 * NUEVO: Obtiene una lista de solo los centros que están activos.
 */
export async function listActiveCenters(signal?: AbortSignal): Promise<Center[]> {
    try {
        // CAMBIO: Se actualizó la ruta según la refactorización del backend.
        const { data } = await api.get<any[]>("/centers/status/active", { signal });
        return Array.isArray(data) ? data.map(normalizeCenter) : [];
    } catch (error) {
        console.error("Error fetching active centers:", error);
        return [];
    }
}

/**
 * Crea un nuevo centro de acopio/albergue.
 */
export async function createCenter(payload: CenterData, signal?: AbortSignal) {
  try {
    const { data } = await api.post("/centers", payload, { signal });
    return data;
  } catch (error) {
    console.error("Error creating center:", error);
    throw error;
  }
}

/**
 * Actualiza los datos de un centro.
 */
export async function updateCenter(centerId: string, payload: CenterData, signal?: AbortSignal) {
  try {
    const { data } = await api.put(`/centers/${centerId}`, payload, { signal });
    return data;
  } catch (error) {
    console.error(`Error updating center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Elimina un centro por su ID.
 */
export async function deleteCenter(centerId: string, signal?: AbortSignal): Promise<void> {
  try {
    await api.delete(`/centers/${centerId}`, { signal });
  } catch (error) {
    console.error(`Error deleting center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Activa o desactiva un centro.
 */
export async function updateCenterStatus(centerId: string, isActive: boolean, userId: number, signal?: AbortSignal): Promise<void> {
  try {
    await api.patch(`/centers/${centerId}/status`, { isActive, userId }, { signal });
  } catch (error) {
    console.error(`Error updating status for center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Actualiza el estado operativo de un centro.
 */
export async function updateOperationalStatus(centerId: string, newStatusUi: OperationalStatusUI, publicNote?: string, signal?: AbortSignal) {
  try {
    const operationalStatus = mapStatusToBackend(newStatusUi);
    const { data } = await api.patch(`/centers/${centerId}/operational-status`, {
      operationalStatus,
      publicNote: publicNote || "",
    }, { signal });
    return data;
  } catch (error) {
    console.error(`Error updating operational status for center ${centerId}:`, error);
    throw error;
  }
}

/**
 * NUEVO: Obtiene la capacidad de un centro.
 */
export async function getCenterCapacity(
    centerId: string, 
    signal?: AbortSignal
): Promise<{ 
    total_capacity: number;
    current_capacity: number;
    available_capacity: number; 
} | null> { // <-- CAMBIO: Usamos un tipo anónimo aquí
    try {
        // La llamada a la API no necesita cambiar, solo el tipo de retorno de la función.
        const { data } = await api.get(`/centers/${centerId}/capacity`, { signal });
        return data;
    } catch (error) {
        console.error(`Error fetching capacity for center ${centerId}:`, error);
        return null;
    }
}

/**
 * NUEVO: Obtiene el inventario de un centro.
 */
export async function getCenterInventory(centerId: string, signal?: AbortSignal): Promise<InventoryItem[]> {
    try {
        const { data } = await api.get<InventoryItem[]>(`/centers/${centerId}/inventory`, { signal });
        return data ?? [];
    } catch (error) {
        console.error(`Error fetching inventory for center ${centerId}:`, error);
        return [];
    }
}