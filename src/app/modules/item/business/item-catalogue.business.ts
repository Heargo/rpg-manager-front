import { inject, Injectable } from '@angular/core';
import { WordListBusiness } from '../../../core/business/word-list.business';
import { seededRandomSource } from '../../../core/generators/random-source';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { generateStarterItems } from '../../world/helpers/starter-items';
import { Character, World } from '../../world/models/world';
import { mergeDefaultItems } from '../helpers/item-catalogue.rules';
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
