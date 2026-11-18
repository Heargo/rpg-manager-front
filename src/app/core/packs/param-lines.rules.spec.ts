import { checkParamLines } from './param-lines.rules';

/**
 * `checkParamLines(text, knownParams)`: the problems per line of a param's textarea, 1-based `line` counted on the raw text
 * (blank lines count but raise nothing). `kind: 'syntax'` (a `checkPhrase` error) blocks Save; `kind: 'unknown-param'`
 * (a `{param}` not in `knownParams`, with its `param` name) does not.
 */
describe('checkParamLines', () => {
  const known = ['maker', 'place'];

  it('finds nothing in valid lines, known references and variants', () => {
    const result = checkParamLines('les moines de {place}\nun apprenti [maladroit|pressé]\n{maker}', known);

    expect(result.problems).toEqual([]);
    expect(result.blocksSave).toBe(false);
  });

  it('names the line of a syntax error and blocks Save', () => {
    const result = checkParamLines('fine\nun apprenti [maladroit|pressé', known);

    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toMatchObject({ line: 2, kind: 'syntax' });
    expect(result.blocksSave).toBe(true);
  });

  it('names the line and the param of an unknown reference without blocking Save', () => {
    const result = checkParamLines('a {place}\nthe {ghost}', known);

    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toMatchObject({ line: 2, kind: 'unknown-param', param: 'ghost' });
    expect(result.blocksSave).toBe(false);
  });

  it('counts blank lines in the line numbers and ignores them', () => {
    const result = checkParamLines('ok\n\n   \n{ghost}', known);

    expect(result.problems).toMatchObject([{ line: 4, kind: 'unknown-param', param: 'ghost' }]);
  });

  it('reports each problem line, and blocks Save as soon as one is a syntax error', () => {
    const result = checkParamLines('{ghost}\nbroken ]\n{other}', known);

    expect(result.problems.map((p) => [p.line, p.kind])).toEqual([
      [1, 'unknown-param'],
      [2, 'syntax'],
      [3, 'unknown-param'],
    ]);
    expect(result.blocksSave).toBe(true);
  });

  it('does not report an unknown param on a line that already has a syntax error', () => {
    const result = checkParamLines('{ghost [x', known);

    expect(result.problems.map((p) => p.kind)).toEqual(['syntax']);
  });

  it('has no problem for empty text', () => {
    expect(checkParamLines('', known)).toEqual({ problems: [], blocksSave: false });
  });
});
