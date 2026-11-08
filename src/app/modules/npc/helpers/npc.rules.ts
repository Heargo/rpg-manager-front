import { Npc, NPC_ROLES, NpcFilter } from '../models/npc';

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
