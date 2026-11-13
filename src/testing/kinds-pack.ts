import { Provider } from '@angular/core';
import baseFr from '../../public/packs/base-fr/pack.json';
import { BASE_ONLY_REGISTRY } from './extra-pack';
import { PackService } from '../app/core/services/pack.service';

/** A pack with one sprite of each kind (the grayscale one even ships a materials file, which must be ignored). */
export const KINDS_MANIFEST = {
  ...baseFr,
  sprites: [
    {
      id: 'alpha',
      label: 'Alpha',
      type: 'item',
      slot: 'none',
      kind: 'grayscale',
      image: 'sprites/alpha.png',
      materials: 'sprites/alpha.json',
    },
    {
      id: 'bravo',
      label: 'Bravo',
      type: 'item',
      slot: 'none',
      kind: 'masked',
      image: 'sprites/bravo.png',
      materials: 'sprites/bravo.json',
    },
    {
      id: 'charlie',
      label: 'Charlie',
      type: 'item',
      slot: 'none',
      kind: 'colored',
      image: 'sprites/charlie.png',
    },
  ],
};

/** `PackService` faked on a manifest with a grayscale, a masked and a colored sprite. */
export function provideKindsPack(): Provider {
  return {
    provide: PackService,
    useValue: {
      // Both Bases serve the kinds, so a sprite is found whatever the app language.
      loadManifest: async (id: string) => ({ ...KINDS_MANIFEST, id, language: id === 'base-en' ? 'en' : 'fr' }),
      loadRegistry: async () => BASE_ONLY_REGISTRY,
      loadBlob: async () => new Blob(['x']),
      loadJson: async (url: string) => ({ url }),
    },
  };
}
