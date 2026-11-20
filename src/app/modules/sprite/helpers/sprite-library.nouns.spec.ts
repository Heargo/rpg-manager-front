import baseAssets from '../../../../../public/packs/base-assets/pack.json';
import { baseItemVocabulary } from '../../../../testing/base-vocabulary';
import { searchSprites, spriteLabel } from './sprite-library';

/** The neutral pack's sprites, as PackBusiness exposes them. */
const sprites = baseAssets.sprites.map((s) => ({
  ...s,
  packId: baseAssets.id,
  imageUrl: `packs/${baseAssets.id}/${s.image}`,
})) as never[];

const fr = baseItemVocabulary('fr');
const en = baseItemVocabulary('en');
const ids = (found: { id: string }[]) => found.map((s) => s.id);
const axe = sprites.find((s: any) => s.id === 'axe') as any;

describe('sprite labels from the noun of the kind in the active Base', () => {
  it('reads the French noun of the kind with Base FR', () => {
    expect(spriteLabel(axe, fr)).toBe('Hache');
  });

  it('reads the English noun of the kind with Base EN', () => {
    expect(spriteLabel(axe, en)).toBe('Axe');
  });

  it('falls back to the sprite label when the kind has no noun', () => {
    const odd = { ...axe, kinds: ['no-such-kind'], label: 'Mystery' };

    expect(spriteLabel(odd, fr)).toBe('Mystery');
  });

  it('falls back to the sprite label without a vocabulary', () => {
    expect(spriteLabel(axe)).toBe(axe.label);
  });

  it('finds the axe sprite searching "hache" in French', () => {
    const found = searchSprites(sprites, 'hache', 'fr', null, fr);

    expect(ids(found)).toContain('axe');
    expect(found.every((s) => spriteLabel(s, fr).toLowerCase().includes('hache'))).toBe(true);
  });

  it('ignores case and accents in French, and needs every word', () => {
    expect(ids(searchSprites(sprites, 'EPEE', 'fr', null, fr))).toContain('sword');
    expect(searchSprites(sprites, 'hache zzz', 'fr', null, fr)).toEqual([]);
  });

  it('does not match the English label while searching in French', () => {
    expect(searchSprites(sprites, 'sword', 'fr', null, fr)).toEqual([]);
  });

  it('does not match "hache" in English, and finds the axe by its English noun', () => {
    expect(searchSprites(sprites, 'hache', 'en', null, en)).toEqual([]);
    expect(ids(searchSprites(sprites, 'axe', 'en', null, en))).toContain('axe');
  });

  it('sorts the French results by their French label', () => {
    const labels = searchSprites(sprites, '', 'fr', null, fr).map((s) => spriteLabel(s, fr));

    expect(labels).toHaveLength(101);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'fr')));
  });
});
