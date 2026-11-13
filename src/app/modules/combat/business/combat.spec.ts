import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { gameDevice, settle } from '../../../../testing/game-device';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { attributeStats } from '../../character/helpers/character-stats';
import { CharacterHostBusiness } from '../../character/business/character-host.business';
import { CharacterBusiness } from '../../character/business/character.business';
import { NpcCatalogueBusiness } from '../../npc/business/npc-catalogue.business';
import { Npc } from '../../npc/models/npc';
import { GameSessionBusiness } from '../../play/business/game-session.business';
import { RoomBusiness } from '../../room/business/room.business';
import { SkillCatalogueBusiness } from '../../skill/business/skill-catalogue.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import {
  CombatRules,
  InitiativeMode,
  InventoryItem,
} from '../../world/models/world';
import en from '../../../../../public/i18n/en.json';
import fr from '../../../../../public/i18n/fr.json';
import { CombatBusiness } from './combat.business';

/**
 * Needs `CombatService`, `CombatHostBusiness` and `CombatBusiness` listed in `GAME_DEVICE` of `src/testing/game-device.ts`, and the host side
 * (`CombatHostBusiness.start()`) started by `GameSessionBusiness`. `World` gets `encounter?: Encounter`.
 *
 * Contract of `CombatBusiness` (every call goes through a `combat/*` route, answered by the host; a rejected call rejects with
 * `PeerApiError { code: 'forbidden' | 'rejected' | 'invalid' }`). `$state()` is the `combat/state` topic, the `CombatView` of
 * `projectEncounter` (null while there is no encounter):
 * - GM: `start(picks)`, `add(npcId, side)`, `remove(combatantId)`, `reorder(ids)`,
 *   `edit(combatantId, { kind: 'damage' | 'heal', amount } | { kind: 'add-status' | 'remove-status', status } | { kind: 'attribute', attribute, current?, max? })`,
 *   `apply(pendingId, { amounts?, targetId? }?)`, `dismiss(pendingId)`, `undo()`, `end(rewards?: { xp: { characterId, amount }[] })`.
 * - GM or the player of the combatant: `initiative(combatantId, value)`, `useSkill({ casterId, skillId, targetIds })`, `useItem(combatantId, inventoryId)`,
 *   `move(combatantId, { x, y })` (sets the combatant's `position`), `tickAction(combatantId, actionName, used)`.
 * - The active combatant's player, or the GM: `endTurn()`.
 * Views: `{ round, activeId, combatants: [{ id, name, side, statuses, down, initiative?, position?, actions, lifeBar?, life?, level?, ... }], pending, log }`.
 * Skill dice are 1d1 here so the host's (crypto) roll is predictable.
 */
const linear = { preset: 'linear', step: 1 } as const;

const potion: InventoryItem = {
  id: 'inv-potion',
  equipped: false,
  position: 0,
  item: {
    id: 'potion',
    name: 'Potion',
    description: '',
    rarity: 'common',
    type: 'consumable',
    slot: 'none',
    price: 20,
    modifiers: [{ attribute: 'Life', value: 4 }],
  },
};
const ring: InventoryItem = {
  id: 'inv-ring',
  equipped: false,
  position: 1,
  item: {
    id: 'ring',
    name: 'Ring',
    description: '',
    rarity: 'common',
    type: 'item',
    slot: 'none',
    price: 9,
    modifiers: [],
  },
};

const rules = (mode: InitiativeMode): CombatRules => ({
  lifeAttribute: 'Life',
  steps: {
    initiative: true,
    actionCounters: true,
    gmValidation: true,
    defence: true,
    rewards: true,
  },
  initiative: { mode, dice: { count: 1, faces: 1 }, formula: 'level' },
  actionTypes: [
    { name: 'Action', count: 1 },
    { name: 'Movement', count: 1 },
  ],
  grid: { enabled: true, columns: 10, rows: 10 },
  movement: '6',
  defence: undefined,
});

type Device = ReturnType<typeof gameDevice>;

describe('combat (GM + players)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let gm: Device;
  let ada: Device;
  let bob: Device;
  let goblinNpc: Npc;
  let fireballId: string;

  const combat = (d: Device) => d.injector.get(CombatBusiness);
  const state = (d: Device) => combat(d).$state()!;
  const hostWorld = (d: Device = gm) =>
    d.injector.get(WorldSessionBusiness).$world()!;
  const named = (d: Device, name: string) =>
    state(d).combatants.find((c) => c.name === name)!;
  const adaId = () => named(gm, 'Ada').id;
  const bobId = () => named(gm, 'Bob').id;
  const goblinId = () => named(gm, 'Goblin').id;
  const record = (playerId: string) =>
    hostWorld().characters.find((c) => c.playerId === playerId)!;
  const current = (playerId: string, attribute: string) => {
    const world = hostWorld();
    return attributeStats(
      world.attributes,
      record(playerId),
      world.barAttributes,
    ).find((s) => s.name === attribute)!.current;
  };

  async function join(player: Device, name: string) {
    const invite = await gm.injector.get(RoomBusiness).invite();
    const { answerCode, joined } = await player.injector
      .get(RoomBusiness)
      .join(invite.offerCode);
    await gm.injector.get(RoomBusiness).accept(invite.id, answerCode);
    await joined;
    await settle();
    await player.injector.get(CharacterBusiness).create(name);
    await settle();
  }

  async function setup(mode: InitiativeMode, extra: Partial<CombatRules> = {}) {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork();
    gm = gameDevice(net, 'gm', 'Gm');
    ada = gameDevice(net, 'ada', 'Ada');
    bob = gameDevice(net, 'bob', 'Bob');
    [gm, ada, bob].forEach((d) => d.injector.get(GameSessionBusiness));
    const world = await gm.injector.get(WorldLibraryBusiness).create({
      name: 'Eldoria',
      attributes: [
        { name: 'Life', baseValue: 10, formula: linear },
        { name: 'Mana', baseValue: 10, formula: linear },
      ],
      barAttributes: { life: 'Life', mana: 'Mana' },
      startingMoney: 0,
      combat: { ...rules(mode), ...extra },
    });
    await gm.injector.get(RoomBusiness).hostRoom('Eldoria', world.id);
    await settle();
    await join(ada, 'Ada');
    await join(bob, 'Bob');

    fireballId = (
      await gm.injector.get(SkillCatalogueBusiness).save({
        name: 'Fireball',
        description: '',
        rarity: 'common',
        type: 'active',
        maxLevel: 3,
        pointCost: 1,
        target: 'one-enemy',
        cost: { attribute: 'Mana', amount: 3 },
        cooldown: 2,
        roll: { count: 1, faces: 1 },
        effects: [{ kind: 'damage', attribute: 'Life', amount: '5' }],
      })
    ).id;
    await gm.injector.get(CharacterBusiness).act(record('ada').id, {
      kind: 'set-skill',
      skillId: fireballId,
      level: 1,
    });
    await gm.injector.get(WorldSessionBusiness).update((w) => ({
      ...w,
      characters: w.characters.map((c) =>
        c.playerId === 'ada' ? { ...c, inventory: [potion] } : c,
      ),
    }));
    gm.injector.get(CharacterHostBusiness).publish();

    goblinNpc = await gm.injector.get(NpcCatalogueBusiness).save({
      name: 'Goblin',
      statPoints: 0,
      xp: 0,
      level: 5,
      money: 7,
      updatedAt: 1,
      skillPoints: 0,
      skills: [],
      attributes: [],
      inventory: [ring],
      roles: ['enemy'],
      description: 'Sneaky',
      xpReward: 40,
      loot: ['inv-ring'],
    });
    await settle();
  }

  const startAll = async () => {
    await combat(gm).start({
      characterIds: [record('ada').id, record('bob').id],
      npcs: [{ npcId: goblinNpc.id, count: 1, side: 'enemy' }],
    });
    await settle();
  };

  afterEach(() => [gm, ada, bob].forEach((d) => d.injector.destroy()));

  describe('free initiative', () => {
    beforeEach(async () => {
      await setup('free');
    });

    it('shows no encounter until the GM starts one', () => {
      expect(combat(ada).$state()).toBeNull();
    });

    it('starts an encounter: everyone sees the order, round 1 and the active combatant', async () => {
      await startAll();

      for (const device of [gm, ada, bob]) {
        expect(state(device).combatants.map((c) => c.name)).toEqual([
          'Ada',
          'Bob',
          'Goblin',
        ]);
        expect(state(device).round).toBe(1);
        expect(state(device).activeId).toBe(adaId());
      }
      expect(hostWorld().encounter?.combatants).toHaveLength(3);
    });

    it('lets only the GM use the GM routes', async () => {
      await startAll();

      await expect(
        combat(ada).start({ characterIds: [], npcs: [] }),
      ).rejects.toMatchObject({ code: 'forbidden' });
      await expect(
        combat(ada).add(goblinNpc.id, 'enemy'),
      ).rejects.toMatchObject({ code: 'forbidden' });
      await expect(combat(ada).remove(goblinId())).rejects.toMatchObject({
        code: 'forbidden',
      });
      await expect(
        combat(ada).reorder([bobId(), adaId(), goblinId()]),
      ).rejects.toMatchObject({ code: 'forbidden' });
      await expect(
        combat(ada).edit(adaId(), { kind: 'damage', amount: 1 }),
      ).rejects.toMatchObject({ code: 'forbidden' });
      await expect(combat(ada).undo()).rejects.toMatchObject({
        code: 'forbidden',
      });
      await expect(combat(ada).end()).rejects.toMatchObject({
        code: 'forbidden',
      });
      expect(hostWorld().encounter?.combatants).toHaveLength(3);
    });

    it('adds a copy of a catalogue NPC and removes a combatant', async () => {
      await startAll();

      await combat(gm).add(goblinNpc.id, 'enemy');
      await settle();
      expect(state(ada).combatants.map((c) => c.name)).toEqual([
        'Ada',
        'Bob',
        'Goblin',
        'Goblin 2',
      ]);

      await combat(gm).remove(named(gm, 'Goblin 2').id);
      await settle();
      expect(state(ada).combatants.map((c) => c.name)).toEqual([
        'Ada',
        'Bob',
        'Goblin',
      ]);
    });

    it('reorders the combatants by hand', async () => {
      await startAll();

      await combat(gm).reorder([goblinId(), bobId(), adaId()]);
      await settle();

      expect(state(bob).combatants.map((c) => c.name)).toEqual([
        'Goblin',
        'Bob',
        'Ada',
      ]);
      expect(state(bob).activeId).toBe(adaId());
    });

    it('ticks an action counter: the player on their own combatant, not on another', async () => {
      await startAll();

      await combat(ada).tickAction(adaId(), 'Action', 1);
      await settle();
      expect(
        named(bob, 'Ada').actions.find((a) => a.name === 'Action'),
      ).toMatchObject({ count: 1, used: 1 });

      await expect(
        combat(ada).tickAction(bobId(), 'Action', 1),
      ).rejects.toMatchObject({ code: 'forbidden' });
      await combat(gm).tickAction(goblinId(), 'Movement', 1);
      await settle();
      expect(
        named(ada, 'Goblin').actions.find((a) => a.name === 'Movement')?.used,
      ).toBe(1);
    });

    describe('actions only on the own turn', () => {
      const notYourTurn = {
        code: 'rejected',
        message: 'combat.errors.notYourTurn',
      };

      it('rejects a player skill off turn and changes nothing', async () => {
        await startAll();
        await combat(gm).endTurn();
        await settle();

        await expect(
          combat(ada).useSkill({
            casterId: adaId(),
            skillId: fireballId,
            targetIds: [goblinId()],
          }),
        ).rejects.toMatchObject(notYourTurn);
        expect(state(gm).pending).toEqual([]);
        expect(current('ada', 'Mana')).toBe(10);
      });

      it('rejects a player item off turn and changes nothing', async () => {
        await startAll();
        await combat(gm).endTurn();
        await settle();

        await expect(
          combat(ada).useItem(adaId(), 'inv-potion'),
        ).rejects.toMatchObject(notYourTurn);
        expect(record('ada').inventory).toHaveLength(1);
      });

      it('rejects a player counter tick off turn and changes nothing', async () => {
        await startAll();
        await combat(gm).endTurn();
        await settle();

        await expect(
          combat(ada).tickAction(adaId(), 'Action', 1),
        ).rejects.toMatchObject(notYourTurn);
        expect(
          named(gm, 'Ada').actions.find((a) => a.name === 'Action')?.used,
        ).toBe(0);
      });

      it('lets the player act on their own turn', async () => {
        await startAll();

        await combat(ada).tickAction(adaId(), 'Action', 1);
        await combat(ada).useItem(adaId(), 'inv-potion');
        await combat(ada).useSkill({
          casterId: adaId(),
          skillId: fireballId,
          targetIds: [goblinId()],
        });
        await settle();

        expect(state(gm).pending).toHaveLength(1);
        expect(record('ada').inventory).toEqual([]);
      });

      it('lets the GM act for any combatant off turn', async () => {
        await startAll();

        await combat(gm).tickAction(bobId(), 'Action', 1);
        await combat(gm).tickAction(goblinId(), 'Movement', 1);
        await settle();

        expect(
          named(ada, 'Bob').actions.find((a) => a.name === 'Action')?.used,
        ).toBe(1);
        expect(
          named(ada, 'Goblin').actions.find((a) => a.name === 'Movement')?.used,
        ).toBe(1);
      });

      it('has the notYourTurn key in English and French', () => {
        const lookup = (json: unknown) =>
          (json as Record<string, Record<string, Record<string, unknown>>>)[
            'combat'
          ]['errors']['notYourTurn'];
        expect(typeof lookup(en)).toBe('string');
        expect(typeof lookup(fr)).toBe('string');
      });
    });

    it('moves a token: the player their own, the GM any', async () => {
      await startAll();

      await combat(ada).move(adaId(), { x: 3, y: 4 });
      await expect(
        combat(ada).move(bobId(), { x: 1, y: 1 }),
      ).rejects.toMatchObject({ code: 'forbidden' });
      await combat(gm).move(goblinId(), { x: 8, y: 8 });
      await settle();

      expect(named(bob, 'Ada').position).toEqual({ x: 3, y: 4 });
      expect(named(bob, 'Goblin').position).toEqual({ x: 8, y: 8 });
    });

    it('ends turns: the active player or the GM, the round goes up when the order wraps', async () => {
      await startAll();

      await expect(combat(bob).endTurn()).rejects.toMatchObject({
        code: 'forbidden',
      });
      await combat(ada).endTurn();
      await settle();
      expect(state(bob).activeId).toBe(bobId());

      await combat(bob).endTurn();
      await settle();
      expect(state(bob).activeId).toBe(goblinId());
      await expect(combat(ada).endTurn()).rejects.toMatchObject({
        code: 'forbidden',
      });

      await combat(gm).endTurn();
      await settle();
      expect(state(bob).round).toBe(2);
      expect(state(bob).activeId).toBe(adaId());
    });

    describe('using a skill', () => {
      it('rolls on the host and posts a pending result; the cost is taken on the character record', async () => {
        await startAll();

        await combat(ada).useSkill({
          casterId: adaId(),
          skillId: fireballId,
          targetIds: [goblinId()],
        });
        await settle();

        for (const device of [gm, ada, bob]) {
          expect(state(device).pending).toHaveLength(1);
          expect(state(device).pending[0]).toMatchObject({
            casterId: adaId(),
            targetId: goblinId(),
            skillId: fireballId,
            rolls: [1],
            effects: [{ kind: 'damage', attribute: 'Life', amount: 5 }],
          });
          expect(state(device).log.at(-1)).toMatchObject({
            kind: 'skill',
            casterId: adaId(),
            skillId: fireballId,
            rolls: [1],
          });
        }
        expect(current('ada', 'Mana')).toBe(7);
        expect(named(gm, 'Goblin').life?.current).toBe(10);
      });

      it('refuses a player who uses a skill for a combatant that is not theirs', async () => {
        await startAll();

        await expect(
          combat(bob).useSkill({
            casterId: adaId(),
            skillId: fireballId,
            targetIds: [goblinId()],
          }),
        ).rejects.toMatchObject({ code: 'forbidden' });
        expect(state(gm).pending).toEqual([]);
      });

      it('lets only the GM apply a pending result: the NPC copy loses life, the catalogue entry does not change', async () => {
        await startAll();
        await combat(ada).useSkill({
          casterId: adaId(),
          skillId: fireballId,
          targetIds: [goblinId()],
        });
        await settle();
        const pendingId = state(gm).pending[0].id;

        await expect(combat(ada).apply(pendingId)).rejects.toMatchObject({
          code: 'forbidden',
        });
        await combat(gm).apply(pendingId);
        await settle();

        expect(state(ada).pending).toEqual([]);
        expect(
          hostWorld()
            .encounter?.combatants.find((c) => c.name === 'Goblin')
            ?.attributes.find((a) => a.name === 'Life')?.current,
        ).toBe(5);
        expect(hostWorld().npcs.find((n) => n.id === goblinNpc.id)).toEqual(
          goblinNpc,
        );
      });

      it('applies an edited amount', async () => {
        await startAll();
        await combat(ada).useSkill({
          casterId: adaId(),
          skillId: fireballId,
          targetIds: [goblinId()],
        });
        await settle();

        await combat(gm).apply(state(gm).pending[0].id, { amounts: [3] });
        await settle();

        expect(
          hostWorld()
            .encounter?.combatants.find((c) => c.name === 'Goblin')
            ?.attributes.find((a) => a.name === 'Life')?.current,
        ).toBe(7);
      });

      it('lets only the GM dismiss a pending result, which changes nothing', async () => {
        await startAll();
        await combat(ada).useSkill({
          casterId: adaId(),
          skillId: fireballId,
          targetIds: [goblinId()],
        });
        await settle();
        const pendingId = state(gm).pending[0].id;

        await expect(combat(ada).dismiss(pendingId)).rejects.toMatchObject({
          code: 'forbidden',
        });
        await combat(gm).dismiss(pendingId);
        await settle();

        expect(state(ada).pending).toEqual([]);
        expect(
          hostWorld()
            .encounter?.combatants.find((c) => c.name === 'Goblin')
            ?.attributes.find((a) => a.name === 'Life')?.current,
        ).toBe(10);
        expect(state(ada).log.some((entry) => entry.kind === 'skill')).toBe(
          true,
        );
      });
    });

    describe('character current values', () => {
      it('a hit on a character combatant is a hit on the character record', async () => {
        await startAll();

        await combat(gm).edit(adaId(), { kind: 'damage', amount: 4 });
        await settle();

        expect(current('ada', 'Life')).toBe(6);
        expect(named(bob, 'Ada').life).toMatchObject({ current: 6, max: 10 });
      });

      it('a consumable used in combat heals the record and leaves the inventory', async () => {
        await startAll();
        await combat(gm).edit(adaId(), { kind: 'damage', amount: 7 });

        await combat(ada).useItem(adaId(), 'inv-potion');
        await settle();

        expect(current('ada', 'Life')).toBe(7);
        expect(record('ada').inventory).toEqual([]);
        expect(named(gm, 'Ada').life?.current).toBe(7);
      });

      it('refuses a player who uses an item for another combatant', async () => {
        await startAll();

        await expect(
          combat(bob).useItem(adaId(), 'inv-potion'),
        ).rejects.toMatchObject({ code: 'forbidden' });
        expect(record('ada').inventory).toHaveLength(1);
      });

      it('undoes the last change, record included', async () => {
        await startAll();
        await combat(gm).edit(adaId(), { kind: 'damage', amount: 4 });
        await settle();

        await combat(gm).undo();
        await settle();

        expect(current('ada', 'Life')).toBe(10);
        expect(named(gm, 'Ada').life?.current).toBe(10);
      });

      it('a hit on an NPC copy never touches the catalogue', async () => {
        await startAll();

        await combat(gm).edit(goblinId(), { kind: 'damage', amount: 6 });
        await settle();

        expect(
          hostWorld()
            .encounter?.combatants.find((c) => c.name === 'Goblin')
            ?.attributes.find((a) => a.name === 'Life')?.current,
        ).toBe(4);
        expect(hostWorld().npcs.find((n) => n.id === goblinNpc.id)).toEqual(
          goblinNpc,
        );
      });
    });

    describe('what players see of NPC combatants', () => {
      it('follows the world visibility rules: the default enemy shows level and a life bar, no numbers', async () => {
        await startAll();
        await combat(gm).edit(goblinId(), { kind: 'damage', amount: 5 });
        await settle();

        const goblin = named(ada, 'Goblin');
        expect(goblin.level).toBe(5);
        expect(goblin.lifeBar).toEqual({ percent: 50 });
        expect(goblin.life).toBeUndefined();
        expect(goblin.attributes).toBeUndefined();
        expect(goblin).not.toHaveProperty('xpReward');
        expect(goblin).not.toHaveProperty('loot');
        expect(named(ada, 'Bob').life).toMatchObject({ current: 10, max: 10 });
      });
    });

    describe('action counters ticked by use', () => {
      const used = (d: Device, name: string, action: string) =>
        named(d, name).actions.find((a) => a.name === action)?.used;

      async function learn(name: string, actionType?: string) {
        const id = (
          await gm.injector.get(SkillCatalogueBusiness).save({
            name,
            description: '',
            rarity: 'common',
            type: 'active',
            maxLevel: 1,
            pointCost: 1,
            target: 'one-enemy',
            cooldown: 0,
            roll: { count: 1, faces: 1 },
            effects: [{ kind: 'damage', attribute: 'Life', amount: '1' }],
            ...(actionType === undefined ? {} : { actionType }),
          })
        ).id;
        await gm.injector.get(CharacterBusiness).act(record('ada').id, {
          kind: 'set-skill',
          skillId: id,
          level: 1,
        });
        return id;
      }

      const use = async (skillId: string) => {
        await combat(ada).useSkill({
          casterId: adaId(),
          skillId,
          targetIds: [goblinId()],
        });
        await settle();
      };

      it('a skill ticks the counter of its action type', async () => {
        const dash = await learn('Dash', 'Movement');
        await startAll();

        await use(dash);

        expect(used(bob, 'Ada', 'Movement')).toBe(1);
        expect(used(bob, 'Ada', 'Action')).toBe(0);
      });

      it('a skill without an action type ticks the first action type of the world', async () => {
        const jab = await learn('Jab');
        await startAll();

        await use(jab);

        expect(used(bob, 'Ada', 'Action')).toBe(1);
        expect(used(bob, 'Ada', 'Movement')).toBe(0);
      });

      it('a skill naming an action type the world no longer has ticks the first one', async () => {
        const old = await learn('Old trick', 'Reaction');
        await startAll();

        await use(old);

        expect(used(bob, 'Ada', 'Action')).toBe(1);
        expect(used(bob, 'Ada', 'Movement')).toBe(0);
      });

      it('a consumable ticks the first action type', async () => {
        await startAll();

        await combat(ada).useItem(adaId(), 'inv-potion');
        await settle();

        expect(used(bob, 'Ada', 'Action')).toBe(1);
        expect(used(bob, 'Ada', 'Movement')).toBe(0);
      });
    });

    describe('errors reach the client as combat.errors keys', () => {
      it('a character item error: not a consumable, not in the inventory', async () => {
        await gm.injector.get(WorldSessionBusiness).update((w) => ({
          ...w,
          characters: w.characters.map((c) =>
            c.playerId === 'ada' ? { ...c, inventory: [potion, ring] } : c,
          ),
        }));
        await startAll();

        await expect(
          combat(ada).useItem(adaId(), 'inv-ring'),
        ).rejects.toMatchObject({
          code: 'rejected',
          message: 'combat.errors.notConsumable',
        });
        await expect(
          combat(ada).useItem(adaId(), 'inv-nothing'),
        ).rejects.toMatchObject({
          code: 'rejected',
          message: 'combat.errors.unknownItem',
        });
      });

      it('has the keys in English and French', () => {
        const lookup = (json: unknown, key: string) =>
          (json as Record<string, Record<string, Record<string, unknown>>>)[
            'combat'
          ]['errors'][key];
        for (const key of ['notConsumable', 'unknownItem', 'initiativeNotTyped']) {
          expect(typeof lookup(en, key), `en ${key}`).toBe('string');
          expect(typeof lookup(fr, key), `fr ${key}`).toBe('string');
        }
      });
    });

    describe('ending', () => {
      it('clears the encounter and grants the confirmed XP through grant-xp', async () => {
        await startAll();

        await expect(combat(ada).end()).rejects.toMatchObject({
          code: 'forbidden',
        });
        await combat(gm).end({
          xp: [
            { characterId: record('ada').id, amount: 20 },
            { characterId: record('bob').id, amount: 20 },
          ],
        });
        await settle();

        expect(combat(ada).$state()).toBeNull();
        expect(combat(gm).$state()).toBeNull();
        expect(hostWorld().encounter).toBeUndefined();
        expect(record('ada').xp).toBe(20);
        expect(record('bob').xp).toBe(20);
        expect(ada.injector.get(CharacterBusiness).$myCharacter()?.xp).toBe(20);
      });

      it('ends without rewards', async () => {
        await startAll();

        await combat(gm).end();
        await settle();

        expect(hostWorld().encounter).toBeUndefined();
        expect(record('ada').xp).toBe(0);
      });
    });

    it('resumes the encounter after a host reload', async () => {
      await startAll();
      await combat(gm).edit(goblinId(), { kind: 'damage', amount: 3 });
      await combat(gm).endTurn();
      await settle();

      gm.injector.destroy();
      gm = gameDevice(net, 'gm', 'Gm');
      gm.injector.get(GameSessionBusiness);
      await gm.injector.get(RoomBusiness).whenReady();
      await settle();

      expect(hostWorld().encounter?.combatants.map((c) => c.name)).toEqual([
        'Ada',
        'Bob',
        'Goblin',
      ]);
      expect(state(gm).round).toBe(1);
      expect(state(gm).activeId).toBe(bobId());
      expect(
        hostWorld()
          .encounter?.combatants.find((c) => c.name === 'Goblin')
          ?.attributes.find((a) => a.name === 'Life')?.current,
      ).toBe(7);
    });
  });

  describe('rolled initiative', () => {
    beforeEach(async () => {
      await setup('rolled');
    });

    it('rolls everyone at the start and orders by the total (1d1 + level)', async () => {
      await startAll();

      expect(named(gm, 'Goblin').initiative).toBe(6);
      expect(named(gm, 'Ada').initiative).toBe(1 + record('ada').level);
      expect(state(ada).combatants[0].name).toBe('Goblin');
      expect(state(ada).activeId).toBe(goblinId());
    });

    it('refuses a typed initiative, from a player and from the GM', async () => {
      await startAll();

      await expect(combat(ada).initiative(adaId(), 15)).rejects.toMatchObject({
        code: 'rejected',
        message: 'combat.errors.initiativeNotTyped',
      });
      await expect(
        combat(gm).initiative(goblinId(), 20),
      ).rejects.toMatchObject({
        code: 'rejected',
        message: 'combat.errors.initiativeNotTyped',
      });
      expect(named(gm, 'Goblin').initiative).toBe(6);
    });
  });

  describe('typed initiative', () => {
    beforeEach(async () => {
      await setup('typed');
    });

    it('lets a player type their own roll and the GM type the others', async () => {
      await startAll();

      await combat(ada).initiative(adaId(), 15);
      await expect(combat(ada).initiative(bobId(), 30)).rejects.toMatchObject({
        code: 'forbidden',
      });
      await combat(gm).initiative(goblinId(), 20);
      await settle();

      expect(state(bob).combatants.map((c) => c.name)).toEqual([
        'Goblin',
        'Ada',
        'Bob',
      ]);
      expect(named(bob, 'Ada').initiative).toBe(15);
    });
  });

  describe('optional steps', () => {
    const all = {
      initiative: true,
      actionCounters: true,
      gmValidation: true,
      defence: true,
      rewards: true,
    };
    const without = (step: keyof typeof all) => ({ ...all, [step]: false });
    const fireballAtGoblin = async () => {
      await combat(ada).useSkill({
        casterId: adaId(),
        skillId: fireballId,
        targetIds: [goblinId()],
      });
      await settle();
    };

    it('starts without a roll when the initiative step is off, and refuses a typed initiative', async () => {
      await setup('rolled', { steps: without('initiative') });
      await startAll();

      expect(named(gm, 'Goblin').initiative).toBeUndefined();
      expect(state(ada).combatants.map((c) => c.name)).toEqual(['Ada', 'Bob', 'Goblin']);
      await expect(combat(ada).initiative(adaId(), 15)).rejects.toMatchObject({
        code: 'rejected',
        message: 'combat.errors.initiativeNotTyped',
      });
      await expect(combat(gm).initiative(goblinId(), 20)).rejects.toMatchObject({
        code: 'rejected',
        message: 'combat.errors.initiativeNotTyped',
      });
    });

    it('shows the free order mode to every device when the initiative step is off', async () => {
      await setup('typed', { steps: without('initiative') });
      await startAll();

      for (const device of [gm, ada, bob])
        expect(combat(device).$initiativeMode()).toBe('free');
    });

    it('gives combatants no action counters when that step is off', async () => {
      await setup('free', { steps: without('actionCounters') });
      await startAll();

      for (const device of [gm, ada, bob])
        expect(state(device).combatants.map((c) => c.actions)).toEqual([[], [], []]);
    });

    it('applies a skill at once when GM validation is off: no pending result, the target loses life, the cost is taken', async () => {
      await setup('free', { steps: without('gmValidation') });
      await startAll();

      await fireballAtGoblin();

      for (const device of [gm, ada, bob]) expect(state(device).pending).toHaveLength(0);
      expect(named(gm, 'Goblin').life?.current).toBe(5);
      // Players only see an enemy's life bar (world visibility rules).
      for (const device of [ada, bob]) expect(named(device, 'Goblin').lifeBar).toEqual({ percent: 50 });
      expect(current('ada', 'Mana')).toBe(7);
    });

    it('takes the defence off an immediate hit while the defence step is on', async () => {
      await setup('free', { steps: without('gmValidation'), defence: '2' });
      await startAll();

      await fireballAtGoblin();

      expect(named(gm, 'Goblin').life?.current).toBe(7);
    });

    it('offers no defence when that step is off: the host ignores defence: true', async () => {
      await setup('free', { steps: without('defence'), defence: '2' });
      await startAll();
      await fireballAtGoblin();
      expect(state(gm).pending).toHaveLength(1);

      await combat(gm).apply(state(gm).pending[0].id, { defence: true });
      await settle();

      expect(named(gm, 'Goblin').life?.current).toBe(5);
    });

    it('gives no rewards when that step is off: nothing to propose, the XP sent is ignored', async () => {
      await setup('free', { steps: without('rewards') });
      await startAll();
      await combat(gm).edit(goblinId(), { kind: 'damage', amount: 15 });
      expect(combat(gm).rewards()).toBeNull();

      await combat(gm).end({
        xp: [{ characterId: record('ada').id, amount: 20 }],
      });
      await settle();

      expect(hostWorld().encounter).toBeUndefined();
      expect(record('ada').xp).toBe(0);
    });
  });
});
