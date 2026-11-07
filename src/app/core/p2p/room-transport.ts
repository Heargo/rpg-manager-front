import { Observable } from 'rxjs';

/** Who a message comes from or goes to. On the host it's the invite id; on a client the host is always `HOST_PEER`. */
export type PeerId = string;

export const HOST_PEER: PeerId = 'host';

export interface TransportMessage {
  from: PeerId;
  data: string;
}

export interface Invite {
  id: string;
  /** Code for the invite link: `/join#<offerCode>`. */
  offerCode: string;
}

export interface AnsweredInvite {
  /** Code the player sends back to the host. */
  answerCode: string;
  /** Resolves when the host accepted the answer and the channel is open. */
  connected: Promise<PeerId>;
}

/**
 * Connections between the host and its players (a star: players only talk to the host).
 * Implemented by `WebRtcTransport` (manual handshake) and `FakeTransport` (tests). Only `PeerApi` uses it.
 */
export interface RoomTransport {
  /** Host: start a pending invite, one per player. `relay`: make a relay invite (TURN only); rejects `relay-unavailable` when it can't. */
  createInvite(options?: { relay?: boolean }): Promise<Invite>;
  /** Host: finish the handshake with the player's answer code. Resolves with the new peer when the channel opens. */
  acceptAnswer(inviteId: string, answerCode: string): Promise<PeerId>;
  /** Host: drop a pending invite. */
  cancelInvite(inviteId: string): void;

  /** Player: answer an invite (code or full link). */
  answerInvite(offerCode: string): Promise<AnsweredInvite>;

  send(peer: PeerId, data: string): void;
  /** Host: send to every connected player. */
  broadcast(data: string): void;
  /** Close one connection (kick, leave). */
  disconnect(peer: PeerId): void;

  readonly messages$: Observable<TransportMessage>;
  readonly peerJoined$: Observable<PeerId>;
  readonly peerLeft$: Observable<PeerId>;

  /** Close everything. */
  close(): void;
}

export type TransportErrorReason = 'unknown-invite' | 'not-connected' | 'timeout' | 'closed' | 'relay-unavailable';

export class TransportError extends Error {
  constructor(readonly reason: TransportErrorReason, message?: string) {
    super(message ?? `Transport error (${reason})`);
  }
}
