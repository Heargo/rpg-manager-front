import { baseClassVocabulary } from '../../../testing/base-class-vocabulary';
import { baseSkillVocabulary } from '../../../testing/base-skill-vocabulary';
import { validateClass } from '../../modules/class/helpers/class.rules';
import { Skill } from '../../modules/skill/models/skill';
import { generateClass } from './class-generator';
import { seededRandomSource } from './random-source';

const attributes = ['Strength', 'Agility', 'Life', 'Mana', 'Charisma'];
const skills: Skill[] = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, index) => ({
  id: `sk-${id}`,
  name: `Skill ${id}`,
  description: '',
  rarity: 'common',
  type: 'passive',
  maxLevel: 1 + (index % 3),
  pointCost: 1,
  effects: [{ kind: 'modify', attribute: 'Life', amount: 'skillLevel', duration: 0 }],
}));

/** `generateClass(source, attributes, skills, vocabulary, skillVocabulary)` on the real Base vocabularies. */
const en = baseClassVocabulary('en');
const enSkills = baseSkillVocabulary('en');
describe('generateClass', () => {
  it('gives the same class for the same seed', () => {
    const draw = () => generateClass(seededRandomSource('reroll-7'), attributes, skills, en, enSkills);
    expect(draw()).toEqual(draw());
  });

  it('puts bonuses only on the given attributes', () => {
    const only = ['Wit', 'Grit'];
    for (let i = 0; i < 100; i++) {
      const generated = generateClass(seededRandomSource(`b-${i}`), only, skills, en, enSkills);
      expect((generated.bonuses ?? []).length).toBeGreaterThan(0);
      for (const bonus of generated.bonuses ?? []) expect(only).toContain(bonus.attribute);
    }
  });

  it('builds a non-empty tree from the given skills that passes validateClass, in both languages', () => {
    for (const lang of ['en', 'fr'] as const) {
      const words = baseClassVocabulary(lang);
      const skillWords = baseSkillVocabulary(lang);
      for (let i = 0; i < 100; i++) {
        const generated = generateClass(seededRandomSource(`t-${i}`), attributes, skills, words, skillWords);
        expect(generated.name.trim()).not.toBe('');
        expect(generated.description.trim()).not.toBe('');
        expect(generated.tree.length).toBeGreaterThan(0);
        for (const node of generated.tree) expect(skills.map((s) => s.id)).toContain(node.skillId);
        expect(validateClass(generated, skills, attributes)).toEqual([]);
      }
    }
  });
});
