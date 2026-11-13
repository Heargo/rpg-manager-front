import { TestBed } from '@angular/core/testing';
import { FormulaPresetStorageService } from './formula-preset-storage.service';

describe('FormulaPresetStorageService', () => {
  const entry = (over: object) => ({
    id: 'user-1',
    name: 'A',
    kind: 'effect',
    formula: '1',
    description: 'd',
    builtIn: false,
    ...over,
  });

  function load(list: unknown) {
    localStorage.setItem('formulaPresets', JSON.stringify(list));
    return TestBed.inject(FormulaPresetStorageService).load();
  }

  beforeEach(() => localStorage.clear());

  it('defaults a missing description to an empty text', () => {
    expect(load([entry({ description: undefined })])[0].description).toBe('');
  });

  it('drops repeated ids, built-in ids and malformed entries', () => {
    const list = load([
      entry({}),
      entry({ name: 'again' }),
      entry({ id: 'builtin-perLevel' }),
      entry({ id: 'user-2', kind: 'other' }),
      entry({ id: 'user-3', formula: 4 }),
      null,
    ]);
    expect(list.map((p) => p.id)).toEqual(['user-1']);
    expect(list[0].name).toBe('A');
  });

  it('returns nothing for corrupt JSON', () => {
    localStorage.setItem('formulaPresets', '{nope');
    expect(TestBed.inject(FormulaPresetStorageService).load()).toEqual([]);
  });
});
