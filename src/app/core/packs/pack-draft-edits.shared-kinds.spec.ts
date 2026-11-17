import { draftOf } from '../../../testing/pack-draft-editor';
import {
  removeSharedKind,
  renameSharedKind,
  setKindShared,
  setSharedKind,
  setSharedKindTexts,
  sharedKindTextsOf,
} from './pack-draft-edits';

const TREE = {
  material: {},
  metal: { parent: 'material' },
  iron: { parent: 'metal' },
  wood: { parent: 'material' },
};

const withTexts = (over: Record<string, unknown> = {}, ...rest: [language?: string]) =>
  draftOf(
    {
      sharedKinds: TREE,
      common: {
        version: 2,
        params: { place: ['the keep'] },
        kinds: {
          metal: { words: [{ text: 'Metal' }] },
          iron: { words: [{ text: 'Iron' }], adjectives: ['iron'], descriptions: ['forged in iron'] },
          wood: { words: [{ text: 'Wood' }] },
        },
      },
      ...over,
    },
    ...rest,
  ) as any;

describe('pack draft edits on shared kinds', () => {
  it('setSharedKind adds a root shared kind and a child under its parent, in the manifest tree', () => {
    const root = setSharedKind(draftOf(), 'material', {});
    const child = setSharedKind(root, 'metal', { parent: 'material' }) as any;

    expect(child.sharedKinds).toEqual({ material: {}, metal: { parent: 'material' } });
  });

  it('setSharedKind changes the parent of an existing kind and clears it with undefined', () => {
    const moved = setSharedKind(withTexts(), 'wood', { parent: 'metal' }) as any;
    const cleared = setSharedKind(withTexts(), 'wood', { parent: undefined }) as any;

    expect(moved.sharedKinds.wood).toEqual({ parent: 'metal' });
    expect(cleared.sharedKinds.wood).toEqual({});
  });

  it('removeSharedKind removes the kind with its descendants and their texts, and keeps the others and the params', () => {
    const after = removeSharedKind(withTexts(), 'metal') as any;

    expect(Object.keys(after.sharedKinds)).toEqual(['material', 'wood']);
    expect(Object.keys(after.common.kinds)).toEqual(['wood']);
    expect(after.common.params).toEqual({ place: ['the keep'] });
  });

  it('removeSharedKind takes the removed ids out of the shared fits of every domain kind', () => {
    const start = withTexts({
      kinds: { gear: { type: 'equipment', shared: ['metal', 'wood'] }, axe: { parent: 'gear', shared: ['iron'] } },
      npcKinds: { smith: { roles: ['merchant'], shared: ['iron', 'wood'] } },
      skillKinds: { forge: { shared: ['metal'] } },
      classKinds: { knight: { shared: ['wood'] } },
    });

    const after = removeSharedKind(start, 'metal') as any;

    expect(after.kinds.gear.shared).toEqual(['wood']);
    expect(after.kinds.axe.shared).toBeUndefined();
    expect(after.npcKinds.smith.shared).toEqual(['wood']);
    expect(after.skillKinds.forge.shared).toBeUndefined();
    expect(after.classKinds.knight.shared).toEqual(['wood']);
  });

  it('renameSharedKind renames the kind, the parents that point at it and its texts', () => {
    const after = renameSharedKind(withTexts(), 'metal', 'alloy') as any;

    expect(Object.keys(after.sharedKinds)).toEqual(['material', 'alloy', 'iron', 'wood']);
    expect(after.sharedKinds.iron).toEqual({ parent: 'alloy' });
    expect(Object.keys(after.common.kinds)).toEqual(['alloy', 'iron', 'wood']);
    expect(after.common.kinds.alloy).toEqual({ words: [{ text: 'Metal' }] });
  });

  it('renameSharedKind follows the kind in the shared fits of every domain kind', () => {
    const start = withTexts({
      kinds: { gear: { shared: ['metal', 'wood'] } },
      npcKinds: { smith: { shared: ['metal'] } },
      skillKinds: { forge: { shared: ['metal'] } },
      classKinds: { knight: { shared: ['wood'] } },
    });

    const after = renameSharedKind(start, 'metal', 'alloy') as any;

    expect(after.kinds.gear.shared).toEqual(['alloy', 'wood']);
    expect(after.npcKinds.smith.shared).toEqual(['alloy']);
    expect(after.skillKinds.forge.shared).toEqual(['alloy']);
    expect(after.classKinds.knight.shared).toEqual(['wood']);
  });

  it('renameSharedKind to an existing id or from an unknown id changes nothing', () => {
    const start = withTexts();

    expect(renameSharedKind(start, 'metal', 'wood')).toBe(start);
    expect(renameSharedKind(start, 'nope', 'other')).toBe(start);
  });

  it('setSharedKindTexts sets the words, adjectives and descriptions of a kind in common.json v2, keeping the rest', () => {
    const after = setSharedKindTexts(withTexts(), 'wood', {
      words: [{ text: 'Oak', gender: 'f' }],
      adjectives: ['oaken'],
      descriptions: ['carved from oak'],
    }) as any;

    expect(after.common.version).toBe(2);
    expect(after.common.params).toEqual({ place: ['the keep'] });
    expect(after.common.kinds.wood).toEqual({
      words: [{ text: 'Oak', gender: 'f' }],
      adjectives: ['oaken'],
      descriptions: ['carved from oak'],
    });
    expect(after.common.kinds.iron.words).toEqual([{ text: 'Iron' }]);
  });

  it('setSharedKindTexts replaces only the fields given and drops an empty field, and the kind when nothing is left', () => {
    const fewer = setSharedKindTexts(withTexts(), 'iron', { adjectives: [] }) as any;
    const none = setSharedKindTexts(fewer, 'iron', { words: [], descriptions: [] }) as any;

    expect(fewer.common.kinds.iron).toEqual({ words: [{ text: 'Iron' }], descriptions: ['forged in iron'] });
    expect(Object.keys(none.common.kinds)).toEqual(['metal', 'wood']);
  });

  it('setSharedKindTexts creates common.json when the draft has none', () => {
    const after = setSharedKindTexts(draftOf({ sharedKinds: TREE }), 'iron', { words: [{ text: 'Iron' }] }) as any;

    expect(after.common).toEqual({ version: 2, kinds: { iron: { words: [{ text: 'Iron' }] } } });
  });

  it('setSharedKindTexts does nothing on a neutral draft, which has no texts', () => {
    const neutral = draftOf({ sharedKinds: TREE }, undefined);

    expect(setSharedKindTexts(neutral, 'iron', { words: [{ text: 'Iron' }] })).toBe(neutral);
  });

  it('sharedKindTextsOf reads the words, adjectives and descriptions of a kind, empty for an unknown one', () => {
    expect(sharedKindTextsOf(withTexts(), 'iron')).toEqual({
      words: [{ text: 'Iron' }],
      adjectives: ['iron'],
      descriptions: ['forged in iron'],
    });
    expect(sharedKindTextsOf(withTexts(), 'material')).toEqual({ words: [], adjectives: [], descriptions: [] });
  });

  it.each([
    ['items', 'kinds'],
    ['npcs', 'npcKinds'],
    ['skills', 'skillKinds'],
    ['classes', 'classKinds'],
  ] as const)('setKindShared sets the shared fits of a %s kind and clears them with an empty list', (domain, field) => {
    const start = draftOf({ [field]: { folk: {}, elder: { parent: 'folk' } } });

    const set = setKindShared(start, domain, 'folk', ['metal', 'wood']) as any;
    const cleared = setKindShared(set, domain, 'folk', []) as any;

    expect(set[field].folk).toEqual({ shared: ['metal', 'wood'] });
    expect(set[field].elder).toEqual({ parent: 'folk' });
    expect(cleared[field].folk).toEqual({});
  });
});
