import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { gameDevice, settle } from '../../../../testing/game-device';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { CharacterClass } from '../../class/models/class';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { Skill } from '../../skill/models/skill';
import { Character, World } from '../../world/models/world';
import { WorldInfoBusiness } from '../../world/business/world-info.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { CharacterBusiness } from './character.business';

const skill = (id: string, maxRank: number, pointCost: number): Skill => ({
  id, name: id, description: `secret ${id}`, rarity: 'common', type: 'active', maxRank, pointCost,
  target: 'one-enemy', cooldown: 0,
  effects: [{ kind: 'damage', attribute: 'Life', amount: 'rank' }],
});

const mage: CharacterClass = {
  id: 'mage', name: 'Mage', description: 'Casts', bonuses: [{ attribute: 'Life', value: 1 }],
  tree: [
    { skillId: 'bolt', requires: [], minLevel: 1, column: 0, row: 0 },
    { skillId: 'strike', requires: [{ skillId: 'bolt', rank: 2 }], minLevel: 1, column: 1, row: 0 },
  ],
};
const warrior: CharacterClass = {
  id: 'warrior', name: 'Warrior', description: 'WarriorSecret',
  tree: [{ skillId: 'cleave', requires: [], minLevel: 1, column: 0, row: 0 }],
};

describe('skill points (host + players)', () => {
  let gm: ReturnType<typeof gameDevice>;
  let ada: ReturnType<typeof gameDevice>;
  let bob: ReturnType<typeof gameDevice>;

  async function join(player: ReturnType<typeof gameDevice>, name: string) {
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await player.injector.get(RoomBusiness).join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
    await player.injector.get(CharacterBusiness).create(name);
    await settle();
  }

  const chars = (d: ReturnType<typeof gameDevice>) => d.injector.get(CharacterBusiness);
  const mine = (d: ReturnType<typeof gameDevice>) => chars(d).$myCharacter()!;
  type Act = { kind: string; [key: string]: unknown };
  // Loosely typed: the new actions and `loadMyClass` do not exist yet (red).
  const doAct = (d: ReturnType<typeof gameDevice>, id: string, action: Act) =>
    (chars(d).act as unknown as (id: string, action: Act) => Promise<Character>).call(chars(d), id, action);
  const loadMyClass = (d: ReturnType<typeof gameDevice>) =>
    (chars(d) as unknown as { loadMyClass(): Promise<{ characterClass: CharacterClass | null; skills: Skill[] }> }).loadMyClass();
  const gmAct = async (d: ReturnType<typeof gameDevice>, action: Act) => {
    const saved = await doAct(gm, mine(d).id, action);
    await settle();
    return saved;
  };

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    const net = createPeerNetwork();
    gm = gameDevice(net, 'gm', 'Gm');
    ada = gameDevice(net, 'ada', 'Ada');
    bob = gameDevice(net, 'bob', 'Bob');
    [gm, ada, bob].forEach((d) => d.injector.get(GameSessionBusiness));
    const world = await gm.injector.get(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [{ name: 'Life', baseValue: 10, formula: { preset: 'linear', step: 1 } }],
      levelCurve: { preset: 'growing' },
      statPointsPerLevel: 3,
      skillPointsPerLevel: 2,
      startingSkillPoints: 0,
    } as never);
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', world.id);
    await settle();
    await gm.injector.get(WorldSessionBusiness).update((w: World) => ({
      ...w,
      skills: [skill('bolt', 3, 2), skill('strike', 2, 1), skill('cleave', 1, 1), skill('taught', 5, 1), skill('hidden', 1, 1)],
      classes: [mage, warrior],
    }));
    await join(ada, 'Ada');
    await join(bob, 'Bob');
    await gmAct(ada, { kind: 'set-class', classId: 'mage' });
    await gmAct(bob, { kind: 'set-class', classId: 'warrior' });
    await gmAct(ada, { kind: 'grant-skill-points', amount: 4 });
  });

  afterEach(() => [gm, ada, bob].forEach((d) => d.injector.destroy()));

  it('lets a player learn a tree skill, and everyone sees it', async () => {
    const saved = await doAct(ada, mine(ada).id, { kind: 'learn-skill', skillId: 'bolt' });
    await settle();

    expect(saved).toMatchObject({ skillPoints: 2, skills: [{ skillId: 'bolt', rank: 1 }] });
    expect(mine(ada).skills).toEqual([{ skillId: 'bolt', rank: 1 }]);
    const seenByBob = chars(bob).$characters()!.find((c) => c.playerId === 'ada')!;
    expect(seenByBob.skills).toEqual([{ skillId: 'bolt', rank: 1 }]);
  });

  it('refuses a learn the host rules refuse, and leaves the sheet alone', async () => {
    await expect(doAct(ada, mine(ada).id, { kind: 'learn-skill', skillId: 'strike' })).rejects.toMatchObject({
      code: 'rejected', message: 'character.errors.skillLocked',
    });
    await expect(doAct(ada, mine(ada).id, { kind: 'learn-skill', skillId: 'cleave' })).rejects.toMatchObject({
      message: 'character.errors.notInTree',
    });
    expect(mine(ada)).toMatchObject({ skillPoints: 4, skills: [] });
  });

  it("refuses learning for someone else's character", async () => {
    await expect(doAct(ada, mine(bob).id, { kind: 'learn-skill', skillId: 'cleave' })).rejects.toMatchObject({
      message: 'character.errors.notYours',
    });
  });

  it('keeps refund, grant, set-skill and set-class for the game master', async () => {
    const id = mine(ada).id;
    for (const action of [
      { kind: 'refund-skill', skillId: 'bolt' },
      { kind: 'grant-skill-points', amount: 1 },
      { kind: 'set-skill', skillId: 'taught', rank: 1 },
      { kind: 'set-class', classId: 'warrior' },
    ] as Act[]) {
      await expect(doAct(ada, id, action)).rejects.toMatchObject({ message: 'character.errors.gameMasterOnly' });
    }
  });

  it('lets the game master refund, set any skill at any rank, and change the class', async () => {
    await doAct(ada, mine(ada).id, { kind: 'learn-skill', skillId: 'bolt' });
    await settle();
    await gmAct(ada, { kind: 'refund-skill', skillId: 'bolt' });
    expect(mine(ada)).toMatchObject({ skillPoints: 4, skills: [] });

    await gmAct(ada, { kind: 'set-skill', skillId: 'taught', rank: 4 });
    await gmAct(ada, { kind: 'set-skill', skillId: 'cleave', rank: 1 });
    expect(mine(ada).skills).toEqual([{ skillId: 'taught', rank: 4 }, { skillId: 'cleave', rank: 1 }]);
    await gmAct(ada, { kind: 'set-skill', skillId: 'taught', rank: 0 });
    expect(mine(ada).skills).toEqual([{ skillId: 'cleave', rank: 1 }]);

    await doAct(ada, mine(ada).id, { kind: 'learn-skill', skillId: 'bolt' });
    await gmAct(ada, { kind: 'set-class', classId: 'warrior' });
    expect(mine(ada)).toMatchObject({ classId: 'warrior', skillPoints: 4, skills: [{ skillId: 'cleave', rank: 1 }] });
  });

  it('a level-up grants skill points next to stat points, and the toast says both', async () => {
    const before = mine(ada);
    await gmAct(ada, { kind: 'grant-xp', amount: 200 });
    const after = mine(ada);

    expect(after).toMatchObject({ level: 2, skillPoints: before.skillPoints + 2, statPoints: before.statPoints + 3 });
    expect(chars(ada).levelUpMessage(before, after)).toBe('Level 2! +3 stat points, +2 skill points');
  });

  describe('class/mine', () => {
    it('gives a player their class, its tree, the skills it references and their sheet skills', async () => {
      await gmAct(ada, { kind: 'set-skill', skillId: 'taught', rank: 2 });

      const view = await loadMyClass(ada);

      expect(view.characterClass).toEqual(mage);
      expect(view.skills.map((s) => s.id).sort()).toEqual(['bolt', 'strike', 'taught']);
    });

    it('is the requesting player only: never the catalogues nor another class', async () => {
      const view = await loadMyClass(ada);
      const text = JSON.stringify(view);

      expect(text).not.toContain('Warrior');
      expect(text).not.toContain('WarriorSecret');
      expect(text).not.toContain('cleave');
      expect(text).not.toContain('hidden');
      const bobView = await loadMyClass(bob);
      expect(bobView.characterClass).toEqual(warrior);
      expect(bobView.skills.map((s) => s.id)).toEqual(['cleave']);
    });

    it('has no class and the sheet skills for a character without a class', async () => {
      await gmAct(ada, { kind: 'set-skill', skillId: 'taught', rank: 1 });
      await gm.injector.get(WorldSessionBusiness).update((w: World) => ({
        ...w,
        characters: w.characters.map((c) => (c.playerId === 'ada' ? { ...c, classId: undefined } : c)),
      }));

      const view = await loadMyClass(ada);

      expect(view.characterClass).toBeNull();
      expect(view.skills.map((s) => s.id)).toEqual(['taught']);
    });

    it('does not put the catalogues in what players receive about the world', () => {
      const info = ada.injector.get(WorldInfoBusiness).$info()!;
      expect(info).not.toHaveProperty('skills');
      expect(info).not.toHaveProperty('classes');
    });
  });
});
