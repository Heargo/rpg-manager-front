import { InjectionToken } from '@angular/core';

/** Set by `scripts/ng-with-env.mjs` for `serve` only: the port of the doc's own dev server (Astro). */
declare const __DOCS_DEV_PORT__: string | undefined;

/**
 * Where the user documentation is served from: '' in production (the same site, under /docs), the doc's dev
 * server during `npm start` (the Angular dev server can't serve it: both use Vite's root paths).
 */
export const DOCS_ORIGIN = new InjectionToken<string>('DOCS_ORIGIN', {
  providedIn: 'root',
  factory: () =>
    typeof __DOCS_DEV_PORT__ === 'string' && __DOCS_DEV_PORT__
      ? `http://${location.hostname}:${__DOCS_DEV_PORT__}`
      : '',
});
