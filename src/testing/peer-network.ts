import { createEnvironmentInjector, EnvironmentInjector, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createFakeNetwork } from '../app/core/p2p/fake-transport';
import { PeerApi, ROOM_TRANSPORT_FACTORY } from '../app/core/p2p/peer-api.service';

/**
 * Several app instances (host and players) in one test, each with its own injector and PeerApi,
 * linked by the in-memory network.
 */
export function createPeerNetwork(sharedProviders: Provider[] = []) {
  const network = createFakeNetwork();
  const parent = TestBed.inject(EnvironmentInjector);

  const device = (providers: Provider[] = []) =>
    createEnvironmentInjector(
      [{ provide: ROOM_TRANSPORT_FACTORY, useValue: () => network.transport() }, PeerApi, ...sharedProviders, ...providers],
      parent,
    );

  /** Host creates an invite, player answers, host accepts; resolves when both sides are connected. */
  async function connect(host: EnvironmentInjector, player: EnvironmentInjector): Promise<string> {
    const hostApi = host.get(PeerApi);
    const invite = await hostApi.createInvite();
    const { answerCode, connected } = await player.get(PeerApi).joinRoom(invite.offerCode);
    const peer = await hostApi.acceptAnswer(invite.id, answerCode);
    await connected;
    return peer;
  }

  return { device, connect };
}

export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
