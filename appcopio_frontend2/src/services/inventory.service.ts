import { api } from "@/lib/api";
import type {
  InventoryItem,
  InventoryCreateDTO,
  InventoryUpdateDTO,
  InventoryLog,
} from "@/types/inventory";

/**
 * Obtiene la lista completa de ítems en el inventario de un centro.
 */
export async function listCenterInventory(
  centerId: string,
  signal?: AbortSignal
): Promise<InventoryItem[]> {
  try {
    const { data } = await api.get<InventoryItem[]>(`/centers/${centerId}/inventory`, { signal });
    return data ?? [];
  } catch (error) {
    console.error(`Error fetching inventory for center ${centerId}:`, error);
    return [];
  }
}

/**
 * Añade un nuevo ítem al inventario de un centro.
 * @returns El objeto del ítem de inventario recién creado o actualizado.
 */
export async function createInventoryItem(
  centerId: string,
  payload: InventoryCreateDTO,
  signal?: AbortSignal
): Promise<InventoryItem> { // CAMBIO: Devuelve el ítem creado.
  try {
    const { data } = await api.post<InventoryItem>(`/centers/${centerId}/inventory`, payload, { signal });
    return data;
  } catch (error) {
    console.error(`Error creating inventory item in center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Actualiza la cantidad de un ítem de inventario específico.
 * @returns El objeto del ítem de inventario actualizado.
 */
export async function updateInventoryItemQuantity(
  centerId: string,
  itemId: number,
  payload: InventoryUpdateDTO,
  signal?: AbortSignal
): Promise<InventoryItem> { // CAMBIO: Devuelve el ítem actualizado.
  try {
    const { data } = await api.put<InventoryItem>(`/centers/${centerId}/inventory/${itemId}`, payload, { signal });
    return data;
  } catch (error) {
    console.error(`Error updating inventory item ${itemId} in center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Elimina un ítem del inventario de un centro.
 */
export async function deleteInventoryItem(
  centerId: string,
  itemId: number,
  signal?: AbortSignal
): Promise<void> {
  try {
    await api.delete(`/centers/${centerId}/inventory/${itemId}`, { signal });
  } catch (error) {
    console.error(`Error deleting inventory item ${itemId} from center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Obtiene el historial de cambios (logs) del inventario para un centro.
 */
export async function listInventoryLogs(
  centerId: string,
  signal?: AbortSignal
): Promise<InventoryLog[]> {
  try {
    console.log(`🔍 Llamando al endpoint de historial: /centers/${centerId}/movements/history`);
    
    // Usar el endpoint correcto implementado por tu compañero
    const { data } = await api.get<any[]>(`/centers/${centerId}/movements/history`, { signal });
    
    console.log('📊 Datos recibidos del backend:', data);
    
    // Los datos ya vienen en el formato correcto desde getLogsByCenterId
    const logs: InventoryLog[] = (data || []).map(log => ({
      log_id: log.log_id,
      product_name: log.product_name,
      quantity: log.quantity,
      action_type: log.action_type, // Ya viene como ADD, SUB, ADJUST
      created_at: log.created_at,
      user_name: log.user_name || 'Sistema',
      reason: log.reason,
      notes: log.notes || null
    }));
    
    console.log('✅ Logs procesados:', logs);
    return logs;
  } catch (error) {
    console.error(`❌ Error fetching inventory logs for center ${centerId}:`, error);
    return [];
  }
}