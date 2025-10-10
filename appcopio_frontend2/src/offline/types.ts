// src/offline/types.ts
// Tipos TypeScript para funcionalidad offline

/**
 * Estados posibles de una mutación en la cola
 */
export type MutationStatus = 'pending' | 'syncing' | 'success' | 'error' | 'conflict';

/**
 * Métodos HTTP para mutaciones
 */
export type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Item en la cola de mutaciones pendientes
 */
export interface MutationQueueItem {
  id: string; // UUID único
  url: string; // URL completa del endpoint
  method: HttpMethod;
  data?: any; // Payload del request
  headers?: Record<string, string>;
  timestamp: number; // Timestamp de creación
  retryCount: number; // Número de intentos de sincronización
  status: MutationStatus;
  error?: string; // Mensaje de error si falló
  optimisticId?: string; // ID temporal para actualizaciones optimistas
  entityType?: string; // Tipo de entidad (centers, inventory, etc.)
  entityId?: string; // ID de la entidad afectada
}

/**
 * Response cacheada de un GET request
 */
export interface CachedResponse {
  url: string; // URL del request
  data: any; // Response data
  timestamp: number; // Timestamp del cache
  etag?: string; // ETag para validación
  expiresAt?: number; // Timestamp de expiración
  headers?: Record<string, string>;
}

/**
 * Metadatos de sincronización por tipo de entidad
 */
export interface SyncMetadata {
  entityType: string; // Tipo de entidad (centers, users, inventory, etc.)
  lastSync: number; // Timestamp de última sincronización exitosa
  lastAttempt?: number; // Timestamp del último intento (exitoso o no)
  version?: number; // Versión del schema/data
  pendingCount?: number; // Número de operaciones pendientes para esta entidad
}

/**
 * Wrapper para datos almacenados en sync-metadata store
 */
export interface SyncMetadataWrapper {
  id: string; // Identificador único (ej: 'sync-metrics', 'centers', etc.)
  data: SyncMetadata | SyncMetrics | any; // Datos específicos
  timestamp: number; // Timestamp de última actualización
}

/**
 * Configuración de estrategia de cache por endpoint
 */
export interface CacheStrategy {
  pattern: RegExp; // Patrón de URL
  strategy: 'NetworkOnly' | 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate';
  ttl?: number; // Time to live en milisegundos
  maxAge?: number; // Edad máxima del cache en milisegundos
}

/**
 * Conflicto detectado durante sincronización
 */
export interface SyncConflict {
  mutationId: string; // ID de la mutación que causó conflicto
  entityType: string;
  entityId: string;
  localVersion: any; // Versión local (lo que intentamos sincronizar)
  remoteVersion: any; // Versión remota actual (lo que está en el servidor)
  timestamp: number;
  error?: any; // Error que causó el conflicto (Fase 3)
}

/**
 * Resultado de una operación de sincronización
 */
export interface SyncResult {
  success: number; // Número de operaciones sincronizadas exitosamente
  failed: number; // Número de operaciones que fallaron
  conflicts: SyncConflict[]; // Conflictos detectados
  total: number; // Total de operaciones procesadas
  duration: number; // Duración de la sincronización en ms
  metrics?: SyncMetrics; // Métricas actualizadas
}

/**
 * Estado global del sistema offline
 */
export interface OfflineState {
  isOnline: boolean; // Estado de conectividad
  isSyncing: boolean; // Si está sincronizando ahora
  pendingCount: number; // Número total de mutaciones pendientes
  lastSync?: number; // Timestamp de última sincronización exitosa
  conflicts: SyncConflict[]; // Conflictos sin resolver
}

/**
 * Opciones para configurar comportamiento offline de una operación
 */
export interface OfflineOptions {
  optimistic?: boolean; // Si debe hacer update optimista en UI
  retryCount?: number; // Número máximo de reintentos
  priority?: 'high' | 'normal' | 'low'; // Prioridad en la cola
  skipQueue?: boolean; // Si debe fallar inmediatamente cuando offline (para operaciones críticas)
  entityType?: string; // Tipo de entidad para tracking
  entityId?: string; // ID de entidad para tracking
}

// =====================================================
// TIPOS PARA FASE 3: SINCRONIZACIÓN INTELIGENTE
// =====================================================

/**
 * Opciones de configuración para sincronización inteligente
 */
export interface SyncOptions {
  maxRetries: number; // Máximo número de reintentos
  baseDelay: number; // Delay inicial en ms
  backoffMultiplier: number; // Factor de multiplicación para backoff exponencial
  maxDelay: number; // Delay máximo entre reintentos
  conflictStrategy: 'manual' | 'last-write-wins' | 'merge' | 'remote-wins';
  batchSize: number; // Número máximo de mutaciones por lote
  priorityWeights: {
    critical: number;
    high: number;
    normal: number;
    low: number;
  };
}

/**
 * Métricas de rendimiento del sistema de sincronización
 */
export interface SyncMetrics {
  totalSyncs: number; // Total de sincronizaciones ejecutadas
  totalSuccessful: number; // Total de mutaciones sincronizadas exitosamente
  totalFailed: number; // Total de mutaciones fallidas
  totalConflicts: number; // Total de conflictos detectados
  averageDuration: number; // Duración promedio de sincronización en ms
  lastSyncTime: number; // Timestamp de última sincronización
  successRate: number; // Porcentaje de éxito (0-100)
}
