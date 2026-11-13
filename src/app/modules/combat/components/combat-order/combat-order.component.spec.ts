import {
  click,
  combatTable,
  mount,
  typeNumber,
} from '../../../../../testing/combat-table';
import { settle } from '../../../../../testing/game-device';
import { CombatOrderComponent } from './combat-order.component';

/**
 * Contract: `app-combat-order` (no inputs) shows the turn order of the running encounter on the GM's device: a round label `[data-field="round"]` and
 * the `[data-testid="combatant"]` rows in turn order (`data-name`, `data-active="true"` on the active one, `data-down="true"` when down,
 * `data-selected="true"` on the selected one) with `[data-field="life-bar"]` (`data-percent`), `[data-field="initiative"]`, `[data-field="status"]` (one per status),
 * and `[data-action="select"]` (toggles the selection shared through `CombatSelectionBusiness`). Typed mode adds `[data-testid="initiative-input"]` and
 * `[data-action="initiative-set"]` per row. Drag and drop calls `reorder(ids)`. It holds no actions, no manual edits and no start form.
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

describe('CombatOrderComponent', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<CombatOrderComponent>>>;
  let el: HTMLElement;

  const open = async () => {
    mounted = await mount(CombatOrderComponent, table.gm);
    el = mounted.el;
  };

  beforeEach(async () => {
    table = await combatTable('free');
  });
  afterEach(() => {
    mounted?.destroy();
    table.destroy();
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

  it('removes a status from its chip', async () => {
    await table.start();
    await table.combat(table.gm).edit(table.named(table.gm, 'Goblin').id, {
      kind: 'add-status',
      status: 'Burning',
    });
    await settle();
    await open();

    await click(row(el, 'Goblin').querySelector('.remove-status'));

    expect(table.named(table.ada, 'Goblin').statuses).toEqual([]);
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

  it('selects a row from its select button, and unselects it on a second click', async () => {
    await table.start();
    await open();

    await click(row(el, 'Goblin').querySelector('[data-action="select"]'));
    expect(row(el, 'Goblin').dataset['selected']).toBe('true');
    expect(row(el, 'Ada').dataset['selected']).not.toBe('true');

    await click(row(el, 'Bob').querySelector('[data-action="select"]'));
    expect(row(el, 'Goblin').dataset['selected']).not.toBe('true');
    expect(row(el, 'Bob').dataset['selected']).toBe('true');

    await click(row(el, 'Bob').querySelector('[data-action="select"]'));
    expect(row(el, 'Bob').dataset['selected']).not.toBe('true');
  });

  it('holds no actions, no manual edits and no start form', async () => {
    await table.start();
    await open();
    await click(row(el, 'Goblin').querySelector('[data-action="select"]'));

    expect(el.querySelector('[data-testid="active-row"]')).toBeNull();
    expect(el.querySelector('[role="tab"]')).toBeNull();
    expect(el.querySelector('[data-testid="manual-amount"]')).toBeNull();
    expect(el.querySelector('[data-action="damage"]')).toBeNull();
    expect(el.querySelector('[data-action="next-turn"]')).toBeNull();
    expect(el.querySelector('[data-testid="start-form"]')).toBeNull();
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
});
