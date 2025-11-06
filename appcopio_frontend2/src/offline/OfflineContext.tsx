// src/offline/OfflineContext.tsx
// Context de React para gestionar estado offline y sincronización

import * as React from 'react';
import { 
  getDB, 
  countPendingMutations, 
  getPendingMutations,
  cleanExpiredCache,
  getDBStats,
  cleanStuckMutations
} from './db';
import { 
  performIntelligentSync, 
  startBackgroundSync, 
  stopBackgroundSync 
} from './offline-sync';
import { emitSyncCompleted, emitSyncFailed } from './events';
import { 
  getConnectivityMonitor, 
  startConnectivityMonitoring, 
  stopConnectivityMonitoring,
  ConnectivityStatus
} from './connectivity-monitor';
import { isSystemOffline, isSystemOnline } from './connectivity-state';
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
  // Nuevos: estado de conectividad detallado
  connectivityStatus: ConnectivityStatus;
  forceConnectivityCheck: () => Promise<ConnectivityStatus>;
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
  // Estado de conectividad detallado (del monitor)
  const [connectivityStatus, setConnectivityStatus] = React.useState<ConnectivityStatus>(
    ConnectivityStatus.ONLINE
  );
  
  // Estado de conectividad simple (isOnline combina ONLINE y SLOW)
  const [isOnline, setIsOnline] = React.useState<boolean>(true);
  
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
        
        // Limpiar mutaciones bloqueadas al iniciar (SOLUCIÓN AL BUG)
        const cleanedCount = await cleanStuckMutations(5);
        if (cleanedCount > 0) {
          console.log(`[OfflineContext] 🧹 Limpiadas ${cleanedCount} mutaciones bloqueadas al iniciar`);
        }
        
        // Iniciar background sync automático (FASE 3)
        startBackgroundSync();
        
        // Iniciar monitoreo activo de conectividad (NUEVO)
        startConnectivityMonitoring({
          // Configuración personalizada
          pingUrl: '/api/ping', // Asegúrate de tener este endpoint en tu backend
          checkInterval: 10000,  // Check cada 10s
          slowThreshold: 2000,   // >2s = lento
          offlineThreshold: 5000, // >5s = offline
          maxFailedAttempts: 2   // 2 fallos = offline
        });
        
        // Suscribirse a cambios de conectividad
        const monitor = getConnectivityMonitor();
        const unsubscribe = monitor.subscribe((status) => {
          setConnectivityStatus(status);
          // Actualizar isOnline usando detección DUAL
          setIsOnline(isSystemOnline());
          
          // Si recuperamos conexión, intentar sync automático
          if (isSystemOnline() && pendingCount > 0) {
            console.log('[OfflineContext] 🔄 Conexión recuperada, iniciando sync automático');
            triggerSync();
          }
        });
        
        // Recontear pendientes después de la limpieza
        const finalCount = await countPendingMutations();
        setPendingCount(finalCount);
        
        console.log(`[OfflineContext] ${finalCount} mutaciones pendientes encontradas (${cleanedCount} limpiadas)`);
        console.log('[OfflineContext] 🚀 Background sync y connectivity monitor iniciados');
        
        // Cleanup
        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('[OfflineContext] Error inicializando offline system:', error);
      }
    }

    init();
    
    // Cleanup al desmontar
    return () => {
      stopBackgroundSync();
      stopConnectivityMonitoring();
    };
  }, []);

  /**
   * Escucha eventos del navegador (para DevTools F12 Network → Offline)
   * Esto detecta cambios instantáneos cuando se activa el modo offline en DevTools
   */
  React.useEffect(() => {
    const handleNavigatorOnline = () => {
      console.log('[OfflineContext] 📡 Evento navigator: online (DevTools)');
      // Actualizar estado usando detección dual
      setIsOnline(isSystemOnline());
      
      // Si hay pendientes, intentar sync
      if (isSystemOnline() && pendingCount > 0) {
        console.log('[OfflineContext] 🔄 Conexión DevTools restaurada, iniciando sync');
        triggerSync();
      }
    };

    const handleNavigatorOffline = () => {
      console.log('[OfflineContext] 📡 Evento navigator: offline (DevTools)');
      // Actualizar estado usando detección dual
      setIsOnline(isSystemOnline());
    };

    // Agregar listeners de eventos del navegador
    window.addEventListener('online', handleNavigatorOnline);
    window.addEventListener('offline', handleNavigatorOffline);

    return () => {
      window.removeEventListener('online', handleNavigatorOnline);
      window.removeEventListener('offline', handleNavigatorOffline);
    };
  }, [pendingCount]); // eslint-disable-line react-hooks/exhaustive-deps

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
   * Usa detección DUAL de conectividad
   */
  const triggerSync = React.useCallback(async () => {
    if (isSyncing) {
      console.log('[OfflineContext] Sincronización ya en progreso');
      return;
    }

    // Usar detección DUAL
    if (isSystemOffline()) {
      console.log('[OfflineContext] No se puede sincronizar sin conexión (detección dual)');
      return;
    }

    try {
      setIsSyncing(true);
      console.log('[OfflineContext] 🔄 Iniciando sincronización...');

      // Procesar cola usando sync.ts (FASE 3 - Sincronización Inteligente)
      const result = await performIntelligentSync();
      
      console.log('[OfflineContext] ✅ Sincronización completada:', {
        exitosas: result.success,
        fallidas: result.failed,
        conflictos: result.conflicts.length,
        total: result.total,
      });

      // Actualizar conflictos si hay
      if (result.conflicts.length > 0) {
        // Los conflictos de Fase 3 ya vienen con la estructura correcta
        setConflicts(prev => [...prev, ...result.conflicts]);
        console.warn(`[OfflineContext] ⚠️ ${result.conflicts.length} conflictos detectados`);
      }

      // Limpiar mutaciones bloqueadas después del sync (prevenir acumulación)
      const cleanedAfterSync = await cleanStuckMutations(5);
      if (cleanedAfterSync > 0) {
        console.log(`[OfflineContext] 🧹 Limpiadas ${cleanedAfterSync} mutaciones bloqueadas post-sync`);
      }

      // Actualizar contador de pendientes
      await refreshPendingCount();
      
      // Actualizar timestamp de última sync exitosa
      if (result.success > 0) {
        setLastSync(Date.now());
      }

      // NO emitir evento aquí - ya lo hace performIntelligentSync()
      // Evita duplicación de notificaciones
      
    } catch (error) {
      console.error('[OfflineContext] ❌ Error durante sincronización:', error);
      
      // Emitir evento de error de sincronización
      emitSyncFailed(error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount]); // Removido isOnline porque ahora se calcula con isSystemOffline()

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
   * Fuerza un check de conectividad inmediato
   */
  const forceConnectivityCheck = React.useCallback(async (): Promise<ConnectivityStatus> => {
    const monitor = getConnectivityMonitor();
    return await monitor.forceCheck();
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
    connectivityStatus,
    refreshPendingCount,
    triggerSync,
    clearConflict,
    getStats,
    forceConnectivityCheck
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
