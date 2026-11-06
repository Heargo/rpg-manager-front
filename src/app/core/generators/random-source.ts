/** Where random numbers come from. Every generator takes one, so tests and rerolls can be deterministic. */
export interface RandomSource {
  /** A uniformly distributed integer in [0, 2^32). */
  nextUint32(): number;
}

const BUFFER_SIZE = 256;

/** Cryptographically strong source (`crypto.getRandomValues`), for anything a player sees as a roll. */
export function cryptoRandomSource(): RandomSource {
  const buffer = new Uint32Array(BUFFER_SIZE);
  let index = BUFFER_SIZE;
  return {
    nextUint32() {
      if (index >= BUFFER_SIZE) {
        crypto.getRandomValues(buffer);
        index = 0;
      }
      return buffer[index++];
    },
  };
}

/**
 * Seeded source (sfc32), for rerolls, previews and tests: the same seed always gives the same sequence.
 * Not for fair rolls: use `cryptoRandomSource()` for those.
 */
export function seededRandomSource(seed: string): RandomSource {
  let [a, b, c, d] = hashSeed(seed);
  const source: RandomSource = {
    nextUint32() {
      const t = (((a + b) >>> 0) + d) >>> 0;
      d = (d + 1) >>> 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) >>> 0;
      c = ((c << 21) | (c >>> 11)) >>> 0;
      c = (c + t) >>> 0;
      return t;
    },
  };
  // Discard the first outputs so similar seeds diverge.
  for (let i = 0; i < 15; i++) source.nextUint32();
  return source;
}

const SEED_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** A short, readable seed (no 0/O/1/l), e.g. to show next to a "Reroll" button. */
export function createSeed(source: RandomSource = cryptoRandomSource(), length = 8): string {
  let seed = '';
  for (let i = 0; i < length; i++) {
    // 32 is a power of two that divides 2^32: taking the low bits is unbiased.
    seed += SEED_ALPHABET[source.nextUint32() & 31];
  }
  return seed;
}

/** cyrb128: spreads any string into four 32-bit words. */
function hashSeed(seed: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < seed.length; i++) {
    const k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
