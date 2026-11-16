import { ItemRarity } from '../models/item';
import { COMMON_TEXTS_VERSION } from '../generators/common-texts';
import {
  Adjective,
  KindAdjective,
  KindSuffix,
  Noun,
  WORD_LIST_VERSION,
} from '../generators/word-list';
import { GradientStop, ItemKindDef, PackGenerator } from './pack';
import { PackDraft } from './pack-draft';

type Json = Record<string, unknown>;
type PerRarity<T> = Partial<Record<ItemRarity, T[]>>;

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNeutral = (draft: PackDraft): boolean =>
  draft.details.language === undefined;

/** A list, or nothing when it is empty. */
const listOrNothing = <T>(list: T[] | undefined): T[] | undefined =>
  list && list.length > 0 ? list : undefined;

/** A per-rarity object without its empty lists, or nothing when none is left. */
function prunePerRarity<T>(
  value: PerRarity<T> | undefined,
): PerRarity<T> | undefined {
  if (!value) return undefined;
  const kept = Object.fromEntries(
    Object.entries(value).filter(
      ([, list]) => Array.isArray(list) && list.length > 0,
    ),
  ) as PerRarity<T>;
  return Object.keys(kept).length > 0 ? kept : undefined;
}

/** Sets or, for `undefined`, removes the fields of `target` (a copy), and tells whether anything is left. */
function assign(target: Json, patch: Json): Json | undefined {
  const result = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete result[key];
    else result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/** Sets, or removes when `value` is undefined, `key` of the object stored in `holder[section]`; an empty one goes. */
function setIn(
  holder: Json,
  section: string,
  key: string,
  value: Json | undefined,
): void {
  const current = isRecord(holder[section]) ? (holder[section] as Json) : {};
  const next = { ...current };
  if (value === undefined) delete next[key];
  else next[key] = value;
  if (Object.keys(next).length > 0) holder[section] = next;
  else delete holder[section];
}

/**
 * Applies `edit` to a copy of the items word list (`{ version: 2, … }`). A draft with no language has no texts, so it
 * is returned as it is. A list that ends up empty is kept as `{ version }` if there was one, and not created otherwise.
 */
function editList(
  draft: PackDraft,
  generator: PackGenerator,
  edit: (list: Json) => void,
): PackDraft {
  if (isNeutral(draft)) return draft;
  const existing = draft.generators[generator];
  const list: Json = isRecord(existing)
    ? { ...existing }
    : { version: WORD_LIST_VERSION };
  edit(list);
  if (
    existing === undefined &&
    Object.keys(list).every((key) => key === 'version')
  )
    return draft;
  return { ...draft, generators: { ...draft.generators, [generator]: list } };
}

const editItems = (draft: PackDraft, edit: (list: Json) => void): PackDraft =>
  editList(draft, 'items', edit);

// --- kinds -----------------------------------------------------------------------------------------------

/** Sets the given fields of a kind (creating it); a field given as `undefined` is cleared. */
export function setKind(
  draft: PackDraft,
  id: string,
  patch: {
    parent?: string;
    type?: ItemKindDef['type'];
    slot?: ItemKindDef['slot'];
  },
): PackDraft {
  const kind = assign((draft.kinds[id] ?? {}) as Json, patch as Json) ?? {};
  return { ...draft, kinds: { ...draft.kinds, [id]: kind as ItemKindDef } };
}

/** Renames a kind, and follows it in the parents that point at it, its texts and the kinds of the sprites. */
export function renameKind(
  draft: PackDraft,
  from: string,
  to: string,
): PackDraft {
  if (from === to || !(from in draft.kinds) || to in draft.kinds) return draft;
  const kinds: Record<string, ItemKindDef> = {};
  for (const [id, kind] of Object.entries(draft.kinds)) {
    const moved = kind.parent === from ? { ...kind, parent: to } : kind;
    kinds[id === from ? to : id] = moved;
  }
  const renamed: PackDraft = {
    ...draft,
    kinds,
    sprites: draft.sprites.map((sprite) => ({
      ...sprite,
      kinds: sprite.kinds.map((kind) => (kind === from ? to : kind)),
    })),
  };
  const texts = isRecord(draft.generators.items)
    ? draft.generators.items['kinds']
    : undefined;
  if (!isRecord(texts) || !(from in texts)) return renamed;
  return editItems(renamed, (list) => {
    const moved: Json = {};
    for (const [id, value] of Object.entries(list['kinds'] as Json))
      moved[id === from ? to : id] = value;
    list['kinds'] = moved;
  });
}

/** Removes a kind, its texts and its references in the sprites. */
export function removeKind(draft: PackDraft, id: string): PackDraft {
  const { [id]: _removed, ...kinds } = draft.kinds;
  const result: PackDraft = {
    ...draft,
    kinds,
    sprites: draft.sprites.map((sprite) => ({
      ...sprite,
      kinds: sprite.kinds.filter((kind) => kind !== id),
    })),
  };
  return editItems(result, (list) => setIn(list, 'kinds', id, undefined));
}

/** Sets the texts of a kind; each field given replaces the whole field, and an empty one is removed. */
export function setKindTexts(
  draft: PackDraft,
  id: string,
  texts: { nouns?: Noun[]; descriptions?: string[]; names?: PerRarity<string> },
): PackDraft {
  return editItems(draft, (list) => {
    const current =
      isRecord(list['kinds']) && isRecord(list['kinds'][id])
        ? (list['kinds'][id] as Json)
        : {};
    const patch: Json = {};
    if ('nouns' in texts) patch['nouns'] = listOrNothing(texts.nouns);
    if ('descriptions' in texts)
      patch['descriptions'] = listOrNothing(texts.descriptions);
    if ('names' in texts) patch['names'] = prunePerRarity(texts.names);
    setIn(list, 'kinds', id, assign(current, patch));
  });
}

// --- tints -----------------------------------------------------------------------------------------------

/** Sets the gradient of a tint (creating it). */
export function setTint(
  draft: PackDraft,
  id: string,
  gradient: GradientStop[],
): PackDraft {
  return {
    ...draft,
    tints: { ...draft.tints, [id]: { ...draft.tints[id], gradient } },
  };
}

/** Renames a tint, with its texts. */
export function renameTint(
  draft: PackDraft,
  from: string,
  to: string,
): PackDraft {
  if (from === to || !(from in draft.tints) || to in draft.tints) return draft;
  const tints: PackDraft['tints'] = {};
  for (const [id, tint] of Object.entries(draft.tints))
    tints[id === from ? to : id] = tint;
  const texts = isRecord(draft.generators.items)
    ? draft.generators.items['tints']
    : undefined;
  const renamed = { ...draft, tints };
  if (!isRecord(texts) || !(from in texts)) return renamed;
  return editItems(renamed, (list) => {
    const moved: Json = {};
    for (const [id, value] of Object.entries(list['tints'] as Json))
      moved[id === from ? to : id] = value;
    list['tints'] = moved;
  });
}

/** Removes a tint, with its texts. */
export function removeTint(draft: PackDraft, id: string): PackDraft {
  const { [id]: _removed, ...tints } = draft.tints;
  return editItems({ ...draft, tints }, (list) =>
    setIn(list, 'tints', id, undefined),
  );
}

/** Sets the texts of a tint; each field given replaces the whole field, and an empty one is removed. */
export function setTintTexts(
  draft: PackDraft,
  id: string,
  texts: {
    adjectives?: PerRarity<Adjective>;
    suffixes?: PerRarity<string>;
    descriptions?: string[];
  },
): PackDraft {
  return editItems(draft, (list) => {
    const current =
      isRecord(list['tints']) && isRecord(list['tints'][id])
        ? (list['tints'][id] as Json)
        : {};
    const patch: Json = {};
    if ('adjectives' in texts)
      patch['adjectives'] = prunePerRarity(texts.adjectives);
    if ('suffixes' in texts) patch['suffixes'] = prunePerRarity(texts.suffixes);
    if ('descriptions' in texts)
      patch['descriptions'] = listOrNothing(texts.descriptions);
    setIn(list, 'tints', id, assign(current, patch));
  });
}

/** Sets the kinds a tint fits; no kind removes the limit (the tint fits any item). */
export function setTintFits(
  draft: PackDraft,
  id: string,
  kinds: string[],
): PackDraft {
  const { fits: _fits, ...tint } = draft.tints[id] ?? { gradient: [] };
  return {
    ...draft,
    tints: {
      ...draft.tints,
      [id]: kinds.length > 0 ? { ...tint, fits: kinds } : tint,
    },
  };
}

/** Sets the adjectives and suffixes of a kind per rarity; each field given replaces the whole field, empty lists go. */
export function setKindWords(
  draft: PackDraft,
  id: string,
  words: {
    adjectives?: PerRarity<KindAdjective>;
    suffixes?: PerRarity<KindSuffix>;
  },
): PackDraft {
  return editItems(draft, (list) => {
    const current =
      isRecord(list['kinds']) && isRecord(list['kinds'][id])
        ? (list['kinds'][id] as Json)
        : {};
    const patch: Json = {};
    if ('adjectives' in words)
      patch['adjectives'] = prunePerRarity(words.adjectives);
    if ('suffixes' in words) patch['suffixes'] = prunePerRarity(words.suffixes);
    setIn(list, 'kinds', id, assign(current, patch));
  });
}

/** Sets the top-level adjectives and suffixes of the language per rarity; each field given replaces the whole field. */
export function setCommonWords(
  draft: PackDraft,
  words: { adjectives?: PerRarity<Adjective>; suffixes?: PerRarity<string> },
): PackDraft {
  return editItems(draft, (list) => {
    for (const field of ['adjectives', 'suffixes'] as const) {
      if (!(field in words)) continue;
      const next = prunePerRarity(words[field] as PerRarity<unknown>);
      if (next) list[field] = next;
      else delete list[field];
    }
  });
}

// --- params and templates --------------------------------------------------------------------------------

function editParams(
  draft: PackDraft,
  edit: (params: Record<string, string[]>) => void,
): PackDraft {
  if (isNeutral(draft)) return draft;
  const existing =
    isRecord(draft.common) && isRecord(draft.common['params'])
      ? draft.common['params']
      : {};
  const params = { ...(existing as Record<string, string[]>) };
  edit(params);
  const { common: _common, ...rest } = draft;
  if (Object.keys(params).length === 0) return rest;
  return { ...rest, common: { version: COMMON_TEXTS_VERSION, params } };
}

/** Sets the phrases of a shared param (creating it); no phrase removes it. */
export function setParam(
  draft: PackDraft,
  name: string,
  entries: string[],
): PackDraft {
  return editParams(draft, (params) => {
    if (entries.length > 0) params[name] = entries;
    else delete params[name];
  });
}

/** Renames a param, keeping its place and phrases. */
export function renameParam(
  draft: PackDraft,
  from: string,
  to: string,
): PackDraft {
  return editParams(draft, (params) => {
    if (from === to || !(from in params) || to in params) return;
    const entries = Object.entries(params);
    for (const key of Object.keys(params)) delete params[key];
    for (const [key, value] of entries) params[key === from ? to : key] = value;
  });
}

export function removeParam(draft: PackDraft, name: string): PackDraft {
  return setParam(draft, name, []);
}

/** Sets the language's name templates of a rarity; an empty list removes them. */
export function setTemplates(
  draft: PackDraft,
  rarity: ItemRarity,
  templates: string[],
): PackDraft {
  return editItems(draft, (list) => {
    const current = isRecord(list['templates'])
      ? (list['templates'] as PerRarity<string>)
      : {};
    const next = prunePerRarity({ ...current, [rarity]: templates });
    if (next) list['templates'] = next;
    else delete list['templates'];
  });
}

// --- readers ---------------------------------------------------------------------------------------------

/** The texts of a kind in the draft's items word list (empty when there are none). */
export function kindTextsOf(
  draft: PackDraft,
  id: string,
): { nouns: Noun[]; descriptions: string[]; names: PerRarity<string> } {
  const items = draft.generators.items;
  const kinds =
    isRecord(items) && isRecord(items['kinds']) ? items['kinds'] : {};
  const texts = isRecord(kinds[id]) ? (kinds[id] as Json) : {};
  return {
    nouns: (texts['nouns'] as Noun[] | undefined) ?? [],
    descriptions: (texts['descriptions'] as string[] | undefined) ?? [],
    names: (texts['names'] as PerRarity<string> | undefined) ?? {},
  };
}

/** The texts of a tint in the draft's items word list (empty when there are none). */
export function tintTextsOf(
  draft: PackDraft,
  id: string,
): {
  adjectives: PerRarity<Adjective>;
  suffixes: PerRarity<string>;
  descriptions: string[];
} {
  const items = draft.generators.items;
  const tints =
    isRecord(items) && isRecord(items['tints']) ? items['tints'] : {};
  const texts = isRecord(tints[id]) ? (tints[id] as Json) : {};
  return {
    adjectives: (texts['adjectives'] as PerRarity<Adjective> | undefined) ?? {},
    suffixes: (texts['suffixes'] as PerRarity<string> | undefined) ?? {},
    descriptions: (texts['descriptions'] as string[] | undefined) ?? [],
  };
}

/** The shared params of the draft. */
export function paramsOf(draft: PackDraft): Record<string, string[]> {
  return isRecord(draft.common) && isRecord(draft.common['params'])
    ? (draft.common['params'] as Record<string, string[]>)
    : {};
}

/** The language's name templates of the draft, per rarity. */
export function templatesOf(draft: PackDraft): PerRarity<string> {
  const items = draft.generators.items;
  return isRecord(items) && isRecord(items['templates'])
    ? (items['templates'] as PerRarity<string>)
    : {};
}

/** The adjectives and suffixes of a kind in the draft's items word list, per rarity. */
export function kindWordsOf(
  draft: PackDraft,
  id: string,
): { adjectives: PerRarity<KindAdjective>; suffixes: PerRarity<KindSuffix> } {
  const items = draft.generators.items;
  const kinds =
    isRecord(items) && isRecord(items['kinds']) ? items['kinds'] : {};
  const texts = isRecord(kinds[id]) ? (kinds[id] as Json) : {};
  return {
    adjectives:
      (texts['adjectives'] as PerRarity<KindAdjective> | undefined) ?? {},
    suffixes: (texts['suffixes'] as PerRarity<KindSuffix> | undefined) ?? {},
  };
}

/** The top-level adjectives and suffixes of the draft's items word list, per rarity. */
export function commonWordsOf(draft: PackDraft): {
  adjectives: PerRarity<Adjective>;
  suffixes: PerRarity<string>;
} {
  const items = isRecord(draft.generators.items) ? draft.generators.items : {};
  return {
    adjectives: (items['adjectives'] as PerRarity<Adjective> | undefined) ?? {},
    suffixes: (items['suffixes'] as PerRarity<string> | undefined) ?? {},
  };
}

// --- the NPC, skill and class domains --------------------------------------------------------------------

/** The domains with a structured section besides items. */
export type StructuredDomain = 'npcs' | 'skills' | 'classes';

export const STRUCTURED_DOMAINS: readonly StructuredDomain[] = [
  'npcs',
  'skills',
  'classes',
];

const KIND_FIELD = {
  npcs: 'npcKinds',
  skills: 'skillKinds',
  classes: 'classKinds',
} as const;

/** The fields of a domain's kind (parent included), as the draft stores them. */
export type DomainKindFields = Record<string, unknown>;

/** The kinds the draft declares for a domain. */
export function domainKindsOf(
  draft: PackDraft,
  domain: StructuredDomain,
): Record<string, DomainKindFields> {
  return (draft[KIND_FIELD[domain]] ?? {}) as Record<string, DomainKindFields>;
}

function withDomainKinds(
  draft: PackDraft,
  domain: StructuredDomain,
  kinds: Record<string, DomainKindFields>,
): PackDraft {
  return { ...draft, [KIND_FIELD[domain]]: kinds } as PackDraft;
}

/** Sets the given fields of a domain kind (creating it); a field given as `undefined` is cleared. */
export function setDomainKind(
  draft: PackDraft,
  domain: StructuredDomain,
  id: string,
  patch: DomainKindFields,
): PackDraft {
  const kinds = domainKindsOf(draft, domain);
  const kind = assign(kinds[id] ?? {}, patch) ?? {};
  return withDomainKinds(draft, domain, { ...kinds, [id]: kind });
}

/** Renames a domain kind, and follows it in the parents, its texts and, for a skill kind, the kinds classes favour. */
export function renameDomainKind(
  draft: PackDraft,
  domain: StructuredDomain,
  from: string,
  to: string,
): PackDraft {
  const own = domainKindsOf(draft, domain);
  if (from === to || !(from in own) || to in own) return draft;
  const kinds: Record<string, DomainKindFields> = {};
  for (const [id, kind] of Object.entries(own)) {
    const moved = kind['parent'] === from ? { ...kind, parent: to } : kind;
    kinds[id === from ? to : id] = moved;
  }
  let renamed = withDomainKinds(draft, domain, kinds);
  if (domain === 'skills' && renamed.classKinds) {
    const classKinds = Object.fromEntries(
      Object.entries(renamed.classKinds).map(([id, kind]) => [
        id,
        Array.isArray(kind.skills)
          ? {
              ...kind,
              skills: kind.skills.map((skill) => (skill === from ? to : skill)),
            }
          : kind,
      ]),
    );
    renamed = { ...renamed, classKinds };
  }
  const texts = draft.generators[domain];
  const held = isRecord(texts) ? texts['kinds'] : undefined;
  if (!isRecord(held) || !(from in held)) return renamed;
  return editList(renamed, domain, (list) => {
    const moved: Json = {};
    for (const [id, value] of Object.entries(list['kinds'] as Json))
      moved[id === from ? to : id] = value;
    list['kinds'] = moved;
  });
}

/** Removes a domain kind and its texts. */
export function removeDomainKind(
  draft: PackDraft,
  domain: StructuredDomain,
  id: string,
): PackDraft {
  const { [id]: _removed, ...kinds } = domainKindsOf(draft, domain);
  return editList(withDomainKinds(draft, domain, kinds), domain, (list) =>
    setIn(list, 'kinds', id, undefined),
  );
}

/** The texts of a domain kind. */
export interface DomainKindTexts {
  nouns?: Noun[];
  descriptions?: string[];
  adjectives?: Adjective[];
  names?: string[];
}

/** Sets the texts of a domain kind; each field given replaces the whole field, and an empty one is removed. */
export function setDomainKindTexts(
  draft: PackDraft,
  domain: StructuredDomain,
  id: string,
  texts: DomainKindTexts,
): PackDraft {
  return editList(draft, domain, (list) => {
    const current =
      isRecord(list['kinds']) && isRecord(list['kinds'][id])
        ? (list['kinds'][id] as Json)
        : {};
    const patch: Json = {};
    for (const field of [
      'nouns',
      'descriptions',
      'adjectives',
      'names',
    ] as const)
      if (field in texts)
        patch[field] = listOrNothing(texts[field] as unknown[] | undefined);
    setIn(list, 'kinds', id, assign(current, patch));
  });
}

/** Sets the top-level lists of a domain's language file; each list given replaces the whole list, and an empty one is removed. */
export function setDomainTexts(
  draft: PackDraft,
  domain: StructuredDomain,
  top: Record<string, unknown[] | undefined>,
): PackDraft {
  return editList(draft, domain, (list) => {
    for (const [name, entries] of Object.entries(top)) {
      const next = listOrNothing(entries);
      if (next) list[name] = next;
      else delete list[name];
    }
  });
}

/** The texts of a domain kind in the draft's language file (empty when there are none). */
export function domainKindTextsOf(
  draft: PackDraft,
  domain: StructuredDomain,
  id: string,
): Required<DomainKindTexts> {
  const file = draft.generators[domain];
  const kinds = isRecord(file) && isRecord(file['kinds']) ? file['kinds'] : {};
  const texts = isRecord(kinds[id]) ? (kinds[id] as Json) : {};
  return {
    nouns: (texts['nouns'] as Noun[] | undefined) ?? [],
    descriptions: (texts['descriptions'] as string[] | undefined) ?? [],
    adjectives: (texts['adjectives'] as Adjective[] | undefined) ?? [],
    names: (texts['names'] as string[] | undefined) ?? [],
  };
}

/** A top-level list of a domain's language file (empty when there is none). */
export function domainTopOf<T = unknown>(
  draft: PackDraft,
  domain: StructuredDomain,
  name: string,
): T[] {
  const file = draft.generators[domain];
  const list = isRecord(file) ? file[name] : undefined;
  return Array.isArray(list) ? (list as T[]) : [];
}
