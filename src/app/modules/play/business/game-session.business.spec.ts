import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ImageBusiness } from '../../../core/business/image.business';
import { CharacterBusiness } from '../../character/business/character.business';
import { CharacterHostBusiness } from '../../character/business/character-host.business';
import { DiceHostBusiness } from '../../dice/business/dice-host.business';
import { ItemHostBusiness } from '../../item/business/item-host.business';
import { RoomBusiness } from '../../room/business/room.business';
import { TableHostBusiness } from '../../table/business/table-host.business';
import { WorldInfoBusiness } from '../../world/business/world-info.business';
import { WorldSessionBusiness } from '../../world/business/world-session.business';
import { GameSessionBusiness } from './game-session.business';
import { JoinedWorldsBusiness } from './joined-worlds.business';

describe('GameSessionBusiness joined world recorder', () => {
  const record = vi.fn(async () => undefined);
  const info = signal<unknown>(null);
  const room = signal<unknown>(null);
  const status = signal('idle');
  const isHost = signal(false);
  const mine = signal<unknown>(undefined);

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RoomBusiness,
          useValue: {
            $room: room,
            $status: status,
            $isHost: isHost,
          },
        },
        { provide: WorldInfoBusiness, useValue: { $info: info } },
        { provide: CharacterBusiness, useValue: { $myCharacter: mine } },
        { provide: JoinedWorldsBusiness, useValue: { record } },
        { provide: WorldSessionBusiness, useValue: {} },
        { provide: CharacterHostBusiness, useValue: {} },
        { provide: ImageBusiness, useValue: {} },
        { provide: TableHostBusiness, useValue: {} },
        { provide: DiceHostBusiness, useValue: {} },
        { provide: ItemHostBusiness, useValue: {} },
      ],
    });
    TestBed.inject(GameSessionBusiness);
  }

  const world = {
    id: 'w1',
    name: 'Harbour',
    attributes: [],
    barAttributes: {},
    levelCurve: { preset: 'growing' },
    maxLevel: 20,
  };
  const members = (online: boolean) => [
    { playerId: 'gm', name: 'Gm', isHost: true, online },
  ];

  beforeEach(() => {
    record.mockClear();
    info.set(world);
    room.set({ id: 'r1', members: members(true) });
    status.set('connected');
    isHost.set(false);
    mine.set({ id: 'c1' });
  });

  it('records a connected player once, not again on presence or character changes', async () => {
    setup();
    TestBed.tick();
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        worldId: 'w1',
        roomId: 'r1',
        name: 'Harbour',
        hostName: 'Gm',
      }),
    );
    room.set({ id: 'r1', members: members(false) });
    mine.set({ id: 'c1', xp: 5 });
    TestBed.tick();
    expect(record).toHaveBeenCalledTimes(1);
    info.set({ ...world, name: 'Harbour 2' });
    TestBed.tick();
    expect(record).toHaveBeenCalledTimes(2);
  });

  it('does not record on the host', () => {
    isHost.set(true);
    setup();
    TestBed.tick();
    expect(record).not.toHaveBeenCalled();
  });

  it('does not record while the host is offline or not connected', () => {
    status.set('host-offline');
    setup();
    TestBed.tick();
    status.set('joining');
    TestBed.tick();
    expect(record).not.toHaveBeenCalled();
  });
});
