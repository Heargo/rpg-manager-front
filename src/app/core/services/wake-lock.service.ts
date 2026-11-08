import { DOCUMENT, inject, Injectable } from '@angular/core';

/** Keeps the screen on while something waits for the user (Screen Wake Lock API; no-op where unsupported). */
@Injectable({ providedIn: 'root' })
export class WakeLockService {
  private readonly document = inject(DOCUMENT);
  private sentinel: WakeLockSentinel | null = null;
  private held = false;

  constructor() {
    // The browser drops the lock when the page is hidden: take it again on return.
    this.document.addEventListener('visibilitychange', () => {
      if (this.held && this.document.visibilityState === 'visible')
        void this.acquire();
    });
  }

  async request(): Promise<void> {
    this.held = true;
    await this.acquire();
  }

  release(): void {
    this.held = false;
    const sentinel = this.sentinel;
    this.sentinel = null;
    sentinel?.release().catch(() => undefined);
  }

  private async acquire(): Promise<void> {
    const wakeLock =
      typeof navigator === 'undefined' ? undefined : navigator.wakeLock;
    if (!wakeLock) return;
    try {
      const sentinel = await wakeLock.request('screen');
      if (!this.held) {
        sentinel.release().catch(() => undefined);
        return;
      }
      this.sentinel = sentinel;
    } catch {
      // Denied (battery saver, hidden page): joining works without it.
    }
  }
}
