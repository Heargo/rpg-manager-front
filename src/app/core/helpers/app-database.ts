import { DBSchema, IDBPDatabase, openDB } from 'idb';

export const APP_DATABASE_NAME = 'rpg-manager';
/** v1: worlds, images. v2: hostedRoom, joinedRooms. v3: playerCopies. v4: joinedWorlds (replaces joinedRooms). v5: spriteSets. v6: packs, packFiles. */
const APP_DATABASE_VERSION = 6;

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
  /** The room this device is hosting, one record under the key `current`. Typed by the room feature. */
  hostedRoom: { key: string; value: Record<string, unknown> };
  /** Worlds this device joined as a player, by world id. Typed by the play feature. */
  joinedWorlds: { key: string; value: { worldId: string } & Record<string, unknown> };
  /** The player's own copy of their character, by room id. Typed by the character feature. */
  playerCopies: { key: string; value: { roomId: string; character: Record<string, unknown>; queue?: unknown[] } };
  /** Sprites and materials saved in the sprite colorizer, by id. Typed by the sprite feature. */
  spriteSets: { key: string; value: { id: string } & Record<string, unknown> };
  /** Official packs downloaded on this device, by pack id. Typed by `PackStorageService`. */
  packs: { key: string; value: { id: string } & Record<string, unknown> };
  /** The files of downloaded packs, by `<packId>/<path>`. Typed by `PackStorageService`. */
  packFiles: { key: string; value: unknown };
}

export type AppDatabase = IDBPDatabase<AppDatabaseSchema>;

/** Opens (and creates or upgrades) the app database. Each storage service keeps its own connection. */
export function openAppDatabase(name = APP_DATABASE_NAME): Promise<AppDatabase> {
  return openDB<AppDatabaseSchema>(name, APP_DATABASE_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('worlds')) db.createObjectStore('worlds', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('hostedRoom')) db.createObjectStore('hostedRoom');
      // v4: the recent-rooms store is replaced by joinedWorlds. It is no longer in the schema, hence the cast.
      const stores = db.objectStoreNames as unknown as DOMStringList;
      if (stores.contains('joinedRooms')) (db as unknown as IDBDatabase).deleteObjectStore('joinedRooms');
      if (!db.objectStoreNames.contains('joinedWorlds')) db.createObjectStore('joinedWorlds', { keyPath: 'worldId' });
      if (!db.objectStoreNames.contains('playerCopies')) db.createObjectStore('playerCopies', { keyPath: 'roomId' });
      if (!db.objectStoreNames.contains('spriteSets')) db.createObjectStore('spriteSets', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('packs')) db.createObjectStore('packs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('packFiles')) db.createObjectStore('packFiles');
    },
  });
}
