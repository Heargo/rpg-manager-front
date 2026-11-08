import { inject, Injectable } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { SandboxWorldBusiness } from '../../world/business/sandbox-world.business';
import {
  buildStarterClasses,
  mergeStarterClasses,
} from '../../world/helpers/starter-classes';
import {
  addClassCopy,
  filterClasses,
  upsertClass,
} from '../../class/helpers/class.rules';
import {
  CharacterClass,
  ClassDraft,
  ClassFilter,
} from '../../class/models/class';

/**
 * The class catalogue page's stand-in for `ClassCatalogueBusiness` in the Tools: edits the shared sandbox world in
 * memory, nothing is saved. Provided by the tool route.
 */
@Injectable()
export class SandboxClassCatalogueBusiness {
  private readonly sandbox = inject(SandboxWorldBusiness);

  private readonly language = inject(LanguageBusiness);

  readonly $world = this.sandbox.$world;

  list(filter: ClassFilter): CharacterClass[] {
    return filterClasses(this.$world().classes, filter);
  }

  async save(input: ClassDraft): Promise<CharacterClass> {
    let saved!: CharacterClass;
    this.sandbox.updateClasses((classes) => {
      const result = upsertClass(classes, input, () => crypto.randomUUID());
      saved = result.characterClass;
      return result.classes;
    });
    return saved;
  }

  async duplicate(classId: string): Promise<void> {
    this.sandbox.updateClasses((classes) =>
      addClassCopy(
        classes,
        classId,
        () => crypto.randomUUID(),
        ` ${this.language.t('class.catalogue.copySuffix')}`,
      ),
    );
  }

  /** Adds the starter classes and skills; the ones the sandbox already has (by name) are kept. */
  async addDefaults(): Promise<void> {
    const world = this.sandbox.$world();
    const merged = mergeStarterClasses(
      { skills: world.skills, classes: world.classes },
      buildStarterClasses(world, this.language.$language(), () =>
        crypto.randomUUID(),
      ),
    );
    this.sandbox.updateSkills(() => merged.skills);
    this.sandbox.updateClasses(() => merged.classes);
  }

  async remove(classId: string): Promise<void> {
    this.sandbox.updateClasses((classes) =>
      classes.filter((entry) => entry.id !== classId),
    );
  }
}
