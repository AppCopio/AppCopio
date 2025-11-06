// src/offline/connectivity-state.ts
// Estado global de conectividad compartido entre todos los módulos

import { getConnectivityMonitor, ConnectivityStatus } from './connectivity-monitor';

/**
 * Verifica si el sistema está offline usando AMBOS métodos de detección:
 * 1. navigator.onLine (para DevTools F12)
 * 2. ConnectivityMonitor (para desconexión física)
 * 
 * Si CUALQUIERA de los dos detecta offline → retorna true (offline)
 * Ambos deben estar online para retornar false (online)
 * 
 * @returns true si está offline, false si está online
 */
export function isSystemOffline(): boolean {
  // Método 1: navigator.onLine (detección del navegador)
  // Funciona con DevTools Network → Offline
  const navigatorOffline = !navigator.onLine;
  
  // Método 2: ConnectivityMonitor (pings activos)
  // Funciona con desconexión física del internet
  let monitorOffline = false;
  try {
    const monitor = getConnectivityMonitor();
    monitorOffline = monitor.isOffline();
  } catch (error) {
    // Si el monitor no está inicializado, usar solo navigator
    console.warn('[ConnectivityState] Monitor no disponible, usando solo navigator.onLine');
  }
  
  // Si CUALQUIERA detecta offline → sistema offline
  const isOffline = navigatorOffline || monitorOffline;
  
  // Log para debugging (solo cuando cambia el estado)
  if (isOffline) {
    const reason = navigatorOffline && monitorOffline 
      ? 'ambos métodos' 
      : navigatorOffline 
        ? 'navigator.onLine' 
        : 'ConnectivityMonitor';
    console.log(`[ConnectivityState] 🔴 Sistema OFFLINE detectado por: ${reason}`);
  }
  
  return isOffline;
}

/**
 * Verifica si el sistema está online
 * Es el opuesto de isSystemOffline()
 * 
 * @returns true si está online, false si está offline
 */
export function isSystemOnline(): boolean {
  return !isSystemOffline();
}

/**
 * Obtiene el estado detallado de conectividad
 * 
 * @returns Objeto con estado de ambos métodos
 */
export function getDetailedConnectivityState() {
  const navigatorOnline = navigator.onLine;
  
  let monitorStatus: ConnectivityStatus | null = null;
  try {
    const monitor = getConnectivityMonitor();
    monitorStatus = monitor.getStatus();
  } catch (error) {
    // Monitor no disponible
  }
  
  return {
    navigator: {
      online: navigatorOnline,
      method: 'navigator.onLine'
    },
    monitor: {
      status: monitorStatus,
      online: monitorStatus !== ConnectivityStatus.OFFLINE,
      method: 'ConnectivityMonitor (pings)'
    },
    systemOnline: isSystemOnline()
  };
}
