import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { openWorldWithPacks } from '../../../../testing/active-packs';
import {
  extraPackService,
  provideExtraPack,
} from '../../../../testing/extra-pack';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { LanguageBusiness } from '../../../core/business/language.business';
import { PackBusiness } from '../../../core/business/pack.business';
import { WorldRules } from '../models/world';
import { WorldSessionBusiness } from './world-session.business';
import { SandboxWorldBusiness } from './sandbox-world.business';

describe('the sandbox world gives its packs to the generators', () => {
  let sandbox: SandboxWorldBusiness;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideTestTranslations(),
        provideExtraPack(extraPackService()),
      ],
    });
    TestBed.inject(LanguageBusiness).setLanguage('fr');
    sandbox = TestBed.inject(SandboxWorldBusiness);
  });

  const values = async (expected: string[]) => {
    await vi.waitFor(async () => {
      expect(await TestBed.inject(PackBusiness).packsFor('items')).toEqual(
        expected,
      );
    });
  };
  const rules = (packs: string[]): WorldRules => {
    const w = sandbox.$world();
    return {
      attributes: w.attributes.map(({ id, name, baseValue, formula, cap }) => ({
        id,
        name,
        baseValue,
        formula,
        cap,
      })),
      startingStatPoints: w.startingStatPoints,
      startingMoney: w.startingMoney,
      levelCurve: w.levelCurve,
      maxLevel: w.maxLevel,
      statPointsPerLevel: w.statPointsPerLevel,
      startingSkillPoints: w.startingSkillPoints,
      skillPointsPerLevel: w.skillPointsPerLevel,
      offlineFeatures: w.offlineFeatures,
      packs,
    };
  };

  it('offers the packs chosen in the sandbox rules', async () => {
    await values(['base-fr']);

    sandbox.applyRules(rules(['base-fr', 'base-en']));

    await values(['base-fr', 'base-en']);
    expect(
      (await TestBed.inject(PackBusiness).sprites()).some(
        (s) => s.packId === 'base-en',
      ),
    ).toBe(true);
  });

  it('leaves an open game world its own packs', async () => {
    await TestBed.inject(PackBusiness).enable('extra');
    await openWorldWithPacks(['base-en']);

    sandbox.applyRules(rules(['base-fr']));

    await values(['base-en']);
    TestBed.inject(WorldSessionBusiness).close();
    await values(['base-fr']);
  });
});
