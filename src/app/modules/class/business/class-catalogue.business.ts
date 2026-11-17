import { inject, Injectable } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import {
  addClassCopy,
  filterClasses,
  upsertClass,
} from '../helpers/class.rules';
import { CharacterClass, ClassDraft, ClassFilter } from '../models/class';

/** Game master: the classes of the hosted world, saved with the world and never sent to players. */
@Injectable({ providedIn: 'root' })
export class ClassCatalogueBusiness {
  private readonly session = inject(WorldSessionBusiness);

  private readonly language = inject(LanguageBusiness);

  readonly $world = this.session.$world;

  list(filter: ClassFilter): CharacterClass[] {
    return filterClasses(this.$world()?.classes ?? [], filter);
  }

  /** Adds the class (new id) or replaces it (same id), and saves the world. */
  async save(input: ClassDraft): Promise<CharacterClass> {
    let saved: CharacterClass | undefined;
    await this.session.update((world) => {
      const result = upsertClass(world.classes, input, () =>
        crypto.randomUUID(),
      );
      saved = result.characterClass;
      return { ...world, classes: result.classes };
    });
    return saved!;
  }

  async duplicate(classId: string): Promise<void> {
    await this.session.update((world) => ({
      ...world,
      classes: addClassCopy(
        world.classes,
        classId,
        () => crypto.randomUUID(),
        ` ${this.language.t('class.catalogue.copySuffix')}`,
      ),
    }));
  }

  async remove(classId: string): Promise<void> {
    await this.session.update((world) => ({
      ...world,
      classes: world.classes.filter((entry) => entry.id !== classId),
    }));
  }
}
