# Financial reporting and expense management implementation

This report records the initial delivery. The subsequent [dashboard interaction and account-timezone update](dashboard-update.md) supersedes its UTC/bar-chart presentation and resolves the pending manager browser verification below. Current checks include 20 backend groups and all screenshot-free browser checks passing.

This is one combined local implementation across the existing web and backend repositories. No commits, remote pushes, deployments, protected-database migrations, or real processor transactions were performed.

## Delivered behavior

| Area                     | Implementation                                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vendor reporting         | Gross sales, estimated profit, expenses, sale counts, date and market scope, independent sales, daily/weekly/monthly charts, product contribution and sales, category analysis, transaction details, CSV                 |
| Market manager reporting | Own native invoice collections, operating expenses, estimated event profit, outstanding invoice balances, separate business scope and logs                                                                               |
| Expense management       | Validated create/edit, optimistic conflicts, idempotent creation, audited void, category and market/event attribution, notes/payee, private scanned image/PDF receipts                                                   |
| Product costing          | Optional variant cost in existing catalog workflows, effective-dated history, immutable capture-time cost snapshots, unknown-cost handling, atomic costed variant creation                                               |
| UI                       | Existing dashboard shells and approved primitives, four summary cards, full-width graph with visible expenses and negative values, three analytics cards, compact actions and record-detail dialogs, responsive controls |

The same backend calculation supplies summaries, chart buckets, logs, drilldowns, and exports. Existing payment coordinators and verified native allocations remain the authoritative sale source. Cost snapshots add private reporting facts in the existing attribution transaction without changing checkout prices, tax, payment capture, or refund behavior.

There is no ledger, bank integration, payroll, tax filing, OCR, inventory valuation, guessed fee percentage, or invented revenue. Existing processor records without explicit vendor fee ownership remain unknown. Historical sales without a cost snapshot are not assigned today's production costs. See [architecture and definitions](architecture.md) and [expense treatment](expense-policy.md).

## Local files and database models

Backend paths below are relative to `E:\coding\farmers-market-platform`:

- `src/plugins/financial-reporting/{financial-reporting.plugin,api,service,calculations}.ts`: plugin, scoped Admin API, authorization/storage orchestration, centralized calculations and CSV.
- `src/migrations/1793400000000-FinancialReporting.ts`: additive private tables and source-query indexes. The five tables are `finance_product_cost`, `finance_sale_cost`, `finance_expense`, `finance_expense_audit`, and `finance_receipt`. History tables have immutability protections; rollback refuses to discard financial history.
- `src/plugins/marketplace-commerce/financial/financial-attribution.service.ts`: capture-time cost snapshot integration.
- `src/plugins/marketplace-commerce/types.ts` and `src/vendure-config.ts`: optional reporting flag and plugin registration.
- `test/financial-reporting/{fixture,run}.ts` and `tsconfig.json`: guarded native month generator and combined qualification.

Web paths below are relative to `E:\coding\farmers-market-platform-web`:

- `apps/admin/src/finance/{Finances,ProductionCost,charts}.tsx` and `finance.css`: shared role-aware feature compositions and signed monetary charts.
- `apps/admin/src/vendor/{VendorRoutes,catalog,service}.tsx/ts` and `apps/admin/src/market/{MarketRoutes,service}.tsx/ts`: existing route, catalog, and service integration.
- `apps/admin/src/NavigationIcon.tsx` and `packages/admin-core/src/index.ts`: scoped finance navigation and route access, including the explicit manager sidebar ordering.
- `packages/api/src/finance.ts`, `index.ts`, and `errors.ts`: typed Admin-only adapter, exports, safe error feedback.
- `scripts/extract-schema.ts`, Admin schema/provenance and generated Admin types: schema extraction/codegen. No finance roots are added to the Shop API.
- `scripts/finance.ts`, `finance-browser.ts`, `finance-regression.ts`, `package.json`, `.gitignore`: isolated fixture lifecycle, local launch commands, screenshot-free browser checks, existing regression orchestration, ignored local manifest.
- `tests/finance.test.tsx`: combined UI and navigation coverage.
- `COMPONENT_USAGE_GUIDE.md`, `UI_COMPONENTS.md`: documented feature composition and why the existing specialized charts could not be reused.
- `docs/financial-reporting/`: architecture, policy, expected results, manual guide, and execution reports.

Both repositories already contained unrelated local work. This list identifies this feature's additions and integration points; it is not a claim that every Git modification belongs to this feature.

## Executed checks

| Check                                                   | Result and evidence                                                                                                                                                                                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Combined backend qualification                          | 19 groups passed, [automated-results.json](automated-results.json). Successful automatic database was dropped by the existing guard.                                                                                                                                |
| Retained month verification and seed reuse              | 10 groups passed; rerunning the seed reused the exact existing dataset. [fixture-verification.json](fixture-verification.json), [seed-reuse.log](seed-reuse.log)                                                                                                    |
| Finance and shared admin DOM tests after navigation fix | 31 tests passed: 13 finance, 18 admin. [finance-ui/unit-results.json](finance-ui/unit-results.json)                                                                                                                                                                 |
| Existing financial allocation/refund regression         | 62 checks passed, [financial-refunds.log](regression/financial-refunds.log)                                                                                                                                                                                         |
| Existing native POS/payment regression                  | 27 groups passed, [pos-payments.log](regression/pos-payments.log)                                                                                                                                                                                                   |
| Existing Square controlled regression                   | 29 credential-free groups passed, zero real API calls, [square.log](regression/square.log)                                                                                                                                                                          |
| Existing Clover controlled regression                   | 25 groups passed, zero real API calls, [clover.log](regression/clover.log)                                                                                                                                                                                          |
| Existing loyalty/discount regression                    | 16 groups passed, [loyalty-discounts.log](regression/loyalty-discounts.log)                                                                                                                                                                                         |
| Production builds                                       | Web storefront/admin and backend dashboard/server/worker passed using the existing synthetic build-only environment. [build.log](build.log)                                                                                                                         |
| Browser vendor checks                                   | Nine groups passed: native sign-in, responsive geometry, negative graph values, keyboard focus, global filters, axe dashboard/dialog checks, create/edit/void with restored totals, live scanned receipt preview, CSV. [browser-results.json](browser-results.json) |
| Browser manager check                                   | Found a missing `Finances` label in the manager's explicit sidebar ordering. Fixed locally and covered by the passing navigation test. Browser rerun after that fix remains pending.                                                                                |

The backend includes successful native online checkout and failed/unplaced POS checks, immutable cost history, actual fee evidence deduplication, native booth-cost attribution, cross-tenant denial, expense retry/conflict/audit handling, and controlled scanner failures. The browser receipt test additionally passed through the healthy local ClamAV scanner, rather than only using the controlled test scanner.

The first broad frontend run passed 590 of 591 tests. The final broad run includes the added navigation regression and passed 591 of 592 tests. Both failures came from the untouched UI gallery's real Astro build guard: its child process returned no expected diagnostic within the bounded invocation under concurrent work. All eight gallery tests passed on both isolated retries, including the final retry in 5.87 seconds. The gallery failure is reported separately and was not fixed by changing unrelated test policy. No claim is made that every possible pre-existing failure was investigated. [Initial full result](full-suite-results.json), [final full result](final-suite/unit-results.json), [final gallery retry](gallery-final-retry/unit-results.json).

Final static checks passed: root TypeScript, Astro with zero errors/warnings/hints across 95 files, backend strict feature typecheck, targeted ESLint, package/source boundaries, formatting, and scoped whitespace checks. The web storefront/admin build also passed again after the manager navigation fix. Existing bundle-size warnings remain. See [typecheck.log](typecheck.log) and [web-build-final.log](web-build-final.log).

## Verification remaining for the developer

The manager browser rerun was blocked by automatic approval review hitting its usage limit. The review service could not evaluate the action; it did not determine the action unsafe. The developer requested leaving the rerun command in this report. No screenshots are taken or reviewed by the updated browser script.

With the isolated backend, admin, account frontend, and healthy local scanner running:

```powershell
$env:FINANCE_LIVE_RECEIPTS='true'
npm run test:finance:browser
```

This exercises both roles. It writes `browser-results.json`; successful completion voids its temporary expense and restores the month reference. A failed/interrupted expense step can leave a temporary expense, so inspect the log and void that expense before a retry. Do not reset or reseed protected data.

## Retained manual month and login

The retained local database is `vendure_test_pos_demo_1792526989882_c5c1fa`. It contains a deterministic September 1 through September 30, 2026 month for the existing documented Manna Roots identity/catalog, reproduced in an isolated fixture: three markets, twelve market days, independent sales, 27 completed sales, discounts/refund, cash and controlled simulated payments, varied known/unknown costs, 19 vendor expenses, and separate manager collections/expenses. Browser-generated test expenses were voided; their audit records and scanned receipts remain intentionally retained.

Run each server from the web directory in a separate terminal:

```powershell
npm run demo:finance:serve
npm run demo:finance:admin
npm run demo:finance:storefront
```

Sign in at `http://auth.platform.localhost:4378/account/login` as `manna-roots@example.test`, password `local-identity-regression-only-password`. Open `http://localhost:4596`, choose Vendor mode/Manna Roots if prompted, and click Finances. Select September 1 through September 30, 2026 and All sales. The account handoff can land on Overview; use the sidebar after sign-in.

Expected summary: **$2,209.50 gross, $1,770.60 expenses, $417.25 estimated profit, 27 sales**. Negative-profit dates are September 8, 14, 22, and 30. Manager credentials are `market.manager@example.test` with the same local-only password; select Boerne. Its expected collected revenue is $140.00 and estimated profit $52.00, with $15.00 outstanding.

Use [the detailed manual walkthrough](manual-testing.md) for expense edits, cost history, receipt access, tenant isolation, dataset removal, and exact page/filter actions. [Readable reference totals](expected-totals.md) and [integer-unit reference](expected-totals.json) cover every product, market, category, and negative date.

## Accuracy and operational limits

- Profit is an estimate from known costs. The fixture explicitly has two sold units with unknown production cost and six sales without assigned actual fees.
- Taxes and other non-product collections are excluded from vendor earnings. Refunds apply on settlement date; production costs are not reversed merely because a product was refunded.
- General overhead appears once in business-wide totals. Unattributed legacy market activity is retained in All sales without pretending it was independent. Reports do not silently truncate over their record limits.
- Manager collections represent only payments the platform actually records. Vendor merchandise sales, unrecorded sponsorships, and bank transfers are not manager revenue.
- Receipt access is private and requires current business authority. Scanning depends on the existing local scanner and encrypted storage configuration.
- `vendure_demo_market_ops` and `vendure` were not migrated, seeded, reset, or replaced. The additive migration was exercised only in guarded disposable finance/test databases. A future persistent-demo migration requires the developer's explicit request and the guarded `demo:market-operations:migrate` command.
- Failed intermediate automatic databases remain retained by the existing test harness for investigation. The explicit manual fixture removal command only removes its manifest-owned idle database.
