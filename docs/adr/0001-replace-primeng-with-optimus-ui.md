# 0001 — Replace PrimeNG with Optimus UI

Status: accepted
Date: 2026-11-06

## Context

The app used PrimeNG 20 (menubar, tiered menu, avatar, button, float label, input text, message, toast, dynamic dialog), `primeicons` and an Aura preset from `@primeuix/themes`. PrimeNG 22 is the only release that supports Angular 22, and it moved to a commercial licence: without a key it shows an "Invalid PrimeUI License" badge. PrimeNG 21 is the last MIT release and only supports Angular 21.

The sibling project `sql-monitoring` hit the same wall and moved to Optimus UI (its ADR-0001, 2026-11-01).

## Decision

Use **Optimus UI 2** (`@openng/optimus-ui`, `@openng/optimus-ui-themes`, `@openng/icons`), the community-maintained MIT fork of PrimeNG 21 ([openng-org/optimus-ui](https://github.com/openng-org/optimus-ui)), on Angular 22.

- Same `p-*` selectors, CSS classes, Aura theme and `pi pi-*` icon names as PrimeNG, so the swap was an import rewrite (`primeng/x` → `@openng/optimus-ui/x`, `providePrimeNG` → `provideOptimus`, `primeicons` → `@openng/icons`).
- Same library as `sql-monitoring-front`, so knowledge and fixes carry across.
- It does not depend on `@angular/animations`.

## Consequences

- PrimeNG docs for v22+ no longer apply; use the Optimus UI docs.
- Community support only. Recheck the project's health at each Angular major; PrimeNG's commercial licence (free community tier for individuals) stays the fallback, since the APIs share a base.
