/**
 * Splits big messages into frames a data channel always accepts, and puts them back together.
 *
 * Every browser advertises its own max message size in the SDP; the compact handshake rebuilds the SDP with 256 KiB,
 * but Safari doesn't check that limit before sending: a bigger message (a PNG portrait from an iPhone, a large world)
 * closes its side of the channel while the other side still sees it connected. 16 000 UTF-16 units are at most 48 KB
 * of UTF-8, below every browser's limit.
 */
export const MAX_FRAME_CHARS = 16_000;

/** First character of a frame. A whole message never starts with it (envelopes are JSON objects). */
export const FRAME_MARKER = '\u001e';

/** Most frames one message may have (about 1.5 GB of text): anything bigger is a broken or hostile frame. */
const MAX_FRAMES = 100_000;

/** The frames to send for `data`: itself when it fits, else `<marker><id>:<index>:<total>:<part>` frames. */
export function splitMessage(data: string, id: string, maxChars = MAX_FRAME_CHARS): string[] {
  if (data.length <= maxChars && !data.startsWith(FRAME_MARKER)) return [data];
  const parts: string[] = [];
  let start = 0;
  while (start < data.length) {
    let end = Math.min(start + maxChars, data.length);
    // Never cut a surrogate pair: each half would arrive as U+FFFD.
    if (end < data.length && isHighSurrogate(data.charCodeAt(end - 1)) && end - 1 > start) end -= 1;
    parts.push(data.slice(start, end));
    start = end;
  }
  return parts.map((part, index) => `${FRAME_MARKER}${id}:${index}:${parts.length}:${part}`);
}

export interface FrameAssembler {
  /** A complete message when `frame` is a whole message or the last missing frame of one, else null. */
  push(from: string, frame: string): string | null;
  /** Forgets a peer's unfinished messages (it left). */
  drop(from: string): void;
}

/** Collects frames per sender and message id. Malformed frames are ignored. */
export function createFrameAssembler(): FrameAssembler {
  const partial = new Map<string, { parts: string[]; received: number }>();
  return {
    push(from, frame) {
      if (!frame.startsWith(FRAME_MARKER)) return frame;
      const header = /^\u001e([^:]{1,64}):(\d{1,6}):(\d{1,6}):/.exec(frame);
      if (!header) return null;
      const index = Number(header[2]);
      const total = Number(header[3]);
      if (total < 1 || total > MAX_FRAMES || index >= total) return null;
      const key = `${from}\n${header[1]}`;
      let message = partial.get(key);
      if (!message) {
        message = { parts: new Array<string>(total), received: 0 };
        partial.set(key, message);
      }
      if (message.parts.length !== total || message.parts[index] !== undefined) return null;
      message.parts[index] = frame.slice(header[0].length);
      message.received += 1;
      if (message.received < total) return null;
      partial.delete(key);
      return message.parts.join('');
    },
    drop(from) {
      for (const key of [...partial.keys()]) if (key.startsWith(`${from}\n`)) partial.delete(key);
    },
  };
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}
