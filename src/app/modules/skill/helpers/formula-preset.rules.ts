import { FormulaError, validateFormula } from '../../../core/helpers/formula';
import { FormulaPreset } from '../models/formula-preset';

const PLACEHOLDER = /\{(target\.)?([A-Z])\}/g;
const NAME_TOKEN = /\[([^\]]+)\]|[\p{L}_][\p{L}\p{N}_]*/gu;
const PLAIN_NAME = /^[\p{L}_][\p{L}\p{N}_]*$/u;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DUMMY = 'Dummy';

/** The placeholders of a formula, caster (`{A}`) and target (`{target.A}`), in order of appearance, once each. */
export function placeholders(formula: string): string[] {
  const found: string[] = [];
  for (const match of formula.matchAll(PLACEHOLDER)) {
    if (!found.includes(match[0])) found.push(match[0]);
  }
  return found;
}

const variable = (name: string): string =>
  PLAIN_NAME.test(name) ? name : `[${name}]`;

/** The formula with every placeholder replaced by the attribute it is mapped to (`target_<name>` for the target's). */
export function applyPreset(
  preset: Pick<FormulaPreset, 'formula'>,
  mapping: Record<string, string>,
): string {
  return preset.formula.replace(PLACEHOLDER, (token, target?: string) => {
    const name = mapping[token];
    if (name === undefined) return token;
    return variable(target ? `target_${name}` : name);
  });
}

/** The same check as a skill formula, with a dummy attribute standing for every placeholder. */
export function validatePreset(
  preset: Pick<FormulaPreset, 'formula'>,
): FormulaError | null {
  const mapping = Object.fromEntries(
    placeholders(preset.formula).map((token) => [token, DUMMY]),
  );
  return validateFormula(
    { preset: 'custom', expression: applyPreset(preset, mapping) },
    [DUMMY, `target_${DUMMY}`, 'skillLevel', 'roll'],
    ['level'],
  );
}

/**
 * Turns the world attribute names of a formula into placeholders, a letter per name in order of first appearance.
 * Past 26 distinct names every further one collapses to `Z`.
 */
export function toPresetFormula(
  formula: string,
  attributeNames: string[],
): string {
  const letters = new Map<string, string>();
  const letterOf = (name: string): string => {
    if (!letters.has(name)) letters.set(name, LETTERS[letters.size] ?? 'Z');
    return letters.get(name)!;
  };
  return formula.replace(NAME_TOKEN, (word, bracketed?: string) => {
    const text = bracketed ?? word;
    if (attributeNames.includes(text)) return `{${letterOf(text)}}`;
    if (text.startsWith('target_')) {
      const name = text.slice('target_'.length);
      if (attributeNames.includes(name)) return `{target.${letterOf(name)}}`;
    }
    return word;
  });
}

const builtIn = (
  id: string,
  kind: FormulaPreset['kind'],
  formula: string,
): FormulaPreset => ({
  id: `builtin-${id}`,
  name: `skill.presets.builtIn.${id}.name`,
  kind,
  formula,
  description: `skill.presets.builtIn.${id}.description`,
  builtIn: true,
});

export const BUILT_IN_PRESETS: FormulaPreset[] = [
  builtIn('rollPlusAttribute', 'success', 'roll + {A} - 10'),
  builtIn('rollAgainstTarget', 'success', 'roll + {A} - {target.A}'),
  builtIn('rollPlusLevel', 'success', 'roll + skillLevel * 2 - 10'),
  builtIn('perLevel', 'effect', 'skillLevel * 5'),
  builtIn('attributeScaled', 'effect', 'floor({A} * 0.5) + skillLevel * 3'),
  builtIn('rollScaled', 'effect', 'roll * skillLevel'),
  builtIn('overTarget', 'effect', 'max(1, {A} - {target.A}) + skillLevel'),
];
