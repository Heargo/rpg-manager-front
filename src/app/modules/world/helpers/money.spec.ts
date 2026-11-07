import { formatMoney } from './money';

describe('formatMoney', () => {
  const coins = (amount: string) => `${amount} coins`;

  it('formats coins with the translated label', () => {
    expect(formatMoney(1200, { kind: 'coins' }, 'en', coins)).toBe(
      '1,200 coins',
    );
  });

  it('formats real currencies in the active language', () => {
    expect(formatMoney(12, { kind: 'dollars' }, 'en', coins)).toBe('$12');
    expect(
      formatMoney(12, { kind: 'euros' }, 'fr', coins).replace(/\s/g, ' '),
    ).toBe('12 €');
  });

  it('puts a custom symbol after the number', () => {
    expect(formatMoney(5, { kind: 'custom', symbol: 'po' }, 'fr', coins)).toBe(
      '5 po',
    );
  });
});
