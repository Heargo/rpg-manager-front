import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { DeviceSetupService } from '../../../core/services/device-setup.service';
import { createPeerNetwork, flush } from '../../../../testing/peer-network';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { RoomService } from '../services/room.service';
import { RoomHostBusiness } from './room-host.business';
import { RoomSizeBusiness } from './room-size.business';
import { RoomBusiness } from './room.business';

const PING_EVERY = 5000;

function profile(playerId: string, name: string) {
  return { provide: ProfileBusiness, useValue: { $profile: signal({ playerId, name }) } };
}

/** Contract: a weak host (mobile, 1 GB, 1 core, 2g) has a recommended maximum of 2. */
const WEAK = { mobile: true, deviceMemory: 1, hardwareConcurrency: 1, effectiveType: '2g' };

describe('RoomSizeBusiness (host and players over the fake network)', () => {
  let net: ReturnType<typeof createPeerNetwork>;
  let devices: EnvironmentInjector[];
  let gm: RoomBusiness;
  let size: RoomSizeBusiness;
  let hostService: RoomService;

  async function setup(host: object) {
    globalThis.indexedDB = new IDBFactory();
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    net = createPeerNetwork([RoomService, RoomHostBusiness, RoomBusiness, RoomSizeBusiness]);
    devices = [
      net.device([profile('gm', 'Gm'), { provide: DeviceSetupService, useValue: { read: () => host } }]),
      net.device([profile('ada', 'Ada')]),
      net.device([profile('bob', 'Bob')]),
    ];
    gm = devices[0].get(RoomBusiness);
    await gm.hostRoom('Friday table');
    size = devices[0].get(RoomSizeBusiness);
    hostService = devices[0].get(RoomService);
  }

  async function join(index: 1 | 2) {
    const invite = await gm.invite();
    const { answerCode, joined } = await devices[index].get(RoomBusiness).join(`https://app.example/join#${invite.offerCode}`);
    await gm.accept(invite.id, answerCode);
    await joined;
    await (vi.isFakeTimers() ? vi.advanceTimersByTimeAsync(0) : flush());
  }

  /** Each ping the host sends takes `rtt` ms on the (faked) clock. */
  function slowPings(rtt: number) {
    vi.spyOn(hostService, 'ping').mockImplementation(async () => {
      vi.advanceTimersByTime(rtt);
    });
  }

  function fakeClock() {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  }

  afterEach(() => {
    vi.useRealTimers();
    devices.forEach((device) => device.destroy());
  });

  it('recommends a maximum from the host setup', async () => {
    await setup({ mobile: false, deviceMemory: 8, hardwareConcurrency: 8 });

    expect(size.$recommendedMax()).toBe(14);
  });

  it('is over the maximum only when more people than the maximum are in the room', async () => {
    await setup(WEAK);
    expect(size.$recommendedMax()).toBe(2);
    expect(size.$overMax()).toBe(false);

    await join(1);
    expect(size.$overMax()).toBe(false); // host + Ada = 2

    await join(2);
    expect(size.$overMax()).toBe(true); // host + Ada + Bob = 3
  });

  it('pings every connected player every 5 s and keeps the round-trip times', async () => {
    fakeClock();
    await setup({ mobile: false });
    await join(1);

    await vi.advanceTimersByTimeAsync(PING_EVERY);
    await vi.advanceTimersByTimeAsync(PING_EVERY);

    expect(size.$pingTimes()['ada']).toHaveLength(2);
    expect(size.$struggling()).toBe(false);
  });

  it('does not ping while no player is connected', async () => {
    fakeClock();
    await setup({ mobile: false });
    const ping = vi.spyOn(hostService, 'ping');

    await vi.advanceTimersByTimeAsync(3 * PING_EVERY);

    expect(ping).not.toHaveBeenCalled();
  });

  it('struggles when a player median ping goes above 400 ms', async () => {
    fakeClock();
    await setup({ mobile: false });
    await join(1);
    slowPings(500);

    for (let i = 0; i < 3; i++) await vi.advanceTimersByTimeAsync(PING_EVERY);

    expect(size.$struggling()).toBe(true);
  });

  it('recovers when the pings come back fast', async () => {
    fakeClock();
    await setup({ mobile: false });
    await join(1);
    slowPings(500);
    for (let i = 0; i < 3; i++) await vi.advanceTimersByTimeAsync(PING_EVERY);
    expect(size.$struggling()).toBe(true);

    slowPings(50);
    for (let i = 0; i < 3; i++) await vi.advanceTimersByTimeAsync(PING_EVERY);

    expect(size.$struggling()).toBe(false);
  });

  it('struggles when more than 1 MB is buffered on a channel', async () => {
    fakeClock();
    await setup({ mobile: false });
    await join(1);
    vi.spyOn(hostService, 'bufferedAmount').mockReturnValue(2_000_000);

    await vi.advanceTimersByTimeAsync(PING_EVERY);

    expect(size.$struggling()).toBe(true);
  });

  it('stops pinging after the last player leaves', async () => {
    fakeClock();
    await setup({ mobile: false });
    await join(1);
    const ping = vi.spyOn(hostService, 'ping');
    await vi.advanceTimersByTimeAsync(PING_EVERY);
    expect(ping).toHaveBeenCalledTimes(1);

    devices[1].get(RoomBusiness).leave();
    await vi.advanceTimersByTimeAsync(0);
    ping.mockClear();
    await vi.advanceTimersByTimeAsync(3 * PING_EVERY);

    expect(ping).not.toHaveBeenCalled();
  });

  it('stops pinging when the host closes the room', async () => {
    fakeClock();
    await setup({ mobile: false });
    await join(1);
    const ping = vi.spyOn(hostService, 'ping');

    gm.leave();
    await vi.advanceTimersByTimeAsync(3 * PING_EVERY);

    expect(ping).not.toHaveBeenCalled();
  });
});
