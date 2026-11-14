import { checkPhrase, expandPhrase } from './phrase';
import { RandomSource, seededRandomSource } from './random-source';

/** Collects the distinct results over many seeds. */
function outcomes(
  phrase: string,
  context: Parameters<typeof expandPhrase>[2] = {},
  runs = 200,
): Set<string | undefined> {
  const seen = new Set<string | undefined>();
  for (let i = 0; i < runs; i++) {
    seen.add(expandPhrase(seededRandomSource(`seed-${i}`), phrase, context));
  }
  return seen;
}

const fixed: RandomSource = { nextUint32: () => 0 };

describe('expandPhrase', () => {
  it('fails on a phrase with bad syntax, or a param entry with bad syntax', () => {
    expect(expandPhrase(fixed, '[a|b', {})).toBeUndefined();
    expect(
      expandPhrase(fixed, 'by {maker}', { params: { maker: ['a [smith'] } }),
    ).toBeUndefined();
  });

  it('returns plain text unchanged', () => {
    expect(expandPhrase(fixed, 'Epee longue', {})).toBe('Epee longue');
  });

  it('draws every variant of [a|b|c] and nothing else', () => {
    expect(outcomes('[a|b|c]')).toEqual(new Set(['a', 'b', 'c']));
  });

  it('keeps the text around a variant', () => {
    expect(outcomes('big [red|blue] sword')).toEqual(
      new Set(['big red sword', 'big blue sword']),
    );
  });

  it('draws nested variants', () => {
    expect(outcomes('[a|[b|c]]')).toEqual(new Set(['a', 'b', 'c']));
  });

  it('draws a param entry from the pool', () => {
    const params = { maker: ['Smith', 'Wright'] };
    expect(outcomes('by {maker}', { params })).toEqual(
      new Set(['by Smith', 'by Wright']),
    );
  });

  it('allows a param inside a variant', () => {
    const params = { maker: ['Smith'] };
    expect(outcomes('[{maker}|x]', { params })).toEqual(
      new Set(['Smith', 'x']),
    );
  });

  it('expands params recursively', () => {
    const params = { a: ['<{b}>'], b: ['[1|1]{c}'], c: ['z'] };
    expect(expandPhrase(fixed, '{a}', { params })).toBe('<1z>');
  });

  it('allows a param nested 5 deep', () => {
    const params = {
      p1: ['{p2}'],
      p2: ['{p3}'],
      p3: ['{p4}'],
      p4: ['{p5}'],
      p5: ['end'],
    };
    expect(expandPhrase(fixed, '{p1}', { params })).toBe('end');
  });

  it('fails when params nest 6 deep', () => {
    const params = {
      p1: ['{p2}'],
      p2: ['{p3}'],
      p3: ['{p4}'],
      p4: ['{p5}'],
      p5: ['{p6}'],
      p6: ['end'],
    };
    expect(expandPhrase(fixed, '{p1}', { params })).toBeUndefined();
  });

  it('fails on a param that calls itself', () => {
    expect(
      expandPhrase(fixed, '{loop}', { params: { loop: ['again {loop}'] } }),
    ).toBeUndefined();
  });

  it('fails when a param is missing from the pool', () => {
    expect(
      expandPhrase(fixed, 'by {maker}', { params: { other: ['x'] } }),
    ).toBeUndefined();
    expect(expandPhrase(fixed, 'by {maker}', {})).toBeUndefined();
  });

  it('fails when a param has an empty list', () => {
    expect(
      expandPhrase(fixed, 'by {maker}', { params: { maker: [] } }),
    ).toBeUndefined();
  });

  it('fails when the missing param is inside a nested param', () => {
    expect(
      expandPhrase(fixed, '{a}', { params: { a: ['x {b}'] } }),
    ).toBeUndefined();
  });

  it('picks the gendered option, masculine first', () => {
    expect(expandPhrase(fixed, '{g:le|la} epee', { gender: 'f' })).toBe(
      'la epee',
    );
    expect(expandPhrase(fixed, '{g:le|la} epee', { gender: 'm' })).toBe(
      'le epee',
    );
  });

  it('defaults the gender to masculine', () => {
    expect(expandPhrase(fixed, '{g:grand|grande}', {})).toBe('grand');
  });

  it('replaces base, adjective and suffix by the given values', () => {
    const values = { base: 'Epee', adjective: 'rouillee', suffix: 'du feu' };
    expect(expandPhrase(fixed, '{base} {adjective} {suffix}', { values })).toBe(
      'Epee rouillee du feu',
    );
  });

  it('fails when a value is used but not given', () => {
    expect(
      expandPhrase(fixed, '{base} {adjective}', { values: { base: 'Epee' } }),
    ).toBeUndefined();
  });

  it('does not look base, adjective or suffix up in the params', () => {
    expect(
      expandPhrase(fixed, '{base}', { params: { base: ['nope'] } }),
    ).toBeUndefined();
  });

  it('gives the same text for the same seed and pool', () => {
    const params = { a: ['x', 'y', 'z', 'w'], b: ['1', '2', '3'] };
    const phrase = '[{a}|{b}] {a} [p|q|r] {b}';
    for (const seed of ['one', 'two', 'three']) {
      const first = expandPhrase(seededRandomSource(seed), phrase, { params });
      const second = expandPhrase(seededRandomSource(seed), phrase, { params });
      expect(first).toBeDefined();
      expect(first).toBe(second);
    }
  });

  it('draws each param entry roughly uniformly', () => {
    const params = { a: ['x', 'y'] };
    const source = seededRandomSource('uniform');
    let xs = 0;
    for (let i = 0; i < 1000; i++)
      if (expandPhrase(source, '{a}', { params }) === 'x') xs++;
    expect(xs).toBeGreaterThan(400);
    expect(xs).toBeLessThan(600);
  });

  it('collapses spaces and trims', () => {
    expect(expandPhrase(fixed, '  a    b \t c  ', {})).toBe('a b c');
  });

  it('leaves no gap when an optional variant is empty', () => {
    expect(outcomes('sword [of fire|] now')).toEqual(
      new Set(['sword of fire now', 'sword now']),
    );
  });

  it('removes the space before a comma or a full stop', () => {
    expect(expandPhrase(fixed, 'sword [|x] , old [|y] .', {})).toBe(
      'sword, old.',
    );
  });

  it('does not capitalise', () => {
    expect(expandPhrase(fixed, 'lower case', {})).toBe('lower case');
  });
});

describe('checkPhrase', () => {
  it('accepts a valid phrase and lists no param', () => {
    expect(checkPhrase('[a|b] {base} {g:x|y}')).toEqual({
      errors: [],
      params: [],
    });
  });

  it('lists the distinct params in order of first use', () => {
    const result = checkPhrase(
      '{maker} [{place}|{maker}] {adjective} {suffix} {base} {g:a|b} {age-name}',
    );
    expect(result.errors).toEqual([]);
    expect(result.params).toEqual(['maker', 'place', 'age-name']);
  });

  it('lists params used inside nested variants', () => {
    expect(checkPhrase('[a|[b|{deep}]]').params).toEqual(['deep']);
  });

  it('reports an unclosed bracket', () => {
    expect(checkPhrase('[a|b').errors.length).toBeGreaterThan(0);
  });

  it('reports an unopened bracket', () => {
    expect(checkPhrase('a|b]').errors.length).toBeGreaterThan(0);
  });

  it('reports an unclosed brace', () => {
    expect(checkPhrase('{maker').errors.length).toBeGreaterThan(0);
  });

  it('reports an unopened brace', () => {
    expect(checkPhrase('maker}').errors.length).toBeGreaterThan(0);
  });

  it('reports a variant with only empty options', () => {
    expect(checkPhrase('a [] b').errors.length).toBeGreaterThan(0);
    expect(checkPhrase('a [|] b').errors.length).toBeGreaterThan(0);
  });

  it('allows an optional (partly empty) variant', () => {
    expect(checkPhrase('a [b|]').errors).toEqual([]);
  });

  it('reports an unknown prefix', () => {
    expect(checkPhrase('{x:a|b}').errors.length).toBeGreaterThan(0);
  });

  it('reports a gender choice without exactly two options', () => {
    expect(checkPhrase('{g:a}').errors.length).toBeGreaterThan(0);
    expect(checkPhrase('{g:a|b|c}').errors.length).toBeGreaterThan(0);
  });

  it('reports a bad param name', () => {
    expect(checkPhrase('{}').errors.length).toBeGreaterThan(0);
    expect(checkPhrase('{Maker}').errors.length).toBeGreaterThan(0);
    expect(checkPhrase('{two words}').errors.length).toBeGreaterThan(0);
    expect(checkPhrase('{snake_case}').errors.length).toBeGreaterThan(0);
  });
});
