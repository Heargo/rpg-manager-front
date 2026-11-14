import { inject, Injectable } from '@angular/core';
import { cryptoRandomSource } from '../../../core/generators/random-source';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { PeerContext, SELF_PEER } from '../../../core/p2p/peer-api.service';
import { attributeStats } from '../../character/helpers/character-stats';
import { applyCharacterAction } from '../../character/helpers/character-actions.rules';
import { CharacterHostBusiness } from '../../character/business/character-host.business';
import { DiceHostBusiness } from '../../dice/business/dice-host.business';
import { RoomHostBusiness } from '../../room/business/room-host.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { effectiveInitiativeMode } from '../../world/helpers/world-combat.rules';
import { World } from '../../world/models/world';
import {
  addCombatant,
  addStatus,
  applyPending,
  closeRoll,
  damageCombatant,
  dismissPending,
  editAttribute,
  EncounterPicks,
  healCombatant,
  moveCombatant,
  moveCounted,
  nextTurn,
  removeCombatant,
  removeStatus,
  reorderCombatants,
  rollInitiative,
  setActionUsed,
  setCombatantCurrents,
  setInitiative,
  startEncounter,
  syncCharacters,
  tickedAction,
  undo,
  useSkill,
  withoutUndo,
} from '../helpers/combat.rules';
import { Cell, canMoveTo, placeUnplaced } from '../helpers/combat-grid.rules';
import { skillUseRoll, SkillUseRoll } from '../helpers/combat-roll.rules';
import { projectEncounter } from '../helpers/combat-view.rules';
import { CombatEdit, CombatRewards, Encounter } from '../models/combat';
import { CombatService } from '../services/combat.service';

type Payload = Record<string, unknown>;

const invalid = () => new PeerApiError('invalid', 'combat.errors.invalid');

/** A character rule failure (`character.errors.x`) as the combat key (`combat.errors.x`). */
const combatError = (code: string) =>
  new PeerApiError(
    'rejected',
    code.replace(/^character\.errors\./, 'combat.errors.'),
  );

function body(payload: unknown): Payload {
  if (typeof payload !== 'object' || payload === null) throw invalid();
  return payload as Payload;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 100)
    throw invalid();
  return value;
}

function whole(value: unknown, min = 0, max = 1_000_000): number {
  if (
    !Number.isInteger(value) ||
    (value as number) < min ||
    (value as number) > max
  )
    throw invalid();
  return value as number;
}

function list<T>(value: unknown, item: (entry: unknown) => T, max = 100): T[] {
  if (!Array.isArray(value) || value.length > max) throw invalid();
  return value.map(item);
}

function parsePicks(payload: unknown): EncounterPicks {
  const p = body(payload);
  return {
    characterIds: list(p['characterIds'], text),
    npcs: list(p['npcs'], (entry) => {
      const n = body(entry);
      return {
        npcId: text(n['npcId']),
        count: whole(n['count'], 1, 20),
        side: side(n['side']),
      };
    }),
    ...(p['positions'] === undefined
      ? {}
      : { positions: parsePositions(p['positions']) }),
  };
}

function parsePositions(value: unknown): Record<string, Cell> {
  const entries = Object.entries(body(value));
  if (entries.length > 200) throw invalid();
  return Object.fromEntries(
    entries.map(([key, cell]) => {
      const c = body(cell);
      return [
        key,
        { x: whole(c['x'], -1000, 1000), y: whole(c['y'], -1000, 1000) },
      ];
    }),
  );
}

function side(value: unknown): 'ally' | 'enemy' {
  if (value !== 'ally' && value !== 'enemy') throw invalid();
  return value;
}

function parseEdit(value: unknown): CombatEdit {
  const e = body(value);
  switch (e['kind']) {
    case 'damage':
    case 'heal':
      return { kind: e['kind'], amount: whole(e['amount']) };
    case 'add-status':
    case 'remove-status':
      return { kind: e['kind'], status: text(e['status']) };
    case 'attribute':
      return {
        kind: 'attribute',
        attribute: text(e['attribute']),
        ...(e['current'] !== undefined && { current: whole(e['current']) }),
        ...(e['max'] !== undefined && { max: whole(e['max']) }),
      };
    default:
      throw invalid();
  }
}

function parseRewards(value: unknown): CombatRewards | undefined {
  if (value === undefined || value === null) return undefined;
  const r = body(value);
  return {
    xp: list(r['xp'], (entry) => {
      const x = body(entry);
      return {
        characterId: text(x['characterId']),
        amount: whole(x['amount'], 0),
      };
    }),
  };
}

/** Host: runs the encounter for the open world (saved with it), authorizes each call and publishes `combat/state`. */
@Injectable({ providedIn: 'root' })
export class CombatHostBusiness {
  private readonly service = inject(CombatService);
  private readonly session = inject(WorldSessionBusiness);
  private readonly roomHost = inject(RoomHostBusiness);
  private readonly dice = inject(DiceHostBusiness);
  private readonly characters = inject(CharacterHostBusiness);
  private readonly random = cryptoRandomSource();

  /** Starts answering combat requests for the open world. Returns a function that stops. */
  start(): () => void {
    this.publish();
    const gm = (
      route: Parameters<CombatService['serve']>[0],
      run: (p: Payload, world: World, enc: Encounter) => World,
    ) =>
      this.service.serve(route, async (payload, { from }) => {
        this.assertGameMaster(from);
        await this.change(payload, (p, world, enc) => run(p, world, enc));
      });
    const own = (
      route: Parameters<CombatService['serve']>[0],
      run: (
        p: Payload,
        world: World,
        enc: Encounter,
        context: PeerContext,
      ) => World,
      onTurnOnly = false,
      after?: () => void,
    ) =>
      this.service.serve(route, async (payload, context) => {
        await this.change(payload, (p, world, enc) => {
          const combatantId = text(p['combatantId'] ?? p['casterId']);
          this.assertOwnerOrGameMaster(context, world, enc, combatantId);
          if (
            onTurnOnly &&
            context.from !== SELF_PEER &&
            enc.combatants[enc.turn]?.id !== combatantId
          )
            throw new PeerApiError('rejected', 'combat.errors.notYourTurn');
          return run(p, world, enc, context);
        });
        after?.();
      });
    // The dice of the skill use being handled, published to the table once the use is saved.
    let announcement: { playerId?: string; roll: SkillUseRoll } | null = null;
    const stops = [
      this.service.serve('start', async (payload, { from }) => {
        this.assertGameMaster(from);
        await this.begin(parsePicks(payload));
      }),
      gm('add', (p, world, enc) => {
        const next = addCombatant(
          enc,
          world,
          { npcId: text(p['npcId']), side: side(p['side']) },
          () => crypto.randomUUID(),
        );
        if (next === enc) throw invalid();
        return this.with(world, next);
      }),
      gm('remove', (p, world, enc) =>
        this.with(world, removeCombatant(enc, text(p['combatantId']))),
      ),
      gm('reorder', (p, world, enc) =>
        this.with(world, reorderCombatants(enc, list(p['ids'], text))),
      ),
      gm('edit', (p, world, enc) =>
        this.with(
          world,
          this.edit(enc, text(p['combatantId']), parseEdit(p['edit'])),
        ),
      ),
      gm('apply', (p, world, enc) => {
        const pendingId = text(p['pendingId']);
        if (!enc.pending.some((entry) => entry.id === pendingId))
          throw invalid();
        const amounts =
          p['amounts'] === undefined
            ? undefined
            : list(p['amounts'], (v) => {
                if (typeof v !== 'number' || !Number.isFinite(v))
                  throw invalid();
                return v;
              });
        return this.with(
          world,
          applyPending(enc, pendingId, {
            amounts,
            targetId:
              p['targetId'] === undefined ? undefined : text(p['targetId']),
            defence: p['defence'] === true,
            rules: world.combat,
          }),
        );
      }),
      gm('dismiss', (p, world, enc) =>
        this.with(world, dismissPending(enc, text(p['pendingId']))),
      ),
      gm('closeRoll', (p, world, enc) =>
        this.with(world, closeRoll(enc, text(p['rollId']))),
      ),
      gm('undo', (_p, world, enc) => this.with(world, undo(enc))),
      this.service.serve('end', async (payload, { from }) => {
        this.assertGameMaster(from);
        await this.finish(parseRewards(body(payload)['rewards']));
      }),
      own('initiative', (p, world, enc) => {
        if (
          !world.combat.steps.initiative ||
          world.combat.initiative.mode === 'rolled'
        )
          throw new PeerApiError(
            'rejected',
            'combat.errors.initiativeNotTyped',
          );
        return this.with(
          world,
          setInitiative(
            enc,
            text(p['combatantId']),
            whole(p['value'], -1000, 1000),
          ),
        );
      }),
      own(
        'useSkill',
        (p, world, enc) => {
          const result = useSkill(
            enc,
            {
              casterId: text(p['casterId']),
              skillId: text(p['skillId']),
              targetIds: list(p['targetIds'], text, 20),
            },
            world.skills,
            world.skillRollsEnabled ?? true,
            this.random,
            world.combat,
          );
          if (!result.ok)
            throw new PeerApiError('rejected', `combat.errors.${result.error}`);
          const roll = skillUseRoll(
            enc,
            result.encounter,
            {
              casterId: text(p['casterId']),
              skillId: text(p['skillId']),
              targetIds: list(p['targetIds'], text, 20),
            },
            world.skills,
            world,
          );
          const characterId = enc.combatants.find(
            (c) => c.id === text(p['casterId']),
          )?.characterId;
          announcement = roll
            ? {
                playerId: world.characters.find((c) => c.id === characterId)
                  ?.playerId,
                roll,
              }
            : null;
          return this.with(world, result.encounter);
        },
        true,
        () => {
          const made = announcement;
          announcement = null;
          if (made)
            this.dice.announce({
              playerId: made.playerId,
              values: made.roll.values,
              sides: made.roll.sides,
              combat: made.roll.combat,
            });
        },
      ),
      own(
        'useItem',
        (p, world, enc) =>
          this.useItem(
            world,
            enc,
            text(p['combatantId']),
            text(p['inventoryId']),
          ),
        true,
      ),
      own('move', (p, world, enc, context) => {
        const position = body(p['position']);
        const grid = world.combat.grid;
        const x = whole(position['x'], 0, 1000);
        const y = whole(position['y'], 0, 1000);
        if (grid.enabled && (x >= grid.columns || y >= grid.rows))
          throw invalid();
        const id = text(p['combatantId']);
        if (context.from === SELF_PEER)
          return this.with(
            world,
            moveCombatant(
              {
                ...enc,
                combatants: placeUnplaced(enc.combatants, world.combat.grid),
              },
              id,
              { x, y },
            ),
          );
        if (enc.combatants[enc.turn]?.id !== id)
          throw new PeerApiError('rejected', 'combat.errors.notYourTurn');
        const check = canMoveTo(enc, world.combat, id, { x, y });
        if (!check.ok)
          throw new PeerApiError('rejected', `combat.errors.${check.error}`);
        return this.with(
          world,
          moveCounted(enc, id, { x, y }, world.combat.grid, check.tickAction),
        );
      }),
      own(
        'tickAction',
        (p, world, enc) =>
          this.with(
            world,
            setActionUsed(
              enc,
              text(p['combatantId']),
              text(p['action']),
              whole(p['used'], 0, 100),
            ),
          ),
        true,
      ),
      this.service.serve('endTurn', async (_payload, context) => {
        await this.change({}, (_p, world, enc) => {
          const active = enc.combatants[enc.turn];
          if (!active) throw invalid();
          this.assertOwnerOrGameMaster(context, world, enc, active.id);
          return this.with(world, nextTurn(enc));
        });
      }),
    ];
    return () => stops.forEach((stop) => stop());
  }

  private with(world: World, encounter: Encounter): World {
    return { ...world, encounter };
  }

  private edit(enc: Encounter, id: string, edit: CombatEdit): Encounter {
    switch (edit.kind) {
      case 'damage':
        return damageCombatant(enc, id, edit.amount);
      case 'heal':
        return healCombatant(enc, id, edit.amount);
      case 'add-status':
        return addStatus(enc, id, edit.status);
      case 'remove-status':
        return removeStatus(enc, id, edit.status);
      case 'attribute':
        return editAttribute(enc, id, edit.attribute, {
          current: edit.current,
          max: edit.max,
        });
    }
  }

  /** A consumable of the character's inventory, through the same rules as the sheet; the combatant follows the record. */
  private useItem(
    world: World,
    enc: Encounter,
    combatantId: string,
    inventoryId: string,
  ): World {
    const combatant = enc.combatants.find((c) => c.id === combatantId);
    const character = world.characters.find(
      (c) => c.id === combatant?.characterId,
    );
    if (!combatant || !character) throw invalid();
    const result = applyCharacterAction(
      world.attributes,
      character,
      { kind: 'use', inventoryId },
      world,
      world,
    );
    if (!result.ok) throw combatError(result.error);
    const changed = {
      ...result.character,
      rev: character.rev + 1,
      updatedAt: Date.now(),
    };
    const currents = attributeStats(
      world.attributes,
      changed,
      world.barAttributes,
    )
      .filter((s) => s.isBar)
      .map((s) => ({ name: s.name, current: s.current }));
    return {
      ...world,
      characters: world.characters.map((c) =>
        c.id === changed.id ? changed : c,
      ),
      encounter: tickedAction(
        setCombatantCurrents(enc, combatantId, currents),
        combatantId,
        undefined,
      ),
    };
  }

  private async begin(picks: EncounterPicks): Promise<void> {
    await this.session.update((world) => {
      if (world.encounter)
        throw new PeerApiError('rejected', 'combat.errors.alreadyStarted');
      const result = startEncounter(world, picks, () => crypto.randomUUID());
      if (!result.ok)
        throw new PeerApiError('rejected', `combat.errors.${result.error}`);
      const rolled =
        effectiveInitiativeMode(world.combat) === 'rolled'
          ? rollInitiative(result.encounter, world.combat, this.random)
          : result.encounter;
      return this.with(world, withoutUndo(rolled));
    });
    this.publish();
  }

  /** Ends the encounter; the confirmed XP goes to the characters through the `grant-xp` rules. */
  private async finish(rewards: CombatRewards | undefined): Promise<void> {
    await this.session.update((world) => {
      if (!world.encounter)
        throw new PeerApiError('rejected', 'combat.errors.noEncounter');
      let characters = world.characters;
      for (const { characterId, amount } of world.combat.steps.rewards
        ? (rewards?.xp ?? [])
        : []) {
        if (amount < 1) continue;
        const character = characters.find((c) => c.id === characterId);
        if (!character) throw invalid();
        const result = applyCharacterAction(
          world.attributes,
          character,
          { kind: 'grant-xp', amount },
          world,
          world,
        );
        if (!result.ok) throw combatError(result.error);
        const granted = {
          ...result.character,
          rev: character.rev + 1,
          updatedAt: Date.now(),
        };
        characters = characters.map((c) =>
          c.id === characterId ? granted : c,
        );
      }
      const { encounter: _encounter, ...rest } = world;
      return { ...rest, characters };
    });
    this.publish();
    this.characters.publish();
  }

  /** Applies a change to the encounter and the character records that follow it, saves, then publishes. */
  private async change(
    payload: unknown,
    run: (payload: Payload, world: World, encounter: Encounter) => World,
  ): Promise<void> {
    await this.session.update((world) => {
      if (!world.encounter)
        throw new PeerApiError('rejected', 'combat.errors.noEncounter');
      const next = run(body(payload), world, world.encounter);
      return next.encounter ? syncCharacters(next, next.encounter) : next;
    });
    this.publish();
    this.characters.publish();
  }

  private assertGameMaster(from: string): void {
    if (from !== SELF_PEER)
      throw new PeerApiError('forbidden', 'combat.errors.gameMasterOnly');
  }

  /** The game master, or the player whose character is that combatant. */
  private assertOwnerOrGameMaster(
    { from }: PeerContext,
    world: World,
    enc: Encounter,
    combatantId: string,
  ): void {
    if (from === SELF_PEER) return;
    const playerId = this.roomHost.playerIdOf(from);
    const characterId = enc.combatants.find(
      (c) => c.id === combatantId,
    )?.characterId;
    const character = world.characters.find((c) => c.id === characterId);
    if (!playerId || !character || character.playerId !== playerId)
      throw new PeerApiError('forbidden', 'combat.errors.notYours');
  }

  private publish(): void {
    const world = this.session.$world();
    this.service.publishState(
      world?.encounter ? projectEncounter(world.encounter, world) : null,
    );
  }
}
