export const PEER_API_ERROR_CODES = [
  /** No connection to the host. */
  'host-offline',
  /** The host didn't answer in time. */
  'timeout',
  /** No handler for this route on the host. */
  'not-found',
  /** The caller isn't allowed (e.g. a GM-only action from a player). */
  'forbidden',
  /** The payload is wrong. */
  'invalid',
  /** The host's rules refused it (not enough money…). */
  'rejected',
  /** Unexpected failure on the host. */
  'internal',
] as const;

export type PeerApiErrorCode = (typeof PEER_API_ERROR_CODES)[number];

/** What service calls reject with, like HttpErrorResponse for REST. Host handlers throw it to refuse a request. */
export class PeerApiError extends Error {
  constructor(
    readonly code: PeerApiErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'PeerApiError';
  }
}

export function isPeerApiErrorCode(value: unknown): value is PeerApiErrorCode {
  return (PEER_API_ERROR_CODES as readonly unknown[]).includes(value);
}

/** Turns anything a handler threw into what goes on the wire: PeerApiErrors keep their code, the rest is `internal`. */
export function toWireError(error: unknown): { code: PeerApiErrorCode; message: string } {
  if (error instanceof PeerApiError) return { code: error.code, message: error.message };
  return { code: 'internal', message: 'Unexpected error on the host' };
}
