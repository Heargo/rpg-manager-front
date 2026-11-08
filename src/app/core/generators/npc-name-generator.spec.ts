import { generateNpcName } from './name-generator';
import { NpcNameList } from './npc-name-list';
import { seededRandomSource } from './random-source';

const list = (overrides: Partial<NpcNameList>): NpcNameList => ({
  version: 1,
  given: [{ text: 'brin', gender: 'm' }],
  epithets: ['Grim'],
  templates: ['{given}'],
  ...overrides,
});

describe('generateNpcName', () => {
  it('is deterministic for a seed', () => {
    const names = list({
      given: [{ text: 'Aro', gender: 'm' }, { text: 'Mila', gender: 'f' }, { text: 'Teo', gender: 'm' }],
      epithets: ['Grim', 'Bold', 'Wise'],
      templates: ['{given}', '{given} {epithet}'],
    });
    expect(generateNpcName(seededRandomSource('a'), names)).toBe(generateNpcName(seededRandomSource('a'), names));
  });

  it('applies a given-name-only template, capitalized', () => {
    expect(generateNpcName(seededRandomSource('a'), list({}))).toBe('Brin');
  });

  it('applies a template with the epithet, in the language word order', () => {
    expect(generateNpcName(seededRandomSource('a'), list({ templates: ['{given} {epithet}'] }))).toBe('Brin Grim');
    expect(
      generateNpcName(seededRandomSource('a'), list({ templates: ['{epithet} {given}'], epithets: ['le Sombre'] })),
    ).toBe('Le Sombre Brin');
  });

  it('agrees the epithet with the gender of the given name', () => {
    const epithets = [{ m: 'le Brave', f: 'la Brave' }];
    expect(
      generateNpcName(seededRandomSource('a'), list({ given: [{ text: 'Aldo', gender: 'm' }], epithets, templates: ['{given} {epithet}'] })),
    ).toBe('Aldo le Brave');
    expect(
      generateNpcName(seededRandomSource('a'), list({ given: [{ text: 'Aldine', gender: 'f' }], epithets, templates: ['{given} {epithet}'] })),
    ).toBe('Aldine la Brave');
  });

  it('draws different given names over many seeds, all from the list', () => {
    const names = list({ given: [{ text: 'Aro', gender: 'm' }, { text: 'Mila', gender: 'f' }, { text: 'Teo', gender: 'm' }] });
    const drawn = new Set(Array.from({ length: 40 }, (_, i) => generateNpcName(seededRandomSource(`s${i}`), names)));
    expect([...drawn].sort()).toEqual(['Aro', 'Mila', 'Teo']);
  });

  it('uses every template over many seeds', () => {
    const names = list({ templates: ['{given}', '{given} {epithet}'] });
    const drawn = new Set(Array.from({ length: 40 }, (_, i) => generateNpcName(seededRandomSource(`t${i}`), names)));
    expect([...drawn].sort()).toEqual(['Brin', 'Brin Grim']);
  });
});
