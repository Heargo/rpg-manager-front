import baseEn from '../../../../../public/packs/base-en/pack.json';
import baseFr from '../../../../../public/packs/base-fr/pack.json';
import { DEMO_SPRITE_ID, groupSpritesByPack, searchSprites } from './sprite-library';

/** A Base pack's sprites, as PackBusiness exposes them. */
const bundled = (pack: typeof baseFr | typeof baseEn) =>
  pack.sprites.map((s) => ({
    ...s,
    packId: pack.id,
    imageUrl: `packs/${pack.id}/${s.image}`,
  }));
const frSprites = bundled(baseFr);
const enSprites = bundled(baseEn);
const searchFr = (query: string) => searchSprites(frSprites as never, query, 'fr');
const searchEn = (query: string) => searchSprites(enSprites as never, query, 'en');

describe('sprite library', () => {
  it('uses the axe as the demo sprite', () => {
    expect(DEMO_SPRITE_ID).toBe('axe');
    expect(frSprites.some((s) => s.id === DEMO_SPRITE_ID)).toBe(true);
    expect(enSprites.some((s) => s.id === DEMO_SPRITE_ID)).toBe(true);
  });

  it('returns every sprite, sorted by its label, for an empty query', () => {
    const fr = searchFr('');
    expect(fr).toHaveLength(101);
    const labels = fr.map((s) => s.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'fr')));
    expect(searchEn('')).toHaveLength(101);
  });

  it('matches the single label of the pack', () => {
    expect(searchFr('hache').map((s) => s.id)).toEqual(['axe', 'waraxe']);
    expect(searchEn('axe').map((s) => s.id)).toEqual(['axe', 'pick', 'waraxe']);
  });

  it('does not match the label of the other language', () => {
    expect(searchEn('hache')).toEqual([]);
    expect(searchFr('sword')).toEqual([]);
  });

  it('ignores case and accents, and needs every word', () => {
    expect(searchFr('EPEE').map((s) => s.id)).toEqual(['sword']);
    expect(searchFr('hache guerre').map((s) => s.id)).toEqual(['waraxe']);
    expect(searchEn('zzz')).toEqual([]);
  });

  describe('kinds and packs', () => {
    const sprite = (id: string, label: string, kind: string, packId = 'base-fr') => ({
      id,
      label,
      type: 'item',
      slot: 'none',
      kind,
      image: `${id}.png`,
      packId,
      imageUrl: `${id}.png`,
    });
    const mixed = [
      sprite('b', 'Bravo axe', 'masked'),
      sprite('a', 'Alpha axe', 'grayscale'),
      sprite('c', 'Charlie axe', 'colored'),
      sprite('d', 'Delta', 'masked'),
    ] as never[];

    it('keeps only the sprites of the given kind', () => {
      expect(searchSprites(mixed, '', 'en', 'masked').map((s) => s.id)).toEqual(['b', 'd']);
      expect(searchSprites(mixed, '', 'en', 'colored').map((s) => s.id)).toEqual(['c']);
    });

    it('combines the kind with the words of the query', () => {
      expect(searchSprites(mixed, 'axe', 'en', 'grayscale').map((s) => s.id)).toEqual(['a']);
      expect(searchSprites(mixed, 'delta', 'en', 'colored')).toEqual([]);
    });

    it('lists every kind when the kind is null', () => {
      expect(searchSprites(mixed, '', 'en', null).map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('groups sprites under the name of their pack in the language, in pack order', () => {
      const packs = [
        { id: 'base-fr', name: 'Socle' },
        { id: 'extra', name: 'Bonus' },
      ] as never[];
      const sprites = [
        sprite('x', 'X', 'masked', 'extra'),
        sprite('a', 'A', 'masked'),
        sprite('b', 'B', 'colored'),
      ] as never[];
      const groups = groupSpritesByPack(sprites, packs);
      expect(groups.map((g) => [g.packId, g.name, g.sprites.map((s) => s.id)])).toEqual([
        ['base-fr', 'Socle', ['a', 'b']],
        ['extra', 'Bonus', ['x']],
      ]);
    });

    it('leaves out the packs that have no sprite', () => {
      const packs = [
        { id: 'base-fr', name: 'Base' },
        { id: 'empty', name: 'Vide' },
      ] as never[];
      expect(groupSpritesByPack([sprite('a', 'A', 'masked')] as never[], packs).map((g) => g.packId)).toEqual(['base-fr']);
    });
  });
});
