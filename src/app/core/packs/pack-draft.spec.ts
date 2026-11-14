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
      language: 'fr',
      name: 'Mien',
      description: 'Mon pack',
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      homepage: 'https://example.com/mine',
    },
    generators: { items: EXTRA_ITEMS, npcs: EXTRA_NPCS },
    sprites: [],
    ...over,
  };
}

const sprite = (over: Partial<DraftSprite> = {}): DraftSprite => ({
  id: 'spark',
  label: 'Etincelle',
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
      language: 'fr',
      name: 'Mien',
      description: 'Mon pack',
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      homepage: 'https://example.com/mine',
      generators: { items: 'generators/items.json', npcs: 'generators/npcs.json' },
      sprites: [],
    });
  });

  it('leaves out the homepage when empty, and the empty generator slots', () => {
    const d = draft({ generators: { items: EXTRA_ITEMS, skills: undefined } });
    d.details.homepage = '';

    const { manifest, files } = buildPack(d);

    expect(manifest).not.toHaveProperty('homepage');
    expect(manifest.generators).toEqual({ items: 'generators/items.json' });
    expect([...files.keys()]).toEqual(['generators/items.json']);
  });

  it('lays out word lists, sprite images and materials in the documented folders', () => {
    const grayscale = sprite();
    const masked = sprite({ id: 'glow', kind: 'masked', type: 'equipment', slot: 'weapon1', materials: MATERIALS });

    const { manifest, files } = buildPack(draft({ sprites: [grayscale, masked] }));

    expect(manifest.sprites).toEqual([
      { id: 'spark', label: 'Etincelle', type: 'item', slot: 'none', kind: 'grayscale', image: 'sprites/spark.png' },
      {
        id: 'glow', label: 'Etincelle', type: 'equipment', slot: 'weapon1', kind: 'masked',
        image: 'sprites/glow.png', materials: 'sprites/glow.json',
      },
    ]);
    expect([...files.keys()].sort()).toEqual([
      'generators/items.json',
      'generators/npcs.json',
      'sprites/glow.json',
      'sprites/glow.png',
      'sprites/spark.png',
    ]);
    expect(files.get('generators/items.json')).toEqual(EXTRA_ITEMS);
    expect(files.get('sprites/spark.png')).toBe(grayscale.image);
    expect(files.get('sprites/glow.json')).toEqual({ version: 1, materials: [] });
  });

  it('gives a colored or grayscale sprite no materials entry', () => {
    const { manifest } = buildPack(draft({ sprites: [sprite({ kind: 'colored', materials: MATERIALS })] }));

    expect(manifest.sprites[0]).not.toHaveProperty('materials');
  });

  it('writes the draft language into the manifest, for an English draft too', () => {
    const d = draft({ generators: { items: EXTRA_ITEMS } });
    d.details.language = 'en';
    d.details.name = 'Mine';

    const { manifest } = buildPack(d);

    expect(manifest.language).toBe('en');
    expect(manifest.name).toBe('Mine');
    expect(validatePack(manifest).ok).toBe(true);
  });

  it('keeps one label per sprite and no en or fr field', () => {
    const { manifest } = buildPack(draft({ sprites: [sprite()] }));

    expect(manifest.sprites[0]).toMatchObject({ label: 'Etincelle' });
    expect(manifest.sprites[0]).not.toHaveProperty('en');
    expect(manifest.sprites[0]).not.toHaveProperty('fr');
  });

  it('produces a manifest that passes validatePack', () => {
    const { manifest } = buildPack(draft({ sprites: [sprite()] }));

    expect(validatePack(manifest).ok).toBe(true);
  });
});
