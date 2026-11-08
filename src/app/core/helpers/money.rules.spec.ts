import { coinDisplayParts, coinsToCopper, splitCopper } from './money.rules';

describe('money rules', () => {
  it('splits integer copper into gold, silver and copper (1 gold = 100 silver = 10 000 copper)', () => {
    expect(splitCopper(11203)).toEqual({ gold: 1, silver: 12, copper: 3 });
    expect(splitCopper(10000)).toEqual({ gold: 1, silver: 0, copper: 0 });
    expect(splitCopper(100)).toEqual({ gold: 0, silver: 1, copper: 0 });
    expect(splitCopper(99)).toEqual({ gold: 0, silver: 0, copper: 99 });
    expect(splitCopper(0)).toEqual({ gold: 0, silver: 0, copper: 0 });
    expect(splitCopper(1234567)).toEqual({ gold: 123, silver: 45, copper: 67 });
  });

  it('shows gold, silver and copper when gold is not zero, even with silver at zero', () => {
    expect(coinDisplayParts(10005)).toEqual([
      { coin: 'gold', amount: 1 },
      { coin: 'silver', amount: 0 },
      { coin: 'copper', amount: 5 },
    ]);
  });

  it('hides gold at zero and keeps silver when it is not zero', () => {
    expect(coinDisplayParts(1203)).toEqual([
      { coin: 'silver', amount: 12 },
      { coin: 'copper', amount: 3 },
    ]);
  });

  it('hides gold and silver when both are zero, and always shows copper', () => {
    expect(coinDisplayParts(7)).toEqual([{ coin: 'copper', amount: 7 }]);
    expect(coinDisplayParts(0)).toEqual([{ coin: 'copper', amount: 0 }]);
  });

  it('turns a coin input back into integer copper', () => {
    expect(coinsToCopper({ gold: 1, silver: 12, copper: 3 })).toBe(11203);
    expect(coinsToCopper({ gold: 0, silver: 0, copper: 0 })).toBe(0);
    expect(coinsToCopper({ gold: 123, silver: 45, copper: 67 })).toBe(1234567);
  });

  it('normalises overflowing parts (150 silver is 1 gold 50 silver)', () => {
    expect(coinsToCopper({ gold: 0, silver: 150, copper: 0 })).toBe(15000);
    expect(splitCopper(coinsToCopper({ gold: 0, silver: 150, copper: 0 }))).toEqual({ gold: 1, silver: 50, copper: 0 });
  });
});
