// src/offline/config.ts
// Configuración centralizada del sistema offline

// =====================================================
// CONFIGURACIÓN DE CACHE
// =====================================================

/**
 * TTL (tiempo de vida) del cache por endpoint en segundos
 */
export const CACHE_TTL_CONFIG = {
  // Auth → NUNCA cachear (seguridad)
  auth: 0,
  
  // Tiempo real → TTL corto
  notifications: 30,        // 30 segundos
  inventory: 60,           // 1 minuto
  
  // Datos dinámicos → TTL medio
  centers: 300,            // 5 minutos
  family: 300,             // 5 minutos  
  persons: 300,            // 5 minutos
  databases: 600,          // 10 minutos
  
  // Datos semi-estáticos → TTL largo
  users: 900,              // 15 minutos
  fields: 900,             // 15 minutos
  templates: 900,          // 15 minutos
  
  // Datos estáticos → TTL muy largo
  categories: 3600,        // 1 hora
  roles: 3600,             // 1 hora
  zones: 3600,             // 1 hora
  
  // Default para endpoints no especificados
  default: 300             // 5 minutos
} as const;

/**
 * Determina el TTL para un endpoint específico
 */
export function getTTLForEndpoint(url: string | undefined): number {
  if (!url) return CACHE_TTL_CONFIG.default;

  // Auth → nunca cachear
  if (url.includes('/auth')) return CACHE_TTL_CONFIG.auth;
  
  // Buscar por patrón de URL
  for (const [key, ttl] of Object.entries(CACHE_TTL_CONFIG)) {
    if (key !== 'default' && url.includes(`/${key}`)) {
      return ttl;
    }
  }
  
  return CACHE_TTL_CONFIG.default;
}

/**
 * Determina si un endpoint debe ser cacheado
 */
export function shouldCacheEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  // Solo no cachear auth, todo lo demás sí
  return !url.includes('/auth');
}

// =====================================================
// CONFIGURACIÓN DE SINCRONIZACIÓN
// =====================================================

export const SYNC_CONFIG = {
  // Configuración de reintentos
  maxRetries: 5,
  baseDelay: 1000,         // 1 segundo inicial
  backoffMultiplier: 2,    // Duplicar cada vez: 1s, 2s, 4s, 8s, 16s
  maxDelay: 30000,         // Max 30 segundos entre reintentos
  batchSize: 10,           // Procesar max 10 operaciones por lote
  
  // Estrategia de resolución de conflictos
  conflictStrategy: 'last-write-wins' as const,
  
  // Pesos de prioridad
  priorityWeights: {
    critical: 100,
    high: 50,
    normal: 10,
    low: 1
  }
} as const;

// =====================================================
// CONFIGURACIÓN DE BACKGROUND SYNC
// =====================================================

export const BACKGROUND_SYNC_CONFIG = {
  // Intervalo base de sincronización
  baseInterval: 30000,      // 30 segundos
  maxInterval: 300000,      // 5 minutos máximo
  
  // Factores de ajuste
  batteryLowThreshold: 0.2, // 20% batería considerado "bajo"
  slowConnectionThreshold: 1000, // >1s = conexión lenta
  
  // Multiplicadores de intervalo
  batteryLowMultiplier: 3,  // 3x más lento con batería baja
  slowConnectionMultiplier: 2, // 2x más lento con conexión lenta
  offlineMultiplier: 0.5,   // 0.5x más rápido al reconectar
  
  // Configuración de retry
  maxConsecutiveFailures: 3, // Parar después de 3 fallos consecutivos
  pauseAfterFailures: 60000  // Pausar 1 minuto después de fallos
} as const;

// =====================================================
// CONFIGURACIÓN DE PRIORIZACIÓN
// =====================================================

/**
 * Determina la prioridad de una mutación según su tipo
 */
export function getMutationPriority(
  method: string, 
  url: string, 
  entityType?: string
): 'critical' | 'high' | 'normal' | 'low' {
  
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

// =====================================================
// CONFIGURACIÓN DE BASE DE DATOS
// =====================================================

export const DB_CONFIG = {
  name: 'appcopio-offline-db',
  version: 1,
  
  // Límites de almacenamiento
  maxCacheItems: 1000,      // Max items en cache
  maxMutationItems: 500,    // Max mutaciones en cola
  
  // Limpieza automática
  cleanupInterval: 3600000, // 1 hora
  cacheExpiryBuffer: 300000 // 5 minutos de buffer para expiración
} as const;