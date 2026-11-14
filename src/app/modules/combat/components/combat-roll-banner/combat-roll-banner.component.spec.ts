import { createComponent, Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { combatTable, mount } from '../../../../../testing/combat-table';
import { DiceRollBusiness } from '../../../dice/business/dice-roll.business';
import { CombatRollsBusiness } from '../../business/combat-rolls.business';
import { CombatRollBannerComponent } from './combat-roll-banner.component';

type Who = {
  name: string;
  side: 'party' | 'ally' | 'enemy';
  portraitId?: string;
};

/**
 * Contract: `app-combat-roll-banner` (no inputs) renders `CombatRollsBusiness.$banner()` of its device.
 * - Nothing rendered without a banner; otherwise `[data-testid="roll-banner"]` (`aria-live="polite"` on it) with `[data-field="banner-caster"]`,
 *   `[data-field="banner-skill"]` and one `[data-field="banner-target"]` per target.
 * - Once landed: `[data-field="banner-dice"]` (the values joined by " + "), `[data-field="banner-total"]` and `[data-field="banner-outcome"]`
 *   (`data-success="true" | "false"`). Before: none of the three.
 * - Bubbles: one `[data-testid="banner-bubble"]` per caster (`data-role="caster"`) and target (`data-role="target"`), with `data-name`, `title`
 *   and `aria-label` = the name, `data-enemy="true"` on enemies (absent otherwise); a portrait (`app-stored-image`) or else the initial.
 *   Up to 4 targets are shown, then `[data-testid="banner-more"]` reads "+N". The host is fixed and its z-index is above the dice overlay's (1200).
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
    expect(
      Array.from(el.querySelectorAll('[data-testid="banner-bubble"]')).map(
        (b) => `${b.getAttribute('data-role')}:${b.getAttribute('data-name')}`,
      ),
    ).toEqual(['caster:Ada', 'target:Goblin']);
    expect(text('[data-field="banner-skill"]')).toBe('Fireball');
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

  describe('bubbles', () => {
    const show = async (caster: Who, targets: Who[]) => {
      const stub = {
        $banner: signal({ caster, skillName: 'Fireball', targets }),
      };
      const injector = Injector.create({
        parent: table.bob.injector,
        providers: [{ provide: CombatRollsBusiness, useValue: stub }],
      });
      const ref = createComponent(CombatRollBannerComponent, {
        environmentInjector: injector as never,
      });
      document.body.appendChild(ref.location.nativeElement);
      ref.changeDetectorRef.detectChanges();
      return { ref, host: ref.location.nativeElement as HTMLElement };
    };
    const bubbles = (host: HTMLElement, role: string) =>
      Array.from(
        host.querySelectorAll<HTMLElement>(
          `[data-testid="banner-bubble"][data-role="${role}"]`,
        ),
      );

    it('shows the initial of a combatant without portrait, with the name as title and accessible label', async () => {
      const { ref, host } = await show({ name: 'Ada', side: 'party' }, [
        { name: 'Goblin', side: 'enemy' },
      ]);

      const [caster] = bubbles(host, 'caster');
      expect(caster.textContent?.trim()).toBe('A');
      expect(caster.getAttribute('title')).toBe('Ada');
      expect(caster.getAttribute('aria-label')).toBe('Ada');
      expect(caster.querySelector('app-stored-image')).toBeNull();
      const [target] = bubbles(host, 'target');
      expect(target.getAttribute('title')).toBe('Goblin');
      expect(target.getAttribute('aria-label')).toBe('Goblin');
      ref.destroy();
    });

    it('shows the portrait of a combatant that has one', async () => {
      const { ref, host } = await show(
        { name: 'Ada', side: 'party', portraitId: 'p-ada' },
        [{ name: 'Goblin', side: 'enemy' }],
      );

      expect(
        bubbles(host, 'caster')[0].querySelector('app-stored-image'),
      ).not.toBeNull();
      expect(
        bubbles(host, 'target')[0].querySelector('app-stored-image'),
      ).toBeNull();
      ref.destroy();
    });

    it('rings the enemies only', async () => {
      const { ref, host } = await show({ name: 'Orc', side: 'enemy' }, [
        { name: 'Ada', side: 'party' },
        { name: 'Helper', side: 'ally' },
      ]);

      expect(bubbles(host, 'caster')[0].getAttribute('data-enemy')).toBe(
        'true',
      );
      expect(
        bubbles(host, 'target').map((b) => b.getAttribute('data-enemy')),
      ).toEqual([null, null]);
      ref.destroy();
    });

    it('shows 4 targets then "+N" for the others', async () => {
      const targets: Who[] = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6'].map(
        (name) => ({
          name,
          side: 'enemy',
        }),
      );
      const { ref, host } = await show({ name: 'Ada', side: 'party' }, targets);

      expect(
        bubbles(host, 'target').map((b) => b.getAttribute('data-name')),
      ).toEqual(['A1', 'B2', 'C3', 'D4']);
      expect(
        host.querySelector('[data-testid="banner-more"]')?.textContent?.trim(),
      ).toBe('+2');
      ref.destroy();
    });

    it('shows no "+N" with 4 targets or fewer', async () => {
      const { ref, host } = await show({ name: 'Ada', side: 'party' }, [
        { name: 'A1', side: 'enemy' },
        { name: 'B2', side: 'enemy' },
        { name: 'C3', side: 'enemy' },
        { name: 'D4', side: 'enemy' },
      ]);

      expect(bubbles(host, 'target')).toHaveLength(4);
      expect(host.querySelector('[data-testid="banner-more"]')).toBeNull();
      ref.destroy();
    });
  });

  it('sits fixed above the dice overlay (z-index over 1200)', async () => {
    await cast();

    const style = getComputedStyle(el);
    expect(style.position).toBe('fixed');
    expect(Number(style.zIndex)).toBeGreaterThan(1200);
  });
});
