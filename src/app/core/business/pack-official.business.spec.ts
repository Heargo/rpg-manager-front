import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { EXTRA_ITEMS, ExtraPackFake, extraPackService, provideExtraPack } from '../../../testing/extra-pack';
import { PackBusiness } from './pack.business';

const BASE_SPRITES = 101;

function fresh(service: ExtraPackFake): PackBusiness {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideExtraPack(service)] });
  return TestBed.inject(PackBusiness);
}

describe('PackBusiness official packs', () => {
  let service: ExtraPackFake;
  let business: PackBusiness;
  let created: number;
  let revoked: string[];

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    created = 0;
    revoked = [];
    URL.createObjectURL = vi.fn(() => `blob:fake-${++created}`);
    URL.revokeObjectURL = vi.fn((url: string) => void revoked.push(url));
    service = extraPackService();
    business = fresh(service);
  });

  /** Installed pack ids, once the business has loaded its state. */
  const installed = async (b: PackBusiness) => {
    await b.sprites();
    return b.$installed().map((p) => p.id);
  };
  const ids = async (b: PackBusiness) => (await b.sprites()).map((s) => s.id);

  it('lists the registry: Base and the fixture pack', async () => {
    const registry = await business.registry();

    expect(registry.map((p) => p.id)).toEqual(['base', 'extra']);
    expect(registry[1]).toMatchObject({ size: 1234, sprites: 1, languages: ['fr'], author: 'Jane Doe' });
  });

  it('has only Base installed and enabled until a pack is turned on, and fetches nothing for it', async () => {
    const sprites = await business.sprites();

    expect(sprites).toHaveLength(BASE_SPRITES);
    expect(business.$installed().map((p) => p.id)).toEqual(['base']);
    expect(service.loadBlob).not.toHaveBeenCalled();
    expect(service.loadManifest).not.toHaveBeenCalledWith('extra');
  });

  it('enabling downloads the manifest and every listed file, then lists the pack as installed', async () => {
    await business.enable('extra');

    expect(service.loadManifest).toHaveBeenCalledWith('extra');
    expect(service.loadBlob).toHaveBeenCalledWith('packs/extra/sprites/gem.png');
    expect(service.loadJson).toHaveBeenCalledWith('packs/extra/generators/fr/items.json');
    expect(business.$installed().map((p) => p.id)).toEqual(['base', 'extra']);
    expect(business.$installed().find((p) => p.id === 'extra')?.enabled).toBe(true);
  });

  it('serves the enabled pack sprites after Base, with object URLs made from the stored blobs', async () => {
    await business.enable('extra');
    const sprites = await business.sprites();

    expect(sprites).toHaveLength(BASE_SPRITES + 1);
    expect(sprites[0].packId).toBe('base');
    expect(sprites[sprites.length - 1]).toMatchObject({ id: 'gem', packId: 'extra', kind: 'grayscale' });
    expect(sprites[sprites.length - 1].imageUrl).toBe('blob:fake-1');
    await business.sprites();
    expect(created).toBe(1);
  });

  it('reads the word list of a stored pack from the device, not from the network', async () => {
    await business.enable('extra');
    service.loadJson.mockClear();

    expect(await business.wordList('items', 'fr', 'extra')).toEqual(EXTRA_ITEMS);
    expect(service.loadJson).not.toHaveBeenCalled();
  });

  it('a fresh business on the same database lists the pack without any network call', async () => {
    await business.enable('extra');
    const offline = extraPackService({
      loadManifest: vi.fn(async () => {
        throw new Error('offline');
      }),
      loadBlob: vi.fn(async () => {
        throw new Error('offline');
      }),
      loadJson: vi.fn(async () => {
        throw new Error('offline');
      }),
    });
    const second = fresh(offline);

    expect(await ids(second)).toContain('gem');
    expect(second.$installed().map((p) => p.id)).toEqual(['base', 'extra']);
    expect(await second.wordList('items', 'fr', 'extra')).toEqual(EXTRA_ITEMS);
    expect(offline.loadBlob).not.toHaveBeenCalled();
  });

  it('enabling an already downloaded pack does not hit the network again', async () => {
    await business.enable('extra');
    await business.disable('extra');
    service.loadManifest.mockClear();
    service.loadBlob.mockClear();

    await business.enable('extra');

    expect(service.loadManifest).not.toHaveBeenCalled();
    expect(service.loadBlob).not.toHaveBeenCalled();
    expect(await ids(business)).toContain('gem');
  });

  it('disabling takes the sprites out, revokes the object URLs and keeps the files', async () => {
    await business.enable('extra');
    await business.sprites();

    await business.disable('extra');

    expect(await ids(business)).not.toContain('gem');
    expect(revoked).toEqual(['blob:fake-1']);
    const again = fresh(extraPackService());
    expect(await installed(again)).toContain('extra');
    expect(await ids(again)).not.toContain('gem');
    expect(again.$installed().find((p) => p.id === 'extra')?.enabled).toBe(false);
  });

  it('removing deletes the pack and its files from the device', async () => {
    await business.enable('extra');

    await business.remove('extra');

    expect(await ids(business)).not.toContain('gem');
    const again = fresh(extraPackService());
    expect(await ids(again)).toHaveLength(BASE_SPRITES);
    expect(await installed(again)).toEqual(['base']);
    await expect(again.wordList('items', 'fr', 'extra')).rejects.toThrow();
  });

  it('a failed file fetch stores nothing and rejects with the error', async () => {
    const failing = extraPackService({
      loadBlob: vi.fn(async () => {
        throw new Error('network down');
      }),
    });
    const b = fresh(failing);

    await expect(b.enable('extra')).rejects.toThrow(/network down/);

    expect(await installed(b)).toEqual(['base']);
    const again = fresh(extraPackService());
    expect(await installed(again)).toEqual(['base']);
    expect(await ids(again)).toHaveLength(BASE_SPRITES);
  });

  it('an invalid manifest stores nothing and rejects with the validation errors', async () => {
    const bad = extraPackService({
      loadManifest: vi.fn(async () => ({ format: 7, id: 'extra' })),
    });
    const b = fresh(bad);

    await expect(b.enable('extra')).rejects.toThrow(/format/);

    expect(bad.loadBlob).not.toHaveBeenCalled();
    expect(await installed(fresh(extraPackService()))).toEqual(['base']);
  });

  it('Base cannot be disabled or removed', async () => {
    await expect(business.disable('base')).rejects.toThrow();
    await expect(business.remove('base')).rejects.toThrow();

    expect(await ids(business)).toHaveLength(BASE_SPRITES);
  });

  it('rejects enabling a pack that is not in the registry', async () => {
    await expect(business.enable('nope')).rejects.toThrow();
  });
});
