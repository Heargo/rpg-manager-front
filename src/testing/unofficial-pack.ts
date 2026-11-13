import { Provider } from '@angular/core';
import glowMaterials from '../../public/packs/base-fr/sprites/axe.json';
import { ImageProcessingService } from '../app/core/services/image-processing.service';
import { PackService } from '../app/core/services/pack.service';
import { EXTRA_ITEMS, EXTRA_NPCS, ExtraPackFake, extraPackService } from './extra-pack';

export const NEON_LINK = 'https://example.com/packs/neon/pack.json';
export const NEON_ROOT = 'https://example.com/packs/neon/';

/** An unofficial pack: a grayscale, a masked (128 x 128, materials from the Base axe) and a colored sprite, French, with items and NPCs. */
export function neonManifest(): Record<string, any> {
  return {
    format: 1,
    id: 'neon',
    language: 'fr',
    name: 'Neon',
    description: 'Des choses brillantes',
    version: '1.0.0',
    author: 'Ann Author',
    license: 'CC-BY-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    homepage: 'https://example.com/neon',
    generators: { items: 'generators/items.json', npcs: 'generators/npcs.json' },
    sprites: [
      { id: 'spark', label: 'Etincelle', type: 'item', slot: 'none', kind: 'grayscale', image: 'sprites/spark.png' },
      { id: 'glow', label: 'Lueur', type: 'equipment', slot: 'weapon1', kind: 'masked', image: 'sprites/glow.png', materials: 'sprites/glow.json' },
      { id: 'tint', label: 'Teinte', type: 'consumable', slot: 'none', kind: 'colored', image: 'sprites/tint.png' },
    ],
  };
}

export interface NeonWorld {
  manifest: Record<string, any>;
  /** Files by absolute URL (JSON values); the manifest is served at `link`. */
  json: Map<string, unknown>;
  /** Blob size overrides by absolute URL. */
  blobSizes: Map<string, number>;
  /** Decoded sizes by absolute URL; a missing entry decodes to 128 x 128, `'fail'` is undecodable. */
  dimensions: Map<string, { width: number; height: number } | 'fail'>;
}

export function neonWorld(): NeonWorld {
  const json = new Map<string, unknown>([
    [`${NEON_ROOT}generators/items.json`, EXTRA_ITEMS],
    [`${NEON_ROOT}generators/npcs.json`, EXTRA_NPCS],
    [`${NEON_ROOT}sprites/glow.json`, glowMaterials],
  ]);
  return { manifest: neonManifest(), json, blobSizes: new Map(), dimensions: new Map() };
}

/**
 * `PackService` and `ImageProcessingService` faked for unofficial packs: the official registry (Base and `extra`),
 * and the `neon` pack served at `link` (default NEON_LINK) from `world`. `inFlight.max` is the most fetches running at once.
 * The image fake needs `dimensions(blob)` on `ImageProcessingService`, resolving `{ width, height }` of a decoded image.
 */
export function neonProviders(world: NeonWorld = neonWorld(), link: string = NEON_LINK) {
  const inFlight = { now: 0, max: 0 };
  const track = async <T>(work: () => T): Promise<T> => {
    inFlight.max = Math.max(inFlight.max, ++inFlight.now);
    try {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return work();
    } finally {
      inFlight.now--;
    }
  };
  const base: ExtraPackFake = extraPackService();
  const sizes = new Map<Blob, string>();
  const service = {
    ...base,
    loadJson: vi.fn((url: string) =>
      url.startsWith('packs/') ? (base.loadJson as (u: string) => Promise<unknown>)(url) : track(() => {
        if (url === link) return structuredClone(world.manifest);
        if (!world.json.has(url)) throw new Error(`404 ${url}`);
        return structuredClone(world.json.get(url));
      }),
    ),
    loadBlob: vi.fn((url: string) =>
      url.startsWith('packs/') ? (base.loadBlob as (u: string) => Promise<Blob>)(url) : track(() => {
        const blob = new Blob(['png-bytes'], { type: 'image/png' });
        const size = world.blobSizes.get(url);
        if (size !== undefined) Object.defineProperty(blob, 'size', { value: size });
        sizes.set(blob, url);
        return blob;
      }),
    ),
  };
  const images = {
    dimensions: vi.fn(async (blob: Blob) => {
      const found = world.dimensions.get(sizes.get(blob) ?? '');
      if (found === 'fail') throw new Error('cannot decode');
      return found ?? { width: 128, height: 128 };
    }),
  };
  const providers: Provider[] = [
    { provide: PackService, useValue: service },
    { provide: ImageProcessingService, useValue: images },
  ];
  return { providers, service, images, inFlight };
}
