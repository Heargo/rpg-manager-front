import { TestBed } from '@angular/core/testing';
import { JoinedWorld } from '../models/joined-world';
import { JoinedWorldsStorageService } from '../services/joined-worlds-storage.service';
import { JoinedWorldsBusiness } from './joined-worlds.business';

const sheetWorld = {
  attributes: [],
  barAttributes: {},
  levelCurve: { preset: 'growing' },
  maxLevel: 20,
} as unknown as JoinedWorld['sheetWorld'];

const entry = {
  worldId: 'w1',
  roomId: 'r1',
  name: 'Harbour',
  hostName: 'Gm',
  invite: 'https://app.example/join#abc',
  sheetWorld,
};

describe('JoinedWorldsBusiness', () => {
  let stored: Map<string, JoinedWorld>;
  let business: JoinedWorldsBusiness;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    stored = new Map();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: JoinedWorldsStorageService,
          useValue: {
            list: vi.fn(async () => [...stored.values()]),
            save: vi.fn(async (world: JoinedWorld) => void stored.set(world.worldId, world)),
            delete: vi.fn(async (id: string) => void stored.delete(id)),
          },
        },
      ],
    });
    business = TestBed.inject(JoinedWorldsBusiness);
  });

  afterEach(() => vi.useRealTimers());

  it('records a joined world with the time it was seen, and persists it', async () => {
    await business.record(entry);
    expect(business.$worlds()).toEqual([{ ...entry, lastSeenAt: 1000 }]);
    expect(stored.get('w1')).toEqual({ ...entry, lastSeenAt: 1000 });
  });

  it('updates the same world on rejoin instead of adding a second one', async () => {
    await business.record(entry);
    vi.setSystemTime(5000);
    await business.record({ ...entry, invite: 'https://app.example/join#fresh', hostName: 'Gm2' });
    expect(business.$worlds()).toEqual([
      { ...entry, invite: 'https://app.example/join#fresh', hostName: 'Gm2', lastSeenAt: 5000 },
    ]);
    expect(stored.size).toBe(1);
  });

  it('lists the most recently seen world first', async () => {
    await business.record(entry);
    vi.setSystemTime(2000);
    await business.record({ ...entry, worldId: 'w2', name: 'Forest' });
    expect(business.$worlds().map((w) => w.name)).toEqual(['Forest', 'Harbour']);
  });

  it('loads the saved worlds from storage', async () => {
    stored.set('w9', { ...entry, worldId: 'w9', name: 'Saved', lastSeenAt: 10 });
    await business.load();
    expect(business.$worlds().map((w) => w.name)).toEqual(['Saved']);
  });

  it('removes a world from the list and from storage', async () => {
    await business.record(entry);
    await business.remove('w1');
    expect(business.$worlds()).toEqual([]);
    expect(stored.size).toBe(0);
  });
});
