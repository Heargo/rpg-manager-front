import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { InventoryItem } from '../../../world/models/world';
import { PublicShop } from '../../models/merchant';
import { MerchantShopComponent } from './merchant-shop.component';

/**
 * Contract: `app-merchant-shop` takes `shop` (PublicShop: `{ npcId, name, sellRatio, stock: { id, item, price }[] }`), `money`
 * (the player's copper) and `inventory` (the player's InventoryItem[]). Renders `[data-testid="shop-money"]`,
 * one `[data-testid="shop-stock-item"]` per stock entry (name, price, `[data-action="buy"]`, disabled when `money` is below the
 * price), one `[data-testid="shop-sell-item"]` per unequipped inventory item (name, what the merchant pays: price x `sellRatio`,
 * `[data-action="sell"]`). Outputs `buy` and `sell` emit the stock id / inventory id.
 */
const item = (id: string, price: number) => ({
  id, name: id, description: '', rarity: 'common' as const, type: 'item' as const, slot: 'none' as const, price, modifiers: [],
});
const shop: PublicShop = {
  npcId: 'm1', name: 'Mira', sellRatio: 0.5,
  stock: [{ id: 'inv-potion', item: item('Potion', 20), price: 30 }, { id: 'inv-crown', item: item('Crown', 500), price: 750 }],
};
const owned: InventoryItem[] = [
  { id: 'inv-gem', item: item('Gem', 14), equipped: false, position: 0 },
  { id: 'inv-helm', item: item('Helm', 40), equipped: true, position: 1 },
];

async function render(money: number) {
  TestBed.configureTestingModule({ imports: [MerchantShopComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(MerchantShopComponent);
  fixture.componentRef.setInput('shop', shop);
  fixture.componentRef.setInput('money', money);
  fixture.componentRef.setInput('inventory', owned);
  const bought: string[] = [];
  const sold: string[] = [];
  fixture.componentInstance.buy.subscribe((id: string) => bought.push(id));
  fixture.componentInstance.sell.subscribe((id: string) => sold.push(id));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return { el, bought, sold, rows: (name: string) => Array.from(el.querySelectorAll<HTMLElement>(`[data-testid="${name}"]`)) };
}

describe('MerchantShopComponent', () => {
  it('lists the stock with its prices and the player money', async () => {
    const { el, rows } = await render(100);
    expect(el.textContent).toContain('Mira');
    expect(el.querySelector('[data-testid="shop-money"]')).not.toBeNull();
    const stock = rows('shop-stock-item');
    expect(stock).toHaveLength(2);
    expect(stock[0].textContent).toContain('Potion');
    expect(stock[0].textContent).toContain('30');
    expect(stock[1].textContent).toContain('Crown');
    const crownCoins = Array.from(stock[1].querySelectorAll('app-coin-display [data-coin]')).map((coin) => [
      coin.getAttribute('data-coin'),
      coin.textContent!.trim(),
    ]);
    expect(crownCoins).toEqual([['silver', '7'], ['copper', '50']]);
  });

  it('emits buy for an affordable item and disables an unaffordable one', async () => {
    const { rows, bought } = await render(100);
    const [potion, crown] = rows('shop-stock-item').map((row) => row.querySelector('[data-action="buy"]') as HTMLButtonElement);
    expect(crown.disabled).toBe(true);
    expect(potion.disabled).toBe(false);
    potion.click();
    expect(bought).toEqual(['inv-potion']);
  });

  it('offers the unequipped items to sell at price x the sell ratio, and emits sell', async () => {
    const { rows, sold } = await render(100);
    const items = rows('shop-sell-item');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Gem');
    expect(items[0].textContent).toContain('7');
    (items[0].querySelector('[data-action="sell"]') as HTMLButtonElement).click();
    expect(sold).toEqual(['inv-gem']);
  });
});
