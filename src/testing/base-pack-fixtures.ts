import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import enItems from '../../public/packs/base-en/generators/items.json';
import frItems from '../../public/packs/base-fr/generators/items.json';
import enNpcs from '../../public/packs/base-en/generators/npcs.json';
import frNpcs from '../../public/packs/base-fr/generators/npcs.json';
import { baseManifest } from './base-pack';
import { EXTRA_ITEMS, EXTRA_MANIFEST, EXTRA_NPCS, extraPackService, provideExtraPack } from './extra-pack';

/**
 * `PackService` fake for the generator components: real Base word lists (items and NPC names, `base-en` and `base-fr`) and
 * the French `extra` pack, whose items are all "Zircon" and NPCs all "Zorg".
 */
export function baseAndExtraPackProviders() {
  globalThis.indexedDB = new IDBFactory();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  const files: Record<string, unknown> = {
    'packs/base-en/generators/items.json': enItems,
    'packs/base-fr/generators/items.json': frItems,
    'packs/base-en/generators/npcs.json': enNpcs,
    'packs/base-fr/generators/npcs.json': frNpcs,
    'packs/extra/generators/items.json': EXTRA_ITEMS,
    'packs/extra/generators/npcs.json': EXTRA_NPCS,
  };
  const fake = extraPackService();
  fake.loadJson = vi.fn(async (url: string) => (url in files ? files[url] : { url }));
  fake.loadManifest = vi.fn(async (id: string) =>
    id === 'extra'
      ? {
          ...structuredClone(EXTRA_MANIFEST),
          domains: { items: { texts: 'generators/items.json' }, npcs: { texts: 'generators/npcs.json' } },
        }
      : baseManifest(id),
  );
  return provideExtraPack(fake);
}
