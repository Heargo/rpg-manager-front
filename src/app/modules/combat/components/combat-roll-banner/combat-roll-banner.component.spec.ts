import { TestBed } from '@angular/core/testing';
import { combatTable, mount } from '../../../../../testing/combat-table';
import { DiceRollBusiness } from '../../../dice/business/dice-roll.business';
import { CombatRollsBusiness } from '../../business/combat-rolls.business';
import { CombatRollBannerComponent } from './combat-roll-banner.component';

/**
 * Contract: `app-combat-roll-banner` (no inputs) renders `CombatRollsBusiness.$banner()` of its device.
 * - Nothing rendered without a banner; otherwise `[data-testid="roll-banner"]` (`aria-live="polite"` on it) with `[data-field="banner-caster"]`,
 *   `[data-field="banner-skill"]` and one `[data-field="banner-target"]` per target.
 * - Once landed: `[data-field="banner-dice"]` (the values joined by " + "), `[data-field="banner-total"]` and `[data-field="banner-outcome"]`
 *   (`data-success="true" | "false"`). Before: none of the three.
 * - Gone after the fade (4 s after the GM resolves).
 */
describe('CombatRollBannerComponent', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<CombatRollBannerComponent>>>;
  let el: HTMLElement;

  const pump = async (ms = 0) => {
    await vi.advanceTimersByTimeAsync(ms);
    for (let i = 0; i < 5; i++) {
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(0);
    }
  };
  const text = (selector: string) =>
    el.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    table = await combatTable('free');
    await table.start();
    mounted = await mount(CombatRollBannerComponent, table.bob);
    el = mounted.el;
    table.bob.injector.get(CombatRollsBusiness);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    mounted.destroy();
    table.destroy();
  });

  const cast = async () => {
    const use = table.combat(table.ada).useSkill({
      casterId: table.named(table.gm, 'Ada').id,
      skillId: table.fireballId,
      targetIds: [table.named(table.gm, 'Goblin').id],
    });
    await pump();
    await use;
    await pump();
  };

  it('renders nothing while no combat roll was made', () => {
    expect(el.querySelector('[data-testid="roll-banner"]')).toBeNull();
  });

  it('names the caster, the skill and the targets on another player device, without the dice before the roll lands', async () => {
    await cast();

    const banner = el.querySelector('[data-testid="roll-banner"]')!;
    expect(banner.getAttribute('aria-live')).toBe('polite');
    expect(text('[data-field="banner-caster"]')).toBe('Ada');
    expect(text('[data-field="banner-skill"]')).toBe('Fireball');
    expect(
      Array.from(el.querySelectorAll('[data-field="banner-target"]')).map((t) =>
        t.textContent?.trim(),
      ),
    ).toEqual(['Goblin']);
    for (const field of ['dice', 'total', 'outcome'])
      expect(el.querySelector(`[data-field="banner-${field}"]`)).toBeNull();
  });

  it('adds the dice, the total and the outcome once the roll landed', async () => {
    await cast();
    const dice = table.bob.injector.get(DiceRollBusiness);
    dice.presentShared(dice.takeUnseenTableRoll()!);
    dice.markSettled();
    await pump();

    expect(text('[data-field="banner-dice"]')).toContain('1');
    expect(text('[data-field="banner-total"]')).toContain('1');
    expect(
      el
        .querySelector('[data-field="banner-outcome"]')!
        .getAttribute('data-success'),
    ).toBe('true');
  });

  it('is gone 4 s after the GM resolves the result', async () => {
    await cast();
    const pendingId = table.state(table.gm).pending[0].id;
    await pump(6100);
    expect(el.querySelector('[data-testid="roll-banner"]')).not.toBeNull();

    const apply = table.combat(table.gm).apply(pendingId);
    await pump();
    await apply;
    await pump(3900);
    expect(el.querySelector('[data-testid="roll-banner"]')).not.toBeNull();
    await pump(200);

    expect(el.querySelector('[data-testid="roll-banner"]')).toBeNull();
  });
});
