/** Index of the recorded frame to show, clamped to [0, frameCount - 1]; the last frame on skip. */
export function replayIndex(
  elapsedMs: number,
  frameCount: number,
  skip: boolean,
  stepSeconds: number,
): number {
  const last = Math.max(0, frameCount - 1);
  if (skip) return last;
  const index = Math.floor(elapsedMs / 1000 / stepSeconds);
  return Math.min(last, Math.max(0, index));
}
