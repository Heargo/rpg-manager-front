import { inject, Injectable } from '@angular/core';
import { ItemDraft } from '../../../core/models/item';
import { ItemGeneratorBusiness } from '../../tools/business/item-generator.business';
import {
  buildItemPrompt,
  itemToJson,
  ItemIssue,
  ParsedItem,
  parseItemJson,
  validateItemDraft,
} from '../helpers/item-editor.rules';

/** What the item editor needs: checks, JSON, the copy prompt and the random Generate. */
@Injectable({ providedIn: 'root' })
export class ItemEditorBusiness {
  private readonly generator = inject(ItemGeneratorBusiness);

  validate(draft: ItemDraft, attributeNames: readonly string[]): ItemIssue[] {
    return validateItemDraft(draft, attributeNames);
  }

  toJson(draft: ItemDraft): string {
    return itemToJson(draft);
  }

  parse(text: string, attributeNames: readonly string[]): ParsedItem {
    return parseItemJson(text, attributeNames);
  }

  prompt(attributeNames: readonly string[], language: 'en' | 'fr'): string {
    return buildItemPrompt(attributeNames, language);
  }

  newSeed(): string {
    return this.generator.newSeed();
  }

  generate(
    seed: string,
    attributeNames: readonly string[],
    pack?: string,
  ): Promise<ItemDraft> {
    return this.generator.generateFor(seed, attributeNames, pack);
  }

  /** The pack a seed draws from for a choice (a pack id or `'random'`). */
  packFor(seed: string, pack: string): Promise<string> {
    return this.generator.packFor(seed, pack);
  }
}
