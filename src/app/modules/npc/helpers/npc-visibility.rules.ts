import { Skill } from '../../skill/models/skill';
import {
  attributeStats,
  barStats,
} from '../../character/helpers/character-stats';
import { World } from '../../world/models/world';
import {
  Npc,
  NPC_ROLES,
  NpcVisibility,
  NpcVisibilityRules,
  PublicNpc,
} from '../models/npc';

export const NPC_VISIBILITY_FIELDS = [
  'description',
  'level',
  'lifeBar',
  'lifeNumbers',
  'attributes',
  'equipment',
] as const;

const tick = (...on: (keyof NpcVisibility)[]): NpcVisibility =>
  Object.fromEntries(
    NPC_VISIBILITY_FIELDS.map((field) => [field, on.includes(field)]),
  ) as unknown as NpcVisibility;

/** Defaults from the spec table (Showing NPCs on the table). */
export const DEFAULT_NPC_VISIBILITY: NpcVisibilityRules = {
  story: tick('description', 'level'),
  merchant: tick('description', 'level'),
  enemy: tick('level', 'lifeBar'),
};

export function isValidNpcVisibility(value: unknown): boolean {
  const rules = value as
    Record<string, Record<string, unknown> | undefined> | null | undefined;
  return NPC_ROLES.every((role) =>
    NPC_VISIBILITY_FIELDS.every(
      (field) => typeof rules?.[role]?.[field] === 'boolean',
    ),
  );
}

/** The public projection of an NPC: portrait and name, plus the union of what the ticks of its roles allow. */
export function toPublicNpc(
  npc: Npc,
  world: Pick<World, 'attributes' | 'barAttributes' | 'npcVisibility'> & { skills?: Skill[] },
): PublicNpc {
  const stats = attributeStats(world.attributes, npc, world.barAttributes, world.skills ?? []);
  const life = barStats(stats, world.barAttributes).life;
  const when = <T>(field: keyof NpcVisibility, value: T): T | undefined =>
    npc.roles.some((role) => world.npcVisibility[role][field])
      ? value
      : undefined;
  return {
    id: npc.id,
    name: npc.name,
    portraitId: npc.portraitId,
    description: when('description', npc.description),
    level: when('level', npc.level),
    lifeBar: life && when('lifeBar', { percent: life.percent }),
    life: life && when('lifeNumbers', { current: life.current, max: life.max }),
    attributes: when(
      'attributes',
      stats.map(({ name, current, max }) => ({ name, current, max })),
    ),
    equipment: when(
      'equipment',
      npc.inventory
        .filter((e) => e.equipped)
        .map((e) => ({ name: e.item.name })),
    ),
  };
}
