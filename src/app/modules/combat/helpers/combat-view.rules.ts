import { normalizeName } from '../../../core/helpers/formula';
import { Npc, NpcRole, NpcVisibility } from '../../npc/models/npc';
import { World } from '../../world/models/world';
import {
  CombatAttribute,
  Combatant,
  CombatantView,
  CombatView,
  Encounter,
} from '../models/combat';

type WorldRules = Pick<World, 'npcs' | 'characters' | 'npcVisibility'>;

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
  return {
    round: encounter.round,
    activeId: encounter.combatants[encounter.turn]?.id,
    combatants: encounter.combatants.map((c) =>
      projectCombatant(c, encounter.lifeAttribute, world, full),
    ),
    pending: encounter.pending,
    log: encounter.log,
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
    statuses: c.statuses,
    down: c.down,
    initiative: c.initiative,
    position: c.position,
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
