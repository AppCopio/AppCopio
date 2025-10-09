// src/pages/System/OfflineTestPage.tsx
// Página de testing para el sistema offline (solo desarrollo)

import * as React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  Stack,
  Alert,
  TextField,
} from '@mui/material';
import { 
  useOffline, 
  enqueueMutation, 
  cacheResponse,
  getCachedResponse,
} from '@/offline';

export default function OfflineTestPage() {
  const { isOnline, pendingCount, triggerSync } = useOffline();
  const [testUrl, setTestUrl] = React.useState('/api/test/endpoint');
  const [testData, setTestData] = React.useState('{"test": "data"}');
  const [message, setMessage] = React.useState('');

  const handleEnqueueMutation = async () => {
    try {
      const data = JSON.parse(testData);
      await enqueueMutation({
        id: crypto.randomUUID(),
        url: testUrl,
        method: 'POST',
        data,
        timestamp: Date.now(),
        status: 'pending',
        entityType: 'test',
        retryCount: 0
      });
      setMessage(`✅ Mutación encolada: POST ${testUrl}`);
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const handleCacheResponse = async () => {
    try {
      const data = JSON.parse(testData);
      await cacheResponse({
        url: testUrl,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos
      });
      setMessage(`✅ Response cacheada: ${testUrl}`);
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const handleGetCached = async () => {
    try {
      const cached = await getCachedResponse(testUrl);
      if (cached) {
        setMessage(`✅ Cache encontrado:\n${JSON.stringify(cached, null, 2)}`);
      } else {
        setMessage(`⚠️ No hay cache para: ${testUrl}`);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    }
  };

  const handleToggleOnline = () => {
    // Simular cambio de estado online/offline
    const newState = !navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: newState,
    });
    window.dispatchEvent(new Event(newState ? 'online' : 'offline'));
    setMessage(`🔄 Estado cambiado a: ${newState ? 'ONLINE' : 'OFFLINE'}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        🧪 Testing del Sistema Offline
      </Typography>
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        Esta página es solo para desarrollo y testing. No incluir en producción.
      </Alert>

      {/* Estado actual */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Estado Actual
        </Typography>
        <Stack spacing={1}>
          <Typography>
            🌐 Conectividad: <strong>{isOnline ? 'ONLINE' : 'OFFLINE'}</strong>
          </Typography>
          <Typography>
            ⏳ Operaciones pendientes: <strong>{pendingCount}</strong>
          </Typography>
        </Stack>
        <Box mt={2}>
          <Button 
            variant="outlined" 
            onClick={handleToggleOnline}
            size="small"
          >
            Simular {isOnline ? 'Offline' : 'Online'}
          </Button>
          <Button 
            variant="contained" 
            onClick={triggerSync}
            disabled={!isOnline || pendingCount === 0}
            size="small"
            sx={{ ml: 1 }}
          >
            Sincronizar Ahora
          </Button>
        </Box>
      </Paper>

      {/* Controles de testing */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Controles de Testing
        </Typography>
        
        <Stack spacing={2}>
          <TextField
            label="URL del endpoint"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            fullWidth
            size="small"
          />
          
          <TextField
            label="Datos JSON"
            value={testData}
            onChange={(e) => setTestData(e.target.value)}
            multiline
            rows={3}
            fullWidth
            size="small"
          />

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button 
              variant="contained" 
              onClick={handleEnqueueMutation}
              size="small"
            >
              Encolar Mutación
            </Button>
            
            <Button 
              variant="outlined" 
              onClick={handleCacheResponse}
              size="small"
            >
              Guardar en Cache
            </Button>
            
            <Button 
              variant="outlined" 
              onClick={handleGetCached}
              size="small"
            >
              Leer Cache
            </Button>
          </Stack>

          {message && (
            <Alert 
              severity={message.includes('❌') ? 'error' : 'success'}
              sx={{ whiteSpace: 'pre-wrap' }}
            >
              {message}
            </Alert>
          )}
        </Stack>
      </Paper>


      {/* Instrucciones */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          📚 Instrucciones de Uso
        </Typography>
        <Stack spacing={1} component="ol" sx={{ pl: 2 }}>
          <li>
            <Typography variant="body2">
              <strong>Simular Offline:</strong> Click en "Simular Offline" para desconectar
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Encolar operaciones:</strong> Estando offline, encola algunas mutaciones
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Volver Online:</strong> Click en "Simular Online" para reconectar
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Sincronizar:</strong> Las mutaciones se sincronizan automáticamente, o click "Sincronizar Ahora"
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Cache:</strong> Prueba guardar y leer del cache con diferentes URLs
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>DevTools:</strong> Abre Application → IndexedDB → appcopio-offline-db para ver datos
            </Typography>
          </li>
        </Stack>
      </Paper>
    </Container>
  );
}
