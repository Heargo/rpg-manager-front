# rpg-manager-front — rules

Angular 22 app (TypeScript 6.0), zoneless, standalone components, Optimus UI 2 (MIT fork of PrimeNG 21, see `docs/adr/0001-replace-primeng-with-optimus-ui.md`; Aura preset in `src/app/ui.preset.ts`), installable as a PWA (`@angular/service-worker`). Talks to the backend over HTTP (`environment.API_URL`, token added by `core/interceptors/token.interceptor.ts`).

## Structure

- `src/app/core/`: shared components, constants, guards, interceptors, models, services, utils, validators.
- `src/app/modules/`: one folder per feature (`authentification`, `home`, `user`), each with its own `*.routes.ts`, `pages/`, `business/`, `services/`, `models/`.
- `src/app/styles/`: global SCSS (layout, mixins, utilities), imported from `src/styles.scss`.

## Layering

Target architecture inside each feature: **component → business → service**.

| Layer | Folder / suffix | Does | May call |
| --- | --- | --- | --- |
| Component / page | `components/`, `pages/` | Rendering and user interaction. No HTTP, no data transformation. | Its own feature's business (and `core/` business). |
| Business | `business/*.business.ts` | State, transformations, validation, orchestration. Exposes state as signals. | Its own feature's service(s) and other **business** (other features' or core). |
| Service | `services/*.service.ts` | API calls only (`HttpClient`). Returns the raw response. | Nothing above it, and no other service. |

- A component never injects a service directly; a business never injects another feature's service.
- Infrastructure in `core/services` (menu, token storage) follows the same rule: business code calls it, components don't.
- New code follows the target; when a ticket touches a component that calls a service, route it through the business if the ticket covers it, otherwise note it.

## Signals

The app is zoneless, so signals are the default for state.

- Business state: `signal()` / `computed()`, exposed read-only (`asReadonly()` or a `computed`). Components read signals in templates; don't `subscribe` in a component to copy a value into a field.
- Use signals instead of observables when it's cleaner: one-shot HTTP results, derived values, UI state. Bridge with `toSignal()` / `toObservable()` from `@angular/core/rxjs-interop`, or `firstValueFrom()` for a one-shot call.
- Keep RxJS where it earns its place: real streams, `debounceTime`/`switchMap` cancellation, combining async sources. When you subscribe, end the pipe with `takeUntilDestroyed()`.
- Component API: signal-based `input()`, `input.required()`, `output()`, `model()`, `viewChild()` / `contentChild()`. No `@Input()`, `@Output()`, `@ViewChild()`.
- Templates use block control flow (`@if`, `@for`, `@switch`), not `*ngIf` / `*ngFor`.

## UI

- Use Optimus UI components (`@openng/optimus-ui/<component>`, selectors `p-*`) before writing custom ones. Use the Optimus UI docs, not PrimeNG's v22+ docs. Never add `primeng` back. Theme tokens go in `ui.preset.ts`, not in component SCSS.
- Icons come from `@openng/icons` (`pi pi-<name>`); check the name exists in `node_modules/@openng/icons/openng-icons.css`.
- Toasts go through Optimus UI `MessageService` (provided in `app.config.ts`) with the levels in `core/models/toast-level.ts`.

## i18n

The app is in English and French, switchable at runtime (no reload, so live peer connections survive) with Transloco (`@jsverse/transloco`). Don't use `@angular/localize` / `i18n` attributes.

- UI strings live in `public/i18n/en.json` and `public/i18n/fr.json`, nested keys by feature (`nav.*`, `auth.*`, `room.*`). Add every new key to both files in the same change.
- Templates: `{{ 'feature.key' | transloco }}` (import `TranslocoPipe`), params as `{{ 'profile.welcome' | transloco: { name } }}`.
- TypeScript (menu labels, toasts, error messages): `LanguageBusiness.t('key', params)`; it is reactive inside `computed()`. Never hard-code a user-facing string.
- The active language: `LanguageBusiness.$language`; change it with `setLanguage()`. Starting language: saved choice, then the browser language, then `en` (`core/i18n/initial-language.ts`).
- Optimus UI's built-in texts come from the `optimus` block of each language file.
- Data that depends on the language (generator word lists) lives in `public/i18n/generators/<lang>/`, loaded by its own service, not through Transloco.
- Supported languages are listed in `core/constants/languages.ts`; adding one means a new JSON file per folder and an entry there.

## PWA

- The service worker is registered in `app.config.ts` (`provideServiceWorker`) and only runs in production builds; check it with `npm run build` and a static server, not `ng serve`.
- Caching rules live in `ngsw-config.json` (translations under `/i18n/**` are prefetched so both languages work offline); the web manifest is `public/manifest.webmanifest`, icons in `public/icons/`.
- Never cache authenticated API responses in `dataGroups` without an explicit decision.

## Commands

- `npm install`
- `npm run start`: dev server on http://localhost:4200
- `npm run build`: production build in `dist/panel`
- `npm run watch`: `ng build --watch`
- `npm test`: Vitest suite, single run
- `npm run test:watch`: Vitest in watch mode

## Conventions

- Prettier formats the code (config in `package.json`, Angular parser for HTML).
- Never commit `.env` files or secrets.

## Tests

Vitest through Angular's `@angular/build:unit-test` builder (jsdom), globals (`describe`, `it`, `expect`, `vi`) enabled. Specs sit next to the code as `*.spec.ts`.

- Full suite: `npm test`
- One file: `npx ng test --watch=false --include src/app/path/to/file.spec.ts`
- Typecheck specs: `npx tsc -p tsconfig.spec.json --noEmit`

- Pure helpers (generators, codecs, reducers) are tested directly, without TestBed.
- Business classes: `TestBed.configureTestingModule({ providers: [...] })` then `TestBed.inject`.
- Components are standalone, so specs use `imports: [Component]` and `providers: TEST_PROVIDERS` from `src/testing/test-providers.ts` (router, mocked `HttpClient`, real EN/FR translations, Optimus UI `MessageService`/`DialogService`). Await `fixture.whenStable()` instead of calling `detectChanges()` (zoneless).
- Translations in specs come from the real `public/i18n/*.json` files with the app's own Transloco settings (`core/i18n/transloco-config.ts`), so a missing key or a broken language switch fails a test.
- Randomness: inject a `RandomSource`; use a seeded one in tests, never `Math.random()` in code under test.
