import { computed, inject, Injectable } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { createSandboxWorld } from '../helpers/default-world';

/** The in-memory world the tools use outside a game, in the active language. Never saved nor hosted. */
@Injectable({ providedIn: 'root' })
export class SandboxWorldBusiness {
  private readonly language = inject(LanguageBusiness);

  readonly $world = computed(() =>
    createSandboxWorld((key) => this.language.t(key)),
  );
}
