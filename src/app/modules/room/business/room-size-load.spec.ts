import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProfileBusiness } from '../../../core/business/profile.business';
import { createPeerNetwork } from '../../../../testing/peer-network';
import { provideTestTranslations } from '../../../../testing/test-providers';
import { DeviceSetupService } from '../../../core/services/device-setup.service';
import { RoomService } from '../services/room.service';
import { RoomHostBusiness } from './room-host.business';
import { RoomBusiness } from './room.business';
import { RoomSizeBusiness } from './room-size.business';

describe('RoomBusiness when the room size warning cannot start', () => {
  it('still opens the room', async () => {
    globalThis.indexedDB = new IDBFactory();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [provideTestTranslations()] });
    const net = createPeerNetwork([
      RoomService,
      RoomHostBusiness,
      RoomBusiness,
    ]);
    // Loading the chunk and building the business fail the same way: the error reaches the same catch.
    const device = net.device([
      {
        provide: DeviceSetupService,
        useValue: {
          read: () => {
            throw new Error('Failed to fetch dynamically imported module');
          },
        },
      },
      {
        provide: ProfileBusiness,
        useValue: { $profile: signal({ playerId: 'gm', name: 'Gm' }) },
      },
    ]);

    await expect(
      device.get(RoomBusiness).hostRoom('Friday table'),
    ).resolves.toBe(true);
    expect(device.get(RoomBusiness).$status()).toBe('hosting');
    device.destroy();
  });
});
