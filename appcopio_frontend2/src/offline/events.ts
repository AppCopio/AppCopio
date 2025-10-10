/**
 * Sistema de eventos para notificaciones offline
 * Permite comunicar entre el interceptor y los componentes React
 */

// =====================================================
// TIPOS DE EVENTOS
// =====================================================

export interface OfflineEvent {
  type: 'mutation_queued' | 'sync_completed' | 'sync_failed' | 'cache_hit';
  data: any;
  timestamp: number;
}

export interface MutationQueuedEvent {
  type: 'mutation_queued';
  data: {
    method: string;
    url: string;
    entityType?: string;
    operation: string; // 'creación', 'edición', 'eliminación'
  };
  timestamp: number;
}

export interface SyncCompletedEvent {
  type: 'sync_completed';
  data: {
    success: number;
    failed: number;
    total: number;
  };
  timestamp: number;
}

// =====================================================
// EVENT EMITTER
// =====================================================

class OfflineEventEmitter {
  private listeners: Map<string, Array<(event: OfflineEvent) => void>> = new Map();

  /**
   * Suscribirse a eventos offline
   */
  on(eventType: string, callback: (event: OfflineEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType)!.push(callback);
    
    // Retornar función de cleanup
    return () => {
      const callbacks = this.listeners.get(eventType) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emitir un evento
   */
  emit(event: OfflineEvent): void {
    const callbacks = this.listeners.get(event.type) || [];
    callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[OfflineEvents] Error en callback:', error);
      }
    });
  }

  /**
   * Remover todos los listeners
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }
}

// =====================================================
// INSTANCIA SINGLETON
// =====================================================

export const offlineEventEmitter = new OfflineEventEmitter();

// =====================================================
// HELPERS PARA EMITIR EVENTOS COMUNES
// =====================================================

/**
 * Emite evento cuando se encola una mutación
 */
export function emitMutationQueued(method: string, url: string, data?: any): void {
  // Determinar tipo de operación
  let operation = 'operación';
  switch (method.toUpperCase()) {
    case 'POST': operation = 'creación'; break;
    case 'PUT': 
    case 'PATCH': operation = 'edición'; break;
    case 'DELETE': operation = 'eliminación'; break;
  }

  // Extraer tipo de entidad de la URL
  const entityType = extractEntityTypeFromUrl(url);

  const event: MutationQueuedEvent = {
    type: 'mutation_queued',
    data: {
      method: method.toUpperCase(),
      url,
      entityType,
      operation
    },
    timestamp: Date.now()
  };

  offlineEventEmitter.emit(event);
}

/**
 * Emite evento cuando se completa sincronización
 */
export function emitSyncCompleted(success: number, failed: number, total: number): void {
  const event: SyncCompletedEvent = {
    type: 'sync_completed',
    data: { success, failed, total },
    timestamp: Date.now()
  };

  offlineEventEmitter.emit(event);
}

/**
 * Emite evento cuando falla sincronización
 */
export function emitSyncFailed(error: any): void {
  const event: OfflineEvent = {
    type: 'sync_failed',
    data: { error: error.message || 'Error desconocido' },
    timestamp: Date.now()
  };

  offlineEventEmitter.emit(event);
}

// =====================================================
// UTILIDADES
// =====================================================

/**
 * Extrae el tipo de entidad de una URL
 */
function extractEntityTypeFromUrl(url: string): string | undefined {
  // Patrones comunes en URLs REST
  const patterns = [
    /\/api\/([^\/\?]+)/i, // /api/centers, /api/users
    /\/([^\/\?]+)\/\d+/i, // /centers/123, /users/456
    /\/([^\/\?]+)$/i,     // /centers, /users
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      // Normalizar nombres comunes
      const entityType = match[1].toLowerCase();
      
      // Mapear plurales a singulares
      const entityMap: Record<string, string> = {
        'centers': 'center',
        'users': 'user',
        'families': 'family',
        'persons': 'person',
        'inventories': 'inventory',
        'notifications': 'notification',
        'databases': 'database',
        'fields': 'field',
        'templates': 'template'
      };

      return entityMap[entityType] || entityType;
    }
  }

  return undefined;
}