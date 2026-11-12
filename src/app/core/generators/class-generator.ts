import { ClassDraft, TreeNode } from '../../modules/class/models/class';
import { Skill } from '../../modules/skill/models/skill';
import { adjectiveForm, capitalize } from './name-generator';
import { pick, randomInt, shuffle } from './random';
import { RandomSource } from './random-source';
import { Adjective, Gender, Noun } from './word-list';

/** Class name patterns use `{noun}`, `{adjective}` and `{suffix}`; word order is the language's. */
export interface ClassWordList {
  version: number;
  templates: string[];
  nouns: Noun[];
  adjectives: Adjective[];
  suffixes: string[];
  descriptions: string[];
}

const MAX_TREE_SIZE = 5;

/** Draws a whole class: bonuses on the given attributes and a small tree from the given skills. Pure. */
export function generateClass(
  source: RandomSource,
  attributes: readonly string[],
  skills: readonly Skill[],
  words: ClassWordList,
): ClassDraft {
  const unique = [...new Set(attributes)];
  const bonuses = shuffle(source, unique)
    .slice(0, randomInt(source, 1, 2))
    .map((attribute) => ({ attribute, value: randomInt(source, 1, 3) }));
  return {
    name: className(source, words),
    description: pick(source, words.descriptions),
    bonuses,
    tree: generateTree(source, skills),
  };
}

/** A root, then each skill requires one earlier skill, so the tree is acyclic and reachable. */
function generateTree(
  source: RandomSource,
  skills: readonly Skill[],
): TreeNode[] {
  const chosen = shuffle(source, skills).slice(
    0,
    Math.min(skills.length, randomInt(source, 3, MAX_TREE_SIZE)),
  );
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
                rank: randomInt(
                  source,
                  1,
                  Math.min(2, chosen[parentIndex].maxRank),
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

function className(source: RandomSource, words: ClassWordList): string {
  const template = pick(source, words.templates);
  const noun = pick(source, words.nouns);
  const gender: Gender = noun.gender ?? 'm';
  const name = template
    .replace('{noun}', noun.text)
    .replace('{adjective}', () =>
      adjectiveForm(pick(source, words.adjectives), gender),
    )
    .replace('{suffix}', () => pick(source, words.suffixes));
  return capitalize(name.replace(/\s+/g, ' ').trim());
}
