# Manual testing: finances and expenses

Run everything from `E:\coding\farmers-market-platform-web`. This guide uses an isolated local copy of the documented Manna Roots testing identity and catalog. It does not migrate, reseed, reset, or replace `vendure_demo_market_ops` or `vendure`.

## Prepare and launch

1. Make sure local PostgreSQL is available on loopback. The guarded disposable test helpers read the backend's existing local database credentials. Every created database must match the existing `vendure_test_` guard. The simulated POS adapter additionally requires its existing `vendure_test_pos_demo_<timestamp>_<suffix>` naming convention.
2. Create the full calendar month:

   ```powershell
   npm run demo:finance:seed
   ```

   This creates a new isolated native database, applies normal additive migrations there, and generates September 1 through September 30, 2026. The exact database name and ownership token are saved in the ignored `docs/financial-reporting/local-fixture.json`. The dataset uses the Manna Roots definitions from `scripts/data/testing-vendors.cjs`, including its existing product names and prices. Native service builders create its isolated account and business records; nothing is copied into the populated persistent database.

   Running this seed command again verifies and reuses the same completed dataset. It does not add duplicate sales, accounts, expenses, payments, or receipts. It also does not reset your later manual edits. If you need a fresh baseline, use the explicit removal procedure below, then seed again.

3. Start the backend in one terminal:

   ```powershell
   npm run demo:finance:serve
   ```

   It serves the isolated database at `http://localhost:3096/admin-api`. This command does not seed or reset. The finance report reads committed native records directly, so no worker or analytics projection rebuild is needed. Scheduled workers remain disabled in this fixture.

4. Start the admin in another terminal:

   ```powershell
   npm run demo:finance:admin
   ```

   Start the storefront/account frontend in a third terminal:

   ```powershell
   npm run demo:finance:storefront
   ```

   Open [local finance admin](http://localhost:4596). Sign-in uses the local account frontend at `http://auth.platform.localhost:4378/account/login`, so keep all three processes running. Use `localhost` consistently for admin URLs. Storefront inspection uses `http://manna-roots.localhost:4378`. Production costs are never added to its Shop API or product cards.

5. For real receipt scanning, start the existing local scanner through `npm run documents:scanner:up`. A stopped or unhealthy scanner causes receipt upload to fail safely. Automated controlled-scanner tests do not establish live scanner availability.

These commands are specifically for the isolated finance fixture. Continue to use the existing `demo:market-operations:serve`, `worker`, `admin`, and `storefront` commands for the populated persistent demo, after an explicitly authorized migration. Do not substitute ordinary backend development commands that select `vendure`.

## Sign in and select the month

Use these existing local test credentials:

| Business role                     | Email                           | Password                                  |
| --------------------------------- | ------------------------------- | ----------------------------------------- |
| Manna Roots vendor                | `manna-roots@example.test`      | `local-identity-regression-only-password` |
| Boerne market manager             | `market.manager@example.test`   | `local-identity-regression-only-password` |
| Other vendor for isolation checks | `identity-owner-1@test.invalid` | `local-identity-regression-only-password` |

Select Vendor mode and the Manna Roots business if a business/mode picker appears. Open Finances in the existing sidebar. The direct link is:

[Manna Roots September finances](http://localhost:4596/vendor/finances?from=2026-09-01&through=2026-09-30&market=ALL&currency=USD)

Alternatively choose Custom date range, From `2026-09-01`, Through `2026-09-30`, and All sales. Through is inclusive. As of October 2026, Last month selects the same dates. Dates and grouping use your saved account time zone, printed beside the graph and in exports. In Settings, set Account time zone to America/Chicago for this reference. With no saved preference, the browser time zone is used.

## Verify the main numbers

The four summary cards must show:

| Card                 |  Expected |
| -------------------- | --------: |
| Gross sales          | $2,209.50 |
| Estimated net profit |   $417.25 |
| Total expenses       | $1,770.60 |
| Total sales          |        27 |

The detailed definitions behind those cards are:

| Figure                                       |  Expected |
| -------------------------------------------- | --------: |
| Discounts                                    |    $13.15 |
| Product refunds                              |     $8.50 |
| Sales after discounts and refunds            | $2,187.85 |
| Direct production costs                      |   $863.10 |
| Deductible manual expenses                   |   $907.50 |
| All recorded spending                        | $1,177.50 |
| Spending already covered by production costs |   $270.00 |
| Automatic, assigned processing fees          |     $0.00 |

The manual expenses include a recorded $12.50 processor invoice. This is an explicit local expense, not a fabricated provider charge. Six controlled simulated sales have no assigned actual processor fee; that missing information remains visible. Pineapple Mint Juice has two sold units with an unknown production cost. The estimate therefore has visible completeness limits even though the arithmetic above is deterministic.

Click Daily values to inspect every day. The same figures are available through Export Report. CSV money values are integer minor units: for example, gross `220950` means $2,209.50. Numeric negative values remain numeric; user-entered strings are protected against spreadsheet formula execution.

## Inspect the graph

1. Select Gross sales. The line shows original merchandise sales before discounts and refunds. Tax and shipping do not increase the line. Expense bars remain visible.
2. Select Net profit (estimated), with Group by set to Daily. These days must appear below the zero baseline:

   | Date         | Estimated profit | Reason                                    |
   | ------------ | ---------------: | ----------------------------------------- |
   | September 8  |         -$275.00 | Juicer repair on a day without sales      |
   | September 14 |           -$8.50 | Original paid juice refunded on this date |
   | September 22 |          -$40.00 | Advertising without sales                 |
   | September 30 |          -$12.50 | Recorded processor invoice without sales  |

3. September 1 records $180 of produce purchases already covered by production costs, so its estimated profit is $0. It does not become -$180.
4. September 20 is the high-revenue day, with $252.00 gross product sales.
5. Hover the day's points or bars for the financial breakdown. Use Daily values for keyboard or touch access to figures.
6. Switch Group by to Weekly or Monthly. Monthly totals must still agree with the summary cards. Switch back to Daily to inspect losses. The dashboard should remain usable at 390 px, 768 px, and desktop widths, with a full-width main graph and stacked smaller cards when necessary.

## Compare markets and independent activity

Choose each Sales scope. All cards and graphs should refresh together:

| Scope                   | Gross sales | Estimated profit | Sales |
| ----------------------- | ----------: | ---------------: | ----: |
| Boerne Farmers Market   |     $623.00 |          $209.95 |     8 |
| Bulverde Farmers Market |     $637.00 |          $197.60 |     8 |
| Pearl Farmers Market    |     $771.00 |          $235.60 |     8 |
| Independent sales       |     $178.50 |          $101.60 |     3 |

There are twelve market appearances: September 2, 4, 6, 9, 11, 13, 16, 18, 20, 23, 25, and 27. Markets rotate in the order shown above. Independent sales occur September 3, 15, and 29. Other days have no sales.

The market and independent profit figures add to $744.75. All sales deducts another $327.50 of unallocated general overhead once, giving $417.25. Do not expect every market to contain a copy of the general repair, advertising, and processor invoice. Unknown legacy market associations, if encountered outside this controlled fixture, remain unassigned in All sales rather than being silently treated as independent.

## Inspect product performance and spending

1. Under Profit by product, open Green Garden Juice. Its modal must show 110 net units, $943.50 original gross, $5.95 discounts, $8.50 refunds, $929.05 product revenue, $277.50 production costs, and $651.55 estimated contribution.
2. Carrot Sunrise Juice is the lower-margin example: 48 units and $70.40 contribution after $312.00 production costs.
3. Berry Beet Juice contributes $284.40; Ginger Citrus Shot contributes $300.40.
4. Pineapple Mint Juice shows two units, $18.00 revenue, and two missing-cost units. Its $18.00 contribution is an incomplete estimate. It does not establish a confirmed zero production cost.
5. Watermelon Lime Juice has a $2.75 configured cost and zero sales. It remains in product management, and does not invent activity on a top-selling-products chart.
6. In Product sales, switch between Units sold and Sales revenue. Open a product for details, then close the shared dialog with its header control or Escape. Keyboard focus should return to the trigger.
7. In Expenses by category, choose Costs deducted from profit. Booth fees total $540.00; production costs total $863.10; transportation totals $40.00; equipment is $275.00; advertising is $40.00; the recorded processor invoice is $12.50.
8. Switch the same card to Recorded spending. Ingredients/supplies shows $180.00 and Packaging shows $90.00. Those purchases are visible as spending but are not deducted from profit twice. The full category reference is in `expected-totals.json`.

## Create, edit, view, and void expenses

Return to All sales for September before these steps.

1. Click Add Expense. Enter description `Manual test delivery`, amount `10.00`, date `2026-09-08`, category Transportation, Applies to General business operations, and Deduct from estimated profit. Save.
2. Estimated net profit becomes $407.25 and September 8 becomes -$285.00. The new expense opens its detail dialog, where receipts can be attached.
3. Close the dialog and click Manage Expenses. The URL is `/vendor/finances/expenses` with the same date/market query. Rows show only expense identity and status. Search for `Manual test delivery`, then open the row.
4. Click Edit expense, change the amount to `12.00`, and save. Monthly profit becomes $405.25 and September 8 becomes -$287.00. Inspect Expense history to see the original and edited values.
5. Click Void expense, then confirm inside the shared confirmation dialog. Monthly profit returns to $417.25. The row is Voided, and its history and any receipts remain accessible. There is no destructive deletion of financial history.
6. Add a separate `Manual test bottles` expense for `90.00`, September 7, category Packaging, General business operations, and Already in production costs. Profit stays $417.25; recorded spending increases to $1,267.50. Change its treatment to Deduct from estimated profit and profit becomes $327.25. Void it to restore the reference baseline.
7. Add an expense assigned to Boerne, optionally selecting September 2 as its event. Check that Boerne and All sales include it, while Bulverde and Independent sales exclude it. Void it after testing. A general expense should have no required market/event selection.

An edit conflict means another tab changed the expense. Refresh its detail rather than overwriting the newer version. Saving the same creation intent cannot create duplicate rows.

## Upload and view a receipt

1. Open an active expense's details from Manage Expenses, or save a new test expense first.
2. Select a fictional PNG, JPEG, WebP, or PDF under Receipt. The existing validated maximum is 10 MB.
3. Wait for scanning. Available files show View receipt. Open the image/PDF preview, then close it. The receipt record should also appear in expense history.
4. Stop or make the local scanner unavailable and attempt another upload. It must fail without making that file downloadable. Restore the scanner for later checks.
5. Files with an unsupported extension/signature or larger than 10 MB must be rejected. There is no public receipt URL or compliance-market sharing action.

## Verify production-cost privacy and history

1. Open Products in the same vendor dashboard. Search Green Garden Juice and open its existing product editor. Expand the variant editor and its Production cost form. The current per-unit cost is $2.50.
2. Change Cost to produce to `3.25` and save. Return to September Finances. Production costs must remain $863.10 and estimated profit $417.25. Open the product's contribution details: its historical direct cost remains $277.50.
3. Clear the field and save. The current cost becomes Unknown; September still retains its original snapshots. A zero is different: entering `0.00` records a known zero for future sales.
4. Set the cost back to `3.25`. Optionally open POS, select Independent sale, add one Green Garden Juice, and record a test cash sale in this isolated environment. Its net product revenue is $8.50; tax is excluded from reporting. The new current-day production cost is $3.25 and contribution is $5.25. Changing the current cost afterward must not rewrite that new sale either. September remains unchanged.
5. On Add variant in an existing product, the optional Cost to produce field can be saved atomically with the new variant. It is separate from Initial price. Do not expect a product with no variants to have a single ambiguous shared cost.
6. Inspect the storefront and Shop schema. Production costs, cost history, expenses, reports, and receipts must not appear in product listings, checkout, customer receipts, or customer-facing API fields. Automated tests also verify the Admin-only schema boundary and foreign-variant access denial.

## Transactions and exports

Click View Transactions to reach `/vendor/finances/transactions`. Search Green Garden Juice or an order number. Open a row to see its date, gross, discount, refund, production cost, method, and market. A refund row represents the returned original unit, not new revenue. Unplaced drafts and failed payments remain in their existing operational tools and do not create finance sales.

Export Report uses the current date, currency, and market scope. Compare its Summary and daily rows with the dashboard, and its product and expense sections with the details above. Money is in minor units with the currency stated at the top. Changing to Independent sales and exporting should yield gross `17850`, expenses `7690`, and estimated profit `10160`.

## Market manager and isolation

1. Sign out of the vendor account. Sign in as `market.manager@example.test`, select Market Manager mode and Boerne Farmers Market, then visit:

   [Boerne September finances](http://localhost:4596/market/finances?from=2026-09-01&through=2026-09-30&market=ALL&currency=USD)

2. Expected manager figures are collected revenue $140.00, total expenses $88.00, estimated profit $52.00, four payments, and $15.00 outstanding fees. These are native recorded booth payments, not Manna Roots' $623.00 Boerne merchandise sales.
3. Profit by event shows $23.00 for each of September 2, 9, 16, and 23. Another $40.00 of market-wide supplies is deducted once in the overall market result. Product cards are replaced by market/event analytics.
4. Add and void a manager expense. The vendor's report must remain unchanged. Associating a vendor expense with Boerne must not make its receipt or production costs visible to the manager.
5. Sign in as `identity-owner-1@test.invalid` in a separate browser profile or session. Its finance scope must not show Manna Roots' September transactions, expenses, receipt files, or costs. Copying a Manna expense or receipt ID into an API request must be denied server-side. Merely entering the Manna vendor URL never selects that tenant or grants access.
6. Customer/Shop sessions cannot query the finance or production-cost APIs. Automated authorization tests cover anonymous requests, cross-vendor variants, expenses, receipt upload/download, and foreign market scopes. Inspect `automated-results.json` for the checks actually executed.

## Reuse, verify, and remove

After voiding manual test expenses and restoring your intended current costs:

```powershell
npm run demo:finance:verify
```

This compares the saved native dataset against the month reference without reseeding it. Cost edits affect only future sales. Extra current-day test cash sales do not alter September's reference totals.

Stop the finance admin, storefront, and backend with Ctrl+C. To remove only this isolated dataset:

```powershell
npm run demo:finance:remove
```

Removal verifies the saved exact database name, loopback target, finance ownership token, and absence of active sessions. It refuses a protected or unrelated database and does not terminate sessions. Seed again to create a new clean copy. Do not run the persistent demo reset command as part of finance testing.
