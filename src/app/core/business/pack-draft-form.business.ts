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
import { pick } from '../generators/random';
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
import { KindDomain, PooledSource } from '../packs/pooled-domain';
import { PackKindSourcesBusiness } from './pack-kind-sources.business';
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
}

/** The drawable kinds below `kind`, at any depth, that pass `usable`. */
function descendants(
  vocabulary: {
    kind(id: string): { chain: string[] } | undefined;
    drawable(): string[];
  },
  kind: string,
  usable: (id: string) => boolean,
): string[] {
  return vocabulary
    .drawable()
    .filter(
      (id) =>
        id !== kind && vocabulary.kind(id)?.chain.includes(kind) && usable(id),
    );
}

/** One draw of an NPC, skill or class kind in the preview. */
export interface DomainPreview {
  name: string;
  description: string;
  /** The kind the entry was drawn from: the previewed kind or one of its descendants. */
  kind: string;
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
  domain?: StructuredDomain;
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

const DRAFT_DOMAINS: Record<KindDomain, (draft: PackDraft) => unknown> = {
  items: (draft) => draft.kinds,
  npcs: (draft) => domainKindsOf(draft, 'npcs'),
  skills: (draft) => domainKindsOf(draft, 'skills'),
  classes: (draft) => domainKindsOf(draft, 'classes'),
};

/** The kinds and texts of the draft's domains other than `own`, for `{kind id}` in a phrase. */
function draftOtherDomains(
  draft: PackDraft,
  own: KindDomain,
): NonNullable<PooledSource['otherDomains']> {
  const result: NonNullable<PooledSource['otherDomains']> = {};
  for (const domain of Object.keys(DRAFT_DOMAINS) as KindDomain[]) {
    if (domain === own) continue;
    const texts = draft.generators[domain];
    result[domain] = {
      kinds: DRAFT_DOMAINS[domain](draft) as PooledSource['kinds'],
      ...(isRecord(texts) ? { texts } : {}),
    };
  }
  return result;
}

/** What the pack form needs beyond editing the draft: known keys, sprite coverage, previews and field-level issues. */
@Injectable({ providedIn: 'root' })
export class PackDraftFormBusiness {
  private readonly packs = inject(PackBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly kindSources = inject(PackKindSourcesBusiness);
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
    return {
      domainKinds,
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
    if (!info) return [];
    const own = vocabulary.nouns(kind).length > 0;
    const below = own ? [] : descendants(vocabulary, kind, () => true);
    if (!own && below.length === 0) return [];
    const source = seededRandomSource(`${draft.id}:${kind}`);
    return Array.from({ length: count }, () => {
      const target = own ? kind : pick(source, below);
      const only: ItemVocabulary = { ...vocabulary, drawable: () => [target] };
      return generateItem(source, only, {
        attributes: [],
        type: vocabulary.kind(target)!.type,
      });
    });
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
    // A placeholder names a param, or a kind of any domain of the active packs.
    const names = [
      ...known.params,
      ...known.kinds.map((kind) => kind.id),
      ...STRUCTURED_DOMAINS.flatMap((domain) =>
        known.domainKinds[domain].map((kind) => kind.id),
      ),
    ];
    const items = draft.generators.items;
    if (isRecord(items)) {
      const list = validateItemWordList(items, names);
      if (!list.ok) add('error', list.errors);
      else add('warning', list.warnings);
    }
    for (const domain of STRUCTURED_DOMAINS) {
      const file = draft.generators[domain];
      if (!isRecord(file)) continue;
      const list = WORD_LIST_VALIDATORS[domain](file, names);
      if (!list.ok) addFor(domain, 'error', list.errors);
      else addFor(domain, 'warning', list.warnings);
    }
    if (draft.common !== undefined) {
      const common = validateCommonTexts(draft.common, names);
      if (!common.ok) add('error', common.errors);
      else add('warning', common.warnings);
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
    let vocabulary: {
      kind(id: string): { chain: string[] } | undefined;
      drawable(): string[];
    };
    let canDraw: (id: string) => boolean;
    let one: (id: string) => { name: string; description: string };
    if (domain === 'npcs') {
      const npcs = buildNpcVocabulary(sources);
      vocabulary = npcs;
      canDraw = (id) =>
        npcs.kind(id)!.person
          ? npcs.given().length > 0
          : npcs.nouns(id).length > 0;
      one = (id) => drawNpcTexts(random, npcs, id);
    } else if (domain === 'skills') {
      const skills = buildSkillVocabulary(sources);
      vocabulary = skills;
      canDraw = (id) => skills.nouns(id).length > 0;
      one = (id) => skillTexts(random, skills, id);
    } else {
      const classes = buildClassVocabulary(sources);
      vocabulary = classes;
      canDraw = (id) => classes.nouns(id).length > 0;
      one = (id) => classTexts(random, classes, id);
    }
    if (!vocabulary.kind(kind)) return [];
    const below = canDraw(kind) ? [] : descendants(vocabulary, kind, canDraw);
    if (!canDraw(kind) && below.length === 0) return [];
    return Array.from({ length: count }, () => {
      const target = below.length > 0 ? pick(random, below) : kind;
      return { ...one(target), kind: target };
    });
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
        otherDomains: await this.kindSources.otherDomains(
          base.id,
          language,
          domain,
        ),
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
      otherDomains: draftOtherDomains(draft, domain),
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
        otherDomains: await this.kindSources.otherDomains(
          base.id,
          language,
          'items',
        ),
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
      otherDomains: draftOtherDomains(draft, 'items'),
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
}
