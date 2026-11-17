import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { provideBasePackOnDisk } from '../../../../testing/base-pack-on-disk';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { LanguageBusiness } from '../../../core/business/language.business';
import { WorldLibraryBusiness } from './world-library.business';

const linear = { preset: 'linear', step: 1 } as const;
const attr = (name: string) => ({ name, baseValue: 5, formula: linear });

describe('creating a world with "Add default classes and skills"', () => {
  let library: WorldLibraryBusiness;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({ providers: [provideTestTranslations(), provideBasePackOnDisk()] });
    TestBed.inject(LanguageBusiness).setLanguage('en');
    library = TestBed.inject(WorldLibraryBusiness);
  });

  const draft = (names: string[]) => ({
    name: 'Eldoria',
    attributes: names.map(attr),
    barAttributes: { life: names[0], ...(names.includes('Mana') ? { mana: 'Mana' } : {}) },
    packs: ['base-en'],
  });

  it('imports the classes and skills of the active packs, written on the default attributes', async () => {
    const world = await library.create(draft(['Life', 'Mana', 'Strength', 'Agility', 'Intelligence']), {
      starterClasses: true,
    });

    expect(world.classes.map((c) => c.name)).toEqual(['Warrior', 'Mage', 'Rogue']);
    expect(world.skills).toHaveLength(17);
    expect(world.skills.every((s) => s.id.startsWith('base-en:'))).toBe(true);
    expect(world.skills.find((s) => s.name === 'Power Strike')).toMatchObject({
      type: 'active',
      actionType: 'Action',
      effects: [{ kind: 'damage', attribute: 'Life', amount: '[Strength] * 0.5 + skillLevel * 3' }],
    });
    expect(world.classes.every((c) => c.tree.every((n) => world.skills.some((s) => s.id === n.skillId)))).toBe(true);
    const stored = await library.get(world.id);
    expect(stored?.classes.map((c) => c.name)).toEqual(['Warrior', 'Mage', 'Rogue']);
    expect(stored?.skills).toHaveLength(17);
  });

  it('skips a renamed attribute: the world is created, without the skills that need it', async () => {
    const world = await library.create(draft(['Life', 'Mana', 'Might', 'Agility', 'Intelligence']), {
      starterClasses: true,
    });

    const names = world.skills.map((s) => s.name);
    expect(names).not.toContain('Power Strike');
    expect(names).toContain('Arcane Bolt');
    expect(names).toContain('Iron Skin');
    expect(world.skills.every((s) => s.effects.every((e) => e.attribute !== 'Strength'))).toBe(true);
  });

  it('skips a missing Mana attribute: no mana skill and no cost', async () => {
    const world = await library.create(draft(['Life', 'Strength', 'Agility', 'Intelligence']), {
      starterClasses: true,
    });

    expect(world.skills).toHaveLength(16);
    expect(world.skills.every((s) => s.id.startsWith('base-en:'))).toBe(true);
    expect(world.skills.map((s) => s.name)).not.toContain('Arcane Focus');
    expect(world.skills.some((s) => s.cost)).toBe(false);
  });
});
