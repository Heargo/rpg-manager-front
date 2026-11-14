import enCommon from '../../public/packs/base-en/generators/common.json';
import frCommon from '../../public/packs/base-fr/generators/common.json';
import enItems from '../../public/packs/base-en/generators/items.json';
import frItems from '../../public/packs/base-fr/generators/items.json';
import {
  buildItemVocabulary,
  ItemVocabulary,
} from '../app/core/generators/item-vocabulary';
import { PooledSource } from '../app/core/packs/pooled-domain';
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
    },
  ]);
}
