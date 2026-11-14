import { computed, inject, Injectable, signal } from '@angular/core';
import { CombatBusiness } from './combat.business';

/** The combatant the game master picked on this device, shared by the turn order (pick) and the panel (manual edits). */
@Injectable({ providedIn: 'root' })
export class CombatSelectionBusiness {
  private readonly combat = inject(CombatBusiness);
  /** The pick and whether an encounter was running when it was made. */
  private readonly picked = signal<{ id: string; running: boolean } | null>(
    null,
  );

  /** The pick; forgotten as soon as an encounter starts or ends. */
  readonly $selectedId = computed(() => {
    const pick = this.picked();
    return pick && pick.running === !!this.combat.$state() ? pick.id : null;
  });

  toggle(id: string): void {
    this.picked.set(
      this.$selectedId() === id
        ? null
        : { id, running: !!this.combat.$state() },
    );
  }

  clear(): void {
    this.picked.set(null);
  }
}
