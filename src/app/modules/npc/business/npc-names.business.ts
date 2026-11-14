import { inject, Injectable } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import {
  NpcNameList,
  validateNpcNameList,
} from '../../../core/generators/npc-name-list';
import { basePackId, PackBusiness } from '../../../core/business/pack.business';

/** Person-name lists for the NPC generator, per pack, cached; falls back to the Base of the language, then base-en when a list is missing or invalid. */
@Injectable({ providedIn: 'root' })
export class NpcNamesBusiness {
  private readonly service = inject(PackBusiness);
  private readonly languageBusiness = inject(LanguageBusiness);
  private readonly cache = new Map<string, Promise<NpcNameList>>();

  /** Name list for the given language (the active one by default). */
  names(
    lang: string = this.languageBusiness.$language(),
    packId: string = basePackId(lang),
  ): Promise<NpcNameList> {
    const key = packId;
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
        await this.service.wordList('npcs', packId),
      );
      if (result.ok) return result.value;
      console.warn(`NPC name list "${lang}" is invalid:`, result.errors);
    } catch (error) {
      console.warn(`NPC name list "${lang}" could not be loaded:`, error);
    }
    if (packId !== basePackId(lang)) return this.names(lang);
    if (packId === 'base-en')
      throw new Error('The default NPC name list is unavailable');
    return this.names('en', 'base-en');
  }
}
