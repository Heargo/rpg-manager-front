import { computed, Injectable, signal } from '@angular/core';
import { rollDice } from '../../../core/generators/dice';
import { createSeed, cryptoRandomSource } from '../../../core/generators/random-source';
import { planDice, ThrowPlan, totalRatio } from '../helpers/dice-plan';

export const DICE_PRESETS = [4, 6, 8, 10, 12, 20, 100] as const;
const HISTORY_SIZE = 20;

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
}

/** The dice roller: what to roll, the fair draw, the roll being shown and recent ones. */
@Injectable({ providedIn: 'root' })
export class DiceRollBusiness {
  private readonly random = cryptoRandomSource();

  readonly $count = signal(1);
  readonly $sides = signal(20);
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
    const roll: DiceRoll = {
      id: crypto.randomUUID(),
      count,
      sides,
      values,
      total: values.reduce((sum, value) => sum + value, 0),
      ratio: totalRatio(values, sides),
      at: Date.now(),
      plan: { dice: planDice(sides, values), seed: createSeed(this.random) },
    };
    this.settled.set(false);
    this.current.set(roll);
    this.history.update((rolls) => [roll, ...rolls].slice(0, HISTORY_SIZE));
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
