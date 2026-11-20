import * as content from './pack-content';

// Typed loosely: the planner does not exist yet.
const planPackImport = (input: unknown): any => (content as any).planPackImport(input);

const attributes = [
  { id: 'str', name: 'Force' },
  { id: 'mana', name: 'Mana', max: 30, formula: 'level * 3' },
];

const item = (id: string, name: string, modifiers: { attribute: string; value: number }[] = []) => ({
  id,
  name,
  description: 'Un objet.',
  rarity: 'common',
  type: 'item',
  slot: 'none',
  price: 5,
  modifiers,
});

const skill = (id: string, name = 'Frappe') => ({
  id,
  name,
  description: 'Une competence.',
  rarity: 'common',
  type: 'passive',
  maxLevel: 3,
  pointCost: 1,
  effects: [],
});

const klass = (id: string, skillIds: string[]) => ({
  id,
  name: 'Guerrier',
  description: 'Un guerrier.',
  maxLevel: 10,
  pointCost: 1,
  bonuses: [{ attribute: 'str', value: 1 }],
  tree: skillIds.map((skillId, i) => ({
    skillId,
    requires: i ? [{ skillId: skillIds[0], level: 1 }] : [],
    minLevel: 1,
    column: i,
    row: 0,
  })),
});

const worldAttr = (id: string, name: string) => ({
  id,
  name,
  baseValue: 10,
  formula: { preset: 'linear', step: 1 },
});

const emptyWorld = () => ({ items: [] as any[], skills: [] as any[], classes: [] as any[], attributes: [] as any[] });

const plan = (overrides: Record<string, unknown> = {}) =>
  planPackImport({
    packId: 'my-pack',
    content: {
      items: [item('sword', 'Epee', [{ attribute: 'str', value: 2 }])],
      skills: [skill('strike'), skill('shot', 'Tir')],
      classes: [klass('warrior', ['strike'])],
    },
    attributes,
    world: { ...emptyWorld(), attributes: [worldAttr('w1', 'Force')] },
    mapping: {},
    domains: ['items', 'skills', 'classes'],
    ...overrides,
  });

/** Applies a plan to a world the way the catalogues would: written entries replace the ones with the same id. */
const apply = (world: any, result: any) => {
  const merge = (current: any[], written: any[]) => [
    ...current.filter((c) => !written.some((w) => w.id === c.id)),
    ...written,
  ];
  return {
    ...world,
    items: merge(world.items, result.items),
    skills: merge(world.skills, result.skills),
    classes: merge(world.classes, result.classes),
  };
};

describe('planPackImport', () => {
  it('prefixes every id with the pack id', () => {
    const result = plan();

    expect(result.items.map((e: any) => e.id)).toEqual(['my-pack:sword']);
    expect(result.skills.map((e: any) => e.id).sort()).toEqual(['my-pack:shot', 'my-pack:strike']);
    expect(result.classes.map((e: any) => e.id)).toEqual(['my-pack:warrior']);
    expect(result.items[0]).toMatchObject({ name: 'Epee', price: 5 });
  });

  it('rewrites the skill references of a class tree the same way', () => {
    const result = plan({ content: { classes: [klass('warrior', ['strike', 'shot'])], skills: [skill('strike'), skill('shot')] } });

    const tree = result.classes[0].tree;
    expect(tree.map((n: any) => n.skillId)).toEqual(['my-pack:strike', 'my-pack:shot']);
    expect(tree[1].requires).toEqual([{ skillId: 'my-pack:strike', level: 1 }]);
  });

  it('imports only the chosen domains', () => {
    const result = plan({ domains: ['items'] });

    expect(result.items).toHaveLength(1);
    expect(result.skills).toEqual([]);
    expect(result.classes).toEqual([]);
  });

  it('brings the pack skills a class references when importing classes, and no other', () => {
    const result = plan({ domains: ['classes'] });

    expect(result.classes.map((e: any) => e.id)).toEqual(['my-pack:warrior']);
    expect(result.skills.map((e: any) => e.id)).toEqual(['my-pack:strike']);
    expect(result.items).toEqual([]);
  });

  describe('re-importing', () => {
    it('updates a copy the GM has not edited', () => {
      const first = plan();
      const world = apply({ ...emptyWorld(), attributes: [worldAttr('w1', 'Force')] }, first);

      const second = plan({
        world,
        content: { items: [item('sword', 'Epee longue', [{ attribute: 'str', value: 3 }])], skills: [], classes: [] },
      });

      expect(second.items).toHaveLength(1);
      expect(second.items[0]).toMatchObject({ id: 'my-pack:sword', name: 'Epee longue' });
      expect(second.items[0].modifiers).toEqual([{ attribute: 'Force', value: 3 }]);
    });

    it('leaves a copy the GM edited alone, and reports it as kept', () => {
      const first = plan();
      const world = apply({ ...emptyWorld(), attributes: [worldAttr('w1', 'Force')] }, first);
      world.items = world.items.map((i: any) => ({ ...i, name: 'Ma lame' }));

      const second = plan({
        world,
        content: { items: [item('sword', 'Epee longue')], skills: [], classes: [] },
      });

      expect(second.items).toEqual([]);
      expect(second.kept).toContain('my-pack:sword');
    });

    it('keeps each copy on its own: an edited one does not block an untouched one', () => {
      const first = plan();
      const world = apply({ ...emptyWorld(), attributes: [worldAttr('w1', 'Force')] }, first);
      world.skills = world.skills.map((s: any) => (s.id === 'my-pack:strike' ? { ...s, name: 'Ma frappe' } : s));

      const second = plan({
        world,
        content: { skills: [skill('strike', 'Frappe 2'), skill('shot', 'Tir 2')], items: [], classes: [] },
      });

      expect(second.skills.map((s: any) => s.id)).toEqual(['my-pack:shot']);
      expect(second.skills[0].name).toBe('Tir 2');
      expect(second.kept).toEqual(['my-pack:strike']);
    });
  });

  describe('attributes', () => {
    it('uses the world attribute that has the same name, with its name on the modifier, and asks nothing', () => {
      const result = plan();

      expect(result.items[0].modifiers).toEqual([{ attribute: 'Force', value: 2 }]);
      expect(result.needsChoice).toEqual([]);
      expect(result.addAttributes).toEqual([]);
    });

    it('reports the used attributes the world lacks and the mapping does not cover', () => {
      const result = plan({
        world: emptyWorld(),
        content: { items: [item('sword', 'Epee', [{ attribute: 'str', value: 2 }, { attribute: 'mana', value: 1 }])] },
        domains: ['items'],
      });

      expect(result.needsChoice.map((a: any) => a.id).sort()).toEqual(['mana', 'str']);
    });

    it('maps a pack attribute to a world attribute by id, writing that attribute name on the modifier', () => {
      const result = plan({
        world: { ...emptyWorld(), attributes: [worldAttr('w9', 'Puissance')] },
        mapping: { str: 'w9' },
        domains: ['items'],
      });

      expect(result.items[0].modifiers).toEqual([{ attribute: 'Puissance', value: 2 }]);
      expect(result.needsChoice).toEqual([]);
    });

    it('drops the modifiers on a skipped attribute and keeps the others', () => {
      const result = plan({
        world: emptyWorld(),
        content: { items: [item('sword', 'Epee', [{ attribute: 'str', value: 2 }, { attribute: 'mana', value: 1 }])] },
        mapping: { str: 'skip', mana: 'add' },
        domains: ['items'],
      });

      expect(result.items[0].modifiers).toEqual([{ attribute: 'Mana', value: 1 }]);
      expect(result.needsChoice).toEqual([]);
    });

    it('lists the attributes to add, as the pack declares them, and uses their name on the modifier', () => {
      const result = plan({
        world: emptyWorld(),
        content: { items: [item('ring', 'Anneau', [{ attribute: 'mana', value: 4 }])] },
        mapping: { mana: 'add' },
        domains: ['items'],
      });

      expect(result.addAttributes).toEqual([{ id: 'mana', name: 'Mana', max: 30, formula: 'level * 3' }]);
      expect(result.items[0].modifiers).toEqual([{ attribute: 'Mana', value: 4 }]);
    });

    it('remaps the bonuses of a class too', () => {
      const result = plan({
        world: { ...emptyWorld(), attributes: [worldAttr('w9', 'Puissance')] },
        mapping: { str: 'w9' },
        domains: ['classes'],
      });

      expect(result.classes[0].bonuses).toEqual([{ attribute: 'Puissance', value: 1 }]);
    });

    it('does not ask about an attribute no imported entry uses', () => {
      const result = plan({ world: emptyWorld(), content: { skills: [skill('strike')] }, domains: ['skills'] });

      expect(result.needsChoice).toEqual([]);
    });
  });
});
