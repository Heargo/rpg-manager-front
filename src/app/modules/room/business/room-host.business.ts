import { inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { SELF_PEER } from '../../../core/p2p/peer-api.service';
import { PeerId } from '../../../core/p2p/room-transport';
import { createRoomState, findMember, isValidHello, joinRoom, markOffline, removeMember } from '../helpers/room.rules';
import { RoomStorageService } from '../services/room-storage.service';
import { HelloResponse, RoomState } from '../models/room';
import { RoomService } from '../services/room.service';

/** Time for a kicked player to receive the room state without them before the connection closes. */
export const KICK_DISCONNECT_DELAY_MS = 300;

/** Host side of a room: answers `room/hello`, keeps seats, publishes the room state. */
@Injectable({ providedIn: 'root' })
export class RoomHostBusiness {
  private readonly service = inject(RoomService);
  private readonly storage = inject(RoomStorageService);

  private readonly state = signal<RoomState | null>(null);
  private readonly playerByPeer = new Map<PeerId, string>();
  private cleanup: (() => void)[] = [];

  readonly $state = this.state.asReadonly();

  open(roomName: string, host: { playerId: string; name: string }, worldId?: string): RoomState {
    return this.start(createRoomState(crypto.randomUUID(), roomName, host, worldId));
  }

  /** Reopens a saved room (after a reload): same id and seats, players offline until they rejoin. */
  resume(state: RoomState): RoomState {
    return this.start(state);
  }

  private start(state: RoomState): RoomState {
    this.close();
    this.service.startHosting();
    const stopHello = this.service.serveHello((payload, { from }) => this.onHello(payload, from));
    const left: Subscription = this.service.peerLeft$.subscribe((peer) => this.onPeerLeft(peer));
    this.cleanup = [stopHello, () => left.unsubscribe()];
    this.update(state);
    return state;
  }

  /** The seat (playerId) behind a connection, once the player said hello. */
  playerIdOf(peer: PeerId): string | undefined {
    return this.playerByPeer.get(peer);
  }

  /**
   * Frees a player's seat and disconnects them. The new room state goes out first, so the player sees they
   * were removed rather than a lost connection.
   */
  kick(playerId: string): void {
    const state = this.requireState();
    const member = findMember(state, playerId);
    if (!member || member.isHost) return;
    this.update(removeMember(state, playerId));
    for (const [peer, id] of [...this.playerByPeer]) {
      if (id === playerId) {
        this.playerByPeer.delete(peer);
        setTimeout(() => this.service.disconnect(peer), KICK_DISCONNECT_DELAY_MS);
      }
    }
  }

  /** Closes the room for good: connections closed and the saved copy deleted. */
  close(): void {
    const wasOpen = !!this.state();
    this.cleanup.forEach((stop) => stop());
    this.cleanup = [];
    this.playerByPeer.clear();
    this.state.set(null);
    if (wasOpen) {
      this.service.leave();
      this.storage.clearHosted().catch((error) => console.warn('Could not delete the saved room', error));
    }
  }

  private onHello(payload: unknown, from: PeerId): HelloResponse {
    if (from === SELF_PEER) throw new PeerApiError('invalid', 'The host is already in the room');
    if (!isValidHello(payload)) throw new PeerApiError('invalid', 'A player id and a name are required');
    const state = this.requireState();
    const existing = findMember(state, payload.playerId);
    const otherPeer = [...this.playerByPeer].find(([peer, id]) => id === payload.playerId && peer !== from);
    if (existing?.isHost || (existing?.online && otherPeer)) {
      throw new PeerApiError('rejected', 'This player is already in the room');
    }
    this.playerByPeer.set(from, payload.playerId);
    const next = joinRoom(state, payload);
    this.update(next);
    return { room: next, you: findMember(next, payload.playerId)! };
  }

  private onPeerLeft(peer: PeerId): void {
    const playerId = this.playerByPeer.get(peer);
    if (!playerId || !this.state()) return;
    this.playerByPeer.delete(peer);
    this.update(markOffline(this.requireState(), playerId));
  }

  /** Every change is published and saved, so a reload can reopen the room. */
  private update(state: RoomState): void {
    this.state.set(state);
    this.service.publishRoom(state);
    this.storage
      .saveHosted({ state, savedAt: Date.now() })
      .catch((error) => console.warn('Could not save the room', error));
  }

  private requireState(): RoomState {
    const state = this.state();
    if (!state) throw new PeerApiError('internal', 'No room is open');
    return state;
  }
}
