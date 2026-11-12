import { WorldRules } from '../models/world';
import { createWorld } from './world.factory';
import { applyWorldRules } from './world-rules.rules';

const linear = { preset: 'linear', step: 1 } as const;

describe('world setting skillRollsEnabled', () => {
  const world = createWorld(
    { name: 'Eldoria', attributes: [{ name: 'Life', baseValue: 10, formula: linear }] },
    () => 'id',
    1,
  );

  it('is on by default', () => {
    expect(world.skillRollsEnabled).toBe(true);
  });

  it('is saved with the rules', () => {
    const rules: WorldRules = {
      attributes: world.attributes,
      startingStatPoints: 0,
      startingMoney: 0,
      levelCurve: world.levelCurve,
      maxLevel: world.maxLevel,
      statPointsPerLevel: 1,
      startingSkillPoints: 1,
      skillPointsPerLevel: 1,
      offlineFeatures: world.offlineFeatures,
      skillRollsEnabled: false,
    };
    expect(applyWorldRules(world, rules, () => 'new').skillRollsEnabled).toBe(false);
  });
});
