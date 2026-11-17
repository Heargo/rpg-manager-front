import { StructuredDomain } from '../../../../../core/packs/pack-draft-edits';
import { KindTexts } from './kind-texts';

export type Fields = Record<string, unknown>;
/** The domains of the table: the items and the structured ones. */
export type Domain = 'items' | StructuredDomain;

/** The domain fields of a kind, shown as columns and in the detail. */
export const FIELDS: Record<Domain, string[]> = {
  items: ['type', 'slot'],
  npcs: ['roles'],
  skills: ['type', 'effect'],
  classes: ['skills'],
};

export const FIELD_LABEL: Record<string, string> = {
  type: 'packs.creator.kinds.type',
  slot: 'packs.creator.kinds.slot',
  roles: 'packs.creator.domain.roles',
  effect: 'packs.creator.domain.effect',
  skills: 'packs.creator.domain.skills',
};

/** A kind of the table: its id, its label and the fields the draft holds for it. */
export interface Row {
  id: string;
  label: string;
  fields: Fields;
}

/** The kind being edited in the drawer form. */
export interface KindForm {
  /** The id the kind has in the draft; `null` for a new one. */
  original: string | null;
  id: string;
  parent: string;
  fields: Fields;
  /** The texts of the kind; `null` for a pack without a language. */
  texts: KindTexts | null;
}

/** One trial entry drawn by the preview. */
export interface Drawn {
  name: string;
  description: string;
  rarity?: string;
}

/** Why a form cannot be saved, if it cannot. */
export type FormError = 'kebab' | 'duplicate' | 'parent' | null;

/** What a field of a kind shows: the translated value, a list joined. */
export function displayField(
  t: (key: string) => string,
  domain: Domain,
  field: string,
  value: unknown,
): string {
  if (value === undefined || value === null) return '';
  const one = (v: unknown): string => {
    const key = String(v);
    switch (field) {
      case 'type':
        return t(`${domain === 'items' ? 'item' : 'skill'}.type.${key}`);
      case 'slot':
        return t(`item.slot.${key}`);
      case 'roles':
        return t(`npc.role.${key}`);
      case 'effect':
        return t(`skill.effectKind.${key}`);
      default:
        return key;
    }
  };
  return Array.isArray(value) ? value.map(one).join(', ') : one(value);
}
