/**
 * FASE 3: Sincronización Inteligente
 * 
 * Sistema avanzado de sincronización con:
 * - Backoff exponencial para reintentos
 * - Priorización de operaciones críticas
 * - Resolución básica de conflictos
 * - Background sync periódico
 * - Métricas de sincronización
 */

import { getMutationsToSync, markMutationAsSuccess, markMutationAsFailed, incrementRetryCount, getDB } from './db';
import { apiNoRetry } from '@/lib/api';
import type { MutationQueueItem, SyncResult, SyncConflict, SyncOptions, SyncMetrics } from './types';

// =====================================================
// CONFIGURACIÓN DE SINCRONIZACIÓN
// =====================================================

const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  maxRetries: 5,
  baseDelay: 1000, // 1 segundo inicial
  backoffMultiplier: 2, // Duplicar cada vez: 1s, 2s, 4s, 8s, 16s
  maxDelay: 30000, // Max 30 segundos entre reintentos
  conflictStrategy: 'last-write-wins', // Estrategia por defecto
  batchSize: 10, // Procesar max 10 operaciones por lote
  priorityWeights: {
    critical: 100,
    high: 50,
    normal: 10,
    low: 1
  }
};

// =====================================================
// PRIORIZACIÓN DE MUTACIONES
// =====================================================

/**
 * Determina la prioridad de una mutación según su tipo
 */
function getMutationPriority(mutation: MutationQueueItem): 'critical' | 'high' | 'normal' | 'low' {
  const { method, url, entityType } = mutation;

  // Operaciones críticas - requieren sincronización inmediata
  if (entityType === 'emergency' || url?.includes('/emergency')) return 'critical';
  if (method === 'DELETE' && entityType === 'user') return 'critical';
  
  // Alta prioridad - importantes pero no urgentes
  if (method === 'POST' && entityType === 'inventory') return 'high';
  if (method === 'PUT' && entityType === 'center') return 'high';
  if (url?.includes('/notifications')) return 'high';

  // Prioridad normal - la mayoría de operaciones CRUD
  if (method === 'POST' || method === 'PUT') return 'normal';
  
  // Baja prioridad - operaciones de solo lectura o metadata
  return 'low';
}

/**
 * Ordena las mutaciones por prioridad y timestamp
 */
function prioritizeMutations(mutations: MutationQueueItem[]): MutationQueueItem[] {
  return mutations.sort((a, b) => {
    const priorityA = getMutationPriority(a);
    const priorityB = getMutationPriority(b);
    
    const weightA = DEFAULT_SYNC_OPTIONS.priorityWeights[priorityA];
    const weightB = DEFAULT_SYNC_OPTIONS.priorityWeights[priorityB];
    
    // Primero por prioridad (peso mayor = mayor prioridad)
    if (weightA !== weightB) {
      return weightB - weightA;
    }
    
    // Luego por timestamp (más antiguo primero)
    return a.timestamp - b.timestamp;
  });
}

// =====================================================
// BACKOFF EXPONENCIAL
// =====================================================

/**
 * Calcula el delay para el siguiente reintento usando backoff exponencial
 */
function calculateBackoffDelay(retryCount: number, options = DEFAULT_SYNC_OPTIONS): number {
  const delay = options.baseDelay * Math.pow(options.backoffMultiplier, retryCount);
  return Math.min(delay, options.maxDelay);
}

/**
 * Espera un tiempo determinado (con jitter para evitar thundering herd)
 */
async function waitWithJitter(baseDelay: number): Promise<void> {
  // Agregar hasta 25% de jitter aleatorio
  const jitter = Math.random() * 0.25;
  const actualDelay = baseDelay * (1 + jitter);
  
  return new Promise(resolve => setTimeout(resolve, actualDelay));
}

// =====================================================
// SINCRONIZACIÓN CON REINTENTOS
// =====================================================

/**
 * Intenta sincronizar una mutación individual con backoff exponencial
 */
async function syncMutationWithBackoff(
  mutation: MutationQueueItem,
  options = DEFAULT_SYNC_OPTIONS
): Promise<{ success: boolean; conflict?: SyncConflict; error?: any }> {
  
  console.log(`[Sync] Procesando mutación ${mutation.id} - Intento ${mutation.retryCount + 1}/${options.maxRetries}`);

  try {
    // Construir petición HTTP
    const requestConfig: any = {
      method: mutation.method,
      url: mutation.url,
    };

    if (mutation.data && (mutation.method === 'POST' || mutation.method === 'PUT' || mutation.method === 'PATCH')) {
      requestConfig.data = mutation.data;
    }

    // Ejecutar petición (usando apiNoRetry para evitar loops)
    const response = await apiNoRetry.request(requestConfig);
    
    // Éxito - marcar como completada
    await markMutationAsSuccess(mutation.id);
    
    console.log(`[Sync] ✅ Mutación ${mutation.id} sincronizada exitosamente`);
    return { success: true };

  } catch (error: any) {
    console.warn(`[Sync] ⚠️ Error sincronizando mutación ${mutation.id}:`, error.response?.status, error.message);

    // Detectar conflictos (409 Conflict)
    if (error.response?.status === 409) {
      const conflict: SyncConflict = {
        mutationId: mutation.id,
        entityType: mutation.entityType || 'unknown',
        entityId: mutation.entityId || 'unknown',
        localVersion: mutation.data,
        remoteVersion: error.response.data,
        timestamp: Date.now(),
        error: error
      };
      
      console.warn(`[Sync] 🔄 Conflicto detectado en mutación ${mutation.id}`);
      return { success: false, conflict };
    }

    // Manejar errores 401 (token expirado) con renovación
    if (error.response?.status === 401) {
      console.log(`[Sync] 🔑 Error 401 en mutación ${mutation.id} - intentando renovar token`);
      
      const { handle401Error } = await import('./auth-handler');
      const authResult = await handle401Error(error);
      
      if (authResult.success) {
        // Token renovado, reintentar la mutación
        console.log(`[Sync] ✅ Token renovado - reintentando mutación ${mutation.id}`);
        return await syncMutationWithBackoff(mutation, options); // Recursión con token renovado
      } else if (authResult.shouldLogout) {
        // Refresh token también expiró - marcar como error especial
        await markMutationAsFailed(mutation.id, 'AUTHENTICATION_EXPIRED');
        console.error(`[Sync] 🚨 Autenticación expirada - mutación ${mutation.id} pausada hasta re-login`);
        return { success: false, error: new Error('AUTHENTICATION_EXPIRED') };
      }
    }
    
    // Otros errores irrecuperables - no reintentar
    const unrecoverableStatuses = [400, 403, 404, 422]; // 401 removido - se maneja arriba
    if (error.response && unrecoverableStatuses.includes(error.response.status)) {
      await markMutationAsFailed(mutation.id, error.response.data || error.message);
      console.error(`[Sync] ❌ Error irrecuperable (${error.response.status}) - mutación ${mutation.id} marcada como fallida`);
      return { success: false, error };
    }

    // Errores recuperables - reintentar con backoff
    if (mutation.retryCount < options.maxRetries - 1) {
      await incrementRetryCount(mutation.id);
      
      const delay = calculateBackoffDelay(mutation.retryCount + 1, options);
      console.log(`[Sync] 🔄 Reintentando mutación ${mutation.id} en ${delay}ms (intento ${mutation.retryCount + 2}/${options.maxRetries})`);
      
      await waitWithJitter(delay);
      return { success: false, error };
    } else {
      // Máximo de reintentos alcanzado
      await markMutationAsFailed(mutation.id, error.response?.data || error.message);
      console.error(`[Sync] ❌ Máximo de reintentos alcanzado - mutación ${mutation.id} marcada como fallida`);
      return { success: false, error };
    }
  }
}

// =====================================================
// SINCRONIZACIÓN POR LOTES
// =====================================================

/**
 * Procesa un lote de mutaciones respetando prioridades
 */
async function processBatch(mutations: MutationQueueItem[], options = DEFAULT_SYNC_OPTIONS): Promise<{
  successful: MutationQueueItem[];
  failed: MutationQueueItem[];
  conflicts: SyncConflict[];
}> {
  const successful: MutationQueueItem[] = [];
  const failed: MutationQueueItem[] = [];
  const conflicts: SyncConflict[] = [];

  // Priorizar mutaciones
  const prioritizedMutations = prioritizeMutations(mutations);
  const batchToProcess = prioritizedMutations.slice(0, options.batchSize);

  console.log(`[Sync] Procesando lote de ${batchToProcess.length} mutaciones`);

  for (const mutation of batchToProcess) {
    const result = await syncMutationWithBackoff(mutation, options);
    
    if (result.success) {
      successful.push(mutation);
    } else if (result.conflict) {
      conflicts.push(result.conflict);
    } else {
      failed.push(mutation);
    }

    // Pequeña pausa entre mutaciones para no saturar el servidor
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { successful, failed, conflicts };
}

// =====================================================
// SINCRONIZACIÓN PRINCIPAL
// =====================================================

/**
 * Ejecuta una sincronización completa con todas las mutaciones pendientes
 */
export async function performIntelligentSync(options = DEFAULT_SYNC_OPTIONS): Promise<SyncResult> {
  const startTime = Date.now();
  console.log('[Sync] 🚀 Iniciando sincronización inteligente...');

  try {
    // Obtener todas las mutaciones pendientes
    const pendingMutations = await getMutationsToSync();
    
    if (pendingMutations.length === 0) {
      console.log('[Sync] ✅ No hay mutaciones pendientes');
      return {
        success: 0,
        failed: 0,
        conflicts: [],
        total: 0,
        duration: Date.now() - startTime,
        metrics: await getSyncMetrics()
      };
    }

    console.log(`[Sync] 📋 ${pendingMutations.length} mutaciones pendientes encontradas`);

    const allSuccessful: MutationQueueItem[] = [];
    const allFailed: MutationQueueItem[] = [];
    const allConflicts: SyncConflict[] = [];

    // Procesar en lotes para evitar sobrecarga
    let remainingMutations = [...pendingMutations];
    
    while (remainingMutations.length > 0) {
      const batch = remainingMutations.splice(0, options.batchSize);
      const batchResult = await processBatch(batch, options);
      
      allSuccessful.push(...batchResult.successful);
      allFailed.push(...batchResult.failed);
      allConflicts.push(...batchResult.conflicts);

      // Pausa entre lotes
      if (remainingMutations.length > 0) {
        console.log(`[Sync] ⏱️ Pausa entre lotes... ${remainingMutations.length} mutaciones restantes`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const duration = Date.now() - startTime;
    
    const result: SyncResult = {
      success: allSuccessful.length,
      failed: allFailed.length,
      conflicts: allConflicts,
      total: pendingMutations.length,
      duration,
      metrics: await getSyncMetrics()
    };

    console.log(`[Sync] ✅ Sincronización completada en ${duration}ms:`, {
      exitosas: result.success,
      fallidas: result.failed,
      conflictos: result.conflicts.length,
      total: result.total
    });

    // Actualizar métricas
    await updateSyncMetrics(result);

    return result;

  } catch (error) {
    console.error('[Sync] ❌ Error durante sincronización inteligente:', error);
    throw error;
  }
}

// =====================================================
// MÉTRICAS DE SINCRONIZACIÓN
// =====================================================

/**
 * Obtiene métricas actuales de sincronización
 */
async function getSyncMetrics(): Promise<SyncMetrics> {
  try {
    const db = await getDB();
    const result = await db.get('sync-metadata', 'sync-metrics');
    
    const defaultMetrics: SyncMetrics = {
      totalSyncs: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      totalConflicts: 0,
      averageDuration: 0,
      lastSyncTime: 0,
      successRate: 0
    };

    // Si el resultado existe, intentar extraer las métricas
    if (result && typeof result === 'object') {
      // Caso 1: Wrapper con propiedad 'data'
      if ('data' in result) {
        const wrappedData = (result as any).data;
        if (wrappedData && typeof wrappedData === 'object' && 'totalSyncs' in wrappedData) {
          return wrappedData as SyncMetrics;
        }
      }
      
      // Caso 2: Objeto directo que tiene las propiedades de SyncMetrics
      if ('totalSyncs' in result && 'successRate' in result) {
        return result as unknown as SyncMetrics;
      }
    }
    
    // Si no hay resultado válido, devolver default
    return defaultMetrics;
  } catch (error) {
    console.warn('[Sync] Error obteniendo métricas:', error);
    return {
      totalSyncs: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      totalConflicts: 0,
      averageDuration: 0,
      lastSyncTime: 0,
      successRate: 0
    };
  }
}

/**
 * Actualiza métricas después de una sincronización
 */
async function updateSyncMetrics(result: SyncResult): Promise<void> {
  try {
    const currentMetrics = await getSyncMetrics();
    
    const newTotalSyncs = currentMetrics.totalSyncs + 1;
    const newTotalSuccessful = currentMetrics.totalSuccessful + result.success;
    const newTotalFailed = currentMetrics.totalFailed + result.failed;
    const newTotalConflicts = currentMetrics.totalConflicts + result.conflicts.length;
    
    // Calcular nueva duración promedio
    const newAverageDuration = (
      (currentMetrics.averageDuration * currentMetrics.totalSyncs) + result.duration
    ) / newTotalSyncs;
    
    // Calcular nueva tasa de éxito
    const newSuccessRate = newTotalSyncs > 0 ? 
      (newTotalSuccessful / (newTotalSuccessful + newTotalFailed)) * 100 : 0;

    const updatedMetrics: SyncMetrics = {
      totalSyncs: newTotalSyncs,
      totalSuccessful: newTotalSuccessful,
      totalFailed: newTotalFailed,
      totalConflicts: newTotalConflicts,
      averageDuration: Math.round(newAverageDuration),
      lastSyncTime: Date.now(),
      successRate: Math.round(newSuccessRate * 100) / 100
    };

    const db = await getDB();
    
    // Usar estructura wrapper para almacenamiento
    const wrapper = {
      id: 'sync-metrics',
      data: updatedMetrics,
      timestamp: Date.now()
    };
    
    await db.put('sync-metadata', wrapper as any);

    console.log('[Sync] 📊 Métricas actualizadas:', updatedMetrics);
    
  } catch (error) {
    console.warn('[Sync] Error actualizando métricas:', error);
  }
}

// =====================================================
// EXPORTACIONES PÚBLICAS
// =====================================================

export {
  DEFAULT_SYNC_OPTIONS,
  getMutationPriority,
  prioritizeMutations,
  calculateBackoffDelay,
  syncMutationWithBackoff,
  processBatch,
  getSyncMetrics,
  updateSyncMetrics
};