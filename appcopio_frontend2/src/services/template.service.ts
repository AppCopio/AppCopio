import { api } from "@/lib/api";
import type { DatasetTemplateKey } from "@/types/database";
import { TEMPLATES } from "@/types/template";

export const templatesService = {
  async list() {
    const r = await api.get(`/datasets/templates`);
    return (r.data?.data ?? r.data) as any[];
  },
  //este ya no va
  async applyToDataset(datasetId: string, template_key: string) {
    // Se corrige la ruta para que coincida con la ruta POST /api/database/:id/apply-template
    const r = await api.post(`/database/${encodeURIComponent(datasetId)}/apply-template`, { config: { template_key: template_key } });
    return r.data?.data ?? r.data;
  },
  async getTemplateFields(template_key: string): Promise<any[]> {
      if (template_key === 'blank') return [];
      
      // Busca el objeto completo de la plantilla en la matriz
      const templateItem = TEMPLATES.find(t => t.key === template_key);
      
      // Devuelve directamente el array de campos 'fields' del objeto encontrado
      return templateItem?.fields || [];
    }
};


