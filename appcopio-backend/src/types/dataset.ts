
export type UUID = string;            // '550e8400-e29b-41d4-a716-446655440000'
export type ISODateString = string;   // '2025-09-23T18:45:00.123Z'
export type FieldType =
  | 'text' | 'number' | 'bool' | 'date' | 'time' | 'datetime'
  | 'select' | 'multi_select' | 'relation';
export type RelationTargetKind = 'dynamic' | 'core';

export type CellValue =
  | string
  | number
  | boolean
  | null
  | Pick< DatasetFieldOption, "option_id" | "value" | "label" | "color" | "position" >[]
  | UUID[]
  | { target_core: string; target_id: number; }[];


export type DatasetInfo = {
    dataset: Dataset;
    columns: DatasetField[];
    column_keys: string[]; // keys de las columnas en orden
    column_ids: UUID[]; // ids de las columnas en orden 
    // información en record de cada fila + arreglo con los valores de la fila para la UI en record.cells
    records: (DatasetRecord & { cells: CellValue[] })[]; 
    // matriz directa de valores para la tabla en UI (sin metadata)
    rows_matrix: CellValue[][];
    total_records: number;
};

export type Dataset = {
    dataset_id: UUID;
    activation_id: number;
    center_id: string;
    name: string;
    key: string;
    config: Record<string, unknown>;
    schema_snapshot: Record<string, unknown> | null;

    created_by: number | null;
    updated_by: number | null;
    created_at: ISODateString;
    updated_at: ISODateString | null;
    deleted_at: ISODateString | null;
};

export type DatasetField = {
    field_id: UUID;
    dataset_id: UUID;
    name: string;
    key: string;
    type: FieldType;
    required: boolean;
    unique_field: boolean;
    config: Record<string, unknown>;
    position: number;
    is_active: boolean;

    is_multi: boolean;
    relation_target_kind: RelationTargetKind | null;
    relation_target_dataset_id: UUID | null;
    relation_target_core: string | null;

    created_at: ISODateString;
    updated_at: ISODateString | null;    
    deleted_at: ISODateString | null;
};

export type DatasetRecord = {
    record_id: UUID;
    dataset_id: UUID;
    activation_id: number;
    version: number;
    data: Record<string, unknown>;

    created_by: number | null;
    updated_by: number | null;
    created_at: ISODateString;
    updated_at: ISODateString | null;
    deleted_at: ISODateString | null;
};

export type DatasetFieldOption = { 
    option_id: UUID;   
    field_id: UUID;     
    label: string;
    value: string;
    color: string | null;
    position: number;
    is_active: boolean;
    created_at: ISODateString;
    updated_at: ISODateString | null;
}


export type DatasetRecordOptionValue = { 
    record_id: UUID;
    field_id: UUID;
    option_id: UUID;
    created_at: ISODateString;
    updated_at: ISODateString | null;  
}

export type DatasetRecordRelation = { 
    record_id: UUID;
    field_id: UUID;
    target_record_id: UUID;
    created_at: ISODateString;
    updated_at: ISODateString | null;
}

export type DatasetRecordCoreRelation = {
  record_id: UUID;                 
  field_id: UUID;                   
  target_core: string;              
  target_id: number;                
  created_at: ISODateString;        
  updated_at: ISODateString | null;
};

export type Template = {
  template_id: UUID;
  name: string; 
  description: string | null;
  is_public: boolean;
  created_by: number | null;
  created_at: ISODateString;
  updated_at: ISODateString | null;
};

export type TemplateField = {
  template_field_id: UUID;               
  template_id: UUID;                  
  name: string;         
  key: string;         
  field_type: FieldType;          
  is_required: boolean;                  
  is_multi: boolean;                      
  position: number;                      
  settings: Record<string, unknown>;
  relation_target_kind: RelationTargetKind | null; 
  relation_target_template_id: UUID | null;    
  relation_target_core: string | null;
  created_at: ISODateString;
  updated_at: ISODateString | null; 
};

export type AuditLog = { 
    audit_id: UUID;     
    activation_id: number | null;
    actor_user_id: number | null;
    action: string;
    entity_type: string;
    entity_id: UUID | null;
    at: ISODateString;
    before: Record<string, unknown> | null;    
    after: Record<string, unknown> | null;
}

