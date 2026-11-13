import { Provider } from '@angular/core';
import base from '../../public/packs/base/pack.json';
import { PackService } from '../app/core/services/pack.service';

/** A pack with one sprite of each kind (the grayscale one even ships a materials file, which must be ignored). */
export const KINDS_MANIFEST = {
  ...base,
  sprites: [
    {
      id: 'alpha',
      en: 'Alpha',
      fr: 'Alpha',
      type: 'item',
      slot: 'none',
      kind: 'grayscale',
      image: 'sprites/alpha.png',
      materials: 'sprites/alpha.json',
    },
    {
      id: 'bravo',
      en: 'Bravo',
      fr: 'Bravo',
      type: 'item',
      slot: 'none',
      kind: 'masked',
      image: 'sprites/bravo.png',
      materials: 'sprites/bravo.json',
    },
    {
      id: 'charlie',
      en: 'Charlie',
      fr: 'Charlie',
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
      loadManifest: async () => KINDS_MANIFEST,
      loadJson: async (url: string) => ({ url }),
    },
  };
}
