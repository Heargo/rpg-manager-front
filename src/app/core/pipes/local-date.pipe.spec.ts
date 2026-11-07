import { TestBed } from '@angular/core/testing';
import { LanguageBusiness } from '../business/language.business';
import { provideTestTranslations } from '../../../testing/test-providers';
import { LocalDatePipe } from './local-date.pipe';

describe('LocalDatePipe', () => {
  const date = new Date(2026, 10, 7, 9, 35);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideTestTranslations(), LocalDatePipe] });
  });

  it('formats in the active language and follows a switch', () => {
    const pipe = TestBed.runInInjectionContext(() => new LocalDatePipe());
    expect(pipe.transform(date)).toBe('Nov 7, 2026');

    TestBed.inject(LanguageBusiness).setLanguage('fr');

    expect(pipe.transform(date)).toBe('7 nov. 2026');
    expect(pipe.transform(date, 'dateTime')).toBe('07/11/2026 09:35');
  });

  it('returns an empty string without a value', () => {
    const pipe = TestBed.runInInjectionContext(() => new LocalDatePipe());
    expect(pipe.transform(undefined)).toBe('');
  });
});
