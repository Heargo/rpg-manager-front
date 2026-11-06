import { DOCUMENT, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Translation, TranslocoService } from '@jsverse/transloco';

type TranslateParams = Record<string, unknown>;
import { Optimus } from '@openng/optimus-ui/config';
import { tap } from 'rxjs';
import {
  LANGUAGE_STORAGE_KEY,
  LanguageCode,
  SUPPORTED_LANGUAGES,
} from '../constants/languages';
import { isSupportedLanguage } from '../i18n/initial-language';

@Injectable({ providedIn: 'root' })
export class LanguageBusiness {
  private readonly transloco = inject(TranslocoService);
  private readonly optimus = inject(Optimus);
  private readonly document = inject(DOCUMENT);

  readonly languages = SUPPORTED_LANGUAGES;

  /** Active language; updates as soon as the user switches. */
  readonly $language = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  /** Active translation object; emits once the language file is loaded. Read it to make a computed react to language changes. */
  readonly $translation = toSignal(
    this.transloco.selectTranslation().pipe(
      tap((translation) => {
        this.document.documentElement.lang = this.transloco.getActiveLang();
        if (translation['optimus']) this.optimus.setTranslation(translation['optimus']);
      }),
    ),
    { initialValue: {} as Translation },
  );

  /** Translate in TypeScript. Reactive when called inside a computed/template. */
  t(key: string, params?: TranslateParams): string {
    this.$translation();
    return this.transloco.translate(key, params);
  }

  setLanguage(code: LanguageCode | string): void {
    if (!isSupportedLanguage(code)) return;
    this.transloco.setActiveLang(code);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // Private mode or blocked storage: the choice just won't persist.
    }
  }
}
