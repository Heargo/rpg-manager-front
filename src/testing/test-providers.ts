import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideTranslateLoader,
  provideTranslateService,
  TranslateLoader,
  TranslateService,
  TranslationObject,
} from '@ngx-translate/core';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { Observable, of } from 'rxjs';
import { translateSettings } from '../app/core/i18n/translate-config';
import en from '../../public/i18n/en.json';
import fr from '../../public/i18n/fr.json';

const REAL_LANGS: Record<string, TranslationObject> = { en, fr };

/** Serves the given translations synchronously, so `use('fr')` switches at once in a spec. */
function staticLoader(langs: Record<string, TranslationObject>): TranslateLoader {
  return { getTranslation: (lang: string): Observable<TranslationObject> => of(langs[lang] ?? {}) };
}

/** Real translation files, so specs fail when a key is missing. `langs: {}` simulates translations not loaded yet. */
export function provideTestTranslations(options: { langs?: Record<string, TranslationObject> } = {}) {
  const langs = options.langs ?? REAL_LANGS;
  return [
    provideTranslateService({
      ...translateSettings('en'),
      loader: provideTranslateLoader(() => staticLoader(langs)),
    }),
    // Loads the starting language synchronously, before the spec's first `TestBed.inject`.
    provideAppInitializer(() => {
      inject(TranslateService).use('en');
    }),
  ];
}

/** Providers shared by component specs: router, mocked HTTP, translations and Optimus UI services. */
export const TEST_PROVIDERS = [
  provideRouter([]),
  provideHttpClient(),
  provideHttpClientTesting(),
  provideTestTranslations(),
  MessageService,
  ConfirmationService,
  DialogService,
];
