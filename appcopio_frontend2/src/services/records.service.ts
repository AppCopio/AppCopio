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
    return api.post(`/database-records`, { dataset_id, activation_id, data }).then(r => r.data?.data ?? r.data);
  },

  /**
   * Actualiza un registro. Detecta automáticamente si hay campos de tipo "relation"
   * y los envía correctamente al backend.
   */
  patch(record_id: string, body: { 
      dataset_id: string; 
      data: Record<string, any>;
      version: number; 
      fields?: any[]; // Opcional: información de los campos para detectar relaciones
  }) {
    // Separar datos atómicos de relaciones
    const atomicData: Record<string, any> = {};
    const relations_core: Array<{ field_id: string; target_core: string; target_id: number }> = [];

    // Si tenemos información de los campos, podemos detectar relaciones
    if (body.fields) {
      for (const [key, value] of Object.entries(body.data)) {
        const field = body.fields.find((f: any) => f.key === key);
        
        if (field && field.type === 'relation' && value != null) {
          // Es una relación CORE
          const targetCore = field.config?.relation_target_core || field.settings?.relation_target_core;
          if (targetCore) {
            relations_core.push({
              field_id: field.field_id,
              target_core: targetCore,
              target_id: Number(value)
            });
          }
        } else {
          // Es un dato atómico normal
          atomicData[key] = value;
        }
      }
    } else {
      // Si no tenemos fields, asumimos que todo es data atómica
      Object.assign(atomicData, body.data);
    }

    const payload: any = {
      dataset_id: body.dataset_id,
      version: body.version,
      data: atomicData
    };

    // Solo agregar relations_core si hay relaciones
    if (relations_core.length > 0) {
      payload.relations_core = relations_core;
    }

    return api.patch(`/database-records/${encodeURIComponent(record_id)}`, payload)
      .then(r => r.data?.data ?? r.data);
  },

  remove(record_id: string) {
    return api.delete(`/database-records/${encodeURIComponent(record_id)}`).then(()=>{});
  },
};