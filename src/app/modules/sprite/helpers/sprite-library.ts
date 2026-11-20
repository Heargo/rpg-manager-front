import { BundledSprite } from '../../../core/business/pack.business';
import { Pack } from '../../../core/packs/pack';

export {
  searchSprites,
  spriteLabel,
} from '../../../core/helpers/sprite-search';

export const DEMO_SPRITE_ID = 'axe';

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
