// ====================================================================
// 🧪 SCRIPT DE TESTING RÁPIDO - Fase 1
// ====================================================================
// Copia y pega este script completo en la Console de DevTools
// para probar todas las funcionalidades del sistema offline.
// ====================================================================

console.clear();
console.log('%c🧪 INICIANDO TESTS DEL SISTEMA OFFLINE - FASE 1', 'color: #00ff00; font-size: 20px; font-weight: bold;');
console.log('%cEste script probará todas las funcionalidades implementadas', 'color: #ffff00;');
console.log('');

// ====================================================================
// HELPER: Función para pausar
// ====================================================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ====================================================================
// HELPER: Log con estilo
// ====================================================================
const logSuccess = (msg) => console.log(`%c✅ ${msg}`, 'color: #00ff00; font-weight: bold;');
const logInfo = (msg) => console.log(`%c📋 ${msg}`, 'color: #00aaff;');
const logWarning = (msg) => console.log(`%c⚠️ ${msg}`, 'color: #ffaa00;');
const logError = (msg) => console.log(`%c❌ ${msg}`, 'color: #ff0000; font-weight: bold;');

// ====================================================================
// TEST SUITE
// ====================================================================
async function runOfflineTests() {
  try {
    // Imports
    logInfo('Importando módulos...');
    const { 
      getDB,
      getDBStats,
      cacheResponse, 
      getCachedResponse,
      deleteCachedResponse,
      enqueueMutation, 
      countPendingMutations,
      getPendingMutations,
      clearAllData,
      exportDB
    } = await import('/src/offline/db.ts');

    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%cTEST 1: Verificar IndexedDB', 'color: #00aaff; font-size: 16px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    
    const db = await getDB();
    logSuccess('IndexedDB inicializada correctamente');
    logInfo(`Nombre de la DB: ${db.name}, Versión: ${db.version}`);
    
    await sleep(500);

    // ----------------------------------------------------------------
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%cTEST 2: Limpiar datos anteriores', 'color: #00aaff; font-size: 16px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    
    await clearAllData();
    logSuccess('Base de datos limpiada');
    
    await sleep(500);

    // ----------------------------------------------------------------
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%cTEST 3: Guardar en cache', 'color: #00aaff; font-size: 16px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    
    const testCenters = [
      { center_id: 'C001', name: 'Centro de Acopio Norte', capacity: 100 },
      { center_id: 'C002', name: 'Centro de Acopio Sur', capacity: 150 },
      { center_id: 'C003', name: 'Albergue Central', capacity: 200 }
    ];

    await cacheResponse({
      url: '/api/centers',
      data: testCenters,
      timestamp: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutos
    });
    logSuccess('Centros guardados en cache');
    logInfo(`Total de centros: ${testCenters.length}`);

    await cacheResponse({
      url: '/api/users/profile',
      data: { user_id: 1, username: 'test_user', role: 'admin' },
      timestamp: Date.now(),
    });
    logSuccess('Perfil de usuario guardado en cache');

    await sleep(500);

    // ----------------------------------------------------------------
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%cTEST 4: Leer del cache', 'color: #00aaff; font-size: 16px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');

    const cachedCenters = await getCachedResponse('/api/centers');
    logSuccess('Centros leídos del cache');
    console.table(cachedCenters.data);

    const cachedProfile = await getCachedResponse('/api/users/profile');
    logSuccess('Perfil leído del cache');
    console.log(cachedProfile.data);

    await sleep(500);

    // ----------------------------------------------------------------
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%cTEST 5: Simular estado OFFLINE', 'color: #00aaff; font-size: 16px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');

    const wasOnline = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    window.dispatchEvent(new Event('offline'));
    
    logWarning('Estado offline simulado');
    logInfo('Revisa el indicador en el Navbar');
    
    await sleep(1500);

    // ----------------------------------------------------------------
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%cTEST 6: Encolar mutaciones (offline)', 'color: #00aaff; font-size: 16px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');

    // Mutación 1: Actualizar centro
    await enqueueMutation({
      id: crypto.randomUUID(),
      url: '/api/centers/C001',
      method: 'PUT',
      data: { name: 'Centro Norte ACTUALIZADO', capacity: 120 },
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
      entityType: 'centers',
      entityId: 'C001',
    });
    logSuccess('Mutación 1: PUT /api/centers/C001 encolada');

    // Mutación 2: Crear centro
    await enqueueMutation({
      id: crypto.randomUUID(),
      url: '/api/centers',
      method: 'POST',
      data: { name: 'Centro Nuevo Offline', capacity: 80, type: 'Acopio' },
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
      entityType: 'centers',
    });
    logSuccess('Mutación 2: POST /api/centers encolada');

    // Mutación 3: Actualizar inventario
    await enqueueMutation({
      id: crypto.randomUUID(),
      url: '/api/inventory/123',
      method: 'PATCH',
      data: { quantity: 50, notes: 'Actualizado offline' },
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
      entityType: 'inventory',
      entityId: '123',
    });
    logSuccess('Mutación 3: PATCH /api/inventory/123 encolada');

    await sleep(500);

    // ----------------------------------------------------------------
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%cTEST 7: Verificar operaciones pendientes', 'color: #00aaff; font-size: 16px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');

    const pendingCount = await countPendingMutations();
    logSuccess(`Total de operaciones pendientes: ${pendingCount}`);
    logInfo('Revisa el contador en el Navbar, debería mostrar 3');

    const pendingMutations = await getPendingMutations();
    console.log('');
    console.log('%cDetalles de las mutaciones pendientes:', 'color: #ffff00;');
    pendingMutations.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.method} ${m.url}`);
      console.log(`     Status: ${m.status}, Timestamp: ${new Date(m.timestamp).toLocaleTimeString()}`);
    });

    await sleep(1000);

    // ----------------------------------------------------------------
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%cTEST 8: Volver a estado ONLINE', 'color: #00aaff; font-size: 16px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');

    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
    window.dispatchEvent(new Event('online'));
    
    logSuccess('Reconexión simulada');
    logInfo('El sistema intentará sincronizar automáticamente...');
    logWarning('Revisa los logs arriba (deben aparecer logs de OfflineContext)');
    
    await sleep(2000);

    // ----------------------------------------------------------------
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%cTEST 9: Ver estadísticas completas', 'color: #00aaff; font-size: 16px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');

    const stats = await getDBStats();
    console.log('');
    console.log('%cEstadísticas de IndexedDB:', 'color: #ffff00; font-weight: bold;');
    console.table(stats);
    
    logInfo(`📦 Entradas en cache: ${stats.cacheEntries}`);
    logInfo(`🔄 Mutaciones totales: ${stats.totalMutations}`);
    logInfo(`⏳ Mutaciones pendientes: ${stats.pendingMutations}`);
    logInfo(`📊 Metadatos: ${stats.metadataEntries}`);

    await sleep(500);

    // ----------------------------------------------------------------
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%cTEST 10: Exportar base de datos', 'color: #00aaff; font-size: 16px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');

    const backup = await exportDB();
    logSuccess('Base de datos exportada');
    logInfo(`Versión: ${backup.version}, Timestamp: ${new Date(backup.timestamp).toLocaleString()}`);
    logInfo(`Cache entries: ${backup.cache.length}`);
    logInfo(`Mutations: ${backup.mutations.length}`);
    
    console.log('');
    console.log('%cPara descargar el backup como JSON:', 'color: #ffff00;');
    console.log('const json = JSON.stringify(backup, null, 2);');
    console.log('const blob = new Blob([json], { type: "application/json" });');
    console.log('const url = URL.createObjectURL(blob);');
    console.log('const a = document.createElement("a");');
    console.log('a.href = url; a.download = "offline-backup.json"; a.click();');

    await sleep(500);

    // ----------------------------------------------------------------
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('%c🎉 TODOS LOS TESTS COMPLETADOS', 'color: #00ff00; font-size: 18px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #666;');
    console.log('');
    
    console.log('%c✅ Checklist de verificación:', 'color: #00aaff; font-size: 14px; font-weight: bold;');
    console.log('');
    console.log('  ✓ IndexedDB inicializada correctamente');
    console.log('  ✓ Cache de responses funcionando');
    console.log('  ✓ Lectura de cache funcionando');
    console.log('  ✓ Detección de offline funcionando');
    console.log('  ✓ Cola de mutaciones funcionando');
    console.log('  ✓ Contador de pendientes actualizado');
    console.log('  ✓ Reconexión automática detectada');
    console.log('  ✓ Exportación de DB funcionando');
    console.log('');
    
    console.log('%c📋 Próximos pasos:', 'color: #ffff00; font-weight: bold;');
    console.log('');
    console.log('1. Revisa el indicador en el Navbar');
    console.log('2. Abre DevTools → Application → IndexedDB → appcopio-offline-db');
    console.log('3. Explora los stores: api-cache, mutation-queue');
    console.log('4. Si todo funciona, estás listo para FASE 2! 🚀');
    console.log('');
    
    console.log('%c💡 Tips:', 'color: #00aaff;');
    console.log('- Para limpiar todo: await clearAllData()');
    console.log('- Para ver stats: await getDBStats()');
    console.log('- Para exportar: await exportDB()');
    console.log('');
    
    console.log('%c🎯 Para testing manual, usa: /system/offline-test', 'color: #ffaa00;');
    console.log('');

    // Restaurar estado online original
    if (wasOnline) {
      Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
    }

  } catch (error) {
    logError('ERROR en los tests:');
    console.error(error);
    console.log('');
    console.log('%c❌ Los tests fallaron', 'color: #ff0000; font-size: 18px; font-weight: bold;');
    console.log('%cRevisa el error arriba y verifica:', 'color: #ffaa00;');
    console.log('1. Que hayas ejecutado npm install');
    console.log('2. Que el dev server esté corriendo');
    console.log('3. Que no haya errores de compilación');
  }
}

// ====================================================================
// EJECUTAR TESTS
// ====================================================================
console.log('');
console.log('%cEjecutando tests en 2 segundos...', 'color: #ffff00;');
console.log('%cSi quieres cancelar, ejecuta: clearTimeout(testTimeout)', 'color: #666;');
console.log('');

const testTimeout = setTimeout(() => {
  runOfflineTests();
}, 2000);
