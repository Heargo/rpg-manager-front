import { ItemDraft, ItemRarity, ItemType } from '../../../core/models/item';
import { Item } from '../../world/models/world';

export interface CatalogueFilter {
  search: string;
  /** Empty = every rarity. */
  rarities: readonly ItemRarity[];
  /** Empty = every type. */
  types: readonly ItemType[];
  minPrice: number;
  maxPrice: number;
}

/** The items matching every filter, in catalogue order. */
export function filterCatalogue(
  items: readonly Item[],
  filter: CatalogueFilter,
): Item[] {
  const search = filter.search.trim().toLowerCase();
  return items.filter(
    (item) =>
      (!search || item.name.toLowerCase().includes(search)) &&
      (!filter.rarities.length || filter.rarities.includes(item.rarity)) &&
      (!filter.types.length || filter.types.includes(item.type)) &&
      item.price >= filter.minPrice &&
      item.price <= filter.maxPrice,
  );
}

/** Cheapest and dearest price of a catalogue (0 and 0 when empty). */
export function priceBounds(items: readonly Item[]): {
  min: number;
  max: number;
} {
  if (!items.length) return { min: 0, max: 0 };
  const prices = items.map((item) => item.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** The catalogue plus the drafts whose name (any case) it doesn't have yet, with fresh ids. */
export function mergeDefaultItems(
  catalogue: readonly Item[],
  drafts: readonly ItemDraft[],
  newId: () => string,
): Item[] {
  const known = new Set(
    catalogue.map((item) => item.name.trim().toLowerCase()),
  );
  const added: Item[] = [];
  for (const draft of drafts) {
    const key = draft.name.trim().toLowerCase();
    if (known.has(key)) continue;
    known.add(key);
    added.push({ ...draft, id: newId() });
  }
  return [...catalogue, ...added];
}
