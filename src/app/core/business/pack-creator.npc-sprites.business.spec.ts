import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { unzipSync } from 'fflate';
import { EXTRA_ITEMS } from '../../../testing/extra-pack';
import { neonProviders, neonWorld } from '../../../testing/unofficial-pack';
import { provideTestTranslations } from '../../../testing/test-providers';
import { PackDraft } from '../packs/pack-draft';
import { ImageProcessingService } from '../services/image-processing.service';
import { PackCreatorBusiness } from './pack-creator.business';

const png = () => new Blob(['png-bytes'], { type: 'image/png' });

function setup() {
  globalThis.indexedDB = new IDBFactory();
  let created = 0;
  URL.createObjectURL = vi.fn(() => `blob:fake-${++created}`);
  URL.revokeObjectURL = vi.fn();
  const fakes = neonProviders(neonWorld());
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      ...fakes.providers,
      provideTestTranslations(),
      {
        provide: ImageProcessingService,
        useValue: {
          dimensions: vi.fn(async () => ({ width: 128, height: 128 })),
        },
      },
    ],
  });
  return { creator: TestBed.inject(PackCreatorBusiness) };
}

async function validDraft(
  creator: PackCreatorBusiness,
  over: Partial<PackDraft> = {},
): Promise<PackDraft> {
  const draft = await creator.createDraft();
  const saved: PackDraft = {
    ...draft,
    details: {
      id: 'mine',
      language: 'fr',
      name: 'Mien',
      description: 'Mon pack',
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    generators: { items: EXTRA_ITEMS },
    ...over,
  };
  await creator.saveDraft(saved);
  return saved;
}

const manifestOf = async (creator: PackCreatorBusiness, id: string) =>
  JSON.parse(
    new TextDecoder().decode(
      unzipSync((await creator.exportZip(id)).bytes)['pack.json'],
    ),
  );

const wolf = {
  id: 'wolf-1',
  label: 'Loup',
  domain: 'npcs',
  kinds: ['wolf'],
  kind: 'grayscale',
} as const;

describe('PackCreatorBusiness NPC sprites', () => {
  it('writes the sprite domain in the built manifest, items by default', async () => {
    const { creator } = setup();
    const draft = await validDraft(creator);
    await creator.addPng(draft.id, png(), wolf as never);
    await creator.addPng(draft.id, png(), {
      id: 'spark',
      label: 'Etincelle',
      kinds: ['item'],
      kind: 'grayscale',
    });

    const manifest = await manifestOf(creator, draft.id);

    expect(
      manifest.sprites.map((s: { id: string; domain: string }) => [
        s.id,
        s.domain,
      ]),
    ).toEqual([
      ['wolf-1', 'npcs'],
      ['spark', 'items'],
    ]);
  });

  it('refuses an NPC sprite with a kind that is not an NPC kind', async () => {
    const { creator } = setup();
    const draft = await validDraft(creator);

    await expect(
      creator.addPng(draft.id, png(), {
        ...wolf,
        id: 'bad',
        kinds: ['sword'],
      } as never),
    ).rejects.toBeDefined();
    expect((await creator.getDraft(draft.id))?.sprites).toEqual([]);
  });

  it('refuses an items sprite with an NPC kind', async () => {
    const { creator } = setup();
    const draft = await validDraft(creator);

    await expect(
      creator.addPng(draft.id, png(), {
        id: 'bad',
        label: 'Mauvais',
        domain: 'items',
        kinds: ['wolf'],
        kind: 'grayscale',
      } as never),
    ).rejects.toBeDefined();
  });

  it('keeps the sprite domain when the pack is copied', async () => {
    const { creator } = setup();
    const draft = await validDraft(creator);
    await creator.addPng(draft.id, png(), wolf as never);
    await creator.install(draft.id);

    const copy = await creator.duplicate('mine');

    expect(copy.sprites[0]).toMatchObject({ id: 'wolf-1', domain: 'npcs' });
  });
});
