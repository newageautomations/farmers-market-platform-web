# Stripe Connect Phase E

Implemented locally November 10, 2026. Backend edits in `E:\coding\farmers-market-platform` were explicitly authorized. Previous Stripe phase reports were not edited.

## Qualification status

The test-only implementation and controlled-provider qualification are implemented. Genuine Stripe sandbox purchases have **not** been executed in this task. The dedicated vendors must be connected through the existing onboarding interface before the manual provider qualification below can establish end-to-end Stripe behavior.

No persistent database migration, persistent fixture command, Stripe API request, provider account creation/connection, charge, capture, refund, deployment, or remote Git operation was performed. Automated financial effects exist exclusively in controlled transport fixtures and guarded disposable databases. Existing unrelated local changes were retained.

## Implemented flow

The customer reviews existing merchandise, discount, tax, pickup/shipping, combined Preorder fee, and final total displays. Once a frozen test quote exists, the existing checkout availability response advertises `STRIPE_TEST` only when the separately enabled direct-charge composition is installed. Ordinary local checkout makes no additional configuration request.

The shared `StripeCheckout` composition hosts Stripe's Card Element, requires explicit checkout-specific consent, and uses `confirmCardSetup`. It has no card-number, expiry, or CVC inputs of its own. Card details go directly to Stripe. Link is disabled, and server-side method allowlists restrict setup and direct-charge intents to cards. No recurring billing or saved-wallet management was added.

One platform Customer and SetupIntent are scoped to this payment group. After retrieving the successful original SetupIntent, the SDK adapter verifies its metadata, Customer, test mode, card-only method types, and PaymentMethod ownership. Each positive vendor obligation gets one independently cloned PaymentMethod on its original connected account. The consumed clone is never reused for another charge.

Each vendor PaymentIntent uses manual capture, the original frozen vendor total, and exactly the frozen `fee.platform` as `application_fee_amount`. Processing recovery stays in vendor gross charge. No destination, aggregate platform charge, transfer, or transfer reversal is used. All vendor authorizations are retrieved and checked before capture starts. Additional authentication is performed through an account-scoped Stripe.js instance using `handleNextAction`. The backend retrieves actual intent state afterward.

Successful captures are independently persisted as real `ProviderOperation` and `ProviderResultFact` evidence, verified against original obligations, then passed into the existing inventory coordinator and native multi-payment placement adapter. Vendure creates genuine Payments, seller splits, financial allocations, and the existing placement outbox facts. The group cannot become committed without reconciled full native payment coverage. Customer checkout status no longer reports aggregate success merely because the first vendor capture succeeded.

The browser redirects to the existing `/checkout/success?order=...` route only after both the coordinator and owned native checkout confirm commitment. A client SDK callback, redirect, or individual vendor success is insufficient.

## Backend files

Paths in this section are relative to `E:\coding\farmers-market-platform`.

| Files | Purpose |
| --- | --- |
| `src/plugins/payments/checkout.service.ts` | Coordinates existing groups, card setup, cloning, authorization, capture, cancellation, compensation, owned status, and worker resumption. |
| `src/plugins/payments/checkout-contracts.ts`, `checkout-sdk.ts` | Minimal sanitized transport contracts, explicit test gate, extended operation journal, and installed Stripe SDK calls. |
| `src/plugins/payments/contracts.ts`, `stripe-transport.ts` | Extend the existing injectable transport rather than adding a second provider client. |
| `src/plugins/payments/api.ts`, `payments.plugin.ts` | Owned Shop operations, composition registration, market operation allowlist, and options validation. |
| `src/plugins/payments/recovery.service.ts`, `webhook.service.ts`, `reconciliation.service.ts` | Reuse the existing queue, signed receipt inbox, and operational reconciliation projection. |
| `src/plugins/payments/account.service.ts` | Refuse disconnect while a coordinated checkout or its compensation remains unresolved. |
| `src/plugins/marketplace-commerce/commerce/payment-group.service.ts`, `checkout-coordinator.ts` | Qualify original test Stripe routes and acquire existing holds without invoking simulated capture. |
| `src/plugins/marketplace-commerce/inventory/inventory-coordinator.ts` | Validate the existing held quote, policy, stock, capacity, and reservation in a short transaction before provider stages. |
| `src/plugins/marketplace-commerce/financial/provider-port.ts`, `provider-facts.service.ts` | Bind the direct-charge capability, validate original obligation routes, retain financial operation evidence, and preserve coordinator metadata during compensation. |
| `src/plugins/marketplace-commerce/customer-account/service.ts`, `marketplace-commerce.plugin.ts` | Owned availability/aggregate payment status and exports of existing shared services. |
| `src/vendure-config.ts`, `scripts/market-operations-demo/environment.ts` | Separate explicit test collection configuration and guarded demo allowlist. |
| `src/migrations/1796800000000-StripeCheckout.ts` | Additive journal and narrowly qualified failed-checkout compensation guard. |
| `test/payments-stripe/phase-e.ts`, `phase-e-sdk.ts`, `phase-e.tsconfig.json`, `package.json` | Focused controlled transport, actual installed SDK, durable database, and native commerce qualification. |

## Frontend files and component reuse

Paths in this section are relative to `E:\coding\farmers-market-platform-web`.

- `apps/storefront/src/components/StripeCheckout.tsx` and `lib/stripe-checkout.ts`: one checkout-specific Stripe lifecycle composition and a narrow Stripe.js interface/loader. No existing component could own Stripe's iframe mounting and per-connected-account authentication, so this composite was necessary. It reuses existing Button and Input primitives, money formatting, checkout sections, and alert styling. No new primitive, UI library, stylesheet, or presentation standard was introduced.
- `components/Checkout.tsx`, `components/modern-farmhouse/Checkout.tsx`, `lib/use-checkout.ts`, and `lib/use-vendor-checkout.ts`: integrate the same composition into the existing staged checkout used by market and vendor storefronts. `VendorCheckout` reuses that staged flow when the authoritative mode is `STRIPE_TEST`; its implementation did not need another payment form.
- `apps/storefront/src/pages/api/shop.ts`: existing exact-origin, storefront-bound Shop proxy actions. Customers cannot supply vendor accounts, amounts, fee amounts, PaymentMethod IDs, or successful provider statuses.
- `packages/api/operations/stripe-checkout.graphql`, `packages/api/src/checkout.ts`, `src/storefront.ts`, and `codegen.ts`: named typed operations. Source-extracted schema/provenance and generated Shop/Admin artifacts were refreshed through the existing commands without backend bootstrap or database access.
- `tests/stripe-connect-phase-e.test.tsx`, `tsconfig.stripe-connect-phase-e.json`, and `package.json`: focused UI verification and commands.

The root component usage guide and approved registry were consulted. Existing totals, contact, pickup, loyalty, and specialist theme presentations remain authoritative. No new label/value `dl` rows were created.

## State, concurrency, and recovery

The original `CheckoutPaymentGroup`, `VendorPaymentObligation`, and `PurchasePaymentAllocation` remain financial and placement authority. Phase E stores its coordinator status in `group.recovery.phaseE`, preserving the foundation's existing state/placement constraints.

| Customer state | Meaning |
| --- | --- |
| `SETUP_REQUIRED` | Original platform setup needs card entry/confirmation. |
| `AUTHENTICATION_REQUIRED` | One original vendor intent needs customer action. |
| `AUTHORIZING`, `CAPTURING` | Coordinated work is in progress. |
| `VERIFYING` | Provider or local outcome must be reconciled; no new checkout charge should be submitted. |
| `COMPLETED` | All captures and native purchase commitment are verified. |
| `DECLINED`, `AUTHORIZATION_FAILED`, `CAPTURE_FAILED`, `CANCELED` | Terminal failure after required uncaptured authorizations have been resolved. |
| `COMPENSATION_PENDING` | Cancellation/customer refund/application-fee refund work remains unresolved. |
| `COMPENSATION_COMPLETED` | Required refunds were verified, not merely requested. Bank posting time is separate. |
| `MANUAL_INTERVENTION_REQUIRED` | Unresolved operation exceeded safe recovery or provider/authority evidence requires review. |

A PostgreSQL session advisory lock serializes one parent order across API and worker processes. It occupies a dedicated connection while coordinating but does not hold a database transaction across Stripe requests. The coordinator checks that lock connection before provider calls and state updates, preventing a stale worker from continuing through other pooled connections after losing its lock connection. Process failure releases the lock. Stable operation keys and persisted intents survive restart.

`stripe_checkout_step` extends the transport journal for Customer, SetupIntent, clone, authorization, capture, cancellation, customer refund, and fee refund operations. Existing monetary `ProviderOperation`/`ProviderResultFact` records remain the capture and customer-compensation ledger. A separate journal is needed for setup/clone/fee operations because the existing ledger restricts kinds to CAPTURE/REFUND/VOID and positive original customer amounts. `VOID` continues to mean a refund of captured funds; authorization cancellation is a distinct operation.

Every journal identity is durable before its external call. Capture and customer-refund financial intents are also persisted before their external effects. Client secrets are removed before storing observations and rejected by the journal's database check. Known resources are retrieved before further decisions. An ambiguous create can only replay its original Stripe key within 23 hours; absence of a resource is not permission for an unrelated new operation. Unresolved old creates require manual review. Repeated transport failures are bounded; pending refunds are observed without creating replacement refunds.

Expired reservations, changed capacity/quotes, and expiring authorizations block capture. The existing native commit independently revalidates inventory, promotions, policy, quote, and payment coverage. Local commit failure after capture starts compensation. Worker recovery uses the original customer/channel or original guest session. An expired guest session is restricted to compensation; an unavailable original registered customer requires operational review.

### Retry boundary

Refreshes, duplicate submissions, worker recovery, and repeated payment API calls resume the same group and provider identities. Unknown results never offer a fresh card charge. The existing foundation allows only one checkout attempt per native order. A terminal failed group is therefore not recharged in place. Once cancellation or compensation is confirmed, return to `/cart`, remove the old items, then add them again through the ordinary storefront flow to obtain a fresh native order and frozen quote. This is a usability limitation, explicitly shown in the UI. No native financial history or attempt is reset or deleted.

## Compensation and application fees

After any failed/uncertain capture decision, the coordinator reconciles original authorizations. It cancels uncaptured intents and refunds full successfully captured vendor amounts. Customer refunds and platform application-fee refunds have separate identities, requests, responses, and journal steps. Customer compensation is also linked through the existing `PaymentCompensation` record to a verified provider refund fact. Its completion is recorded only after the application-fee leg, when nonzero, also succeeds.

The direct-charge refund request uses the original connected-account PaymentIntent and frozen gross amount. The application-fee refund uses the platform account's Application Fees API, verifying original connected account, charge, currency, and exact original platform amount. Existing or unexpected external refunds stop automatic duplicate/excessive compensation. No transfer-reversal API or destination-charge flag is used.

The adapter expands the charge's application fee and retains the original charge/fee identifiers. Delayed fee identity keeps a successful capture in verification rather than fabricating a complete record. Pending refunds remain pending in the UI. Failed refunds require operational attention. Existing reconciliation reports include unresolved Phase E groups and operations without secrets.

For the design example, frozen amounts remain Vendor A 10,845 cents with a 500-cent application fee and Vendor B 5,400 cents with a 250-cent application fee. Their aggregate is 16,245 cents; the platform fee is 750 cents. No payment-time fee recomputation was introduced. Existing fixture merchandise amounts may differ, so compare their actual frozen values rather than expecting this example for a one-item test cart.

## Security and test-only boundaries

Collection requires all of `checkoutCollectionEnabled`, provider enabled, a dev/test runtime, `sk_test_` secret, `pk_test_` publishable key, configured original platform identity, and `EXPLICIT_NO_FEE_TAX_TEST`. Live credentials, live enablement, and production runtime are rejected. The SDK also requires a US platform and US connected vendors for this V1 USD/fee-assumption qualification. Other geography/currency configurations fail closed.

The guarded demo additionally requires its existing local account composition, `DEMO_STRIPE_CONNECT_TEST=true`, test onboarding configuration, `LOCAL_TEST_PAYMENTS_ENABLED=true`, and `DEMO_PREORDER_FEE_QUOTES=true`. Enabling onboarding alone does not enable payment collection. No runtime environment file was changed in this task.

Owned Shop resolvers and the existing exact-origin Shop proxy bind the original order, principal, channel, group, SetupIntent, quote, vendor allocation, and account generation. Trusted backend obligations supply account routes. Current readiness, organization ownership, platform/application identity, capabilities, restrictions, and frozen monetary fingerprints are checked. Marketplace managers never become merchandise charge recipients. The Phase C legacy Standard configuration mapping and permission policies are preserved.

This is test-mode qualification only. It does not approve fee taxation, consumer disclosures, card-network treatment, live money collection, or production legal policy. Public Stripe processing uses the existing pinned `stripe@23.0.0` SDK and `2026-09-30.endive` API version.

## Webhooks and destinations

The existing raw-body signature verification, configured signing-secret rotation, TEST/LIVE checks, receipt deduplication, and receipt worker remain in use. No second public webhook subsystem was added. Phase E events are hints to the durable coordinator; an event does not settle a vendor independently or finalize a partial group. Connected event account/platform mapping is checked, and final effects are retrieved under original account contexts. Original operation metadata can bind an early event before its create response is received.

Keep existing Accounts v1 snapshot and Accounts v2 thin onboarding destinations unchanged. Add these snapshot subscriptions at API version `2026-09-30.endive`:

| Destination | Additional events |
| --- | --- |
| Connected accounts, `/payments/stripe/connected` | `payment_intent.amount_capturable_updated`, `payment_intent.requires_action`, `payment_intent.processing`, `charge.succeeded`, `charge.updated`, `charge.captured`, `charge.failed`, `charge.refunded` |
| Platform account, `/payments/stripe/platform` | `application_fee.created`, `application_fee.refunded`, `application_fee.refund.updated` |

Retain existing connected subscriptions for `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `refund.created`, `refund.updated`, and `refund.failed`. Event names were checked against the installed SDK's `Events.d.ts` and Stripe's event reference. Account lifecycle thin notifications remain compatible with the separate v2 handling.

For a local Stripe CLI session, route ordinary platform events to `http://localhost:3000/payments/stripe/platform` and Connect events with `--forward-connect-to http://localhost:3000/payments/stripe/connected`. Configure the emitted signing secret in the corresponding server-side secret lists. For example, after you explicitly authenticate the CLI to the same sandbox:

```powershell
stripe listen --events payment_intent.amount_capturable_updated,payment_intent.requires_action,payment_intent.processing,payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,charge.succeeded,charge.updated,charge.captured,charge.failed,charge.refunded,refund.created,refund.updated,refund.failed,application_fee.created,application_fee.refunded,application_fee.refund.updated --forward-to http://localhost:3000/payments/stripe/platform --forward-connect-to http://localhost:3000/payments/stripe/connected
```

Verify the event's `api_version` is the pinned version before qualification. A CLI/account configured to emit another version will be rejected with `EVENT_API_VERSION_UNSUPPORTED`; do not bypass that check. A deployed destination is not required or created by this task.

References: [sharing PaymentMethods](https://docs.stripe.com/connect/direct-charges-multiple-accounts), [capture](https://docs.stripe.com/api/payment_intents/capture), [customer authentication](https://docs.stripe.com/js/payment_intents/handle_next_action), [event types](https://docs.stripe.com/api/events/types), and [direct charge refunds](https://docs.stripe.com/connect/direct-charges?platform=web&ui=elements).

## Automated verification

| Check | Result |
| --- | --- |
| Backend `npm run test:stripe-connect:checkout` | Pass: installed-SDK HTTP fixtures plus 15 focused database verification groups. Controlled effects only. |
| Backend `npm run test:stripe-connect:fees` | Pass: original arithmetic checks and all 7 Phase D database groups, including ordinary local historical compatibility. |
| Backend `npx ts-node --project test/payments-stripe/phase-c.tsconfig.json test/payments-stripe/legacy-standard.ts` | Pass: offline legacy Standard normalization/identity/readiness/audit coverage. |
| Backend `npx tsc --noEmit --pretty false --project test/payments-stripe/phase-e.tsconfig.json` | Pass. |
| Backend `npm run build` with `APP_ENV=dev`, `NODE_ENV=development` | Pass: dashboard, server, and worker. Subsequent server build also passed. |
| Web `npx vitest run tests/stripe-connect-phase-e.test.tsx tests/stripe-connect-phase-d.test.tsx tests/storefront-checkout-ui.test.tsx tests/local-test-checkout.test.tsx --reporter=default` | Pass: 36 tests across 4 files. |
| Web `npm run typecheck:stripe-connect:checkout` | Blocked only by existing `packages/ui/src/table-navigation.ts:29`, possibly undefined `target`. No new scoped TypeScript errors remain. |
| Web `npm run build --workspace @market/storefront` | Pass. Existing large-chunk warning retained. |
| Web `npm run graphql:schema`, `npm run graphql:codegen` | Pass; source-only schema extraction, no database access. |

The checkout suite covers original account/fee/total ownership, single and multiple real Vendure Payments, authorization-before-capture ordering, one setup and independent clones, 3DS pause/resume, declines, duplicate calls, concurrent parent locks, partial capture, pending and failed customer refunds, independent multi-vendor compensation progress, interrupted separate application-fee compensation, ambiguous capture responses, native commit rollback after captures, signed duplicate/out-of-order webhooks, worker recovery, clone interruption, authorization expiry, secret omission, and immutable journal identities. Installed SDK fixtures assert actual request fields and account contexts, including absence of destination transfers and rejection of wrong fee, wrong SetupIntent Customer, and live object mode.

Frontend tests cover Stripe iframe mounting, incomplete card state, explicit consent, exact vendor disclosure, duplicate-submit protection, connected-account authentication, interruption/refresh gating, compensation messaging, and refusal to announce confirmation without committed native checkout evidence. No broad repository regression suite or automated browser QA was run.

The first database attempt was blocked by the sandbox's loopback restriction. Approved elevated reruns used only newly created `vendure_test_connect_e_*` databases. Initial focused failures in test channel hydration, preserved compensation metadata, and compensation guard compatibility were repaired and rerun. Successful disposable databases were dropped by the existing harness; earlier failed disposable databases were retained by that harness. `vendure_demo_market_ops` was never used by these tests.

## Database migration and safe setup

The new migration adds only `stripe_checkout_step`, original group/obligation links, immutable operation identities, safe mutable observation fields, and guards for frozen amounts/account scope. It extends the foundation's provider-operation guard solely to permit a failed-checkout VOID refund backed by an original verified capture and compensation record. Historical rows are not backfilled, replaced, reseeded, or rewritten. The migration is forward-only.

From the web directory, inspect first:

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:market-operations:inspect
```

Confirm the actual local target is `vendure_demo_market_ops`, and review the entire pending migration list. **Applying migrations requires your separate authorization.** After that authorization only:

```powershell
npm run demo:market-operations:migrate
```

No additional checkout-specific fixture records are necessary. Reuse the existing dedicated Phase D Orchard, Garden, and Market fixtures. If those dedicated fixtures need safe idempotent setup, the existing command is:

```powershell
npm run demo:market-operations:preorder-fee-fixtures
```

That command does not connect Stripe accounts or execute payments. It must not be replaced with reset/seed commands. It preserves existing fixture identities/preferences and does not modify Manna Roots or Boerne. Existing fixture display names may use `Preorder Fee D orchard/garden`; canonical storefront slugs are below.

## Manual provider qualification

### Configuration and account connection

Use only the existing backend `.env.demo-market-operations` server configuration and the prescribed web scripts. Preserve its current database and central account settings. Set these values explicitly for this qualification; placeholders must be replaced with the matching sandbox's existing values:

```dotenv
DEMO_STRIPE_CONNECT_TEST=true
STRIPE_ACCOUNT_ONBOARDING_ENABLED=true
STRIPE_TEST_CHECKOUT_ENABLED=true
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_<matching-platform-key>
STRIPE_TEST_CHECKOUT_FEE_TAX_POLICY=EXPLICIT_NO_FEE_TAX_TEST
STRIPE_TEST_SECRET_KEY=sk_test_<matching-platform-key>
STRIPE_TEST_PLATFORM_ACCOUNT_ID=acct_<original-platform>
STRIPE_TEST_CLIENT_ID=ca_<original-application>
STRIPE_TEST_REDIRECT_URI=http://localhost:3000/payments/stripe/oauth/callback
STRIPE_SETTINGS_ORIGIN=http://localhost:4322
STRIPE_TEST_PLATFORM_WEBHOOK_SECRETS=whsec_<platform-destination>
STRIPE_TEST_CONNECTED_WEBHOOK_SECRETS=whsec_<connect-destination>
DEMO_PREORDER_FEE_QUOTES=true
LOCAL_TEST_PAYMENTS_ENABLED=true
```

Keep the demo's existing `STRIPE_ENABLED=false`, `ENABLE_LOCAL_VERIFIED_CHECKOUT=false`, and other guarded provider flags. Collection is enabled by the separate new test-only opt-in above. The demo's existing account composition must supply `ENABLE_PAID_ATTRIBUTION=true`, account bridge/origins, and its local refund policy. Never substitute ordinary backend development commands that target `vendure`.

After authorized migration/setup, start separate terminals from the web directory:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

The existing demo worker enables `stripe-provider-recovery` for the explicitly opted-in sandbox. Keep the worker running for interrupted browser and webhook cases. No runtime was restarted by this implementation task.

At `http://localhost:4322`, sign in with the dedicated fixtures:

| Identity | Use |
| --- | --- |
| `stripe-fee-d-orchard@example.test` | Orchard owner, Payments settings and automatic recovery. |
| `stripe-fee-d-garden@example.test` | Garden owner, Payments settings and custom recovery. |
| `stripe-fee-d-manager@example.test` | Dedicated Market administration only; never the merchandise charge recipient. |
| `stripe-fee-d-staff@example.test` | Restricted-member permission check. |

The existing dedicated fixture password is `Local-Fee-D-2026!`. Do not change established credentials or permissions.

For each vendor separately, select its workspace and open `/vendor/settings/payments`. Explicitly choose Set up Stripe or Connect existing Stripe, finish the Phase C test onboarding/OAuth flow, then refresh status. A still-pending hosted setup can use Continue Stripe setup. Require ready card-payment status, expected original platform association, supported responsibility configuration, and TEST mode. Use two distinct US test connected accounts owned by their respective vendor organizations. Reusing platform API keys across these organizations is expected; reassigning a single vendor connected account between unrelated organizations is forbidden. If an account is already claimed by another fixture, create/connect a different test account through the normal interface instead of altering uniqueness constraints.

### Purchase scenarios

Use these existing storefronts and normal customer routes:

- Orchard: `http://stripe-fee-d-orchard.localhost:4321`.
- Garden: `http://stripe-fee-d-garden.localhost:4321`.
- Market: `http://stripe-fee-d-market.localhost:4321`.
- Customer flow: product/catalog page, selected available market occurrence, `/cart`, `/checkout`, and verified `/checkout/success?order=...`.

Use the currently available dedicated occurrence shown in the storefront or fixture command output. Do not guess an occurrence ID or move established market dates. Carrots belong to Orchard; Tomatoes/Strawberries belong to Garden. Unapproved Herbs is deliberately not a valid published test product.

1. **Single vendor:** In Orchard's storefront add Carrots for an available occurrence. Enter normal customer contact details and choose the authoritative pickup. At Review, use the existing test Preorder fee quote control. Confirm totals, continue to Payment, accept checkout-specific vendor consent, and open secure card entry. Use `4242 4242 4242 4242`, a future expiry, any valid three-digit CVC, and a test postal code. Complete purchase. Expect one vendor charge and one actual native payment; success must follow native commitment.
2. **Two vendors and one entry:** In the Market storefront add Orchard Carrots and Garden Tomatoes for the same occurrence. Select pickup for both, freeze the quote, and verify the vendor charge list sums to the final total. Enter the same successful test card once. Expect two connected-account intents/charges, both manual authorizations before capture, and one confirmed aggregate customer purchase.
3. **Automatic recovery:** In Orchard owner Payments settings choose Automatic, save, and use a fresh cart/quote. Compare the UI's frozen platform/recovery amounts and gross charge to the platform and vendor Dashboards. Do not expect a settings change to alter an already frozen quote.
4. **Custom recovery:** In Garden owner Payments settings choose Custom fixed amount of $1.50, save, and use a fresh quote. Garden's gross total includes $1.50 recovery while its application fee remains only original P. Combine this with Orchard Automatic for a mixed cart.
5. **Exact platform fee and direct-charge amounts:** In the platform Stripe sandbox Dashboard, inspect Connect application fees for the two original vendor charges. Verify each equals its frozen 5% merchandise component and the platform total equals their sum. In each connected account's sandbox Dashboard, inspect Payments, intent `capture_method=manual`, original gross amount/currency, successful charge ID, application fee, and balance transaction. The platform must not show one aggregate merchandise payment followed by transfers. Actual Stripe processing costs belong to the vendor balance; they need not equal the development recovery estimate.
6. **Decline:** Use a fresh checkout with Stripe's insufficient-funds test card `4000 0000 0000 9995`. Failure may occur during setup or subsequent intent confirmation. Expect accurate failure/authentication feedback and no confirmed purchase. A vendor authorization failure must never capture another vendor merely to finish the cart.
7. **3D Secure:** Use Stripe's `4000 0000 0000 3220` authentication-required test card in a fresh checkout. Complete or cancel the Stripe challenge. Setup authentication alone is not treated as vendor payment success. Additional vendor challenges must appear in the correct account context without asking for another card entry. Exact challenge occurrence depends on Stripe's setup/cloning behavior; deterministic per-vendor action success/failure is also covered through controlled fixtures.
8. **One vendor authorization failure:** Run `npm run test:stripe-connect:checkout` from the web directory. Its named decline scenario authorizes one account, declines the other, checks zero captures/native payments, and verifies cancellation. Do not restrict a persistent merchant or invent unpredictable provider errors to simulate this case.
9. **Partial capture and compensation:** Use that same isolated command's named partial-capture/pending-refund scenario. It verifies original customer gross refunds, separate platform-fee refund, no native placement, accurate pending state, and completion only after both legs. The lost-response and local-commit-fault scenarios independently exercise reconciliation and compensation. No fault injection endpoint exists in the populated demo.
10. **Browser refresh/interruption:** In a fresh genuine sandbox checkout refresh during setup, bank authentication, or payment verification; also close/reopen `/checkout` using the same browser session. The server must return the original group. Keep the worker running. Do not use a separate browser session to claim another customer's checkout. Expect resume, authentication request, verified completion, or cancellation/compensation after reservation expiry, never a fresh independent capture from reload.
11. **Duplicate submit/retry:** Double-click Complete purchase, refresh status, and resume the same group repeatedly. Compare Stripe intent/charge IDs before and after; they must not multiply. While VERIFYING, COMPENSATION_PENDING, or manual review is shown, submit no new card charge. After a terminal failure whose required refunds/cancellations are complete, use the fresh-cart workflow described above.
12. **Confirmation and seller visibility:** While a vendor still requires authentication or refund recovery, check there is no fulfillment-ready seller order. Only after both vendor captures and native commitment should customer confirmation and native seller operations become available. Inspect actual native Payments and `purchase_payment_allocation` references with existing read-only local tools if needed; never force their statuses with SQL.
13. **Local/offline compatibility:** On a separate cart without a frozen Preorder fee quote, use the existing explicitly eligible local test payment. It remains a no-provider-charge flow. Existing cash/POS paths remain unchanged. Do not attempt to run the destructive automated harness against the persistent database.

Stripe card references: [testing cards and 3DS](https://docs.stripe.com/testing). Only use test card numbers with sandbox credentials. Manual execution and Dashboard observations remain pending user account setup and testing.

### Operations and unresolved results

Use existing payment reconciliation reads and persisted group/journal identities. `MANUAL_INTERVENTION_REQUIRED`, unknown provider outcomes, pending refunds, revoked account access, and original-customer authority loss require review. Retrieve the original Stripe resources in their original platform/connected contexts. Do not clear journal rows, reset attempt states, reconnect an unrelated account, invent settled facts, or recharge to escape ambiguity. Disabling collection also stops Phase E provider recovery; resolve outstanding work before removing its explicit test authorization.

## Limitations and Phase F

- Genuine Stripe sandbox end-to-end execution and native guest-session browser behavior have not been manually qualified in this task. No claim of production readiness or legal approval is made.
- V1 is limited to US platform/vendors, USD frozen test fee quotes, supported cards, and the existing no-fee-tax test policy. Additional methods/geographies/tax policies fail closed.
- Terminal failure retry uses a fresh native cart, not an in-place replacement generation. Setup/Card Customer IDs persist per attempt for reconciliation, without a general saved-wallet feature.
- Session advisory locking uses one dedicated database connection during coordination. There is no claim that separate Stripe captures are atomic. Native hold expiry can still require refunds after successful captures, and Stripe may retain vendor processing fees after compensation.
- Ordinary customer-requested post-purchase full/partial refunds, original-unit provider refund execution, ongoing application-fee adjustments, disputes, payout operations, invoice collection, and live activation remain Phase F/later work. The existing grouped payment handler continues rejecting unqualified ordinary direct-charge refunds.
- No unrelated POS, Square/Clover, loyalty, tax, QuickBooks, or broad regression suite was executed. Existing lifecycle and immutable writers are reused; controlled native payment and historical local/fee checks pass, but that is not comprehensive qualification of every commerce integration.
- The pre-existing shared table-navigation TypeScript error remains outside this bounded feature work.

Phase F must reuse the original capture, charge, fee, operation, and unit allocation identities and independently reconcile customer and platform-fee effects. It must not reinterpret test-mode checkout qualification as permission for live collection.
