import { EXTRA_MANIFEST, extraPackService, provideExtraPack } from './extra-pack';

/** The attribute the fixture pack's content uses (the world's "Force" matches it by name). */
export const CONTENT_ATTRIBUTES = [{ id: 'str', name: 'Force' }];

export const CONTENT_ITEMS = [
  {
    id: 'sword',
    name: 'Epee',
    description: 'Une epee.',
    rarity: 'common',
    type: 'equipment',
    slot: 'weapon1',
    price: 10,
    modifiers: [{ attribute: 'str', value: 2 }],
  },
];
export const CONTENT_SKILLS = [
  {
    id: 'strike',
    name: 'Frappe',
    description: 'Un coup.',
    rarity: 'common',
    type: 'passive',
    maxLevel: 3,
    pointCost: 1,
    effects: [],
  },
];
export const CONTENT_CLASSES = [
  {
    id: 'warrior',
    name: 'Guerrier',
    description: 'Un guerrier.',
    maxLevel: 10,
    pointCost: 1,
    bonuses: [{ attribute: 'str', value: 1 }],
    tree: [{ skillId: 'strike', requires: [], minLevel: 1, column: 0, row: 0 }],
  },
];

/** `PackService` faked on the official pack `extra`, which ships fixed items, skills and classes using attribute `str`. */
export function contentPackProvider() {
  const base = extraPackService();
  const files: Record<string, unknown> = {
    'packs/extra/content/items.json': CONTENT_ITEMS,
    'packs/extra/content/skills.json': CONTENT_SKILLS,
    'packs/extra/content/classes.json': CONTENT_CLASSES,
  };
  return provideExtraPack(
    extraPackService({
      loadManifest: vi.fn(async (id: string) =>
        id === 'extra'
          ? {
              ...structuredClone(EXTRA_MANIFEST),
              attributes: CONTENT_ATTRIBUTES,
              domains: {
                ...EXTRA_MANIFEST.domains,
                items: { ...EXTRA_MANIFEST.domains.items, content: 'content/items.json' },
                skills: { content: 'content/skills.json' },
                classes: { content: 'content/classes.json' },
              },
            }
          : (base.loadManifest as (id: string) => Promise<unknown>)(id),
      ),
      loadJson: vi.fn(async (url: string) =>
        url in files ? structuredClone(files[url]) : (base.loadJson as (u: string) => Promise<unknown>)(url),
      ),
    }),
  );
}
