import { api } from "@/lib/api";
import type { DatabaseField } from "@/types/field";

const mapField = (f: any): DatabaseField => ({ ...f, dataset_id: f.dataset_id ?? f.database_id, is_required: f.is_required ?? f.required });

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
    dataset_id: string; 
    name: string; 
    key: string;
    field_type?: "text"|"number"|"bool"|"date"|"time"|"datetime"|"select"|"multi_select"|"relation";
    type?: string; // Alias para backend
    is_required?: boolean; 
    is_multi?: boolean; 
    position?: number; 
    settings?: any;
    config?: any;
    is_active?: boolean;
    relation_target_kind?: string; 
    relation_target_template_id?: string; 
    relation_target_dataset_id?: string;
    relation_target_core?: string;
  }) {
    const fieldType = payload.field_type || payload.type || 'text';
    
    const normalizedPayload = {
      ...payload,
      type: fieldType,           // Backend espera 'type'
      field_type: fieldType,     // Mantener para compatibilidad
      required: payload.is_required ?? false,
      is_required: payload.is_required ?? false,
      is_multi: payload.is_multi ?? false,
      position: payload.position ?? 0,
      is_active: payload.is_active ?? true,
      config: payload.config ?? payload.settings ?? {},
      settings: payload.settings ?? payload.config ?? {},
    };
    return api.post(`/database-fields`, normalizedPayload)
      .then(r => mapField(r.data?.data ?? r.data));
  },
  update(field_id: string, body: any) {
    // 🔧 Si viene is_required, también enviar required para el backend
    const normalizedBody = { ...body };
    if (body.is_required !== undefined) {
      normalizedBody.required = body.is_required;
    }
    return api.patch(`/database-fields/${encodeURIComponent(field_id)}`, normalizedBody)
      .then(r => mapField(r.data?.data ?? r.data));
  },
  remove(field_id: string) {
    return api.delete(`/database-fields/${encodeURIComponent(field_id)}`, {
      // ✅ Permitir códigos de estado 403 (bloqueado) y 409 (necesita confirmación)
      validateStatus: (status) => {
        return (status >= 200 && status < 300) || status === 403 || status === 409;
      }
    }).then((response) => {
      console.log("🔍 Respuesta de remove:", response);
      
      // Si es 403 (bloqueado por ser obligatorio) o 409 (necesita confirmación)
      if (response.status === 403 || response.status === 409) {
        // Lanzar un error personalizado con la info del backend
        const error: any = new Error(response.data.error || "No se pudo eliminar la columna");
        error.status = response.status;
        error.data = response.data;
        throw error;
      }
      
      // Si es 200-299, todo bien
      return response.data;
    });
  },
  removeWithConfirmation(field_id: string) {
    return api.delete(`/database-fields/${encodeURIComponent(field_id)}`, {
      params: { confirm: 'true' },  // 🔑 Parámetro clave
      validateStatus: (status) => {
        return (status >= 200 && status < 300) || status === 403;
      }
    }).then((response) => {
      console.log("🔍 Respuesta de removeWithConfirmation:", response.status, response.data);
      
      // Si es 403 (bloqueado por ser obligatorio), lanzar error
      if (response.status === 403) {
        const error: any = new Error(response.data.error || "Columna obligatoria");
        error.status = response.status;
        error.data = response.data;
        throw error;
      }
      
      return response.data;
    });
  },
};