import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import baseEnCommon from '../../../../public/packs/base-en/generators/common.json';
import baseEnItems from '../../../../public/packs/base-en/generators/items.json';
import { provideBasePack } from '../../../testing/base-pack';
import { provideTestTranslations } from '../../../testing/test-providers';
import { PackDraft } from '../packs/pack-draft';
import { PackDraftFormBusiness } from './pack-draft-form.business';

function setup() {
  globalThis.indexedDB = new IDBFactory();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideBasePack({
        'packs/base-en/generators/items.json': baseEnItems,
        'packs/base-en/generators/common.json': baseEnCommon,
      }),
      provideTestTranslations(),
    ],
  });
  return TestBed.inject(PackDraftFormBusiness);
}

const GRADIENT = [
  { position: 0, color: '#5a0a0a' },
  { position: 1, color: '#fde047' },
];

function draft(over: Record<string, unknown> = {}): PackDraft {
  return {
    id: 'draft-1',
    updatedAt: 1000,
    details: {
      id: 'mine',
      language: 'en',
      name: 'Mine',
      description: 'My pack',
      version: '1.0.0',
      author: 'Ann Author',
      license: 'CC-BY-4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    generators: {},
    kinds: {},
    tints: {},
    sprites: [],
    ...over,
  } as PackDraft;
}

describe('PackDraftFormBusiness.knownKeys', () => {
  it('lists the kinds of the installed packs with their first noun, and the draft kinds', async () => {
    const business = setup();

    const keys = await business.knownKeys(
      draft({
        kinds: { zorb: { type: 'item' } },
        generators: { items: { version: 2, kinds: { zorb: { nouns: [{ text: 'Zorb' }] } } } },
      }),
    );

    expect(keys.kinds).toContainEqual({ id: 'helm', noun: 'Helm' });
    expect(keys.kinds).toContainEqual({ id: 'equipment' });
    expect(keys.kinds).toContainEqual({ id: 'zorb', noun: 'Zorb' });
  });

  it('lists the tint ids and the param names of the installed packs and of the draft', async () => {
    const business = setup();

    const keys = await business.knownKeys(
      draft({
        tints: { neon: { gradient: GRADIENT } },
        common: { version: 2, params: { spell: ['fireball'] } },
      }),
    );

    expect(keys.tints).toEqual(expect.arrayContaining(['steel', 'fire', 'neon']));
    expect(keys.params).toEqual(expect.arrayContaining(['maker', 'owner', 'spell']));
  });

  it('lists each key once', async () => {
    const business = setup();

    const keys = await business.knownKeys(draft({ tints: { fire: { gradient: GRADIENT } } }));

    expect(keys.tints.filter((id) => id === 'fire')).toHaveLength(1);
  });
});

describe('PackDraftFormBusiness.coverage', () => {
  it('lists the draft kinds whose chain has no sprite in the draft or the installed packs', async () => {
    const business = setup();
    const image = new Blob(['png-bytes'], { type: 'image/png' });

    const missing = await business.coverage(
      draft({
        kinds: {
          zorb: { type: 'item' },
          blob: { type: 'item' },
          kitten: { parent: 'sword' },
          sprout: { parent: 'zorb' },
        },
        sprites: [{ id: 'blob', label: 'Blob', kinds: ['blob'], kind: 'grayscale', image }],
      }),
    );

    expect(missing).toEqual(['zorb', 'sprout']);
  });

  it('is empty for a draft with no kinds', async () => {
    expect(await setup().coverage(draft())).toEqual([]);
  });
});

describe('PackDraftFormBusiness.preview', () => {
  const staffDraft = () =>
    draft({
      kinds: { staff: { parent: 'weapon' } },
      generators: {
        items: { version: 2, kinds: { staff: { nouns: [{ text: 'Quarterstaff' }] } } },
      },
    });

  it('draws 3 items of the kind, named with its noun, from the draft plus the Base', async () => {
    const business = setup();

    const items = await business.preview(staffDraft(), 'staff');

    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item.kind).toBe('staff');
      expect(item.type).toBe('equipment');
      expect(item.slot).toBe('weapon1');
      expect(item.name.toLowerCase()).toContain('quarterstaff');
    }
  });

  it('draws the number of items asked for', async () => {
    const business = setup();

    expect(await business.preview(staffDraft(), 'staff', 5)).toHaveLength(5);
  });

  it('is deterministic for the same draft and kind', async () => {
    const business = setup();

    expect(await business.preview(staffDraft(), 'staff')).toEqual(await business.preview(staffDraft(), 'staff'));
  });

  it('draws a kind of the Base the draft only adds a tint to', async () => {
    const business = setup();

    const items = await business.preview(draft(), 'helm');

    expect(items.map((item) => item.kind)).toEqual(['helm', 'helm', 'helm']);
  });
});

describe('PackDraftFormBusiness.preview of a kind without nouns of its own', () => {
  const tree = (kinds: Record<string, unknown>, texts: Record<string, unknown>) =>
    draft({
      kinds: { tree: { type: 'equipment' }, ...kinds },
      generators: { items: { version: 2, kinds: texts } },
    });

  it('draws each item from a descendant that has nouns, with its kind id', async () => {
    const mine = tree(
      { oak: { parent: 'tree' }, elm: { parent: 'tree' } },
      { oak: { nouns: [{ text: 'Oakling' }] }, elm: { nouns: [{ text: 'Elmling' }] } },
    );

    const items = await setup().preview(mine, 'tree', 20);

    expect(items).toHaveLength(20);
    expect(new Set(items.map((item) => item.kind))).toEqual(new Set(['oak', 'elm']));
    for (const item of items) expect(item.name.toLowerCase()).toContain(item.kind === 'oak' ? 'oakling' : 'elmling');
  });

  it('reaches descendants of any depth', async () => {
    const mine = tree({ mid: { parent: 'tree' }, leaf: { parent: 'mid' } }, { leaf: { nouns: [{ text: 'Leafling' }] } });

    const items = await setup().preview(mine, 'tree');

    expect(items.map((item) => item.kind)).toEqual(['leaf', 'leaf', 'leaf']);
  });

  it('draws nothing when no descendant has nouns either', async () => {
    expect(await setup().preview(tree({ oak: { parent: 'tree' } }, {}), 'tree')).toEqual([]);
  });

  it('still draws from the kind itself when it has nouns', async () => {
    const mine = tree(
      { oak: { parent: 'tree' } },
      { tree: { nouns: [{ text: 'Treeling' }] }, oak: { nouns: [{ text: 'Oakling' }] } },
    );

    const items = await setup().preview(mine, 'tree');

    expect(items.map((item) => item.kind)).toEqual(['tree', 'tree', 'tree']);
  });
});

describe('PackDraftFormBusiness.issues', () => {
  it('maps a kind error to the kind id', async () => {
    const business = setup();

    const issues = await business.issues(draft({ kinds: { orb: {} } }));

    expect(issues).toContainEqual(expect.objectContaining({ level: 'error', kind: 'orb' }));
    expect(issues.filter((issue) => issue.level === 'error').every((issue) => issue.kind === 'orb')).toBe(true);
  });

  it('maps a tint error to the tint id', async () => {
    const business = setup();

    const issues = await business.issues(draft({ tints: { fire: { gradient: [GRADIENT[0]] } } }));

    expect(issues).toContainEqual(expect.objectContaining({ level: 'error', tint: 'fire' }));
  });

  it('maps a param used and defined nowhere to a warning on that param', async () => {
    const business = setup();

    const issues = await business.issues(
      draft({
        kinds: { orb: { type: 'item' } },
        generators: {
          items: { version: 2, kinds: { orb: { nouns: [{ text: 'Orb' }], descriptions: ['Seen by {nowhere}.'] } } },
        },
      }),
    );

    expect(issues).toContainEqual(expect.objectContaining({ level: 'warning', param: 'nowhere' }));
  });

  it('does not warn about a param the Base or the draft defines', async () => {
    const business = setup();

    const issues = await business.issues(
      draft({
        kinds: { orb: { type: 'item' } },
        generators: {
          items: {
            version: 2,
            kinds: { orb: { nouns: [{ text: 'Orb' }], descriptions: ['Made by {maker}, seen by {spell}.'] } },
          },
        },
        common: { version: 2, params: { spell: ['a mage'] } },
      }),
    );

    expect(issues.filter((issue) => issue.param)).toEqual([]);
  });

  it('maps a rarity template warning to that rarity', async () => {
    const business = setup();

    const issues = await business.issues(
      draft({ generators: { items: { version: 2, templates: { rare: ['{base} {suffix}'] } } } }),
    );

    expect(issues).toContainEqual(expect.objectContaining({ level: 'warning', rarity: 'rare' }));
  });

  it('is empty for a sound draft', async () => {
    const business = setup();

    const issues = await business.issues(
      draft({
        kinds: { orb: { type: 'item' } },
        tints: { neon: { gradient: GRADIENT } },
        generators: { items: { version: 2, kinds: { orb: { nouns: [{ text: 'Orb' }] } } } },
      }),
    );

    expect(issues).toEqual([]);
  });

  describe('placeholders and common.json warnings', () => {
    const commonOf = (...descriptions: string[]) =>
      draft({ common: { version: 2, params: { spell: descriptions } } });
    const itemWith = (description: string, over: Record<string, unknown> = {}) =>
      draft({
        kinds: { orb: { type: 'item' } },
        generators: {
          items: { version: 2, kinds: { orb: { nouns: [{ text: 'Orb' }], descriptions: [description] } } },
        },
        ...over,
      });
    const messages = async (d: PackDraft) => (await setup().issues(d)).map((i) => i.message);

    it('does not warn about a param that only an installed pack defines', async () => {
      const found = await messages(commonOf('seen at {place}'));

      expect(found.filter((m) => m.includes('{place}'))).toEqual([]);
    });

    it('still warns about a param defined nowhere', async () => {
      const found = await messages(commonOf('seen at {nowhere}'));

      expect(found.some((m) => m.includes('param {nowhere} is used but not defined'))).toBe(true);
    });

    it('does not warn about an id that is a kind of another domain in the draft', async () => {
      const found = await messages(
        itemWith('Made by {smith}.', { npcKinds: { smith: { roles: ['merchant'] } } }),
      );

      expect(found.filter((m) => m.includes('{smith}'))).toEqual([]);
    });

    it('does not warn about an id that is a kind of another domain in an installed pack', async () => {
      const found = await messages(itemWith('Made by {blacksmith}, kept by {guard:adjective}.'));

      expect(found.filter((m) => m.includes('{blacksmith}') || m.includes('{guard}'))).toEqual([]);
    });

    it('warns about an id that is neither a param nor a kind of any active pack', async () => {
      const found = await messages(
        itemWith('Made by {smith} and {ghost}.', { npcKinds: { smith: { roles: ['merchant'] } } }),
      );

      expect(found.some((m) => m.includes('{ghost}') && m.includes('not defined'))).toBe(true);
      expect(found.filter((m) => m.includes('{smith}'))).toEqual([]);
    });

    it('warns about an unknown id used in a param of common.json, and not about a kind of the draft', async () => {
      const found = await messages(
        draft({
          skillKinds: { smite: { type: 'active', effect: 'damage' } },
          common: { version: 2, params: { spell: ['{smite} and {ghost}'] } },
        }),
      );

      expect(found.some((m) => m.includes('{ghost}'))).toBe(true);
      expect(found.filter((m) => m.includes('{smite}'))).toEqual([]);
    });

    it('rejects a common.json that still has kinds, as an unknown field', async () => {
      const issues = await setup().issues(
        draft({ common: { version: 2, kinds: { ruby: { words: [{ text: 'Ruby' }] } } } }),
      );

      expect(issues.some((i) => i.level === 'error' && i.message.includes('kinds'))).toBe(true);
    });
  });
});
