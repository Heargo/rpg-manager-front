import { BundledSprite } from '../business/pack.business';
import { ItemVocabulary } from '../generators/item-vocabulary';
import { SpriteKind } from '../packs/pack';

/** What a sprite is called: the first noun of its first kind in the vocabulary, else its own label. */
export function spriteLabel(
  sprite: Pick<BundledSprite, 'kinds' | 'label'>,
  vocabulary?: ItemVocabulary,
): string {
  const kind = sprite.kinds?.[0];
  return (kind && vocabulary?.nouns(kind)[0]?.text) || sprite.label;
}

/** The sprites whose label contains every word of `query`, accents and case ignored, by label. */
export function searchSprites(
  sprites: readonly BundledSprite[],
  query: string,
  lang: string,
  kind: SpriteKind | null = null,
  vocabulary?: ItemVocabulary,
): BundledSprite[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return sprites
    .filter((sprite) => {
      if (kind && sprite.kind !== kind) return false;
      const text = fold(spriteLabel(sprite, vocabulary));
      return words.every((word) => text.includes(word));
    })
    .sort((a, b) =>
      spriteLabel(a, vocabulary).localeCompare(
        spriteLabel(b, vocabulary),
        lang,
      ),
    );
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
