import { inject, Injectable } from '@angular/core';
import { DEFAULT_LANGUAGE } from '../constants/languages';
import { ClassWordList } from '../generators/class-generator';
import { SkillWordList } from '../generators/skill-generator';
import { isRecord, validateWordList, WordList } from '../generators/word-list';
import { PackBusiness } from './pack.business';
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
  ): Promise<WordList> {
    let words = this.cache.get(lang);
    if (!words) {
      words = this.load(lang);
      this.cache.set(lang, words);
      // A failed load shouldn't stay cached: retry next time.
      words.catch(() => this.cache.delete(lang));
    }
    return words;
  }

  private async load(lang: string): Promise<WordList> {
    try {
      const result = validateWordList(await this.service.wordList('items', lang));
      if (result.ok) return result.value;
      console.warn(`Item word list "${lang}" is invalid:`, result.errors);
    } catch (error) {
      console.warn(`Item word list "${lang}" could not be loaded:`, error);
    }
    if (lang === DEFAULT_LANGUAGE)
      throw new Error('The default item word list is unavailable');
    return this.itemWords(DEFAULT_LANGUAGE);
  }

  private readonly skillCache = new Map<string, Promise<SkillWordList>>();
  private readonly classCache = new Map<string, Promise<ClassWordList>>();

  /** Skill word list for the given language (the active one by default). */
  skillWords(
    lang: string = this.languageBusiness.$language(),
  ): Promise<SkillWordList> {
    return this.cached(
      this.skillCache,
      lang,
      (l) => this.service.wordList('skills', l),
      isSkillWordList,
      (l) => this.skillWords(l),
    );
  }

  /** Class word list for the given language (the active one by default). */
  classWords(
    lang: string = this.languageBusiness.$language(),
  ): Promise<ClassWordList> {
    return this.cached(
      this.classCache,
      lang,
      (l) => this.service.wordList('classes', l),
      isClassWordList,
      (l) => this.classWords(l),
    );
  }

  private cached<T>(
    cache: Map<string, Promise<T>>,
    lang: string,
    load: (lang: string) => Promise<unknown>,
    valid: (json: unknown) => json is T,
    fallback: (lang: string) => Promise<T>,
  ): Promise<T> {
    let words = cache.get(lang);
    if (!words) {
      words = (async () => {
        try {
          const json = await load(lang);
          if (valid(json)) return json;
          console.warn(`Word list "${lang}" is invalid`);
        } catch (error) {
          console.warn(`Word list "${lang}" could not be loaded:`, error);
        }
        if (lang === DEFAULT_LANGUAGE)
          throw new Error('The default word list is unavailable');
        return fallback(DEFAULT_LANGUAGE);
      })();
      cache.set(lang, words);
      words.catch(() => cache.delete(lang));
    }
    return words;
  }
}

const isList = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0;

function isSkillWordList(json: unknown): json is SkillWordList {
  if (
    !isRecord(json) ||
    !isRecord(json['nouns']) ||
    !isRecord(json['descriptions'])
  )
    return false;
  const { nouns, descriptions } = json;
  return (
    isList(json['templates']) &&
    isList(json['adjectives']) &&
    isList(json['suffixes']) &&
    ['active', 'passive'].every(
      (type) =>
        isList((nouns as Record<string, unknown>)[type]) &&
        isList((descriptions as Record<string, unknown>)[type]),
    )
  );
}

function isClassWordList(json: unknown): json is ClassWordList {
  return (
    isRecord(json) &&
    ['templates', 'nouns', 'adjectives', 'suffixes', 'descriptions'].every(
      (key) => isList(json[key]),
    )
  );
}
