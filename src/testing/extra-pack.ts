import { Provider } from '@angular/core';
import { baseManifest } from './base-pack';
import { PackService } from '../app/core/services/pack.service';

const BASE_FR_ENTRY = {
  id: 'base-fr',
  name: 'Base (français)',
  description: 'Coeur',
  author: 'Florian Sciberras',
  license: 'CC-BY-4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  size: 100,
  sprites: 101,
  language: 'fr',
  builtIn: true,
};

const BASE_EN_ENTRY = {
  ...BASE_FR_ENTRY,
  id: 'base-en',
  name: 'Base (English)',
  description: 'Core',
  language: 'en',
};

const EXTRA_ENTRY = {
  id: 'extra',
  name: 'Extra',
  description: 'Plus de choses',
  author: 'Jane Doe',
  license: 'CC0-1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  size: 1234,
  sprites: 1,
  language: 'fr',
};

/** The registry file with the two Bases alone. */
export const BASE_ONLY_REGISTRY = { format: 1, packs: [BASE_FR_ENTRY, BASE_EN_ENTRY] };
/** The registry file with the two Bases and the fixture official pack `extra` (French). */
export const EXTRA_REGISTRY = { format: 1, packs: [BASE_FR_ENTRY, BASE_EN_ENTRY, EXTRA_ENTRY] };

/** The fixture official pack: French, one grayscale sprite and one items list. */
export const EXTRA_MANIFEST = {
  format: 1,
  id: 'extra',
  language: 'fr',
  name: EXTRA_ENTRY.name,
  description: EXTRA_ENTRY.description,
  version: '1.0.0',
  author: 'Jane Doe',
  license: 'CC0-1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  generators: { items: 'generators/items.json' },
  sprites: [
    { id: 'gem', label: 'Gemme', type: 'item', slot: 'none', kind: 'grayscale', image: 'sprites/gem.png' },
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
 * `PackService` faked on a registry listing both Bases and `extra`. Base files are `{ url }`; `extra` files are served
 * from the fixture: `loadManifest('extra')`, `loadJson('packs/extra/generators/items.json')`,
 * `loadBlob('packs/extra/sprites/gem.png')`. Overrides replace any method (e.g. to fail a fetch).
 */
export function extraPackService(overrides: Partial<ExtraPackFake> = {}): ExtraPackFake {
  return {
    loadRegistry: vi.fn(async () => EXTRA_REGISTRY),
    loadManifest: vi.fn(async (id: string) => (id === 'extra' ? structuredClone(EXTRA_MANIFEST) : baseManifest(id))),
    loadJson: vi.fn(async (url: string) =>
      url === 'packs/extra/generators/items.json'
        ? EXTRA_ITEMS
        : url === 'packs/extra/generators/npcs.json'
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
