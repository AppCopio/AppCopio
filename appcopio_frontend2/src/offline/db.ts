// src/offline/db.ts
// IndexedDB wrapper usando 'idb' para gestión offline

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { 
  MutationQueueItem, 
  CachedResponse, 
  SyncMetadata 
} from './types';

/**
 * Nombre y versión de la base de datos
 */
const DB_NAME = 'appcopio-offline-db';
const DB_VERSION = 1;

/**
 * Schema de la base de datos IndexedDB
 */
interface AppCopioDBSchema extends DBSchema {
  // Store para cache de responses de API GET
  'api-cache': {
    key: string; // URL del request
    value: CachedResponse;
    indexes: {
      'by-timestamp': number;
      'by-url': string;
    };
  };

  // Store para cola de mutaciones pendientes (POST/PUT/PATCH/DELETE)
  'mutation-queue': {
    key: string; // UUID de la mutación
    value: MutationQueueItem;
    indexes: {
      'by-timestamp': number;
      'by-status': string;
      'by-entity-type': string;
    };
  };

  // Store para metadatos de sincronización
  'sync-metadata': {
    key: string; // Tipo de entidad
    value: SyncMetadata;
    indexes: {
      'by-last-sync': number;
    };
  };
}

/**
 * Instancia singleton de la base de datos
 */
let dbInstance: IDBPDatabase<AppCopioDBSchema> | null = null;

/**
 * Inicializa y retorna la instancia de IndexedDB
 */
export async function getDB(): Promise<IDBPDatabase<AppCopioDBSchema>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<AppCopioDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`[OfflineDB] Actualizando DB de versión ${oldVersion} a ${newVersion}`);

      // Crear store para cache de API
      if (!db.objectStoreNames.contains('api-cache')) {
        const apiCacheStore = db.createObjectStore('api-cache', { keyPath: 'url' });
        apiCacheStore.createIndex('by-timestamp', 'timestamp');
        apiCacheStore.createIndex('by-url', 'url');
      }

      // Crear store para cola de mutaciones
      if (!db.objectStoreNames.contains('mutation-queue')) {
        const mutationStore = db.createObjectStore('mutation-queue', { keyPath: 'id' });
        mutationStore.createIndex('by-timestamp', 'timestamp');
        mutationStore.createIndex('by-status', 'status');
        mutationStore.createIndex('by-entity-type', 'entityType');
      }

      // Crear store para metadatos de sincronización
      if (!db.objectStoreNames.contains('sync-metadata')) {
        const metadataStore = db.createObjectStore('sync-metadata', { keyPath: 'entityType' });
        metadataStore.createIndex('by-last-sync', 'lastSync');
      }
    },

    blocked() {
      console.warn('[OfflineDB] Base de datos bloqueada por otra pestaña');
    },

    blocking() {
      console.warn('[OfflineDB] Esta pestaña está bloqueando una actualización de DB');
    },

    terminated() {
      console.error('[OfflineDB] Conexión a la base de datos terminada inesperadamente');
      dbInstance = null;
    },
  });

  console.log('[OfflineDB] Base de datos inicializada correctamente');
  return dbInstance;
}

/**
 * Cierra la conexión a la base de datos
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('[OfflineDB] Conexión cerrada');
  }
}

// ====================================================================
// OPERACIONES SOBRE API-CACHE
// ====================================================================

/**
 * Guarda una response en cache
 */
export async function cacheResponse(response: CachedResponse): Promise<void> {
  const db = await getDB();
  await db.put('api-cache', response);
}

/**
 * Obtiene una response del cache por URL
 */
export async function getCachedResponse(url: string): Promise<CachedResponse | undefined> {
  const db = await getDB();
  return db.get('api-cache', url);
}

/**
 * Elimina una response específica del cache
 */
export async function deleteCachedResponse(url: string): Promise<void> {
  const db = await getDB();
  await db.delete('api-cache', url);
}

/**
 * Invalida cache que coincida con un patrón de URL
 */
export async function invalidateCache(pattern: RegExp): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('api-cache', 'readwrite');
  const store = tx.objectStore('api-cache');
  const allKeys = await store.getAllKeys();
  
  let deletedCount = 0;
  for (const key of allKeys) {
    if (pattern.test(key)) {
      await store.delete(key);
      deletedCount++;
    }
  }
  
  await tx.done;
  console.log(`[OfflineDB] Invalidadas ${deletedCount} entradas de cache`);
  return deletedCount;
}

/**
 * Limpia cache expirado (más antiguo que maxAge milisegundos)
 */
export async function cleanExpiredCache(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('api-cache', 'readwrite');
  const store = tx.objectStore('api-cache');
  const index = store.index('by-timestamp');
  
  const cutoffTime = Date.now() - maxAge;
  const allEntries = await index.getAll();
  
  let deletedCount = 0;
  for (const entry of allEntries) {
    if (entry.timestamp < cutoffTime || (entry.expiresAt && entry.expiresAt < Date.now())) {
      await store.delete(entry.url);
      deletedCount++;
    }
  }
  
  await tx.done;
  console.log(`[OfflineDB] Limpiadas ${deletedCount} entradas de cache expirado`);
  return deletedCount;
}

/**
 * Obtiene todas las URLs cacheadas
 */
export async function getAllCachedUrls(): Promise<string[]> {
  const db = await getDB();
  return db.getAllKeys('api-cache');
}

// ====================================================================
// OPERACIONES SOBRE MUTATION-QUEUE
// ====================================================================

/**
 * Agrega una mutación a la cola
 */
export async function enqueueMutation(mutation: MutationQueueItem): Promise<void> {
  const db = await getDB();
  await db.put('mutation-queue', mutation);
  console.log(`[OfflineDB] Mutación encolada: ${mutation.method} ${mutation.url}`);
}

/**
 * Obtiene todas las mutaciones pendientes ordenadas por timestamp
 */
export async function getPendingMutations(): Promise<MutationQueueItem[]> {
  const db = await getDB();
  const tx = db.transaction('mutation-queue', 'readonly');
  const store = tx.objectStore('mutation-queue');
  const index = store.index('by-timestamp');
  
  const mutations = await index.getAll();
  
  // Filtrar solo las que están pendientes o con error (no success)
  return mutations.filter(m => m.status === 'pending' || m.status === 'error');
}

/**
 * Obtiene una mutación específica por ID
 */
export async function getMutation(id: string): Promise<MutationQueueItem | undefined> {
  const db = await getDB();
  return db.get('mutation-queue', id);
}

/**
 * Actualiza el estado de una mutación
 */
export async function updateMutation(mutation: MutationQueueItem): Promise<void> {
  const db = await getDB();
  await db.put('mutation-queue', mutation);
}

/**
 * Elimina una mutación de la cola
 */
export async function deleteMutation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('mutation-queue', id);
}

/**
 * Elimina todas las mutaciones exitosas (limpieza)
 */
export async function cleanSuccessfulMutations(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('mutation-queue', 'readwrite');
  const store = tx.objectStore('mutation-queue');
  const index = store.index('by-status');
  
  const successMutations = await index.getAll('success');
  
  for (const mutation of successMutations) {
    await store.delete(mutation.id);
  }
  
  await tx.done;
  console.log(`[OfflineDB] Limpiadas ${successMutations.length} mutaciones exitosas`);
  return successMutations.length;
}

/**
 * Cuenta el número de mutaciones pendientes
 */
export async function countPendingMutations(): Promise<number> {
  const db = await getDB();
  const mutations = await getPendingMutations();
  return mutations.length;
}

/**
 * Obtiene mutaciones por tipo de entidad
 */
export async function getMutationsByEntity(entityType: string): Promise<MutationQueueItem[]> {
  const db = await getDB();
  const tx = db.transaction('mutation-queue', 'readonly');
  const store = tx.objectStore('mutation-queue');
  const index = store.index('by-entity-type');
  
  return index.getAll(entityType);
}

// ====================================================================
// OPERACIONES SOBRE SYNC-METADATA
// ====================================================================

/**
 * Actualiza metadatos de sincronización para un tipo de entidad
 */
export async function updateSyncMetadata(metadata: SyncMetadata): Promise<void> {
  const db = await getDB();
  await db.put('sync-metadata', metadata);
}

/**
 * Obtiene metadatos de sincronización para un tipo de entidad
 */
export async function getSyncMetadata(entityType: string): Promise<SyncMetadata | undefined> {
  const db = await getDB();
  return db.get('sync-metadata', entityType);
}

/**
 * Obtiene todos los metadatos de sincronización
 */
export async function getAllSyncMetadata(): Promise<SyncMetadata[]> {
  const db = await getDB();
  return db.getAll('sync-metadata');
}

/**
 * Elimina metadatos de sincronización
 */
export async function deleteSyncMetadata(entityType: string): Promise<void> {
  const db = await getDB();
  await db.delete('sync-metadata', entityType);
}

// ====================================================================
// UTILIDADES Y MANTENIMIENTO
// ====================================================================

/**
 * Obtiene estadísticas del uso de IndexedDB
 */
export async function getDBStats() {
  const db = await getDB();
  
  const cacheCount = await db.count('api-cache');
  const mutationCount = await db.count('mutation-queue');
  const metadataCount = await db.count('sync-metadata');
  const pendingCount = await countPendingMutations();
  
  return {
    cacheEntries: cacheCount,
    totalMutations: mutationCount,
    pendingMutations: pendingCount,
    metadataEntries: metadataCount,
  };
}

/**
 * Limpia toda la base de datos (útil para reset/debugging)
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  
  const tx = db.transaction(['api-cache', 'mutation-queue', 'sync-metadata'], 'readwrite');
  
  await Promise.all([
    tx.objectStore('api-cache').clear(),
    tx.objectStore('mutation-queue').clear(),
    tx.objectStore('sync-metadata').clear(),
  ]);
  
  await tx.done;
  console.log('[OfflineDB] Toda la base de datos ha sido limpiada');
}

/**
 * Exporta toda la base de datos (para debugging/backup)
 */
export async function exportDB() {
  const db = await getDB();
  
  const cache = await db.getAll('api-cache');
  const mutations = await db.getAll('mutation-queue');
  const metadata = await db.getAll('sync-metadata');
  
  return {
    version: DB_VERSION,
    timestamp: Date.now(),
    cache,
    mutations,
    metadata,
  };
}

// ====================================================================
// FUNCIONES ADICIONALES PARA FASE 2
// ====================================================================

/**
 * Marca una mutación como exitosa (la elimina de la cola)
 * 
 * @param id - ID de la mutación
 */
export async function markMutationAsSuccess(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('mutation-queue', id);
  console.log(`[OfflineDB] Mutación ${id} marcada como exitosa y eliminada`);
}

/**
 * Incrementa el contador de reintentos de una mutación
 * 
 * @param id - ID de la mutación
 */
export async function incrementRetryCount(id: string): Promise<void> {
  const db = await getDB();
  const mutation = await db.get('mutation-queue', id);
  
  if (mutation) {
    mutation.retries = (mutation.retries || 0) + 1;
    mutation.retryCount = (mutation.retryCount || 0) + 1; // Fase 3
    mutation.status = 'error';
    mutation.error = `Reintento #${mutation.retries}`;
    
    await db.put('mutation-queue', mutation);
    console.log(`[OfflineDB] Mutación ${id} incrementada a ${mutation.retries} reintentos`);
  }
}

// ====================================================================
// FUNCIONES ADICIONALES PARA FASE 3: SINCRONIZACIÓN INTELIGENTE
// ====================================================================

/**
 * Obtiene todas las mutaciones listas para sincronizar
 * (pendientes y con errores que pueden reintentarse)
 */
export async function getMutationsToSync(): Promise<MutationQueueItem[]> {
  const db = await getDB();
  const allMutations = await db.getAll('mutation-queue');
  
  // Filtrar solo las que pueden sincronizarse
  return allMutations.filter(mutation => {
    // Solo pendientes y errores recuperables
    if (mutation.status === 'pending') return true;
    
    // Para errores, verificar que no hayan superado el máximo de reintentos
    if (mutation.status === 'error') {
      const maxRetries = 5; // Debería coincidir con DEFAULT_SYNC_OPTIONS.maxRetries
      const currentRetries = mutation.retryCount || mutation.retries || 0;
      return currentRetries < maxRetries;
    }
    
    return false;
  });
}

/**
 * Marca una mutación como fallida permanentemente y la ELIMINA de la cola
 * Los errores irrecuperables (404, 400, etc.) no deben bloquear la cola
 * 
 * @param id - ID de la mutación
 * @param errorMessage - Mensaje de error
 */
export async function markMutationAsFailed(id: string, errorMessage: string): Promise<void> {
  const db = await getDB();
  
  // ELIMINAR la mutación en lugar de marcarla como error
  // Los errores irrecuperables no deben quedarse en la cola
  await db.delete('mutation-queue', id);
  
  console.log(`[OfflineDB] Mutación ${id} eliminada por error irrecuperable: ${errorMessage}`);
  
  // Opcionalmente, guardar en un log de errores para debugging
  await saveFailedMutationLog(id, errorMessage);
}

/**
 * Guarda un log de mutaciones fallidas para debugging (opcional)
 */
async function saveFailedMutationLog(mutationId: string, errorMessage: string): Promise<void> {
  try {
    const db = await getDB();
    const logEntry = {
      id: `failed-${mutationId}-${Date.now()}`,
      mutationId,
      errorMessage,
      timestamp: Date.now()
    };
    
    await db.put('sync-metadata', logEntry as any);
  } catch (error) {
    // No bloquear si falla el log
    console.warn('[OfflineDB] No se pudo guardar log de mutación fallida:', error);
  }
}

// ====================================================================
// FUNCIONES DE LIMPIEZA Y RECUPERACIÓN
// ====================================================================

/**
 * Limpia mutaciones que han superado el máximo de reintentos
 * Útil para resolver colas bloqueadas
 */
export async function cleanStuckMutations(maxRetries: number = 5): Promise<number> {
  const db = await getDB();
  const allMutations = await db.getAll('mutation-queue');
  
  let cleanedCount = 0;
  
  for (const mutation of allMutations) {
    const retryCount = mutation.retryCount || mutation.retries || 0;
    
    // Si ha superado el máximo de reintentos, eliminarla
    if (retryCount >= maxRetries) {
      await db.delete('mutation-queue', mutation.id);
      cleanedCount++;
      
      console.log(`[OfflineDB] 🧹 Limpiada mutación bloqueada: ${mutation.method} ${mutation.url} (${retryCount} reintentos)`);
      
      // Guardar log para debugging
      await saveFailedMutationLog(mutation.id, `Limpiada automáticamente tras ${retryCount} reintentos`);
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[OfflineDB] ✅ Limpiadas ${cleanedCount} mutaciones bloqueadas`);
  }
  
  return cleanedCount;
}

/**
 * Obtiene mutaciones que están causando problemas (muchos reintentos)
 */
export async function getProblematicMutations(): Promise<MutationQueueItem[]> {
  const db = await getDB();
  const allMutations = await db.getAll('mutation-queue');
  
  return allMutations.filter(mutation => {
    const retryCount = mutation.retryCount || mutation.retries || 0;
    return retryCount >= 3; // Mutaciones con 3+ reintentos son problemáticas
  });
}

/**
 * Fuerza la eliminación de una mutación específica (para casos extremos)
 */
export async function forceMutationRemoval(mutationId: string, reason: string = 'Eliminación forzada por admin'): Promise<boolean> {
  const db = await getDB();
  
  try {
    await db.delete('mutation-queue', mutationId);
    await saveFailedMutationLog(mutationId, reason);
    
    console.log(`[OfflineDB] 🔨 Mutación ${mutationId} eliminada forzadamente: ${reason}`);
    return true;
  } catch (error) {
    console.error(`[OfflineDB] Error eliminando mutación ${mutationId}:`, error);
    return false;
  }
}
