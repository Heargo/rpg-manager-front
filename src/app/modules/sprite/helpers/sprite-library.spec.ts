import { DEMO_SPRITE_ID, searchSprites, SPRITE_LIBRARY, spriteUrl } from './sprite-library';

describe('sprite library', () => {
  it('bundles the 101 sprites of the pack, each id once', () => {
    const ids = SPRITE_LIBRARY.map((s) => s.id);
    expect(ids).toHaveLength(101);
    expect(new Set(ids).size).toBe(101);
  });

  it('uses the axe as the demo sprite', () => {
    expect(SPRITE_LIBRARY.some((s) => s.id === DEMO_SPRITE_ID)).toBe(true);
    expect(DEMO_SPRITE_ID).toBe('axe');
    expect(spriteUrl('axe')).toBe('assets/sprites/axe.png');
  });

  it('returns every sprite, sorted by label in the language, for an empty query', () => {
    const fr = searchSprites('', 'fr');
    expect(fr).toHaveLength(101);
    const labels = fr.map((s) => s.fr);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'fr')));
  });

  it('matches the label in the given language', () => {
    expect(searchSprites('hache', 'fr').map((s) => s.id)).toEqual(['axe', 'waraxe']);
    expect(searchSprites('axe', 'en').map((s) => s.id)).toEqual(['axe', 'pick', 'waraxe']);
  });

  it('ignores case and accents, and needs every word', () => {
    expect(searchSprites('EPEE', 'fr').map((s) => s.id)).toEqual(['sword']);
    expect(searchSprites('hache guerre', 'fr').map((s) => s.id)).toEqual(['waraxe']);
    expect(searchSprites('zzz', 'en')).toEqual([]);
  });
});
