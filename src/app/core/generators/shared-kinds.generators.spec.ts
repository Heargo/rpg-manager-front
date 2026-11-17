import { generateNpc } from '../../modules/npc/helpers/npc-editor.rules';
import { createSandboxWorld } from '../../modules/world/helpers/default-world';
import { World } from '../../modules/world/models/world';
import { PooledSource } from '../packs/pooled-domain';
import { buildClassVocabulary } from './class-vocabulary';
import { generateClass } from './class-generator';
import { generateItem } from './item-generator';
import { buildItemVocabulary } from './item-vocabulary';
import { buildNpcVocabulary } from './npc-vocabulary';
import { seededRandomSource } from './random-source';
import { generateSkill } from './skill-generator';
import { buildSkillVocabulary } from './skill-vocabulary';

// The pooled source gets the shared tree (`sharedKinds`) and the words of common.json v2 (`sharedTexts`).
const SHARED_KINDS = {
  material: {},
  metal: { parent: 'material' },
  iron: { parent: 'metal' },
  steel: { parent: 'metal' },
  wood: { parent: 'material' },
  oak: { parent: 'wood' },
  pine: { parent: 'wood' },
};
const SHARED_TEXTS = {
  version: 2,
  kinds: {
    iron: { words: [{ text: 'fer', gender: 'm' }], adjectives: [{ m: 'ferreux', f: 'ferreuse' }] },
    steel: { words: [{ text: 'acier', gender: 'm' }], adjectives: [{ m: 'acéré', f: 'acérée' }] },
    oak: { words: [{ text: 'chêne', gender: 'm' }], adjectives: [{ m: 'robuste', f: 'robuste' }] },
    pine: { words: [{ text: 'pin', gender: 'm' }], adjectives: [{ m: 'résineux', f: 'résineuse' }] },
  },
};
const WORD = { iron: 'fer', steel: 'acier', oak: 'chêne', pine: 'pin', bronze: 'bronze' } as Record<string, string>;
const ADJECTIVE_F = { iron: 'ferreuse', steel: 'acérée', bronze: 'bronzée' } as Record<string, string>;

const seeds = (n: number, prefix = 's') => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);
const base = (extra: Partial<PooledSource>): PooledSource => ({
  packId: 'base-fr',
  isBase: true,
  language: 'fr',
  sharedKinds: SHARED_KINDS,
  sharedTexts: SHARED_TEXTS,
  params: {},
  ...extra,
} as PooledSource);

type Drawn = { name: string; description: string; kind?: string; shared?: Record<string, string> };

describe('generateItem with shared kinds', () => {
  const ITEM_KINDS = {
    equipment: { type: 'equipment' },
    consumable: { type: 'consumable' },
    item: { type: 'item' },
    weapon: { parent: 'equipment', slot: 'weapon1', shared: ['metal'] },
    sword: { parent: 'weapon' },
    'chest-box': { parent: 'item', shared: ['wood'] },
    potion: { parent: 'consumable' },
  };
  const texts = (templates: string[]) => ({
    version: 2,
    templates: { common: templates },
    kinds: {
      weapon: { descriptions: ['Forgée en {material}.'] },
      sword: { nouns: [{ text: 'Épée', gender: 'f' }] },
      'chest-box': {
        nouns: [{ text: 'Coffre', gender: 'm' }],
        descriptions: ['Un coffre, {origin}.'],
      },
      potion: { nouns: [{ text: 'Potion', gender: 'f' }], descriptions: ['Un breuvage.'] },
    },
  });
  const vocabulary = (templates: string[], more: PooledSource[] = []) =>
    buildItemVocabulary([
      base({ kinds: ITEM_KINDS, texts: texts(templates), params: { origin: ['taillé dans le {material}'] } }),
      ...more,
    ]);
  const draw = (seed: string, vocab: ReturnType<typeof vocabulary>, kind: 'sword' | 'chest-box' | 'potion') => {
    const slot = kind === 'sword' ? 'weapon1' : undefined;
    const type = kind === 'sword' ? 'equipment' : kind === 'potion' ? 'consumable' : 'item';
    return generateItem(seededRandomSource(seed), vocab, { attributes: ['Strength'], rarity: 'common', type, slot }) as unknown as Drawn;
  };
  const only = (kind: Drawn['kind'], vocab: ReturnType<typeof vocabulary>, which: 'sword' | 'chest-box' | 'potion', n = 300) =>
    seeds(n, which).map((seed) => draw(seed, vocab, which)).filter((item) => item.kind === kind);

  const adjectiveNames = vocabulary(['{base} {material:adjective}']);

  it('draws one leaf of the fitting kinds, inherited down the chain, and keeps it on the item', () => {
    const swords = only('sword', adjectiveNames, 'sword');
    expect(swords.length).toBeGreaterThan(50);
    for (const sword of swords) expect(['iron', 'steel']).toContain(sword.shared?.['material']);
    expect(new Set(swords.map((s) => s.shared?.['material']))).toEqual(new Set(['iron', 'steel']));
    for (const box of only('chest-box', adjectiveNames, 'chest-box'))
      expect(['oak', 'pine']).toContain(box.shared?.['material']);
  });

  it('is deterministic for a seed', () => {
    const first = draw('same', adjectiveNames, 'sword');
    expect(first.shared?.['material']).toBeDefined();
    expect(draw('same', adjectiveNames, 'sword')).toEqual(first);
  });

  it('agrees the name, the description and a param on the one drawn material', () => {
    for (const sword of only('sword', adjectiveNames, 'sword')) {
      const material = sword.shared!['material'];
      expect(sword.name).toBe(`Épée ${ADJECTIVE_F[material]}`);
      expect(sword.description).toBe(`Forgée en ${WORD[material]}.`);
    }
    const boxes = only('chest-box', adjectiveNames, 'chest-box');
    expect(boxes.length).toBeGreaterThan(50);
    for (const box of boxes)
      expect(box.description).toBe(`Un coffre, taillé dans le ${WORD[box.shared!['material']]}.`);
  });

  it('inserts the word itself for {material} in a name', () => {
    const vocab = vocabulary(['{base} en {material}']);
    for (const sword of only('sword', vocab, 'sword')) expect(sword.name).toBe(`Épée en ${WORD[sword.shared!['material']]}`);
  });

  it('gives a kind with no shared fits no shared kind, and drops the placeholder with its space', () => {
    const potions = only('potion', adjectiveNames, 'potion');
    expect(potions.length).toBeGreaterThan(50);
    expect(only('sword', adjectiveNames, 'sword')[0].shared).toBeDefined();
    for (const potion of potions) {
      expect(potion.shared ?? {}).toEqual({});
      expect(potion.name).toBe('Potion');
    }
  });

  it('skips a phrase that uses an undrawn root when another phrase exists', () => {
    const vocab = vocabulary(['{base} {material:adjective}', '{base} simple']);
    const potions = only('potion', vocab, 'potion');
    for (const potion of potions) expect(potion.name).toBe('Potion simple');
    const names = new Set(only('sword', vocab, 'sword').map((s) => s.name));
    expect(names).toContain('Épée simple');
    expect(names).toContain('Épée ferreuse');
  });

  it('pools the shared kinds of every active pack', () => {
    const extra: PooledSource = {
      packId: 'extra',
      isBase: false,
      language: 'fr',
      sharedKinds: { bronze: { parent: 'metal' } },
      sharedTexts: {
        version: 2,
        kinds: { bronze: { words: [{ text: 'bronze', gender: 'm' }], adjectives: [{ m: 'bronzé', f: 'bronzée' }] } },
      },
    } as PooledSource;
    const vocab = vocabulary(['{base} {material:adjective}'], [extra]);
    const swords = only('sword', vocab, 'sword', 400);
    expect(new Set(swords.map((s) => s.shared!['material']))).toEqual(new Set(['iron', 'steel', 'bronze']));
    for (const sword of swords) expect(sword.name).toBe(`Épée ${ADJECTIVE_F[sword.shared!['material']]}`);
  });
});

describe('the other generators with shared kinds', () => {
  const fixed = { 'iron': 'fer', 'steel': 'acier' } as Record<string, string>;

  it('generateSkill agrees name and description on one drawn shared kind', () => {
    const vocabulary = buildSkillVocabulary([
      base({
        kinds: { attack: { type: 'active', effect: 'damage', shared: ['metal'] }, strike: { parent: 'attack' } },
        texts: {
          version: 2,
          kinds: {
            attack: { descriptions: ['Frappe avec du {material}.'] },
            strike: { nouns: [{ text: 'Frappe', gender: 'f' }], names: ['{noun} de {material}'] },
          },
        },
      }),
    ]);
    const skills = seeds(60).map(
      (seed) => generateSkill(seededRandomSource(seed), ['Strength'], vocabulary) as unknown as Drawn,
    );
    for (const skill of skills) {
      const material = skill.shared!['material'];
      expect(['iron', 'steel']).toContain(material);
      expect(skill.name).toBe(`Frappe de ${fixed[material]}`);
      expect(skill.description).toBe(`Frappe avec du ${fixed[material]}.`);
    }
    expect(new Set(skills.map((s) => s.shared!['material']))).toEqual(new Set(['iron', 'steel']));
  });

  it('generateClass agrees name and description on one drawn shared kind', () => {
    const vocabulary = buildClassVocabulary([
      base({
        kinds: { smith: { shared: ['metal'] } },
        texts: {
          version: 2,
          kinds: {
            smith: {
              nouns: [{ text: 'Forgeron', gender: 'm' }],
              names: ['{noun} de {material}'],
              descriptions: ['Travaille le {material}.'],
            },
          },
        },
      }),
    ]);
    const skillVocabulary = buildSkillVocabulary([base({ kinds: {}, texts: { version: 2 } })]);
    const classes = seeds(60).map(
      (seed) => generateClass(seededRandomSource(seed), ['Strength'], [], vocabulary, skillVocabulary) as unknown as Drawn,
    );
    for (const draft of classes) {
      const material = draft.shared!['material'];
      expect(draft.name).toBe(`Forgeron de ${fixed[material]}`);
      expect(draft.description).toBe(`Travaille le ${fixed[material]}.`);
    }
    expect(new Set(classes.map((c) => c.shared!['material']))).toEqual(new Set(['iron', 'steel']));
  });

  it('generateNpc agrees name and description on one drawn shared kind', () => {
    const vocabulary = buildNpcVocabulary([
      base({
        kinds: { smith: { roles: ['merchant'], shared: ['metal'] } },
        texts: {
          version: 2,
          given: [{ text: 'Aldo', gender: 'm' }],
          templates: ['{given}'],
          kinds: {
            smith: {
              nouns: [{ text: 'Forgeron', gender: 'm' }],
              names: ['{noun} de {material}'],
              descriptions: ['Il travaille le {material}.'],
            },
          },
        },
      }),
    ]);
    const world: World = {
      ...createSandboxWorld((key) => key),
      attributes: [{ id: 'wit', name: 'Wit', baseValue: 5, formula: { preset: 'linear', step: 1 } }],
      levelCurve: { preset: 'flat' },
      maxLevel: 10,
      items: [],
      classes: [],
      skills: [],
    };
    const npcs = seeds(60).map((seed) => generateNpc(world, seededRandomSource(seed), vocabulary) as unknown as Drawn);
    for (const npc of npcs) {
      const material = npc.shared!['material'];
      expect(['iron', 'steel']).toContain(material);
      expect(npc.description).toBe(`Il travaille le ${fixed[material]}.`);
    }
    expect(new Set(npcs.map((n) => n.shared!['material']))).toEqual(new Set(['iron', 'steel']));
  });
});
