import { Injectable } from '@angular/core';

const HOST_LOCK = 'rpg-manager:host';

/**
 * One hosting tab per device (Web Locks API): a second tab with the same profile must not reopen or overwrite
 * the room. Where the API is missing, hosting is always allowed.
 */
@Injectable({ providedIn: 'root' })
export class HostLockService {
  private release?: () => void;

  /** Takes the lock if no other tab holds it. Resolves false if another tab is hosting. */
  async acquire(): Promise<boolean> {
    if (this.release) return true;
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
    if (!locks) return true;
    return new Promise<boolean>((resolve) => {
      void locks.request(HOST_LOCK, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return undefined;
        }
        resolve(true);
        // Hold the lock until release() (or until the tab closes).
        return new Promise<void>((done) => (this.release = done));
      });
    });
  }

  releaseLock(): void {
    this.release?.();
    this.release = undefined;
  }
}
