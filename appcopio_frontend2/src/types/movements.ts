// src/types/movements.ts
export type MovementType = "ENTRY" | "EXIT" | "ADJUSTMENT";
export type SyncStatus = "SYNCED" | "PENDING" | "ERROR";

// Interfaz para movimientos de inventario (entradas y salidas)
export interface InventoryMovement {
  movement_id: number;
  center_id: string;
  movement_type: MovementType;
  created_at: string; // ISO timestamp
  created_by_user_id: number;
  created_by_user_name: string;
  reason: string;
  notes?: string;
  sync_status?: SyncStatus;
}

// Interfaz para los ítems dentro de un movimiento
export interface MovementItem {
  movement_item_id: number;
  movement_id: number;
  item_id?: number; // null si es un item nuevo que se está creando
  item_name: string;
  category_id: number;
  category_name: string;
  quantity: number;
  unit: string;
  unit_cost?: number; // costo unitario opcional
  total_cost?: number; // costo total opcional
}

// DTO para crear un movimiento de entrada
export interface EntryMovementCreateDTO {
  reason: string;
  notes?: string;
  items: EntryItemCreateDTO[];
}

// DTO para crear un item en una entrada
export interface EntryItemCreateDTO {
  item_id?: number; // si existe, incrementar cantidad; si no existe, crear nuevo
  item_name: string; // nombre del item (requerido siempre)
  category_id: number;
  quantity: number;
  unit: string;
  unit_cost?: number;
}

// DTO para crear un movimiento de salida
export interface ExitMovementCreateDTO {
  reason: string;
  recipient: string; // a quién se entrega (grupo familiar, persona, etc.)
  notes?: string;
  items: ExitItemCreateDTO[];
}

// Nuevo: Estructura específica para el backend de salidas individuales
export interface BackendExitRequest {
  itemId: number;
  quantity: number;
  familyId?: number | null;
  reason: string;
  notes?: string;
}

// DTO para crear un item en una salida
export interface ExitItemCreateDTO {
  item_id: number; // debe existir
  quantity: number; // cantidad a entregar
}

// Interfaz para las "cajas" de recursos
export interface ResourceBox {
  box_id?: number;
  name: string;
  description?: string;
  items: BoxItemTemplate[];
  created_at?: string;
  created_by_user_id?: number;
}

// Plantilla de item dentro de una caja
export interface BoxItemTemplate {
  item_name: string;
  category_id: number;
  quantity: number;
  unit: string;
  notes?: string;
}

// DTO para crear una caja como entrada
export interface BoxEntryCreateDTO {
  box_id: number;
  reason: string;
  notes?: string;
}

// Interfaz para el historial completo con detalles
export interface MovementHistoryItem {
  movement_id: number;
  movement_type: MovementType;
  created_at: string;
  created_by_user_name: string;
  reason: string;
  recipient?: string; // solo para EXIT
  notes?: string;
  sync_status: SyncStatus;
  items: MovementHistoryItemDetail[];
}

// Detalle de cada item en el historial
export interface MovementHistoryItemDetail {
  movement_item_id: number;
  item_name: string;
  category_name: string;
  quantity: number;
  unit: string;
  previous_stock?: number; // stock anterior (para contexto)
  new_stock?: number; // stock después del movimiento
}

// Interfaz para validación de stock
export interface StockValidation {
  is_valid: boolean;
  errors: {
    item_id: number;
    item_name: string;
    requested: number;
    available: number;
  }[];
}

// Interfaz para operaciones offline pendientes
export interface PendingOperation {
  id: string; // UUID generado localmente
  type: "ENTRY" | "EXIT" | "ADJUSTMENT";
  center_id: string;
  timestamp: string; // cuando se creó localmente
  data: EntryMovementCreateDTO | ExitMovementCreateDTO; // datos de la operación
  attempts: number; // intentos de sincronización
  last_error?: string;
}

// Interfaz para el estado offline del inventario
export interface OfflineInventoryState {
  last_sync: string;
  pending_operations: PendingOperation[];
  cached_inventory: { [item_id: number]: number }; // cache del stock para validaciones offline
}