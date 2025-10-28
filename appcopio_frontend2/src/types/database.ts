export type UUID = string;

export type DatasetTemplateKey = "blank" | "personas_albergadas" |"familias_integradas" | "personas_ingresadas" | "registro_p_persona" | "red_apoyo" | "ayudas_entregadas" | "reubicaciones";

export type DatabaseSummary = {
  dataset_id: UUID;
  activation_id: number;
  center_id: string;
  name: string;
  key: string; // slug único por activación
  record_count: number;
  created_at: string;
  updated_at: string;
  template_key?: DatasetTemplateKey;
};

export type CreateDatasetDTO = {
  name: string;
  template?: DatasetTemplateKey; 
};
