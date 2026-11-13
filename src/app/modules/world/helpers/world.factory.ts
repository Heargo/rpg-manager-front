import { normalizeName } from '../../../core/helpers/formula';
import {
  DEFAULT_LEVEL_CURVE,
  DEFAULT_MAX_LEVEL,
  DEFAULT_STAT_POINTS_PER_LEVEL,
} from '../../character/helpers/level.rules';
import { DEFAULT_NPC_VISIBILITY } from '../../npc/helpers/npc-visibility.rules';
import { defaultCombatRules } from './world-combat.rules';
import {
  CombatRules,
  OfflineFeatures,
  World,
  WorldDraft,
  WorldInfo,
  WorldSummary,
} from '../models/world';

/** Defaults from the p2p-rooms spec table: reading always works, dice and notes on, actions changing shared state off. */
export const DEFAULT_OFFLINE_FEATURES: OfflineFeatures = {
  dice: true,
  notes: true,
  spendStatPoints: false,
  equip: false,
  useConsumables: false,
  sell: false,
  learnSkills: false,
};

/** Builds a new world from the wizard's draft. Ids and time are injected so the result is predictable in tests. */
export function createWorld(
  draft: WorldDraft,
  newId: () => string,
  now: number,
): World {
  const attributes = draft.attributes.map((attribute) => ({
    id: newId(),
    name: attribute.name.trim(),
    baseValue: attribute.baseValue,
    formula: attribute.formula,
    ...(attribute.cap === undefined ? {} : { cap: attribute.cap }),
  }));
  const idByName = (name?: string) =>
    name === undefined
      ? undefined
      : attributes.find((attribute) => attribute.name === name.trim())?.id;

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
    levelCurve: draft.levelCurve ?? DEFAULT_LEVEL_CURVE,
    maxLevel: draft.maxLevel ?? DEFAULT_MAX_LEVEL,
    statPointsPerLevel:
      draft.statPointsPerLevel ?? DEFAULT_STAT_POINTS_PER_LEVEL,
    startingSkillPoints: draft.startingSkillPoints ?? 1,
    skillPointsPerLevel: draft.skillPointsPerLevel ?? 1,
    startingMoney: draft.startingMoney ?? 0,
    offlineFeatures: { ...DEFAULT_OFFLINE_FEATURES, ...draft.offlineFeatures },
    skillRollsEnabled: draft.skillRollsEnabled ?? true,
    sellAnywhere: draft.sellAnywhere ?? true,
    sellAnywhereRatio: draft.sellAnywhereRatio ?? 1,
    merchantBuyRatio: draft.merchantBuyRatio ?? 1,
    merchantSellRatio: draft.merchantSellRatio ?? 0.5,
    npcVisibility: draft.npcVisibility ?? DEFAULT_NPC_VISIBILITY,
    combat: combatFor(draft, attributes),
    items: [],
    characters: [],
    npcs: [],
    skills: [],
    classes: [],
    notes: '',
    quickImageIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** The draft's combat rules with the life attribute name as written in the world, or the defaults on the life bar. */
function combatFor(
  draft: WorldDraft,
  attributes: { name: string }[],
): CombatRules {
  if (!draft.combat)
    return defaultCombatRules(draft.barAttributes?.life?.trim());
  const life = draft.combat.lifeAttribute?.trim();
  return {
    ...draft.combat,
    lifeAttribute: attributes.find(
      (attribute) =>
        life !== undefined &&
        normalizeName(attribute.name) === normalizeName(life),
    )?.name,
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
    world.combat.grid.imageId,
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
export function remapWorldImages(
  world: World,
  map: ReadonlyMap<string, string>,
): World {
  const swap = (id?: string) =>
    id === undefined ? undefined : (map.get(id) ?? id);
  return {
    ...world,
    imageId: swap(world.imageId),
    illustrationId: swap(world.illustrationId),
    combat: {
      ...world.combat,
      grid: {
        ...world.combat.grid,
        ...(world.combat.grid.imageId !== undefined && {
          imageId: swap(world.combat.grid.imageId),
        }),
      },
    },
    quickImageIds: world.quickImageIds.map((id) => swap(id)!),
    items: world.items.map((item) => ({
      ...item,
      imageId: swap(item.imageId),
    })),
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

/** The public part of a world, sent to players. */
export function toWorldInfo(world: World): WorldInfo {
  return {
    id: world.id,
    name: world.name,
    description: world.description,
    imageId: world.imageId,
    attributes: world.attributes,
    barAttributes: world.barAttributes,
    startingStatPoints: world.startingStatPoints,
    levelCurve: world.levelCurve,
    maxLevel: world.maxLevel,
    statPointsPerLevel: world.statPointsPerLevel,
    skillPointsPerLevel: world.skillPointsPerLevel,
    startingMoney: world.startingMoney,
    offlineFeatures: world.offlineFeatures,
    skillRollsEnabled: world.skillRollsEnabled,
    sellAnywhere: world.sellAnywhere,
    sellAnywhereRatio: world.sellAnywhereRatio,
  };
}
