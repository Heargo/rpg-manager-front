import { inject, Injectable } from '@angular/core';
import { ClassWordList } from '../generators/class-generator';
import { isClassWordList } from '../generators/pack-word-lists';
import { basePackId, PackBusiness } from './pack.business';
import { LanguageBusiness } from './language.business';

const FALLBACK_BASE = 'base-en';

/** Class word lists for the generators, per pack, cached; falls back to the Base of the language, then to base-en when a list is missing or invalid. */
@Injectable({ providedIn: 'root' })
export class WordListBusiness {
  private readonly service = inject(PackBusiness);
  private readonly languageBusiness = inject(LanguageBusiness);
  private readonly classCache = new Map<string, Promise<ClassWordList>>();

  /** Class word list for the given language (the active one by default). */
  classWords(
    lang: string = this.languageBusiness.$language(),
    packId: string = basePackId(lang),
  ): Promise<ClassWordList> {
    return this.cached(
      this.classCache,
      lang,
      packId,
      (p) => this.service.wordList('classes', p),
      isClassWordList,
      (l, p) => this.classWords(l, p),
    );
  }

  private cached<T>(
    cache: Map<string, Promise<T>>,
    lang: string,
    packId: string,
    load: (packId: string) => Promise<unknown>,
    valid: (json: unknown) => json is T,
    fallback: (lang: string, packId: string) => Promise<T>,
  ): Promise<T> {
    const key = packId;
    let words = cache.get(key);
    if (!words) {
      words = (async () => {
        try {
          const json = await load(packId);
          if (valid(json)) return json;
          console.warn(`Word list "${lang}" is invalid`);
        } catch (error) {
          console.warn(`Word list "${lang}" could not be loaded:`, error);
        }
        if (packId !== basePackId(lang))
          return fallback(lang, basePackId(lang));
        if (packId === FALLBACK_BASE)
          throw new Error('The default word list is unavailable');
        return fallback('en', FALLBACK_BASE);
      })();
      cache.set(key, words);
      words.catch(() => cache.delete(key));
    }
    return words;
  }
}
