# Stripe Connect Phase F

Implemented locally on November 10, 2026. This report covers both local repositories. Existing unrelated working changes were preserved. Previous phase reports were not edited. No persistent demo migration, fixture setup, external Stripe transaction, account provisioning, deployment, remote Git operation, browser automation or screenshot was performed.

## Implementation

The existing refund coordinator now accepts eligible completed Stripe direct-charge purchases through the original vendor refund authority. Requests select original purchased unit IDs, reserve those units and their frozen Preorder fee components, and commit provider operation and transport journal identities before network calls. There is no public arbitrary-amount, charge-ID or application-fee-ID mutation.

The existing native refund writer records verified customer money and its original merchandise attribution. Inventory, physical return decisions, loyalty adjustments, promotion attribution and native refund events continue through the existing writers. The original customer payment and the platform application-fee return have independently observable provider journal legs.

### Local files

Backend changes are bounded to:

- `src/plugins/payments/checkout-contracts.ts`, `checkout-sdk.ts`, `checkout.service.ts`, `refunds.service.ts`, `api.ts`, `payments.plugin.ts`, `recovery.service.ts`, `reconciliation.service.ts`, `account.service.ts`.
- `src/plugins/marketplace-commerce/financial/provider-port.ts`, `provider-facts.service.ts`, `refund-coordinator.ts`, `refund-fees.ts`, `refund-writer.service.ts`, `financial-audit.service.ts`, `financial.api.ts`, `preorder-fee.service.ts`.
- `src/plugins/marketplace-commerce/commerce/payment-group.service.ts` and `customer-account/service.ts`.
- `src/plugins/financial-reporting/order-transactions.ts`.
- `src/migrations/1796900000000-StripePostPurchaseRefunds.ts`.
- `test/payments-stripe/phase-e.ts`, `phase-e-sdk.ts`, `phase-f-sdk.ts`, and `package.json`.

Web changes are bounded to:

- Existing shared, vendor and Modern Farmhouse checkout compositions, `StripeCheckout.tsx`, `lib/use-checkout.ts`, `lib/stripe-checkout.ts`, and the exact-origin Shop proxy.
- Removal of the unused `TestPreorderFeeQuote.tsx` development composition.
- `apps/admin/src/vendor/OrderRefunds.tsx`, `order-detail.tsx`, `service.ts`, and `finance/FinanceTransactions.tsx`.
- API checkout/refund/finance/error/action contracts, `operations/order-refunds.graphql`, `operations/stripe-checkout.graphql`, generated Shop/Admin schemas and operation types, source provenance, and `codegen.ts`.
- Focused Phase D/E/F frontend tests, `tsconfig.stripe-connect-phase-f.json`, `package.json`, and this report.

## Customer checkout

Normal checkout no longer renders Prepare test fee quote, Clear test fee quote, Load Stripe payment fee, or the extra Continue to secure card entry initialization action. Internal authorized test quote APIs remain protected by their existing server gates.

The authoritative checkout status resolves quotation after validated contact and pickup are available. It uses the existing Phase D engine and native order amounts, including discounts, item taxes and shipping/pickup. An unchanged quote retains its original vendor configuration. A changed editable basis creates a replacement through the same guarded engine. The shipping, occurrence and monetary fingerprints remain enforced by the checkout coordinator. Existing monetary history is never rewritten.

Review/payment reads react to cart and page-focus events. Rapid events are coalesced, refreshes are sequenced, and an event arriving during active work queues a follow-up read. Pending or failed quotation suppresses final totals and disables payment submission. Contact fields remain in the existing composition. Failed automatic work has an explicit Retry checkout action.

Entering Payment prepares the secure Card Element automatically through `prepareStripeCheckout`. Preparation creates or reuses the original group, Customer and SetupIntent, with consent initially false. Repeated mounts/effects coalesce in-flight form preparation; backend group locking and journal identities remain authoritative across reloads and processes. Setup preparation never advances authorization, even if an existing SetupIntent has already succeeded. The worker excludes unsubmitted preparation from payment advancement.

The customer must check the existing vendor consent checkbox and explicitly select Complete purchase. Only that submission confirms card setup and authorizes advancement. Multi-vendor charge disclosure, account-scoped authentication and independent cloned PaymentMethods remain intact. A client callback cannot announce success without committed native checkout evidence. The Card Element remains isolated from unrelated quote/loading renders.

The shared checkout, vendor checkout delegation, and Modern Farmhouse staged checkout use this behavior. Existing local/offline payment selection remains supported. Checkout layout, stage model and shared UI standards were retained.

## Original refund calculations

For each selected original unit, customer refund equals:

`gross - discount + original item tax + policy-eligible shipping/pickup shares + original P + original E + original fee tax`.

The refundable shipping policy is the purchase's immutable `refundShippingShares`. Processing recovery E is refundable by default. No historical refund uses current catalog prices, current tax rates, current vendor settings, or a fresh processing estimate. Platform P is the frozen original allocation, not a new calculation of five percent.

Original unit reservations prevent quantity reuse. The existing fee reservation guard prevents component over-reservation. Completed earlier refunds and pending operations consume the same original payment authority. Conflicting unresolved refunds serialize further requests for that vendor payment. Each vendor's payment is selected through its immutable `PurchasePaymentAllocation`; another vendor's payment is unaffected.

For an original charge of $108.45 comprising $100 merchandise, $5 P and $3.45 E, an eligible full refund sends $108.45 to the customer. A separate $5 platform application-fee refund goes to the original connected vendor. There is no second $5 customer refund. An original unit containing $20 merchandise, $1 P and $0.69 E returns $21.69 plus its applicable original taxes/shipping; its application-fee return is exactly $1. Remainders are the original deterministic unit shares, so cumulative eligible refunds reconcile exactly.

## Provider execution and reconciliation

Customer refunds use the original connected-account PaymentIntent/charge and explicit amount. Requests explicitly set `refund_application_fee=false`. Application-fee refunds use the platform Application Fees API, original fee ID, original connected account, original charge, original fee amount and exact selected P. No destination transfer or transfer reversal is used.

The installed Stripe SDK is `23.0.0`; the existing pinned API remains `2026-09-30.endive`. Installed-SDK HTTP fixtures verify actual request serialization, account headers, exact partial amounts, identity rejection, retrieval, lost responses and external-refund rejection.

Application-fee completion requires retrieval of the exact fee refund under its original platform fee. Stripe's fee-refund resource does not expose a pending/succeeded status field equivalent to a customer Refund. The application maps the verified retrieved fee-refund object to confirmed evidence; a local intended/unknown/pending leg remains unresolved. Provider confirmation is distinct from the customer's bank posting date.

Reference checks used Stripe's [direct charges guide](https://docs.stripe.com/connect/direct-charges?platform=web&ui=elements), [application-fee refund creation](https://docs.stripe.com/api/fee_refunds/create), [specific fee-refund retrieval](https://docs.stripe.com/api/fee_refunds/retrieve), and [event types](https://docs.stripe.com/api/events/types). Current documentation can show a newer API version; this phase keeps the installed project's pin and tests the installed SDK rather than changing versions.

### Durable state

The existing `RefundOperation` states retain customer-money semantics: requested, provider pending/failed/succeeded, native settled, or reconciliation required. `StripeCheckoutStep` adds original refund-bound customer and fee slots to the same group journal. Fee component reservations use the refund's stable operation key.

Native SETTLED means the customer leg has been verified and written. Full financial completion additionally requires the fee leg, when applicable, to be confirmed. The vendor history exposes customer state, application-fee state, combined financial state and a sanitized reconciliation reference. A successful customer refund followed by a failed fee return remains visible and blocks a conflicting request while recovery proceeds.

Every intent is durable before its external effect. Same-request retries retain the same operation and provider keys. Known customer refunds are retrieved. Ambiguous creates use the original provider key within the existing replay window; expired ambiguity fails closed for review. Fee recovery locates the original metadata-bound refund and retrieves it before considering another financial effect. No worker restart creates a replacement refund identity.

Current new-charge readiness is not historical refund authority. Refunds verify the original organization, account, platform, application, connection generation, currency, charge and immutable capture evidence. Missing original authority fails closed. There is no reconnection, reassignment or account replacement to make a refund work.

Failed-checkout compensation remains Phase E's path. Ordinary refunds require committed placement, no compensation on the original attempt, and the original vendor payment. Compensation and ordinary refunds use the same charge/fee journal and original balance boundaries.

## Webhooks and operations

The existing signed receipt inbox and queue remain the only webhook ingress. Required connected events are `charge.refunded`, `refund.created`, `refund.updated`, and `refund.failed`. Platform fee events are `application_fee.refunded` and `application_fee.refund.updated`. Existing Phase E subscriptions already include these events. Account disconnection now also rejects unresolved post-purchase customer/fee refunds and per-obligation review entries.

Receipts are recovery hints. The sweep independently retrieves the original charge and paginated customer/fee refund inventories. Duplicate and out-of-order events cannot supply authoritative settled amounts. Completed purchases are audited too, so an external Dashboard refund becomes operational review rather than invented item attribution.

Per-obligation review entries in the existing payment group's recovery data preserve vendor isolation. One vendor's successful check cannot clear another vendor's discrepancy. The existing reconciliation report includes unresolved refund operations and group review codes. It exposes no credentials, bank data or full provider payloads.

For local webhook forwarding, preserve the existing endpoint secrets and forward both platform and connected events to `/payments/stripe/platform` and `/payments/stripe/connected` on port 3000. Register the subscriptions above on their correct existing destinations. There is no new webhook server.

## Vendor refund interaction

At `http://localhost:4322/vendor/orders`, open the original vendor seller order. Users with the existing `RequestOwnVendorRefund` grant receive Refund items for eligible Stripe purchases. Select product quantities, review the server-calculated item/tax/shipping/Preorder fee/customer total, and explicitly confirm. Selecting items, opening the dialog and previewing never initiate refunds.

The quantity choice resolves to available original unit IDs supplied by the server. The dialog reuses shared Dialog, Button, Field, Select, Alert and existing refund-history presentation. This is a bounded order composition because the existing POS modal owns cash-return and provider-specific attestations that do not apply to preorder Stripe refunds. No new primitive, styling system or orders-area redesign was introduced.

Pending results refresh through authorized reads while the existing worker resumes durable provider work. A lost submission retains the original operation key and selection for safe checking. Physical merchandise is not automatically returned or restocked. Original vendor/workspace membership and financial permission are revalidated server-side. Customers cannot invoke this Stripe refund path; managers gain no arbitrary vendor merchandise authority.

## Financial and commerce compatibility

The native customer refund includes original refundable Preorder fee components. Merchandise `RefundAllocation` rows retain their original meanings, preserving vendor gross, discounts, item/shipping taxes, net merchandise revenue, promotion, inventory and loyalty consumers. Fee reservations separately identify returned P/E/fee tax. Financial audits and customer purchase projections reconcile both sources to the native refund total.

The existing Finance order transaction projection and detail show original platform fee/recovery, refunded customer P/E, and verified application fees returned to the vendor. Processing recovery is not reported as actual Stripe processing expense. Existing actual-fee observations remain independent, including unknown actual cost when no qualified observation exists.

QuickBooks continues receiving the existing attributed merchandise/native refund evidence. No QuickBooks connection or export ran. Separate Preorder fee recognition/export still requires approved bookkeeping mappings; this phase does not invent revenue or tax treatment for E or modify accounting policy. Existing shipping/tax export exclusions remain in force. This gap does not change native customer totals or provider reconciliation.

## Validation

Verified results:

- The focused Stripe checkout/refund suite passed 23 database groups plus installed-SDK checks. Coverage includes setup without implicit charging, full/repeated partial refunds, original P/E shares, historical account readiness, unresolved-disconnect rejection, pending/failed refunds, contradictory customer evidence, lost responses, worker recovery, concurrent reservations, external refunds, finance fee attribution, and local refunds without automatic restocking.
- The original fee suite passed its arithmetic checks and all 7 disposable database groups. The initial standalone-reservation audit regression was fixed and rerun successfully.
- All 73 frontend tests passed across the seven affected checkout, refund, order and finance files.
- Backend dashboard/server/worker build, storefront SSR build and admin build passed. Existing bundle-size warnings remain outside this task.
- The backend scoped TypeScript check passed. The frontend scoped check reports only the existing `packages/ui/src/table-navigation.ts:29` possibly-undefined target error. That file was not changed.
- The older native financial acceptance run (`.\node_modules\.bin\ts-node.cmd --project test/paid-attribution-refund/tsconfig.json test/paid-attribution-refund/run.ts --current-schema`, from the backend directory) passed groups A through O, then stopped at its nonzero-tax fixture with `VENDOR_TAX_RATE_REQUIRED`. This unrelated fixture does not configure the required vendor rate. It was not repaired; its later acceptance groups are not claimed as passed.
- Existing React act warnings in finance component tests and the PostgreSQL fixture's queued-client deprecation warning do not fail the passing focused suites.

No full repository suite, browser automation or genuine external payment was run.

```powershell
npm run test:stripe-connect:refunds
npm run test:stripe-connect:fees
npx vitest run tests/stripe-connect-phase-d.test.tsx tests/stripe-connect-phase-e.test.tsx tests/stripe-connect-phase-f.test.tsx tests/market-checkout-preparation.test.tsx tests/local-test-checkout.test.tsx tests/order-detail.test.tsx tests/finance.test.tsx --reporter=dot
npm run typecheck:stripe-connect:refunds
npm --prefix ../farmers-market-platform run build
```

All database qualification uses the existing loopback-only `vendure_test_*` creation/cleanup guard and in-memory Stripe transport/SDK fixtures. It never targets the persistent demo or creates genuine external Stripe transactions. Failed development runs retain their isolated databases under the existing harness policy; successful runs remove only databases they created.

## Migration and configuration

`StripePostPurchaseRefunds1796900000000` is additive and forward-only. It extends original provider/journal/native-refund evidence guards and adds bounded recovery indexes. It does not backfill or modify original transactions, credentials, payments or account identities. New provider operation rows must link to their original refund reservations and vendor payment.

No migration was applied to `vendure_demo_market_ops`. First inspect from the web directory:

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:market-operations:inspect
```

Confirm the actual target is `vendure_demo_market_ops`, then review every pending migration. Only after separate explicit authorization:

```powershell
npm run demo:market-operations:migrate
```

Keep existing sandbox configuration: `DEMO_STRIPE_CONNECT_TEST=true`, `STRIPE_TEST_CHECKOUT_ENABLED=true`, matching `sk_test_`/`pk_test_` keys, original platform/application/account identities, `DEMO_PREORDER_FEE_QUOTES=true`, and `STRIPE_TEST_CHECKOUT_FEE_TAX_POLICY=EXPLICIT_NO_FEE_TAX_TEST`. Preserve the existing no-live boundary and ordinary provider flags. No new live-payment switch was enabled and no environment file was edited.

Use separate terminals in the web directory:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

No fixture command is needed for existing populated Phase D/E organizations. If dedicated data is missing, the existing idempotent `npm run demo:market-operations:preorder-fee-fixtures` is the narrowly scoped setup command to review. Do not reset/reseed the populated database, modify Manna Roots/Boerne, or provision unrelated Stripe accounts.

## Manual sandbox verification

Use the already-authorized dedicated Stripe test accounts and the same dedicated shopper used for successful Phase E testing. Admin fixture password: `Local-Fee-D-2026!`. Do not reset any credentials.

| Admin identity | Purpose |
| --- | --- |
| `stripe-fee-d-orchard@example.test` | Orchard owner and Automatic recovery |
| `stripe-fee-d-garden@example.test` | Garden owner and saved Custom recovery |
| `stripe-fee-d-manager@example.test` | Dedicated Market management and negative financial-authority check |
| `stripe-fee-d-staff@example.test` | Existing restricted-member permission checks |

### Checkout

1. Open `http://stripe-fee-d-orchard.localhost:4321`. Add published Carrots for the available dedicated occurrence and go to `/cart`, then `/checkout`.
2. Confirm no manual quote/preparation/fee-loading actions appear. Enter valid contact details and choose pickup. Review should automatically show merchandise, discounts if any, included tax, pickup, Preorder fee and final total.
3. Continue to Payment. Secure card entry should load automatically. Use sandbox card `4242 4242 4242 4242`, future expiry, valid test CVC and postal code. Consent and Complete purchase remain explicit. Expect one original connected-account charge and verified `/checkout/success?order=...` only after native commit.
4. Change quantities, pickup or an eligible coupon before payment. Expect a recalculation state and updated server totals. Keep a note of quote ID using authorized local developer inspection if needed. An unchanged quote and a vendor settings change should retain the original frozen values. Never edit or replace a quote after payment begins.
5. Repeat at `http://stripe-fee-d-market.localhost:4321` with Orchard Carrots and Garden Tomatoes/Strawberries for the same available occurrence. Expect one card entry, separate vendor charges and no cross-vendor amounts. Garden can retain its saved fixed or percentage recovery setting.
6. Repeat the supported checkout theme selection, including Modern Farmhouse, using normal local storefront appearance controls. The same automatic behavior applies. Do not enable collection on established organizations for this check.
7. Refresh at the card stage and during processing. Provider setup/payment identities must remain stable. A failed terminal checkout uses the existing fresh-cart recovery path, not another charge against the old frozen attempt.

### Full and partial refunds

1. Complete a fresh dedicated purchase with multiple units. In the correct owner workspace at `http://localhost:4322/vendor/orders`, open its seller order at `/vendor/orders/<seller-order-id>`.
2. Choose Refund items, select one original unit and review the exact server total, taxes, policy-eligible pickup/shipping and P/E refund amounts. Canceling the dialog or changing quantities must not move money.
3. Confirm. In the connected vendor's sandbox Dashboard, open Payments, then the original charge and its refund. Customer amount must equal the displayed complete refund breakdown.
4. In the platform sandbox Dashboard, inspect the original Connect application fee and its refunds. Its fee refund must equal that unit's P, returning funds to the original connected account. The customer must have only one refund for the authorized total.
5. Refund another unit. Compare cumulative customer and fee refunds with immutable original totals. Already reserved/refunded units must not be selectable. Repeat until all policy-eligible units are refunded; original P and E should reconcile exactly.
6. On a separate fresh order, select all eligible units to test a full vendor refund. If shipping is refundable under that purchase's saved policy, the total must equal the vendor's original refundable gross charge. No remaining P/E may be lost to rounding.
7. For a two-vendor purchase, refund Orchard's portion. Garden's payment, fee, units and financial history must be unchanged. Switching to the manager or restricted staff workspace must preserve existing denial/read-only behavior; direct Shop calls must not authorize Stripe refunds.
8. Check native order/refund status, customer purchase history, and Finance transaction detail. Merchandise refund/net revenue, original fee recovery reversal and application-fee return must stay distinguishable. A monetary refund alone must not restock inventory. Verify existing loyalty consequences occur once across duplicate reads/submissions.

### Failure and recovery

Use `npm run test:stripe-connect:refunds` for deterministic timeout, failed/pending customer refund, failed fee leg, duplicate reservation/submission, interrupted worker, external refund and out-of-order webhook fixtures. These scenarios use disposable databases and controlled provider responses. They are not public fault-injection endpoints for the populated demo.

For a genuine sandbox pending result, keep the prescribed worker running and inspect vendor history plus the existing authorized payment reconciliation read. Customer-confirmed/fee-pending must not be reported as fully complete or offer a conflicting refund. Stopping/restarting the worker should resume original IDs. Do not remove journal rows or change native financial states using SQL.

If an external Stripe refund is intentionally tested later, use a dedicated fresh sandbox purchase only. Expect review, no fabricated unit selection, and blocked conflicting in-app refunds. Preserve the original objects for authorized operational investigation. No automatic reassignment or invented attribution is provided.

## Limitations and Phase G dependencies

The existing frontend typecheck error and older nonzero-tax acceptance fixture remain validation limitations. Core Stripe/native writer scenarios have their own isolated qualification; unexecuted later legacy acceptance groups are not claimed as covered.

- Sandbox only, USD, supported original fee/tax policy and existing direct-charge account configuration. Live collection remains disabled.
- This phase does not approve fee taxation, legal/network surcharge policy or separate E bookkeeping recognition. Actual Stripe processing fees may remain payable by the vendor after a full refund.
- An unavailable original account/application relationship, expired ambiguous create, failed refund or unmatched provider refund requires operational review. There is no manual override that fabricates provider success or historical units.
- The existing fresh-cart path remains required after terminal failed checkout compensation. Automatic card preparation freezes the original payment attempt; editing that attempt requires the existing controlled cancellation/new-checkout path.
- Independent vendor charges/refunds are not atomic across Stripe accounts. Each verified leg and any unresolved state remain durable and visible.
- Native customer settlement and full platform-fee reconciliation are separate states. Bank posting can follow provider confirmation.
- Phase G still owns booth invoice collection and its payer/credit policy. Disputes, payouts, production activation and other later work remain outside this implementation.
