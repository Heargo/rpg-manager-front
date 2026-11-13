import { BundledSprite } from '../../../core/business/pack.business';
import { Pack, SpriteKind } from '../../../core/packs/pack';

export const DEMO_SPRITE_ID = 'axe';

/** The sprites whose label (in `lang`) or id contains every word of `query`, accents and case ignored, by label. */
export function searchSprites(
  sprites: readonly BundledSprite[],
  query: string,
  lang: string,
  kind: SpriteKind | null = null,
): BundledSprite[] {
  const fr = lang === 'fr';
  const words = fold(query).split(/\s+/).filter(Boolean);
  return sprites
    .filter((sprite) => {
      if (kind && sprite.kind !== kind) return false;
      const text = fold(`${fr ? sprite.fr : sprite.en} ${sprite.id}`);
      return words.every((word) => text.includes(word));
    })
    .sort((a, b) => (fr ? a.fr : a.en).localeCompare(fr ? b.fr : b.en, lang));
}

export interface SpriteGroup {
  packId: string;
  name: string;
  sprites: BundledSprite[];
}

/** The sprites under the name (in `lang`) of their pack, in pack order; packs without a sprite are left out. */
export function groupSpritesByPack(
  sprites: readonly BundledSprite[],
  packs: readonly Pick<Pack, 'id' | 'name'>[],
  lang: string,
): SpriteGroup[] {
  return packs
    .map((pack) => ({
      packId: pack.id,
      name: (lang === 'fr' ? pack.name.fr : pack.name.en) ?? pack.name.en,
      sprites: sprites.filter((s) => s.packId === pack.id),
    }))
    .filter((group) => group.sprites.length > 0);
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
