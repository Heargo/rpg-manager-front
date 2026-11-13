import { inject, Injectable } from '@angular/core';
import {
  Pack,
  packFileUrl,
  PackGenerator,
  PackSprite,
  validatePack,
} from '../packs/pack';
import { PackService } from '../services/pack.service';

const BASE_PACK_ID = 'base';

/** A pack sprite with the pack it comes from and the URLs of its files. */
export interface BundledSprite extends PackSprite {
  packId: string;
  imageUrl: string;
  materialsUrl?: string;
}

/** The Base pack: its validated manifest (loaded once), its sprites and its word lists. */
@Injectable({ providedIn: 'root' })
export class PackBusiness {
  private readonly service = inject(PackService);
  private manifestPromise: Promise<Pack> | null = null;

  /** The Base manifest, loaded and validated once; throws with the errors when it is invalid. */
  manifest(): Promise<Pack> {
    if (!this.manifestPromise) {
      const promise = this.loadManifest();
      this.manifestPromise = promise;
      // A failed load shouldn't stay cached: retry next time.
      promise.catch(() => (this.manifestPromise = null));
    }
    return this.manifestPromise;
  }

  private async loadManifest(): Promise<Pack> {
    const result = validatePack(await this.service.loadManifest(BASE_PACK_ID));
    if (!result.ok)
      throw new Error(
        `Invalid pack "${BASE_PACK_ID}": ${result.errors.join('; ')}`,
      );
    return result.value;
  }

  /** The sprites of the pack, with their file URLs. */
  async sprites(): Promise<BundledSprite[]> {
    const pack = await this.manifest();
    const manifestUrl = `packs/${pack.id}/pack.json`;
    return pack.sprites.map((sprite) => ({
      ...sprite,
      packId: pack.id,
      imageUrl: packFileUrl(manifestUrl, sprite.image),
      ...(sprite.materials
        ? { materialsUrl: packFileUrl(manifestUrl, sprite.materials) }
        : {}),
    }));
  }

  /** The raw word list of a generator in a language; rejects when the pack has none. */
  async wordList(
    generator: PackGenerator,
    lang: string,
    packId: string = BASE_PACK_ID,
  ): Promise<unknown> {
    const pack = await this.manifest();
    const path = (
      pack.generators as Record<string, Record<string, string> | undefined>
    )[lang]?.[generator];
    if (!path)
      throw new Error(
        `Pack "${packId}" has no ${generator} word list for "${lang}"`,
      );
    return this.service.loadJson(
      packFileUrl(`packs/${packId}/pack.json`, path),
    );
  }
}
