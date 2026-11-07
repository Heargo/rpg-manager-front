import { WorldDraft } from '../models/world';

export const WORLD_NAME_MAX_LENGTH = 48;
export const ATTRIBUTE_NAME_MAX_LENGTH = 24;

/** Field → translation key of the problem. Empty when the draft can be saved. */
export type WorldDraftErrors = Partial<Record<'name' | 'attributes' | 'startingStatPoints' | 'startingMoney' | 'moneySymbol', string>>;

/** What the wizard checks before creating a world. */
export function validateWorldDraft(draft: WorldDraft): WorldDraftErrors {
  const errors: WorldDraftErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'world.errors.nameRequired';
  else if (name.length > WORLD_NAME_MAX_LENGTH) errors.name = 'world.errors.nameTooLong';

  const names = draft.attributes.map((attribute) => attribute.name.trim().toLocaleLowerCase());
  if (names.some((attributeName) => !attributeName)) errors.attributes = 'world.errors.attributeNameRequired';
  else if (names.some((attributeName) => attributeName.length > ATTRIBUTE_NAME_MAX_LENGTH)) errors.attributes = 'world.errors.attributeNameTooLong';
  else if (new Set(names).size !== names.length) errors.attributes = 'world.errors.attributeNamesUnique';
  else if (draft.attributes.some((attribute) => !Number.isInteger(attribute.baseValue))) errors.attributes = 'world.errors.baseValueInteger';

  if (!isNonNegativeInteger(draft.startingStatPoints ?? 0)) errors.startingStatPoints = 'world.errors.nonNegativeInteger';
  if (!isNonNegativeInteger(draft.startingMoney ?? 0)) errors.startingMoney = 'world.errors.nonNegativeInteger';
  if (draft.moneyFormat?.kind === 'custom' && !draft.moneyFormat.symbol.trim()) errors.moneySymbol = 'world.errors.symbolRequired';
  return errors;
}

export function isDraftValid(draft: WorldDraft): boolean {
  return Object.keys(validateWorldDraft(draft)).length === 0;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
