import { buildNpcPrompt } from './npc-ai-prompt';

/** New file `npc-ai-prompt.ts`: `buildNpcPrompt(attributeNames, language)`, language 'en' | 'fr'. */
describe('buildNpcPrompt', () => {
  it('asks in English for JSON only, with fields, roles and attribute names', () => {
    const prompt = buildNpcPrompt(['Wit', 'Grit'], 'en');
    for (const word of ['JSON only', 'name', 'description', 'roles', 'story', 'merchant', 'enemy', 'level', 'Wit', 'Grit']) {
      expect(prompt).toContain(word);
    }
  });

  it('asks in French', () => {
    const prompt = buildNpcPrompt(['Esprit'], 'fr');
    expect(prompt).toContain('uniquement');
    expect(prompt).not.toContain('JSON only');
    for (const word of ['JSON', 'merchant', 'Esprit']) expect(prompt).toContain(word);
  });
});
