import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import {
  EXTRA_ITEMS,
  EXTRA_MANIFEST,
  ExtraPackFake,
  extraPackService,
  provideExtraPack,
} from '../../../testing/extra-pack';
import { PackBusiness } from './pack.business';

function fresh(service: ExtraPackFake): PackBusiness {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideExtraPack(service)] });
  return TestBed.inject(PackBusiness);
}

describe('PackBusiness concurrency (K03 review fixes)', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    let created = 0;
    URL.createObjectURL = vi.fn(() => `blob:fake-${++created}`);
    URL.revokeObjectURL = vi.fn();
  });

  it('two concurrent sprites() calls both get full object URLs', async () => {
    const first = extraPackService();
    const business = fresh(first);
    await business.enable('extra');
    const reloaded = fresh(extraPackService());

    const [a, b] = await Promise.all([reloaded.sprites(), reloaded.sprites()]);

    for (const list of [a, b]) {
      const gem = list.find((s) => s.id === 'gem')!;
      expect(gem.imageUrl).toMatch(/^blob:/);
    }
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('two concurrent enable() calls of an official pack download it once', async () => {
    globalThis.indexedDB = new IDBFactory();
    const service = extraPackService();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideExtraPack(service)] });
    const business = TestBed.inject(PackBusiness);

    await Promise.all([business.enable('extra'), business.enable('extra')]);

    expect(
      service.loadManifest.mock.calls.filter(([id]) => id === 'extra'),
    ).toHaveLength(1);
    expect(service.loadBlob).toHaveBeenCalledTimes(1);
    expect(business.$installed().map((p) => p.id)).toEqual(['base', 'extra']);
  });

  it('an official download fetches at most 4 files at a time', async () => {
    globalThis.indexedDB = new IDBFactory();
    let now = 0;
    let max = 0;
    const slow = async <T>(value: T): Promise<T> => {
      max = Math.max(max, ++now);
      await new Promise((resolve) => setTimeout(resolve, 5));
      now--;
      return value;
    };
    const manifest = {
      ...structuredClone(EXTRA_MANIFEST),
      sprites: Array.from({ length: 12 }, (_, i) => ({
        id: `g${i}`,
        en: 'G',
        fr: 'G',
        type: 'item',
        slot: 'none',
        kind: 'grayscale',
        image: `sprites/g${i}.png`,
      })),
    };
    const base = extraPackService();
    const service = extraPackService({
      loadManifest: vi.fn(async (id: string) =>
        id === 'extra'
          ? structuredClone(manifest)
          : (base.loadManifest as (id: string) => Promise<unknown>)(id),
      ),
      loadBlob: vi.fn(() => slow(new Blob(['x'], { type: 'image/png' }))),
      loadJson: vi.fn((url: string) =>
        slow(url.endsWith('items.json') ? EXTRA_ITEMS : {}),
      ),
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideExtraPack(service)] });

    await TestBed.inject(PackBusiness).enable('extra');

    expect(max).toBeGreaterThan(1);
    expect(max).toBeLessThanOrEqual(4);
  });
});
