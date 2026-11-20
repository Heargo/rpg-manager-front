import baseAssets from '../../../../../public/packs/base-assets/pack.json';
import { DEMO_SPRITE_ID, groupSpritesByPack, searchSprites } from './sprite-library';

/** The neutral pack's sprites, as PackBusiness exposes them. */
const sprites = baseAssets.sprites.map((s) => ({
  ...s,
  packId: baseAssets.id,
  imageUrl: `packs/${baseAssets.id}/${s.image}`,
}));
const search = (query: string, lang = 'en') => searchSprites(sprites as never, query, lang);

describe('sprite library', () => {
  it('uses the axe as the demo sprite', () => {
    expect(DEMO_SPRITE_ID).toBe('axe');
    expect(sprites.some((s) => s.id === DEMO_SPRITE_ID)).toBe(true);
  });

  it('returns every sprite, sorted by its label, for an empty query', () => {
    const all = search('');
    expect(all).toHaveLength(101);
    const labels = all.map((s) => s.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'en')));
    expect(search('', 'fr')).toHaveLength(101);
  });

  it('matches the single label of the pack', () => {
    expect(search('axe').map((s) => s.id)).toEqual(['axe', 'pick', 'waraxe']);
  });

  it('ignores case and accents, and needs every word', () => {
    expect(search('SWORD').map((s) => s.id)).toEqual(['sword']);
    expect(search('war axe').map((s) => s.id)).toEqual(['waraxe']);
    expect(search('zzz')).toEqual([]);
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
