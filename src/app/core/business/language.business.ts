import { DOCUMENT, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService, TranslationObject } from '@ngx-translate/core';
import { Optimus } from '@openng/optimus-ui/config';
import { map, merge, startWith, tap } from 'rxjs';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LanguageCode,
  SUPPORTED_LANGUAGES,
} from '../constants/languages';
import { isSupportedLanguage } from '../i18n/initial-language';

type TranslateParams = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class LanguageBusiness {
  private readonly translate = inject(TranslateService);
  private readonly optimus = inject(Optimus);
  private readonly document = inject(DOCUMENT);

  readonly languages = SUPPORTED_LANGUAGES;

  /** Active language; updates once the new language file is loaded. */
  readonly $language = toSignal(this.translate.onLangChange.pipe(map((event) => event.lang)), {
    initialValue: this.translate.getCurrentLang() ?? DEFAULT_LANGUAGE,
  });

  /** Active translation object; emits once the language file is loaded. Read it to make a computed react to language changes. */
  readonly $translation = toSignal(
    merge(
      this.translate.onLangChange.pipe(map((event) => event.translations)),
      this.translate.onTranslationChange.pipe(map((event) => event.translations)),
    ).pipe(
      startWith(this.currentTranslations()),
      tap((translation) => {
        const lang = this.translate.getCurrentLang();
        if (lang) this.document.documentElement.lang = lang;
        const optimus = translation['optimus'];
        if (optimus) this.optimus.setTranslation(optimus as Parameters<Optimus['setTranslation']>[0]);
      }),
    ),
    { initialValue: {} as TranslationObject },
  );

  /** Translate in TypeScript. Reactive when called inside a computed/template. */
  t(key: string, params?: TranslateParams): string {
    this.$translation();
    return this.translate.instant(key, params) as string;
  }

  setLanguage(code: LanguageCode | string): void {
    if (!isSupportedLanguage(code)) return;
    this.translate.use(code);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // Private mode or blocked storage: the choice just won't persist.
    }
  }

  private currentTranslations(): TranslationObject {
    const lang = this.translate.getCurrentLang();
    // Undefined until the language file is loaded.
    return ((lang && this.translate.getTranslations(lang)) || {}) as TranslationObject;
  }
}
