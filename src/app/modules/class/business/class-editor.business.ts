import { Injectable } from '@angular/core';
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
