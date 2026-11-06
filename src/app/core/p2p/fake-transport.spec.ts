import { firstValueFrom, take, toArray } from 'rxjs';
import { createFakeNetwork } from './fake-transport';
import { HOST_PEER, TransportError } from './room-transport';

describe('fake transport', () => {
  it('connects a client through invite, answer and accept', async () => {
    const network = createFakeNetwork();
    const host = network.transport();
    const client = network.transport();
    const joined = firstValueFrom(host.peerJoined$);

    const peer = await network.connect(host, client);

    expect(await joined).toBe(peer);
    expect(client.links.has(HOST_PEER)).toBe(true);
  });

  it('delivers messages both ways and broadcasts to every client', async () => {
    const network = createFakeNetwork();
    const host = network.transport();
    const [a, b] = [network.transport(), network.transport()];
    const peerA = await network.connect(host, a);
    await network.connect(host, b);

    const atHost = firstValueFrom(host.messages$);
    a.send(HOST_PEER, 'hello');
    expect(await atHost).toEqual({ from: peerA, data: 'hello' });

    const atA = firstValueFrom(a.messages$);
    const atB = firstValueFrom(b.messages$);
    host.broadcast('state');
    expect(await atA).toEqual({ from: HOST_PEER, data: 'state' });
    expect(await atB).toEqual({ from: HOST_PEER, data: 'state' });
  });

  it('reports leaving on both sides', async () => {
    const network = createFakeNetwork();
    const host = network.transport();
    const client = network.transport();
    const peer = await network.connect(host, client);
    const left = firstValueFrom(host.peerLeft$.pipe(take(1), toArray()));
    const clientLeft = firstValueFrom(client.peerLeft$);

    client.close();

    expect(await left).toEqual([peer]);
    expect(await clientLeft).toBe(HOST_PEER);
    expect(() => host.send(peer, 'x')).toThrow(TransportError);
  });

  it('refuses a wrong answer and a cancelled invite', async () => {
    const network = createFakeNetwork();
    const host = network.transport();
    const client = network.transport();
    const invite = await host.createInvite();
    await client.answerInvite(invite.offerCode);

    await expect(host.acceptAnswer(invite.id, 'fake-answer:other')).rejects.toBeInstanceOf(TransportError);

    host.cancelInvite(invite.id);
    await expect(client.answerInvite(invite.offerCode)).rejects.toBeInstanceOf(TransportError);
  });
});
