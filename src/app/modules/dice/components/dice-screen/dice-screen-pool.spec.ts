import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { typeNumber } from '../../../../../testing/combat-table';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { DicePool } from '../../helpers/dice-pool.rules';
import { DiceScreenComponent, DiceScreenPoolResult } from './dice-screen.component';

/**
 * Contract (dice pool): `app-dice-screen` has two-way models `pool` (`DicePool`, `{ sides, count }[]`, empty by default) and `modifier` (number, 0).
 * Tapping `[data-testid="die"][data-sides]` adds one die of that type to the pool. `[data-testid="pool"]` holds one
 * `[data-testid="pool-entry"][data-sides]` per type, showing its count (`[data-testid="pool-count"]`) with `[data-action="pool-minus"]` and
 * `[data-action="pool-plus"]`; `[data-action="clear-pool"]` empties the pool. `[data-testid="dice-modifier"]` wraps an Optimus UI number input.
 * Roll reads "Roll 2d6+1d4+3" (FR "Lancer ..."). `result` is `{ groups: { sides, values }[], modifier, total }`: `[data-testid="dice-result"]`
 * shows the notation, every die value and the modifier; `[data-testid="dice-total"]` the total.
 */
@Component({
  selector: 'app-test-host',
  imports: [DiceScreenComponent],
  template: `
    <app-dice-screen [(pool)]="pool" [(modifier)]="modifier" [result]="result()" (roll)="rolls = rolls + 1" />
  `,
})
class HostComponent {
  pool = signal<DicePool>([]);
  modifier = signal(0);
  result = signal<DiceScreenPoolResult | null>(null);
  rolls = 0;
}

async function render() {
  TestBed.configureTestingModule({ imports: [HostComponent], providers: TEST_PROVIDERS });
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const q = (selector: string) => el.querySelector<HTMLElement>(selector);
  const press = async (selector: string) => {
    const target = q(selector)!;
    (target.matches('button') ? target : target.querySelector('button')!).click();
    await fixture.whenStable();
  };
  return { fixture, host: fixture.componentInstance, el, q, press };
}

describe('DiceScreenComponent pool', () => {
  it('adds one die to the pool each time a die is tapped', async () => {
    const { host, press } = await render();

    await press('[data-testid="die"][data-sides="6"]');
    await press('[data-testid="die"][data-sides="6"]');
    await press('[data-testid="die"][data-sides="4"]');

    expect(host.pool()).toEqual([
      { sides: 6, count: 2 },
      { sides: 4, count: 1 },
    ]);
  });

  it('shows each pool entry with its count', async () => {
    const { el, host, fixture } = await render();

    host.pool.set([
      { sides: 6, count: 2 },
      { sides: 4, count: 1 },
    ]);
    await fixture.whenStable();

    const entries = Array.from(el.querySelectorAll<HTMLElement>('[data-testid="pool"] [data-testid="pool-entry"]'));
    expect(entries.map((e) => e.dataset['sides'])).toEqual(['6', '4']);
    expect(entries.map((e) => e.querySelector('[data-testid="pool-count"]')!.textContent!.trim())).toEqual(['2', '1']);
  });

  it('changes an entry with its minus and plus buttons, and drops it at zero', async () => {
    const { host, fixture, press } = await render();
    host.pool.set([
      { sides: 6, count: 2 },
      { sides: 4, count: 1 },
    ]);
    await fixture.whenStable();

    await press('[data-testid="pool-entry"][data-sides="4"] [data-action="pool-plus"]');
    expect(host.pool()).toEqual([
      { sides: 6, count: 2 },
      { sides: 4, count: 2 },
    ]);

    await press('[data-testid="pool-entry"][data-sides="6"] [data-action="pool-minus"]');
    await press('[data-testid="pool-entry"][data-sides="6"] [data-action="pool-minus"]');
    expect(host.pool()).toEqual([{ sides: 4, count: 2 }]);
  });

  it('empties the pool with Clear', async () => {
    const { host, fixture, press, q } = await render();
    host.pool.set([{ sides: 6, count: 2 }]);
    await fixture.whenStable();

    await press('[data-action="clear-pool"]');

    expect(host.pool()).toEqual([]);
    expect(q('[data-testid="pool-entry"]')).toBeNull();
  });

  it('reads the pool and the modifier in the Roll button', async () => {
    const { host, fixture, q } = await render();

    host.pool.set([
      { sides: 6, count: 2 },
      { sides: 4, count: 1 },
    ]);
    host.modifier.set(3);
    await fixture.whenStable();

    expect(q('[data-action="roll-dice"]')!.textContent).toContain('Roll 2d6+1d4+3');

    host.modifier.set(-2);
    await fixture.whenStable();
    expect(q('[data-action="roll-dice"]')!.textContent).toContain('Roll 2d6+1d4-2');
  });

  it('reads the Roll button in French', async () => {
    const { host, fixture, q } = await render();
    TestBed.inject(TranslateService).use('fr');
    host.pool.set([{ sides: 6, count: 2 }]);
    host.modifier.set(3);
    await fixture.whenStable();

    expect(q('[data-action="roll-dice"]')!.textContent).toContain('Lancer 2d6+3');
  });

  it('sets the modifier from the Optimus UI number input', async () => {
    const { host, q } = await render();

    await typeNumber(q('[data-testid="dice-modifier"]')!, 5);

    expect(host.modifier()).toBe(5);
  });

  it('emits roll from the Roll button', async () => {
    const { host, fixture, press } = await render();
    host.pool.set([{ sides: 6, count: 1 }]);
    await fixture.whenStable();

    await press('[data-action="roll-dice"]');

    expect(host.rolls).toBe(1);
  });

  it('shows each die, the modifier and the total of the result', async () => {
    const { host, fixture, q } = await render();

    host.result.set({
      groups: [
        { sides: 6, values: [2, 5] },
        { sides: 4, values: [3] },
      ],
      modifier: 3,
      total: 13,
    });
    await fixture.whenStable();

    const result = q('[data-testid="dice-result"]')!.textContent!;
    expect(result).toContain('2d6+1d4+3');
    for (const value of ['2', '5', '3']) expect(result).toContain(value);
    expect(result).toContain('+ 3');
    expect(q('[data-testid="dice-total"]')!.textContent).toContain('13');
  });
});
