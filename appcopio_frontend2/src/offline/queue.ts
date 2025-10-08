/**
 * Gestión de cola de mutaciones offline
 * 
 * Funciones para:
 * - Añadir mutaciones a la cola
 * - Procesar cola al reconectar
 * - Replay de mutaciones individuales
 * - Detección de conflictos
 */

import type { MutationQueueItem } from './types';
import { enqueueMutation, getPendingMutations, markMutationAsSuccess, incrementRetryCount } from './db';

// =====================================================
// TIPOS
// =====================================================

/**
 * Resultado de la sincronización
 */
export interface SyncResult {
  success: number; // Mutaciones exitosas
  failed: number; // Mutaciones fallidas
  conflicts: ConflictInfo[]; // Conflictos detectados
  total: number; // Total procesadas
}

/**
 * Información de un conflicto
 */
export interface ConflictInfo {
  mutation: MutationQueueItem;
  error: any;
  conflictType: 'version' | 'deleted' | 'unknown';
}

// =====================================================
// AÑADIR A COLA
// =====================================================

/**
 * Añade una mutación a la cola de pendientes
 * 
 * @param mutation - Mutación a encolar
 * 
 * @example
 * ```typescript
 * await addMutationToQueue({
 *   id: crypto.randomUUID(),
 *   method: 'POST',
 *   url: '/api/centers',
 *   data: newCenter,
 *   timestamp: Date.now(),
 *   retryCount: 0,
 *   status: 'pending'
 * });
 * ```
 */
export async function addMutationToQueue(mutation: MutationQueueItem): Promise<void> {
  console.log('[Queue] Añadiendo mutación a la cola:', {
    id: mutation.id,
    method: mutation.method,
    url: mutation.url,
  });

  try {
    await enqueueMutation(mutation);
    console.log('[Queue] ✅ Mutación añadida exitosamente');

    // TODO: Notificar al Context que hay una nueva pendiente
    // Esto se hará cuando actualicemos OfflineContext
  } catch (error) {
    console.error('[Queue] ❌ Error al añadir mutación:', error);
    throw error;
  }
}

// =====================================================
// PROCESAR COLA
// =====================================================

/**
 * Procesa todas las mutaciones pendientes en la cola
 * 
 * Ejecuta cada mutación en orden FIFO (First In, First Out)
 * Maneja errores, conflictos y reintentos
 * 
 * @returns Resultado de la sincronización
 * 
 * @example
 * ```typescript
 * const result = await processQueue();
 * console.log(`Exitosas: ${result.success}, Fallidas: ${result.failed}`);
 * ```
 */
export async function processQueue(): Promise<SyncResult> {
  console.log('[Queue] 🔄 Iniciando procesamiento de cola...');

  const pending = await getPendingMutations();
  console.log(`[Queue] ${pending.length} mutaciones pendientes`);

  const results: SyncResult = {
    success: 0,
    failed: 0,
    conflicts: [],
    total: pending.length,
  };

  // Si no hay nada pendiente, retornar
  if (pending.length === 0) {
    console.log('[Queue] ✅ No hay mutaciones pendientes');
    return results;
  }

  // Procesar cada mutación
  for (const mutation of pending) {
    console.log(`[Queue] Procesando mutación ${mutation.id}...`);

    try {
      await replayMutation(mutation);
      await markMutationAsSuccess(mutation.id);
      results.success++;
      console.log(`[Queue] ✅ Mutación ${mutation.id} sincronizada exitosamente`);
    } catch (error: any) {
      console.error(`[Queue] ❌ Error en mutación ${mutation.id}:`, error);

      // Detectar tipo de error
      if (isConflict(error)) {
        // Conflicto 409
        results.conflicts.push({
          mutation,
          error,
          conflictType: getConflictType(error),
        });
        console.warn(`[Queue] ⚠️ Conflicto detectado en ${mutation.id}`);
      } else if (isRetryable(error)) {
        // Error retryable → incrementar contador
        await incrementRetryCount(mutation.id);
        results.failed++;
        console.warn(`[Queue] ⚠️ Error retryable en ${mutation.id}, se reintentará`);
      } else {
        // Error no retryable → marcar como fallida permanentemente
        results.failed++;
        console.error(`[Queue] 🚫 Error permanente en ${mutation.id}`);
        // TODO: Marcar como error permanente en la BD
      }
    }
  }

  console.log('[Queue] 🏁 Procesamiento completado:', results);
  return results;
}

// =====================================================
// REPLAY DE MUTACIÓN
// =====================================================

/**
 * Ejecuta una mutación individual (replay)
 * 
 * Usa una instancia de axios sin interceptores offline
 * para evitar re-encolado
 * 
 * @param mutation - Mutación a ejecutar
 * @returns Response de la mutación
 */
async function replayMutation(mutation: MutationQueueItem): Promise<any> {
  console.log('[Queue] Replayando mutación:', {
    method: mutation.method,
    url: mutation.url,
  });

  // Importar apiNoRetry dinámicamente para evitar circular dependency
  const { apiNoRetry } = await import('../lib/api');

  // Construir config
  const config = {
    method: mutation.method,
    url: mutation.url,
    data: mutation.data,
    headers: mutation.headers || {},
  };

  // Ejecutar request
  const response = await apiNoRetry(config);
  
  return response.data;
}

// =====================================================
// DETECCIÓN DE ERRORES
// =====================================================

/**
 * Detecta si un error es un conflicto (409)
 * 
 * @param error - Error de axios
 * @returns true si es conflicto
 */
function isConflict(error: any): boolean {
  return error.response?.status === 409;
}

/**
 * Detecta si un error es retryable
 * 
 * Errores retryables:
 * - 500 Internal Server Error
 * - 502 Bad Gateway
 * - 503 Service Unavailable
 * - 504 Gateway Timeout
 * - Network errors sin response
 * 
 * @param error - Error de axios
 * @returns true si es retryable
 */
function isRetryable(error: any): boolean {
  // No hay response → error de red retryable
  if (!error.response) {
    return true;
  }

  const status = error.response.status;

  // Errores 5xx son retryables
  if (status >= 500 && status < 600) {
    return true;
  }

  // Errores 4xx NO son retryables (excepto 409 que ya manejamos)
  if (status >= 400 && status < 500) {
    return false;
  }

  return false;
}

/**
 * Determina el tipo de conflicto
 * 
 * @param error - Error de conflicto
 * @returns Tipo de conflicto
 */
function getConflictType(error: any): 'version' | 'deleted' | 'unknown' {
  const data = error.response?.data;

  // Analizar mensaje de error
  if (data?.message?.includes('version')) {
    return 'version';
  }

  if (data?.message?.includes('deleted') || data?.message?.includes('not found')) {
    return 'deleted';
  }

  return 'unknown';
}

// =====================================================
// UTILIDADES
// =====================================================

/**
 * Obtiene el estado actual de la cola
 * 
 * @returns Información del estado de la cola
 */
export async function getQueueStatus(): Promise<{
  pending: number;
  items: MutationQueueItem[];
}> {
  const items = await getPendingMutations();
  
  return {
    pending: items.length,
    items,
  };
}

/**
 * Limpia mutaciones antiguas exitosas
 * (pueden quedar marcadas como success pero sin eliminar)
 * 
 * @param olderThanDays - Días de antigüedad
 */
export async function cleanOldSuccessfulMutations(olderThanDays: number = 7): Promise<void> {
  console.log(`[Queue] Limpiando mutaciones exitosas de más de ${olderThanDays} días...`);
  
  // TODO: Implementar limpieza en db.ts si es necesario
  // Por ahora markMutationAsSuccess las elimina directamente
}
