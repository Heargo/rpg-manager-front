import { Character, InventoryItem, Item } from '../../world/models/world';
import { Npc } from '../models/npc';
import { applyBuy, applySell, buyPrice, sellAnywherePrice, sellPrice } from './merchant.rules';

const ratios = { sellAnywhereRatio: 1, merchantBuyRatio: 1, merchantSellRatio: 0.5 };

const item = (id: string, price: number): Item => ({
  id, name: id, description: '', rarity: 'common', type: 'item', slot: 'none', price, modifiers: [],
});
const entry = (id: string, price: number, equipped = false): InventoryItem => ({
  id: `inv-${id}`, item: item(id, price), equipped, position: 0,
});
const merchant = (inventory: InventoryItem[], override?: Npc['merchant']): Npc => ({
  id: 'm1', name: 'Mira', statPoints: 0, xp: 0, level: 1, money: 0, attributes: [], inventory, updatedAt: 1,
  skillPoints: 0, skills: [], roles: ['merchant'], description: '', xpReward: 0, loot: [], merchant: override,
});
const player = (money: number, inventory: InventoryItem[] = []): Character => ({
  id: 'c1', playerId: 'ada', name: 'Ada', statPoints: 0, xp: 0, level: 1, money, attributes: [], inventory,
  updatedAt: 1, skillPoints: 0, skills: [], rev: 1,
});

describe('merchant prices', () => {
  it('buys at price x the world buy ratio, rounded to whole copper', () => {
    expect(buyPrice(20, undefined, ratios)).toBe(20);
    expect(buyPrice(7, undefined, { ...ratios, merchantBuyRatio: 0.5 })).toBe(4);
  });

  it('lets the merchant override the buy ratio, even with 0', () => {
    expect(buyPrice(20, { buyRatio: 1.5 }, ratios)).toBe(30);
    expect(buyPrice(20, { buyRatio: 0 }, ratios)).toBe(0);
    expect(buyPrice(20, { sellRatio: 0.1 }, ratios)).toBe(20);
  });

  it('pays the merchant sell ratio, the override first, rounded to whole copper', () => {
    expect(sellPrice(15, undefined, ratios)).toBe(8);
    expect(sellPrice(15, { sellRatio: 0.2 }, ratios)).toBe(3);
  });

  it('pays the sell-anywhere ratio when selling anywhere', () => {
    expect(sellAnywherePrice(15, ratios)).toBe(15);
    expect(sellAnywherePrice(15, { ...ratios, sellAnywhereRatio: 0.5 })).toBe(8);
  });
});

describe('applyBuy', () => {
  const stock = [entry('potion', 20), entry('sword', 50, true)];

  it('moves the item to the player and the money to the price', () => {
    const result = applyBuy({ character: player(100), merchant: merchant(stock, { buyRatio: 1.5 }), open: true, ratios }, 'inv-potion');
    if (!result.ok) throw new Error(result.error);
    expect(result.character.money).toBe(70);
    expect(result.character.inventory.map((e) => [e.item.id, e.equipped])).toEqual([['potion', false]]);
    expect(result.merchant.inventory.map((e) => e.item.id)).toEqual(['sword']);
  });

  it('refuses when the shop is not open for the player', () => {
    expect(applyBuy({ character: player(100), merchant: merchant(stock), open: false, ratios }, 'inv-potion')).toEqual({
      ok: false, error: 'merchant.errors.closed',
    });
  });

  it('refuses an item that is not in stock: unknown or equipped by the merchant', () => {
    const state = { character: player(100), merchant: merchant(stock), open: true, ratios };
    expect(applyBuy(state, 'inv-nothing')).toEqual({ ok: false, error: 'merchant.errors.notInStock' });
    expect(applyBuy(state, 'inv-sword')).toEqual({ ok: false, error: 'merchant.errors.notInStock' });
  });

  it('refuses when the player cannot afford it', () => {
    expect(applyBuy({ character: player(19), merchant: merchant(stock), open: true, ratios }, 'inv-potion')).toEqual({
      ok: false, error: 'merchant.errors.cantAfford',
    });
  });
});

describe('applySell', () => {
  const owned = [entry('gem', 15)];

  it('takes the item from the player, pays price x sell ratio and adds it to the stock', () => {
    const result = applySell({ character: player(5, owned), merchant: merchant([], { sellRatio: 0.2 }), open: true, ratios }, 'inv-gem');
    if (!result.ok) throw new Error(result.error);
    expect(result.character.money).toBe(8);
    expect(result.character.inventory).toEqual([]);
    expect(result.merchant.inventory.map((e) => [e.item.id, e.equipped])).toEqual([['gem', false]]);
  });

  it('uses the world default sell ratio without an override', () => {
    const result = applySell({ character: player(0, owned), merchant: merchant([]), open: true, ratios }, 'inv-gem');
    if (!result.ok) throw new Error(result.error);
    expect(result.character.money).toBe(8);
  });

  it('refuses when the shop is closed or the item is not the player\'s', () => {
    expect(applySell({ character: player(0, owned), merchant: merchant([]), open: false, ratios }, 'inv-gem')).toEqual({
      ok: false, error: 'merchant.errors.closed',
    });
    expect(applySell({ character: player(0, owned), merchant: merchant([]), open: true, ratios }, 'inv-other')).toEqual({
      ok: false, error: 'merchant.errors.unknownItem',
    });
  });
});
