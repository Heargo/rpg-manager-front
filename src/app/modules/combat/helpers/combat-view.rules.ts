import { normalizeName } from '../../../core/helpers/formula';
import { movementAllowance, placeUnplaced } from './combat-grid.rules';
import { Npc, NpcRole, NpcVisibility } from '../../npc/models/npc';
import { effectiveInitiativeMode } from '../../world/helpers/world-combat.rules';
import { World } from '../../world/models/world';
import {
  CombatAttribute,
  Combatant,
  CombatantView,
  CombatView,
  Encounter,
  PendingResult,
  PendingResultView,
} from '../models/combat';

type WorldRules = Pick<World, 'npcs' | 'characters' | 'npcVisibility'> &
  Partial<Pick<World, 'combat'>>;

/** The roles whose visibility ticks apply to an NPC combatant whose catalogue entry is gone. */
const ROLE_OF_SIDE: Record<string, NpcRole> = { enemy: 'enemy', ally: 'story' };

const percentOf = (life: CombatAttribute | undefined) =>
  life && life.max > 0 ? Math.round((life.current / life.max) * 100) : 0;

/**
 * The encounter as one viewer sees it. Players get the NPC combatants filtered by the world's NPC visibility rules (union of the
 * ticks of the NPC's roles); the GM (`full`) sees every field. Rewards, money, loot, skills and cooldowns are never in a view.
 */
export function projectEncounter(
  encounter: Encounter,
  world: WorldRules,
  full = false,
): CombatView {
  const grid = world.combat?.grid;
  /** Combatants without a cell (the grid came on mid-fight, or they were just added) stand at their default place. */
  const placed = grid?.enabled
    ? placeUnplaced(encounter.combatants, grid)
    : encounter.combatants;
  return {
    initiativeMode: world.combat && effectiveInitiativeMode(world.combat),
    ...(world.combat?.grid.enabled && {
      grid: {
        columns: world.combat.grid.columns,
        rows: world.combat.grid.rows,
        ...(world.combat.grid.imageId !== undefined && {
          imageId: world.combat.grid.imageId,
        }),
      },
    }),
    round: encounter.round,
    activeId: encounter.combatants[encounter.turn]?.id,
    combatants: placed.map((c) =>
      projectCombatant(c, encounter.lifeAttribute, world, full),
    ),
    pending: encounter.pending.map((result) =>
      full ? result : projectPending(result, encounter, world),
    ),
    log: encounter.log,
    ...(encounter.closedRollId !== undefined && {
      closedRollId: encounter.closedRollId,
    }),
  };
}

function projectCombatant(
  c: Combatant,
  lifeAttribute: string,
  world: WorldRules,
  full: boolean,
): CombatantView {
  const life = c.attributes.find(
    (a) => normalizeName(a.name) === normalizeName(lifeAttribute),
  );
  const base = {
    id: c.id,
    name: c.name,
    side: c.side,
    characterId: c.characterId,
    statuses: c.statuses,
    down: c.down,
    initiative: c.initiative,
    position: c.position,
    ...(world.combat?.grid.enabled && {
      movement: movementAllowance(world.combat.movement, c),
    }),
    actions: c.actions,
  };
  const npc: Npc | undefined = c.npcId
    ? world.npcs.find((n) => n.id === c.npcId)
    : undefined;
  const character = c.characterId
    ? world.characters.find((ch) => ch.id === c.characterId)
    : undefined;
  const everything = full || !!c.characterId;
  const roles =
    npc?.roles ?? (ROLE_OF_SIDE[c.side] ? [ROLE_OF_SIDE[c.side]] : []);
  const shown = (field: keyof NpcVisibility) =>
    everything || roles.some((role) => world.npcVisibility[role]?.[field]);
  const lifeCurrent = life && { current: life.current, max: life.max };
  return {
    ...base,
    portraitId: character?.portraitId ?? npc?.portraitId,
    level: shown('level') ? c.level : undefined,
    description: shown('description') ? npc?.description : undefined,
    lifeBar:
      life && shown('lifeBar') ? { percent: percentOf(life) } : undefined,
    life: lifeCurrent && shown('lifeNumbers') ? lifeCurrent : undefined,
    attributes: shown('attributes')
      ? c.attributes.map(({ name, current, max }) => ({ name, current, max }))
      : undefined,
    equipment:
      shown('equipment') && npc
        ? npc.inventory
            .filter((e) => e.equipped)
            .map((e) => ({ name: e.item.name }))
        : undefined,
  };
}

/** A pending result for players: the attribute an effect names is dropped when they can't see it on the NPC target. */
function projectPending(
  result: PendingResult,
  encounter: Encounter,
  world: WorldRules,
): PendingResultView {
  const target = encounter.combatants.find((c) => c.id === result.targetId);
  if (!target || target.characterId) return result;
  const npc = target.npcId
    ? world.npcs.find((n) => n.id === target.npcId)
    : undefined;
  const roles =
    npc?.roles ??
    (ROLE_OF_SIDE[target.side] ? [ROLE_OF_SIDE[target.side]] : []);
  const shown = (field: keyof NpcVisibility) =>
    roles.some((role) => world.npcVisibility[role]?.[field]);
  const lifeShown = shown('lifeBar') || shown('lifeNumbers');
  const canSee = (attribute: string | undefined) =>
    shown('attributes') ||
    (lifeShown &&
      attribute !== undefined &&
      normalizeName(attribute) === normalizeName(encounter.lifeAttribute));
  return {
    ...result,
    effects: result.effects.map(({ attribute, ...effect }) =>
      canSee(attribute) ? { ...effect, attribute } : effect,
    ),
  };
}
