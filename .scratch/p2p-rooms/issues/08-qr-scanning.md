# QR scanning

Status: needs-triage
Type: task
Blocked by: 04

Spec: `../spec.md` (Libraries).

"Scan" button on the host's pending invite (reads the player's answer QR) and on the app's join entry (reads an invite QR). Use `BarcodeDetector` when present, else `jsqr` on `getUserMedia` frames. Camera permission denied or no camera falls back to paste.
