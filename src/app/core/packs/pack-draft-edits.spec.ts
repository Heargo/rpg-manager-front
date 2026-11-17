import { validateCommonTexts } from '../generators/common-texts';
import { validateItemWordList } from '../generators/word-list';
import { validatePack } from '../packs/pack';
import { buildPack, DraftSprite, PackDraft } from './pack-draft';
import {
  removeKind,
  removeParam,
  removeTint,
  renameKind,
  setKind,
  setKindTexts,
  setParam,
  setTemplates,
  setTint,
  setTintTexts,
} from './pack-draft-edits';

const GRADIENT = [
  { position: 0, color: '#5a0a0a' },
  { position: 0.5, color: '#c2410c' },
  { position: 1, color: '#fde047' },
];

function draft(over: Record<string, unknown> = {}): PackDraft {
  return {
    id: 'draft-1',
    updatedAt: 1000,
    details: {
      id: 'mine',
      language: 'en',
      name: 'Mine',
      description: 'My pack',
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    generators: {},
    kinds: {},
    tints: {},
    sprites: [],
    ...over,
  } as PackDraft;
}

const neutral = (over: Record<string, unknown> = {}): PackDraft => {
  const d = draft(over);
  return { ...d, details: { ...d.details, language: undefined } } as unknown as PackDraft;
};

const items = (d: PackDraft): any => d.generators.items;
const common = (d: PackDraft): any => d.common;

const sprite = (kinds: string[]): DraftSprite => ({
  id: 'blade',
  label: 'Blade',
  kinds,
  kind: 'grayscale',
  image: new Blob(['png-bytes'], { type: 'image/png' }),
});

describe('pack draft edits: kinds', () => {
  it('setKind adds a kind with the given fields and leaves the input draft alone', () => {
    const before = draft();

    const after = setKind(before, 'staff', { parent: 'weapon' });

    expect(after.kinds).toEqual({ staff: { parent: 'weapon' } });
    expect(before.kinds).toEqual({});
  });

  it('setKind changes the given fields only, and an explicit undefined clears one', () => {
    const start = draft({ kinds: { orb: { type: 'item' } } });

    const sloted = setKind(start, 'orb', { slot: 'hand' });
    expect(sloted.kinds['orb']).toEqual({ type: 'item', slot: 'hand' });

    const reparented = setKind(sloted, 'orb', { parent: 'weapon', type: undefined, slot: undefined });
    expect(reparented.kinds['orb']).toEqual({ parent: 'weapon' });
  });

  it('renameKind moves the kind, its texts, the parents that point at it and the sprites that use it', () => {
    const start = draft({
      kinds: { staff: { parent: 'weapon' }, quarterstaff: { parent: 'staff' } },
      generators: {
        items: { version: 2, kinds: { staff: { nouns: [{ text: 'Staff' }] } } },
      },
      sprites: [sprite(['staff', 'weapon'])],
    });

    const after = renameKind(start, 'staff', 'rod');

    expect(after.kinds).toEqual({ rod: { parent: 'weapon' }, quarterstaff: { parent: 'rod' } });
    expect(items(after).kinds).toEqual({ rod: { nouns: [{ text: 'Staff' }] } });
    expect(after.sprites[0].kinds).toEqual(['rod', 'weapon']);
  });

  it('removeKind removes the kind, its texts and its references in the sprites', () => {
    const start = draft({
      kinds: { staff: { parent: 'weapon' }, mace: { parent: 'weapon' } },
      generators: {
        items: {
          version: 2,
          kinds: { staff: { nouns: [{ text: 'Staff' }] }, mace: { nouns: [{ text: 'Mace' }] } },
        },
      },
      sprites: [sprite(['staff', 'mace'])],
    });

    const after = removeKind(start, 'staff');

    expect(after.kinds).toEqual({ mace: { parent: 'weapon' } });
    expect(Object.keys(items(after).kinds)).toEqual(['mace']);
    expect(after.sprites[0].kinds).toEqual(['mace']);
  });

  it('setKindTexts writes nouns, descriptions and names in a version 2 word list', () => {
    const after = setKindTexts(draft(), 'staff', {
      nouns: [{ text: 'Staff', gender: 'm' }],
      descriptions: ['A long stick.'],
      names: { rare: ['{base} of {suffix}'] },
    });

    expect(items(after)).toEqual({
      version: 2,
      kinds: {
        staff: {
          nouns: [{ text: 'Staff', gender: 'm' }],
          descriptions: ['A long stick.'],
          names: { rare: ['{base} of {suffix}'] },
        },
      },
    });
  });

  it('setKindTexts changes only the fields it is given', () => {
    const start = setKindTexts(draft(), 'staff', { nouns: [{ text: 'Staff' }] });

    const after = setKindTexts(start, 'staff', { descriptions: ['A long stick.'] });

    expect(items(after).kinds.staff).toEqual({ nouns: [{ text: 'Staff' }], descriptions: ['A long stick.'] });
  });

  it('prunes what becomes empty: an empty list removes the field, then the kind, then the kinds object', () => {
    const start = setKindTexts(draft(), 'staff', { nouns: [{ text: 'Staff' }], descriptions: ['A stick.'] });

    const noNouns = setKindTexts(start, 'staff', { nouns: [] });
    expect(items(noNouns).kinds.staff).toEqual({ descriptions: ['A stick.'] });

    const nothing = setKindTexts(noNouns, 'staff', { descriptions: [], names: { rare: [] } });
    expect(items(nothing)).not.toHaveProperty('kinds');
  });
});

describe('pack draft edits: tints', () => {
  it('setTint writes the gradient on the manifest side', () => {
    const after = setTint(draft(), 'fire', GRADIENT);

    expect(after.tints).toEqual({ fire: { gradient: GRADIENT } });
  });

  it('setTintTexts writes adjectives, suffixes and descriptions in the word list', () => {
    const after = setTintTexts(draft(), 'fire', {
      adjectives: { common: ['Smoldering'], rare: [{ m: 'Ardent', f: 'Ardente' }] },
      suffixes: { rare: ['of embers'] },
      descriptions: ['Warm to the touch.'],
    });

    expect(items(after).tints).toEqual({
      fire: {
        adjectives: { common: ['Smoldering'], rare: [{ m: 'Ardent', f: 'Ardente' }] },
        suffixes: { rare: ['of embers'] },
        descriptions: ['Warm to the touch.'],
      },
    });
  });

  it('removeTint removes the gradient and the texts, and prunes the emptied tints object', () => {
    const start = setTintTexts(setTint(draft(), 'fire', GRADIENT), 'fire', { adjectives: { common: ['Hot'] } });

    const after = removeTint(start, 'fire');

    expect(after.tints).toEqual({});
    expect(items(after)).not.toHaveProperty('tints');
  });

  it('an emptied adjectives list prunes its tint', () => {
    const start = setTintTexts(draft(), 'fire', { adjectives: { common: ['Hot'] } });

    const after = setTintTexts(start, 'fire', { adjectives: { common: [] } });

    expect(items(after)).not.toHaveProperty('tints');
  });
});

describe('pack draft edits: params and templates', () => {
  it('setParam writes the entries in the shared common texts', () => {
    const after = setParam(draft(), 'maker', ['a blacksmith', 'a hermit']);

    expect(common(after)).toEqual({ version: 2, params: { maker: ['a blacksmith', 'a hermit'] } });
  });

  it('removeParam removes it, and the last one removes the common texts', () => {
    const start = setParam(setParam(draft(), 'maker', ['a hermit']), 'owner', ['a queen']);

    const one = removeParam(start, 'maker');
    expect(common(one).params).toEqual({ owner: ['a queen'] });

    expect(removeParam(one, 'owner').common).toBeUndefined();
  });

  it('setParam with no entries removes the param', () => {
    const start = setParam(draft(), 'maker', ['a hermit']);

    expect(setParam(start, 'maker', []).common).toBeUndefined();
  });

  it('setTemplates writes the name templates of a rarity, and an empty list removes them', () => {
    const start = setTemplates(draft(), 'rare', ['{adjective} {base}', '{base} {suffix}']);
    expect(items(start).templates).toEqual({ rare: ['{adjective} {base}', '{base} {suffix}'] });

    expect(items(setTemplates(start, 'rare', []))).not.toHaveProperty('templates');
  });
});

describe('pack draft edits: neutral draft', () => {
  it('ignores every text edit', () => {
    const start = neutral();

    expect(setKindTexts(start, 'staff', { nouns: [{ text: 'Staff' }] })).toEqual(start);
    expect(setTintTexts(start, 'fire', { suffixes: { rare: ['of embers'] } })).toEqual(start);
    expect(setParam(start, 'maker', ['a hermit'])).toEqual(start);
    expect(setTemplates(start, 'rare', ['{base}'])).toEqual(start);
  });

  it('still edits kinds and gradients', () => {
    const after = setTint(setKind(neutral(), 'orb', { type: 'item' }), 'fire', GRADIENT);

    expect(after.kinds).toEqual({ orb: { type: 'item' } });
    expect(after.tints).toEqual({ fire: { gradient: GRADIENT } });
  });
});

describe('pack draft edits: the built pack', () => {
  it('passes validatePack, validateItemWordList and validateCommonTexts', () => {
    let d = draft();
    d = setKind(d, 'staff', { parent: 'weapon' });
    d = setKindTexts(d, 'staff', { nouns: [{ text: 'Staff' }], descriptions: ['Made by {maker}.'] });
    d = setTint(d, 'fire', GRADIENT);
    d = setTintTexts(d, 'fire', { adjectives: { common: ['Smoldering'] } });
    d = setParam(d, 'maker', ['a hermit']);
    d = setTemplates(d, 'common', ['{adjective} {base}']);

    const { manifest, files } = buildPack(d);

    const pack = validatePack(manifest);
    if (!pack.ok) throw new Error(pack.errors.join('\n'));
    const list = validateItemWordList(files.get('generators/items.json'), ['maker']);
    if (!list.ok) throw new Error(list.errors.join('\n'));
    expect(list.warnings).toEqual([]);
    const shared = validateCommonTexts(files.get('generators/common.json'));
    if (!shared.ok) throw new Error(shared.errors.join('\n'));
  });
});
