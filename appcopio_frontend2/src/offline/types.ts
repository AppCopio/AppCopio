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
  retries: number; // Número de intentos de sincronización
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
}

/**
 * Resultado de una operación de sincronización
 */
export interface SyncResult {
  success: boolean;
  synced: number; // Número de operaciones sincronizadas exitosamente
  failed: number; // Número de operaciones que fallaron
  conflicts: SyncConflict[]; // Conflictos detectados
  errors: Array<{ mutationId: string; error: string }>;
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
