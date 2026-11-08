import { TreeNode } from '../models/class';

// The module does not exist yet: loaded at run time so the rest of the suite still compiles.
const modulePath = './tree-board.rules';
interface Cell { column: number; row: number }
interface Rules {
  addNodeAt(tree: TreeNode[], skillId: string, cell: Cell): TreeNode[];
  moveNode(tree: TreeNode[], skillId: string, cell: Cell): TreeNode[];
  linkPrerequisite(tree: TreeNode[], prerequisiteId: string, skillId: string): TreeNode[];
  unlinkPrerequisite(tree: TreeNode[], prerequisiteId: string, skillId: string): TreeNode[];
  removeNode(tree: TreeNode[], skillId: string): TreeNode[];
  boardSize(tree: TreeNode[]): { columns: number; rows: number };
  cellAt(offset: { x: number; y: number }, cellSize: { width: number; height: number }): Cell;
}
let rules: Rules;
beforeAll(async () => {
  rules = (await import(/* @vite-ignore */ modulePath)) as Rules;
});
const addNodeAt: Rules['addNodeAt'] = (...args) => rules.addNodeAt(...args);
const boardSize: Rules['boardSize'] = (...args) => rules.boardSize(...args);
const cellAt: Rules['cellAt'] = (...args) => rules.cellAt(...args);
const linkPrerequisite: Rules['linkPrerequisite'] = (...args) => rules.linkPrerequisite(...args);
const moveNode: Rules['moveNode'] = (...args) => rules.moveNode(...args);
const removeNode: Rules['removeNode'] = (...args) => rules.removeNode(...args);
const unlinkPrerequisite: Rules['unlinkPrerequisite'] = (...args) => rules.unlinkPrerequisite(...args);

const node = (skillId: string, column: number, row: number, requires: TreeNode['requires'] = []): TreeNode => ({
  skillId, requires, minLevel: 1, column, row,
});
const tree: TreeNode[] = [node('a', 0, 0), node('b', 1, 0, [{ skillId: 'a', rank: 1 }]), node('c', 2, 1)];

describe('addNodeAt', () => {
  it('adds a node with no prerequisite and min level 1 at the cell', () => {
    expect(addNodeAt(tree, 'd', { column: 3, row: 2 })).toEqual([
      ...tree,
      { skillId: 'd', requires: [], minLevel: 1, column: 3, row: 2 },
    ]);
  });

  it('refuses an occupied cell and a skill already in the tree', () => {
    expect(addNodeAt(tree, 'd', { column: 1, row: 0 })).toEqual(tree);
    expect(addNodeAt(tree, 'a', { column: 5, row: 5 })).toEqual(tree);
  });
});

describe('moveNode', () => {
  it('moves a node to an empty cell', () => {
    expect(moveNode(tree, 'c', { column: 4, row: 3 })[2]).toMatchObject({ skillId: 'c', column: 4, row: 3 });
  });

  it('swaps the two nodes when the cell is occupied', () => {
    const moved = moveNode(tree, 'a', { column: 2, row: 1 });
    expect(moved[0]).toMatchObject({ skillId: 'a', column: 2, row: 1 });
    expect(moved[2]).toMatchObject({ skillId: 'c', column: 0, row: 0 });
    expect(moved[1]).toEqual(tree[1]);
  });
});

describe('linkPrerequisite', () => {
  it('makes the first skill a prerequisite of the second, at rank 1', () => {
    expect(linkPrerequisite(tree, 'b', 'c')[2].requires).toEqual([{ skillId: 'b', rank: 1 }]);
  });

  it('refuses a link that would make a cycle, a link to itself and a duplicate link', () => {
    expect(linkPrerequisite(tree, 'b', 'a')).toEqual(tree);
    expect(linkPrerequisite(tree, 'c', 'c')).toEqual(tree);
    expect(linkPrerequisite(tree, 'a', 'b')).toEqual(tree);
    const chain = linkPrerequisite(tree, 'b', 'c');
    expect(linkPrerequisite(chain, 'c', 'a')).toEqual(chain);
  });
});

describe('unlinkPrerequisite', () => {
  it('removes the link only', () => {
    const unlinked = unlinkPrerequisite(tree, 'a', 'b');
    expect(unlinked[1].requires).toEqual([]);
    expect(unlinked).toHaveLength(3);
  });
});

describe('removeNode', () => {
  it('removes the node and the links that point to it', () => {
    expect(removeNode(tree, 'a')).toEqual([node('b', 1, 0), tree[2]]);
  });
});

describe('boardSize', () => {
  it('is at least 4 columns by 3 rows', () => {
    expect(boardSize([])).toEqual({ columns: 4, rows: 3 });
    expect(boardSize(tree)).toEqual({ columns: 4, rows: 3 });
  });

  it('keeps one free column and row beyond the farthest node', () => {
    expect(boardSize([node('a', 5, 4)])).toEqual({ columns: 7, rows: 6 });
  });
});

describe('cellAt', () => {
  it('turns a pointer offset into a cell', () => {
    expect(cellAt({ x: 250, y: 130 }, { width: 100, height: 80 })).toEqual({ column: 2, row: 1 });
    expect(cellAt({ x: 99, y: 0 }, { width: 100, height: 80 })).toEqual({ column: 0, row: 0 });
  });

  it('never goes below cell 0,0', () => {
    expect(cellAt({ x: -20, y: -5 }, { width: 100, height: 80 })).toEqual({ column: 0, row: 0 });
  });
});
