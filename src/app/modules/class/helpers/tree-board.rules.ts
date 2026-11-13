import { TreeNode } from '../models/class';
import { ClassIssue } from './class.rules';

export interface BoardCell {
  column: number;
  row: number;
}

const MIN_COLUMNS = 4;
const MIN_ROWS = 3;

const sameCell = (node: TreeNode, cell: BoardCell): boolean =>
  node.column === cell.column && node.row === cell.row;

/** Adds a node (no prerequisite, min level 1) at a free cell; refused when the cell is taken or the skill is in the tree. */
export function addNodeAt(
  tree: TreeNode[],
  skillId: string,
  cell: BoardCell,
): TreeNode[] {
  if (tree.some((node) => node.skillId === skillId || sameCell(node, cell)))
    return tree;
  return [
    ...tree,
    { skillId, requires: [], minLevel: 1, column: cell.column, row: cell.row },
  ];
}

/** Moves a node to a cell; the node already there takes its former cell. */
export function moveNode(
  tree: TreeNode[],
  skillId: string,
  cell: BoardCell,
): TreeNode[] {
  const moved = tree.find((node) => node.skillId === skillId);
  if (!moved || sameCell(moved, cell)) return tree;
  const from = { column: moved.column, row: moved.row };
  return tree.map((node) => {
    if (node.skillId === skillId) return { ...node, ...cell };
    return sameCell(node, cell) ? { ...node, ...from } : node;
  });
}

/** Makes `prerequisiteId` a prerequisite (level 1) of `skillId`; refused for itself, a duplicate or a cycle. */
export function linkPrerequisite(
  tree: TreeNode[],
  prerequisiteId: string,
  skillId: string,
): TreeNode[] {
  const target = tree.find((node) => node.skillId === skillId);
  const source = tree.find((node) => node.skillId === prerequisiteId);
  if (!target || !source || prerequisiteId === skillId) return tree;
  if (target.requires.some((r) => r.skillId === prerequisiteId)) return tree;
  if (dependsOn(tree, prerequisiteId, skillId)) return tree;
  return tree.map((node) =>
    node.skillId === skillId
      ? {
          ...node,
          requires: [...node.requires, { skillId: prerequisiteId, level: 1 }],
        }
      : node,
  );
}

/** True when `from` needs `target`, directly or through other prerequisites. */
function dependsOn(tree: TreeNode[], from: string, target: string): boolean {
  const seen = new Set<string>();
  const visit = (id: string): boolean => {
    if (id === target) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    const node = tree.find((entry) => entry.skillId === id);
    return node?.requires.some((r) => visit(r.skillId)) ?? false;
  };
  return visit(from);
}

export function unlinkPrerequisite(
  tree: TreeNode[],
  prerequisiteId: string,
  skillId: string,
): TreeNode[] {
  return tree.map((node) =>
    node.skillId === skillId
      ? {
          ...node,
          requires: node.requires.filter((r) => r.skillId !== prerequisiteId),
        }
      : node,
  );
}

/** Removes the node and the prerequisites that point to it. */
export function removeNode(tree: TreeNode[], skillId: string): TreeNode[] {
  return tree
    .filter((node) => node.skillId !== skillId)
    .map((node) => ({
      ...node,
      requires: node.requires.filter((r) => r.skillId !== skillId),
    }));
}

/** The board's size: at least 4 by 3, and one free column and row beyond the farthest node. */
export function boardSize(tree: TreeNode[]): { columns: number; rows: number } {
  return {
    columns: Math.max(MIN_COLUMNS, ...tree.map((node) => node.column + 2)),
    rows: Math.max(MIN_ROWS, ...tree.map((node) => node.row + 2)),
  };
}

/** The cell under a pointer offset (from the board's top-left corner). */
export function cellAt(
  offset: { x: number; y: number },
  cellSize: { width: number; height: number },
): BoardCell {
  return {
    column: Math.max(0, Math.floor(offset.x / cellSize.width)),
    row: Math.max(0, Math.floor(offset.y / cellSize.height)),
  };
}

/** The nodes and links (`"prerequisite>node"`) the validation issues are about, to highlight on the board. */
export function involvedInIssues(
  tree: TreeNode[],
  issues: ClassIssue[],
): { nodes: Set<string>; links: Set<string> } {
  const nodes = new Set<string>();
  const links = new Set<string>();
  for (const issue of issues) {
    const match = /^tree\.(\d+)(?:\.requires\.(\d+))?/.exec(issue.field);
    const node = match ? tree[Number(match[1])] : undefined;
    if (!node) continue;
    nodes.add(node.skillId);
    const requirement = match?.[2]
      ? node.requires[Number(match[2])]
      : undefined;
    if (requirement) links.add(`${requirement.skillId}>${node.skillId}`);
  }
  for (const issue of issues) {
    if (issue.code !== 'cycle') continue;
    for (const node of tree) {
      for (const r of node.requires) {
        if (!dependsOn(tree, r.skillId, node.skillId)) continue;
        nodes.add(node.skillId);
        nodes.add(r.skillId);
        links.add(`${r.skillId}>${node.skillId}`);
      }
    }
  }
  return { nodes, links };
}

/** Pixel sizes of a board cell and of the node card centred in it. */
export interface BoardGeometry {
  cellWidth: number;
  cellHeight: number;
  nodeWidth: number;
  nodeHeight: number;
}

export interface LinkRoute {
  path: string;
  midX: number;
  midY: number;
  /** Where the curve starts and ends (arrow side). */
  start: { x: number; y: number };
  end: { x: number; y: number };
}

type Point = { x: number; y: number };

const bezier = (a: Point, b: Point, c: Point, d: Point): LinkRoute => ({
  path: `M${a.x} ${a.y} C${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}`,
  midX: (a.x + 3 * b.x + 3 * c.x + d.x) / 8,
  midY: (a.y + 3 * b.y + 3 * c.y + d.y) / 8,
  start: a,
  end: d,
});

/** The bottom-centre of a node card: where its links leave. */
export function nodeBottom(cell: BoardCell, g: BoardGeometry): Point {
  return {
    x: cell.column * g.cellWidth + g.cellWidth / 2,
    y: cell.row * g.cellHeight + (g.cellHeight + g.nodeHeight) / 2,
  };
}

/** A curve from a point to a free point below or beside it (the link being dragged). */
export function wireRoute(start: Point, end: Point): string {
  const reach = Math.max(24, Math.abs(end.y - start.y) / 2);
  return bezier(
    start,
    { x: start.x, y: start.y + reach },
    { x: end.x, y: end.y - reach },
    end,
  ).path;
}

/**
 * The link from a prerequisite to the node that needs it. A tree reads top to bottom: from the bottom-centre of the
 * prerequisite to the top-centre of the node. Same-row and upward links go side to side (a gentle arc, or a bulge on the
 * right for the same column) so nothing loops.
 */
export function linkRoute(
  from: BoardCell,
  to: BoardCell,
  g: BoardGeometry,
): LinkRoute {
  const left = (c: BoardCell) =>
    c.column * g.cellWidth + (g.cellWidth - g.nodeWidth) / 2;
  const top = (c: BoardCell) =>
    c.row * g.cellHeight + (g.cellHeight - g.nodeHeight) / 2;
  const middle = (c: BoardCell) => top(c) + g.nodeHeight / 2;
  if (to.row > from.row) {
    const start = nodeBottom(from, g);
    const end = { x: to.column * g.cellWidth + g.cellWidth / 2, y: top(to) };
    const reach = Math.max(20, (end.y - start.y) / 2);
    return bezier(
      start,
      { x: start.x, y: start.y + reach },
      { x: end.x, y: end.y - reach },
      end,
    );
  }
  if (to.column === from.column) {
    const start = { x: left(from) + g.nodeWidth, y: middle(from) };
    const end = { x: left(to) + g.nodeWidth, y: middle(to) };
    return bezier(
      start,
      { x: start.x + 32, y: start.y },
      { x: end.x + 32, y: end.y },
      end,
    );
  }
  const dir = to.column > from.column ? 1 : -1;
  const start = {
    x: left(from) + (dir > 0 ? g.nodeWidth : 0),
    y: middle(from),
  };
  const end = { x: left(to) + (dir > 0 ? 0 : g.nodeWidth), y: middle(to) };
  const reach = Math.max(24, Math.abs(end.x - start.x) / 2);
  const arc = to.row === from.row ? -14 : 0;
  return bezier(
    start,
    { x: start.x + dir * reach, y: start.y + arc },
    { x: end.x - dir * reach, y: end.y + arc },
    end,
  );
}
