import { effect, inject, Injectable, linkedSignal } from '@angular/core';
import { ActivePacksBusiness } from '../../../core/business/active-packs.business';
import { LanguageBusiness } from '../../../core/business/language.business';
import { basePackId } from '../../../core/business/pack.business';
import { createSandboxWorld, SANDBOX_WORLD_ID } from '../helpers/default-world';
// Static on purpose: the sandbox world only loads in the lazy Tools chunks, never in the initial bundle.
import { buildStarterClasses } from '../helpers/starter-classes';
import { applyWorldRules } from '../helpers/world-rules.rules';
import { Npc } from '../../npc/models/npc';
import { CharacterClass } from '../../class/models/class';
import { Skill } from '../../skill/models/skill';
import { World, WorldRules } from '../models/world';
import { WorldSessionBusiness } from './world-session.business';

/**
 * The in-memory world the tools use outside a game, in the active language. Never saved nor hosted. Edited rules
 * last until the language changes (names are in the active language).
 */
@Injectable({ providedIn: 'root' })
export class SandboxWorldBusiness {
  private readonly language = inject(LanguageBusiness);
  private readonly activePacks = inject(ActivePacksBusiness);
  private readonly session = inject(WorldSessionBusiness);

  private readonly world = linkedSignal<World>(() => {
    const world = createSandboxWorld((key) => this.language.t(key));
    let next = 0;
    return {
      ...world,
      packs: [basePackId(this.language.$language())],
      ...buildStarterClasses(
        world,
        this.language.$language(),
        () => `${SANDBOX_WORLD_ID}-starter-${next++}`,
      ),
    };
  });

  readonly $world = this.world.asReadonly();

  constructor() {
    // The tools' generators follow the sandbox packs, unless a game world is open (it has its own packs).
    effect(() => this.publishPacks());
  }

  private publishPacks(): void {
    if (!this.session.$world()) this.activePacks.set(this.world().packs ?? []);
  }

  /** Applies edited rules to the sandbox world, in memory. */
  applyRules(rules: WorldRules): World {
    const next = applyWorldRules(this.world(), rules, () =>
      crypto.randomUUID(),
    );
    this.world.set(next);
    this.publishPacks();
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
