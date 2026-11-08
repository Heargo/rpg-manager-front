import { Skill } from '../../skill/models/skill';
import {
  CharacterClass,
  ClassDraft,
  ClassFilter,
  TreeNode,
  TreeNodeStatus,
} from '../models/class';

export interface ClassIssue {
  field: string;
  code:
    | 'required'
    | 'invalid'
    | 'noRoot'
    | 'cycle'
    | 'outsideTree'
    | 'duplicate'
    | 'unknownSkill';
}

/** The checks of a class: name, bonuses and the tree (known skills once each, prerequisites in the tree, no cycle, a root). */
export function validateClass(
  characterClass: ClassDraft,
  skills: Skill[],
  attributeNames: string[],
): ClassIssue[] {
  const issues: ClassIssue[] = [];
  if (!characterClass.name.trim())
    issues.push({ field: 'name', code: 'required' });
  (characterClass.bonuses ?? []).forEach((bonus, index) => {
    if (!attributeNames.includes(bonus.attribute))
      issues.push({ field: `bonuses.${index}.attribute`, code: 'invalid' });
  });
  const tree = characterClass.tree;
  const inTree = new Set(tree.map((node) => node.skillId));
  const seen = new Set<string>();
  tree.forEach((node, index) => {
    const skill = skills.find((entry) => entry.id === node.skillId);
    if (seen.has(node.skillId))
      issues.push({ field: `tree.${index}.skillId`, code: 'duplicate' });
    else if (!skill)
      issues.push({ field: `tree.${index}.skillId`, code: 'unknownSkill' });
    seen.add(node.skillId);
    if (!Number.isInteger(node.minLevel) || node.minLevel < 1)
      issues.push({ field: `tree.${index}.minLevel`, code: 'invalid' });
    node.requires.forEach((requirement, at) => {
      if (!inTree.has(requirement.skillId)) {
        issues.push({
          field: `tree.${index}.requires.${at}`,
          code: 'outsideTree',
        });
        return;
      }
      const required = skills.find((entry) => entry.id === requirement.skillId);
      if (
        !Number.isInteger(requirement.rank) ||
        requirement.rank < 1 ||
        (required && requirement.rank > required.maxRank)
      ) {
        issues.push({
          field: `tree.${index}.requires.${at}.rank`,
          code: 'invalid',
        });
      }
    });
  });
  if (!tree.some((node) => node.requires.length === 0))
    issues.push({ field: 'tree', code: 'noRoot' });
  if (hasCycle(tree)) issues.push({ field: 'tree', code: 'cycle' });
  return issues;
}

function hasCycle(tree: TreeNode[]): boolean {
  const requires = new Map(
    tree.map((node) => [node.skillId, node.requires.map((r) => r.skillId)]),
  );
  const done = new Set<string>();
  const path = new Set<string>();
  const visit = (id: string): boolean => {
    if (path.has(id)) return true;
    if (done.has(id) || !requires.has(id)) return false;
    path.add(id);
    const cyclic = requires.get(id)!.some(visit);
    path.delete(id);
    done.add(id);
    return cyclic;
  };
  return tree.some((node) => visit(node.skillId));
}

/** Each node of the tree for a sheet: learned (has a rank), available, or locked with what is missing. */
export function treeNodeStates(
  tree: TreeNode[],
  sheet: { level: number; skills: { skillId: string; rank: number }[] },
): TreeNodeStatus[] {
  const rankOf = (skillId: string) =>
    sheet.skills.find((entry) => entry.skillId === skillId)?.rank ?? 0;
  return tree.map((node) => {
    const missing: TreeNodeStatus['missing'] = [
      ...node.requires
        .filter((requirement) => rankOf(requirement.skillId) < requirement.rank)
        .map((requirement) => ({
          kind: 'requires' as const,
          skillId: requirement.skillId,
          rank: requirement.rank,
        })),
      ...(sheet.level < node.minLevel
        ? [{ kind: 'level' as const, minLevel: node.minLevel }]
        : []),
    ];
    const state =
      rankOf(node.skillId) > 0
        ? 'learned'
        : missing.length
          ? 'locked'
          : 'available';
    return {
      skillId: node.skillId,
      state,
      missing: state === 'learned' ? [] : missing,
    };
  });
}

export function filterClasses(
  classes: CharacterClass[],
  filter: ClassFilter,
): CharacterClass[] {
  const search = filter.search.trim().toLocaleLowerCase();
  return classes.filter(
    (entry) => !search || entry.name.toLocaleLowerCase().includes(search),
  );
}

/** Adds the class (new id) or replaces it (same id). */
export function upsertClass(
  classes: CharacterClass[],
  input: ClassDraft,
  newId: () => string,
): { classes: CharacterClass[]; characterClass: CharacterClass } {
  const trimmed = { ...input, name: input.name.trim() };
  if (input.id && classes.some((entry) => entry.id === input.id)) {
    const characterClass = { ...trimmed, id: input.id };
    return {
      classes: classes.map((entry) =>
        entry.id === characterClass.id ? characterClass : entry,
      ),
      characterClass,
    };
  }
  const characterClass = { ...trimmed, id: newId() };
  return { classes: [...classes, characterClass], characterClass };
}

/** The classes with a copy of one of them (new id, name + suffix) at the end. */
export function addClassCopy(
  classes: CharacterClass[],
  id: string,
  newId: () => string,
  suffix: string,
): CharacterClass[] {
  const source = classes.find((entry) => entry.id === id);
  return source
    ? [
        ...classes,
        { ...structuredClone(source), id: newId(), name: source.name + suffix },
      ]
    : classes;
}

/** A blank class, to fill in. */
export function emptyClass(): ClassDraft {
  return { name: '', description: '', tree: [] };
}

export const classToJson = (characterClass: ClassDraft): string =>
  JSON.stringify(characterClass, null, 2);

export interface ParsedClass {
  characterClass?: ClassDraft;
  issues: ClassIssue[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Reads the JSON tab: the text must be a class object of the right shape and pass the same checks as the form. */
export function parseClassJson(
  text: string,
  base: ClassDraft,
  skills: Skill[],
  attributeNames: string[],
): ParsedClass {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { issues: [{ field: 'json', code: 'invalid' }] };
  }
  if (!isRecord(value)) return { issues: [{ field: 'json', code: 'invalid' }] };
  const shapeOk =
    typeof value['name'] === 'string' &&
    Array.isArray(value['tree']) &&
    value['tree'].every(
      (node) =>
        isRecord(node) &&
        typeof node['skillId'] === 'string' &&
        typeof node['minLevel'] === 'number' &&
        typeof node['column'] === 'number' &&
        typeof node['row'] === 'number' &&
        Array.isArray(node['requires']) &&
        node['requires'].every(
          (r) =>
            isRecord(r) &&
            typeof r['skillId'] === 'string' &&
            typeof r['rank'] === 'number',
        ),
    ) &&
    (value['bonuses'] === undefined ||
      (Array.isArray(value['bonuses']) &&
        value['bonuses'].every(
          (b) =>
            isRecord(b) &&
            typeof b['attribute'] === 'string' &&
            typeof b['value'] === 'number',
        ))) &&
    (value['startingItems'] === undefined ||
      (Array.isArray(value['startingItems']) &&
        value['startingItems'].every((id) => typeof id === 'string')));
  if (!shapeOk) return { issues: [{ field: 'json', code: 'invalid' }] };
  const characterClass: ClassDraft = {
    ...(value as unknown as ClassDraft),
    description:
      typeof value['description'] === 'string' ? value['description'] : '',
    id: base.id,
  };
  const issues = validateClass(characterClass, skills, attributeNames);
  return issues.length ? { issues } : { characterClass, issues };
}
