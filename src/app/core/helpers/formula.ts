/**
 * Safe formulas for attribute maxima: an own recursive-descent parser (no `eval`, no `Function`).
 *
 * Grammar: numbers, `+ - * / ^`, unary minus, parentheses, `min max floor round sqrt`, the variables
 * `level base step playerLevel`, and other attributes' levels by exact name matched case-insensitively
 * (a bare word for names without spaces, `[square brackets]` for any name).
 */
export type FormulaPreset =
  'linear' | 'steep-linear' | 'diminishing' | 'percent';

export type AttributeFormula =
  | { preset: FormulaPreset; step: number }
  | { preset: 'custom'; expression: string };

export interface FormulaScope {
  level: number;
  base: number;
  playerLevel: number;
  /** Other attributes' levels by attribute name. */
  levels?: Record<string, number>;
}

export interface FormulaError {
  key:
    | 'formula.errors.syntax'
    | 'formula.errors.unknownName'
    | 'formula.errors.divisionByZero'
    | 'formula.errors.notFinite'
    | 'formula.errors.negative'
    | 'formula.errors.tooLong'
    | 'formula.errors.tooDeep';
  /** 0-based character position in the expression. */
  position: number;
}

export type FormulaResult =
  { ok: true; value: number } | { ok: false; error: FormulaError };

const PRESET_EXPRESSIONS: Record<FormulaPreset, string> = {
  linear: 'base + level * step',
  'steep-linear': 'base + level * step',
  diminishing: 'base + step * 2 * sqrt(level)',
  percent: 'base * (1 + level * step / 100)',
};
const DEFAULT_STEPS: Record<FormulaPreset, number> = {
  linear: 1,
  'steep-linear': 5,
  diminishing: 1,
  percent: 10,
};
const VARIABLES = ['level', 'base', 'playerlevel'];
export const FORMULA_MAX_LENGTH = 200;
export const FORMULA_MAX_DEPTH = 32;
const FUNCTIONS: Record<string, (args: number[]) => number> = {
  min: (args) => Math.min(...args),
  max: (args) => Math.max(...args),
  floor: (args) => Math.floor(args[0]),
  round: (args) => Math.round(args[0]),
  sqrt: (args) => Math.sqrt(args[0]),
};
const SINGLE_ARGUMENT = new Set(['floor', 'round', 'sqrt']);

export const presetExpression = (preset: FormulaPreset): string =>
  PRESET_EXPRESSIONS[preset];
export const defaultStep = (preset: FormulaPreset): number =>
  DEFAULT_STEPS[preset];
export const formulaExpression = (formula: AttributeFormula): string =>
  formula.preset === 'custom'
    ? formula.expression
    : PRESET_EXPRESSIONS[formula.preset];

type Token =
  | { kind: 'num'; value: number; position: number }
  | { kind: 'name'; text: string; bracketed: boolean; position: number }
  | { kind: 'op'; text: string; position: number }
  | { kind: 'end'; position: number }
  | { kind: 'invalid'; position: number };

type Node =
  | { t: 'num'; value: number }
  | { t: 'name'; text: string; bracketed: boolean; position: number }
  | { t: 'neg'; arg: Node; position: number }
  | { t: 'bin'; op: string; left: Node; right: Node; position: number }
  | { t: 'call'; name: string; args: Node[]; position: number };

class FormulaFailure {
  constructor(readonly error: FormulaError) {}
}
const fail = (key: FormulaError['key'], position: number): never => {
  throw new FormulaFailure({ key, position });
};

const NAME_START = /[\p{L}_]/u;
const NAME_PART = /[\p{L}\p{N}_]/u;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (/\s/.test(char)) {
      i++;
    } else if (/[0-9.]/.test(char)) {
      const match = /^(\d+\.?\d*|\.\d+)/.exec(text.slice(i));
      if (!match) {
        tokens.push({ kind: 'invalid', position: i });
        return tokens;
      }
      tokens.push({ kind: 'num', value: Number(match[0]), position: i });
      i += match[0].length;
    } else if (NAME_START.test(char)) {
      let end = i + 1;
      while (end < text.length && NAME_PART.test(text[end])) end++;
      tokens.push({
        kind: 'name',
        text: text.slice(i, end),
        bracketed: false,
        position: i,
      });
      i = end;
    } else if (char === '[') {
      const end = text.indexOf(']', i);
      const inner = end < 0 ? '' : text.slice(i + 1, end).trim();
      if (!inner) {
        tokens.push({ kind: 'invalid', position: end < 0 ? text.length : i });
        return tokens;
      }
      tokens.push({ kind: 'name', text: inner, bracketed: true, position: i });
      i = end + 1;
    } else if ('+-*/^(),'.includes(char)) {
      tokens.push({ kind: 'op', text: char, position: i });
      i++;
    } else {
      tokens.push({ kind: 'invalid', position: i });
      return tokens;
    }
  }
  tokens.push({ kind: 'end', position: text.length });
  return tokens;
}

class Parser {
  private index = 0;
  private depth = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    if (this.peek().kind === 'end') fail('formula.errors.syntax', 0);
    const node = this.additive();
    const token = this.peek();
    if (token.kind !== 'end') fail('formula.errors.syntax', token.position);
    return node;
  }

  private peek(): Token {
    return this.tokens[Math.min(this.index, this.tokens.length - 1)];
  }

  private isOp(text: string): boolean {
    const token = this.peek();
    return token.kind === 'op' && token.text === text;
  }

  private additive(): Node {
    let left = this.multiplicative();
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.next() as Extract<Token, { kind: 'op' }>;
      left = {
        t: 'bin',
        op: op.text,
        left,
        right: this.multiplicative(),
        position: op.position,
      };
    }
    return left;
  }

  private multiplicative(): Node {
    let left = this.unary();
    while (this.isOp('*') || this.isOp('/')) {
      const op = this.next() as Extract<Token, { kind: 'op' }>;
      left = {
        t: 'bin',
        op: op.text,
        left,
        right: this.unary(),
        position: op.position,
      };
    }
    return left;
  }

  private unary(): Node {
    if (this.isOp('-')) {
      const op = this.next() as Extract<Token, { kind: 'op' }>;
      this.enter(op.position);
      const arg = this.unary();
      this.depth--;
      return { t: 'neg', arg, position: op.position };
    }
    return this.power();
  }

  private power(): Node {
    const left = this.primary();
    if (this.isOp('^')) {
      const op = this.next() as Extract<Token, { kind: 'op' }>;
      return {
        t: 'bin',
        op: '^',
        left,
        right: this.unary(),
        position: op.position,
      };
    }
    return left;
  }

  private primary(): Node {
    const token = this.next();
    if (token.kind === 'num') return { t: 'num', value: token.value };
    if (token.kind === 'name') {
      if (!token.bracketed && this.isOp('(')) return this.call(token);
      return {
        t: 'name',
        text: token.text,
        bracketed: token.bracketed,
        position: token.position,
      };
    }
    if (token.kind === 'op' && token.text === '(') {
      this.enter(token.position);
      const inner = this.additive();
      this.expectClose();
      this.depth--;
      return inner;
    }
    return fail('formula.errors.syntax', token.position);
  }

  private call(name: Extract<Token, { kind: 'name' }>): Node {
    const key = name.text.toLowerCase();
    if (!Object.hasOwn(FUNCTIONS, key))
      fail('formula.errors.unknownName', name.position);
    this.next();
    this.enter(name.position);
    const args: Node[] = [this.additive()];
    while (this.isOp(',')) {
      this.next();
      args.push(this.additive());
    }
    this.expectClose();
    this.depth--;
    if (SINGLE_ARGUMENT.has(key) && args.length !== 1)
      fail('formula.errors.syntax', name.position);
    return { t: 'call', name: key, args, position: name.position };
  }

  private enter(position: number): void {
    if (++this.depth > FORMULA_MAX_DEPTH)
      fail('formula.errors.tooDeep', position);
  }

  private expectClose(): void {
    const token = this.next();
    if (!(token.kind === 'op' && token.text === ')'))
      fail('formula.errors.syntax', token.position);
  }

  private next(): Token {
    const token = this.peek();
    if (token.kind !== 'end') this.index++;
    return token;
  }
}

function parse(expression: string): Node {
  if (expression.length > FORMULA_MAX_LENGTH)
    fail('formula.errors.tooLong', FORMULA_MAX_LENGTH);
  return new Parser(tokenize(expression)).parse();
}

/** Names compare case- and accent-insensitively. */
export const normalizeName = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
const lower = normalizeName;

const variablesOf = (formula: AttributeFormula): string[] =>
  formula.preset === 'custom' ? VARIABLES : [...VARIABLES, 'step'];

function checkNames(node: Node, known: Set<string>, variables: string[]): void {
  switch (node.t) {
    case 'name':
      if (
        !(node.bracketed ? false : variables.includes(lower(node.text))) &&
        !known.has(lower(node.text))
      ) {
        fail('formula.errors.unknownName', node.position);
      }
      break;
    case 'neg':
      checkNames(node.arg, known, variables);
      break;
    case 'bin':
      checkNames(node.left, known, variables);
      checkNames(node.right, known, variables);
      break;
    case 'call':
      node.args.forEach((arg) => checkNames(arg, known, variables));
      break;
  }
}

function run(
  node: Node,
  vars: Map<string, number>,
  levels: Map<string, number>,
): number {
  const finite = (value: number, position: number): number =>
    Number.isFinite(value) ? value : fail('formula.errors.notFinite', position);
  switch (node.t) {
    case 'num':
      return node.value;
    case 'name': {
      const key = lower(node.text);
      return (
        (node.bracketed ? undefined : vars.get(key)) ?? levels.get(key) ?? 0
      );
    }
    case 'neg':
      return -run(node.arg, vars, levels);
    case 'call':
      return finite(
        FUNCTIONS[node.name](node.args.map((arg) => run(arg, vars, levels))),
        node.position,
      );
    case 'bin': {
      const a = run(node.left, vars, levels);
      const b = run(node.right, vars, levels);
      switch (node.op) {
        case '+':
          return finite(a + b, node.position);
        case '-':
          return finite(a - b, node.position);
        case '*':
          return finite(a * b, node.position);
        case '/':
          return b === 0
            ? fail('formula.errors.divisionByZero', node.position)
            : finite(a / b, node.position);
        default:
          return finite(Math.pow(a, b), node.position);
      }
    }
  }
}

/** The raw (unrounded) value of a formula, or the first error found. */
export function evaluateFormula(
  formula: AttributeFormula,
  scope: FormulaScope,
): FormulaResult {
  try {
    const levels = new Map(
      Object.entries(scope.levels ?? {}).map(([name, level]) => [
        lower(name),
        level,
      ]),
    );
    const node = parse(formulaExpression(formula));
    checkNames(node, new Set(levels.keys()), variablesOf(formula));
    const vars = new Map<string, number>([
      ['level', scope.level],
      ['base', scope.base],
      ['step', formula.preset === 'custom' ? 0 : formula.step],
      ['playerlevel', scope.playerLevel],
    ]);
    const value = run(node, vars, levels);
    return Number.isFinite(value)
      ? { ok: true, value }
      : { ok: false, error: { key: 'formula.errors.notFinite', position: 0 } };
  } catch (error) {
    if (error instanceof FormulaFailure)
      return { ok: false, error: error.error };
    throw error;
  }
}

/** Syntax and name check, without evaluating; `attributeNames` are the names a formula may read. */
export function validateFormula(
  formula: AttributeFormula,
  attributeNames: string[],
  variables: string[] = variablesOf(formula),
): FormulaError | null {
  try {
    checkNames(
      parse(formulaExpression(formula)),
      new Set(attributeNames.map(lower)),
      variables,
    );
    return null;
  } catch (error) {
    if (error instanceof FormulaFailure) return error.error;
    throw error;
  }
}

export const CHECK_MAX_LEVEL = 50;
export const CHECK_MAX_PLAYER_LEVEL = 100;
const PREVIEW_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Validates an attribute formula by evaluating it over levels 0 to 50 and player levels 1 to 100
 * (the other attributes at the same level): the first error, with the level it happens at.
 */
export function checkAttributeFormula(
  formula: AttributeFormula,
  attributeNames: string[],
  base: number,
): (FormulaError & { level?: number }) | null {
  const key = JSON.stringify([formula, attributeNames, base]);
  const cached = CHECK_CACHE.get(key);
  if (cached !== undefined) return cached;
  const result = computeCheck(formula, attributeNames, base);
  if (CHECK_CACHE.size >= CHECK_CACHE_LIMIT) CHECK_CACHE.clear();
  CHECK_CACHE.set(key, result);
  return result;
}

const CHECK_CACHE_LIMIT = 500;
const CHECK_CACHE = new Map<
  string,
  (FormulaError & { level?: number }) | null
>();

function computeCheck(
  formula: AttributeFormula,
  attributeNames: string[],
  base: number,
): (FormulaError & { level?: number }) | null {
  let node: Node;
  try {
    node = parse(formulaExpression(formula));
    checkNames(node, new Set(attributeNames.map(lower)), variablesOf(formula));
  } catch (error) {
    if (error instanceof FormulaFailure) return error.error;
    throw error;
  }
  const step = formula.preset === 'custom' ? 0 : formula.step;
  const keys = attributeNames.map(lower);
  const levels = new Map<string, number>();
  const vars = new Map<string, number>([
    ['base', base],
    ['step', step],
  ]);
  for (let level = 0; level <= CHECK_MAX_LEVEL; level++) {
    for (const key of keys) levels.set(key, level);
    vars.set('level', level);
    for (
      let playerLevel = 1;
      playerLevel <= CHECK_MAX_PLAYER_LEVEL;
      playerLevel++
    ) {
      vars.set('playerlevel', playerLevel);
      let value: number;
      try {
        value = run(node, vars, levels);
      } catch (error) {
        if (error instanceof FormulaFailure) return { ...error.error, level };
        throw error;
      }
      if (!Number.isFinite(value))
        return { key: 'formula.errors.notFinite', position: 0, level };
      if (Math.round(value) < 0)
        return { key: 'formula.errors.negative', position: 0, level };
    }
  }
  return null;
}

/** Rounded max at levels 0 to `upTo` (5 by default, 10 at most) for the wizard (player level 1, other attributes at 0); empty on error. */
export function previewMax(
  formula: AttributeFormula,
  base: number,
  attributeNames: string[],
  upTo = 5,
  cap?: number,
): number[] {
  const levels = Object.fromEntries(attributeNames.map((name) => [name, 0]));
  const values: number[] = [];
  for (const level of PREVIEW_LEVELS.slice(0, upTo + 1)) {
    const result = evaluateFormula(formula, {
      level,
      base,
      playerLevel: 1,
      levels,
    });
    if (!result.ok) return [];
    const rounded = Math.round(result.value);
    values.push(cap === undefined ? rounded : Math.min(cap, rounded));
  }
  return values;
}
