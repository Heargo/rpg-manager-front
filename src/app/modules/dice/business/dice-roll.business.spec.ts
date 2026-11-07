import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NEVER } from 'rxjs';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { DiceService } from '../services/dice.service';
import { MAX_THROWN_DICE, planDice, totalRatio } from '../helpers/dice-plan';
import { DiceRollBusiness } from './dice-roll.business';

describe('DiceRollBusiness', () => {
  let dice: DiceRollBusiness;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileBusiness, useValue: { $profile: signal({ playerId: 'me', name: 'Me' }) } },
        { provide: DiceService, useValue: { canShare: () => false, watchRolls: () => NEVER } },
      ],
    });
    dice = TestBed.inject(DiceRollBusiness);
  });

  it('rolls the configured dice, opens the table and keeps a history', () => {
    dice.$count.set(3);
    dice.$sides.set(6);

    const roll = dice.roll();

    expect(roll.values).toHaveLength(3);
    expect(roll.values.every((v) => v >= 1 && v <= 6)).toBe(true);
    expect(roll.total).toBe(roll.values.reduce((a, b) => a + b, 0));
    expect(roll.plan.dice.map((d) => d.value)).toEqual(roll.values);
    expect(dice.$current()).toBe(roll);
    expect(dice.$settled()).toBe(false);
    expect(dice.$history()[0]).toBe(roll);

    dice.markSettled();
    expect(dice.$settled()).toBe(true);
    dice.close();
    expect(dice.$current()).toBeNull();
  });

  it('throws two d10s per d100 value, showing tens and units', () => {
    const plan = planDice(100, [57, 100, 3]);
    expect(plan.map((d) => d.text)).toEqual(['50', '7', '00', '0', '00', '3']);
  });

  it('throws at most 20 dice but keeps every value', () => {
    const roll = dice.roll(30, 6);
    expect(roll.values).toHaveLength(30);
    expect(roll.plan.dice).toHaveLength(MAX_THROWN_DICE);
    expect(planDice(100, Array(15).fill(42))).toHaveLength(20);
  });

  it('rates totals from worst to best', () => {
    expect(totalRatio([1, 1], 6)).toBe(0);
    expect(totalRatio([6, 6], 6)).toBe(1);
    expect(totalRatio([3, 4], 6)).toBe(0.5);
  });
});
