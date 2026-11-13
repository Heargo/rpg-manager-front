import { ItemModifier } from '../../../core/models/item';

/** A prerequisite of a tree node: another skill of the same tree, at a minimum level. */
export interface TreeRequirement {
  skillId: string;
  level: number;
}

/** A skill of a class tree, with its prerequisites, its minimum level and its cell in the editor grid. */
export interface TreeNode {
  skillId: string;
  requires: TreeRequirement[];
  minLevel: number;
  column: number;
  row: number;
}

/** A catalogue entry: bonuses, starting items and the skill tree the class can learn. */
export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  imageId?: string;
  /** Always on, like an item's modifiers. */
  bonuses?: ItemModifier[];
  /** Catalogue item ids given at creation. */
  startingItems?: string[];
  tree: TreeNode[];
}

/** A class before it is saved: a new one has no id yet. */
export type ClassDraft = Omit<CharacterClass, 'id'> & { id?: string };

export interface ClassFilter {
  search: string;
}

/** What a sheet's tree node is for it: not yet reachable, reachable, or already learned. */
export type TreeNodeState = 'locked' | 'available' | 'learned';

export type TreeMissing =
  | { kind: 'requires'; skillId: string; level: number }
  | { kind: 'level'; minLevel: number };

export interface TreeNodeStatus {
  skillId: string;
  state: TreeNodeState;
  missing: TreeMissing[];
}
