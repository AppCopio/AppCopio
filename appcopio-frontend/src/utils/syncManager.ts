// src/utils/syncManager.ts

/**
 * Registra una etiqueta de sincronización en segundo plano con el Service Worker.
 * @param {string} tag - La etiqueta única para el evento de sincronización.
 */
export const registerForSync = (tag: string) => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then(swRegistration => {
        // La interfaz ServiceWorkerRegistration fue extendida en vite-env.d.ts
        // para reconocer la propiedad 'sync'.
        return swRegistration.sync.register(tag);
      })
      .then(() => {
        console.log(`Sincronización en segundo plano registrada para la etiqueta: ${tag}`);
      })
      .catch(err => {
        console.error(`Error al registrar la sincronización para la etiqueta: ${tag}`, err);
      });
  }
};