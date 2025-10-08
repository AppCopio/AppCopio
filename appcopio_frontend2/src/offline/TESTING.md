# 🧪 Guía Rápida de Testing - Fase 1

## 🎯 Objetivo
Verificar que todo lo implementado en Fase 1 funciona correctamente antes de pasar a Fase 2.

---

## 📋 Setup Inicial (5 minutos)

### 1. Agregar ruta de testing (Opcional pero recomendado)

**En tu archivo de rutas** (ej: `src/App.tsx`):

```tsx
import OfflineTestPage from '@/pages/System/OfflineTestPage';

// Agregar esta ruta:
<Route path="/system/offline-test" element={<OfflineTestPage />} />
```

### 2. Iniciar la aplicación

```bash
cd appcopio_frontend2
npm run dev
```

### 3. Abrir DevTools

- Presiona **F12**
- Ve a la pestaña **Console**

---

## ✅ Tests Básicos (10 minutos)

### Test 1: Verificar IndexedDB ⚡

**DevTools → Application → IndexedDB**

✅ Debes ver:
- Base de datos: `appcopio-offline-db`
- 3 stores: `api-cache`, `mutation-queue`, `sync-metadata`

---

### Test 2: Ver el indicador en Navbar ⚡

**Visual:**
- Mira la esquina superior del Navbar
- Debes ver el chip/indicador de estado offline

Si está online y no ves nada, es normal (configurado con `showWhenOnline={false}`)

---

### Test 3: Simular desconexión ⚡

**DevTools → Network tab:**
1. Click en el dropdown que dice "Online"
2. Seleccionar **"Offline"**

**Resultado esperado:**
- ⚠️ Chip en Navbar cambia a "Sin conexión" (amarillo)
- Console muestra: `[OfflineContext] Conexión perdida`

---

### Test 4: Guardar algo en cache ⚡

**En Console:**

```javascript
// Copiar y pegar todo esto:
const { cacheResponse } = await import('/src/offline/db.ts');

await cacheResponse({
  url: '/api/centers-test',
  data: { test: 'Hola desde cache!' },
  timestamp: Date.now(),
});

console.log('✅ Cache guardado!');
```

**Verificar:**
- DevTools → Application → IndexedDB → `api-cache`
- Debes ver una entrada con key `/api/centers-test`

---

### Test 5: Leer del cache ⚡

**En Console:**

```javascript
const { getCachedResponse } = await import('/src/offline/db.ts');

const data = await getCachedResponse('/api/centers-test');
console.log('📦 Datos del cache:', data);
```

**Resultado esperado:**
```javascript
{
  url: '/api/centers-test',
  data: { test: 'Hola desde cache!' },
  timestamp: 1234567890
}
```

---

### Test 6: Encolar una mutación ⚡

**En Console:**

```javascript
const { enqueueMutation } = await import('/src/offline/db.ts');

await enqueueMutation({
  id: crypto.randomUUID(),
  url: '/api/test-endpoint',
  method: 'POST',
  data: { mensaje: 'Esto se enviará cuando vuelva online' },
  timestamp: Date.now(),
  retries: 0,
  status: 'pending',
  entityType: 'test',
});

console.log('✅ Mutación encolada!');
```

**Resultado esperado:**
- Console: `[OfflineDB] Mutación encolada: POST /api/test-endpoint`
- Navbar: Chip cambia a "1 pendientes"
- IndexedDB: Entrada en `mutation-queue`

---

### Test 7: Ver operaciones pendientes ⚡

**En Console:**

```javascript
const { countPendingMutations, getPendingMutations } = await import('/src/offline/db.ts');

const count = await countPendingMutations();
console.log('📊 Total pendientes:', count);

const mutations = await getPendingMutations();
console.log('📋 Lista completa:', mutations);
```

---

### Test 8: Reconectar ⚡

**DevTools → Network tab:**
1. Cambiar de "Offline" a **"Online"**

**Resultado esperado:**
- Chip vuelve a estado normal (o desaparece)
- Console: `[OfflineContext] Conexión restaurada`
- Console: `[OfflineContext] Iniciando sincronización...`
- Console: Lista las mutaciones pendientes

⚠️ **Nota**: Por ahora solo las loguea, no las ejecuta (eso es Fase 3)

---

### Test 9: Ver estadísticas ⚡

**En Console:**

```javascript
const { getDBStats } = await import('/src/offline/db.ts');

const stats = await getDBStats();
console.log('📊 Estadísticas:', stats);
```

**Resultado esperado:**
```javascript
{
  cacheEntries: 1,
  totalMutations: 1,
  pendingMutations: 1,
  metadataEntries: 0
}
```

---

### Test 10: Limpiar todo ⚡

**En Console:**

```javascript
const { clearAllData } = await import('/src/offline/db.ts');

await clearAllData();
console.log('🧹 Base de datos limpiada!');
```

**Verificar:**
- IndexedDB debe estar vacía
- Contador en Navbar vuelve a 0

---

## 🎨 Tests Avanzados (10 minutos)

### Test 11: Usar la página de testing 🚀

**Si agregaste la ruta:**

1. Navega a: `http://localhost:5173/system/offline-test`
2. Verás una interfaz completa con:
   - Estado actual (online/offline)
   - Controles para simular offline
   - Botones para encolar, cachear, etc.
   - Panel de debugging con estadísticas

**Prueba cada botón:**
- ✅ "Simular Offline" → Estado cambia
- ✅ "Encolar Mutación" → Se agrega a la cola
- ✅ "Guardar en Cache" → Se guarda
- ✅ "Leer Cache" → Muestra datos
- ✅ "Sincronizar Ahora" → Loguea mutaciones
- ✅ "Exportar DB" → Descarga JSON
- ✅ "Limpiar Todo" → Borra todo

---

### Test 12: Usar hooks en un componente 🚀

**Crea un componente de prueba** (ej: `TestComponent.tsx`):

```tsx
import { useOffline } from '@/offline';

export default function TestComponent() {
  const { 
    isOnline, 
    pendingCount, 
    isSyncing,
    triggerSync 
  } = useOffline();

  return (
    <div style={{ padding: 20, border: '2px solid blue' }}>
      <h3>🧪 Test de Hooks</h3>
      <p>Online: {isOnline ? '🟢' : '🔴'} {isOnline ? 'Sí' : 'No'}</p>
      <p>Pendientes: {pendingCount}</p>
      <p>Sincronizando: {isSyncing ? 'Sí' : 'No'}</p>
      <button onClick={triggerSync}>
        Sincronizar Ahora
      </button>
    </div>
  );
}
```

**Agrega este componente a cualquier página y prueba:**
- El estado se actualiza en tiempo real
- El botón funciona
- Los números son correctos

---

### Test 13: Simular flujo completo offline 🚀

**Script automático** (copiar todo en Console):

```javascript
console.log('🚀 Iniciando prueba completa...\n');

// Imports
const { cacheResponse, getCachedResponse, enqueueMutation, countPendingMutations, clearAllData } = await import('/src/offline/db.ts');

// Limpiar primero
await clearAllData();
console.log('✅ 1. DB limpiada');

// Cachear datos
await cacheResponse({
  url: '/api/test-centers',
  data: [
    { id: 1, name: 'Centro A' },
    { id: 2, name: 'Centro B' }
  ],
  timestamp: Date.now(),
});
console.log('✅ 2. Datos cacheados');

// Ir offline
Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
window.dispatchEvent(new Event('offline'));
console.log('✅ 3. Modo offline activado');

// Esperar 1 segundo
await new Promise(r => setTimeout(r, 1000));

// Leer del cache (funciona offline)
const cached = await getCachedResponse('/api/test-centers');
console.log('✅ 4. Datos leídos del cache:', cached.data);

// Encolar mutaciones
await enqueueMutation({
  id: crypto.randomUUID(),
  url: '/api/centers/1',
  method: 'PUT',
  data: { name: 'Centro A Modificado' },
  timestamp: Date.now(),
  retries: 0,
  status: 'pending',
});

await enqueueMutation({
  id: crypto.randomUUID(),
  url: '/api/centers/2',
  method: 'DELETE',
  data: {},
  timestamp: Date.now(),
  retries: 0,
  status: 'pending',
});

console.log('✅ 5. Mutaciones encoladas');

// Contar pendientes
const count = await countPendingMutations();
console.log('✅ 6. Total pendientes:', count);

// Volver online
Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
window.dispatchEvent(new Event('online'));
console.log('✅ 7. Volviendo online...');

// Esperar que intente sincronizar
await new Promise(r => setTimeout(r, 2000));

console.log('\n🎉 Prueba completa finalizada!');
console.log('Revisa los logs arriba para ver la sincronización automática.');
```

---

## 📊 Checklist de Validación

Marca cada item después de probarlo:

### Básicos
- [ ] IndexedDB aparece en DevTools
- [ ] Indicador en Navbar se ve
- [ ] Simular offline funciona
- [ ] Guardar en cache funciona
- [ ] Leer del cache funciona
- [ ] Encolar mutaciones funciona
- [ ] Contador de pendientes se actualiza
- [ ] Reconexión funciona
- [ ] Ver estadísticas funciona
- [ ] Limpiar DB funciona

### Avanzados
- [ ] Página de testing funciona (si la agregaste)
- [ ] Hooks funcionan en componentes
- [ ] Flujo completo offline funciona
- [ ] Exportar DB funciona
- [ ] Logs en consola son claros

---

## 🎯 Resultados Esperados

Si **TODO** funciona, deberías poder:

1. ✅ Ver el indicador offline en Navbar
2. ✅ Simular offline/online con Network tab
3. ✅ Guardar y leer datos del cache manualmente
4. ✅ Encolar mutaciones manualmente
5. ✅ Ver contador de operaciones pendientes
6. ✅ Trigger sincronización manual (loguea pero no ejecuta aún)
7. ✅ Ver toda la data en IndexedDB
8. ✅ Limpiar y exportar la DB

---

## 🚨 Si algo NO funciona

### Error: "Cannot find module '@/offline'"
**Causa**: Alias `@` no configurado o dev server no reiniciado
**Solución**: 
```bash
# Detener servidor (Ctrl+C)
npm run dev
```

### Error: "useOffline must be used within OfflineProvider"
**Causa**: Hook usado fuera del Provider
**Solución**: Ya está en `AppProviders.tsx`, solo reinicia

### IndexedDB no aparece
**Causa**: Permisos del navegador o error de inicialización
**Solución**:
1. F12 → Console → buscar errores rojos
2. Probar en modo incógnito
3. Verificar permisos de storage en browser settings

### Contador no se actualiza
**Causa**: Estado no se refresca automáticamente
**Solución**: Es normal, llama a `refreshPendingCount()` manualmente o espera a Fase 2

---

## ✅ ¿Listo para Fase 2?

Si completaste **TODOS** los tests básicos exitosamente, estás listo para:

**FASE 2: Interceptor Axios**
- Encolar automáticamente cuando offline
- Cachear automáticamente GET requests
- No modificar services existentes

---

## 📚 Recursos

- **Documentación completa**: `src/offline/README.md`
- **Tipos TypeScript**: `src/offline/types.ts`
- **Implementación**: `src/offline/db.ts`

---

## 💡 Tips

- Usa la página de testing para experimentar rápidamente
- Los logs en consola son tu amigo
- Revisa IndexedDB en DevTools para entender qué pasa
- Exporta la DB si algo sale mal (para debugging)

---

¡Suerte con las pruebas! 🚀
