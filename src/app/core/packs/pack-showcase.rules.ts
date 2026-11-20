import { SPRITE_KINDS, SpriteKind } from './pack';

/** Assets shown on one page of an expanded kind. */
export const PAGE_SIZE = 24;
/** Visual assets shown at the top of the pack details. */
export const SHOWCASE_SIZE = 5;

export type AssetKind = SpriteKind | 'world';

interface SpriteLike {
  id: string;
  kind: SpriteKind;
  imageUrl: string;
}
interface WorldImageLike {
  id: string;
  imageUrl: string;
}

/** The first visual assets of a pack in manifest order: sprites, then world images. */
export function showcaseOf<S extends SpriteLike, W extends WorldImageLike>(
  sprites: S[],
  worldImages: W[],
): (S | W)[] {
  return [...sprites, ...worldImages].slice(0, SHOWCASE_SIZE);
}

/** One row per asset kind that has assets, with its count. */
export function assetKindRows(
  sprites: SpriteLike[],
  worldImages: WorldImageLike[],
): { kind: AssetKind; count: number }[] {
  const rows: { kind: AssetKind; count: number }[] = SPRITE_KINDS.map(
    (kind) => ({
      kind: kind as AssetKind,
      count: sprites.filter((s) => s.kind === kind).length,
    }),
  );
  rows.push({ kind: 'world', count: worldImages.length });
  return rows.filter((row) => row.count > 0);
}

/** A 1-based page of one kind's assets, the page clamped to the existing ones. */
export function assetPage<S extends SpriteLike, W extends WorldImageLike>(
  sprites: S[],
  worldImages: W[],
  kind: AssetKind,
  page: number,
): { items: (S | W)[]; page: number; pageCount: number; total: number } {
  const all: (S | W)[] =
    kind === 'world' ? worldImages : sprites.filter((s) => s.kind === kind);
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * PAGE_SIZE;
  return {
    items: all.slice(start, start + PAGE_SIZE),
    page: current,
    pageCount,
    total: all.length,
  };
}
