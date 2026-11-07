import { PeerApiError } from '../../../core/p2p/helpers/peer-api-error';
import { SignalCodeError, SignalCodeErrorReason } from '../../../core/p2p/helpers/signal-codec';
import { TransportError } from '../../../core/p2p/room-transport';

const CODE_KEYS: Record<SignalCodeErrorReason, string> = {
  empty: 'room.errors.code.empty',
  version: 'room.errors.code.version',
  corrupt: 'room.errors.code.corrupt',
  'wrong-type': 'room.errors.code.wrongType',
};

/** Translation key for anything the handshake or the room can fail with. */
export function roomErrorKey(error: unknown): string {
  if (error instanceof SignalCodeError) return CODE_KEYS[error.reason];
  if (error instanceof TransportError) {
    if (error.reason === 'timeout') return 'room.errors.timeout';
    if (error.reason === 'relay-unavailable') return 'room.invite.relayUnavailable';
    if (error.reason === 'invite-used') return 'room.errors.inviteUsed';
    if (error.reason === 'invite-expired') return 'room.errors.inviteExpired';
    if (error.reason === 'unknown-invite') return 'room.errors.unknownInvite';
  }
  if (error instanceof PeerApiError) {
    if (error.code === 'rejected') return 'room.errors.seatTaken';
    if (error.code === 'host-offline' || error.code === 'timeout') return 'room.errors.timeout';
  }
  return 'room.errors.generic';
}
