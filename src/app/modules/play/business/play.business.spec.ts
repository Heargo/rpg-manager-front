import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RoomBusiness } from '../../room/business/room.business';
import { WorldLibraryBusiness } from '../../world/business/world-library.business';
import { PlayBusiness } from './play.business';

describe('PlayBusiness', () => {
  const room = signal<{ name: string; worldId?: string } | null>(null);
  const isHost = signal(false);
  let roomBusiness: { hostRoom: ReturnType<typeof vi.fn>; leave: ReturnType<typeof vi.fn> } & Record<string, unknown>;
  let library: Record<string, ReturnType<typeof vi.fn> | unknown>;
  let play: PlayBusiness;

  beforeEach(() => {
    room.set(null);
    isHost.set(false);
    roomBusiness = {
      hostRoom: vi.fn(async () => true),
      leave: vi.fn(),
      describeError: vi.fn(() => 'message'),
      $status: signal('idle'),
      $room: room,
      $isHost: isHost,
    };
    library = {
      $worlds: signal([]),
      load: vi.fn(async () => undefined),
      get: vi.fn(async (id: string) => (id === 'w1' ? { id: 'w1', name: "L'Île d'Été" } : undefined)),
      remove: vi.fn(async () => undefined),
      exportWorld: vi.fn(async () => new Blob(['{}'])),
      importWorld: vi.fn(async () => ({})),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: RoomBusiness, useValue: roomBusiness },
        { provide: WorldLibraryBusiness, useValue: library },
      ],
    });
    play = TestBed.inject(PlayBusiness);
  });

  it('hosts a room named after the world, linked to it', async () => {
    expect(await play.hostWorld('w1')).toBe(true);
    expect(roomBusiness.hostRoom).toHaveBeenCalledWith("L'Île d'Été", 'w1');
    await expect(play.hostWorld('missing')).rejects.toThrow();
  });

  it('knows which world is hosted, only while hosting', () => {
    room.set({ name: 'R', worldId: 'w1' });
    expect(play.$hostedWorldId()).toBeUndefined();
    isHost.set(true);
    expect(play.$hostedWorldId()).toBe('w1');
  });

  it('closes the room before deleting the world it plays in', async () => {
    room.set({ name: 'R', worldId: 'w1' });
    isHost.set(true);

    await play.deleteWorld('w1');
    expect(roomBusiness.leave).toHaveBeenCalledTimes(1);
    expect(library['remove']).toHaveBeenCalledWith('w1');

    await play.deleteWorld('w2');
    expect(roomBusiness.leave).toHaveBeenCalledTimes(1);
  });

  it('names export files after the world', async () => {
    expect((await play.exportWorld('w1')).fileName).toBe('l-ile-d-ete.rpg-world.json');
    expect((await play.exportWorld('unknown')).fileName).toBe('world.rpg-world.json');
  });
});
