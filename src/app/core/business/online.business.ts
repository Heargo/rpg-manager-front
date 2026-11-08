import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

/** Whether the device has a network, from the browser's online/offline events. */
@Injectable({ providedIn: 'root' })
export class OnlineBusiness {
  private readonly online = signal(
    inject(DOCUMENT).defaultView?.navigator.onLine ?? true,
  );
  readonly $online = this.online.asReadonly();

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    view?.addEventListener('online', () => this.online.set(true));
    view?.addEventListener('offline', () => this.online.set(false));
  }
}
