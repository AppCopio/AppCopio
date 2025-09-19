//cambie la ruta de listActiveWorkersByRole pa que sea consistente con backend
//patchUpdateRequest y createUpdateRequest devuelven un Update del backend -> menos recargas 
//tambien le meti trycatch que sorpresa bruno

import { api } from "@/lib/api";
import type { UpdateRequest, UpdateStatus, UpdatesApiResponse, WorkerUser, UpdateCreateDTO } from "@/types/update";

/**
 * Obtiene una lista paginada y filtrada de solicitudes de actualización.
 * Puede filtrar por centro si se proporciona un centerId.
 */
export async function listUpdates(params: {
  status: UpdateStatus;
  page: number;
  limit: number;
  centerId?: string;
  signal?: AbortSignal;
}): Promise<UpdatesApiResponse> {
  const { status, page, limit, centerId, signal } = params;
  const url = centerId ? `/updates/center/${centerId}` : "/updates";
  
  try {
    const { data } = await api.get<UpdatesApiResponse>(url, {
      params: { status, page, limit },
      signal,
    });
    return data ?? { requests: [], total: 0 };
  } catch (error) {
    console.error("Error fetching update requests:", error);
    return { requests: [], total: 0 };
  }
}

/**
 * Obtiene una lista de usuarios trabajadores activos según su rol.
 */
export async function listActiveWorkersByRole(roleId: number, signal?: AbortSignal): Promise<WorkerUser[]> {
  try {
    const { data } = await api.get<{ users: WorkerUser[] }>(`/users/active/by-role/${roleId}`, { signal });
    return data?.users ?? [];
  } catch (error) {
    console.error(`Error fetching active workers for role ${roleId}:`, error);
    return [];
  }
}

/**
 * Actualiza una solicitud de actualización (ej: para asignarla o cambiar su estado).
 * @returns El objeto de la solicitud actualizado.
 */
export async function patchUpdateRequest(id: number, body: Record<string, unknown>, signal?: AbortSignal): Promise<UpdateRequest> { // CAMBIO APLICADO AQUÍ
  try {
    const { data } = await api.patch<UpdateRequest>(`/updates/${id}`, body, { signal }); // CAMBIO APLICADO AQUÍ
    return data;
  } catch (error) {
    console.error(`Error patching update request ${id}:`, error);
    throw error;
  }
}

/**
 * Crea una nueva solicitud de actualización.
 * @returns El objeto de la solicitud recién creada.
 */
export async function createUpdateRequest(payload: UpdateCreateDTO, signal?: AbortSignal): Promise<UpdateRequest> { // CAMBIO APLICADO AQUÍ
  try {
    const { data } = await api.post<UpdateRequest>("/updates", payload, { signal }); // CAMBIO APLICADO AQUÍ
    return data;
  } catch (error) {
    console.error("Error creating update request:", error);
    throw error;
  }
}