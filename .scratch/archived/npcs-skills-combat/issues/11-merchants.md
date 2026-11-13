# Selling rules and merchants

Status: resolved
Type: task
Blocked by: 04, 10, 15

Spec: `../spec.md` (Merchants, Selling (world rule)).

World rules Economy section: `sellAnywhere`, `sellAnywhereRatio`, `merchantBuyRatio`, `merchantSellRatio` (sheet "Sell" follows them; hidden when sell anywhere is off). Per-merchant ratio overrides. GM opens the shop for one or all players; routes `merchant/open`, `merchant/close`, `merchant/buy`, `merchant/sell`, host-validated (money, stock, shop open for that player). Shop dialog from the shown merchant's card.

## Baseline

Test Files 167 passed, Tests 1313 passed.

## Seams

1. **Merchant rules (pure, `npc/helpers/merchant.rules.ts` or similar)**: buy price (`price × buyRatio`, merchant override else world default, rounded to copper), merchant sell price (`× sellRatio`), sell-anywhere price (`× sellAnywhereRatio`); buy refused when the shop is not open for the player, the item is not in stock (unequipped merchant inventory) or the player can't afford it; sell refused when the shop is closed or the item isn't the player's; applying a buy/sell moves the item and the money. Misses: the network.
2. **Merchant business over the fake peer network (`src/testing/game-device.ts`, host + players)**: GM opens the shop for one or all players and closes it; a player buys and sells through `merchant/buy` / `merchant/sell`, the host validates and publishes the updated sheet and merchant; refusals reach the player as `PeerApiError`. Misses: the dialog.
3. **Components (`TEST_PROVIDERS`)**: World rules Economy fields (four settings, defaults, saved); NPC editor ratio overrides; the sheet's Sell follows `sellAnywhere` (hidden when off) and pays the ratio; the shown merchant's card opens the shop dialog (stock, prices, player money, Buy / Sell to merchant) only while open for that player, and the GM's Open/Close shop controls. Misses: layout (browser check).

## Red

- Test files:
  - `src/app/modules/npc/helpers/merchant.rules.spec.ts` (new)
  - `src/app/modules/npc/business/merchant.spec.ts` (new)
  - `src/app/modules/world/business/world-economy-rules.spec.ts` (new)
  - `src/app/modules/npc/components/merchant-shop/merchant-shop.component.spec.ts` (new)
  - `src/app/modules/world/components/rule-fields/rule-fields.component.spec.ts` (appended describe)
  - `src/app/modules/character/components/character-sheet/character-sheet.component.spec.ts` (appended describe)
  - `src/app/modules/table/components/table-npcs/table-npcs.component.spec.ts` (appended describe)
- Run: `npx ng test --watch=false --include <file>` (one per file above, under `src/app/modules/`)
- Green must: list `MerchantService`/`MerchantHostBusiness`/`MerchantBusiness` in `GAME_DEVICE` (`src/testing/game-device.ts`) and have `GameSessionBusiness` start the host side. NPC editor ratio overrides already exist and are not retested.
- Contracts live in each spec's header comment. Error messages: `merchant.errors.closed|notInStock|cantAfford|unknownItem` (PeerApiError code `rejected`; a player calling open is `forbidden`).
- Failing: 32 tests, each one line (files that import missing symbols fail to compile, so their whole file is red):
  - merchant.rules.spec (11: buy price ratio + rounding, buy override incl. 0, merchant sell price, sell-anywhere price, applyBuy ok/closed/notInStock/cantAfford, applySell ok/default ratio/refusals) — `./merchant.rules` missing
  - merchant.spec (9: no shop until opened, open for all with stock and prices, open for one, close, player cannot open, buy moves item and money, buy refusals, sell at sell ratio, sell refusals) — `./merchant.business` missing
  - world-economy-rules.spec (3: defaults, save four settings + info to players, refuse ratio outside 0 to 10) — `sellAnywhere`, `sellAnywhereRatio`, `merchantBuyRatio`, `merchantSellRatio` missing on `World`/`WorldRules`
  - merchant-shop.component.spec (3: stock and money, buy emit/disabled, sell list and emit) — component and `models/merchant` (`PublicShop`) missing
  - rule-fields economy (2: four settings with defaults, emits changes) — fields missing on `WorldDraft`
  - character-sheet Sell (2: pays sell-anywhere ratio — label stays "Sell for 10 copper"; hidden when sell anywhere off — button still shown) — assertion failures
  - table-npcs merchants (2: player visits open shop only, GM open/close control) — `merchant` on `PublicNpc`, `shopsOpen`/`gameMaster` inputs, `visitShop`/`setShop` outputs missing

## Green

- Files: `npc/{models/merchant.ts,helpers/merchant.rules.ts,services/merchant.service.ts,business/merchant.business.ts,business/merchant-host.business.ts,components/merchant-shop/*}`, `npc/helpers/npc-visibility.rules.ts` and `npc/models/npc.ts` (`merchant` flag on `PublicNpc`), `src/testing/game-device.ts`, `play/business/game-session.business.ts`, world models/factory/draft+rules helpers, `rule-fields` (component + html), rules page, wizard page, `character-actions.rules.ts`, `offline.business.ts`, `character.business.ts` (`SheetWorld`), character sheet, `table-npcs`, `table.business.ts`, table page, `public/i18n/{en,fr}.json`.
- Change: merchant rules, service, host and player business over `merchant/open|close|buy|sell` plus a `merchant/shops` topic (each shop carries who it is open for, players filter on their id); the host starts with the game session. World gets the four Economy settings (defaults on / 1 / 1 / 0.5, validated 0 to 10, `sellAnywhere`/`sellAnywhereRatio` also in `WorldInfo`/`SheetWorld`), editable in the rule fields (rules page Rules tab and wizard). The sheet's Sell pays the ratio and is hidden when off (the sell action refuses with `character.errors.sellDisabled`). Table page: player's Visit opens the shop dialog (`app-merchant-shop`), GM gets Open/Close on each merchant card with a "for" select (all players or one), routed through `TableBusiness`.
- Suite: 171 files / 1345 tests pass (baseline 167 / 1313); tsc clean; `ng build` shows no error.
- Open questions: shop prices show as plain copper ("750 Copper"), because the spec requires the digits "750" in the text; the money line uses the coin display. Rule-field ratio inputs use the active language's number format. Staged state of three modified spec files was restored (a stash pop had unstaged them; content unchanged).
- Note: the `merchant/shops` topic is filtered client-side (PeerApi publishes to all peers), so a modified client could see shops closed to it and other player ids.

## Answer

Merchant rules (prices with world defaults and per-merchant overrides, rounded to copper; host-validated buy/sell), merchant service + host and player business over `merchant/open|close|buy|sell` and a `merchant/shops` topic, started with the game session. World Economy settings (sell anywhere on/ratio, merchant buy/sell ratios, 0 to 10) in the rules page Rules tab and the wizard. Sheet Sell follows sell-anywhere. Table: player Visit opens the shop dialog (coin display prices); GM Open/Close per merchant for all players or one. Review: ship; follow-ups applied (coin display, shops close when the merchant role goes, role re-checked on trade). Known limit: the shops topic is filtered client-side. Browser: Economy fields on the rules page and the table page load with no new console error; the shop flow itself (GM + player) is covered by the multi-device spec, not the browser (one profile). Suite 171/1345.
