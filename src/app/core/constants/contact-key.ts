import { InjectionToken } from '@angular/core';

/** Set at build time by `scripts/ng-with-env.mjs` from `CONTACT_KEY`; undefined in tests and plain `ng` runs. */
declare const __CONTACT_KEY__: string | undefined;

/** Web3Forms access key for the contact form; '' when the build has none. */
export const CONTACT_KEY = new InjectionToken<string>('CONTACT_KEY', {
  providedIn: 'root',
  factory: () => (typeof __CONTACT_KEY__ === 'string' ? __CONTACT_KEY__ : ''),
});
