import { BundledSprite } from '../../../core/business/pack.business';

export const DEMO_SPRITE_ID = 'axe';

/** The sprites whose label (in `lang`) or id contains every word of `query`, accents and case ignored, by label. */
export function searchSprites(
  sprites: readonly BundledSprite[],
  query: string,
  lang: string,
): BundledSprite[] {
  const fr = lang === 'fr';
  const words = fold(query).split(/\s+/).filter(Boolean);
  return sprites
    .filter((sprite) => {
      const text = fold(`${fr ? sprite.fr : sprite.en} ${sprite.id}`);
      return words.every((word) => text.includes(word));
    })
    .sort((a, b) => (fr ? a.fr : a.en).localeCompare(fr ? b.fr : b.en, lang));
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
