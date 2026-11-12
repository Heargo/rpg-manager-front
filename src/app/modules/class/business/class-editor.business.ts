import { inject, Injectable } from '@angular/core';
import { WordListBusiness } from '../../../core/business/word-list.business';
import { generateClass } from '../../../core/generators/class-generator';
import { createSeed, seededRandomSource } from '../../../core/generators/random-source';
import { World } from '../../world/models/world';
import {
  ClassIssue,
  classToJson,
  emptyClass,
  ParsedClass,
  parseClassJson,
  validateClass,
} from '../helpers/class.rules';
import { ClassDraft } from '../models/class';

import { buildClassPrompt } from '../helpers/class-ai-prompt';

/** What the class editor needs: checks and JSON. */
@Injectable({ providedIn: 'root' })
export class ClassEditorBusiness {
  private readonly words = inject(WordListBusiness);

  /** A new random class on the world's attributes and skills, in the active language. */
  async random(world: World): Promise<ClassDraft> {
    return generateClass(
      seededRandomSource(createSeed()),
      this.names(world),
      world.skills,
      await this.words.classWords(),
    );
  }

  empty(): ClassDraft {
    return emptyClass();
  }

  validate(characterClass: ClassDraft, world: World): ClassIssue[] {
    return validateClass(characterClass, world.skills, this.names(world));
  }

  toJson(characterClass: ClassDraft): string {
    return classToJson(characterClass);
  }

  parse(text: string, base: ClassDraft, world: World): ParsedClass {
    return parseClassJson(text, base, world.skills, this.names(world));
  }

  private names(world: World): string[] {
    return world.attributes.map((attribute) => attribute.name);
  }

  prompt(attributeNames: readonly string[], language: 'en' | 'fr'): string {
    return buildClassPrompt(attributeNames, language);
  }
}
