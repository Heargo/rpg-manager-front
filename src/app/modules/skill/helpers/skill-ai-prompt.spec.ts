import { buildSkillPrompt } from './skill-ai-prompt';

/** New file `skill-ai-prompt.ts`: `buildSkillPrompt(attributeNames, language)`, language 'en' | 'fr'. */
describe('buildSkillPrompt', () => {
  it('asks in English for JSON only, with fields, allowed values and attribute names', () => {
    const prompt = buildSkillPrompt(['Life', 'Mana'], 'en');
    for (const word of [
      'JSON only', 'name', 'rarity', 'legendary', 'type', 'active', 'passive', 'maxRank', 'pointCost', 'target',
      'one-enemy', 'all-allies', 'cooldown', 'effects', 'damage', 'heal', 'modify', 'amount', 'rank', 'Life', 'Mana',
    ]) {
      expect(prompt).toContain(word);
    }
  });

  it('asks in French', () => {
    const prompt = buildSkillPrompt(['Vie'], 'fr');
    expect(prompt).toContain('uniquement');
    expect(prompt).not.toContain('JSON only');
    for (const word of ['JSON', 'passive', 'Vie']) expect(prompt).toContain(word);
  });
});
