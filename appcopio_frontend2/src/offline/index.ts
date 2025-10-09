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

// Interceptor
export { setupOfflineInterceptor } from './interceptor';

// Configuración
export { getTTLForEndpoint, shouldCacheEndpoint } from './config';

// Sincronización consolidada
export {
  addMutationToQueue,
  processQueue,
  performIntelligentSync,
  getQueueStatus,
  startBackgroundSync,
  stopBackgroundSync,
  cleanOldSuccessfulMutations,
} from './offline-sync';

// Utilidades core
export {
  tryRefreshToken,
  clearAuthTokens,
  handle401Error,
  executeWithTokenRefresh,
  generateUUID,
  isOnline
} from './offline-core';

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
