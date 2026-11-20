import { inject, Injectable } from '@angular/core';
import { validateClassWordList } from '../generators/class-word-list';
import { validateNpcWordList } from '../generators/npc-word-list';
import { validateSkillWordList } from '../generators/skill-word-list';
import { validateItemWordList } from '../generators/word-list';
import { DomainSource, KindDomain, PooledSource } from '../packs/pooled-domain';
import { PackBusiness } from './pack.business';

const DOMAINS: readonly KindDomain[] = ['items', 'npcs', 'skills', 'classes'];

/** The kinds and texts of the domains other than the one a vocabulary is built for, so `{kind id}` can refer to them. */
@Injectable({ providedIn: 'root' })
export class PackKindSourcesBusiness {
  private readonly packs = inject(PackBusiness);

  /** `otherDomains` of a pooled source: every domain but `own`; the texts only when the pack speaks the language. */
  async otherDomains(
    packId: string,
    language: string,
    own: KindDomain,
  ): Promise<NonNullable<PooledSource['otherDomains']>> {
    const pack = this.packs.$installed().find((p) => p.id === packId);
    const result: NonNullable<PooledSource['otherDomains']> = {};
    if (!pack) return result;
    for (const domain of DOMAINS.filter((d) => d !== own)) {
      const kinds = {
        items: pack.kinds,
        npcs: pack.npcKinds,
        skills: pack.skillKinds,
        classes: pack.classKinds,
      }[domain] as DomainSource['kinds'];
      const source: DomainSource = { ...(kinds ? { kinds } : {}) };
      const generator = pack.generators?.[domain];
      if (pack.language === language && generator) {
        try {
          const raw = await this.packs.wordList(domain, packId);
          const validated = {
            items: validateItemWordList,
            npcs: validateNpcWordList,
            skills: validateSkillWordList,
            classes: validateClassWordList,
          }[domain](raw);
          if (validated.ok)
            source.texts = validated.value as unknown as DomainSource['texts'];
        } catch (error) {
          console.warn(
            `The ${domain} texts of pack "${packId}" could not be loaded:`,
            error,
          );
        }
      }
      if (source.kinds || source.texts) result[domain] = source;
    }
    return result;
  }
}
