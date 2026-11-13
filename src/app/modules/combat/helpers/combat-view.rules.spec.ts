import { DEFAULT_NPC_VISIBILITY } from '../../npc/helpers/npc-visibility.rules';
import { Npc, NpcVisibilityRules } from '../../npc/models/npc';
import { Character, World } from '../../world/models/world';
import { Combatant, Encounter } from '../models/combat';
import { projectEncounter } from './combat-view.rules';

const combatant = (over: Partial<Combatant>): Combatant => ({
  id: 'c',
  name: 'C',
  side: 'enemy',
  level: 4,
  attributes: [
    { name: 'Life', current: 5, max: 10 },
    { name: 'Mana', current: 2, max: 6 },
  ],
  skills: [{ skillId: 'secret-skill', level: 1 }],
  cooldowns: { 'secret-skill': 2 },
  actions: [{ name: 'Action', count: 1, used: 0, movement: false }],
  effects: [],
  statuses: ['Poisoned'],
  down: false,
  xpReward: 40,
  money: 7,
  loot: [],
  ...over,
});

const npc = (over: Partial<Npc>): Npc => ({
  id: 'npc-1',
  name: 'Goblin',
  portraitId: 'img-goblin',
  statPoints: 0,
  xp: 0,
  level: 4,
  money: 7,
  updatedAt: 1,
  skillPoints: 0,
  skills: [],
  attributes: [],
  roles: ['enemy'],
  description: 'Sneaky',
  xpReward: 40,
  loot: [],
  inventory: [
    {
      id: 'inv-1',
      equipped: true,
      position: 0,
      item: {
        id: 'dagger',
        name: 'Dagger',
        description: '',
        rarity: 'common',
        type: 'item',
        slot: 'none',
        price: 1,
        modifiers: [],
      },
    },
  ],
  ...over,
});

const hero = {
  id: 'char-1',
  name: 'Ada',
  playerId: 'ada',
  portraitId: 'img-ada',
} as Character;

const encounter = (combatants: Combatant[]): Encounter => ({
  combatants,
  round: 3,
  turn: 1,
  lifeAttribute: 'Life',
  seq: 4,
  pending: [
    {
      id: 'pending-1',
      casterId: 'c',
      targetId: 'p',
      skillId: 's',
      rolls: [3],
      total: 3,
      success: true,
      effects: [{ kind: 'damage', attribute: 'Life', amount: 3 }],
    },
  ],
  log: [
    {
      kind: 'skill',
      round: 3,
      casterId: 'c',
      skillId: 's',
      rolls: [3],
      total: 3,
      success: true,
    },
  ],
  previous: {
    combatants: [],
    round: 1,
    turn: 0,
    lifeAttribute: 'Life',
    pending: [],
    log: [],
    seq: 0,
  },
});

const world = (
  npcs: Npc[],
  npcVisibility: NpcVisibilityRules = DEFAULT_NPC_VISIBILITY,
) => ({ npcs, characters: [hero], npcVisibility }) as unknown as World;

const all = {
  description: true,
  level: true,
  lifeBar: true,
  lifeNumbers: true,
  attributes: true,
  equipment: true,
};
const none = {
  description: false,
  level: false,
  lifeBar: false,
  lifeNumbers: false,
  attributes: false,
  equipment: false,
};
const rulesOf = (
  enemy: Partial<typeof all>,
  story = none,
): NpcVisibilityRules => ({
  ...DEFAULT_NPC_VISIBILITY,
  enemy: { ...none, ...enemy },
  story,
});

const enemy = combatant({ id: 'e1', name: 'Goblin', npcId: 'npc-1' });
const view = (
  npcVisibility?: NpcVisibilityRules,
  c: Combatant = enemy,
  n: Npc = npc({}),
) => projectEncounter(encounter([c]), world([n], npcVisibility));

describe('projectEncounter', () => {
  it('keeps the order, round, active combatant, pending results and log', () => {
    const projected = projectEncounter(
      encounter([combatant({ id: 'a' }), combatant({ id: 'b' })]),
      world([]),
    );

    expect(projected.round).toBe(3);
    expect(projected.activeId).toBe('b');
    expect(projected.combatants.map((c) => c.id)).toEqual(['a', 'b']);
    expect(projected.pending).toEqual(encounter([]).pending);
    expect(projected.log).toEqual(encounter([]).log);
    expect(projected).not.toHaveProperty('previous');
  });

  it('always shows the name, side, portrait, statuses, down flag, initiative, position and action counters', () => {
    const shown = view(rulesOf({}), {
      ...enemy,
      initiative: 12,
      down: true,
      position: { x: 2, y: 3 },
    } as Combatant).combatants[0];

    expect(shown).toMatchObject({
      id: 'e1',
      name: 'Goblin',
      side: 'enemy',
      portraitId: 'img-goblin',
      statuses: ['Poisoned'],
      down: true,
      initiative: 12,
      position: { x: 2, y: 3 },
      actions: [{ name: 'Action', count: 1, used: 0, movement: false }],
    });
  });

  it('shows nothing else of an enemy when every tick is off', () => {
    const shown = view(rulesOf({})).combatants[0];

    for (const field of [
      'description',
      'level',
      'lifeBar',
      'life',
      'attributes',
      'equipment',
    ])
      expect(shown[field as keyof typeof shown]).toBeUndefined();
  });

  it('shows each ticked field and only that one', () => {
    expect(view(rulesOf({ level: true })).combatants[0]).toMatchObject({
      level: 4,
    });
    expect(view(rulesOf({ lifeBar: true })).combatants[0].lifeBar).toEqual({
      percent: 50,
    });
    expect(view(rulesOf({ lifeNumbers: true })).combatants[0].life).toEqual({
      current: 5,
      max: 10,
    });
    expect(view(rulesOf({ description: true })).combatants[0].description).toBe(
      'Sneaky',
    );
    expect(view(rulesOf({ equipment: true })).combatants[0].equipment).toEqual([
      { name: 'Dagger' },
    ]);
    expect(
      view(rulesOf({ attributes: true })).combatants[0].attributes,
    ).toEqual([
      { name: 'Life', current: 5, max: 10 },
      { name: 'Mana', current: 2, max: 6 },
    ]);
    const onlyLevel = view(rulesOf({ level: true })).combatants[0];
    expect(onlyLevel.life).toBeUndefined();
    expect(onlyLevel.lifeBar).toBeUndefined();
    expect(onlyLevel.attributes).toBeUndefined();
  });

  it('uses the default visibility: level and a life bar for an enemy', () => {
    const shown = view().combatants[0];

    expect(shown.level).toBe(4);
    expect(shown.lifeBar).toEqual({ percent: 50 });
    expect(shown.life).toBeUndefined();
    expect(shown.description).toBeUndefined();
  });

  it('takes the union of the ticks of the NPC roles', () => {
    const both = view(
      rulesOf({ lifeBar: true }, { ...none, description: true }),
      enemy,
      npc({ roles: ['story', 'enemy'] }),
    ).combatants[0];

    expect(both.description).toBe('Sneaky');
    expect(both.lifeBar).toEqual({ percent: 50 });
    expect(both.level).toBeUndefined();
  });

  it('applies the rules of the NPC roles to an ally as well', () => {
    const ally = combatant({
      id: 'al',
      name: 'Mira',
      side: 'ally',
      npcId: 'npc-2',
    });
    const shown = view(
      rulesOf({}, { ...none, level: true }),
      ally,
      npc({ id: 'npc-2', roles: ['story'] }),
    ).combatants[0];

    expect(shown.level).toBe(4);
    expect(shown.lifeBar).toBeUndefined();
  });

  it('never leaks the reward, money, loot, skills or cooldowns of an NPC', () => {
    const serialized = JSON.stringify(view(rulesOf(all)).combatants[0]);

    for (const secret of [
      'xpReward',
      'money',
      'loot',
      'skills',
      'cooldowns',
      'secret-skill',
    ])
      expect(serialized).not.toContain(secret);
  });

  it('shows a character combatant fully, with the character portrait', () => {
    const party = combatant({
      id: 'p',
      name: 'Ada',
      side: 'party',
      characterId: 'char-1',
      xpReward: 0,
      money: 0,
    });
    const shown = view(rulesOf({}), party).combatants[0];

    expect(shown).toMatchObject({
      portraitId: 'img-ada',
      level: 4,
      life: { current: 5, max: 10 },
      lifeBar: { percent: 50 },
      attributes: [
        { name: 'Life', current: 5, max: 10 },
        { name: 'Mana', current: 2, max: 6 },
      ],
    });
  });

  it('shows a life bar of 0 for a combatant without life left', () => {
    const shown = view(
      rulesOf({ lifeBar: true }),
      combatant({
        id: 'e1',
        npcId: 'npc-1',
        attributes: [{ name: 'Life', current: 0, max: 10 }],
        down: true,
      }),
    ).combatants[0];

    expect(shown.lifeBar).toEqual({ percent: 0 });
  });

  describe('pending results and the log on a hidden NPC', () => {
    const hit = (target: string, attribute = 'Life') => ({
      ...encounter([]),
      combatants: [
        combatant({ id: 'e1', name: 'Goblin', npcId: 'npc-1' }),
        combatant({ id: 'p', name: 'Ada', side: 'party', characterId: 'char-1' }),
      ],
      pending: [
        {
          id: 'pending-1',
          casterId: 'p',
          targetId: target,
          skillId: 's',
          skillName: 'Fireball',
          rolls: [4, 5],
          total: 9,
          success: true,
          effects: [
            { kind: 'damage' as const, attribute, amount: 12 },
            { kind: 'modify' as const, attribute: 'Mana', amount: -2, duration: 3 },
          ],
        },
      ],
    });
    const project = (target: string, rules: NpcVisibilityRules, full = false) =>
      projectEncounter(hit(target), world([npc({})], rules), full);

    it('keeps the roll, the total, the success and the amounts, as they are public', () => {
      const [pending] = project('e1', rulesOf({})).pending;

      expect(pending).toMatchObject({
        rolls: [4, 5],
        total: 9,
        success: true,
        skillName: 'Fireball',
      });
      expect(pending.effects.map((e) => e.amount)).toEqual([12, -2]);
      expect(pending.effects.map((e) => e.kind)).toEqual(['damage', 'modify']);
      expect(pending.effects[1].duration).toBe(3);
    });

    it('names no attribute the viewer cannot see on the NPC: Mana is hidden, Life is shown by the life bar', () => {
      const [pending] = project('e1', rulesOf({ lifeBar: true })).pending;

      expect(pending.effects[0].attribute).toBe('Life');
      expect(pending.effects[1].attribute).toBeUndefined();
    });

    it('names no attribute at all when the NPC shows neither its life nor its attributes', () => {
      const [pending] = project('e1', rulesOf({})).pending;

      expect(pending.effects.map((e) => e.attribute)).toEqual([
        undefined,
        undefined,
      ]);
    });

    it('names every attribute when the NPC shows its attributes', () => {
      const [pending] = project('e1', rulesOf({ attributes: true })).pending;

      expect(pending.effects.map((e) => e.attribute)).toEqual(['Life', 'Mana']);
    });

    it('does not filter a result on a character combatant', () => {
      const [pending] = project('p', rulesOf({})).pending;

      expect(pending.effects.map((e) => e.attribute)).toEqual(['Life', 'Mana']);
    });

    it('does not filter anything for the GM', () => {
      const [pending] = project('e1', rulesOf({}), true).pending;

      expect(pending).toEqual(hit('e1').pending[0]);
    });

    it('keeps the log entries as they are', () => {
      expect(project('e1', rulesOf({})).log).toEqual(encounter([]).log);
    });
  });
});

