import { api } from "@/lib/api";
import type { DatabaseField } from "@/types/field";

export type DatasetTemplate = {
  template_key: string;
  name: string;
  description?: string;
  fields: Array<Pick<DatabaseField, "name"|"key"|"type"|"position"|"is_required"|"config">>;
};

export const templatesService = {
  async list() {
    const r = await api.get(`/datasets/templates`);
    return (r.data?.data ?? r.data) as DatasetTemplate[];
  },

  // Si tu BE tiene: POST /datasets/:datasetId/apply-template
  async applyToDataset(datasetId: string, template_key: string) {
    const r = await api.post(`/datasets/${encodeURIComponent(datasetId)}/apply-template`, { template_key });
    return r.data?.data ?? r.data;
  },
};
