import { ItemDraft } from '../../../core/models/item';
import {
  buildItemPrompt,
  itemToJson,
  parseItemJson,
  validateItemDraft,
} from './item-editor.rules';

const attributes = ['Life', 'Mana', 'Strength'];
const sword: ItemDraft = {
  name: 'Iron Sword',
  description: 'Sharp.',
  rarity: 'rare',
  type: 'equipment',
  slot: 'weapon1',
  price: 40,
  modifiers: [{ attribute: 'Strength', value: 3 }],
};
const fields = (draft: ItemDraft) =>
  validateItemDraft(draft, attributes).map((issue) => issue.field);

describe('validateItemDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateItemDraft(sword, attributes)).toEqual([]);
  });

  it('rejects a blank name', () => {
    expect(fields({ ...sword, name: '   ' })).toEqual(['name']);
  });

  it('rejects a negative price', () => {
    expect(fields({ ...sword, price: -1 })).toEqual(['price']);
  });

  it('allows a slot only for equipment', () => {
    expect(fields({ ...sword, type: 'consumable' })).toEqual(['slot']);
    expect(fields({ ...sword, type: 'consumable', slot: 'none' })).toEqual([]);
    expect(fields({ ...sword, slot: 'none' })).toEqual(['slot']);
  });

  it('limits modifiers to the attributes of the world', () => {
    expect(
      fields({ ...sword, modifiers: [{ attribute: 'Luck', value: 1 }] }),
    ).toEqual(['modifiers']);
  });
});

describe('item JSON', () => {
  it('writes the item without its id and image, and reads it back', () => {
    const json = itemToJson({ ...sword, id: 'x', imageId: 'img' } as ItemDraft);
    expect(JSON.parse(json)).toEqual(sword);
    expect(parseItemJson(json, attributes)).toEqual({
      draft: sword,
      issues: [],
    });
  });

  it('reports text that is not JSON', () => {
    const result = parseItemJson('{ nope', attributes);
    expect(result.draft).toBeUndefined();
    expect(result.issues.map((issue) => issue.field)).toEqual(['json']);
  });

  it('reports an unknown rarity and a missing name', () => {
    const { name: _name, ...noName } = sword;
    const result = parseItemJson(
      JSON.stringify({ ...noName, rarity: 'epic' }),
      attributes,
    );
    expect(result.draft).toBeUndefined();
    expect(result.issues.map((issue) => issue.field).sort()).toEqual([
      'name',
      'rarity',
    ]);
  });

  it('reports a modifier on an attribute the world does not have', () => {
    const result = parseItemJson(
      JSON.stringify({ ...sword, modifiers: [{ attribute: 'Luck', value: 1 }] }),
      attributes,
    );
    expect(result.draft).toBeUndefined();
    expect(result.issues.map((issue) => issue.field)).toEqual(['modifiers']);
  });
});

describe('buildItemPrompt', () => {
  it('names the world attributes, the allowed values and asks for JSON', () => {
    const prompt = buildItemPrompt(attributes);
    for (const word of [
      'Life',
      'Mana',
      'Strength',
      'legendary',
      'consumable',
      'equipment',
      'weapon1',
      'JSON',
    ]) {
      expect(prompt).toContain(word);
    }
  });
});
