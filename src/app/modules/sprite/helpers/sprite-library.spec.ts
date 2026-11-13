import base from '../../../../../public/packs/base/pack.json';
import { DEMO_SPRITE_ID, searchSprites } from './sprite-library';

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
});
