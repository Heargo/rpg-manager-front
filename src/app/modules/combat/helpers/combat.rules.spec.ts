import { RandomSource } from '../../../core/generators/random-source';
import { Skill } from '../../skill/models/skill';
import { Npc } from '../../npc/models/npc';
import {
  Character,
  CombatRules,
  InventoryItem,
  World,
} from '../../world/models/world';
import { createWorld } from '../../world/helpers/world.factory';
import { Combatant, Encounter } from '../models/combat';
import {
  addCombatant,
  addStatus,
  applyPending,
  combatRewards,
  damageCombatant,
  dismissPending,
  editAttribute,
  healCombatant,
  nextTurn,
  proposeRewards,
  removeCombatant,
  removeStatus,
  reorderCombatants,
  rollInitiative,
  setActionUsed,
  setInitiative,
  skillAvailability,
  skillPreview,
  startEncounter,
  suggestDefence,
  undo,
  useSkill,
} from './combat.rules';

/** A random source that returns the given values in order (a die face is value + 1 for a value below its faces). */
const scripted = (...values: number[]): RandomSource => {
  let i = 0;
  return { nextUint32: () => values[i++ % values.length] };
};
const forbidden: RandomSource = {
  nextUint32: () => {
    throw new Error('no dice expected');
  },
};

const linear = { preset: 'linear', step: 1 } as const;
let counter = 0;
const newId = () => `n${++counter}`;

const fireball: Skill = {
  id: 'fireball',
  name: 'Fireball',
  description: '',
  rarity: 'common',
  type: 'active',
  maxLevel: 3,
  pointCost: 1,
  target: 'one-enemy',
  cost: { attribute: 'Mana', amount: 3 },
  cooldown: 2,
  roll: { count: 2, faces: 6 },
  success: { mode: 'always' },
  effects: [{ kind: 'damage', attribute: 'Life', amount: '12 + roll' }],
};
const bless: Skill = {
  id: 'bless',
  name: 'Bless',
  description: '',
  rarity: 'common',
  type: 'active',
  maxLevel: 1,
  pointCost: 1,
  target: 'one-ally',
  effects: [{ kind: 'modify', attribute: 'Armor', amount: '2', duration: 2 }],
};
const mend: Skill = {
  id: 'mend',
  name: 'Mend',
  description: '',
  rarity: 'common',
  type: 'active',
  maxLevel: 1,
  pointCost: 1,
  target: 'one-ally',
  effects: [{ kind: 'heal', attribute: 'Life', amount: '10' }],
};
const smite: Skill = {
  id: 'smite',
  name: 'Smite',
  description: '',
  rarity: 'common',
  type: 'active',
  maxLevel: 5,
  pointCost: 1,
  target: 'one-enemy',
  cost: { attribute: 'Mana', amount: 10 },
  cooldown: 2,
  roll: { count: 2, faces: 6 },
  effects: [
    { kind: 'damage', attribute: 'Life', amount: 'skillLevel * 4 + roll' },
  ],
};
const skills = [fireball, bless, mend, smite];

const potion: InventoryItem = {
  id: 'inv1',
  equipped: false,
  position: 0,
  item: {
    id: 'potion',
    name: 'Potion',
    description: '',
    rarity: 'common',
    type: 'consumable',
    slot: 'none',
    price: 5,
    modifiers: [],
  },
};

function build(): { world: World; characters: Character[]; goblin: Npc } {
  const base = createWorld(
    {
      name: 'Eldoria',
      attributes: [
        { name: 'Life', baseValue: 10, formula: linear },
        { name: 'Mana', baseValue: 5, formula: linear },
        { name: 'Armor', baseValue: 2, formula: linear },
      ],
      barAttributes: { life: 'Life', mana: 'Mana' },
    },
    (() => {
      let n = 0;
      return () => `a${++n}`;
    })(),
    1,
  );
  const [life, mana, armor] = base.attributes;
  const sheet = (
    id: string,
    lifeLevel: number,
    lifeNow: number,
    manaNow: number,
    owned: string[],
  ): Character => ({
    id,
    playerId: `p-${id}`,
    rev: 1,
    name: id[0].toUpperCase() + id.slice(1),
    statPoints: 0,
    skillPoints: 0,
    xp: 0,
    level: 1,
    money: 0,
    attributes: [
      { attributeId: life.id, level: lifeLevel, current: lifeNow },
      { attributeId: mana.id, level: 0, current: manaNow },
      { attributeId: armor.id, level: 0, current: 2 },
    ],
    inventory: [],
    updatedAt: 1,
    skills: owned.map((skillId) => ({ skillId, level: 1 })),
  });
  const characters = [
    sheet('aria', 2, 8, 3, ['fireball', 'smite']),
    sheet('bram', 2, 8, 5, ['mend', 'bless']),
  ];
  const goblin: Npc = {
    ...sheet('goblin', 3, 13, 5, []),
    name: 'Goblin',
    level: 2,
    attributes: [
      { attributeId: life.id, level: 3, current: 13 },
      { attributeId: mana.id, level: 0, current: 5 },
      { attributeId: armor.id, level: 1, current: 3 },
    ],
    inventory: [potion],
    money: 7,
    roles: ['enemy'],
    description: '',
    xpReward: 30,
    loot: ['inv1'],
  };
  return {
    world: { ...base, characters, npcs: [goblin], skills },
    characters,
    goblin,
  };
}

const picks = {
  characterIds: ['aria', 'bram'],
  npcs: [{ npcId: 'goblin', count: 3, side: 'enemy' as const }],
};

function start(
  rules: Partial<CombatRules> = {},
  world = build().world,
): { enc: Encounter; world: World } {
  const w = { ...world, combat: { ...world.combat, ...rules } };
  const result = startEncounter(w, picks, newId);
  if (!result.ok) throw new Error(`start failed: ${result.error}`);
  return { enc: result.encounter, world: w };
}

const by = (enc: Encounter, name: string): Combatant => {
  const found = enc.combatants.find((c) => c.name === name);
  if (!found) throw new Error(`no combatant ${name}`);
  return found;
};
const attr = (c: Combatant, name: string) =>
  c.attributes.find((a) => a.name === name)!;
const names = (enc: Encounter) => enc.combatants.map((c) => c.name);
const active = (enc: Encounter) => enc.combatants[enc.turn].name;
const ok = <T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> => {
  expect(result.ok).toBe(true);
  return result as Extract<T, { ok: true }>;
};
const use = (
  enc: Encounter,
  caster: string,
  skillId: string,
  targets: string[],
  random: RandomSource,
  rolls = true,
) =>
  ok(
    useSkill(
      enc,
      {
        casterId: by(enc, caster).id,
        skillId,
        targetIds: targets.map((t) => by(enc, t).id),
      },
      skills,
      rolls,
      random,
    ),
  ).encounter;

describe('startEncounter', () => {
  it('puts the picked characters and one copy per NPC count in an encounter at round 1', () => {
    const { enc } = start();
    expect(names(enc)).toEqual([
      'Aria',
      'Bram',
      'Goblin 1',
      'Goblin 2',
      'Goblin 3',
    ]);
    expect(enc.round).toBe(1);
    expect(enc.turn).toBe(0);
    expect(by(enc, 'Aria').side).toBe('party');
    expect(by(enc, 'Goblin 2').side).toBe('enemy');
    expect(new Set(enc.combatants.map((c) => c.id)).size).toBe(5);
  });

  it('copies the full current values and the skills of each combatant', () => {
    const { enc } = start();
    expect(attr(by(enc, 'Aria'), 'Life')).toEqual({
      name: 'Life',
      current: 8,
      max: 12,
    });
    expect(attr(by(enc, 'Aria'), 'Mana')).toEqual({
      name: 'Mana',
      current: 3,
      max: 5,
    });
    expect(attr(by(enc, 'Goblin 3'), 'Life')).toEqual({
      name: 'Life',
      current: 13,
      max: 13,
    });
    expect(attr(by(enc, 'Goblin 3'), 'Armor')).toEqual({
      name: 'Armor',
      current: 3,
      max: 3,
    });
    expect(by(enc, 'Aria').skills).toEqual([
      { skillId: 'fireball', level: 1 },
      { skillId: 'smite', level: 1 },
    ]);
    expect(by(enc, 'Aria').level).toBe(1);
    expect(by(enc, 'Goblin 1').level).toBe(2);
  });

  it('gives each copy its own values: hurting one leaves the others and the catalogue alone', () => {
    const { enc, world } = start();
    const hurt = damageCombatant(enc, by(enc, 'Goblin 1').id, 5);
    expect(attr(by(hurt, 'Goblin 1'), 'Life').current).toBe(8);
    expect(attr(by(hurt, 'Goblin 2'), 'Life').current).toBe(13);
    expect(world.npcs[0].attributes[0].current).toBe(13);
  });

  it('starts every action counter unused, from the world action types', () => {
    const { enc } = start({
      actionTypes: [
        { name: 'Action', count: 2, movement: false },
        { name: 'Bonus', count: 1, movement: false },
      ],
    });
    expect(by(enc, 'Aria').actions).toEqual([
      { name: 'Action', count: 2, used: 0, movement: false },
      { name: 'Bonus', count: 1, used: 0, movement: false },
    ]);
  });

  it('adds allies as their own side', () => {
    const { world } = start();
    const result = ok(
      startEncounter(
        world,
        {
          characterIds: ['aria'],
          npcs: [{ npcId: 'goblin', count: 1, side: 'ally' }],
        },
        newId,
      ),
    );
    expect(result.encounter.combatants.map((c) => c.side)).toEqual([
      'party',
      'ally',
    ]);
  });

  it('refuses to start without a life attribute', () => {
    const { world } = build();
    const result = startEncounter(
      { ...world, combat: { ...world.combat, lifeAttribute: undefined } },
      picks,
      newId,
    );
    expect(result).toEqual({ ok: false, error: 'life-attribute-required' });
  });
});

describe('initiative', () => {
  const rolled = (formula: string) => ({
    mode: 'rolled' as const,
    dice: { count: 1, faces: 20 },
    formula,
  });

  it('rolls the dice plus the formula for everyone and orders by the total, highest first', () => {
    const { enc, world } = start({ initiative: rolled('level') });
    const next = rollInitiative(enc, world.combat, scripted(4, 14, 9, 0, 0));
    expect(names(next)).toEqual([
      'Bram',
      'Goblin 1',
      'Aria',
      'Goblin 2',
      'Goblin 3',
    ]);
    expect(by(next, 'Bram').initiative).toBe(16);
    expect(by(next, 'Goblin 1').initiative).toBe(12);
    expect(by(next, 'Aria').initiative).toBe(6);
    expect(by(next, 'Goblin 3').initiative).toBe(3);
    expect(next.turn).toBe(0);
    expect(active(next)).toBe('Bram');
  });

  it('rolls only the asked combatants, keeping typed values', () => {
    const { enc, world } = start({
      initiative: {
        mode: 'typed',
        dice: { count: 1, faces: 20 },
        formula: '0',
      },
    });
    let next = setInitiative(enc, by(enc, 'Aria').id, 18);
    next = setInitiative(next, by(next, 'Bram').id, 7);
    next = rollInitiative(next, world.combat, scripted(9), [
      by(next, 'Goblin 1').id,
      by(next, 'Goblin 2').id,
      by(next, 'Goblin 3').id,
    ]);
    expect(by(next, 'Aria').initiative).toBe(18);
    expect(by(next, 'Goblin 1').initiative).toBe(10);
    expect(names(next).slice(0, 2)).toEqual(['Aria', 'Goblin 1']);
    expect(names(next).at(-1)).toBe('Bram');
  });

  it('re-orders when a typed value is set', () => {
    const { enc } = start();
    const next = setInitiative(
      setInitiative(enc, by(enc, 'Goblin 3').id, 20),
      by(enc, 'Bram').id,
      12,
    );
    expect(names(next).slice(0, 2)).toEqual(['Goblin 3', 'Bram']);
  });

  it('lets the GM reorder by hand, keeping the active combatant active', () => {
    const { enc } = start();
    const ids = ['Goblin 3', 'Aria', 'Goblin 1', 'Bram', 'Goblin 2'].map(
      (n) => by(enc, n).id,
    );
    const next = reorderCombatants(enc, ids);
    expect(names(next)).toEqual([
      'Goblin 3',
      'Aria',
      'Goblin 1',
      'Bram',
      'Goblin 2',
    ]);
    expect(active(next)).toBe('Aria');
  });
});

describe('turns and rounds', () => {
  it('moves to the next combatant and goes up a round when the order wraps', () => {
    let { enc } = start();
    enc = nextTurn(enc);
    expect(active(enc)).toBe('Bram');
    expect(enc.round).toBe(1);
    for (let i = 0; i < 3; i++) enc = nextTurn(enc);
    expect(active(enc)).toBe('Goblin 3');
    enc = nextTurn(enc);
    expect(active(enc)).toBe('Aria');
    expect(enc.round).toBe(2);
  });

  it('skips down combatants', () => {
    let { enc } = start();
    enc = damageCombatant(enc, by(enc, 'Goblin 2').id, 13);
    expect(by(enc, 'Goblin 2').down).toBe(true);
    enc = nextTurn(nextTurn(enc));
    expect(active(enc)).toBe('Goblin 1');
    enc = nextTurn(enc);
    expect(active(enc)).toBe('Goblin 3');
  });

  it('marks a combatant at 0 life down, and up again when healed', () => {
    const { enc } = start();
    const down = damageCombatant(enc, by(enc, 'Bram').id, 99);
    expect(attr(by(down, 'Bram'), 'Life').current).toBe(0);
    expect(by(down, 'Bram').down).toBe(true);
    const up = healCombatant(down, by(down, 'Bram').id, 3);
    expect(by(up, 'Bram').down).toBe(false);
  });

  it('resets the action counters at the start of the combatant turn', () => {
    let { enc } = start();
    enc = setActionUsed(enc, by(enc, 'Bram').id, 'Action', 1);
    expect(by(enc, 'Bram').actions[0]).toEqual({
      name: 'Action',
      count: 1,
      used: 1,
      movement: false,
    });
    enc = nextTurn(enc);
    expect(by(enc, 'Bram').actions[0].used).toBe(0);
  });

  it('keeps an action counter between 0 and its count', () => {
    const { enc } = start();
    const id = by(enc, 'Aria').id;
    expect(
      by(setActionUsed(enc, id, 'Action', 5), 'Aria').actions[0].used,
    ).toBe(1);
    expect(
      by(setActionUsed(enc, id, 'Action', -2), 'Aria').actions[0].used,
    ).toBe(0);
  });
});

describe('skillPreview', () => {
  const caster = { level: 1, maxima: { Life: 12, Mana: 5 } };

  it('shows the effects at a level with the dice, the cost and the cooldown', () => {
    expect(skillPreview(smite, 3, caster, true)).toEqual({
      effects: [{ kind: 'damage', attribute: 'Life', amount: '12 + 2d6' }],
      cost: { attribute: 'Mana', amount: 10 },
      cooldown: 2,
    });
  });

  it('shows a plain number when the amount does not read the dice, and no dice when rolls are off', () => {
    expect(skillPreview(mend, 1, caster, true).effects[0].amount).toBe('10');
    expect(skillPreview(smite, 3, caster, false).effects[0].amount).toBe('12');
  });

  it('shows the duration of a buff', () => {
    expect(skillPreview(bless, 1, caster, true).effects[0]).toEqual({
      kind: 'modify',
      attribute: 'Armor',
      amount: '2',
      duration: 2,
    });
  });
});

describe('using a skill', () => {
  it('rolls the skill dice with the random source and posts a pending result for the target', () => {
    const { enc } = start();
    const next = use(enc, 'Aria', 'fireball', ['Goblin 2'], scripted(3, 4));
    expect(next.pending).toHaveLength(1);
    expect(next.pending[0]).toMatchObject({
      casterId: by(next, 'Aria').id,
      targetId: by(next, 'Goblin 2').id,
      skillId: 'fireball',
      rolls: [4, 5],
      total: 9,
      success: true,
      effects: [{ kind: 'damage', attribute: 'Life', amount: 21 }],
    });
    expect(next.log.at(-1)).toMatchObject({
      kind: 'skill',
      skillId: 'fireball',
      rolls: [4, 5],
      total: 9,
    });
  });

  it('changes nothing on the targets until the GM applies', () => {
    const { enc } = start();
    const next = use(enc, 'Aria', 'fireball', ['Goblin 2'], scripted(3, 4));
    expect(attr(by(next, 'Goblin 2'), 'Life').current).toBe(13);
  });

  it('rolls once and makes one pending result per target', () => {
    const { enc } = start();
    const next = use(
      enc,
      'Aria',
      'fireball',
      ['Goblin 1', 'Goblin 2'],
      scripted(3, 4),
    );
    expect(next.pending.map((p) => p.targetId)).toEqual([
      by(next, 'Goblin 1').id,
      by(next, 'Goblin 2').id,
    ]);
    expect(next.pending.map((p) => p.total)).toEqual([9, 9]);
  });

  it('takes the cost from the caster and starts the cooldown', () => {
    const { enc } = start();
    const next = use(enc, 'Aria', 'fireball', ['Goblin 2'], scripted(3, 4));
    expect(attr(by(next, 'Aria'), 'Mana').current).toBe(0);
    expect(by(next, 'Aria').cooldowns['fireball']).toBe(2);
  });

  it('lets the GM use a skill that is not affordable, down to 0', () => {
    const { enc } = start();
    const poor = editAttribute(enc, by(enc, 'Aria').id, 'Mana', { current: 1 });
    const next = use(poor, 'Aria', 'fireball', ['Goblin 2'], scripted(3, 4));
    expect(attr(by(next, 'Aria'), 'Mana').current).toBe(0);
  });

  it('with skill rolls off: draws no dice, succeeds, and the roll reads 0', () => {
    const { enc } = start();
    const next = use(enc, 'Aria', 'fireball', ['Goblin 2'], forbidden, false);
    expect(next.pending[0]).toMatchObject({
      rolls: [],
      total: 0,
      success: true,
      effects: [{ amount: 12 }],
    });
  });

  it('refuses a skill the caster does not have', () => {
    const { enc } = start();
    const result = useSkill(
      enc,
      {
        casterId: by(enc, 'Aria').id,
        skillId: 'mend',
        targetIds: [by(enc, 'Bram').id],
      },
      skills,
      true,
      scripted(0),
    );
    expect(result).toEqual({ ok: false, error: 'skill-not-known' });
  });

  it('tells what a skill can do now: on cooldown, or not affordable', () => {
    const { enc } = start();
    const aria = by(enc, 'Aria').id;
    expect(skillAvailability(enc, aria, fireball)).toEqual({
      affordable: true,
      onCooldown: false,
    });
    expect(skillAvailability(enc, aria, smite)).toEqual({
      affordable: false,
      onCooldown: false,
    });
    const used = use(enc, 'Aria', 'fireball', ['Goblin 2'], scripted(3, 4));
    expect(skillAvailability(used, aria, fireball)).toEqual({
      affordable: false,
      onCooldown: true,
    });
  });

  it('ticks the cooldown at the start of the caster turn', () => {
    let { enc } = start();
    enc = use(enc, 'Aria', 'fireball', ['Goblin 2'], scripted(3, 4));
    for (let i = 0; i < 5; i++) enc = nextTurn(enc);
    expect(active(enc)).toBe('Aria');
    expect(by(enc, 'Aria').cooldowns['fireball']).toBe(1);
    for (let i = 0; i < 5; i++) enc = nextTurn(enc);
    expect(by(enc, 'Aria').cooldowns['fireball'] ?? 0).toBe(0);
    expect(
      skillAvailability(enc, by(enc, 'Aria').id, fireball).onCooldown,
    ).toBe(false);
  });
});

describe('the GM resolves a pending result', () => {
  const hit = () => {
    const { enc, world } = start({ defence: 'Armor' });
    return {
      enc: use(enc, 'Aria', 'fireball', ['Goblin 2'], scripted(3, 4)),
      world,
    };
  };

  it('applies damage to the target life and clears the pending result', () => {
    const { enc } = hit();
    const next = applyPending(enc, enc.pending[0].id);
    expect(attr(by(next, 'Goblin 2'), 'Life').current).toBe(0);
    expect(next.pending).toEqual([]);
    expect(by(next, 'Goblin 2').down).toBe(true);
  });

  it('suggests the defence from the world formula and takes it off when asked', () => {
    const { enc, world } = hit();
    expect(suggestDefence(enc, enc.pending[0].id, world.combat)).toBe(3);
    const next = applyPending(enc, enc.pending[0].id, {
      defence: true,
      rules: world.combat,
    });
    expect(attr(by(next, 'Goblin 2'), 'Life').current).toBe(0);
    const small = use(
      start({ defence: 'Armor' }).enc,
      'Aria',
      'fireball',
      ['Goblin 2'],
      scripted(0, 0),
    );
    const reduced = applyPending(small, small.pending[0].id, {
      defence: true,
      rules: start({ defence: 'Armor' }).world.combat,
    });
    expect(attr(by(reduced, 'Goblin 2'), 'Life').current).toBe(13 - (14 - 3));
  });

  it('suggests no defence when the world has none', () => {
    const { enc, world } = start();
    const pending = use(enc, 'Aria', 'fireball', ['Goblin 2'], scripted(3, 4));
    expect(suggestDefence(pending, pending.pending[0].id, world.combat)).toBe(
      0,
    );
  });

  it('edits the amount then applies', () => {
    const { enc } = hit();
    const next = applyPending(enc, enc.pending[0].id, { amounts: [5] });
    expect(attr(by(next, 'Goblin 2'), 'Life').current).toBe(8);
  });

  it('edits the target then applies', () => {
    const { enc } = hit();
    const next = applyPending(enc, enc.pending[0].id, {
      targetId: by(enc, 'Goblin 3').id,
      amounts: [4],
    });
    expect(attr(by(next, 'Goblin 3'), 'Life').current).toBe(9);
    expect(attr(by(next, 'Goblin 2'), 'Life').current).toBe(13);
  });

  it('dismisses: nothing changes on the targets and the log keeps the roll', () => {
    const { enc } = hit();
    const next = dismissPending(enc, enc.pending[0].id);
    expect(next.pending).toEqual([]);
    expect(attr(by(next, 'Goblin 2'), 'Life').current).toBe(13);
    expect(next.log.at(-1)).toMatchObject({
      kind: 'skill',
      rolls: [4, 5],
      total: 9,
    });
  });

  it('keeps several pending results in order and resolves them one by one', () => {
    const { enc } = start();
    let next = use(enc, 'Bram', 'mend', ['Aria'], scripted(0));
    next = use(next, 'Aria', 'fireball', ['Goblin 1'], scripted(3, 4));
    expect(next.pending.map((p) => p.skillId)).toEqual(['mend', 'fireball']);
    next = applyPending(next, next.pending[1].id);
    expect(next.pending.map((p) => p.skillId)).toEqual(['mend']);
  });

  it('heals up to the max and no further', () => {
    const { enc } = start();
    let next = use(enc, 'Bram', 'mend', ['Aria'], scripted(0));
    next = applyPending(next, next.pending[0].id);
    expect(attr(by(next, 'Aria'), 'Life').current).toBe(12);
  });

  it('adds a buff with its duration, raising the max while it lasts', () => {
    const { enc } = start();
    let next = use(enc, 'Bram', 'bless', ['Aria'], scripted(0));
    next = applyPending(next, next.pending[0].id);
    expect(by(next, 'Aria').effects).toEqual([
      expect.objectContaining({ attribute: 'Armor', amount: 2, duration: 2 }),
    ]);
    expect(attr(by(next, 'Aria'), 'Armor').max).toBe(4);
  });

  it('ticks a buff at the start of its owner turn and removes it at 0', () => {
    const { enc } = start();
    let next = use(enc, 'Bram', 'bless', ['Aria'], scripted(0));
    next = applyPending(next, next.pending[0].id);
    for (let i = 0; i < 5; i++) next = nextTurn(next);
    expect(active(next)).toBe('Aria');
    expect(by(next, 'Aria').effects[0].duration).toBe(1);
    for (let i = 0; i < 5; i++) next = nextTurn(next);
    expect(by(next, 'Aria').effects).toEqual([]);
    expect(attr(by(next, 'Aria'), 'Armor').max).toBe(2);
  });
});

describe('free changes', () => {
  it('damages and heals by hand, healing capped at the max', () => {
    const { enc } = start();
    const hurt = damageCombatant(enc, by(enc, 'Aria').id, 3);
    expect(attr(by(hurt, 'Aria'), 'Life').current).toBe(5);
    expect(
      attr(by(healCombatant(hurt, by(hurt, 'Aria').id, 99), 'Aria'), 'Life')
        .current,
    ).toBe(12);
  });

  it('adds and removes a status note', () => {
    const { enc } = start();
    const id = by(enc, 'Bram').id;
    const poisoned = addStatus(enc, id, 'Poisoned');
    expect(by(poisoned, 'Bram').statuses).toEqual(['Poisoned']);
    expect(by(removeStatus(poisoned, id, 'Poisoned'), 'Bram').statuses).toEqual(
      [],
    );
  });

  it('edits any value of a combatant', () => {
    const { enc } = start();
    const next = editAttribute(enc, by(enc, 'Aria').id, 'Life', {
      current: 2,
      max: 20,
    });
    expect(attr(by(next, 'Aria'), 'Life')).toEqual({
      name: 'Life',
      current: 2,
      max: 20,
    });
  });

  it('adds a copy of an NPC with the next number, and removes a combatant', () => {
    const { enc, world } = start();
    const added = addCombatant(
      enc,
      world,
      { npcId: 'goblin', side: 'enemy' },
      newId,
    );
    expect(names(added).at(-1)).toBe('Goblin 4');
    const removed = removeCombatant(added, by(added, 'Goblin 1').id);
    expect(names(removed)).toEqual([
      'Aria',
      'Bram',
      'Goblin 2',
      'Goblin 3',
      'Goblin 4',
    ]);
  });
});

describe('undo', () => {
  it('goes back one step and no further', () => {
    const { enc } = start();
    const id = by(enc, 'Aria').id;
    const one = damageCombatant(enc, id, 3);
    const two = damageCombatant(one, id, 2);
    const undone = undo(two);
    expect(attr(by(undone, 'Aria'), 'Life').current).toBe(5);
    expect(attr(by(undo(undone), 'Aria'), 'Life').current).toBe(5);
  });

  it('undoes applying a pending result and puts it back', () => {
    const { enc } = start();
    const pending = use(enc, 'Aria', 'fireball', ['Goblin 2'], scripted(3, 4));
    const applied = applyPending(pending, pending.pending[0].id);
    const undone = undo(applied);
    expect(attr(by(undone, 'Goblin 2'), 'Life').current).toBe(13);
    expect(undone.pending).toHaveLength(1);
  });

  it('does nothing when there is nothing to undo', () => {
    const { enc } = start();
    expect(undo(enc)).toEqual(enc);
  });
});

describe('proposeRewards', () => {
  const beaten = (...which: string[]) => {
    let { enc } = start();
    for (const name of which) enc = damageCombatant(enc, by(enc, name).id, 13);
    return enc;
  };

  it('adds up the defeated enemies XP, split evenly among the characters, with their money and loot', () => {
    const rewards = proposeRewards(beaten('Goblin 1', 'Goblin 2'));
    expect(rewards.xp.total).toBe(60);
    expect(rewards.xp.perCharacter).toEqual([
      { characterId: 'aria', amount: 30 },
      { characterId: 'bram', amount: 30 },
    ]);
    expect(rewards.money).toBe(14);
    expect(rewards.loot).toEqual([
      { fromName: 'Goblin 1', entry: potion },
      { fromName: 'Goblin 2', entry: potion },
    ]);
  });

  it('ignores enemies still standing and rounds the share down', () => {
    const rewards = proposeRewards(beaten('Goblin 1'));
    expect(rewards.xp.total).toBe(30);
    expect(rewards.money).toBe(7);
    expect(rewards.loot).toHaveLength(1);
    const { world } = start();
    const three = ok(
      startEncounter(
        {
          ...world,
          characters: [
            ...world.characters,
            { ...world.characters[0], id: 'cleo', name: 'Cleo' },
          ],
        },
        { ...picks, characterIds: ['aria', 'bram', 'cleo'] },
        newId,
      ),
    ).encounter;
    const hit = damageCombatant(
      three,
      three.combatants.find((c) => c.name === 'Goblin 1')!.id,
      13,
    );
    expect(proposeRewards(hit).xp.perCharacter.map((p) => p.amount)).toEqual([
      10, 10, 10,
    ]);
  });

  it('counts nothing for no defeated enemy, and never for allies', () => {
    expect(proposeRewards(beaten()).xp.total).toBe(0);
    const { world } = start();
    const ally = ok(
      startEncounter(
        world,
        {
          characterIds: ['aria'],
          npcs: [{ npcId: 'goblin', count: 1, side: 'ally' }],
        },
        newId,
      ),
    ).encounter;
    const down = damageCombatant(ally, ally.combatants[1].id, 13);
    expect(proposeRewards(down)).toMatchObject({
      xp: { total: 0 },
      money: 0,
      loot: [],
    });
  });
});

describe('a skill effect reading the target', () => {
  it('computes the amount against the actual target of the encounter', () => {
    const exploit: Skill = {
      ...fireball,
      id: 'exploit',
      cost: undefined,
      cooldown: 0,
      roll: undefined,
      effects: [
        { kind: 'damage', attribute: 'Life', amount: 'target_Life + 1' },
      ],
    };
    const { enc } = start();
    const aria = by(enc, 'Aria');
    const armed = {
      ...enc,
      combatants: enc.combatants.map((c) =>
        c.id === aria.id
          ? { ...c, skills: [...c.skills, { skillId: 'exploit', level: 1 }] }
          : c,
      ),
    };
    const result = ok(
      useSkill(
        armed,
        {
          casterId: aria.id,
          skillId: 'exploit',
          targetIds: [by(armed, 'Goblin 2').id],
        },
        [...skills, exploit],
        false,
        forbidden,
      ),
    );
    expect(result.encounter.pending[0]).toMatchObject({
      effects: [{ kind: 'damage', attribute: 'Life', amount: 14 }],
    });
  });
});

describe('optional combat steps', () => {
  const all = {
    initiative: true,
    actionCounters: true,
    gmValidation: true,
    defence: true,
    rewards: true,
  };
  const off = (step: keyof typeof all, extra: Partial<CombatRules> = {}) => ({
    steps: { ...all, [step]: false },
    ...extra,
  });
  const fireballAt = (rules: Partial<CombatRules>) => {
    const { enc, world } = start({ defence: 'Armor', ...rules });
    const next = ok(
      useSkill(
        enc,
        {
          casterId: by(enc, 'Aria').id,
          skillId: 'fireball',
          targetIds: [by(enc, 'Goblin 1').id],
        },
        skills,
        true,
        scripted(0, 0),
        world.combat,
      ),
    ).encounter;
    return { enc: next, world };
  };

  it('creates combatants without action counters when that step is off', () => {
    const { enc } = start(off('actionCounters'));
    expect(enc.combatants.map((c) => c.actions)).toEqual([[], [], [], [], []]);
  });

  it('keeps the action counters when the step is on', () => {
    const { enc } = start({ steps: all });
    expect(by(enc, 'Aria').actions).toEqual([
      { name: 'Action', count: 1, used: 0, movement: false },
      { name: 'Movement', count: 1, used: 0, movement: true },
    ]);
  });

  it('posts a pending result when GM validation is on', () => {
    const { enc } = fireballAt({ steps: all });
    expect(enc.pending).toHaveLength(1);
    expect(attr(by(enc, 'Goblin 1'), 'Life').current).toBe(13);
  });

  it('applies a skill at once when GM validation is off: no pending, cost, cooldown and log kept, defence taken off', () => {
    const { enc } = fireballAt(off('gmValidation'));
    expect(enc.pending).toEqual([]);
    // 2d6 = 2, 12 + 2 = 14 damage, minus 3 armor defence
    expect(attr(by(enc, 'Goblin 1'), 'Life').current).toBe(2);
    expect(attr(by(enc, 'Aria'), 'Mana').current).toBe(0);
    expect(by(enc, 'Aria').cooldowns['fireball']).toBe(2);
    expect(enc.log.map((l) => l.kind)).toEqual(['skill', 'apply']);
  });

  it('applies at once without defence when both GM validation and defence are off', () => {
    const { enc } = fireballAt({
      steps: { ...all, gmValidation: false, defence: false },
    });
    expect(enc.pending).toEqual([]);
    expect(attr(by(enc, 'Goblin 1'), 'Life').current).toBe(0);
    expect(by(enc, 'Goblin 1').down).toBe(true);
  });

  it('ignores the defence option and suggests none when the defence step is off', () => {
    const { enc, world } = fireballAt({ steps: all });
    const id = enc.pending[0].id;
    expect(suggestDefence(enc, id, world.combat)).toBe(3);
    const noDefence = { ...world.combat, steps: { ...all, defence: false } };
    expect(suggestDefence(enc, id, noDefence)).toBe(0);
    const applied = applyPending(enc, id, { defence: true, rules: noDefence });
    expect(attr(by(applied, 'Goblin 1'), 'Life').current).toBe(0);
  });

  it('proposes no rewards when the rewards step is off', () => {
    const { enc, world } = start({ steps: { ...all, rewards: false } });
    const beaten = damageCombatant(enc, by(enc, 'Goblin 1').id, 13);
    expect(combatRewards(beaten, world.combat)).toBeNull();
  });

  it('proposes the rewards when the step is on', () => {
    const { enc, world } = start({ steps: all });
    const beaten = damageCombatant(enc, by(enc, 'Goblin 1').id, 13);
    expect(combatRewards(beaten, world.combat)?.xp.total).toBe(30);
    expect(combatRewards(beaten, world.combat)?.money).toBe(7);
  });
});

describe('startEncounter with positions', () => {
  const gridRules = { grid: { enabled: true, columns: 4, rows: 3 } };
  const place = (
    positions: Record<string, { x: number; y: number }>,
    rules: Partial<CombatRules> = gridRules,
  ) => {
    const w = { ...build().world };
    w.combat = { ...w.combat, ...rules };
    return startEncounter(w, { ...picks, positions }, newId);
  };

  it('puts each combatant on the cell of its slot', () => {
    const result = place({
      'character:aria': { x: 3, y: 2 },
      'character:bram': { x: 1, y: 1 },
      'npc:goblin:1': { x: 0, y: 0 },
      'npc:goblin:3': { x: 2, y: 0 },
    });
    const enc = ok(result).encounter;
    expect(by(enc, 'Aria').position).toEqual({ x: 3, y: 2 });
    expect(by(enc, 'Bram').position).toEqual({ x: 1, y: 1 });
    expect(by(enc, 'Goblin 1').position).toEqual({ x: 0, y: 0 });
    expect(by(enc, 'Goblin 2').position).toBeUndefined();
    expect(by(enc, 'Goblin 3').position).toEqual({ x: 2, y: 0 });
  });

  it('ignores unknown slot keys', () => {
    const enc = ok(
      place({
        'character:ghost': { x: 1, y: 1 },
        'npc:goblin:9': { x: 2, y: 2 },
      }),
    ).encounter;
    expect(enc.combatants.every((c) => c.position === undefined)).toBe(true);
  });

  it('refuses a cell out of bounds', () => {
    expect(place({ 'character:aria': { x: 4, y: 0 } })).toEqual({
      ok: false,
      error: 'badPositions',
    });
    expect(place({ 'character:aria': { x: 0, y: -1 } })).toEqual({
      ok: false,
      error: 'badPositions',
    });
  });

  it('refuses two slots on one cell', () => {
    expect(
      place({
        'character:aria': { x: 1, y: 1 },
        'npc:goblin:2': { x: 1, y: 1 },
      }),
    ).toEqual({ ok: false, error: 'badPositions' });
  });

  it('ignores the positions when the grid is off', () => {
    const enc = ok(
      place(
        { 'character:aria': { x: 99, y: 99 } },
        { grid: { enabled: false, columns: 4, rows: 3 } },
      ),
    ).encounter;
    expect(enc.combatants.every((c) => c.position === undefined)).toBe(true);
  });
});
