import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validatePack } from './pack';

const base = (): Record<string, unknown> => ({
  format: 2,
  id: 'scenery',
  name: 'Scenery',
  description: 'Landscapes',
  version: '1.0.0',
  author: 'Someone',
  license: 'CC0-1.0',
  licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
});
const image = (extra: Record<string, unknown> = {}) => ({
  id: 'mountains-night',
  label: 'Mountains at night',
  image: 'worlds/mountains-night.webp',
  tags: ['mountain', 'night'],
  source: 'https://www.vecteezy.com/vector-art/7095576',
  ...extra,
});
const withImages = (worldImages: unknown) => ({ ...base(), worldImages });
const errorsOf = (json: unknown): string[] => {
  const result = validatePack(json);
  if (result.ok) throw new Error('expected an invalid pack');
  expect(result.errors.filter((e) => e.includes('unknown field'))).toEqual([]);
  return result.errors;
};

describe('validatePack: worldImages', () => {
  it('accepts a neutral pack with world images and returns them', () => {
    const result = validatePack(withImages([image(), image({ id: 'desert', image: 'worlds/desert.png', tags: undefined, source: undefined })]));

    expect(result.ok).toBe(true);
    if (result.ok) expect((result.value as any).worldImages).toHaveLength(2);
  });

  it('still accepts a pack without world images', () => {
    expect(validatePack(base()).ok).toBe(true);
  });

  it.each(['Mountains Night', 'mountains_night', '-x', ''])('rejects the id "%s"', (id) => {
    expect(errorsOf(withImages([image({ id })])).some((e) => e.includes('worldImages'))).toBe(true);
  });

  it('rejects an id used twice', () => {
    expect(errorsOf(withImages([image(), image()])).some((e) => e.includes('twice'))).toBe(true);
  });

  it('rejects a label that is missing, and an image that is not a relative path', () => {
    expect(errorsOf(withImages([image({ label: '' })])).some((e) => e.includes('label'))).toBe(true);
    expect(errorsOf(withImages([image({ image: '../x.webp' })])).some((e) => e.includes('image'))).toBe(true);
    expect(errorsOf(withImages([image({ image: 'https://x.test/a.webp' })])).some((e) => e.includes('image'))).toBe(true);
  });

  it('rejects a source that is not an https URL', () => {
    expect(errorsOf(withImages([image({ source: 'http://x.test/a' })])).some((e) => e.includes('source'))).toBe(true);
    expect(errorsOf(withImages([image({ source: 'javascript:alert(1)' })])).some((e) => e.includes('source'))).toBe(true);
  });

  it('rejects tags that are not a list of short lowercase words', () => {
    expect(errorsOf(withImages([image({ tags: 'mountain' })])).some((e) => e.includes('tags'))).toBe(true);
    expect(errorsOf(withImages([image({ tags: ['Mountain'] })])).some((e) => e.includes('tags'))).toBe(true);
  });

  it('rejects worldImages that is not a list', () => {
    expect(errorsOf(withImages({})).some((e) => e.includes('worldImages'))).toBe(true);
  });
});

const NINE: [string, string[], string][] = [
  ['mountains-night', ['mountain', 'night'], 'https://www.vecteezy.com/vector-art/7095576-mountains-in-the-night-sky-near-the-clouds-vector-flat-illustration-landscape'],
  ['blue-mountains-fog', ['mountain', 'fog', 'sunset'], 'https://www.vecteezy.com/vector-art/7162595-beautiful-blue-mountain-landscape-silhouette-with-fog-and-sunrise-and-sunset-in-mountains-background-outdoor-and-hiking-concept-sun-in-the-sky-vector-good-for-wallpaper-site-banner-cover-poster'],
  ['arctic-iceberg-sunset', ['ice', 'snow', 'ocean', 'sunset'], 'https://www.vecteezy.com/vector-art/11513279-beautiful-sunset-arctic-or-antartic-iceberg-landscape-illustration'],
  ['desert-mountains', ['desert', 'mountain'], 'https://www.vecteezy.com/vector-art/23103479-abstract-flat-desert-mountain-landscape-vector-background-scenery-flat-desert-mountain-landscape-vector-background-earth-tone-scenery-flat-desert-mountain-landscape-vector'],
  ['green-valley-morning', ['plains', 'forest', 'mountain', 'morning'], 'https://www.vecteezy.com/vector-art/12991429-cartoon-nature-landscape-early-morning-background'],
  ['underwater-wreck', ['ocean', 'underwater'], 'https://www.vecteezy.com/vector-art/273915-ocean-background'],
  ['pine-mountains-morning', ['mountain', 'forest', 'morning'], 'https://www.vecteezy.com/vector-art/8277964-landscape-of-mountains-and-pine-forests-in-the-morning-or-evening'],
  ['pine-mountains-winter', ['mountain', 'forest', 'winter'], 'https://www.vecteezy.com/vector-art/8277965-mountain-landscape-with-pines-and-forests-under-winter-skies'],
  ['forest-mountains-silhouette', ['mountain', 'forest', 'river'], 'https://www.vecteezy.com/vector-art/14487928-silhouette-of-nature-landscape-mountains-forest-in-background-blue-and-green-illustration'],
];

describe('the real base-assets pack: world images', () => {
  const dir = join(process.cwd(), 'public/packs/base-assets');
  const manifest = () => JSON.parse(readFileSync(join(dir, 'pack.json'), 'utf8'));

  it('is still valid with its world images', () => {
    const result = validatePack(manifest());
    if (!result.ok) throw new Error(result.errors.join('\n'));
    expect((result.value as any).worldImages).toHaveLength(9);
  });

  it.each(NINE)('lists %s with its tags, its source and its file on disk', (id, tags, source) => {
    const entry = manifest().worldImages?.find((w: any) => w.id === id);

    expect(entry).toBeDefined();
    expect(entry.image).toBe(`worlds/${id}.webp`);
    expect(entry.tags).toEqual(tags);
    expect(entry.source).toBe(source);
    expect(typeof entry.label).toBe('string');
    expect(entry.label.length).toBeGreaterThan(0);
    expect(existsSync(join(dir, entry.image))).toBe(true);
  });

  it('has "RPG Manager" as author and a notice naming Vecteezy', () => {
    expect(manifest().author).toBe('RPG Manager');
    expect(manifest().notice).toContain('Vecteezy');
  });
});

describe('validatePack: notice', () => {
  it('accepts a plain string notice and returns it', () => {
    const result = validatePack({ ...base(), notice: 'Landscapes from Vecteezy' });

    expect(result.ok).toBe(true);
    if (result.ok) expect((result.value as any).notice).toBe('Landscapes from Vecteezy');
  });

  it.each([42, ['x'], { a: 1 }, ''])('rejects a notice that is %j', (notice) => {
    expect(errorsOf({ ...base(), notice}).some((e) => e.includes('notice'))).toBe(true);
  });
});
