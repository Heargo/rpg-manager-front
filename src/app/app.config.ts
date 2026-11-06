import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  isDevMode,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './core/constants/languages';
import { detectInitialLanguage } from './core/i18n/initial-language';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';
import { LanguageBusiness } from './core/business/language.business';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideOptimus } from '@openng/optimus-ui/config';
import { MessageService } from '@openng/optimus-ui/api';
import { DialogService } from '@openng/optimus-ui/dynamicdialog';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { UiRpgPreset } from './ui.preset';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenInterceptor]), withFetch()),
    provideTransloco({
      config: {
        availableLangs: SUPPORTED_LANGUAGES.map((language) => language.code),
        defaultLang: detectInitialLanguage(),
        fallbackLang: DEFAULT_LANGUAGE,
        missingHandler: { useFallbackTranslation: true },
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    // Load the starting language before the first render (no flash of keys), and start LanguageBusiness.
    provideAppInitializer(() => {
      const transloco = inject(TranslocoService);
      inject(LanguageBusiness);
      return firstValueFrom(transloco.load(transloco.getActiveLang()));
    }),
    MessageService,
    DialogService,
    provideOptimus({
      theme: {
        preset: UiRpgPreset,
        options: {
          darkModeSelector: '.dark',
        },
      },
      zIndex: {
        modal: 1100, // dialog, sidebar
        overlay: 1000, // dropdown, overlaypanel
        menu: 1000, // overlay menus
        tooltip: 1100, // tooltip
      },
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
