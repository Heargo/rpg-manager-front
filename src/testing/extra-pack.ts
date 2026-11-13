import { Provider } from '@angular/core';
import base from '../../public/packs/base/pack.json';
import { PackService } from '../app/core/services/pack.service';

const BASE_ENTRY = {
  id: 'base',
  name: { en: 'Base', fr: 'Base' },
  description: { en: 'Core', fr: 'Coeur' },
  author: 'Florian Sciberras',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  size: 100,
  sprites: 101,
  languages: ['en', 'fr'],
  builtIn: true,
};

const EXTRA_ENTRY = {
  id: 'extra',
  name: { en: 'Extra', fr: 'Extra' },
  description: { en: 'More things', fr: 'Plus de choses' },
  author: 'Jane Doe',
  license: 'CC0-1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  size: 1234,
  sprites: 1,
  languages: ['fr'],
};

/** The registry file with Base alone. */
export const BASE_ONLY_REGISTRY = { format: 1, packs: [BASE_ENTRY] };
/** The registry file with Base and the fixture official pack `extra`. */
export const EXTRA_REGISTRY = { format: 1, packs: [BASE_ENTRY, EXTRA_ENTRY] };

/** The fixture official pack: one grayscale sprite and one French items list. */
export const EXTRA_MANIFEST = {
  format: 1,
  id: 'extra',
  name: EXTRA_ENTRY.name,
  description: EXTRA_ENTRY.description,
  version: '1.0.0',
  author: 'Jane Doe',
  license: 'CC0-1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  generators: { fr: { items: 'generators/fr/items.json' } },
  sprites: [
    { id: 'gem', en: 'Gem', fr: 'Gemme', type: 'item', slot: 'none', kind: 'grayscale', image: 'sprites/gem.png' },
  ],
};

const rarities = ['common', 'uncommon', 'rare', 'mythic', 'legendary'];
const slots = [
  'head', 'earring', 'necklace', 'ring', 'chest', 'hand', 'legs', 'foot', 'weapon1', 'weapon2', 'item', 'consumable',
];
const byRarity = <T>(value: T) => Object.fromEntries(rarities.map((r) => [r, [value]]));

/** A valid French items word list whose every item is named "Zircon" (template `{base}` only). */
export const EXTRA_ITEMS = {
  version: 1,
  templates: byRarity('{base}'),
  bases: Object.fromEntries(slots.map((s) => [s, [{ text: 'Zircon', gender: 'm' }]])),
  adjectives: byRarity('Brillant'),
  suffixes: Object.fromEntries(rarities.map((r) => [r, []])),
  descriptions: { equipment: ['Un zircon.'], item: ['Un zircon.'], consumable: ['Un zircon.'] },
};

/** A valid French NPC name list whose every NPC is named "Zorg". */
export const EXTRA_NPCS = {
  version: 1,
  given: [{ text: 'Zorg', gender: 'm' }],
  epithets: ['le Fou'],
  templates: ['{given}'],
};

export interface ExtraPackFake {
  loadRegistry: ReturnType<typeof vi.fn>;
  loadManifest: ReturnType<typeof vi.fn>;
  loadJson: ReturnType<typeof vi.fn>;
  loadBlob: ReturnType<typeof vi.fn>;
}

/**
 * `PackService` faked on a registry listing Base and `extra`. Base files are `{ url }`; `extra` files are served
 * from the fixture: `loadManifest('extra')`, `loadJson('packs/extra/generators/fr/items.json')`,
 * `loadBlob('packs/extra/sprites/gem.png')`. Overrides replace any method (e.g. to fail a fetch).
 */
export function extraPackService(overrides: Partial<ExtraPackFake> = {}): ExtraPackFake {
  return {
    loadRegistry: vi.fn(async () => EXTRA_REGISTRY),
    loadManifest: vi.fn(async (id: string) => (id === 'extra' ? structuredClone(EXTRA_MANIFEST) : base)),
    loadJson: vi.fn(async (url: string) =>
      url === 'packs/extra/generators/fr/items.json'
        ? EXTRA_ITEMS
        : url === 'packs/extra/generators/fr/npcs.json'
          ? EXTRA_NPCS
          : { url },
    ),
    loadBlob: vi.fn(async () => new Blob(['png-bytes'], { type: 'image/png' })),
    ...overrides,
  };
}

export function provideExtraPack(service: ExtraPackFake = extraPackService()): Provider {
  return { provide: PackService, useValue: service };
}
