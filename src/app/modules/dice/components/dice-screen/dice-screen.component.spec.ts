import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { typeNumber } from '../../../../../testing/combat-table';
import { TEST_PROVIDERS } from '../../../../../testing/test-providers';
import { DiceScreenComponent, DiceScreenResult } from './dice-screen.component';

/**
 * Contract: `app-dice-screen`, the one dice-screen layout shared by the Dice page, the table's dice panel and the combat dice screen.
 * Inputs: `count` and `sides` (two-way models, the dice to roll), `editable` (default true), `result` (`DiceScreenResult | null`, the last roll:
 * `{ count, sides, values, total }`). Outputs: `roll`, `reroll`, `close`. Content slots: `[diceOptions]` (above the bottom bar) and `[diceActions]`
 * (in the bottom bar after a roll, replacing Roll again / Close).
 * Hooks: `[data-testid="dice-result"]` (top: notation and values of the last roll, nothing before a roll), `[data-testid="dice-grid"]` holding one
 * `[data-testid="die"][data-sides]` button per d4, d6, d8, d10, d12, d20, d100 (accessible name containing "d<sides>", `aria-pressed` on the chosen one),
 * `[data-testid="dice-count"]` (wrapper of the number input), and `[data-testid="dice-bar"]` (bottom bar).
 * Bar: before a roll it holds `[data-action="roll-dice"]` (label "Roll"); after a roll it holds `[data-testid="dice-total"]` (the total),
 * `[data-action="again-dice"]` ("Roll again") and `[data-action="close-dice"]` ("Close"), and no Roll button.
 * Editable also has `[data-testid="dice-sides"]` (wrapper of a free number input, 2 to MAX_SIDES) next to the grid: typing 7 sets sides to 7.
 * Input `dock: 'fixed' | 'inline'` (default 'inline'), exposed as `data-dock` on `[data-testid="dice-dock"]` (the wrapper of the options and the bar).
 * Input `actions: 'buttons' | 'slot'` (default 'buttons'): after a roll the bar holds Roll again / Close, or the `[diceActions]` slot.
 * After a roll exactly one `[data-testid="dice-total"]` is in the screen.
 * Not editable: no `die` buttons, no `dice-count`, no `dice-sides`.
 */
@Component({
  selector: 'app-test-host',
  imports: [DiceScreenComponent],
  template: `
    <app-dice-screen
      [(count)]="count"
      [(sides)]="sides"
      [editable]="editable()"
      [result]="result()"
      [dock]="dock()"
      [actions]="actions()"
      (roll)="rolls = rolls + 1; result.set({ count: count(), sides: sides(), values: [3, 4], total: 7 })"
      (reroll)="rerolls = rerolls + 1"
      (close)="result.set(null)"
    >
      <label diceOptions data-testid="option">Share with the table</label>
      <span diceActions data-testid="actions-slot">decide</span>
    </app-dice-screen>
  `,
})
class HostComponent {
  count = signal(1);
  sides = signal(20);
  editable = signal(true);
  dock = signal<'fixed' | 'inline'>('inline');
  actions = signal<'buttons' | 'slot'>('buttons');
  result = signal<DiceScreenResult | null>(null);
  rolls = 0;
  rerolls = 0;
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

describe('DiceScreenComponent', () => {
  it('has the result area, the dice grid and the bottom bar', async () => {
    const { q } = await render();

    expect(q('[data-testid="dice-result"]')).not.toBeNull();
    expect(q('[data-testid="dice-grid"]')).not.toBeNull();
    expect(q('[data-testid="dice-bar"]')).not.toBeNull();
  });

  it('offers one button per die, each with an accessible name, the chosen one pressed', async () => {
    const { el } = await render();

    const dice = Array.from(el.querySelectorAll<HTMLElement>('[data-testid="dice-grid"] [data-testid="die"]'));
    expect(dice.map((d) => d.dataset['sides'])).toEqual(['4', '6', '8', '10', '12', '20', '100']);
    for (const d of dice) expect(d.getAttribute('aria-label')).toContain(`d${d.dataset['sides']}`);
    expect(dice.find((d) => d.dataset['sides'] === '20')!.getAttribute('aria-pressed')).toBe('true');
    expect(dice.find((d) => d.dataset['sides'] === '6')!.getAttribute('aria-pressed')).toBe('false');
  });

  it('chooses the sides of the dice when a die is tapped', async () => {
    const { host, press } = await render();

    await press('[data-testid="die"][data-sides="8"]');

    expect(host.sides()).toBe(8);
  });

  it('shows the number-of-dice input', async () => {
    const { q } = await render();

    expect(q('[data-testid="dice-count"] input')).not.toBeNull();
  });

  it('shows Roll in the bottom bar before a roll, with the options above and no result', async () => {
    const { q } = await render();

    expect(q('[data-testid="dice-bar"] [data-action="roll-dice"]')!.textContent).toContain('Roll');
    expect(q('[data-testid="dice-bar"] [data-testid="dice-total"]')).toBeNull();
    expect(q('[data-testid="dice-bar"] [data-action="again-dice"]')).toBeNull();
    expect(q('[data-testid="dice-bar"] [data-action="close-dice"]')).toBeNull();
    expect(q('[data-testid="option"]')!.textContent).toContain('Share with the table');
    expect(q('[data-testid="dice-bar"] [data-testid="option"]')).toBeNull();
  });

  it('emits roll when Roll is pressed', async () => {
    const { host, press } = await render();

    await press('[data-action="roll-dice"]');

    expect(host.rolls).toBe(1);
  });

  it('swaps the bar for the total, Roll again and Close after a roll, and shows the roll on top', async () => {
    const { q, press } = await render();

    await press('[data-action="roll-dice"]');

    expect(q('[data-testid="dice-bar"] [data-testid="dice-total"]')!.textContent).toContain('7');
    expect(q('[data-testid="dice-bar"] [data-action="again-dice"]')!.textContent).toContain('Roll again');
    expect(q('[data-testid="dice-bar"] [data-action="close-dice"]')!.textContent).toContain('Close');
    expect(q('[data-testid="dice-bar"] [data-action="roll-dice"]')).toBeNull();
    expect(q('[data-testid="dice-result"]')!.textContent).toContain('3');
    expect(q('[data-testid="dice-result"]')!.textContent).toContain('4');
  });

  it('emits reroll when Roll again is pressed', async () => {
    const { host, press } = await render();
    await press('[data-action="roll-dice"]');

    await press('[data-action="again-dice"]');

    expect(host.rerolls).toBe(1);
  });

  it('brings Roll back when Close is pressed', async () => {
    const { q, press } = await render();
    await press('[data-action="roll-dice"]');

    await press('[data-action="close-dice"]');

    expect(q('[data-testid="dice-bar"] [data-action="roll-dice"]')).not.toBeNull();
    expect(q('[data-testid="dice-total"]')).toBeNull();
  });

  it('shows the actions slot (actions="slot") in the bar after a roll instead of Roll again and Close', async () => {
    const { q, host, fixture } = await render();
    expect(q('[data-testid="actions-slot"]')).toBeNull();

    host.actions.set('slot');
    host.result.set({ count: 1, sides: 20, values: [12], total: 12 });
    await fixture.whenStable();

    expect(q('[data-testid="dice-bar"] [data-testid="actions-slot"]')).not.toBeNull();
    expect(q('[data-action="again-dice"]')).toBeNull();
    expect(q('[data-action="close-dice"]')).toBeNull();
  });

  it('has no dice editing when not editable, but still shows Roll and the result', async () => {
    const { q, el, host, fixture } = await render();

    host.editable.set(false);
    await fixture.whenStable();

    expect(el.querySelectorAll('[data-testid="die"]').length).toBe(0);
    expect(q('[data-testid="dice-count"]')).toBeNull();
    expect(q('[data-testid="dice-sides"]')).toBeNull();
    expect(q('[data-testid="dice-bar"]')).not.toBeNull();
  });

  it('rolls a custom die typed in the sides input', async () => {
    const { host, q, press } = await render();

    await typeNumber(q('[data-testid="dice-sides"]')!, 7);
    await press('[data-action="roll-dice"]');

    expect(host.sides()).toBe(7);
    expect(host.result()?.sides).toBe(7);
  });

  it('shows the total once after a roll', async () => {
    const { el, press } = await render();

    await press('[data-action="roll-dice"]');

    expect(el.querySelectorAll('[data-testid="dice-total"]').length).toBe(1);
  });

  it('docks inline by default and fixed when asked', async () => {
    const { q, host, fixture } = await render();
    expect(q('[data-testid="dice-dock"]')!.dataset['dock']).toBe('inline');

    host.dock.set('fixed');
    await fixture.whenStable();

    expect(q('[data-testid="dice-dock"]')!.dataset['dock']).toBe('fixed');
  });
});
