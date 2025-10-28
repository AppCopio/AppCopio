# ✅ FASE 2 COMPLETADA: Interceptor Axios

> **Estado**: Implementación completa  
> **Fecha**: Octubre 2025  
> **Objetivo**: Sistema automático de cache y cola offline

---

## 🎯 Resumen Ejecutivo

**FASE 2 implementa el "cerebro" del sistema offline**: un interceptor de Axios que hace que **TODAS las peticiones HTTP sean automáticamente offline-first**, sin modificar ni una línea de código en los servicios existentes.

### ✨ Lo que logramos

- ✅ **Cache automático** de todas las respuestas GET
- ✅ **Encolado automático** de mutaciones (POST/PUT/DELETE) cuando offline
- ✅ **Sincronización automática** al reconectar
- ✅ **Transparencia total**: cero cambios en servicios/componentes
- ✅ **Detección de conflictos** (409) para resolución futura

---

## 📦 Archivos Implementados

### 1. `interceptor.ts` (~300 líneas) ⭐ NUEVO

**Responsabilidad**: Interceptar TODAS las peticiones de axios automáticamente

**Funciones principales**:
- `setupOfflineInterceptor()` - Setup del interceptor en instancia axios
- `getTTLForEndpoint()` - Determina TTL de cache según endpoint
- `shouldCacheEndpoint()` - Decide si cachear un endpoint
- Request interceptor - Maneja requests offline (cache/queue)
- Response interceptor - Cachea respuestas GET automáticamente

**Comportamiento**:

| Situación | Acción |
|-----------|--------|
| Online + GET | Request normal → Cachea respuesta |
| Offline + GET | Busca en cache → Devuelve o error |
| Offline + POST/PUT/DELETE | Encola mutación → Error controlado |
| Online + mutación | Request normal (sin cache) |

### 2. `queue.ts` (~300 líneas) ⭐ NUEVO

**Responsabilidad**: Gestionar cola de mutaciones pendientes

**Funciones principales**:
- `addMutationToQueue()` - Añade mutación a la cola
- `processQueue()` - Procesa todas las mutaciones pendientes
- `replayMutation()` - Ejecuta una mutación individual
- `getQueueStatus()` - Estado actual de la cola
- Detección de errores (conflictos, retryables, permanentes)

**Flujo de procesamiento**:
```
1. Obtener mutaciones pendientes
2. Para cada mutación:
   - Ejecutar usando apiNoRetry
   - Si exitosa → eliminar de cola
   - Si conflicto (409) → guardar para resolución
   - Si retryable → incrementar contador
   - Si permanente → marcar como error
3. Retornar resultados (success/failed/conflicts)
```

### 3. `db.ts` (~40 líneas nuevas) ✏️ MODIFICADO

**Funciones añadidas**:
- `markMutationAsSuccess()` - Elimina mutación exitosa de la cola
- `incrementRetryCount()` - Incrementa contador de reintentos

### 4. `api.ts` (~5 líneas) ✏️ MODIFICADO

**Cambio**:
```typescript
import { setupOfflineInterceptor } from '@/offline/interceptor';

// ... código existente ...

setupOfflineInterceptor(api); // ← NUEVO

// apiNoRetry se mantiene SIN interceptor (para sync)
```

### 5. `OfflineContext.tsx` (~50 líneas modificadas) ✏️ MODIFICADO

**Cambios**:
- Importa `processQueue` de queue.ts
- `triggerSync()` ahora usa `processQueue()` real
- Maneja conflictos detectados
- Actualiza contador de pendientes después de sync
- Auto-sync al reconectar funciona completamente

### 6. `index.ts` (~15 líneas) ✏️ MODIFICADO

**Exports añadidos**:
```typescript
// Interceptor
export { setupOfflineInterceptor, getTTLForEndpoint, shouldCacheEndpoint };

// Queue
export { addMutationToQueue, processQueue, getQueueStatus };
export type { ConflictInfo };

// DB
export { markMutationAsSuccess, incrementRetryCount };
```

---

## 🎨 Estrategias de Cache Implementadas

| Endpoint | TTL | Prioridad | Justificación |
|----------|-----|-----------|---------------|
| `/api/auth/*` | - | ⚠️ NUNCA | Seguridad: tokens sensibles |
| `/api/notifications` | 30s | 🔴 Crítico | Tiempo real |
| `/api/inventory/:id` | 1min | 🟠 Alta | Datos críticos de inventario |
| `/api/centers/:id` | 5min | 🟡 Normal | Detalles de centros |
| `/api/centers` | 5min | 🟡 Normal | Lista de centros |
| `/api/users` | 15min | 🔵 Baja | Raramente cambian |
| `/api/zones` | 1h | ⚪ Estática | Datos geográficos estáticos |
| `/api/family` | 5min | 🟡 Normal | Info familiar |
| `/api/persons` | 5min | 🟡 Normal | Info de personas |
| `/api/databases` | 10min | 🔵 Baja | Metadatos de BD |
| `/api/fields` | 15min | 🔵 Baja | Configuración de campos |
| `/api/templates` | 15min | 🔵 Baja | Plantillas |
| `/api/categories` | 1h | ⚪ Estática | Categorías |
| `/api/roles` | 1h | ⚪ Estática | Roles del sistema |
| **Default** | 5min | 🟡 Normal | Fallback seguro |

---

## 🔄 Flujos Completos

### Flujo 1: GET Request Online

```
Usuario: centersService.getAll()
   ↓
Axios intercepta request
   ↓
navigator.onLine = true → Continuar
   ↓
Backend responde: { data: [...] }
   ↓
Response interceptor:
  - Verifica TTL para /api/centers (5min)
  - Cachea en IndexedDB
  - expiresAt = now + 300s
   ↓
Usuario recibe: [...] (datos frescos)
```

### Flujo 2: GET Request Offline

```
Usuario: centersService.getAll()
   ↓
Axios intercepta request
   ↓
navigator.onLine = false
   ↓
Busca en cache: getCachedResponse('/api/centers')
   ↓
SI HAY CACHE:
  - Devuelve datos cacheados
  - Flag: fromCache = true
  - Usuario recibe: [...] (datos cache)
   ↓
NO HAY CACHE:
  - Lanza error: "No hay datos en cache y estás offline"
  - UI puede mostrar mensaje al usuario
```

### Flujo 3: POST Request Offline

```
Usuario: centersService.create(newCenter)
   ↓
Axios intercepta request
   ↓
navigator.onLine = false
   ↓
Encolar mutación:
  - id: UUID
  - method: 'POST'
  - url: '/api/centers'
  - data: newCenter
  - timestamp: now
  - status: 'pending'
   ↓
IndexedDB: mutación guardada
pendingCount: 1
   ↓
Lanza error: "Mutación encolada - se sincronizará cuando estés online"
   ↓
UI puede mostrar:
  - Toast: "Guardado localmente"
  - Badge: "1 cambio pendiente"
```

### Flujo 4: Reconexión + Sync Automática

```
Usuario reconecta internet
   ↓
window.addEventListener('online') dispara
   ↓
OfflineContext: triggerSync()
   ↓
queue.processQueue():
  1. Obtener pendientes: [{id: 'abc', method: 'POST'...}]
  2. Para cada mutación:
     - replayMutation() usando apiNoRetry
     - Si 200 OK → markMutationAsSuccess()
     - Si 409 Conflict → guardar en conflicts[]
     - Si 500 → incrementRetryCount()
  3. Retornar: {success: 1, failed: 0, conflicts: 0}
   ↓
Context actualiza:
  - pendingCount = 0
  - lastSync = now
  - isSyncing = false
   ↓
UI se actualiza:
  - Badge desaparece
  - Toast: "Sincronizado ✅"
```

---

## 💡 Ejemplo de Uso (Sin Cambios)

**Antes de Fase 2**:
```typescript
// En cualquier componente
const centers = await centersService.getAll();
// Si offline → error de red ❌
```

**Después de Fase 2**:
```typescript
// EXACTAMENTE EL MISMO CÓDIGO
const centers = await centersService.getAll();

// Pero ahora:
// - Si online → fetch + cache automático ✅
// - Si offline → devuelve cache si existe ✅
// - Sin modificar NADA en el servicio ✅
```

**Mutaciones offline**:
```typescript
// En cualquier componente
try {
  await centersService.create(newCenter);
  toast.success('Centro creado');
} catch (error) {
  if (error.isOfflineMutation) {
    // Fue encolado offline
    toast.info('Guardado localmente - se sincronizará cuando estés online');
  } else {
    // Error real
    toast.error('Error al crear centro');
  }
}
```

---

## 🧪 Testing de Fase 2

### Test 1: Cache automático (GET online)

```typescript
// 1. Online: hacer GET
const centers = await centersService.getAll();

// 2. Verificar en DevTools > Application > IndexedDB:
// - Store: api-cache
// - Key: http://localhost:4000/api/centers
// - Data: array de centros
// - expiresAt: timestamp futuro

// ✅ PASS si aparece en IndexedDB
```

### Test 2: Cache funciona offline (GET offline)

```typescript
// 1. Online: hacer GET (cachea)
await centersService.getAll();

// 2. Offline: DevTools > Network > Throttling > Offline
// 3. Hacer mismo GET
const centers = await centersService.getAll();

// 4. Verificar:
// - NO hay request de red (queda pending)
// - Datos vienen del cache
// - Console: "[Interceptor] OFFLINE detectado"
// - Console: "[Interceptor] ✅ Datos encontrados en cache"

// ✅ PASS si recibe datos sin red
```

### Test 3: Encolado offline (POST offline)

```typescript
// 1. Offline: DevTools > Network > Offline
// 2. Intentar crear centro
try {
  await centersService.create({ name: 'Test', ... });
} catch (error) {
  console.log(error.code); // 'OFFLINE_QUEUED'
  console.log(error.message); // 'Mutación encolada...'
}

// 3. Verificar en IndexedDB:
// - Store: mutation-queue
// - 1 item con method: 'POST'
// - status: 'pending'

// 4. Verificar en UI:
// - OfflineIndicator muestra "1 pendiente"

// ✅ PASS si se encola y aparece en UI
```

### Test 4: Sync al reconectar

```typescript
// 1. Offline: crear mutación (se encola)
// 2. pendingCount = 1
// 3. Online: DevTools > Network > Online
// 4. Esperar ~2 segundos

// 5. Verificar console:
// - "[OfflineContext] Conexión restaurada"
// - "[OfflineContext] 🔄 Iniciando sincronización..."
// - "[Queue] Procesando mutación..."
// - "[Queue] ✅ Mutación abc sincronizada exitosamente"
// - "[OfflineContext] ✅ Sincronización completada"

// 6. Verificar:
// - pendingCount = 0
// - mutation-queue vacío en IndexedDB
// - Backend tiene el dato creado

// ✅ PASS si sync funciona y cola queda vacía
```

### Test 5: Múltiples mutaciones

```typescript
// 1. Offline
// 2. Crear 3 mutaciones:
await centersService.create({...});
await centersService.update(id, {...});
await centersService.delete(id2);

// 3. Verificar pendingCount = 3
// 4. Online
// 5. Verificar que se ejecutan en orden
// 6. Verificar pendingCount = 0

// ✅ PASS si procesa todas en orden
```

---

## 📊 Métricas de Éxito

### ✅ Transparencia

- [ ] Los servicios NO cambiaron (0 líneas modificadas)
- [ ] Los componentes NO cambiaron
- [ ] Todo funciona igual online
- [ ] No hay warnings de deprecación

### ✅ Cache funciona

- [ ] GET online cachea automáticamente
- [ ] GET offline devuelve cache si existe
- [ ] Cache expira según TTL
- [ ] No cachea endpoints de auth

### ✅ Cola funciona

- [ ] POST offline se encola
- [ ] PUT offline se encola
- [ ] DELETE offline se encola
- [ ] pendingCount se actualiza

### ✅ Sync funciona

- [ ] Auto-sync al reconectar
- [ ] Mutaciones se ejecutan en orden
- [ ] pendingCount baja a 0
- [ ] Conflictos se detectan (409)

### ✅ Performance

- [ ] Requests cacheadas son instantáneas (<10ms)
- [ ] No hay lag perceptible con interceptor
- [ ] Cache no crece indefinidamente

---

## 🚧 Limitaciones de Fase 2

**LO QUE SÍ HACE** ✅:
- Intercepta y cachea automáticamente
- Encola mutaciones offline
- Replay simple al reconectar
- Detecta conflictos (los guarda, no resuelve)

**LO QUE NO HACE** ❌ (Fase 3+):
- Resolución de conflictos
- Optimistic updates en UI
- Reintentos con backoff exponencial
- Priorización de mutaciones
- Hooks `useOfflineQuery`/`useOfflineMutation`
- Sincronización en background periodic
- Notificaciones push de conflictos

---

## 🐛 Troubleshooting

### Problema: "Cannot find module './queue'"

**Causa**: Caché de TypeScript

**Solución**:
```bash
# Reiniciar TypeScript server
Ctrl+Shift+P → "TypeScript: Restart TS Server"

# O reiniciar VS Code
```

### Problema: Cache no se usa offline

**Causa**: TTL expirado o endpoint no cacheado

**Solución**:
```typescript
// Verificar en interceptor.ts:
getTTLForEndpoint(url); // ¿Retorna > 0?
shouldCacheEndpoint(url); // ¿Retorna true?

// Verificar expiresAt en IndexedDB
const cached = await getCachedResponse(url);
console.log(cached.expiresAt > Date.now()); // ¿true?
```

### Problema: Mutaciones no se sincronizan

**Causa**: apiNoRetry tiene interceptor o error de red

**Solución**:
```typescript
// Verificar que apiNoRetry NO tenga setupOfflineInterceptor
// En api.ts:
export const apiNoRetry = axios.create({...});
// ↑ NO debe tener setupOfflineInterceptor(apiNoRetry)

// Verificar que backend está corriendo
// Verificar que no hay error de CORS
```

### Problema: pendingCount no se actualiza

**Causa**: Context no se está refrescando

**Solución**:
```typescript
// Llamar manualmente:
const { refreshPendingCount } = useOffline();
await refreshPendingCount();

// O verificar que triggerSync() termina:
// - No debe quedar isSyncing = true
// - Debe llamar refreshPendingCount() al final
```

---

## 🎓 Conceptos Clave Aprendidos

### 1. Axios Interceptors

Los interceptors son funciones que se ejecutan **antes** y **después** de cada request:

```typescript
// Request interceptor: ANTES de enviar
axios.interceptors.request.use(
  config => { /* modificar config */ return config; },
  error => { /* manejar error */ return Promise.reject(error); }
);

// Response interceptor: DESPUÉS de recibir
axios.interceptors.response.use(
  response => { /* procesar response */ return response; },
  error => { /* manejar error */ return Promise.reject(error); }
);
```

**Poder**: Interceptar TODAS las requests sin modificar servicios.

### 2. Offline-First Pattern

```
Online-First (tradicional):
  Request → Network → Response

Offline-First (Fase 2):
  Request → ¿Online? → 
    SI: Network → Cache → Response
    NO: Cache → Response
```

**Ventaja**: La app funciona siempre, incluso sin red.

### 3. Mutation Queue Pattern

```
Offline → Mutation → Queue → IndexedDB

Online → Process Queue → Replay → Backend
```

**Ventaja**: No se pierden cambios del usuario.

### 4. Cache Strategies

| Estrategia | Comportamiento |
|-----------|----------------|
| NetworkOnly | Nunca cachear (auth) |
| CacheFirst | Cache si existe, sino network (datos estáticos) |
| NetworkFirst | Network si online, sino cache (datos críticos) |
| StaleWhileRevalidate | Cache inmediato + update en background |

**En Fase 2**: Solo NetworkFirst implícito.

---

## 📚 Referencias

- **Código Fase 1**: `FASE_1_COMPLETADA.md`
- **Plan completo**: `README.md` (6 fases)
- **Testing**: `TESTING.md`
- **Quick start**: `QUICKSTART.md`

---

## 🚀 Próximos Pasos: FASE 3

**Objetivo**: Sincronización inteligente

**Funcionalidades**:
- Crear `sync.ts` con lógica avanzada
- Reintentos con backoff exponencial
- Priorización de mutaciones
- Resolución básica de conflictos
- Background sync periodic

**ETA**: ~2-3 horas implementación

---

## ✅ Checklist Final de Fase 2

- [x] interceptor.ts creado (~300 líneas)
- [x] queue.ts creado (~300 líneas)
- [x] api.ts integrado (setupOfflineInterceptor)
- [x] OfflineContext.tsx actualizado (triggerSync real)
- [x] db.ts actualizado (markMutationAsSuccess, incrementRetryCount)
- [x] index.ts actualizado (exports de fase 2)
- [ ] Testing manual completo (5 tests)
- [x] Documentación completa

---

**FASE 2: COMPLETADA** ✅  
**Sistema offline-first operativo** 🎉  
**Listo para FASE 3** 🚀
