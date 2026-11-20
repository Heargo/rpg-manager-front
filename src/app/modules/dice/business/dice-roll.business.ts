import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { rollDice } from '../../../core/generators/dice';
import {
  createSeed,
  cryptoRandomSource,
} from '../../../core/generators/random-source';
import { planPool, ThrowPlan } from '../helpers/dice-plan';
import {
  DiceGroup,
  DicePool,
  poolNotation,
  poolRatio,
  rollTotal,
} from '../helpers/dice-pool.rules';
import { SharedRoll } from '../models/dice-api';
import { DiceService } from '../services/dice.service';

export const DICE_PRESETS = [4, 6, 8, 10, 12, 20, 100] as const;
const HISTORY_SIZE = 20;
/** A table roll that arrived longer ago than this isn't thrown again when the table opens. */
export const TABLE_ROLL_FRESH_MS = 10_000;

export interface DiceRoll {
  id: string;
  count: number;
  sides: number;
  values: number[];
  /** Each type of die and what it drew; `count`, `sides` and `values` are the first type's (all values for `values`). */
  groups: DiceGroup[];
  modifier: number;
  /** "2d6+1d4+3". */
  notation: string;
  /** The dice and the modifier. */
  total: number;
  /** 0 (worst) to 1 (best), for colouring. */
  ratio: number;
  at: number;
  plan: ThrowPlan;
  /** Set for a roll shared with the table: who rolled, and whether it was this device's player. */
  shared?: { name: string; mine: boolean };
  /** Set for the dice of a combat action: they can't be rolled again from the overlay. */
  combat?: true;
}

/** The dice roller: what to roll, the fair draw, the roll being shown and recent ones. */
@Injectable({ providedIn: 'root' })
export class DiceRollBusiness {
  private readonly service = inject(DiceService);
  private readonly profile = inject(ProfileBusiness);
  private readonly random = cryptoRandomSource();

  readonly $count = signal(1);
  readonly $sides = signal(20);
  /** The mixed pool being built on the dice screen (empty: roll `$count` d `$sides`). */
  readonly $pool = signal<DicePool>([]);
  readonly $modifier = signal(0);
  /** Roll for the whole table (off by default): the host draws and every player sees the throw. */
  readonly $shareWithTable = signal(false);
  /** True in a room whose host is reachable. */
  readonly $canShare = computed(() => this.service.canShare());
  /** The table's recent shared rolls, newest first; null outside a room. */
  readonly $tableRolls = toSignal<SharedRoll[] | null>(
    this.service.watchRolls(),
    { initialValue: null },
  );
  private readonly seenTableRolls = new Set<string>();
  private readonly current = signal<DiceRoll | null>(null);
  private readonly settled = signal(false);
  private readonly history = signal<DiceRoll[]>([]);

  /** The roll on the table (overlay open), null when closed. */
  readonly $current = this.current.asReadonly();
  readonly $settled = this.settled.asReadonly();
  readonly $history = this.history.asReadonly();
  readonly $notation = computed(() => `${this.$count()}d${this.$sides()}`);

  /** Draws the values (cryptographically, unbiased) and opens the table to show them. */
  roll(count = this.$count(), sides = this.$sides()): DiceRoll {
    return this.rollPool([{ sides, count }], 0);
  }

  /** Draws every die of the pool and opens the table to show them. */
  rollPool(pool: DicePool, modifier = 0): DiceRoll {
    return this.present({
      id: crypto.randomUUID(),
      groups: pool.map(({ sides, count }) => ({
        sides,
        count,
        values: rollDice(this.random, count, sides),
      })),
      modifier,
      seed: createSeed(this.random),
      at: Date.now(),
    });
  }

  /** Rolls what the dice screen holds: the pool when there is one, otherwise `$count` d `$sides`. */
  rollSelection(): DiceRoll {
    const pool = this.$pool();
    return pool.length
      ? this.rollPool(pool, this.$modifier())
      : this.roll(this.$count(), this.$sides());
  }

  /** `rollSelection`, for the table when sharing is on. */
  rollSelectionAtTable(): Promise<DiceRoll> {
    const pool = this.$pool();
    return pool.length
      ? this.rollPoolAtTable(pool, this.$modifier())
      : this.rollAtTable();
  }

  /** Rolls for the table when sharing is on and the host is reachable (the host draws), otherwise here. */
  async rollAtTable(
    count = this.$count(),
    sides = this.$sides(),
  ): Promise<DiceRoll> {
    return this.rollPoolAtTable([{ sides, count }], 0);
  }

  /** `rollPool` for the table when sharing is on and the host is reachable (the host draws), otherwise here. */
  async rollPoolAtTable(pool: DicePool, modifier = 0): Promise<DiceRoll> {
    if (!this.$shareWithTable() || !this.$canShare())
      return this.rollPool(pool, modifier);
    const shared = await this.service.roll({ pool, modifier });
    this.seenTableRolls.add(shared.id);
    return this.presentShared(shared);
  }

  /** "2d6+1d4+3" for a roll the table shared. */
  notationOf(roll: SharedRoll): string {
    const groups = roll.pool ?? [
      { sides: roll.sides, count: roll.count, values: roll.values },
    ];
    return poolNotation(groups, roll.modifier ?? 0);
  }

  /** The total of a roll the table shared, modifier included. */
  totalOf(roll: SharedRoll): number {
    return rollTotal(roll.values, roll.modifier ?? 0);
  }

  /** Rolls the same dice again, the same way as the roll being shown. */
  rollAgain(): Promise<DiceRoll> {
    const current = this.current();
    if (!current) return this.rollAtTable();
    const pool = current.groups.map(({ sides, count }) => ({ sides, count }));
    return current.shared
      ? this.rollPoolAtTable(pool, current.modifier)
      : Promise.resolve(this.rollPool(pool, current.modifier));
  }

  /**
   * A shared roll from someone else that this device hasn't thrown yet, at most once per roll. Rolls older than a
   * few seconds (made while this device was elsewhere) are only marked as seen. A combat roll comes back on the
   * device of whoever made it too.
   */
  takeUnseenTableRoll(): SharedRoll | null {
    const rolls = this.$tableRolls();
    if (!rolls) return null;
    const myId = this.profile.$profile().playerId;
    const now = Date.now();
    let unseen: SharedRoll | null = null;
    for (const roll of rolls) {
      if (this.seenTableRolls.has(roll.id)) continue;
      this.seenTableRolls.add(roll.id);
      if (
        !unseen &&
        (roll.combat || roll.by.playerId !== myId) &&
        now - roll.at < TABLE_ROLL_FRESH_MS
      )
        unseen = roll;
    }
    return unseen;
  }

  /** Throws a shared roll on this device: same values and same seed as everyone else. */
  presentShared(roll: SharedRoll): DiceRoll {
    const mine = roll.by.playerId === this.profile.$profile().playerId;
    const { id, count, sides, values, seed, at } = roll;
    return this.present({
      id,
      groups: roll.pool ?? [{ sides, count, values }],
      modifier: roll.modifier ?? 0,
      seed,
      at,
      shared: { name: roll.by.name, mine },
      ...(roll.combat ? { combat: true as const } : {}),
    });
  }

  private present(
    input: Pick<
      DiceRoll,
      'id' | 'groups' | 'modifier' | 'at' | 'shared' | 'combat'
    > & { seed: string },
  ): DiceRoll {
    const { seed, ...rest } = input;
    const values = input.groups.flatMap((group) => group.values);
    const roll: DiceRoll = {
      ...rest,
      count: values.length,
      sides: input.groups[0].sides,
      values,
      notation: poolNotation(input.groups, input.modifier),
      total: rollTotal(values, input.modifier),
      ratio: poolRatio(input.groups),
      plan: { dice: planPool(input.groups), seed },
    };
    this.settled.set(false);
    this.current.set(roll);
    this.history.update((rolls) =>
      [roll, ...rolls.filter((entry) => entry.id !== roll.id)].slice(
        0,
        HISTORY_SIZE,
      ),
    );
    return roll;
  }

  markSettled(): void {
    this.settled.set(true);
  }

  close(): void {
    this.current.set(null);
  }

  /** The 3D table, loaded on first use (three.js + Rapier stay out of the main bundle). */
  async createScene(canvas: HTMLCanvasElement) {
    const { DiceScene } = await import('../services/dice-scene');
    return DiceScene.create(canvas);
  }
}
