import { TestBed } from '@angular/core/testing';
import { PackBusiness } from '../../../core/business/pack.business';
import { provideTestTranslations } from '../../../../testing/test-providers';
import en from '../../../../../public/packs/base-en/generators/items.json';
import { SandboxCharacterBusiness } from './sandbox-character.business';

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('SandboxCharacterBusiness', () => {
  let sandbox: SandboxCharacterBusiness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideTestTranslations(),
        {
          provide: PackBusiness,
          useValue: { wordList: async () => en, packsFor: async () => ['base-en'], $installed: () => [] },
        },
      ],
    });
    sandbox = TestBed.inject(SandboxCharacterBusiness);
    await settle();
  });

  it('starts with a sample character carrying the default items', () => {
    const character = sandbox.$character()!;
    expect(character.name).toBe('Yusica');
    expect(character.samplePortrait).toBe('images/sample-hero.webp');
    expect(character.statPoints).toBe(5);
    expect(character.inventory.length).toBeGreaterThan(15);
    expect(character.inventory.some((entry) => entry.equipped)).toBe(false);
  });

  it('applies the game rules locally and starts over on reset', () => {
    const helm = sandbox
      .$character()!
      .inventory.find((entry) => entry.item.slot === 'head')!;
    const lifeId = sandbox.$world().attributes[0].id;

    sandbox.act({ kind: 'equip', inventoryId: helm.id });
    sandbox.act({ kind: 'spend-stat-point', attributeId: lifeId });
    expect(
      sandbox.$character()!.inventory.find((entry) => entry.id === helm.id)!
        .equipped,
    ).toBe(true);
    expect(sandbox.$character()!.statPoints).toBe(4);
    expect(() => sandbox.act({ kind: 'use', inventoryId: helm.id })).toThrow(
      'character.errors.notConsumable',
    );

    sandbox.reset();
    expect(sandbox.$character()!.statPoints).toBe(5);
  });

  it('gives the sample character the sandbox Mage class, again after a reset', () => {
    const mage = sandbox.$world().classes.find((entry) => entry.name === 'Mage')!;
    expect(mage).toBeDefined();
    expect(sandbox.$character()!.classId).toBe(mage.id);
    const before = sandbox.$character()!.skillPoints;
    sandbox.act({ kind: 'grant-skill-points', amount: 3 });
    expect(sandbox.$character()!.skillPoints).toBe(before + 3);
    sandbox.reset();
    expect(sandbox.$character()!.classId).toBe(mage.id);
  });
});
