import { api } from "@/lib/api";
import type { UpdateStatus, UpdatesApiResponse, WorkerUser, UpdateCreateDTO  } from "@/types/update";

export async function listUpdates(params: {
  status: UpdateStatus;
  page: number;
  limit: number;
  centerId?: string;
  signal?: AbortSignal;
}): Promise<UpdatesApiResponse> {
  const { status, page, limit, centerId, signal } = params;
  const url = centerId ? `/updates/center/${centerId}` : "/updates";
  const { data } = await api.get<UpdatesApiResponse>(url, {
    params: { status, page, limit },
    signal,
  });
  return data;
}

export async function listActiveWorkersByRole(roleId: number, signal?: AbortSignal): Promise<WorkerUser[]> {
  const { data } = await api.get<{ users: WorkerUser[] }>(`/users/active/role/${roleId}`, { signal });
  return data?.users ?? [];
}

export async function patchUpdateRequest(id: number, body: Record<string, unknown>, signal?: AbortSignal): Promise<void> {
  await api.patch(`/updates/${id}`, body, { signal });
}

export async function createUpdateRequest(payload: UpdateCreateDTO, signal?: AbortSignal) {
  const { data } = await api.post("/updates", payload, { signal });
  return data; 
}