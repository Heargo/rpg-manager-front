import { sellAnywherePrice } from '../../npc/helpers/merchant.rules';
import {
  Character,
  Sheet,
  CharacterAttribute,
  WorldAttribute,
} from '../../world/models/world';
import {
  attributeStats,
  BarAttributes,
  formulaMax,
  levelsByName,
} from './character-stats';
import { grantXp, LevelCurve } from './level.rules';
import { CharacterClass } from '../../class/models/class';
import { treeNodeStates } from '../../class/helpers/class.rules';
import { classBonusesOf } from './class-view.rules';
import { Skill } from '../../skill/models/skill';

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
  | { kind: 'sell'; inventoryId: string }
  | { kind: 'learn-skill'; skillId: string }
  | { kind: 'refund-skill'; skillId: string }
  | { kind: 'grant-skill-points'; amount: number }
  | { kind: 'set-skill'; skillId: string; rank: number }
  | { kind: 'set-class'; classId: string };

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
  'learn-skill',
  'refund-skill',
  'grant-skill-points',
  'set-skill',
  'set-class',
];

/** Only the game master grants points and sets current values (a hit, a rest…). */
export const GAME_MASTER_ACTIONS: readonly CharacterActionKind[] = [
  'refund-stat-point',
  'grant-stat-points',
  'grant-xp',
  'set-current',
  'refund-skill',
  'grant-skill-points',
  'set-skill',
  'set-class',
];

export const MAX_GRANTED_POINTS = 100;
export const MAX_GRANTED_XP = 1_000_000;

/** The world settings that turn XP into levels and stat points. */
export interface LevelRules {
  levelCurve: LevelCurve;
  statPointsPerLevel: number;
  skillPointsPerLevel: number;
  maxLevel: number;
  barAttributes: BarAttributes;
}

/** The world catalogues the skill actions read (host side; players only get their own view). */
export interface SkillCatalogue {
  skills: Skill[];
  classes: CharacterClass[];
  /** Selling anywhere (default allowed, at full price). */
  sellAnywhere?: boolean;
  sellAnywhereRatio?: number;
}

export type ActionResult<T extends Sheet = Character> =
  { ok: true; character: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({
  ok: false,
  error,
});

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
    case 'grant-skill-points':
      return Number.isInteger(p['amount'])
        ? { kind, amount: p['amount'] as number }
        : null;
    case 'learn-skill':
    case 'refund-skill':
      return text(p['skillId']) ? { kind, skillId: p['skillId'] } : null;
    case 'set-skill':
      return text(p['skillId']) && Number.isInteger(p['rank'])
        ? { kind, skillId: p['skillId'], rank: p['rank'] as number }
        : null;
    case 'set-class':
      return text(p['classId']) ? { kind, classId: p['classId'] } : null;
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
export function applyCharacterAction<T extends Sheet = Character>(
  attributes: WorldAttribute[],
  character: T,
  action: CharacterAction,
  levelRules: LevelRules,
  catalogue: SkillCatalogue,
): ActionResult<T> {
  const statsOf = (sheet: T) =>
    attributeStats(
      attributes,
      sheet,
      levelRules.barAttributes,
      catalogue.skills,
      classBonusesOf(sheet, catalogue.classes),
    );
  switch (action.kind) {
    case 'spend-stat-point': {
      if (character.statPoints < 1)
        return fail('character.errors.noStatPoints');
      const stat = statsOf(character).find((entry) => entry.attributeId === action.attributeId);
      if (!stat) return fail('character.errors.unknownAttribute');
      const spent = attributes.find(
        (entry) => entry.id === action.attributeId,
      )!;
      if (
        spent.cap !== undefined &&
        formulaMax(
          spent,
          stat.level,
          levelsByName(attributes, character),
          character.level,
        ) >= spent.cap
      )
        return fail('character.errors.attributeCapped');
      // A new level raises the max and the current value by the same delta.
      const raised = setAttribute(character, action.attributeId, {
        level: stat.level + 1,
        current: stat.current,
      });
      const after = statsOf(raised).find((entry) => entry.attributeId === action.attributeId)!;
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
      const stat = statsOf(character).find((entry) => entry.attributeId === action.attributeId);
      if (!stat) return fail('character.errors.unknownAttribute');
      if (stat.level < 1) return fail('character.errors.levelZero');
      // Undoes a spend: max and current drop by the formula delta.
      const lowered = setAttribute(character, action.attributeId, {
        level: stat.level - 1,
        current: stat.current,
      });
      const after = statsOf(lowered).find((entry) => entry.attributeId === action.attributeId)!;
      const next = setAttribute(lowered, action.attributeId, {
        level: after.level,
        current: Math.max(
          0,
          Math.min(after.max, stat.current + (after.max - stat.max)),
        ),
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
      const leveled: T = { ...character, xp: grant.xp, level: grant.level };
      // A new level can raise maxima that read playerLevel: current rises by the same delta.
      const before = statsOf(character);
      const after = statsOf(leveled);
      let next = leveled;
      for (const stat of after) {
        const old = before.find(
          (entry) => entry.attributeId === stat.attributeId,
        );
        if (!old || stat.max === old.max) continue;
        next = setAttribute(next, stat.attributeId, {
          level: stat.level,
          current: Math.max(
            0,
            Math.min(stat.max, old.current + (stat.max - old.max)),
          ),
        });
      }
      return {
        ok: true,
        character: {
          ...next,
          statPoints: character.statPoints + grant.statPointsGranted,
          skillPoints:
            character.skillPoints +
            grant.levelsGained * levelRules.skillPointsPerLevel,
        },
      };
    }
    case 'grant-skill-points': {
      if (action.amount < 1 || action.amount > MAX_GRANTED_POINTS)
        return fail('character.errors.invalidAmount');
      return {
        ok: true,
        character: {
          ...character,
          skillPoints: character.skillPoints + action.amount,
        },
      };
    }
    case 'learn-skill': {
      const tree = catalogue.classes.find(
        (entry) => entry.id === character.classId,
      )?.tree;
      const node = tree?.find((entry) => entry.skillId === action.skillId);
      const skill = catalogue.skills.find(
        (entry) => entry.id === action.skillId,
      );
      if (!tree || !node || !skill) return fail('character.errors.notInTree');
      const status = treeNodeStates(tree, character).find(
        (entry) => entry.skillId === action.skillId,
      )!;
      const rank = rankOf(character, action.skillId);
      if (status.state === 'locked')
        return fail('character.errors.skillLocked');
      if (rank >= skill.maxRank) return fail('character.errors.skillMaxRank');
      if (character.skillPoints < skill.pointCost)
        return fail('character.errors.noSkillPoints');
      return {
        ok: true,
        character: {
          ...withRank(character, action.skillId, rank + 1),
          skillPoints: character.skillPoints - skill.pointCost,
        },
      };
    }
    case 'refund-skill': {
      const rank = rankOf(character, action.skillId);
      if (rank < 1) return fail('character.errors.skillNotLearned');
      const tree =
        catalogue.classes.find((entry) => entry.id === character.classId)
          ?.tree ?? [];
      const needed = tree.some(
        (node) =>
          rankOf(character, node.skillId) > 0 &&
          node.requires.some(
            (req) => req.skillId === action.skillId && req.rank > rank - 1,
          ),
      );
      if (needed) return fail('character.errors.skillNeeded');
      const back = tree.some((node) => node.skillId === action.skillId)
        ? (catalogue.skills.find((entry) => entry.id === action.skillId)
            ?.pointCost ?? 0)
        : 0;
      return {
        ok: true,
        character: {
          ...withRank(character, action.skillId, rank - 1),
          skillPoints: character.skillPoints + back,
        },
      };
    }
    case 'set-skill': {
      const skill = catalogue.skills.find(
        (entry) => entry.id === action.skillId,
      );
      if (!skill) return fail('character.errors.unknownSkill');
      if (action.rank < 0 || action.rank > skill.maxRank)
        return fail('character.errors.invalidRank');
      return {
        ok: true,
        character: withRank(character, action.skillId, action.rank),
      };
    }
    case 'set-class': {
      const next = catalogue.classes.find(
        (entry) => entry.id === action.classId,
      );
      if (!next) return fail('character.errors.unknownClass');
      const old = catalogue.classes.find(
        (entry) => entry.id === character.classId,
      );
      let refunded = 0;
      const treeIds = new Set(old?.tree.map((node) => node.skillId) ?? []);
      for (const entry of character.skills)
        if (treeIds.has(entry.skillId))
          refunded +=
            entry.rank *
            (catalogue.skills.find((s) => s.id === entry.skillId)?.pointCost ??
              0);
      return {
        ok: true,
        character: {
          ...character,
          classId: next.id,
          skillPoints: character.skillPoints + refunded,
          skills: character.skills.filter(
            (entry) => !treeIds.has(entry.skillId),
          ),
        },
      };
    }
    case 'set-current': {
      const stat = statsOf(character).find((entry) => entry.attributeId === action.attributeId);
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
      let next: T = {
        ...character,
        inventory: character.inventory.filter(
          (candidate) => candidate.id !== entry.id,
        ),
      };
      for (const modifier of entry.item.modifiers) {
        const stat = statsOf(next).find((candidate) => candidate.name === modifier.attribute);
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
      if (catalogue.sellAnywhere === false)
        return fail('character.errors.sellDisabled');
      return {
        ok: true,
        character: {
          ...character,
          money:
            character.money +
            sellAnywherePrice(entry.item.price, {
              sellAnywhereRatio: catalogue.sellAnywhereRatio ?? 1,
            }),
          inventory: character.inventory.filter(
            (candidate) => candidate.id !== entry.id,
          ),
        },
      };
    }
  }
}

/** Sets one attribute's entry, adding it when the attribute was added to the world after the character. */
function setAttribute<T extends Sheet>(
  character: T,
  attributeId: string,
  values: Omit<CharacterAttribute, 'attributeId'>,
): T {
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

function rankOf(sheet: Sheet, skillId: string): number {
  return sheet.skills.find((entry) => entry.skillId === skillId)?.rank ?? 0;
}

/** The sheet with one skill at a rank (added at the end, replaced in place, or removed at 0). */
function withRank<T extends Sheet>(sheet: T, skillId: string, rank: number): T {
  const exists = sheet.skills.some((entry) => entry.skillId === skillId);
  const skills =
    rank < 1
      ? sheet.skills.filter((entry) => entry.skillId !== skillId)
      : exists
        ? sheet.skills.map((entry) =>
            entry.skillId === skillId ? { ...entry, rank } : entry,
          )
        : [...sheet.skills, { skillId, rank }];
  return { ...sheet, skills };
}
