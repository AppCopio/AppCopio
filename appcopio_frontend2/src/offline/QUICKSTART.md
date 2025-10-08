# ⚡ QUICK START - Testing Fase 1

## 🎯 Prueba en 2 minutos

### Paso 1: Abre la app
```bash
npm run dev
```

### Paso 2: Abre Console (F12)

### Paso 3: Copia y pega esto:

```javascript
// Test super rápido del sistema offline
const { cacheResponse, enqueueMutation, getDBStats } = await import('/src/offline/db.ts');

console.log('🧪 Iniciando test rápido...');

// Guardar en cache
await cacheResponse({
  url: '/api/test',
  data: { mensaje: '¡Funciona!' },
  timestamp: Date.now()
});
console.log('✅ Cache guardado');

// Encolar mutación
await enqueueMutation({
  id: crypto.randomUUID(),
  url: '/api/test-mutation',
  method: 'POST',
  data: { test: true },
  timestamp: Date.now(),
  retries: 0,
  status: 'pending'
});
console.log('✅ Mutación encolada');

// Ver stats
const stats = await getDBStats();
console.log('📊 Estadísticas:', stats);

console.log('🎉 Todo funciona! Revisa el Navbar (debe mostrar "1 pendientes")');
```

### Paso 4: Verifica

1. ✅ Console muestra mensajes de éxito
2. ✅ Navbar muestra "1 pendientes" 
3. ✅ DevTools → Application → IndexedDB → `appcopio-offline-db` existe

---

## 🎨 Test visual (alternativa)

1. Agrega esta ruta:
```tsx
import OfflineTestPage from '@/pages/System/OfflineTestPage';
<Route path="/system/offline-test" element={<OfflineTestPage />} />
```

2. Ve a: `http://localhost:5173/system/offline-test`

3. Haz click en los botones y prueba

---

## 📚 Más información

- **Test completo**: `src/offline/test-script.js` (copiar/pegar en console)
- **Guía detallada**: `src/offline/TESTING.md`
- **Documentación**: `src/offline/README.md`
- **Resumen**: `FASE_1_COMPLETADA.md`

---

## ✅ ¿Listo para Fase 2?

Si el test rápido funciona, ¡estás listo para implementar el Interceptor Axios! 🚀
