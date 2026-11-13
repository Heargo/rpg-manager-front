import { inject, Injectable } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { DEFAULT_LANGUAGE } from '../../../core/constants/languages';
import {
  NpcNameList,
  validateNpcNameList,
} from '../../../core/generators/npc-name-list';
import { BASE_PACK_ID, PackBusiness } from '../../../core/business/pack.business';

/** Person-name lists for the NPC generator, per language, cached; falls back to English when a list is missing or invalid. */
@Injectable({ providedIn: 'root' })
export class NpcNamesBusiness {
  private readonly service = inject(PackBusiness);
  private readonly languageBusiness = inject(LanguageBusiness);
  private readonly cache = new Map<string, Promise<NpcNameList>>();

  /** Name list for the given language (the active one by default). */
  names(
    lang: string = this.languageBusiness.$language(),
    packId: string = BASE_PACK_ID,
  ): Promise<NpcNameList> {
    const key = `${packId}:${lang}`;
    let names = this.cache.get(key);
    if (!names) {
      names = this.load(lang, packId);
      this.cache.set(key, names);
      // A failed load shouldn't stay cached: retry next time.
      names.catch(() => this.cache.delete(key));
    }
    return names;
  }

  private async load(lang: string, packId: string): Promise<NpcNameList> {
    try {
      const result = validateNpcNameList(
        await this.service.wordList('npcs', lang, packId),
      );
      if (result.ok) return result.value;
      console.warn(`NPC name list "${lang}" is invalid:`, result.errors);
    } catch (error) {
      console.warn(`NPC name list "${lang}" could not be loaded:`, error);
    }
    if (packId !== BASE_PACK_ID) return this.names(lang, BASE_PACK_ID);
    if (lang === DEFAULT_LANGUAGE)
      throw new Error('The default NPC name list is unavailable');
    return this.names(DEFAULT_LANGUAGE);
  }
}
