import { draftOf } from '../../../../../../testing/pack-draft-editor';
import { ALL, readTexts, writeTexts } from './kind-texts';

const NOUNS = [{ text: 'Blade', gender: 'f' as const }, { text: 'Blades', plural: true }];

describe('kind-texts round trip', () => {
  it('items: writes nouns, descriptions, names per rarity, adjectives and suffixes per rarity, and reads them back', () => {
    const texts = {
      nouns: NOUNS,
      descriptions: 'A blade.\nSharp.',
      names: { rare: '{noun} of Fire\n{noun} of Ice' },
      adjectives: { common: ['Dull'] },
      suffixes: { common: ['of Fire'] },
    };

    const draft = writeTexts(draftOf({ kinds: { blade: {} } }), 'items', 'blade', texts);
    const held = (draft as any).generators.items.kinds.blade;

    expect(held.nouns).toEqual(NOUNS);
    expect(held.descriptions).toEqual(['A blade.', 'Sharp.']);
    expect(held.names).toEqual({ rare: ['{noun} of Fire', '{noun} of Ice'] });
    expect(held.adjectives).toEqual({ common: ['Dull'] });
    expect(held.suffixes).toEqual({ common: ['of Fire'] });
    expect(readTexts(draft, 'items', 'blade')).toEqual(expect.objectContaining(texts));
  });

  it.each([
    ['npcs', 'npcKinds', { roles: ['story'] }, false],
    ['skills', 'skillKinds', { type: 'active' }, true],
    ['classes', 'classKinds', { skills: ['strike'] }, true],
  ] as const)('%s: writes the texts under one scope and reads them back', (domain, field, root, suffixes) => {
    const texts = {
      nouns: NOUNS,
      descriptions: 'One.\nTwo.',
      names: { [ALL]: '{noun} of the Deep' },
      adjectives: { [ALL]: ['Odd'] },
      suffixes: { [ALL]: suffixes ? ['of Fire'] : [] },
    };

    const draft = writeTexts(draftOf({ [field]: { folk: root } }), domain, 'folk', texts);
    const held = (draft as any).generators[domain].kinds.folk;

    expect(held.nouns).toEqual(NOUNS);
    expect(held.descriptions).toEqual(['One.', 'Two.']);
    expect(held.names).toEqual(['{noun} of the Deep']);
    expect(held.adjectives).toEqual(['Odd']);
    if (suffixes) expect(held.suffixes).toEqual(['of Fire']);
    else expect(held).not.toHaveProperty('suffixes');
    expect(readTexts(draft, domain, 'folk')).toEqual(texts);
  });

  it('writing the texts just read leaves the draft unchanged, per domain', () => {
    const draft = draftOf({
      kinds: { blade: {} },
      generators: { items: { version: 2, kinds: { blade: { nouns: NOUNS, descriptions: ['A blade.'] } } } },
    });

    expect(writeTexts(draft, 'items', 'blade', readTexts(draft, 'items', 'blade'))).toEqual(draft);
  });
});
