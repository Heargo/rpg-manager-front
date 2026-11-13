import { buildSkillPrompt } from './skill-ai-prompt';

/** New file `skill-ai-prompt.ts`: `buildSkillPrompt(attributeNames, language)`, language 'en' | 'fr'. */
describe('buildSkillPrompt', () => {
  it('asks in English for JSON only, with fields, allowed values and attribute names', () => {
    const prompt = buildSkillPrompt(['Life', 'Mana'], 'en');
    for (const word of [
      'JSON only', 'name', 'rarity', 'legendary', 'type', 'active', 'passive', 'maxLevel', 'pointCost', 'target',
      'one-enemy', 'all-allies', 'cooldown', 'effects', 'damage', 'heal', 'modify', 'amount', 'skillLevel', 'Life', 'Mana',
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

  it('never mentions rank', () => {
    for (const language of ['en', 'fr'] as const) expect(buildSkillPrompt(['Life'], language)).not.toContain('rank');
  });
});
