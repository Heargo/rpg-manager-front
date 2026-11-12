import { Injectable } from '@angular/core';
import { World } from '../../world/models/world';
import {
  emptySkill,
  ParsedSkill,
  parseSkillJson,
  previewSkillAmount,
  SkillAmountPreview,
  SkillIssue,
  skillToJson,
  validateSkill,
} from '../helpers/skill.rules';
import { SkillDraft } from '../models/skill';

import { buildSkillPrompt } from '../helpers/skill-ai-prompt';

/** What the skill editor needs: checks, JSON and the live preview of an amount formula. */
@Injectable({ providedIn: 'root' })
export class SkillEditorBusiness {
  empty(): SkillDraft {
    return emptySkill();
  }

  validate(skill: SkillDraft, world: World): SkillIssue[] {
    return validateSkill(skill, this.names(world));
  }

  toJson(skill: SkillDraft): string {
    return skillToJson(skill);
  }

  parse(text: string, base: SkillDraft, world: World): ParsedSkill {
    return parseSkillJson(text, base, this.names(world));
  }

  preview(amount: string, world: World, maxRank: number): SkillAmountPreview {
    return previewSkillAmount(amount, this.names(world), maxRank);
  }

  private names(world: World): string[] {
    return world.attributes.map((attribute) => attribute.name);
  }

  prompt(attributeNames: readonly string[], language: 'en' | 'fr'): string {
    return buildSkillPrompt(attributeNames, language);
  }
}
