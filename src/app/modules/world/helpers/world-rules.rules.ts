import { normalizeName } from '../../../core/helpers/formula';
import { levelProgress } from '../../character/helpers/level.rules';
import {
  Item,
  Sheet,
  World,
  WorldAttribute,
  WorldRules,
} from '../models/world';
import { validateWorldDraft, WorldDraftErrors } from './world-draft.rules';

/** The wizard's validation applied to edited rules. */
export function validateWorldRules(rules: WorldRules): WorldDraftErrors {
  const { name: _name, ...errors } = validateWorldDraft({
    name: 'rules',
    ...rules,
  });
  return errors;
}

/**
 * Applies edited rules to a world: attributes are matched by id (new ones get `newId()`), deleted ones leave the sheets
 * and the item modifiers, a new level curve or max level recomputes the levels from the XP (points are left alone).
 */
export function applyWorldRules<T extends World>(
  world: T,
  rules: WorldRules,
  newId: () => string,
): T {
  const attributes: WorldAttribute[] = rules.attributes.map((attribute) => ({
    id: attribute.id ?? newId(),
    name: attribute.name.trim(),
    baseValue: attribute.baseValue,
    formula: attribute.formula,
    ...(attribute.cap === undefined ? {} : { cap: attribute.cap }),
  }));
  const kept = new Set(attributes.map((attribute) => attribute.id));
  const oldNames = new Map(
    world.attributes.map((attribute) => [attribute.id, attribute.name]),
  );
  const renamed = new Map<string, string>();
  const removed = new Set<string>();
  for (const [id, name] of oldNames) {
    const next = attributes.find((attribute) => attribute.id === id);
    if (!next) removed.add(normalizeName(name));
    else if (next.name !== name) renamed.set(normalizeName(name), next.name);
  }

  const fixItem = <I extends Item>(item: I): I => {
    if (
      !item.modifiers.some(
        (m) =>
          removed.has(normalizeName(m.attribute)) ||
          renamed.has(normalizeName(m.attribute)),
      )
    )
      return item;
    return {
      ...item,
      modifiers: item.modifiers
        .filter((m) => !removed.has(normalizeName(m.attribute)))
        .map((m) => ({
          ...m,
          attribute: renamed.get(normalizeName(m.attribute)) ?? m.attribute,
        })),
    };
  };
  const curveChanged =
    JSON.stringify(rules.levelCurve) !== JSON.stringify(world.levelCurve) ||
    rules.maxLevel !== world.maxLevel;
  const fixSheet = <S extends Sheet>(sheet: S): S => ({
    ...sheet,
    attributes: sheet.attributes.filter((entry) => kept.has(entry.attributeId)),
    inventory: sheet.inventory.map((entry) => ({
      ...entry,
      item: fixItem(entry.item),
    })),
    level: curveChanged
      ? levelProgress(rules.levelCurve, sheet.xp, rules.maxLevel).level
      : sheet.level,
  });

  return {
    ...world,
    attributes,
    barAttributes: {
      life:
        world.barAttributes.life && kept.has(world.barAttributes.life)
          ? world.barAttributes.life
          : undefined,
      mana:
        world.barAttributes.mana && kept.has(world.barAttributes.mana)
          ? world.barAttributes.mana
          : undefined,
    },
    startingStatPoints: rules.startingStatPoints,
    startingMoney: rules.startingMoney,
    levelCurve: rules.levelCurve,
    maxLevel: rules.maxLevel,
    statPointsPerLevel: rules.statPointsPerLevel,
    startingSkillPoints: rules.startingSkillPoints,
    skillPointsPerLevel: rules.skillPointsPerLevel,
    offlineFeatures: rules.offlineFeatures,
    npcVisibility: rules.npcVisibility ?? world.npcVisibility,
    items: world.items.map(fixItem),
    characters: world.characters.map(fixSheet),
  };
}
