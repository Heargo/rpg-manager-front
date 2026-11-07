import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PeerApi, PeerHandler } from '../../../core/p2p/peer-api.service';
import { AnsweredInvite, Invite, PeerId } from '../../../core/p2p/room-transport';
import { HelloRequest, HelloResponse, ROOM_ROUTES, ROOM_TOPICS, RoomState } from '../models/room';

/** Room calls over PeerApi: the session (host, invites, join, leave) and the `room/*` routes. */
@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly api = inject(PeerApi);

  readonly $role = this.api.$role;
  readonly $hostOnline = this.api.$hostOnline;
  readonly peerLeft$: Observable<PeerId> = this.api.peerLeft$;

  startHosting(): void {
    this.api.startHosting();
  }

  createInvite(options?: { relay?: boolean }): Promise<Invite> {
    return this.api.createInvite(options);
  }

  acceptAnswer(inviteId: string, answerCode: string): Promise<PeerId> {
    return this.api.acceptAnswer(inviteId, answerCode);
  }

  cancelInvite(inviteId: string): void {
    this.api.cancelInvite(inviteId);
  }

  joinRoom(offerCode: string): Promise<AnsweredInvite> {
    return this.api.joinRoom(offerCode);
  }

  disconnect(peer: PeerId): void {
    this.api.disconnect(peer);
  }

  leave(): void {
    this.api.leave();
  }

  hello(request: HelloRequest): Promise<HelloResponse> {
    return this.api.request(ROOM_ROUTES.hello, request);
  }

  /** null until the host sends it, and again after leaving. */
  watchRoom(): Observable<RoomState | null> {
    return this.api.watchCurrent(ROOM_TOPICS.state);
  }

  serveHello(handler: PeerHandler<unknown, HelloResponse>): () => void {
    return this.api.serve(ROOM_ROUTES.hello, handler);
  }

  publishRoom(state: RoomState): void {
    this.api.publish(ROOM_TOPICS.state, state);
  }
}
