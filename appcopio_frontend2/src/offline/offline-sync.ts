/**
 * Sistema de sincronización offline consolidado
 * 
 * Consolida funcionalidades de:
 * - queue.ts: Gestión de cola de mutaciones
 * - sync.ts: Sincronización inteligente con backoff
 * - backgroundSync.ts: Sincronización automática en background
 */

import type { MutationQueueItem, SyncResult, SyncConflict, SyncOptions, SyncMetrics } from './types';
import { 
  enqueueMutation, 
  getPendingMutations, 
  markMutationAsSuccess, 
  markMutationAsFailed,
  incrementRetryCount,
  getMutationsToSync,
  getDB 
} from './db';
import { apiNoRetry } from '@/lib/api';
import { SYNC_CONFIG, BACKGROUND_SYNC_CONFIG, getMutationPriority } from './config';
import { emitSyncCompleted, emitSyncFailed } from './events';
import { executeWithTokenRefresh } from './offline-core';

// =====================================================
// TIPOS CONSOLIDADOS
// =====================================================

/**
 * Información de un conflicto
 */
export interface ConflictInfo {
  mutation: MutationQueueItem;
  error: any;
  conflictType: 'version' | 'deleted' | 'unknown';
}

/**
 * Estado del procesamiento de cola
 */
export interface QueueProcessingResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  conflicts: ConflictInfo[];
  remainingInQueue: number;
}

// =====================================================
// GESTIÓN DE COLA
// =====================================================

/**
 * Añade una mutación a la cola de pendientes
 */
export async function addMutationToQueue(mutation: Omit<MutationQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
  const fullMutation: MutationQueueItem = {
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retryCount: 0,

  };

  console.log('[OfflineQueue] 📝 Encolando mutación:', {
    id: fullMutation.id,
    method: fullMutation.method,
    url: fullMutation.url,

  });

  await enqueueMutation(fullMutation);
  return fullMutation.id;
}

/**
 * Procesa todas las mutaciones pendientes en la cola
 */
export async function processQueue(): Promise<QueueProcessingResult> {
  console.log('[OfflineSync] 🔄 Iniciando procesamiento de cola...');
  
  const pendingMutations = await getPendingMutations();
  
  if (pendingMutations.length === 0) {
    console.log('[OfflineSync] ✅ No hay mutaciones pendientes');
    return {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      conflicts: [],
      remainingInQueue: 0
    };
  }

  console.log(`[OfflineSync] 📋 Procesando ${pendingMutations.length} mutaciones pendientes`);
  
  let successful = 0;
  let failed = 0;
  const conflicts: ConflictInfo[] = [];

  // Ordenar por timestamp (más antiguas primero)
  const sortedMutations = pendingMutations.sort((a, b) => a.timestamp - b.timestamp);

  // Procesar en lotes
  for (let i = 0; i < sortedMutations.length; i += SYNC_CONFIG.batchSize) {
    const batch = sortedMutations.slice(i, i + SYNC_CONFIG.batchSize);
    
    console.log(`[OfflineSync] 🔄 Procesando lote ${Math.floor(i / SYNC_CONFIG.batchSize) + 1}/${Math.ceil(sortedMutations.length / SYNC_CONFIG.batchSize)}`);
    
    // Procesar cada mutación del lote
    for (const mutation of batch) {
      try {
        const result = await replayMutation(mutation);
        if (result.success) {
          await markMutationAsSuccess(mutation.id);
          successful++;
          console.log(`[OfflineSync] ✅ Mutación ${mutation.id} exitosa`);
        } else {
          await handleMutationFailure(mutation, result.error);
          if (result.conflict) {
            conflicts.push({
              mutation,
              error: result.error,
              conflictType: detectConflictType(result.error)
            });
          }
          failed++;
        }
      } catch (error) {
        console.error(`[OfflineSync] ❌ Error procesando mutación ${mutation.id}:`, error);
        await handleMutationFailure(mutation, error);
        failed++;
      }
    }
    
    // Pausa breve entre lotes para no sobrecargar
    if (i + SYNC_CONFIG.batchSize < sortedMutations.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const remainingMutations = await getPendingMutations();
  
  const result: QueueProcessingResult = {
    totalProcessed: pendingMutations.length,
    successful,
    failed,
    conflicts,
    remainingInQueue: remainingMutations.length
  };

  console.log('[OfflineSync] 📊 Resultado del procesamiento:', result);
  return result;
}

/**
 * Ejecuta una mutación individual
 */
async function replayMutation(mutation: MutationQueueItem): Promise<{ success: boolean; error?: any; conflict?: boolean }> {
  try {
    console.log(`[OfflineSync] 🎬 Replayeando mutación: ${mutation.method} ${mutation.url}`);
    
    // Usar executeWithTokenRefresh para manejar automáticamente el refresh del token
    const response = await executeWithTokenRefresh(() => 
      apiNoRetry({
        method: mutation.method,
        url: mutation.url,
        data: mutation.data
      })
    );

    console.log(`[OfflineSync] ✅ Mutación exitosa: ${mutation.id}`);
    return { success: true };
    
  } catch (error: any) {
    console.error(`[OfflineSync] ❌ Error en mutación ${mutation.id}:`, error);
    
    // Detectar si es un conflicto
    const isConflict = error.response?.status === 409 || 
                      error.response?.status === 412 ||
                      error.response?.data?.code === 'VERSION_CONFLICT';
    
    return { 
      success: false, 
      error, 
      conflict: isConflict 
    };
  }
}

/**
 * Maneja el fallo de una mutación
 */
async function handleMutationFailure(mutation: MutationQueueItem, error: any): Promise<void> {
  const newRetryCount = (mutation.retryCount || 0) + 1;
  
  if (newRetryCount >= SYNC_CONFIG.maxRetries) {
    console.warn(`[OfflineSync] ⚠️ Mutación ${mutation.id} ha excedido máximo de reintentos (${SYNC_CONFIG.maxRetries})`);
    await markMutationAsFailed(mutation.id, error.message || 'Unknown error');
  } else {
    console.log(`[OfflineSync] 🔄 Incrementando contador de reintentos para ${mutation.id}: ${newRetryCount}/${SYNC_CONFIG.maxRetries}`);
    await incrementRetryCount(mutation.id);
  }
}

/**
 * Detecta el tipo de conflicto basado en el error
 */
function detectConflictType(error: any): 'version' | 'deleted' | 'unknown' {
  if (error.response?.status === 409) return 'version';
  if (error.response?.status === 404) return 'deleted';
  return 'unknown';
}

// =====================================================
// SINCRONIZACIÓN INTELIGENTE
// =====================================================

/**
 * Realiza sincronización inteligente con backoff y priorización
 */
export async function performIntelligentSync(options: Partial<SyncOptions> = {}): Promise<SyncResult> {
  const config = { ...SYNC_CONFIG, ...options };
  
  console.log('[OfflineSync] 🧠 Iniciando sincronización inteligente...');

  try {
    // Obtener mutaciones a sincronizar (excluye las que han fallado demasiadas veces)
    const mutations = await getMutationsToSync();
    
    if (mutations.length === 0) {
      console.log('[OfflineSync] ✅ No hay mutaciones para sincronizar');
      const result: SyncResult = { success: 0, failed: 0, conflicts: [], total: 0, duration: 0 };
      emitSyncCompleted(result.success, result.failed, result.total);
      return result;
    }

    console.log(`[OfflineSync] 📋 Sincronizando ${mutations.length} mutaciones`);

    // Agrupar por prioridad
    const groupedByPriority = groupMutationsByPriority(mutations);
    
    let totalSuccess = 0;
    let totalFailed = 0;
    let allConflicts: SyncConflict[] = [];

    // Procesar por orden de prioridad
    const priorities: Array<'critical' | 'high' | 'normal' | 'low'> = ['critical', 'high', 'normal', 'low'];
    
    for (const priority of priorities) {
      const priorityMutations = groupedByPriority[priority] || [];
      if (priorityMutations.length === 0) continue;

      console.log(`[OfflineSync] 🔥 Procesando ${priorityMutations.length} mutaciones de prioridad ${priority}`);
      
      // Procesar lote por lote
      for (let i = 0; i < priorityMutations.length; i += config.batchSize) {
        const batch = priorityMutations.slice(i, i + config.batchSize);
        
        const batchResults = await processBatchWithBackoff(batch, config);
        
        totalSuccess += batchResults.success;
        totalFailed += batchResults.failed;
        allConflicts.push(...batchResults.conflicts);
        
        // Emitir progreso
        const progress = {
          processed: totalSuccess + totalFailed,
          total: mutations.length,
          successful: totalSuccess,
          failed: totalFailed
        };
        // Progreso - emitir si fuera necesario
        
        // Pausa entre lotes si no es crítico
        if (priority !== 'critical' && i + config.batchSize < priorityMutations.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    const result: SyncResult = {
      success: totalSuccess,
      failed: totalFailed,
      conflicts: allConflicts,
      total: mutations.length,
      duration: 0
    };

    console.log('[OfflineSync] 📊 Sincronización completada:', result);
    emitSyncCompleted(result.success, result.failed, result.total);
    return result;
    
  } catch (error) {
    console.error('[OfflineSync] ❌ Error en sincronización:', error);
    emitSyncFailed(error);
    throw error;
  }
}

/**
 * Agrupa mutaciones por prioridad
 */
function groupMutationsByPriority(mutations: MutationQueueItem[]): Record<string, MutationQueueItem[]> {
  return mutations.reduce((groups, mutation) => {
    const priority = 'normal'; // Prioridad por defecto
    if (!groups[priority]) groups[priority] = [];
    groups[priority].push(mutation);
    return groups;
  }, {} as Record<string, MutationQueueItem[]>);
}

/**
 * Procesa un lote de mutaciones con backoff exponencial
 */
async function processBatchWithBackoff(
  batch: MutationQueueItem[], 
  config: SyncOptions
): Promise<{ success: number; failed: number; conflicts: SyncConflict[] }> {
  let success = 0;
  let failed = 0;
  const conflicts: SyncConflict[] = [];

  for (const mutation of batch) {
    const delay = calculateBackoffDelay(mutation.retryCount || 0, config);
    
    if (delay > 0) {
      console.log(`[OfflineSync] ⏰ Esperando ${delay}ms antes de reintentar mutación ${mutation.id}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      const result = await replayMutation(mutation);
      
      if (result.success) {
        await markMutationAsSuccess(mutation.id);
        success++;
      } else {
        if (result.conflict) {
          conflicts.push({
            mutationId: mutation.id,
            entityType: mutation.entityType || 'unknown',
            entityId: mutation.entityId || 'unknown',
            localVersion: mutation.data,
            remoteVersion: null,
            timestamp: Date.now(),

            error: result.error
          });
        }
        
        await handleMutationFailure(mutation, result.error);
        failed++;
      }
    } catch (error) {
      console.error(`[OfflineSync] ❌ Error procesando mutación ${mutation.id}:`, error);
      await handleMutationFailure(mutation, error);
      failed++;
    }
  }

  return { success, failed, conflicts };
}

/**
 * Calcula el delay para backoff exponencial
 */
function calculateBackoffDelay(retryCount: number, config: SyncOptions): number {
  if (retryCount === 0) return 0;
  
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, retryCount - 1);
  return Math.min(delay, config.maxDelay);
}

// =====================================================
// UTILIDADES DE ESTADO
// =====================================================

/**
 * Obtiene estadísticas de la cola
 */
export async function getQueueStatus(): Promise<{ pending: number; failed: number; total: number }> {
  const mutations = await getPendingMutations();
  const failed = mutations.filter(m => (m.retryCount || 0) >= SYNC_CONFIG.maxRetries).length;
  
  return {
    pending: mutations.length - failed,
    failed,
    total: mutations.length
  };
}

/**
 * Limpia mutaciones exitosas antiguas
 */
export async function cleanOldSuccessfulMutations(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(['mutation-queue'], 'readwrite');
  const store = tx.objectStore('mutation-queue');
  
  let deletedCount = 0;
  const cutoffTime = Date.now() - olderThanMs;
  
  const cursor = await store.openCursor();
  
  while (cursor) {
    const mutation = cursor.value as MutationQueueItem;
    
    // Eliminar si es exitosa y antigua
    if (mutation.status === 'success' && mutation.timestamp < cutoffTime) {
      await cursor.delete();
      deletedCount++;
    }
    
    cursor.continue();
  }
  
  await tx.done;
  
  console.log(`[OfflineSync] 🧹 Limpiadas ${deletedCount} mutaciones exitosas antiguas`);
  return deletedCount;
}

// =====================================================
// BACKGROUND SYNC
// =====================================================

class BackgroundSyncManager {
  private intervalId: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private isUserActive: boolean = true;
  private currentInterval: number = BACKGROUND_SYNC_CONFIG.baseInterval;

  /**
   * Inicia la sincronización periódica en background
   */
  start(): void {
    if (this.intervalId) {
      console.log('[BackgroundSync] Ya está en funcionamiento');
      return;
    }

    console.log('[BackgroundSync] 🚀 Iniciando sync periódico cada', this.currentInterval / 1000, 'segundos');
    
    this.setupActivityListeners();
    
    this.intervalId = setInterval(() => {
      this.performBackgroundSync();
    }, this.currentInterval);
  }

  /**
   * Detiene la sincronización en background
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[BackgroundSync] 🛑 Sync periódico detenido');
    }
  }

  /**
   * Configura listeners de actividad del usuario
   */
  private setupActivityListeners(): void {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      this.lastActivity = Date.now();
      if (!this.isUserActive) {
        this.isUserActive = true;
        this.adjustSyncInterval();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Verificar inactividad periódicamente
    setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivity;
      const wasActive = this.isUserActive;
      this.isUserActive = timeSinceActivity < 60000; // 1 minuto de inactividad
      
      if (wasActive !== this.isUserActive) {
        this.adjustSyncInterval();
      }
    }, 30000); // Verificar cada 30 segundos
  }

  /**
   * Ajusta el intervalo de sincronización según actividad
   */
  private adjustSyncInterval(): void {
    const newInterval = this.isUserActive 
      ? BACKGROUND_SYNC_CONFIG.baseInterval 
      : Math.min(BACKGROUND_SYNC_CONFIG.baseInterval * 2, BACKGROUND_SYNC_CONFIG.maxInterval);

    if (newInterval !== this.currentInterval) {
      this.currentInterval = newInterval;
      
      // Reiniciar con nuevo intervalo
      if (this.intervalId) {
        this.stop();
        this.start();
      }
      
      console.log(`[BackgroundSync] 🔄 Intervalo ajustado: ${this.currentInterval / 1000}s (usuario ${this.isUserActive ? 'activo' : 'inactivo'})`);
    }
  }

  /**
   * Ejecuta sincronización en background con condiciones
   */
  private async performBackgroundSync(): Promise<void> {
    // Verificar si estamos online
    if (!navigator.onLine) {
      console.log('[BackgroundSync] 📴 Offline - saltando sync');
      return;
    }

    // Verificar condiciones de batería si está disponible
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        if (!battery.charging && battery.level < BACKGROUND_SYNC_CONFIG.batteryLowThreshold) {
          console.log('[BackgroundSync] 🔋 Batería baja - saltando sync');
          return;
        }
      } catch (e) {
        // Batería API no disponible, continuar
      }
    }

    // Verificar tipo de conexión si está disponible
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && connection.effectiveType === 'slow-2g') {
        console.log('[BackgroundSync] 🐌 Conexión lenta - saltando sync');
        return;
      }
    }

    console.log('[BackgroundSync] 🔄 Ejecutando sincronización automática...');
    
    try {
      const result = await performIntelligentSync();
      
      if (result.total > 0) {
        console.log(`[BackgroundSync] ✅ Sync completado: ${result.success}/${result.total} exitosas`);
      }
    } catch (error) {
      console.error('[BackgroundSync] ❌ Error en sync automático:', error);
    }
  }
}

// Instancia singleton del manager
const backgroundSyncManager = new BackgroundSyncManager();

/**
 * Inicia el background sync
 */
export function startBackgroundSync(): void {
  backgroundSyncManager.start();
}

/**
 * Detiene el background sync
 */
export function stopBackgroundSync(): void {
  backgroundSyncManager.stop();
}

/**
 * Obtiene métricas de sincronización
 */
export async function getSyncMetrics(): Promise<SyncMetrics> {
  const queueStatus = await getQueueStatus();
  
  return {
    totalSyncs: 0,
    totalSuccessful: 0,
    totalFailed: queueStatus.failed,
    totalConflicts: 0,
    averageDuration: 0,
    lastSyncTime: Date.now(),
    successRate: 0
  };
}