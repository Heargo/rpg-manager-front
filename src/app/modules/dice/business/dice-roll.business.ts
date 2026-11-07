import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { rollDice } from '../../../core/generators/dice';
import { createSeed, cryptoRandomSource } from '../../../core/generators/random-source';
import { planDice, ThrowPlan, totalRatio } from '../helpers/dice-plan';
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
  total: number;
  /** 0 (worst) to 1 (best), for colouring. */
  ratio: number;
  at: number;
  plan: ThrowPlan;
  /** Set for a roll shared with the table: who rolled, and whether it was this device's player. */
  shared?: { name: string; mine: boolean };
}

/** The dice roller: what to roll, the fair draw, the roll being shown and recent ones. */
@Injectable({ providedIn: 'root' })
export class DiceRollBusiness {
  private readonly service = inject(DiceService);
  private readonly profile = inject(ProfileBusiness);
  private readonly random = cryptoRandomSource();

  readonly $count = signal(1);
  readonly $sides = signal(20);
  /** Roll for the whole table (off by default): the host draws and every player sees the throw. */
  readonly $shareWithTable = signal(false);
  /** True in a room whose host is reachable. */
  readonly $canShare = computed(() => this.service.canShare());
  /** The table's recent shared rolls, newest first; null outside a room. */
  readonly $tableRolls = toSignal<SharedRoll[] | null>(this.service.watchRolls(), { initialValue: null });
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
    const values = rollDice(this.random, count, sides);
    return this.present({ id: crypto.randomUUID(), count, sides, values, seed: createSeed(this.random), at: Date.now() });
  }

  /** Rolls for the table when sharing is on and the host is reachable (the host draws), otherwise here. */
  async rollAtTable(count = this.$count(), sides = this.$sides()): Promise<DiceRoll> {
    if (!this.$shareWithTable() || !this.$canShare()) return this.roll(count, sides);
    const shared = await this.service.roll({ count, sides });
    this.seenTableRolls.add(shared.id);
    return this.presentShared(shared);
  }

  /** Rolls the same dice again, the same way as the roll being shown. */
  rollAgain(): Promise<DiceRoll> {
    const current = this.current();
    if (!current) return this.rollAtTable();
    return current.shared ? this.rollAtTable(current.count, current.sides) : Promise.resolve(this.roll(current.count, current.sides));
  }

  /**
   * A shared roll from someone else that this device hasn't thrown yet, at most once per roll. Rolls older than a
   * few seconds (made while this device was elsewhere) are only marked as seen.
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
      if (!unseen && roll.by.playerId !== myId && now - roll.at < TABLE_ROLL_FRESH_MS) unseen = roll;
    }
    return unseen;
  }

  /** Throws a shared roll on this device: same values and same seed as everyone else. */
  presentShared(roll: SharedRoll): DiceRoll {
    const mine = roll.by.playerId === this.profile.$profile().playerId;
    const { id, count, sides, values, seed, at } = roll;
    return this.present({ id, count, sides, values, seed, at, shared: { name: roll.by.name, mine } });
  }

  private present(input: Pick<DiceRoll, 'id' | 'count' | 'sides' | 'values' | 'at' | 'shared'> & { seed: string }): DiceRoll {
    const { seed, ...rest } = input;
    const roll: DiceRoll = {
      ...rest,
      total: input.values.reduce((sum, value) => sum + value, 0),
      ratio: totalRatio(input.values, input.sides),
      plan: { dice: planDice(input.sides, input.values), seed },
    };
    this.settled.set(false);
    this.current.set(roll);
    this.history.update((rolls) => [roll, ...rolls.filter((entry) => entry.id !== roll.id)].slice(0, HISTORY_SIZE));
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
