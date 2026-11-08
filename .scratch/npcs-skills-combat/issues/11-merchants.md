# Selling rules and merchants

Status: ready-for-agent
Type: task
Blocked by: 04, 10, 15

Spec: `../spec.md` (Merchants, Selling (world rule)).

World rules Economy section: `sellAnywhere`, `sellAnywhereRatio`, `merchantBuyRatio`, `merchantSellRatio` (sheet "Sell" follows them; hidden when sell anywhere is off). Per-merchant ratio overrides. GM opens the shop for one or all players; routes `merchant/open`, `merchant/close`, `merchant/buy`, `merchant/sell`, host-validated (money, stock, shop open for that player). Shop dialog from the shown merchant's card.
