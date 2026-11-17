import { inject, Injectable } from '@angular/core';
import { validateCommonTexts } from '../generators/common-texts';
import {
  buildClassVocabulary,
  ClassVocabulary,
} from '../generators/class-vocabulary';
import { validateClassWordList } from '../generators/class-word-list';
import { PooledSource } from '../packs/pooled-domain';
import { PackKindSourcesBusiness } from './pack-kind-sources.business';
import { ActivePacksBusiness } from './active-packs.business';
import { LanguageBusiness } from './language.business';
import {
  basePackId,
  isBasePack,
  PackBusiness,
  packLanguageOf,
} from './pack.business';

/** The class vocabulary of the world's active packs (the Base of the app language without a world), cached per packs and language. */
@Injectable({ providedIn: 'root' })
export class ClassVocabularyBusiness {
  private readonly packs = inject(PackBusiness);
  private readonly kindSources = inject(PackKindSourcesBusiness);
  private readonly active = inject(ActivePacksBusiness);
  private readonly languageBusiness = inject(LanguageBusiness);
  private cached: { key: string; vocabulary: Promise<ClassVocabulary> } | null =
    null;

  vocabulary(): Promise<ClassVocabulary> {
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

  private async build(
    ids: string[],
    language: string,
  ): Promise<ClassVocabulary> {
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
    return buildClassVocabulary(sources);
  }

  /** What a pack gives: kinds always; texts and params when it speaks the language. */
  private async source(id: string, language: string): Promise<PooledSource> {
    const pack = this.packs.$installed().find((p) => p.id === id);
    const source: PooledSource = {
      packId: id,
      isBase: isBasePack(id),
      ...(pack?.language ? { language: pack.language } : {}),
      kinds: pack?.classKinds as PooledSource['kinds'],
    };
    source.otherDomains = await this.kindSources.otherDomains(
      id,
      language,
      'classes',
    );
    if (!pack?.language || pack.language !== language) return source;
    if (pack.generators.classes) {
      try {
        const result = validateClassWordList(
          await this.packs.wordList('classes', id),
        );
        if (result.ok)
          source.texts = result.value as unknown as PooledSource['texts'];
        else
          console.warn(
            `Class texts of pack "${id}" are invalid:`,
            result.errors,
          );
      } catch (error) {
        console.warn(`Class texts of pack "${id}" could not be loaded:`, error);
      }
    }
    if (pack.common) {
      try {
        const result = validateCommonTexts(await this.packs.commonTexts(id));
        if (result.ok) {
          if (result.value.params) source.params = result.value.params;
        }
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
