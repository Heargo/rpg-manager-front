import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { LANGUAGE_STORAGE_KEY } from '../constants/languages';
import { provideTestTranslations } from '../../../testing/test-providers';
import { LanguageBusiness } from './language.business';

describe('LanguageBusiness', () => {
  let business: LanguageBusiness;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    business = TestBed.inject(LanguageBusiness);
  });

  it('translates in the active language and follows a switch', () => {
    expect(business.t('nav.play')).toBe('Play');

    business.setLanguage('fr');

    expect(business.$language()).toBe('fr');
    expect(business.t('nav.play')).toBe('Jouer');
  });

  it('saves the chosen language and sets the html lang attribute', () => {
    business.setLanguage('fr');
    TestBed.tick();

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
    expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('fr');
  });

  it('ignores unsupported languages', () => {
    business.setLanguage('de');

    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });
});
