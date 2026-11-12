import { Skill } from '../../skill/models/skill';
import { skillUsages } from '../../skill/helpers/skill.rules';
import { CharacterClass } from '../models/class';
import { treeNodeStates, validateClass } from './class.rules';

const skill = (id: string, maxLevel = 3): Skill => ({
  id, name: id, description: '', rarity: 'common', type: 'passive', maxLevel, pointCost: 1,
  effects: [{ kind: 'modify', attribute: 'Life', amount: 'skillLevel', duration: 0 }],
});
const skills = [skill('s1'), skill('s2'), skill('s3', 2)];
const names = ['Life', 'Mana'];

const warrior: CharacterClass = {
  id: 'c1', name: 'Warrior', description: '',
  tree: [
    { skillId: 's1', requires: [], minLevel: 1, column: 0, row: 0 },
    { skillId: 's2', requires: [{ skillId: 's1', level: 2 }], minLevel: 3, column: 1, row: 0 },
  ],
};

describe('validateClass', () => {
  it('accepts a valid class', () => {
    expect(validateClass(warrior, skills, names)).toEqual([]);
  });

  it('requires a name', () => {
    expect(validateClass({ ...warrior, name: ' ' }, skills, names)).toEqual([{ field: 'name', code: 'required' }]);
  });

  it('requires at least one node with no prerequisite', () => {
    const tree = [{ skillId: 's1', requires: [{ skillId: 's2', level: 1 }], minLevel: 1, column: 0, row: 0 },
      { skillId: 's2', requires: [{ skillId: 's1', level: 1 }], minLevel: 1, column: 1, row: 0 }];
    expect(validateClass({ ...warrior, tree }, skills, names)).toContainEqual({ field: 'tree', code: 'noRoot' });
    expect(validateClass({ ...warrior, tree: [] }, skills, names)).toContainEqual({ field: 'tree', code: 'noRoot' });
  });

  it('refuses a cycle', () => {
    const tree = [
      { skillId: 's1', requires: [], minLevel: 1, column: 0, row: 0 },
      { skillId: 's2', requires: [{ skillId: 's3', level: 1 }], minLevel: 1, column: 1, row: 0 },
      { skillId: 's3', requires: [{ skillId: 's2', level: 1 }], minLevel: 1, column: 2, row: 0 },
    ];
    expect(validateClass({ ...warrior, tree }, skills, names)).toContainEqual({ field: 'tree', code: 'cycle' });
  });

  it('refuses a prerequisite that is not in the same tree', () => {
    const tree = [warrior.tree[0], { ...warrior.tree[1], requires: [{ skillId: 's3', level: 1 }] }];
    expect(validateClass({ ...warrior, tree }, skills, names)).toEqual([{ field: 'tree.1.requires.0', code: 'outsideTree' }]);
  });

  it('refuses a skill twice in the tree', () => {
    const tree = [...warrior.tree, { skillId: 's1', requires: [], minLevel: 1, column: 2, row: 0 }];
    expect(validateClass({ ...warrior, tree }, skills, names)).toEqual([{ field: 'tree.2.skillId', code: 'duplicate' }]);
  });

  it('refuses a skill that is not in the catalogue', () => {
    const tree = [...warrior.tree, { skillId: 'gone', requires: [], minLevel: 1, column: 2, row: 0 }];
    expect(validateClass({ ...warrior, tree }, skills, names)).toEqual([{ field: 'tree.2.skillId', code: 'unknownSkill' }]);
  });

  it('refuses a min level below 1 and a required level outside 1 to the skill max level', () => {
    const level0 = [warrior.tree[0], { ...warrior.tree[1], minLevel: 0 }];
    expect(validateClass({ ...warrior, tree: level0 }, skills, names)).toEqual([{ field: 'tree.1.minLevel', code: 'invalid' }]);
    const skillLevel4 = [warrior.tree[0], { ...warrior.tree[1], requires: [{ skillId: 's1', level: 4 }] }];
    expect(validateClass({ ...warrior, tree: skillLevel4 }, skills, names)).toEqual([{ field: 'tree.1.requires.0.level', code: 'invalid' }]);
    const skillLevel0 = [warrior.tree[0], { ...warrior.tree[1], requires: [{ skillId: 's1', level: 0 }] }];
    expect(validateClass({ ...warrior, tree: skillLevel0 }, skills, names)).toEqual([{ field: 'tree.1.requires.0.level', code: 'invalid' }]);
  });

  it('refuses a bonus on an unknown attribute', () => {
    const bad = { ...warrior, bonuses: [{ attribute: 'Luck', value: 1 }] };
    expect(validateClass(bad, skills, names)).toEqual([{ field: 'bonuses.0.attribute', code: 'invalid' }]);
  });
});

describe('treeNodeStates', () => {
  it('locks a node whose prerequisite level and level are missing, saying why', () => {
    const states = treeNodeStates(warrior.tree, { level: 1, skills: [{ skillId: 's1', level: 1 }] });
    expect(states).toEqual([
      { skillId: 's1', state: 'learned', missing: [] },
      { skillId: 's2', state: 'locked', missing: [{ kind: 'requires', skillId: 's1', level: 2 }, { kind: 'level', minLevel: 3 }] },
    ]);
  });

  it('makes a node available when its prerequisites and level are met, learned once it has a level', () => {
    const available = treeNodeStates(warrior.tree, { level: 3, skills: [{ skillId: 's1', level: 2 }] });
    expect(available[1]).toEqual({ skillId: 's2', state: 'available', missing: [] });
    const learned = treeNodeStates(warrior.tree, { level: 3, skills: [{ skillId: 's1', level: 2 }, { skillId: 's2', level: 1 }] });
    expect(learned[1].state).toBe('learned');
  });

  it('makes a root available at once', () => {
    expect(treeNodeStates(warrior.tree, { level: 1, skills: [] })[0]).toEqual({ skillId: 's1', state: 'available', missing: [] });
  });
});

describe('skillUsages with classes', () => {
  it('lists the classes whose tree has the skill, after the sheets', () => {
    const npc = { id: 'n1', name: 'Goblin', skills: [{ skillId: 's1', level: 1 }] } as never;
    expect(skillUsages('s1', { characters: [], npcs: [npc], classes: [warrior] })).toEqual([
      { kind: 'npc', id: 'n1', name: 'Goblin' },
      { kind: 'class', id: 'c1', name: 'Warrior' },
    ]);
    expect(skillUsages('s3', { characters: [], npcs: [], classes: [warrior] })).toEqual([]);
  });
});
