import { TestBed } from '@angular/core/testing';
import { combatTable, Device } from '../../../../testing/combat-table';
import { DiceRollBusiness } from '../../dice/business/dice-roll.business';
import { CombatRollsBusiness } from './combat-rolls.business';

/**
 * Contract: `CombatRollsBusiness` (root, `CombatRollsBusiness` listed in `GAME_DEVICE` of `src/testing/game-device.ts`) follows the latest combat
 * shared roll of `DiceRollBusiness.$tableRolls()` (the ones carrying `combat`) on its own device.
 * - `$banner()`: null, or `{ caster, skillName, targets, result? }` (`caster` and each target: `{ name, side, portraitId? }`); `result` (`{ values, total, success }`) only once the roll has landed.
 * - `isLanding(pendingId)`: true from the roll's arrival until it landed. Landed = `DiceRollBusiness` shows that roll id and `$settled()`,
 *   or 6 s after the roll arrived. A pending id that belongs to no roll is not landing.
 * - The banner stays while any of the roll's `pendingIds` is still pending, then goes 4 s after the last one is resolved; with no pending
 *   (GM validation off) 4 s after landing. Timers are `setTimeout`/`clearTimeout`.
 */
describe('CombatRollsBusiness', () => {
  let table: Awaited<ReturnType<typeof combatTable>>;

  const rollsOf = (d: Device) => d.injector.get(CombatRollsBusiness);
  const diceOf = (d: Device) => d.injector.get(DiceRollBusiness);

  /** Lets the fake network and the signals run while the clock is faked. */
  const pump = async (ms = 0) => {
    await vi.advanceTimersByTimeAsync(ms);
    for (let i = 0; i < 5; i++) {
      TestBed.tick();
      await vi.advanceTimersByTimeAsync(0);
    }
  };
  const run = async <T>(call: Promise<T>) => {
    await pump();
    return call;
  };
  const cast = async () => {
    const use = table.combat(table.ada).useSkill({
      casterId: table.named(table.gm, 'Ada').id,
      skillId: table.fireballId,
      targetIds: [table.named(table.gm, 'Goblin').id],
    });
    await run(use);
  };
  /** The device throws the roll and its dice come to rest. */
  const land = async (d: Device) => {
    const roll = diceOf(d).takeUnseenTableRoll();
    if (roll) diceOf(d).presentShared(roll);
    diceOf(d).markSettled();
    await pump();
  };
  const pendingId = () => table.state(table.gm).pending[0].id;

  const begin = async (extra: Parameters<typeof combatTable>[1] = {}) => {
    table = await combatTable('free', extra);
    await table.start();
    for (const d of [table.gm, table.ada, table.bob]) rollsOf(d);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  };

  afterEach(() => {
    vi.useRealTimers();
    table.destroy();
  });

  it('has no banner before a combat roll', async () => {
    await begin();
    expect(rollsOf(table.gm).$banner()).toBeNull();
    expect(rollsOf(table.gm).isLanding('p1')).toBe(false);
  });

  it('shows who, which skill and the targets on every device at once, without the dice, while the roll is landing', async () => {
    await begin();

    await cast();

    for (const d of [table.gm, table.ada, table.bob]) {
      expect(rollsOf(d).$banner()).toEqual({
        caster: { name: 'Ada', side: 'party' },
        skillName: 'Fireball',
        targets: [{ name: 'Goblin', side: 'enemy' }],
      });
    }
    expect(rollsOf(table.gm).isLanding(pendingId())).toBe(true);
  });

  it('shows the dice and the total once the roll has landed on that device', async () => {
    await begin();
    await cast();

    await land(table.gm);

    expect(rollsOf(table.gm).$banner()?.result).toEqual({
      values: [1],
      total: 1,
      success: true,
    });
    expect(rollsOf(table.gm).isLanding(pendingId())).toBe(false);
    expect(rollsOf(table.bob).$banner()?.result).toBeUndefined();
  });

  it('keeps landing while the roll is shown but its dice still move', async () => {
    await begin();
    await cast();
    const roll = diceOf(table.gm).takeUnseenTableRoll()!;

    diceOf(table.gm).presentShared(roll);
    await pump();

    expect(rollsOf(table.gm).isLanding(pendingId())).toBe(true);
  });

  it('lands by itself 6 s after the roll arrived', async () => {
    await begin();
    await cast();

    await pump(5900);
    expect(rollsOf(table.gm).isLanding(pendingId())).toBe(true);
    await pump(200);

    expect(rollsOf(table.gm).isLanding(pendingId())).toBe(false);
    expect(rollsOf(table.gm).$banner()?.result).toMatchObject({ total: 1 });
  });

  it('stays while the result is pending, then fades 4 s after the GM resolves it', async () => {
    await begin();
    await cast();
    await land(table.gm);
    await pump(60_000);
    expect(rollsOf(table.gm).$banner()).not.toBeNull();
    expect(rollsOf(table.bob).$banner()).not.toBeNull();

    await run(table.combat(table.gm).apply(pendingId()));
    await pump(3900);
    expect(rollsOf(table.gm).$banner()).not.toBeNull();
    expect(rollsOf(table.bob).$banner()).not.toBeNull();
    await pump(200);

    expect(rollsOf(table.gm).$banner()).toBeNull();
    expect(rollsOf(table.bob).$banner()).toBeNull();
  });

  it('fades the same way when the GM dismisses the result', async () => {
    await begin();
    await cast();
    await land(table.gm);

    await run(table.combat(table.gm).dismiss(pendingId()));
    await pump(4100);

    expect(rollsOf(table.gm).$banner()).toBeNull();
  });

  it('with GM validation off, fades 4 s after landing and has no pending to wait for', async () => {
    await begin({
      steps: {
        initiative: true,
        actionCounters: true,
        gmValidation: false,
        defence: true,
        rewards: true,
      },
    });
    await cast();
    expect(table.state(table.gm).pending).toEqual([]);
    expect(rollsOf(table.gm).$banner()?.result).toBeUndefined();

    await land(table.gm);
    expect(rollsOf(table.gm).$banner()?.result).toMatchObject({ total: 1 });
    await pump(3900);
    expect(rollsOf(table.gm).$banner()).not.toBeNull();
    await pump(200);

    expect(rollsOf(table.gm).$banner()).toBeNull();
  });
});
