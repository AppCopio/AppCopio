import { api } from "@/lib/api";
import type { UUID } from "@/types/database";

// Tipos rápidos
export type DatasetField = {
  field_id: UUID;
  dataset_id: UUID;
  name: string;
  key: string;
  type: "text"|"number"|"bool"|"date"|"time"|"datetime"|"select"|"multi_select"|"relation";
  position: number;
  is_active: boolean;
  // ...
};

export type DatasetRecord = {
  record_id: UUID;
  dataset_id: UUID;
  activation_id: number;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export const datasetDataService = {
  async listFields(datasetId: string) {
    const { data } = await api.get(`/datasets/${datasetId}/fields`);
    return data?.data ?? data as DatasetField[];
  },
  async createField(datasetId: string, payload: Partial<DatasetField>) {
    const { data } = await api.post(`/datasets/${datasetId}/fields`, payload);
    return data?.data ?? data as DatasetField;
  },
  async listRecords(datasetId: string, params?: { q?: string; limit?: number; offset?: number; }) {
    const { data } = await api.get(`/datasets/${datasetId}/records`, { params });
    return data?.data ?? data as { items: DatasetRecord[]; total: number; };
  },
  async createRecord(datasetId: string, payload: { data: Record<string, any> }) {
    const { data } = await api.post(`/datasets/${datasetId}/records`, payload);
    return data?.data ?? data as DatasetRecord;
  },
};
