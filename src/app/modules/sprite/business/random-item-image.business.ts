import { inject, Injectable } from '@angular/core';
import { ImageBusiness } from '../../../core/business/image.business';
import { PackBusiness } from '../../../core/business/pack.business';
import { seededRandomSource } from '../../../core/generators/random-source';
import { ImageStorageService } from '../../../core/services/image-storage.service';
import { autoMaterials } from '../helpers/auto-materials';
import { importConfig } from '../helpers/config-export';
import { renderSprite } from '../helpers/gradient-mapping';
import {
  ItemLook,
  pickSprite,
  randomMaterials,
  SpriteCandidate,
} from '../helpers/random-sprite';
import { SpriteImage } from '../models/sprite';
import { SpriteSet } from '../models/sprite-set';
import { SpriteFileService } from '../services/sprite-file.service';
import { SpriteSetStorageService } from '../services/sprite-set-storage.service';

/** Draws an item's image: a matching sprite set recoloured with random gradients, stored like an uploaded image. */
@Injectable({ providedIn: 'root' })
export class RandomItemImageBusiness {
  private readonly files = inject(SpriteFileService);
  private readonly sets = inject(SpriteSetStorageService);
  private readonly images = inject(ImageBusiness);
  private readonly packs = inject(PackBusiness);
  private readonly storage = inject(ImageStorageService);

  /** The same item and seed give the same sprite and colours. Returns the stored image id. */
  async create(item: ItemLook, seed: string): Promise<string> {
    const random = seededRandomSource(`${seed}:image`);
    const saved = (await this.sets.list().catch(() => [] as SpriteSet[]))
      .filter((set) => set.tags)
      .sort((a, b) => a.id.localeCompare(b.id));
    const library = await this.packs.sprites();
    const candidates: SpriteCandidate[] = [
      ...library.map((s) => ({
        key: `library:${s.id}`,
        labels: [s.en, s.fr],
        type: s.type,
        slot: s.slot,
      })),
      ...saved.map((s) => ({
        key: `set:${s.id}`,
        labels: [s.name],
        type: s.tags!.type,
        slot: s.tags!.slot,
      })),
    ];
    const chosen = pickSprite(candidates, item, random);
    if (!chosen) throw new Error('No sprite');
    const { image, config } = await this.load(chosen.key, saved);
    const base = config
      ? importConfig(config, { width: image.width, height: image.height })
      : autoMaterials(image);
    const out = renderSprite(image, randomMaterials(base, random));
    return this.images.storeUpload(await this.files.encodePng(out));
  }

  private async load(
    key: string,
    saved: SpriteSet[],
  ): Promise<{ image: SpriteImage; config: string | null }> {
    if (key.startsWith('library:')) {
      const id = key.slice('library:'.length);
      const sprite = await this.sprite(id);
      const [image, config] = await Promise.all([
        this.files.fetchImage(sprite.imageUrl),
        sprite.materialsUrl
          ? this.files.fetchText(sprite.materialsUrl).catch(() => null)
          : null,
      ]);
      return { image, config };
    }
    const set = saved.find((s) => `set:${s.id}` === key)!;
    if (set.source.kind === 'library') {
      return {
        image: await this.files.fetchImage((await this.sprite(set.source.spriteId)).imageUrl),
        config: set.config,
      };
    }
    const blob = await this.storage.get(set.source.imageId);
    if (!blob) throw new Error('Missing sprite image');
    return { image: await this.files.decode(blob), config: set.config };
  }

  private async sprite(id: string) {
    const sprite = (await this.packs.sprites()).find((s) => s.id === id);
    if (!sprite) throw new Error(`Unknown sprite "${id}"`);
    return sprite;
  }
}
