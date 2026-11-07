/** Money is integer copper everywhere: 1 silver = 100 copper, 1 gold = 100 silver = 10 000 copper. */
export const COPPER_PER_SILVER = 100;
export const COPPER_PER_GOLD = 10000;

export type Coin = 'gold' | 'silver' | 'copper';
export const COINS: readonly Coin[] = ['gold', 'silver', 'copper'];

export interface Coins {
  gold: number;
  silver: number;
  copper: number;
}

/** Copper split into gold, silver and copper. */
export function splitCopper(total: number): Coins {
  const amount = Math.max(0, Math.floor(total));
  return {
    gold: Math.floor(amount / COPPER_PER_GOLD),
    silver: Math.floor((amount % COPPER_PER_GOLD) / COPPER_PER_SILVER),
    copper: amount % COPPER_PER_SILVER,
  };
}

/** The coins to show: gold hidden at 0, silver hidden when gold and silver are both 0, copper always. */
export function coinDisplayParts(
  total: number,
): { coin: Coin; amount: number }[] {
  const { gold, silver, copper } = splitCopper(total);
  const parts: { coin: Coin; amount: number }[] = [];
  if (gold > 0) parts.push({ coin: 'gold', amount: gold });
  if (gold > 0 || silver > 0) parts.push({ coin: 'silver', amount: silver });
  parts.push({ coin: 'copper', amount: copper });
  return parts;
}

/** Coin amounts back to integer copper; parts may overflow (150 silver is 1 gold 50 silver). */
export function coinsToCopper(coins: Coins): number {
  return (
    coins.gold * COPPER_PER_GOLD +
    coins.silver * COPPER_PER_SILVER +
    coins.copper
  );
}
