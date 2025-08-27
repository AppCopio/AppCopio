/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_Maps_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

// Extendemos la interfaz ServiceWorkerRegistration que ya existe
// para decirle que también tiene una propiedad 'sync' de tipo SyncManager.
interface ServiceWorkerRegistration {
  readonly sync: SyncManager;
}
