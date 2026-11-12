export const FORMULA_PRESET_KINDS = ['success', 'effect'] as const;
export type FormulaPresetKind = (typeof FORMULA_PRESET_KINDS)[number];

/**
 * A reusable skill formula. `{A}`, `{B}`… stand for the caster's attributes and `{target.A}`… for the target's;
 * they are replaced by real world attributes when the preset is applied. A built-in's `name` and `description`
 * are i18n keys; a user preset holds plain text.
 */
export interface FormulaPreset {
  id: string;
  name: string;
  kind: FormulaPresetKind;
  formula: string;
  description: string;
  builtIn: boolean;
}

/** What a user writes to create or edit a preset. */
export type FormulaPresetDraft = Pick<
  FormulaPreset,
  'name' | 'kind' | 'formula' | 'description'
>;
