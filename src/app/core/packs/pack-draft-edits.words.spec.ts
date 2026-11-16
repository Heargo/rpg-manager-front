import { PackDraft } from './pack-draft';
import { setCommonWords, setKindWords, setTintFits } from './pack-draft-edits';

function draft(over: Record<string, unknown> = {}, ...rest: [language?: string]): PackDraft {
  /** No second argument: English; an explicit `undefined`: a neutral draft. */
  const language = rest.length ? rest[0] : 'en';
  return {
    id: 'draft-1',
    updatedAt: 1000,
    details: {
      id: 'mine',
      language,
      name: 'Mine',
      description: 'My pack',
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    generators: {},
    kinds: { weapon: { type: 'item' } },
    tints: { rust: { gradient: [] } },
    sprites: [],
    ...over,
  } as unknown as PackDraft;
}

const items = (d: PackDraft): any => d.generators.items;

describe('setKindWords', () => {
  it('sets the adjectives and suffixes of a kind per rarity, keeping its other texts', () => {
    const start = draft({
      generators: { items: { version: 2, kinds: { weapon: { nouns: [{ text: 'Blade' }] } } } },
    });

    const next = setKindWords(start, 'weapon', {
      adjectives: { common: ['Sharp', { text: 'Rusty', tint: 'rust' }] },
      suffixes: { rare: ['of Doom'] },
    });

    expect(items(next).kinds.weapon).toEqual({
      nouns: [{ text: 'Blade' }],
      adjectives: { common: ['Sharp', { text: 'Rusty', tint: 'rust' }] },
      suffixes: { rare: ['of Doom'] },
    });
  });

  it('prunes empty lists, then the empty kind', () => {
    const start = draft({
      generators: {
        items: { version: 2, kinds: { weapon: { adjectives: { common: ['Sharp'] }, suffixes: { rare: ['of Doom'] } } } },
      },
    });

    const half = setKindWords(start, 'weapon', { adjectives: { common: [] } });
    expect(items(half).kinds.weapon).toEqual({ suffixes: { rare: ['of Doom'] } });

    const none = setKindWords(half, 'weapon', { suffixes: { rare: [] } });
    expect(items(none)).not.toHaveProperty('kinds');
  });

  it('ignores the edit on a neutral draft', () => {
    const start = draft({}, undefined);

    expect(setKindWords(start, 'weapon', { adjectives: { common: ['Sharp'] } })).toEqual(start);
  });
});

describe('setTintFits', () => {
  it('sets the fits of a tint in the manifest', () => {
    const next = setTintFits(draft(), 'rust', ['weapon', 'armor']);

    expect(next.tints['rust']).toEqual({ gradient: [], fits: ['weapon', 'armor'] });
  });

  it('removes fits when no kind is left', () => {
    const start = draft({ tints: { rust: { gradient: [], fits: ['weapon'] } } });

    expect(setTintFits(start, 'rust', []).tints['rust']).toEqual({ gradient: [] });
  });

  it('keeps fits on a neutral draft', () => {
    const next = setTintFits(draft({}, undefined), 'rust', ['weapon']);

    expect(next.tints['rust'].fits).toEqual(['weapon']);
  });
});

describe('setCommonWords', () => {
  it('sets the top-level adjectives and suffixes, keeping the rest of the word list', () => {
    const start = draft({ generators: { items: { version: 2, templates: { common: ['{base}'] } } } });

    const next = setCommonWords(start, {
      adjectives: { common: [{ m: 'Vieux', f: 'Vieille' }] },
      suffixes: { mythic: ['des Anciens'] },
    });

    expect(items(next)).toEqual({
      version: 2,
      templates: { common: ['{base}'] },
      adjectives: { common: [{ m: 'Vieux', f: 'Vieille' }] },
      suffixes: { mythic: ['des Anciens'] },
    });
  });

  it('prunes empty lists and the empty fields', () => {
    const start = draft({
      generators: { items: { version: 2, adjectives: { common: ['Old'] }, suffixes: { mythic: ['of Old'] } } },
    });

    const next = setCommonWords(start, { adjectives: { common: [] }, suffixes: {} });

    expect(items(next)).toEqual({ version: 2 });
  });

  it('ignores the edit on a neutral draft', () => {
    const start = draft({}, undefined);

    expect(setCommonWords(start, { adjectives: { common: ['Old'] } })).toEqual(start);
  });
});
