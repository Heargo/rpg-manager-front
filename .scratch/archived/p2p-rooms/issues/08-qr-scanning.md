# QR scanning

Status: resolved
Type: task
Blocked by: 04

Spec: `../spec.md` (Libraries).

"Scan" button on the host's pending invite (reads the player's answer QR) and on the app's join entry (reads an invite QR). Use `BarcodeDetector` when present, else `jsqr` on `getUserMedia` frames. Camera permission denied or no camera falls back to paste.

## Baseline

`npm test`: 71 test files, 459 tests, all passed (2026-11-07, `develop` at da6b0a3).

## Seams

Confirmed with the user (2026-11-07):

1. **`qr-scan.rules.ts`** (pure): sort a scanned text into an invite link, an invite code or an answer code; refuse the wrong kind for each place (the host's pending invite takes answers, the join entry takes invites); pick the decoder (`BarcodeDetector` when present, else `jsqr`). Catches classification; misses the camera.
2. **Scanner dialog component** (`TEST_PROVIDERS`), with the camera and decoder behind a mocked service: it emits the decoded text and stops the camera tracks on close; permission denied or no camera shows the paste fallback. Misses real camera frames.
3. **Entry points** (component tests, mocked scanner): Scan on the host's pending invite accepts the player's answer; Scan on the join entry opens the join flow. Misses real devices.

Decision: `jsqr` 1.4.0 (Apache-2.0) is added as a dependency and loaded lazily, as the spec's Libraries section decided. The initial bundle (984.62 kB, budget 1.02 MB) must not take the scanner.

## Red

- Test files:
  - `src/app/modules/room/helpers/qr-scan.rules.spec.ts` (new `helpers/qr-scan.rules.ts`: `classifyScan`, `acceptScan(text, 'host-pending-invite' | 'join-entry')`, `pickDecoder`)
  - `src/app/modules/room/components/qr-scan/qr-scan.component.spec.ts` (new `QrScanComponent`, inputs `place`, outputs `scanned`/`closed`; new `services/qr-scanner.service.ts` with `QrScannerService.start(video, onText) -> { stop() }` and `QrScanError('denied' | 'no-camera')`)
  - `src/app/modules/room/components/invite-card/invite-card.component.spec.ts` (new `[data-test="scan"]` button)
  - `src/app/modules/play/pages/play-page/play-page.component.spec.ts` (new `[data-test="scan"]` button on the join entry)
  - DOM contract in the dialog: `[data-test="scan-close"]`, `[data-test="scan-paste"]` (textarea), `[data-test="scan-use"]`; wrong-kind error in a `p-message` or `.scan-error`.
- Run: `npx ng test --watch=false --include <file> 2>&1 | tail -30` (per file)
- Failing: 27 tests, all red at compile time on missing modules/exports (none of the new files exist yet):
  - qr-scan.rules.spec (14): classifyScan x6 (invite link, mailbox link, invite code, answer code, whitespace, unknown), acceptScan x6 (host takes answer, host refuses invite code, host refuses invite link, join takes link/code, join refuses answer, unknown refused), pickDecoder x2 — `./qr-scan.rules` missing.
  - qr-scan.component.spec (8): emits decoded text; stops camera on close; stops camera after scan; stops camera on destroy; wrong kind keeps scanning with an error; paste fallback on denied; paste fallback on no camera; no fallback while camera works — `QrScanComponent` / `QrScannerService` missing.
  - invite-card.component.spec (2): accepts the answer read from QR; ignores a scanned invite code — `qr-scanner.service` missing.
  - play-page.component.spec (3): scanned invite link opens /join; scanned invite code opens /join; scanned answer code does not join — `qr-scanner.service` missing.
- Note: with the whole suite, the missing modules break the Angular build until green; the baseline's 459 tests are untouched.

## Green

- Files: `package.json`, `package-lock.json` (jsqr 1.4.0), `angular.json` (`jsqr` in allowedCommonJsDependencies), `public/i18n/en.json`, `public/i18n/fr.json` (`room.scan.*`), `src/app/modules/room/helpers/qr-scan.rules.ts`, `src/app/modules/room/services/qr-scanner.service.ts` (+ new `.spec.ts`), `src/app/modules/room/business/qr-scan.business.ts`, `src/app/modules/room/components/qr-scan/qr-scan.component.ts` (+ new `qr-scan-dialog.component.spec.ts`), `play-page-scan-focus.component.spec.ts` (new), `src/app/modules/room/components/invite-card/invite-card.component.ts`, `src/app/modules/play/pages/play-page/play-page.component.{ts,html,scss}` (Prettier reformatted these, so the diff is larger)
- Change: rules classify/accept/pick decoder; `QrScannerService` opens the rear camera, uses `BarcodeDetector` when it reads QR (falls through to jsqr if the constructor throws) else a dynamic `import('jsqr')`. New `QrScanBusiness` (start, accept) is the only thing the component injects. `QrScanComponent` is an Optimus UI modal `p-dialog` (Escape/close stop the camera); it stops on close, scan and destroy, including a scan decoded before the session is stored (`stopRequested`). Scan buttons on the invite card and the join entry; both parents give focus back to the Scan button after `closed` and `scanned` (`closeScanner()` with `afterNextRender`).
- Suite: 78 files, 493 tests, all pass (baseline 71 / 459). tsc clean, build OK with no CommonJS warning; initial bundle 984.62 kB (unchanged), jsQR in a lazy chunk; no spec file in unstaged diff. The existing 500 kB budget warning is unchanged.
- Open questions: none

## Review

- Verdict: fix first
- Must fix:
  - `qr-scan.component.ts:151` — injects `QrScannerService`; rules.md says "A component never injects a service", with no device-only exception — add a thin `RoomBusiness`-side (or `QrScanBusiness`) wrapper exposing `start(video, onText)`; the specs can still mock `QrScannerService`, only the component's dependency changes. (Answer to Q1: it needs a business; fixing is ~15 lines. Otherwise amend rules.md deliberately.)
  - `qr-scan.component.ts:39-43` — `aria-modal="true"` dialog without focus handling or Escape: focus is never moved into the panel (keyboard users stay behind the backdrop), no Escape close, focus is not restored to the Scan button on close — focus the title or close button in `ngAfterViewInit`, add `(keydown.escape)="close()"` on the panel, restore focus to the opener (or use Optimus UI `p-dialog`, which does all three; rules say Optimus UI first and it already provides the overlay). Add a test for Escape.
- Consider:
  - `angular.json:32` — Q2: yes, add `"jsqr"` to `allowedCommonJsDependencies` next to `qrcode`/`dijkstrajs` (same precedent; jsqr main is `dist/jsQR.js`, no ESM entry).
  - `qr-scanner.service.ts:379` — Q3: no rAF anywhere (a 150 ms `setTimeout` loop), so nothing to leak: `stop` sets the flag, clears the timer, stops tracks, and an in-flight `tick` re-checks `stopped`; a start resolving after destroy is stopped in the component (`:194`). The `BarcodeDetector` check is right (getSupportedFormats, assume QR if missing, jsqr fallback), but `new Ctor(...)` can throw and is not guarded: it ends in the generic `no-camera` fallback although jsqr would work. Wrap in try and fall through to jsqr.
  - `qr-scan.component.ts:203-211` — a code decoded before `begin()` stores `this.session` makes `stop()` a no-op; safe only because both parents hide the component on `scanned`. Have the service stop itself after the first accepted text, or set `session` before the first tick.
  - `qr-scan.component.ts:20` — component imports helper `acceptScan` directly; move into the business from the first item.
  - `play-page.component.scss:117`, `play-page.component.html` — one-line SCSS and long template lines differ from Prettier style; run Prettier.
  - Tests: no spec for the Escape/focus behaviour or for the `BarcodeDetector`/jsqr branch of the service (only the pure `pickDecoder`).
- Safety: no secret, `.env` or URL data change; invite codes stay on device.
- Spec: all ticket requirements covered by tests and implemented; nothing extra.

## Review (re-check after fixes)

- Verdict: ship
- Must fix: none. `QrScanComponent` injects only `QrScanBusiness` (business -> service + rules helper, per the layering). The overlay is a modal `p-dialog` (`aria-modal`, Escape closes and stops the camera, tested in `qr-scan-dialog.component.spec.ts`). `jsqr` is in `allowedCommonJsDependencies`; the `BarcodeDetector` constructor is guarded and falls through to jsqr; `stopRequested` stops a session that resolves after an early scan, close or destroy.
- Consider:
  - `qr-scan.component.ts:38` — focus return is not implemented here or tested. The parent removes the component with `@if` instead of hiding the dialog, so p-dialog's own restore may not run. Check by hand in the browser (open Scan, Escape, Tab) and, if focus is lost, focus the opener in the parent's `closed` handler.
  - `qr-scan.business.ts` — pure pass-through; fine as the layering seam.

## Answer

Built:

- `room/helpers/qr-scan.rules.ts`: sort a scanned text (invite link, invite code, answer code), refuse the wrong kind for each place, and pick the decoder.
- `QrScannerService`: rear camera; `BarcodeDetector` when it reads QR codes, falling through to `jsqr` if its constructor throws; otherwise a lazy `import('jsqr')` (`jsqr` 1.4.0, in its own lazy chunk and in `allowedCommonJsDependencies`). Errors map to `QrScanError('denied' | 'no-camera')`.
- `QrScanBusiness`: the only thing the component injects.
- `QrScanComponent`: a modal `p-dialog`. Escape or Close stops the camera, and so do a scan and destroy, including a code decoded before the session is stored. It shows a wrong-kind error and the paste fallback when the camera is denied or missing.
- Scan buttons on the host's pending invite (accepts the player's answer) and on the join entry (opens `/join`). Both give focus back to the Scan button when the dialog closes.

Checked:

- Suite: 78 files, 493 tests (baseline 71 / 459). Build OK with no CommonJS warning; the initial bundle is unchanged at 984.62 kB.
- Browser (no camera in the in-app browser), on the join entry:
  - Scan opens the paste fallback ("No camera available"), with focus in the paste box.
  - Escape closes it, and focus returns to Scan.
  - A bad paste shows "This QR code is not a connection code." and stays on `/play`.
  - Checked in French, and in English at mobile width, with no console error.
- Not checked: real camera scanning (needs a device with a camera); the host-side Scan is covered by `invite-card.component.spec.ts`.

Left as Consider: none open from the review.
