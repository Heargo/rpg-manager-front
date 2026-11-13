import { buildItemPrompt } from './item-editor.rules';

/** New: `buildItemPrompt(attributeNames, language)` where language is 'en' | 'fr'. */
describe('buildItemPrompt language', () => {
  it('asks in English for JSON only, with fields, allowed values and attribute names', () => {
    const prompt = buildItemPrompt(['Wit', 'Grit'], 'en');
    for (const word of ['JSON only', 'name', 'rarity', 'legendary', 'consumable', 'weapon1', 'modifiers', 'Wit', 'Grit']) {
      expect(prompt).toContain(word);
    }
  });

  it('asks in French, still naming the English allowed values and the attributes', () => {
    const prompt = buildItemPrompt(['Esprit'], 'fr');
    expect(prompt).toContain('uniquement');
    expect(prompt).not.toContain('JSON only');
    for (const word of ['JSON', 'legendary', 'equipment', 'Esprit']) expect(prompt).toContain(word);
  });
});
