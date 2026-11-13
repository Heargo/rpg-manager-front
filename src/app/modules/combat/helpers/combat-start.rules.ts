import { Npc } from '../../npc/models/npc';

export const MIN_NPC_COUNT = 1;
export const MAX_NPC_COUNT = 20;

export interface StartPicks {
  characterIds: string[];
  npcs: { npcId: string; count: number; side: 'enemy' | 'ally' }[];
}

/** The start payload from the picked characters and NPCs: count defaults to 1 and is clamped 1-20, unknown NPC ids are dropped, an NPC with the enemy role fights on the enemy side. */
export function startPicks(
  characterIds: string[],
  npcIds: string[],
  counts: Record<string, number>,
  npcs: Npc[],
): StartPicks {
  return {
    characterIds,
    npcs: npcIds.flatMap((npcId) => {
      const npc = npcs.find((n) => n.id === npcId);
      if (!npc) return [];
      const count = Math.max(
        MIN_NPC_COUNT,
        Math.min(MAX_NPC_COUNT, counts[npcId] ?? MIN_NPC_COUNT),
      );
      return [
        {
          npcId,
          count,
          side: npc.roles.includes('enemy')
            ? ('enemy' as const)
            : ('ally' as const),
        },
      ];
    }),
  };
}
