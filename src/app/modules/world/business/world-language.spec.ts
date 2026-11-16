import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { extraPackService, provideExtraPack } from '../../../../testing/extra-pack';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { ActivePacksBusiness } from '../../../core/business/active-packs.business';
import { LanguageBusiness } from '../../../core/business/language.business';
import { WorldRules } from '../models/world';
import { SandboxWorldBusiness } from './sandbox-world.business';
import { WorldLibraryBusiness } from './world-library.business';
import { WorldSessionBusiness } from './world-session.business';

describe('the world language', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({ providers: [provideTestTranslations(), provideExtraPack(extraPackService())] });
    TestBed.inject(LanguageBusiness).setLanguage('fr');
  });

  const rulesOf = (changes: Partial<WorldRules>): WorldRules => {
    const w = TestBed.inject(WorldSessionBusiness).$world()!;
    return {
      attributes: w.attributes.map(({ id, name, baseValue, formula, cap }) => ({ id, name, baseValue, formula, cap })),
      startingStatPoints: w.startingStatPoints,
      startingMoney: w.startingMoney,
      levelCurve: w.levelCurve,
      maxLevel: w.maxLevel,
      statPointsPerLevel: w.statPointsPerLevel,
      startingSkillPoints: w.startingSkillPoints,
      skillPointsPerLevel: w.skillPointsPerLevel,
      offlineFeatures: w.offlineFeatures,
      packs: w.packs,
      ...changes,
    };
  };

  it('is null for the generators without a world', () => {
    expect(TestBed.inject(ActivePacksBusiness).$worldLanguage()).toBeNull();
  });

  it('follows the world through open, saveRules and close', async () => {
    const active = TestBed.inject(ActivePacksBusiness);
    const session = TestBed.inject(WorldSessionBusiness);
    const world = await TestBed.inject(WorldLibraryBusiness).create({ name: 'Eldoria', attributes: [], language: 'en' });

    await session.open(world.id);
    expect(active.$worldLanguage()).toBe('en');

    await session.saveRules(rulesOf({ language: 'fr' }));
    expect(session.$world()!.language).toBe('fr');
    expect(active.$worldLanguage()).toBe('fr');
    expect((await TestBed.inject(WorldLibraryBusiness).get(world.id))!.language).toBe('fr');

    session.close();
    expect(active.$worldLanguage()).toBeNull();
  });

  it('gives the sandbox world the app language, until its rules change it', () => {
    TestBed.inject(LanguageBusiness).setLanguage('en');
    const sandbox = TestBed.inject(SandboxWorldBusiness);
    expect(sandbox.$world().language).toBe('en');
    expect(TestBed.inject(ActivePacksBusiness).$worldLanguage()).toBe('en');

    const w = sandbox.$world();
    sandbox.applyRules({ ...w, language: 'fr' } as WorldRules);

    expect(sandbox.$world().language).toBe('fr');
    expect(TestBed.inject(ActivePacksBusiness).$worldLanguage()).toBe('fr');
  });
});
