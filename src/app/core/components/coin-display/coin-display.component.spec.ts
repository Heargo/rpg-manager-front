import { TestBed } from '@angular/core/testing';
import { TEST_PROVIDERS } from '../../../../testing/test-providers';
import { CoinDisplayComponent } from './coin-display.component';

/**
 * Contract: input `copper` (integer). One `[data-coin="gold|silver|copper"]` element per shown coin, holding
 * the amount as text and an `img` whose `alt` names the coin (translated).
 */
async function render(copper: number) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [CoinDisplayComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(CoinDisplayComponent);
  fixture.componentRef.setInput('copper', copper);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const coins = Array.from(el.querySelectorAll('[data-coin]')).map((c) => c.getAttribute('data-coin'));
  return { el, coins };
}

describe('CoinDisplayComponent', () => {
  it('shows gold, silver and copper with their amounts', async () => {
    const { el, coins } = await render(11203);
    expect(coins).toEqual(['gold', 'silver', 'copper']);
    expect(el.querySelector('[data-coin="gold"]')!.textContent).toContain('1');
    expect(el.querySelector('[data-coin="silver"]')!.textContent).toContain('12');
    expect(el.querySelector('[data-coin="copper"]')!.textContent).toContain('3');
  });

  it('hides gold at zero and gold plus silver when both are zero', async () => {
    expect((await render(1203)).coins).toEqual(['silver', 'copper']);
    expect((await render(7)).coins).toEqual(['copper']);
    expect((await render(0)).coins).toEqual(['copper']);
  });

  it('gives each coin icon an accessible name', async () => {
    const { el } = await render(11203);
    for (const coin of ['gold', 'silver', 'copper']) {
      const img = el.querySelector(`[data-coin="${coin}"] img`) as HTMLImageElement;
      expect(img.getAttribute('alt')).toMatch(new RegExp(coin, 'i'));
      expect(img.getAttribute('src')).toContain(`${coin}-coin.svg`);
    }
  });
});
