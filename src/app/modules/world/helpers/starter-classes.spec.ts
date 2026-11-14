import { World } from '../models/world';
import { defaultCombatRules } from './world-combat.rules';
import { buildStarterClasses } from './starter-classes';

const attributes = ['Life', 'Mana', 'Strength', 'Agility', 'Intelligence'].map((name) => ({ id: name, name }));

const world = (actionTypes: { name: string; count: number; movement: boolean }[]) =>
  ({
    attributes,
    barAttributes: { life: 'Life', mana: 'Mana' },
    combat: { ...defaultCombatRules('Life'), actionTypes },
  }) as unknown as World;

const build = (w: World) => buildStarterClasses(w, 'en', (() => {
  let n = 0;
  return () => `id-${n++}`;
})());

describe('starter skills and action types', () => {
  it('names an action type of the world on every active skill, and none on a passive one', () => {
    const { skills } = build(world([{ name: 'Attaque', count: 1, movement: false }, { name: 'Déplacement', count: 1, movement: true }]));

    const active = skills.filter((s) => s.type === 'active');
    expect(active.length).toBeGreaterThan(0);
    for (const skill of active) expect(['Attaque', 'Déplacement'], skill.name).toContain(skill.actionType);
    for (const skill of skills.filter((s) => s.type === 'passive')) expect(skill.actionType, skill.name).toBeUndefined();
  });

  it('puts the damaging attacks on the first action type', () => {
    const { skills } = build(world([{ name: 'Attaque', count: 1, movement: false }, { name: 'Déplacement', count: 1, movement: true }]));

    for (const name of ['Power Strike', 'Fireball', 'Quick Stab'])
      expect(skills.find((s) => s.name === name)?.actionType, name).toBe('Attaque');
  });

  it('keeps the movement skill on a movement type when the world has the default ones', () => {
    const { skills } = build(world(defaultCombatRules('Life').actionTypes));

    expect(skills.find((s) => s.name === 'Shadow Step')?.actionType).toBe('Movement');
    expect(skills.find((s) => s.name === 'Power Strike')?.actionType).toBe('Action');
  });

  it('puts the movement skill on the first type flagged movement, whatever its name', () => {
    const { skills } = build(
      world([
        { name: 'Strike', count: 1, movement: false },
        { name: 'Sprint', count: 1, movement: true },
        { name: 'Glide', count: 1, movement: true },
      ]),
    );

    expect(skills.find((s) => s.name === 'Shadow Step')?.actionType).toBe('Sprint');
    expect(skills.find((s) => s.name === 'Power Strike')?.actionType).toBe('Strike');
  });
});
