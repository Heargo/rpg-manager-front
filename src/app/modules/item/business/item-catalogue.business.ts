import { inject, Injectable } from '@angular/core';
import { WordListBusiness } from '../../../core/business/word-list.business';
import { seededRandomSource } from '../../../core/generators/random-source';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { generateStarterItems } from '../../world/helpers/starter-items';
import { Character, Item, World } from '../../world/models/world';
import {
  ItemInput,
  mergeDefaultItems,
  upsertItem,
} from '../helpers/item-catalogue.rules';
import { ItemService } from '../services/item.service';

/** Game master: the catalogue of the hosted world, saved with the world. */
@Injectable({ providedIn: 'root' })
export class ItemCatalogueBusiness {
  private readonly session = inject(WorldSessionBusiness);
  private readonly service = inject(ItemService);
  private readonly words = inject(WordListBusiness);

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

  /** Adds the default items drawn from the world's attributes; the ones it already has are skipped. */
  async addDefaults(): Promise<void> {
    const words = await this.words.itemWords();
    await this.session.update((world) => ({
      ...world,
      items: mergeDefaultItems(world.items, starterDrafts(world, words), () =>
        crypto.randomUUID(),
      ),
    }));
  }
}

function starterDrafts(
  world: World,
  words: Awaited<ReturnType<WordListBusiness['itemWords']>>,
) {
  const barIds = [world.barAttributes.life, world.barAttributes.mana];
  return generateStarterItems(seededRandomSource(world.id), words, {
    attributes: world.attributes.map((attribute) => attribute.name),
    barAttributes: world.attributes
      .filter((attribute) => barIds.includes(attribute.id))
      .map((attribute) => attribute.name),
  });
}
