import { api } from "@/lib/api";

export type AuditEvent = {
  id: string;
  at: string;
  actor: string; // usuario
  action: string; // CREATED_DATASET / UPDATED_FIELD / etc.
  target_type: "dataset"|"field"|"record";
  target_id: string;
  meta?: any;
};

export const auditlogService = {
  async listForDataset(datasetId: string, params?: { limit?: number; offset?: number }) {
    const r = await api.get(`/datasets/${encodeURIComponent(datasetId)}/audit`, { params });
    return (r.data?.data ?? r.data) as { items: AuditEvent[]; total: number };
  },
};
