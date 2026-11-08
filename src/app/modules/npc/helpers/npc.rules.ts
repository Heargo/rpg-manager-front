import { Npc, NPC_ROLES, NpcFilter, NpcRole } from '../models/npc';

export interface NpcIssue {
  field: 'name' | 'roles' | 'xpReward' | 'loot' | 'merchant';
  code: 'required' | 'invalid' | 'unknown-item';
}

const MAX_RATIO = 10;

export function validateNpc(npc: Npc): NpcIssue[] {
  const issues: NpcIssue[] = [];
  if (npc.name.trim() === '') issues.push({ field: 'name', code: 'required' });
  if (npc.roles.length === 0) issues.push({ field: 'roles', code: 'required' });
  else if (
    !npc.roles.every((role) => (NPC_ROLES as readonly string[]).includes(role))
  )
    issues.push({ field: 'roles', code: 'invalid' });
  if (!Number.isInteger(npc.xpReward) || npc.xpReward < 0)
    issues.push({ field: 'xpReward', code: 'invalid' });
  const entryIds = new Set(npc.inventory.map((entry) => entry.id));
  if (!npc.loot.every((id) => entryIds.has(id)))
    issues.push({ field: 'loot', code: 'unknown-item' });
  if (npc.merchant) {
    const ratios = [npc.merchant.buyRatio, npc.merchant.sellRatio];
    if (
      !ratios.every(
        (r) =>
          r === undefined || (Number.isFinite(r) && r >= 0 && r <= MAX_RATIO),
      )
    ) {
      issues.push({ field: 'merchant', code: 'invalid' });
    }
  }
  return issues;
}

export function duplicateNpc(npc: Npc, newId: () => string): Npc {
  return { ...structuredClone(npc), id: newId(), name: `${npc.name} (copy)` };
}

export function filterNpcs(npcs: Npc[], filter: NpcFilter): Npc[] {
  const search = filter.search.trim().toLowerCase();
  return npcs.filter(
    (npc) =>
      npc.name.toLowerCase().includes(search) &&
      (filter.roles.length === 0 ||
        npc.roles.some((role) => filter.roles.includes(role))) &&
      npc.level >= filter.minLevel &&
      npc.level <= filter.maxLevel,
  );
}

/** The NPCs with a copy of the one with this id added at the end (unchanged when there is none). */
export function addNpcCopy(
  npcs: Npc[],
  id: string,
  newId: () => string,
): Npc[] {
  const source = npcs.find((npc) => npc.id === id);
  return source ? [...npcs, duplicateNpc(source, newId)] : npcs;
}

const SAMPLE_NPCS: [string, NpcRole, number, number][] = [
  ['elder', 'story', 8, 0],
  ['merchant', 'merchant', 4, 0],
  ['goblin', 'enemy', 2, 30],
];

/** The example NPCs of the sandbox world (a story, a merchant and an enemy), named through `translate`. */
export function sampleNpcs(translate: (key: string) => string): Npc[] {
  return SAMPLE_NPCS.map(([key, role, level, xpReward]) => ({
    id: `sandbox-npc-${key}`,
    name: translate(`tools.sandbox.npcs.${key}.name`),
    description: translate(`tools.sandbox.npcs.${key}.description`),
    roles: [role],
    level,
    xpReward,
    loot: [],
    statPoints: 0,
    xp: 0,
    money: 0,
    updatedAt: 0,
    skillPoints: 0,
    skills: [],
    attributes: [],
    inventory: [],
  }));
}
