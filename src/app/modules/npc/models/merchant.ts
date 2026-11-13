import { Item } from '../../world/models/world';

/** The world settings that price a trade (the world's defaults; a merchant may override its own two). */
export interface MerchantRatios {
  sellAnywhereRatio: number;
  merchantBuyRatio: number;
  merchantSellRatio: number;
}

/** A merchant's shop as a player sees it: the unequipped stock at the price they pay, and what the merchant pays back. */
export interface PublicShop {
  npcId: string;
  name: string;
  portraitId?: string;
  /** What the merchant pays for an item, times its price. */
  sellRatio: number;
  stock: { id: string; item: Item; price: number }[];
}

/** What the host publishes: every open shop and who it is open for (null = every player). */
export interface PublishedShop extends PublicShop {
  playerIds: string[] | null;
}

export interface OpenShopRequest {
  npcId: string;
  /** Omitted: every player. */
  playerIds?: string[];
}

export interface TradeRequest {
  npcId: string;
  inventoryId: string;
}

export const MERCHANT_ROUTES = {
  open: 'merchant/open',
  close: 'merchant/close',
  buy: 'merchant/buy',
  sell: 'merchant/sell',
} as const;

export const MERCHANT_TOPICS = {
  shops: 'merchant/shops',
} as const;
