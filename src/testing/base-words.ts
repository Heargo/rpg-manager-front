import enCommon from '../../public/packs/base-en/generators/common.json';
import frCommon from '../../public/packs/base-fr/generators/common.json';
import enItems from '../../public/packs/base-en/generators/items.json';
import frItems from '../../public/packs/base-fr/generators/items.json';
import { toWordList } from '../app/core/generators/item-words-adapter';
import { ItemWordList, WordList } from '../app/core/generators/word-list';
import { ItemKindDef } from '../app/core/packs/pack';
import { baseManifest } from './base-pack';

/** The real Base item texts of a language as the v1-shaped list the item generator still draws from. */
export function baseWordList(lang: 'en' | 'fr'): WordList {
  const kinds = baseManifest(`base-${lang}`).domains.items.kinds as Record<
    string,
    ItemKindDef
  >;
  const common = lang === 'en' ? enCommon : frCommon;
  const items = lang === 'en' ? enItems : frItems;
  return toWordList(items as ItemWordList, kinds, kinds, common.params);
}

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
