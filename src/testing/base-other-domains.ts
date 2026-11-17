import enClasses from '../../public/packs/base-en/generators/classes.json';
import enItems from '../../public/packs/base-en/generators/items.json';
import enNpcs from '../../public/packs/base-en/generators/npcs.json';
import enSkills from '../../public/packs/base-en/generators/skills.json';
import frClasses from '../../public/packs/base-fr/generators/classes.json';
import frItems from '../../public/packs/base-fr/generators/items.json';
import frNpcs from '../../public/packs/base-fr/generators/npcs.json';
import frSkills from '../../public/packs/base-fr/generators/skills.json';
import { KindDomain, PooledSource } from '../app/core/packs/pooled-domain';
import { baseManifest } from './base-pack';

/** The kinds and texts of the real Base pack for the domains other than `own`, as `{kind id}` in a phrase can refer to them. */
export function baseOtherDomains(
  lang: 'en' | 'fr',
  own: KindDomain,
): NonNullable<PooledSource['otherDomains']> {
  const domains = baseManifest(`base-${lang}`).domains as unknown as Record<
    KindDomain,
    { kinds?: unknown }
  >;
  const texts: Record<KindDomain, unknown> =
    lang === 'en'
      ? { items: enItems, npcs: enNpcs, skills: enSkills, classes: enClasses }
      : { items: frItems, npcs: frNpcs, skills: frSkills, classes: frClasses };
  const result: NonNullable<PooledSource['otherDomains']> = {};
  for (const domain of Object.keys(texts) as KindDomain[])
    if (domain !== own)
      result[domain] = {
        kinds: domains[domain].kinds as PooledSource['kinds'],
        texts: texts[domain] as PooledSource['texts'],
      };
  return result;
}
