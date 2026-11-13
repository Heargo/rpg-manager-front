import { computed, Injectable, signal } from '@angular/core';
import { Skill } from '../../skill/models/skill';
import { setTargets, toggleTarget } from '../helpers/combat-targeting.rules';

export interface Casting {
  casterId: string;
  skill: Skill;
  targets: string[];
}

/** The skill being aimed on this device and its targets, shared by the action lists (chips) and the grid (cells, tokens). */
@Injectable({ providedIn: 'root' })
export class CombatTargetingBusiness {
  private readonly casting = signal<Casting | null>(null);

  readonly $casting = this.casting.asReadonly();
  readonly $skillId = computed(() => this.casting()?.skill.id);

  start(casterId: string, skill: Skill, targets: string[]): void {
    this.casting.set({ casterId, skill, targets });
  }

  toggle(id: string): void {
    const cast = this.casting();
    if (cast)
      this.casting.set({
        ...cast,
        targets: toggleTarget(cast.skill, cast.targets, id),
      });
  }

  /** Replaces the picked targets (from the multi-select). */
  set(ids: string[]): void {
    const cast = this.casting();
    if (cast)
      this.casting.set({
        ...cast,
        targets: setTargets(cast.skill, cast.targets, ids),
      });
  }

  clear(): void {
    this.casting.set(null);
  }
}
