import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject, startWith, Subject, Subscription, switchMap } from 'rxjs';
import { LogLevel } from '../helpers/debug-log.rules';
import { DebugLogService } from '../services/debug-log.service';
import { createRequestTracker } from './helpers/correlation';
import { decodeEnvelope, encodeEnvelope, Envelope } from './helpers/envelope';
import { PeerApiError, toWireError } from './helpers/peer-api-error';
import { assertValidRoute } from './helpers/routes';
import { AnsweredInvite, HOST_PEER, Invite, PeerId, RoomTransport } from './room-transport';
import { WebRtcTransport } from './webrtc-transport';

/** How PeerApi gets a transport; tests swap in the fake network. */
export const ROOM_TRANSPORT_FACTORY = new InjectionToken<() => RoomTransport>('ROOM_TRANSPORT_FACTORY', {
  providedIn: 'root',
  factory: () => {
    const debug = inject(DebugLogService);
    return () => new WebRtcTransport({ log: (level, scope, message, data) => debug.log(level, scope, message, data) });
  },
});

export const PEER_API_TIMEOUT_MS = 10_000;

/** `from` of a request the host makes to itself (its own UI). */
export const SELF_PEER: PeerId = 'self';

export type PeerRole = 'none' | 'host' | 'client';

export interface PeerContext {
  /** Who sent the request: a player's peer id, or `SELF_PEER` for the host's own UI. */
  from: PeerId;
}

export type PeerHandler<Request = unknown, Response = unknown> = (
  payload: Request,
  context: PeerContext,
) => Response | Promise<Response>;

/**
 * The HttpClient of this app (docs/rules.md, Peer-to-peer services): owns the room connection and turns it into
 * request/response and publish/watch. Only feature services use it.
 */
@Injectable({ providedIn: 'root' })
export class PeerApi {
  private readonly createTransport = inject(ROOM_TRANSPORT_FACTORY);
  private readonly debug = inject(DebugLogService);

  private transport?: RoomTransport;
  private wiring: Subscription[] = [];
  private readonly tracker = createRequestTracker();
  /** Host: who each request to a player was sent to; only that player's answer counts. */
  private readonly askedPeer = new Map<string, PeerId>();
  private readonly handlers = new Map<string, PeerHandler>();
  /** Host: last published value per topic. Client: last seq received per topic. */
  private readonly topics = new Map<string, { seq: number; payload: unknown }>();
  private readonly streams = new Map<string, ReplaySubject<unknown>>();
  /** Bumped when a session starts or ends, so watchers switch to fresh streams and never see another room's state. */
  private readonly session = new BehaviorSubject(0);

  private readonly role = signal<PeerRole>('none');
  private readonly peers = signal<PeerId[]>([]);
  private readonly joined = new Subject<PeerId>();
  private readonly left = new Subject<PeerId>();

  readonly $role = this.role.asReadonly();
  /** Host: connected players. Client: `[HOST_PEER]` while connected. */
  readonly $peers = this.peers.asReadonly();
  readonly $hostOnline = computed(() => this.role() === 'host' || this.peers().includes(HOST_PEER));
  readonly peerJoined$: Observable<PeerId> = this.joined.asObservable();
  readonly peerLeft$: Observable<PeerId> = this.left.asObservable();

  // ---- Session ----

  startHosting(): void {
    this.open('host');
  }

  createInvite(options?: { relay?: boolean }): Promise<Invite> {
    return this.hostTransport().createInvite(options);
  }

  acceptAnswer(inviteId: string, answerCode: string): Promise<PeerId> {
    return this.hostTransport().acceptAnswer(inviteId, answerCode);
  }

  cancelInvite(inviteId: string): void {
    this.hostTransport().cancelInvite(inviteId);
  }

  /** Player: answers an invite. `connected` resolves when the host accepted the answer. */
  async joinRoom(offerCode: string): Promise<AnsweredInvite> {
    const transport = this.open('client');
    return transport.answerInvite(offerCode);
  }

  /** Host: closes one player's connection. */
  disconnect(peer: PeerId): void {
    this.hostTransport().disconnect(peer);
  }

  leave(): void {
    if (this.role() !== 'none') this.log('info', 'Leaving the room', { role: this.role(), pending: this.tracker.size });
    this.wiring.forEach((subscription) => subscription.unsubscribe());
    this.wiring = [];
    this.transport?.close();
    this.transport = undefined;
    this.tracker.rejectAll(new PeerApiError('host-offline', 'Left the room'));
    this.askedPeer.clear();
    this.topics.clear();
    this.peers.set([]);
    this.role.set('none');
    this.newSession();
  }

  // ---- API ----

  request<Response = unknown, Request = unknown>(
    route: string,
    payload: Request,
    timeoutMs = PEER_API_TIMEOUT_MS,
  ): Promise<Response> {
    assertValidRoute(route);
    if (this.role() === 'host') return this.handle(route, payload, SELF_PEER) as Promise<Response>;
    if (!this.transport || !this.$hostOnline()) {
      this.log('warn', 'Request while the host is offline', { route, role: this.role() });
      return Promise.reject(new PeerApiError('host-offline', 'Not connected to the host'));
    }
    const { id, promise } = this.tracker.start<Response>(timeoutMs);
    const data = encodeEnvelope({ v: 1, kind: 'request', id, route, payload });
    const started = Date.now();
    this.log('debug', 'Request', { route, id: id.slice(0, 8), chars: data.length });
    promise.then(
      () => this.log('debug', 'Response', { route, id: id.slice(0, 8), ms: Date.now() - started }),
      (error: unknown) => this.log('error', 'Request failed', { route, id: id.slice(0, 8), ms: Date.now() - started, error }),
    );
    try {
      this.transport.send(HOST_PEER, data);
    } catch (error) {
      this.tracker.reject(id, new PeerApiError('host-offline', `Could not send to the host: ${toWireError(error).message}`));
    }
    return promise;
  }

  /** Host: answers `route`. Returns a function that removes the handler. */
  serve<Request, Response>(route: string, handler: PeerHandler<Request, Response>): () => void {
    assertValidRoute(route);
    this.handlers.set(route, handler as PeerHandler);
    return () => {
      if (this.handlers.get(route) === handler) this.handlers.delete(route);
    };
  }

  /** Host: asks one player (they answer with a handler they `serve`). */
  requestPeer<Response = unknown, Request = unknown>(
    peer: PeerId,
    route: string,
    payload: Request,
    timeoutMs = PEER_API_TIMEOUT_MS,
  ): Promise<Response> {
    assertValidRoute(route);
    const transport = this.hostTransport();
    const { id, promise } = this.tracker.start<Response>(timeoutMs, 'The player did not answer in time');
    this.askedPeer.set(id, peer);
    const forget = () => this.askedPeer.delete(id);
    promise.then(forget, forget);
    try {
      transport.send(peer, encodeEnvelope({ v: 1, kind: 'request', id, route, payload }));
    } catch {
      this.tracker.reject(id, new PeerApiError('host-offline', 'The player is not connected'));
    }
    promise.catch((error: unknown) => this.log('warn', 'Request to a player failed', { peer: peer.slice(0, 8), route, error }));
    return promise;
  }

  /** Host: bytes waiting in a player's channel. */
  bufferedAmount(peer: PeerId): number {
    return this.transport?.bufferedAmount(peer) ?? 0;
  }

  /** Host: sends a topic's full current state to every player (and to the host's own watchers). */
  publish(topic: string, payload: unknown): void {
    assertValidRoute(topic);
    if (this.role() !== 'host') throw new Error('Only the host publishes');
    const seq = (this.topics.get(topic)?.seq ?? 0) + 1;
    this.topics.set(topic, { seq, payload });
    this.stream(topic).next(payload);
    const data = encodeEnvelope({ v: 1, kind: 'publish', topic, seq, payload });
    this.log('debug', 'Publish', { topic, seq, chars: data.length, players: this.peers().length });
    try {
      this.transport?.broadcast(data);
    } catch (error) {
      // One player's broken channel must not fail the request that changed the state, nor skip the other players.
      this.log('error', 'Publish failed', { topic, error });
    }
  }

  /**
   * The topic's current state for signals: `null` whenever a session starts or ends (until the host sends it),
   * then its values. Use with `toSignal` so a new room never shows the previous room's state.
   */
  watchCurrent<T>(topic: string): Observable<T | null> {
    assertValidRoute(topic);
    return this.session.pipe(switchMap(() => (this.stream(topic) as Observable<T>).pipe(startWith(null)))) as Observable<T | null>;
  }

  /** Latest and next values of a topic in the current session (replays the latest to new subscribers). */
  watch<T>(topic: string): Observable<T> {
    assertValidRoute(topic);
    return this.session.pipe(switchMap(() => this.stream(topic))) as Observable<T>;
  }

  // ---- Internals ----

  private open(role: Exclude<PeerRole, 'none'>): RoomTransport {
    this.leave();
    const transport = this.createTransport();
    this.transport = transport;
    this.role.set(role);
    this.log('info', role === 'host' ? 'Hosting a room' : 'Joining a room');
    this.newSession();
    this.wiring = [
      transport.messages$.subscribe(({ from, data }) => this.onMessage(from, data)),
      transport.peerJoined$.subscribe((peer) => this.onPeerJoined(peer)),
      transport.peerLeft$.subscribe((peer) => this.onPeerLeft(peer)),
    ];
    return transport;
  }

  private hostTransport(): RoomTransport {
    if (this.role() !== 'host' || !this.transport) throw new Error('Not hosting');
    return this.transport;
  }

  private onPeerJoined(peer: PeerId): void {
    this.log('info', 'Peer joined', { peer: peer.slice(0, 8), topics: this.role() === 'host' ? this.topics.size : undefined });
    this.peers.update((peers) => [...peers, peer]);
    if (this.role() === 'host') {
      // A new player gets every topic's current state right away.
      for (const [topic, { seq, payload }] of this.topics) {
        this.transport?.send(peer, encodeEnvelope({ v: 1, kind: 'publish', topic, seq, payload }));
      }
    }
    this.joined.next(peer);
  }

  private onPeerLeft(peer: PeerId): void {
    this.log('warn', 'Peer left', { peer: peer.slice(0, 8), pending: this.tracker.size });
    this.peers.update((peers) => peers.filter((p) => p !== peer));
    if (this.role() === 'client' && peer === HOST_PEER) {
      this.tracker.rejectAll(new PeerApiError('host-offline', 'The host went offline'));
    }
    this.left.next(peer);
  }

  private onMessage(from: PeerId, data: string): void {
    const envelope = decodeEnvelope(data);
    if (!envelope) {
      this.log('warn', 'Unreadable message', { from: from.slice(0, 8), chars: data.length, start: data.slice(0, 40) });
      return;
    }
    if (this.role() === 'host') this.onHostMessage(from, envelope);
    else if (from === HOST_PEER) this.onClientMessage(envelope);
  }

  private onHostMessage(from: PeerId, envelope: Envelope): void {
    if (envelope.kind === 'response' || envelope.kind === 'error') {
      if (this.askedPeer.get(envelope.id) !== from) return;
      if (envelope.kind === 'response') this.tracker.resolve(envelope.id, envelope.payload);
      else this.tracker.reject(envelope.id, new PeerApiError(envelope.code, envelope.message));
      return;
    }
    if (envelope.kind !== 'request') return;
    const started = Date.now();
    const route = envelope.route;
    const reply = (message: Envelope) => {
      try {
        this.transport?.send(from, encodeEnvelope(message));
      } catch (error) {
        // The player left before the answer: nothing more to do.
        this.log('warn', 'Could not answer a player', { from: from.slice(0, 8), route, error });
      }
    };
    this.handle(route, envelope.payload, from).then(
      (payload) => {
        this.log('debug', 'Served', { from: from.slice(0, 8), route, ms: Date.now() - started });
        reply({ v: 1, kind: 'response', id: envelope.id, payload: payload ?? null });
      },
      (error: unknown) => {
        this.log('warn', 'Served with an error', { from: from.slice(0, 8), route, ms: Date.now() - started, error });
        reply({ v: 1, kind: 'error', id: envelope.id, ...toWireError(error) });
      },
    );
  }

  private onClientMessage(envelope: Envelope): void {
    switch (envelope.kind) {
      case 'request':
        this.answerHost(envelope);
        break;
      case 'response':
        this.tracker.resolve(envelope.id, envelope.payload);
        break;
      case 'error':
        this.tracker.reject(envelope.id, new PeerApiError(envelope.code, envelope.message));
        break;
      case 'publish': {
        const last = this.topics.get(envelope.topic)?.seq ?? 0;
        if (envelope.seq <= last) return; // out of date: a newer full state was already applied
        this.topics.set(envelope.topic, { seq: envelope.seq, payload: undefined });
        this.stream(envelope.topic).next(envelope.payload);
        break;
      }
    }
  }

  /** Player: answers a request from the host. */
  private answerHost(envelope: Extract<Envelope, { kind: 'request' }>): void {
    const reply = (message: Envelope) => {
      try {
        this.transport?.send(HOST_PEER, encodeEnvelope(message));
      } catch {
        // The host is gone: nothing to do.
      }
    };
    this.handle(envelope.route, envelope.payload, HOST_PEER).then(
      (payload) => reply({ v: 1, kind: 'response', id: envelope.id, payload: payload ?? null }),
      (error: unknown) => reply({ v: 1, kind: 'error', id: envelope.id, ...toWireError(error) }),
    );
  }

  /** Runs a handler; anything but a PeerApiError becomes `internal`, the same for the host's UI as for players. */
  private async handle(route: string, payload: unknown, from: PeerId): Promise<unknown> {
    const handler = this.handlers.get(route);
    if (!handler) throw new PeerApiError('not-found', `No handler for ${route}`);
    try {
      return await handler(payload, { from });
    } catch (error) {
      if (error instanceof PeerApiError) throw error;
      console.error(`Handler for ${route} failed`, error);
      throw new PeerApiError('internal', toWireError(error).message);
    }
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    this.debug.log(level, 'peer-api', message, data);
  }

  private newSession(): void {
    this.streams.clear();
    this.session.next(this.session.value + 1);
  }

  private stream(topic: string): ReplaySubject<unknown> {
    let stream = this.streams.get(topic);
    if (!stream) {
      stream = new ReplaySubject<unknown>(1);
      this.streams.set(topic, stream);
    }
    return stream;
  }
}
