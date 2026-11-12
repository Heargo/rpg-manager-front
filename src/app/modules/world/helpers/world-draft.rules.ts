import {
  FormulaError,
  checkAttributeFormula,
  normalizeName,
} from '../../../core/helpers/formula';
import {
  isValidMaxLevel,
  validateLevelCurve,
} from '../../character/helpers/level.rules';
import { WorldDraft } from '../models/world';

export const WORLD_NAME_MAX_LENGTH = 48;
export const ATTRIBUTE_NAME_MAX_LENGTH = 24;

/** Field → translation key of the problem. Empty when the draft can be saved. */
export type WorldDraftErrors = Partial<
  Record<
    | 'name'
    | 'attributes'
    | 'startingStatPoints'
    | 'startingMoney'
    | 'levelCurve'
    | 'maxLevel'
    | 'statPointsPerLevel'
    | 'startingSkillPoints'
    | 'skillPointsPerLevel'
    | 'sellAnywhereRatio'
    | 'merchantBuyRatio'
    | 'merchantSellRatio',
    string
  >
>;

/** What the wizard checks before creating a world. */
export function validateWorldDraft(draft: WorldDraft): WorldDraftErrors {
  const errors: WorldDraftErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'world.errors.nameRequired';
  else if (name.length > WORLD_NAME_MAX_LENGTH)
    errors.name = 'world.errors.nameTooLong';

  const names = draft.attributes.map((attribute) =>
    normalizeName(attribute.name.trim()),
  );
  if (names.some((attributeName) => !attributeName))
    errors.attributes = 'world.errors.attributeNameRequired';
  else if (
    names.some(
      (attributeName) => attributeName.length > ATTRIBUTE_NAME_MAX_LENGTH,
    )
  )
    errors.attributes = 'world.errors.attributeNameTooLong';
  else if (new Set(names).size !== names.length)
    errors.attributes = 'world.errors.attributeNamesUnique';
  else if (
    draft.attributes.some((attribute) => !Number.isInteger(attribute.baseValue))
  )
    errors.attributes = 'world.errors.baseValueInteger';
  else if (draft.attributes.some((attribute) => attributeCapError(attribute)))
    errors.attributes = draft.attributes.map(attributeCapError).find(Boolean)!;
  else if (attributeFormulaErrors(draft).some(Boolean))
    errors.attributes = 'world.errors.formulaInvalid';

  if (!isNonNegativeInteger(draft.startingStatPoints ?? 0))
    errors.startingStatPoints = 'world.errors.nonNegativeInteger';
  if (!isNonNegativeInteger(draft.startingMoney ?? 0))
    errors.startingMoney = 'world.errors.nonNegativeInteger';
  if (draft.levelCurve) {
    const problem = validateLevelCurve(draft.levelCurve);
    if (problem) errors.levelCurve = problem;
  }
  if (draft.maxLevel !== undefined && !isValidMaxLevel(draft.maxLevel))
    errors.maxLevel = 'world.errors.maxLevelInvalid';
  if (!isNonNegativeInteger(draft.statPointsPerLevel ?? 0))
    errors.statPointsPerLevel = 'world.errors.nonNegativeInteger';
  if (!isNonNegativeInteger(draft.startingSkillPoints ?? 1))
    errors.startingSkillPoints = 'world.errors.nonNegativeInteger';
  if (!isNonNegativeInteger(draft.skillPointsPerLevel ?? 1))
    errors.skillPointsPerLevel = 'world.errors.nonNegativeInteger';
  for (const field of [
    'sellAnywhereRatio',
    'merchantBuyRatio',
    'merchantSellRatio',
  ] as const) {
    const ratio = draft[field];
    if (ratio !== undefined && !(ratio >= 0 && ratio <= 10))
      errors[field] = 'world.errors.ratioInvalid';
  }
  return errors;
}

/** The problem of an attribute's optional cap (an integer of at least 1, and at least the base value), or null. */
export function attributeCapError(attribute: {
  baseValue: number;
  cap?: number;
}): 'world.errors.capInvalid' | 'world.errors.capTooLow' | null {
  if (attribute.cap === undefined) return null;
  if (!Number.isInteger(attribute.cap) || attribute.cap < 1)
    return 'world.errors.capInvalid';
  return attribute.cap < attribute.baseValue ? 'world.errors.capTooLow' : null;
}

/** Per attribute, the problem of its formula (null when valid); formulas may read any attribute of the draft. */
export function attributeFormulaErrors(
  draft: WorldDraft,
): ((FormulaError & { level?: number }) | null)[] {
  const names = draft.attributes.map((attribute) => attribute.name.trim());
  return draft.attributes.map((attribute) =>
    checkAttributeFormula(attribute.formula, names, attribute.baseValue),
  );
}

export function isDraftValid(draft: WorldDraft): boolean {
  return Object.keys(validateWorldDraft(draft)).length === 0;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
