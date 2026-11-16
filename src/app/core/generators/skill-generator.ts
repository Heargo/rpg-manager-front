import { ITEM_RARITIES } from '../models/item';
import {
  SkillDraft,
  SkillEffect,
  SkillTarget,
} from '../../modules/skill/models/skill';
import { adjectiveForm, capitalize } from './name-generator';
import { expandPhrase } from './phrase';
import { pick, randomInt, shuffle, weightedPick } from './random';
import { RandomSource } from './random-source';
import { RARITY_WEIGHTS } from './item-generator';
import { SkillVocabulary } from './skill-vocabulary';
import { Gender } from './word-list';

const EFFECT_KINDS = ['damage', 'heal', 'modify'] as const;

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
  vocabulary: SkillVocabulary,
): SkillDraft {
  const unique = [...new Set(attributes)];
  const rarity = weightedPick(source, RARITY_WEIGHTS);
  const tier = ITEM_RARITIES.indexOf(rarity);
  const drawable = vocabulary.drawable();
  if (drawable.length === 0)
    throw new RangeError('generateSkill: the vocabulary has no drawable kind');
  const kindId = pick(source, drawable);
  const info = vocabulary.kind(kindId)!;
  const type = info.type;
  const maxLevel = randomInt(source, 1, 3 + tier);
  const { name, description } = skillTexts(source, vocabulary, kindId);
  const base = {
    name,
    description,
    kind: kindId,
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

  const kind = info.effect ?? pick(source, EFFECT_KINDS);
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

/** A name and a description for a skill of this kind, agreeing with the gender of its noun. */
export function skillTexts(
  source: RandomSource,
  vocabulary: SkillVocabulary,
  kindId: string,
): { name: string; description: string } {
  const noun = pick(source, vocabulary.nouns(kindId));
  const gender: Gender = noun.gender ?? 'm';
  const adjectives = vocabulary.adjectives(kindId);
  const suffixes = vocabulary.suffixes(kindId);
  const usable = (template: string): boolean =>
    (adjectives.length > 0 || !template.includes('{adjective}')) &&
    (suffixes.length > 0 || !template.includes('{suffix}'));

  const fromKind = vocabulary.names(kindId).filter(usable);
  const templates =
    fromKind.length > 0 ? fromKind : vocabulary.templates().filter(usable);
  const template = templates.length > 0 ? pick(source, templates) : '{noun}';

  const values: Partial<Record<'noun' | 'adjective' | 'suffix', string>> = {
    noun: noun.text,
  };
  if (template.includes('{adjective}'))
    values.adjective = adjectiveForm(pick(source, adjectives), gender);
  if (template.includes('{suffix}')) values.suffix = pick(source, suffixes);

  const context = { params: vocabulary.params, gender, values };
  const name = capitalize(expandPhrase(source, template, context) ?? noun.text);
  const descriptions = vocabulary.descriptions(kindId);
  const description =
    descriptions.length > 0
      ? (expandPhrase(source, pick(source, descriptions), context) ?? '')
      : '';
  return { name, description };
}
