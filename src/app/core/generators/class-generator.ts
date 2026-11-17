import { ClassDraft, TreeNode } from '../../modules/class/models/class';
import { Skill } from '../../modules/skill/models/skill';
import { ClassVocabulary } from './class-vocabulary';
import { adjectiveForm, capitalize } from './name-generator';
import { expandPhrase } from './phrase';
import { pick, randomInt, shuffle } from './random';
import { RandomSource } from './random-source';
import { descriptionPool, keptShared } from './shared-kinds';
import { SkillVocabulary } from './skill-vocabulary';
import { Gender } from './word-list';

const MIN_TREE_SIZE = 3;
const MAX_TREE_SIZE = 5;

/**
 * Draws a whole class: a kind, bonuses on the given attributes and a small tree from the given skills, preferring
 * those whose kind the class kind favours. Pure: same source state and inputs give the same class.
 */
export function generateClass(
  source: RandomSource,
  attributes: readonly string[],
  skills: readonly Skill[],
  vocabulary: ClassVocabulary,
  skillVocabulary: SkillVocabulary,
): ClassDraft {
  const unique = [...new Set(attributes)];
  const drawable = vocabulary.drawable();
  if (drawable.length === 0)
    throw new RangeError('generateClass: the vocabulary has no drawable kind');
  const kindId = pick(source, drawable);
  const bonuses = shuffle(source, unique)
    .slice(0, randomInt(source, 1, 2))
    .map((attribute) => ({ attribute, value: randomInt(source, 1, 3) }));
  const { name, description, shared } = classTexts(source, vocabulary, kindId);
  const favoured = vocabulary.kind(kindId)?.skills ?? [];
  return {
    name,
    description,
    kind: kindId,
    ...keptShared(shared),
    bonuses,
    tree: generateTree(source, skills, favoured, skillVocabulary),
  };
}

/** The skills whose kind chain holds a favoured skill kind: a parent kind counts for its children. */
function preferredSkills(
  skills: readonly Skill[],
  favoured: readonly string[],
  skillVocabulary: SkillVocabulary,
): { preferred: Skill[]; others: Skill[] } {
  const preferred: Skill[] = [];
  const others: Skill[] = [];
  for (const skill of skills) {
    const chain = skill.kind
      ? skillVocabulary.kind(skill.kind)?.chain
      : undefined;
    if (chain?.some((id) => favoured.includes(id))) preferred.push(skill);
    else others.push(skill);
  }
  return { preferred, others };
}

/** A root, then each skill requires one earlier skill, so the tree is acyclic and reachable. */
function generateTree(
  source: RandomSource,
  skills: readonly Skill[],
  favoured: readonly string[],
  skillVocabulary: SkillVocabulary,
): TreeNode[] {
  const { preferred, others } = preferredSkills(
    skills,
    favoured,
    skillVocabulary,
  );
  const size = Math.min(
    skills.length,
    randomInt(source, MIN_TREE_SIZE, MAX_TREE_SIZE),
  );
  const chosen =
    preferred.length >= MIN_TREE_SIZE
      ? shuffle(source, preferred).slice(0, size)
      : shuffle(source, [
          ...preferred,
          ...shuffle(source, others).slice(0, size - preferred.length),
        ]);
  const rows: number[] = [];
  const perRow = new Map<number, number>();
  const tree: TreeNode[] = [];
  chosen.forEach((skill, index) => {
    const parentIndex = index === 0 ? -1 : randomInt(source, 0, index - 1);
    const row = parentIndex < 0 ? 0 : rows[parentIndex] + 1;
    rows.push(row);
    const column = perRow.get(row) ?? 0;
    perRow.set(row, column + 1);
    tree.push({
      skillId: skill.id,
      requires:
        parentIndex < 0
          ? []
          : [
              {
                skillId: chosen[parentIndex].id,
                level: randomInt(
                  source,
                  1,
                  Math.min(2, chosen[parentIndex].maxLevel),
                ),
              },
            ],
      minLevel: 1 + row * 2,
      column,
      row,
    });
  });
  return tree;
}

/** A name and a description for a class of this kind, agreeing with the gender of its noun. */
export function classTexts(
  source: RandomSource,
  vocabulary: ClassVocabulary,
  kindId: string,
): { name: string; description: string; shared: Record<string, string> } {
  const noun = pick(source, vocabulary.nouns(kindId));
  const gender: Gender = noun.gender ?? 'm';
  const shared = vocabulary.shared.draw(source, vocabulary.sharedFits(kindId));
  const sharedWords = vocabulary.shared.words(source, shared, gender, false);
  const adjectives = vocabulary.adjectives(kindId);
  const suffixes = vocabulary.suffixes(kindId);
  const usable = (template: string): boolean =>
    (adjectives.length > 0 || !template.includes('{adjective}')) &&
    (suffixes.length > 0 || !template.includes('{suffix}')) &&
    !vocabulary.shared.undrawn(template, shared);

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

  const context = {
    params: vocabulary.params,
    gender,
    values,
    shared: sharedWords.values,
  };
  const name = capitalize(expandPhrase(source, template, context) ?? noun.text);
  const descriptions = descriptionPool(
    source,
    vocabulary.descriptions(kindId),
    sharedWords.descriptions,
  );
  const description =
    descriptions.length > 0
      ? (expandPhrase(source, pick(source, descriptions), context) ?? '')
      : '';
  return { name, description, shared };
}
