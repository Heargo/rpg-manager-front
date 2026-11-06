import { isDevMode } from '@angular/core';
import { TranslocoConfig, translocoConfig } from '@jsverse/transloco';
import { DEFAULT_LANGUAGE, LanguageCode, SUPPORTED_LANGUAGES } from '../constants/languages';

/** Transloco settings shared by the app and the specs. */
export function translocoSettings(activeLang: LanguageCode): TranslocoConfig {
  return translocoConfig({
    availableLangs: SUPPORTED_LANGUAGES.map((language) => language.code),
    defaultLang: activeLang,
    fallbackLang: DEFAULT_LANGUAGE,
    missingHandler: { useFallbackTranslation: true },
    reRenderOnLangChange: true,
    prodMode: !isDevMode(),
  });
}
