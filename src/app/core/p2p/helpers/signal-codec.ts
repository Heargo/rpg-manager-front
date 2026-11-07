import { buildDataChannelSdp, packCompactSdp, parseDataChannelSdp, unpackCompactSdp } from './compact-sdp';

/**
 * Offer and answer codes for the manual WebRTC handshake (p2p-rooms spec, "Encoding the codes"):
 * "2." + base64url(compact binary SDP), ~150–200 characters. See compact-sdp.ts.
 */

export const SIGNAL_CODE_VERSION = '2';

export type SignalType = 'offer' | 'answer';

export type SignalCodeErrorReason = 'empty' | 'version' | 'corrupt' | 'wrong-type';

export class SignalCodeError extends Error {
  constructor(readonly reason: SignalCodeErrorReason) {
    super(`Invalid connection code (${reason})`);
  }
}

export interface SignalDescription {
  type: SignalType;
  sdp: string;
}

/**
 * Throws if the SDP isn't a single data channel (the only kind this app creates). A code without candidates is
 * allowed: the other side's candidates can still connect (this side is then found as a peer-reflexive address).
 */
export function encodeSignal(description: SignalDescription): string {
  const compact = parseDataChannelSdp(description.sdp);
  if (!compact) throw new Error('Unsupported SDP: expected a single data channel');
  return `${SIGNAL_CODE_VERSION}.${toBase64Url(packCompactSdp(compact, description.type === 'offer'))}`;
}

/** Decodes a code (or a whole invite link) and checks it is the expected kind. */
export function decodeSignal(input: string, expected: SignalType): SignalDescription {
  const code = extractSignalCode(input);
  if (!code) throw new SignalCodeError('empty');
  const dot = code.indexOf('.');
  if (dot < 0 || code.slice(0, dot) !== SIGNAL_CODE_VERSION) throw new SignalCodeError('version');

  let decoded: ReturnType<typeof unpackCompactSdp>;
  try {
    decoded = unpackCompactSdp(fromBase64Url(code.slice(dot + 1)));
  } catch {
    throw new SignalCodeError('corrupt');
  }
  const type: SignalType = decoded.isOffer ? 'offer' : 'answer';
  if (type !== expected) throw new SignalCodeError('wrong-type');
  const sessionId = String(Math.floor(Math.random() * 2 ** 52) + 1);
  return { type, sdp: buildDataChannelSdp(decoded.compact, sessionId) };
}

/**
 * Accepts a bare code or a link with the code after `#`, and drops whitespace chat apps add when wrapping
 * and the "~<box id>" suffix of a link made for the signalling mailbox.
 */
export function extractSignalCode(input: string): string {
  const hash = input.indexOf('#');
  const code = (hash >= 0 ? input.slice(hash + 1) : input).replace(/\s+/g, '');
  const tilde = code.indexOf('~');
  return tilde >= 0 ? code.slice(0, tilde) : code;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) throw new SignalCodeError('corrupt');
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
