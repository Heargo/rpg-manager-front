import {
  click,
  combatTable,
  Device,
  mount,
  typeNumber,
} from '../../../../../testing/combat-table';
import { settle } from '../../../../../testing/game-device';
import { CombatPlayerViewComponent } from './combat-player-view.component';

/**
 * Contract: `app-combat-player-view` has inputs `combatantId` and `characterId` (the player's own combatant and character) and runs on a player device.
 * - Turn order strip: `[data-testid="order-item"]` per combatant in order (`data-name`, `data-active="true"` on the active one).
 * - `[data-testid="your-turn"]` banner only while the player's own combatant is the active one; `[data-action="end-turn"]` likewise.
 * - Own skills `[data-testid="skill"]` (`data-name`, text with the preview "5 damage, 3 Mana, cooldown 2", `[data-action="use-skill"]`), own items
 *   `[data-testid="item"]` (`data-name`, `[data-action="use-item"]`) and counters `[data-testid="action-counter"]` (`data-action-name`, `data-used`, `data-count`,
 *   `[data-action="tick"]`), shown outside the turn too.
 * - Targeting: after `use-skill`, `[data-testid="target"]` per combatant (`data-name`), then `[data-action="confirm-skill"]`. The roll then shows in
 *   `[data-testid="roll"]` (the rolls and the skill name) and `[data-testid="waiting-gm"]` while one of the player's results is pending.
 * - Typed initiative: `[data-testid="initiative-input"]` (number) and `[data-action="initiative-set"]` when the world's mode is `typed`.
 * - No GM controls: no `apply`, `dismiss`, `edit`, `undo`, `next-turn`, `end` actions.
 */
const clean = (el: Element | null) =>
  (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('CombatPlayerViewComponent', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<CombatPlayerViewComponent>>>;
  let el: HTMLElement;

  const open = async (device: Device, name: string, playerId: string) => {
    mounted = await mount(CombatPlayerViewComponent, device, {
      combatantId: table.named(device, name).id,
      characterId: table.record(playerId).id,
    });
    el = mounted.el;
  };
  const orderNames = () =>
    Array.from(
      el.querySelectorAll<HTMLElement>('[data-testid="order-item"]'),
    ).map((i) => i.dataset['name']);

  afterEach(() => {
    mounted?.destroy();
    table.destroy();
  });

  describe('free initiative', () => {
    beforeEach(async () => {
      table = await combatTable('free');
      await table.start();
    });

    it('shows the turn order strip with the active combatant', async () => {
      await open(table.ada, 'Ada', 'ada');

      expect(orderNames()).toEqual(['Ada', 'Bob', 'Goblin']);
      expect(
        el
          .querySelector('[data-testid="order-item"][data-active="true"]')!
          .getAttribute('data-name'),
      ).toBe('Ada');
    });

    it('shows "Your turn" only while it is the player\'s own turn', async () => {
      await open(table.ada, 'Ada', 'ada');
      expect(el.querySelector('[data-testid="your-turn"]')).not.toBeNull();
      expect(clean(el.querySelector('[data-testid="your-turn"]'))).toContain(
        'Your turn',
      );
      mounted.destroy();

      await open(table.bob, 'Bob', 'bob');
      expect(el.querySelector('[data-testid="your-turn"]')).toBeNull();
      expect(el.querySelector('[data-action="end-turn"]')).toBeNull();
    });

    it('ends the turn of the player', async () => {
      await open(table.ada, 'Ada', 'ada');

      await click(el.querySelector('[data-action="end-turn"]'));

      expect(table.state(table.gm).activeId).toBe(
        table.named(table.gm, 'Bob').id,
      );
      expect(el.querySelector('[data-testid="your-turn"]')).toBeNull();
    });

    it('shows own skills, items and counters, and only those', async () => {
      await open(table.ada, 'Ada', 'ada');

      const skill = el.querySelector<HTMLElement>('[data-testid="skill"]')!;
      expect(skill.dataset['name']).toBe('Fireball');
      expect(clean(skill)).toContain('5 damage, 3 Mana, cooldown 2');
      expect(
        el.querySelector('[data-testid="item"]')!.getAttribute('data-name'),
      ).toBe('Potion');
      expect(
        el.querySelectorAll('[data-testid="action-counter"]'),
      ).toHaveLength(2);
      mounted.destroy();

      await open(table.bob, 'Bob', 'bob');
      expect(el.querySelector('[data-testid="skill"]')).toBeNull();
      expect(el.querySelector('[data-testid="item"]')).toBeNull();
    });

    it('keeps the skills readable outside the turn', async () => {
      await table.combat(table.gm).endTurn();
      await settle();
      await open(table.ada, 'Ada', 'ada');

      expect(el.querySelector('[data-testid="your-turn"]')).toBeNull();
      expect(
        el.querySelector('[data-testid="skill"]')!.getAttribute('data-name'),
      ).toBe('Fireball');
    });

    it('offers no GM controls', async () => {
      await open(table.ada, 'Ada', 'ada');

      expect(el.querySelector('[data-testid="skill"]')).not.toBeNull();
      for (const action of [
        'apply',
        'dismiss',
        'edit',
        'undo',
        'next-turn',
        'end',
      ])
        expect(el.querySelector(`[data-action="${action}"]`)).toBeNull();
    });

    it('ticks an own counter and uses an own item', async () => {
      await table.combat(table.gm).edit(table.named(table.gm, 'Ada').id, {
        kind: 'damage',
        amount: 7,
      });
      await open(table.ada, 'Ada', 'ada');

      await click(
        el.querySelector(
          '[data-testid="action-counter"][data-action-name="Movement"] [data-action="tick"]',
        ),
      );
      await click(
        el.querySelector('[data-testid="item"] [data-action="use-item"]'),
      );

      expect(
        table.named(table.gm, 'Ada').actions.find((a) => a.name === 'Movement')!
          .used,
      ).toBe(1);
      expect(table.current('ada', 'Life')).toBe(7);
    });

    it('picks a skill and a target, shows the roll to everyone, then waits for the GM', async () => {
      await open(table.ada, 'Ada', 'ada');
      expect(el.querySelector('[data-testid="waiting-gm"]')).toBeNull();

      await click(
        el.querySelector('[data-testid="skill"] [data-action="use-skill"]'),
      );
      await click(
        el.querySelector('[data-testid="target"][data-name="Goblin"]'),
      );
      await click(el.querySelector('[data-action="confirm-skill"]'));

      expect(table.state(table.gm).pending).toHaveLength(1);
      expect(table.state(table.gm).pending[0]).toMatchObject({
        casterId: table.named(table.gm, 'Ada').id,
        targetId: table.named(table.gm, 'Goblin').id,
      });
      expect(clean(el.querySelector('[data-testid="roll"]'))).toContain(
        'Fireball',
      );
      expect(el.querySelector('[data-testid="waiting-gm"]')).not.toBeNull();
      mounted.destroy();

      await open(table.bob, 'Bob', 'bob');
      expect(clean(el.querySelector('[data-testid="roll"]'))).toContain(
        'Fireball',
      );
      expect(el.querySelector('[data-testid="waiting-gm"]')).toBeNull();
    });

    it('stops waiting once the GM applies the result', async () => {
      await open(table.ada, 'Ada', 'ada');
      await click(
        el.querySelector('[data-testid="skill"] [data-action="use-skill"]'),
      );
      await click(
        el.querySelector('[data-testid="target"][data-name="Goblin"]'),
      );
      await click(el.querySelector('[data-action="confirm-skill"]'));

      await table.combat(table.gm).apply(table.state(table.gm).pending[0].id);
      await settle();

      expect(el.querySelector('[data-testid="waiting-gm"]')).toBeNull();
    });
  });

  describe('typed initiative', () => {
    beforeEach(async () => {
      table = await combatTable('typed');
      await table.start();
    });

    it('lets the player type their own initiative', async () => {
      await open(table.ada, 'Ada', 'ada');

      await typeNumber(
        el.querySelector('[data-testid="initiative-input"]')!,
        15,
      );
      await click(el.querySelector('[data-action="initiative-set"]'));

      expect(table.named(table.bob, 'Ada').initiative).toBe(15);
    });
  });

  describe('optional steps', () => {
    const all = {
      initiative: true,
      actionCounters: true,
      gmValidation: true,
      defence: true,
      rewards: true,
    };

    it('offers no typed initiative when the initiative step is off, even in typed mode', async () => {
      table = await combatTable('typed', { steps: { ...all, initiative: false } });
      await table.start();
      await open(table.ada, 'Ada', 'ada');

      expect(el.querySelector('[data-testid="initiative-input"]')).toBeNull();
      expect(el.querySelector('[data-action="initiative-set"]')).toBeNull();
    });

    it('shows no action counters when that step is off', async () => {
      table = await combatTable('free', { steps: { ...all, actionCounters: false } });
      await table.start();
      await open(table.ada, 'Ada', 'ada');

      expect(el.querySelector('[data-testid="action-counter"]')).toBeNull();
    });
  });
});
