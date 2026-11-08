import {
  Character,
  CharacterAttribute,
  WorldAttribute,
} from '../../world/models/world';
import { attributeStats, BarAttributes, formulaMax, levelsByName } from './character-stats';
import { grantXp, LevelCurve } from './level.rules';

/** Everything that changes a character during play. The host applies these; the sandbox applies them locally. */
export type CharacterAction =
  | { kind: 'spend-stat-point'; attributeId: string }
  | { kind: 'refund-stat-point'; attributeId: string }
  | { kind: 'grant-stat-points'; amount: number }
  | { kind: 'grant-xp'; amount: number }
  | { kind: 'set-current'; attributeId: string; value: number }
  | { kind: 'equip'; inventoryId: string }
  | { kind: 'unequip'; inventoryId: string }
  | { kind: 'use'; inventoryId: string }
  | { kind: 'sell'; inventoryId: string };

export type CharacterActionKind = CharacterAction['kind'];

export const CHARACTER_ACTION_KINDS: readonly CharacterActionKind[] = [
  'spend-stat-point',
  'refund-stat-point',
  'grant-stat-points',
  'grant-xp',
  'set-current',
  'equip',
  'unequip',
  'use',
  'sell',
];

/** Only the game master grants points and sets current values (a hit, a rest…). */
export const GAME_MASTER_ACTIONS: readonly CharacterActionKind[] = [
  'refund-stat-point',
  'grant-stat-points',
  'grant-xp',
  'set-current',
];

export const MAX_GRANTED_POINTS = 100;
export const MAX_GRANTED_XP = 1_000_000;

/** The world settings that turn XP into levels and stat points. */
export interface LevelRules {
  levelCurve: LevelCurve;
  statPointsPerLevel: number;
  maxLevel: number;
  barAttributes: BarAttributes;
}

export type ActionResult =
  { ok: true; character: Character } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

/** The action in a request payload, or null when it isn't a well-formed action of that kind. */
export function parseCharacterAction(
  kind: CharacterActionKind,
  payload: unknown,
): CharacterAction | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;
  const text = (value: unknown): value is string =>
    typeof value === 'string' && value.length > 0 && value.length <= 100;
  switch (kind) {
    case 'spend-stat-point':
    case 'refund-stat-point':
      return text(p['attributeId'])
        ? { kind, attributeId: p['attributeId'] }
        : null;
    case 'grant-stat-points':
      return Number.isInteger(p['amount'])
        ? { kind, amount: p['amount'] as number }
        : null;
    case 'grant-xp':
      return Number.isInteger(p['amount'])
        ? { kind, amount: p['amount'] as number }
        : null;
    case 'set-current':
      return text(p['attributeId']) && Number.isInteger(p['value'])
        ? { kind, attributeId: p['attributeId'], value: p['value'] as number }
        : null;
    default:
      return text(p['inventoryId'])
        ? { kind, inventoryId: p['inventoryId'] }
        : null;
  }
}

/**
 * Applies an action to a character with the world's rules. Pure: returns the changed character (same `rev`;
 * the caller bumps it) or the translation key of why it's refused.
 */
export function applyCharacterAction(
  attributes: WorldAttribute[],
  character: Character,
  action: CharacterAction,
  levelRules: LevelRules,
): ActionResult {
  switch (action.kind) {
    case 'spend-stat-point': {
      if (character.statPoints < 1)
        return fail('character.errors.noStatPoints');
      const stat = attributeStats(attributes, character, levelRules.barAttributes).find(
        (entry) => entry.attributeId === action.attributeId,
      );
      if (!stat) return fail('character.errors.unknownAttribute');
      const spent = attributes.find((entry) => entry.id === action.attributeId)!;
      if (
        spent.cap !== undefined &&
        formulaMax(spent, stat.level, levelsByName(attributes, character), character.level) >= spent.cap
      )
        return fail('character.errors.attributeCapped');
      // A new level raises the max and the current value by the same delta.
      const raised = setAttribute(character, action.attributeId, {
        level: stat.level + 1,
        current: stat.current,
      });
      const after = attributeStats(attributes, raised, levelRules.barAttributes).find(
        (entry) => entry.attributeId === action.attributeId,
      )!;
      const next = setAttribute(raised, action.attributeId, {
        level: after.level,
        current: Math.max(0, stat.current + (after.max - stat.max)),
      });
      return {
        ok: true,
        character: { ...next, statPoints: character.statPoints - 1 },
      };
    }
    case 'refund-stat-point': {
      const stat = attributeStats(attributes, character, levelRules.barAttributes).find(
        (entry) => entry.attributeId === action.attributeId,
      );
      if (!stat) return fail('character.errors.unknownAttribute');
      if (stat.level < 1) return fail('character.errors.levelZero');
      // Undoes a spend: max and current drop by the formula delta.
      const lowered = setAttribute(character, action.attributeId, {
        level: stat.level - 1,
        current: stat.current,
      });
      const after = attributeStats(attributes, lowered, levelRules.barAttributes).find(
        (entry) => entry.attributeId === action.attributeId,
      )!;
      const next = setAttribute(lowered, action.attributeId, {
        level: after.level,
        current: Math.max(0, Math.min(after.max, stat.current + (after.max - stat.max))),
      });
      return {
        ok: true,
        character: { ...next, statPoints: character.statPoints + 1 },
      };
    }
    case 'grant-stat-points': {
      if (action.amount < 1 || action.amount > MAX_GRANTED_POINTS)
        return fail('character.errors.invalidAmount');
      return {
        ok: true,
        character: {
          ...character,
          statPoints: character.statPoints + action.amount,
        },
      };
    }
    case 'grant-xp': {
      if (action.amount < 1 || action.amount > MAX_GRANTED_XP)
        return fail('character.errors.invalidAmount');
      const grant = grantXp(
        levelRules.levelCurve,
        levelRules.statPointsPerLevel,
        character.xp,
        action.amount,
        levelRules.maxLevel,
      );
      const leveled: Character = { ...character, xp: grant.xp, level: grant.level };
      // A new level can raise maxima that read playerLevel: current rises by the same delta.
      const before = attributeStats(attributes, character, levelRules.barAttributes);
      const after = attributeStats(attributes, leveled, levelRules.barAttributes);
      let next = leveled;
      for (const stat of after) {
        const old = before.find((entry) => entry.attributeId === stat.attributeId);
        if (!old || stat.max === old.max) continue;
        next = setAttribute(next, stat.attributeId, {
          level: stat.level,
          current: Math.max(0, Math.min(stat.max, old.current + (stat.max - old.max))),
        });
      }
      return {
        ok: true,
        character: { ...next, statPoints: character.statPoints + grant.statPointsGranted },
      };
    }
    case 'set-current': {
      const stat = attributeStats(attributes, character, levelRules.barAttributes).find(
        (entry) => entry.attributeId === action.attributeId,
      );
      if (!stat) return fail('character.errors.unknownAttribute');
      if (!stat.isBar) return fail('character.errors.notABar');
      const current = Math.max(0, Math.min(action.value, stat.max));
      return {
        ok: true,
        character: setAttribute(character, action.attributeId, {
          level: stat.level,
          current,
        }),
      };
    }
    case 'equip': {
      const entry = character.inventory.find(
        (candidate) => candidate.id === action.inventoryId,
      );
      if (!entry) return fail('character.errors.unknownItem');
      if (entry.item.type !== 'equipment' || entry.item.slot === 'none')
        return fail('character.errors.notEquipment');
      if (entry.equipped) return { ok: true, character };
      // One item per slot: whatever was there goes back to the bag.
      const inventory = character.inventory.map((candidate) => {
        if (candidate.id === entry.id) return { ...candidate, equipped: true };
        if (candidate.equipped && candidate.item.slot === entry.item.slot)
          return { ...candidate, equipped: false };
        return candidate;
      });
      return { ok: true, character: { ...character, inventory } };
    }
    case 'unequip': {
      const entry = character.inventory.find(
        (candidate) => candidate.id === action.inventoryId,
      );
      if (!entry) return fail('character.errors.unknownItem');
      const inventory = character.inventory.map((candidate) =>
        candidate.id === entry.id
          ? { ...candidate, equipped: false }
          : candidate,
      );
      return { ok: true, character: { ...character, inventory } };
    }
    case 'use': {
      const entry = character.inventory.find(
        (candidate) => candidate.id === action.inventoryId,
      );
      if (!entry) return fail('character.errors.unknownItem');
      if (entry.item.type !== 'consumable')
        return fail('character.errors.notConsumable');
      // Consumables add their modifiers to current values, capped at max (and never below 0).
      let next: Character = {
        ...character,
        inventory: character.inventory.filter(
          (candidate) => candidate.id !== entry.id,
        ),
      };
      for (const modifier of entry.item.modifiers) {
        const stat = attributeStats(attributes, next, levelRules.barAttributes).find(
          (candidate) => candidate.name === modifier.attribute,
        );
        // Only bars keep a current value; a modifier on another attribute has no lasting effect.
        if (!stat?.isBar) continue;
        const current = Math.max(
          0,
          Math.min(stat.current + modifier.value, stat.max),
        );
        next = setAttribute(next, stat.attributeId, {
          level: stat.level,
          current,
        });
      }
      return { ok: true, character: next };
    }
    case 'sell': {
      const entry = character.inventory.find(
        (candidate) => candidate.id === action.inventoryId,
      );
      if (!entry) return fail('character.errors.unknownItem');
      return {
        ok: true,
        character: {
          ...character,
          money: character.money + entry.item.price,
          inventory: character.inventory.filter(
            (candidate) => candidate.id !== entry.id,
          ),
        },
      };
    }
  }
}

/** Sets one attribute's entry, adding it when the attribute was added to the world after the character. */
function setAttribute(
  character: Character,
  attributeId: string,
  values: Omit<CharacterAttribute, 'attributeId'>,
): Character {
  const exists = character.attributes.some(
    (entry) => entry.attributeId === attributeId,
  );
  const attributes = exists
    ? character.attributes.map((entry) =>
        entry.attributeId === attributeId ? { ...entry, ...values } : entry,
      )
    : [...character.attributes, { attributeId, ...values }];
  return { ...character, attributes };
}
