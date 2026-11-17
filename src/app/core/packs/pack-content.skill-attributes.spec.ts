import { planPackImport as planner, validatePackContent as validateContent } from './pack-content';

// Typed loosely: the planner's skill handling and the world's action types are not in the input type yet.
const planPackImport = (input: unknown): any => (planner as any)(input);
const validatePackContent = (domain: string, json: unknown, context: unknown): any =>
  (validateContent as any)(domain, json, context);

const attributes = [
  { id: 'life', name: 'Vie' },
  { id: 'mana', name: 'Mana' },
  { id: 'str', name: 'Force' },
];

const skill = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id,
  description: 'Une competence.',
  rarity: 'common',
  type: 'active',
  maxLevel: 3,
  pointCost: 1,
  target: 'one-enemy',
  cooldown: 0,
  effects: [{ kind: 'damage', attribute: 'life', amount: '[Force] * 0.5 + skillLevel * 3' }],
  ...extra,
});

const node = (skillId: string, requires: { skillId: string; level: number }[] = [], column = 0) => ({
  skillId,
  requires,
  minLevel: 1,
  column,
  row: 0,
});

const klass = (tree: unknown[]) => ({
  id: 'warrior',
  name: 'Guerrier',
  description: 'Un guerrier.',
  maxLevel: 10,
  pointCost: 1,
  tree,
});

const worldAttr = (id: string, name: string) => ({ id, name });

const plan = (skills: unknown[], overrides: Record<string, unknown> = {}) =>
  planPackImport({
    packId: 'base-fr',
    content: { skills },
    attributes,
    world: {
      items: [],
      skills: [],
      classes: [],
      attributes: [worldAttr('w1', 'Life'), worldAttr('w2', 'Mana'), worldAttr('w3', 'Strength')],
      actionTypes: [
        { name: 'Action', movement: false },
        { name: 'Movement', movement: true },
      ],
    },
    mapping: { life: 'w1', mana: 'w2', str: 'w3' },
    domains: ['skills'],
    ...overrides,
  });

const byId = (result: any, id: string) => result.skills.find((s: any) => s.id === id);

describe('planPackImport on skills: attributes', () => {
  it('remaps the attributes a skill formula reads by name, like modifiers', () => {
    const result = plan([skill('strike')]);

    expect(byId(result, 'base-fr:strike').effects[0].amount).toBe('[Strength] * 0.5 + skillLevel * 3');
  });

  it('remaps the attribute of each effect and of the cost to the world names', () => {
    const result = plan([skill('strike', { cost: { attribute: 'mana', amount: 3 } })]);

    const written = byId(result, 'base-fr:strike');
    expect(written.effects[0].attribute).toBe('Life');
    expect(written.cost).toEqual({ attribute: 'Mana', amount: 3 });
  });

  it('reads the attributes the world has under the pack name when the mapping is empty', () => {
    const result = plan([skill('strike')], {
      mapping: {},
      world: {
        items: [],
        skills: [],
        classes: [],
        attributes: [worldAttr('w1', 'Vie'), worldAttr('w3', 'Force')],
        actionTypes: [{ name: 'Action', movement: false }],
      },
    });

    expect(byId(result, 'base-fr:strike').effects[0]).toMatchObject({ attribute: 'Vie', amount: '[Force] * 0.5 + skillLevel * 3' });
    expect(result.needsChoice).toEqual([]);
  });

  it('asks for the attributes only a skill uses when the world lacks them', () => {
    const result = plan([skill('strike')], {
      mapping: {},
      world: { items: [], skills: [], classes: [], attributes: [], actionTypes: [] },
    });

    expect(result.needsChoice.map((a: any) => a.id).sort()).toEqual(['life', 'str']);
  });

  it('leaves out a skill whose effect is on an attribute mapped to skip', () => {
    const focus = skill('focus', {
      type: 'passive',
      effects: [{ kind: 'modify', attribute: 'mana', amount: 'skillLevel * 4', duration: 0 }],
    });

    const result = plan([skill('strike'), focus], { mapping: { life: 'w1', mana: 'skip', str: 'w3' } });

    expect(result.skills.map((s: any) => s.id)).toEqual(['base-fr:strike']);
  });

  it('leaves out a skill whose formula reads an attribute mapped to skip', () => {
    const result = plan([skill('strike')], { mapping: { life: 'w1', mana: 'w2', str: 'skip' } });

    expect(result.skills).toEqual([]);
  });

  it('keeps a skill whose cost is on a skipped attribute, and makes it free', () => {
    const result = plan([skill('strike', { cost: { attribute: 'mana', amount: 3 } })], {
      mapping: { life: 'w1', mana: 'skip', str: 'w3' },
    });

    const written = byId(result, 'base-fr:strike');
    expect(written).toBeDefined();
    expect(written.cost).toBeUndefined();
  });

  it('drops the tree nodes of a left-out skill and the requirements on it', () => {
    const focus = skill('focus', {
      type: 'passive',
      effects: [{ kind: 'modify', attribute: 'mana', amount: 'skillLevel * 4', duration: 0 }],
    });
    const tree = [node('strike'), node('focus', [], 1), node('bolt', [{ skillId: 'focus', level: 1 }], 2)];

    const result = planPackImport({
      packId: 'base-fr',
      content: { skills: [skill('strike'), focus, skill('bolt')], classes: [klass(tree)] },
      attributes,
      world: {
        items: [],
        skills: [],
        classes: [],
        attributes: [worldAttr('w1', 'Life'), worldAttr('w3', 'Strength')],
        actionTypes: [{ name: 'Action', movement: false }],
      },
      mapping: { life: 'w1', mana: 'skip', str: 'w3' },
      domains: ['skills', 'classes'],
    });

    expect(result.skills.map((s: any) => s.id).sort()).toEqual(['base-fr:bolt', 'base-fr:strike']);
    expect(result.classes[0].tree.map((n: any) => n.skillId)).toEqual(['base-fr:strike', 'base-fr:bolt']);
    expect(result.classes[0].tree[1].requires).toEqual([]);
  });
});

describe('planPackImport on skills: action types', () => {
  it('ticks the first action type of the world on an active skill', () => {
    const result = plan([skill('strike')], {
      world: {
        items: [],
        skills: [],
        classes: [],
        attributes: [worldAttr('w1', 'Life'), worldAttr('w2', 'Mana'), worldAttr('w3', 'Strength')],
        actionTypes: [
          { name: 'Attaque', movement: false },
          { name: 'Deplacement', movement: true },
        ],
      },
    });

    expect(byId(result, 'base-fr:strike').actionType).toBe('Attaque');
  });

  it('ticks the movement counter of the world on a movement skill', () => {
    const result = plan([skill('step', { movement: true, target: 'self' })], {
      world: {
        items: [],
        skills: [],
        classes: [],
        attributes: [worldAttr('w1', 'Life'), worldAttr('w2', 'Mana'), worldAttr('w3', 'Strength')],
        actionTypes: [
          { name: 'Strike', movement: false },
          { name: 'Sprint', movement: true },
        ],
      },
    });

    const written = byId(result, 'base-fr:step');
    expect(written.actionType).toBe('Sprint');
    expect(written.movement).toBeUndefined();
  });

});

describe('validatePackContent on skill attributes', () => {
  const context = { attributeIds: ['life', 'mana', 'str'], attributeNames: ['Vie', 'Mana', 'Force'], skillIds: [] };
  const errorsOf = (json: unknown[]): string[] => {
    const result = validatePackContent('skills', json, context);
    if (result.ok) throw new Error('expected an invalid content file');
    return result.errors;
  };

  it('rejects an effect on an undeclared attribute', () => {
    const errors = errorsOf([
      skill('strike', { effects: [{ kind: 'damage', attribute: 'ghost', amount: 'skillLevel' }] }),
    ]);

    expect(errors.some((e) => e.includes('strike') && e.includes('ghost'))).toBe(true);
  });

  it('rejects a cost on an undeclared attribute', () => {
    const errors = errorsOf([skill('strike', { cost: { attribute: 'ghost', amount: 2 } })]);

    expect(errors.some((e) => e.includes('strike') && e.includes('ghost'))).toBe(true);
  });
});
