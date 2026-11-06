# Local profile replaces accounts

Status: resolved
Type: task

Spec: `../spec.md` (Identity).

- Remove `AuthService`, `UsersService`, `tokenInterceptor`, auth guards, login/register pages, `@supabase/supabase-js`.
- Add a profile `{ playerId, name, avatar? }` in `localStorage`, created on first launch, edited on the profile page.
- Nav bar shows the profile name/avatar; no login state.

Done when: the app runs with nothing on `localhost:3000` and no HTTP call is made.

## Answer

- Removed: `modules/authentification` (login/register pages, auth business/service), `UsersService`/`UsersBusiness`/`User`, `tokenInterceptor`, auth guards, the unused module-import guard, `errors.utils.ts`, the password-match validator, `src/environments` (only held `API_URL`), `@supabase/supabase-js`, and the `auth.*` translations.
- Identity lives in `core/` because the shell and every feature need it: `core/models/profile.ts` (`{ playerId, name }`), `core/helpers/profile.rules.ts` (normalize, validate, default name, parse stored JSON), `core/services/profile-storage.service.ts` (localStorage + `crypto.randomUUID()`), `core/business/profile.business.ts` (`$profile`, `$initial`, `rename()`).
- First launch creates "Adventurer xxxx" / "Aventurier xxxx" (first 4 id characters) and saves it; a corrupt stored profile is replaced.
- `/profile` page (Optimus card, avatar, name field with validation, save toast, player ID shown); nav bar avatar shows the initial, menu = Profile + Language.
- `avatar` from the ticket left out: nothing uses an image yet; the initial is shown. Add it with portraits (L05).
- Checked in the browser: no request to `localhost:3000` after reload (only Google Fonts, already in the styles), profile and id survive reload, rename normalizes and saves, blank name blocked, EN and FR, phone width.
- Tests: `profile.rules.spec.ts`, `profile.business.spec.ts` (20 tests in the suite).
