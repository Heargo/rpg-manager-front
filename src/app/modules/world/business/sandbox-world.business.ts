import { inject, Injectable, linkedSignal } from '@angular/core';
import { LanguageBusiness } from '../../../core/business/language.business';
import { createSandboxWorld } from '../helpers/default-world';
import { applyWorldRules } from '../helpers/world-rules.rules';
import { Npc } from '../../npc/models/npc';
import { CharacterClass } from '../../class/models/class';
import { Skill } from '../../skill/models/skill';
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

  /** Changes the sandbox NPCs, in memory. */
  updateNpcs(change: (npcs: Npc[]) => Npc[]): void {
    this.world.update((world) => ({ ...world, npcs: change(world.npcs) }));
  }

  /** Changes the sandbox skills, in memory. */
  updateSkills(change: (skills: Skill[]) => Skill[]): void {
    this.world.update((world) => ({ ...world, skills: change(world.skills) }));
  }

  /** Changes the sandbox classes, in memory. */
  updateClasses(change: (classes: CharacterClass[]) => CharacterClass[]): void {
    this.world.update((world) => ({ ...world, classes: change(world.classes) }));
  }
}
