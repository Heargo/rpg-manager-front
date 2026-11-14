import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import { APP_DATABASE_NAME, openAppDatabase } from './app-database';

/** A device that ran the app at database version 7, with packs and drafts in the two-language format. */
async function deviceWithOldPacks(): Promise<void> {
  const old = await openDB(APP_DATABASE_NAME, 7, {
    upgrade(db) {
      db.createObjectStore('worlds', { keyPath: 'id' });
      db.createObjectStore('images', { keyPath: 'id' });
      db.createObjectStore('hostedRoom');
      db.createObjectStore('joinedWorlds', { keyPath: 'worldId' });
      db.createObjectStore('playerCopies', { keyPath: 'roomId' });
      db.createObjectStore('spriteSets', { keyPath: 'id' });
      db.createObjectStore('packs', { keyPath: 'id' });
      db.createObjectStore('packFiles');
      db.createObjectStore('packDrafts', { keyPath: 'id' });
    },
  });
  await old.put('worlds', { id: 'w1', name: 'My world' });
  await old.put('packs', {
    id: 'neon',
    manifest: { id: 'neon', name: { en: 'Neon', fr: 'Neon' }, generators: { fr: {} }, sprites: [] },
    source: { kind: 'local' },
    enabled: true,
  });
  await old.put('packFiles', { kind: 'json', value: {} }, 'neon/generators/fr/items.json');
  await old.put('packDrafts', { id: 'draft-1', details: { id: 'mine', name: { en: 'Mine', fr: 'Mien' } } });
  old.close();
}

describe('app database upgrade from the two-language pack format', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it('drops the stored packs, their files and the drafts, and keeps the rest', async () => {
    await deviceWithOldPacks();

    const db = await openAppDatabase();

    expect(await db.getAll('packs')).toEqual([]);
    expect(await db.getAll('packFiles')).toEqual([]);
    expect(await db.getAll('packDrafts')).toEqual([]);
    expect(await db.getAll('worlds')).toEqual([{ id: 'w1', name: 'My world' }]);
    db.close();
  });
});
