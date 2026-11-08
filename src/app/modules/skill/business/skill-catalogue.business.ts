import { inject, Injectable } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import {
  addSkillCopy,
  filterSkills,
  skillUsages,
  upsertSkill,
} from '../helpers/skill.rules';
import { Skill, SkillDraft, SkillFilter, SkillUsage } from '../models/skill';

/** The outcome of a delete: refused (and where the skill is used) while a character or an NPC has it. */
export interface SkillRemoval {
  removed: boolean;
  usages: SkillUsage[];
}

/** Game master: the skills of the hosted world, saved with the world and never sent to players. */
@Injectable({ providedIn: 'root' })
export class SkillCatalogueBusiness {
  private readonly session = inject(WorldSessionBusiness);

  private readonly language = inject(LanguageBusiness);

  readonly $world = this.session.$world;

  list(filter: SkillFilter): Skill[] {
    return filterSkills(this.$world()?.skills ?? [], filter);
  }

  /** Adds the skill (new id) or replaces it (same id), and saves the world. */
  async save(input: SkillDraft): Promise<Skill> {
    let saved: Skill | undefined;
    await this.session.update((world) => {
      const result = upsertSkill(world.skills, input, () =>
        crypto.randomUUID(),
      );
      saved = result.skill;
      return { ...world, skills: result.skills };
    });
    return saved!;
  }

  async duplicate(skillId: string): Promise<void> {
    await this.session.update((world) => ({
      ...world,
      skills: addSkillCopy(
        world.skills,
        skillId,
        () => crypto.randomUUID(),
        ` ${this.language.t('skill.catalogue.copySuffix')}`,
      ),
    }));
  }

  /** Deletes an unused skill; a skill a sheet has stays, and its usages are returned. */
  async remove(skillId: string): Promise<SkillRemoval> {
    let usages: SkillUsage[] = [];
    await this.session.update((world) => {
      usages = skillUsages(skillId, world);
      return usages.length
        ? world
        : {
            ...world,
            skills: world.skills.filter((skill) => skill.id !== skillId),
          };
    });
    return { removed: !usages.length, usages };
  }
}
