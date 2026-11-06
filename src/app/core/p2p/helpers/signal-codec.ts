/**
 * Offer and answer codes for the manual WebRTC handshake (p2p-rooms spec, "Encoding the codes").
 * Code = "1." + base64url(deflate-raw("o|" or "a|" + SDP)).
 */

export const SIGNAL_CODE_VERSION = '1';

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

const TYPE_MARK: Record<SignalType, string> = { offer: 'o', answer: 'a' };

export async function encodeSignal(description: SignalDescription): Promise<string> {
  const payload = new TextEncoder().encode(`${TYPE_MARK[description.type]}|${description.sdp}`);
  const compressed = await transform(payload, new CompressionStream('deflate-raw'));
  return `${SIGNAL_CODE_VERSION}.${toBase64Url(compressed)}`;
}

/** Decodes a code (or a whole invite link) and checks it is the expected kind. */
export async function decodeSignal(input: string, expected: SignalType): Promise<SignalDescription> {
  const code = extractSignalCode(input);
  if (!code) throw new SignalCodeError('empty');
  const dot = code.indexOf('.');
  if (dot < 0 || code.slice(0, dot) !== SIGNAL_CODE_VERSION) throw new SignalCodeError('version');

  let text: string;
  try {
    const bytes = await transform(fromBase64Url(code.slice(dot + 1)), new DecompressionStream('deflate-raw'));
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new SignalCodeError('corrupt');
  }

  const mark = text.slice(0, 2);
  const type = mark === 'o|' ? 'offer' : mark === 'a|' ? 'answer' : undefined;
  const sdp = text.slice(2);
  if (!type || !sdp.startsWith('v=0')) throw new SignalCodeError('corrupt');
  if (type !== expected) throw new SignalCodeError('wrong-type');
  return { type, sdp };
}

/** Accepts a bare code or a link with the code after `#`, and drops whitespace chat apps add when wrapping. */
export function extractSignalCode(input: string): string {
  const hash = input.indexOf('#');
  return (hash >= 0 ? input.slice(hash + 1) : input).replace(/\s+/g, '');
}

async function transform(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // Don't await: the readable side must be drained at the same time or large inputs stall.
  const written = writer.write(bytes as BufferSource).then(() => writer.close());
  // If the data is corrupt the reader throws first; the writer then rejects too and must not go unhandled.
  written.catch(() => undefined);
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (let result = await reader.read(); !result.done; result = await reader.read()) chunks.push(result.value);
  await written;
  const output = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new SignalCodeError('corrupt');
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
