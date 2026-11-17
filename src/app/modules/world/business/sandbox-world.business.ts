import { effect, inject, untracked, Injectable, linkedSignal } from '@angular/core';
import { ActivePacksBusiness } from '../../../core/business/active-packs.business';
import { LanguageBusiness } from '../../../core/business/language.business';
import { basePackId, packLanguageOf } from '../../../core/business/pack.business';
import { createSandboxWorld } from '../helpers/default-world';
import { applyWorldRules } from '../helpers/world-rules.rules';
import { Npc } from '../../npc/models/npc';
import { CharacterClass } from '../../class/models/class';
import { Skill } from '../../skill/models/skill';
import { World, WorldRules } from '../models/world';
import { PackContentApplier } from './pack-content-applier.business';
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
  private readonly contentApplier = inject(PackContentApplier);

  private readonly world = linkedSignal<World>(() => {
    const world = {
      ...createSandboxWorld((key) => this.language.t(key)),
      packs: [basePackId(this.language.$language())],
      language: packLanguageOf(this.language.$language()),
    };
    this.importBase(world).catch((error) => console.error('Sandbox: the Base import failed', error));
    return world;
  });

  readonly $world = this.world.asReadonly();

  constructor() {
    // The tools' generators follow the sandbox packs, unless a game world is open (it has its own packs).
    this.publishPacks();
    effect(() => this.publishPacks());
  }

  /** Fills the sandbox with the classes and skills of its Base pack, unless the language changed or skills and classes were added meanwhile. */
  private async importBase(base: World): Promise<void> {
    const filled = await this.contentApplier.applyAndSkipMissing(base, { domains: ['skills', 'classes'] });
    const current = untracked(() => this.world());
    // Rules edited meanwhile: still filled in, unless the language changed or the GM already added some.
    if (current.packs?.[0] !== base.packs?.[0] || current.skills.length || current.classes.length) return;
    this.world.set({ ...current, skills: filled.skills, classes: filled.classes });
  }

  private publishPacks(): void {
    if (!this.session.$world()) this.activePacks.set(this.world().packs ?? [], this.world().language);
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
