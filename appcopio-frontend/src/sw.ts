// src/sw.ts
/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { getAllRequestsFromOutbox, deleteRequestFromOutbox } from './utils/offlineDb'

declare const self: ServiceWorkerGlobalScope

// Workbox inyecta la lista de archivos de tu app aquí.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// --- ESTA ES LA LÍNEA CLAVE QUE ARREGLA EL DINOSAURIO ---
// Le dice al Service Worker: "No importa a qué ruta navegue el usuario (/inventario, /centros, etc.),
// tú siempre responde con el archivo 'index.html' que tienes guardado".
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Regla para cachear las respuestas de la API
registerRoute(
    /^http:\/\/localhost:4000\/api\/.*/,
    new StaleWhileRevalidate({
        cacheName: 'api-cache',
    })
);

// Lógica de Sincronización (sin cambios)
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-inventory-updates' || event.tag === 'sync-incidents') {
    event.waitUntil(syncPendingRequests(event.tag));
  }
});

async function syncPendingRequests(tag: string) {
    const requests = await getAllRequestsFromOutbox();
    for (const request of requests) {
        try {
            const response = await fetch(request.url, {
                method: request.method,
                headers: { 'Content-Type': 'application/json' },
                body: request.body ? JSON.stringify(request.body) : null
            });
            if (!response.ok) throw new Error(`Server response not OK for ${request.id}`);
            await deleteRequestFromOutbox(request.id);
        } catch (error) {
            console.error(`SW: Fallo en la sincronización para "${tag}"`, error);
            throw error; // Lanza el error para que el navegador reintente
        }
    }
}