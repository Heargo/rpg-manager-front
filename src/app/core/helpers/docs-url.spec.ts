import { docsUrl } from './docs-url';

describe('docsUrl', () => {
  it('opens the user documentation in the app language (French at the root)', () => {
    expect(docsUrl('fr')).toBe('/docs/');
    expect(docsUrl('en')).toBe('/docs/en/');
  });

  it('falls back to French for an unknown language', () => {
    expect(docsUrl(undefined)).toBe('/docs/');
  });
});
