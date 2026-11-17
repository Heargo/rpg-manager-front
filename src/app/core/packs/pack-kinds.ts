import {
  EQUIPMENT_SLOTS,
  ITEM_TYPES,
  ItemSlot,
  ItemType,
} from '../models/item';
import { NPC_ROLES } from '../../modules/npc/models/npc';
import { SKILL_TYPES } from '../../modules/skill/models/skill';

export const SKILL_EFFECT_KINDS = ['damage', 'heal', 'modify'] as const;

export const KIND_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type Fields = Record<string, unknown>;

/** Where a kind stands in its tree, as far as the pack declares it. */
export interface KindPosition {
  id: string;
  hasParent: boolean;
  /** The root of its chain; undefined when the chain leaves the pack (parent declared elsewhere). */
  root: Fields | undefined;
}

/** What a domain knows about its kinds: the fields they may carry, and the checks on them. */
export interface KindSchema {
  fields: readonly string[];
  check(kind: Fields, position: KindPosition): string[];
}

const isObject = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `shared`: the shared kinds a domain kind takes, a list of kebab-case ids (inherited down the chain). */
function checkShared(kind: Fields): string[] {
  const shared = kind['shared'];
  if (shared === undefined) return [];
  if (!Array.isArray(shared))
    return ['shared must be a list of kebab-case shared kind ids'];
  return shared
    .filter((id) => typeof id !== 'string' || !KIND_ID.test(id))
    .map((id) => `shared "${String(id)}" must be a kebab-case shared kind id`);
}

/** The shared kinds tree: ids and parents only, the words live in `common.json`. */
export const SHARED_KIND_SCHEMA: KindSchema = {
  fields: [],
  check: () => [],
};

/** Items: `type` only on a root, `slot` only on an equipment chain. */
export const ITEM_KIND_SCHEMA: KindSchema = {
  fields: ['type', 'slot', 'shared'],
  check(kind, { hasParent, root }) {
    const errors: string[] = checkShared(kind);
    if (kind['type'] !== undefined) {
      if (hasParent) errors.push('type is only allowed on a root kind');
      else if (!(ITEM_TYPES as readonly unknown[]).includes(kind['type']))
        errors.push(`type must be one of ${ITEM_TYPES.join(', ')}`);
    } else if (!hasParent) errors.push('a root kind needs a type');
    if (kind['slot'] !== undefined) {
      if (!(EQUIPMENT_SLOTS as readonly unknown[]).includes(kind['slot']))
        errors.push(`slot must be one of ${EQUIPMENT_SLOTS.join(', ')}`);
      else if (
        hasParent
          ? root && root['type'] !== 'equipment'
          : kind['type'] !== 'equipment'
      )
        errors.push('slot is only allowed on an equipment chain');
    }
    return errors;
  },
};

/** NPCs: `roles` required on a root (a child may override), `person` on a root only. */
export const NPC_KIND_SCHEMA: KindSchema = {
  fields: ['roles', 'person', 'shared'],
  check(kind, { hasParent }) {
    const errors: string[] = checkShared(kind);
    const roles = kind['roles'];
    if (roles !== undefined) {
      if (
        !Array.isArray(roles) ||
        roles.length === 0 ||
        !roles.every((role) => (NPC_ROLES as readonly unknown[]).includes(role))
      )
        errors.push(
          `roles must be a non-empty list of ${NPC_ROLES.join(', ')}`,
        );
    } else if (!hasParent) errors.push('a root kind needs roles');
    if (kind['person'] !== undefined) {
      if (hasParent) errors.push('person is only allowed on a root kind');
      else if (typeof kind['person'] !== 'boolean')
        errors.push('person must be true or false');
    }
    return errors;
  },
};

/** Skills: `type` required on a root and only there, `effect` only on an active chain. */
export const SKILL_KIND_SCHEMA: KindSchema = {
  fields: ['type', 'effect', 'shared'],
  check(kind, { hasParent, root }) {
    const errors: string[] = checkShared(kind);
    if (kind['type'] !== undefined) {
      if (hasParent) errors.push('type is only allowed on a root kind');
      else if (!(SKILL_TYPES as readonly unknown[]).includes(kind['type']))
        errors.push(`type must be one of ${SKILL_TYPES.join(', ')}`);
    } else if (!hasParent) errors.push('a root kind needs a type');
    if (kind['effect'] !== undefined) {
      if (!(SKILL_EFFECT_KINDS as readonly unknown[]).includes(kind['effect']))
        errors.push(`effect must be one of ${SKILL_EFFECT_KINDS.join(', ')}`);
      else if (
        hasParent
          ? root && root['type'] !== 'active'
          : kind['type'] !== 'active'
      )
        errors.push('effect is only allowed on an active chain');
    }
    return errors;
  },
};

/** Classes: `skills`, the skill kinds the class favours, allowed on any level; the nearest level that has some wins. */
export const CLASS_KIND_SCHEMA: KindSchema = {
  fields: ['skills', 'shared'],
  check(kind) {
    const errors = checkShared(kind);
    const skills = kind['skills'];
    if (
      skills !== undefined &&
      (!Array.isArray(skills) ||
        !skills.every((id) => typeof id === 'string' && KIND_ID.test(id)))
    )
      errors.push('skills must be a list of kebab-case skill kind ids');
    return errors;
  },
};

/**
 * Checks a domain's kind tree: kebab-case ids, the fields the schema allows, no cycle inside the pack, then the
 * schema's own rules. A `parent` that the pack does not declare is allowed (it lives in another pack).
 */
export function validateKindTree(
  domain: string,
  kinds: unknown,
  schema: KindSchema,
  where = `domains.${domain}.kinds`,
): string[] {
  if (!isObject(kinds)) return [`${where} must be an object`];
  const errors: string[] = [];
  const valid = new Map<string, Fields>();

  for (const [id, kind] of Object.entries(kinds)) {
    if (!KIND_ID.test(id)) {
      errors.push(`${where}: "${id}" is not a kebab-case id`);
      continue;
    }
    if (!isObject(kind)) {
      errors.push(`${where}.${id} must be an object`);
      continue;
    }
    let sound = true;
    for (const field of Object.keys(kind))
      if (field !== 'parent' && !schema.fields.includes(field)) {
        errors.push(`${where}.${id}: unknown field "${field}"`);
        sound = false;
      }
    if (kind['parent'] !== undefined) {
      const parent = kind['parent'];
      if (typeof parent !== 'string' || !KIND_ID.test(parent)) {
        errors.push(`${where}.${id}: parent must be a kebab-case id`);
        sound = false;
      }
    }
    if (sound) valid.set(id, kind);
  }

  const inCycle = new Set<string>();
  for (const start of valid.keys()) {
    const walked: string[] = [];
    let current: string | undefined = start;
    while (current !== undefined && valid.has(current)) {
      const at = walked.indexOf(current);
      if (at >= 0) {
        const loop = walked.slice(at);
        if (!loop.some((id) => inCycle.has(id))) {
          errors.push(`${where}: cycle between ${loop.join(', ')}`);
        }
        for (const id of loop) inCycle.add(id);
        break;
      }
      walked.push(current);
      current = valid.get(current)?.['parent'] as string | undefined;
    }
  }

  for (const [id, kind] of valid) {
    if (inCycle.has(id)) continue;
    let top: Fields = kind;
    let resolved = true;
    while (top['parent'] !== undefined) {
      const next = valid.get(top['parent'] as string);
      if (!next || [...inCycle].some((c) => valid.get(c) === next)) {
        resolved = false;
        break;
      }
      top = next;
    }
    const problems = schema.check(kind, {
      id,
      hasParent: kind['parent'] !== undefined,
      root: resolved ? top : undefined,
    });
    for (const problem of problems) errors.push(`${where}.${id}: ${problem}`);
  }
  return errors;
}

interface ResolvableKind {
  parent?: string;
  type?: ItemType;
  slot?: ItemSlot;
}

/**
 * The type and slot of an items kind: walks up from `start` through `own`, then through `fallback` (the Base trees)
 * for a kind the pack does not declare. The nearest slot wins; null when the chain never reaches a typed root.
 */
export function resolveItemKind(
  start: string,
  own: Record<string, ResolvableKind>,
  fallback: Record<string, ResolvableKind>,
): { type: ItemType; slot: ItemSlot } | null {
  let slot: ItemSlot = 'none';
  const seen = new Set<string>();
  for (let id: string | undefined = start; id;) {
    if (seen.has(id)) return null;
    seen.add(id);
    const kind: ResolvableKind | undefined = own[id] ?? fallback[id];
    if (!kind) return null;
    if (slot === 'none' && kind.slot) slot = kind.slot;
    if (kind.parent === undefined)
      return kind.type ? { type: kind.type, slot } : null;
    id = kind.parent;
  }
  return null;
}

/** The Base kind that stands for an item type and slot (interim, until kinds are picked directly). */
export function baseKindFor(type: ItemType, slot: ItemSlot): string {
  if (type !== 'equipment') return type;
  if (slot === 'weapon1') return 'weapon';
  if (slot === 'weapon2') return 'shield';
  return slot === 'none' ? 'equipment' : slot;
}
