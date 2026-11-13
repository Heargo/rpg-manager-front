import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import en from '../../../../public/packs/base-en/generators/items.json';
import fr from '../../../../public/packs/base-fr/generators/items.json';
import { openWorldWithPacks } from '../../../testing/active-packs';
import { EXTRA_ITEMS, extraPackService, provideExtraPack } from '../../../testing/extra-pack';
import { provideTestTranslations } from '../../../testing/test-providers';
import { WorldRules } from '../../modules/world/models/world';
import { WorldSessionBusiness } from '../../modules/world/business/world-session.business';
import { PackChoiceContent, PackChoiceBusiness } from './pack-choice.business';
import { LanguageBusiness } from './language.business';
import { PackBusiness } from './pack.business';
import { WordListBusiness } from './word-list.business';

describe('generators use the packs of the open world', () => {
  let packs: PackBusiness;
  let words: WordListBusiness;
  let choice: PackChoiceBusiness;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    const service = extraPackService({
      loadJson: vi.fn(async (url: string) => {
        if (url === 'packs/base-en/generators/items.json') return en;
        if (url === 'packs/base-fr/generators/items.json') return fr;
        if (url === 'packs/extra/generators/items.json') return EXTRA_ITEMS;
        return { url };
      }),
    });
    TestBed.configureTestingModule({ providers: [provideTestTranslations(), provideExtraPack(service)] });
    packs = TestBed.inject(PackBusiness);
    words = TestBed.inject(WordListBusiness);
    choice = TestBed.inject(PackChoiceBusiness);
    TestBed.inject(LanguageBusiness).setLanguage('fr');
    await packs.enable('extra');
  });

  /** The values of the Pack select of a generator, once they are loaded for the expected list. */
  const selectValues = async (content: PackChoiceContent, expected: string[]) => {
    const options = TestBed.runInInjectionContext(() => choice.options(content));
    let values: string[] = [];
    await vi.waitFor(() => {
      TestBed.tick();
      values = options().map((o) => o.value);
      expect(values).toEqual(expected);
    });
    return values;
  };
  const spritePacks = async () => [...new Set((await packs.sprites()).map((s) => s.packId))];

  it('without a world, gives the Base of the app language alone', async () => {
    expect(await spritePacks()).toEqual(['base-fr']);
    await selectValues('items', ['random', 'base-fr']);
    expect((await words.itemWords()).bases.weapon1[0].text).toBe('Épée');
  });

  it('without a world, a downloaded pack stays out even in its own language', async () => {
    expect(await spritePacks()).not.toContain('extra');
    await selectValues('items', ['random', 'base-fr']);
  });

  it('with a world, gives the sprites and the Pack select of all its packs whatever their language', async () => {
    await openWorldWithPacks(['base-en', 'extra']);

    expect(await spritePacks()).toEqual(['base-en', 'extra']);
    await selectValues('items', ['random', 'base-en', 'extra']);
  });

  it('with a world, gives the word list of a pack in another language than the app', async () => {
    await openWorldWithPacks(['base-en', 'extra']);

    expect((await words.itemWords('en', 'extra')).bases.weapon1[0].text).toBe('Zircon');
    expect((await words.itemWords('fr', 'base-en')).bases.weapon1[0].text).toBe('Sword');
  });

  it('skips an active pack that is not installed', async () => {
    await openWorldWithPacks(['base-en', 'ghost', 'extra']);

    expect(await spritePacks()).toEqual(['base-en', 'extra']);
    await selectValues('items', ['random', 'base-en', 'extra']);
  });

  it('lists only the active packs that have content for the generator', async () => {
    await openWorldWithPacks(['base-en', 'extra']);

    await selectValues('npcs', ['random', 'base-en']);
  });

  it('falls back to the Base of the app language when no active pack has a list for the generator', async () => {
    await openWorldWithPacks(['extra']);

    await selectValues('items', ['random', 'extra']);
    await selectValues('npcs', ['random', 'base-fr']);
    expect(await choice.resolve('npcs', 'random', 'any-seed')).toBe('base-fr');
  });

  it('falls back to the Base of the app language when the world has no pack at all', async () => {
    await openWorldWithPacks([]);

    expect(await spritePacks()).toEqual(['base-fr']);
    await selectValues('items', ['random', 'base-fr']);
  });

  it('follows the world packs when its rules change', async () => {
    const world = await openWorldWithPacks(['base-fr']);
    expect(await spritePacks()).toEqual(['base-fr']);
    const rules: WorldRules = {
      attributes: world.attributes.map(({ id, name, baseValue, formula, cap }) => ({ id, name, baseValue, formula, cap })),
      startingStatPoints: world.startingStatPoints,
      startingMoney: world.startingMoney,
      levelCurve: world.levelCurve,
      maxLevel: world.maxLevel,
      statPointsPerLevel: world.statPointsPerLevel,
      startingSkillPoints: world.startingSkillPoints,
      skillPointsPerLevel: world.skillPointsPerLevel,
      offlineFeatures: world.offlineFeatures,
      packs: ['base-fr', 'extra'],
    };

    await TestBed.inject(WorldSessionBusiness).saveRules(rules);

    expect(await spritePacks()).toEqual(['base-fr', 'extra']);
    await selectValues('items', ['random', 'base-fr', 'extra']);

    await TestBed.inject(WorldSessionBusiness).saveRules({ ...rules, packs: ['base-fr'] });

    expect(await spritePacks()).toEqual(['base-fr']);
  });

  it('goes back to the Base of the app language when the world is closed', async () => {
    await openWorldWithPacks(['base-en', 'extra']);
    expect(await spritePacks()).toEqual(['base-en', 'extra']);

    TestBed.inject(WorldSessionBusiness).close();

    expect(await spritePacks()).toEqual(['base-fr']);
  });
});
