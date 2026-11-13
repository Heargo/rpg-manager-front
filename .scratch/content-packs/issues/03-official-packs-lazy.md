# Official packs: registry and lazy loading

Status: ready-for-agent
Type: task
Blocked by: 01

Spec: `../spec.md` (Official packs, Packs page)

- Registry `public/packs/index.json`; official pack files are excluded from the service worker precache (`ngsw-config.json`) and fetched only when the user turns the pack on, then stored on the device (IndexedDB) for offline use.
- Tools > Packs page: official packs with on/off, size, downloaded state, "Remove from device"; details view with license and content.
- Credits page lists installed packs' authors and licenses.
- No official pack besides Base yet (decided): prove the lazy path with a test fixture pack; the page lists Base alone.
