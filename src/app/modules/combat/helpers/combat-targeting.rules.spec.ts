import { Skill } from '../../skill/models/skill';
import { targetGroups } from './combat-targeting.rules';

const skill = (over: Partial<Skill>): Skill =>
  ({ id: 's', effects: [], ...over }) as Skill;

const combatants = [
  {
    id: 'ada',
    name: 'Ada',
    side: 'party' as const,
    portraitId: 'p-ada',
    lifePercent: 100,
    position: { x: 0, y: 0 },
  },
  {
    id: 'bob',
    name: 'Bob',
    side: 'party' as const,
    lifePercent: 50,
    position: { x: 2, y: 0 },
  },
  { id: 'npc', name: 'Elf', side: 'ally' as const, position: { x: 9, y: 9 } },
  {
    id: 'gob',
    name: 'Goblin',
    side: 'enemy' as const,
    lifePercent: 80,
    position: { x: 1, y: 0 },
  },
  { id: 'orc', name: 'Orc', side: 'enemy' as const, lifePercent: 0 },
  {
    id: 'ogre',
    name: 'Ogre',
    side: 'enemy' as const,
    position: { x: 8, y: 0 },
  },
];

describe('targetGroups', () => {
  it('lists enemies first for a one-enemy skill, with the caster and allies in the other group', () => {
    const groups = targetGroups(
      skill({ target: 'one-enemy' }),
      'ada',
      combatants,
    );
    expect(groups.map((g) => g.id)).toEqual(['enemies', 'allies']);
    expect(groups[0].options.map((o) => o.id)).toEqual(['gob', 'orc', 'ogre']);
    expect(groups[1].options.map((o) => o.id)).toEqual(['ada', 'bob', 'npc']);
  });

  it('lists enemies first for a skill with a damage effect whatever its target', () => {
    const groups = targetGroups(
      skill({
        target: 'area',
        effects: [{ kind: 'damage', attribute: 'Life', amount: '1' }],
      }),
      'ada',
      combatants,
    );
    expect(groups.map((g) => g.id)).toEqual(['enemies', 'allies']);
  });

  it('lists allies first for a healing skill', () => {
    const groups = targetGroups(
      skill({
        target: 'one-ally',
        effects: [{ kind: 'heal', attribute: 'Life', amount: '1' }],
      }),
      'ada',
      combatants,
    );
    expect(groups.map((g) => g.id)).toEqual(['allies', 'enemies']);
  });

  it('takes the camp from the caster: an enemy caster sees the party as enemies', () => {
    const groups = targetGroups(
      skill({ target: 'one-enemy' }),
      'gob',
      combatants,
    );
    expect(groups[0].options.map((o) => o.id)).toEqual(['ada', 'bob', 'npc']);
    expect(groups[1].options.map((o) => o.id)).toEqual(['gob', 'orc', 'ogre']);
  });

  it('passes name, portrait and life percent through, and keeps down combatants listed', () => {
    const [enemies, allies] = targetGroups(
      skill({ target: 'one-enemy' }),
      'ada',
      combatants,
    );
    expect(allies.options[0]).toMatchObject({
      id: 'ada',
      name: 'Ada',
      portraitId: 'p-ada',
      lifePercent: 100,
    });
    expect(allies.options[2].lifePercent).toBeUndefined();
    expect(enemies.options[1]).toMatchObject({ id: 'orc', lifePercent: 0 });
  });

  it('enables everyone without a grid', () => {
    const groups = targetGroups(
      skill({ target: 'one-enemy', range: 1 }),
      'ada',
      combatants,
    );
    expect(groups.flatMap((g) => g.options).every((o) => !o.disabled)).toBe(
      true,
    );
  });

  it('disables the combatants out of range on a grid, not the caster nor the unplaced', () => {
    const groups = targetGroups(
      skill({ target: 'one-enemy', range: 1 }),
      'ada',
      combatants,
      {
        enabled: true,
        columns: 10,
        rows: 10,
      },
    );
    const disabled = Object.fromEntries(
      groups.flatMap((g) => g.options).map((o) => [o.id, o.disabled]),
    );
    expect(disabled).toEqual({
      ada: false,
      bob: true,
      npc: true,
      gob: false,
      orc: false,
      ogre: true,
    });
  });

  it('enables everyone on a grid when the skill has no range', () => {
    const groups = targetGroups(
      skill({ target: 'one-enemy' }),
      'ada',
      combatants,
      {
        enabled: true,
        columns: 10,
        rows: 10,
      },
    );
    expect(groups.flatMap((g) => g.options).every((o) => !o.disabled)).toBe(
      true,
    );
  });
});
