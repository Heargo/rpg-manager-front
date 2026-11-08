import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { gameDevice, settle } from '../../../../testing/game-device';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { CharacterClass } from '../../class/models/class';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { Character, World } from '../../world/models/world';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { CharacterBusiness } from './character.business';

const sword = {
  id: 'sword', name: 'Sword', description: '', rarity: 'common', type: 'equipment', slot: 'weapon1', price: 5,
  modifiers: [{ attribute: 'Life', value: 1 }],
};

const mage: CharacterClass = {
  id: 'mage', name: 'Mage', description: 'Casts spells', bonuses: [{ attribute: 'Life', value: 2 }],
  startingItems: ['sword'],
  tree: [{ skillId: 'fireSecret', requires: [], minLevel: 1, column: 0, row: 0 }],
};
const warrior: CharacterClass = {
  id: 'warrior', name: 'Warrior', description: 'Hits hard',
  tree: [{ skillId: 'cleaveSecret', requires: [], minLevel: 1, column: 0, row: 0 }],
};

type Device = ReturnType<typeof gameDevice>;
type Create = (name: string, portrait?: Blob, classId?: string) => Promise<Character>;
type Choices = { id: string; name: string; description: string; bonuses?: unknown[] }[];

describe('class choice at creation (host + players)', () => {
  let gm: Device;
  let ada: Device;
  let bob: Device;

  async function join(player: Device) {
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await player.injector.get(RoomBusiness).join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
  }
  const chars = (d: Device) => d.injector.get(CharacterBusiness);
  // Loosely typed: the `classId` argument and `loadClassChoices` do not exist yet (red).
  const create = (d: Device, name: string, classId?: string) =>
    (chars(d).create as unknown as Create).call(chars(d), name, undefined, classId);
  const loadChoices = (d: Device) =>
    (chars(d) as unknown as { loadClassChoices(): Promise<Choices> }).loadClassChoices();

  async function setup(withClasses: boolean) {
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
      startingSkillPoints: 2,
    } as never);
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', world.id);
    await settle();
    if (withClasses) {
      await gm.injector.get(WorldSessionBusiness).update((w: World) => ({
        ...w,
        items: [sword as never],
        classes: [mage, warrior],
      }));
    }
    await join(ada);
    await join(bob);
  }

  afterEach(() => [gm, ada, bob].forEach((d) => d.injector.destroy()));

  describe('in a world with classes', () => {
    beforeEach(() => setup(true));

    it('gives players the class list for creation: name, description, bonuses, never the trees', async () => {
      const choices = await loadChoices(ada);

      expect(choices).toEqual([
        { id: 'mage', name: 'Mage', description: 'Casts spells', bonuses: [{ attribute: 'Life', value: 2 }] },
        { id: 'warrior', name: 'Warrior', description: 'Hits hard' },
      ]);
      const text = JSON.stringify(choices);
      expect(text).not.toContain('tree');
      expect(text).not.toContain('fireSecret');
      expect(text).not.toContain('cleaveSecret');
    });

    it('requires a class', async () => {
      await expect(create(ada, 'Ada')).rejects.toMatchObject({ message: 'character.errors.classRequired' });
      expect(chars(ada).$myCharacter()).toBeUndefined();
    });

    it('refuses an unknown class', async () => {
      await expect(create(ada, 'Ada', 'paladin')).rejects.toMatchObject({ message: 'character.errors.unknownClass' });
    });

    it('stores the class, puts its starting items in the inventory and gives the starting skill points', async () => {
      const saved = await create(ada, 'Ada', 'mage');

      expect(saved).toMatchObject({ classId: 'mage', skillPoints: 2 });
      expect(saved.inventory.map((entry) => entry.item.id)).toEqual(['sword']);
      const warriorSheet = await create(bob, 'Bob', 'warrior');
      expect(warriorSheet).toMatchObject({ classId: 'warrior', skillPoints: 2, inventory: [] });
    });

    it('shows other players only the class name of a character, not its tree', async () => {
      await create(ada, 'Ada', 'mage');
      await settle();

      const seenByBob = chars(bob).$characters()!.find((c) => c.playerId === 'ada') as Character & { className?: string };
      expect(seenByBob.className).toBe('Mage');
      const text = JSON.stringify(chars(bob).$characters());
      expect(text).not.toContain('fireSecret');
      expect(text).not.toContain('Casts spells');
    });
  });

  describe('in a world without classes', () => {
    beforeEach(() => setup(false));

    it('offers no class and creates a classless character', async () => {
      expect(await loadChoices(ada)).toEqual([]);

      const saved = await create(ada, 'Ada');

      expect(saved.classId).toBeUndefined();
      expect(saved.skillPoints).toBe(2);
    });

    it('refuses a class, since the world has none', async () => {
      await expect(create(ada, 'Ada', 'mage')).rejects.toMatchObject({ message: 'character.errors.noClasses' });
    });
  });
});
