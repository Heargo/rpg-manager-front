import { validateFormula } from '../../../core/helpers/formula';
import { World } from '../../world/models/world';
import { createSandboxWorld } from '../../world/helpers/default-world';
import en from '../../../../../public/i18n/en.json';
import fr from '../../../../../public/i18n/fr.json';
import { formulaVariables } from './skill-formula-variables';

describe('formulaVariables', () => {
  const world: World = {
    ...createSandboxWorld((key) => key),
    attributes: [
      { id: 'life', name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } },
      { id: 'str', name: 'Strength', baseValue: 5, formula: { preset: 'linear', step: 1 } },
    ],
  };
  const lookup = (dict: unknown, key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dict);

  it('lists the fixed variables, each caster attribute and each target attribute, in that order', () => {
    expect(formulaVariables(world).map((v) => [v.name, v.kind])).toEqual([
      ['roll', 'fixed'],
      ['skillLevel', 'fixed'],
      ['level', 'fixed'],
      ['Life', 'caster'],
      ['Strength', 'caster'],
      ['target_Life', 'target'],
      ['target_Strength', 'target'],
    ]);
  });

  it('lists only the fixed variables for a world without attributes', () => {
    expect(formulaVariables({ ...world, attributes: [] }).map((v) => v.name)).toEqual(['roll', 'skillLevel', 'level']);
  });

  it('lists names the success formula validator accepts', () => {
    const names = world.attributes.map((a) => a.name);
    const known = [...names, ...names.map((n) => 'target_' + n), 'skillLevel', 'roll'];
    for (const variable of formulaVariables(world)) {
      expect(
        validateFormula({ preset: 'custom', expression: variable.name }, known, ['level']),
        variable.name,
      ).toBeFalsy();
    }
  });

  it('gives every variable a description key translated in FR and EN', () => {
    for (const variable of formulaVariables(world)) {
      expect(typeof lookup(en, variable.descriptionKey), `en ${variable.descriptionKey}`).toBe('string');
      expect(typeof lookup(fr, variable.descriptionKey), `fr ${variable.descriptionKey}`).toBe('string');
    }
  });
});
