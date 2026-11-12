import { ITEM_RARITIES } from '../models/item';
import {
  SkillDraft,
  SkillEffect,
  SkillTarget,
  SkillType,
} from '../../modules/skill/models/skill';
import { adjectiveForm, capitalize } from './name-generator';
import { pick, randomInt, shuffle, Weighted, weightedPick } from './random';
import { RandomSource } from './random-source';
import { RARITY_WEIGHTS } from './item-generator';
import { Adjective, Gender, Noun } from './word-list';

/** Skill name patterns use `{noun}`, `{adjective}` and `{suffix}`; word order is the language's. */
export interface SkillWordList {
  version: number;
  templates: string[];
  nouns: Record<SkillType, Noun[]>;
  adjectives: Adjective[];
  suffixes: string[];
  descriptions: Record<SkillType, string[]>;
}

const TYPE_WEIGHTS: Weighted<SkillType>[] = [
  { value: 'active', weight: 60 },
  { value: 'passive', weight: 40 },
];

const DAMAGE_TARGETS: SkillTarget[] = ['one-enemy', 'all-enemies', 'area'];
const HEAL_TARGETS: SkillTarget[] = ['self', 'one-ally', 'all-allies'];
const MODIFY_TARGETS: SkillTarget[] = [
  'self',
  'one-ally',
  'one-enemy',
  'all-allies',
  'all-enemies',
  'area',
];

/** Draws a whole skill on the given attributes. Pure: same source state and inputs give the same skill. */
export function generateSkill(
  source: RandomSource,
  attributes: readonly string[],
  words: SkillWordList,
): SkillDraft {
  const unique = [...new Set(attributes)];
  const rarity = weightedPick(source, RARITY_WEIGHTS);
  const tier = ITEM_RARITIES.indexOf(rarity);
  const type = weightedPick(source, TYPE_WEIGHTS);
  const maxLevel = randomInt(source, 1, 3 + tier);
  const name = skillName(source, words, type);
  const description = pick(source, words.descriptions[type]);
  const base = {
    name,
    description,
    rarity,
    type,
    maxLevel,
    pointCost: 1 + Math.floor(tier / 2),
  };

  if (type === 'passive') {
    const effects = shuffle(source, unique)
      .slice(0, randomInt(source, 1, 2))
      .map((attribute): SkillEffect => ({
        kind: 'modify',
        attribute,
        amount: pick(source, [
          'skillLevel',
          'skillLevel * 2',
          `skillLevel + ${tier}`,
        ]),
        duration: 0,
      }));
    return { ...base, effects };
  }

  const kind = pick(source, ['damage', 'heal', 'modify'] as const);
  const targets =
    kind === 'damage'
      ? DAMAGE_TARGETS
      : kind === 'heal'
        ? HEAL_TARGETS
        : MODIFY_TARGETS;
  const power = 3 + tier * 2;
  const effects = shuffle(source, unique)
    .slice(0, 1)
    .map((attribute): SkillEffect => {
      const amount = `${randomInt(source, power, power + 3)} + skillLevel * ${randomInt(source, 2, 3 + tier)}`;
      return kind === 'modify'
        ? { kind, attribute, amount, duration: randomInt(source, 1, 4) }
        : { kind, attribute, amount };
    });
  const cost = unique.length
    ? {
        attribute: pick(source, unique),
        amount: randomInt(source, 1, 3 + tier * 2),
      }
    : undefined;
  return {
    ...base,
    target: pick(source, targets),
    ...(cost ? { cost } : {}),
    cooldown: randomInt(source, 0, 3),
    effects,
  };
}

function skillName(
  source: RandomSource,
  words: SkillWordList,
  type: SkillType,
): string {
  const template = pick(source, words.templates);
  const noun = pick(source, words.nouns[type]);
  const gender: Gender = noun.gender ?? 'm';
  const name = template
    .replace('{noun}', noun.text)
    .replace('{adjective}', () =>
      adjectiveForm(pick(source, words.adjectives), gender),
    )
    .replace('{suffix}', () => pick(source, words.suffixes));
  return capitalize(name.replace(/\s+/g, ' ').trim());
}
