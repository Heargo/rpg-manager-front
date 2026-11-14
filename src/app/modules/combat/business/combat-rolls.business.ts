import {
  computed,
  effect,
  inject,
  Injectable,
  Injector,
  signal,
  untracked,
} from '@angular/core';
import {
  DiceRollBusiness,
  TABLE_ROLL_FRESH_MS,
} from '../../dice/business/dice-roll.business';
import { SharedRoll } from '../../dice/models/dice-api';
import { CombatBusiness } from './combat.business';

/** A roll that never reached the end of its throw (no 3D, slow device) counts as landed after this long. */
export const LANDING_FALLBACK_MS = 6000;
/** The banner stays this long once the result is resolved. */
export const BANNER_FADE_MS = 4000;

export interface CombatBanner {
  casterName: string;
  skillName: string;
  targetNames: string[];
  /** Only once the dice have landed on this device. */
  result?: { values: number[]; total: number; success: boolean };
}

interface Followed {
  roll: SharedRoll & { combat: NonNullable<SharedRoll['combat']> };
  landed: boolean;
  gone: boolean;
}

const isCombat = (roll: SharedRoll): roll is Followed['roll'] =>
  roll.combat !== undefined;

/** Follows the latest combat roll of the table: the recap banner, and when its dice have landed on this device. */
@Injectable({ providedIn: 'root' })
export class CombatRollsBusiness {
  private readonly dice = inject(DiceRollBusiness);
  private readonly injector = inject(Injector);
  private readonly local = signal<SharedRoll | null>(null);
  private readonly followed = signal<Followed | null>(null);
  private landingTimer?: ReturnType<typeof setTimeout>;
  private fadeTimer?: ReturnType<typeof setTimeout>;

  private readonly latest = computed(
    () => this.local() ?? this.dice.$tableRolls()?.find(isCombat) ?? null,
  );

  /** The recap of the latest combat roll, null when there is none (or it faded). */
  readonly $banner = computed<CombatBanner | null>(() => {
    const followed = this.followed();
    if (!followed || followed.gone) return null;
    const { combat, values } = followed.roll;
    return {
      casterName: combat.casterName,
      skillName: combat.skillName,
      targetNames: combat.targetNames,
      ...(followed.landed
        ? {
            result: { values, total: combat.total, success: combat.success },
          }
        : {}),
    };
  });

  /** True while the dice of the roll that made this pending result are still on their way. */
  isLanding(pendingId: string): boolean {
    const followed = this.followed();
    return (
      !!followed &&
      !followed.landed &&
      followed.roll.combat.pendingIds.includes(pendingId)
    );
  }

  constructor() {
    effect(() => {
      const roll = this.latest();
      untracked(() => {
        if (!roll || !isCombat(roll)) return;
        if (this.followed()?.roll.id === roll.id) return;
        if (Date.now() - roll.at > TABLE_ROLL_FRESH_MS) return;
        this.follow(roll);
      });
    });
    effect(() => {
      const followed = this.followed();
      const shown = this.dice.$current();
      const settled = this.dice.$settled();
      if (
        followed &&
        !followed.landed &&
        shown?.id === followed.roll.id &&
        settled
      )
        untracked(() => this.land());
    });
    effect(() => {
      const followed = this.followed();
      const waiting = this.waiting();
      untracked(() => {
        if (followed?.landed && !followed.gone && !waiting) {
          this.fadeTimer ??= setTimeout(
            () => this.followed.update((f) => (f ? { ...f, gone: true } : f)),
            BANNER_FADE_MS,
          );
        } else {
          clearTimeout(this.fadeTimer);
          this.fadeTimer = undefined;
        }
      });
    });
  }

  /** Plays a combat roll made on this device alone (the Tools sandbox, no room). */
  present(roll: SharedRoll): void {
    this.local.set(roll);
    this.dice.presentShared(roll);
  }

  /**
   * True while one of the roll's results still waits for the GM. It reads the `CombatBusiness` of its own injector, so
   * the sandbox's instance sees the sandbox encounter (and the banner fades 4 s after landing when nothing is pending).
   */
  private waiting(): boolean {
    const followed = this.followed();
    if (!followed) return false;
    const pending = this.injector.get(CombatBusiness).$state()?.pending ?? [];
    return pending.some((p) => followed.roll.combat.pendingIds.includes(p.id));
  }

  private follow(roll: Followed['roll']): void {
    clearTimeout(this.landingTimer);
    clearTimeout(this.fadeTimer);
    this.fadeTimer = undefined;
    this.followed.set({ roll, landed: false, gone: false });
    this.landingTimer = setTimeout(() => this.land(), LANDING_FALLBACK_MS);
  }

  private land(): void {
    clearTimeout(this.landingTimer);
    this.followed.update((f) => (f && !f.landed ? { ...f, landed: true } : f));
  }
}
