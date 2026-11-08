import { inject, Injectable } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { DEFAULT_LANGUAGE } from '../../../core/constants/languages';
import {
  NpcNameList,
  validateNpcNameList,
} from '../../../core/generators/npc-name-list';
import { WordListService } from '../../../core/services/word-list.service';

/** Person-name lists for the NPC generator, per language, cached; falls back to English when a list is missing or invalid. */
@Injectable({ providedIn: 'root' })
export class NpcNamesBusiness {
  private readonly service = inject(WordListService);
  private readonly languageBusiness = inject(LanguageBusiness);
  private readonly cache = new Map<string, Promise<NpcNameList>>();

  /** Name list for the given language (the active one by default). */
  names(
    lang: string = this.languageBusiness.$language(),
  ): Promise<NpcNameList> {
    let names = this.cache.get(lang);
    if (!names) {
      names = this.load(lang);
      this.cache.set(lang, names);
      // A failed load shouldn't stay cached: retry next time.
      names.catch(() => this.cache.delete(lang));
    }
    return names;
  }

  private async load(lang: string): Promise<NpcNameList> {
    try {
      const result = validateNpcNameList(await this.service.loadNpcNames(lang));
      if (result.ok) return result.value;
      console.warn(`NPC name list "${lang}" is invalid:`, result.errors);
    } catch (error) {
      console.warn(`NPC name list "${lang}" could not be loaded:`, error);
    }
    if (lang === DEFAULT_LANGUAGE)
      throw new Error('The default NPC name list is unavailable');
    return this.names(DEFAULT_LANGUAGE);
  }
}
