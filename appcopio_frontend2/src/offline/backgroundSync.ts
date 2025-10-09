/**
 * FASE 3: Background Sync Periódico
 * 
 * Sistema de sincronización automática en segundo plano
 * - Sync automático cada X minutos cuando online
 * - Pausa cuando el usuario está inactivo
 * - Resume cuando vuelve la actividad
 * - Respeta configuración de batería y datos móviles
 */

import { performIntelligentSync } from './sync';

// =====================================================
// CONFIGURACIÓN
// =====================================================

const BACKGROUND_SYNC_CONFIG = {
  intervalMs: 5 * 60 * 1000, // 5 minutos por defecto
  maxIntervalMs: 30 * 60 * 1000, // Max 30 minutos
  inactivityThresholdMs: 60 * 1000, // 1 minuto sin actividad = inactivo
  respectBatteryLevel: true, // No sincronizar si batería < 20%
  respectNetworkType: true, // Reducir frecuencia en datos móviles
};

// =====================================================
// BACKGROUND SYNC MANAGER
// =====================================================

class BackgroundSyncManager {
  private intervalId: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private isUserActive: boolean = true;
  private currentInterval: number = BACKGROUND_SYNC_CONFIG.intervalMs;

  /**
   * Inicia la sincronización periódica en background
   */
  start(): void {
    if (this.intervalId) {
      console.log('[BackgroundSync] Ya está en funcionamiento');
      return;
    }

    console.log('[BackgroundSync] 🚀 Iniciando sync periódico cada', this.currentInterval / 1000, 'segundos');
    
    // Setup listeners de actividad
    this.setupActivityListeners();
    
    // Iniciar intervalo
    this.intervalId = setInterval(() => {
      this.performBackgroundSync();
    }, this.currentInterval);

    // Sync inmediato al iniciar (si está online)
    if (navigator.onLine) {
      setTimeout(() => this.performBackgroundSync(), 1000);
    }
  }

  /**
   * Detiene la sincronización periódica
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[BackgroundSync] 🛑 Sync periódico detenido');
    }
    
    this.removeActivityListeners();
  }

  /**
   * Ejecuta una sincronización en background con validaciones
   */
  private async performBackgroundSync(): Promise<void> {
    try {
      // Validaciones antes de sincronizar
      if (!navigator.onLine) {
        console.log('[BackgroundSync] ⏸️ Offline - saltando sync');
        return;
      }

      if (!this.isUserActive) {
        console.log('[BackgroundSync] 😴 Usuario inactivo - saltando sync');
        return;
      }

      if (BACKGROUND_SYNC_CONFIG.respectBatteryLevel && await this.isBatteryLow()) {
        console.log('[BackgroundSync] 🔋 Batería baja - saltando sync');
        return;
      }

      if (BACKGROUND_SYNC_CONFIG.respectNetworkType && await this.isSlowNetwork()) {
        console.log('[BackgroundSync] 📶 Red lenta - saltando sync');
        return;
      }

      // Ejecutar sincronización
      console.log('[BackgroundSync] 🔄 Ejecutando sync automático...');
      const result = await performIntelligentSync();
      
      if (result.total > 0) {
        console.log('[BackgroundSync] ✅ Background sync completado:', {
          sincronizadas: result.success,
          fallidas: result.failed,
          conflictos: result.conflicts.length
        });
      }

    } catch (error) {
      console.warn('[BackgroundSync] ⚠️ Error en background sync:', error);
    }
  }

  /**
   * Configura listeners para detectar actividad del usuario
   */
  private setupActivityListeners(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const activityHandler = () => {
      this.lastActivity = Date.now();
      if (!this.isUserActive) {
        this.isUserActive = true;
        console.log('[BackgroundSync] 👤 Usuario activo - resumiendo sync');
      }
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler, { passive: true });
    });

    // Verificar inactividad cada minuto
    setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivity;
      
      if (timeSinceActivity > BACKGROUND_SYNC_CONFIG.inactivityThresholdMs && this.isUserActive) {
        this.isUserActive = false;
        console.log('[BackgroundSync] 😴 Usuario inactivo detectado');
      }
    }, 30000); // Verificar cada 30 segundos
  }

  /**
   * Limpia listeners de actividad
   */
  private removeActivityListeners(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.removeEventListener(event, () => {}, { passive: true } as any);
    });
  }

  /**
   * Verifica si la batería está baja (< 20%)
   */
  private async isBatteryLow(): Promise<boolean> {
    try {
      // @ts-ignore - Battery API no está en todos los navegadores
      if ('getBattery' in navigator) {
        // @ts-ignore
        const battery = await navigator.getBattery();
        return battery.level < 0.2 && !battery.charging;
      }
    } catch (error) {
      // Ignorar errores de Battery API
    }
    return false;
  }

  /**
   * Verifica si la conexión es lenta (datos móviles 2G/3G)
   */
  private async isSlowNetwork(): Promise<boolean> {
    try {
      // @ts-ignore - Network Information API
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        const slowConnections = ['slow-2g', '2g', '3g'];
        return slowConnections.includes(connection.effectiveType);
      }
    } catch (error) {
      // Ignorar errores de Network Information API
    }
    return false;
  }

  /**
   * Ajusta la frecuencia de sincronización dinámicamente
   */
  adjustInterval(newIntervalMs: number): void {
    if (newIntervalMs < 60000) newIntervalMs = 60000; // Min 1 minuto
    if (newIntervalMs > BACKGROUND_SYNC_CONFIG.maxIntervalMs) {
      newIntervalMs = BACKGROUND_SYNC_CONFIG.maxIntervalMs;
    }

    this.currentInterval = newIntervalMs;
    
    // Reiniciar con nuevo intervalo
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }

  /**
   * Obtiene estadísticas del background sync
   */
  getStatus() {
    return {
      isRunning: this.intervalId !== null,
      currentInterval: this.currentInterval,
      isUserActive: this.isUserActive,
      lastActivity: this.lastActivity,
      timeSinceActivity: Date.now() - this.lastActivity
    };
  }
}

// =====================================================
// INSTANCIA SINGLETON
// =====================================================

export const backgroundSyncManager = new BackgroundSyncManager();

// =====================================================
// FUNCIONES DE UTILIDAD
// =====================================================

/**
 * Inicia background sync con configuración personalizada
 */
export function startBackgroundSync(options?: {
  intervalMs?: number;
  respectBattery?: boolean;
  respectNetwork?: boolean;
}): void {
  if (options?.intervalMs) {
    backgroundSyncManager.adjustInterval(options.intervalMs);
  }
  
  backgroundSyncManager.start();
}

/**
 * Detiene background sync
 */
export function stopBackgroundSync(): void {
  backgroundSyncManager.stop();
}

/**
 * Obtiene estado del background sync
 */
export function getBackgroundSyncStatus() {
  return backgroundSyncManager.getStatus();
}