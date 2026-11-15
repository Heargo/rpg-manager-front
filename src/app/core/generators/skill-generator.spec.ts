import { baseSkillVocabulary } from '../../../testing/base-skill-vocabulary';
import { validateSkill } from '../../modules/skill/helpers/skill.rules';
import { SKILL_TARGETS } from '../../modules/skill/models/skill';
import { generateSkill } from './skill-generator';
import { seededRandomSource } from './random-source';

const en = baseSkillVocabulary('en');
const fr = baseSkillVocabulary('fr');
const attributes = ['Strength', 'Agility', 'Life', 'Mana', 'Charisma'];

/** `generateSkill(source, attributes, vocabulary)`: the vocabulary is the real Base pack of the language. */
describe('generateSkill', () => {
  it('gives the same skill for the same seed', () => {
    const draw = () => generateSkill(seededRandomSource('reroll-42'), attributes, en);
    expect(draw()).toEqual(draw());
  });

  it('gives different skills for different seeds', () => {
    const names = new Set<string>();
    for (let i = 0; i < 20; i++) names.add(generateSkill(seededRandomSource(`s-${i}`), attributes, en).name);
    expect(names.size).toBeGreaterThan(5);
  });

  it('always passes the skill rules, in both languages', () => {
    for (const words of [en, fr]) {
      for (let i = 0; i < 100; i++) {
        const skill = generateSkill(seededRandomSource(`valid-${i}`), attributes, words);
        expect(skill.name.trim()).not.toBe('');
        expect(skill.description.trim()).not.toBe('');
        expect(validateSkill(skill, attributes)).toEqual([]);
      }
    }
  });

  it('puts effects and cost only on the given attributes', () => {
    const only = ['Wit', 'Grit'];
    for (let i = 0; i < 100; i++) {
      const skill = generateSkill(seededRandomSource(`attr-${i}`), only, en);
      expect(skill.effects.length).toBeGreaterThan(0);
      for (const effect of skill.effects) expect(only).toContain(effect.attribute);
      if (skill.cost) expect(only).toContain(skill.cost.attribute);
    }
  });

  it('gives passive skills no cost, cooldown or target, and active skills a target', () => {
    let passive = 0;
    let active = 0;
    for (let i = 0; i < 200; i++) {
      const skill = generateSkill(seededRandomSource(`type-${i}`), attributes, en);
      if (skill.type === 'passive') {
        passive++;
        expect(skill.cost).toBeUndefined();
        expect(skill.cooldown).toBeUndefined();
        expect(skill.target).toBeUndefined();
      } else {
        active++;
        expect(SKILL_TARGETS).toContain(skill.target);
      }
    }
    expect(passive).toBeGreaterThan(0);
    expect(active).toBeGreaterThan(0);
  });
});
