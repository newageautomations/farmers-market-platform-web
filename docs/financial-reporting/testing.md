# Combined testing

Financial reporting, costing, expense management, and receipts are qualified together. The test runner uses the existing guarded disposable PostgreSQL mechanisms and native checkout, payment, refund, catalog, occurrence, and billing services. No test points a destructive harness at `vendure` or `vendure_demo_market_ops`.

From `E:\coding\farmers-market-platform-web`:

```powershell
npm run test:finance:backend
$env:FRONTEND_EVIDENCE_DIR='docs/financial-reporting/finance-ui'
npx vitest run tests/finance.test.tsx
npm run test:finance:regression
```

Backend results are saved in `automated-results.json` and `test.log`. Frontend results use `finance-ui/unit-results.json`. Existing payment regressions write `regression/results.json` and separate logs. The independent month reference is `expected-totals.json`. Native runtime data and encrypted receipt files are not testing reports. The manual fixture manifest `local-fixture.json` is ignored by Git.

The backend checks compare all summary fields against arithmetic calculated independently from the planned native sales, discounts, returned units, and expense inputs. Individual-market and independent scopes are checked separately. September 8 and September 22 must remain negative without sales. Costs classified as already included are checked against spending and profit. Receipt checks use the existing storage/validation pipeline with a controlled scanner result; a controlled pass is not represented as a live malware scan.

Frontend DOM tests exercise exact date presets, global scope changes, gross/net selection, negative points, zero baseline, product and daily-value dialogs, expense creation/editing, compact record rows, manager adaptation, cost clearing, empty states, and weekly/monthly arithmetic. Native browser focus, responsive geometry, and live scanning must be distinguished from DOM-only evidence in the final results report.

With the three isolated finance servers running, the browser command is:

```powershell
$env:FINANCE_LIVE_RECEIPTS='true'
npm run test:finance:browser
```

The browser script uses no screenshots, recordings, or visual review. It checks DOM geometry at 1280, 768, and 390 pixels, keyboard focus restoration, accessibility, native sign-in, expense edits and voids, the actual local scanner, CSV download, and manager adaptation. It creates an auditable temporary expense and voids it on successful completion. If interrupted during that expense test, find the uniquely named `Finance browser delivery` expense and void it before rerunning. Never reset the fixture to recover from an interrupted browser check.

The September generator uses the existing guarded simulator and original service authority checks. A test-only virtual calendar normalizes occurrence context and verified provider times before immutable sale facts are inserted. It does not disable immutable triggers, rewrite captured financial facts, or change production clocks. Reusing the completed fixture does not install these seeding adapters or replay purchases.

Failed test databases are retained by the existing harness for investigation. Successful automated test databases are dropped through its guarded cleanup. The separately requested manual month is retained until `npm run demo:finance:remove` verifies its exact manifest token and idle database before removing it.

See [manual testing](manual-testing.md) for concrete UI steps and [architecture](architecture.md) for definitions, unsupported information, and historical policies. The final implementation report records the commands actually executed and any failures; this document describes intended test coverage rather than claiming an unrun check passed.
