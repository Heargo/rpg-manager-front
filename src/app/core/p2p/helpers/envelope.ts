import { isPeerApiErrorCode, PeerApiErrorCode } from './peer-api-error';
import { isValidRoute } from './routes';

export const PROTOCOL_VERSION = 1;

/** Everything sent over a data channel. */
export type Envelope =
  | { v: 1; kind: 'request'; id: string; route: string; payload: unknown }
  | { v: 1; kind: 'response'; id: string; payload: unknown }
  | { v: 1; kind: 'error'; id: string; code: PeerApiErrorCode; message: string }
  /** A topic's full current state; `seq` grows per topic so clients can drop out-of-date ones. */
  | { v: 1; kind: 'publish'; topic: string; seq: number; payload: unknown };

export function encodeEnvelope(envelope: Envelope): string {
  return JSON.stringify(envelope);
}

/** Parses and checks a message; returns null for anything malformed or from another protocol version. */
export function decodeEnvelope(data: string): Envelope | null {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const e = value as Record<string, unknown>;
  if (e['v'] !== PROTOCOL_VERSION) return null;
  const isId = typeof e['id'] === 'string' && e['id'].length > 0;
  switch (e['kind']) {
    case 'request':
      return isId && isValidRoute(e['route']) && 'payload' in e ? (e as Envelope) : null;
    case 'response':
      return isId && 'payload' in e ? (e as Envelope) : null;
    case 'error':
      return isId && isPeerApiErrorCode(e['code']) && typeof e['message'] === 'string' ? (e as Envelope) : null;
    case 'publish':
      return isValidRoute(e['topic']) && Number.isInteger(e['seq']) && 'payload' in e ? (e as Envelope) : null;
    default:
      return null;
  }
}
