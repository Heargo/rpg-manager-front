import { Skill } from '../../skill/models/skill';
import { CombatTargetingBusiness } from './combat-targeting.business';

const skill = (target: Skill['target']): Skill =>
  ({ id: 's', target, effects: [] }) as unknown as Skill;

function aiming(target: Skill['target'], targets: string[] = []) {
  const business = new CombatTargetingBusiness();
  business.start('ada', skill(target), targets);
  return business;
}
const picked = (b: CombatTargetingBusiness) => b.$casting()?.targets;

describe('CombatTargetingBusiness.set', () => {
  it('keeps only the last newly added id for a single-target skill', () => {
    const b = aiming('one-enemy', ['a']);
    b.set(['a', 'b']);
    expect(picked(b)).toEqual(['b']);
  });

  it('keeps the only id when nothing new is added to a single-target skill', () => {
    const b = aiming('one-ally', ['a']);
    b.set(['a']);
    expect(picked(b)).toEqual(['a']);
  });

  it('treats a skill without target as single-target', () => {
    const b = aiming(undefined);
    b.set(['a', 'b']);
    expect(picked(b)).toEqual(['b']);
  });

  it('empties the picks when the list is empty', () => {
    const b = aiming('one-enemy', ['a']);
    b.set([]);
    expect(picked(b)).toEqual([]);
  });

  it('replaces the picks with every id for an area skill', () => {
    const b = aiming('area', ['a']);
    b.set(['b', 'c']);
    expect(picked(b)).toEqual(['b', 'c']);
  });

  it('ignores self and all-* skills', () => {
    for (const target of ['self', 'all-allies', 'all-enemies'] as const) {
      const b = aiming(target, ['x']);
      b.set(['a', 'b']);
      expect(picked(b)).toEqual(['x']);
    }
  });

  it('does nothing without a casting', () => {
    const b = new CombatTargetingBusiness();
    b.set(['a']);
    expect(b.$casting()).toBeNull();
  });
});
