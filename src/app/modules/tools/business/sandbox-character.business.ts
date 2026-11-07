import { computed, inject, Injectable, resource, signal } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { WordListBusiness } from '../../../core/business/word-list.business';
import { seededRandomSource } from '../../../core/generators/random-source';
import {
  applyCharacterAction,
  CharacterAction,
} from '../../character/helpers/character-actions.rules';
import { createCharacter } from '../../character/helpers/character.rules';
import { SandboxWorldBusiness } from '../../world/business/sandbox-world.business';
import { generateStarterItems } from '../../world/helpers/starter-items';
import { Character } from '../../world/models/world';

export const SANDBOX_PLAYER_ID = 'sandbox-player';
/** A proper name, the same in every language. */
export const SANDBOX_HERO_NAME = 'Yusica';
/** Bundled portrait (art by Yuumei, credited on the credits page). */
export const SANDBOX_HERO_PORTRAIT = 'images/sample-hero.webp';

/**
 * The character sheet tool: a sample character on the sandbox world, with the world's default items in the bag.
 * Actions follow the game rules but stay on this page. Switching language starts over (item modifiers name
 * attributes in the language they were drawn in).
 */
@Injectable({ providedIn: 'root' })
export class SandboxCharacterBusiness {
  private readonly sandbox = inject(SandboxWorldBusiness);
  private readonly words = inject(WordListBusiness);
  private readonly language = inject(LanguageBusiness);

  readonly $world = this.sandbox.$world;

  private readonly sample = resource({
    params: () => ({
      lang: this.language.$language(),
      world: this.sandbox.$world(),
    }),
    loader: async ({ params: { lang, world } }) => {
      const words = await this.words.itemWords(lang);
      const barIds = [world.barAttributes.life, world.barAttributes.mana];
      const items = generateStarterItems(seededRandomSource(world.id), words, {
        attributes: world.attributes.map((attribute) => attribute.name),
        barAttributes: world.attributes
          .filter((attribute) => barIds.includes(attribute.id))
          .map((attribute) => attribute.name),
      });
      const character = createCharacter(
        world,
        {
          playerId: SANDBOX_PLAYER_ID,
          name: SANDBOX_HERO_NAME,
        },
        'sandbox-character',
        0,
      );
      return {
        lang,
        character: {
          ...character,
          samplePortrait: SANDBOX_HERO_PORTRAIT,
          inventory: items.map((item, index) => ({
            id: `inv-${index}`,
            item: { ...item, id: `item-${index}` },
            equipped: false,
            position: index,
          })),
        },
      };
    },
  });
  private readonly edited = signal<{
    lang: string;
    character: Character;
  } | null>(null);

  /** undefined while the sample loads. */
  readonly $character = computed<Character | undefined>(() => {
    const lang = this.language.$language();
    const edited = this.edited();
    if (edited?.lang === lang) return edited.character;
    return this.sample.hasValue() && this.sample.value().lang === lang
      ? this.sample.value().character
      : undefined;
  });

  /** Applies an action with the game rules. Throws the translation key of why it's refused. */
  act(action: CharacterAction): void {
    const character = this.$character();
    if (!character) return;
    const result = applyCharacterAction(
      this.$world().attributes,
      character,
      action,
      this.$world(),
    );
    if (!result.ok) throw new Error(result.error);
    this.edited.set({
      lang: this.language.$language(),
      character: { ...result.character, rev: character.rev + 1 },
    });
  }

  reset(): void {
    this.edited.set(null);
  }
}
