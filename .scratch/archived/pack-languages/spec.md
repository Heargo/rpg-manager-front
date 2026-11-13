# One language per pack, packs chosen per world

User request 2026-11-13: "on oublie de devoir gérer les traductions dans les packs. Pour faire les traductions il suffit d'avoir 1 pack par langue (et dans les règles du monde on choisit quels packs activer)". Replaces the per-language fields of `content-packs` (archived spec, sections Manifest, Pack choice, Pack creator). Dev project: no backward compatibility, the old format is replaced outright.

## Decisions (user, 2026-11-13)

- **A pack has one language.** The manifest gets a required `language` field (`en` | `fr`). `name` and `description` become plain strings. Word lists are given once per generator (`generators: { items?, npcs?, skills?, classes? }`, each a path). A sprite has one `label` instead of `en` / `fr`.
- **Base becomes two official packs: `base-fr` and `base-en`.** Both ship with the app, are always installed and can't be removed. Each has its language's four word lists and the 101 Fantasy items sprites with labels in its language.
- **Packs are activated only in the world.** The on/off toggle of the Packs page goes away: that page installs (downloads, adds from a link, creates, duplicates) and removes packs. Each world's rules hold the list of its **active packs**.
- **New world: the Base of the app language is active** (`base-fr` when the app is in French). The GM changes it in the rules page and in the wizard's Rules step.
- **A world may mix languages.** The rules list every installed pack with a language tag, and the GM ticks the ones they want.
- **The Pack select next to the seed stays.** It offers "Random" and the world's active packs that have content for this generator. It no longer filters by the app language.

## Assumed

- Tools used without a world (sandbox, generator pages from the Tools menu) use the Base of the app language. *(assumed)*
- A world whose active packs give no word list for a generator falls back to the Base of the app language for that generator, as today's fallback to Base. *(assumed)*
- A world's active pack that isn't installed on this device (world imported, pack removed) is shown in the rules as missing, with a way to install it if it is official. It is skipped by the generators. *(assumed)*
- Packs stored on a device in the old two-language format are dropped when the database upgrades. Drafts in the old format too. *(assumed: dev, no fallback)*
- The registry (`public/packs/index.json`) gives `language` instead of `languages`.
- Duplicate keeps the language. The copy's name suffix is " (copie)" or " (copy)" depending on the pack's language, not the app's.
- In a room, the host generates, so players don't need the packs installed. *(assumed, as today)*

## Out of scope

- Translating a pack automatically, or linking an FR pack with its EN twin.
