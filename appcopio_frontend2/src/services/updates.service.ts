//cambie la ruta de listActiveWorkersByRole pa que sea consistente con backend
//patchUpdateRequest y createUpdateRequest devuelven un Update del backend -> menos recargas 
//tambien le meti trycatch que sorpresa bruno

import { api } from "@/lib/api";
import { isCancelError } from "@/lib/errors";
import type { UpdateRequest, UpdateStatus, UpdatesApiResponse, UpdateCreateDTO } from "@/types/update";

/**
 * Obtiene una lista paginada y filtrada de solicitudes de actualización.
 * Puede filtrar por centro si se proporciona un centerId.
 * Puede filtrar por usuario asignado si se proporciona assignedTo.
 * Puede filtrar por centros asignados al usuario si se proporciona userCentersOnly.
 */
export async function listUpdates(params: {
  status: UpdateStatus;
  page: number;
  limit: number;
  centerId?: string;
  assignedTo?: number;
  userCentersOnly?: number;
  signal?: AbortSignal;
}): Promise<UpdatesApiResponse> {
  const { status, page, limit, centerId, assignedTo, userCentersOnly, signal } = params;
  const url = centerId ? `/updates/center/${centerId}` : "/updates";
  
  try {
    const queryParams: any = { status, page, limit };
    if (assignedTo) {
      queryParams.assignedTo = assignedTo;
    }
    if (userCentersOnly) {
      queryParams.userCentersOnly = userCentersOnly;
    }

    const { data } = await api.get<UpdatesApiResponse>(url, {
      params: queryParams,
      signal,
    });
    return data ?? { requests: [], total: 0 };
  } catch (error) {
    if (isCancelError(error)) return { requests: [], total: 0 };
    console.error("Error fetching update requests:", error);
    return { requests: [], total: 0 };
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
    if (isCancelError(error)) throw error; // Re-lanzar cancelaciones
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
    if (isCancelError(error)) throw error; // Re-lanzar cancelaciones
    console.error("Error creating update request:", error);
    throw error;
  }
}