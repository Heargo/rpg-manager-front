# Wire up the test runner

Status: resolved
Type: task

Migrate Karma to Vitest (`ng update @angular/cli --name migrate-karma-to-vitest`), make `npm test` run it, fix or delete the CLI stub specs, document commands in `docs/rules.md`.

Done when: `npm test` runs and passes.

## Answer

- Karma/Jasmine replaced by Vitest (`@angular/build:unit-test`, jsdom); Karma, Jasmine and istanbul packages removed. `npm test` runs once, `npm run test:watch` watches.
- Deleted the four CLI "should create" stubs (app, loading, home, profile) that referenced a missing `SharedModule` and `@ngx-translate`.
- `src/testing/test-providers.ts`: router, mocked HttpClient, real EN/FR translations, Optimus UI services.
- First real tests: `initial-language.spec.ts`, `language.business.spec.ts`, `not-found.component.spec.ts` (EN → FR switch). 10 tests passing.
- Found while testing: Transloco settings were duplicated between app and tests; moved to `core/i18n/transloco-config.ts`.
- Commands documented in `docs/rules.md` (Tests).
