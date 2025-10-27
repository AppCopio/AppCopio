// src/services/movements.service.ts
import { api } from "@/lib/api";
import type {
  EntryMovementCreateDTO,
  ExitMovementCreateDTO,
  MovementHistoryItem,
  StockValidation,
  ResourceBox,
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
    const response = await api.post(`/centers/${centerId}/movements/entries`, data, { signal });
    return response.data;
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
  data: ExitMovementCreateDTO,
  signal?: AbortSignal
): Promise<{ movement_id: number; message: string }> {
  try {
    const response = await api.post(`/centers/${centerId}/movements/exits`, data, { signal });
    return response.data;
  } catch (error) {
    console.error(`Error creating exit movement for center ${centerId}:`, error);
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
    const response = await api.post(`/centers/${centerId}/movements/validate-stock`, { items }, { signal });
    return response.data;
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
    const response = await api.get(`/centers/${centerId}/movements/history`, { signal });
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching movement history for center ${centerId}:`, error);
    return [];
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
 * Obtiene todas las cajas de recursos disponibles
 */
export async function getResourceBoxes(signal?: AbortSignal): Promise<ResourceBox[]> {
  try {
    const response = await api.get('/resource-boxes', { signal });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching resource boxes:', error);
    return [];
  }
}

/**
 * Crea una nueva caja de recursos
 */
export async function createResourceBox(
  data: Omit<ResourceBox, 'box_id' | 'created_at' | 'created_by_user_id'>,
  signal?: AbortSignal
): Promise<ResourceBox> {
  try {
    const response = await api.post('/resource-boxes', data, { signal });
    return response.data;
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
    const response = await api.post(`/centers/${centerId}/movements/box-entries`, data, { signal });
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