export type DatabaseRecord = {
  record_id: string;
  dataset_id: string;
  activation_id: number;
  version: number; 
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type RecordsPage = {
  items: DatabaseRecord[];
  total: number;
};
