import { PAGE_SIZE, assetKindRows, assetPage, showcaseOf } from './pack-showcase.rules';

const sprite = (id: string, kind: 'grayscale' | 'masked' | 'colored' = 'masked') => ({
  id,
  kind,
  imageUrl: `sprites/${id}.png`,
});
const world = (id: string) => ({ id, imageUrl: `worlds/${id}.webp` });
const many = (n: number, prefix: string, kind: 'grayscale' | 'masked' | 'colored' = 'masked') =>
  Array.from({ length: n }, (_, i) => sprite(`${prefix}${i + 1}`, kind));

describe('pack showcase rules', () => {
  it('keeps the first 5 visual assets in manifest order, sprites before world images', () => {
    const shown = showcaseOf(many(3, 's'), [world('w1'), world('w2'), world('w3')]);

    expect(shown.map((a) => a.id)).toEqual(['s1', 's2', 's3', 'w1', 'w2']);
  });

  it('shows every asset of a pack with fewer than 5', () => {
    expect(showcaseOf(many(2, 's'), [world('w1')]).map((a) => a.id)).toEqual(['s1', 's2', 'w1']);
  });

  it('shows nothing for a pack without visual assets', () => {
    expect(showcaseOf([], [])).toEqual([]);
  });

  it('keeps the image url of each showcase asset', () => {
    const shown = showcaseOf([sprite('a')], [world('w')]);

    expect(shown.map((a) => a.imageUrl)).toEqual(['sprites/a.png', 'worlds/w.webp']);
  });

  it('counts one row per asset kind, left out when empty', () => {
    const rows = assetKindRows([...many(120, 'g', 'grayscale'), ...many(4, 'c', 'colored')], [world('w1'), world('w2')]);

    expect(rows).toEqual([
      { kind: 'grayscale', count: 120 },
      { kind: 'colored', count: 4 },
      { kind: 'world', count: 2 },
    ]);
  });

  it('has no rows for an empty pack', () => {
    expect(assetKindRows([], [])).toEqual([]);
  });

  it('pages a kind 24 at a time', () => {
    expect(PAGE_SIZE).toBe(24);
    const sprites = many(30, 'm');

    const first = assetPage(sprites, [], 'masked', 1);
    const second = assetPage(sprites, [], 'masked', 2);

    expect(first.items.map((a) => a.id)).toEqual(sprites.slice(0, 24).map((s) => s.id));
    expect(second.items.map((a) => a.id)).toEqual(['m25', 'm26', 'm27', 'm28', 'm29', 'm30']);
    expect(first.pageCount).toBe(2);
    expect(first.total).toBe(30);
    expect(second.page).toBe(2);
  });

  it('only pages the assets of the asked kind', () => {
    const page = assetPage([...many(3, 'g', 'grayscale'), ...many(2, 'c', 'colored')], [world('w')], 'world', 1);

    expect(page.items.map((a) => a.id)).toEqual(['w']);
    expect(page.total).toBe(1);
  });

  it('clamps a page out of bounds to the nearest page', () => {
    const sprites = many(30, 'm');

    expect(assetPage(sprites, [], 'masked', 9).page).toBe(2);
    expect(assetPage(sprites, [], 'masked', 0).page).toBe(1);
  });

  it('gives one empty page for a kind without assets', () => {
    const page = assetPage([], [], 'colored', 1);

    expect(page.items).toEqual([]);
    expect(page.pageCount).toBe(1);
  });
});
