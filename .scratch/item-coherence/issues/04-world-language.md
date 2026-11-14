# The world has a language

Status: ready-for-agent
Type: task
Blocked by: none

Spec: `../spec.md` (Decision 7, Assumed: world language, other-language packs in the rules).

- `World` gets `language` (`en` | `fr`). New world: the app language. A stored world without it reads as the app language. The sandbox world follows the app language.
- The wizard's Rules step and the rules page show a language select (Optimus UI `p-select`) above the packs.
- In the packs list, a pack in another language than the world's is tagged "images, kinds and tints only". A neutral pack is tagged "images".
- The world language is what the generators will read (05); nothing else changes here.
