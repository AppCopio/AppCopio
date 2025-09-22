export interface InventoryItem {
  item_id: number;
  quantity: number;
  name: string;
  category: string;           // nombre de la categoría
  unit: string | null;        // kg, lts, un...
  updated_at: string;         // ISO
  updated_by_user: string | null;
  description?: string | null;
}

export interface Category {
  category_id: number;
  name: string;
}

export interface GroupedInventory {
  [category: string]: InventoryItem[];
}

export interface InventoryCreateDTO {
  itemName: string;
  categoryId: number;
  quantity: number;
  unit?: string | null;
}

export interface InventoryUpdateDTO {
  quantity: number;
}

export type InventoryAction = "ADD" | "ADJUST" | "SUB";

export interface InventoryLog {
  log_id: number;
  product_name: string;
  quantity: number;
  action_type: InventoryAction;
  created_at: string;      // ISO
  user_name: string | null;
  reason: string | null;
  notes: string | null;
}
