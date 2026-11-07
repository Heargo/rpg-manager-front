import {
  EQUIPMENT_SLOTS,
  ITEM_RARITIES,
  ITEM_TYPES,
  ItemDraft,
  ItemModifier,
} from '../../../core/models/item';

export interface ItemIssue {
  field: string;
  code: string;
}

export interface ParsedItem {
  draft?: ItemDraft;
  issues: ItemIssue[];
}

const SLOTS: readonly string[] = ['none', ...EQUIPMENT_SLOTS];

/** What is wrong with a draft; empty when it can be saved. */
export function validateItemDraft(
  draft: ItemDraft,
  attributeNames: readonly string[],
): ItemIssue[] {
  const issues: ItemIssue[] = [];
  if (!draft.name.trim()) issues.push({ field: 'name', code: 'required' });
  if (!Number.isFinite(draft.price) || draft.price < 0) {
    issues.push({ field: 'price', code: 'invalid' });
  }
  const equipment = draft.type === 'equipment';
  if (equipment !== (draft.slot !== 'none')) {
    issues.push({
      field: 'slot',
      code: equipment ? 'required' : 'not-allowed',
    });
  }
  if (
    draft.modifiers.some(
      (modifier) =>
        !attributeNames.includes(modifier.attribute) ||
        !Number.isFinite(modifier.value),
    )
  ) {
    issues.push({ field: 'modifiers', code: 'unknown-attribute' });
  }
  return issues;
}

/** The item as editable JSON: no id, no image. */
export function itemToJson(draft: ItemDraft): string {
  const { name, description, rarity, type, slot, price, modifiers } = draft;
  return JSON.stringify(
    { name, description, rarity, type, slot, price, modifiers },
    null,
    2,
  );
}

/** Reads JSON text into a draft; `draft` is only set when there is no issue. */
export function parseItemJson(
  text: string,
  attributeNames: readonly string[],
): ParsedItem {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { issues: [{ field: 'json', code: 'invalid-json' }] };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { issues: [{ field: 'json', code: 'not-object' }] };
  }
  const raw = data as Record<string, unknown>;
  const issues: ItemIssue[] = [];
  const bad = (field: string) => issues.push({ field, code: 'invalid' });

  if (typeof raw['name'] !== 'string') bad('name');
  if (
    raw['description'] !== undefined &&
    typeof raw['description'] !== 'string'
  ) {
    bad('description');
  }
  if (!ITEM_RARITIES.includes(raw['rarity'] as never)) bad('rarity');
  if (!ITEM_TYPES.includes(raw['type'] as never)) bad('type');
  if (raw['slot'] !== undefined && !SLOTS.includes(raw['slot'] as string)) {
    bad('slot');
  }
  if (typeof raw['price'] !== 'number') bad('price');
  const modifiers = raw['modifiers'] ?? [];
  if (!Array.isArray(modifiers) || !modifiers.every(isModifier))
    bad('modifiers');
  if (issues.length) return { issues };

  const draft = {
    name: raw['name'],
    description: raw['description'] ?? '',
    rarity: raw['rarity'],
    type: raw['type'],
    slot: raw['slot'] ?? 'none',
    price: raw['price'],
    modifiers,
  } as ItemDraft;
  const problems = validateItemDraft(draft, attributeNames);
  return problems.length ? { issues: problems } : { draft, issues: [] };
}

function isModifier(value: unknown): value is ItemModifier {
  const modifier = value as Record<string, unknown> | null;
  return (
    !!modifier &&
    typeof modifier === 'object' &&
    typeof modifier['attribute'] === 'string' &&
    typeof modifier['value'] === 'number'
  );
}

/** A prompt to paste in any AI chat to get an item as JSON for this world. */
export function buildItemPrompt(attributeNames: readonly string[]): string {
  return [
    'Create one item for a tabletop role-playing game. Answer with JSON only, no other text, in this shape:',
    '{ "name": string, "description": string, "rarity": string, "type": string, "slot": string, "price": number, "modifiers": [{ "attribute": string, "value": number }] }',
    `- rarity: one of ${ITEM_RARITIES.join(', ')}.`,
    `- type: one of ${ITEM_TYPES.join(', ')}.`,
    `- slot: one of ${EQUIPMENT_SLOTS.join(', ')} when the type is equipment, otherwise "none".`,
    '- price: a whole number of coins, 0 or more.',
    `- modifiers: bonuses or maluses (positive or negative whole numbers) on these attributes only: ${attributeNames.join(', ')}.`,
  ].join('\n');
}
