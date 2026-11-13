import { evaluateFormula } from '../../../core/helpers/formula';
import { CombatRules } from '../../world/models/world';
import { Combatant } from '../models/combat';

export interface Cell {
  x: number;
  y: number;
}
export interface GridSize {
  columns: number;
  rows: number;
}

/** Distance in cells; a diagonal step counts as one (Chebyshev). */
export const cellDistance = (a: Cell, b: Cell): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

/** The in-bounds cells within `range` of `origin`, origin included. */
export function cellsInRange(
  origin: Cell,
  range: number,
  grid: GridSize,
): Cell[] {
  const cells: Cell[] = [];
  for (
    let x = Math.max(0, origin.x - range);
    x <= Math.min(grid.columns - 1, origin.x + range);
    x++
  )
    for (
      let y = Math.max(0, origin.y - range);
      y <= Math.min(grid.rows - 1, origin.y + range);
      y++
    )
      cells.push({ x, y });
  return cells;
}

/** The cells within the movement allowance of `start` (start included) that no one else holds. */
export function reachableCells(
  start: Cell,
  allowance: number,
  grid: GridSize,
  occupied: Cell[],
): Cell[] {
  return cellsInRange(start, allowance, grid).filter(
    (cell) => !occupied.some((other) => sameCell(other, cell)),
  );
}

/** The ids of the other positioned combatants within `range` of the caster. */
export function combatantsInRange(
  casterId: string,
  range: number,
  combatants: { id: string; position?: Cell }[],
): string[] {
  const caster = combatants.find((c) => c.id === casterId)?.position;
  if (!caster) return [];
  return combatants
    .filter(
      (c) =>
        c.id !== casterId &&
        c.position &&
        cellDistance(caster, c.position) <= range,
    )
    .map((c) => c.id);
}

/** The positions of the placed combatants. */
export const occupiedCells = (combatants: { position?: Cell }[]): Cell[] =>
  combatants.flatMap((c) => (c.position ? [c.position] : []));

/**
 * The combatants with a cell each: those without one take the first free cell, party and allies column by column from the
 * left edge, enemies from the right edge (top to bottom). Placed combatants keep theirs.
 */
export function placeUnplaced<
  T extends { side: 'party' | 'ally' | 'enemy'; position?: Cell },
>(combatants: T[], grid: GridSize): T[] {
  const taken = occupiedCells(combatants);
  return combatants.map((c) => {
    if (c.position) return c;
    for (let i = 0; i < grid.columns; i++) {
      const x = c.side === 'enemy' ? grid.columns - 1 - i : i;
      for (let y = 0; y < grid.rows; y++) {
        const cell = { x, y };
        if (taken.some((other) => sameCell(other, cell))) continue;
        taken.push(cell);
        return { ...c, position: cell };
      }
    }
    return c;
  });
}

/** Cells a combatant can move this turn: the world's formula on its level and attribute maxima (0 when it does not evaluate). */
export function movementAllowance(
  formula: string,
  combatant: { level: number; attributes: { name: string; max: number }[] },
): number {
  const result = evaluateFormula(
    { preset: 'custom', expression: formula },
    {
      level: combatant.level,
      base: 0,
      playerLevel: combatant.level,
      levels: Object.fromEntries(
        combatant.attributes.map((a) => [a.name, a.max]),
      ),
    },
  );
  return result.ok ? Math.max(0, Math.round(result.value)) : 0;
}

export type MoveCheck =
  | { ok: true; tickAction?: string }
  | { ok: false; error: 'outOfReach' | 'noMovementLeft' };

/**
 * Whether a combatant may move to a cell: it must be within its movement allowance of where it stands, on a cell no one else holds. With
 * action counters on and a movement type, the first movement type must have a use left and is the one to tick.
 */
export function canMoveTo(
  enc: { combatants: Combatant[] },
  rules: CombatRules,
  id: string,
  cell: Cell,
): MoveCheck {
  const combatants = placeUnplaced(enc.combatants, rules.grid);
  const mover = combatants.find((c) => c.id === id);
  if (!mover?.position) return { ok: false, error: 'outOfReach' };
  const others = occupiedCells(combatants.filter((c) => c.id !== id));
  const reach = reachableCells(
    mover.position,
    movementAllowance(rules.movement, mover),
    rules.grid,
    others,
  );
  if (!reach.some((other) => sameCell(other, cell)))
    return { ok: false, error: 'outOfReach' };
  const type = rules.steps.actionCounters
    ? mover.actions.find((a) => a.movement)
    : undefined;
  if (!type) return { ok: true };
  if (type.used >= type.count) return { ok: false, error: 'noMovementLeft' };
  return { ok: true, tickAction: type.name };
}
