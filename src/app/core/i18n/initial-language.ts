import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LanguageCode,
  SUPPORTED_LANGUAGES,
} from '../constants/languages';

export function isSupportedLanguage(code: string | null | undefined): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some((language) => language.code === code);
}

/** Saved choice first, then the browser's preferred languages, then the default. */
export function detectInitialLanguage(
  saved: string | null = readSavedLanguage(),
  browserLanguages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages,
): LanguageCode {
  if (isSupportedLanguage(saved)) return saved;
  for (const tag of browserLanguages) {
    const base = tag.toLowerCase().split('-')[0];
    if (isSupportedLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

function readSavedLanguage(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}
