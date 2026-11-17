import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Provider } from '@angular/core';
import { PackService } from '../app/core/services/pack.service';
import { BASE_ONLY_REGISTRY } from './extra-pack';
import { baseManifest } from './base-pack';

/** `PackService` faked on the real Base files: the manifests and every JSON file are read from `public/` on disk. */
export function provideBasePackOnDisk(): Provider {
  return {
    provide: PackService,
    useValue: {
      loadManifest: async (id: string) => baseManifest(id),
      loadRegistry: async () => BASE_ONLY_REGISTRY,
      loadBlob: async () => new Blob(['x']),
      loadJson: async (url: string) => JSON.parse(readFileSync(join(process.cwd(), 'public', url), 'utf8')),
    },
  };
}

/** The real Base content file of a domain, read from disk through the path its manifest declares. */
export function baseContent(packId: string, domain: 'skills' | 'classes'): any[] {
  const path = (baseManifest(packId) as any).domains?.[domain]?.content;
  if (!path) throw new Error(`${packId} declares no ${domain} content`);
  return JSON.parse(readFileSync(join(process.cwd(), 'public', 'packs', packId, path), 'utf8'));
}
