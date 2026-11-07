import { Subject } from 'rxjs';
import {
  AnsweredInvite,
  HOST_PEER,
  Invite,
  PeerId,
  RoomTransport,
  TransportError,
  TransportMessage,
} from './room-transport';

/**
 * In-memory network for tests: one host and any number of clients, same handshake shape as WebRTC
 * (invite → answer → accept), messages delivered asynchronously like a real channel.
 */
export function createFakeNetwork() {
  const invites = new Map<string, { host: FakeTransport; client?: FakeTransport }>();
  let counter = 0;

  class FakeTransport implements RoomTransport {
    readonly messages$ = new Subject<TransportMessage>();
    readonly peerJoined$ = new Subject<PeerId>();
    readonly peerLeft$ = new Subject<PeerId>();
    /** Connected peers as seen from this side. */
    readonly links = new Map<PeerId, { remote: FakeTransport; remoteId: PeerId }>();
    private closed = false;

    async createInvite(): Promise<Invite> {
      const id = `invite-${++counter}`;
      invites.set(id, { host: this });
      return { id, offerCode: `fake-offer:${id}` };
    }

    async acceptAnswer(inviteId: string, answerCode: string): Promise<PeerId> {
      const pending = invites.get(inviteId);
      if (!pending || answerCode !== `fake-answer:${inviteId}` || !pending.client) {
        throw new TransportError('unknown-invite');
      }
      invites.delete(inviteId);
      const client = pending.client;
      await tick();
      this.link(inviteId, client, HOST_PEER);
      client.link(HOST_PEER, this, inviteId);
      return inviteId;
    }

    cancelInvite(inviteId: string): void {
      invites.delete(inviteId);
    }

    async answerInvite(offerCode: string): Promise<AnsweredInvite> {
      const inviteId = offerCode.replace(/^.*#/, '').replace('fake-offer:', '');
      const pending = invites.get(inviteId);
      if (!pending) throw new TransportError('unknown-invite');
      pending.client = this;
      const connected = new Promise<PeerId>((resolve) => {
        const subscription = this.peerJoined$.subscribe((peer) => {
          subscription.unsubscribe();
          resolve(peer);
        });
      });
      return { answerCode: `fake-answer:${inviteId}`, connected };
    }

    send(peer: PeerId, data: string): void {
      const link = this.links.get(peer);
      if (!link) throw new TransportError('not-connected');
      queueMicrotask(() => link.remote.messages$.next({ from: link.remoteId, data }));
    }

    broadcast(data: string): void {
      for (const peer of this.links.keys()) this.send(peer, data);
    }

    disconnect(peer: PeerId): void {
      const link = this.links.get(peer);
      if (!link) return;
      this.unlink(peer);
      link.remote.unlink(link.remoteId);
    }

    close(): void {
      if (this.closed) return;
      this.closed = true;
      for (const peer of [...this.links.keys()]) this.disconnect(peer);
    }

    private link(peer: PeerId, remote: FakeTransport, remoteId: PeerId): void {
      this.links.set(peer, { remote, remoteId });
      this.peerJoined$.next(peer);
    }

    private unlink(peer: PeerId): void {
      if (this.links.delete(peer)) this.peerLeft$.next(peer);
    }
  }

  return {
    transport: (): FakeTransport => new FakeTransport(),
    /** Runs the whole handshake and returns the host-side peer id of the new client. */
    async connect(host: RoomTransport, client: RoomTransport): Promise<PeerId> {
      const invite = await host.createInvite();
      const { answerCode, connected } = await client.answerInvite(invite.offerCode);
      const peer = await host.acceptAnswer(invite.id, answerCode);
      await connected;
      return peer;
    },
  };
}

// A microtask, not a timer: tests that fake the clock must not stall the network.
function tick(): Promise<void> {
  return Promise.resolve();
}
