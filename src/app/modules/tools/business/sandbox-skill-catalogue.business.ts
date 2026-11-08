import { inject, Injectable } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { SandboxWorldBusiness } from '../../world/business/sandbox-world.business';
import { SkillRemoval } from '../../skill/business/skill-catalogue.business';
import {
  addSkillCopy,
  filterSkills,
  skillUsages,
  upsertSkill,
} from '../../skill/helpers/skill.rules';
import { Skill, SkillDraft, SkillFilter } from '../../skill/models/skill';

/**
 * The skill catalogue page's stand-in for `SkillCatalogueBusiness` in the Tools: edits the shared sandbox world in
 * memory, nothing is saved. Provided by the tool route.
 */
@Injectable()
export class SandboxSkillCatalogueBusiness {
  private readonly sandbox = inject(SandboxWorldBusiness);

  private readonly language = inject(LanguageBusiness);

  readonly $world = this.sandbox.$world;

  list(filter: SkillFilter): Skill[] {
    return filterSkills(this.$world().skills, filter);
  }

  /** Adds the skill (new id) or replaces it (same id), in memory. */
  async save(input: SkillDraft): Promise<Skill> {
    let saved!: Skill;
    this.sandbox.updateSkills((skills) => {
      const result = upsertSkill(skills, input, () => crypto.randomUUID());
      saved = result.skill;
      return result.skills;
    });
    return saved;
  }

  async duplicate(skillId: string): Promise<void> {
    this.sandbox.updateSkills((skills) =>
      addSkillCopy(
        skills,
        skillId,
        () => crypto.randomUUID(),
        ` ${this.language.t('skill.catalogue.copySuffix')}`,
      ),
    );
  }

  async remove(skillId: string): Promise<SkillRemoval> {
    const usages = skillUsages(skillId, this.$world());
    if (!usages.length)
      this.sandbox.updateSkills((skills) =>
        skills.filter((skill) => skill.id !== skillId),
      );
    return { removed: !usages.length, usages };
  }
}
