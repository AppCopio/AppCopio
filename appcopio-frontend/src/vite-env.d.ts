
// appcopio-frontend/src/vite-env.d.ts

/// <reference types="vite-plugin-pwa/client" />


/// <reference types="vite/client" />
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

// Extendemos la interfaz ServiceWorkerRegistration que ya existe
// para decirle que también tiene una propiedad 'sync' de tipo SyncManager.
interface ServiceWorkerRegistration {
  readonly sync: SyncManager;
}
