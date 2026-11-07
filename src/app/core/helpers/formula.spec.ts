import {
  AttributeFormula,
  defaultStep,
  evaluateFormula,
  formulaExpression,
  FormulaScope,
  presetExpression,
  validateFormula,
} from './formula';

/**
 * Contract: formulas are safe expressions (own parser, no eval). Other attributes' levels are read by their exact
 * name, matched case-insensitively: a bare word for names without spaces (`strength`, `agilité`), square brackets
 * for names with spaces (`[Max life]`). Errors are `{ key, position }` with a 0-based character position.
 */
const scope = (overrides: Partial<FormulaScope> = {}): FormulaScope => ({
  level: 0,
  base: 0,
  playerLevel: 0,
  ...overrides,
});
const custom = (expression: string): AttributeFormula => ({ preset: 'custom', expression });
const value = (expression: string, s: Partial<FormulaScope> = {}): number => {
  const result = evaluateFormula(custom(expression), scope(s));
  if (!result.ok) throw new Error(`${expression}: ${result.error.key} at ${result.error.position}`);
  return result.value;
};
const error = (expression: string, s: Partial<FormulaScope> = {}) => {
  const result = evaluateFormula(custom(expression), scope(s));
  return result.ok ? null : result.error;
};

describe('evaluateFormula: arithmetic', () => {
  it('follows operator precedence and left associativity', () => {
    expect(value('2 + 3 * 4')).toBe(14);
    expect(value('10 - 4 - 3')).toBe(3);
    expect(value('8 / 4 / 2')).toBe(1);
    expect(value('(2 + 3) * 4')).toBe(20);
  });

  it('reads decimals', () => {
    expect(value('1.5 * 4')).toBe(6);
  });

  it('makes ^ right associative and stronger than unary minus', () => {
    expect(value('2 ^ 3 ^ 2')).toBe(512);
    expect(value('-2 ^ 2')).toBe(-4);
  });

  it('supports unary minus', () => {
    expect(value('-3 + 5')).toBe(2);
    expect(value('4 * -2')).toBe(-8);
    expect(value('--3')).toBe(3);
  });

  it('supports min, max, floor, round and sqrt', () => {
    expect(value('min(3, 7)')).toBe(3);
    expect(value('max(3, 7, 5)')).toBe(7);
    expect(value('floor(2.9)')).toBe(2);
    expect(value('round(2.5)')).toBe(3);
    expect(value('sqrt(16) + 1')).toBe(5);
  });

  it('ignores case in function names and spaces around tokens', () => {
    expect(value('  MAX( 1 ,2 )  ')).toBe(2);
  });
});

describe('evaluateFormula: variables', () => {
  it('reads level, base and playerLevel', () => {
    expect(value('base + level * 2 + playerLevel * 100', { base: 10, level: 3, playerLevel: 2 })).toBe(216);
  });

  it('reads another attribute level by bare name, ignoring case', () => {
    expect(value('base + strength * 2', { base: 4, levels: { Strength: 3 } })).toBe(10);
  });

  it('reads accented names', () => {
    expect(value('AGILITÉ + 1', { levels: { Agilité: 4 } })).toBe(5);
  });

  it('reads names with spaces in square brackets, ignoring case', () => {
    expect(value('[max LIFE] * 2', { levels: { 'Max life': 3 } })).toBe(6);
  });
});

describe('evaluateFormula: errors', () => {
  it('reports a syntax error at the offending character', () => {
    expect(error('1 + * 2')).toEqual({ key: 'formula.errors.syntax', position: 4 });
    expect(error('2 $ 3')).toEqual({ key: 'formula.errors.syntax', position: 2 });
  });

  it('reports a missing closing parenthesis at the end of the text', () => {
    expect(error('(1 + 2')).toEqual({ key: 'formula.errors.syntax', position: 6 });
  });

  it('reports an empty expression at position 0', () => {
    expect(error('   ')).toEqual({ key: 'formula.errors.syntax', position: 0 });
  });

  it('reports an unknown name at its position', () => {
    expect(error('level + foo')).toEqual({ key: 'formula.errors.unknownName', position: 8 });
    expect(error('[No such] + 1')).toEqual({ key: 'formula.errors.unknownName', position: 0 });
  });

  it('reports a division by zero at the operator', () => {
    expect(error('4 / (level)')).toEqual({ key: 'formula.errors.divisionByZero', position: 2 });
  });

  it('reports non-finite results', () => {
    expect(error('sqrt(0 - 1)')?.key).toBe('formula.errors.notFinite');
    expect(error('10 ^ 1000')?.key).toBe('formula.errors.notFinite');
  });

  it('never runs code', () => {
    expect(error('constructor')?.key).toBe('formula.errors.unknownName');
    expect(error('alert(1)')?.key).toBe('formula.errors.unknownName');
  });
});

describe('validateFormula', () => {
  it('accepts a valid expression, with the other attribute names it may use', () => {
    expect(validateFormula(custom('base + [Max life] + strength + level'), ['Max life', 'Strength'])).toBeNull();
  });

  it('reports syntax errors without evaluating', () => {
    expect(validateFormula(custom('base +'), [])).toEqual({ key: 'formula.errors.syntax', position: 6 });
  });

  it('reports names that are neither a variable nor an attribute', () => {
    expect(validateFormula(custom('base + luck'), ['Strength'])).toEqual({
      key: 'formula.errors.unknownName',
      position: 7,
    });
  });

  it('accepts every preset', () => {
    for (const preset of ['linear', 'steep-linear', 'diminishing', 'percent'] as const) {
      expect(validateFormula({ preset, step: 2 }, [])).toBeNull();
    }
  });
});

describe('presets', () => {
  it('compile to the expressions of the ticket', () => {
    expect(presetExpression('linear')).toBe('base + level * step');
    expect(presetExpression('steep-linear')).toBe('base + level * step');
    expect(presetExpression('diminishing')).toBe('base + step * 2 * sqrt(level)');
    expect(presetExpression('percent')).toBe('base * (1 + level * step / 100)');
  });

  it('have default steps 1, 5, 1 and 10', () => {
    expect(defaultStep('linear')).toBe(1);
    expect(defaultStep('steep-linear')).toBe(5);
    expect(defaultStep('diminishing')).toBe(1);
    expect(defaultStep('percent')).toBe(10);
  });

  it('give the expression of a formula, custom as typed', () => {
    expect(formulaExpression({ preset: 'percent', step: 10 })).toBe('base * (1 + level * step / 100)');
    expect(formulaExpression(custom('base + 2'))).toBe('base + 2');
  });

  it('evaluate with the formula step', () => {
    const at = (formula: AttributeFormula, level: number) => {
      const result = evaluateFormula(formula, scope({ base: 10, level }));
      return result.ok ? result.value : NaN;
    };
    expect(at({ preset: 'linear', step: 1 }, 3)).toBe(13);
    expect(at({ preset: 'linear', step: 3 }, 2)).toBe(16);
    expect(at({ preset: 'steep-linear', step: 5 }, 2)).toBe(20);
    expect(at({ preset: 'diminishing', step: 1 }, 4)).toBe(14);
    expect(at({ preset: 'diminishing', step: 1 }, 3)).toBeCloseTo(13.4641, 4);
    expect(at({ preset: 'percent', step: 10 }, 3)).toBeCloseTo(13, 10);
    expect(at({ preset: 'percent', step: 25 }, 2)).toBeCloseTo(15, 10);
  });
});

describe('formula limits', () => {
  it('rejects expressions longer than 200 characters', () => {
    const long = '1+'.repeat(150) + '1';
    expect(error(long)?.key).toBe('formula.errors.tooLong');
    expect(validateFormula(custom(long), [])?.key).toBe('formula.errors.tooLong');
  });

  it('rejects 10000 nested parentheses or minus signs without throwing', () => {
    const parens = '('.repeat(10000) + '1' + ')'.repeat(10000);
    expect(error(parens)?.key).toBe('formula.errors.tooLong');
    expect(error('-'.repeat(10000) + '1')?.key).toBe('formula.errors.tooLong');
    expect(validateFormula(custom(parens), [])).not.toBeNull();
  });

  it('rejects deep nesting within the length limit', () => {
    expect(error('('.repeat(40) + '1' + ')'.repeat(40))?.key).toBe('formula.errors.tooDeep');
    expect(error('-'.repeat(40) + '1')?.key).toBe('formula.errors.tooDeep');
    expect(value('('.repeat(20) + '1' + ')'.repeat(20))).toBe(1);
  });

  it('treats step as an unknown name in Custom', () => {
    expect(error('base + step')?.key).toBe('formula.errors.unknownName');
    expect(validateFormula(custom('step'), [])?.key).toBe('formula.errors.unknownName');
  });
});
