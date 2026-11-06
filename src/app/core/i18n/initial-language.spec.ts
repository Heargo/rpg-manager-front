import { detectInitialLanguage, isSupportedLanguage } from './initial-language';

describe('detectInitialLanguage', () => {
  it('uses the saved language first', () => {
    expect(detectInitialLanguage('fr', ['en-US'])).toBe('fr');
  });

  it('ignores an unsupported saved language and falls back to the browser', () => {
    expect(detectInitialLanguage('de', ['fr-CA', 'en'])).toBe('fr');
  });

  it('takes the first supported browser language, matching the base tag', () => {
    expect(detectInitialLanguage(null, ['de-DE', 'FR-be', 'en'])).toBe('fr');
  });

  it('defaults to English when nothing matches', () => {
    expect(detectInitialLanguage(null, ['de', 'es'])).toBe('en');
    expect(detectInitialLanguage(null, [])).toBe('en');
  });
});

describe('isSupportedLanguage', () => {
  it('accepts only listed codes', () => {
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('fr')).toBe(true);
    expect(isSupportedLanguage('fr-FR')).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
  });
});
