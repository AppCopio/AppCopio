// src/offline/components/OfflineIndicator.tsx
// Indicador visual del estado offline con información de sincronización

import * as React from 'react';
import { Box, Chip, Tooltip, CircularProgress } from '@mui/material';
import { 
  CloudOff as OfflineIcon,
  CloudDone as OnlineIcon,
  CloudSync as SyncingIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useOffline } from '../OfflineContext';

interface OfflineIndicatorProps {
  variant?: 'chip' | 'icon' | 'full';
  showWhenOnline?: boolean;
}

/**
 * Componente que muestra el estado de conectividad y sincronización
 */
export function OfflineIndicator({ 
  variant = 'chip', 
  showWhenOnline = false 
}: OfflineIndicatorProps) {
  const { isOnline, isSyncing, pendingCount, triggerSync } = useOffline();

  // No mostrar nada si está online y showWhenOnline es false
  if (isOnline && !showWhenOnline && !isSyncing) {
    return null;
  }

  // Determinar color y texto
  const getStatus = () => {
    if (isSyncing) {
      return {
        color: 'info' as const,
        icon: <SyncingIcon />,
        label: 'Sincronizando...',
        tooltip: `Sincronizando ${pendingCount} operaciones pendientes`,
      };
    }
    
    if (!isOnline) {
      return {
        color: 'warning' as const,
        icon: <OfflineIcon />,
        label: pendingCount > 0 ? `Sin conexión (${pendingCount} pendientes)` : 'Sin conexión',
        tooltip: pendingCount > 0
          ? `${pendingCount} operaciones se sincronizarán cuando recuperes la conexión`
          : 'Estás trabajando offline. Los cambios se guardarán localmente.',
      };
    }

    // Online y con pendientes (aunque no está sincronizando)
    if (pendingCount > 0) {
      return {
        color: 'warning' as const,
        icon: <WarningIcon />,
        label: `${pendingCount} pendientes`,
        tooltip: `Hay ${pendingCount} operaciones esperando sincronizarse. Haz clic para sincronizar ahora.`,
      };
    }

    // Todo bien
    return {
      color: 'success' as const,
      icon: <OnlineIcon />,
      label: 'Conectado',
      tooltip: 'Todo sincronizado correctamente',
    };
  };

  const status = getStatus();

  // Variant: solo icono
  if (variant === 'icon') {
    return (
      <Tooltip title={status.tooltip} arrow>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: status.color === 'warning' ? 'warning.main' : 
                   status.color === 'info' ? 'info.main' : 'success.main',
            cursor: pendingCount > 0 && !isSyncing ? 'pointer' : 'default',
          }}
          onClick={pendingCount > 0 && !isSyncing ? triggerSync : undefined}
        >
          {isSyncing ? (
            <CircularProgress size={20} />
          ) : (
            React.cloneElement(status.icon, { fontSize: 'small' })
          )}
        </Box>
      </Tooltip>
    );
  }

  // Variant: chip (por defecto)
  if (variant === 'chip') {
    return (
      <Tooltip title={status.tooltip} arrow>
        <Chip
          icon={isSyncing ? <CircularProgress size={16} /> : status.icon}
          label={status.label}
          color={status.color}
          size="small"
          onClick={pendingCount > 0 && !isSyncing ? triggerSync : undefined}
          sx={{
            cursor: pendingCount > 0 && !isSyncing ? 'pointer' : 'default',
          }}
        />
      </Tooltip>
    );
  }

  // Variant: full (con más información)
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: 1,
        borderRadius: 1,
        backgroundColor: status.color === 'warning' ? 'warning.light' : 
                        status.color === 'info' ? 'info.light' : 'success.light',
        cursor: pendingCount > 0 && !isSyncing ? 'pointer' : 'default',
      }}
      onClick={pendingCount > 0 && !isSyncing ? triggerSync : undefined}
    >
      <Tooltip title={status.tooltip} arrow>
        <>
          {isSyncing ? (
            <CircularProgress size={20} />
          ) : (
            React.cloneElement(status.icon, { fontSize: 'small' })
          )}
          <Box sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
            {status.label}
          </Box>
        </>
      </Tooltip>
    </Box>
  );
}

export default OfflineIndicator;
