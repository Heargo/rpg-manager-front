import { Character } from '../../world/models/world';
import { Npc } from '../../npc/models/npc';
import { Cell, GridSize, placeUnplaced } from './combat-grid.rules';

export const MIN_NPC_COUNT = 1;
export const MAX_NPC_COUNT = 20;

export interface StartPicks {
  characterIds: string[];
  npcs: { npcId: string; count: number; side: 'enemy' | 'ally' }[];
  positions?: Record<string, Cell>;
}

/** The start payload from the picked characters and NPCs: count defaults to 1 and is clamped 1-20, unknown NPC ids are dropped, an NPC with the enemy role fights on the enemy side. */
export function startPicks(
  characterIds: string[],
  npcIds: string[],
  counts: Record<string, number>,
  npcs: Npc[],
  positions?: Record<string, Cell>,
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
    ...(positions ? { positions } : {}),
  };
}

export interface StartSlot {
  key: string;
  name: string;
  side: 'party' | 'ally' | 'enemy';
  portraitId?: string;
}

/** A future token per picked character (`character:<id>`) and NPC copy (`npc:<id>:<n>`), in the order the encounter creates them. */
export function startSlots(
  picks: StartPicks,
  characters: Character[],
  npcs: Npc[],
): StartSlot[] {
  const slots: StartSlot[] = [];
  for (const id of picks.characterIds) {
    const character = characters.find((c) => c.id === id);
    if (!character) continue;
    slots.push({
      key: `character:${id}`,
      name: character.name,
      side: 'party',
      ...(character.portraitId ? { portraitId: character.portraitId } : {}),
    });
  }
  for (const pick of picks.npcs) {
    const npc = npcs.find((n) => n.id === pick.npcId);
    if (!npc) continue;
    for (let n = 1; n <= pick.count; n++)
      slots.push({
        key: `npc:${pick.npcId}:${n}`,
        name: `${npc.name} ${n}`,
        side: pick.side,
        ...(npc.portraitId ? { portraitId: npc.portraitId } : {}),
      });
  }
  return slots;
}

/** Each slot with the cell it is shown on: its chosen cell when valid and free, else the default (party left, enemies right). */
export function setupTokens(
  slots: StartSlot[],
  positions: Record<string, Cell>,
  grid: GridSize,
): (StartSlot & Cell)[] {
  const taken: Cell[] = [];
  const chosen = slots.map((slot) => {
    const cell = positions[slot.key];
    const valid =
      cell &&
      Number.isInteger(cell.x) &&
      Number.isInteger(cell.y) &&
      cell.x >= 0 &&
      cell.y >= 0 &&
      cell.x < grid.columns &&
      cell.y < grid.rows &&
      !taken.some((t) => t.x === cell.x && t.y === cell.y);
    if (valid) taken.push(cell);
    return { ...slot, ...(valid ? { position: cell } : {}) };
  });
  return placeUnplaced(chosen, grid).map(({ position, ...slot }) => ({
    ...slot,
    x: position?.x ?? 0,
    y: position?.y ?? 0,
  }));
}
