import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CharacterBusiness } from '../app/modules/character/business/character.business';
import { CharacterHostBusiness } from '../app/modules/character/business/character-host.business';
import { attributeStats } from '../app/modules/character/helpers/character-stats';
import { CombatBusiness } from '../app/modules/combat/business/combat.business';
import { NpcCatalogueBusiness } from '../app/modules/npc/business/npc-catalogue.business';
import { Npc } from '../app/modules/npc/models/npc';
import { GameSessionBusiness } from '../app/modules/play/business/game-session.business';
import { RoomBusiness } from '../app/modules/room/business/room.business';
import { SkillCatalogueBusiness } from '../app/modules/skill/business/skill-catalogue.business';
import { WorldLibraryBusiness } from '../app/modules/world/business/world-library.business';
import { WorldSessionBusiness } from '../app/modules/world/business/world-session.business';
import {
  CombatRules,
  InitiativeMode,
  InventoryItem,
} from '../app/modules/world/models/world';
import { gameDevice, settle } from './game-device';
import { createPeerNetwork } from './peer-network';
import { TEST_PROVIDERS } from './test-providers';

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
  grid: { enabled: false, columns: 10, rows: 10 },
  movement: '6',
  defence: undefined,
});

export type Device = ReturnType<typeof gameDevice>;

/**
 * A room for the combat UI specs: a GM host (world "Eldoria", attributes Life and Mana, actions Action and Movement, skill dice 1d1) and
 * players Ada (skill Fireball: 5 damage to one enemy, 3 Mana, cooldown 2; a Potion) and Bob. The catalogue has one enemy, Goblin
 * (level 5, 40 XP, 7 money, loot a Ring). No encounter yet.
 */
export async function combatTable(
  mode: InitiativeMode,
  extra: Partial<CombatRules> = {},
) {
  globalThis.indexedDB = new IDBFactory();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: TEST_PROVIDERS });
  const net = createPeerNetwork();
  const gm = gameDevice(net, 'gm', 'Gm');
  const ada = gameDevice(net, 'ada', 'Ada');
  const bob = gameDevice(net, 'bob', 'Bob');
  const devices = [gm, ada, bob];
  devices.forEach((d) => d.injector.get(GameSessionBusiness));
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

  const hostWorld = () => gm.injector.get(WorldSessionBusiness).$world()!;
  const record = (playerId: string) =>
    hostWorld().characters.find((c) => c.playerId === playerId)!;

  for (const [player, name] of [
    [ada, 'Ada'],
    [bob, 'Bob'],
  ] as const) {
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

  const fireballId = (
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
  await gm.injector
    .get(CharacterBusiness)
    .act(record('ada').id, {
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

  const goblinNpc: Npc = await gm.injector.get(NpcCatalogueBusiness).save({
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

  const combat = (d: Device) => d.injector.get(CombatBusiness);
  const state = (d: Device) => combat(d).$state()!;
  const named = (d: Device, name: string) =>
    state(d).combatants.find((c) => c.name === name)!;

  return {
    gm,
    ada,
    bob,
    goblinNpc,
    fireballId,
    combat,
    state,
    named,
    hostWorld,
    record,
    current: (playerId: string, attribute: string) => {
      const w = hostWorld();
      return attributeStats(
        w.attributes,
        record(playerId),
        w.barAttributes,
      ).find((s) => s.name === attribute)!.current;
    },
    /** Ada, Bob and one Goblin in the encounter. */
    async start() {
      await combat(gm).start({
        characterIds: [record('ada').id, record('bob').id],
        npcs: [{ npcId: goblinNpc.id, count: 1, side: 'enemy' }],
      });
      await settle();
    },
    destroy: () => devices.forEach((d) => d.injector.destroy()),
  };
}

/** Renders a standalone component on one device's injector, attached to the page so it renders and its dialogs open. */
export async function mount<T>(
  type: Type<T>,
  device: Device,
  inputs: Record<string, unknown> = {},
) {
  const ref: ComponentRef<T> = createComponent(type, {
    environmentInjector: device.injector,
  });
  for (const [name, value] of Object.entries(inputs)) ref.setInput(name, value);
  TestBed.inject(ApplicationRef).attachView(ref.hostView);
  document.body.appendChild(ref.location.nativeElement);
  await settle();
  return {
    ref,
    el: ref.location.nativeElement as HTMLElement,
    destroy: () => {
      ref.destroy();
    },
  };
}

/** Types a number in the Optimus UI number input found under `host` (a `[data-testid]` wrapper). */
export async function typeNumber(host: Element, value: number) {
  const input = host.querySelector('input')!;
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
  await settle();
}

export async function click(el: Element | null) {
  (el as HTMLElement).click();
  await settle();
}

/** Opens the target multi-select under `host` (`[data-testid="targets"]`) and clicks the option named `name` (the overlay is in the document). */
export async function pickTarget(host: Element, name: string) {
  await click(host.querySelector('[data-testid="targets"]'));
  await click(
    document.querySelector(`[data-testid="target"][data-name="${name}"]`),
  );
}

/** Opens the start-form multi-select `testid` (`start-characters` or `start-npcs`) under `host` and clicks the option named `name` (the overlay is in the document). */
export async function pickStart(host: Element, testid: string, name: string) {
  await click(host.querySelector(`[data-testid="${testid}"]`));
  await click(
    document.querySelector(
      `[data-testid="start-option"][data-name="${name}"]`,
    ),
  );
}
