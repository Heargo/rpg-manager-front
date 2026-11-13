import base from '../../../../../public/packs/base/pack.json';
import { DEMO_SPRITE_ID, groupSpritesByPack, searchSprites } from './sprite-library';

/** The Base pack's sprites, as PackBusiness exposes them. */
const sprites = base.sprites.map((s) => ({
  ...s,
  packId: 'base',
  imageUrl: `packs/base/${s.image}`,
}));
const search = (query: string, lang: string) => searchSprites(sprites as never, query, lang);

describe('sprite library', () => {
  it('uses the axe as the demo sprite', () => {
    expect(DEMO_SPRITE_ID).toBe('axe');
    expect(sprites.some((s) => s.id === DEMO_SPRITE_ID)).toBe(true);
  });

  it('returns every sprite, sorted by label in the language, for an empty query', () => {
    const fr = search('', 'fr');
    expect(fr).toHaveLength(101);
    const labels = fr.map((s) => s.fr);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'fr')));
  });

  it('matches the label in the given language', () => {
    expect(search('hache', 'fr').map((s) => s.id)).toEqual(['axe', 'waraxe']);
    expect(search('axe', 'en').map((s) => s.id)).toEqual(['axe', 'pick', 'waraxe']);
  });

  it('ignores case and accents, and needs every word', () => {
    expect(search('EPEE', 'fr').map((s) => s.id)).toEqual(['sword']);
    expect(search('hache guerre', 'fr').map((s) => s.id)).toEqual(['waraxe']);
    expect(search('zzz', 'en')).toEqual([]);
  });

  describe('kinds and packs', () => {
    const sprite = (id: string, en: string, kind: string, packId = 'base') => ({
      id,
      en,
      fr: en,
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
        { id: 'base', name: { en: 'Base', fr: 'Socle' } },
        { id: 'extra', name: { en: 'Extra', fr: 'Bonus' } },
      ] as never[];
      const sprites = [
        sprite('x', 'X', 'masked', 'extra'),
        sprite('a', 'A', 'masked'),
        sprite('b', 'B', 'colored'),
      ] as never[];
      const groups = groupSpritesByPack(sprites, packs, 'fr');
      expect(groups.map((g) => [g.packId, g.name, g.sprites.map((s) => s.id)])).toEqual([
        ['base', 'Socle', ['a', 'b']],
        ['extra', 'Bonus', ['x']],
      ]);
      expect(groupSpritesByPack(sprites, packs, 'en').map((g) => g.name)).toEqual(['Base', 'Extra']);
    });

    it('leaves out the packs that have no sprite', () => {
      const packs = [
        { id: 'base', name: { en: 'Base', fr: 'Base' } },
        { id: 'empty', name: { en: 'Empty', fr: 'Vide' } },
      ] as never[];
      expect(groupSpritesByPack([sprite('a', 'A', 'masked')] as never[], packs, 'en').map((g) => g.packId)).toEqual(['base']);
    });
  });
});
