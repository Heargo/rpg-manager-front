import enCommon from '../../public/packs/base-en/generators/common.json';
import frCommon from '../../public/packs/base-fr/generators/common.json';
import enClasses from '../../public/packs/base-en/generators/classes.json';
import frClasses from '../../public/packs/base-fr/generators/classes.json';
import {
  buildClassVocabulary,
  ClassVocabulary,
} from '../app/core/generators/class-vocabulary';
import { PooledSource } from '../app/core/packs/pooled-domain';
import { baseManifest } from './base-pack';

/** The class vocabulary of the real Base pack of a language, pooled alone. */
export function baseClassVocabulary(lang: 'en' | 'fr'): ClassVocabulary {
  const manifest = baseManifest(`base-${lang}`);
  return buildClassVocabulary([
    {
      packId: `base-${lang}`,
      isBase: true,
      language: lang,
      kinds: (manifest.domains.classes as { kinds?: unknown }).kinds as PooledSource['kinds'],
      texts: (lang === 'en' ? enClasses : frClasses) as unknown as PooledSource['texts'],
      params: (lang === 'en' ? enCommon : frCommon).params,
      sharedKinds: (manifest as { sharedKinds?: PooledSource['sharedKinds'] }).sharedKinds,
      sharedTexts: (lang === 'en' ? enCommon : frCommon) as PooledSource['sharedTexts'],
    },
  ]);
}
