// src/services/movements.service.ts
import { api } from "@/lib/api";
import type {
  EntryMovementCreateDTO,
  ExitMovementCreateDTO,
  BackendExitRequest,
  MovementHistoryItem,
  StockValidation,
  ResourceBox,
  BoxItemTemplate,
  BoxEntryCreateDTO
} from "@/types/movements";

/**
 * Crea un movimiento de entrada
 */
export async function createEntryMovement(
  centerId: string,
  data: EntryMovementCreateDTO,
  signal?: AbortSignal
): Promise<{ movement_id: number; message: string }> {
  try {
    // El backend de tu compañero no tiene endpoint específico para movimientos de entrada
    // Usar el endpoint existente de inventario para cada item
    const results = [];
    
    for (const item of data.items) {
      const inventoryData = {
        itemName: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        categoryId: item.category_id,
        notes: `${data.reason}${data.notes ? ` - ${data.notes}` : ''}`
      };
      
      const response = await api.post(`/centers/${centerId}/inventory`, inventoryData, { signal });
      results.push(response.data);
    }
    
    return {
      movement_id: Date.now(), // Simular ID de movimiento
      message: `Entrada registrada: ${data.items.length} items agregados`
    };
  } catch (error) {
    console.error(`Error creating entry movement for center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Crea un movimiento de salida
 */
export async function createExitMovement(
  centerId: string,
  data: BackendExitRequest,
  signal?: AbortSignal
): Promise<{ movement_id: number; message: string }> {
  try {
    // Usar el endpoint real implementado por tu compañero
    const response = await api.post(`/centers/${centerId}/inventory/exit`, data, { signal });
    return response.data;
  } catch (error) {
    console.error(`Error creating exit movement for center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Crea múltiples movimientos de salida en una sola operación
 */
export async function createBulkExitMovement(
  centerId: string,
  data: { exits: BackendExitRequest[] },
  signal?: AbortSignal
): Promise<{ movements_created: number; message: string }> {
  try {
    // Usar el endpoint de salidas múltiples implementado por tu compañero
    const response = await api.post(`/centers/${centerId}/inventory/exit/bulk`, data, { signal });
    return response.data;
  } catch (error) {
    console.error(`Error creating bulk exit movements for center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Valida stock disponible para una salida
 */
export async function validateStock(
  centerId: string,
  items: { item_id: number; quantity: number }[],
  signal?: AbortSignal
): Promise<StockValidation> {
  try {
    // Por ahora usar validación local hasta que el backend implemente este endpoint
    // TODO: Implementar endpoint de validación de stock en backend
    const response = await api.get(`/centers/${centerId}/inventory`, { signal });
    const inventory = response.data;
    
    const errors = items.reduce((acc, item) => {
      const inventoryItem = inventory.find((inv: any) => inv.item_id === item.item_id);
      const available = inventoryItem ? inventoryItem.quantity : 0;
      
      if (available < item.quantity) {
        acc.push({
          item_id: item.item_id,
          item_name: inventoryItem?.name || 'Producto desconocido',
          requested: item.quantity,
          available
        });
      }
      return acc;
    }, [] as any[]);
    
    return {
      is_valid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error(`Error validating stock for center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Obtiene el historial de movimientos de un centro
 */
export async function getMovementHistory(
  centerId: string,
  signal?: AbortSignal
): Promise<MovementHistoryItem[]> {
  try {
    // Por ahora usar el historial de inventario existente
    // TODO: Considerar crear endpoint específico para movimientos HdU11
    const response = await api.get(`/centers/${centerId}/inventory/logs`, { signal });
    
    // Mapear los logs de inventario al formato de movimientos
    const logs = response.data || [];
    return logs.map((log: any) => ({
      movement_id: log.log_id,
      movement_type: log.action_type,
      item_name: log.product_name || 'Producto desconocido',
      quantity: log.quantity,
      reason: log.reason || '',
      recipient: log.family_id ? `Familia ID: ${log.family_id}` : '',
      notes: log.notes || '',
      created_at: log.created_at,
      user_name: log.user_name || 'Usuario desconocido'
    }));
  } catch (error) {
    console.error(`Error fetching movement history for center ${centerId}:`, error);
    return [];
  }
}

/**
 * Obtiene estadísticas de inventario para un centro
 */
export async function getInventoryStats(
  centerId: string,
  days: number = 30,
  signal?: AbortSignal
): Promise<any> {
  try {
    const response = await api.get(`/centers/${centerId}/inventory/stats?days=${days}`, { signal });
    return response.data;
  } catch (error) {
    console.error(`Error fetching inventory stats for center ${centerId}:`, error);
    throw error;
  }
}

/**
 * Valida si un item puede ser eliminado
 */
export async function validateItemDeletion(
  centerId: string,
  itemId: number,
  signal?: AbortSignal
): Promise<{ can_delete: boolean; current_stock: number; item_name: string }> {
  try {
    const response = await api.post(`/centers/${centerId}/items/${itemId}/validate-deletion`, {}, { signal });
    return response.data;
  } catch (error) {
    console.error(`Error validating item deletion for center ${centerId}, item ${itemId}:`, error);
    throw error;
  }
}

/**
 * Obtiene todas las cajas de recursos disponibles desde localStorage
 */
export async function getResourceBoxes(signal?: AbortSignal): Promise<ResourceBox[]> {
  try {
    // Como el backend de tu compañero no tiene tabla resourceboxes,
    // cargar desde localStorage
    const boxes = JSON.parse(localStorage.getItem('resourceBoxes') || '[]');
    return boxes;
  } catch (error) {
    console.error('Error fetching resource boxes:', error);
    return [];
  }
}

/**
 * Crea una nueva caja de recursos usando el endpoint de tu compañero
 */
export async function createResourceBox(
  data: Omit<ResourceBox, 'box_id' | 'created_at' | 'created_by_user_id'>,
  signal?: AbortSignal
): Promise<ResourceBox> {
  try {
    // El backend de tu compañero no tiene tabla resourceboxes separada
    // En su lugar, almacena las cajas temporalmente en localStorage
    // y permite crear entradas directamente usando el endpoint /inventory/box
    
    // Convertir items al formato esperado por el backend
    const backendItems = data.items.map(item => ({
      itemName: item.item_name,
      categoryId: item.category_id,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes
    }));
    
    // Crear la caja de manera local y devolver la estructura esperada
    const boxId = Date.now(); // ID temporal único
    const newBox: ResourceBox = {
      box_id: boxId,
      name: data.name,
      description: data.description,
      items: data.items,
      created_at: new Date().toISOString(),
      created_by_user_id: 1 // Se asumirá el usuario actual
    };
    
    // Guardar en localStorage para poder usar después
    const existingBoxes = JSON.parse(localStorage.getItem('resourceBoxes') || '[]');
    existingBoxes.push(newBox);
    localStorage.setItem('resourceBoxes', JSON.stringify(existingBoxes));
    
    return newBox;
  } catch (error) {
    console.error('Error creating resource box:', error);
    throw error;
  }
}

/**
 * Crea una entrada usando una caja de recursos
 */
export async function createBoxEntry(
  centerId: string,
  data: BoxEntryCreateDTO,
  signal?: AbortSignal
): Promise<{ movement_id: number; message: string }> {
  try {
    // Obtener la caja desde localStorage
    const boxes = JSON.parse(localStorage.getItem('resourceBoxes') || '[]');
    const selectedBox = boxes.find((box: ResourceBox) => box.box_id === data.box_id);
    
    if (!selectedBox) {
      throw new Error('Caja no encontrada');
    }
    
    // Convertir items al formato esperado por el backend de tu compañero
    const backendItems = selectedBox.items.map((item: BoxItemTemplate) => ({
      itemName: item.item_name,
      categoryId: item.category_id,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes
    }));
    
    // Formatear datos según lo que espera el backend de tu compañero
    const backendData = {
      name: selectedBox.name,
      description: selectedBox.description || data.reason,
      items: backendItems
    };
    
    const response = await api.post(`/centers/${centerId}/inventory/box`, backendData, { signal });
    return response.data;
  } catch (error) {
    console.error(`Error creating box entry for center ${centerId}:`, error);
    throw error;
  }
}

// Funciones para manejo offline
const PENDING_OPERATIONS_KEY = 'appcopio_pending_movements';

/**
 * Guarda una operación pendiente en localStorage
 */
export function savePendingOperation(operation: any): void {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_OPERATIONS_KEY) || '[]');
    pending.push({
      ...operation,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      attempts: 0
    });
    localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(pending));
  } catch (error) {
    console.error('Error saving pending operation:', error);
  }
}

/**
 * Obtiene operaciones pendientes de localStorage
 */
export function getPendingOperations(): any[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_OPERATIONS_KEY) || '[]');
  } catch (error) {
    console.error('Error getting pending operations:', error);
    return [];
  }
}

/**
 * Elimina una operación pendiente
 */
export function removePendingOperation(operationId: string): void {
  try {
    const pending = JSON.parse(localStorage.getItem(PENDING_OPERATIONS_KEY) || '[]');
    const filtered = pending.filter((op: any) => op.id !== operationId);
    localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing pending operation:', error);
  }
}

/**
 * Sincroniza operaciones pendientes cuando hay conexión
 */
export async function syncPendingOperations(centerId: string): Promise<{ synced: number; failed: number }> {
  const pendingOps = getPendingOperations().filter((op: any) => op.center_id === centerId);
  let synced = 0;
  let failed = 0;

  for (const operation of pendingOps) {
    try {
      if (operation.type === 'ENTRY') {
        await createEntryMovement(centerId, operation.data);
      } else if (operation.type === 'EXIT') {
        await createExitMovement(centerId, operation.data);
      }
      
      removePendingOperation(operation.id);
      synced++;
    } catch (error: any) {
      console.error(`Failed to sync operation ${operation.id}:`, error);
      
      // Actualizar la operación con información del error
      const pending = JSON.parse(localStorage.getItem(PENDING_OPERATIONS_KEY) || '[]');
      const updatedPending = pending.map((op: any) => {
        if (op.id === operation.id) {
          return {
            ...op,
            attempts: (op.attempts || 0) + 1,
            last_error: error.response?.data?.error || error.message || 'Error desconocido',
            last_attempt: new Date().toISOString()
          };
        }
        return op;
      });
      localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(updatedPending));
      
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Sincronización automática en segundo plano
 */
export function startAutoSync(centerId: string, onSyncComplete?: (results: { synced: number; failed: number }) => void) {
  const checkAndSync = async () => {
    if (!navigator.onLine) return; // No hay conexión
    
    const pendingOps = getPendingOperations().filter((op: any) => op.center_id === centerId);
    if (pendingOps.length === 0) return; // No hay operaciones pendientes
    
    try {
      const results = await syncPendingOperations(centerId);
      if (results.synced > 0 && onSyncComplete) {
        onSyncComplete(results);
      }
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  };

  // Sync inmediato si hay conexión
  checkAndSync();

  // Sync cuando se recupera la conexión
  const handleOnline = () => {
    setTimeout(checkAndSync, 1000); // Delay para asegurar conexión estable
  };

  window.addEventListener('online', handleOnline);
  
  // Sync periódico cada 30 segundos si hay conexión
  const intervalId = setInterval(() => {
    if (navigator.onLine) {
      checkAndSync();
    }
  }, 30000);

  // Función de cleanup
  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(intervalId);
  };
}