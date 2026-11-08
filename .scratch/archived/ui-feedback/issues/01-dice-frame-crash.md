# 3D dice roller crash

Status: resolved
Type: bug
Blocked by: none

Spec: `../spec.md` (Bugs).

Rolling throws `TypeError: can't access property "forEach", frame is undefined` and the animation breaks. Reproduce, find the cause, fix it with a regression test.

## Baseline

`npm test`: 85 test files, 540 tests, all passed (2026-11-07, `develop` at a9cf8a6).

## Cause

In `dice-scene.ts` `replay()`, `start = performance.now()` is taken before the first `requestAnimationFrame`. The rAF callback's `now` is that frame's start time, which can be *earlier* than `start`. So `(now - start)` is negative, `Math.floor` gives −1, and `frames[-1]` is `undefined`. `applyFrame(undefined)` then throws "frame is undefined".

## Seams

Confirmed with the user (2026-11-07): a pure `replayIndex(elapsedMs, frameCount, skip)` helper in `dice/helpers/`, used by `replay()`. It is clamped to `[0, frameCount − 1]` and returns the last index on skip. Regression test: a negative elapsed time gives 0. Catches the index maths; misses the WebGL rendering.

## Red

- Test files: `src/app/modules/dice/helpers/replay-index.spec.ts`
- Run: `npx ng test --watch=false --include src/app/modules/dice/helpers/replay-index.spec.ts 2>&1 | tail -30`
- Signature the tests expect: `replayIndex(elapsedMs, frameCount, skip, stepSeconds)` exported from `helpers/replay-index.ts`. The step duration is a parameter (4th), not an export, so the helper does not import `dice-scene.ts` (three/cannon). `replay()` passes `STEP`.
- Failing: 6 tests, all fail at build because `./replay-index` does not exist (missing module):
  - gives 0 for a negative elapsed time
  - gives 0 at the start
  - advances one frame per step duration (1000 ms, 100 frames gives 60)
  - clamps to the last frame when elapsed exceeds the animation
  - gives the last frame on skip
  - gives 0 for a single frame

## Green

- Files: src/app/modules/dice/helpers/replay-index.ts (new), src/app/modules/dice/services/dice-scene.ts
- Change: added pure `replayIndex(elapsedMs, frameCount, skip, stepSeconds)` clamped to [0, frameCount-1] (last on skip); `replay()` uses it with `STEP`; `applyFrame` returns early on an undefined frame.
- Suite: 86 files, 546 tests, all passed (baseline 85 / 540, +1 file, +6 tests); tsc clean; ng build no error.
- Open questions: none

## Review

- Verdict: ship
- Must fix: none
- Consider:
  - src/app/modules/dice/services/dice-scene.ts:146-147 — the `applyFrame` guard is now dead code for non-empty `frames`, because `replayIndex` always returns a valid index. It would only swallow an empty-frames bug silently, and it widens the parameter type to `| undefined` for nothing. Remove it, or keep it only if empty `frames` is a real case.
  - dice-scene.ts:~130 — the root cause is that `start` comes from `performance.now()` while rAF's `now` is the frame start time. Setting `start` from the first rAF timestamp would also remove the first-frame skew. The clamp is enough for the crash, so this is optional.
  - replay-index.spec.ts — `STEP` is duplicated from `dice-scene.ts`. That is acceptable, since the helper must not import three/cannon.

Checked: the cause in the ticket is correct. A negative elapsed time gives `Math.floor` = -1 and `frames[-1]` is undefined. The clamp to [0, last] and the skip branch are covered by tests, and a plausible regression (dropping the `Math.max(0, ...)`) turns the negative test red. The guard cannot hide "dice never move": the index advances with elapsed time, and the orchestrator's browser check showed rolls animating and settling.

## Answer

- Fix: the new pure helper `dice/helpers/replay-index.ts` (`replayIndex(elapsedMs, frameCount, skip, stepSeconds)`), clamped to `[0, frameCount − 1]` and returning the last frame on skip, is used by `DiceScene.replay()`. `applyFrame` also returns early on a missing frame; the review notes it's now only defensive.
- Checked:
  - Suite: 86 files, 546 tests (baseline 85 / 540).
  - Browser, `/dice`: two d20 rolls animate and settle on their result, with no new console error. A first attempt showed the error again only because the dev server had built a stale chunk; after a rebuild it was gone.
- Left as Consider: take `start` from the first rAF timestamp, to remove the first-frame skew as well.
