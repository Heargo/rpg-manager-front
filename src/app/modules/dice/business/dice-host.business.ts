import { inject, Injectable } from '@angular/core';
import { rollDice } from '../../../core/generators/dice';
import {
  createSeed,
  cryptoRandomSource,
} from '../../../core/generators/random-source';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { SELF_PEER } from '../../../core/p2p/peer-api.service';
import { PeerId } from '../../../core/p2p/room-transport';
import { RoomHostBusiness } from '../../room/business/room-host.business';
import { addSharedRoll, isValidRollRequest } from '../helpers/shared-roll';
import { SharedCombatRoll, SharedRoll } from '../models/dice-api';
import { DiceService } from '../services/dice.service';

/**
 * Host: draws shared rolls and publishes them to the table. The host draws (not the roller), so a player can't
 * announce the values they'd like.
 */
@Injectable({ providedIn: 'root' })
export class DiceHostBusiness {
  private readonly service = inject(DiceService);
  private readonly roomHost = inject(RoomHostBusiness);
  private readonly random = cryptoRandomSource();
  private rolls: SharedRoll[] = [];

  /** Starts drawing shared rolls for the room, with an empty history. Returns a function that stops. */
  start(): () => void {
    this.rolls = [];
    this.service.publishRolls(this.rolls);
    return this.service.serveRoll((payload, { from }) =>
      this.onRoll(payload, from),
    );
  }

  private onRoll(payload: unknown, from: PeerId): SharedRoll {
    if (!isValidRollRequest(payload))
      throw new PeerApiError('invalid', 'dice.errors.invalid');
    const by = this.roller(from);
    const { count, sides } = payload;
    const roll: SharedRoll = {
      id: crypto.randomUUID(),
      by,
      count,
      sides,
      values: rollDice(this.random, count, sides),
      seed: createSeed(this.random),
      at: Date.now(),
    };
    this.rolls = addSharedRoll(this.rolls, roll);
    this.service.publishRolls(this.rolls);
    return roll;
  }

  /**
   * Publishes dice the host already drew for a combat action (the values the result uses), for `playerId` or, without
   * one, the host's player.
   */
  announce(input: {
    playerId?: string;
    values: number[];
    sides: number;
    combat: SharedCombatRoll;
  }): void {
    const members = this.roomHost.$state()?.members ?? [];
    const member = input.playerId
      ? members.find((entry) => entry.playerId === input.playerId)
      : members.find((entry) => entry.isHost);
    const by = member ?? members.find((entry) => entry.isHost);
    if (!by) return;
    const roll: SharedRoll = {
      id: crypto.randomUUID(),
      by: { playerId: by.playerId, name: by.name },
      count: input.values.length,
      sides: input.sides,
      values: input.values,
      seed: createSeed(this.random),
      at: Date.now(),
      combat: input.combat,
    };
    this.rolls = addSharedRoll(this.rolls, roll);
    this.service.publishRolls(this.rolls);
  }

  private roller(from: PeerId): SharedRoll['by'] {
    const members = this.roomHost.$state()?.members ?? [];
    const member =
      from === SELF_PEER
        ? members.find((entry) => entry.isHost)
        : members.find(
            (entry) => entry.playerId === this.roomHost.playerIdOf(from),
          );
    if (!member) throw new PeerApiError('forbidden', 'dice.errors.notInRoom');
    return { playerId: member.playerId, name: member.name };
  }
}
