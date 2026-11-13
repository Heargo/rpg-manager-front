import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { JoinedWorld } from '../models/joined-world';
import { JoinedWorldsStorageService } from './joined-worlds-storage.service';

const sheetWorld = {
  attributes: [{ id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
  barAttributes: { life: 'life' },
  levelCurve: { preset: 'growing' },
  maxLevel: 20,
} as JoinedWorld['sheetWorld'];

const harbour: JoinedWorld = {
  worldId: 'w1',
  roomId: 'r1',
  name: 'Harbour',
  hostName: 'Gm',
  invite: 'https://app.example/join#abc',
  lastSeenAt: 1000,
  sheetWorld,
};

describe('JoinedWorldsStorageService', () => {
  let storage: JoinedWorldsStorageService;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    storage = TestBed.inject(JoinedWorldsStorageService);
  });

  it('saves a joined world and lists it back as it was stored', async () => {
    await storage.save(harbour);
    expect(await storage.list()).toEqual([harbour]);
  });

  it('replaces the record of the same world id', async () => {
    await storage.save(harbour);
    await storage.save({ ...harbour, lastSeenAt: 2000, invite: 'https://app.example/join#new' });
    expect(await storage.list()).toEqual([{ ...harbour, lastSeenAt: 2000, invite: 'https://app.example/join#new' }]);
  });

  it('deletes one record and keeps the others', async () => {
    await storage.save(harbour);
    await storage.save({ ...harbour, worldId: 'w2', name: 'Forest' });
    await storage.delete('w1');
    expect((await storage.list()).map((w) => w.worldId)).toEqual(['w2']);
  });
});
