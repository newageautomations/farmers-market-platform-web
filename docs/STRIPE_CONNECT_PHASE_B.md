# Stripe Connect Phase B implementation

Implemented locally on November 9, 2026. The architecture audit remains unchanged. No Stripe requests, deployment, persistent-database migrations or persistent test-account changes were performed.

## Implementation summary

The backend now represents an aggregate checkout with a durable payment group and a frozen obligation for each vendor. A trusted internal handler registers one actual Vendure Payment per positive verified obligation. Native Vendure payment transitions determine when the aggregate becomes PaymentSettled and creates seller orders. Financial attribution retains its existing vendor, line and original-unit allocations and adds a mapping to each vendor's payment.

`multiPaymentFoundation` is an optional plugin option whose default is disabled. No runtime configuration enables it. The qualified execution path uses independently committed local simulator facts in a test composition. These are genuine Vendure payment records with explicitly simulated provider evidence, not real Stripe charges. Stripe account routes are represented in the model but rejected by the foundation's creation service until a later provider phase qualifies them.

The dedicated foundation suite passes. Existing broader financial and POS suites have fixture failures described below, so this report does not claim complete POS or provider lifecycle qualification.

## Files changed

Backend paths below are relative to `E:\coding\farmers-market-platform`.

- New: `src/plugins/marketplace-commerce/commerce/payment-group.entities.ts`, `payment-group.service.ts`; `src/plugins/marketplace-commerce/financial/purchase-payments.ts`; `src/migrations/1796400000000-StripeConnectFoundation.ts`; `test/paid-attribution-refund/payment-groups.ts`, `payment-groups.tsconfig.json`.
- Commerce integration: `src/plugins/marketplace-commerce/commerce/capability.ts`, `checkout-coordinator.ts`, `native-commerce.adapter.ts`, `strategies.ts`; `src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts`, `types.ts`.
- Existing financial integration: `src/plugins/marketplace-commerce/financial/entities.ts`, `financial-attribution.service.ts`, `financial-audit.service.ts`, `provider-facts.service.ts`, `refund-coordinator.ts`, `refund-writer.service.ts`.
- Owned checkout/readers: `src/plugins/marketplace-commerce/customer-account/api.ts`, `service.ts`; `src/plugins/marketplace-commerce/customer-relationships/purchase-relationship-consumer.ts`.
- Provider/report readers: `src/plugins/payments/provider-executor.service.ts`, `reconciliation.service.ts`, `transfer.service.ts`; `src/plugins/financial-reporting/service.ts`, `order-transactions.ts`; `src/plugins/quickbooks/service.ts`.
- Test setup and commands: `package.json`; `test/paid-attribution-refund/fixture.ts`, `run.ts`, `acceptance.ts`; `test/platform-identity/fixture.ts`, `test/farmers-market/fixture.ts`, `test/inventory-capacity/fixture.ts`, `test/marketplace-commerce/fixture.ts`. Current-schema fixtures provision initial owners in the business transaction and provide required product classification. No production ownership or taxonomy rules were weakened.
- Local Vendure test/bootstrap tooling also refreshed `src/gql/graphql-env.d.ts`. It is generated admin schema typing, not a new payment API or dependency modification.

Web paths are relative to `E:\coding\farmers-market-platform-web`:

- `packages/api/operations/checkout.graphql`, `packages/api/src/checkout.ts`, `packages/api/src/generated/shop.ts`, `packages/api/schema/shop.graphql`, `packages/api/schema/provenance.json`.
- `tests/local-test-checkout.test.tsx`, `tests/storefront-checkout-ui.test.tsx`: existing typed fixtures now specify `paymentGroup: null`. No UI rendering or styles changed, and these UI suites were not run.
- This implementation report is the only new report. Both projects already contained unrelated local changes; the lists above describe this task's changes only.

## Entities and additive migration

`CheckoutPaymentGroup` binds parent order, unique attempt, channel and customer/session principal to the quote fingerprint/version, policy version, currency, total and exact vendor coverage. It stores decision/version, placement status, reservation and finalization deadlines, terminal reason and recovery context. Only one pending group may exist for a parent. Creation rejects a parent with unresolved compensation/recovery or an already initiated legacy capture.

`VendorPaymentObligation` stores canonical vendor, exact integer amount/currency, original provider/platform/account/mode/connection-version route, generation and idempotency identity, verified capture fact, provider payment identity, payment state and independent compensation state. Group/vendor, accepted capture fact and operation ownership are constrained. Zero-amount portions require no native payment; wholly zero-total checkouts remain unsupported.

`PurchasePaymentAllocation` immutably links purchase, vendor financial allocation, obligation, actual Vendure Payment, provider capture fact, amount/currency, original route, capture time and provenance. Payment, obligation, vendor allocation and capture fact cannot be reused in another mapping.

`StripeConnectFoundation1796400000000` creates these three tables with foreign keys, uniqueness, integer amount checks, identity guards, immutable allocation history and deferred purchase/group completion checks. It adds nullable `ProviderOperation.obligationId` and `paymentRoute`, retains the legacy unique capture per attempt, and adds a separate unique capture per obligation. It adds `PurchaseFinancialSnapshot.schemaVersion` defaulting to 1 and allows null legacy `paymentId` only for version 2 snapshots. Existing values remain unchanged.

There is no historical payment-allocation backfill. Historical snapshots remain authoritative through their original payment reference; account provenance is not guessed. The migration is forward-only, and its down method refuses to discard financial history.

## Vendure invariants and atomic placement

The installed Vendure version is 3.7.3. Source inspection confirmed:

- `OrderService.addPaymentToOrder` passes the remaining balance to the registered handler and retains coupon revalidation.
- `PaymentService.createPayment` persists the handler's returned amount through its supported transactional payment state machine.
- The default payment process transitions the order only when settled payments cover its total. The first partial settled Payment leaves the order unplaced.

The new handler ignores client metadata and requires the existing transaction-bound placement capability plus a specific group/obligation capability. It rechecks exact vendor coverage, original attempt/quote/principal/channel, account/platform/mode/connection version, currency, provider operation/result identity, successful capture, remaining balance, deadline and compensation state. Frontend callers cannot choose an amount or settled identity.

The existing inventory coordinator still owns the parent mutex, reservation validation and transaction. It invokes the adapter only after its existing physical/capacity checks. The adapter locks the group, verifies all positive obligations, registers the actual payments through native services, requires final native topology and exact settled sum, performs the existing seller split/links/stock allocation, records the snapshot/payment mappings and appends the existing placement outbox fact. The attempt commits in that same transaction. Deferred constraints require agreement between group, purchase, parent, context and committed attempt.

Seller operational eligibility requires the committed parent and matching purchase coverage. A partial payment cannot make a seller fulfillable. Faults after native payment registration or after the financial snapshot roll back local payments, seller orders, links and financial rows; the independently committed provider evidence remains available. Existing committed outbox handling remains the notification boundary. No Stripe network operation occurs in this transaction.

Group creation is a short transaction after existing hold acquisition. If creation fails, the already acquired hold remains bounded by its existing expiry; no provider operation is initiated by creation. This phase does not extend hold lifetimes or implement a capture lease.

## Financial attribution and historical compatibility

Schema 1 keeps its existing non-null payment reference and original capture/refund behavior. Schema 2 uses payment allocations as authority and intentionally has no fabricated aggregate payment ID. Customer-paid amounts continue to reconcile through the unchanged deterministic money allocator and vendor/line/unit shares. Unit IDs remain stable for later partial refunds. Customer payment shares are not recorded as vendor entitlement, application fees or settlement proceeds.

Purchase readers and audits resolve the actual payment set. Refund request routing resolves a vendor's original payment; execution of new direct-charge refunds is explicitly blocked pending the later qualified refund engine. Historical original-unit refunds continue through the existing handler, reservation and writer paths and pass the focused suite.

Finance and QuickBooks capture joins now select the vendor-specific original capture instead of multiplying each sale by every capture on the attempt. The focused suite executes the finance order projection against a two-payment purchase. QuickBooks changes affect local SQL composition only; no QuickBooks connection or export was executed. Stripe reconciliation and original-refund lookup use the payment mapping for schema 2. The legacy transfer path accepts schema 1 only; direct charges must not acquire a separate transfer.

## Feature gate and intentionally absent capabilities

No environment variable, public creation/verification mutation or ordinary checkout route enables this flow. `CheckoutCoordinator.beginPaymentGroup`, `PaymentGroupService.create` and `verify` are trusted server composition seams. Existing finalize/release and inventory coordinator paths are reused. Creation currently accepts only explicit test-runtime local simulator routes; real Stripe routing fails with `DIRECT_CHARGE_PROVIDER_NOT_QUALIFIED`.

The existing owned `currentCheckoutStatus` response has nullable `paymentGroup`, containing identity, state, placement, currency, total, verified amount and vendor obligation IDs/amounts/states. It exposes no account references, provider secrets, capture IDs or recovery controls. With the gate off, this field is null and ordinary customer behavior is unchanged.

Durable states include waiting, verified, failed and uncertain obligations; reserved, ready, placed, aborted, compensation-required and recovery-required groups; and independent compensation status. Abort/release records all successful capture compensation obligations using the existing compensation ledger. Late success can update a forbidden group's recovery state without permitting placement. The legacy simulated VOID completion path rejects grouped captures. Actual cancellation, compensation execution, application-fee refunds and recovery sweeps for uncertain uncaptured intents remain later work.

## Automated verification

Commands run from the backend directory unless otherwise specified:

| Check | Result |
| --- | --- |
| `npm run test:stripe-connect:foundation` | Pass, 11 focused database verification groups; final run uses a new guarded `vendure_test_connect_b_*` database and removes it after success. |
| `npx tsc --noEmit --pretty false --project tsconfig.json` | Pass for backend source. |
| `npm run build:server` | Pass. |
| `npm run build` | Dashboard configuration fails at existing `APP_ENV_EXPLICIT_MODE_REQUIRED`; server build checked separately. |
| `npx tsc --noEmit --pretty false --project test/paid-attribution-refund/payment-groups.tsconfig.json` | Pass for the focused test and its source/fixture dependencies. |
| Broader financial test-project typecheck | Unrelated errors in `scripts/market-operations-demo/storefront-shop-fixture.ts` and `test/farmers-market/storefront-shop-fixture.ts` (nullability and obsolete `scanner` accesses). |
| Existing financial suite, `run.ts --current-schema` | First 15 checks pass; then an old taxable-product fixture stops with `VENDOR_TAX_RATE_REQUIRED`. |
| Existing POS `test/in-person/payments.ts` | Stops before payment checks because `test/platform-inbox/third-vendor.ts` creates an ownerless business under current ownership constraints. POS compatibility is not fully qualified. |
| Web `npm run graphql:schema`, `npm run graphql:codegen` | Successful local source extraction/code generation; unrelated admin schema regeneration was excluded from this task's edits. |
| Web `npx tsc --noEmit --skipLibCheck --target es2022 --module esnext --moduleResolution bundler packages/api/src/checkout.ts` | Pass for the affected checkout API dependency scope. |

The focused suite covers two actual native partial Payments and final aggregate placement; exact amount/currency/mode/account/vendor/attempt rejection; cross-principal/channel isolation; duplicate operation/evidence and payment reuse; missing/partial/failed/uncertain coverage; capability-only native registration; rollback after payment and snapshot; committed seller eligibility; immutable financial history; payment mappings and finance projection; and gate-disabled historical checkout/original-unit refunds.

Initial disposable fixture attempts exposed omitted current-schema migrations, atomic-owner requirements and classification requirements. Those setup issues were corrected in the bounded shared fixtures used by this test. Failed disposable databases were retained by the existing harness; no populated development database was used. No browser automation, screenshots or broad frontend regression checks were performed.

## Migration commands and safety

No migration command targeting `vendure_demo_market_ops` was executed. From the web directory, after separate authorization:

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:market-operations:inspect
# Review the reported actual loopback database and pending migrations first.
npm run demo:market-operations:migrate
```

The required target is local `vendure_demo_market_ops`, never ordinary `vendure`. The guarded migration command applies pending migrations, which may include unrelated earlier local work. Review that pending list rather than assuming this is the only pending migration. Expected Phase B changes are the three new tables, new provider identity columns/indexes, versioned nullable legacy purchase reference and protective triggers described above. No reset, truncate, reseed, account replacement or historical payment rewrite is needed.

## Manual testing preparation

For the full internal foundation exercise without touching established accounts, run from the web directory:

```powershell
npm --prefix ../farmers-market-platform run test:stripe-connect:foundation
```

This command creates its own disposable database. Its fixed isolated identities include `identity-owner-0@test.invalid`, `identity-owner-1@test.invalid`, `market-a@test.invalid`, `market-b@test.invalid` and `commerce-buyer@test.invalid`, with the existing test-only password in `test/platform-identity/fixture.ts`. Vendors/markets are fixture A/B businesses, not Manna Roots or Boerne. The harness invokes internal create/verify/commit operations and prints expected pass results. It requires no Stripe credentials. To inspect its completed rows manually, set `KEEP_TEST_DB=1` for this command and use the printed disposable database name, then remove the variable. Do not point this harness at the persistent database.

After an authorized persistent migration, start the established environment in separate terminals using only:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Use the existing owned checkout API operation `currentCheckoutStatus(orderId: ...)` with the normal channel/session headers. Request `paymentGroup { id state total verifiedAmount obligations { vendorId amount currency state } }`. Expected result with the default gate is null. Existing supported local checkout remains available under its existing eligibility policy; no per-vendor payment controls appear. Cross-customer/channel order reads must remain denied. No new persistent fixture or manual force-settlement endpoint was created. A persistent demonstration of simulated grouped placement needs a separately authorized, dedicated fixture/composition; this task deliberately provides that executable exercise in the disposable database only.

## Limitations and later dependencies

Stripe collection, account readiness/onboarding, SetupIntent/payment-method cloning, authorization/capture decisions, payment UI, application-fee computation/refunds, production recovery and the bounded finalization lease are not implemented here. Generation replacements and live routes remain blocked. New platform surcharges whose amounts cannot be assigned to existing vendor-paid components are rejected rather than allocated speculatively. No tax, loyalty, promotion, pickup or entitlement policy was invented.

The supported foundation is a local multi-payment placement model with focused passing evidence. Broader POS/financial fixture failures above remain recorded qualification limits. Keep ordinary checkout disabled for this feature until the complete collection, refund, notification, recovery and account-context lifecycle is qualified. No Phase C processing or live enablement is authorized by this implementation.
