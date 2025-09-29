import { api } from "@/lib/api";
import type { DatabaseField } from "@/types/field";

const mapField = (f: any): DatabaseField => ({ ...f, dataset_id: f.dataset_id ?? f.database_id });

export const fieldsService = {
  list(dataset_id: string) {
    return api.get(`/database-fields`, {
      params: { dataset_id },
      validateStatus: s => (s>=200 && s<300) || s===204,
    }).then(r => {
      if (r.status === 204) return [];
      const data = r.data?.items ?? r.data?.data ?? r.data ?? [];
      return Array.isArray(data) ? data : [];
    });
  },
  create(payload: {
    dataset_id: string; name: string; key: string;
    field_type: "text"|"number"|"bool"|"date"|"time"|"datetime"|"select"|"multi_select"|"relation";
    is_required?: boolean; is_multi?: boolean; position?: number; settings?: any;
    relation_target_kind?: string; relation_target_template_id?: string; relation_target_core?: string;
  }) {
    return api.post(`/database-fields`, payload).then(r => r.data?.data ?? r.data);
  },
  update(field_id: string, body: any) {
    return api.patch(`/database-fields/${encodeURIComponent(field_id)}`, body).then(r => r.data?.data ?? r.data);
  },
  remove(field_id: string) {
    return api.delete(`/database-fields/${encodeURIComponent(field_id)}`).then(()=>{});
  },
};