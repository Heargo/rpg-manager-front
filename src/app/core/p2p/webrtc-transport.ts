import { Subject } from 'rxjs';
import { fetchIceServers, STUN_ONLY } from './helpers/ice-servers';
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
  /**
   * Closing on page exit tells the other side at once; otherwise it only notices when WebRTC's connection checks
   * time out (~20 s, measured in Chrome). A crash or lost network still takes that long.
   */
  private readonly onPageHide = () => this.close();

  constructor(options: WebRtcTransportOptions = {}) {
    const iceServers = options.iceServers ?? (() => fetchIceServers());
    this.iceServers =
      typeof iceServers === 'function'
        ? iceServers
        : () => Promise.resolve(iceServers);
    this.directServers = options.directServers ?? STUN_ONLY;
    this.gatherTimeoutMs = options.gatherTimeoutMs ?? 4000;
    this.connectTimeoutMs = options.connectTimeoutMs ?? 20000;
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
    return { id, offerCode };
  }

  async acceptAnswer(inviteId: string, answerCode: string): Promise<PeerId> {
    const link = this.pending.get(inviteId);
    if (!link) throw new TransportError(this.gone.get(inviteId) ?? 'unknown-invite');
    const answer = decodeSignal(answerCode, 'answer');
    await link.connection.setRemoteDescription(answer);
    try {
      await opened(link.channel, link.connection, this.connectTimeoutMs);
    } catch (error) {
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
    const connection = await this.newConnection(offer.relay === true);
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

    // No timeout here: the host may take minutes to paste the answer. A failed connection still rejects.
    const connected = channel
      .then((dataChannel) =>
        opened(dataChannel, connection).then(() => dataChannel),
      )
      .then((dataChannel) => {
        this.attach(HOST_PEER, { connection, channel: dataChannel });
        return HOST_PEER;
      });
    return { answerCode, connected };
  }

  bufferedAmount(peer: PeerId): number {
    return this.peers.get(peer)?.channel.bufferedAmount ?? 0;
  }

  send(peer: PeerId, data: string): void {
    const link = this.peers.get(peer);
    if (!link || link.channel.readyState !== 'open')
      throw new TransportError('not-connected');
    link.channel.send(data);
  }

  broadcast(data: string): void {
    for (const [peer, link] of this.peers) {
      if (link.channel.readyState === 'open') this.send(peer, data);
    }
  }

  disconnect(peer: PeerId): void {
    const link = this.peers.get(peer);
    if (!link) return;
    this.drop(peer);
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
    link.channel.onmessage = (event) =>
      this.messages$.next({ from: peer, data: String(event.data) });
    link.channel.onclose = () => this.drop(peer);
    link.connection.onconnectionstatechange = () => {
      const state = link.connection.connectionState;
      if (state === 'failed' || state === 'closed') this.drop(peer);
    };
    this.peerJoined$.next(peer);
  }

  private drop(peer: PeerId): void {
    if (this.peers.delete(peer)) this.peerLeft$.next(peer);
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
