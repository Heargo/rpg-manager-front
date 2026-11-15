import enCommon from '../../public/packs/base-en/generators/common.json';
import frCommon from '../../public/packs/base-fr/generators/common.json';
import enSkills from '../../public/packs/base-en/generators/skills.json';
import frSkills from '../../public/packs/base-fr/generators/skills.json';
import {
  buildSkillVocabulary,
  SkillVocabulary,
} from '../app/core/generators/skill-vocabulary';
import { PooledSource } from '../app/core/packs/pooled-domain';
import { baseManifest } from './base-pack';

/** The skill vocabulary of the real Base pack of a language, pooled alone. */
export function baseSkillVocabulary(lang: 'en' | 'fr'): SkillVocabulary {
  const manifest = baseManifest(`base-${lang}`);
  return buildSkillVocabulary([
    {
      packId: `base-${lang}`,
      isBase: true,
      language: lang,
      kinds: (manifest.domains.skills as { kinds?: unknown }).kinds as PooledSource['kinds'],
      texts: (lang === 'en' ? enSkills : frSkills) as unknown as PooledSource['texts'],
      params: (lang === 'en' ? enCommon : frCommon).params,
    },
  ]);
}
