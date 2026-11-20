import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { openWorldWithPacks } from '../../../../testing/active-packs';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { ImageBusiness } from '../../../core/business/image.business';
import { LanguageBusiness } from '../../../core/business/language.business';
import { ImageStorageService } from '../../../core/services/image-storage.service';
import { PackService } from '../../../core/services/pack.service';
import { gray } from '../helpers/sprite-test-images';
import { SpriteFileService } from '../services/sprite-file.service';
import { SpriteSetStorageService } from '../services/sprite-set-storage.service';
import { RandomItemImageBusiness } from './random-item-image.business';

const disk = (path: string): any => JSON.parse(readFileSync(join(process.cwd(), 'public', path), 'utf8'));

/** `PackService` faked on the real built-in packs of `public/packs`, whatever their ids. */
const onDisk = {
  provide: PackService,
  useValue: {
    loadManifest: async (id: string) => disk(`packs/${id}/pack.json`),
    loadRegistry: async () => disk('packs/index.json'),
    loadBlob: async () => new Blob(['x']),
    loadJson: async (url: string) => disk(url),
  },
};

function setup(worldPacks: string[]) {
  globalThis.indexedDB = new IDBFactory();
  const sprite = () => gray(4, 1, [10, 10, 220, 220]);
  const files = {
    fetchImage: vi.fn(async () => sprite()),
    fetchText: vi.fn(async () => ''),
    fetchBlob: vi.fn(async () => new Blob(['x'])),
    decode: vi.fn(async () => sprite()),
    encodePng: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: SpriteFileService, useValue: files },
      provideTestTranslations(),
      onDisk,
      { provide: SpriteSetStorageService, useValue: { list: async () => [] } },
      { provide: ImageBusiness, useValue: { storeUpload: vi.fn(async () => 'stored-1') } },
      { provide: ImageStorageService, useValue: { get: vi.fn(async () => new Blob(['x'])) } },
    ],
  });
  TestBed.inject(LanguageBusiness).setLanguage('fr');
  return openWorldWithPacks(worldPacks).then(() => ({ business: TestBed.inject(RandomItemImageBusiness), files }));
}

const urls = (files: { fetchImage: ReturnType<typeof vi.fn> }) =>
  files.fetchImage.mock.calls.map((c) => String((c as unknown[])[0]));

const KINDS = [
  { kind: 'axe', type: 'equipment', slot: 'weapon1' },
  { kind: 'ring', type: 'equipment', slot: 'ring' },
  { kind: 'helm', type: 'equipment', slot: 'head' },
  { kind: 'potion', type: 'consumable', slot: 'none' },
  { kind: 'key', type: 'item', slot: 'none' },
] as const;

describe('RandomItemImageBusiness with the neutral base-assets pack', () => {
  it.each(KINDS)('draws the $kind sprite from base-assets with Base FR and base-assets active', async (look) => {
    const { business, files } = await setup(['base-fr', 'base-assets']);

    await business.create({ name: 'Objet', ...look }, 'seed');

    expect(urls(files)).toHaveLength(1);
    expect(urls(files)[0]).toMatch(new RegExp(`^packs/base-assets/sprites/${look.kind}(_\\d+)?\\.png$`));
  });

  it('gives every sprite kind of base-assets a sprite of that kind', async () => {
    const { business, files } = await setup(['base-fr', 'base-assets']);
    const kinds = [...new Set(disk('packs/base-assets/pack.json').sprites.flatMap((s: any) => s.kinds))] as string[];

    for (const kind of kinds) await business.create({ name: 'Objet', type: 'item', slot: 'none', kind }, 'seed');

    expect(urls(files).every((u) => u.startsWith('packs/base-assets/sprites/'))).toBe(true);
    expect(urls(files)).toHaveLength(kinds.length);
  });

  it('finds no sprite with Base FR alone', async () => {
    const { business } = await setup(['base-fr']);

    await expect(business.create({ name: 'Hache', type: 'equipment', slot: 'weapon1', kind: 'axe' }, 'seed')).rejects.toThrow('No sprite');
  });
});
