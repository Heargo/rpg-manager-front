import { inject, Injectable } from '@angular/core';
import { validateCommonTexts } from '../generators/common-texts';
import {
  buildNpcVocabulary,
  NpcVocabulary,
} from '../generators/npc-vocabulary';
import { validateNpcWordList } from '../generators/npc-word-list';
import { PooledSource } from '../packs/pooled-domain';
import { ActivePacksBusiness } from './active-packs.business';
import { LanguageBusiness } from './language.business';
import {
  basePackId,
  isBasePack,
  PackBusiness,
  packLanguageOf,
} from './pack.business';

/** The NPC vocabulary of the world's active packs (the Base of the app language without a world), cached per packs and language. */
@Injectable({ providedIn: 'root' })
export class NpcVocabularyBusiness {
  private readonly packs = inject(PackBusiness);
  private readonly active = inject(ActivePacksBusiness);
  private readonly languageBusiness = inject(LanguageBusiness);
  private cached: { key: string; vocabulary: Promise<NpcVocabulary> } | null =
    null;

  vocabulary(): Promise<NpcVocabulary> {
    const language =
      this.active.$worldLanguage() ??
      packLanguageOf(this.languageBusiness.$language());
    const ids = this.active.$worldPacks() ?? [basePackId(language)];
    const key = JSON.stringify([ids, language]);
    if (this.cached?.key !== key) {
      const vocabulary = this.build(ids, language);
      const entry = { key, vocabulary };
      this.cached = entry;
      // A failed build shouldn't stay cached: retry next time.
      vocabulary.catch(() => {
        if (this.cached === entry) this.cached = null;
      });
    }
    return this.cached.vocabulary;
  }

  private async build(ids: string[], language: string): Promise<NpcVocabulary> {
    await this.packs.load();
    const installed = this.packs.$installed();
    const sources = await Promise.all(
      ids
        .filter((id) => installed.some((p) => p.id === id))
        .map((id) => this.source(id, language)),
    );
    // No active pack with texts in the language: the Base of that language gives them.
    if (!sources.some((s) => s.texts)) {
      const base = basePackId(language);
      const at = sources.findIndex((s) => s.packId === base);
      const source = await this.source(base, language);
      if (at >= 0) sources[at] = source;
      else sources.push(source);
    }
    return buildNpcVocabulary(sources);
  }

  /** What a pack gives: kinds always; texts and params when it speaks the language. */
  private async source(id: string, language: string): Promise<PooledSource> {
    const pack = this.packs.$installed().find((p) => p.id === id);
    const source: PooledSource = {
      packId: id,
      isBase: isBasePack(id),
      ...(pack?.language ? { language: pack.language } : {}),
      kinds: pack?.npcKinds as PooledSource['kinds'],
    };
    if (!pack?.language || pack.language !== language) return source;
    if (pack.generators.npcs) {
      try {
        const result = validateNpcWordList(
          await this.packs.wordList('npcs', id),
        );
        if (result.ok)
          source.texts = result.value as unknown as PooledSource['texts'];
        else
          console.warn(`NPC texts of pack "${id}" are invalid:`, result.errors);
      } catch (error) {
        console.warn(`NPC texts of pack "${id}" could not be loaded:`, error);
      }
    }
    if (pack.common) {
      try {
        const result = validateCommonTexts(await this.packs.commonTexts(id));
        if (result.ok && result.value.params)
          source.params = result.value.params;
      } catch (error) {
        console.warn(
          `Common texts of pack "${id}" could not be loaded:`,
          error,
        );
      }
    }
    return source;
  }
}
