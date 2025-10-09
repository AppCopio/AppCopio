// src/offline/components/AuthExpiredHandler.tsx
// Componente para manejar mutaciones pausadas por expiración de autenticación

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOffline } from '../OfflineContext';
import { getProblematicMutations } from '../db';
import type { MutationQueueItem } from '../types';

export function AuthExpiredHandler() {
  const { isAuthenticated } = useAuth();
  const { triggerSync } = useOffline();
  const [authExpiredMutations, setAuthExpiredMutations] = useState<MutationQueueItem[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Verificar si hay mutaciones pausadas por expiración de auth
  useEffect(() => {
    async function checkAuthExpiredMutations() {
      try {
        const problematic = await getProblematicMutations();
        const authExpired = problematic.filter(m => 
          m.error === 'AUTHENTICATION_EXPIRED'
        );
        
        setAuthExpiredMutations(authExpired);
        setIsVisible(authExpired.length > 0 && isAuthenticated);
      } catch (error) {
        console.error('[AuthExpiredHandler] Error checking auth expired mutations:', error);
      }
    }

    if (isAuthenticated) {
      checkAuthExpiredMutations();
    }
  }, [isAuthenticated]);

  const handleResumeSync = async () => {
    try {
      console.log('[AuthExpiredHandler] 🔄 Resumiendo sincronización de mutaciones pausadas...');
      await triggerSync();
      
      // Refrescar lista después de intentar sync
      setTimeout(async () => {
        const problematic = await getProblematicMutations();
        const authExpired = problematic.filter(m => 
          m.error === 'AUTHENTICATION_EXPIRED'
        );
        setAuthExpiredMutations(authExpired);
        setIsVisible(authExpired.length > 0);
      }, 2000);
      
    } catch (error) {
      console.error('[AuthExpiredHandler] Error resuming sync:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || authExpiredMutations.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#fff3cd',
      color: '#856404',
      border: '1px solid #ffeaa7',
      borderRadius: '8px',
      padding: '16px 20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 10000,
      maxWidth: '500px',
      fontSize: '14px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '18px', marginRight: '8px' }}>⚠️</span>
          <strong>Operaciones pendientes detectadas</strong>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#856404'
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        Tienes <strong>{authExpiredMutations.length}</strong> operación(es) que se pausaron 
        porque tu sesión expiró mientras estabas offline.
      </div>
      
      <div style={{ marginBottom: '16px', fontSize: '12px', opacity: 0.8 }}>
        {authExpiredMutations.map((mutation, index) => (
          <div key={mutation.id} style={{ marginBottom: '4px' }}>
            • {mutation.method} {mutation.url}
          </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleResumeSync}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          🔄 Continuar Sincronización
        </button>
        <button
          onClick={handleDismiss}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Recordar después
        </button>
      </div>
    </div>
  );
}