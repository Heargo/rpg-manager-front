import { combatTable, Device } from '../../../../testing/combat-table';
import { settle } from '../../../../testing/game-device';
import { CharacterHostBusiness } from '../../character/business/character-host.business';
import { CharacterBusiness } from '../../character/business/character.business';
import { NpcCatalogueBusiness } from '../../npc/business/npc-catalogue.business';
import { Npc } from '../../npc/models/npc';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { InventoryItem } from '../../world/models/world';
import { TableBusiness } from './table.business';

/**
 * Contract (`TableBusiness`, replacing `showNpc` / `hideNpc` / `$npcs`):
 * - `$encounter()`: `{ kind: 'story' | 'merchant'; npc: PublicNpc } | null` (null: no story/merchant encounter), same on every device.
 * - `startEncounter(kind, npcId)` and `endEncounter()` (GM only, a player is `forbidden`). A running story/merchant encounter is replaced.
 *   Rejections: `invalid` for an unknown NPC or a merchant encounter with an NPC without the merchant role, `rejected` during a combat.
 * - A merchant encounter opens the shop for every player (`$shops()`, `buyFrom`, `sellTo`); ending it, replacing it or deleting the NPC closes it.
 */
const herb: InventoryItem = {
  id: 'm-herb',
  equipped: false,
  position: 0,
  item: { id: 'herb', name: 'Herb', description: '', rarity: 'common', type: 'item', slot: 'none', price: 20, modifiers: [] },
};
const secret: InventoryItem = {
  id: 'm-secret',
  equipped: false,
  position: 1,
  item: { id: 'secret', name: 'Secret Sack', description: '', rarity: 'common', type: 'item', slot: 'none', price: 1, modifiers: [] },
};

describe('story and merchant encounters (GM + players)', () => {
  let t: Awaited<ReturnType<typeof combatTable>>;
  let sage: Npc;
  let mira: Npc;
  let orin: Npc;

  const table = (d: Device) => d.injector.get(TableBusiness);
  const newNpc = (name: string, roles: Npc['roles'], inventory: InventoryItem[] = []): Omit<Npc, 'id'> => ({
    name, statPoints: 0, xp: 0, level: 3, money: 77, updatedAt: 1, skillPoints: 0, skills: [], attributes: [],
    inventory, roles, description: 'Hidden lair.', xpReward: 123, loot: ['m-secret'],
    ...(roles.includes('merchant') && { merchant: { buyRatio: 1, sellRatio: 0.5 } }),
  });
  const shopNames = (d: Device) => table(d).$shops().map((s) => s.name);

  beforeEach(async () => {
    t = await combatTable('free');
    const catalogue = t.gm.injector.get(NpcCatalogueBusiness);
    sage = await catalogue.save(newNpc('Sage', ['story'], [secret]));
    mira = await catalogue.save(newNpc('Mira', ['merchant'], [herb, secret]));
    orin = await catalogue.save(newNpc('Orin', ['merchant'], [herb]));
    await t.gm.injector.get(WorldSessionBusiness).update((w) => ({
      ...w,
      characters: w.characters.map((c) => (c.playerId === 'ada' ? { ...c, money: 100 } : c)),
    }));
    t.gm.injector.get(CharacterHostBusiness).publish();
    await settle();
  });

  afterEach(() => t.destroy());

  it('starts with no encounter and no shop', () => {
    for (const d of [t.gm, t.ada, t.bob]) {
      expect(table(d).$encounter()).toBeNull();
      expect(table(d).$shops()).toEqual([]);
    }
  });

  it('starts a story encounter: every device gets the NPC public card, never the full NPC, and no shop opens', async () => {
    await table(t.gm).startEncounter('story', sage.id);
    await settle();

    for (const d of [t.gm, t.ada, t.bob]) {
      expect(table(d).$encounter()).toMatchObject({ kind: 'story', npc: { id: sage.id, name: 'Sage' } });
      expect(table(d).$shops()).toEqual([]);
    }
    const json = JSON.stringify(table(t.ada).$encounter());
    for (const hidden of ['Secret Sack', 'inventory', 'money', 'xpReward', 'loot', '123']) {
      expect(json).not.toContain(hidden);
    }
  });

  it('starts a merchant encounter: the card, and the shop open for every player', async () => {
    await table(t.gm).startEncounter('merchant', mira.id);
    await settle();

    for (const d of [t.gm, t.ada, t.bob]) {
      expect(table(d).$encounter()).toMatchObject({ kind: 'merchant', npc: { id: mira.id, name: 'Mira', merchant: true } });
    }
    for (const d of [t.ada, t.bob]) {
      expect(shopNames(d)).toEqual(['Mira']);
      expect(table(d).$shops()[0].stock.map((s) => s.id)).toEqual(['m-herb', 'm-secret']);
    }
  });

  it('lets a player buy from and sell to the merchant of the encounter', async () => {
    await table(t.gm).startEncounter('merchant', mira.id);
    await settle();

    await table(t.ada).buyFrom(mira.id, 'm-herb');
    await settle();
    expect(t.ada.injector.get(CharacterBusiness).$myCharacter()!.money).toBe(80);

    await table(t.ada).sellTo(mira.id, 'inv-potion');
    await settle();
    expect(t.ada.injector.get(CharacterBusiness).$myCharacter()!.money).toBe(90);
  });

  it('ends a merchant encounter: the card goes, the shop closes for every player', async () => {
    await table(t.gm).startEncounter('merchant', mira.id);
    await settle();
    await table(t.gm).endEncounter();
    await settle();

    for (const d of [t.gm, t.ada, t.bob]) expect(table(d).$encounter()).toBeNull();
    for (const d of [t.ada, t.bob]) expect(table(d).$shops()).toEqual([]);
    await expect(table(t.ada).buyFrom(mira.id, 'm-herb')).rejects.toMatchObject({ code: 'rejected', message: 'merchant.errors.closed' });
  });

  it('ends a story encounter', async () => {
    await table(t.gm).startEncounter('story', sage.id);
    await settle();
    await table(t.gm).endEncounter();
    await settle();

    expect(table(t.ada).$encounter()).toBeNull();
    expect(table(t.gm).$encounter()).toBeNull();
  });

  it('replaces the running encounter: story by merchant opens the shop, merchant by merchant swaps the shop, merchant by story closes it', async () => {
    await table(t.gm).startEncounter('story', sage.id);
    await table(t.gm).startEncounter('merchant', mira.id);
    await settle();
    expect(table(t.ada).$encounter()).toMatchObject({ kind: 'merchant', npc: { id: mira.id } });
    expect(shopNames(t.ada)).toEqual(['Mira']);

    await table(t.gm).startEncounter('merchant', orin.id);
    await settle();
    expect(table(t.ada).$encounter()).toMatchObject({ kind: 'merchant', npc: { id: orin.id } });
    expect(shopNames(t.ada)).toEqual(['Orin']);
    expect(shopNames(t.bob)).toEqual(['Orin']);

    await table(t.gm).startEncounter('story', sage.id);
    await settle();
    expect(table(t.ada).$encounter()).toMatchObject({ kind: 'story', npc: { id: sage.id } });
    expect(table(t.ada).$shops()).toEqual([]);
  });

  it('refuses a story or merchant encounter during a combat, and leaves the table alone', async () => {
    await t.start();

    await expect(table(t.gm).startEncounter('story', sage.id)).rejects.toMatchObject({ code: 'rejected' });
    await expect(table(t.gm).startEncounter('merchant', mira.id)).rejects.toMatchObject({ code: 'rejected' });
    await settle();

    expect(table(t.ada).$encounter()).toBeNull();
    expect(table(t.ada).$shops()).toEqual([]);
  });

  it('can start again once the combat is over', async () => {
    await t.start();
    await expect(table(t.gm).startEncounter('story', sage.id)).rejects.toMatchObject({ code: 'rejected' });
    await t.combat(t.gm).end();
    await settle();

    await table(t.gm).startEncounter('story', sage.id);
    await settle();
    expect(table(t.ada).$encounter()).toMatchObject({ kind: 'story', npc: { id: sage.id } });
  });

  it('refuses a merchant encounter with an NPC that is not a merchant', async () => {
    await expect(table(t.gm).startEncounter('merchant', sage.id)).rejects.toMatchObject({ code: 'invalid' });
    await settle();
    expect(table(t.ada).$encounter()).toBeNull();
    expect(table(t.ada).$shops()).toEqual([]);
  });

  it('refuses an unknown NPC and keeps the running encounter', async () => {
    await table(t.gm).startEncounter('story', sage.id);
    await settle();

    await expect(table(t.gm).startEncounter('story', 'nope')).rejects.toMatchObject({ code: 'invalid' });
    await settle();
    expect(table(t.ada).$encounter()).toMatchObject({ kind: 'story', npc: { id: sage.id } });
  });

  it('refuses a player starting or ending an encounter', async () => {
    await expect(table(t.ada).startEncounter('story', sage.id)).rejects.toMatchObject({ code: 'forbidden' });
    await table(t.gm).startEncounter('story', sage.id);
    await settle();
    await expect(table(t.ada).endEncounter()).rejects.toMatchObject({ code: 'forbidden' });
    expect(table(t.ada).$encounter()).not.toBeNull();
  });

  it('republishes the card when the GM edits the NPC', async () => {
    await table(t.gm).startEncounter('story', sage.id);
    await settle();

    await t.gm.injector.get(NpcCatalogueBusiness).save({ ...sage, name: 'High Sage' });
    await settle();

    expect(table(t.ada).$encounter()).toMatchObject({ kind: 'story', npc: { id: sage.id, name: 'High Sage' } });
  });

  it('ends the encounter, and closes the shop, when the GM deletes the NPC from the catalogue', async () => {
    await table(t.gm).startEncounter('merchant', mira.id);
    await settle();

    await t.gm.injector.get(NpcCatalogueBusiness).remove(mira.id);
    await settle();

    expect(table(t.ada).$encounter()).toBeNull();
    expect(table(t.ada).$shops()).toEqual([]);
  });
});
