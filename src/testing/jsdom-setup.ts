import { createHash } from 'node:crypto';

// jsdom has no ResizeObserver nor matchMedia; Optimus UI tabs use them.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }) as unknown as MediaQueryList;
}
// jsdom has no scrollIntoView; Optimus UI selects call it on the selected option when they open.
if (typeof Element.prototype.scrollIntoView === 'undefined') {
  Element.prototype.scrollIntoView = () => {};
}
// WebCrypto's digest finishes on Node's thread pool, at no fixed point relative to timers: under a loaded full run it
// can land after the few `settle()` turns a spec waits (the player-copy hash). Hashing synchronously, then resolving,
// keeps the same SHA-256 bytes but makes it finish within the turn it started in.
{
  const realDigest = SubtleCrypto.prototype.digest;
  SubtleCrypto.prototype.digest = function (
    algorithm: AlgorithmIdentifier,
    data: BufferSource,
  ): Promise<ArrayBuffer> {
    const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
    if (name.toUpperCase() !== 'SHA-256')
      return realDigest.call(this, algorithm, data);
    const bytes = ArrayBuffer.isView(data)
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : new Uint8Array(data);
    const hash = createHash('sha256').update(bytes).digest();
    return Promise.resolve(
      hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength),
    );
  };
}
