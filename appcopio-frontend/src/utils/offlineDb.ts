// src/utils/offlineDb.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'appcopio-offline-db';
const STORE_NAME = 'sync-requests';

interface AppCopioDB extends DBSchema {
  [STORE_NAME]: {
    key: number;
    value: {
      url: string;
      method: string;
      body: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<AppCopioDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<AppCopioDB>(DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'timestamp', // Usaremos el timestamp como clave única
        });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

export async function addRequestToOutbox(request: Omit<AppCopioDB[typeof STORE_NAME]['value'], 'timestamp'>) {
  const db = await getDb();
  await db.add(STORE_NAME, { ...request, timestamp: Date.now() });
}

export async function getAllRequestsFromOutbox() {
    const db = await getDb();
    return await db.getAllFromIndex(STORE_NAME, 'by-timestamp');
}

export async function deleteRequestFromOutbox(timestamp: number) {
    const db = await getDb();
    await db.delete(STORE_NAME, timestamp);
}