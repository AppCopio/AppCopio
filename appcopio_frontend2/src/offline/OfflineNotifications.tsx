/**
 * Sistema de notificaciones para operaciones offline
 * Muestra toasts cuando se encolan mutaciones offline
 */

import React, { useState, useEffect } from 'react';

// =====================================================
// TIPOS
// =====================================================

export interface OfflineNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  duration?: number; // ms, undefined = no auto-dismiss
}

// =====================================================
// CONTEXT PARA NOTIFICACIONES
// =====================================================

interface NotificationContextType {
  notifications: OfflineNotification[];
  addNotification: (notification: Omit<OfflineNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = React.createContext<NotificationContextType | null>(null);

// =====================================================
// PROVIDER
// =====================================================

export function OfflineNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<OfflineNotification[]>([]);

  const addNotification = React.useCallback((notification: Omit<OfflineNotification, 'id' | 'timestamp'>) => {
    const newNotification: OfflineNotification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto-dismiss si tiene duration
    if (notification.duration) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, notification.duration);
    }
  }, []);

  const removeNotification = React.useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = React.useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

// =====================================================
// HOOK
// =====================================================

export function useOfflineNotifications() {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useOfflineNotifications must be used within OfflineNotificationProvider');
  }
  return context;
}

// =====================================================
// HOOK PARA AUTO-NOTIFICACIONES
// =====================================================

/**
 * Hook que escucha eventos offline y muestra notificaciones automáticamente
 */
export function useAutoNotifications() {
  const { addNotification } = useOfflineNotifications();

  React.useEffect(() => {
    // Importar dinámicamente para evitar dependencias circulares
    import('./events').then(({ offlineEventEmitter }) => {
      
      // Listener para mutaciones encoladas
      const unsubscribeMutation = offlineEventEmitter.on('mutation_queued', (event) => {
        const { operation, entityType } = event.data;
        
        addNotification(createOfflineNotification(operation, entityType));
      });

      // Listener para sincronización completada
      const unsubscribeSync = offlineEventEmitter.on('sync_completed', (event) => {
        const { success, failed } = event.data;
        
        if (success > 0) {
          addNotification(createSyncNotification(success, failed));
        }
      });

      // Listener para fallos de sincronización
      const unsubscribeFailed = offlineEventEmitter.on('sync_failed', (event) => {
        addNotification({
          type: 'error',
          title: '❌ Error de sincronización',
          message: `No se pudieron sincronizar las operaciones: ${event.data.error}`,
          duration: 8000
        });
      });

      // Cleanup
      return () => {
        unsubscribeMutation();
        unsubscribeSync();
        unsubscribeFailed();
      };
    });
  }, [addNotification]);
}

// =====================================================
// COMPONENTE DE TOAST
// =====================================================

function Toast({ notification, onClose }: { 
  notification: OfflineNotification; 
  onClose: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animación de entrada
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Esperar animación
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return '✅';
      case 'info': return '📱';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '📱';
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success': return { bg: '#d4edda', border: '#c3e6cb', text: '#155724' };
      case 'info': return { bg: '#cce7ff', border: '#99d6ff', text: '#004085' };
      case 'warning': return { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' };
      case 'error': return { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' };
      default: return { bg: '#cce7ff', border: '#99d6ff', text: '#004085' };
    }
  };

  const colors = getColors();

  return (
    <div
      style={{
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s ease-in-out',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        padding: '12px 16px',
        borderRadius: '8px',
        marginBottom: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        maxWidth: '400px',
        position: 'relative'
      }}
    >
      <span style={{ fontSize: '18px', flexShrink: 0 }}>
        {getIcon()}
      </span>
      
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {notification.title}
        </div>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          {notification.message}
        </div>
      </div>

      <button
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '0 4px',
          opacity: 0.7,
          color: colors.text
        }}
        title="Cerrar"
      >
        ×
      </button>
    </div>
  );
}

// =====================================================
// CONTENEDOR DE TOASTS
// =====================================================

export function OfflineNotificationContainer() {
  const { notifications, removeNotification } = useOfflineNotifications();

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px', // Debajo de navbar
        right: '20px',
        zIndex: 10000,
        maxHeight: '70vh',
        overflow: 'auto'
      }}
    >
      {notifications.map(notification => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

// =====================================================
// HELPERS PARA TIPOS COMUNES DE NOTIFICACIONES
// =====================================================

export function createOfflineNotification(operation: string, entityType?: string): Omit<OfflineNotification, 'id' | 'timestamp'> {
  const entityName = entityType ? getEntityDisplayName(entityType) : 'elemento';
  
  return {
    type: 'info',
    title: '📱 Operación guardada offline',
    message: `Tu ${operation} de ${entityName} se guardará cuando vuelva la conexión.`,
    duration: 5000 // 5 segundos
  };
}

export function createSyncNotification(success: number, failed: number): Omit<OfflineNotification, 'id' | 'timestamp'> {
  if (failed === 0) {
    return {
      type: 'success',
      title: '✅ Sincronización completada',
      message: `Se sincronizaron ${success} operaciones exitosamente.`,
      duration: 4000
    };
  } else {
    return {
      type: 'warning',
      title: '⚠️ Sincronización parcial',
      message: `${success} operaciones sincronizadas, ${failed} fallaron.`,
      duration: 6000
    };
  }
}

function getEntityDisplayName(entityType: string): string {
  const names: Record<string, string> = {
    'center': 'centro',
    'inventory': 'inventario',
    'user': 'usuario',
    'family': 'familia',
    'person': 'persona',
    'notification': 'notificación',
    'database': 'base de datos',
    'field': 'campo',
    'template': 'plantilla'
  };
  
  return names[entityType] || entityType;
}