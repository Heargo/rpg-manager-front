# Money as fantasy coins

Status: resolved
Type: task
Blocked by: none

Spec: `../spec.md` (Money (decided: legacy fantasy coins)).

Integer copper everywhere, formatted as gold / silver / copper with coin icons (own SVGs), as in legacy. Replaces the current money format setting. Inputs for prices and starting money accept coins.

## Baseline

`npm test`: 86 test files, 546 tests, all passed (2026-11-07, `develop` at 6b778e7).

## Seams

Confirmed with the user (2026-11-07):

1. **`money.rules.ts`** (pure): copper to `{gold, silver, copper}` (1 gold = 100 silver = 10 000 copper); the legacy display parts (gold hidden at 0, silver hidden when gold and silver are both 0, copper always); a coin input back to copper.
2. **Components** (`TEST_PROVIDERS`): a coin display (amounts with coin icons and accessible labels), and a coin input (gold, silver and copper fields) used for prices and starting money.
3. **Existing rules on integer copper**: selling, starting money and item generator prices; their tests are updated. The money format setting is removed outright (no backward compatibility).

## Red

- Test files: `src/app/core/helpers/money.rules.spec.ts` (new), `src/app/core/components/coin-display/coin-display.component.spec.ts` (new), `src/app/core/components/coin-input/coin-input.component.spec.ts` (new), `src/app/core/generators/item-generator.spec.ts`, `src/app/modules/world/helpers/world.factory.spec.ts`, `src/app/modules/world/helpers/default-world.spec.ts`, `src/app/modules/character/helpers/character-actions.rules.spec.ts`, `src/app/modules/character/helpers/character.rules.spec.ts`, `src/app/modules/world/helpers/world-draft.rules.spec.ts`. Deleted: `src/app/modules/world/helpers/money.spec.ts` (old `formatMoney`, replaced outright).
- Run: `npx ng test --watch=false --include <file>` per file. The full `npx ng test --watch=false` does not build until the three missing modules exist.
- Seams chosen by the tests: `core/helpers/money.rules.ts` exports `splitCopper`, `coinDisplayParts` (`[{coin, amount}]`), `coinsToCopper`; `CoinDisplayComponent` (input `copper`, `[data-coin]` elements, `img` alt and `src` `*-coin.svg`); `CoinInputComponent` (`value` model, native `input[name=gold|silver|copper]`). Item prices are now multiples of 500 copper, at least 500; sandbox starting money is 5000.
- Failing: 8 tests (4 of them in suites that fail to compile)
  - money.rules.spec (6 tests) — `./money.rules` does not exist
  - coin-display.component.spec (3 tests) — `./coin-display.component` does not exist
  - coin-input.component.spec (3 tests) — `./coin-input.component` does not exist
  - item-generator: produces a complete draft for every rarity, type and slot — price is a multiple of 5, not 500
  - world.factory: has no money format: money is always integer copper — world still has `moneyFormat`
  - default-world: starts characters with 50 silver, as integer copper — `startingMoney` is 50, not 5000
- Updated, still passing (expectations rescaled to copper, or the money-format case removed): character-actions.rules (sell: 1000 + 5000 = 6000), character.rules (startingMoney 5000), world-draft.rules (custom-symbol case removed).

## Green

- Files: new `src/app/core/helpers/money.rules.ts`, `src/app/core/components/coin-display/coin-display.component.ts`, `src/app/core/components/coin-input/coin-input.component.ts`, `public/assets/icons/money/{gold,silver,copper}-coin.svg`; removed `src/app/modules/world/helpers/money.ts`; edited `item-generator.ts`, `default-world.ts`, `world.ts`, `world.factory.ts`, `world-draft.rules.ts`, `world-export.ts`, `world-new-page.component.{ts,html}`, `character.business.ts`, `character-sheet.component.{ts,html}`, `character-summary.component.ts`, `create-character-page.component.{ts,html}`, `item-card.component.ts`, `item-catalogue.component.ts`, `item-editor.component.ts`, `public/i18n/{en,fr}.json` (new `coin.*`, `item.catalogue.priceTo`; reworded `character.create.money`, `item.catalogue.price`; removed the currency, `world.money.*`, `symbolRequired`, `character.sheet.coins`, `item.price` keys). Also updated two non-red specs: `character-sheet.component.spec.ts` (coin display instead of "40 coins", no `moneyFormat`) and `item-editor.component.spec.ts` (price is now the coin input; its copper field stands in).
- Change: money is integer copper; `money.rules.ts` splits, picks the displayed coins and converts back. `app-coin-display` and `app-coin-input` replace the old formatting: sheet header, summary, item card, create-character page, item editor price, wizard starting money (Rules step currency select and symbol removed). The catalogue price slider works in copper with coin-display labels. Text amounts (sell confirmation, "sell for" button) use `CharacterBusiness.money()` ("1 gold 12 silver 3 copper"). Item prices are now multiples of 500 copper, sandbox starting money 5000. No `modules/home` file touched.
- Review fixes: item prices must be non-negative integers (`validateItemDraft` and pasted JSON in `item-editor.rules.ts`, test added). World import (`world-export.ts`) requires integer `startingMoney`, character `money` and item `price` (test added). Catalogue slider has `[step]="100"`. `coin-input` reads the event target as `HTMLInputElement` in a method (a cast cannot sit in the template); test added that 150 silver gives 15000 copper.
- Suite: 580 of 580 tests pass; `tsc` clean; `ng build` ok (initial bundle 964.90 kB, under budget).
- Open questions: none (the coin-display spec problem I raised was fixed by the coordinator).

## Answer

- **Money is integer copper** (1 gold = 100 silver = 10 000 copper).
  - `core/helpers/money.rules.ts` splits copper into coins, picks the coins to show with the legacy rules (gold hidden at 0, silver hidden when gold and silver are 0, copper always), and folds coin input back into copper.
  - `app-coin-display` and `app-coin-input` replace `money.ts` and the `MoneyFormat` setting, which are removed outright. They're used in the sheet header, character summary, item card, create-character page, item editor price, wizard starting money and the catalogue price slider (copper, step 100).
  - The three coin SVGs are in `public/assets/icons/money/`.
- **Scale:** one old "coin" became one silver. Starting money is 50 silver (5 000 copper), and generated prices are multiples of 5 silver.
- **Review fixes:** item prices (form and pasted JSON) and world import values (starting money, character money, item price) must be integers. The coin input folds overflow (150 silver becomes 1 gold 50 silver).
- **Orchestrator fix:** the coin-display spec's `render()` resets TestBed, because three renders in one test could never pass. No assertion changed.
- **Checked:**
  - Suite: 88 files, 580 tests (baseline 86 / 561). Build OK, initial bundle 964.44 kB.
  - Browser: the catalogue and the sheet show coins with icons ("10 silver 0 copper", "50 silver 0 copper").
- **Note:** this commit's i18n files also hold U11's two footer keys, which were edited in parallel.
