import { validateFormula } from '../../../core/helpers/formula';
import { FormulaPreset } from '../models/formula-preset';
import {
  BUILT_IN_PRESETS,
  applyPreset,
  placeholders,
  toPresetFormula,
  validatePreset,
} from './formula-preset.rules';

const preset = (
  formula: string,
  kind: 'success' | 'effect' = 'effect',
): FormulaPreset => ({
  id: 'p',
  name: 'Test',
  kind,
  formula,
  description: '',
  builtIn: false,
});

describe('placeholders', () => {
  it('lists caster then target placeholders in order of appearance, once each', () => {
    expect(placeholders('{A} + {target.A} * {B} + {A}')).toEqual([
      '{A}',
      '{target.A}',
      '{B}',
    ]);
  });

  it('is empty for a formula without placeholders', () => {
    expect(placeholders('roll + skillLevel * 2')).toEqual([]);
  });
});

describe('applyPreset', () => {
  it('writes real names, with target_<name> for the target', () => {
    expect(
      applyPreset(preset('{A} * 2 + {target.B}'), {
        '{A}': 'Life',
        '{target.B}': 'Strength',
      }),
    ).toBe('Life * 2 + target_Strength');
  });

  it('replaces every occurrence and leaves fixed variables as they are', () => {
    expect(
      applyPreset(preset('roll + {A} + {A} * level'), { '{A}': 'Life' }),
    ).toBe('roll + Life + Life * level');
  });
});

describe('validatePreset', () => {
  it('accepts a formula with placeholders, fixed variables and functions', () => {
    expect(
      validatePreset(
        preset('max({A}, {target.A}) + roll + skillLevel + level'),
      ),
    ).toBeNull();
  });

  it('rejects an unknown variable', () => {
    expect(validatePreset(preset('{A} + Luck'))).not.toBeNull();
  });

  it('rejects bad syntax', () => {
    expect(validatePreset(preset('{A} +'))).not.toBeNull();
  });

  it('rejects the old rank variable', () => {
    expect(validatePreset(preset('rank + 1'))).not.toBeNull();
  });
});

describe('toPresetFormula', () => {
  it('turns world attribute names into placeholders, target ones included', () => {
    expect(
      toPresetFormula('Life + target_Strength * 2', ['Life', 'Strength']),
    ).toBe('{A} + {target.B} * 2');
  });

  it('uses the same letter for the same name as caster and target', () => {
    expect(toPresetFormula('Life - target_Life', ['Life', 'Strength'])).toBe(
      '{A} - {target.A}',
    );
  });

  it('assigns letters in order of first appearance and leaves fixed variables alone', () => {
    expect(
      toPresetFormula('roll + skillLevel * Strength + Life', [
        'Life',
        'Strength',
      ]),
    ).toBe('roll + skillLevel * {A} + {B}');
  });

  it('does not touch a longer word that contains an attribute name', () => {
    expect(toPresetFormula('Life + Lifeforce', ['Life'])).toBe(
      '{A} + Lifeforce',
    );
  });
});

describe('BUILT_IN_PRESETS', () => {
  it('ships at least 2 success and 3 effect presets', () => {
    expect(
      BUILT_IN_PRESETS.filter((p) => p.kind === 'success').length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      BUILT_IN_PRESETS.filter((p) => p.kind === 'effect').length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('are all valid, read-only and have unique ids', () => {
    for (const p of BUILT_IN_PRESETS) {
      expect(validatePreset(p)).toBeNull();
      expect(p.builtIn).toBe(true);
    }
    expect(new Set(BUILT_IN_PRESETS.map((p) => p.id)).size).toBe(
      BUILT_IN_PRESETS.length,
    );
  });

  it('produce a valid formula once applied to real attributes', () => {
    for (const p of BUILT_IN_PRESETS) {
      const mapping = Object.fromEntries(
        placeholders(p.formula).map((token) => [token, 'Life']),
      );
      const formula = applyPreset(p, mapping);
      expect(
        validateFormula(
          { preset: 'custom', expression: formula },
          ['Life', 'target_Life', 'skillLevel', 'roll'],
          ['level'],
        ),
      ).toBeNull();
    }
  });
});
