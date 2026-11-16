/** The three structured domains of the pack creator besides items, with a valid example of each (shared by the specs). */
export type CreatorDomain = 'npcs' | 'skills' | 'classes';

export interface DomainCase {
  domain: CreatorDomain;
  /** The `PackDraft` field holding the domain's kinds. */
  field: 'npcKinds' | 'skillKinds' | 'classKinds';
  /** The path of the domain's language file in the pack. */
  path: string;
  /** A valid root kind. */
  root: Record<string, unknown>;
  /** A change to the domain's own fields of the root, and the field that change sets. */
  patch: Record<string, unknown>;
  /** A field of the root to clear (set to `undefined`). */
  clear: string;
  /** The top-level lists of the language file. */
  top: Record<string, unknown>;
  /** The texts of a kind (the fields the three domains share). */
  texts: {
    nouns: { text: string }[];
    descriptions: string[];
    adjectives: string[];
    names: string[];
  };
  /** The `data-test` of the control of the domain's own field, and the `onChange` value and the fields of the root it leaves. */
  control: { hook: string; value: unknown; result: Record<string, unknown> };
}

const TEXTS = {
  nouns: [{ text: 'Zorbling' }],
  descriptions: ['A zorbling, seen near {place}.'],
  adjectives: ['Odd'],
  names: ['{noun} of the Deep'],
};

export const DOMAIN_CASES: DomainCase[] = [
  {
    domain: 'npcs',
    field: 'npcKinds',
    path: 'generators/npcs.json',
    root: { roles: ['story'] },
    patch: { person: false },
    clear: 'person',
    top: {
      given: [{ text: 'Zorg', gender: 'm' }],
      epithets: ['the Odd'],
      templates: ['{given} {epithet}'],
    },
    texts: TEXTS,
    control: { hook: 'kind-roles', value: ['merchant', 'enemy'], result: { roles: ['merchant', 'enemy'] } },
  },
  {
    domain: 'skills',
    field: 'skillKinds',
    path: 'generators/skills.json',
    root: { type: 'active', effect: 'damage' },
    patch: { effect: 'heal' },
    clear: 'effect',
    top: { templates: ['{noun} of {suffix}'], adjectives: ['Odd'], suffixes: ['Fire'] },
    texts: TEXTS,
    control: { hook: 'kind-effect', value: 'heal', result: { effect: 'heal' } },
  },
  {
    domain: 'classes',
    field: 'classKinds',
    path: 'generators/classes.json',
    root: { skills: ['strike'] },
    patch: { skills: ['strike', 'shot'] },
    clear: 'skills',
    top: { templates: ['{noun} of {suffix}'], adjectives: ['Odd'], suffixes: ['the Deep'] },
    texts: TEXTS,
    control: { hook: 'kind-skills', value: ['strike', 'shot'], result: { skills: ['strike', 'shot'] } },
  },
];
