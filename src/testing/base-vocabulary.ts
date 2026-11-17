import enCommon from '../../public/packs/base-en/generators/common.json';
import frCommon from '../../public/packs/base-fr/generators/common.json';
import enNpcs from '../../public/packs/base-en/generators/npcs.json';
import frNpcs from '../../public/packs/base-fr/generators/npcs.json';
import enItems from '../../public/packs/base-en/generators/items.json';
import frItems from '../../public/packs/base-fr/generators/items.json';
import {
  buildItemVocabulary,
  ItemVocabulary,
} from '../app/core/generators/item-vocabulary';
import {
  buildNpcVocabulary,
  NpcVocabulary,
} from '../app/core/generators/npc-vocabulary';
import { PooledSource } from '../app/core/packs/pooled-domain';
import { baseOtherDomains } from './base-other-domains';
import { baseManifest } from './base-pack';

/** The item vocabulary of the real Base pack of a language, pooled alone. */
export function baseItemVocabulary(lang: 'en' | 'fr'): ItemVocabulary {
  const manifest = baseManifest(`base-${lang}`);
  return buildItemVocabulary([
    {
      packId: `base-${lang}`,
      isBase: true,
      language: lang,
      kinds: manifest.domains.items.kinds as PooledSource['kinds'],
      texts: (lang === 'en' ? enItems : frItems) as PooledSource['texts'],
      tints: manifest.tints as PooledSource['tints'],
      params: (lang === 'en' ? enCommon : frCommon).params,
      otherDomains: baseOtherDomains(lang, 'items'),
    },
  ]);
}

/** The NPC vocabulary of the real Base pack of a language, pooled alone. */
export function baseNpcVocabulary(lang: 'en' | 'fr'): NpcVocabulary {
  const manifest = baseManifest(`base-${lang}`);
  return buildNpcVocabulary([
    {
      packId: `base-${lang}`,
      isBase: true,
      language: lang,
      kinds: (manifest.domains.npcs as { kinds?: unknown }).kinds as PooledSource['kinds'],
      texts: (lang === 'en' ? enNpcs : frNpcs) as unknown as PooledSource['texts'],
      params: (lang === 'en' ? enCommon : frCommon).params,
      otherDomains: baseOtherDomains(lang, 'npcs'),
    },
  ]);
}
