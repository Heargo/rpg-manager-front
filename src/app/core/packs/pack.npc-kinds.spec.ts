import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePack as validate } from './pack';

// Typed loosely: the npcs kinds do not exist on the types yet.
const validatePack = (json: unknown): any => validate(json);

const BASE_JSON = (id: string) => join(process.cwd(), `public/packs/${id}/pack.json`);

const valid = (): Record<string, any> => ({
  format: 2,
  id: 'my-pack',
  language: 'fr',
  name: 'Mon pack',
  description: 'Des gens',
  version: '1.0.0',
  author: 'Someone',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  domains: {
    npcs: {
      kinds: {
        townsfolk: { roles: ['story'] },
        peasant: { parent: 'townsfolk' },
        smuggler: { parent: 'townsfolk', roles: ['merchant', 'enemy'] },
        beast: { roles: ['enemy'], person: false },
        wolf: { parent: 'beast' },
      },
      texts: 'generators/npcs.json',
    },
  },
  common: 'generators/common.json',
  sprites: [],
});

const errorsOf = (json: unknown): string[] => {
  // A rejection only means something if the untouched fixture is accepted.
  const baseline = validatePack(valid());
  expect(baseline.ok, 'the baseline fixture must be valid: ' + (baseline.errors ?? []).join(' | ')).toBe(true);
  const result = validatePack(json);
  if (result.ok) throw new Error('expected an invalid pack');
  return result.errors;
};

const mentions = (errors: string[], ...words: string[]) => errors.some((e) => words.every((w) => e.includes(w)));

describe('validatePack NPC kinds', () => {
  it('accepts roles on a root, a child that overrides them, and person on a root', () => {
    const result = validatePack(valid());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.value.domains.npcs.kinds['smuggler']).toEqual({ parent: 'townsfolk', roles: ['merchant', 'enemy'] });
    expect(result.value.domains.npcs.kinds['beast']).toEqual({ roles: ['enemy'], person: false });
  });

  it('accepts a parent that the pack does not declare', () => {
    const json = valid();
    json['domains'].npcs.kinds['ghost'] = { parent: 'declared-elsewhere' };
    expect(validatePack(json).ok).toBe(true);
  });

  it('rejects a root without roles', () => {
    const json = valid();
    json['domains'].npcs.kinds['guard'] = {};
    expect(mentions(errorsOf(json), 'guard', 'roles')).toBe(true);
  });

  it('rejects an empty list of roles', () => {
    const json = valid();
    json['domains'].npcs.kinds.townsfolk.roles = [];
    expect(mentions(errorsOf(json), 'townsfolk', 'roles')).toBe(true);
  });

  it('rejects a role that NPCs do not have', () => {
    const json = valid();
    json['domains'].npcs.kinds.townsfolk.roles = ['story', 'wizard'];
    expect(mentions(errorsOf(json), 'townsfolk', 'roles')).toBe(true);
  });

  it('rejects roles that are not a list', () => {
    const json = valid();
    json['domains'].npcs.kinds.townsfolk.roles = 'story';
    expect(mentions(errorsOf(json), 'townsfolk', 'roles')).toBe(true);
  });

  it('rejects an override with a role that NPCs do not have', () => {
    const json = valid();
    json['domains'].npcs.kinds.peasant.roles = ['hero'];
    expect(mentions(errorsOf(json), 'peasant', 'roles')).toBe(true);
  });

  it('rejects person on a kind that has a parent', () => {
    const json = valid();
    json['domains'].npcs.kinds.wolf.person = false;
    expect(mentions(errorsOf(json), 'wolf', 'person')).toBe(true);
  });

  it('rejects a person that is not a boolean', () => {
    const json = valid();
    json['domains'].npcs.kinds.beast.person = 'no';
    expect(mentions(errorsOf(json), 'beast', 'person')).toBe(true);
  });

  it('rejects an unknown field in an NPC kind', () => {
    const json = valid();
    json['domains'].npcs.kinds.peasant.colour = 'red';
    expect(mentions(errorsOf(json), 'peasant', 'colour')).toBe(true);
  });

  it('does not take item fields', () => {
    const json = valid();
    json['domains'].npcs.kinds.peasant.slot = 'head';
    expect(mentions(errorsOf(json), 'peasant', 'slot')).toBe(true);
  });

  it('rejects a cycle inside the pack', () => {
    const json = valid();
    json['domains'].npcs.kinds.townsfolk = { parent: 'peasant', roles: ['story'] };
    expect(mentions(errorsOf(json), 'cycle')).toBe(true);
  });
});

const EXPECTED_KINDS = {
  townsfolk: { roles: ['story'] },
  peasant: { parent: 'townsfolk' },
  noble: { parent: 'townsfolk' },
  scholar: { parent: 'townsfolk' },
  priest: { parent: 'townsfolk' },
  trader: { roles: ['merchant'] },
  merchant: { parent: 'trader' },
  innkeeper: { parent: 'trader' },
  blacksmith: { parent: 'trader' },
  peddler: { parent: 'trader' },
  guard: { roles: ['story', 'enemy'] },
  outlaw: { roles: ['enemy'] },
  bandit: { parent: 'outlaw' },
  cultist: { parent: 'outlaw' },
  mercenary: { parent: 'outlaw' },
  beast: { roles: ['enemy'], person: false },
  wolf: { parent: 'beast' },
  bear: { parent: 'beast' },
  'giant-spider': { parent: 'beast' },
  boar: { parent: 'beast' },
};

describe.each(['base-fr', 'base-en'] as const)('the real %s pack NPC kinds', (id) => {
  const read = (): Record<string, any> => JSON.parse(readFileSync(BASE_JSON(id), 'utf8'));

  it('is a valid manifest without warnings', () => {
    const result = validatePack(read());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.warnings).toEqual([]);
  });

  it('declares the NPC kinds of the spec', () => {
    expect(read()['domains'].npcs.kinds).toEqual(EXPECTED_KINDS);
  });

  it('still points at its npcs word list', () => {
    expect(read()['domains'].npcs.texts).toBe('generators/npcs.json');
  });
});

describe('the two real Bases together', () => {
  it('declare identical NPC kinds, so they merge', () => {
    const kinds = (id: string) => JSON.parse(readFileSync(BASE_JSON(id), 'utf8'))['domains'].npcs.kinds;
    expect(kinds('base-fr')).toBeDefined();
    expect(kinds('base-fr')).toEqual(kinds('base-en'));
  });
});
