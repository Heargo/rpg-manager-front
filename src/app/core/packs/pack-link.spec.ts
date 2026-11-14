import { resolvePackLink } from './pack-link';

const raw = 'https://raw.githubusercontent.com';

describe('resolvePackLink', () => {
  it('maps a GitHub repository to pack.json at the root of its default branch', () => {
    expect(resolvePackLink('https://github.com/jane/neon-pack')).toEqual({
      ok: true,
      manifestUrl: `${raw}/jane/neon-pack/HEAD/pack.json`,
      source: 'https://github.com/jane/neon-pack',
    });
  });

  it('maps /tree/<ref> with no path to pack.json at the root of that ref', () => {
    const result = resolvePackLink('https://github.com/jane/neon-pack/tree/v2');

    expect(result).toMatchObject({ ok: true, manifestUrl: `${raw}/jane/neon-pack/v2/pack.json` });
  });

  it('maps /tree/<ref>/<path> to pack.json in that folder', () => {
    const result = resolvePackLink('https://github.com/jane/mono/tree/main/packs/neon');

    expect(result).toEqual({
      ok: true,
      manifestUrl: `${raw}/jane/mono/main/packs/neon/pack.json`,
      source: 'https://github.com/jane/mono/tree/main/packs/neon',
    });
  });

  it('maps /blob/<ref>/<path>/pack.json to the same file on raw', () => {
    const result = resolvePackLink('https://github.com/jane/mono/blob/main/packs/neon/pack.json');

    expect(result).toMatchObject({ ok: true, manifestUrl: `${raw}/jane/mono/main/packs/neon/pack.json` });
  });

  it('tolerates surrounding spaces, a trailing slash and .git', () => {
    for (const link of ['  https://github.com/jane/neon-pack  ', 'https://github.com/jane/neon-pack/', 'https://github.com/jane/neon-pack.git']) {
      expect(resolvePackLink(link), link).toEqual({
        ok: true,
        manifestUrl: `${raw}/jane/neon-pack/HEAD/pack.json`,
        source: 'https://github.com/jane/neon-pack',
      });
    }
  });

  it('keeps a direct HTTPS pack.json URL as is', () => {
    expect(resolvePackLink('https://example.com/packs/neon/pack.json')).toEqual({
      ok: true,
      manifestUrl: 'https://example.com/packs/neon/pack.json',
      source: 'https://example.com/packs/neon/pack.json',
    });
  });

  it('accepts another .json file name over HTTPS', () => {
    expect(resolvePackLink('https://example.com/neon.json')).toMatchObject({
      ok: true,
      manifestUrl: 'https://example.com/neon.json',
    });
  });

  it('refuses blank input, http:, other schemes and github.com links that are not a repository', () => {
    for (const link of [
      '',
      '   ',
      'http://example.com/pack.json',
      'ftp://example.com/pack.json',
      'javascript:alert(1)',
      'file:///etc/pack.json',
      'https://github.com',
      'https://github.com/jane',
      'https://github.com/features/copilot/extra/segments/tree',
      'not a link',
    ]) {
      const result = resolvePackLink(link);
      expect(result.ok, link).toBe(false);
      if (!result.ok) expect(result.error, link).toMatch(/^packs\./);
    }
  });
});
