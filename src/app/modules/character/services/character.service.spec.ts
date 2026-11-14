import { TestBed } from '@angular/core/testing';
import { PeerApi } from '../../../core/p2p/peer-api.service';
import { CharacterService } from './character.service';

describe('CharacterService.publishCharacters', () => {
  const setup = (role: 'host' | 'client' | null) => {
    const api = { $role: () => role, publish: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: PeerApi, useValue: api }],
    });
    return { api, service: TestBed.inject(CharacterService) };
  };

  it('does not publish when the device is not the host', () => {
    const { api, service } = setup('client');
    service.publishCharacters([]);
    expect(api.publish).not.toHaveBeenCalled();
  });

  it('publishes when the device is the host', () => {
    const { api, service } = setup('host');
    service.publishCharacters([]);
    expect(api.publish).toHaveBeenCalledTimes(1);
  });
});
