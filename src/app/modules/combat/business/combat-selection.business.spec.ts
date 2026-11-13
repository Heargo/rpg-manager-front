import { combatTable } from '../../../../testing/combat-table';
import { settle } from '../../../../testing/game-device';
import { CombatSelectionBusiness } from './combat-selection.business';

/**
 * Contract: `CombatSelectionBusiness` (root) holds the combatant the GM picked on this device: `$selectedId()` (null at first),
 * `toggle(id)` (picks it, or unpicks it when it already is the pick), `clear()`, and it clears itself when the encounter ends.
 */
describe('CombatSelectionBusiness', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let selection: CombatSelectionBusiness;

  beforeEach(async () => {
    table = await combatTable('free');
    selection = table.gm.injector.get(CombatSelectionBusiness);
  });
  afterEach(() => table.destroy());

  it('starts with nobody selected', () => {
    expect(selection.$selectedId()).toBeNull();
  });

  it('selects a combatant on toggle', () => {
    selection.toggle('c1');
    expect(selection.$selectedId()).toBe('c1');
  });

  it('moves the selection to another combatant on toggle', () => {
    selection.toggle('c1');
    selection.toggle('c2');
    expect(selection.$selectedId()).toBe('c2');
  });

  it('unselects the combatant toggled twice', () => {
    selection.toggle('c1');
    selection.toggle('c1');
    expect(selection.$selectedId()).toBeNull();
  });

  it('clears the selection', () => {
    selection.toggle('c1');
    selection.clear();
    expect(selection.$selectedId()).toBeNull();
  });

  it('clears itself when the encounter ends', async () => {
    await table.start();
    selection.toggle(table.named(table.gm, 'Goblin').id);
    expect(selection.$selectedId()).not.toBeNull();

    await table.combat(table.gm).end({ xp: [] });
    await settle();

    expect(selection.$selectedId()).toBeNull();
  });
});
