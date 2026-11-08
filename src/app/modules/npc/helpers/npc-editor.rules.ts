import { generateItemName } from '../../../core/generators/name-generator';
import { pick, randomInt } from '../../../core/generators/random';
import { RandomSource } from '../../../core/generators/random-source';
import { WordList } from '../../../core/generators/word-list';
import { EQUIPMENT_SLOTS } from '../../../core/models/item';
import {
  formulaMax,
  levelsByName,
} from '../../character/helpers/character-stats';
import { levelCost, levelRarity } from '../../character/helpers/level.rules';
import { Item, World } from '../../world/models/world';
import { Npc, NPC_ROLES, NpcRole } from '../models/npc';
import { validateNpc } from './npc.rules';

export interface NpcEditorIssue {
  field: string;
  code: string;
}

export interface ParsedNpc {
  npc?: Npc;
  issues: NpcEditorIssue[];
}

/** An NPC form to start from: a story NPC at level 1 with the world's starting points and money. */
export function emptyNpc(world: World): Npc {
  return {
    id: '',
    name: '',
    description: '',
    roles: ['story'],
    level: 1,
    xp: 0,
    statPoints: world.startingStatPoints,
    money: 0,
    updatedAt: 0,
    skillPoints: 0,
    skills: [],
    attributes: [],
    inventory: [],
    xpReward: 0,
    loot: [],
  };
}

function xpAtLevel(level: number, world: World): number {
  let xp = 0;
  for (let l = 2; l <= level; l++) xp += levelCost(world.levelCurve, l);
  return xp;
}

/**
 * The NPC at that level, with its XP at the start of the level on the world's curve. The current value of each
 * attribute moves by the change of its max (formulas can read the level), never above the new max.
 */
export function setNpcLevel(npc: Npc, level: number, world: World): Npc {
  const levels = levelsByName(world.attributes, npc);
  const attributes = npc.attributes.map((entry) => {
    const attribute = world.attributes.find((a) => a.id === entry.attributeId);
    if (!attribute) return entry;
    const before = formulaMax(attribute, entry.level, levels, npc.level);
    const after = formulaMax(attribute, entry.level, levels, level);
    const bonus = npc.inventory
      .filter((item) => item.equipped)
      .flatMap((item) => item.item.modifiers)
      .filter((modifier) => modifier.attribute === attribute.name)
      .reduce((sum, modifier) => sum + modifier.value, 0);
    const current = Math.min(entry.current + after - before, after + bonus);
    return { ...entry, current: Math.max(0, current) };
  });
  return { ...npc, level, xp: xpAtLevel(level, world), attributes };
}

/** The NPC with this attribute at that level (its current value follows the formula). */
export function setNpcAttributeLevel(
  npc: Npc,
  attributeId: string,
  level: number,
  world: World,
): Npc {
  const attribute = world.attributes.find((a) => a.id === attributeId);
  if (!attribute) return npc;
  const exists = npc.attributes.some((a) => a.attributeId === attributeId);
  const attributes = exists
    ? npc.attributes.map((a) =>
        a.attributeId === attributeId ? { ...a, level } : a,
      )
    : [...npc.attributes, { attributeId, level, current: 0 }];
  const next = { ...npc, attributes };
  const levels = levelsByName(world.attributes, next);
  return {
    ...next,
    attributes: attributes.map((a) =>
      a.attributeId === attributeId
        ? { ...a, current: formulaMax(attribute, level, levels, npc.level) }
        : a,
    ),
  };
}

/** The NPC with these roles; what belongs to a role it no longer has is dropped. */
export function setNpcRoles(npc: Npc, roles: NpcRole[]): Npc {
  const next: Npc = { ...npc, roles };
  if (!roles.includes('merchant')) delete next.merchant;
  if (!roles.includes('enemy')) {
    next.xpReward = 0;
    next.loot = [];
  }
  return next;
}

/** The NPC with a copy of the item added to its inventory. */
export function addNpcItem(npc: Npc, item: Item, entryId: string): Npc {
  return {
    ...npc,
    inventory: [
      ...npc.inventory,
      {
        id: entryId,
        item: structuredClone(item),
        equipped: false,
        position: npc.inventory.length,
      },
    ],
  };
}

export function removeNpcEntry(npc: Npc, entryId: string): Npc {
  return {
    ...npc,
    inventory: npc.inventory
      .filter((entry) => entry.id !== entryId)
      .map((entry, position) => ({ ...entry, position })),
    loot: npc.loot.filter((id) => id !== entryId),
  };
}

export function toggleNpcEquipped(npc: Npc, entryId: string): Npc {
  return {
    ...npc,
    inventory: npc.inventory.map((entry) =>
      entry.id === entryId ? { ...entry, equipped: !entry.equipped } : entry,
    ),
  };
}

export function toggleNpcLoot(npc: Npc, entryId: string): Npc {
  return {
    ...npc,
    loot: npc.loot.includes(entryId)
      ? npc.loot.filter((id) => id !== entryId)
      : [...npc.loot, entryId],
  };
}

/** The NPCs with this one added (new id) or replacing the one with the same id, in place. */
export function upsertNpc(
  npcs: readonly Npc[],
  input: Omit<Npc, 'id'> & { id?: string },
  newId: () => string,
): { npcs: Npc[]; npc: Npc } {
  const index = input.id ? npcs.findIndex((npc) => npc.id === input.id) : -1;
  if (index < 0) {
    const npc: Npc = { ...input, id: newId() };
    return { npcs: [...npcs, npc], npc };
  }
  const npc: Npc = { ...input, id: npcs[index].id };
  return { npcs: npcs.map((current, i) => (i === index ? npc : current)), npc };
}

/** The NPC as editable JSON (everything but the id). */
export function npcToJson(npc: Npc): string {
  const { id: _id, ...rest } = npc;
  return JSON.stringify(rest, null, 2);
}

/** Reads JSON text onto the NPC being edited (which keeps its id); `npc` is only set when there is no issue. */
export function parseNpcJson(text: string, base: Npc): ParsedNpc {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { issues: [{ field: 'json', code: 'invalid-json' }] };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { issues: [{ field: 'json', code: 'not-object' }] };
  }
  const npc = { ...base, ...(data as object), id: base.id } as Npc;
  const issues: NpcEditorIssue[] = [];
  if (typeof npc.name !== 'string')
    issues.push({ field: 'name', code: 'invalid' });
  if (!Array.isArray(npc.roles))
    issues.push({ field: 'roles', code: 'invalid' });
  if (!Array.isArray(npc.loot)) issues.push({ field: 'loot', code: 'invalid' });
  for (const field of ['attributes', 'inventory', 'skills'] as const) {
    if (!Array.isArray(npc[field])) issues.push({ field, code: 'invalid' });
  }
  for (const field of ['level', 'xp', 'money', 'statPoints'] as const) {
    if (!Number.isFinite(npc[field])) issues.push({ field, code: 'invalid' });
  }
  if (typeof npc.description !== 'string') {
    issues.push({ field: 'description', code: 'invalid' });
  }
  if (
    Array.isArray(npc.attributes) &&
    !npc.attributes.every(
      (a) =>
        isObject(a) &&
        typeof a.attributeId === 'string' &&
        Number.isFinite(a.level) &&
        Number.isFinite(a.current),
    )
  ) {
    issues.push({ field: 'attributes', code: 'invalid' });
  }
  if (
    Array.isArray(npc.inventory) &&
    !npc.inventory.every(
      (e) =>
        isObject(e) &&
        typeof e.id === 'string' &&
        isObject(e.item) &&
        typeof e.equipped === 'boolean',
    )
  ) {
    issues.push({ field: 'inventory', code: 'invalid' });
  }
  if (issues.length) return { issues };
  const problems: NpcEditorIssue[] = validateNpc(npc);
  return problems.length ? { issues: problems } : { npc, issues: [] };
}

function isObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object';
}

/** A random NPC from the world's rules and catalogue: level, attribute levels, gear of its rarity and a name from the word list. */
export function generateNpc(
  world: World,
  random: RandomSource,
  words: WordList,
): Omit<Npc, 'id'> {
  const level = randomInt(random, 1, world.maxLevel);
  const rarity = levelRarity(level, world.maxLevel);
  const role = pick(random, NPC_ROLES);

  const available =
    world.startingStatPoints + (level - 1) * world.statPointsPerLevel;
  const spent = randomInt(random, Math.ceil(available / 2), available);
  const levels = new Map(world.attributes.map((a) => [a.id, 0]));
  if (world.attributes.length) {
    for (let i = 0; i < spent; i++) {
      const attribute = pick(random, world.attributes);
      levels.set(attribute.id, levels.get(attribute.id)! + 1);
    }
  }

  const inventory: Npc['inventory'] = [];
  const slots = [...EQUIPMENT_SLOTS].filter((slot) =>
    world.items.some(
      (item) =>
        item.type === 'equipment' &&
        item.slot === slot &&
        item.rarity === rarity,
    ),
  );
  const count = slots.length ? randomInt(random, 1, slots.length) : 0;
  for (let i = 0; i < count; i++) {
    const slot = slots.splice(randomInt(random, 0, slots.length - 1), 1)[0];
    const item = pick(
      random,
      world.items.filter(
        (it) =>
          it.type === 'equipment' && it.slot === slot && it.rarity === rarity,
      ),
    );
    inventory.push({
      id: `gear-${i}`,
      item: structuredClone(item),
      equipped: true,
      position: i,
    });
  }

  const draft: Npc = {
    ...emptyNpc(world),
    name: generateItemName(random, words, { base: 'item', rarity }),
    roles: [role],
    inventory,
    money: randomInt(random, 0, level * 50),
    xpReward: role === 'enemy' ? level * 10 : 0,
  };
  const sized = setNpcLevel(draft, level, world);
  const attributes = world.attributes.reduce(
    (npc, attribute) =>
      setNpcAttributeLevel(npc, attribute.id, levels.get(attribute.id)!, world),
    { ...sized, statPoints: available - spent },
  );
  const { id: _id, ...generated } = attributes;
  return generated;
}
