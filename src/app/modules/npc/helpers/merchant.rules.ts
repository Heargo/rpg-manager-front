import { Character, InventoryItem } from '../../world/models/world';
import { MerchantRatios, PublicShop } from '../models/merchant';
import { Npc } from '../models/npc';

const copper = (value: number): number => Math.round(value);

/** What the player pays for an item priced `price`: the merchant's own buy ratio, else the world's. */
export function buyPrice(
  price: number,
  override: Npc['merchant'],
  ratios: Pick<MerchantRatios, 'merchantBuyRatio'>,
): number {
  return copper(price * (override?.buyRatio ?? ratios.merchantBuyRatio));
}

/** What the merchant pays for an item priced `price`: the merchant's own sell ratio, else the world's. */
export function sellPrice(
  price: number,
  override: Npc['merchant'],
  ratios: Pick<MerchantRatios, 'merchantSellRatio'>,
): number {
  return copper(price * (override?.sellRatio ?? ratios.merchantSellRatio));
}

/** What selling anywhere (no merchant) pays. */
export function sellAnywherePrice(
  price: number,
  ratios: Pick<MerchantRatios, 'sellAnywhereRatio'>,
): number {
  return copper(price * ratios.sellAnywhereRatio);
}

export interface TradeState {
  character: Character;
  merchant: Npc;
  /** The shop is open for this player. */
  open: boolean;
  ratios: MerchantRatios;
}

export type TradeResult =
  | { ok: true; character: Character; merchant: Npc }
  | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({
  ok: false,
  error,
});

const nextPosition = (inventory: InventoryItem[]): number =>
  inventory.reduce((max, entry) => Math.max(max, entry.position + 1), 0);

/** The player buys an unequipped item of the merchant's stock. */
export function applyBuy(state: TradeState, inventoryId: string): TradeResult {
  const { character, merchant } = state;
  if (!state.open) return fail('merchant.errors.closed');
  const entry = merchant.inventory.find(
    (candidate) => candidate.id === inventoryId && !candidate.equipped,
  );
  if (!entry) return fail('merchant.errors.notInStock');
  const price = buyPrice(entry.item.price, merchant.merchant, state.ratios);
  if (character.money < price) return fail('merchant.errors.cantAfford');
  return {
    ok: true,
    character: {
      ...character,
      money: character.money - price,
      inventory: [
        ...character.inventory,
        {
          ...entry,
          equipped: false,
          position: nextPosition(character.inventory),
        },
      ],
    },
    merchant: {
      ...merchant,
      inventory: merchant.inventory.filter((candidate) => candidate !== entry),
    },
  };
}

/** The player sells one of their unequipped items to the merchant, who puts it in stock. */
export function applySell(state: TradeState, inventoryId: string): TradeResult {
  const { character, merchant } = state;
  if (!state.open) return fail('merchant.errors.closed');
  const entry = character.inventory.find(
    (candidate) => candidate.id === inventoryId && !candidate.equipped,
  );
  if (!entry) return fail('merchant.errors.unknownItem');
  const price = sellPrice(entry.item.price, merchant.merchant, state.ratios);
  return {
    ok: true,
    character: {
      ...character,
      money: character.money + price,
      inventory: character.inventory.filter((candidate) => candidate !== entry),
    },
    merchant: {
      ...merchant,
      inventory: [
        ...merchant.inventory,
        {
          ...entry,
          equipped: false,
          position: nextPosition(merchant.inventory),
        },
      ],
    },
  };
}

/** The world's pricing settings, with their defaults for worlds saved before they existed. */
export function ratiosOf(world: Partial<MerchantRatios>): MerchantRatios {
  return {
    sellAnywhereRatio: world.sellAnywhereRatio ?? 1,
    merchantBuyRatio: world.merchantBuyRatio ?? 1,
    merchantSellRatio: world.merchantSellRatio ?? 0.5,
  };
}

/** The shop a player sees: the merchant's unequipped stock at the price they pay. */
export function toPublicShop(
  merchant: Npc,
  ratios: MerchantRatios,
): PublicShop {
  return {
    npcId: merchant.id,
    name: merchant.name,
    ...(merchant.portraitId !== undefined && {
      portraitId: merchant.portraitId,
    }),
    sellRatio: merchant.merchant?.sellRatio ?? ratios.merchantSellRatio,
    stock: merchant.inventory
      .filter((entry) => !entry.equipped)
      .map((entry) => ({
        id: entry.id,
        item: entry.item,
        price: buyPrice(entry.item.price, merchant.merchant, ratios),
      })),
  };
}

/** Who a shop is open for after opening it for `playerIds` (undefined: everyone). `current` undefined: closed. */
export function openFor(
  current: string[] | null | undefined,
  playerIds: string[] | undefined,
): string[] | null {
  if (playerIds === undefined || current === null) return null;
  return [...new Set([...(current ?? []), ...playerIds])];
}

/** Who a shop is open for after closing it for `playerIds` (undefined: everyone); undefined when it ends up closed. */
export function closeFor(
  current: string[] | null | undefined,
  playerIds: string[] | undefined,
  everyPlayer: string[],
): string[] | undefined {
  if (playerIds === undefined || current === undefined) return undefined;
  const remaining = (current ?? everyPlayer).filter(
    (id) => !playerIds.includes(id),
  );
  return remaining.length ? remaining : undefined;
}

/** Whether the shop is open for the player. */
export function isOpenFor(
  current: string[] | null | undefined,
  playerId: string,
): boolean {
  return current === null || !!current?.includes(playerId);
}

/** The request's fields when well formed, null otherwise. */
export function parseOpenRequest(
  payload: unknown,
): { npcId: string; playerIds?: string[] } | null {
  const p = payload as { npcId?: unknown; playerIds?: unknown } | null;
  if (typeof p?.npcId !== 'string') return null;
  if (p.playerIds === undefined) return { npcId: p.npcId };
  return Array.isArray(p.playerIds) &&
    p.playerIds.every((id) => typeof id === 'string')
    ? { npcId: p.npcId, playerIds: p.playerIds as string[] }
    : null;
}

export function parseTradeRequest(
  payload: unknown,
): { npcId: string; inventoryId: string } | null {
  const p = payload as { npcId?: unknown; inventoryId?: unknown } | null;
  return typeof p?.npcId === 'string' && typeof p.inventoryId === 'string'
    ? { npcId: p.npcId, inventoryId: p.inventoryId }
    : null;
}
