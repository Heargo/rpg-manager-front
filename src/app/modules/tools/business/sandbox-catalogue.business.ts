import {
  computed,
  inject,
  Injectable,
  linkedSignal,
  resource,
} from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { WordListBusiness } from '../../../core/business/word-list.business';
import { seededRandomSource } from '../../../core/generators/random-source';
import {
  ItemInput,
  mergeDefaultItems,
  upsertItem,
} from '../../item/helpers/item-catalogue.rules';
import { SandboxWorldBusiness } from '../../world/business/sandbox-world.business';
import { generateStarterItems } from '../../world/helpers/starter-items';
import { Item } from '../../world/models/world';

/**
 * The item catalogue tool: the sandbox world with its default items, kept in memory. Switching language starts
 * over (modifiers name attributes in the language they were drawn in).
 */
@Injectable({ providedIn: 'root' })
export class SandboxCatalogueBusiness {
  private readonly sandbox = inject(SandboxWorldBusiness);
  private readonly words = inject(WordListBusiness);
  private readonly language = inject(LanguageBusiness);

  private readonly defaults = resource({
    params: () => ({
      lang: this.language.$language(),
      world: this.sandbox.$world(),
    }),
    loader: async ({ params: { lang, world } }) => {
      const barIds = [world.barAttributes.life, world.barAttributes.mana];
      return generateStarterItems(
        seededRandomSource(world.id),
        await this.words.itemWords(lang),
        {
          attributes: world.attributes.map((attribute) => attribute.name),
          barAttributes: world.attributes
            .filter((attribute) => barIds.includes(attribute.id))
            .map((attribute) => attribute.name),
        },
      );
    },
  });

  private readonly items = linkedSignal<Item[]>(() => {
    const drafts = this.defaults.hasValue() ? this.defaults.value() : [];
    return mergeDefaultItems(
      [],
      drafts,
      (() => {
        let n = 0;
        return () => `sandbox-item-${n++}`;
      })(),
    );
  });

  readonly $failed = computed(() => this.defaults.status() === 'error');
  readonly $loading = computed(() => this.defaults.isLoading());
  readonly $world = computed(() => ({
    ...this.sandbox.$world(),
    items: this.items(),
  }));

  remove(itemId: string): void {
    this.items.update((items) => items.filter((item) => item.id !== itemId));
  }

  /** Adds the item (new id) or updates it (same id), in memory. */
  save(input: ItemInput): Item {
    const result = upsertItem(this.items(), input, () => crypto.randomUUID());
    this.items.set(result.items);
    return result.item;
  }

  addDefaults(): void {
    const drafts = this.defaults.hasValue() ? this.defaults.value() : undefined;
    if (!drafts) return;
    this.items.update((items) =>
      mergeDefaultItems(items, drafts, () => crypto.randomUUID()),
    );
  }
}
