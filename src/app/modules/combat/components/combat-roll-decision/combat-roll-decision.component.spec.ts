import {
  click,
  combatTable,
  Device,
  mount,
  typeNumber,
} from '../../../../../testing/combat-table';
import { settle } from '../../../../../testing/game-device';
import { DiceRollBusiness } from '../../../dice/business/dice-roll.business';
import { CombatRollsBusiness } from '../../business/combat-rolls.business';
import { CombatRollDecisionComponent } from './combat-roll-decision.component';

/**
 * Contract: `app-combat-roll-decision` (no inputs) is projected into the dice overlay (`<app-combat-roll-decision diceActions />`) and decides the
 * combat roll on the device's dice screen (`DiceRollBusiness.$current()`): its pending results are the ones of `CombatBusiness.$state().pending`
 * listed in that roll's `pendingIds`. Nothing is rendered before the roll has landed on this device (`CombatRollsBusiness.isLanding`).
 * - GM device, results pending: one `[data-testid="decision"]` per result (text: the target name and the effects) with `[data-action="apply"]`,
 *   `[data-action="edit"]` (then `[data-testid="edit-amount"]` per effect and `[data-action="apply-edited"]`) and `[data-action="dismiss"]`. No close button.
 * - GM device, nothing pending (GM validation off, or all resolved): `[data-action="close-roll"]` reading "Close", which calls `CombatBusiness.closeRoll(rollId)`.
 * - Player device: no button at all; `[data-testid="deciding"]` reading "The GM is deciding…" while results are pending, nothing once resolved.
 */
const clean = (el: Element | null) =>
  (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('CombatRollDecisionComponent', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<CombatRollDecisionComponent>>>;
  let el: HTMLElement;

  const cast = async () => {
    await table.combat(table.ada).useSkill({
      casterId: table.named(table.gm, 'Ada').id,
      skillId: table.fireballId,
      targetIds: [table.named(table.gm, 'Goblin').id],
    });
    await settle();
  };
  /** The device throws the roll; `landed` brings its dice to rest. */
  const throwRoll = async (device: Device, landed: boolean) => {
    device.injector.get(CombatRollsBusiness);
    const dice = device.injector.get(DiceRollBusiness);
    const roll = dice.takeUnseenTableRoll();
    if (roll) dice.presentShared(roll);
    if (landed) dice.markSettled();
    await settle();
  };
  const open = async (device: Device, landed = true) => {
    await cast();
    mounted = await mount(CombatRollDecisionComponent, device);
    el = mounted.el;
    await throwRoll(device, landed);
  };
  const goblinLife = () => table.named(table.gm, 'Goblin').life?.current;

  afterEach(() => {
    mounted?.destroy();
    table.destroy();
  });

  describe('on the GM device', () => {
    beforeEach(async () => {
      table = await combatTable('free');
      await table.start();
    });

    it('shows nothing while the dice are still moving', async () => {
      await open(table.gm, false);

      expect(el.querySelector('[data-testid="decision"]')).toBeNull();
      expect(el.querySelector('[data-action="close-roll"]')).toBeNull();
    });

    it('lists the pending result once landed, with apply, edit and dismiss and no close', async () => {
      await open(table.gm);

      const rows = el.querySelectorAll('[data-testid="decision"]');
      expect(rows).toHaveLength(1);
      expect(clean(rows[0])).toContain('Goblin');
      for (const action of ['apply', 'edit', 'dismiss'])
        expect(
          rows[0].querySelector(`[data-action="${action}"]`),
        ).not.toBeNull();
      expect(el.querySelector('[data-action="close-roll"]')).toBeNull();
    });

    it('applies in one tap', async () => {
      await open(table.gm);

      await click(el.querySelector('[data-action="apply"]'));

      expect(goblinLife()).toBe(5);
      expect(table.state(table.gm).pending).toEqual([]);
      expect(el.querySelector('[data-testid="decision"]')).toBeNull();
    });

    it('edits the amount inline, then applies', async () => {
      await open(table.gm);

      await click(el.querySelector('[data-action="edit"]'));
      await typeNumber(el.querySelector('[data-testid="edit-amount"]')!, 3);
      await click(el.querySelector('[data-action="apply-edited"]'));

      expect(goblinLife()).toBe(7);
      expect(table.state(table.gm).pending).toEqual([]);
    });

    it('dismisses: nothing changes on the target', async () => {
      await open(table.gm);

      await click(el.querySelector('[data-action="dismiss"]'));

      expect(goblinLife()).toBe(10);
      expect(table.state(table.gm).pending).toEqual([]);
    });
  });

  describe('on the GM device with GM validation off', () => {
    beforeEach(async () => {
      table = await combatTable('free', {
        steps: {
          initiative: true,
          actionCounters: true,
          gmValidation: false,
          defence: true,
          rewards: true,
        },
      });
      await table.start();
    });

    it('offers Close, which closes the roll for everyone', async () => {
      await open(table.gm);
      expect(el.querySelector('[data-testid="decision"]')).toBeNull();
      const close = el.querySelector('[data-action="close-roll"]')!;
      expect(clean(close)).toBe('Close');
      const rollId = table.gm.injector.get(DiceRollBusiness).$tableRolls()![0]
        .id;

      await click(
        close.matches('button') ? close : close.querySelector('button'),
      );

      expect(table.state(table.bob).closedRollId).toBe(rollId);
    });
  });

  describe('on a player device', () => {
    beforeEach(async () => {
      table = await combatTable('free');
      await table.start();
    });

    it('says the GM is deciding, with no button', async () => {
      await open(table.bob);

      expect(clean(el.querySelector('[data-testid="deciding"]'))).toBe(
        'The GM is deciding…',
      );
      expect(el.querySelector('button')).toBeNull();
      expect(el.querySelector('[data-action]')).toBeNull();
    });

    it('stops saying it once the GM resolved the result', async () => {
      await open(table.bob);

      await table.combat(table.gm).dismiss(table.state(table.gm).pending[0].id);
      await settle();

      expect(el.querySelector('[data-testid="deciding"]')).toBeNull();
    });
  });
});
