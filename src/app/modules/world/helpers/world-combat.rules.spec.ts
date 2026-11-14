import { CombatRules, WorldDraft, WorldRules } from '../models/world';
import { createWorld, remapWorldImages, worldImageIds } from './world.factory';
import {
  combatImportProblems,
  defaultCombatRules,
  effectiveInitiativeMode,
  validateCombatRules,
} from './world-combat.rules';
import { buildWorldExport, parseWorldExport } from './world-export';
import { validateWorldDraft } from './world-draft.rules';
import { applyWorldRules, validateWorldRules } from './world-rules.rules';

const linear = { preset: 'linear', step: 1 } as const;

const draft = (combat?: Partial<CombatRules>): WorldDraft => ({
  name: 'Eldoria',
  attributes: [
    { name: 'Life', baseValue: 10, formula: linear },
    { name: 'Mana', baseValue: 5, formula: linear },
  ],
  barAttributes: { life: 'Life', mana: 'Mana' },
  ...(combat ? { combat: { ...defaultCombatRules('Life'), ...combat } } : {}),
});

describe('combat rules defaults', () => {
  it('follow the spec table', () => {
    expect(defaultCombatRules('Life')).toMatchObject({
      lifeAttribute: 'Life',
      initiative: { mode: 'rolled', dice: { count: 1, faces: 20 }, formula: '0' },
      actionTypes: [
        { name: 'Action', count: 1, movement: false },
        { name: 'Movement', count: 1, movement: true },
      ],
      grid: { enabled: false },
      movement: '6',
    });
    expect(defaultCombatRules('Life').basicAttack).toBeUndefined();
    expect(defaultCombatRules('Life').defence).toBeUndefined();
  });

  it('have no life attribute when the world has no life bar', () => {
    expect(defaultCombatRules().lifeAttribute).toBeUndefined();
  });

  it('are set on a new world, with the life bar attribute as the life attribute', () => {
    let n = 0;
    const world = createWorld(draft(), () => `id${++n}`, 1);
    expect(world.combat).toEqual(defaultCombatRules('Life'));
  });

  it('are taken from the wizard draft when it has some', () => {
    const world = createWorld(
      draft({ movement: '4', defence: 'Mana / 2', initiative: { mode: 'free', dice: { count: 1, faces: 20 }, formula: '0' } }),
      () => 'id',
      1,
    );
    expect(world.combat.movement).toBe('4');
    expect(world.combat.defence).toBe('Mana / 2');
    expect(world.combat.initiative.mode).toBe('free');
  });
});

describe('validateWorldDraft combat settings', () => {
  it('accepts the defaults and a full custom setup', () => {
    expect(validateWorldDraft(draft(defaultCombatRules('Life')))).toEqual({});
    expect(
      validateWorldDraft(
        draft({
          initiative: { mode: 'typed', dice: { count: 2, faces: 6 }, formula: 'Mana + level' },
          actionTypes: [{ name: 'Action', count: 2, movement: false }],
          grid: { enabled: true, columns: 20, rows: 12 },
          movement: 'Mana / 2',
          basicAttack: 'Life / 2 + 1',
          defence: 'Mana',
        }),
      ),
    ).toEqual({});
  });

  it('refuses an unknown life attribute', () => {
    expect(validateWorldDraft(draft({ lifeAttribute: 'Stamina' })).combatLifeAttribute).toBe('world.errors.combatLifeUnknown');
  });

  it('accepts no life attribute (the combat just cannot start)', () => {
    expect(validateWorldDraft(draft({ lifeAttribute: undefined }))).toEqual({});
  });

  it('refuses invalid or unknown-name formulas, naming the field', () => {
    expect(validateWorldDraft(draft({ movement: '4 +' })).combatMovement).toBe('world.errors.formulaInvalid');
    expect(validateWorldDraft(draft({ defence: 'Nope * 2' })).combatDefence).toBe('world.errors.formulaInvalid');
    expect(validateWorldDraft(draft({ basicAttack: '(' })).combatBasicAttack).toBe('world.errors.formulaInvalid');
    expect(
      validateWorldDraft(draft({ initiative: { mode: 'rolled', dice: { count: 1, faces: 20 }, formula: 'Nope' } })).combatInitiative,
    ).toBe('world.errors.formulaInvalid');
  });

  it('refuses impossible initiative dice', () => {
    for (const dice of [
      { count: 0, faces: 20 },
      { count: 101, faces: 20 },
      { count: 1, faces: 1 },
      { count: 1, faces: 1001 },
      { count: 1.5, faces: 6 },
    ]) {
      expect(validateWorldDraft(draft({ initiative: { mode: 'rolled', dice, formula: '0' } })).combatInitiative).toBe(
        'world.errors.combatDiceInvalid',
      );
    }
  });

  it('refuses empty, duplicated or zero-count action types', () => {
    expect(validateWorldDraft(draft({ actionTypes: [{ name: ' ', count: 1, movement: false }] })).combatActionTypes).toBe('world.errors.combatActionTypes');
    expect(
      validateWorldDraft(
        draft({
          actionTypes: [
            { name: 'Action', count: 1, movement: false },
            { name: 'action', count: 1, movement: false },
          ],
        }),
      ).combatActionTypes,
    ).toBe('world.errors.combatActionTypes');
    expect(validateWorldDraft(draft({ actionTypes: [{ name: 'Action', count: 0, movement: false }] })).combatActionTypes).toBe('world.errors.combatActionTypes');
    expect(validateWorldDraft(draft({ actionTypes: [{ name: 'Action', count: 1.5, movement: false }] })).combatActionTypes).toBe('world.errors.combatActionTypes');
  });

  it('refuses a grid with a bad size, only when it is on', () => {
    expect(validateWorldDraft(draft({ grid: { enabled: true, columns: 0, rows: 10 } })).combatGrid).toBe('world.errors.combatGrid');
    expect(validateWorldDraft(draft({ grid: { enabled: true, columns: 10, rows: 2.5 } })).combatGrid).toBe('world.errors.combatGrid');
    expect(validateWorldDraft(draft({ grid: { enabled: false, columns: 0, rows: 0 } }))).toEqual({});
  });
});

describe('world rules with combat settings', () => {
  const world = createWorld(draft(), () => crypto.randomUUID(), 1);
  const rulesOf = (combat: CombatRules): WorldRules => ({
    attributes: world.attributes,
    startingStatPoints: 0,
    startingMoney: 0,
    levelCurve: world.levelCurve,
    maxLevel: world.maxLevel,
    statPointsPerLevel: 1,
    startingSkillPoints: 1,
    skillPointsPerLevel: 1,
    offlineFeatures: world.offlineFeatures,
    combat,
  });

  it('validateWorldRules refuses a bad combat setting', () => {
    expect(validateWorldRules(rulesOf({ ...world.combat, movement: '4 +' })).combatMovement).toBe('world.errors.formulaInvalid');
    expect(validateWorldRules(rulesOf(world.combat))).toEqual({});
  });

  it('applyWorldRules saves the combat settings', () => {
    const combat: CombatRules = { ...world.combat, defence: 'Mana', grid: { enabled: true, columns: 8, rows: 6 } };
    expect(applyWorldRules(world, rulesOf(combat), () => 'new').combat).toEqual(combat);
  });

  it('applyWorldRules keeps the combat settings when the rules have none', () => {
    const { combat: _combat, ...rules } = rulesOf(world.combat);
    const kept = { ...world, combat: { ...world.combat, movement: '9' } };
    expect(applyWorldRules(kept, rules, () => 'new').combat.movement).toBe('9');
  });

  it('applyWorldRules follows a renamed life attribute and clears a deleted one', () => {
    const life = world.attributes[0];
    const renamed = applyWorldRules(
      world,
      { ...rulesOf(world.combat), attributes: [{ ...life, name: 'Health' }, world.attributes[1]] },
      () => 'new',
    );
    expect(renamed.combat.lifeAttribute).toBe('Health');
    const removed = applyWorldRules(world, { ...rulesOf(world.combat), attributes: [world.attributes[1]] }, () => 'new');
    expect(removed.combat.lifeAttribute).toBeUndefined();
  });
});

describe('combatImportProblems and the movement flag', () => {
  const valid = defaultCombatRules('Life');

  it('refuses an action type without a movement flag or with a non-boolean one', () => {
    expect(
      combatImportProblems({ ...valid, actionTypes: [{ name: 'Action', count: 1 }] }, ['Life', 'Mana']),
    ).toContain('world.combat.actionTypes is invalid');
    expect(
      combatImportProblems(
        { ...valid, actionTypes: [{ name: 'Action', count: 1, movement: 'yes' }] },
        ['Life', 'Mana'],
      ),
    ).toContain('world.combat.actionTypes is invalid');
  });
});

describe('world export with combat settings', () => {
  const world = createWorld(draft({ defence: 'Mana', basicAttack: 'Life / 2' }), () => crypto.randomUUID(), 1);

  it('round-trips the combat settings', () => {
    const file = buildWorldExport(world, {}, 9);
    expect(parseWorldExport(JSON.stringify(file))).toEqual({ ok: true, value: file });
  });

  it('refuses a broken combat block', () => {
    for (const bad of [
      { ...world.combat, initiative: { ...world.combat.initiative, mode: 'dice' } },
      { ...world.combat, actionTypes: 'many' },
      { ...world.combat, grid: { enabled: 'yes', columns: 5, rows: 5 } },
      { ...world.combat, movement: 6 },
      undefined,
    ]) {
      const file = JSON.parse(JSON.stringify(buildWorldExport(world, {}, 9)));
      file.world.combat = bad;
      const parsed = parseWorldExport(JSON.stringify(file));
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.errors.some((error) => error.includes('world.combat'))).toBe(true);
    }
  });
});

describe('combat grid map image', () => {
  it('has none by default', () => {
    expect(defaultCombatRules('Life').grid.imageId).toBeUndefined();
  });

  it('is saved with the combat settings', () => {
    const world = createWorld(draft(), () => 'id', 1);
    const combat: CombatRules = { ...world.combat, grid: { enabled: true, columns: 8, rows: 6, imageId: 'map-1' } };
    expect(applyWorldRules(world, {
      attributes: world.attributes,
      startingStatPoints: 0,
      startingMoney: 0,
      levelCurve: world.levelCurve,
      maxLevel: world.maxLevel,
      statPointsPerLevel: 1,
      skillPointsPerLevel: 1,
      offlineFeatures: world.offlineFeatures,
      skillRollsEnabled: true,
      sellAnywhere: false,
      sellAnywhereRatio: 0.5,
      combat,
    } as WorldRules, () => 'new').combat.grid.imageId).toBe('map-1');
  });

  it('round-trips through the world export', () => {
    const world = createWorld(draft(), () => 'id', 1);
    const withMap = { ...world, combat: { ...world.combat, grid: { enabled: true, columns: 8, rows: 6, imageId: 'map-1' } } };
    const file = buildWorldExport(withMap, { 'map-1': { type: 'image/webp', data: 'AAAA' } }, 9);
    const parsed = parseWorldExport(JSON.stringify(file));
    expect(parsed).toEqual({ ok: true, value: file });
    if (parsed.ok) expect(parsed.value.world.combat.grid.imageId).toBe('map-1');
  });

  it('refuses an image id that is not a string in an import', () => {
    const world = createWorld(draft(), () => 'id', 1);
    const file = JSON.parse(JSON.stringify(buildWorldExport(world, {}, 9)));
    file.world.combat.grid.imageId = 12;
    const parsed = parseWorldExport(JSON.stringify(file));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors.some((error) => error.includes('world.combat'))).toBe(true);
  });

  it('is one of the images a world points to, and is remapped with them', () => {
    const world = createWorld(draft(), () => 'id', 1);
    const withMap = { ...world, combat: { ...world.combat, grid: { enabled: true, columns: 8, rows: 6, imageId: 'map-1' } } };
    expect(worldImageIds(withMap)).toContain('map-1');
    expect(remapWorldImages(withMap, new Map([['map-1', 'map-2']])).combat.grid.imageId).toBe('map-2');
  });
});

describe('optional combat steps', () => {
  const names = ['Life', 'Mana'];
  const all = {
    initiative: true,
    actionCounters: true,
    gmValidation: true,
    defence: true,
    rewards: true,
  };
  const rules = (patch: Partial<CombatRules>): CombatRules => ({
    ...defaultCombatRules('Life'),
    ...patch,
  });

  it('are all on by default', () => {
    expect(defaultCombatRules('Life').steps).toEqual(all);
    expect(defaultCombatRules().steps).toEqual(all);
  });

  it('gives the free mode when the initiative step is off, the configured mode otherwise', () => {
    const typed = { mode: 'typed' as const, dice: { count: 1, faces: 20 }, formula: '0' };
    expect(effectiveInitiativeMode(rules({ initiative: typed }))).toBe('typed');
    expect(
      effectiveInitiativeMode(rules({ initiative: typed, steps: { ...all, initiative: false } })),
    ).toBe('free');
  });

  it('does not validate the initiative settings while that step is off', () => {
    const broken = { mode: 'rolled' as const, dice: { count: 0, faces: 20 }, formula: '0' };
    expect(validateCombatRules(rules({ initiative: broken }), names).combatInitiative).toBeDefined();
    expect(
      validateCombatRules(rules({ initiative: broken, steps: { ...all, initiative: false } }), names),
    ).toEqual({});
  });

  it('does not validate the action types while that step is off', () => {
    const broken = [{ name: '', count: 0, movement: false }];
    expect(validateCombatRules(rules({ actionTypes: broken }), names).combatActionTypes).toBeDefined();
    expect(
      validateCombatRules(rules({ actionTypes: broken, steps: { ...all, actionCounters: false } }), names),
    ).toEqual({});
  });

  it('does not validate the defence formula while that step is off', () => {
    expect(validateCombatRules(rules({ defence: 'Armor +' }), names).combatDefence).toBeDefined();
    expect(
      validateCombatRules(rules({ defence: 'Armor +', steps: { ...all, defence: false } }), names),
    ).toEqual({});
  });

  it('still validates the other settings when a step is off', () => {
    expect(
      validateCombatRules(rules({ movement: '4 +', steps: { ...all, rewards: false } }), names).combatMovement,
    ).toBeDefined();
  });

  it('accepts an imported combat block with the steps and refuses one without or with a bad one', () => {
    expect(combatImportProblems(defaultCombatRules('Life'), names)).toEqual([]);
    const { steps: _steps, ...without } = defaultCombatRules('Life');
    expect(combatImportProblems(without, names)).toContain('world.combat.steps is invalid');
    expect(
      combatImportProblems({ ...without, steps: { ...all, rewards: 'no' } }, names),
    ).toContain('world.combat.steps is invalid');
  });
});
