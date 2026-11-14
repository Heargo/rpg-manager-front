import { Provider } from '@angular/core';
import baseEn from '../../public/packs/base-en/pack.json';
import baseFr from '../../public/packs/base-fr/pack.json';
import { BASE_ONLY_REGISTRY } from './extra-pack';
import { PackService } from '../app/core/services/pack.service';

/** The real Base manifest of a pack id (`base-en` or `base-fr`). */
export const baseManifest = (id: string) => (id === 'base-en' ? baseEn : baseFr);

/** `PackService` faked on the real Base manifests: the manifests are the files on disk, other JSON files are `{ url }`. */
export function provideBasePack(files: Record<string, unknown> = {}): Provider {
  return {
    provide: PackService,
    useValue: {
      loadManifest: async (id: string) => baseManifest(id),
      loadRegistry: async () => BASE_ONLY_REGISTRY,
      loadBlob: async () => new Blob(['x']),
      loadJson: async (url: string) => (url in files ? files[url] : { url }),
    },
  };
}
