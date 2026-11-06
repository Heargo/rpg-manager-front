import { DBSchema, IDBPDatabase, openDB } from 'idb';

export const APP_DATABASE_NAME = 'rpg-manager';
const APP_DATABASE_VERSION = 1;

export interface StoredImage {
  /** SHA-256 of the bytes, hex. */
  id: string;
  /** Raw bytes rather than a Blob: structured-clone safe everywhere (Safari has had trouble storing Blobs). */
  bytes: ArrayBuffer;
  type: string;
}

/**
 * The app's IndexedDB schema. `worlds` values are typed by the world feature; kept as `unknown` here so core
 * doesn't depend on a feature.
 */
export interface AppDatabaseSchema extends DBSchema {
  worlds: { key: string; value: { id: string } & Record<string, unknown> };
  images: { key: string; value: StoredImage };
}

export type AppDatabase = IDBPDatabase<AppDatabaseSchema>;

/** Opens (and creates or upgrades) the app database. Each storage service keeps its own connection. */
export function openAppDatabase(name = APP_DATABASE_NAME): Promise<AppDatabase> {
  return openDB<AppDatabaseSchema>(name, APP_DATABASE_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('worlds')) db.createObjectStore('worlds', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' });
    },
  });
}
