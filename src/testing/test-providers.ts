import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import { ConfirmationService, MessageService } from '@openng/optimus-ui/api';
import { translocoSettings } from '../app/core/i18n/transloco-config';
import en from '../../public/i18n/en.json';
import fr from '../../public/i18n/fr.json';

/** Real translation files, so specs fail when a key is missing. */
export function provideTestTranslations(options: Partial<TranslocoTestingOptions> = {}) {
  return importProvidersFrom(
    TranslocoTestingModule.forRoot({
      langs: { en, fr },
      translocoConfig: { ...translocoSettings('en'), prodMode: true },
      preloadLangs: true,
      ...options,
    }),
  );
}

/** Providers shared by component specs: router, mocked HTTP, translations and Optimus UI services. */
export const TEST_PROVIDERS = [
  provideRouter([{ path: '**', children: [] }]),
  provideHttpClient(),
  provideHttpClientTesting(),
  provideTestTranslations(),
  MessageService,
  ConfirmationService,
  DialogService,
];
