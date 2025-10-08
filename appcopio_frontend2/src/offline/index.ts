// src/offline/index.ts
// Archivo de barril para exportaciones limpias

// Context y hooks
export { 
  OfflineProvider, 
  useOffline, 
  useIsOnline, 
  usePendingCount 
} from './OfflineContext';

// Componentes UI
export { OfflineIndicator } from './components/OfflineIndicator';
export { OfflineDebugPanel } from './components/OfflineDebugPanel';

// Interceptor (FASE 2)
export {
  setupOfflineInterceptor,
  getTTLForEndpoint,
  shouldCacheEndpoint,
} from './interceptor';

// Queue (FASE 2)
export {
  addMutationToQueue,
  processQueue,
  getQueueStatus,
  cleanOldSuccessfulMutations,
} from './queue';

// Tipos de queue (con alias para evitar conflicto)
export type { ConflictInfo } from './queue';

// Funciones de base de datos
export {
  getDB,
  closeDB,
  // Cache
  cacheResponse,
  getCachedResponse,
  deleteCachedResponse,
  invalidateCache,
  cleanExpiredCache,
  getAllCachedUrls,
  // Mutation queue
  enqueueMutation,
  getPendingMutations,
  getMutation,
  updateMutation,
  deleteMutation,
  cleanSuccessfulMutations,
  countPendingMutations,
  getMutationsByEntity,
  // FASE 2
  markMutationAsSuccess,
  incrementRetryCount,
  // Sync metadata
  updateSyncMetadata,
  getSyncMetadata,
  getAllSyncMetadata,
  deleteSyncMetadata,
  // Utilidades
  getDBStats,
  clearAllData,
  exportDB,
} from './db';

// Tipos
export type {
  MutationStatus,
  HttpMethod,
  MutationQueueItem,
  CachedResponse,
  SyncMetadata,
  CacheStrategy,
  SyncConflict,
  SyncResult,
  OfflineState,
  OfflineOptions,
} from './types';
