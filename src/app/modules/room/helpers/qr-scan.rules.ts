import {
  decodeSignal,
  extractSignalCode,
  SignalType,
} from '../../../core/p2p/helpers/signal-codec';

export type ScanKind =
  'invite-link' | 'invite-code' | 'answer-code' | 'unknown';
export type ScanPlace = 'host-pending-invite' | 'join-entry';
export type ScanDecoder = 'barcode-detector' | 'jsqr';
export type ScanVerdict =
  | { accepted: true; text: string }
  | { accepted: false; reason: 'wrong-kind' | 'unknown' };

function signalType(code: string): SignalType | null {
  for (const type of ['offer', 'answer'] as const) {
    try {
      decodeSignal(code, type);
      return type;
    } catch {
      // Not this kind.
    }
  }
  return null;
}

/** Sorts scanned text into an invite link, an invite code, an answer code, or something else. */
export function classifyScan(text: string): { kind: ScanKind } {
  const trimmed = text.trim();
  const code = extractSignalCode(trimmed);
  if (!code) return { kind: 'unknown' };
  const type = signalType(code);
  if (type === 'answer') return { kind: 'answer-code' };
  if (type === 'offer')
    return { kind: trimmed.includes('#') ? 'invite-link' : 'invite-code' };
  return { kind: 'unknown' };
}

const ACCEPTED: Record<ScanPlace, ScanKind[]> = {
  'host-pending-invite': ['answer-code'],
  'join-entry': ['invite-link', 'invite-code'],
};

/** The host's pending invite takes answers; the join entry takes invites. */
export function acceptScan(text: string, place: ScanPlace): ScanVerdict {
  const { kind } = classifyScan(text);
  if (kind === 'unknown') return { accepted: false, reason: 'unknown' };
  if (!ACCEPTED[place].includes(kind))
    return { accepted: false, reason: 'wrong-kind' };
  return { accepted: true, text };
}

export function pickDecoder(globals: {
  BarcodeDetector?: unknown;
}): ScanDecoder {
  return globals.BarcodeDetector ? 'barcode-detector' : 'jsqr';
}
