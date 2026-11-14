import {
  combatTable,
  click,
  Device,
  mount,
} from '../../../../../testing/combat-table';
import { settle } from '../../../../../testing/game-device';
import { CharacterBusiness } from '../../../character/business/character.business';
import { SkillCatalogueBusiness } from '../../../skill/business/skill-catalogue.business';
import { WorldSessionBusiness } from '../../../world/business/world-session.business';
import { CombatGridComponent } from './combat-grid.component';

/**
 * Contract: `app-combat-grid` (components/combat-grid/combat-grid.component.ts) shows the encounter on the world's grid. Inputs: `combatantId`
 * (optional: the player's own combatant; absent on the GM's device, where every token can be moved) and `skillId` (optional: the skill being
 * targeted, whose `range` is highlighted around the caster, the active combatant). Output `targetPicked` emits a combatant id.
 * - Nothing is rendered (no `[data-testid="grid"]`) while the world's grid is off.
 * - `[data-testid="grid"]` (`data-columns`, `data-rows`) holds one `[data-testid="cell"]` per cell (`data-x`, `data-y`) and one `[data-testid="token"]` per
 *   combatant (`data-name`, `data-x`, `data-y`, `data-enemy="true"` on enemies only). Combatants without a position are placed first (party left, enemies right).
 * - `[data-testid="grid-map"]` (`data-image-id`) only when the world's grid has a map image.
 * - Movement: on the active combatant's turn, `[data-reachable="true"]` marks the cells within the world's movement allowance of the token's
 *   current cell (not occupied by another token); on a player's device, none once the first movement type has no use left.
 * - `[data-testid="token"]` has the class `movable` when it can be dragged: a player's own token, only on their turn; any token on the GM's device.
 * - `moveTo(combatantId, { x, y })` (what a token drag calls): a player's own token goes through `combat/move` (the host enforces turn and reach),
 *   another token is ignored; the GM moves any.
 * - Targeting (`skillId` set, the skill has a `range`): `[data-in-range="true"]` on the cells and tokens within range of the caster. A click on a token, or on
 *   a cell holding a token, emits `targetPicked` with that combatant's id (range is not enforced); a click on an empty cell emits nothing.
 * Fixture: grid 10x10, movement "6". Ada, Bob (party) and Goblin (enemy) start at (0,0), (0,1) and (9,0).
 */
describe('CombatGridComponent', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;
  let mounted: Awaited<ReturnType<typeof mount<CombatGridComponent>>>;
  let el: HTMLElement;
  let boltId: string;

  const setGrid = (grid: {
    enabled: boolean;
    columns: number;
    rows: number;
    imageId?: string;
  }) =>
    table.gm.injector.get(WorldSessionBusiness).update((w) => ({
      ...w,
      combat: { ...w.combat, grid },
    }));

  beforeEach(async () => {
    table = await combatTable('free');
    await setGrid({ enabled: true, columns: 10, rows: 10 });
    boltId = (
      await table.gm.injector.get(SkillCatalogueBusiness).save({
        name: 'Bolt',
        description: '',
        rarity: 'common',
        type: 'active',
        maxLevel: 1,
        pointCost: 1,
        target: 'one-enemy',
        range: 2,
        roll: { count: 1, faces: 1 },
        effects: [{ kind: 'damage', attribute: 'Life', amount: '1' }],
      })
    ).id;
    await table.gm.injector.get(CharacterBusiness).act(table.record('ada').id, {
      kind: 'set-skill',
      skillId: boltId,
      level: 1,
    });
    await table.start();
  });
  afterEach(() => {
    mounted?.destroy();
    table.destroy();
  });

  const open = async (device: Device, inputs: Record<string, unknown> = {}) => {
    mounted = await mount(CombatGridComponent, device, inputs);
    el = mounted.el;
  };
  const token = (name: string) =>
    el.querySelector<HTMLElement>(
      `[data-testid="token"][data-name="${name}"]`,
    )!;
  const cell = (x: number, y: number) =>
    el.querySelector<HTMLElement>(
      `[data-testid="cell"][data-x="${x}"][data-y="${y}"]`,
    )!;
  const at = (name: string) => [
    token(name).dataset['x'],
    token(name).dataset['y'],
  ];
  const position = (name: string) => table.named(table.gm, name).position;
  const own = (name: string) => ({
    combatantId: table.named(table.gm, name).id,
  });

  it('shows nothing while the grid is off', async () => {
    await setGrid({ enabled: false, columns: 10, rows: 10 });
    await settle();
    await open(table.gm);

    expect(el.querySelector('[data-testid="grid"]')).toBeNull();
  });

  it('shows the grid with a cell per square and a token per combatant at its default place', async () => {
    await open(table.gm);

    const grid = el.querySelector<HTMLElement>('[data-testid="grid"]')!;
    expect(grid.dataset['columns']).toBe('10');
    expect(grid.dataset['rows']).toBe('10');
    expect(el.querySelectorAll('[data-testid="cell"]')).toHaveLength(100);
    expect(el.querySelectorAll('[data-testid="token"]')).toHaveLength(3);
    expect(at('Ada')).toEqual(['0', '0']);
    expect(at('Bob')).toEqual(['0', '1']);
    expect(at('Goblin')).toEqual(['9', '0']);
  });

  it('rings the enemy tokens only', async () => {
    await open(table.gm);

    expect(token('Goblin').dataset['enemy']).toBe('true');
    expect(token('Ada').dataset['enemy']).toBeUndefined();
  });

  it('shows the same grid on a player device', async () => {
    await open(table.ada, own('Ada'));

    expect(el.querySelectorAll('[data-testid="cell"]')).toHaveLength(100);
    expect(at('Goblin')).toEqual(['9', '0']);
  });

  it('shows the map image only when the grid has one', async () => {
    await open(table.gm);
    expect(el.querySelector('[data-testid="grid-map"]')).toBeNull();
    mounted.destroy();

    await setGrid({ enabled: true, columns: 10, rows: 10, imageId: 'map-1' });
    await settle();
    await open(table.gm);
    expect(
      el.querySelector<HTMLElement>('[data-testid="grid-map"]')!.dataset[
        'imageId'
      ],
    ).toBe('map-1');
  });

  describe('moving tokens', () => {
    it('lets a player move their own token', async () => {
      await open(table.ada, own('Ada'));

      await mounted.ref.instance.moveTo(table.named(table.ada, 'Ada').id, {
        x: 2,
        y: 2,
      });
      await settle();

      expect(position('Ada')).toEqual({ x: 2, y: 2 });
      expect(at('Ada')).toEqual(['2', '2']);
    });

    it("ignores a player moving someone else's token", async () => {
      await open(table.ada, own('Ada'));

      await mounted.ref.instance.moveTo(table.named(table.ada, 'Bob').id, {
        x: 5,
        y: 5,
      });
      await mounted.ref.instance.moveTo(table.named(table.ada, 'Goblin').id, {
        x: 5,
        y: 6,
      });
      await settle();

      expect(position('Bob')).toEqual({ x: 0, y: 1 });
      expect(position('Goblin')).toEqual({ x: 9, y: 0 });
    });

    it('lets the GM move any token', async () => {
      await open(table.gm);

      await mounted.ref.instance.moveTo(table.named(table.gm, 'Goblin').id, {
        x: 4,
        y: 4,
      });
      await mounted.ref.instance.moveTo(table.named(table.gm, 'Bob').id, {
        x: 1,
        y: 5,
      });
      await settle();

      expect(position('Goblin')).toEqual({ x: 4, y: 4 });
      expect(position('Bob')).toEqual({ x: 1, y: 5 });
      expect(at('Goblin')).toEqual(['4', '4']);
    });
  });

  describe('movement allowance', () => {
    const reachable = (x: number, y: number) =>
      cell(x, y).dataset['reachable'] === 'true';

    it("highlights the cells within the allowance of the active combatant's cell, not the occupied ones", async () => {
      await open(table.ada, own('Ada'));

      expect(reachable(0, 0)).toBe(true);
      expect(reachable(6, 6)).toBe(true);
      expect(reachable(6, 0)).toBe(true);
      expect(reachable(7, 0)).toBe(false);
      expect(reachable(0, 7)).toBe(false);
      expect(reachable(0, 1)).toBe(false);
      expect(el.querySelectorAll('[data-reachable="true"]')).toHaveLength(48);
    });

    it('highlights nothing for a player whose turn it is not', async () => {
      await open(table.bob, own('Bob'));

      expect(el.querySelectorAll('[data-reachable="true"]')).toHaveLength(0);
    });

    it('counts from the current position, not from where the turn began', async () => {
      await open(table.ada, own('Ada'));
      await table
        .combat(table.gm)
        .move(table.named(table.gm, 'Ada').id, { x: 3, y: 3 });
      await settle();

      expect(reachable(9, 9)).toBe(true);
      expect(reachable(9, 3)).toBe(true);
      expect(reachable(0, 0)).toBe(true);
      expect(reachable(3, 3)).toBe(true);
      expect(reachable(3, 9)).toBe(true);
    });

    it('labels every reachable cell with a title', async () => {
      await open(table.ada, own('Ada'));

      expect(cell(6, 6).title).toBe('Can move here');
      expect(cell(0, 0).title).toBe('Can move here');
      expect(cell(7, 0).title).toBe('');
    });

    it('shows a legend while reachable cells exist, and hides it otherwise', async () => {
      await open(table.ada, own('Ada'));
      const legend = el.querySelector('[data-testid="reach-legend"]');
      expect(legend?.textContent).toContain('Can move here');

      await mounted.ref.instance.moveTo(table.named(table.ada, 'Ada').id, {
        x: 3,
        y: 3,
      });
      await settle();

      expect(el.querySelector('[data-testid="reach-legend"]')).toBeNull();
    });

    it('shows no reachable cell once the player has no movement left', async () => {
      await open(table.ada, own('Ada'));
      expect(
        el.querySelectorAll('[data-reachable="true"]').length,
      ).toBeGreaterThan(0);

      await mounted.ref.instance.moveTo(table.named(table.ada, 'Ada').id, {
        x: 3,
        y: 3,
      });
      await settle();

      expect(el.querySelectorAll('[data-reachable="true"]')).toHaveLength(0);
    });
  });

  describe('who can drag', () => {
    const movable = (name: string) => token(name).classList.contains('movable');

    it('lets a player drag only their own token, and only on their turn', async () => {
      await open(table.bob, own('Bob'));
      expect(movable('Bob')).toBe(false);
      expect(movable('Ada')).toBe(false);
      mounted.destroy();

      await open(table.ada, own('Ada'));
      expect(movable('Ada')).toBe(true);
      expect(movable('Bob')).toBe(false);
      expect(movable('Goblin')).toBe(false);

      await table.combat(table.gm).endTurn();
      await settle();
      expect(movable('Ada')).toBe(false);
      mounted.destroy();

      await open(table.bob, own('Bob'));
      expect(movable('Bob')).toBe(true);
    });

    it('lets the GM drag every token at any time', async () => {
      await open(table.gm);
      for (const name of ['Ada', 'Bob', 'Goblin'])
        expect(movable(name)).toBe(true);

      await table.combat(table.gm).endTurn();
      await settle();
      for (const name of ['Ada', 'Bob', 'Goblin'])
        expect(movable(name)).toBe(true);
    });

    it('does not move a player token off turn', async () => {
      await open(table.bob, own('Bob'));

      await mounted.ref.instance.moveTo(table.named(table.bob, 'Bob').id, {
        x: 1,
        y: 2,
      });
      await settle();

      expect(position('Bob')).toEqual({ x: 0, y: 1 });
    });
  });

  describe('targeting a skill with a range', () => {
    let picked: string[];
    const inRange = (x: number, y: number) =>
      cell(x, y).dataset['inRange'] === 'true';
    const tokenInRange = (name: string) =>
      token(name).dataset['inRange'] === 'true';
    const openTargeting = async () => {
      await open(table.gm, { skillId: boltId });
      picked = [];
      mounted.ref.instance.targetPicked.subscribe((id: string) =>
        picked.push(id),
      );
    };

    beforeEach(async () => {
      await table
        .combat(table.gm)
        .move(table.named(table.gm, 'Goblin').id, { x: 2, y: 0 });
      await settle();
    });

    it("highlights the cells and tokens within the skill's range of the caster", async () => {
      await openTargeting();

      expect(inRange(2, 2)).toBe(true);
      expect(inRange(2, 0)).toBe(true);
      expect(inRange(3, 0)).toBe(false);
      expect(tokenInRange('Goblin')).toBe(true);
      expect(tokenInRange('Bob')).toBe(true);
    });

    it('does not highlight a token beyond the range', async () => {
      await table
        .combat(table.gm)
        .move(table.named(table.gm, 'Goblin').id, { x: 5, y: 0 });
      await settle();
      await openTargeting();

      expect(tokenInRange('Goblin')).toBe(false);
      expect(
        el.querySelectorAll('[data-in-range="true"]').length,
      ).toBeGreaterThan(0);
    });

    it('highlights nothing when no skill is being targeted', async () => {
      await open(table.gm);

      expect(el.querySelectorAll('[data-in-range="true"]')).toHaveLength(0);
    });

    it('targets a combatant by clicking its token', async () => {
      await openTargeting();

      await click(token('Goblin'));

      expect(picked).toEqual([table.named(table.gm, 'Goblin').id]);
    });

    it('targets a combatant by clicking its cell, and ignores an empty cell', async () => {
      await openTargeting();

      await click(cell(2, 0));
      await click(cell(5, 5));

      expect(picked).toEqual([table.named(table.gm, 'Goblin').id]);
    });

    it('still lets a target out of range be picked', async () => {
      await table
        .combat(table.gm)
        .move(table.named(table.gm, 'Goblin').id, { x: 8, y: 8 });
      await settle();
      await openTargeting();

      await click(token('Goblin'));

      expect(picked).toEqual([table.named(table.gm, 'Goblin').id]);
    });
  });
});
