import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { BUILT_IN_PRESETS } from '../helpers/formula-preset.rules';
import { FormulaPresetBusiness } from './formula-preset.business';

describe('FormulaPresetBusiness', () => {
  let business: FormulaPresetBusiness;
  const draft = {
    name: 'Scaled',
    kind: 'effect' as const,
    formula: '{A} * skillLevel',
    description: 'Scales.',
  };

  function fresh() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    return TestBed.inject(FormulaPresetBusiness);
  }

  beforeEach(() => {
    localStorage.clear();
    business = fresh();
  });

  it('lists the built-ins when there is no user preset', () => {
    expect(business.$presets().map((p) => p.id)).toEqual(
      BUILT_IN_PRESETS.map((p) => p.id),
    );
  });

  it('creates a user preset after the built-ins', () => {
    const result = business.create(draft);

    expect(result.ok).toBe(true);
    const last = business.$presets().at(-1)!;
    expect(last).toMatchObject({ ...draft, builtIn: false });
    expect(business.$presets()).toHaveLength(BUILT_IN_PRESETS.length + 1);
  });

  it('refuses an invalid formula', () => {
    const result = business.create({ ...draft, formula: '{A} + Luck' });

    expect(result).toEqual({
      ok: false,
      errorKey: 'skill.presets.errors.invalid',
    });
    expect(business.$presets()).toHaveLength(BUILT_IN_PRESETS.length);
  });

  it('updates a user preset', () => {
    business.create(draft);
    const id = business.$presets().at(-1)!.id;

    const result = business.update(id, {
      ...draft,
      name: 'Renamed',
      formula: '{A} * 2',
    });

    expect(result.ok).toBe(true);
    expect(business.$presets().find((p) => p.id === id)).toMatchObject({
      name: 'Renamed',
      formula: '{A} * 2',
    });
  });

  it('refuses to update an invalid formula and keeps the old one', () => {
    business.create(draft);
    const id = business.$presets().at(-1)!.id;

    expect(business.update(id, { ...draft, formula: 'rank' })).toEqual({
      ok: false,
      errorKey: 'skill.presets.errors.invalid',
    });
    expect(business.$presets().find((p) => p.id === id)!.formula).toBe(
      '{A} * skillLevel',
    );
  });

  it('removes a user preset', () => {
    business.create(draft);
    const id = business.$presets().at(-1)!.id;

    expect(business.remove(id).ok).toBe(true);
    expect(business.$presets().find((p) => p.id === id)).toBeUndefined();
  });

  it('refuses to update or remove a built-in', () => {
    const id = BUILT_IN_PRESETS[0].id;

    expect(business.update(id, draft)).toEqual({
      ok: false,
      errorKey: 'skill.presets.errors.builtIn',
    });
    expect(business.remove(id)).toEqual({
      ok: false,
      errorKey: 'skill.presets.errors.builtIn',
    });
    expect(business.$presets()).toHaveLength(BUILT_IN_PRESETS.length);
  });

  it('duplicates a built-in into an editable user copy', () => {
    const source = BUILT_IN_PRESETS[0];

    const result = business.duplicate(source.id);

    expect(result.ok).toBe(true);
    const copy = business.$presets().at(-1)!;
    expect(copy.id).not.toBe(source.id);
    expect(copy).toMatchObject({
      kind: source.kind,
      formula: source.formula,
      builtIn: false,
    });
    expect(business.update(copy.id, { ...draft, name: 'Mine' }).ok).toBe(true);
  });

  it('keeps user presets in a new instance', () => {
    business.create(draft);

    const again = fresh();

    expect(again.$presets().at(-1)).toMatchObject({ ...draft, builtIn: false });
  });
});
