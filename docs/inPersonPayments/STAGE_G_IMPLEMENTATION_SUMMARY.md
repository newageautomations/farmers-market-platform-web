# Stage G implementation summary

Stage G locally connects cashier-assisted customer identity and vendor reward redemption to the existing provider-independent payment, loyalty, fulfillment and original-unit refund paths. Stage F remains explicitly deferred and does not block controlled Stage G qualification.

## Implemented

- Exact phone lookup, common US formats, canonical international input, known customer names, current-vendor balances and reward restrictions, durable lookup limits and minimal outcome audits. No customer verification step.
- Cashier-attested verbal consent, native reward promotions and discounted quotes before collection, immutable consent lineage, wallet-locked reservations and usage limits, failure release and original-attempt recovery.
- Automatic vendor earning after verified payment and actual POS handoff, using existing merchandise-cent rules. Guest and invitation behavior remain intact.
- Automatic Discovery, Visits and Spending qualification from the selected authorized occurrence and original verified payment timestamp. Frozen context preserves schedule, time zone and participation provenance.
- Settled original-unit refund reversal, minimum-threshold recalculation, completion invalidation, retained history for fulfilled rewards, and auditable deficits for already-spent points.
- Existing dashboard/register/shared components, disposable interactive demo, current-run market fixtures, full/partial refund controls, controlled providers and a read-only ledger audit.

The additive migration creates two POS audit tables. It creates no reward balance, competing loyalty engine or monetary market-reward contract. No protected database was migrated or seeded, no production payment was made, and no deployment or Git mutation was performed.

## Established domain differences

Vendor earning currently has a fixed one-point-per-eligible-cent formula and no configurable earning minimum. Online earning still waits for ordinary fulfillment; POS uses its existing immediate handoff. Original tax, discounts, native orders, payments and financial-unit allocation remain authoritative.

Market rewards are fulfillment promises managed through the existing market claim/review lifecycle. The POS displays relevant earned rewards and collection instructions. It does not turn manager-written text into an arbitrary cash discount. Monetary market checkout rewards need defined discount, eligibility and reimbursement terms before they can be redeemed financially.

## Execution status

| Check                                                                           | Final result                                                                                              | Evidence in `stageGTestLogs/`                                                            |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Stage G real disposable commerce                                                | PASS, 16 groups, including captured sale recovery after occurrence close                                  | `stage-g-final.log`                                                                      |
| Square controlled integration                                                   | PASS, 29 groups, including loyalty discount, earning, redemption and full refund                          | `stage-c-loyalty.log`                                                                    |
| Clover controlled integration                                                   | PASS, 25 groups plus 25 merchant-verification cases                                                       | `stage-d-loyalty.log`                                                                    |
| Square Mobile and Clover Go controlled integration                              | PASS, 26 groups, including both loyalty/refund contracts                                                  | `stage-e-loyalty.log`                                                                    |
| Stage A and B                                                                   | PASS, 22 and 27 groups                                                                                    | `stage-a.log`, `stage-b.log`                                                             |
| Existing online vendor and market loyalty                                       | PASS, 33 and 38 groups                                                                                    | `vendor-loyalty.log`, `market-loyalty.log`                                               |
| Financial attribution/refunds, inventory/capacity, identity and native commerce | PASS, including their required earlier-phase regressions                                                  | `financial-refunds.log`, `inventory-capacity.log`, `identity.log`, `native-commerce.log` |
| Frontend                                                                        | PASS, 579 tests across 46 files                                                                           | `frontend-all.log`                                                                       |
| Real local browser and read-only demo audit                                     | PASS, four browser groups at 1280/768/390px and exact original-payment/ledger audit                       | `browser-final.log`                                                                      |
| Frontend and backend type checks                                                | PASS                                                                                                      | `frontend-types.log`, `backend-types-final.log`                                          |
| Frontend build                                                                  | PASS                                                                                                      | `frontend-build.log`                                                                     |
| Backend dashboard, server and worker build                                      | PASS with explicit local application/build modes                                                          | `backend-build-explicit-local.log`                                                       |
| ESLint and package/source boundaries                                            | PASS                                                                                                      | `lint.log`, `boundaries.log`, `lint-all.log`                                             |
| Full repository formatting                                                      | Existing unrelated failure in `packages/ui/package.json`; that pre-existing modified file was left intact | `lint-all.log`                                                                           |

The first broad regression command retained a native test teardown failure after its assertions passed. The test now waits for actual outstanding search-index job writes before closing its database. The final 26-group native run passes with successful disposable cleanup. The original `regression-results.json` is retained honestly; `providers-results.json` records the final four passing integration suites. `qualification-results.json` consolidates the latest results with their source files.

The unconfigured full backend build initially failed its explicit application-mode guard. Setting both `APP_ENV=test` and `NODE_ENV=development` produced a successful local dashboard/server/worker build. The guard was preserved. No live Sandbox or physical-device qualification was rerun.

## Local files changed

| Area                                  | Files                                                                                                                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend audit schema                  | `src/migrations/1793300000000-InPersonLoyalty.ts`                                                                                                                                                        |
| Existing loyalty owners               | `src/plugins/marketplace-commerce/loyalty/service.ts`, `market-loyalty/service.ts`                                                                                                                       |
| Existing commerce hooks               | `financial/financial-attribution.service.ts`, `financial/refund-writer.service.ts`, `financial/vendor-promotion.service.ts`, `inventory/operational-inventory.service.ts` under the commerce plugin      |
| POS identity, quote and original time | `in-person/service.ts`, `in-person/payment-adapter.ts`, new `in-person/purchase-time.ts`                                                                                                                 |
| Verified provider time                | `in-person/square/provider.service.ts`, `in-person/clover/provider.service.ts`, `in-person/mobile/provider.service.ts`, `in-person/mobile/contracts.ts`                                                  |
| Controlled qualification/demo         | New `test/in-person/stage-g.ts`, `stage-g-fixture.ts`, `stage-g-provider-check.ts`, `stage-g-audit.ts`; existing POS fixtures, demo, native driver, Square/Clover/mobile suites and Stage B expectations |
| Web register and contracts            | `apps/admin/src/vendor/pos.tsx`, `pos.css`, `packages/api/src/in-person.ts`, `tests/in-person.test.tsx`                                                                                                  |
| Local launchers                       | New `scripts/stage-g.ts`, `stage-g-browser.ts`; extended `scripts/in-person.ts`, `mobile-control.ts`, root `package.json` and `.gitignore`                                                               |
| Documentation                         | Seven `STAGE_G_*.md` documents, the in-person roadmap and retained `stageGTestLogs/`                                                                                                                     |

Existing UI primitives, approved design categories and root component documentation did not change. No new UI primitive or competing presentation contract was necessary.

Physical devices, real Clover Go SDK qualification, iOS compilation/runtime, external webhooks, production deployment and production readiness remain outside this stage. Existing developer-reported Sandbox and Square Mock Reader work is not re-certified by controlled tests.

See `STAGE_G_MANUAL_TESTING.md` for exact local startup, fictional account, phone, refund, provider-control, read-only verification and shutdown commands.
