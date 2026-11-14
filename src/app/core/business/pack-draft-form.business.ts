import { inject, Injectable } from '@angular/core';
import { validateCommonTexts } from '../generators/common-texts';
import { generateItem } from '../generators/item-generator';
import {
  buildItemVocabulary,
  ItemVocabulary,
} from '../generators/item-vocabulary';
import { seededRandomSource } from '../generators/random-source';
import { validateItemWordList } from '../generators/word-list';
import { ItemDraft, ITEM_RARITIES, ItemRarity } from '../models/item';
import { KindKey } from '../packs/kind-label';
import { validatePack } from '../packs/pack';
import { buildPack, PackDraft } from '../packs/pack-draft';
import { PooledSource } from '../packs/pooled-domain';
import { LanguageBusiness } from './language.business';
import {
  basePackId,
  InstalledPack,
  PackBusiness,
  packLanguageOf,
} from './pack.business';

/** What the autocompletes of the pack form propose: the keys of the installed packs and of the draft. */
export interface KnownKeys {
  kinds: KindKey[];
  tints: string[];
  params: string[];
}

/** A validation message of the draft, with the field it concerns. */
export interface DraftIssue {
  level: 'error' | 'warning';
  message: string;
  kind?: string;
  tint?: string;
  param?: string;
  rarity?: ItemRarity;
}

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The first noun of each kind of a (raw) items word list. */
function firstNouns(list: unknown): Map<string, string> {
  const result = new Map<string, string>();
  const kinds = isRecord(list) && isRecord(list['kinds']) ? list['kinds'] : {};
  for (const [id, texts] of Object.entries(kinds)) {
    const nouns = isRecord(texts) ? texts['nouns'] : undefined;
    const first = Array.isArray(nouns) ? nouns[0] : undefined;
    if (isRecord(first) && typeof first['text'] === 'string')
      result.set(id, first['text']);
  }
  return result;
}

const paramsOf = (common: unknown): Record<string, string[]> =>
  isRecord(common) && isRecord(common['params'])
    ? (common['params'] as Record<string, string[]>)
    : {};

const RARITY = new RegExp(`\\.(${ITEM_RARITIES.join('|')})\\b`);

/** The field a validator message is about: its kind, tint, param or rarity. */
function fieldOf(
  message: string,
): Pick<DraftIssue, 'kind' | 'tint' | 'param' | 'rarity'> {
  const field: Pick<DraftIssue, 'kind' | 'tint' | 'param' | 'rarity'> = {};
  const kind = /\bkinds\.([a-z0-9]+(?:-[a-z0-9]+)*)/.exec(message);
  if (kind) field.kind = kind[1];
  const tint =
    /^tint "([^"]+)"/.exec(message) ??
    /\btints\.([a-z0-9]+(?:-[a-z0-9]+)*)/.exec(message);
  if (tint) field.tint = tint[1];
  const param =
    /^param \{([^}]+)\}/.exec(message) ??
    /\bparams\.([a-z0-9]+(?:-[a-z0-9]+)*)/.exec(message);
  if (param) field.param = param[1];
  const rarity = RARITY.exec(message);
  if (rarity) field.rarity = rarity[1] as ItemRarity;
  return field;
}

/** What the pack form needs beyond editing the draft: known keys, sprite coverage, previews and field-level issues. */
@Injectable({ providedIn: 'root' })
export class PackDraftFormBusiness {
  private readonly packs = inject(PackBusiness);
  private readonly language = inject(LanguageBusiness);
  private cache: {
    installed: InstalledPack[];
    language: string;
    value: Promise<Installed>;
  } | null = null;

  /** The kinds (with their first noun in the app language), tints and param names of the installed packs and the draft. */
  async knownKeys(draft?: PackDraft): Promise<KnownKeys> {
    const installed = await this.installed();
    const nouns = new Map(installed.nouns);
    for (const [id, noun] of firstNouns(draft?.generators.items))
      nouns.set(id, noun);
    const ids = new Set([
      ...installed.kinds,
      ...Object.keys(draft?.kinds ?? {}),
    ]);
    return {
      kinds: [...ids].map((id) =>
        nouns.has(id) ? { id, noun: nouns.get(id) } : { id },
      ),
      tints: [
        ...new Set([...installed.tints, ...Object.keys(draft?.tints ?? {})]),
      ],
      params: [
        ...new Set([
          ...installed.params,
          ...Object.keys(paramsOf(draft?.common)),
        ]),
      ],
    };
  }

  /** The draft's kinds whose chain (the kind, its parent, …) has no sprite in the draft or the installed packs. */
  async coverage(draft: PackDraft): Promise<string[]> {
    if (Object.keys(draft.kinds).length === 0) return [];
    const installed = await this.installed();
    const covered = new Set<string>([
      ...draft.sprites.flatMap((sprite) => sprite.kinds),
      ...installed.spriteKinds,
    ]);
    const parentOf = (id: string): string | undefined =>
      draft.kinds[id]?.parent ?? installed.parents.get(id);
    return Object.keys(draft.kinds).filter((id) => {
      const seen = new Set<string>();
      for (
        let at: string | undefined = id;
        at && !seen.has(at);
        at = parentOf(at)
      ) {
        if (covered.has(at)) return false;
        seen.add(at);
      }
      return true;
    });
  }

  /** Draws `count` items of a kind with the draft plus the Base of its language; same draft and kind, same items. */
  async preview(
    draft: PackDraft,
    kind: string,
    count = 3,
  ): Promise<ItemDraft[]> {
    const vocabulary = await this.vocabulary(draft);
    const info = vocabulary.kind(kind);
    if (!info || vocabulary.nouns(kind).length === 0) return [];
    const only: ItemVocabulary = { ...vocabulary, drawable: () => [kind] };
    const source = seededRandomSource(`${draft.id}:${kind}`);
    return Array.from({ length: count }, () =>
      generateItem(source, only, { attributes: [], type: info.type }),
    );
  }

  /** The errors and warnings of the draft, each with the kind, tint, param or rarity it is about. */
  async issues(draft: PackDraft): Promise<DraftIssue[]> {
    const issues: DraftIssue[] = [];
    const add = (level: DraftIssue['level'], messages: readonly string[]) => {
      for (const message of messages)
        issues.push({ level, message, ...fieldOf(message) });
    };
    const { manifest } = buildPack(draft);
    const pack = validatePack(manifest);
    if (!pack.ok) add('error', pack.errors);
    else add('warning', pack.warnings);

    const items = draft.generators.items;
    if (isRecord(items)) {
      const known = await this.knownKeys(draft);
      const list = validateItemWordList(items, known.params);
      if (!list.ok) add('error', list.errors);
      else add('warning', list.warnings);
    }
    if (draft.common !== undefined) {
      const common = validateCommonTexts(draft.common);
      if (!common.ok) add('error', common.errors);
    }
    return issues;
  }

  // --- the installed packs ----------------------------------------------------------------------------------

  private installed(): Promise<Installed> {
    return this.packs.load().then(() => {
      const installed = this.packs.$installed();
      const language = this.language.$language();
      if (
        this.cache?.installed !== installed ||
        this.cache.language !== language
      ) {
        const value = this.readInstalled(installed, language);
        const entry = { installed, language, value };
        this.cache = entry;
        value.catch(() => {
          if (this.cache === entry) this.cache = null;
        });
      }
      return this.cache.value;
    });
  }

  private async readInstalled(
    installed: InstalledPack[],
    language: string,
  ): Promise<Installed> {
    const result: Installed = {
      kinds: [],
      parents: new Map(),
      spriteKinds: [],
      tints: [],
      nouns: new Map(),
      params: [],
    };
    for (const pack of installed) {
      for (const [id, kind] of Object.entries(pack.kinds)) {
        result.kinds.push(id);
        if (kind.parent && !result.parents.has(id))
          result.parents.set(id, kind.parent);
      }
      result.tints.push(...Object.keys(pack.tints));
      for (const sprite of pack.sprites)
        if (sprite.domain === 'items') result.spriteKinds.push(...sprite.kinds);
    }
    for (const pack of installed) {
      if (!pack.common) continue;
      const common = await this.packs
        .commonTexts(pack.id)
        .catch(() => undefined);
      result.params.push(...Object.keys(paramsOf(common)));
    }
    const speaking = installed.filter(
      (pack) => pack.language === packLanguageOf(language),
    );
    for (const pack of speaking) {
      if (pack.generators.items) {
        const list = await this.packs
          .wordList('items', pack.id)
          .catch(() => undefined);
        for (const [id, noun] of firstNouns(list))
          if (!result.nouns.has(id)) result.nouns.set(id, noun);
      }
    }
    return result;
  }

  /** The pooled vocabulary of the draft and the Base of its language. */
  private async vocabulary(draft: PackDraft): Promise<ItemVocabulary> {
    await this.packs.load();
    const language =
      draft.details.language ?? packLanguageOf(this.language.$language());
    const baseId = basePackId(language);
    const base = this.packs.$installed().find((pack) => pack.id === baseId);
    const sources: PooledSource[] = [];
    if (base) {
      const source: PooledSource = {
        packId: base.id,
        isBase: true,
        language,
        kinds: base.kinds as PooledSource['kinds'],
        tints: base.tints,
      };
      const list = base.generators.items
        ? await this.packs.wordList('items', base.id).catch(() => undefined)
        : undefined;
      const valid = list === undefined ? undefined : validateItemWordList(list);
      if (valid?.ok) {
        // A kind the draft gives texts for is previewed with the draft's, not with the Base's on top of them.
        const own =
          isRecord(draft.generators.items) &&
          isRecord(draft.generators.items['kinds'])
            ? draft.generators.items['kinds']
            : {};
        const kinds = Object.fromEntries(
          Object.entries(valid.value.kinds ?? {}).filter(
            ([id]) => !(id in own),
          ),
        );
        source.texts = {
          ...valid.value,
          kinds,
        } as unknown as PooledSource['texts'];
      }
      if (base.common) {
        const common = validateCommonTexts(
          await this.packs.commonTexts(base.id).catch(() => undefined),
        );
        if (common.ok && common.value.params)
          source.params = common.value.params;
      }
      sources.push(source);
    }
    const own: PooledSource = {
      packId: draft.details.id || draft.id,
      isBase: false,
      language,
      kinds: draft.kinds as PooledSource['kinds'],
      tints: draft.tints,
    };
    const items = draft.generators.items;
    const checked = isRecord(items) ? validateItemWordList(items) : undefined;
    if (checked?.ok)
      own.texts = checked.value as unknown as PooledSource['texts'];
    const params = paramsOf(draft.common);
    if (Object.keys(params).length > 0) own.params = params;
    sources.push(own);
    return buildItemVocabulary(sources);
  }
}

interface Installed {
  kinds: string[];
  parents: Map<string, string>;
  spriteKinds: string[];
  tints: string[];
  nouns: Map<string, string>;
  params: string[];
}
