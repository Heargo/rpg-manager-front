import { Subject } from 'rxjs';
import { LogFn } from '../helpers/debug-log.rules';
import { fetchIceServers, STUN_ONLY } from './helpers/ice-servers';
import { createFrameAssembler, splitMessage } from './helpers/message-frames';
import { decodeSignal, encodeSignal } from './helpers/signal-codec';
import {
  AnsweredInvite,
  HOST_PEER,
  Invite,
  PeerId,
  RoomTransport,
  TransportError,
  TransportMessage,
} from './room-transport';

export interface WebRtcTransportOptions {
  /**
   * Servers for a relay invite (and its answer): a list, or a function asked before each connection (TURN credentials
   * expire). Default: `fetchIceServers` (Open Relay TURN through the Netlify Function). Direct invites use `directServers`.
   */
  iceServers?: RTCIceServer[] | (() => Promise<RTCIceServer[]>);
  /** Servers for a direct invite, no TURN. Default: public STUN. `[]` for same-network play only. */
  directServers?: RTCIceServer[];
  /** Max wait for ICE gathering before sending what was found so far. */
  gatherTimeoutMs?: number;
  /** Max wait for the channel to open after the host pastes the answer. */
  connectTimeoutMs?: number;
  /** Where connection events go (the debug log). */
  log?: LogFn;
}

interface Link {
  connection: RTCPeerConnection;
  channel: RTCDataChannel;
}

/**
 * WebRTC with the manual handshake (p2p-rooms spec): one RTCPeerConnection + one ordered, reliable data channel
 * per player, no trickle ICE (every candidate is in the code). The only code that touches RTCPeerConnection.
 */
export class WebRtcTransport implements RoomTransport {
  readonly messages$ = new Subject<TransportMessage>();
  readonly peerJoined$ = new Subject<PeerId>();
  readonly peerLeft$ = new Subject<PeerId>();

  private readonly pending = new Map<string, Link>();
  private readonly peers = new Map<PeerId, Link>();
  /** Invites that are gone, so a late answer can say why. */
  private readonly gone = new Map<string, 'invite-used' | 'invite-expired'>();
  private readonly iceServers: () => Promise<RTCIceServer[]>;
  private readonly directServers: RTCIceServer[];
  private readonly gatherTimeoutMs: number;
  private readonly connectTimeoutMs: number;
  private readonly log: LogFn;
  /** Big messages travel in frames (see message-frames); this puts them back together. */
  private readonly frames = createFrameAssembler();
  private nextMessageId = 0;
  /**
   * Closing on page exit tells the other side at once; otherwise it only notices when WebRTC's connection checks
   * time out (~20 s, measured in Chrome). A crash or lost network still takes that long.
   */
  private readonly onPageHide = () => {
    this.log('info', 'webrtc', 'Page hide: closing every connection');
    this.close();
  };

  constructor(options: WebRtcTransportOptions = {}) {
    const iceServers = options.iceServers ?? (() => fetchIceServers());
    this.iceServers =
      typeof iceServers === 'function'
        ? iceServers
        : () => Promise.resolve(iceServers);
    this.directServers = options.directServers ?? STUN_ONLY;
    this.gatherTimeoutMs = options.gatherTimeoutMs ?? 4000;
    this.connectTimeoutMs = options.connectTimeoutMs ?? 20000;
    this.log = options.log ?? (() => undefined);
    globalThis.addEventListener?.('pagehide', this.onPageHide);
  }

  async createInvite(options: { relay?: boolean } = {}): Promise<Invite> {
    const relay = options.relay === true;
    const connection = await this.newConnection(relay);
    const channel = connection.createDataChannel('room', { ordered: true });
    const candidates = collectCandidates(connection);
    await connection.setLocalDescription(await connection.createOffer());
    await this.gathered(connection);
    const offerCode = encodeSignal({
      type: 'offer',
      sdp: withCandidates(connection.localDescription!.sdp, candidates),
      relay,
    });
    const id = crypto.randomUUID();
    this.pending.set(id, { connection, channel });
    this.watchStates(connection, `invite ${shortId(id)}`);
    this.log('info', 'webrtc', 'Invite created', {
      invite: shortId(id),
      relay,
      candidates: candidateTypes(connection.localDescription!.sdp, candidates),
      codeChars: offerCode.length,
    });
    return { id, offerCode };
  }

  async acceptAnswer(inviteId: string, answerCode: string): Promise<PeerId> {
    const link = this.pending.get(inviteId);
    if (!link) {
      this.log('warn', 'webrtc', 'Answer for an invite that is gone', { invite: shortId(inviteId), why: this.gone.get(inviteId) });
      throw new TransportError(this.gone.get(inviteId) ?? 'unknown-invite');
    }
    const answer = decodeSignal(answerCode, 'answer');
    this.log('info', 'webrtc', 'Answer received', { invite: shortId(inviteId), candidates: candidateTypes(answer.sdp ?? '', []) });
    await link.connection.setRemoteDescription(answer);
    try {
      await opened(link.channel, link.connection, this.connectTimeoutMs);
    } catch (error) {
      this.log('error', 'webrtc', 'Channel did not open', { invite: shortId(inviteId), error, state: link.connection.connectionState });
      this.cancelInvite(inviteId);
      throw error;
    }
    this.pending.delete(inviteId);
    this.gone.set(inviteId, 'invite-used');
    this.attach(inviteId, link);
    return inviteId;
  }

  cancelInvite(inviteId: string): void {
    this.pending.get(inviteId)?.connection.close();
    if (this.pending.delete(inviteId)) this.gone.set(inviteId, 'invite-expired');
  }

  async answerInvite(offerCode: string): Promise<AnsweredInvite> {
    const offer = decodeSignal(offerCode, 'offer');
    this.log('info', 'webrtc', 'Answering an invite', { relay: offer.relay === true, candidates: candidateTypes(offer.sdp ?? '', []) });
    const connection = await this.newConnection(offer.relay === true);
    this.watchStates(connection, 'host');
    const channel = new Promise<RTCDataChannel>((resolve) => {
      connection.ondatachannel = (event) => resolve(event.channel);
    });
    const candidates = collectCandidates(connection);
    await connection.setRemoteDescription(offer);
    await connection.setLocalDescription(await connection.createAnswer());
    await this.gathered(connection);
    const answerCode = encodeSignal({
      type: 'answer',
      sdp: withCandidates(connection.localDescription!.sdp, candidates),
    });
    this.log('info', 'webrtc', 'Answer ready', {
      candidates: candidateTypes(connection.localDescription!.sdp, candidates),
      codeChars: answerCode.length,
    });

    // No timeout here: the host may take minutes to paste the answer. A failed connection still rejects.
    const connected = channel
      .then((dataChannel) =>
        opened(dataChannel, connection).then(() => dataChannel),
      )
      .then((dataChannel) => {
        this.attach(HOST_PEER, { connection, channel: dataChannel });
        return HOST_PEER;
      });
    connected.catch((error: unknown) =>
      this.log('error', 'webrtc', 'Could not connect to the host', { error, state: connection.connectionState }),
    );
    return { answerCode, connected };
  }

  bufferedAmount(peer: PeerId): number {
    return this.peers.get(peer)?.channel.bufferedAmount ?? 0;
  }

  /** Sends `data` whole, or in frames when it's too big for every browser to take in one message. */
  send(peer: PeerId, data: string): void {
    const link = this.peers.get(peer);
    if (!link || link.channel.readyState !== 'open') {
      this.log('warn', 'webrtc', 'Send to a peer that is not connected', {
        peer: shortId(peer),
        channel: link?.channel.readyState ?? 'none',
        chars: data.length,
      });
      throw new TransportError('not-connected');
    }
    const frames = splitMessage(data, `${++this.nextMessageId}`);
    if (frames.length > 1) {
      this.log('debug', 'webrtc', 'Big message sent in frames', {
        peer: shortId(peer),
        chars: data.length,
        frames: frames.length,
        buffered: link.channel.bufferedAmount,
      });
    }
    try {
      for (const frame of frames) link.channel.send(frame);
    } catch (error) {
      this.log('error', 'webrtc', 'Send failed', {
        peer: shortId(peer),
        chars: data.length,
        error,
        channel: link.channel.readyState,
        buffered: link.channel.bufferedAmount,
      });
      throw error;
    }
  }

  broadcast(data: string): void {
    for (const [peer, link] of this.peers) {
      if (link.channel.readyState === 'open') this.send(peer, data);
    }
  }

  disconnect(peer: PeerId): void {
    const link = this.peers.get(peer);
    if (!link) return;
    this.drop(peer, 'disconnected here');
    link.channel.close();
    link.connection.close();
  }

  close(): void {
    globalThis.removeEventListener?.('pagehide', this.onPageHide);
    for (const inviteId of [...this.pending.keys()])
      this.cancelInvite(inviteId);
    for (const peer of [...this.peers.keys()]) this.disconnect(peer);
  }

  /** Direct: STUN only, no call to the function. Relay: the function's TURN servers and relay-only policy. */
  private async newConnection(relay: boolean): Promise<RTCPeerConnection> {
    if (!relay)
      return new RTCPeerConnection({ iceServers: this.directServers });
    const iceServers = await this.iceServers();
    if (
      !iceServers.some((server) =>
        [server.urls].flat().some((url) => url.startsWith('turn')),
      )
    ) {
      throw new TransportError('relay-unavailable');
    }
    return new RTCPeerConnection({ iceServers, iceTransportPolicy: 'relay' });
  }

  private attach(peer: PeerId, link: Link): void {
    this.peers.set(peer, link);
    link.channel.onmessage = (event) => {
      const message = this.frames.push(peer, String(event.data));
      if (message !== null) this.messages$.next({ from: peer, data: message });
    };
    link.channel.onerror = (event) =>
      this.log('error', 'webrtc', 'Channel error', { peer: shortId(peer), error: (event as RTCErrorEvent).error });
    link.channel.onclose = () => {
      const known = this.peers.get(peer) === link;
      this.drop(peer, 'channel closed');
      // Close the whole connection too, so the other side sees it at once instead of keeping a dead player online.
      if (known) link.connection.close();
    };
    link.connection.addEventListener('connectionstatechange', () => {
      const state = link.connection.connectionState;
      if (state === 'failed' || state === 'closed') this.drop(peer, `connection ${state}`);
    });
    this.log('info', 'webrtc', 'Peer connected', {
      peer: shortId(peer),
      maxMessageSize: link.connection.sctp?.maxMessageSize,
    });
    void this.logRoute(peer, link.connection);
    this.peerJoined$.next(peer);
  }

  private drop(peer: PeerId, reason: string): void {
    const link = this.peers.get(peer);
    if (!this.peers.delete(peer)) return;
    this.frames.drop(peer);
    this.log('warn', 'webrtc', 'Peer left', {
      peer: shortId(peer),
      reason,
      channel: link?.channel.readyState,
      connection: link?.connection.connectionState,
      ice: link?.connection.iceConnectionState,
    });
    this.peerLeft$.next(peer);
  }

  /** Logs every state change of a connection, from the handshake to its end. */
  private watchStates(connection: RTCPeerConnection, label: string): void {
    connection.addEventListener?.('connectionstatechange', () =>
      this.log(connection.connectionState === 'failed' ? 'error' : 'info', 'webrtc', `Connection ${connection.connectionState}`, { with: label }),
    );
    connection.addEventListener?.('iceconnectionstatechange', () =>
      this.log(connection.iceConnectionState === 'disconnected' ? 'warn' : 'debug', 'webrtc', `ICE ${connection.iceConnectionState}`, {
        with: label,
      }),
    );
  }

  /** Logs the route the connection took (direct, through STUN, through TURN): the first thing to know on a bad network. */
  private async logRoute(peer: PeerId, connection: RTCPeerConnection): Promise<void> {
    try {
      const stats = await connection.getStats?.();
      if (!stats) return;
      const byId = new Map<string, Record<string, unknown>>();
      stats.forEach((report: Record<string, unknown>) => byId.set(report['id'] as string, report));
      for (const report of byId.values()) {
        if (report['type'] !== 'candidate-pair' || (report['state'] !== 'succeeded' && !report['nominated'])) continue;
        const local = byId.get(report['localCandidateId'] as string);
        const remote = byId.get(report['remoteCandidateId'] as string);
        this.log('info', 'webrtc', 'Route', {
          peer: shortId(peer),
          local: `${local?.['candidateType']}/${local?.['protocol']}`,
          remote: `${remote?.['candidateType']}/${remote?.['protocol']}`,
          rttMs: typeof report['currentRoundTripTime'] === 'number' ? Math.round((report['currentRoundTripTime'] as number) * 1000) : undefined,
        });
        return;
      }
    } catch {
      // Stats are only a hint.
    }
  }

  /** Waits for ICE gathering to finish (or the timeout: then the candidates found so far are used). */
  private gathered(connection: RTCPeerConnection): Promise<void> {
    if (connection.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        connection.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      };
      const onChange = () => {
        if (connection.iceGatheringState === 'complete') done();
      };
      const timer = setTimeout(done, this.gatherTimeoutMs);
      connection.addEventListener('icegatheringstatechange', onChange);
    });
  }
}

/** First 8 characters of an invite id: enough to follow one player in the log. */
function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

/** How many candidates of each type (host, srflx, relay) a description carries. */
function candidateTypes(sdp: string, extra: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  const lines = [...sdp.split(/\r?\n/).filter((line) => line.startsWith('a=candidate:')), ...extra];
  for (const line of new Set(lines.map((line) => line.replace(/^a=/, '')))) {
    const type = / typ (\w+)/.exec(line)?.[1] ?? 'unknown';
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
}

/** Records candidates as they are found: some browsers (Firefox) may leave them out of `localDescription`. */
function collectCandidates(connection: RTCPeerConnection): string[] {
  const found: string[] = [];
  connection.addEventListener('icecandidate', (event) => {
    if (event.candidate?.candidate) found.push(event.candidate.candidate);
  });
  return found;
}

/** Adds the collected candidates when the SDP has none of its own. */
function withCandidates(sdp: string, candidates: string[]): string {
  if (/^a=candidate:/m.test(sdp) || candidates.length === 0) return sdp;
  return `${sdp.replace(/(\r?\n)+$/, '')}\r\n${candidates.map((candidate) => `a=${candidate}`).join('\r\n')}\r\n`;
}

/** Resolves when the channel opens; rejects if the connection fails, or after the timeout when one is given. */
function opened(
  channel: RTCDataChannel,
  connection: RTCPeerConnection,
  timeoutMs?: number,
): Promise<void> {
  if (channel.readyState === 'open') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer =
      timeoutMs === undefined
        ? undefined
        : setTimeout(() => fail(new TransportError('timeout')), timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      channel.removeEventListener('open', onOpen);
      connection.removeEventListener('connectionstatechange', onState);
    };
    const fail = (error: TransportError) => {
      cleanup();
      reject(error);
    };
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onState = () => {
      if (connection.connectionState === 'failed')
        fail(new TransportError('timeout', 'Could not connect'));
      if (connection.connectionState === 'closed')
        fail(new TransportError('closed'));
    };
    channel.addEventListener('open', onOpen);
    connection.addEventListener('connectionstatechange', onState);
  });
}
