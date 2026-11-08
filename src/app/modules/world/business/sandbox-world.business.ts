import { inject, Injectable, linkedSignal } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { createSandboxWorld } from '../helpers/default-world';
import { applyWorldRules } from '../helpers/world-rules.rules';
import { World, WorldRules } from '../models/world';

/**
 * The in-memory world the tools use outside a game, in the active language. Never saved nor hosted. Edited rules
 * last until the language changes (names are in the active language).
 */
@Injectable({ providedIn: 'root' })
export class SandboxWorldBusiness {
  private readonly language = inject(LanguageBusiness);

  private readonly world = linkedSignal<World>(() =>
    createSandboxWorld((key) => this.language.t(key)),
  );

  readonly $world = this.world.asReadonly();

  /** Applies edited rules to the sandbox world, in memory. */
  applyRules(rules: WorldRules): World {
    const next = applyWorldRules(this.world(), rules, () =>
      crypto.randomUUID(),
    );
    this.world.set(next);
    return next;
  }
}
