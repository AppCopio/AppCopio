import { api } from "@/lib/api";
import type { DatabaseRecord, RecordsPage } from "@/types/record";


export const recordsService = {
  list(dataset_id: string, params?: { limit?: number; offset?: number; qData?: string }) {
    return api.get(`/database-records`, {
      params: { dataset_id, ...params },
      validateStatus: s => (s>=200 && s<300) || s===204,
    }).then(r => {
      if (r.status === 204) return { items: [], total: 0 };
      const page = (r.data?.data ?? r.data) || { items: [], total: 0 };
      page.items ||= [];
      page.total ||= 0;
      return page;
    });
  },
  create(dataset_id: string, activation_id: number, data: Record<string, any> = {}) {
    return api.post(`/database-records`, { 
      dataset_id, 
      activation_id, 
      data,
      // Inicializar campos auxiliares vacíos para evitar errores
      select_values: {},
      relations_dynamic: [],
      relations_core: []
    }).then(r => {
      const record = r.data?.data ?? r.data;
      // CRÍTICO: Asegurar que el registro tenga version = 1
      if (!record.version) {
        record.version = 1;
      }
      return record;
    });
  },
  patch(record_id: string, body: { 
      dataset_id: string; 
      data: Record<string, any>;
      version: number; 
  }) {
    // FIX: Se incluye el body completo (que ahora tiene version)
    return api.patch(`/database-records/${encodeURIComponent(record_id)}`, body).then(r => r.data?.data ?? r.data);
  },
  remove(record_id: string) {
    return api.delete(`/database-records/${encodeURIComponent(record_id)}`).then(()=>{});
  },
};
