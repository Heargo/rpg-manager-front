import {
  click,
  combatTable,
  mount,
  pickTarget,
  typeNumber,
} from '../../../../../testing/combat-table';
import { settle } from '../../../../../testing/game-device';
import { CombatGmPanelComponent } from './combat-gm-panel.component';

/**
 * Contract: `app-combat-gm-panel` (no inputs) runs on the GM's device (host) against the real `CombatBusiness`. Elements are found by
 * `data-testid` / `data-action`; buttons are clicked, p-inputNumber fields are typed into (their wrapper carries the testid).
 *
 * - No encounter: `[data-testid="start-form"]` with one `[data-testid="start-character"]` per world character (`data-name`, toggled by clicking its
 *   `[data-action="toggle-character"]`), one `[data-testid="start-npc"]` per catalogue NPC (`data-name`, `[data-action="npc-plus"]` adds one to the count,
 *   `[data-action="npc-minus"]` removes one, `[data-field="npc-count"]` shows it) and `[data-action="start"]`.
 * - Encounter: `[data-testid="combatant"]` rows in turn order (`data-name`, `data-active="true"` on the active one, `data-down="true"` when down) with
 *   `[data-field="life-bar"]` (`data-percent`), `[data-field="initiative"]`, `[data-field="status"]` (one per status), and a round label `[data-field="round"]`.
 * - The active row also carries `[data-testid="active-row"]`: `[role="tab"]` per action type labelled `Name (left/count)` (click `[data-action="tick"]` to use one), `[data-testid="skill"]` (`data-name`, `data-available="false"` when on cooldown or unaffordable; text = the preview
 *   "5 damage, 3 Mana, cooldown 2"; `[data-action="use-skill"]`) and `[data-testid="item"]` (`data-name`, `[data-action="use-item"]`).
 * - Targeting: after `use-skill`, `[data-testid="targets"]` multi-select (click opens it, the options `[data-testid="target"]` with `data-name` are in the document, see `pickTarget`) and `[data-action="confirm-skill"]`.
 * - `[data-testid="pending"]` per pending result (text names the caster, the skill and the target) with `[data-action="apply"]`, `[data-action="dismiss"]`,
 *   `[data-action="edit"]` (shows `[data-testid="edit-amount"]`, a number input, and `[data-action="apply-edited"]`).
 * - Any row: `[data-action="select"]` expands it, showing `[data-testid="manual-amount"]` (number), `[data-action="damage"]`, `[data-action="heal"]`,
 *   `[data-testid="manual-status"]` (text input), `[data-action="add-status"]`.
 * - `[data-action="initiative-set"]` inside a row, with `[data-testid="initiative-input"]` (number) in the row, sets that combatant's initiative.
 * - Toolbar: `[data-action="next-turn"]`, `[data-action="undo"]`, `[data-action="end"]`. The component method `reorder(ids)` is what a drag drop calls.
 * - End dialog (rendered anywhere in the document): `[data-testid="end-dialog"]` with `[data-testid="reward-xp"]` per character (`data-name`, number input,
 *   proposed value), `[data-field="reward-money"]`, `[data-testid="reward-loot"]` per item, `[data-action="confirm-end"]`.
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
  let mounted: Awaited<ReturnType<typeof mount<CombatGmPanelComponent>>>;
  let el: HTMLElement;

  const open = async () => {
    mounted = await mount(CombatGmPanelComponent, table.gm);
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

    await click(
      el.querySelector(
        '[data-testid="start-character"][data-name="Ada"] [data-action="toggle-character"]',
      ),
    );
    await click(
      el.querySelector(
        '[data-testid="start-character"][data-name="Bob"] [data-action="toggle-character"]',
      ),
    );
    const goblin = '[data-testid="start-npc"][data-name="Goblin"]';
    await click(el.querySelector(`${goblin} [data-action="npc-plus"]`));
    await click(el.querySelector(`${goblin} [data-action="npc-plus"]`));
    expect(clean(el.querySelector(`${goblin} [data-field="npc-count"]`))).toBe(
      '2',
    );
    await click(el.querySelector('[data-action="start"]'));

    expect(names(el)).toEqual(['Ada', 'Bob', 'Goblin 1', 'Goblin 2']);
    expect(table.state(table.ada).combatants).toHaveLength(4);
    expect(el.querySelector('[data-testid="start-form"]')).toBeNull();
  });

  it('shows the turn order with the active row, life bar, initiative, statuses and round', async () => {
    table.destroy();
    table = await combatTable('typed');
    await table.start();
    await table
      .combat(table.gm)
      .initiative(table.named(table.gm, 'Bob').id, 12);
    await table.combat(table.gm).edit(table.named(table.gm, 'Goblin').id, {
      kind: 'add-status',
      status: 'Burning',
    });
    await table.combat(table.gm).edit(table.named(table.gm, 'Goblin').id, {
      kind: 'damage',
      amount: 4,
    });
    await settle();
    await open();

    expect(names(el)).toEqual(['Bob', 'Ada', 'Goblin']);
    expect(row(el, 'Ada').dataset['active']).toBe('true');
    expect(row(el, 'Bob').dataset['active']).not.toBe('true');
    expect(
      clean(row(el, 'Bob').querySelector('[data-field="initiative"]')),
    ).toContain('12');
    expect(
      row(el, 'Goblin')
        .querySelector('[data-field="life-bar"]')!
        .getAttribute('data-percent'),
    ).toBe('60');
    expect(
      clean(row(el, 'Goblin').querySelector('[data-field="status"]')),
    ).toContain('Burning');
    expect(clean(el.querySelector('[data-field="round"]'))).toContain('1');
  });

  it('types an initiative for a combatant', async () => {
    table.destroy();
    table = await combatTable('typed');
    await table.start();
    await open();
    const goblin = row(el, 'Goblin');

    await typeNumber(
      goblin.querySelector('[data-testid="initiative-input"]')!,
      30,
    );
    await click(goblin.querySelector('[data-action="initiative-set"]'));

    expect(table.named(table.ada, 'Goblin').initiative).toBe(30);
    expect(names(el)[0]).toBe('Goblin');
  });

  it('reorders the turn order by hand', async () => {
    await table.start();
    await open();
    const ids = ['Goblin', 'Bob', 'Ada'].map(
      (n) => table.named(table.gm, n).id,
    );

    mounted.ref.instance.reorder(ids);
    await settle();

    expect(table.state(table.bob).combatants.map((c) => c.name)).toEqual([
      'Goblin',
      'Bob',
      'Ada',
    ]);
    expect(names(el)).toEqual(['Goblin', 'Bob', 'Ada']);
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
    const cast = async () => {
      await click(
        el.querySelector('[data-testid="skill"] [data-action="use-skill"]'),
      );
      await pickTarget(el, 'Goblin');
      await click(el.querySelector('[data-action="confirm-skill"]'));
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

  it('applies damage, heal and a status by hand to any combatant', async () => {
    await table.start();
    await open();
    await click(row(el, 'Goblin').querySelector('[data-action="select"]'));
    const goblin = row(el, 'Goblin');

    await typeNumber(goblin.querySelector('[data-testid="manual-amount"]')!, 6);
    await click(goblin.querySelector('[data-action="damage"]'));
    expect(table.named(table.gm, 'Goblin').life?.current).toBe(4);

    await typeNumber(
      row(el, 'Goblin').querySelector('[data-testid="manual-amount"]')!,
      2,
    );
    await click(row(el, 'Goblin').querySelector('[data-action="heal"]'));
    expect(table.named(table.gm, 'Goblin').life?.current).toBe(6);

    const status = row(el, 'Goblin').querySelector(
      '[data-testid="manual-status"]',
    )!;
    const input = (
      status.tagName === 'INPUT' ? status : status.querySelector('input')!
    ) as HTMLInputElement;
    input.value = 'Stunned';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await click(row(el, 'Goblin').querySelector('[data-action="add-status"]'));
    expect(table.named(table.ada, 'Goblin').statuses).toEqual(['Stunned']);
  });

  it('marks a combatant at 0 life as down', async () => {
    await table.start();
    await table.combat(table.gm).edit(table.named(table.gm, 'Goblin').id, {
      kind: 'damage',
      amount: 10,
    });
    await open();

    expect(row(el, 'Goblin').dataset['down']).toBe('true');
    expect(row(el, 'Ada').dataset['down']).not.toBe('true');
  });

  it('undoes the last change and goes to the next turn', async () => {
    await table.start();
    await open();
    await click(row(el, 'Goblin').querySelector('[data-action="select"]'));
    await typeNumber(
      row(el, 'Goblin').querySelector('[data-testid="manual-amount"]')!,
      6,
    );
    await click(row(el, 'Goblin').querySelector('[data-action="damage"]'));
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

  describe('initiative input by mode', () => {
    const inputs = () => ({
      input: el.querySelector('[data-testid="initiative-input"]'),
      set: el.querySelector('[data-action="initiative-set"]'),
      value: el.querySelector('[data-field="initiative"]'),
    });
    const base = {
      initiative: true,
      actionCounters: true,
      gmValidation: true,
      defence: true,
      rewards: true,
    };

    it('shows the initiative input and set button on every row in typed mode', async () => {
      table.destroy();
      table = await combatTable('typed');
      await table.start();
      await open();

      expect(
        el.querySelectorAll('[data-testid="initiative-input"]'),
      ).toHaveLength(3);
      expect(
        el.querySelectorAll('[data-action="initiative-set"]'),
      ).toHaveLength(3);
    });

    it('shows the rolled value but no input in rolled mode', async () => {
      table.destroy();
      table = await combatTable('rolled');
      await table.start();
      await open();

      const { input, set, value } = inputs();
      expect(input).toBeNull();
      expect(set).toBeNull();
      expect(value).not.toBeNull();
    });

    it('shows neither value nor input in free mode', async () => {
      await table.start();
      await open();

      const { input, set, value } = inputs();
      expect(input).toBeNull();
      expect(set).toBeNull();
      expect(value).toBeNull();
    });

    it('shows neither value nor input when the initiative step is off, even in typed mode', async () => {
      table.destroy();
      table = await combatTable('typed', {
        steps: { ...base, initiative: false },
      });
      await table.start();
      await open();

      const { input, set, value } = inputs();
      expect(input).toBeNull();
      expect(set).toBeNull();
      expect(value).toBeNull();
    });
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
