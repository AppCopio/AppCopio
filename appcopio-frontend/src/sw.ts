// src/sw.ts

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { getAllRequestsFromOutbox, deleteRequestFromOutbox } from './utils/offlineDb';

// --- FASE 2: ESTRATEGIAS DE CACHÉ ---

// 1. Precaching del "App Shell"
// Workbox toma todos los archivos de nuestra aplicación (JS, CSS, HTML, imágenes)
// y los guarda en el caché. Esto hace que la app cargue instantáneamente en visitas posteriores.
precacheAndRoute(self.__WB_MANIFEST);

// 2. Limpieza de cachés antiguas
// Si desplegamos una nueva versión, Workbox elimina los archivos cacheados de versiones anteriores.
cleanupOutdatedCaches();

// 3. Ruteo para Single-Page Application (SPA)
// Esta regla intercepta todas las navegaciones (ej. a /centros, /mapa).
// En lugar de buscar un archivo en el servidor, siempre responde con el 'index.html' cacheado.
// Esto permite que React Router maneje las rutas en el lado del cliente, crucial para que funcione offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// 4. Estrategia para la API de AppCopio ("Stale-While-Revalidate")
// La mejor estrategia para datos que cambian con frecuencia.
// - Cuando se hace una petición, primero responde con la versión en caché (si existe) -> Rápido y funciona offline.
// - Al mismo tiempo, busca una nueva versión en la red y actualiza el caché para la próxima vez.
registerRoute(
  ({ url }) => url.origin === 'http://localhost:4000' && url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      // Solo cachea respuestas exitosas (ej. status 200).
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      // Limita la vida de los datos cacheados a 30 días.
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        maxEntries: 100, // No más de 100 entradas en este caché
      }),
    ],
  })
);

// 5. (Opcional pero recomendado) Estrategia para assets de terceros (ej. Google Fonts)
// Usamos "CacheFirst": si está en el caché, lo sirve de ahí y nunca va a la red.
// Ideal para archivos que nunca cambian, como las fuentes.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 Año
        maxEntries: 30,
      }),
    ],
  })
);


// --- FASE 3: LÓGICA DE SINCRONIZACIÓN EN SEGUNDO PLANO ---
// (Esta sección la mejoraremos en la siguiente fase)

self.addEventListener('sync', (event: any) => {
  // Usamos un prefijo para poder tener distintos tipos de sincronización en el futuro
  if (event.tag.startsWith('sync-')) {
    event.waitUntil(syncPendingRequests());
  }
});

async function syncPendingRequests() {
  const requests = await getAllRequestsFromOutbox();
  for (const request of requests) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        // OJO: En la fase 3 mejoraremos esto para incluir los headers de autenticación
        headers: { 'Content-Type': 'application/json' }, 
        body: request.body ? JSON.stringify(request.body) : null
      });

      if (!response.ok) {
        console.error(`SW: La petición ${request.id} falló con status ${response.status}`);
        // Si el error es del cliente (4xx) o un conflicto (409), no tiene sentido reintentar.
        if (response.status >= 400 && response.status < 500) {
          await deleteRequestFromOutbox(request.id);
        }
        continue; // No lanzamos error para no bloquear la sincronización de otras peticiones
      }
      
      console.log(`SW: Petición ${request.id} sincronizada con éxito!`);
      await deleteRequestFromOutbox(request.id);

    } catch (error) {
      console.error(`SW: Fallo de red al sincronizar ${request.id}`, error);
      // Si el fetch falla (sin respuesta del servidor), lanzamos el error
      // para que Workbox intente la sincronización de nuevo más tarde.
      throw error;
    }
  }
}