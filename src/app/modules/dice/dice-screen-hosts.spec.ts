import { combatTable, mount, typeNumber } from '../../../testing/combat-table';
import { settle } from '../../../testing/game-device';
import { DiceRollBusiness } from './business/dice-roll.business';
import { DiceOverlayComponent } from './components/dice-overlay/dice-overlay.component';
import { DiceRollerComponent } from './components/dice-roller/dice-roller.component';
import { SharedRoll } from './models/dice-api';
import { DicePageComponent } from './pages/dice-page/dice-page.component';

/**
 * Contract: the Dice page, the table's dice panel (`app-dice-roller`) and the combat dice screen (`app-dice-overlay`) all render the one shared
 * `app-dice-screen` (see its spec) and keep their roll behaviour through it: its Roll button (`[data-action="roll-dice"]`) rolls the chosen dice
 * (`DiceRollBusiness.$current()`, `$history()`), tapping a `[data-testid="die"]` chooses the sides. The overlay shows it with the result of the roll on
 * screen, not editable on a combat roll (no `die` buttons, the `[diceActions]` slot in its bar).
 */
describe('dice screen hosts', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount>>;
  let dice: DiceRollBusiness;

  beforeEach(async () => {
    table = await combatTable('free');
    dice = table.gm.injector.get(DiceRollBusiness);
    vi.spyOn(dice, 'createScene').mockResolvedValue({
      play: () => Promise.resolve(),
      skip: () => undefined,
      dispose: () => undefined,
    } as unknown as Awaited<ReturnType<DiceRollBusiness['createScene']>>);
  });
  afterEach(() => {
    mounted.destroy();
    table.destroy();
  });

  const press = async (el: HTMLElement, selector: string) => {
    const target = el.querySelector<HTMLElement>(selector)!;
    (target.matches('button') ? target : target.querySelector('button')!).click();
    await settle();
  };

  const sharedRoll = (combat: boolean): SharedRoll => ({
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

  describe('Dice page', () => {
    it('renders the shared dice screen', async () => {
      mounted = await mount(DicePageComponent, table.gm);

      expect(mounted.el.querySelector('app-dice-screen')).not.toBeNull();
      expect(mounted.el.querySelector('app-dice-screen [data-testid="dice-bar"] [data-action="roll-dice"]')).not.toBeNull();
    });

    it('docks the screen fixed', async () => {
      mounted = await mount(DicePageComponent, table.gm);

      expect(mounted.el.querySelector('app-dice-screen [data-testid="dice-dock"]')!.getAttribute('data-dock')).toBe('fixed');
    });

    it('rolls a custom die typed in the sides input', async () => {
      mounted = await mount(DicePageComponent, table.gm);

      await typeNumber(mounted.el.querySelector('[data-testid="dice-sides"]')!, 7);
      await press(mounted.el, '[data-action="roll-dice"]');

      expect(dice.$current()?.sides).toBe(7);
    });

    it('rolls the dice chosen on the screen and keeps the roll in the history', async () => {
      mounted = await mount(DicePageComponent, table.gm);

      await press(mounted.el, '[data-testid="die"][data-sides="8"]');
      await press(mounted.el, '[data-action="roll-dice"]');

      expect(dice.$current()?.sides).toBe(8);
      expect(dice.$history().length).toBe(1);
      expect(mounted.el.querySelector('.history')!.textContent).toContain('1d8');
    });
  });

  describe('table dice panel', () => {
    it('renders the shared dice screen', async () => {
      mounted = await mount(DiceRollerComponent, table.gm);

      expect(mounted.el.querySelector('app-dice-screen')).not.toBeNull();
    });

    it('docks the screen inline', async () => {
      mounted = await mount(DiceRollerComponent, table.gm);

      expect(mounted.el.querySelector('app-dice-screen [data-testid="dice-dock"]')!.getAttribute('data-dock')).toBe('inline');
    });

    it('rolls the dice chosen on the screen for the table', async () => {
      mounted = await mount(DiceRollerComponent, table.gm);

      await press(mounted.el, '[data-testid="die"][data-sides="12"]');
      await press(mounted.el, '[data-action="roll-dice"]');

      expect(dice.$current()?.sides).toBe(12);
      expect(dice.$current()?.shared).toBeUndefined();
    });
  });

  describe('combat dice screen (overlay)', () => {
    it('shows a plain roll through the shared dice screen, with its total and Close', async () => {
      mounted = await mount(DiceOverlayComponent, table.gm);

      dice.presentShared(sharedRoll(false));
      await settle();

      const screen = mounted.el.querySelector('app-dice-screen')!;
      expect(screen).not.toBeNull();
      expect(screen.querySelector('[data-testid="dice-total"]')!.textContent).toContain('4');
      expect(screen.querySelector('[data-action="close-dice"]')).not.toBeNull();
    });

    it('shows the total once and docks the screen fixed', async () => {
      mounted = await mount(DiceOverlayComponent, table.gm);

      dice.presentShared(sharedRoll(false));
      await settle();

      expect(mounted.el.querySelectorAll('[data-testid="dice-total"]').length).toBe(1);
      expect(mounted.el.querySelector('app-dice-screen [data-testid="dice-dock"]')!.getAttribute('data-dock')).toBe('fixed');
    });

    it('closes the roll from the screen Close button', async () => {
      mounted = await mount(DiceOverlayComponent, table.gm);
      dice.presentShared(sharedRoll(false));
      await settle();

      await press(mounted.el, 'app-dice-screen [data-action="close-dice"]');

      expect(dice.$current()).toBeNull();
    });

    it('does not let the dice of a combat roll be edited', async () => {
      mounted = await mount(DiceOverlayComponent, table.gm);

      dice.presentShared(sharedRoll(true));
      await settle();

      expect(mounted.el.querySelector('app-dice-screen')).not.toBeNull();
      expect(mounted.el.querySelectorAll('app-dice-screen [data-testid="die"]').length).toBe(0);
      expect(mounted.el.querySelector('app-dice-screen [data-action="again-dice"]')).toBeNull();
    });
  });
});
