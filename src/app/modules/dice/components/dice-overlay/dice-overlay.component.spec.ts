import { Component } from '@angular/core';
import { combatTable, mount } from '../../../../../testing/combat-table';
import { settle } from '../../../../../testing/game-device';
import { DiceRollBusiness } from '../../business/dice-roll.business';
import { SharedRoll } from '../../models/dice-api';
import { DiceOverlayComponent } from './dice-overlay.component';

/** The overlay with a content slot, as the table page projects the combat decision. */
@Component({
  selector: 'app-test-host',
  imports: [DiceOverlayComponent],
  template: `<app-dice-overlay
    ><span data-testid="slot" diceActions>decide</span></app-dice-overlay
  >`,
})
class HostComponent {}

/**
 * Contract: `app-dice-overlay` gets a content slot `<ng-content select="[diceActions]">`.
 * - A combat roll on screen (`DiceRoll.combat`): the slot is shown instead of the Close button (`[data-action="close-dice"]` absent), no "Again", and
 *   Escape does not close the roll.
 * - A plain roll: unchanged. The Close button is there (`[data-action="close-dice"]`), the slot is not shown, Escape closes the roll.
 */
describe('DiceOverlayComponent', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<HostComponent>>>;
  let el: HTMLElement;
  let dice: DiceRollBusiness;

  const roll = (combat: boolean): SharedRoll => ({
    id: combat ? 'combat-1' : 'plain-1',
    by: { playerId: 'ada', name: 'Ada' },
    count: 1,
    sides: 6,
    values: [4],
    seed: 's',
    at: Date.now(),
    ...(combat
      ? {
          combat: {
            caster: { name: 'Ada', side: 'party' as const },
            skillName: 'Fireball',
            targets: [{ name: 'Goblin', side: 'enemy' as const }],
            pendingIds: ['p1'],
            total: 4,
            success: true,
          },
        }
      : {}),
  });
  const escape = async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();
  };

  beforeEach(async () => {
    table = await combatTable('free');
    dice = table.gm.injector.get(DiceRollBusiness);
    vi.spyOn(dice, 'createScene').mockResolvedValue({
      play: () => Promise.resolve(),
      skip: () => undefined,
      dispose: () => undefined,
    } as unknown as Awaited<ReturnType<DiceRollBusiness['createScene']>>);
    mounted = await mount(HostComponent, table.gm);
    el = mounted.el;
  });
  afterEach(() => {
    mounted.destroy();
    table.destroy();
  });

  it('shows the slot instead of Close on a combat roll', async () => {
    dice.presentShared(roll(true));
    await settle();

    expect(el.querySelector('[data-testid="slot"]')).not.toBeNull();
    expect(el.querySelector('[data-action="close-dice"]')).toBeNull();
    expect(el.querySelector('[data-action="again-dice"]')).toBeNull();
  });

  it('ignores Escape on a combat roll', async () => {
    dice.presentShared(roll(true));
    await settle();

    await escape();

    expect(dice.$current()?.id).toBe('combat-1');
    expect(el.querySelector('[data-testid="slot"]')).not.toBeNull();
  });

  it('keeps Close on a plain roll, without the slot', async () => {
    dice.presentShared(roll(false));
    await settle();

    expect(el.querySelector('[data-action="close-dice"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="slot"]')).toBeNull();
  });

  it('closes a plain roll with Escape and with the Close button', async () => {
    dice.presentShared(roll(false));
    await settle();
    await escape();
    expect(dice.$current()).toBeNull();

    dice.presentShared(roll(false));
    await settle();
    const close = el.querySelector<HTMLElement>('[data-action="close-dice"]')!;
    (close.matches('button') ? close : close.querySelector('button')!).click();
    await settle();
    expect(dice.$current()).toBeNull();
  });
});
