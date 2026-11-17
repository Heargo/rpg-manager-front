import { validatePack as validate } from './pack';
import { validatePackContent as validateContent } from './pack-content';

// Typed loosely: the content fields do not exist on the types yet.
const validatePack = (json: unknown): any => validate(json);
const validatePackContent = (domain: string, json: unknown, context: unknown): any =>
  (validateContent as any)(domain, json, context);

const manifest = (): Record<string, any> => ({
  format: 2,
  id: 'my-pack',
  language: 'fr',
  name: 'Mon pack',
  description: 'Du contenu',
  version: '1.0.0',
  author: 'Someone',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attributes: [
    { id: 'str', name: 'Force' },
    { id: 'mana', name: 'Mana', max: 30, formula: 'level * 3' },
  ],
  domains: {
    items: { content: 'content/items.json' },
    skills: { content: 'content/skills.json' },
    classes: { content: 'content/classes.json' },
  },
  sprites: [],
});

const item = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: 'Epee',
  description: 'Une epee.',
  rarity: 'common',
  type: 'equipment',
  slot: 'weapon1',
  price: 10,
  modifiers: [{ attribute: 'str', value: 2 }],
  ...extra,
});

const skill = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: 'Frappe',
  description: 'Un coup.',
  rarity: 'common',
  type: 'passive',
  maxLevel: 3,
  pointCost: 1,
  effects: [],
  ...extra,
});

const klass = (id: string, skillIds: string[], extra: Record<string, unknown> = {}) => ({
  id,
  name: 'Guerrier',
  description: 'Un guerrier.',
  maxLevel: 10,
  pointCost: 1,
  bonuses: [{ attribute: 'str', value: 1 }],
  tree: skillIds.map((skillId, i) => ({ skillId, requires: [], minLevel: 1, column: i, row: 0 })),
  ...extra,
});

const context = { attributeIds: ['str', 'mana'], skillIds: ['strike', 'shot'] };

const errorsOfPack = (json: unknown): string[] => {
  // A rejection only means something if the untouched fixture is accepted.
  const baseline = validatePack(manifest());
  expect(baseline.ok, 'the baseline manifest must be valid: ' + (baseline.errors ?? []).join(' | ')).toBe(true);
  const result = validatePack(json);
  if (result.ok) throw new Error('expected an invalid pack');
  return result.errors;
};

const errorsOfContent = (domain: string, json: unknown, ctx: unknown = context): string[] => {
  const result = validatePackContent(domain, json, ctx);
  if (result.ok) throw new Error('expected an invalid content file');
  return result.errors;
};

const mentions = (errors: string[], ...words: string[]) => errors.some((e) => words.every((w) => e.includes(w)));

describe('validatePack content and attributes', () => {
  it('accepts content paths on the three domains and a list of attributes, and keeps them', () => {
    const result = validatePack(manifest());

    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.value.domains.items.content).toBe('content/items.json');
    expect(result.value.domains.skills.content).toBe('content/skills.json');
    expect(result.value.domains.classes.content).toBe('content/classes.json');
    expect(result.value.attributes).toEqual([
      { id: 'str', name: 'Force' },
      { id: 'mana', name: 'Mana', max: 30, formula: 'level * 3' },
    ]);
  });

  it('accepts a pack without content and without attributes', () => {
    const json = manifest();
    delete json['attributes'];
    json['domains'] = {};

    expect(validatePack(json).ok).toBe(true);
  });

  it('rejects content on a neutral pack', () => {
    const json = manifest();
    delete json['language'];

    expect(mentions(errorsOfPack(json), 'content', 'language')).toBe(true);
  });

  it('rejects a content path that is not relative to the pack', () => {
    const json = manifest();
    json['domains'].items.content = '../items.json';

    expect(mentions(errorsOfPack(json), 'items.content', 'relative path')).toBe(true);
  });

  it('rejects attributes that are not a list', () => {
    const json = manifest();
    json['attributes'] = { str: 'Force' };

    expect(mentions(errorsOfPack(json), 'attributes')).toBe(true);
  });

  it('rejects an attribute without a name, with a bad id, used twice, or with a bad max', () => {
    const noName = manifest();
    noName['attributes'] = [{ id: 'str' }];
    const badId = manifest();
    badId['attributes'] = [{ id: 'Not Kebab', name: 'Force' }];
    const twice = manifest();
    twice['attributes'] = [
      { id: 'str', name: 'Force' },
      { id: 'str', name: 'Autre' },
    ];
    const badMax = manifest();
    badMax['attributes'] = [{ id: 'str', name: 'Force', max: 'lots' }];

    expect(mentions(errorsOfPack(noName), 'attributes', 'name')).toBe(true);
    expect(mentions(errorsOfPack(badId), 'attributes', 'id')).toBe(true);
    expect(mentions(errorsOfPack(twice), 'attributes', 'str')).toBe(true);
    expect(mentions(errorsOfPack(badMax), 'attributes', 'max')).toBe(true);
  });
});

describe('validatePackContent', () => {
  it('accepts valid items, skills and classes and returns the entries', () => {
    const items = validatePackContent('items', [item('sword')], context);
    const skills = validatePackContent('skills', [skill('strike')], context);
    const classes = validatePackContent('classes', [klass('warrior', ['strike'])], context);

    for (const result of [items, skills, classes]) if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(items.value.map((e: any) => e.id)).toEqual(['sword']);
    expect(skills.value.map((e: any) => e.id)).toEqual(['strike']);
    expect(classes.value.map((e: any) => e.id)).toEqual(['warrior']);
  });

  it('accepts an empty list', () => {
    expect(validatePackContent('items', [], context).ok).toBe(true);
  });

  it('rejects a file that is not a list', () => {
    expect(errorsOfContent('items', { sword: item('sword') }).length).toBeGreaterThan(0);
  });

  it('rejects an entry that is not valid for its domain, naming its id', () => {
    const noName = item('sword');
    delete (noName as any).name;

    expect(mentions(errorsOfContent('items', [noName]), 'sword', 'name')).toBe(true);
    expect(mentions(errorsOfContent('items', [item('rock', { type: 'weapon' })]), 'rock', 'type')).toBe(true);
    expect(mentions(errorsOfContent('skills', [skill('strike', { maxLevel: 'x' })]), 'strike', 'maxLevel')).toBe(true);
  });

  it('rejects an entry without an id', () => {
    const noId = item('sword');
    delete (noId as any).id;

    expect(mentions(errorsOfContent('items', [noId]), 'id')).toBe(true);
  });

  it('rejects duplicate entry ids in a domain', () => {
    expect(mentions(errorsOfContent('items', [item('sword'), item('sword')]), 'sword')).toBe(true);
  });

  it('rejects an item modifier on an attribute the pack does not declare', () => {
    const errors = errorsOfContent('items', [item('sword', { modifiers: [{ attribute: 'luck', value: 1 }] })]);

    expect(mentions(errors, 'sword', 'luck')).toBe(true);
  });

  it('rejects a class bonus on an attribute the pack does not declare', () => {
    const errors = errorsOfContent('classes', [klass('warrior', ['strike'], { bonuses: [{ attribute: 'luck', value: 1 }] })]);

    expect(mentions(errors, 'warrior', 'luck')).toBe(true);
  });

  it('rejects a class tree node on a skill that is not one of the pack skills', () => {
    const errors = errorsOfContent('classes', [klass('warrior', ['strike', 'fireball'])]);

    expect(mentions(errors, 'warrior', 'fireball')).toBe(true);
  });

  it('rejects a class requirement on a skill outside the pack skills', () => {
    const node = { skillId: 'strike', requires: [{ skillId: 'fireball', level: 1 }], minLevel: 1, column: 0, row: 0 };

    expect(mentions(errorsOfContent('classes', [klass('warrior', [], { tree: [node] })]), 'fireball')).toBe(true);
  });
});
