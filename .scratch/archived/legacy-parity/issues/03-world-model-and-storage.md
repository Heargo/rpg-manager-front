# World model and local storage

Status: resolved
Type: task

Spec "Data in a serverless world". Models: Game (name, description, image, attributes, bar attributes, starting stat points, starting money, money format), Character, Item, InventoryItem (equipped, slot position). IndexedDB store for worlds and image blobs (client-side resize to WebP). JSON export/import of a world.

## Answer

- Models in `modules/world/models/world.ts`: `World` (attributes, bar attributes by id, starting points/money, money format, offline features, item catalogue, characters, notes, illustration, quick images), `WorldAttribute`, `Item` (draft + id + image), `Character` (`playerId`, points per attribute, current values, inventory, `rev`), `InventoryItem` (a copy of the item, equipped, position), `WorldSummary`, `WorldDraft`.
- Helpers: `world.factory.ts` (create from draft with default offline features, summaries, list and remap image ids), `world-export.ts` (versioned `rpg-manager-world` format with images as base64, validation with readable errors), `core/helpers/base64.ts`, `core/helpers/image-size.ts`, `core/helpers/app-database.ts` (idb schema: `worlds`, `images`).
- Services: `WorldStorageService`, `ImageStorageService` (bytes + type, id = SHA-256, stored once), `ImageProcessingService` (max 512 px, WebP via OffscreenCanvas).
- Business: `ImageBusiness` (core: store uploads, object URLs, base64 in/out), `WorldLibraryBusiness` (`$worlds` newest first, create, save, remove, export to one JSON file, import as a new copy with image ids recomputed from the bytes).
- Images are stored as `ArrayBuffer` rather than `Blob` (a Blob read back from IndexedDB failed in tests; Safari has had Blob-in-IndexedDB issues too).
- Deleting a world keeps its images (another world may share the bytes); a cleanup can come later if storage grows.
- Checked in the browser: createImageBitmap + OffscreenCanvas WebP encoding works (1200×600 PNG → 512×256 WebP). Real IndexedDB and uploads get their first UI in L04.
- Tests: 17 new (helpers, export validation, IndexedDB round trips with fake-indexeddb). Suite: 74 passing. `docs/rules.md` has a Local storage section.
