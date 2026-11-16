import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePack as validate } from './pack';

// Typed loosely: the skills kinds do not exist on the types yet.
const validatePack = (json: unknown): any => validate(json);

const BASE_JSON = (id: string) => join(process.cwd(), `public/packs/${id}/pack.json`);

const valid = (): Record<string, any> => ({
  format: 2,
  id: 'my-pack',
  language: 'fr',
  name: 'Mon pack',
  description: 'Des compétences',
  version: '1.0.0',
  author: 'Someone',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  domains: {
    skills: {
      kinds: {
        attack: { type: 'active', effect: 'damage' },
        strike: { parent: 'attack' },
        hex: { parent: 'attack', effect: 'modify' },
        wild: { type: 'active' },
        trait: { type: 'passive' },
        toughness: { parent: 'trait' },
      },
      texts: 'generators/skills.json',
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

describe('validatePack skill kinds', () => {
  it('accepts a type on a root, an effect on an active chain and a child that overrides it', () => {
    const result = validatePack(valid());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.value.domains.skills.kinds['attack']).toEqual({ type: 'active', effect: 'damage' });
    expect(result.value.domains.skills.kinds['hex']).toEqual({ parent: 'attack', effect: 'modify' });
    expect(result.value.domains.skills.kinds['wild']).toEqual({ type: 'active' });
  });

  it('accepts a parent that the pack does not declare', () => {
    const json = valid();
    json['domains'].skills.kinds['ghost'] = { parent: 'declared-elsewhere' };
    expect(validatePack(json).ok).toBe(true);
  });

  it('rejects a root without a type', () => {
    const json = valid();
    json['domains'].skills.kinds['spell'] = {};
    expect(mentions(errorsOf(json), 'spell', 'type')).toBe(true);
  });

  it('rejects a type on a kind that has a parent', () => {
    const json = valid();
    json['domains'].skills.kinds.strike.type = 'active';
    expect(mentions(errorsOf(json), 'strike', 'type')).toBe(true);
  });

  it('rejects a type that skills do not have', () => {
    const json = valid();
    json['domains'].skills.kinds.wild.type = 'toggle';
    expect(mentions(errorsOf(json), 'wild', 'type')).toBe(true);
  });

  it('rejects an effect that skills do not have', () => {
    const json = valid();
    json['domains'].skills.kinds.attack.effect = 'explode';
    expect(mentions(errorsOf(json), 'attack', 'effect')).toBe(true);
  });

  it('rejects an effect on a passive root', () => {
    const json = valid();
    json['domains'].skills.kinds.trait.effect = 'heal';
    expect(mentions(errorsOf(json), 'trait', 'effect')).toBe(true);
  });

  it('rejects an effect on a child of a passive chain', () => {
    const json = valid();
    json['domains'].skills.kinds.toughness.effect = 'damage';
    expect(mentions(errorsOf(json), 'toughness', 'effect')).toBe(true);
  });

  it('rejects an unknown field in a skill kind', () => {
    const json = valid();
    json['domains'].skills.kinds.strike.colour = 'red';
    expect(mentions(errorsOf(json), 'strike', 'colour')).toBe(true);
  });

  it('does not take item or NPC fields', () => {
    const json = valid();
    json['domains'].skills.kinds.strike.slot = 'head';
    json['domains'].skills.kinds.attack.roles = ['enemy'];
    const errors = errorsOf(json);
    expect(mentions(errors, 'strike', 'slot')).toBe(true);
    expect(mentions(errors, 'attack', 'roles')).toBe(true);
  });

  it('rejects a cycle inside the pack', () => {
    const json = valid();
    json['domains'].skills.kinds.attack = { parent: 'strike', type: 'active' };
    expect(mentions(errorsOf(json), 'cycle')).toBe(true);
  });
});

const EXPECTED_KINDS = {
  attack: { type: 'active', effect: 'damage' },
  strike: { parent: 'attack' },
  shot: { parent: 'attack' },
  'fire-spell': { parent: 'attack' },
  'frost-spell': { parent: 'attack' },
  'lightning-spell': { parent: 'attack' },
  'shadow-spell': { parent: 'attack' },
  healing: { type: 'active', effect: 'heal' },
  prayer: { parent: 'healing' },
  remedy: { parent: 'healing' },
  support: { type: 'active', effect: 'modify' },
  blessing: { parent: 'support' },
  curse: { parent: 'support' },
  'war-cry': { parent: 'support' },
  song: { parent: 'support' },
  trait: { type: 'passive' },
  toughness: { parent: 'trait' },
  focus: { parent: 'trait' },
  agility: { parent: 'trait' },
  presence: { parent: 'trait' },
};

describe.each(['base-fr', 'base-en'] as const)('the real %s pack skill kinds', (id) => {
  const read = (): Record<string, any> => JSON.parse(readFileSync(BASE_JSON(id), 'utf8'));

  it('is a valid manifest without warnings', () => {
    const result = validatePack(read());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.warnings).toEqual([]);
  });

  it('declares the skill kinds of the spec', () => {
    expect(read()['domains'].skills.kinds).toEqual(EXPECTED_KINDS);
  });

  it('still points at its skills word list', () => {
    expect(read()['domains'].skills.texts).toBe('generators/skills.json');
  });
});

describe('the two real Bases together', () => {
  it('declare identical skill kinds, so they merge', () => {
    const kinds = (id: string) => JSON.parse(readFileSync(BASE_JSON(id), 'utf8'))['domains'].skills.kinds;
    expect(kinds('base-fr')).toBeDefined();
    expect(kinds('base-fr')).toEqual(kinds('base-en'));
  });
});
