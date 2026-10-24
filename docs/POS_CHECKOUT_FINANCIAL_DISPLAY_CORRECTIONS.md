# POS checkout and financial display corrections

Implemented locally on October 21, 2026. No deployment, commit, push, schema migration, or persistent database write was performed.

## Changes and presentation rules

- Restoring a reviewed unfinished POS draft calls the existing backend `reopen` command before selecting it. This increments its version, clears its reviewed quote, and preserves products, quantities, customer, coupons, and selling context. Review Checkout still performs native authoritative price/tax recalculation. Payment-time quote identity, expiry, fingerprint and authorization checks remain intact.
- A submitted payment takes the existing recovery path. The backend draft lock and additional payment-attempt guard prevent reopening from invalidating an operation that has already been submitted. Pending and terminal states are not changed into editable drafts.
- The finance report adds `orderTransactions`, grouping settled vendor allocations by purchase and loading complete vendor-owned sale/refund history. The original `transactions` ledger, summaries, CSV and QuickBooks inputs remain unchanged. Filtering and pagination in the vendor log operate on order rows. Existing booth-payment cost records remain separately identifiable as costs.
- The compact table reuses DataTable's existing row-click details dialog. Details include date/time, market/Independent sale, method, status, every product/quantity, merchandise, discounts, collected tax, supported shipping, vendor-scoped customer payment, refunded tax and refund events. Cross-vendor payments display only the current vendor's share.
- Orders, POS receipts and payment details reuse the corrected `PosSaleDetails`. Product amounts exclude tax and precede discounts; their sum matches **Merchandise before discounts**. Subtract discounts once to obtain **Merchandise subtotal**, then add collected tax to reconcile to **Total paid**.
- Inclusive native prices use Vendure's existing money getters and saved price/tax evidence. Older completed receipt snapshots lacking line-tax fields recover their presentation from saved allocations. No sale, tax snapshot, refund, or processor record is rewritten.
- Date filters select orders having a sale or settled refund in the period. Details show the complete original sale and subsequent settled refund history, even outside the period. Financial summary and CSV continue to reflect events inside the selected period.

No new UI primitives were needed. Existing Dialog, DataTable record details, Badge, totals layouts and POS receipt composition were reused. Root UI documentation and pending design categories were not changed.

## Local files changed

Web project:

- `apps/admin/src/vendor/pos.tsx`: safe reviewed-draft restoration.
- `apps/admin/src/vendor/pos-payments.tsx`: merchandise/discount/tax receipt display shared with Orders.
- `apps/admin/src/finance/Finances.tsx`: order transaction rows and details, search/pagination, retained cost entries.
- `packages/api/src/in-person.ts`, `packages/api/src/finance.ts`: read-model types.
- `tests/in-person.test.tsx`, `tests/pos-payments.test.tsx`, `tests/finance.test.tsx`: focused UI tests.
- This report.

Backend project:

- `src/plugins/marketplace-commerce/in-person/service.ts`: submitted-payment reopen guard.
- `src/plugins/marketplace-commerce/in-person/payment-coordinator.ts`: historical receipt read projection only.
- `src/plugins/marketplace-commerce/financial/display-amounts.ts`: saved-evidence merchandise presentation.
- `src/plugins/financial-reporting/service.ts`, `src/plugins/financial-reporting/order-transactions.ts`: vendor-scoped order transaction projection.
- `test/in-person/payments.ts`, `test/financial-reporting/run.ts`, `test/financial-reporting/checkout-display.ts`: focused backend checks.

Both repositories already contained substantial local changes. Those were preserved.

## Verification

- 57 frontend tests passed across the three affected test files, including reviewed-draft restoration, retained quantities/customer, pending/terminal-state protection, receipt reconciliation, compact transaction details, and order pagination/search.
- POS payment feature suite passed 30 groups, including current price/tax refresh, stale/expired quote rejection, completed/uncertain payment recovery, original-unit refunds, authorization and historical receipt recovery without stored-data changes.
- Finance feature suite passed, including grouped products, visible tax, discounts, partial refunds, refund-only date ranges, vendor isolation, unchanged summaries and CSV reconciliation.
- Saved inclusive/exclusive pricing and rounding assertions passed in `test/financial-reporting/checkout-display.ts`.
- Frontend TypeScript and targeted ESLint passed. Backend dashboard/server/worker build passed with explicit development environment. Changed frontend/new backend files were formatted.
- Initial sandbox PostgreSQL access failures were resolved by running the guarded disposable tests with local database access. One initial POS run exposed cleanup in the new tax test; cleanup was fixed and the complete suite passed. Its failed disposable database was retained by the existing harness: `vendure_test_pos_payments_1792618094181_64339b`. Successful runs cleaned up their own databases.
- No browser automation, screenshots, full repository regression suite, or manual UI sweep was run.

Useful repeat commands from `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
npx vitest run tests/in-person.test.tsx tests/pos-payments.test.tsx tests/finance.test.tsx
npx tsc --noEmit
```

Backend focused commands from `E:\coding\farmers-market-platform`, with local PostgreSQL available:

```powershell
$env:APP_ENV = 'test'
$env:NODE_ENV = 'test'
$env:FRONTEND_NO_EVIDENCE = 'true'
$env:VENDURE_DISABLE_TELEMETRY = 'true'
node --require ./test/no-evidence.cjs node_modules/ts-node/dist/bin.js --project test/in-person/tsconfig.json test/in-person/payments.ts
node --require ./test/no-evidence.cjs node_modules/ts-node/dist/bin.js --project test/financial-reporting/tsconfig.json test/financial-reporting/run.ts test
node node_modules/ts-node/dist/bin.js --project test/financial-reporting/tsconfig.json test/financial-reporting/checkout-display.ts
```

## Populated demo and manual walkthrough

No new account, products, completed sales or refunds were seeded into `vendure_demo_market_ops`. Existing Manna Roots, manager accounts and financial/QuickBooks history were preserved because this work performed no writes to that database. Disposable fixtures are not imported into it. No dedicated account credentials were created.

No migration is required by this correction. If startup reports pre-existing pending migrations, inspect the reported target/pending migrations before using the established `npm run demo:market-operations:migrate`; that command must target local `vendure_demo_market_ops`. Do not reset or seed the populated database.

Start each process in a separate fresh PowerShell terminal, from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Relevant routes use `http://localhost:4322`:

| Route                           | Purpose                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `/vendor/pos`                   | Drafts, review, cash checkout and receipt                          |
| `/vendor/products`              | Product tax controls and canonical variant prices                  |
| `/vendor/inventory`             | Existing stock controls                                            |
| `/vendor/settings/taxes`        | Default and eligible market tax rates                              |
| `/vendor/orders`                | Completed order history and original-unit refunds where authorized |
| `/vendor/finances/transactions` | Order rows and financial details                                   |
| `/vendor/finances`              | Financial summary and CSV                                          |

For read-only inspection of existing records, the existing documented Manna Roots login is `manna-roots@example.test` / `local-identity-regression-only-password` at `http://auth.platform.localhost:4321/account/login`. Select Manna Roots Vendor mode/channel through the normal account switcher. These credentials were not created or reset by this correction.

For the deterministic price/tax scenarios below, use a **separate test vendor** provisioned through the ordinary account/business setup and permission workflows, rather than curating Manna Roots or the manager accounts. This run did not provision that account. It needs USD tax-exclusive pricing, sellable in-stock variants, cashier/catalog/inventory/finance authority and an active vendor membership. Missing permissions or market eligibility must be resolved through existing authorization workflows. Do not copy roles or bypass guards. Independent sale is sufficient for the main scenarios.

Create only once in that separate vendor: `Checkout review Honey` at `10.00`, `Checkout review Jam` at `8.00`, and `Checkout review Bread` at `7.00`, each with one variant, a distinct SKU and at least five sellable units using the existing stock workflow. Reuse those records on repeat runs. Select Collect taxes, leave product overrides off and set that vendor's default tax rate to `10`. Canonical price fields take decimal dollars, not cents.

1. **Reviewed draft, price change:** In POS choose Independent sale, add one Honey and review. Expect merchandise $10.00, tax $1.00, total $11.00. Click Saved drafts or leave the page. In another tab change that variant's canonical price to `12.00`. Resume the saved draft. It must retain one Honey, its customer/coupons/context, and show the editable cart with Review checkout, without Continue to Payment. Click Review checkout. Expect merchandise $12.00, tax $1.20, total $13.20. Restore this test product to $10.00 after canceling the unpaid draft.
2. **Reviewed draft, tax change:** With Honey $10.00 and default 10%, review a new one-Honey draft ($11.00), leave, then change only the separate vendor's default rate to `5`. Resume and review again. Expect merchandise $10.00, tax $0.50, total $10.50. Cancel the draft and restore the default to 10%.
3. **Product and market precedence:** Repeat step 2 using Honey's Advanced Settings / Override tax rate / Custom rate, changing 10 to 5. Expect the same $10.50, even if the vendor/market rate differs. Clear the override afterward. For an already eligible market event, leave overrides off, set that vendor's market rate to 5%, review, leave, change it to 10%, resume and review. One $10 Honey changes from $10.50 to $11.00; the selected event remains selected. If no eligible event exists, record the unmet consent/participation/listing prerequisite instead of creating one by database edits.
4. **Completed multi-product sale:** Restore the three prices/default 10%. Add one of each product. Review and receive exactly $27.50 cash, then confirm actual receipt. Expect merchandise lines $10.00/$8.00/$7.00, subtotal $25.00, sales tax $2.50, total paid $27.50 and change $0.00. Record its order code. Orders and the receipt must show the same breakdown.
5. **One order row:** Open Transactions, select a range containing the sale and search its code. Expect exactly one sale/order row, despite three products. Open it by clicking the row or using its named keyboard button. Expect Paid, Independent sale, cash method, all three quantities, subtotal $25.00, tax $2.50 and customer payment $27.50. Search by Honey too; the whole order remains one result. Next/Previous page order records rather than product allocations. Booth cost records, if present, remain costs.
6. **Historical stability:** After completing step 4, change only the separate test vendor's Honey price or tax rate. Reopen the completed order and transaction. The original $25.00/$2.50/$27.50 remains unchanged and no editable checkout is reopened. Restore test settings for subsequent runs.
7. **Discounts, where an existing supported vendor coupon is available:** Apply a 20% coupon covering all three test products before review. Expected merchandise before discount $25.00, discount -$5.00, merchandise subtotal $20.00, tax $2.00, customer payment $22.00. Complete a separate cash sale and compare Orders and Transactions. The receipt must not subtract $5.00 twice. This work did not create a coupon or add a promotion-management UI.
8. **Refunds, where already enabled and authorized:** From Orders refund the original Honey unit from the discounted sale using the existing cash-return confirmation. Expect $8.80 returned ($8.00 merchandise plus $0.80 tax), Partially refunded on the same order row, original payment $22.00, refunded tax $0.80 and payment remaining $13.20. Sale and refund stay separate dated events inside details. Do not create a replacement sale. The guarded demo normally retains its no-refunds policy; if unavailable, inspect existing saved refund history and use the passing disposable refund tests as automated evidence. Do not change that policy for this correction.
9. **Compare Finances:** Use identical dates, currency, market and account time zone across Transactions and Finances. For an otherwise empty scope containing only step 4: Gross $25.00, discounts/refunds $0, net sales $25.00, one order. The additional $2.50 is collected tax, not merchandise revenue. For only the discounted sale plus its Honey refund: Gross $25.00, discounts $5.00, merchandise refunds $8.00, net sales $12.00, one order. Customer payment remaining is $13.20, including the remaining $1.20 tax. Profit additionally reflects existing known costs/fees/expenses. CSV retains original line/event audit detail and should reconcile to the summary, not have its row count equated to order count.

## Scope left unchanged and limitations

- No dedicated persistent test account or curated fixtures were created. The write scenarios above require a separately provisioned vendor; existing records can be inspected immediately with their existing login. Manual UI acceptance remains the developer's task.
- No new tax/pricing engine, payment adapter, processor operation, service fee, Stripe Connect, QuickBooks synchronization change or historical financial recalculation was implemented.
- Original ledger gross/discount classifications and report arithmetic remain authoritative and unchanged. Native inclusive display uses saved evidence to present actual merchandise and discounts; net merchandise reconciles to the saved allocation.
- Order details include settled refunds. Existing POS refund controls retain their pending/failed/retry history; unverified refunds do not reduce collected amounts or become sales.
- Full detail loading preserves the existing 50,000-row safety limit. Shorten the range if that limit is reached. Product names may use the current translated catalog name, while financial amounts come from saved evidence.
- Complete legacy receipt recovery requires the original native line and its financial allocation. Missing evidence is not repaired or replaced with today's prices/taxes.
