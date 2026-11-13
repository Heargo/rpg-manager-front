import { RandomSource } from '../../../core/generators/random-source';
import { rollDice } from '../../../core/generators/dice';
import { evaluateFormula, normalizeName } from '../../../core/helpers/formula';
import { attributeStats } from '../../character/helpers/character-stats';
import { resolveSkillUse, rollOf } from '../../skill/helpers/skill-roll.rules';
import { evaluateSkillAmount } from '../../skill/helpers/skill.rules';
import { Skill } from '../../skill/models/skill';
import { Npc } from '../../npc/models/npc';
import {
  Character,
  CombatRules,
  InventoryItem,
  Sheet,
  World,
} from '../../world/models/world';
import {
  Combatant,
  CombatSide,
  Encounter,
  EncounterState,
  PendingEffect,
} from '../models/combat';

export type CombatError =
  | 'life-attribute-required'
  | 'no-combatants'
  | 'character-not-found'
  | 'npc-not-found'
  | 'caster-not-found'
  | 'skill-not-known'
  | 'skill-not-active'
  | 'target-not-found';

export type CombatResult<T> =
  { ok: true; encounter: T } | { ok: false; error: CombatError };

export interface EncounterPicks {
  characterIds: string[];
  npcs: { npcId: string; count: number; side: Exclude<CombatSide, 'party'> }[];
}

/** The dice of a roll; a one-sided die is not random, so it is just its only face. */
const roll = (random: RandomSource, count: number, faces: number): number[] =>
  faces === 1 ? Array<number>(count).fill(1) : rollDice(random, count, faces);

const same = (a: string, b: string) => normalizeName(a) === normalizeName(b);

/** Records the change as one undo step. */
function commit(enc: Encounter, next: EncounterState): Encounter {
  const { previous: _previous, ...before } = enc;
  return { ...next, previous: before };
}

const maximaOf = (combatant: Combatant): Record<string, number> =>
  Object.fromEntries(combatant.attributes.map((a) => [a.name, a.max]));

const withDown = (combatant: Combatant, lifeAttribute: string): Combatant => {
  const life = combatant.attributes.find((a) => same(a.name, lifeAttribute));
  return { ...combatant, down: !!life && life.current <= 0 };
};

function updateCombatant(
  enc: Encounter,
  id: string,
  change: (combatant: Combatant) => Combatant,
): Encounter {
  if (!enc.combatants.some((c) => c.id === id)) return enc;
  return commit(enc, {
    ...enc,
    combatants: enc.combatants.map((c) =>
      c.id === id ? withDown(change(c), enc.lifeAttribute) : c,
    ),
  });
}

function changeAttribute(
  combatant: Combatant,
  name: string,
  change: (current: number, max: number) => { current: number; max?: number },
): Combatant {
  return {
    ...combatant,
    attributes: combatant.attributes.map((a) => {
      if (!same(a.name, name)) return a;
      const next = change(a.current, a.max);
      const max = Math.max(0, next.max ?? a.max);
      return { ...a, max, current: Math.max(0, Math.min(next.current, max)) };
    }),
  };
}

function combatantFrom(
  world: World,
  sheet: Sheet,
  extra: Pick<Combatant, 'id' | 'name' | 'side'> &
    Partial<Pick<Combatant, 'characterId' | 'npcId'>>,
  bonuses: Character['classBonuses'],
): Combatant {
  const stats = attributeStats(
    world.attributes,
    sheet,
    world.barAttributes,
    world.skills,
    bonuses ?? [],
  );
  const npc = sheet as Partial<Npc>;
  return {
    ...extra,
    level: sheet.level,
    attributes: stats.map((s) => ({
      name: s.name,
      current: s.current,
      max: s.max,
    })),
    skills: sheet.skills.map((s) => ({ ...s })),
    cooldowns: {},
    actions: world.combat.steps.actionCounters
      ? world.combat.actionTypes.map((a) => ({ ...a, used: 0 }))
      : [],
    effects: [],
    statuses: [],
    down: false,
    xpReward: npc.xpReward ?? 0,
    money: sheet.money,
    loot: (npc.loot ?? [])
      .map((id) => sheet.inventory.find((entry) => entry.id === id))
      .filter((entry): entry is InventoryItem => !!entry)
      .map((entry) => structuredClone(entry)),
  };
}

/** Numbered copy names: "Goblin" alone, then "Goblin 2", "Goblin 3"… */
function copyName(
  base: string,
  taken: string[],
  count: number,
  index: number,
): string {
  if (count === 1 && !taken.some((name) => same(name, base))) return base;
  const used = new Set(taken.map((name) => normalizeName(name)));
  let n = index;
  while (used.has(normalizeName(`${base} ${n}`))) n++;
  return `${base} ${n}`;
}

/** An encounter from characters and NPC copies ("Goblin 1..3"), at round 1, in the order given. */
export function startEncounter(
  world: World,
  picks: EncounterPicks,
  newId: () => string,
): CombatResult<Encounter> {
  const life = world.attributes.find(
    (a) =>
      world.combat.lifeAttribute !== undefined &&
      same(a.name, world.combat.lifeAttribute),
  );
  if (!life) return { ok: false, error: 'life-attribute-required' };
  const combatants: Combatant[] = [];
  for (const id of picks.characterIds) {
    const character = world.characters.find((c) => c.id === id);
    if (!character) return { ok: false, error: 'character-not-found' };
    combatants.push(
      combatantFrom(
        world,
        character,
        {
          id: newId(),
          name: character.name,
          side: 'party',
          characterId: character.id,
        },
        character.classBonuses,
      ),
    );
  }
  for (const pick of picks.npcs) {
    const npc = world.npcs.find((n) => n.id === pick.npcId);
    if (!npc) return { ok: false, error: 'npc-not-found' };
    const taken = combatants.map((c) => c.name);
    for (let i = 1; i <= pick.count; i++) {
      const name = copyName(npc.name, taken, pick.count, i);
      taken.push(name);
      combatants.push(
        combatantFrom(
          world,
          npc,
          { id: newId(), name, side: pick.side, npcId: npc.id },
          undefined,
        ),
      );
    }
  }
  if (combatants.length === 0) return { ok: false, error: 'no-combatants' };
  return {
    ok: true,
    encounter: {
      combatants,
      round: 1,
      turn: 0,
      lifeAttribute: life.name,
      pending: [],
      log: [],
      seq: 0,
    },
  };
}

/** One more copy of a catalogue NPC at the end of the order, with the next number. */
export function addCombatant(
  enc: Encounter,
  world: World,
  pick: { npcId: string; side: Exclude<CombatSide, 'party'> },
  newId: () => string,
): Encounter {
  const npc = world.npcs.find((n) => n.id === pick.npcId);
  if (!npc) return enc;
  const copies = enc.combatants.filter((c) => c.npcId === npc.id).length;
  const name = copyName(
    npc.name,
    enc.combatants.map((c) => c.name),
    copies === 0 ? 1 : 2,
    copies + 1,
  );
  const added = combatantFrom(
    world,
    npc,
    { id: newId(), name, side: pick.side, npcId: npc.id },
    undefined,
  );
  return commit(enc, {
    ...enc,
    combatants: [...enc.combatants, withDown(added, enc.lifeAttribute)],
  });
}

export function removeCombatant(enc: Encounter, id: string): Encounter {
  const index = enc.combatants.findIndex((c) => c.id === id);
  if (index < 0) return enc;
  const combatants = enc.combatants.filter((c) => c.id !== id);
  let turn = index < enc.turn ? enc.turn - 1 : enc.turn;
  if (turn >= combatants.length) turn = 0;
  return commit(enc, {
    ...enc,
    combatants,
    turn,
    pending: enc.pending.filter((p) => p.targetId !== id && p.casterId !== id),
  });
}

// --- initiative -------------------------------------------------------------

/** Highest first; combatants without a value keep their order, after the others. */
function sortedByInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort(
    (a, b) => (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity),
  );
}

function reordered(enc: Encounter, combatants: Combatant[]): EncounterState {
  const activeId = enc.combatants[enc.turn]?.id;
  const turn = Math.max(
    0,
    combatants.findIndex((c) => c.id === activeId),
  );
  return { ...enc, combatants, turn };
}

/** Rolls the initiative dice plus the formula for the given combatants (everyone by default) and orders by the total. */
export function rollInitiative(
  enc: Encounter,
  rules: CombatRules,
  random: RandomSource,
  ids?: string[],
): Encounter {
  const combatants = enc.combatants.map((c) => {
    if (ids && !ids.includes(c.id)) return c;
    const dice = roll(
      random,
      rules.initiative.dice.count,
      rules.initiative.dice.faces,
    );
    const bonus = evaluateFormula(
      { preset: 'custom', expression: rules.initiative.formula },
      { level: c.level, base: 0, playerLevel: c.level, levels: maximaOf(c) },
    );
    const total =
      dice.reduce((sum, v) => sum + v, 0) + (bonus.ok ? bonus.value : 0);
    return { ...c, initiative: Math.round(total) };
  });
  return commit(enc, {
    ...enc,
    combatants: sortedByInitiative(combatants),
    turn: 0,
  });
}

export function setInitiative(
  enc: Encounter,
  id: string,
  value: number,
): Encounter {
  if (!enc.combatants.some((c) => c.id === id)) return enc;
  const combatants = sortedByInitiative(
    enc.combatants.map((c) => (c.id === id ? { ...c, initiative: value } : c)),
  );
  return commit(enc, reordered(enc, combatants));
}

/** The GM's own order (ids not listed go last); the active combatant stays active. */
export function reorderCombatants(enc: Encounter, ids: string[]): Encounter {
  const position = (id: string) => {
    const i = ids.indexOf(id);
    return i < 0 ? ids.length : i;
  };
  const combatants = [...enc.combatants].sort(
    (a, b) => position(a.id) - position(b.id),
  );
  return commit(enc, reordered(enc, combatants));
}

// --- turns ------------------------------------------------------------------

/** What happens at the start of a combatant's turn: counters reset, cooldowns and effects tick. */
function startTurn(combatant: Combatant): Combatant {
  let next: Combatant = {
    ...combatant,
    actions: combatant.actions.map((a) => ({ ...a, used: 0 })),
    cooldowns: Object.fromEntries(
      Object.entries(combatant.cooldowns)
        .map(([skillId, turns]) => [skillId, turns - 1] as const)
        .filter(([, turns]) => turns > 0),
    ),
    effects: [],
  };
  for (const effect of combatant.effects) {
    if (effect.duration - 1 > 0) {
      next.effects.push({ ...effect, duration: effect.duration - 1 });
    } else {
      next = changeAttribute(next, effect.attribute, (current, max) => ({
        current,
        max: max - effect.amount,
      }));
    }
  }
  return next;
}

/** The next combatant that is not down; the round goes up when the order wraps. */
export function nextTurn(enc: Encounter): Encounter {
  const count = enc.combatants.length;
  let turn = enc.turn;
  let round = enc.round;
  let found = false;
  for (let step = 0; step < count && !found; step++) {
    turn++;
    if (turn >= count) {
      turn = 0;
      round++;
    }
    found = !enc.combatants[turn].down;
  }
  if (!found) return enc;
  return commit(enc, {
    ...enc,
    round,
    turn,
    combatants: enc.combatants.map((c, i) => (i === turn ? startTurn(c) : c)),
  });
}

/** Sets how many of an action type the combatant used this turn, kept between 0 and its count. */
export function setActionUsed(
  enc: Encounter,
  id: string,
  action: string,
  used: number,
): Encounter {
  return updateCombatant(enc, id, (c) => ({
    ...c,
    actions: c.actions.map((a) =>
      a.name === action
        ? { ...a, used: Math.max(0, Math.min(used, a.count)) }
        : a,
    ),
  }));
}

/** Ticks one use on the combatant's counter of that name, or on its first one (no commit: part of the change that caused it). */
export function tickedAction(
  enc: Encounter,
  id: string,
  action: string | undefined,
): Encounter {
  return {
    ...enc,
    combatants: enc.combatants.map((c) => {
      if (c.id !== id || !c.actions.length) return c;
      const named = c.actions.findIndex(
        (a) => action !== undefined && same(a.name, action),
      );
      const index = named < 0 ? 0 : named;
      return {
        ...c,
        actions: c.actions.map((a, i) =>
          i === index ? { ...a, used: Math.min(a.used + 1, a.count) } : a,
        ),
      };
    }),
  };
}

// --- skills -----------------------------------------------------------------

export interface SkillPreview {
  effects: {
    kind: 'damage' | 'heal' | 'modify';
    attribute: string;
    /** A number, or "12 + 2d6" when the amount reads the dice. */
    amount: string;
    duration?: number;
  }[];
  cost?: { attribute: string; amount: number };
  cooldown: number;
}

/** A skill's computed effects at a skill level, with the dice written out; the "N + XdY" text assumes amounts linear in `roll`. */
export function skillPreview(
  skill: Skill,
  skillLevel: number,
  caster: { level: number; maxima: Record<string, number> },
  rollsEnabled: boolean,
): SkillPreview {
  const dice = rollOf(skill);
  const at = (amount: string, roll: number) =>
    evaluateSkillAmount(amount, {
      skillLevel,
      level: caster.level,
      maxima: caster.maxima,
      roll,
    });
  return {
    effects: skill.effects.map((effect) => {
      const base = at(effect.amount, 0);
      let text = effect.amount;
      if (base.ok) {
        const constant = Math.round(base.value);
        text = String(constant);
        const slope = at(effect.amount, 1);
        if (rollsEnabled && slope.ok && slope.value !== base.value) {
          const k = Math.round(slope.value - base.value);
          const rolled = `${dice.count}d${dice.faces}`;
          const term =
            Math.abs(k) === 1 ? rolled : `${Math.abs(k)} × ${rolled}`;
          if (constant === 0) text = k < 0 ? `-${term}` : term;
          else text = `${constant} ${k < 0 ? '-' : '+'} ${term}`;
        }
      }
      return {
        kind: effect.kind,
        attribute: effect.attribute,
        amount: text,
        ...(effect.kind === 'modify' ? { duration: effect.duration } : {}),
      };
    }),
    cost: skill.cost,
    cooldown: skill.cooldown ?? 0,
  };
}

/** Whether a combatant can pay for a skill and whether it is on cooldown (the GM may use it anyway). */
export function skillAvailability(
  enc: Encounter,
  combatantId: string,
  skill: Skill,
): { affordable: boolean; onCooldown: boolean } {
  const combatant = enc.combatants.find((c) => c.id === combatantId);
  const cost = skill.cost;
  const pool =
    cost && combatant?.attributes.find((a) => same(a.name, cost.attribute));
  return {
    affordable: !cost || (!!pool && pool.current >= cost.amount),
    onCooldown: (combatant?.cooldowns[skill.id] ?? 0) > 0,
  };
}

/** Uses a skill: dice drawn once, cost and cooldown taken, one pending result per target for the GM. */
export function useSkill(
  enc: Encounter,
  use: { casterId: string; skillId: string; targetIds: string[] },
  skills: Skill[],
  rollsEnabled: boolean,
  random: RandomSource,
  rules?: CombatRules,
): CombatResult<Encounter> {
  const caster = enc.combatants.find((c) => c.id === use.casterId);
  if (!caster) return { ok: false, error: 'caster-not-found' };
  const owned = caster.skills.find((s) => s.skillId === use.skillId);
  const skill = skills.find((s) => s.id === use.skillId);
  if (!owned || !skill) return { ok: false, error: 'skill-not-known' };
  if (skill.type !== 'active') return { ok: false, error: 'skill-not-active' };
  const targets = use.targetIds.map((id) =>
    enc.combatants.find((c) => c.id === id),
  );
  if (targets.some((t) => !t)) return { ok: false, error: 'target-not-found' };

  const dice = rollOf(skill);
  const rolls = rollsEnabled ? roll(random, dice.count, dice.faces) : [];
  let seq = enc.seq;
  const pending = (targets as Combatant[]).map((target) => {
    const result = resolveSkillUse(
      skill,
      owned.level,
      { level: caster.level, maxima: maximaOf(caster) },
      { maxima: maximaOf(target) },
      rolls,
      rollsEnabled,
    );
    const effects: PendingEffect[] = skill.effects.map((effect, i) => ({
      kind: effect.kind,
      attribute: effect.attribute,
      amount: Math.round(result.amounts[i]),
      ...(effect.kind === 'modify' ? { duration: effect.duration } : {}),
    }));
    return {
      id: `pending-${++seq}`,
      casterId: caster.id,
      targetId: target.id,
      skillId: skill.id,
      skillName: skill.name,
      rolls: result.rolls,
      total: result.total,
      success: result.success,
      effects,
      ...(result.error ? { error: result.error } : {}),
    };
  });
  const cost = skill.cost;
  const paid = (c: Combatant): Combatant => {
    const withCost = cost
      ? changeAttribute(c, cost.attribute, (current) => ({
          current: current - cost.amount,
        }))
      : c;
    return skill.cooldown
      ? {
          ...withCost,
          cooldowns: { ...withCost.cooldowns, [skill.id]: skill.cooldown },
        }
      : withCost;
  };
  const used = commit(enc, {
    ...tickedAction(
      {
        ...enc,
        combatants: enc.combatants.map((c) =>
          c.id === caster.id ? paid(c) : c,
        ),
      },
      caster.id,
      skill.actionType,
    ),
    seq,
    pending: [...enc.pending, ...pending],
    log: [
      ...enc.log,
      {
        kind: 'skill',
        round: enc.round,
        casterId: caster.id,
        skillId: skill.id,
        skillName: skill.name,
        rolls,
        total: pending[0]?.total ?? 0,
        success: pending.every((p) => p.success),
      },
    ],
  });
  if (!rules || rules.steps.gmValidation) return { ok: true, encounter: used };
  // No GM validation: each result lands at once, as if the GM applied the rolled amounts.
  const ids = pending.map((p) => p.id);
  const applied = ids.reduce(
    (current, id) => applyPending(current, id, { defence: true, rules }),
    used,
  );
  return {
    ok: true,
    encounter: {
      ...withoutUndo(applied),
      ...(used.previous ? { previous: used.previous } : {}),
    },
  };
}

// --- resolving a pending result --------------------------------------------

const defenceOf = (
  target: Combatant | undefined,
  rules: CombatRules,
): number => {
  if (!target || !rules.defence || !rules.steps.defence) return 0;
  const result = evaluateFormula(
    { preset: 'custom', expression: rules.defence },
    {
      level: target.level,
      base: 0,
      playerLevel: target.level,
      levels: maximaOf(target),
    },
  );
  return result.ok ? Math.max(0, Math.round(result.value)) : 0;
};

/** What the world's defence formula takes off a hit on the pending result's target (0 without one). */
export function suggestDefence(
  enc: Encounter,
  pendingId: string,
  rules: CombatRules,
): number {
  const pending = enc.pending.find((p) => p.id === pendingId);
  return defenceOf(
    enc.combatants.find((c) => c.id === pending?.targetId),
    rules,
  );
}

export interface ApplyOptions {
  /** The GM's own amounts, one per effect. */
  amounts?: number[];
  /** Another target. */
  targetId?: string;
  /** Take the defence off damage; needs `rules`. */
  defence?: boolean;
  rules?: CombatRules;
}

/** Applies a pending result to its target (damage, heal capped at max, buffs with their duration). */
export function applyPending(
  enc: Encounter,
  pendingId: string,
  options: ApplyOptions = {},
): Encounter {
  const pending = enc.pending.find((p) => p.id === pendingId);
  if (!pending) return enc;
  const targetId = options.targetId ?? pending.targetId;
  const target = enc.combatants.find((c) => c.id === targetId);
  if (!target) return enc;
  const defence =
    options.defence && options.rules ? defenceOf(target, options.rules) : 0;
  let next = target;
  pending.effects.forEach((effect, i) => {
    const amount = Math.round(options.amounts?.[i] ?? effect.amount);
    if (effect.kind === 'damage') {
      const dealt = Math.max(0, amount - defence);
      next = changeAttribute(next, effect.attribute, (current) => ({
        current: current - dealt,
      }));
    } else if (effect.kind === 'heal') {
      next = changeAttribute(next, effect.attribute, (current) => ({
        current: current + amount,
      }));
    } else {
      next = changeAttribute(next, effect.attribute, (current, max) => ({
        current: current + amount,
        max: max + amount,
      }));
      if ((effect.duration ?? 0) > 0)
        next = {
          ...next,
          effects: [
            ...next.effects,
            { attribute: effect.attribute, amount, duration: effect.duration! },
          ],
        };
    }
  });
  return commit(enc, {
    ...enc,
    combatants: enc.combatants.map((c) =>
      c.id === targetId ? withDown(next, enc.lifeAttribute) : c,
    ),
    pending: enc.pending.filter((p) => p.id !== pendingId),
    log: [
      ...enc.log,
      { kind: 'apply', round: enc.round, targetId, skillId: pending.skillId },
    ],
  });
}

/** Drops a pending result without changing anything (the roll stays in the log). */
export function dismissPending(enc: Encounter, pendingId: string): Encounter {
  if (!enc.pending.some((p) => p.id === pendingId)) return enc;
  return commit(enc, {
    ...enc,
    pending: enc.pending.filter((p) => p.id !== pendingId),
  });
}

// --- free changes -----------------------------------------------------------

export function damageCombatant(
  enc: Encounter,
  id: string,
  amount: number,
): Encounter {
  return updateCombatant(enc, id, (c) =>
    changeAttribute(c, enc.lifeAttribute, (current) => ({
      current: current - amount,
    })),
  );
}

export function healCombatant(
  enc: Encounter,
  id: string,
  amount: number,
): Encounter {
  return updateCombatant(enc, id, (c) =>
    changeAttribute(c, enc.lifeAttribute, (current) => ({
      current: current + amount,
    })),
  );
}

export function addStatus(
  enc: Encounter,
  id: string,
  status: string,
): Encounter {
  const text = status.trim();
  if (!text) return enc;
  return updateCombatant(enc, id, (c) =>
    c.statuses.includes(text) ? c : { ...c, statuses: [...c.statuses, text] },
  );
}

export function removeStatus(
  enc: Encounter,
  id: string,
  status: string,
): Encounter {
  return updateCombatant(enc, id, (c) => ({
    ...c,
    statuses: c.statuses.filter((s) => s !== status),
  }));
}

/** Sets the current and/or max of an attribute by hand (current stays within 0 and max). */
export function editAttribute(
  enc: Encounter,
  id: string,
  attribute: string,
  change: { current?: number; max?: number },
): Encounter {
  return updateCombatant(enc, id, (c) =>
    changeAttribute(c, attribute, (current, max) => ({
      current: change.current ?? current,
      max: change.max ?? max,
    })),
  );
}

/** Goes back one step; nothing more to undo returns the encounter as it is. */
export function undo(enc: Encounter): Encounter {
  return enc.previous ? { ...enc.previous } : enc;
}

// --- rewards ----------------------------------------------------------------

export interface RewardProposal {
  xp: {
    total: number;
    perCharacter: { characterId: string; amount: number }[];
  };
  money: number;
  loot: { fromName: string; entry: InventoryItem }[];
}

/** What the defeated enemies give: XP split evenly (rounded down) among the characters, their money and loot. */
export function proposeRewards(enc: Encounter): RewardProposal {
  const defeated = enc.combatants.filter((c) => c.side === 'enemy' && c.down);
  const total = defeated.reduce((sum, c) => sum + c.xpReward, 0);
  const characters = enc.combatants.filter(
    (c) => c.side === 'party' && c.characterId,
  );
  const share = characters.length ? Math.floor(total / characters.length) : 0;
  return {
    xp: {
      total,
      perCharacter: characters.map((c) => ({
        characterId: c.characterId!,
        amount: share,
      })),
    },
    money: defeated.reduce((sum, c) => sum + c.money, 0),
    loot: defeated.flatMap((c) =>
      c.loot.map((entry) => ({ fromName: c.name, entry })),
    ),
  };
}

/** The rewards of a finished combat, none when the rewards step is off. */
export function combatRewards(
  enc: Encounter,
  rules: CombatRules,
): RewardProposal | null {
  return rules.steps.rewards ? proposeRewards(enc) : null;
}

// --- host-side helpers ------------------------------------------------------

/** Puts a token on a grid cell (not an undo step). Without a grid there is no position. */
export function moveCombatant(
  enc: Encounter,
  id: string,
  position: { x: number; y: number },
): Encounter {
  return {
    ...enc,
    combatants: enc.combatants.map((c) =>
      c.id === id ? { ...c, position } : c,
    ),
  };
}

/** Sets the current value of the given attributes on a combatant (an undo step), e.g. after the character's record changed. */
export function setCombatantCurrents(
  enc: Encounter,
  id: string,
  currents: { name: string; current: number }[],
): Encounter {
  return updateCombatant(enc, id, (c) =>
    currents.reduce(
      (next, entry) =>
        changeAttribute(next, entry.name, () => ({ current: entry.current })),
      c,
    ),
  );
}

/** The encounter without its undo step (a fresh start). */
export function withoutUndo(enc: Encounter): Encounter {
  const { previous: _previous, ...rest } = enc;
  return rest;
}

/**
 * The character records follow their combatants: the current value of each bar attribute (life, mana) is written to the record.
 * Records that did not change are returned as they are.
 */
export function syncCharacters(world: World, enc: Encounter): World {
  const bars = world.attributes.filter((a) =>
    [world.barAttributes.life, world.barAttributes.mana].includes(a.id),
  );
  let changed = false;
  const characters = world.characters.map((character) => {
    const combatant = enc.combatants.find(
      (c) => c.characterId === character.id,
    );
    if (!combatant) return character;
    let attributes = character.attributes;
    for (const bar of bars) {
      const value = combatant.attributes.find((a) => same(a.name, bar.name));
      if (!value) continue;
      const own = attributes.find((a) => a.attributeId === bar.id);
      const stat = attributeStats(
        world.attributes,
        { ...character, attributes },
        world.barAttributes,
      ).find((s) => s.attributeId === bar.id);
      if (stat && stat.current === value.current) continue;
      attributes = own
        ? attributes.map((a) =>
            a.attributeId === bar.id ? { ...a, current: value.current } : a,
          )
        : [
            ...attributes,
            { attributeId: bar.id, level: 0, current: value.current },
          ];
    }
    if (attributes === character.attributes) return character;
    changed = true;
    return {
      ...character,
      attributes,
      rev: character.rev + 1,
      updatedAt: Date.now(),
    };
  });
  return changed ? { ...world, characters } : world;
}
