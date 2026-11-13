import { EXTRA_ITEMS, EXTRA_NPCS } from '../../../testing/extra-pack';
import { buildPack, DraftSprite, PackDraft, slugifyPackId } from './pack-draft';
import { validatePack } from './pack';

const MATERIALS = '{"version":1,"materials":[]}';

function draft(over: Partial<PackDraft> = {}): PackDraft {
  return {
    id: 'draft-1',
    updatedAt: 1000,
    details: {
      id: 'mine',
      name: { en: 'Mine', fr: 'Mien' },
      description: { en: 'My pack', fr: 'Mon pack' },
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      homepage: 'https://example.com/mine',
    },
    generators: { fr: { items: EXTRA_ITEMS, npcs: EXTRA_NPCS } },
    sprites: [],
    ...over,
  };
}

const sprite = (over: Partial<DraftSprite> = {}): DraftSprite => ({
  id: 'spark',
  en: 'Spark',
  fr: 'Etincelle',
  type: 'item',
  slot: 'none',
  kind: 'grayscale',
  image: new Blob(['png-bytes'], { type: 'image/png' }),
  ...over,
});

describe('slugifyPackId', () => {
  it('lowercases, removes accents and turns non-alphanumerics into dashes', () => {
    expect(slugifyPackId('Épée de Feu!')).toBe('epee-de-feu');
  });

  it('trims and collapses separators', () => {
    expect(slugifyPackId('  Hello   World  ')).toBe('hello-world');
    expect(slugifyPackId('A--B__c')).toBe('a-b-c');
  });

  it('gives an empty id for an empty name', () => {
    expect(slugifyPackId('')).toBe('');
  });
});

describe('buildPack', () => {
  it('builds the manifest from the details, in format 1', () => {
    const { manifest } = buildPack(draft());

    expect(manifest).toEqual({
      format: 1,
      id: 'mine',
      name: { en: 'Mine', fr: 'Mien' },
      description: { en: 'My pack', fr: 'Mon pack' },
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      homepage: 'https://example.com/mine',
      generators: { fr: { items: 'generators/fr/items.json', npcs: 'generators/fr/npcs.json' } },
      sprites: [],
    });
  });

  it('leaves out the homepage when empty, and the empty generator slots and languages', () => {
    const d = draft({ generators: { en: {}, fr: { items: EXTRA_ITEMS, skills: undefined } } });
    d.details.homepage = '';

    const { manifest, files } = buildPack(d);

    expect(manifest).not.toHaveProperty('homepage');
    expect(manifest.generators).toEqual({ fr: { items: 'generators/fr/items.json' } });
    expect([...files.keys()]).toEqual(['generators/fr/items.json']);
  });

  it('lays out word lists, sprite images and materials in the documented folders', () => {
    const grayscale = sprite();
    const masked = sprite({ id: 'glow', kind: 'masked', type: 'equipment', slot: 'weapon1', materials: MATERIALS });

    const { manifest, files } = buildPack(draft({ sprites: [grayscale, masked] }));

    expect(manifest.sprites).toEqual([
      { id: 'spark', en: 'Spark', fr: 'Etincelle', type: 'item', slot: 'none', kind: 'grayscale', image: 'sprites/spark.png' },
      {
        id: 'glow', en: 'Spark', fr: 'Etincelle', type: 'equipment', slot: 'weapon1', kind: 'masked',
        image: 'sprites/glow.png', materials: 'sprites/glow.json',
      },
    ]);
    expect([...files.keys()].sort()).toEqual([
      'generators/fr/items.json',
      'generators/fr/npcs.json',
      'sprites/glow.json',
      'sprites/glow.png',
      'sprites/spark.png',
    ]);
    expect(files.get('generators/fr/items.json')).toEqual(EXTRA_ITEMS);
    expect(files.get('sprites/spark.png')).toBe(grayscale.image);
    expect(files.get('sprites/glow.json')).toEqual({ version: 1, materials: [] });
  });

  it('gives a colored or grayscale sprite no materials entry', () => {
    const { manifest } = buildPack(draft({ sprites: [sprite({ kind: 'colored', materials: MATERIALS })] }));

    expect(manifest.sprites[0]).not.toHaveProperty('materials');
  });

  it('produces a manifest that passes validatePack', () => {
    const { manifest } = buildPack(draft({ sprites: [sprite()] }));

    expect(validatePack(manifest).ok).toBe(true);
  });
});
