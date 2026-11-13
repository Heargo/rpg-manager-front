import { inject, Injectable } from '@angular/core';
import { DEFAULT_LANGUAGE } from '../constants/languages';
import { ClassWordList } from '../generators/class-generator';
import { SkillWordList } from '../generators/skill-generator';
import { isClassWordList, isSkillWordList } from '../generators/pack-word-lists';
import { validateWordList, WordList } from '../generators/word-list';
import { BASE_PACK_ID, PackBusiness } from './pack.business';
import { LanguageBusiness } from './language.business';

/** Item word lists for the generators, per language, cached; falls back to English when a list is missing or invalid. */
@Injectable({ providedIn: 'root' })
export class WordListBusiness {
  private readonly service = inject(PackBusiness);
  private readonly languageBusiness = inject(LanguageBusiness);
  private readonly cache = new Map<string, Promise<WordList>>();

  /** Word list for the given language (the active one by default). */
  itemWords(
    lang: string = this.languageBusiness.$language(),
    packId: string = BASE_PACK_ID,
  ): Promise<WordList> {
    const key = `${packId}:${lang}`;
    let words = this.cache.get(key);
    if (!words) {
      words = this.load(lang, packId);
      this.cache.set(key, words);
      // A failed load shouldn't stay cached: retry next time.
      words.catch(() => this.cache.delete(key));
    }
    return words;
  }

  private async load(lang: string, packId: string): Promise<WordList> {
    try {
      const result = validateWordList(
        await this.service.wordList('items', lang, packId),
      );
      if (result.ok) return result.value;
      console.warn(`Item word list "${lang}" is invalid:`, result.errors);
    } catch (error) {
      console.warn(`Item word list "${lang}" could not be loaded:`, error);
    }
    if (packId !== BASE_PACK_ID) return this.itemWords(lang, BASE_PACK_ID);
    if (lang === DEFAULT_LANGUAGE)
      throw new Error('The default item word list is unavailable');
    return this.itemWords(DEFAULT_LANGUAGE);
  }

  private readonly skillCache = new Map<string, Promise<SkillWordList>>();
  private readonly classCache = new Map<string, Promise<ClassWordList>>();

  /** Skill word list for the given language (the active one by default). */
  skillWords(
    lang: string = this.languageBusiness.$language(),
    packId: string = BASE_PACK_ID,
  ): Promise<SkillWordList> {
    return this.cached(
      this.skillCache,
      lang,
      packId,
      (l, p) => this.service.wordList('skills', l, p),
      isSkillWordList,
      (l, p) => this.skillWords(l, p),
    );
  }

  /** Class word list for the given language (the active one by default). */
  classWords(
    lang: string = this.languageBusiness.$language(),
    packId: string = BASE_PACK_ID,
  ): Promise<ClassWordList> {
    return this.cached(
      this.classCache,
      lang,
      packId,
      (l, p) => this.service.wordList('classes', l, p),
      isClassWordList,
      (l, p) => this.classWords(l, p),
    );
  }

  private cached<T>(
    cache: Map<string, Promise<T>>,
    lang: string,
    packId: string,
    load: (lang: string, packId: string) => Promise<unknown>,
    valid: (json: unknown) => json is T,
    fallback: (lang: string, packId: string) => Promise<T>,
  ): Promise<T> {
    const key = `${packId}:${lang}`;
    let words = cache.get(key);
    if (!words) {
      words = (async () => {
        try {
          const json = await load(lang, packId);
          if (valid(json)) return json;
          console.warn(`Word list "${lang}" is invalid`);
        } catch (error) {
          console.warn(`Word list "${lang}" could not be loaded:`, error);
        }
        if (packId !== BASE_PACK_ID) return fallback(lang, BASE_PACK_ID);
        if (lang === DEFAULT_LANGUAGE)
          throw new Error('The default word list is unavailable');
        return fallback(DEFAULT_LANGUAGE, BASE_PACK_ID);
      })();
      cache.set(key, words);
      words.catch(() => cache.delete(key));
    }
    return words;
  }
}
