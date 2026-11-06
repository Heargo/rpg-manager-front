import { inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { SELF_PEER } from '../../../core/p2p/peer-api.service';
import { PeerId } from '../../../core/p2p/room-transport';
import { createRoomState, findMember, isValidHello, joinRoom, markOffline, removeMember } from '../helpers/room.rules';
import { HelloResponse, RoomState } from '../models/room';
import { RoomService } from '../services/room.service';

/** Host side of a room: answers `room/hello`, keeps seats, publishes the room state. */
@Injectable({ providedIn: 'root' })
export class RoomHostBusiness {
  private readonly service = inject(RoomService);

  private readonly state = signal<RoomState | null>(null);
  private readonly playerByPeer = new Map<PeerId, string>();
  private cleanup: (() => void)[] = [];

  readonly $state = this.state.asReadonly();

  open(roomName: string, host: { playerId: string; name: string }): RoomState {
    this.close();
    this.service.startHosting();
    const state = createRoomState(crypto.randomUUID(), roomName, host);
    const stopHello = this.service.serveHello((payload, { from }) => this.onHello(payload, from));
    const left: Subscription = this.service.peerLeft$.subscribe((peer) => this.onPeerLeft(peer));
    this.cleanup = [stopHello, () => left.unsubscribe()];
    this.update(state);
    return state;
  }

  /** Disconnects a player and frees their seat. */
  kick(playerId: string): void {
    const state = this.requireState();
    const member = findMember(state, playerId);
    if (!member || member.isHost) return;
    for (const [peer, id] of this.playerByPeer) {
      if (id === playerId) {
        this.playerByPeer.delete(peer);
        this.service.disconnect(peer);
      }
    }
    this.update(removeMember(this.requireState(), playerId));
  }

  close(): void {
    this.cleanup.forEach((stop) => stop());
    this.cleanup = [];
    this.playerByPeer.clear();
    if (this.state()) this.service.leave();
    this.state.set(null);
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

  private update(state: RoomState): void {
    this.state.set(state);
    this.service.publishRoom(state);
  }

  private requireState(): RoomState {
    const state = this.state();
    if (!state) throw new PeerApiError('internal', 'No room is open');
    return state;
  }
}
