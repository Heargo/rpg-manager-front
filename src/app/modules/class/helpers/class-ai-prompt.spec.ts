import { buildClassPrompt } from './class-ai-prompt';

/** New file `class-ai-prompt.ts`: `buildClassPrompt(attributeNames, language)`, language 'en' | 'fr'. */
describe('buildClassPrompt', () => {
  it('asks in English for JSON only, with fields, tree shape and attribute names', () => {
    const prompt = buildClassPrompt(['Life', 'Mana'], 'en');
    for (const word of [
      'JSON only', 'name', 'description', 'bonuses', 'attribute', 'value', 'tree', 'skillId', 'requires', 'minLevel',
      'column', 'row', 'Life', 'Mana',
    ]) {
      expect(prompt).toContain(word);
    }
  });

  it('asks in French', () => {
    const prompt = buildClassPrompt(['Vie'], 'fr');
    expect(prompt).toContain('uniquement');
    expect(prompt).not.toContain('JSON only');
    for (const word of ['JSON', 'tree', 'Vie']) expect(prompt).toContain(word);
  });
});
