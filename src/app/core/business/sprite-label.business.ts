import { inject, Injectable, signal } from '@angular/core';
import { ItemVocabulary } from '../generators/item-vocabulary';
import { searchSprites, spriteLabel } from '../helpers/sprite-search';
import { SpriteKind } from '../packs/pack';
import { ItemVocabularyBusiness } from './item-vocabulary.business';
import { BundledSprite, isBasePack } from './pack.business';

/**
 * How sprites are named for the user: a built-in sprite takes the noun of its kind in the item vocabulary of the
 * active Base (so a French user sees "Hache"); a third-party pack's sprite keeps the label its author gave it.
 */
@Injectable({ providedIn: 'root' })
export class SpriteLabelBusiness {
  private readonly vocabularies = inject(ItemVocabularyBusiness);
  private readonly vocabulary = signal<ItemVocabulary | undefined>(undefined);

  constructor() {
    this.vocabularies
      .vocabulary()
      .then((vocabulary) => this.vocabulary.set(vocabulary))
      .catch(() => undefined);
  }

  /** The name to show for a sprite. */
  name(sprite: BundledSprite): string {
    return isBasePack(sprite.packId)
      ? spriteLabel(sprite, this.vocabulary())
      : sprite.label;
  }

  /** The sprites matching `query` on their shown name, sorted by it, each carrying that name as its label. */
  search(
    sprites: readonly BundledSprite[],
    query: string,
    lang: string,
    kind: SpriteKind | null = null,
  ): BundledSprite[] {
    return searchSprites(
      sprites.map((s) => ({ ...s, label: this.name(s) })),
      query,
      lang,
      kind,
    );
  }
}
