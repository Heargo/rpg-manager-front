import { BundledSprite } from '../../../core/business/pack.business';
import { Pack, SpriteKind } from '../../../core/packs/pack';

export const DEMO_SPRITE_ID = 'axe';

/** The sprites whose label contains every word of `query`, accents and case ignored, by label. */
export function searchSprites(
  sprites: readonly BundledSprite[],
  query: string,
  lang: string,
  kind: SpriteKind | null = null,
): BundledSprite[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return sprites
    .filter((sprite) => {
      if (kind && sprite.kind !== kind) return false;
      const text = fold(sprite.label);
      return words.every((word) => text.includes(word));
    })
    .sort((a, b) => a.label.localeCompare(b.label, lang));
}

export interface SpriteGroup {
  packId: string;
  name: string;
  sprites: BundledSprite[];
}

/** The sprites under the name of their pack, in pack order; packs without a sprite are left out. */
export function groupSpritesByPack(
  sprites: readonly BundledSprite[],
  packs: readonly Pick<Pack, 'id' | 'name'>[],
): SpriteGroup[] {
  return packs
    .map((pack) => ({
      packId: pack.id,
      name: pack.name,
      sprites: sprites.filter((s) => s.packId === pack.id),
    }))
    .filter((group) => group.sprites.length > 0);
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
