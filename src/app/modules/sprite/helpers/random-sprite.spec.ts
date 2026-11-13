import { seededRandomSource } from '../../../core/generators/random-source';
import { autoMaterials } from './auto-materials';
import { PRESETS } from './presets';
import { pickSprite, randomMaterials, SpriteCandidate } from './random-sprite';
import { gray } from './sprite-test-images';

const candidates: SpriteCandidate[] = [
  { key: 'axe', labels: ['Axe', 'Hache'], type: 'equipment', slot: 'weapon1' },
  { key: 'sword', labels: ['Sword', 'Épée'], type: 'equipment', slot: 'weapon1' },
  { key: 'helm', labels: ['Helm', 'Heaume'], type: 'equipment', slot: 'head' },
  { key: 'potion', labels: ['Potion'], type: 'consumable', slot: 'none' },
  { key: 'apple', labels: ['Apple', 'Pomme'], type: 'consumable', slot: 'none' },
  { key: 'key', labels: ['Key', 'Clé'], type: 'item', slot: 'none' },
];

const keysPicked = (item: Parameters<typeof pickSprite>[1], runs = 40) =>
  new Set(
    Array.from({ length: runs }, (_, i) => pickSprite(candidates, item, seededRandomSource(`s${i}`))?.key),
  );

describe('pickSprite', () => {
  it('prefers a sprite whose label is a word of the item name, accents and case ignored', () => {
    expect(keysPicked({ name: 'Epee courte du loup', type: 'equipment', slot: 'weapon1' })).toEqual(
      new Set(['sword']),
    );
    expect(keysPicked({ name: 'Grand HEAUME', type: 'item', slot: 'none' })).toEqual(new Set(['helm']));
  });

  it('otherwise picks among the sprites of the same type and slot', () => {
    expect(keysPicked({ name: 'Lame du nord', type: 'equipment', slot: 'weapon1' })).toEqual(
      new Set(['axe', 'sword']),
    );
    expect(keysPicked({ name: 'Elixir', type: 'consumable', slot: 'none' })).toEqual(new Set(['potion', 'apple']));
  });

  it('falls back to the same type, then to any sprite', () => {
    expect(keysPicked({ name: 'Bague', type: 'equipment', slot: 'ring' })).toEqual(new Set(['axe', 'sword', 'helm']));
    expect(keysPicked({ name: 'Truc', type: 'item', slot: 'none' })).toEqual(new Set(['key']));
    expect(pickSprite([], { name: 'x', type: 'item', slot: 'none' }, seededRandomSource('a'))).toBeUndefined();
  });

  it('gives the same sprite for the same seed', () => {
    const item = { name: 'Lame', type: 'equipment' as const, slot: 'weapon1' as const };
    expect(pickSprite(candidates, item, seededRandomSource('x'))).toBe(
      pickSprite(candidates, item, seededRandomSource('x')),
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
    const after = randomMaterials(before, seededRandomSource('a'));
    const s = stops(after);
    expect(s[0]).toBe(stops(before)[0]);
    expect(new Set(s.slice(1)).size).toBe(3);
    for (const x of s.slice(1)) expect(PRESETS.some((p) => JSON.stringify(p.stops) === x)).toBe(true);
    expect(after.layers.map((l) => Array.from(l.mask))).toEqual(before.layers.map((l) => Array.from(l.mask)));
  });

  it('depends on the seed only', () => {
    expect(stops(randomMaterials(doc(), seededRandomSource('a')))).toEqual(
      stops(randomMaterials(doc(), seededRandomSource('a'))),
    );
    const seeds = ['a', 'b', 'c', 'd', 'e'].map((x) => stops(randomMaterials(doc(), seededRandomSource(x))).join());
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });
});
