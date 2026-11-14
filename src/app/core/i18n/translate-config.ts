import { RootTranslateServiceConfig } from '@ngx-translate/core';
import { DEFAULT_LANGUAGE, LanguageCode, SUPPORTED_LANGUAGES } from '../constants/languages';

/** ngx-translate settings shared by the app and the specs. A missing key falls back to the default language. */
export function translateSettings(activeLang: LanguageCode): RootTranslateServiceConfig {
  return {
    lang: activeLang,
    fallbackLang: DEFAULT_LANGUAGE,
    langs: SUPPORTED_LANGUAGES.map((language) => language.code),
  };
}
