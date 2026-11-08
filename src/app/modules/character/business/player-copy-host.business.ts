import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  untracked,
} from '@angular/core';
import { isValidQueue, replayQueue } from '../helpers/offline-actions.rules';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { PeerId } from '../../../core/p2p/room-transport';
import { RoomHostBusiness } from '../../room/business/room-host.business';
import { RoomBusiness } from '../../room/business/room.business';
import {
  hashPlayerRecord,
  resolvePick,
} from '../../room/helpers/player-copy.rules';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { Character } from '../../world/models/world';
import {
  PlayerCopyConflict,
  PlayerCopyHello,
  PlayerCopyHelloAnswer,
  PlayerCopySubmit,
  QueuedAction,
  QueuedRefusal,
} from '../models/player-copy';
import { PlayerCopyService } from '../services/player-copy.service';
import { CharacterHostBusiness } from './character-host.business';
import { PlayerCopyGateBusiness } from './player-copy-gate.business';

/**
 * Host: when a player's copy differs from the host's, the player waits (read-only) and the game master gets a
 * "Pick a save" conflict. The pick becomes the next rev and goes out to everyone.
 */
@Injectable({ providedIn: 'root' })
export class PlayerCopyHostBusiness {
  private readonly service = inject(PlayerCopyService);
  private readonly room = inject(RoomBusiness);
  private readonly roomHost = inject(RoomHostBusiness);
  private readonly session = inject(WorldSessionBusiness);
  private readonly characterHost = inject(CharacterHostBusiness);

  private readonly gate = inject(PlayerCopyGateBusiness);
  private readonly pending = signal<PlayerCopyConflict[]>([]);

  /** Conflicts waiting for the game master's pick (the player's copy has arrived). */
  readonly $conflicts = this.pending.asReadonly();
  readonly $hasConflicts = computed(() => this.pending().length > 0);

  constructor() {
    effect((onCleanup) => {
      if (!this.room.$isHost()) return;
      this.gate.setActive(true);
      const stops = [
        this.service.serveHello((payload, { from }) =>
          this.onHello(payload, from),
        ),
        this.service.serveSubmit((payload, { from }) =>
          this.onSubmit(payload, from),
        ),
        this.service.serveNotes((_payload, { from }) => ({
          notes: this.hostCharacter(this.playerOf(from))?.notes,
        })),
      ];
      onCleanup(() => {
        stops.forEach((stop) => stop());
        untracked(() => {
          this.gate.setActive(false);
          this.pending.set([]);
        });
      });
    });
    effect(() => {
      if (!this.room.$isHost()) return;
      const members = this.room.$room()?.members ?? [];
      const online = new Set(
        members
          .filter((member) => member.online && !member.isHost)
          .map((member) => member.playerId),
      );
      untracked(() => this.dropOffline(online));
    });
  }

  /** Players who left the room (or were removed) no longer wait for a pick. */
  private dropOffline(online: Set<string>): void {
    const gone = this.gate.$waiting().filter((id) => !online.has(id));
    gone.forEach((id) => this.clear(id));
    this.pending.update((conflicts) =>
      conflicts.filter((conflict) => online.has(conflict.playerId)),
    );
    if (gone.length > 0) this.publish();
  }

  async keepHost(playerId: string): Promise<void> {
    await this.resolve(playerId, 'host');
  }

  /** Replays the player's queued actions on the host's record; resolves with the entries the host refused. */
  usePlayer(playerId: string): Promise<QueuedRefusal[]> {
    return this.resolve(playerId, 'player');
  }

  private hostCharacter(playerId: string): Character | undefined {
    return this.session
      .$world()
      ?.characters.find((character) => character.playerId === playerId);
  }

  private playerOf(from: PeerId): string {
    const playerId = this.roomHost.playerIdOf(from);
    if (!playerId)
      throw new PeerApiError('forbidden', 'character.errors.notInRoom');
    return playerId;
  }

  private async onHello(
    payload: unknown,
    from: PeerId,
  ): Promise<PlayerCopyHelloAnswer> {
    const hello = payload as Partial<PlayerCopyHello> | null;
    if (
      !hello ||
      typeof hello.rev !== 'number' ||
      (hello.hash !== null && typeof hello.hash !== 'string')
    ) {
      throw new PeerApiError('invalid', 'character.errors.invalid');
    }
    const playerId = this.playerOf(from);
    const host = this.hostCharacter(playerId);
    // Nothing to compare: a first join, or no character on the host.
    const match =
      !host ||
      hello.hash === null ||
      hello.hash === (await hashPlayerRecord(host));
    this.clear(playerId);
    if (!match) this.gate.hold(playerId);
    this.gate.markChecked(from);
    this.publish();
    return { match, notes: host?.notes };
  }

  private onSubmit(payload: unknown, from: PeerId): void {
    const submit = payload as Partial<PlayerCopySubmit> | null;
    const playerId = this.playerOf(from);
    const host = this.hostCharacter(playerId);
    const copy = submit?.copy;
    if (!host || !this.gate.$waiting().includes(playerId))
      throw new PeerApiError('rejected', 'character.errors.invalid');
    if (
      !copy ||
      typeof copy !== 'object' ||
      copy.id !== host.id ||
      copy.playerId !== playerId ||
      !isValidQueue(submit?.queued, host.id)
    ) {
      throw new PeerApiError('invalid', 'character.errors.invalid');
    }
    const conflict: PlayerCopyConflict = {
      playerId,
      playerName:
        this.room
          .$room()
          ?.members.find((member) => member.playerId === playerId)?.name ??
        playerId,
      host,
      player: copy,
      queued: submit.queued as QueuedAction[],
    };
    this.pending.update((conflicts) => [
      ...conflicts.filter((c) => c.playerId !== playerId),
      conflict,
    ]);
  }

  private async resolve(
    playerId: string,
    pick: 'host' | 'player',
  ): Promise<QueuedRefusal[]> {
    const conflict = this.pending().find(
      (candidate) => candidate.playerId === playerId,
    );
    if (!conflict)
      throw new PeerApiError('rejected', 'character.errors.invalid');
    let refused: QueuedRefusal[] = [];
    await this.session.update((world) => {
      const host = world.characters.find(
        (character) => character.playerId === playerId,
      );
      if (!host)
        throw new PeerApiError('invalid', 'character.errors.unknownCharacter');
      // The player's version is the host's record plus the queued actions: nothing comes from the submitted copy.
      let picked: Character;
      if (pick === 'player') {
        const replay = replayQueue(
          world.attributes,
          host,
          conflict.queued,
          world.offlineFeatures,
          world.barAttributes,
          world,
        );
        refused = replay.refused;
        picked = {
          ...replay.character,
          rev: host.rev + 1,
          updatedAt: Date.now(),
        };
      } else {
        picked = resolvePick(host, conflict.player, 'host', Date.now());
      }
      return {
        ...world,
        characters: world.characters.map((character) =>
          character.id === host.id ? picked : character,
        ),
      };
    });
    this.characterHost.publish();
    this.clear(playerId);
    this.publish();
    return refused;
  }

  private clear(playerId: string): void {
    this.gate.release(playerId);
    this.pending.update((conflicts) =>
      conflicts.filter((conflict) => conflict.playerId !== playerId),
    );
  }

  private publish(): void {
    this.service.publishReadOnly(this.gate.$waiting());
  }
}
