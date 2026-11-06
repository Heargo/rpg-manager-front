import { MoneyFormat, OfflineFeatures, World, WorldDraft, WorldSummary } from '../models/world';

/** Defaults from the p2p-rooms spec table: reading always works, dice and notes on, actions changing shared state off. */
export const DEFAULT_OFFLINE_FEATURES: OfflineFeatures = {
  dice: true,
  notes: true,
  spendStatPoints: false,
  equip: false,
  useConsumables: false,
  sell: false,
};

export const DEFAULT_MONEY_FORMAT: MoneyFormat = { kind: 'coins' };

/** Builds a new world from the wizard's draft. Ids and time are injected so the result is predictable in tests. */
export function createWorld(draft: WorldDraft, newId: () => string, now: number): World {
  const attributes = draft.attributes.map((attribute) => ({
    id: newId(),
    name: attribute.name.trim(),
    baseValue: attribute.baseValue,
  }));
  const idByName = (name?: string) =>
    name === undefined ? undefined : attributes.find((attribute) => attribute.name === name.trim())?.id;

  return {
    id: newId(),
    name: draft.name.trim(),
    description: draft.description?.trim() ?? '',
    imageId: draft.imageId,
    attributes,
    barAttributes: {
      life: idByName(draft.barAttributes?.life),
      mana: idByName(draft.barAttributes?.mana),
    },
    startingStatPoints: draft.startingStatPoints ?? 0,
    startingMoney: draft.startingMoney ?? 0,
    moneyFormat: draft.moneyFormat ?? DEFAULT_MONEY_FORMAT,
    offlineFeatures: { ...DEFAULT_OFFLINE_FEATURES, ...draft.offlineFeatures },
    items: [],
    characters: [],
    notes: '',
    quickImageIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function summarizeWorld(world: World): WorldSummary {
  return {
    id: world.id,
    name: world.name,
    description: world.description,
    imageId: world.imageId,
    characterCount: world.characters.length,
    updatedAt: world.updatedAt,
  };
}

/** Every image a world points to, once each. */
export function worldImageIds(world: World): string[] {
  const ids = [
    world.imageId,
    world.illustrationId,
    ...world.quickImageIds,
    ...world.items.map((item) => item.imageId),
    ...world.characters.flatMap((character) => [
      character.portraitId,
      ...character.inventory.map((entry) => entry.item.imageId),
    ]),
  ];
  return [...new Set(ids.filter((id): id is string => !!id))];
}

/** Returns a copy of the world with image ids replaced through the map (ids not in the map are kept). */
export function remapWorldImages(world: World, map: ReadonlyMap<string, string>): World {
  const swap = (id?: string) => (id === undefined ? undefined : (map.get(id) ?? id));
  return {
    ...world,
    imageId: swap(world.imageId),
    illustrationId: swap(world.illustrationId),
    quickImageIds: world.quickImageIds.map((id) => swap(id)!),
    items: world.items.map((item) => ({ ...item, imageId: swap(item.imageId) })),
    characters: world.characters.map((character) => ({
      ...character,
      portraitId: swap(character.portraitId),
      inventory: character.inventory.map((entry) => ({
        ...entry,
        item: { ...entry.item, imageId: swap(entry.item.imageId) },
      })),
    })),
  };
}
