// src/components/common/ConnectionStatus.tsx
import React from 'react';
import { useOffline } from '@/offline/OfflineContext';
import './ConnectionStatus.css';

export default function ConnectionStatus() {
  const { isOnline, lastSync } = useOffline();

  return (
    <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
      <div className="status-indicator">
        {isOnline ? (
          <>
            <span className="status-icon">🟢</span>
            <span className="status-text">En línea</span>
          </>
        ) : (
          <>
            <span className="status-icon">🔴</span>
            <span className="status-text">Sin conexión</span>
          </>
        )}
      </div>
      
      {lastSync && (
        <div className="last-sync">
          Última sincronización: {new Date(lastSync).toLocaleString('es-CL')}
        </div>
      )}
    </div>
  );
}