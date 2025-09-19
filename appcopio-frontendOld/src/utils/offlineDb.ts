// src/utils/offlineDb.ts
import { openDB, DBSchema } from 'idb';

interface AppDBSchema extends DBSchema {
  outbox: {
    key: number;
    value: {
      id: number;
      url: string;
      method: string;
      body: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

// Se incrementa la versión a 2 para forzar la actualización del esquema.
const dbPromise = openDB<AppDBSchema>('appcopio-db', 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 2) {
      // Si la base de datos vieja existe (versión < 2), la borramos para empezar de cero.
      if (db.objectStoreNames.contains('outbox')) {
        db.deleteObjectStore('outbox');
      }
      const store = db.createObjectStore('outbox', {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('by-timestamp', 'timestamp');
    }
  },
});

export const addRequestToOutbox = async (request: any) => {
  const db = await dbPromise;
  await db.add('outbox', { ...request, timestamp: Date.now() });
};

export const getAllRequestsFromOutbox = async () => {
  const db = await dbPromise;
  return db.getAllFromIndex('outbox', 'by-timestamp');
};

export const deleteRequestFromOutbox = async (id: number) => {
  const db = await dbPromise;
  await db.delete('outbox', id);
};