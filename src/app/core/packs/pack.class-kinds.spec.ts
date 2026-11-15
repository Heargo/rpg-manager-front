import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePack as validate } from './pack';

// Typed loosely: the class kinds do not exist on the types yet.
const validatePack = (json: unknown): any => validate(json);

const BASE_JSON = (id: string) => join(process.cwd(), `public/packs/${id}/pack.json`);

const valid = (): Record<string, any> => ({
  format: 2,
  id: 'my-pack',
  language: 'fr',
  name: 'Mon pack',
  description: 'Des classes',
  version: '1.0.0',
  author: 'Someone',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  domains: {
    classes: {
      kinds: {
        martial: { skills: ['strike', 'war-cry'] },
        warrior: { parent: 'martial' },
        brute: { parent: 'martial', skills: ['toughness'] },
        wanderer: {},
      },
      texts: 'generators/classes.json',
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

describe('validatePack class kinds', () => {
  it('accepts favoured skill kinds on any level, a child overriding them, and a kind with none', () => {
    const result = validatePack(valid());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    const kinds = result.value.domains.classes.kinds;
    expect(kinds['martial']).toEqual({ skills: ['strike', 'war-cry'] });
    expect(kinds['brute']).toEqual({ parent: 'martial', skills: ['toughness'] });
    expect(kinds['wanderer']).toEqual({});
  });

  it('accepts a parent that the pack does not declare', () => {
    const json = valid();
    json['domains'].classes.kinds['ghost'] = { parent: 'declared-elsewhere' };
    expect(validatePack(json).ok).toBe(true);
  });

  it('rejects skills that is not a list', () => {
    const json = valid();
    json['domains'].classes.kinds.martial.skills = 'strike';
    expect(mentions(errorsOf(json), 'martial', 'skills')).toBe(true);
  });

  it('rejects a skill kind id that is not kebab-case', () => {
    const json = valid();
    json['domains'].classes.kinds.martial.skills = ['strike', 'War Cry'];
    expect(mentions(errorsOf(json), 'martial', 'skills')).toBe(true);
  });

  it('rejects a skill kind that is not a string', () => {
    const json = valid();
    json['domains'].classes.kinds.martial.skills = [3];
    expect(mentions(errorsOf(json), 'martial', 'skills')).toBe(true);
  });

  it('rejects an unknown field in a class kind', () => {
    const json = valid();
    json['domains'].classes.kinds.warrior.colour = 'red';
    expect(mentions(errorsOf(json), 'warrior', 'colour')).toBe(true);
  });

  it('does not take skill, item or NPC fields', () => {
    const json = valid();
    json['domains'].classes.kinds.warrior.type = 'active';
    json['domains'].classes.kinds.martial.roles = ['enemy'];
    const errors = errorsOf(json);
    expect(mentions(errors, 'warrior', 'type')).toBe(true);
    expect(mentions(errors, 'martial', 'roles')).toBe(true);
  });

  it('rejects a cycle inside the pack', () => {
    const json = valid();
    json['domains'].classes.kinds.martial = { parent: 'warrior' };
    expect(mentions(errorsOf(json), 'cycle')).toBe(true);
  });
});

const EXPECTED_KINDS = {
  martial: { skills: ['strike', 'shot', 'war-cry', 'toughness'] },
  warrior: { parent: 'martial' },
  berserker: { parent: 'martial' },
  knight: { parent: 'martial' },
  arcane: { skills: ['fire-spell', 'frost-spell', 'lightning-spell', 'shadow-spell', 'focus'] },
  mage: { parent: 'arcane' },
  warlock: { parent: 'arcane' },
  sorcerer: { parent: 'arcane' },
  divine: { skills: ['healing', 'blessing', 'prayer'] },
  cleric: { parent: 'divine' },
  paladin: { parent: 'divine' },
  nature: { skills: ['remedy', 'frost-spell', 'agility'] },
  druid: { parent: 'nature' },
  ranger: { parent: 'nature' },
  shaman: { parent: 'nature' },
  cunning: { skills: ['shot', 'curse', 'agility', 'presence'] },
  rogue: { parent: 'cunning' },
  assassin: { parent: 'cunning' },
  bard: { parent: 'cunning' },
};

describe.each(['base-fr', 'base-en'] as const)('the real %s pack class kinds', (id) => {
  const read = (): Record<string, any> => JSON.parse(readFileSync(BASE_JSON(id), 'utf8'));

  it('is a valid manifest without warnings', () => {
    const result = validatePack(read());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect(result.warnings).toEqual([]);
  });

  it('declares the class kinds of the spec', () => {
    expect(read()['domains'].classes.kinds).toEqual(EXPECTED_KINDS);
  });

  it('still points at its classes word list', () => {
    expect(read()['domains'].classes.texts).toBe('generators/classes.json');
  });
});

describe('the two real Bases together', () => {
  it('declare identical class kinds, so they merge', () => {
    const kinds = (id: string) => JSON.parse(readFileSync(BASE_JSON(id), 'utf8'))['domains'].classes.kinds;
    expect(kinds('base-fr')).toBeDefined();
    expect(kinds('base-fr')).toEqual(kinds('base-en'));
  });
});
