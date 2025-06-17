// src/sw.ts

// Le decimos a TypeScript que este es un entorno de Web Worker
/// <reference lib="webworker" />

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { getAllRequestsFromOutbox, deleteRequestFromOutbox } from './utils/offlineDb';

declare const self: ServiceWorkerGlobalScope

// Workbox inyectará aquí la lista de archivos de tu aplicación para precachear.
// Esto hace que el "App Shell" cargue offline.
precacheAndRoute(self.__WB_MANIFEST)

// Limpia cachés antiguas en la activación.
cleanupOutdatedCaches()

// Configuración para Single Page Applications (SPA) como React.
// Todas las navegaciones cargarán 'index.html'.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))


// --- NUEVA LÓGICA DE CACHÉ DE API ---
// Esto es lo que antes teníamos en vite.config.ts, ahora lo ponemos aquí.
// Cachea las peticiones a nuestra API para poder ver datos offline.
registerRoute(
    /^http:\/\/localhost:4000\/api\/.*/,
    new StaleWhileRevalidate({
        cacheName: 'api-cache',
    })
);


// --- LÓGICA DE SINCRONIZACIÓN EN SEGUNDO PLANO ---
// Este es el "cerebro" que se activa cuando vuelve la conexión.
// Esto implementa la "sincronización diferida"  requerida.
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-inventory-updates') {
    // waitUntil asegura que el service worker no se "duerma" mientras la sincronización está en proceso.
    event.waitUntil(syncPendingRequests());
  }
});

async function syncPendingRequests() {
  console.log('Service Worker: Iniciando sincronización de peticiones pendientes...');
  const requests = await getAllRequestsFromOutbox();

  for (const request of requests) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body)
      });

      if (!response.ok) throw new Error(`Respuesta del servidor no fue OK: ${response.status}`);

      console.log('Service Worker: Petición enviada con éxito, eliminando de la cola.', request);
      await deleteRequestFromOutbox(request.timestamp);

    } catch (error) {
      console.error('Service Worker: Fallo en la sincronización, se reintentará más tarde.', { request, error });
      // Si una petición falla, detenemos el proceso para no perder datos.
      // El navegador reintentará el 'sync' más tarde.
      return; 
    }
  }

  // --- CÓDIGO AÑADIDO ---
  // Si llegamos aquí, significa que todas las peticiones se sincronizaron con éxito.
  // Ahora, notificamos a la aplicación.
  console.log('Service Worker: Sincronización completada. Notificando a la aplicación...');
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_COMPLETED' });
  }
}