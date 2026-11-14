import { EXTRA_ITEMS, EXTRA_NPCS } from '../../../testing/extra-pack';
import { buildPack as build, DraftSprite, PackDraft } from './pack-draft';
import { validatePack as validate } from './pack';

// Typed loosely: the v2 fields do not exist on the types yet.
const validatePack = (json: unknown): any => validate(json);
const buildPack = (d: PackDraft): { manifest: any; files: Map<string, any> } => build(d) as any;

const KINDS = {
  equipment: { type: 'equipment' },
  weapon: { parent: 'equipment', slot: 'weapon1' },
  sword: { parent: 'weapon' },
};

const TINTS = {
  fire: {
    gradient: [
      { position: 0, color: '#5a0a0a' },
      { position: 1, color: '#fde047' },
    ],
  },
};

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
    },
    generators: { items: EXTRA_ITEMS, npcs: EXTRA_NPCS },
    kinds: KINDS,
    tints: TINTS,
    sprites: [],
    ...over,
  } as PackDraft;
}

const sprite = (over: Partial<DraftSprite> = {}): DraftSprite =>
  ({
    id: 'blade',
    label: 'Lame',
    kinds: ['sword'],
    kind: 'grayscale',
    image: new Blob(['png-bytes'], { type: 'image/png' }),
    ...over,
  }) as DraftSprite;

describe('buildPack in format 2', () => {
  it('writes format 2 with tints and the domains: items with its kinds and texts, the other word lists with texts only', () => {
    const { manifest } = buildPack(draft());

    expect(manifest).toEqual({
      format: 2,
      id: 'mine',
      language: 'fr',
      name: 'Mien',
      description: 'Mon pack',
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      tints: TINTS,
      domains: {
        items: { kinds: KINDS, texts: 'generators/items.json' },
        npcs: { texts: 'generators/npcs.json' },
      },
      sprites: [],
    });
    expect(manifest).not.toHaveProperty('generators');
  });

  it('writes a sprite with domain items and its kinds, and no type or slot', () => {
    const blade = sprite();
    const { manifest, files } = buildPack(draft({ sprites: [blade] }));

    expect(manifest.sprites).toEqual([
      { id: 'blade', label: 'Lame', domain: 'items', kinds: ['sword'], kind: 'grayscale', image: 'sprites/blade.png' },
    ]);
    expect(files.get('sprites/blade.png')).toBe(blade.image);
  });

  it('lays out a masked sprite materials as before', () => {
    const { manifest, files } = buildPack(
      draft({ sprites: [sprite({ kind: 'masked', materials: '{"version":1,"materials":[]}' })] }),
    );

    expect(manifest.sprites[0]).toMatchObject({
      domain: 'items',
      kinds: ['sword'],
      materials: 'sprites/blade.json',
    });
    expect(files.get('sprites/blade.json')).toEqual({ version: 1, materials: [] });
  });

  it('writes the word lists as files at the paths the domains point to', () => {
    const { manifest, files } = buildPack(draft());

    expect(manifest.domains?.items?.texts).toBe('generators/items.json');
    expect(manifest.domains?.npcs?.texts).toBe('generators/npcs.json');
    expect(files.get('generators/items.json')).toEqual(EXTRA_ITEMS);
    expect(files.get('generators/npcs.json')).toEqual(EXTRA_NPCS);
  });

  it('leaves out the domain of a word list the draft does not have', () => {
    const { manifest } = buildPack(draft({ generators: { items: EXTRA_ITEMS, skills: undefined } }));

    expect(Object.keys(manifest.domains ?? {})).toEqual(['items']);
  });

  it('produces a manifest that passes validatePack', () => {
    const { manifest } = buildPack(draft({ sprites: [sprite()] }));

    const result = validatePack(manifest);
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.warnings).toEqual([]);
  });
});
