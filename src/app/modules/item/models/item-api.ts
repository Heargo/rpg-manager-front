export const ITEM_ROUTES = {
  give: 'item/give',
} as const;

export interface GiveItemRequest {
  characterId: string;
  itemId: string;
}
