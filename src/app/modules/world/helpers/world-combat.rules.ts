import { normalizeName, validateFormula } from '../../../core/helpers/formula';
import { CombatRules, INITIATIVE_MODES } from '../models/world';

/** The spec's default combat settings; the life attribute is the world's life bar when it has one. */
export function defaultCombatRules(lifeName?: string): CombatRules {
  return {
    ...(lifeName === undefined ? {} : { lifeAttribute: lifeName }),
    initiative: { mode: 'rolled', dice: { count: 1, faces: 20 }, formula: '0' },
    actionTypes: [
      { name: 'Action', count: 1 },
      { name: 'Movement', count: 1 },
    ],
    grid: { enabled: false, columns: 10, rows: 10 },
    movement: '6',
  };
}

export const COMBAT_DICE_MAX_COUNT = 100;
export const COMBAT_DICE_MAX_FACES = 1000;

export type CombatErrorField =
  | 'combatLifeAttribute'
  | 'combatInitiative'
  | 'combatActionTypes'
  | 'combatGrid'
  | 'combatMovement'
  | 'combatBasicAttack'
  | 'combatDefence';

/** True when the formula parses and only reads `level`, `base`, `playerLevel` and the given attribute names. */
export function isCombatFormulaValid(
  expression: string,
  attributeNames: string[],
): boolean {
  return (
    validateFormula({ preset: 'custom', expression }, attributeNames) === null
  );
}

/** Field → translation key of the problem in the combat settings; empty when they are fine. */
export function validateCombatRules(
  combat: CombatRules,
  attributeNames: string[],
): Partial<Record<CombatErrorField, string>> {
  const errors: Partial<Record<CombatErrorField, string>> = {};
  const names = attributeNames.map((name) => name.trim());
  const life = combat.lifeAttribute;
  if (
    life !== undefined &&
    !names.some((name) => normalizeName(name) === normalizeName(life.trim()))
  )
    errors.combatLifeAttribute = 'world.errors.combatLifeUnknown';

  const { dice } = combat.initiative;
  if (
    !Number.isInteger(dice.count) ||
    dice.count < 1 ||
    dice.count > COMBAT_DICE_MAX_COUNT ||
    !Number.isInteger(dice.faces) ||
    dice.faces < 2 ||
    dice.faces > COMBAT_DICE_MAX_FACES
  )
    errors.combatInitiative = 'world.errors.combatDiceInvalid';
  else if (!isCombatFormulaValid(combat.initiative.formula, names))
    errors.combatInitiative = 'world.errors.formulaInvalid';

  const actionNames = combat.actionTypes.map((action) =>
    normalizeName(action.name.trim()),
  );
  if (
    combat.actionTypes.some(
      (action, i) =>
        !actionNames[i] || !Number.isInteger(action.count) || action.count < 1,
    ) ||
    new Set(actionNames).size !== actionNames.length
  )
    errors.combatActionTypes = 'world.errors.combatActionTypes';

  if (
    combat.grid.enabled &&
    (!Number.isInteger(combat.grid.columns) ||
      combat.grid.columns < 1 ||
      !Number.isInteger(combat.grid.rows) ||
      combat.grid.rows < 1)
  )
    errors.combatGrid = 'world.errors.combatGrid';

  if (!isCombatFormulaValid(combat.movement, names))
    errors.combatMovement = 'world.errors.formulaInvalid';
  if (combat.basicAttack && !isCombatFormulaValid(combat.basicAttack, names))
    errors.combatBasicAttack = 'world.errors.formulaInvalid';
  if (combat.defence && !isCombatFormulaValid(combat.defence, names))
    errors.combatDefence = 'world.errors.formulaInvalid';
  return errors;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Problems of an imported `world.combat` block (empty when it is a valid CombatRules). */
export function combatImportProblems(
  value: unknown,
  attributeNames: string[],
): string[] {
  if (!isRecord(value)) return ['world.combat must be an object'];
  const problems: string[] = [];
  const initiative = value['initiative'];
  const dice = isRecord(initiative) ? initiative['dice'] : undefined;
  if (
    !isRecord(initiative) ||
    !(INITIATIVE_MODES as readonly unknown[]).includes(initiative['mode']) ||
    typeof initiative['formula'] !== 'string' ||
    !isRecord(dice) ||
    typeof dice['count'] !== 'number' ||
    typeof dice['faces'] !== 'number'
  )
    problems.push('world.combat.initiative is invalid');
  const actions = value['actionTypes'];
  if (
    !Array.isArray(actions) ||
    !actions.every(
      (action) =>
        isRecord(action) &&
        typeof action['name'] === 'string' &&
        typeof action['count'] === 'number',
    )
  )
    problems.push('world.combat.actionTypes is invalid');
  const grid = value['grid'];
  if (
    !isRecord(grid) ||
    typeof grid['enabled'] !== 'boolean' ||
    typeof grid['columns'] !== 'number' ||
    typeof grid['rows'] !== 'number'
  )
    problems.push('world.combat.grid is invalid');
  else if (grid['imageId'] !== undefined && typeof grid['imageId'] !== 'string')
    problems.push('world.combat.grid is invalid');
  if (typeof value['movement'] !== 'string')
    problems.push('world.combat.movement must be a string');
  for (const key of ['lifeAttribute', 'basicAttack', 'defence'] as const) {
    if (value[key] !== undefined && typeof value[key] !== 'string')
      problems.push(`world.combat.${key} must be a string`);
  }
  if (problems.length === 0) {
    const errors = validateCombatRules(
      value as unknown as CombatRules,
      attributeNames,
    );
    for (const field of Object.keys(errors))
      problems.push(`world.combat.${field} is invalid`);
  }
  return problems;
}
