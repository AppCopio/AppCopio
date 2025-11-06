// src/offline/connectivity-monitor.ts
// Sistema de monitoreo activo de conectividad
// Detecta conexión real mediante pings periódicos, no solo navigator.onLine

import { emitConnectivityChanged } from './events';

/**
 * Estados de conectividad
 */
export enum ConnectivityStatus {
  ONLINE = 'online',      // Conexión rápida y estable
  SLOW = 'slow',          // Conexión detectada pero lenta
  OFFLINE = 'offline'     // Sin conexión
}

/**
 * Configuración del monitor
 */
interface ConnectivityConfig {
  // URL para hacer ping (debe ser rápido y confiable)
  pingUrl: string;
  
  // Intervalo entre checks (ms)
  checkInterval: number;
  
  // Timeout para considerar conexión lenta (ms)
  slowThreshold: number;
  
  // Timeout para considerar sin conexión (ms)
  offlineThreshold: number;
  
  // Número de intentos fallidos antes de marcar offline
  maxFailedAttempts: number;
}

/**
 * Configuración por defecto
 */
const DEFAULT_CONFIG: ConnectivityConfig = {
  // Usar un endpoint pequeño y rápido (1x1 pixel, headers only)
  // Puedes cambiar esto a tu propio backend si lo prefieres
  pingUrl: '/api/ping', // Cambiar a tu endpoint

  // Check cada 30 minutos
  checkInterval: 1800000,
  
  // Más de 2 segundos = conexión lenta
  slowThreshold: 2000,
  
  // Más de 5 segundos = sin conexión
  offlineThreshold: 5000,
  
  // 2 fallos consecutivos para marcar offline
  maxFailedAttempts: 2
};

/**
 * Resultado de un ping
 */
interface PingResult {
  status: ConnectivityStatus;
  latency: number | null;
  timestamp: number;
}

/**
 * Monitor de conectividad
 */
class ConnectivityMonitor {
  private config: ConnectivityConfig;
  private intervalId: number | null = null;
  private currentStatus: ConnectivityStatus = ConnectivityStatus.ONLINE;
  private failedAttempts: number = 0;
  private listeners: Set<(status: ConnectivityStatus) => void> = new Set();
  private lastSuccessfulPing: number = Date.now();
  private isChecking: boolean = false;

  constructor(config?: Partial<ConnectivityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Escuchar eventos del navegador también (backup)
    this.setupBrowserListeners();
  }

  /**
   * Inicia el monitoreo
   */
  start(): void {
    if (this.intervalId !== null) {
      console.warn('[ConnectivityMonitor] Ya está iniciado');
      return;
    }

    console.log('[ConnectivityMonitor] 🚀 Iniciando monitoreo activo de conectividad');
    
    // Hacer check inmediato
    this.checkConnectivity();
    
    // Configurar checks periódicos
    this.intervalId = window.setInterval(() => {
      this.checkConnectivity();
    }, this.config.checkInterval);
  }

  /**
   * Detiene el monitoreo
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[ConnectivityMonitor] ⏹️ Monitoreo detenido');
    }
  }

  /**
   * Verifica conectividad haciendo ping
   */
  private async checkConnectivity(): Promise<void> {
    // Evitar checks simultáneos
    if (this.isChecking) {
      console.log('[ConnectivityMonitor] 🔄 Check en progreso, saltando...');
      return;
    }

    this.isChecking = true;
    console.log('[ConnectivityMonitor] 📡 Iniciando ping...');

    try {
      const result = await this.ping();
      
      // Log del resultado del ping
      const statusEmoji = {
        [ConnectivityStatus.ONLINE]: '🟢',
        [ConnectivityStatus.SLOW]: '🟡',
        [ConnectivityStatus.OFFLINE]: '🔴'
      };
      
      console.log(
        `[ConnectivityMonitor] ${statusEmoji[result.status]} Ping exitoso: ${result.status}`,
        result.latency ? `(${result.latency}ms)` : '(sin latencia)'
      );
      
      // Actualizar estado según resultado
      this.updateStatus(result);
      
      // Resetear contador de fallos si fue exitoso
      if (result.status !== ConnectivityStatus.OFFLINE) {
        this.failedAttempts = 0;
        this.lastSuccessfulPing = Date.now();
      }
      
    } catch (error) {
      // Error en el ping
      this.failedAttempts++;
      
      console.warn(
        `[ConnectivityMonitor] ⚠️ Ping fallido (${this.failedAttempts}/${this.config.maxFailedAttempts})`,
        error
      );
      
      // Si superamos el límite de intentos, marcar offline
      if (this.failedAttempts >= this.config.maxFailedAttempts) {
        console.error('[ConnectivityMonitor] 🔴 Máximo de intentos alcanzado, marcando OFFLINE');
        this.updateStatus({
          status: ConnectivityStatus.OFFLINE,
          latency: null,
          timestamp: Date.now()
        });
      }
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Hace un ping al servidor
   */
  private async ping(): Promise<PingResult> {
    const startTime = Date.now();
    console.log(`[ConnectivityMonitor] 🌐 Enviando ping a ${this.config.pingUrl}...`);
    
    try {
      // Usar fetch con timeout y cache deshabilitado
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[ConnectivityMonitor] ⏱️ Timeout alcanzado, abortando request');
        controller.abort();
      }, this.config.offlineThreshold);

      const response = await fetch(this.config.pingUrl, {
        method: 'HEAD', // Más ligero que GET
        cache: 'no-store',
        signal: controller.signal,
        // Agregar timestamp para evitar cache del navegador
        headers: {
          'Cache-Control': 'no-cache',
          'X-Ping-Time': Date.now().toString()
        }
      });

      clearTimeout(timeoutId);
      
      const latency = Date.now() - startTime;
      console.log(`[ConnectivityMonitor] ⚡ Respuesta recibida en ${latency}ms (status: ${response.status})`);

      // Determinar estado según latencia
      let status: ConnectivityStatus;
      
      if (!response.ok) {
        // Error HTTP (4xx, 5xx)
        console.error(`[ConnectivityMonitor] ❌ Error HTTP ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }
      
      if (latency > this.config.slowThreshold) {
        console.log(`[ConnectivityMonitor] 🐌 Conexión lenta detectada (${latency}ms > ${this.config.slowThreshold}ms)`);
        status = ConnectivityStatus.SLOW;
      } else {
        console.log(`[ConnectivityMonitor] ⚡ Conexión rápida (${latency}ms < ${this.config.slowThreshold}ms)`);
        status = ConnectivityStatus.ONLINE;
      }

      return {
        status,
        latency,
        timestamp: Date.now()
      };
      
    } catch (error: any) {
      // Timeout o error de red
      const latency = Date.now() - startTime;
      
      // Si el timeout se cumplió, es OFFLINE
      if (error.name === 'AbortError' || latency >= this.config.offlineThreshold) {
        console.error(`[ConnectivityMonitor] ⏱️ Timeout o error de red (${latency}ms), marcando OFFLINE`);
        return {
          status: ConnectivityStatus.OFFLINE,
          latency,
          timestamp: Date.now()
        };
      }
      
      // Otros errores también se consideran offline
      console.error(`[ConnectivityMonitor] ❌ Error en ping:`, error.message || error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de conectividad
   */
  private updateStatus(result: PingResult): void {
    const previousStatus = this.currentStatus;
    const newStatus = result.status;

    // Solo actualizar si cambió
    if (previousStatus !== newStatus) {
      this.currentStatus = newStatus;
      
      // Log del cambio
      const emoji = {
        [ConnectivityStatus.ONLINE]: '🟢',
        [ConnectivityStatus.SLOW]: '🟡',
        [ConnectivityStatus.OFFLINE]: '🔴'
      };
      
      console.log(
        `[ConnectivityMonitor] ${emoji[newStatus]} Estado: ${previousStatus} → ${newStatus}`,
        result.latency ? `(${result.latency}ms)` : ''
      );
      
      // Notificar a listeners
      this.notifyListeners(newStatus);
      
      // Emitir evento global
      emitConnectivityChanged(newStatus);
    }
  }

  /**
   * Notifica a todos los listeners
   */
  private notifyListeners(status: ConnectivityStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('[ConnectivityMonitor] Error en listener:', error);
      }
    });
  }

  /**
   * Configura listeners del navegador como backup
   */
  private setupBrowserListeners(): void {
    // Listener de online/offline del navegador
    window.addEventListener('online', () => {
      console.log('[ConnectivityMonitor] 📡 Evento browser: online');
      // Hacer check inmediato
      this.checkConnectivity();
    });

    window.addEventListener('offline', () => {
      console.log('[ConnectivityMonitor] 📡 Evento browser: offline');
      // Marcar offline inmediatamente
      this.updateStatus({
        status: ConnectivityStatus.OFFLINE,
        latency: null,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Suscribirse a cambios de conectividad
   */
  subscribe(listener: (status: ConnectivityStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Retornar función de unsuscribe
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Obtiene el estado actual
   */
  getStatus(): ConnectivityStatus {
    return this.currentStatus;
  }

  /**
   * Verifica si está online (incluye SLOW como online)
   */
  isOnline(): boolean {
    return this.currentStatus === ConnectivityStatus.ONLINE || 
           this.currentStatus === ConnectivityStatus.SLOW;
  }

  /**
   * Verifica si está offline
   */
  isOffline(): boolean {
    return this.currentStatus === ConnectivityStatus.OFFLINE;
  }

  /**
   * Obtiene tiempo desde último ping exitoso
   */
  getTimeSinceLastSuccess(): number {
    return Date.now() - this.lastSuccessfulPing;
  }

  /**
   * Fuerza un check inmediato
   */
  async forceCheck(): Promise<ConnectivityStatus> {
    await this.checkConnectivity();
    return this.currentStatus;
  }
}

/**
 * Instancia singleton
 */
let monitorInstance: ConnectivityMonitor | null = null;

/**
 * Obtiene la instancia del monitor
 */
export function getConnectivityMonitor(config?: Partial<ConnectivityConfig>): ConnectivityMonitor {
  if (!monitorInstance) {
    monitorInstance = new ConnectivityMonitor(config);
  }
  return monitorInstance;
}

/**
 * Inicia el monitoreo global
 */
export function startConnectivityMonitoring(config?: Partial<ConnectivityConfig>): void {
  const monitor = getConnectivityMonitor(config);
  monitor.start();
}

/**
 * Detiene el monitoreo global
 */
export function stopConnectivityMonitoring(): void {
  if (monitorInstance) {
    monitorInstance.stop();
  }
}
