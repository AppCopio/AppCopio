// src/offline/OfflineContext.tsx
// Context de React para gestionar estado offline y sincronización

import * as React from 'react';
import { 
  getDB, 
  countPendingMutations, 
  getPendingMutations,
  cleanExpiredCache,
  getDBStats 
} from './db';
import { processQueue } from './queue';
import type { OfflineState, SyncConflict } from './types';

/**
 * Tipo del contexto
 */
interface OfflineContextType extends OfflineState {
  // Métodos para interactuar con el sistema offline
  refreshPendingCount: () => Promise<void>;
  triggerSync: () => Promise<void>;
  clearConflict: (mutationId: string) => void;
  getStats: () => Promise<any>;
}

/**
 * Context con valores por defecto
 */
const OfflineContext = React.createContext<OfflineContextType | null>(null);

/**
 * Props del provider
 */
interface OfflineProviderProps {
  children: React.ReactNode;
}

/**
 * Provider del contexto offline
 */
export function OfflineProvider({ children }: OfflineProviderProps) {
  // Estado de conectividad (usa navigator.onLine)
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine);
  
  // Estado de sincronización
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  
  // Número de mutaciones pendientes
  const [pendingCount, setPendingCount] = React.useState<number>(0);
  
  // Timestamp de última sincronización exitosa
  const [lastSync, setLastSync] = React.useState<number | undefined>(undefined);
  
  // Conflictos detectados
  const [conflicts, setConflicts] = React.useState<SyncConflict[]>([]);

  /**
   * Inicializa IndexedDB y cuenta pendientes al montar
   */
  React.useEffect(() => {
    async function init() {
      try {
        // Inicializar DB
        await getDB();
        console.log('[OfflineContext] IndexedDB inicializada');
        
        // Contar pendientes
        const count = await countPendingMutations();
        setPendingCount(count);
        
        // Limpiar cache expirado (más de 24 horas)
        await cleanExpiredCache(24 * 60 * 60 * 1000);
        
        console.log(`[OfflineContext] ${count} mutaciones pendientes encontradas`);
      } catch (error) {
        console.error('[OfflineContext] Error inicializando offline system:', error);
      }
    }

    init();
  }, []);

  /**
   * Escucha eventos de conectividad del navegador
   */
  React.useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineContext] Conexión restaurada');
      setIsOnline(true);
      
      // Intentar sincronizar automáticamente al recuperar conexión
      triggerSync();
    };

    const handleOffline = () => {
      console.log('[OfflineContext] Conexión perdida');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Refresca el contador de operaciones pendientes
   */
  const refreshPendingCount = React.useCallback(async () => {
    try {
      const count = await countPendingMutations();
      setPendingCount(count);
    } catch (error) {
      console.error('[OfflineContext] Error refreshing pending count:', error);
    }
  }, []);

  /**
   * Trigger manual de sincronización
   * Procesa todas las mutaciones pendientes usando la cola
   */
  const triggerSync = React.useCallback(async () => {
    if (isSyncing) {
      console.log('[OfflineContext] Sincronización ya en progreso');
      return;
    }

    if (!isOnline) {
      console.log('[OfflineContext] No se puede sincronizar sin conexión');
      return;
    }

    try {
      setIsSyncing(true);
      console.log('[OfflineContext] 🔄 Iniciando sincronización...');

      // Procesar cola usando queue.ts (FASE 2)
      const result = await processQueue();
      
      console.log('[OfflineContext] ✅ Sincronización completada:', {
        exitosas: result.success,
        fallidas: result.failed,
        conflictos: result.conflicts.length,
        total: result.total,
      });

      // Actualizar conflictos si hay
      if (result.conflicts.length > 0) {
        const newConflicts: SyncConflict[] = result.conflicts.map(c => ({
          mutationId: c.mutation.id,
          entityType: c.mutation.entityType || 'unknown',
          entityId: c.mutation.entityId || 'unknown',
          localVersion: c.mutation.data,
          remoteVersion: c.error.response?.data,
          timestamp: Date.now(),
        }));
        
        setConflicts(prev => [...prev, ...newConflicts]);
        console.warn(`[OfflineContext] ⚠️ ${result.conflicts.length} conflictos detectados`);
      }

      // Actualizar contador de pendientes
      await refreshPendingCount();
      
      // Actualizar timestamp de última sync exitosa
      if (result.success > 0) {
        setLastSync(Date.now());
      }
      
    } catch (error) {
      console.error('[OfflineContext] ❌ Error durante sincronización:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, refreshPendingCount]);

  /**
   * Limpia un conflicto específico de la lista
   */
  const clearConflict = React.useCallback((mutationId: string) => {
    setConflicts(prev => prev.filter(c => c.mutationId !== mutationId));
  }, []);

  /**
   * Obtiene estadísticas del sistema offline
   */
  const getStats = React.useCallback(async () => {
    try {
      return await getDBStats();
    } catch (error) {
      console.error('[OfflineContext] Error getting stats:', error);
      return null;
    }
  }, []);

  /**
   * Valor del contexto
   */
  const value: OfflineContextType = {
    isOnline,
    isSyncing,
    pendingCount,
    lastSync,
    conflicts,
    refreshPendingCount,
    triggerSync,
    clearConflict,
    getStats,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

/**
 * Hook para usar el contexto offline
 */
export function useOffline(): OfflineContextType {
  const context = React.useContext(OfflineContext);
  
  if (!context) {
    throw new Error('useOffline debe usarse dentro de <OfflineProvider>');
  }
  
  return context;
}

/**
 * Hook para solo obtener el estado de conectividad
 */
export function useIsOnline(): boolean {
  const { isOnline } = useOffline();
  return isOnline;
}

/**
 * Hook para obtener el número de operaciones pendientes
 */
export function usePendingCount(): number {
  const { pendingCount } = useOffline();
  return pendingCount;
}
