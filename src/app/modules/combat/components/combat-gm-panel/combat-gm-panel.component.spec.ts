import { Component } from '@angular/core';
import {
  click,
  combatTable,
  mount,
  pickStart,
  pickTarget,
  typeNumber,
} from '../../../../../testing/combat-table';
import { settle } from '../../../../../testing/game-device';
import { DiceRollBusiness } from '../../../dice/business/dice-roll.business';
import { NpcCatalogueBusiness } from '../../../npc/business/npc-catalogue.business';
import { CombatSelectionBusiness } from '../../business/combat-selection.business';
import { CombatOrderComponent } from '../combat-order/combat-order.component';
import { CombatGmPanelComponent } from './combat-gm-panel.component';

/** The order and the panel side by side, as the table shows them. */
@Component({
  selector: 'app-test-host',
  imports: [CombatOrderComponent, CombatGmPanelComponent],
  template: '<app-combat-order /><app-combat-gm-panel />',
})
class HostComponent {}

/**
 * Contract: `app-combat-gm-panel` (no inputs) runs on the GM's device (host) against the real `CombatBusiness`; the turn order rows live in
 * `app-combat-order` (mounted next to it in these tests, selection shared through `CombatSelectionBusiness`). Elements are found by
 * `data-testid` / `data-action`; buttons are clicked, p-inputNumber fields are typed into (their wrapper carries the testid).
 *
 * - No encounter: `[data-testid="start-form"]` (unchanged: two multi-selects, NPC counts, Start). With the world's grid on and at least one pick, it also holds
 *   `app-combat-setup-grid` (`[data-testid="setup-grid"]`, tokens `[data-testid="setup-token"]` with `data-key`, `data-x`, `data-y`) and a hint
 *   `[data-testid="place-hint"]`; Start sends the shown cell of every token. Without the grid, or without a pick, none of that.
 * - Encounter: toolbar `[data-action="next-turn"]`, `[data-action="undo"]`, `[data-action="end"]` and a round label `[data-field="round"]`; no combatant rows.
 * - `[data-testid="active-row"]` (`data-name` = the active combatant), outside the rows: tabs, skills, items, targeting (unchanged).
 * - `[data-testid="pending"]` per pending result, listed once its roll has landed (`CombatRollsBusiness.isLanding(id)` is false: the GM's dice came to
 *   rest, or 6 s passed); while it lands the result is hidden.
 * - Selected combatant (picked with `[data-action="select"]` in the order): `[data-testid="selected-edits"]` (`data-name`) holds
 *   `[data-testid="manual-amount"]`, `[data-action="damage"]`, `[data-action="heal"]`, `[data-testid="manual-status"]`, `[data-action="add-status"]`.
 *   Nothing selected: no such block. It goes away when the encounter ends.
 * - End dialog: unchanged.
 */
const row = (el: HTMLElement, name: string) =>
  el.querySelector<HTMLElement>(
    `[data-testid="combatant"][data-name="${name}"]`,
  )!;
const names = (el: HTMLElement) =>
  Array.from(el.querySelectorAll<HTMLElement>('[data-testid="combatant"]')).map(
    (r) => r.dataset['name'],
  );
const clean = (el: Element | null) =>
  (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('CombatGmPanelComponent', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<HostComponent>>>;
  let el: HTMLElement;

  const open = async () => {
    mounted = await mount(HostComponent, table.gm);
    el = mounted.el;
  };

  beforeEach(async () => {
    table = await combatTable('free');
  });
  afterEach(() => {
    mounted?.destroy();
    table.destroy();
  });

  it('starts an encounter from the characters picked and an NPC count', async () => {
    await open();
    expect(el.querySelector('[data-testid="start-form"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="combatant"]')).toBeNull();

    await pickStart(el, 'start-characters', 'Ada');
    await pickStart(el, 'start-characters', 'Bob');
    await pickStart(el, 'start-npcs', 'Goblin');
    const goblin = '[data-testid="start-npc"][data-name="Goblin"]';
    expect(el.querySelector(goblin)).not.toBeNull();
    expect(
      el.querySelector<HTMLInputElement>(
        `${goblin} [data-testid="npc-count"] input`,
      )!.value,
    ).toBe('1');
    await typeNumber(el.querySelector(`${goblin} [data-testid="npc-count"]`)!, 2);
    await click(el.querySelector('[data-action="start"]'));

    expect(names(el)).toEqual(['Ada', 'Bob', 'Goblin 1', 'Goblin 2']);
    expect(table.state(table.ada).combatants).toHaveLength(4);
    expect(el.querySelector('[data-testid="start-form"]')).toBeNull();
  });

  it('starts with the default count of one copy per picked NPC', async () => {
    await open();
    await pickStart(el, 'start-npcs', 'Goblin');
    await click(el.querySelector('[data-action="start"]'));
    expect(names(el)).toEqual(['Goblin']);
  });

  it('drops the count row of an NPC that is unpicked', async () => {
    await open();
    await pickStart(el, 'start-npcs', 'Goblin');
    expect(el.querySelector('[data-testid="start-npc"]')).not.toBeNull();
    await pickStart(el, 'start-npcs', 'Goblin');
    expect(el.querySelector('[data-testid="start-npc"]')).toBeNull();
  });

  it('disables Start while nothing is picked', async () => {
    await open();
    const start = () => el.querySelector<HTMLButtonElement>('[data-action="start"]')!;
    expect(start().disabled).toBe(true);
    await pickStart(el, 'start-characters', 'Ada');
    expect(start().disabled).toBe(false);
    await pickStart(el, 'start-characters', 'Ada');
    expect(start().disabled).toBe(true);
  });

  it('shows the hint instead of the NPC multi-select when the catalogue is empty', async () => {
    await table.gm.injector
      .get(NpcCatalogueBusiness)
      .remove(table.goblinNpc.id);
    await settle();
    await open();
    expect(el.querySelector('[data-testid="start-npcs"]')).toBeNull();
    expect(el.querySelector('[data-testid="start-characters"]')).not.toBeNull();
    expect(clean(el.querySelector('.hint'))).toContain('No NPC in the catalogue yet.');
  });

  it('expands the active row with counters, skills and items, and ticks a counter', async () => {
    await table.start();
    await open();
    const active = el.querySelector<HTMLElement>('[data-testid="active-row"]')!;

    expect(active.dataset['name']).toBe('Ada');
    const tabs = Array.from(
      active.querySelectorAll<HTMLElement>('[role="tab"]'),
    ).map((t) => clean(t));
    expect(tabs).toEqual(['Action (1/1)', 'Movement (1/1)']);
    const skill = active.querySelector<HTMLElement>('[data-testid="skill"]')!;
    expect(skill.dataset['name']).toBe('Fireball');
    expect(clean(skill)).toContain('5 damage, 3 Mana, cooldown 2');
    expect(
      active.querySelector('[data-testid="item"]')!.getAttribute('data-name'),
    ).toBe('Potion');

    await click(
      active.querySelector('[data-action="tick"]'),
    );
    expect(
      table.named(table.ada, 'Ada').actions.find((a) => a.name === 'Action')!
        .used,
    ).toBe(1);
  });

  it('uses an item from the active row', async () => {
    await table.start();
    await table.combat(table.gm).edit(table.named(table.gm, 'Ada').id, {
      kind: 'damage',
      amount: 7,
    });
    await open();

    await click(
      el.querySelector('[data-testid="item"] [data-action="use-item"]'),
    );

    expect(table.current('ada', 'Life')).toBe(7);
    expect(table.record('ada').inventory).toEqual([]);
  });

  describe('using a skill', () => {
    const castOnly = async () => {
      await click(
        el.querySelector('[data-testid="skill"] [data-action="use-skill"]'),
      );
      await pickTarget(el, 'Goblin');
      await click(el.querySelector('[data-action="confirm-skill"]'));
    };
    /** The GM's device throws the roll of the use and its dice come to rest. */
    const land = async () => {
      const dice = table.gm.injector.get(DiceRollBusiness);
      const roll = dice.takeUnseenTableRoll();
      if (roll) dice.presentShared(roll);
      dice.markSettled();
      await settle();
    };
    const cast = async () => {
      await castOnly();
      await land();
    };

    beforeEach(async () => {
      await table.start();
      await open();
    });

    it('picks the skill and its target, lists the pending result and greys the skill out', async () => {
      await cast();

      const pending = el.querySelectorAll('[data-testid="pending"]');
      expect(pending).toHaveLength(1);
      expect(clean(pending[0])).toContain('Ada');
      expect(clean(pending[0])).toContain('Fireball');
      expect(clean(pending[0])).toContain('Goblin');
      expect(table.state(table.bob).pending).toHaveLength(1);
      expect(
        el
          .querySelector('[data-testid="skill"]')!
          .getAttribute('data-available'),
      ).toBe('false');
    });

    it('hides the pending result while the roll is landing, then shows apply, edit and dismiss', async () => {
      await castOnly();

      expect(table.state(table.gm).pending).toHaveLength(1);
      expect(el.querySelector('[data-testid="pending"]')).toBeNull();
      expect(el.querySelector('[data-action="apply"]')).toBeNull();

      await land();

      expect(el.querySelectorAll('[data-testid="pending"]')).toHaveLength(1);
      for (const action of ['apply', 'edit', 'dismiss'])
        expect(
          el.querySelector(`[data-testid="pending"] [data-action="${action}"]`),
        ).not.toBeNull();
    });

    it('applies a pending result in one tap', async () => {
      await cast();

      await click(
        el.querySelector('[data-testid="pending"] [data-action="apply"]'),
      );

      expect(table.named(table.gm, 'Goblin').life?.current).toBe(5);
      expect(el.querySelector('[data-testid="pending"]')).toBeNull();
    });

    it('edits the amount, then applies', async () => {
      await cast();

      await click(
        el.querySelector('[data-testid="pending"] [data-action="edit"]'),
      );
      await typeNumber(el.querySelector('[data-testid="edit-amount"]')!, 3);
      await click(el.querySelector('[data-action="apply-edited"]'));

      expect(table.named(table.gm, 'Goblin').life?.current).toBe(7);
      expect(el.querySelector('[data-testid="pending"]')).toBeNull();
    });

    it('dismisses a pending result: nothing changes on the target', async () => {
      await cast();

      await click(
        el.querySelector('[data-testid="pending"] [data-action="dismiss"]'),
      );

      expect(table.named(table.gm, 'Goblin').life?.current).toBe(10);
      expect(table.state(table.gm).pending).toEqual([]);
      expect(el.querySelector('[data-testid="pending"]')).toBeNull();
    });
  });

  it('applies damage, heal and a status by hand to the selected combatant', async () => {
    await table.start();
    await open();
    expect(el.querySelector('[data-testid="selected-edits"]')).toBeNull();
    await click(row(el, 'Goblin').querySelector('[data-action="select"]'));
    const edits = () =>
      el.querySelector<HTMLElement>('[data-testid="selected-edits"]')!;
    expect(edits().dataset['name']).toBe('Goblin');
    expect(row(el, 'Goblin').querySelector('[data-testid="manual-amount"]')).toBeNull();

    await typeNumber(edits().querySelector('[data-testid="manual-amount"]')!, 6);
    await click(edits().querySelector('[data-action="damage"]'));
    expect(table.named(table.gm, 'Goblin').life?.current).toBe(4);

    await typeNumber(edits().querySelector('[data-testid="manual-amount"]')!, 2);
    await click(edits().querySelector('[data-action="heal"]'));
    expect(table.named(table.gm, 'Goblin').life?.current).toBe(6);

    const status = edits().querySelector('[data-testid="manual-status"]')!;
    const input = (
      status.tagName === 'INPUT' ? status : status.querySelector('input')!
    ) as HTMLInputElement;
    input.value = 'Stunned';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await click(edits().querySelector('[data-action="add-status"]'));
    expect(table.named(table.ada, 'Goblin').statuses).toEqual(['Stunned']);
  });

  it('follows the selection to another combatant and drops it when unselected', async () => {
    await table.start();
    await open();
    await click(row(el, 'Goblin').querySelector('[data-action="select"]'));
    await click(row(el, 'Bob').querySelector('[data-action="select"]'));
    expect(
      el.querySelector<HTMLElement>('[data-testid="selected-edits"]')!.dataset['name'],
    ).toBe('Bob');

    await click(row(el, 'Bob').querySelector('[data-action="select"]'));
    expect(el.querySelector('[data-testid="selected-edits"]')).toBeNull();
  });

  it('drops the manual edits when the encounter ends', async () => {
    await table.start();
    await open();
    await click(row(el, 'Goblin').querySelector('[data-action="select"]'));
    expect(el.querySelector('[data-testid="selected-edits"]')).not.toBeNull();

    await table.combat(table.gm).end({ xp: [] });
    await settle();

    expect(el.querySelector('[data-testid="selected-edits"]')).toBeNull();
    expect(table.gm.injector.get(CombatSelectionBusiness).$selectedId()).toBeNull();
  });

  it('shows the toolbar, the round and the active actions but no combatant rows on its own', async () => {
    await table.start();
    mounted?.destroy();
    mounted = await mount(CombatGmPanelComponent, table.gm);
    el = mounted.el;

    expect(el.querySelector('[data-action="next-turn"]')).not.toBeNull();
    expect(el.querySelector('[data-field="round"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="active-row"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="combatant"]')).toBeNull();
  });

  it('undoes the last change and goes to the next turn', async () => {
    await table.start();
    await open();
    await click(row(el, 'Goblin').querySelector('[data-action="select"]'));
    await typeNumber(
      el.querySelector('[data-testid="selected-edits"] [data-testid="manual-amount"]')!,
      6,
    );
    await click(el.querySelector('[data-testid="selected-edits"] [data-action="damage"]'));
    expect(table.named(table.gm, 'Goblin').life?.current).toBe(4);

    await click(el.querySelector('[data-action="undo"]'));
    expect(table.named(table.gm, 'Goblin').life?.current).toBe(10);

    await click(el.querySelector('[data-action="next-turn"]'));
    expect(table.state(table.gm).activeId).toBe(
      table.named(table.gm, 'Bob').id,
    );
    expect(row(el, 'Bob').dataset['active']).toBe('true');
  });

  it('ends the encounter with the proposed rewards: XP split, money and loot, then confirms', async () => {
    await table.start();
    await table.combat(table.gm).edit(table.named(table.gm, 'Goblin').id, {
      kind: 'damage',
      amount: 10,
    });
    await open();

    await click(el.querySelector('[data-action="end"]'));
    const dialog = document.body.querySelector('[data-testid="end-dialog"]')!;
    const xp = Array.from(
      dialog.querySelectorAll<HTMLElement>('[data-testid="reward-xp"]'),
    ).map((r) => [r.dataset['name'], r.querySelector('input')!.value]);
    expect(xp).toEqual([
      ['Ada', '20'],
      ['Bob', '20'],
    ]);
    expect(
      clean(dialog.querySelector('[data-field="reward-money"]')),
    ).toContain('7');
    expect(
      clean(dialog.querySelector('[data-testid="reward-loot"]')),
    ).toContain('Ring');

    await click(dialog.querySelector('[data-action="confirm-end"]'));

    expect(table.combat(table.bob).$state()).toBeNull();
    expect(table.record('ada').xp).toBe(20);
    expect(table.record('bob').xp).toBe(20);
  });

  describe('optional steps', () => {
    const steps = (off: string) => ({
      initiative: off !== 'initiative',
      actionCounters: off !== 'actionCounters',
      gmValidation: off !== 'gmValidation',
      defence: off !== 'defence',
      rewards: off !== 'rewards',
    });

    it('shows no counters on the active row when the action counters step is off', async () => {
      table.destroy();
      table = await combatTable('free', { steps: steps('actionCounters') });
      await table.start();
      await open();

      expect(el.querySelector('[role="tab"]')).toBeNull();
      expect(el.querySelector('[data-testid="active-row"]')).not.toBeNull();
    });

    it('ends at once, with no rewards dialog and no XP, when the rewards step is off', async () => {
      table.destroy();
      table = await combatTable('free', { steps: steps('rewards') });
      await table.start();
      await table.combat(table.gm).edit(table.named(table.gm, 'Goblin').id, {
        kind: 'damage',
        amount: 10,
      });
      await open();

      await click(el.querySelector('[data-action="end"]'));
      const dialog = document.body.querySelector('[data-testid="end-dialog"]');
      if (dialog) await click(dialog.querySelector('[data-action="confirm-end"]'));

      expect(dialog?.querySelector('[data-testid="reward-xp"]') ?? null).toBeNull();
      expect(table.combat(table.bob).$state()).toBeNull();
      expect(table.record('ada').xp).toBe(0);
    });
  });
});

describe('CombatGmPanelComponent start form with a grid', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<HostComponent>>>;
  let el: HTMLElement;

  const tokens = () =>
    Array.from(el.querySelectorAll<HTMLElement>('[data-testid="setup-token"]')).map(
      (t) => [t.dataset['name'] ?? t.dataset['key'], t.dataset['x'], t.dataset['y']],
    );
  const keys = () =>
    Array.from(el.querySelectorAll<HTMLElement>('[data-testid="setup-token"]')).map(
      (t) => t.dataset['key'],
    );

  beforeEach(async () => {
    table = await combatTable('free', {
      grid: { enabled: true, columns: 10, rows: 10 },
    });
    mounted = await mount(HostComponent, table.gm);
    el = mounted.el;
  });
  afterEach(() => {
    mounted?.destroy();
    table.destroy();
  });

  it('shows no setup grid until something is picked', async () => {
    expect(el.querySelector('[data-testid="setup-grid"]')).toBeNull();
    expect(el.querySelector('[data-testid="place-hint"]')).toBeNull();
    await pickStart(el, 'start-characters', 'Ada');
    expect(el.querySelector('[data-testid="setup-grid"]')).not.toBeNull();
    expect(clean(el.querySelector('[data-testid="place-hint"]'))).toBe(
      'Drag the tokens to place them',
    );
  });

  it('shows a token per pick, the party on the left and the enemies on the right', async () => {
    await pickStart(el, 'start-characters', 'Ada');
    await pickStart(el, 'start-characters', 'Bob');
    await pickStart(el, 'start-npcs', 'Goblin');
    await typeNumber(
      el.querySelector('[data-testid="start-npc"] [data-testid="npc-count"]')!,
      2,
    );
    expect(tokens()).toEqual([
      ['Ada', '0', '0'],
      ['Bob', '0', '1'],
      [expect.stringContaining('Goblin'), '9', '0'],
      [expect.stringContaining('Goblin'), '9', '1'],
    ]);
    expect(keys()).toEqual([
      `character:${table.record('ada').id}`,
      `character:${table.record('bob').id}`,
      `npc:${table.goblinNpc.id}:1`,
      `npc:${table.goblinNpc.id}:2`,
    ]);
  });

  it('drops the token of an unpicked character', async () => {
    await pickStart(el, 'start-characters', 'Ada');
    await pickStart(el, 'start-characters', 'Bob');
    await pickStart(el, 'start-characters', 'Ada');
    expect(keys()).toEqual([`character:${table.record('bob').id}`]);
    expect(tokens()).toEqual([['Bob', '0', '0']]);
  });

  it('starts with the shown cells', async () => {
    await pickStart(el, 'start-characters', 'Ada');
    await pickStart(el, 'start-characters', 'Bob');
    await pickStart(el, 'start-npcs', 'Goblin');
    await click(el.querySelector('[data-action="start"]'));

    const position = (name: string) => table.named(table.gm, name).position;
    expect(position('Ada')).toEqual({ x: 0, y: 0 });
    expect(position('Bob')).toEqual({ x: 0, y: 1 });
    expect(position('Goblin')).toEqual({ x: 9, y: 0 });
    expect(table.named(table.ada, 'Goblin').position).toEqual({ x: 9, y: 0 });
  });
});

describe('CombatGmPanelComponent start form without a grid', () => {
  it('has no setup grid and starts without positions', async () => {
    const table = await combatTable('free');
    const mounted = await mount(HostComponent, table.gm);
    const el = mounted.el;
    await pickStart(el, 'start-characters', 'Ada');
    expect(el.querySelector('[data-testid="setup-grid"]')).toBeNull();
    expect(el.querySelector('[data-testid="place-hint"]')).toBeNull();
    await click(el.querySelector('[data-action="start"]'));
    expect(table.named(table.gm, 'Ada').position).toBeUndefined();
    mounted.destroy();
    table.destroy();
  });
});
