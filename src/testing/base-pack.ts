import { Provider } from '@angular/core';
import base from '../../public/packs/base/pack.json';
import { PackService } from '../app/core/services/pack.service';

/** `PackService` faked on the real Base manifest: the manifest is the file on disk, other JSON files are `{ url }`. */
export function provideBasePack(files: Record<string, unknown> = {}): Provider {
  return {
    provide: PackService,
    useValue: {
      loadManifest: async () => base,
      loadJson: async (url: string) => (url in files ? files[url] : { url }),
    },
  };
}
