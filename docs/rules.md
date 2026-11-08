# rpg-manager-front — rules

Angular 22 app (TypeScript 6.0), zoneless, standalone components, Optimus UI 2 (MIT fork of PrimeNG 21, see `docs/adr/0001-replace-primeng-with-optimus-ui.md`; Aura preset in `src/app/ui.preset.ts`), installable as a PWA (`@angular/service-worker`). No backend: players talk peer-to-peer over WebRTC in host-dispatched rooms (`.scratch/p2p-rooms/spec.md`). The only server code is two Netlify Functions: `netlify/functions/ice-servers.mts`, which hands out TURN credentials (`docs/adr/0003-open-relay-turn.md`), and `netlify/functions/signal.mts`, an optional mailbox that lets a join work from the invite link alone (`docs/adr/0004-signal-mailbox.md`). There are no accounts: the player is a local profile (`core/business/profile.business.ts`) with a stable `playerId`. `HttpClient` only loads the app's own static files; `fetchIceServers()` calls the ICE servers function and `SignalMailboxService` (`fetch`, 5 s timeout) calls the mailbox function; both fall back gracefully when the function is unreachable.

## Structure

- `src/app/core/`: app-wide business (language, profile), components, constants, guards, helpers, i18n, models, services.
- `src/app/modules/`: one folder per feature (`home`, `profile`, then `room`, `character`, …), each with its own `*.routes.ts`, `pages/`, `business/`, `services/`, `helpers/`, `models/`.
- Something every feature needs (the player's identity, the language) lives in `core/`, so the app shell and any feature can use it.
- `src/app/styles/`: global SCSS (layout, mixins, utilities), imported from `src/styles.scss`.

## Layering

Every feature follows **component → business → service**, like sql-monitoring-front, with peer-to-peer in place of HTTP.

| Layer | Folder / suffix | Does | May use |
| --- | --- | --- | --- |
| Component / page | `components/`, `pages/` | Rendering and user interaction. No game logic, no data transformation, no peer-to-peer. | Business only: its own feature's, or `core/business`. |
| Business | `business/*.business.ts` | **Game logic**: state (signals), rules, validation, orchestration. On the host, it also answers requests (see below). | Other **business** (any feature or core) and **its own feature's service(s)**. |
| Service | `services/*.service.ts` | Wrapper around libraries (peer-to-peer, IndexedDB, QR, 3D…). Exposes functions shaped like API calls. No game logic. | `core/p2p` (`PeerApi`), libraries, stateless helpers. Never a business, never another service. |
| Helper | `helpers/*.ts`, `core/p2p/helpers/`, `core/generators/` | Stateless functions: encoding, routing, rules, random draws. | Other helpers only. No Angular injection. |

- A component never injects a service. A business never injects another feature's service: it goes through that feature's business.
- Pure game rules (apply an intent to a state, compute a price) live in `*.rules.ts` helpers that the business calls, so they're tested without TestBed.
- New code follows this; when a ticket touches code that breaks it, fix it if the ticket covers that code, otherwise note it in the ticket.

## Peer-to-peer services

Services look like a REST client so business code doesn't care that there's no server: every call returns a `Promise` (one-shot) or an `Observable` (pushed updates), and failures reject with a `PeerApiError { code, message }`, like `HttpErrorResponse`.

```ts
@Injectable({ providedIn: 'root' })
export class CharacterService {
  private readonly api = inject(PeerApi);

  // Any player: a request sent to the host, resolved with the host's answer.
  spendStatPoint(characterId: string, attribute: string): Promise<Character> {
    return this.api.request('character/spend-stat-point', { characterId, attribute });
  }

  // Any player: state the host pushes.
  watchCharacters(): Observable<Character[]> {
    return this.api.watch('character/list');
  }

  // Host only: the business plugs its rules in; the service never imports the business.
  serveSpendStatPoint(handler: PeerHandler<SpendStatPointRequest, Character>): void {
    this.api.serve('character/spend-stat-point', handler);
  }

  publishCharacters(characters: Character[]): void {
    this.api.publish('character/list', characters);
  }
}
```

- **`PeerApi`** (`core/p2p/peer-api.service.ts`) is to these services what `HttpClient` is to REST services: the one stateful piece that owns the connections (through `RoomTransport`), the role (host/client), pending requests and subscriptions. Feature services use it; business and components never do.
- **Routes** are `<feature>/<action>`; only that feature's service uses its routes. Request and response payloads are typed in the feature's `models/`.
- **On the host**, `request()` calls the registered handler in-process, so the host's own UI goes through exactly the same code as remote players. Handlers are business code (validate, apply `*.rules.ts`, persist, then `publish`).
- **Stateless or repeated plumbing goes into helpers** in `core/p2p/helpers/`, unit-tested on their own: message envelope encode/decode (`{ v, id, route, payload }`), request/response correlation, timeouts, route matching, error mapping, payload validation. If two services repeat the same few lines, it becomes a helper.
- Host offline: `PeerApi` rejects with `PeerApiError('host-offline')`, unless the business routes the call to its local offline handling (p2p ticket 10).
- Testing: business specs mock their service (`vi.fn()` returning promises/observables); service specs run against `PeerApi` over the in-memory `FakeTransport`; helpers are tested directly.

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
- Every form control is an Optimus UI one, never a native element styled by hand: numbers `p-inputNumber` (`showButtons` where steps make sense), text `pInputText`, checkboxes `p-checkbox`, switches `p-toggleSwitch`, choices `p-select` / `p-multiselect`. No `<input type="number">`, no bare `<input type="checkbox">`.
- Toasts go through Optimus UI `MessageService` (provided in `app.config.ts`) with the levels in `core/models/toast-level.ts`.

## i18n

The app is in English and French, switchable at runtime (no reload, so live peer connections survive) with Transloco (`@jsverse/transloco`). Don't use `@angular/localize` / `i18n` attributes.

- UI strings live in `public/i18n/en.json` and `public/i18n/fr.json`, nested keys by feature (`nav.*`, `auth.*`, `room.*`). Add every new key to both files in the same change.
- Templates: `{{ 'feature.key' | transloco }}` (import `TranslocoPipe`), params as `{{ 'profile.welcome' | transloco: { name } }}`.
- TypeScript (menu labels, toasts, error messages): `LanguageBusiness.t('key', params)`; it is reactive inside `computed()`. Never hard-code a user-facing string.
- The active language: `LanguageBusiness.$language`; change it with `setLanguage()`. Starting language: saved choice, then the browser language, then `en` (`core/i18n/initial-language.ts`).
- Optimus UI's built-in texts come from the `optimus` block of each language file.
- Dates: the `localDate` pipe (`core/pipes/local-date.pipe.ts`, `Intl` in the active language), not Angular's `DatePipe` (fixed locale).
- Confirmations: `ConfirmationService.confirm()` with translated header, message and button labels; the dialog lives in `app.html`.
- Data that depends on the language (generator word lists) lives in `public/i18n/generators/<lang>/`, loaded by its own service, not through Transloco.
- Supported languages are listed in `core/constants/languages.ts`; adding one means a new JSON file per folder and an entry there.

## Local storage

- Small settings (language, profile) in `localStorage`, always wrapped in `try/catch` (private mode).
- Everything else in IndexedDB through `idb`: one database, schema and version in `core/helpers/app-database.ts`. Adding a store or index means bumping the version and handling it in `upgrade`.
- Only services touch IndexedDB (`WorldStorageService`, `ImageStorageService`); they store and return whole records, rules stay in business code.
- Images: always through `ImageBusiness` (shrunk to max 512 px WebP, stored as bytes, id = SHA-256 of the bytes, so the same image is stored and sent once). Show them with `ImageBusiness.url(id)`.
- Service specs use `fake-indexeddb` (`import 'fake-indexeddb/auto'`, and `globalThis.indexedDB = new IDBFactory()` in `beforeEach` for a clean database).

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
