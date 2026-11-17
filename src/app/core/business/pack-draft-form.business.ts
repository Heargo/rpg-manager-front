import { inject, Injectable } from '@angular/core';
import { drawNpcTexts } from '../generators/npc-texts';
import { validateClassWordList } from '../generators/class-word-list';
import { buildClassVocabulary } from '../generators/class-vocabulary';
import { classTexts } from '../generators/class-generator';
import { validateCommonTexts } from '../generators/common-texts';
import { buildNpcVocabulary } from '../generators/npc-vocabulary';
import { validateNpcWordList } from '../generators/npc-word-list';
import { buildSkillVocabulary } from '../generators/skill-vocabulary';
import { skillTexts } from '../generators/skill-generator';
import { validateSkillWordList } from '../generators/skill-word-list';
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
import {
  domainKindsOf,
  STRUCTURED_DOMAINS,
  StructuredDomain,
} from '../packs/pack-draft-edits';
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
  /** The kinds of the NPC, skill and class trees, with their first noun. */
  domainKinds: Record<StructuredDomain, KindKey[]>;
  /** The shared kinds of the installed packs and of the draft, with their first word. */
  sharedKinds: KindKey[];
}

/** One draw of an NPC, skill or class kind in the preview. */
export interface DomainPreview {
  name: string;
  description: string;
}

/** A validation message of the draft, with the field it concerns. */
export interface DraftIssue {
  level: 'error' | 'warning';
  message: string;
  kind?: string;
  tint?: string;
  param?: string;
  rarity?: ItemRarity;
  /** Set on a message about the NPC, skill or class domain (its `kind` is a kind of that domain). */
  domain?: StructuredDomain | 'shared';
}

const FIELDS = {
  npcs: 'npcKinds',
  skills: 'skillKinds',
  classes: 'classKinds',
} as const;

const WORD_LIST_VALIDATORS = {
  npcs: validateNpcWordList,
  skills: validateSkillWordList,
  classes: validateClassWordList,
} as const;

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

/** The first word of each shared kind of a (raw) `common.json`. */
function firstWords(common: unknown): Map<string, string> {
  const result = new Map<string, string>();
  const kinds =
    isRecord(common) && isRecord(common['kinds']) ? common['kinds'] : {};
  for (const [id, texts] of Object.entries(kinds)) {
    const words = isRecord(texts) ? texts['words'] : undefined;
    const first = Array.isArray(words) ? words[0] : undefined;
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

/** The domain a manifest message is about (`domains.npcs.kinds.…`), when it is one of the structured ones. */
function domainOf(message: string): Pick<DraftIssue, 'domain'> {
  const domain = /^domains\.(npcs|skills|classes)\b/.exec(message);
  return domain ? { domain: domain[1] as StructuredDomain } : {};
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
    const domainKinds = {} as Record<StructuredDomain, KindKey[]>;
    for (const domain of STRUCTURED_DOMAINS) {
      const domainNouns = new Map(installed.domainNouns[domain]);
      for (const [id, noun] of firstNouns(draft?.generators[domain]))
        domainNouns.set(id, noun);
      const domainIds = new Set([
        ...installed.domainKinds[domain],
        ...(draft ? Object.keys(domainKindsOf(draft, domain)) : []),
      ]);
      domainKinds[domain] = [...domainIds].map((id) =>
        domainNouns.has(id) ? { id, noun: domainNouns.get(id) } : { id },
      );
    }
    const sharedNouns = new Map(installed.sharedNouns);
    for (const [id, noun] of firstWords(draft?.common))
      sharedNouns.set(id, noun);
    const sharedIds = new Set([
      ...installed.sharedKinds,
      ...Object.keys(draft?.sharedKinds ?? {}),
    ]);
    return {
      domainKinds,
      sharedKinds: [...sharedIds].map((id) =>
        sharedNouns.has(id) ? { id, noun: sharedNouns.get(id) } : { id },
      ),
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
        issues.push({
          level,
          message,
          ...fieldOf(message),
          ...domainOf(message),
        });
    };
    const addFor = (
      domain: StructuredDomain,
      level: DraftIssue['level'],
      messages: readonly string[],
    ) => {
      for (const message of messages)
        issues.push({ level, message, ...fieldOf(message), domain });
    };
    const { manifest } = buildPack(draft);
    const pack = validatePack(manifest);
    if (!pack.ok) add('error', pack.errors);
    else add('warning', pack.warnings);

    const known = await this.knownKeys(draft);
    const items = draft.generators.items;
    if (isRecord(items)) {
      const list = validateItemWordList(items, known.params);
      if (!list.ok) add('error', list.errors);
      else add('warning', list.warnings);
    }
    for (const domain of STRUCTURED_DOMAINS) {
      const file = draft.generators[domain];
      if (!isRecord(file)) continue;
      const list = WORD_LIST_VALIDATORS[domain](file, known.params);
      if (!list.ok) addFor(domain, 'error', list.errors);
      else addFor(domain, 'warning', list.warnings);
    }
    if (draft.common !== undefined) {
      const common = validateCommonTexts(
        draft.common,
        known.sharedKinds.map((kind) => kind.id),
        known.params,
      );
      if (!common.ok) add('error', common.errors);
      else
        for (const message of common.warnings) {
          const shared = /^shared kind "([^"]+)"/.exec(message);
          issues.push({
            level: 'warning',
            message,
            ...fieldOf(message),
            ...(shared ? { kind: shared[1], domain: 'shared' as const } : {}),
          });
        }
    }
    return issues;
  }

  /** Draws `count` names and descriptions of a kind of the NPC, skill or class tree, with the draft plus the Base of its language. */
  async previewDomain(
    draft: PackDraft,
    domain: StructuredDomain,
    kind: string,
    count = 3,
  ): Promise<DomainPreview[]> {
    const sources = await this.domainSources(draft, domain);
    const random = seededRandomSource(`${draft.id}:${domain}:${kind}`);
    const draw = (one: () => DomainPreview) =>
      Array.from({ length: count }, one);
    if (domain === 'npcs') {
      const vocabulary = buildNpcVocabulary(sources);
      const info = vocabulary.kind(kind);
      if (
        !info ||
        (info.person
          ? vocabulary.given().length === 0
          : vocabulary.nouns(kind).length === 0)
      )
        return [];
      return draw(() => drawNpcTexts(random, vocabulary, kind));
    }
    if (domain === 'skills') {
      const vocabulary = buildSkillVocabulary(sources);
      if (!vocabulary.kind(kind) || vocabulary.nouns(kind).length === 0)
        return [];
      return draw(() => skillTexts(random, vocabulary, kind));
    }
    const vocabulary = buildClassVocabulary(sources);
    if (!vocabulary.kind(kind) || vocabulary.nouns(kind).length === 0)
      return [];
    return draw(() => classTexts(random, vocabulary, kind));
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
      domainKinds: { npcs: [], skills: [], classes: [] },
      domainNouns: { npcs: new Map(), skills: new Map(), classes: new Map() },
      sharedKinds: [],
      sharedNouns: new Map(),
    };
    for (const pack of installed) {
      for (const [id, kind] of Object.entries(pack.kinds)) {
        result.kinds.push(id);
        if (kind.parent && !result.parents.has(id))
          result.parents.set(id, kind.parent);
      }
      for (const domain of STRUCTURED_DOMAINS)
        result.domainKinds[domain].push(
          ...Object.keys(pack[FIELDS[domain]] ?? {}),
        );
      result.sharedKinds.push(...Object.keys(pack.sharedKinds ?? {}));
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
      for (const [id, noun] of firstWords(common))
        if (!result.sharedNouns.has(id)) result.sharedNouns.set(id, noun);
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
      for (const domain of STRUCTURED_DOMAINS) {
        if (!pack.generators[domain]) continue;
        const list = await this.packs
          .wordList(domain, pack.id)
          .catch(() => undefined);
        for (const [id, noun] of firstNouns(list))
          if (!result.domainNouns[domain].has(id))
            result.domainNouns[domain].set(id, noun);
      }
    }
    return result;
  }

  /** The sources of a domain's vocabulary: the Base of the draft's language, then the draft. */
  private async domainSources(
    draft: PackDraft,
    domain: StructuredDomain,
  ): Promise<PooledSource[]> {
    await this.packs.load();
    const language =
      draft.details.language ?? packLanguageOf(this.language.$language());
    const baseId = basePackId(language);
    const base = this.packs.$installed().find((pack) => pack.id === baseId);
    const validate = WORD_LIST_VALIDATORS[domain] as (json: unknown) => {
      ok: boolean;
      value?: unknown;
    };
    const sources: PooledSource[] = [];
    if (base) {
      const source: PooledSource = {
        packId: base.id,
        isBase: true,
        language,
        kinds: base[FIELDS[domain]] as PooledSource['kinds'],
      };
      const list = base.generators[domain]
        ? await this.packs.wordList(domain, base.id).catch(() => undefined)
        : undefined;
      const valid = list === undefined ? undefined : validate(list);
      if (valid?.ok) {
        // A kind the draft gives texts for is previewed with the draft's, not with the Base's on top of them.
        const file = valid.value as Json;
        const own = draft.generators[domain];
        const ownKinds =
          isRecord(own) && isRecord(own['kinds']) ? own['kinds'] : {};
        const kinds = Object.fromEntries(
          Object.entries(isRecord(file['kinds']) ? file['kinds'] : {}).filter(
            ([id]) => !(id in ownKinds),
          ),
        );
        source.texts = { ...file, kinds } as unknown as PooledSource['texts'];
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
      kinds: domainKindsOf(draft, domain) as PooledSource['kinds'],
    };
    const file = draft.generators[domain];
    const checked = isRecord(file) ? validate(file) : undefined;
    if (checked?.ok) own.texts = checked.value as PooledSource['texts'];
    const params = paramsOf(draft.common);
    if (Object.keys(params).length > 0) own.params = params;
    sources.push(own);
    return sources;
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
  domainKinds: Record<StructuredDomain, string[]>;
  domainNouns: Record<StructuredDomain, Map<string, string>>;
  sharedKinds: string[];
  sharedNouns: Map<string, string>;
}
