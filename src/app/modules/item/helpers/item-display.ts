import { ItemRarity } from '../../../core/models/item';

export type RaritySeverity =
  'secondary' | 'success' | 'info' | 'warn' | 'danger';

/** `p-tag` severity per rarity, from plain to striking. */
export const RARITY_SEVERITY: Record<ItemRarity, RaritySeverity> = {
  common: 'secondary',
  uncommon: 'success',
  rare: 'info',
  mythic: 'warn',
  legendary: 'danger',
};
