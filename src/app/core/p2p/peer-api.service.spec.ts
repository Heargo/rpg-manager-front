import { TestBed } from '@angular/core/testing';
import { firstValueFrom, take, toArray } from 'rxjs';
import { createPeerNetwork, flush } from '../../../testing/peer-network';
import { PeerApiError } from './helpers/peer-api-error';
import { PeerApi, SELF_PEER } from './peer-api.service';
import { HOST_PEER } from './room-transport';

describe('PeerApi', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let host: PeerApi;
  let playerA: PeerApi;
  let playerB: PeerApi;
  let injectors: ReturnType<ReturnType<typeof createPeerNetwork>['device']>[];

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    net = createPeerNetwork();
    injectors = [net.device(), net.device(), net.device()];
    [host, playerA, playerB] = injectors.map((injector) => injector.get(PeerApi));
    host.startHosting();
  });

  afterEach(() => injectors.forEach((injector) => injector.destroy()));

  it('connects players and tracks peers on both sides', async () => {
    const peerA = await net.connect(injectors[0], injectors[1]);

    expect(host.$role()).toBe('host');
    expect(host.$peers()).toEqual([peerA]);
    expect(playerA.$role()).toBe('client');
    expect(playerA.$hostOnline()).toBe(true);
  });

  it('answers requests from players, with the caller as context', async () => {
    const peerA = await net.connect(injectors[0], injectors[1]);
    host.serve<{ n: number }, { double: number; from: string }>('math/double', ({ n }, { from }) => ({ double: n * 2, from }));

    expect(await playerA.request('math/double', { n: 21 })).toEqual({ double: 42, from: peerA });
  });

  it('runs the host own requests in-process, as SELF', async () => {
    host.serve('math/who', (_payload, { from }) => from);
    expect(await host.request('math/who', null)).toBe(SELF_PEER);
  });

  it('turns handler failures into PeerApiErrors for players and for the host', async () => {
    await net.connect(injectors[0], injectors[1]);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    host.serve('shop/buy', () => {
      throw new PeerApiError('rejected', 'Not enough money');
    });
    host.serve('shop/crash', () => {
      throw new Error('bug');
    });

    await expect(playerA.request('shop/buy', {})).rejects.toMatchObject({ code: 'rejected', message: 'Not enough money' });
    await expect(playerA.request('shop/crash', {})).rejects.toMatchObject({ code: 'internal' });
    await expect(playerA.request('shop/unknown', {})).rejects.toMatchObject({ code: 'not-found' });
    await expect(host.request('shop/crash', {})).rejects.toMatchObject({ code: 'internal' });
  });

  it('times out when the host never answers', async () => {
    await net.connect(injectors[0], injectors[1]);
    host.serve('slow/thing', () => new Promise(() => undefined));

    await expect(playerA.request('slow/thing', {}, 20)).rejects.toMatchObject({ code: 'timeout' });
  });

  it('rejects with host-offline when not connected, and fails pending requests when the host leaves', async () => {
    await expect(playerA.request('any/thing', {})).rejects.toMatchObject({ code: 'host-offline' });

    await net.connect(injectors[0], injectors[1]);
    host.serve('slow/thing', () => new Promise(() => undefined));
    const pending = playerA.request('slow/thing', {});
    await flush();

    host.leave();

    await expect(pending).rejects.toMatchObject({ code: 'host-offline' });
    expect(playerA.$hostOnline()).toBe(false);
  });

  it('publishes to every player and the host, and gives late joiners the current state', async () => {
    await net.connect(injectors[0], injectors[1]);
    const atHost = firstValueFrom(host.watch('room/state').pipe(take(2), toArray()));
    const atA = firstValueFrom(playerA.watch('room/state').pipe(take(2), toArray()));

    host.publish('room/state', { round: 1 });
    host.publish('room/state', { round: 2 });

    expect(await atHost).toEqual([{ round: 1 }, { round: 2 }]);
    expect(await atA).toEqual([{ round: 1 }, { round: 2 }]);

    await net.connect(injectors[0], injectors[2]);
    expect(await firstValueFrom(playerB.watch('room/state'))).toEqual({ round: 2 });
  });

  it('drops out-of-date publishes', async () => {
    const peerA = await net.connect(injectors[0], injectors[1]);
    host.publish('room/state', 'newest');
    await flush();
    // Simulate a stale message arriving late.
    const transport = (host as unknown as { transport: { send(peer: string, data: string): void } }).transport;
    transport.send(peerA, JSON.stringify({ v: 1, kind: 'publish', topic: 'room/state', seq: 1, payload: 'stale' }));
    await flush();

    expect(await firstValueFrom(playerA.watch('room/state'))).toBe('newest');
  });

  it("doesn't replay a previous room's state after leaving", async () => {
    await net.connect(injectors[0], injectors[1]);
    host.publish('room/state', 'old room');
    await flush();
    const seen: unknown[] = [];
    const subscription = playerA.watch('room/state').subscribe((value) => seen.push(value));

    playerA.leave();
    host.leave();
    host.startHosting();
    await net.connect(injectors[0], injectors[1]);
    host.publish('room/state', 'new room');
    await flush();

    expect(seen).toEqual(['old room', 'new room']);
    subscription.unsubscribe();
  });

  it('lets the host disconnect a player', async () => {
    const peerA = await net.connect(injectors[0], injectors[1]);
    const left = firstValueFrom(playerA.peerLeft$);

    host.disconnect(peerA);

    expect(await left).toBe(HOST_PEER);
    expect(host.$peers()).toEqual([]);
  });
});
