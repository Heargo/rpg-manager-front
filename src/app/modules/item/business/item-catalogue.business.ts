import { inject, Injectable } from '@angular/core';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { Character, Item } from '../../world/models/world';
import {
  ItemInput,
  upsertItem,
} from '../helpers/item-catalogue.rules';
import { ItemService } from '../services/item.service';

/** Game master: the catalogue of the hosted world, saved with the world. */
@Injectable({ providedIn: 'root' })
export class ItemCatalogueBusiness {
  private readonly session = inject(WorldSessionBusiness);
  private readonly service = inject(ItemService);

  readonly $world = this.session.$world;

  give(characterId: string, itemId: string): Promise<Character> {
    return this.service.giveToPlayer(characterId, itemId);
  }

  async remove(itemId: string): Promise<void> {
    await this.session.update((world) => ({
      ...world,
      items: world.items.filter((item) => item.id !== itemId),
    }));
  }

  /** Adds the item (new id) or updates it (same id), and saves the world. */
  async save(input: ItemInput): Promise<Item> {
    let saved: Item | undefined;
    await this.session.update((world) => {
      const result = upsertItem(world.items, input, () => crypto.randomUUID());
      saved = result.item;
      return { ...world, items: result.items };
    });
    return saved!;
  }
}
