import { baseNpcVocabulary } from '../../../../testing/base-vocabulary';
import { buildNpcVocabulary } from '../../../core/generators/npc-vocabulary';
import { seededRandomSource } from '../../../core/generators/random-source';
import { PooledSource } from '../../../core/packs/pooled-domain';
import { createSandboxWorld } from '../../world/helpers/default-world';
import { World } from '../../world/models/world';
import { Npc } from '../models/npc';
import { validateNpc } from './npc.rules';
import { generateNpc } from './npc-editor.rules';

const KINDS = {
  townsfolk: { roles: ['story'] },
  peasant: { parent: 'townsfolk' },
  priest: { parent: 'townsfolk' },
  smuggler: { parent: 'townsfolk', roles: ['merchant', 'enemy'] },
  beast: { roles: ['enemy'], person: false },
  wolf: { parent: 'beast' },
  ghost: { parent: 'beast' },
};

const TEXTS = {
  version: 2,
  given: [{ text: 'Aldo', gender: 'm' }, { text: 'Mila', gender: 'f' }],
  epithets: [{ m: 'le Sage', f: 'la Sage' }],
  templates: ['{given} {epithet}'],
  kinds: {
    townsfolk: { descriptions: ['Un habitant.'] },
    priest: {
      nouns: [{ text: 'Prêtre', gender: 'm' }, { text: 'Prêtresse', gender: 'f' }],
      descriptions: ['{g:Il|Elle} prie à {place}.'],
      names: ['{given} {noun}'],
    },
    beast: { adjectives: ['sauvage'], descriptions: ['{g:Il|Elle} rôde.'] },
    wolf: {
      nouns: [{ text: 'Louve', gender: 'f' }],
      adjectives: [{ m: 'gris', f: 'grise' }],
      names: ['{noun} {adjective}'],
    },
  },
};

const source = (): PooledSource => ({
  packId: 'base-fr',
  isBase: true,
  language: 'fr',
  kinds: KINDS,
  texts: TEXTS,
  params: { place: ['le temple'] },
});

const vocabulary = buildNpcVocabulary([source()]);

const world: World = {
  ...createSandboxWorld((key) => key),
  attributes: [{ id: 'wit', name: 'Wit', baseValue: 5, formula: { preset: 'linear', step: 1 } }],
  levelCurve: { preset: 'flat' },
  maxLevel: 10,
  items: [],
  classes: [],
  skills: [],
};

const draw = (seed: string, vocab = vocabulary) => generateNpc(world, seededRandomSource(seed), vocab) as Omit<Npc, 'id'> & { kind?: string };
const seeds = (n: number, prefix = 's') => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);
const drawn = (n = 200) => seeds(n).map((seed) => draw(seed));
const ofKind = (id: string, n = 200) => drawn(n).filter((npc) => npc.kind === id);

describe('generateNpc on kinds', () => {
  it('draws a kind among the drawable kinds and keeps it on the NPC', () => {
    const npcs = drawn();
    for (const npc of npcs) expect(vocabulary.drawable()).toContain(npc.kind);
    for (const id of ['peasant', 'priest', 'smuggler', 'wolf']) expect(npcs.some((n) => n.kind === id), id).toBe(true);
  });

  it('never draws a creature kind that has no noun', () => {
    expect(drawn().some((npc) => npc.kind === 'ghost' || npc.kind === 'beast')).toBe(false);
  });

  it('takes the roles of the kind, inherited from its root', () => {
    for (const npc of [...ofKind('peasant'), ...ofKind('townsfolk')]) expect(npc.roles).toEqual(['story']);
    for (const npc of ofKind('wolf')) expect(npc.roles).toEqual(['enemy']);
  });

  it('draws one of the roles of a kind that has several, and both come up', () => {
    const smugglers = ofKind('smuggler');
    expect(smugglers.length).toBeGreaterThan(10);
    for (const npc of smugglers) {
      expect(npc.roles).toHaveLength(1);
      expect(['merchant', 'enemy']).toContain(npc.roles[0]);
    }
    expect(new Set(smugglers.map((n) => n.roles[0]))).toEqual(new Set(['merchant', 'enemy']));
  });

  it('rewards the XP of an enemy only', () => {
    for (const npc of drawn()) {
      expect(npc.xpReward).toBe(npc.roles[0] === 'enemy' ? npc.level * 10 : 0);
    }
  });

  it('names a person from a given name and an epithet agreeing with it', () => {
    const peasants = ofKind('peasant');
    expect(peasants.length).toBeGreaterThan(10);
    for (const npc of peasants) expect(['Aldo le Sage', 'Mila la Sage']).toContain(npc.name);
    expect(new Set(peasants.map((n) => n.name)).size).toBe(2);
  });

  it('gives a person the kind noun of the same gender as the given name', () => {
    const priests = ofKind('priest');
    expect(priests.length).toBeGreaterThan(10);
    for (const npc of priests) expect(['Aldo Prêtre', 'Mila Prêtresse']).toContain(npc.name);
    expect(new Set(priests.map((n) => n.name)).size).toBe(2);
  });

  it('names a creature from its noun and an adjective of its chain, agreeing with the noun', () => {
    const wolves = ofKind('wolf');
    expect(wolves.length).toBeGreaterThan(10);
    for (const npc of wolves) expect(['Louve grise', 'Louve sauvage']).toContain(npc.name);
    expect(new Set(wolves.map((n) => n.name)).size).toBe(2);
  });

  it('takes the description of the nearest level that has some', () => {
    for (const npc of ofKind('peasant')) expect(npc.description).toBe('Un habitant.');
    for (const npc of ofKind('wolf')) expect(npc.description).toBe('Elle rôde.');
  });

  it('expands the description with its params and the gender of the given name', () => {
    const priests = ofKind('priest');
    for (const npc of priests)
      expect(npc.description).toBe(npc.name.startsWith('Aldo') ? 'Il prie à le temple.' : 'Elle prie à le temple.');
    expect(new Set(priests.map((n) => n.description)).size).toBe(2);
  });

  it('keeps the rest of the NPC valid', () => {
    for (const npc of drawn(40)) {
      expect(validateNpc({ id: 'g', ...npc })).toEqual([]);
      expect(npc.level).toBeGreaterThanOrEqual(1);
      expect(npc.level).toBeLessThanOrEqual(10);
    }
  });

  it('gives the same NPC for the same seed and the same packs, and another for another seed', () => {
    expect(draw('same')).toEqual(draw('same'));
    expect(draw('same')).toEqual(draw('same', buildNpcVocabulary([source()])));
    expect(new Set(drawn(30).map((n) => n.name)).size).toBeGreaterThan(3);
    expect(new Set(drawn(30).map((n) => n.kind)).size).toBeGreaterThan(1);
  });
});

describe.each(['fr', 'en'] as const)('generateNpc on the real Base %s', (lang) => {
  const base = baseNpcVocabulary(lang);
  const npcs = seeds(400, `real-${lang}`).map(
    (seed) => generateNpc(world, seededRandomSource(seed), base) as Omit<Npc, 'id'> & { kind: string },
  );

  it('draws every kind of the spec that has a noun, and only drawable kinds', () => {
    const kinds = new Set(npcs.map((n) => n.kind));
    for (const id of ['peasant', 'priest', 'merchant', 'blacksmith', 'guard', 'bandit', 'cultist', 'wolf', 'bear', 'giant-spider', 'boar'])
      expect(kinds.has(id), id).toBe(true);
    for (const id of kinds) expect(base.drawable()).toContain(id);
  });

  it('takes the roles of the kind', () => {
    for (const npc of npcs) {
      const roles = base.kind(npc.kind)!.roles;
      expect(npc.roles).toHaveLength(1);
      expect(roles).toContain(npc.roles[0]);
    }
    for (const npc of npcs.filter((n) => n.kind === 'innkeeper')) expect(npc.roles).toEqual(['merchant']);
    for (const npc of npcs.filter((n) => n.kind === 'bandit')) expect(npc.roles).toEqual(['enemy']);
  });

  it('names a person with a given name of the list and a creature with a noun of its kind', () => {
    const given = base.given().map((g) => g.text.toLowerCase());
    for (const npc of npcs) {
      const name = npc.name.toLowerCase();
      expect(name.trim(), npc.name).not.toBe('');
      if (base.kind(npc.kind)!.person) {
        expect(given.some((g) => name.includes(g)), npc.name).toBe(true);
      } else {
        expect(given.some((g) => name.includes(g)), npc.name).toBe(false);
        expect(base.nouns(npc.kind).some((n) => name.includes(n.text.toLowerCase())), npc.name).toBe(true);
      }
    }
  });

  it('writes a description with nothing left to expand', () => {
    for (const npc of npcs) {
      expect(npc.description.trim(), npc.kind).not.toBe('');
      expect(npc.description).not.toMatch(/[{}[\]|]/);
      expect(npc.name).not.toMatch(/[{}[\]|]/);
    }
  });

  it('is deterministic', () => {
    const again = generateNpc(world, seededRandomSource(`real-${lang}-7`), base);
    expect(again).toEqual(generateNpc(world, seededRandomSource(`real-${lang}-7`), baseNpcVocabulary(lang)));
  });
});
