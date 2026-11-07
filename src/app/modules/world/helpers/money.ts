import { MoneyFormat } from '../models/world';

const CURRENCIES = {
  dollars: 'USD',
  euros: 'EUR',
  pounds: 'GBP',
  yen: 'JPY',
} as const;

/**
 * An amount in the world's money format. Real currencies use `Intl` in the active language; `coins` uses the
 * translated `coinsLabel(amount)`; a custom symbol goes after the number.
 */
export function formatMoney(
  amount: number,
  format: MoneyFormat,
  locale: string,
  coinsLabel: (amount: string) => string,
): string {
  const number = new Intl.NumberFormat(locale).format(amount);
  switch (format.kind) {
    case 'coins':
      return coinsLabel(number);
    case 'custom':
      return `${number} ${format.symbol}`;
    default:
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: CURRENCIES[format.kind],
        maximumFractionDigits: 0,
      }).format(amount);
  }
}
