import { api } from "@/lib/api";
import type { DatabaseSummary } from "@/types/database";

const mapDb = (it: any): DatabaseSummary => ({
  ...it,
  dataset_id: it.dataset_id ?? it.database_id ?? it.id,
});

export const databasesService = {
  async listByActivation(activationId: number, signal?: AbortSignal): Promise<DatabaseSummary[]> {
    const r = await api.get(`/database`, {
      signal,
      params: { activation_id: activationId },
      validateStatus: s => (s >= 200 && s < 300) || s === 204,
    });
    if (r.status === 204) return [];  
    const items = (r.data?.items ?? r.data ?? []) as any[];
    return items.map(it => ({ ...it, dataset_id: it.dataset_id ?? it.database_id ?? it.id }));
  },

  // GET /api/database/:id
  async getById(id: string, signal?: AbortSignal): Promise<DatabaseSummary> {
    const r = await api.get(`/database/${encodeURIComponent(id)}`, { signal });
    return mapDb(r.data?.data ?? r.data);
  },

  // POST /api/database   (requiere activation_id, center_id, name, key)
  async create(body: { activation_id: number; center_id: string; name: string; key: string; config?: any }) {
    const r = await api.post(`/database`, body);
    return mapDb(r.data?.data ?? r.data);
  },

  // DELETE /api/database/:id
  async remove(id: string): Promise<void> {
    await api.delete(`/database/${encodeURIComponent(id)}`);
  },

  // GET /api/database/:id/general-view (si quieres usar snapshot)
  async getSnapshot(id: string) {
    const r = await api.get(`/database/${encodeURIComponent(id)}/general-view`);
    return r.data?.data ?? r.data;
  },
};
