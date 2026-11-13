import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { SpriteSet } from '../models/sprite-set';
import { SpriteSetStorageService } from './sprite-set-storage.service';

const set = (over: Partial<SpriteSet> = {}): SpriteSet => ({
  id: 's1',
  name: 'Blue axe',
  source: { kind: 'library', spriteId: 'axe' },
  config: '{"version":1}',
  updatedAt: 1000,
  ...over,
});

describe('SpriteSetStorageService', () => {
  let storage: SpriteSetStorageService;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    storage = TestBed.inject(SpriteSetStorageService);
  });

  it('saves, lists (latest first), replaces and deletes sets', async () => {
    await storage.save(set());
    await storage.save(set({ id: 's2', name: 'Sword', updatedAt: 2000 }));
    expect((await storage.list()).map((s) => s.id)).toEqual(['s2', 's1']);

    await storage.save(set({ name: 'Red axe', updatedAt: 3000 }));
    const list = await storage.list();
    expect(list.map((s) => s.name)).toEqual(['Red axe', 'Sword']);
    expect(list[0].source).toEqual({ kind: 'library', spriteId: 'axe' });

    await storage.delete('s1');
    expect((await storage.list()).map((s) => s.id)).toEqual(['s2']);
  });
});
