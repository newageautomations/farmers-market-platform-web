# QuickBooks Online integration

Stage 3D, October 22, 2026. This guide describes the active accounting export strategy and supersedes the former native-tax setup instructions. Implementation is local only. No live Intuit writes, persistent database migrations, fixture regeneration, account provisioning, or deployment were performed for this change.

## Accounting treatment

Farmers Market Platform remains authoritative for checkout and financial reporting. Newly eligible taxable sales use balanced QuickBooks JournalEntries with the actual immutable purchase allocations. Each source line has its own stable sale event and journal; the complete vendor purchase and captured payment must reconcile before any of its new journals qualify. A multi-vendor payment cannot be exported as if its full captured amount belonged to one vendor.

| Recorded component            | Sale                           | Confirmed refund                       |
| ----------------------------- | ------------------------------ | -------------------------------------- |
| Actual customer payment       | Debit cash/clearing            | Credit original cash/clearing          |
| Gross merchandise             | Credit revenue                 | Debit original revenue                 |
| Allocated discount            | Debit contra-income discounts  | Credit original discounts              |
| Actual collected/returned tax | Credit collected tax liability | Debit original collected tax liability |

For $20 merchandise and $1.65 collected tax, debit cash $21.65, credit revenue $20, and credit tax liability $1.65. A full refund reverses these amounts in a new journal. An authoritative $8 merchandise / $0.66 tax partial refund debits revenue $8 and liability $0.66 and credits cash $8.66. These are examples, never replacement evidence for actual transactions. Discounts preserve gross revenue and the recorded contra-income allocation; no balancing amount or current-rate calculation is introduced.

Supported vendor tax evidence includes vendor defaults, per-market percentages, product overrides, disabled product collection, mixed taxable/nontaxable lines, multiple recorded rates and legitimate zero-rate taxable sales. Historical legacy tax-line evidence remains usable where complete. Existing tax-free journals remain compatible. No product classification, QuickBooks item/customer, tax code, matching rate, agency, or Automated Sales Tax setup is required for new liability journals.

These records appear in QuickBooks accounting reports but do not automatically populate QuickBooks' Sales Tax Center, prepare returns, determine agencies owed tax, or file/remit tax. Journal-entry sales may not appear in native product-level sales transaction screens and reports. The vendor remains responsible for verifying obligations, filing, and remittance.

## Required mappings and settings

Reuse the existing company-account selector and save settings:

- Revenue: active Income account.
- Discounts: active Income contra-income account, required for positive discounts.
- Cash or Stripe clearing: active Bank or Other Current Asset account for the selected source.
- Collected Sales Tax Liability: active Other Current Liability account with `AccountSubType=OtherCurrentLiabilities`. QuickBooks-managed sales-tax payable, tax-marked, or agency-linked accounts are excluded. Create a dedicated ordinary account with the Other Current Liabilities detail type in QuickBooks if needed, then Load company accounts and select it. The integration never chooses an account for you.
- Expenses: existing spending and category mappings. Market cash collections retain their existing mapping contract. Neither requires a tax liability mapping.

The liability mapping is necessary only for positive collected-tax lines. Missing mapping produces a specific Preview exclusion. Zero-tax sales and unrelated expenses continue without it. Explicitly provided invalid mappings fail settings validation. Before writing a liability journal or reversal, its saved accounting account contract is validated against active remote accounts.

Changing the liability mapping for selected sales sources uses the existing settings digest and pauses automatic synchronization pending renewed acknowledgment. It never activates a source. Configuration irrelevant to selected sources remains outside the acknowledgment contract. Stored native receipt mappings are preserved server-side, with their old setup controls removed from the new-export settings flow.

Square, Clover, Stripe, or other accounting integrations may already send the same transactions. Select only sources not already synchronized elsewhere. FMP prevents repeated exports of its own stable events but cannot reliably recognize transactions created independently by another integration.

## Refunds and historical compatibility

Refunds require the original sale to have succeeded in the same connected company. Original-unit allocations, provider result facts, settled native refund records, matching amounts/currency/input hashes, ownership and cumulative refund limits remain mandatory. Each refund allocation retains its own event identifier, so multiple partial refunds produce independent accounting events. Neither this exporter nor QuickBooks initiates the payment refund.

Liability journals save their strategy, amounts and accounts in durable local intent metadata. Refunds verify those values against the original allocations and reverse the saved revenue, discount, tax and cash accounts, even if current mappings change. No tax is estimated from current percentages. Before a new refund write, the original remote accounting entry is retrieved and matched to its saved evidence. Unsupported or externally edited originals require review.

Previously successful SalesReceipts, RefundReceipts and JournalEntries are never migrated, deleted or replayed. Existing native receipt intents retain their original entity, source membership, payload, fingerprint and reconciliation rules. Their single-rate native-tax resources are consulted only for that legacy workflow. Refunds of compatible legacy SalesReceipts still use RefundReceipts with the existing strict native tax checks; unsupported legacy discounts/zero-tax receipt refunds remain excluded. Existing tax-free JournalEntries retain their original fingerprints and reversal behavior. Changed source evidence requires attention rather than an entity switch to bypass a failure.

The shared executor retains unique business/event claims, intent-before-write, stable request IDs and document markers, grouped legacy receipt claims, advisory locks, retry timing, exact remote response matching, original references and fresh business authorization. A timeout is reconciled before another create is considered. Manual and automatic synchronization use this same executor.

## Safety boundaries and reporting

Completed supported Cash and Stripe payments, USD, immutable allocations, source ownership and exact integer-cent reconciliation remain required. Square/Clover exports, shipping/service charges, missing historical tax/settlement facts, cross-vendor captured totals, invalid financial amounts, unconfirmed refunds, uncertain originals and unsupported expense changes stay excluded or require attention. Zero-value entries are not manufactured. Expense corrections retain the append-only audit/reversal workflow.

No checkout, vendor tax engine, reporting calculation, expense/product-cost/profit calculation, processor support, payout reconciliation or dashboard controller changes are part of Stage 3D. Exporting does not change platform merchandise revenue or tax/refund reporting.

Automatic synchronization remains opt-in, uses the saved owner/channel and exact activation boundary, and checks about every five minutes while the demo worker runs. Activity completed while off or before the latest boundary stays in manual preview. The existing worker uses the real saved Channel entity and native database timestamp convention. Settings acknowledgment sorts source/account keys to avoid JSONB key-order pauses. SENDING, UNCERTAIN and Needs Attention records pause background processing; retry delays, incident deduplication and existing inbox notifications remain intact. Disabling automation preserves history and an in-progress operation may finish or need reconciliation.

## Local environment and existing test identities

Use only the populated `vendure_demo_market_ops` environment for the integrated manual walkthrough. This implementation does not alter it. No schema migration is introduced. Do not reset, seed, regenerate fixtures, change established managers/Manna Roots, replace the connected sandbox company, or fabricate provider settlement or successful history.

Primary vendor: **FMP Automatic Sync Test Vendor**, `automatic.sync@example.test`, password `local-identity-regression-only-password`, verified synthetic phone `+12025550173`. Reuse **FMP Refund & Accounting Test Vendor**, `refund.accounting@example.test`, with the same existing fixture password when its existing refund allocations are useful. Use the ordinary owner login and existing vendor channel.

Start each process in a separate PowerShell terminal from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

The normal demo startup now uses `local-demo-refunds-v1` with vendor refund requests enabled for new purchases. Cash/POS full and partial original-unit refunds reuse the existing Record Refund dialog; select only the purchased units being returned for a partial refund. Restart the demo backend and worker after this configuration change. Previously completed purchases keep their immutable checkout refund policy, so purchases captured under `local-demo-no-refunds-v1` remain nonrefundable. No historical snapshot is rewritten. `ENABLE_LOCAL_REFUNDS=false` still disables the separate local provider simulator; it does not disable the normal cash/POS refund path.

Backend is `http://localhost:3000`, admin is `http://localhost:4322`, storefront is `http://localhost:4321`. Retain the existing ignored backend `.env.demo-market-operations`, development client credentials, connected company and credential encryption keyring. Both backend and worker must use the same sandbox configuration: `DEMO_QBO_SANDBOX=true`, `QBO_ENVIRONMENT=sandbox`, intended sandbox network allowance, `QBO_ADMIN_ORIGIN=http://localhost:4322`, development client ID/secret, active key version and 32-byte base64 keyring. Do not log or copy credentials into frontend files. Production activation is rejected. Do not reconnect unless the existing connection actually requires it; preserve the original company. No hosting or provider configuration change is part of this implementation.

## Exact integrated manual walkthrough

The user performs any sandbox writes below. First record existing company ID, source selections, automation state/boundary, history IDs/entity types/provider IDs and relevant dashboard totals. Keep account selections and actual source totals in your notes. Preview only a narrow date range in the account timezone. For each new journal, compare debit/credit lines with the official completed receipt and immutable financial details; never infer a successful result from a toast alone.

1. Sign in at `http://localhost:4322`, select the existing test vendor, and open `/vendor/finances/quickbooks`. Retain the connected sandbox. Select only intended Cash activity that is not sent by another integration. Map Revenue and Cash; map Discounts if testing discounts. Activate/save sandbox exports. Native item, customer, code and rate selectors should be absent. Capture existing history before changing anything.
2. At `/vendor/pos`, complete a tax-free cash sale of an existing product with collection disabled or a legitimately recorded zero rate. Review official receipt totals. Preview its date, Sync Now and confirm once. Verify payment equals net merchandise, no liability line exists, and no liability mapping was required. Do not disable tax on unrelated established products.
3. In this dedicated vendor's `/vendor/settings/taxes` and product editor, use the existing tax controls to arrange an existing test product priced $20 with an 8.25% vendor default and no override. Complete a cash sale only after backend review shows $20 merchandise, $1.65 tax, $21.65 payment. First preview with no liability mapping: it must be excluded with Collected Sales Tax Liability guidance. Tax-free activity and unrelated expenses must remain usable. Select a dedicated ordinary liability account, save, preview again and synchronize. Verify cash debit $21.65, revenue credit $20, liability credit $1.65 in the actual QuickBooks journal. Inspect accounting reports and confirm the documented Sales Tax Center limitation.
4. Use the dedicated test product's existing tax override control, record a distinct percentage, and complete another cash sale. Compare the exported liability amount with that sale's actual receipt. Also exercise an existing approved market context with a recorded per-market percentage. Neither should require matching QuickBooks rates or agencies. Changing current percentages afterward must not change previously recorded export amounts.
5. Complete one sale containing a taxable product and a product with tax collection disabled, then a sale with two different recorded product rates. Preview the complete sale. Each immutable line gets a separate journal, with no tax liability on the untaxed line. Sum the actual payment debits and verify they match the single captured payment exactly. Do not split a payment across vendors to force eligibility.
6. Apply an existing supported discount with immutable allocations to a taxable sale. Record official gross merchandise, discount, tax and paid values. Verify revenue is gross, the discount is a separate debit, tax is the recorded liability credit and total debits equal credits. Multi-line discounts are supported only when those source allocations reconcile. Unsupported evidence must remain excluded.
7. Save selected sources/mappings and enable Automatic Synchronization with the existing duplicate acknowledgment. Note the returned exact boundary. Complete a new taxable cash sale afterward, wait through the worker's five-minute business check, and inspect history/provider ID and actual journal. Confirm older sales stay outside automatic discovery. Changing the selected liability mapping pauses automation and requires acknowledgment again; restoring it does not silently reactivate automation.
8. For a genuinely synchronized new taxable sale, open its original sale details in Orders/POS and use the ordinary full-refund workflow. Complete the cash refund through its existing attestation. Preview the refund's date and sync it. Verify original revenue/tax are debited and original cash is credited, with the original sale untouched. Current mapping changes must not redirect its reversal.
9. Use an existing supported multi-unit taxable sale with authoritative refundable unit allocations. Refund only the intended units. Verify the journal reverses actual recorded merchandise/discount/tax and total returned. The $8/$0.66/$8.66 example applies only when those are the actual allocated values; do not type invented tax amounts or fake settlement facts.
10. Refund another remaining unit through a separate completed refund operation. Preview/sync it separately. Verify distinct refund event and provider IDs, exact recorded amounts, correct cumulative original limits and unchanged prior refund records. Amount-only refunds without supported immutable allocations remain excluded.
11. Preview previously successful SalesReceipt, RefundReceipt and JournalEntry dates. Compare their saved record IDs, entity types, provider IDs and payloads with the baseline: all remain intact and no replacement journals are created. A supported new refund of an old SalesReceipt continues as a RefundReceipt; native tax compatibility checks still apply to that historical path. Do not create fake old history to force the scenario.
12. Preview and synchronize the same new sales/refunds again, including after the automatic worker has seen them. All successful events should say Already synchronized, with no new remote journals or IDs. Compare platform dashboard totals using exactly the baseline date/timezone/filter settings: exporting alone must not change them. Keep existing Needs Attention/uncertain intents in review rather than attempting a replacement entity.

When an existing fixture cannot supply an authoritative partial refund or legacy successful receipt, leave that specific manual case unqualified until genuine evidence exists. Do not rerun fixture generators or manufacture settlement/history. No sandbox test in this guide claims a production tax result.

## Focused automated verification

Only mocked Intuit responses and guarded loopback `vendure_test_*` databases are used. `test/test-database.ts` refuses protected development names and cleanup of databases not created by that process. Failed runs are retained for diagnosis. No browser automation/screenshots or repository-wide regression suite is required.

From the backend folder:

```powershell
node node_modules/ts-node/dist/bin.js --project test/quickbooks/tsconfig.json test/quickbooks/run.ts
node node_modules/ts-node/dist/bin.js --project test/quickbooks/tsconfig.json test/quickbooks/native.ts
node node_modules/typescript/bin/tsc --noEmit --project test/quickbooks/tsconfig.json
$env:APP_ENV='dev'
$env:NODE_ENV='development'
$env:QBO_ALLOW_NETWORK='false'
npm run build
```

From the web folder:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
node node_modules/vitest/vitest.mjs run tests/quickbooks.test.tsx
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js apps/admin/src/finance/QuickBooks.tsx packages/api/src/quickbooks.ts tests/quickbooks.test.tsx
node node_modules/prettier/bin/prettier.cjs --check apps/admin/src/finance/QuickBooks.tsx packages/api/src/quickbooks.ts tests/quickbooks.test.tsx docs/QUICKBOOKS_ONLINE_INTEGRATION.md
```

Stage 3D verification: 57 focused mocked-provider/backend checks passed, 38 focused frontend tests passed, and the native A/B/C plus vendor-tax checkout checks passed in disposable databases. Web TypeScript, focused backend TypeScript, targeted frontend ESLint and scoped Prettier checks passed. The dashboard/server/worker build passed with explicit local development mode and QuickBooks networking disabled. The initial unconfigured build correctly refused to run without an explicit APP_ENV; no policy was relaxed. The first sandboxed database run lacked loopback permission; the authorized local disposable test run succeeded. Earlier failed regression-fixture runs were retained by the guard for diagnosis and never targeted the persistent database. Native tests emit an existing pg concurrent-query deprecation warning without failing. No live sandbox acceptance result is claimed. Focused checks cover uncertain taxable intents retaining their saved accounts after current mappings change or are removed, exact serialized liability journals, mixed/zero/different tax rates, discounts, missing/invalid ordinary liability accounts, reconciliation failures, original-account full/partial refund reversals, legacy receipt compatibility, attempted-intent preservation, locks/concurrent manual-worker execution, duplicate prevention, owner isolation and activation boundaries. Financial report implementation remains unchanged; native fixture checks verify report amounts independently of export.

## Remaining production accounting considerations

This remains sandbox-only. Accountant review of the chosen liability and contra-income accounts, tax obligation/filing/remittance workflows, native product-sales report limitations, cross-integration duplicates, account changes/closures, external journal edits, timezone consistency, encrypted credential operations, monitoring, and genuine sandbox acceptance/report reconciliation remain necessary before any separately authorized production rollout. Native Sales Tax Center integration would be a separate feature with its own verified agency/accounting design. No automatic tax-location lookup, classifications, tax-agency allocation, return preparation, payout reconciliation or new payment processor is introduced.
