// src/components/inventory/OfflineOperationsManager.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '@/offline/OfflineContext';
import { 
  getPendingOperations, 
  syncPendingOperations, 
  removePendingOperation 
} from '@/services/movements.service';
import type { PendingOperation } from '@/types/movements';
import './OfflineOperationsManager.css';

interface OfflineOperationsManagerProps {
  centerId: string;
  onSync?: () => void;
}

export default function OfflineOperationsManager({ centerId, onSync }: OfflineOperationsManagerProps) {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<{ synced: number; failed: number } | null>(null);

  useEffect(() => {
    loadPendingOperations();
  }, [centerId]);

  useEffect(() => {
    // Reload when connection status changes
    loadPendingOperations();
  }, [isOnline]);

  const loadPendingOperations = () => {
    const allPending = getPendingOperations();
    const centerOps = allPending.filter((op: PendingOperation) => op.center_id === centerId);
    setPendingOps(centerOps);
  };

  const handleSyncAll = async () => {
    if (!isOnline) {
      alert('No hay conexión a internet. Las operaciones se sincronizarán cuando recuperes conexión.');
      return;
    }

    setIsSyncing(true);
    setSyncResults(null);
    
    try {
      const results = await syncPendingOperations(centerId);
      setSyncResults(results);
      loadPendingOperations();
      
      if (results.synced > 0 && onSync) {
        onSync();
      }

      if (results.failed === 0) {
        alert(`¡Sincronización exitosa! ${results.synced} operaciones sincronizadas.`);
      } else {
        alert(
          `Sincronización parcial: ${results.synced} exitosas, ${results.failed} fallidas.\n` +
          'Las operaciones fallidas se mantendrán pendientes.'
        );
      }
    } catch (error) {
      console.error('Error syncing operations:', error);
      alert('Error durante la sincronización. Intenta de nuevo más tarde.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemoveOperation = (operationId: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta operación pendiente? Esta acción no se puede deshacer.')) {
      return;
    }

    removePendingOperation(operationId);
    loadPendingOperations();
    alert('Operación eliminada de la cola offline.');
  };

  const formatOperationType = (type: string) => {
    switch (type) {
      case 'ENTRY':
        return <span className="op-type entry">📥 Entrada</span>;
      case 'EXIT':
        return <span className="op-type exit">📤 Salida</span>;
      case 'ADJUSTMENT':
        return <span className="op-type adjustment">⚖️ Ajuste</span>;
      default:
        return type;
    }
  };

  const getOperationSummary = (op: PendingOperation) => {
    if (op.type === 'ENTRY') {
      const data = op.data as any;
      return `${data.items?.length || 0} items - ${data.reason}`;
    } else if (op.type === 'EXIT') {
      const data = op.data as any;
      return `${data.items?.length || 0} items para ${data.recipient} - ${data.reason}`;
    }
    return 'Operación de ajuste';
  };

  if (pendingOps.length === 0) {
    return null; // No mostrar el componente si no hay operaciones pendientes
  }

  return (
    <div className="offline-ops-manager">
      <div className="offline-ops-header">
        <div className="header-info">
          <h4>📡 Operaciones Offline Pendientes</h4>
          <span className="ops-count">{pendingOps.length} operaciones</span>
        </div>
        
        {isOnline && (
          <button 
            onClick={handleSyncAll}
            disabled={isSyncing || pendingOps.length === 0}
            className="sync-all-btn"
          >
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Todo'}
          </button>
        )}
        
        {!isOnline && (
          <span className="offline-indicator">
            🔴 Sin conexión
          </span>
        )}
      </div>

      {syncResults && (
        <div className="sync-results">
          <p>
            ✅ {syncResults.synced} operaciones sincronizadas
            {syncResults.failed > 0 && (
              <span> • ❌ {syncResults.failed} fallidas</span>
            )}
          </p>
        </div>
      )}

      <div className="pending-operations-list">
        {pendingOps.map((op) => (
          <div key={op.id} className="pending-operation">
            <div className="op-main">
              <div className="op-header">
                {formatOperationType(op.type)}
                <span className="op-timestamp">
                  {new Date(op.timestamp).toLocaleString('es-CL')}
                </span>
              </div>
              
              <div className="op-summary">
                {getOperationSummary(op)}
              </div>
              
              {op.attempts > 0 && (
                <div className="op-attempts">
                  Intentos de sync: {op.attempts}
                  {op.last_error && (
                    <div className="op-error">
                      Error: {op.last_error}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="op-actions">
              <button 
                onClick={() => handleRemoveOperation(op.id)}
                className="remove-op-btn"
                title="Eliminar operación pendiente"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {!isOnline && (
        <div className="offline-notice">
          <p>
            📱 <strong>Modo Offline:</strong> Las operaciones se sincronizarán automáticamente cuando recuperes conexión a internet.
          </p>
        </div>
      )}
    </div>
  );
}