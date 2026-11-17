import { SkillType } from '../../modules/skill/models/skill';
import { SKILL_KIND_SCHEMA } from '../packs/pack-kinds';
import { poolDomain, PooledSource, poolParams } from '../packs/pooled-domain';
import { kindLookups } from './kind-lookups';
import { buildKindRefs, KindRefs } from './cross-domain-kinds';
import { SkillKindTexts } from './skill-word-list';
import { Adjective, Noun } from './word-list';

export type SkillEffectKind = 'damage' | 'heal' | 'modify';

export interface SkillKindInfo {
  id: string;
  type: SkillType;
  /** Set on an active chain only; none lets the generator draw one. */
  effect?: SkillEffectKind;
  chain: string[];
}

/** The skills of the world's active packs, pooled: the kind tree, the words and the lookups the generator needs. */
export interface SkillVocabulary {
  kind(id: string): SkillKindInfo | undefined;
  nouns(id: string): Noun[];
  descriptions(id: string): string[];
  names(id: string): string[];
  /** The language's adjectives and those of every level of the kind's chain. */
  adjectives(id: string): Adjective[];
  /** The language's suffixes and those of every level of the kind's chain. */
  suffixes(id: string): string[];
  /** The kinds with a noun on their chain. */
  drawable(): string[];
  templates(): string[];
  /** The kinds of every domain that a phrase can refer to. */
  refs: KindRefs;
  params: Record<string, string[]>;
  conflicts: string[];
}

export function buildSkillVocabulary(sources: PooledSource[]): SkillVocabulary {
  const pooled = poolDomain(sources, SKILL_KIND_SCHEMA);
  const params = poolParams(sources);
  const refs = buildKindRefs(sources, 'skills');
  const lookups = kindLookups(pooled);
  const section = <T>(name: string): T[] =>
    (pooled.sections[name] as T[] | undefined) ?? [];

  const info = (id: string): SkillKindInfo | undefined => {
    const kind = pooled.kinds[id];
    if (!kind) return undefined;
    // The pool drops a root without a type (SKILL_KIND_SCHEMA), so every kept kind has one.
    const type = kind['type'] as SkillType;
    const effect = kind['effect'] as SkillEffectKind | undefined;
    return {
      id,
      type,
      ...(type === 'active' && effect ? { effect } : {}),
      chain: kind.chain,
    };
  };
  const nouns = (id: string): Noun[] =>
    lookups.nearest(id, (t: SkillKindTexts) => t.nouns);

  return {
    kind: info,
    nouns,
    descriptions: (id) =>
      lookups.nearest(id, (t: SkillKindTexts) => t.descriptions),
    names: (id) => lookups.nearest(id, (t: SkillKindTexts) => t.names),
    adjectives: (id) => [
      ...section<Adjective>('adjectives'),
      ...lookups.alongChain(id, (t: SkillKindTexts) => t.adjectives),
    ],
    suffixes: (id) => [
      ...section<string>('suffixes'),
      ...lookups.alongChain(id, (t: SkillKindTexts) => t.suffixes),
    ],
    drawable: () => lookups.kindIds((id) => nouns(id).length > 0),
    templates: () => section<string>('templates'),
    refs,
    params,
    conflicts: pooled.conflicts,
  };
}
