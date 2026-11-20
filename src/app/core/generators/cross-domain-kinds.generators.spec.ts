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

/**
 * `{<kind id>}` and `{<kind id>:adjective}` in a phrase of any domain. A pooled source gives its own domain through
 * `kinds` / `texts` and the other domains' kinds and texts through `otherDomains` (assumed shape, the missing field is
 * part of the red): `{ items?, npcs?, skills?, classes? }`, each `{ kinds, texts }`.
 */
const NPC_KINDS = {
  craftsman: { roles: ['story'] },
  smith: { parent: 'craftsman' },
  cooper: { parent: 'craftsman' },
};
const NPC_TEXTS = {
  version: 2,
  kinds: {
    smith: { nouns: [{ text: 'forgeron', gender: 'm' }], adjectives: [{ m: 'noir', f: 'noire' }] },
    cooper: { nouns: [{ text: 'tonnelier', gender: 'm' }], adjectives: [{ m: 'trapu', f: 'trapue' }] },
  },
};
const SMITH = 'forgeron';

const seeds = (n: number, prefix = 's') => Array.from({ length: n }, (_, i) => `${prefix}-${i}`);
const source = (extra: Record<string, unknown>): PooledSource =>
  ({ packId: 'base-fr', isBase: true, language: 'fr', params: {}, ...extra }) as unknown as PooledSource;

type Drawn = { name: string; description: string; kind?: string };
const noShared = (draft: object) => expect('shared' in draft).toBe(false);

describe('generateItem with a kind of another domain', () => {
  const ITEM_KINDS = {
    equipment: { type: 'equipment' },
    item: { type: 'item' },
    weapon: { parent: 'equipment', slot: 'weapon1' },
    sword: { parent: 'weapon' },
    'chest-box': { parent: 'item' },
  };
  const itemTexts = (over: Record<string, unknown>) => ({
    version: 2,
    templates: { common: ['{base}'] },
    ...over,
    kinds: {
      sword: { nouns: [{ text: 'Épée', gender: 'f' }] },
      'chest-box': { nouns: [{ text: 'Coffre', gender: 'm' }] },
      ...((over['kinds'] as object) ?? {}),
    },
  });
  const vocabulary = (over: Record<string, unknown>, more: PooledSource[] = [], own: Record<string, unknown> = {}) =>
    buildItemVocabulary([
      source({
        kinds: ITEM_KINDS,
        texts: itemTexts(over),
        otherDomains: { npcs: { kinds: NPC_KINDS, texts: NPC_TEXTS } },
        ...own,
      }),
      ...more,
    ]);
  const draw = (seed: string, vocab: ReturnType<typeof vocabulary>, kind: 'sword' | 'chest-box') =>
    generateItem(seededRandomSource(seed), vocab, {
      attributes: ['Strength'],
      rarity: 'common',
      type: kind === 'sword' ? 'equipment' : 'item',
      slot: kind === 'sword' ? 'weapon1' : undefined,
    }) as unknown as Drawn;
  const only = (vocab: ReturnType<typeof vocabulary>, kind: 'sword' | 'chest-box' = 'sword', n = 300) =>
    seeds(n, kind)
      .map((seed) => draw(seed, vocab, kind))
      .filter((item) => item.kind === kind);

  it('inserts a noun of an NPC kind in a description', () => {
    const swords = only(vocabulary({ kinds: { weapon: { descriptions: ['Forgée par {smith}.'] } } }));
    expect(swords.length).toBeGreaterThan(50);
    for (const sword of swords) expect(sword.description).toBe(`Forgée par ${SMITH}.`);
  });

  it('draws from the descendants of the kind that have nouns', () => {
    const swords = only(vocabulary({ kinds: { weapon: { descriptions: ['Forgée par {craftsman}.'] } } }));
    expect(new Set(swords.map((s) => s.description))).toEqual(
      new Set(['Forgée par forgeron.', 'Forgée par tonnelier.']),
    );
  });

  it('agrees the name and the description on the one noun drawn per placeholder', () => {
    const vocab = vocabulary({
      templates: { common: ['{base} de {craftsman}'] },
      kinds: { weapon: { descriptions: ['Œuvre du {craftsman}.'] } },
    });
    const swords = only(vocab);
    for (const sword of swords) {
      const noun = sword.name.replace('Épée de ', '');
      expect(['forgeron', 'tonnelier']).toContain(noun);
      expect(sword.description).toBe(`Œuvre du ${noun}.`);
      noShared(sword);
    }
    expect(new Set(swords.map((s) => s.name)).size).toBe(2);
  });

  it('is deterministic for a seed', () => {
    const vocab = vocabulary({ templates: { common: ['{base} de {craftsman}'] } });
    const first = draw('same', vocab, 'sword');
    expect(first.name).toMatch(/^Épée de (forgeron|tonnelier)$/);
    expect(draw('same', vocab, 'sword')).toEqual(first);
  });

  it('inserts an adjective of the kind, agreed with the noun of the entry', () => {
    const vocab = vocabulary({ templates: { common: ['{base} {smith:adjective}'] } });
    for (const sword of only(vocab)) expect(sword.name).toBe('Épée noire');
    for (const box of only(vocab, 'chest-box')) expect(box.name).toBe('Coffre noir');
  });

  it('pools the nouns of the kind from every active pack', () => {
    const extra = source({
      packId: 'extra',
      isBase: false,
      otherDomains: {
        npcs: {
          kinds: { mason: { parent: 'craftsman' } },
          texts: { version: 2, kinds: { mason: { nouns: [{ text: 'maçon', gender: 'm' }] } } },
        },
      },
    });
    const vocab = vocabulary({ kinds: { weapon: { descriptions: ['Taillée par {craftsman}.'] } } }, [extra]);
    expect(new Set(only(vocab, 'sword', 400).map((s) => s.description))).toEqual(
      new Set(['Taillée par forgeron.', 'Taillée par tonnelier.', 'Taillée par maçon.']),
    );
  });

  it('prefers the entry own domain when the id exists there too', () => {
    const vocab = vocabulary({
      kinds: {
        weapon: { descriptions: ['Marquée {smith}.'] },
        smith: { nouns: [{ text: 'enclume', gender: 'f' }] },
      },
    }, [], {
      kinds: { ...ITEM_KINDS, smith: { parent: 'item' } },
    });
    for (const sword of only(vocab)) expect(sword.description).toBe('Marquée enclume.');
  });

  it('lets a param win over a kind with the same id', () => {
    const vocab = vocabulary({ kinds: { weapon: { descriptions: ['{smith} et {cooper}.'] } } }, [], {
      params: { smith: ['le maître'] },
    });
    for (const sword of only(vocab)) expect(sword.description).toBe('le maître et tonnelier.');
  });

  it('looks in the NPCs, then the skills, then the classes for an id of another domain', () => {
    const vocab = vocabulary(
      { kinds: { weapon: { descriptions: ['Dédiée à {guard}.'] } } },
      [],
      {
        otherDomains: {
          npcs: { kinds: { guard: {} }, texts: { version: 2, kinds: { guard: { nouns: [{ text: 'garde', gender: 'm' }] } } } },
          skills: {
            kinds: { guard: { type: 'active', effect: 'damage' } },
            texts: { version: 2, kinds: { guard: { nouns: [{ text: 'parade', gender: 'f' }] } } },
          },
          classes: {
            kinds: { guard: {} },
            texts: { version: 2, kinds: { guard: { nouns: [{ text: 'gardien', gender: 'm' }] } } },
          },
        },
      },
    );
    for (const sword of only(vocab)) expect(sword.description).toBe('Dédiée à garde.');
  });
});

describe('the other generators with a kind of another domain', () => {
  const ITEMS = {
    kinds: { item: { type: 'item' }, hammer: { parent: 'item' }, anvil: { parent: 'item' } },
    texts: {
      version: 2,
      kinds: {
        hammer: { nouns: [{ text: 'marteau', gender: 'm' }] },
        anvil: { nouns: [{ text: 'enclume', gender: 'f' }] },
      },
    },
  };
  const HAMMERS = new Set(['marteau', 'enclume']);

  it('generateSkill agrees name and description on one noun of an item kind', () => {
    const vocabulary = buildSkillVocabulary([
      source({
        kinds: { attack: { type: 'active', effect: 'damage' }, strike: { parent: 'attack' } },
        texts: {
          version: 2,
          kinds: {
            attack: { descriptions: ['Frappe avec {item}.'] },
            strike: { nouns: [{ text: 'Frappe', gender: 'f' }], names: ['{noun} de {item}'] },
          },
        },
        otherDomains: { items: ITEMS },
      }),
    ]);
    const skills = seeds(60).map(
      (seed) => generateSkill(seededRandomSource(seed), ['Strength'], vocabulary) as unknown as Drawn,
    );
    for (const skill of skills) {
      const noun = skill.name.replace('Frappe de ', '');
      expect(HAMMERS.has(noun)).toBe(true);
      expect(skill.description).toBe(`Frappe avec ${noun}.`);
      noShared(skill);
    }
    expect(new Set(skills.map((s) => s.name)).size).toBe(2);
  });

  it('generateClass agrees name and description on one noun of an item kind', () => {
    const vocabulary = buildClassVocabulary([
      source({
        kinds: { smith: {} },
        texts: {
          version: 2,
          kinds: {
            smith: {
              nouns: [{ text: 'Forgeron', gender: 'm' }],
              names: ['{noun} au {item}'],
              descriptions: ['Ne se sépare pas de son {item}.'],
            },
          },
        },
        otherDomains: { items: ITEMS },
      }),
    ]);
    const skillVocabulary = buildSkillVocabulary([source({ kinds: {}, texts: { version: 2 } })]);
    const classes = seeds(60).map(
      (seed) => generateClass(seededRandomSource(seed), ['Strength'], [], vocabulary, skillVocabulary) as unknown as Drawn,
    );
    for (const draft of classes) {
      const noun = draft.name.replace('Forgeron au ', '');
      expect(HAMMERS.has(noun)).toBe(true);
      expect(draft.description).toBe(`Ne se sépare pas de son ${noun}.`);
      noShared(draft);
    }
    expect(new Set(classes.map((c) => c.name)).size).toBe(2);
  });

  it('generateNpc inserts a noun of an item kind in the description, and keeps no shared record', () => {
    const vocabulary = buildNpcVocabulary([
      source({
        kinds: { smith: { roles: ['merchant'] } },
        texts: {
          version: 2,
          given: [{ text: 'Aldo', gender: 'm' }],
          templates: ['{given}'],
          kinds: {
            smith: {
              nouns: [{ text: 'Forgeron', gender: 'm' }],
              descriptions: ['Il ne lâche jamais son {item}.'],
            },
          },
        },
        otherDomains: { items: ITEMS },
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
      expect(['Il ne lâche jamais son marteau.', 'Il ne lâche jamais son enclume.']).toContain(npc.description);
      noShared(npc);
    }
    expect(new Set(npcs.map((n) => n.description)).size).toBe(2);
  });
});
