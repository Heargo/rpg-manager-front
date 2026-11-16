/** Where a saved sprite set's grayscale image comes from. */
export type SpriteSetSource =
  | { kind: 'library'; spriteId: string }
  /** An image the user opened, stored in the app's `images` store. */
  | { kind: 'image'; imageId: string };

/** A grayscale sprite and its materials, saved on the device (not per world) to reuse or generate from. */
export interface SpriteSet {
  id: string;
  name: string;
  source: SpriteSetSource;
  /** The materials, as the colorizer's JSON configuration. */
  config: string;
  updatedAt: number;
  /** The kinds of item it can illustrate; without tags, random item images leave it out. */
  tags?: SpriteSetTags;
}

export interface SpriteSetTags {
  /** The item kinds it can illustrate (a kind also covers its children). */
  kinds: string[];
}
