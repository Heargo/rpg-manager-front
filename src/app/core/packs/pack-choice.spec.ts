import { createSeed } from '../generators/random-source';
import { choosePack } from './pack-choice';

describe('choosePack', () => {
  it('returns a named pack that is among the candidates', () => {
    expect(choosePack(['base-fr', 'extra'], 'extra', 'seed')).toBe('extra');
    expect(choosePack(['base-fr', 'extra'], 'base-fr', 'seed')).toBe('base-fr');
  });

  it('falls back to the first candidate (the Base) for a named pack that is not a candidate (removed, off, no content)', () => {
    expect(choosePack(['base-fr'], 'extra', 'seed')).toBe('base-fr');
    expect(choosePack(['base-fr', 'extra'], 'gone', 'seed')).toBe('base-fr');
  });

  it('random is deterministic for a seed and the same candidates', () => {
    const candidates = ['base-fr', 'extra', 'third'];
    const first = choosePack(candidates, 'random', 'same-seed');
    for (let i = 0; i < 5; i++) expect(choosePack(candidates, 'random', 'same-seed')).toBe(first);
    expect(candidates).toContain(first);
  });

  it('random reaches every candidate across seeds', () => {
    const candidates = ['base-fr', 'extra'];
    const seeds = Array.from({ length: 40 }, (_, i) => `seed-${i}`);
    const picked = seeds.map((seed) => choosePack(candidates, 'random', seed));
    expect(new Set(picked)).toEqual(new Set(candidates));
  });

  it('random with a single candidate returns it', () => {
    expect(choosePack(['base-fr'], 'random', createSeed())).toBe('base-fr');
  });
});
