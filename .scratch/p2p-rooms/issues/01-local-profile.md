# Local profile replaces accounts

Status: ready-for-agent
Type: task

Spec: `../spec.md` (Identity).

- Remove `AuthService`, `UsersService`, `tokenInterceptor`, auth guards, login/register pages, `@supabase/supabase-js`.
- Add a profile `{ playerId, name, avatar? }` in `localStorage`, created on first launch, edited on the profile page.
- Nav bar shows the profile name/avatar; no login state.

Done when: the app runs with nothing on `localhost:3000` and no HTTP call is made.
