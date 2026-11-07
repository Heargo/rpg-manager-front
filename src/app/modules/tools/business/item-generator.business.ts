import { computed, inject, Injectable, resource, signal } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { WordListBusiness } from '../../../core/business/word-list.business';
import { generateItem } from '../../../core/generators/item-generator';
import {
  createSeed,
  seededRandomSource,
} from '../../../core/generators/random-source';
import {
  EquipmentSlot,
  ItemDraft,
  ItemRarity,
  ItemType,
} from '../../../core/models/item';
import { SandboxWorldBusiness } from '../../world/business/sandbox-world.business';

export const SEED_MAX_LENGTH = 32;

/**
 * The item generator tool: options (null = random), a visible seed, and the item they give on the sandbox
 * world's attributes. Same seed + same options + same language → same item.
 */
@Injectable({ providedIn: 'root' })
export class ItemGeneratorBusiness {
  private readonly words = inject(WordListBusiness);
  private readonly language = inject(LanguageBusiness);
  private readonly sandbox = inject(SandboxWorldBusiness);

  readonly $rarity = signal<ItemRarity | null>(null);
  readonly $type = signal<ItemType | null>(null);
  readonly $slot = signal<EquipmentSlot | null>(null);
  readonly $seed = signal(createSeed());
  /** The sandbox world's attributes, which item modifiers are drawn on. */
  readonly $attributeNames = computed(() =>
    this.sandbox.$world().attributes.map((attribute) => attribute.name),
  );
  /** A slot only makes sense for equipment (or a random type, which a slot turns into equipment). */
  readonly $slotEnabled = computed(
    () => this.$type() === null || this.$type() === 'equipment',
  );

  private readonly generated = resource({
    params: () => ({
      seed: this.$seed(),
      rarity: this.$rarity() ?? undefined,
      type: this.$type() ?? undefined,
      slot: (this.$slotEnabled() && this.$slot()) || undefined,
      lang: this.language.$language(),
      attributes: this.$attributeNames(),
    }),
    loader: async ({ params: { seed, lang, ...options } }) =>
      generateItem(
        seededRandomSource(seed),
        await this.words.itemWords(lang),
        options,
      ),
  });

  /** The last item generated (kept while the next one loads). */
  readonly $item = computed<ItemDraft | undefined>(() =>
    this.generated.hasValue() ? this.generated.value() : undefined,
  );
  readonly $failed = computed(() => this.generated.status() === 'error');

  /** A new seed, for callers that keep their own. */
  newSeed(): string {
    return createSeed();
  }

  /** Draws an item from a seed on the given attributes, in the active language (independent of the tool's state). */
  async generateFor(
    seed: string,
    attributes: readonly string[],
  ): Promise<ItemDraft> {
    return generateItem(
      seededRandomSource(seed),
      await this.words.itemWords(),
      {
        attributes,
      },
    );
  }

  reroll(): void {
    this.$seed.set(createSeed());
  }

  /** Uses a pasted seed; blank text is ignored. */
  setSeed(text: string): void {
    const seed = text.trim().slice(0, SEED_MAX_LENGTH);
    if (seed) this.$seed.set(seed);
  }
}
