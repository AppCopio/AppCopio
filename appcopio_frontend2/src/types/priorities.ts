export type Priority = 'bajo' | 'medio' | 'alto';

export interface CenterPriority {
  center_id: string;
  item_id: string;
  priority: Priority;
  updated_at: string;
  updated_by_user: string;
}

export interface InventoryPriorityItem {
  item_id: number | string;
  item_name: string;
  category_id?: number | string;
  category_name?: string;
  priority: Priority;
  updated_at?: string;
  updated_by_user?: string;
}
