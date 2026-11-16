import { baseItemVocabulary } from '../../../../testing/base-vocabulary';
import { seededRandomSource } from '../../../core/generators/random-source';
import { buildItemVocabulary } from '../../../core/generators/item-vocabulary';
import { GradientStop } from '../models/sprite';
import { autoMaterials } from './auto-materials';
import { PRESETS } from './presets';
import { pickSprite, randomMaterials, SpriteCandidate } from './random-sprite';
import { gray } from './sprite-test-images';

const vocabulary = buildItemVocabulary([
  {
    packId: 'base-fr',
    isBase: true,
    language: 'fr',
    kinds: {
      equipment: { type: 'equipment' },
      weapon: { parent: 'equipment', slot: 'weapon1' },
      sword: { parent: 'weapon' },
      rapier: { parent: 'weapon' },
      hand: { parent: 'equipment', slot: 'hand' },
      glove: { parent: 'hand' },
      head: { parent: 'equipment', slot: 'head' },
      ring: { parent: 'equipment', slot: 'ring' },
      item: { type: 'item' },
      key: { parent: 'item' },
      consumable: { type: 'consumable' },
      potion: { parent: 'consumable' },
    },
    texts: {
      version: 2,
      kinds: {
        sword: { nouns: [{ text: 'Épée', gender: 'f' }] },
        glove: { nouns: [{ text: 'Gants', gender: 'm', plural: true }] },
        key: { nouns: [{ text: 'Clé', gender: 'f' }] },
      },
    },
  } as never,
]);
const realFr = baseItemVocabulary('fr');

const sprite = (
  key: string,
  kinds: string[],
  type: SpriteCandidate['type'],
  slot: SpriteCandidate['slot'],
): SpriteCandidate => ({ key, kinds, type, slot });
const candidates: SpriteCandidate[] = [
  sprite('sword-1', ['sword'], 'equipment', 'weapon1'),
  sprite('sword-2', ['sword'], 'equipment', 'weapon1'),
  sprite('weapon-x', ['weapon'], 'equipment', 'weapon1'),
  sprite('glove-1', ['glove'], 'equipment', 'hand'),
  sprite('head-1', ['head'], 'equipment', 'head'),
  sprite('potion-1', ['potion'], 'consumable', 'none'),
  sprite('key-1', ['key'], 'item', 'none'),
];

type Look = Parameters<typeof pickSprite>[1];
const keysPicked = (
  item: Look,
  pool: SpriteCandidate[] = candidates,
  vocab = vocabulary,
  runs = 40,
) =>
  new Set(
    Array.from({ length: runs }, (_, i) => pickSprite(pool, item, vocab, seededRandomSource(`s${i}`))?.key),
  );

describe('pickSprite', () => {
  it('draws among the sprites of the item kind', () => {
    const item: Look = { name: 'Lame', type: 'equipment', slot: 'weapon1', kind: 'sword' };
    expect(keysPicked(item)).toEqual(new Set(['sword-1', 'sword-2']));
  });

  it('falls back to the parent kind, nearest level first', () => {
    const rapier: Look = { name: 'Fleuret', type: 'equipment', slot: 'weapon1', kind: 'rapier' };
    expect(keysPicked(rapier)).toEqual(new Set(['weapon-x']));
    const noWeapon = candidates.filter((c) => c.key !== 'weapon-x');
    const equipmentOnly = [...noWeapon, sprite('equip-x', ['equipment'], 'equipment', 'none')];
    expect(keysPicked(rapier, equipmentOnly)).toEqual(new Set(['equip-x']));
  });

  it('prefers the own kind over a parent kind', () => {
    const item: Look = { name: 'Lame', type: 'equipment', slot: 'weapon1', kind: 'sword' };
    expect(keysPicked(item).has('weapon-x')).toBe(false);
  });

  it('matches a sprite listing several kinds on any of them', () => {
    const pool = [sprite('multi', ['key', 'sword'], 'item', 'none'), sprite('other', ['potion'], 'consumable', 'none')];
    expect(keysPicked({ name: 'x', type: 'item', slot: 'none', kind: 'sword' }, pool)).toEqual(new Set(['multi']));
  });

  it('finds the kind from the name when the item has none', () => {
    const item: Look = { name: 'Gants de cuir', type: 'item', slot: 'none' };
    expect(keysPicked(item)).toEqual(new Set(['glove-1']));
    expect(keysPicked({ name: 'Une Clé ancienne', type: 'equipment', slot: 'ring' })).toEqual(new Set(['key-1']));
  });

  it('finds the kind from the name when the item kind is unknown to the vocabulary', () => {
    const item: Look = { name: 'Gants', type: 'item', slot: 'none', kind: 'ghost' };
    expect(keysPicked(item)).toEqual(new Set(['glove-1']));
  });

  it('finds the kind from the name with the real Base FR vocabulary, plural included', () => {
    const real = [
      sprite('glove-a', ['glove'], 'equipment', 'hand'),
      sprite('glove-b', ['glove'], 'equipment', 'hand'),
      sprite('sword-a', ['sword'], 'equipment', 'weapon1'),
    ];
    const item: Look = { name: 'Gants du loup', type: 'item', slot: 'none' };
    expect(keysPicked(item, real, realFr)).toEqual(new Set(['glove-a', 'glove-b']));
  });

  it('falls back to the same type and slot when no sprite has the kind', () => {
    const item: Look = { name: 'Truc', type: 'equipment', slot: 'weapon1', kind: 'glove' };
    const pool = candidates.filter((c) => c.key !== 'glove-1');
    expect(keysPicked(item, pool)).toEqual(new Set(['sword-1', 'sword-2', 'weapon-x']));
  });

  it('falls back to the same type, then to any sprite', () => {
    expect(keysPicked({ name: 'Bague', type: 'equipment', slot: 'ring' })).toEqual(
      new Set(['sword-1', 'sword-2', 'weapon-x', 'glove-1', 'head-1']),
    );
    expect(keysPicked({ name: 'Truc', type: 'item', slot: 'none' })).toEqual(new Set(['key-1']));
    const noItem = candidates.filter((c) => c.type !== 'item');
    expect(keysPicked({ name: 'Truc', type: 'item', slot: 'none' }, noItem)).toEqual(
      new Set(noItem.map((c) => c.key)),
    );
    expect(pickSprite([], { name: 'x', type: 'item', slot: 'none' }, vocabulary, seededRandomSource('a'))).toBeUndefined();
  });

  it('does not match sprite labels any more', () => {
    const labelled = [
      { ...sprite('named', ['key'], 'item', 'none'), labels: ['Truc'] },
      sprite('typed', ['potion'], 'consumable', 'none'),
    ];
    expect(keysPicked({ name: 'Truc', type: 'consumable', slot: 'none' }, labelled)).toEqual(new Set(['typed']));
  });

  it('gives the same sprite for the same seed', () => {
    const item: Look = { name: 'Lame', type: 'equipment', slot: 'weapon1', kind: 'sword' };
    expect(pickSprite(candidates, item, vocabulary, seededRandomSource('x'))).toBe(
      pickSprite(candidates, item, vocabulary, seededRandomSource('x')),
    );
  });
});

describe('randomMaterials', () => {
  /** 20 x 1 strip with three regions: Base + Part 1..3. */
  const doc = () =>
    autoMaterials(
      gray(
        20,
        1,
        [...Array(8).fill(10), ...Array(6).fill(120), ...Array(4).fill(230), 0, 0],
        [...Array(18).fill(255), 0, 0],
      ),
    );
  const stops = (d: ReturnType<typeof doc>) => d.layers.map((l) => JSON.stringify(l.gradient.stops));

  it('gives every part a different built-in gradient and leaves the base and the masks alone', () => {
    const before = doc();
    const after = randomMaterials(before, seededRandomSource('a'), { tints: [], pool: [] });
    const s = stops(after);
    expect(s[0]).toBe(stops(before)[0]);
    expect(new Set(s.slice(1)).size).toBe(3);
    for (const x of s.slice(1)) expect(PRESETS.some((p) => JSON.stringify(p.stops) === x)).toBe(true);
    expect(after.layers.map((l) => Array.from(l.mask))).toEqual(before.layers.map((l) => Array.from(l.mask)));
  });

  it('depends on the seed only', () => {
    expect(stops(randomMaterials(doc(), seededRandomSource('a'), { tints: [], pool: [] }))).toEqual(
      stops(randomMaterials(doc(), seededRandomSource('a'), { tints: [], pool: [] })),
    );
    const seeds = ['a', 'b', 'c', 'd', 'e'].map((x) => stops(randomMaterials(doc(), seededRandomSource(x), { tints: [], pool: [] })).join());
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });

  const grad = (from: string, to: string): GradientStop[] => [
    { position: 0, color: from },
    { position: 1, color: to },
  ];
  const red = grad('#100000', '#ff0000');
  const blue = grad('#000010', '#0000ff');
  const green = grad('#001000', '#00ff00');
  const pooled = [[grad('#111111', '#aaaaaa')], [grad('#222222', '#bbbbbb')], [grad('#333333', '#cccccc')]];
  const json = (g: GradientStop[]) => JSON.stringify(g);

  it('gives the item tints to the parts in order, the first tint to the first part', () => {
    const before = doc();
    const after = randomMaterials(before, seededRandomSource('a'), { tints: [[red], [blue]], pool: pooled });
    const s = stops(after);
    expect(s[0]).toBe(stops(before)[0]);
    expect(s[1]).toBe(json(red));
    expect(s[2]).toBe(json(blue));
    expect(pooled.map((t) => json(t[0]))).toContain(s[3]);
  });

  it('draws one variant among the gradients of a tint', () => {
    const seen = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(
        (x) => stops(randomMaterials(doc(), seededRandomSource(x), { tints: [[red, green]], pool: pooled }))[1],
      ),
    );
    expect(seen).toEqual(new Set([json(red), json(green)]));
  });

  it('colours the parts without a tint from the pool, all different while there are enough', () => {
    const after = randomMaterials(doc(), seededRandomSource('a'), { tints: [], pool: pooled });
    const s = stops(after).slice(1);
    expect(new Set(s).size).toBe(3);
    for (const x of s) expect(pooled.map((t) => json(t[0]))).toContain(x);
  });

  it('draws the rest from the pool without repeating the item tints when there is room', () => {
    const pool = [[red], [blue], [green], [grad('#222222', '#bbbbbb')]];
    for (const seed of ['a', 'b', 'c', 'd'])
      expect(new Set(stops(randomMaterials(doc(), seededRandomSource(seed), { tints: [[red]], pool })).slice(1)).size).toBe(3);
  });

  it('falls back to the built-in presets when no pack gives tints', () => {
    const after = randomMaterials(doc(), seededRandomSource('a'), { tints: [], pool: [] });
    for (const x of stops(after).slice(1)) expect(PRESETS.some((p) => json(p.stops) === x)).toBe(true);
  });

  it('uses the presets for the parts left over when only the item has tints', () => {
    const s = stops(randomMaterials(doc(), seededRandomSource('a'), { tints: [[red]], pool: [] }));
    expect(s[1]).toBe(json(red));
    for (const x of s.slice(2)) expect(PRESETS.some((p) => json(p.stops) === x)).toBe(true);
  });

  it('ignores item tints beyond the parts and keeps the masks', () => {
    const before = doc();
    const after = randomMaterials(before, seededRandomSource('a'), {
      tints: [[red], [blue], [green], [red], [blue]],
      pool: pooled,
    });
    expect(stops(after).slice(1)).toEqual([json(red), json(blue), json(green)]);
    expect(after.layers.map((l) => Array.from(l.mask))).toEqual(before.layers.map((l) => Array.from(l.mask)));
  });
});
