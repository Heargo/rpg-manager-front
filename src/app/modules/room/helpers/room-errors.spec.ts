import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { SignalCodeError } from '../../../core/p2p/helpers/signal-codec';
import { TransportError } from '../../../core/p2p/room-transport';
import en from '../../../../../public/i18n/en.json';
import fr from '../../../../../public/i18n/fr.json';
import { roomErrorKey } from './room-errors';

describe('roomErrorKey', () => {
  const cases: [unknown, string][] = [
    [new SignalCodeError('empty'), 'room.errors.code.empty'],
    [new SignalCodeError('version'), 'room.errors.code.version'],
    [new SignalCodeError('corrupt'), 'room.errors.code.corrupt'],
    [new SignalCodeError('wrong-type'), 'room.errors.code.wrongType'],
    [new TransportError('timeout'), 'room.errors.timeout'],
    [new TransportError('invite-used'), 'room.errors.inviteUsed'],
    [new TransportError('invite-expired'), 'room.errors.inviteExpired'],
    [new TransportError('unknown-invite'), 'room.errors.unknownInvite'],
    [new PeerApiError('rejected'), 'room.errors.seatTaken'],
    [new PeerApiError('host-offline'), 'room.errors.timeout'],
    [new Error('?'), 'room.errors.generic'],
  ];

  it.each(cases)('maps %s to %s', (error, key) => {
    expect(roomErrorKey(error)).toBe(key);
  });

  it('points at keys that exist in both languages', () => {
    const lookup = (json: unknown, key: string) =>
      key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], json);
    for (const [, key] of cases) {
      expect(typeof lookup(en, key), `en ${key}`).toBe('string');
      expect(typeof lookup(fr, key), `fr ${key}`).toBe('string');
    }
  });
});
