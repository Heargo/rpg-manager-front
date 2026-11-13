import { World } from '../../world/models/world';

export type FormulaVariableKind = 'fixed' | 'caster' | 'target';

export interface FormulaVariable {
  name: string;
  kind: FormulaVariableKind;
  /** i18n key of the plain-words description. */
  descriptionKey: string;
}

/** The variables a skill formula can read: the fixed ones, the caster's attributes, then the target's (`target_<name>`). */
export function formulaVariables(world: World): FormulaVariable[] {
  const names = world.attributes.map((attribute) => attribute.name);
  return [
    { name: 'roll', kind: 'fixed', descriptionKey: 'skill.variables.roll' },
    {
      name: 'skillLevel',
      kind: 'fixed',
      descriptionKey: 'skill.variables.skillLevel',
    },
    { name: 'level', kind: 'fixed', descriptionKey: 'skill.variables.level' },
    ...names.map((name) => ({
      name,
      kind: 'caster' as const,
      descriptionKey: 'skill.variables.caster',
    })),
    ...names.map((name) => ({
      name: 'target_' + name,
      kind: 'target' as const,
      descriptionKey: 'skill.variables.target',
    })),
  ];
}
