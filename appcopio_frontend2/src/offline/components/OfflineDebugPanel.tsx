// src/offline/components/OfflineDebugPanel.tsx
// Panel de debugging para desarrollo - muestra estadísticas del sistema offline

import * as React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Stack,
  Chip,
  Alert,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  DeleteSweep as ClearIcon,
  Download as ExportIcon,
  BugReport as BugIcon,
} from '@mui/icons-material';
import { useOffline } from '../OfflineContext';
import { clearAllData, exportDB, getDBStats, getPendingMutations } from '../db';

/**
 * Panel de debugging solo para desarrollo
 * Muestra estadísticas y permite operaciones de mantenimiento
 */
export function OfflineDebugPanel() {
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    lastSync, 
    triggerSync,
    refreshPendingCount 
  } = useOffline();

  const [stats, setStats] = React.useState<any>(null);
  const [mutations, setMutations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadStats = React.useCallback(async () => {
    setLoading(true);
    try {
      const dbStats = await getDBStats();
      const pending = await getPendingMutations();
      setStats(dbStats);
      setMutations(pending);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleClearAll = async () => {
    if (!confirm('¿Estás seguro? Esto borrará TODA la base de datos offline.')) {
      return;
    }
    
    await clearAllData();
    await refreshPendingCount();
    await loadStats();
    alert('Base de datos limpiada');
  };

  const handleExport = async () => {
    const data = await exportDB();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-db-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Nunca';
    return new Date(timestamp).toLocaleString('es-CL');
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 800, margin: '20px auto' }}>
      <Stack spacing={2}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={1}>
          <BugIcon color="action" />
          <Typography variant="h6">
            Panel de Debugging - Sistema Offline
          </Typography>
        </Box>

        <Divider />

        {/* Estado General */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Estado General
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip 
              label={isOnline ? 'Online' : 'Offline'} 
              color={isOnline ? 'success' : 'warning'}
              size="small"
            />
            {isSyncing && (
              <Chip label="Sincronizando..." color="info" size="small" />
            )}
            <Chip 
              label={`${pendingCount} pendientes`} 
              color={pendingCount > 0 ? 'warning' : 'default'}
              size="small"
            />
          </Stack>
        </Box>

        {/* Estadísticas IndexedDB */}
        {stats && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Estadísticas IndexedDB
            </Typography>
            <Stack spacing={0.5}>
              <Typography variant="body2">
                📦 Cache entries: <strong>{stats.cacheEntries}</strong>
              </Typography>
              <Typography variant="body2">
                🔄 Total mutations: <strong>{stats.totalMutations}</strong>
              </Typography>
              <Typography variant="body2">
                ⏳ Pending mutations: <strong>{stats.pendingMutations}</strong>
              </Typography>
              <Typography variant="body2">
                📊 Metadata entries: <strong>{stats.metadataEntries}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                🕐 Última sincronización: <strong>{formatDate(lastSync)}</strong>
              </Typography>
            </Stack>
          </Box>
        )}

        {/* Mutaciones Pendientes */}
        {mutations.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Mutaciones Pendientes
            </Typography>
            <Stack spacing={1}>
              {mutations.slice(0, 5).map((mutation) => (
                <Alert 
                  key={mutation.id} 
                  severity={mutation.status === 'error' ? 'error' : 'info'}
                  sx={{ py: 0.5 }}
                >
                  <Typography variant="caption" component="div">
                    <strong>{mutation.method}</strong> {mutation.url}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Status: {mutation.status} | Intentos: {mutation.retries} | 
                    {' '}{new Date(mutation.timestamp).toLocaleTimeString()}
                  </Typography>
                  {mutation.error && (
                    <Typography variant="caption" color="error">
                      Error: {mutation.error}
                    </Typography>
                  )}
                </Alert>
              ))}
              {mutations.length > 5 && (
                <Typography variant="caption" color="text.secondary">
                  ... y {mutations.length - 5} más
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {/* Acciones */}
        <Divider />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadStats}
            disabled={loading}
            size="small"
          >
            Recargar
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            onClick={triggerSync}
            disabled={!isOnline || isSyncing || pendingCount === 0}
            size="small"
            variant="contained"
          >
            Sincronizar Ahora
          </Button>
          <Button
            startIcon={<ExportIcon />}
            onClick={handleExport}
            size="small"
          >
            Exportar DB
          </Button>
          <Button
            startIcon={<ClearIcon />}
            onClick={handleClearAll}
            color="error"
            size="small"
          >
            Limpiar Todo
          </Button>
        </Stack>

        {/* Warning */}
        <Alert severity="warning" sx={{ mt: 2 }}>
          Este panel es solo para desarrollo. No incluir en producción.
        </Alert>
      </Stack>
    </Paper>
  );
}

export default OfflineDebugPanel;
