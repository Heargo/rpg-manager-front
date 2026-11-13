import {
  cellDistance,
  combatantsInRange,
  occupiedCells,
  placeUnplaced,
  reachableCells,
  cellsInRange,
  canMoveTo,
} from './combat-grid.rules';

/**
 * Contract of `combat-grid.rules.ts` (pure). A cell is `{ x, y }`, 0-based, a grid is `{ columns, rows }`. Distance is Chebyshev (a diagonal step is 1).
 * - `cellDistance(a, b)`.
 * - `reachableCells(start, allowance, grid, occupied)`: in-bounds cells within `allowance` of `start` (start included) that are not in `occupied`.
 * - `cellsInRange(origin, range, grid)`: in-bounds cells within `range` of `origin` (origin included), occupied or not.
 * - `combatantsInRange(casterId, range, combatants)`: ids of the other positioned combatants within `range` of the caster.
 * - `occupiedCells(combatants)`: the positions of the positioned combatants.
 * - `placeUnplaced(combatants, grid)`: the combatants, those without a position given the first free cell: party/ally column by column from the
 *   left edge (top to bottom), enemies column by column from the right edge (top to bottom). Placed combatants keep their cell.
 */
const grid = { columns: 10, rows: 10 };
const key = (cells: { x: number; y: number }[]) =>
  cells.map((c) => `${c.x},${c.y}`).sort();

describe('cellDistance', () => {
  it('counts a diagonal step as one cell', () => {
    expect(cellDistance({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(3);
    expect(cellDistance({ x: 0, y: 0 }, { x: 3, y: 1 })).toBe(3);
    expect(cellDistance({ x: 4, y: 4 }, { x: 4, y: 4 })).toBe(0);
    expect(cellDistance({ x: 5, y: 2 }, { x: 2, y: 4 })).toBe(3);
  });
});

describe('reachableCells', () => {
  it('lists the cells within the allowance, start included, kept inside the grid', () => {
    const cells = reachableCells({ x: 0, y: 0 }, 1, grid, []);
    expect(key(cells)).toEqual(['0,0', '0,1', '1,0', '1,1']);
  });

  it('leaves out the occupied cells', () => {
    const cells = reachableCells({ x: 0, y: 0 }, 1, grid, [
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);
    expect(key(cells)).toEqual(['0,0', '1,0']);
  });

  it('is a full square of (2n+1)^2 cells in the open', () => {
    expect(reachableCells({ x: 5, y: 5 }, 2, grid, [])).toHaveLength(25);
  });

  it('reaches nothing beyond the allowance', () => {
    const cells = reachableCells({ x: 0, y: 0 }, 6, grid, []);
    expect(key(cells)).toContain('6,6');
    expect(key(cells)).not.toContain('7,0');
  });
});

describe('cellsInRange', () => {
  it('includes occupied cells and stays in the grid', () => {
    expect(key(cellsInRange({ x: 9, y: 9 }, 2, grid))).toEqual([
      '7,7', '7,8', '7,9', '8,7', '8,8', '8,9', '9,7', '9,8', '9,9',
    ]);
  });
});

describe('combatantsInRange', () => {
  const combatants = [
    { id: 'a', position: { x: 0, y: 0 } },
    { id: 'b', position: { x: 2, y: 1 } },
    { id: 'c', position: { x: 4, y: 0 } },
    { id: 'd' },
  ];

  it('lists the other positioned combatants within the range', () => {
    expect(combatantsInRange('a', 2, combatants)).toEqual(['b']);
    expect(combatantsInRange('a', 4, combatants).sort()).toEqual(['b', 'c']);
  });

  it('is empty when the caster has no position', () => {
    expect(combatantsInRange('d', 9, combatants)).toEqual([]);
  });
});

describe('occupiedCells', () => {
  it('lists the positions of the placed combatants only', () => {
    expect(
      occupiedCells([{ position: { x: 1, y: 2 } }, {}, { position: { x: 0, y: 0 } }]),
    ).toEqual([
      { x: 1, y: 2 },
      { x: 0, y: 0 },
    ]);
  });
});

describe('placeUnplaced', () => {
  const who = (id: string, side: 'party' | 'ally' | 'enemy', position?: { x: number; y: number }) => ({
    id,
    side,
    ...(position ? { position } : {}),
  });

  it('puts party and allies from the left edge and enemies from the right edge', () => {
    const placed = placeUnplaced(
      [who('ada', 'party'), who('bob', 'ally'), who('gob', 'enemy'), who('orc', 'enemy')],
      grid,
    );
    expect(placed.map((c) => c.position)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 9, y: 0 },
      { x: 9, y: 1 },
    ]);
  });

  it('keeps the cells already taken and skips them', () => {
    const placed = placeUnplaced(
      [who('ada', 'party', { x: 0, y: 0 }), who('bob', 'party'), who('gob', 'enemy', { x: 9, y: 0 })],
      grid,
    );
    expect(placed[0].position).toEqual({ x: 0, y: 0 });
    expect(placed[1].position).toEqual({ x: 0, y: 1 });
    expect(placed[2].position).toEqual({ x: 9, y: 0 });
  });

  it('moves on to the next column once an edge column is full', () => {
    const small = { columns: 4, rows: 2 };
    const placed = placeUnplaced(
      [who('a', 'party'), who('b', 'party'), who('c', 'party'), who('e', 'enemy'), who('f', 'enemy'), who('g', 'enemy')],
      small,
    );
    expect(placed.map((c) => c.position)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 1 },
      { x: 2, y: 0 },
    ]);
  });
});

/**
 * `canMoveTo(enc, rules, id, cell)`: `enc` is the encounter (`combatants` with `id`, `position`, `level`, `attributes`, `actions` counters
 * `{ name, count, used, movement }`), `rules` the world's `CombatRules` (`movement` formula, `grid`, `steps.actionCounters`). Returns
 * `{ ok: true, tickAction? }` or `{ ok: false, error: 'outOfReach' | 'noMovementLeft' }`.
 */
describe('canMoveTo', () => {
  const rules = (actionCounters = true) =>
    ({ movement: '2', grid: { enabled: true, ...grid }, steps: { actionCounters } }) as never;
  const combatant = (id: string, position: { x: number; y: number }, actions: { name: string; count: number; used: number; movement: boolean }[]) => ({
    id,
    position,
    level: 1,
    attributes: [],
    actions,
  });
  const walk = (used: number) => [
    { name: 'Action', count: 1, used: 0, movement: false },
    { name: 'Walk', count: 1, used, movement: true },
    { name: 'Run', count: 1, used: 0, movement: true },
  ];
  const enc = (actions = walk(0)) =>
    ({
      combatants: [combatant('a', { x: 3, y: 3 }, actions), combatant('b', { x: 4, y: 3 }, [])],
    }) as never;

  it('accepts a reachable cell and names the first movement type to tick', () => {
    expect(canMoveTo(enc(), rules(), 'a', { x: 5, y: 5 })).toEqual({ ok: true, tickAction: 'Walk' });
  });

  it('counts the reach from the current position', () => {
    expect(canMoveTo(enc(), rules(), 'a', { x: 6, y: 3 })).toEqual({ ok: false, error: 'outOfReach' });
    expect(canMoveTo(enc(), rules(), 'a', { x: 1, y: 1 })).toEqual({ ok: true, tickAction: 'Walk' });
  });

  it('refuses a cell held by another combatant', () => {
    expect(canMoveTo(enc(), rules(), 'a', { x: 4, y: 3 })).toEqual({ ok: false, error: 'outOfReach' });
  });

  it('refuses when the first movement type has no use left, even if a later one has', () => {
    expect(canMoveTo(enc(walk(1)), rules(), 'a', { x: 5, y: 5 })).toEqual({ ok: false, error: 'noMovementLeft' });
  });

  it('checks only the reach when the combatant has no movement type', () => {
    const plainActions = [{ name: 'Action', count: 1, used: 1, movement: false }];
    expect(canMoveTo(enc(plainActions), rules(), 'a', { x: 5, y: 5 })).toEqual({ ok: true });
    expect(canMoveTo(enc(plainActions), rules(), 'a', { x: 9, y: 9 })).toEqual({ ok: false, error: 'outOfReach' });
  });

  it('checks only the reach when the action counters are off', () => {
    expect(canMoveTo(enc(walk(1)), rules(false), 'a', { x: 5, y: 5 })).toEqual({ ok: true });
  });
});
