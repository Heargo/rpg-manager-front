import { Character, InventoryItem, Item } from '../../world/models/world';

/** The character with a copy of the catalogue item added at the end of the bag (a new entry every time). */
export function giveItem(
  character: Character,
  item: Item,
  inventoryId: string,
): Character {
  const position = character.inventory.reduce(
    (max, entry) => Math.max(max, entry.position + 1),
    0,
  );
  const entry: InventoryItem = {
    id: inventoryId,
    item: { ...item, modifiers: item.modifiers.map((m) => ({ ...m })) },
    equipped: false,
    position,
  };
  return { ...character, inventory: [...character.inventory, entry] };
}
