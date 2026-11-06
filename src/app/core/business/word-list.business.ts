import { inject, Injectable } from '@angular/core';
import { DEFAULT_LANGUAGE } from '../constants/languages';
import { validateWordList, WordList } from '../generators/word-list';
import { WordListService } from '../services/word-list.service';
import { LanguageBusiness } from './language.business';

/** Item word lists for the generators, per language, cached; falls back to English when a list is missing or invalid. */
@Injectable({ providedIn: 'root' })
export class WordListBusiness {
  private readonly service = inject(WordListService);
  private readonly languageBusiness = inject(LanguageBusiness);
  private readonly cache = new Map<string, Promise<WordList>>();

  /** Word list for the given language (the active one by default). */
  itemWords(lang: string = this.languageBusiness.$language()): Promise<WordList> {
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
      const result = validateWordList(await this.service.loadItemWords(lang));
      if (result.ok) return result.value;
      console.warn(`Item word list "${lang}" is invalid:`, result.errors);
    } catch (error) {
      console.warn(`Item word list "${lang}" could not be loaded:`, error);
    }
    if (lang === DEFAULT_LANGUAGE) throw new Error('The default item word list is unavailable');
    return this.itemWords(DEFAULT_LANGUAGE);
  }
}
