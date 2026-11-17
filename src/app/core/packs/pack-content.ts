import { ItemModifier } from '../models/item';
import {
  emptyClass,
  parseClassJson,
} from '../../modules/class/helpers/class.rules';
import {
  Skill,
  SKILL_TYPES,
  SkillDraft,
} from '../../modules/skill/models/skill';
import { parseItemJson } from '../../modules/item/helpers/item-editor.rules';
import { parseSkillJson } from '../../modules/skill/helpers/skill.rules';
import { PackAttribute } from './pack';

/** The domains whose entries a pack can ship as fixed content. */
export const CONTENT_DOMAINS = ['items', 'skills', 'classes'] as const;
export type ContentDomain = (typeof CONTENT_DOMAINS)[number];

export interface PackContentContext {
  /** The ids of the attributes the pack declares. */
  attributeIds: string[];
  /** Their names, for formulas that read an attribute by name. */
  attributeNames?: string[];
  /** The ids of the pack's skills. */
  skillIds: string[];
}

export type PackContentValidation =
  { ok: true; value: Record<string, any>[] } | { ok: false; errors: string[] };

/** A catalogue entry as the planner reads it. */
export type PackEntry = Record<string, any>;
type Entry = PackEntry;

const isObject = (value: unknown): value is Entry =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const BASE_SKILL: SkillDraft = {
  name: '',
  description: '',
  rarity: 'common',
  type: 'passive',
  maxLevel: 1,
  pointCost: 1,
  effects: [],
};

/** Checks a content file (a JSON list of entries of a domain) against what the pack declares. */
export function validatePackContent(
  domain: string,
  json: unknown,
  context: PackContentContext,
): PackContentValidation {
  if (!(CONTENT_DOMAINS as readonly string[]).includes(domain))
    return {
      ok: false,
      errors: [`${domain}: no fixed content for this domain`],
    };
  if (!Array.isArray(json))
    return { ok: false, errors: ['the content must be a list of entries'] };
  const errors: string[] = [];
  const ids = new Set<string>();
  const attributes = new Set(context.attributeIds);
  const skills = new Set(context.skillIds);

  json.forEach((entry, index) => {
    if (!isObject(entry)) {
      errors.push(`entry ${index}: must be an object`);
      return;
    }
    const id = entry['id'];
    if (typeof id !== 'string' || !id.trim() || id.includes(':')) {
      errors.push(`entry ${index}: id is required (a text without ":")`);
      return;
    }
    const name = `${domain} "${id}"`;
    if (ids.has(id)) errors.push(`${name}: id is used twice`);
    ids.add(id);
    const problems = (items: string[]) =>
      errors.push(...items.map((problem) => `${name}: ${problem}`));
    const { id: _id, ...rest } = entry;
    const text = JSON.stringify(rest);
    const undeclared = (modifiers: unknown): string[] =>
      (Array.isArray(modifiers) ? modifiers : [])
        .map((m) => (isObject(m) ? m['attribute'] : undefined))
        .filter((a): a is string => typeof a === 'string' && !attributes.has(a))
        .map((a) => `modifier on undeclared attribute "${a}"`);

    if (domain === 'items') {
      const used = undeclared(entry['modifiers']);
      problems(used);
      const names = [...attributes, ...modifierAttributes(entry['modifiers'])];
      const parsed = parseItemJson(text, names);
      problems(parsed.issues.map((i) => `${i.field} ${i.code}`));
    } else if (domain === 'skills') {
      const shape: string[] = [];
      if (typeof entry['name'] !== 'string') shape.push('name must be a text');
      if (typeof entry['maxLevel'] !== 'number')
        shape.push('maxLevel must be a number');
      if (typeof entry['pointCost'] !== 'number')
        shape.push('pointCost must be a number');
      if (!(SKILL_TYPES as readonly unknown[]).includes(entry['type']))
        shape.push(`type must be one of ${SKILL_TYPES.join(', ')}`);
      if (shape.length) {
        problems(shape);
        return;
      }
      const effects = Array.isArray(entry['effects']) ? entry['effects'] : [];
      const names = [
        ...attributes,
        ...(context.attributeNames ?? []),
        ...effects.map((e) => (isObject(e) ? String(e['attribute']) : '')),
        ...(isObject(entry['cost'])
          ? [String(entry['cost']['attribute'])]
          : []),
      ];
      const parsed = parseSkillJson(text, BASE_SKILL, names);
      problems(parsed.issues.map((i) => `${i.field} ${i.code}`));
    } else {
      problems(undeclared(entry['bonuses']));
      const tree = Array.isArray(entry['tree']) ? entry['tree'] : [];
      const referenced: string[] = [];
      for (const node of tree) {
        if (!isObject(node)) continue;
        referenced.push(String(node['skillId']));
        if (Array.isArray(node['requires']))
          for (const r of node['requires'])
            if (isObject(r)) referenced.push(String(r['skillId']));
      }
      const unknown = [...new Set(referenced)].filter((s) => !skills.has(s));
      problems(
        unknown.map((s) => `skill "${s}" is not one of the pack's skills`),
      );
      const stubs = [...skills, ...unknown].map(
        (skillId) => ({ id: skillId, maxLevel: 10 }) as Skill,
      );
      const names = [...attributes, ...modifierAttributes(entry['bonuses'])];
      const parsed = parseClassJson(text, emptyClass(), stubs, names);
      problems(parsed.issues.map((i) => `${i.field} ${i.code}`));
    }
  });
  return errors.length
    ? { ok: false, errors }
    : { ok: true, value: json as Entry[] };
}

function modifierAttributes(modifiers: unknown): string[] {
  return (Array.isArray(modifiers) ? modifiers : [])
    .map((m) => (isObject(m) ? m['attribute'] : undefined))
    .filter((a): a is string => typeof a === 'string');
}

/** What the planner reads of a world attribute. */
export interface WorldAttributeRef {
  id: string;
  name: string;
}

/** A pack attribute becomes a world attribute (id), is created (`add`) or dropped (`skip`). */
export type AttributeMapping = Record<string, string>;

export interface PackImportInput {
  packId: string;
  content: { items?: Entry[]; skills?: Entry[]; classes?: Entry[] };
  attributes: PackAttribute[];
  world: {
    items: Entry[];
    skills: Entry[];
    classes: Entry[];
    attributes: WorldAttributeRef[];
  };
  mapping: AttributeMapping;
  domains: ContentDomain[];
}

export interface PackImportPlan {
  items: Entry[];
  skills: Entry[];
  classes: Entry[];
  /** Ids of the edited copies left alone. */
  kept: string[];
  addAttributes: PackAttribute[];
  needsChoice: PackAttribute[];
}

/** The mark an imported copy carries: a hash of the entry as it was written, to tell later whether the GM edited it. */
export const IMPORT_MARK = 'packHash';

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (isObject(value))
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

/** FNV-1a over the entry without its mark. */
export function entryHash(entry: Entry): string {
  const { [IMPORT_MARK]: _mark, ...rest } = entry;
  const text = stable(rest);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Computes what importing a pack's content writes into a world's catalogues (pure; nothing is stored here). */
export function planPackImport(input: PackImportInput): PackImportPlan {
  const { packId, content, world, mapping } = input;
  const prefix = (id: string) => `${packId}:${id}`;
  const wanted = new Set(input.domains);

  const classes = wanted.has('classes') ? (content.classes ?? []) : [];
  const skillIds = new Set<string>();
  for (const entry of wanted.has('skills') ? (content.skills ?? []) : [])
    skillIds.add(entry['id']);
  for (const klass of classes)
    for (const node of klass['tree'] ?? []) skillIds.add(node['skillId']);
  const skills = (content.skills ?? []).filter((e) => skillIds.has(e['id']));
  const items = wanted.has('items') ? (content.items ?? []) : [];

  const byId = new Map(input.attributes.map((a) => [a.id, a]));
  const used = new Set<string>();
  const collect = (modifiers: ItemModifier[] | undefined) =>
    (modifiers ?? []).forEach((m) => used.add(m.attribute));
  items.forEach((e) => collect(e['modifiers']));
  classes.forEach((e) => collect(e['bonuses']));

  const needsChoice: PackAttribute[] = [];
  const addAttributes: PackAttribute[] = [];
  /** The world name a pack attribute resolves to; undefined = dropped. */
  const resolved = new Map<string, string | undefined>();
  for (const id of used) {
    const attribute = byId.get(id);
    if (!attribute) {
      resolved.set(id, undefined);
      continue;
    }
    const choice = mapping[id];
    const target =
      choice && choice !== 'add' && choice !== 'skip'
        ? world.attributes.find((a) => a.id === choice)
        : undefined;
    if (target) resolved.set(id, target.name);
    else if (choice === 'skip') resolved.set(id, undefined);
    else if (choice === 'add') {
      resolved.set(id, attribute.name);
      if (!world.attributes.some((a) => a.name === attribute.name))
        addAttributes.push(attribute);
    } else {
      const same = world.attributes.find((a) => a.name === attribute.name);
      if (same) resolved.set(id, same.name);
      else {
        resolved.set(id, undefined);
        needsChoice.push(attribute);
      }
    }
  }
  const remap = (modifiers: ItemModifier[] | undefined) =>
    (modifiers ?? []).flatMap((m) => {
      const name = resolved.get(m.attribute);
      return name === undefined ? [] : [{ ...m, attribute: name }];
    });

  const kept: string[] = [];
  const write = (
    entries: Entry[],
    current: Entry[],
    build: (e: Entry) => Entry,
  ) => {
    const written: Entry[] = [];
    for (const source of entries) {
      const built = build(source);
      const copy = current.find((c) => c['id'] === built['id']);
      if (copy && copy[IMPORT_MARK] !== entryHash(copy)) {
        kept.push(built['id']);
        continue;
      }
      const hash = entryHash(built);
      if (copy && copy[IMPORT_MARK] === hash) continue;
      written.push({ ...built, [IMPORT_MARK]: hash });
    }
    return written;
  };

  return {
    items: write(items, world.items, (e) => ({
      ...e,
      id: prefix(e['id']),
      modifiers: remap(e['modifiers']),
    })),
    skills: write(skills, world.skills, (e) => ({ ...e, id: prefix(e['id']) })),
    classes: write(classes, world.classes, (e) => ({
      ...e,
      id: prefix(e['id']),
      ...(e['bonuses'] ? { bonuses: remap(e['bonuses']) } : {}),
      tree: (e['tree'] ?? []).map((node: Entry) => ({
        ...node,
        skillId: prefix(node['skillId']),
        requires: (node['requires'] ?? []).map((r: Entry) => ({
          ...r,
          skillId: prefix(r['skillId']),
        })),
      })),
    })),
    kept,
    addAttributes,
    needsChoice,
  };
}

/** Writes `written` into `current` by id: replaced where the id exists, appended otherwise; counts both. */
export function mergeById<T extends { id: string }>(
  current: readonly T[],
  written: readonly T[],
): { entries: T[]; added: number; updated: number } {
  const byId = new Map(written.map((entry) => [entry.id, entry]));
  const known = new Set(current.map((entry) => entry.id));
  const updated = written.filter((entry) => known.has(entry.id)).length;
  return {
    entries: [
      ...current.map((entry) => byId.get(entry.id) ?? entry),
      ...written.filter((entry) => !known.has(entry.id)),
    ],
    added: written.length - updated,
    updated,
  };
}
