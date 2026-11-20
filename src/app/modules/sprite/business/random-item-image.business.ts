import { inject, Injectable } from '@angular/core';
import { ImageBusiness } from '../../../core/business/image.business';
import { ItemVocabularyBusiness } from '../../../core/business/item-vocabulary.business';
import { isBasePack, PackBusiness } from '../../../core/business/pack.business';
import { NpcVocabularyBusiness } from '../../../core/business/npc-vocabulary.business';
import {
  RandomSource,
  seededRandomSource,
} from '../../../core/generators/random-source';
import { ImageStorageService } from '../../../core/services/image-storage.service';
import { autoMaterials } from '../helpers/auto-materials';
import { importConfig } from '../helpers/config-export';
import { renderSprite } from '../helpers/gradient-mapping';
import {
  ItemLook,
  MaterialTints,
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
  private readonly vocabularies = inject(ItemVocabularyBusiness);
  private readonly npcVocabularies = inject(NpcVocabularyBusiness);

  /** The same item and seed give the same sprite and colours. Returns the stored image id. */
  async create(item: ItemLook, seed: string): Promise<string> {
    const random = seededRandomSource(`${seed}:image`);
    const saved = await this.savedSets();
    const vocabulary = await this.vocabularies.vocabulary();
    const candidates = await this.candidates(saved);
    const chosen = pickSprite(candidates, item, vocabulary, random);
    if (!chosen) throw new Error('No sprite');
    return this.render(chosen, saved, random, {
      tints: (item.tints ?? []).map((id) => vocabulary.gradients(id)),
      pool: vocabulary.tints().map((id) => vocabulary.gradients(id)),
    });
  }

  /** A portrait for an NPC from an `npcs` sprite of the active packs; rejects when there is none. */
  async createNpc(npc: { kind?: string }, seed: string): Promise<string> {
    const random = seededRandomSource(`${seed}:portrait`);
    const saved = await this.savedSets();
    const vocabulary = await this.npcVocabularies.vocabulary();
    const candidates = (await this.candidates(saved)).filter(
      (c) => c.domain === 'npcs',
    );
    const chosen = pickSprite(
      candidates,
      { domain: 'npcs', kind: npc.kind },
      vocabulary,
      random,
    );
    if (!chosen) throw new Error('No sprite');
    const items = await this.vocabularies.vocabulary();
    return this.render(chosen, saved, random, {
      tints: [],
      pool: items.tints().map((id) => items.gradients(id)),
    });
  }

  private async savedSets(): Promise<SpriteSet[]> {
    return (await this.sets.list().catch(() => [] as SpriteSet[]))
      .filter((set) => set.tags?.kinds.length)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private async candidates(saved: SpriteSet[]): Promise<SpriteCandidate[]> {
    const library = await this.packs.sprites();
    const npcs = await this.packs.npcSprites();
    return [
      ...npcs.map((s) => ({
        key: `library:${s.id}`,
        domain: 'npcs' as const,
        kinds: s.kinds,
        own: !isBasePack(s.packId),
      })),
      ...library.map((s) => ({
        key: `library:${s.id}`,
        domain: 'items' as const,
        kinds: s.kinds,
        type: s.type,
        slot: s.slot,
        own: !isBasePack(s.packId),
      })),
      ...saved.map((s) => ({
        key: `set:${s.id}`,
        domain: 'items' as const,
        kinds: s.tags!.kinds,
        type: 'item' as const,
        slot: 'none' as const,
        own: true,
      })),
    ];
  }

  private async render(
    chosen: SpriteCandidate,
    saved: SpriteSet[],
    random: RandomSource,
    tints: MaterialTints,
  ): Promise<string> {
    if (chosen.key.startsWith('library:')) {
      const sprite = await this.sprite(chosen.key.slice('library:'.length));
      if (sprite.kind === 'colored')
        return this.images.storeUpload(
          await this.files.fetchBlob(sprite.imageUrl),
        );
    }
    const { image, config } = await this.load(chosen.key, saved);
    const base = config
      ? importConfig(config, { width: image.width, height: image.height })
      : autoMaterials(image);
    const out = renderSprite(image, randomMaterials(base, random, tints));
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
        sprite.materialsUrl && sprite.kind === 'masked'
          ? this.files.fetchText(sprite.materialsUrl).catch(() => null)
          : null,
      ]);
      return { image, config };
    }
    const set = saved.find((s) => `set:${s.id}` === key)!;
    if (set.source.kind === 'library') {
      return {
        image: await this.files.fetchImage(
          (await this.sprite(set.source.spriteId)).imageUrl,
        ),
        config: set.config,
      };
    }
    const blob = await this.storage.get(set.source.imageId);
    if (!blob) throw new Error('Missing sprite image');
    return { image: await this.files.decode(blob), config: set.config };
  }

  private async sprite(id: string) {
    const sprite = [
      ...(await this.packs.sprites()),
      ...(await this.packs.npcSprites()),
    ].find((s) => s.id === id);
    if (!sprite) throw new Error(`Unknown sprite "${id}"`);
    return sprite;
  }
}
