import { api } from "@/lib/api";
import type { DatasetSummary, CreateDatasetDTO } from "@/types/dataset";

export const datasetsService = {
  // Lista todas las bases de la activación
  async listByActivation(activationId: number, signal?: AbortSignal): Promise<DatasetSummary[]> {
    const { data } = await api.get(`/activations/${activationId}/datasets`, { signal });
    // admite payloads con o sin 'data'
    return (data?.data ?? data) as DatasetSummary[];
  },

  // Crea base en una activación
  async create(activationId: number, payload: CreateDatasetDTO): Promise<DatasetSummary> {
    const { data } = await api.post(`/activations/${activationId}/datasets`, payload);
    return (data?.data ?? data) as DatasetSummary;
  },

  // Elimina una base (por id)
  async remove(datasetId: string): Promise<void> {
    await api.delete(`/datasets/${encodeURIComponent(datasetId)}`);
  },

  // Obtiene una base por 'key' dentro de la activación
  async getByKey(activationId: number, key: string): Promise<DatasetSummary> {
    // endpoint típico RESTful: /activations/:id/datasets/:key
    const { data } = await api.get(`/activations/${activationId}/datasets/${encodeURIComponent(key)}`);
    return (data?.data ?? data) as DatasetSummary;
  },
  
};