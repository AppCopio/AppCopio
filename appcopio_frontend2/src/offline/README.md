# 📴 Sistema Offline - AppCopio

## 🎯 Objetivos del Sistema

1. **Visualización offline**: Acceso a datos previamente cargados sin conexión
2. **Cola de mutaciones**: Sincronización automática de cambios al recuperar internet
3. **Arquitectura generalizada**: Solución escalable para todas las operaciones

---

## 📁 Estructura de Archivos

```
src/offline/
├── index.ts                      # Exportaciones centralizadas
├── types.ts                      # Definiciones TypeScript
├── db.ts                         # IndexedDB wrapper
├── OfflineContext.tsx            # React Context para estado offline
├── README.md                     # Esta documentación
├── components/
│   ├── OfflineIndicator.tsx     # Indicador visual de estado
│   └── OfflineDebugPanel.tsx    # Panel de debugging
├── queue.ts                      # [FASE 2] Cola de mutaciones
├── sync.ts                       # [FASE 3] Lógica de sincronización
├── interceptor.ts                # [FASE 2] Axios interceptor
└── hooks/
    ├── useOfflineQuery.ts        # [FASE 4] Hook para GET requests
    └── useOfflineMutation.ts     # [FASE 4] Hook para mutaciones
```

---

## 🏗️ ARQUITECTURA COMPLETA

### Capa 1: Service Worker + PWA
- ✅ `vite-plugin-pwa` instalado
- ⚠️ Configuración básica (mejoras en Fase 5)
- Cache de assets estáticos

### Capa 2: Cache API + IndexedDB
- ✅ **IndexedDB** para almacenamiento estructurado (Fase 1)
- ⏳ **Cache API** vía Workbox (Fase 5)

### Capa 3: Interceptor Axios Centralizado
- ⏳ Detección automática de estado offline (Fase 2)
- ⏳ Almacenamiento de mutaciones en IndexedDB (Fase 2)
- ⏳ Replay de cola al reconectar (Fase 3)

### Capa 4: Hooks y Context de React
- ✅ Context para estado de sincronización (Fase 1)
- ⏳ Hooks reutilizables offline-first (Fase 4)
- ⏳ UI feedback automático (Fase 6)

---

## 📦 PLAN COMPLETO DE IMPLEMENTACIÓN

### ✅ FASE 1: Fundación (COMPLETADA)

**Objetivo**: Establecer infraestructura base de IndexedDB y Context

1. ✅ **Instalación de dependencias**
   - Librería `idb` v8.x para IndexedDB con Promises

2. ✅ **IndexedDB Schema** (`db.ts`)
   - Store `api-cache`: Cache de responses GET
   - Store `mutation-queue`: Cola de mutaciones pendientes (POST/PUT/DELETE)
   - Store `sync-metadata`: Metadatos de sincronización por entidad
   - 30+ funciones CRUD para cada store

3. ✅ **Tipos TypeScript** (`types.ts`)
   - `MutationQueueItem`: Estructura de mutaciones
   - `CachedResponse`: Estructura de cache
   - `SyncMetadata`: Metadatos de sincronización
   - `OfflineState`: Estado global del sistema
   - 10 interfaces completas

4. ✅ **React Context** (`OfflineContext.tsx`)
   - Provider con estado de conectividad
   - Hook `useOffline()` para acceso completo
   - Hook `useIsOnline()` para solo conectividad
   - Hook `usePendingCount()` para contador de pendientes
   - Auto-detección de eventos online/offline

5. ✅ **Componentes UI**
   - `OfflineIndicator`: Indicador visual en Navbar
   - `OfflineDebugPanel`: Panel completo de debugging

6. ✅ **Integración en App**
   - `OfflineProvider` agregado en `AppProviders.tsx`
   - Disponible en toda la aplicación

---

### ⏳ FASE 2: Interceptor Axios (Siguiente)

**Objetivo**: Interceptar requests automáticamente y manejar offline

#### Archivos a crear:
- `src/offline/interceptor.ts` - Interceptor principal de Axios
- `src/offline/queue.ts` - Gestión de cola de mutaciones

#### Funcionalidades:

1. **Interceptor Request** (`interceptor.ts`)
   ```typescript
   // Antes de cada request:
   - Verificar si está online
   - Si offline y es GET → buscar en cache
   - Si offline y es POST/PUT/DELETE → encolar
   - Si online → ejecutar normal
   ```

2. **Interceptor Response**
   ```typescript
   // Después de cada response exitosa:
   - Si es GET → cachear en IndexedDB
   - Actualizar timestamp de última sincronización
   ```

3. **Cola de Mutaciones** (`queue.ts`)
   ```typescript
   - addToQueue(mutation) → encolar mutación
   - processQueue() → procesar cola cuando online
   - getQueueStatus() → estado de la cola
   ```

4. **Integración con api.ts**
   ```typescript
   // En src/lib/api.ts:
   import { setupOfflineInterceptor } from '@/offline/interceptor';
   setupOfflineInterceptor(api);
   ```

#### Estrategias de Cache por Endpoint:

| Endpoint Pattern | Estrategia | TTL | Notas |
|-----------------|-----------|-----|-------|
| `/api/centers` | StaleWhileRevalidate | 5min | Lista puede estar desactualizada |
| `/api/centers/:id` | CacheFirst | 10min | Detalles cambian poco |
| `/api/inventory/:id` | NetworkFirst | 1min | Datos críticos |
| `/api/users` | CacheFirst | 15min | Raramente cambian |
| `/api/zones` | CacheFirst | 1h | Datos estáticos |
| `/api/auth/*` | NetworkOnly | - | Sin cache |
| `/api/notifications` | NetworkFirst | 30s | Tiempo real |

---

### ⏳ FASE 3: Sincronización

**Objetivo**: Replay automático de mutaciones y manejo de conflictos

#### Archivo a crear:
- `src/offline/sync.ts` - Lógica de sincronización

#### Funcionalidades:

1. **Replay de Cola**
   ```typescript
   async function syncPendingMutations() {
     const pending = await getPendingMutations();
     for (const mutation of pending) {
       try {
         await replayMutation(mutation);
         await markAsSuccess(mutation.id);
       } catch (error) {
         await handleSyncError(mutation, error);
       }
     }
   }
   ```

2. **Detección de Conflictos**
   ```typescript
   // Usar optimistic locking con version field
   if (error.status === 409) {
     const conflict = {
       mutationId: mutation.id,
       localVersion: mutation.data,
       remoteVersion: error.data.current
     };
     await storeConflict(conflict);
   }
   ```

3. **Reintentos con Backoff**
   ```typescript
   const delays = [1000, 5000, 15000, 60000]; // 1s, 5s, 15s, 1min
   for (let i = 0; i < maxRetries; i++) {
     await sleep(delays[i]);
     // retry...
   }
   ```

4. **Background Sync**
   - Listener en `window.addEventListener('online')`
   - Sincronización automática cada X minutos si online
   - Mostrar progreso en UI

---

### ⏳ FASE 4: Hooks React

**Objetivo**: Abstraer lógica offline en hooks reutilizables

#### Archivos a crear:
- `src/offline/hooks/useOfflineQuery.ts`
- `src/offline/hooks/useOfflineMutation.ts`

#### useOfflineQuery (para GET requests):

```typescript
function useOfflineQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    staleTime?: number;
    cacheTime?: number;
    refetchOnReconnect?: boolean;
  }
) {
  // 1. Intentar leer del cache
  // 2. Si online, fetch y actualizar cache
  // 3. Si offline, usar cache
  // 4. Revalidar al reconectar
}

// Uso:
const { data, isLoading, error, isStale } = useOfflineQuery(
  'centers',
  () => centersService.getAll()
);
```

#### useOfflineMutation (para POST/PUT/DELETE):

```typescript
function useOfflineMutation<T>(
  mutationFn: (data: T) => Promise<any>,
  options?: {
    optimistic?: boolean;
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
    onSettled?: () => void;
  }
) {
  // 1. Si online → ejecutar
  // 2. Si offline → encolar
  // 3. Update optimista en UI
  // 4. Revertir si falla al sincronizar
}

// Uso:
const updateCenter = useOfflineMutation(
  (data) => centersService.update(id, data),
  {
    optimistic: true,
    onSuccess: () => toast.success('Actualizado'),
  }
);
```

#### Migración de Servicios:

```typescript
// Antes:
const centers = await centersService.getAll();

// Después (automático con interceptor, pero también con hook):
const { data: centers } = useOfflineQuery('centers', centersService.getAll);
```

---

### ⏳ FASE 5: PWA + Service Worker

**Objetivo**: Mejorar configuración de PWA y precaching

#### Mejoras en `vite.config.ts`:

```typescript
VitePWA({
  registerType: 'prompt', // Usuario decide cuándo actualizar
  workbox: {
    cleanupOutdatedCaches: true,
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    
    // Estrategias por tipo de recurso
    runtimeCaching: [
      // Auth - Sin cache
      {
        urlPattern: /\/api\/auth\/.*/,
        handler: 'NetworkOnly'
      },
      
      // API GET - Stale while revalidate
      {
        urlPattern: /\/api\/.*/,
        method: 'GET',
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'api-cache-v1',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 300 // 5 minutos
          }
        }
      },
      
      // Imágenes - Cache first
      {
        urlPattern: /\.(png|jpg|jpeg|svg|gif)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images-cache-v1',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 2592000 // 30 días
          }
        }
      }
    ],
  },
  
  manifest: {
    name: 'AppCopio - Sistema de Gestión',
    short_name: 'AppCopio',
    description: 'Sistema offline-first para gestión de centros',
    theme_color: '#1976d2',
    background_color: '#ffffff',
    display: 'standalone',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
})
```

#### Precaching Estratégico:
- Assets críticos (JS, CSS, fonts)
- Páginas principales (/, /map, /centers)
- Iconos y logos
- Datos estáticos (zones.json)

---

### ⏳ FASE 6: UI/UX

**Objetivo**: Mejorar experiencia de usuario con feedback visual

#### Componentes a crear:

1. **SyncBadge** (Badge de sincronización)
   ```tsx
   <SyncBadge 
     pendingCount={5} 
     syncing={false}
     onClick={triggerSync}
   />
   ```

2. **SyncToast** (Notificaciones toast)
   ```tsx
   // Automático:
   - "Guardado localmente" (cuando offline)
   - "Sincronizando..." (al iniciar sync)
   - "Sincronizado ✓" (al completar)
   - "Error al sincronizar" (si falla)
   ```

3. **PendingOperationsList** (Lista de operaciones pendientes)
   ```tsx
   <PendingOperationsList 
     mutations={pendingMutations}
     onRetry={handleRetry}
     onDelete={handleDelete}
   />
   ```

4. **ConflictResolutionDialog** (Resolver conflictos)
   ```tsx
   <ConflictResolutionDialog
     conflict={conflict}
     onResolve={(choice) => {
       // 'local', 'remote', 'merge'
     }}
   />
   ```

5. **OfflineModeBanner** (Banner persistente)
   ```tsx
   // Ya existe, mejorar:
   - Mostrar contador de pendientes
   - Click para ver lista
   - Animación de sincronización
   ```

---

## 🔐 MANEJO DE AUTENTICACIÓN OFFLINE

**Problema**: El token puede expirar mientras está offline

**Soluciones**:

1. **Almacenar refresh token** (encriptado en IndexedDB)
   ```typescript
   await storeSecure('refresh_token', token);
   ```

2. **Extender TTL** de access tokens para usuarios frecuentemente offline

3. **Renovar al reconectar**
   ```typescript
   async function onReconnect() {
     if (isTokenExpired()) {
       await refreshToken();
     }
     await syncPendingMutations();
   }
   ```

4. **Preservar cola si token expira**
   - Mostrar login
   - Mantener mutaciones en cola
   - Sincronizar después de re-login

---

## 📊 OPTIMISTIC UI UPDATES

```typescript
// Ejemplo: Actualizar centro
const updateCenter = useOfflineMutation({
  mutationFn: (data) => centersService.update(centerId, data),
  
  // Actualización optimista
  onMutate: async (newData) => {
    // Cancelar queries en curso
    await queryClient.cancelQueries(['centers', centerId]);
    
    // Snapshot del estado anterior
    const previous = queryClient.getQueryData(['centers', centerId]);
    
    // Actualizar optimísticamente
    queryClient.setQueryData(['centers', centerId], newData);
    
    return { previous };
  },
  
  // Si falla, revertir
  onError: (err, newData, context) => {
    queryClient.setQueryData(['centers', centerId], context.previous);
  },
  
  // Al completar (online), revalidar
  onSettled: () => {
    queryClient.invalidateQueries(['centers', centerId]);
  }
});
```

---

## 🚨 MANEJO DE CONFLICTOS

### Estrategias:

1. **Last-Write-Wins (LWW)**
   - Más simple
   - Puede perder datos
   - Para datos no críticos

2. **Optimistic Locking** (Recomendado)
   - Campo `version` en BD
   - Fallar si version no coincide
   - Mostrar conflicto al usuario

3. **Merge Automático**
   - Para campos independientes
   - Ej: inventory items diferentes

4. **Manual**
   - UI para que usuario decida
   - Mostrar diff visual
   - Permitir merge o selección

### Implementación con version field:

```typescript
// Backend:
UPDATE centers 
SET name = $1, version = version + 1
WHERE center_id = $2 AND version = $3
RETURNING *;

// Frontend:
const mutation = {
  data: { name: 'Nuevo', version: currentVersion },
  // ...
};

// Si falla con 409 Conflict:
if (error.status === 409) {
  showConflictDialog({
    local: mutation.data,
    remote: error.data.current
  });
}
```

---

---

## 🎯 Estado Actual: FASE 1 COMPLETADA ✅

### ✅ Lo que funciona AHORA:

1. ✅ **IndexedDB inicializada automáticamente**
   - 3 stores: api-cache, mutation-queue, sync-metadata
   - 30+ funciones CRUD disponibles
   - Limpieza automática de cache expirado

2. ✅ **Detección de conectividad**
   - Estado online/offline en tiempo real
   - Listeners automáticos de eventos del navegador
   - Hook `useIsOnline()` disponible

3. ✅ **Context React**
   - `OfflineProvider` integrado en la app
   - Contador de operaciones pendientes
   - Trigger manual de sincronización
   - Hooks: `useOffline()`, `useIsOnline()`, `usePendingCount()`

4. ✅ **Componentes UI**
   - Indicador visual en Navbar
   - Panel de debugging completo
   - Tooltips informativos

5. ✅ **Almacenamiento manual**
   - Puedes guardar en cache manualmente
   - Puedes encolar mutaciones manualmente
   - Puedes leer del cache manualmente

### ⚠️ Lo que NO funciona todavía:

- ❌ Cache automático de GET requests (necesita interceptor - Fase 2)
- ❌ Encolar mutaciones automáticamente offline (necesita interceptor - Fase 2)
- ❌ Sincronización real de la cola (necesita sync.ts - Fase 3)
- ❌ Reintentos automáticos (Fase 3)
- ❌ Hooks offline-first (Fase 4)
- ⚠️ `triggerSync()` solo loguea mutaciones, no las ejecuta aún

---

## 🔧 Uso Básico (Fase 1)

### 1. Acceder al estado offline en cualquier componente

```tsx
import { useOffline } from '@/offline';

function MyComponent() {
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    lastSync,
    triggerSync,
    getStats 
  } = useOffline();

  return (
    <div>
      <p>Estado: {isOnline ? '🟢 Online' : '🔴 Offline'}</p>
      <p>Operaciones pendientes: {pendingCount}</p>
      {isSyncing && <p>Sincronizando...</p>}
      <button onClick={triggerSync}>Sincronizar ahora</button>
    </div>
  );
}
```

### 2. Usar solo el estado de conectividad

```tsx
import { useIsOnline } from '@/offline';

function NetworkIndicator() {
  const isOnline = useIsOnline();
  
  return isOnline ? (
    <span>🟢 Conectado</span>
  ) : (
    <span>🔴 Sin conexión</span>
  );
}
```

### 3. Interactuar directamente con IndexedDB

```tsx
import { 
  cacheResponse, 
  getCachedResponse, 
  enqueueMutation,
  getDBStats 
} from '@/offline';

// Guardar en cache
await cacheResponse({
  url: '/api/centers',
  data: centersData,
  timestamp: Date.now(),
  expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos
});

// Leer del cache
const cached = await getCachedResponse('/api/centers');

// Encolar una mutación
await enqueueMutation({
  id: crypto.randomUUID(),
  url: '/api/centers/123',
  method: 'PUT',
  data: { name: 'Nuevo nombre' },
  timestamp: Date.now(),
  retries: 0,
  status: 'pending',
  entityType: 'centers',
  entityId: '123',
});

// Ver estadísticas
const stats = await getDBStats();
console.log(stats);
// { cacheEntries: 45, totalMutations: 3, pendingMutations: 2, metadataEntries: 5 }
```

## 📊 Stores de IndexedDB

### api-cache
- **Key**: URL del request
- **Value**: `CachedResponse`
- **Índices**: `by-timestamp`, `by-url`
- **Uso**: Cache de responses GET para lectura offline

### mutation-queue
- **Key**: UUID de la mutación
- **Value**: `MutationQueueItem`
- **Índices**: `by-timestamp`, `by-status`, `by-entity-type`
- **Uso**: Cola de mutaciones (POST/PUT/DELETE) pendientes de sincronizar

### sync-metadata
- **Key**: Tipo de entidad (string)
- **Value**: `SyncMetadata`
- **Índices**: `by-last-sync`
- **Uso**: Tracking de última sincronización por tipo de entidad

## 🔄 Eventos del Sistema

El `OfflineContext` escucha automáticamente:
- `window.addEventListener('online')` → Trigger sync automático
- `window.addEventListener('offline')` → Actualiza estado

## 🧹 Limpieza Automática

Al inicializar, el sistema:
1. Cuenta mutaciones pendientes
2. Limpia cache expirado (>24 horas por defecto)
3. Muestra estadísticas en consola

## 🚀 Próximos Pasos

### FASE 2: Interceptor Axios (Siguiente)
- Crear `src/offline/interceptor.ts`
- Integrar con `src/lib/api.ts`
- Detección automática de requests offline
- Encolar mutaciones automáticamente

### FASE 3: Sincronización
- Crear `src/offline/sync.ts`
- Replay de cola al recuperar conexión
- Manejo de conflictos
- Reintentos con backoff

### FASE 4: Hooks React
- `useOfflineQuery` para GET requests
- `useOfflineMutation` para mutaciones
- Integración con servicios existentes

### FASE 5: PWA + Service Worker
- Mejorar `vite.config.ts`
- Estrategias de precaching
- Manifest completo

### FASE 6: UI/UX
- Badges de sincronización
- Toast notifications
- Página de operaciones pendientes
- Resolución de conflictos

## 🐛 Debugging

### Ver contenido de IndexedDB
1. Abrir DevTools → Application → IndexedDB
2. Explorar `appcopio-offline-db`

### Limpiar todo
```tsx
import { clearAllData } from '@/offline';
await clearAllData();
```

### Exportar DB para análisis
```tsx
import { exportDB } from '@/offline';
const backup = await exportDB();
console.log(backup);
```

### Forzar estado offline (testing)
```javascript
// En DevTools Console
Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
window.dispatchEvent(new Event('offline'));
```

---

## 🧪 TESTING COMPLETO - Fase 1

### Preparación del Ambiente de Testing

#### Opción 1: Usar la Página de Testing (Recomendado)

1. **Agregar la ruta en tu router** (ej: `src/App.tsx` o donde tengas tus rutas):

```tsx
import OfflineTestPage from '@/pages/System/OfflineTestPage';

// En tus rutas:
<Route path="/system/offline-test" element={<OfflineTestPage />} />
```

2. **Navegar a la página**:
   - Inicia la app: `npm run dev`
   - Ve a: `http://localhost:5173/system/offline-test`

#### Opción 2: Testing Directo en DevTools Console

Abre cualquier página de la app y usa la consola del navegador.

---

### 📋 CHECKLIST DE TESTING

#### ✅ Test 1: Verificar que IndexedDB se inicializa

**En DevTools Console:**
```javascript
// Importar funciones
import { getDBStats } from '@/offline';

// Ver estadísticas
const stats = await getDBStats();
console.log(stats);
// Esperado: { cacheEntries: 0, totalMutations: 0, pendingMutations: 0, metadataEntries: 0 }
```

**En DevTools → Application → IndexedDB:**
- Deberías ver una base de datos llamada `appcopio-offline-db`
- Con 3 stores: `api-cache`, `mutation-queue`, `sync-metadata`

✅ **Resultado esperado**: DB existe y está vacía

---

#### ✅ Test 2: Verificar detección de conectividad

**Método 1 - Visual:**
1. Mira el Navbar
2. Deberías ver el chip del `OfflineIndicator`
3. Por defecto debería mostrar "Conectado" (o no mostrar nada si `showWhenOnline={false}`)

**Método 2 - Consola:**
```javascript
// En DevTools Console
navigator.onLine
// Esperado: true
```

**Método 3 - Hook:**
Si estás en un componente:
```tsx
const { isOnline } = useOffline();
console.log('Online:', isOnline);
// Esperado: true
```

✅ **Resultado esperado**: Estado correcto de conectividad

---

#### ✅ Test 3: Simular desconexión

**En DevTools:**

1. **Opción A - Network Throttling:**
   - DevTools → Network tab
   - Dropdown que dice "Online" → seleccionar "Offline"

2. **Opción B - Console Script:**
```javascript
Object.defineProperty(navigator, 'onLine', { 
  writable: true, 
  value: false 
});
window.dispatchEvent(new Event('offline'));
```

**Verificar:**
- El indicador en el Navbar debería cambiar a "Sin conexión" (amarillo/warning)
- En consola debería aparecer: `[OfflineContext] Conexión perdida`

✅ **Resultado esperado**: UI refleja estado offline

---

#### ✅ Test 4: Guardar en cache manualmente

**En Console o en OfflineTestPage:**
```javascript
import { cacheResponse } from '@/offline';

// Guardar un centro ficticio
await cacheResponse({
  url: '/api/centers',
  data: [
    { center_id: 'C001', name: 'Centro Test 1' },
    { center_id: 'C002', name: 'Centro Test 2' }
  ],
  timestamp: Date.now(),
  expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos
});

console.log('✅ Cache guardado');
```

**Verificar en DevTools → Application → IndexedDB:**
- `appcopio-offline-db` → `api-cache`
- Deberías ver una entrada con key `/api/centers`

✅ **Resultado esperado**: Datos aparecen en IndexedDB

---

#### ✅ Test 5: Leer del cache

**En Console:**
```javascript
import { getCachedResponse } from '@/offline';

const cached = await getCachedResponse('/api/centers');
console.log('Cached data:', cached);
```

✅ **Resultado esperado**: Devuelve el objeto que guardaste

---

#### ✅ Test 6: Encolar mutación manualmente

**En Console:**
```javascript
import { enqueueMutation } from '@/offline';

await enqueueMutation({
  id: crypto.randomUUID(),
  url: '/api/centers/C001',
  method: 'PUT',
  data: { name: 'Centro Actualizado' },
  timestamp: Date.now(),
  retries: 0,
  status: 'pending',
  entityType: 'centers',
  entityId: 'C001',
});

console.log('✅ Mutación encolada');
```

**Verificar:**
1. En DevTools → IndexedDB → `mutation-queue`: debería aparecer
2. El contador en Navbar debería cambiar a "1 pendientes"
3. En consola: `[OfflineDB] Mutación encolada: PUT /api/centers/C001`

✅ **Resultado esperado**: Mutación guardada, contador actualizado

---

#### ✅ Test 7: Ver operaciones pendientes

**Opción 1 - Hook:**
```tsx
const { pendingCount } = useOffline();
console.log('Pendientes:', pendingCount);
```

**Opción 2 - Función directa:**
```javascript
import { countPendingMutations, getPendingMutations } from '@/offline';

const count = await countPendingMutations();
console.log('Total pendientes:', count);

const mutations = await getPendingMutations();
console.log('Mutaciones:', mutations);
```

✅ **Resultado esperado**: Count correcto y lista de mutaciones

---

#### ✅ Test 8: Trigger sincronización manual

**Con el indicador:**
1. Asegúrate de tener mutaciones pendientes (Test 6)
2. Click en el chip del Navbar
3. O usa el botón "Sincronizar ahora"

**Con hook:**
```tsx
const { triggerSync } = useOffline();
await triggerSync();
```

**Verificar en consola:**
```
[OfflineContext] Iniciando sincronización...
[OfflineContext] 1 mutaciones por sincronizar
  - PUT /api/centers/C001 (status: pending)
```

⚠️ **Nota**: Por ahora solo loguea, no ejecuta realmente (eso es Fase 3)

✅ **Resultado esperado**: Logs en consola con las mutaciones

---

#### ✅ Test 9: Simular reconexión

**Después de estar offline (Test 3):**

1. **Opción A - Network tab:**
   - Cambiar de "Offline" a "Online"

2. **Opción B - Console:**
```javascript
Object.defineProperty(navigator, 'onLine', { 
  writable: true, 
  value: true 
});
window.dispatchEvent(new Event('online'));
```

**Verificar:**
- Indicador cambia a "Conectado"
- En consola: `[OfflineContext] Conexión restaurada`
- Automáticamente intenta sincronizar (si hay pendientes)

✅ **Resultado esperado**: Estado vuelve a online, intenta sync

---

#### ✅ Test 10: Panel de Debugging

**Si agregaste la ruta a OfflineTestPage:**

1. Navega a `/system/offline-test`
2. Deberías ver:
   - Estado actual (online/offline)
   - Contador de pendientes
   - Controles para encolar, cachear, etc.
   - Panel de debugging con estadísticas
   - Lista de mutaciones pendientes

**Prueba cada botón:**
- "Simular Offline/Online"
- "Encolar Mutación"
- "Guardar en Cache"
- "Leer Cache"
- "Sincronizar Ahora"
- "Exportar DB"
- "Limpiar Todo"

✅ **Resultado esperado**: Todos los controles funcionan

---

#### ✅ Test 11: Limpieza de cache expirado

**Crear cache con expiración:**
```javascript
import { cacheResponse, cleanExpiredCache } from '@/offline';

// Cache que expira en 1 segundo
await cacheResponse({
  url: '/api/test-expired',
  data: { test: 'data' },
  timestamp: Date.now(),
  expiresAt: Date.now() + 1000, // 1 segundo
});

// Esperar 2 segundos
await new Promise(r => setTimeout(r, 2000));

// Limpiar expirados
const deleted = await cleanExpiredCache(0); // 0 = limpiar todo lo expirado
console.log('Entradas eliminadas:', deleted);
```

✅ **Resultado esperado**: Cache expirado se elimina

---

#### ✅ Test 12: Exportar base de datos

**En Console:**
```javascript
import { exportDB } from '@/offline';

const backup = await exportDB();
console.log('Backup completo:', backup);

// También puedes descargarlo:
const json = JSON.stringify(backup, null, 2);
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'offline-backup.json';
a.click();
```

✅ **Resultado esperado**: Archivo JSON descargado con toda la DB

---

#### ✅ Test 13: Limpiar todo

**En Console o OfflineTestPage:**
```javascript
import { clearAllData, getDBStats } from '@/offline';

// Ver estadísticas antes
const before = await getDBStats();
console.log('Antes:', before);

// Limpiar
await clearAllData();

// Ver después
const after = await getDBStats();
console.log('Después:', after);
// Esperado: { cacheEntries: 0, totalMutations: 0, ... }
```

✅ **Resultado esperado**: DB completamente limpia

---

### 🎯 Escenario Completo de Testing

**Simula un flujo offline completo:**

```javascript
// 1. Estar online
console.log('Step 1: Online');

// 2. Cachear algunos datos
await cacheResponse({
  url: '/api/centers',
  data: [{ center_id: 'C001', name: 'Centro 1' }],
  timestamp: Date.now(),
});
console.log('Step 2: Datos cacheados');

// 3. Ir offline
Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
window.dispatchEvent(new Event('offline'));
console.log('Step 3: Offline');

// 4. Intentar leer del cache (funciona)
const cached = await getCachedResponse('/api/centers');
console.log('Step 4: Cache leído:', cached);

// 5. Encolar mutaciones
await enqueueMutation({
  id: crypto.randomUUID(),
  url: '/api/centers/C001',
  method: 'PUT',
  data: { name: 'Actualizado Offline' },
  timestamp: Date.now(),
  retries: 0,
  status: 'pending',
  entityType: 'centers',
  entityId: 'C001',
});
console.log('Step 5: Mutación encolada');

// 6. Ver pendientes
const count = await countPendingMutations();
console.log('Step 6: Pendientes:', count);

// 7. Volver online
Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
window.dispatchEvent(new Event('online'));
console.log('Step 7: Online de nuevo');

// 8. El sistema automáticamente intenta sincronizar
// (verás logs en consola)

console.log('✅ Flujo completo probado');
```

---

### 📊 Checklist Final

Marca cada item después de probar:

- [ ] IndexedDB se crea automáticamente
- [ ] Detección de online/offline funciona
- [ ] Indicador visual en Navbar aparece
- [ ] Puedo guardar en cache manualmente
- [ ] Puedo leer del cache
- [ ] Puedo encolar mutaciones
- [ ] El contador de pendientes se actualiza
- [ ] triggerSync() loguea las mutaciones
- [ ] Reconexión automática funciona
- [ ] Panel de debugging muestra info correcta
- [ ] Limpieza de cache funciona
- [ ] Exportar DB funciona
- [ ] Limpiar todo funciona

---

### 🚨 Problemas Comunes

#### "Cannot find module '@/offline'"
**Solución**: Asegúrate de que el alias `@` esté configurado en `vite.config.ts`:
```typescript
resolve: {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },
},
```

#### "useOffline must be used within OfflineProvider"
**Solución**: Ya está agregado en `AppProviders.tsx`, reinicia el dev server.

#### IndexedDB no aparece en DevTools
**Solución**: 
1. Refresca la página
2. Revisa Console por errores
3. Prueba modo incógnito
4. Verifica permisos del navegador

#### El contador no se actualiza
**Solución**: Llama a `refreshPendingCount()`:
```tsx
const { refreshPendingCount } = useOffline();
await enqueueMutation({...});
await refreshPendingCount(); // Refrescar manualmente
```

---

## 📝 Notas Importantes

- La sincronización real aún no está implementada (FASE 3)
- Por ahora, `triggerSync()` solo loguea las mutaciones pendientes
- El sistema está preparado para recibir el interceptor de Axios (FASE 2)
- IndexedDB tiene límite de ~50MB en algunos navegadores (configurable)

## 🎓 Recursos

- [idb Library](https://github.com/jakearchibald/idb)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [PWA Offline Patterns](https://web.dev/offline-cookbook/)
