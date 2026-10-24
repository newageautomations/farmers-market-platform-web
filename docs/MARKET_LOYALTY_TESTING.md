# Market loyalty testing

Run web commands from `E:\coding\farmers-market-platform-web`. No migration, seed or reset of `vendure`, `vendure_demo_market_ops` or any other existing database is authorized by this feature.

## Start the disposable demonstration

```powershell
npm run demo:market-loyalty
```

PostgreSQL must be running on loopback. This extends the existing loyalty harness, creates a fresh random `vendure_test_loyalty_demo_<timestamp>_<suffix>` database, runs real migrations, and starts real backend and frontend services. Protected databases are excluded by the existing process-owned test database guards. Real payment/message providers are not registered. Local verified payments and refunds exercise the actual application coordinators without real charges or messages.

The market demo uses storefront port 4357 and admin port 4575, preserving any existing vendor loyalty demo on 4347/4565. It refuses occupied ports instead of terminating unrelated processes. The API/control ports are dynamically selected. `.market-loyalty-demo/ready.json` is an ignored runtime manifest containing exact database, account, variant, occurrence, challenge, starting-progress and control details.

| Destination            | Local URL                                             |
| ---------------------- | ----------------------------------------------------- |
| Central sign-in        | `http://auth.platform.localhost:4357/account/login`   |
| Customer loyalty       | `http://auth.platform.localhost:4357/account/loyalty` |
| Manager workspace      | `http://localhost:4575/market`                        |
| Manager overview       | `http://localhost:4575/market/loyalty`                |
| Challenges             | `http://localhost:4575/market/loyalty/challenges`     |
| Create challenge       | `http://localhost:4575/market/loyalty/challenges/new` |
| Claims and fulfillment | `http://localhost:4575/market/loyalty/rewards`        |
| Market storefront      | `http://market-a.localhost:4357`                      |

Sign in centrally first. For the manager, open `http://localhost:4575/market?channel=6&account=1`, then select Loyalty. The exact channel is printed at startup and stored as `marketChannel`; use that if a fixture's channel sequence changes. The established account handoff preserves the market landing route, so open Loyalty after landing. In a customer browser, open the market storefront's `/account/login` after central sign-in to complete its existing account handoff.

## Fictional accounts

Every password is `local-identity-regression-only-password`.

| Role                   | Email                                 | Initial market state                                                                                |
| ---------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Manager                | `market-a@test.invalid`               | Cedar Meadow marketAdmin                                                                            |
| Primary customer       | `commerce-buyer@test.invalid`         | Explorer 2/3, Visits 1/4, Spending $32/$100                                                         |
| Completed customer     | `leaderboard@loyalty.test.invalid`    | Explorer 3/3, available to claim; Visits 1/4; Spending $36/$100                                     |
| Claimed customer       | `lifecycle@loyalty.test.invalid`      | Explorer claimed, awaiting fulfillment; Visits 1/4; Spending $36/$100                               |
| Zero-progress customer | `zero@loyalty.test.invalid`           | Follows the market; all objectives at zero                                                          |
| Historical customer    | `history@market-loyalty.test.invalid` | Explorer fulfilled, then refund reversed qualification to 2/3 and flagged review; Spending $26/$100 |
| Honey vendor           | `identity-owner-0@test.invalid`       | Hill Country Honey                                                                                  |
| Other vendor owner     | `identity-owner-1@test.invalid`       | Farm, Bakery and Flowers memberships                                                                |

The completed/claimed customers each have one multi-vendor $36 order, so it counts as one qualifying visit. All market progress comes from actual placed/fulfilled orders and an actual original-unit refund. There are no direct market progress or completion inserts. Older vendor demo balances retain the separately documented auditable demo-only vendor ledger adjustments. Market setup adds real vendor point earning and leaves the vendor accounting rules unchanged. Primary vendor points therefore include 2,000 additional Honey points and 1,200 additional Farm points from the seeded $32 market order.

## Products, campaigns and occurrences

| Vendor             | Product        | Price |
| ------------------ | -------------- | ----- |
| Hill Country Honey | Raw Honey      | $10   |
| Green Acres Farm   | Vegetable Box  | $12   |
| Wildflower Bakery  | Sourdough Loaf | $14   |
| Meadow Flowers     | Market Flowers | $8    |

Flowers intentionally falls below the Explorer's $10 single-vendor/order minimum when buying one unit. Two flower units qualify that vendor. All four vendors have real native products, physical sources, stock, channel publication, market membership, participation and offerings.

| Campaign        | Requirements                                                                             | Reward                                 |
| --------------- | ---------------------------------------------------------------------------------------- | -------------------------------------- |
| Market Explorer | Three distinct vendors; at least $10 in one order portion per vendor                     | Market-branded tote bag                |
| Market Regular  | At least $15 in one market order on four distinct occurrences                            | Market-branded hat                     |
| Support Local   | $100 across three consecutive occurrences starting with the first demo-series occurrence | Gift basket from participating vendors |

Six additional occurrences use irregular offsets of 7, 10, 17, 25, 32 and 40 days from startup. Exact IDs/dates and URLs are printed. Their explicit preorder windows open 366 days before each occurrence and close on its morning, using the real scheduling policy. This makes cross-occurrence purchases possible immediately, with no global or server clock changes. One occurrence is one visit opportunity, including multi-day records.

The ordinary base fixture's separate occurrence still exists. Use the six printed series URLs when testing Support Local. The manifest's `occurrenceId` identifies the first series occurrence. Its `occurrences` array lists all six in order.

## Complete manual walkthrough

1. Start `npm run demo:market-loyalty`. Save the printed URLs and leave that terminal running.
2. Sign in as the manager, enter the market workspace and open Loyalty. The program is enabled, three demo campaigns exist, four customers have qualifying activity, and one claim awaits fulfillment. The historical fulfilled claim is flagged for review. Inspect real occurrence participation and campaign completion rates.
3. Open Manage challenges. Rows contain title/status only. Open Market Explorer and review its objective, reward and single-order minimum rule.
4. Select Create challenge. Choose Vendor Discovery, continue, enter a title, required vendor count and optional minimum in dollars. Optionally select an occurrence window. Continue, type any multiline custom reward and pickup instructions. Select the underlined See common rewards link to view plain-text ideas in a modal; closing it leaves the description unchanged. Review the customer preview and publish. Requirements and promise are now locked.
5. Repeat for Market Visits, selecting a required occurrence count and a qualifying single-order minimum. Publish.
6. Repeat for Market Spending, entering an amount, consecutive occurrence count and a printed starting occurrence. Review the exact included dates. Publish.
7. To change material published terms, open details and create a replacement. It starts a separate campaign with zero copied progress. Save a draft to test preparation without publication. Pause, close and archive retain previous histories.
8. In a separate browser profile, sign in as the primary customer. Open Customer Loyalty. Vendor Rewards retains vendor-owned points and rewards. Select Market Challenges. Market Explorer shows 2/3, Market Regular 1/4 and Support Local $32/$100. No claim button is available.
9. Complete the customer handoff on `market-a.localhost:4357/account/login`. Open the first printed occurrence and Sourdough Loaf. Buy one loaf, proceed from cart through the existing contact/pickup/review/payment flow, select the local test payment and place the order. Record the `order` ID from the success URL.
10. Customer Loyalty still shows only 2 finalized vendors and one additional vendor pending fulfillment. No reward can be claimed. Vendor points from this purchase are also pending under their own ledger.
11. Fulfill the Bakery portion through its vendor Orders page, or use the helper below with `vendor=2`. The actual vendor fulfillment finalizes the original units. Market Explorer now shows 3/3 and Claim Reward appears. Existing Honey/Farm progress is unchanged.
12. Click Claim Reward. The shared dialog displays market, objective, promised reward and instructions. Confirm. Refresh and verify the durable Claimed status. A repeated request cannot create another claim.
13. In the manager browser, open Reward claims. Open the primary customer's Explorer row, review its original reward, completion evidence, claim time and audit events. Enter an optional note, then Mark fulfilled. Customer status changes to Fulfilled.
14. Purchase again from Honey on the same occurrence. Explorer does not gain a fourth vendor, and Visits remains one occurrence. Buy one $8 Flowers order, then another separate $8 Flowers order. Those do not combine into a qualifying $10 vendor purchase. A single order containing two flower units does qualify that vendor.
15. Purchase three Honey units on the second series occurrence and four Honey units on the third. These add $30 and $40, so the primary customer's original $32 plus loaf $14 reaches $116 within Support Local's first three occurrences. A $20 Honey purchase on the fourth series occurrence gives the fourth qualifying visit but does not increase Support Local. Helpers below provide the same real purchase setup if desired.
16. Process a supported refund of the Bakery loaf. Explorer falls back to two currently qualifying vendors, its already fulfilled promise remains historical, and Needs review appears. Support Local decreases by $14 to $102 if step 15 was followed. The refund also reverses the Bakery vendor's original eligible point earning independently.
17. To test an unclaimed reversal, use the completed customer and refund their only qualifying vendor portion. Claim eligibility disappears below the target. To test a claimed/unfulfilled reversal, use the lifecycle customer. The manager cannot fulfill until entering an explicit review resolution, which is permanently audited.
18. Use the zero customer for earning from scratch. Followed active campaigns are visible without artificial progress. Purchases from the direct vendor storefront or another market do not add market challenge progress, while normal vendor earning remains supported.
19. Test narrow browser widths, keyboard-only wizard controls/tabs/dialogs, and reduced motion. Progress remains numeric and accessible. No screenshot is required or authorized.

New campaigns qualify only purchases placed after publication while enabled. Earlier seeded orders do not backfill them. Dashboard completion and fulfillment are the notification surface; no automatic loyalty message is sent.

## Demo-only helpers

All commands use the running process's random loopback control key and actual checkout, fulfillment and refund coordinators. They do not accept arbitrary balances or progress. Vendor indexes are Honey 0, Farm 1, Bakery 2 and Flowers 3. Customer indexes follow the table above: primary 0, completed 1, claimed 2, zero 3, historical 4. Occurrence indexes 0 through 5 reference the six printed series dates, not calendar offsets or arbitrary order IDs.

```powershell
npm run demo:market-loyalty:orders
# Create an actual pending primary-customer multi-vendor purchase:
npm run demo:market-loyalty:purchase -- customer=0 occurrence=0 vendors=0,1 quantities=2,1 fulfill=false
# Complete the customer's real vendor portion using the returned order ID:
npm run demo:market-loyalty:fulfill -- order=123 vendor=0 quantity=2
npm run demo:market-loyalty:fulfill -- order=123 vendor=1 quantity=1
# Buy on subsequent real occurrences and finalize immediately:
npm run demo:market-loyalty:purchase -- customer=0 occurrence=1 vendors=0 quantities=3
npm run demo:market-loyalty:purchase -- customer=0 occurrence=2 vendors=0 quantities=4
npm run demo:market-loyalty:purchase -- customer=0 occurrence=3 vendors=0 quantities=2
# Supported original-unit refund, or unfulfilled cancellation:
npm run demo:market-loyalty:refund -- order=123 vendor=0 quantity=1
npm run demo:market-loyalty:refund -- order=123 vendor=1 quantity=1 cancel=true
```

Use only the actual order's remaining quantities. The compact fulfillment helper applies a quantity to each selected vendor line; use the vendor Orders UI for more complex multiline selections. The existing refund policy rejects unsupported mixed cancellation cases. The purchase helper is a demo-only setup seam, keyed to this fresh local process, uses real native orders and coordinators, and never changes a global clock. Browser purchases use ordinary occurrence URLs.

## Automated qualification

```powershell
npm run test:market-loyalty:backend
npm run test:market-loyalty:browser
npm run test:loyalty:backend
npx vitest run
npm run typecheck
npm run build
npx eslint .
npx tsx scripts/check-boundaries.ts
npx prettier --check .
```

Backend build and test types, from `E:\coding\farmers-market-platform`:

```powershell
$env:APP_ENV='dev'
$env:NODE_ENV='development'
npm run build
npm run test:market-loyalty:types
```

The backend integration runner uses a fresh `vendure_test_market_loyalty_*` target. The browser runner uses Chromium directly with DOM, accessibility, numeric progress and real commerce assertions. It captures no screenshots, videos or traces. Current results and any development corrections are recorded in [the implementation summary](MARKET_LOYALTY_IMPLEMENTATION_SUMMARY.md).

## Safe teardown and reset

Press Enter or Ctrl+C in the owned demo terminal. The wrapper stops only its own children and requests backend closure. The existing database guard drops only the random database created by that backend process. Restart the same command for fresh fictional data. There is no arbitrary database reset/drop argument.

Failed setup runs retain their own random database for diagnosis under the established guard. They are not attached to normal development configuration. Do not use a persistent market-operations reset or migration command to remove them. No persistent database was migrated or populated for this feature.
