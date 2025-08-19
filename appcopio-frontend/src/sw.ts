// src/sw.ts

/// <reference lib="webworker" />

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { getAllRequestsFromOutbox, deleteRequestFromOutbox } from './utils/offlineDb';

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// La lógica de caché de API se mantiene, es la que permite ver el historial offline.
registerRoute(
    /^http:\/\/localhost:4000\/api\/.*/,
    new StaleWhileRevalidate({
        cacheName: 'api-cache',
    })
);


// --- LÓGICA DE SINCRONIZACIÓN CORREGIDA ---
self.addEventListener('sync', (event: any) => {
  // CORRECCIÓN: Ahora el 'if' comprueba si la etiqueta es CUALQUIERA de las que nos interesan.
  if (event.tag === 'sync-inventory-updates' || event.tag === 'sync-incidents') {
    event.waitUntil(syncPendingRequests(event.tag));
  }
});

async function syncPendingRequests(tag: string) {
  console.log(`Service Worker: Iniciando sincronización para la etiqueta "${tag}"...`);
  const requests = await getAllRequestsFromOutbox();

  // Filtramos las peticiones para procesar solo las que corresponden a la etiqueta del evento.
  // Esto es opcional pero es una buena práctica si las peticiones son muy diferentes.
  // Por ahora, procesamos todas juntas ya que la lógica es la misma.
  
  for (const request of requests) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        // El cuerpo puede ser nulo para peticiones DELETE
        body: request.body ? JSON.stringify(request.body) : null 
      });

      if (!response.ok) throw new Error(`Respuesta del servidor no fue OK: ${response.status}`);

      console.log('Service Worker: Petición enviada con éxito, eliminando de la cola.', request);
      await deleteRequestFromOutbox(request.timestamp);

    } catch (error) {
      console.error('Service Worker: Fallo en la sincronización, se reintentará más tarde.', { request, error });
      return; 
    }
  }
  
  console.log(`Service Worker: Sincronización para "${tag}" completada. Notificando a la aplicación...`);
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: 'SYNC_COMPLETED' });
  }
}