import { ItemDraft } from '../../../core/models/item';
import { Item } from '../../world/models/world';
import {
  filterCatalogue,
  mergeDefaultItems,
  priceBounds,
} from './item-catalogue.rules';

const item = (
  id: string,
  name: string,
  rarity: Item['rarity'],
  type: Item['type'],
  price: number,
): Item => ({
  id,
  name,
  description: '',
  rarity,
  type,
  slot: 'none',
  price,
  modifiers: [],
});

const sword = item('1', 'Iron Sword', 'common', 'equipment', 10);
const potion = item('2', 'Healing Potion', 'uncommon', 'consumable', 25);
const ring = item('3', 'Ring of Sword-Mastery', 'rare', 'equipment', 120);
const key = item('4', 'Rusty Key', 'common', 'item', 1);
const all = [sword, potion, ring, key];
const none = { search: '', rarities: [], types: [], minPrice: 0, maxPrice: 1000 };
const names = (items: Item[]) => items.map((i) => i.name);

describe('filterCatalogue', () => {
  it('keeps everything when no filter is set', () => {
    expect(filterCatalogue(all, none)).toEqual(all);
  });

  it('searches by name, ignoring case and surrounding spaces', () => {
    expect(names(filterCatalogue(all, { ...none, search: '  SWORD ' }))).toEqual([
      'Iron Sword',
      'Ring of Sword-Mastery',
    ]);
  });

  it('keeps the items of any selected rarity', () => {
    expect(
      names(filterCatalogue(all, { ...none, rarities: ['uncommon', 'rare'] })),
    ).toEqual(['Healing Potion', 'Ring of Sword-Mastery']);
  });

  it('keeps the items of any selected type', () => {
    expect(
      names(filterCatalogue(all, { ...none, types: ['item', 'consumable'] })),
    ).toEqual(['Healing Potion', 'Rusty Key']);
  });

  it('keeps prices within the range, bounds included', () => {
    expect(
      names(filterCatalogue(all, { ...none, minPrice: 10, maxPrice: 25 })),
    ).toEqual(['Iron Sword', 'Healing Potion']);
  });

  it('combines every filter', () => {
    expect(
      names(
        filterCatalogue(all, {
          search: 'sword',
          rarities: ['rare'],
          types: ['equipment'],
          minPrice: 100,
          maxPrice: 200,
        }),
      ),
    ).toEqual(['Ring of Sword-Mastery']);
  });
});

describe('priceBounds', () => {
  it('is the cheapest and the dearest price', () => {
    expect(priceBounds(all)).toEqual({ min: 1, max: 120 });
  });

  it('is 0 to 0 for an empty catalogue', () => {
    expect(priceBounds([])).toEqual({ min: 0, max: 0 });
  });
});

describe('mergeDefaultItems', () => {
  const draft = (name: string, price: number): ItemDraft => ({
    name,
    description: 'd',
    rarity: 'common',
    type: 'item',
    slot: 'none',
    price,
    modifiers: [],
  });

  it('adds the defaults with fresh ids after the existing items', () => {
    let n = 0;
    const merged = mergeDefaultItems(
      [sword],
      [draft('Torch', 2), draft('Rope', 3)],
      () => `new-${++n}`,
    );
    expect(merged).toHaveLength(3);
    expect(merged[0]).toBe(sword);
    expect(merged.slice(1)).toMatchObject([
      { id: 'new-1', name: 'Torch', price: 2 },
      { id: 'new-2', name: 'Rope', price: 3 },
    ]);
  });

  it('skips a default whose name is already in the catalogue, so adding twice changes nothing', () => {
    let n = 0;
    const newId = () => `new-${++n}`;
    const defaults = [draft('iron sword', 9), draft('Torch', 2)];
    const once = mergeDefaultItems([sword], defaults, newId);
    expect(names(once)).toEqual(['Iron Sword', 'Torch']);
    expect(mergeDefaultItems(once, defaults, newId)).toEqual(once);
  });
});
