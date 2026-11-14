import enCommon from '../../public/packs/base-en/generators/common.json';
import frCommon from '../../public/packs/base-fr/generators/common.json';
import enItems from '../../public/packs/base-en/generators/items.json';
import frItems from '../../public/packs/base-fr/generators/items.json';
import { ItemKindDef } from '../app/core/packs/pack';
import { baseManifest } from './base-pack';

/** The word list parts of `PackBusiness` for a test double, on the real Base files of a language. */
export function baseWordSources(lang: 'en' | 'fr' = 'en') {
  const kinds = baseManifest(`base-${lang}`).domains.items.kinds as Record<
    string,
    ItemKindDef
  >;
  return {
    wordList: async () => (lang === 'en' ? enItems : frItems),
    commonTexts: async () => (lang === 'en' ? enCommon : frCommon),
    itemKinds: async () => ({ own: kinds, fallback: kinds }),
  };
}
