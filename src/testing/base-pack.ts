import { Provider } from '@angular/core';
import base from '../../public/packs/base/pack.json';
import { BASE_ONLY_REGISTRY } from './extra-pack';
import { PackService } from '../app/core/services/pack.service';

/** `PackService` faked on the real Base manifest: the manifest is the file on disk, other JSON files are `{ url }`. */
export function provideBasePack(files: Record<string, unknown> = {}): Provider {
  return {
    provide: PackService,
    useValue: {
      loadManifest: async () => base,
      loadRegistry: async () => BASE_ONLY_REGISTRY,
      loadBlob: async () => new Blob(['x']),
      loadJson: async (url: string) => (url in files ? files[url] : { url }),
    },
  };
}
