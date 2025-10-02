export type FieldType =
  | "text" | "number" | "bool"
  | "date" | "time" | "datetime"
  | "select" | "multi_select"
  | "relation";

export type DatabaseField = {
  field_id: string;
  dataset_id: string;
  name: string;
  key: string;            // slug único por dataset
  type: FieldType;
  position: number;
  is_required: boolean;   
  is_active: boolean;
  config?: any;           // p.ej. opciones para select, target para relation
  created_at: string;
  updated_at: string;
};
