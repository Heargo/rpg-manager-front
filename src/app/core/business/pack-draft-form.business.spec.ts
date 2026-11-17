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
});
