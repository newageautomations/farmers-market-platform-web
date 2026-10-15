# Local test checkout

Real local purchases without Stripe are implemented through Vendure's supported payment lifecycle. Direct Vendor order **52**, code `T3KUK6SXTBHB5XSE`, was completed in the existing synthetic `vendure_demo_market_ops` database. Its one settled Payment is **850 USD minor units**, or $8.50, and uses `dev-test-payment`. The customer purchase projection contains the order, and the existing purchase callback follows Manna Roots.

The feature is disabled by default. Two-Vendor Market acceptance is still blocked by the existing demo data described below. Browser acceptance remains the developer's manual step. This task does not implement Phase B or change dashboard presentation.

## Architecture

The installed `@vendure/core` 3.7.3 includes `dummyPaymentHandler`. [Vendure documents it as a development payment simulator](https://docs.vendure.io/current/core/reference/typescript-api/payment/dummy-payment-handler). It creates Payments without contacting a payment provider.

The registered handler is a guarded wrapper with code `dev-test-payment` and display name **Test Payment — No Charge**. Registering the unrestricted dummy directly would omit this platform's placement capability, checkout hold, verified local result, and financial attribution contracts. The wrapper first uses the existing `LocalVerifiedPaymentAdapter.consume` checks, then delegates settlement to the installed dummy with `automaticSettle=true`. Browser metadata is discarded. The dummy's random transaction identifier is replaced with the verified `local:<event-id>` identifier; local simulator effects retain their existing explicit local namespace. No Stripe transaction identifier is fabricated.

The existing sequence remains:

1. Select the real storefront/channel and add native product variants and quantities.
2. Save authenticated or guest contact through the existing checkout API. Existing guest eligibility remains unchanged.
3. Select existing Vendor-owned pickup methods. Server prices, taxes, shipping and pickup coverage remain authoritative.
4. `beginLocalCheckout` checks eligibility, freezes the existing contact, uses the existing legitimate transition to `ArrangingPayment`, acquires the existing capacity hold, and records the existing local simulated capture evidence.
5. `finalizeLocalCheckout` calls the existing inventory coordinator. Inside its placement transaction, `NativeCommerceAdapter` calls **Vendure `OrderService.addPaymentToOrder`** using `dev-test-payment`.
6. The handler creates a genuine settled Payment. Vendure performs the order transition and existing seller-order processing. Allocations, immutable financial snapshots, follow callbacks and `MarketplaceOrderPlaced` facts execute through the existing path.
7. The normal confirmation route reads the owned, committed order. Replays remain idempotent.

There is no direct Order status update, invented OrderPlaced response, raw Payment insert, second payment state machine, pricing override, inventory rule change, or schema migration.

PaymentMethod provisioning uses Vendure `PaymentMethodService.create` and `ChannelService.assignToChannels`, with the existing transaction advisory lock. Before provisioning, the adapter checks the **actual** database name, schema and PostgreSQL server address, and the current channel's active local storefront. Read-only SQL verifies the target; SQL never creates the PaymentMethod. The method is created or assigned on an owned checkout status read or before beginning payment. An existing disabled or incompatible test method is rejected rather than silently repaired.

## Enable, disable and start safely

From `E:\coding\farmers-market-platform-web`, use three separate terminals. Existing ignored frontend `.env` account settings are required: `PLATFORM_ACCOUNT_ORIGIN=http://auth.platform.localhost:4321`, `ADMIN_ORIGIN=http://localhost:4322`, and the matching server-only `PLATFORM_ACCOUNT_BRIDGE_KEY` of at least 32 characters. Existing values are reused; this task changed neither repository's environment files.

Backend terminal:

```powershell
$env:LOCAL_TEST_PAYMENTS_ENABLED='true'
npm run demo:market-operations:serve
```

Storefront terminal:

```powershell
npm run demo:market-operations:storefront
```

Admin terminal:

```powershell
npm run demo:market-operations:admin
```

The backend helper selects only the existing loopback `vendure_demo_market_ops` database, supplies the existing local account attribution/no-refunds composition, disables external providers, blocks outbound sockets, binds its API to loopback, and refuses pending migrations. It does not seed or reset data when serving. No worker is needed for synchronous payment settlement or customer follows. The demo keeps background queues inactive, so asynchronous operational CRM/analytics recovery remains a separate manual testing dependency.

To disable, stop the backend, then restart in the same terminal:

```powershell
$env:LOCAL_TEST_PAYMENTS_ENABLED='false'
npm run demo:market-operations:serve
```

For persistent opt-in, the backend's existing ignored `.env.demo-market-operations` supports `LOCAL_TEST_PAYMENTS_ENABLED=true`; set it to `false` or remove it to opt out. Shell values override the file. Do not put the flag into a frontend public environment variable. Keep the older `ENABLE_LOCAL_VERIFIED_CHECKOUT=false` demo setting intact; this new opt-in selects the guarded dummy integration independently.

Required backend protection is checked at startup, plugin initialization, eligibility and payment consumption:

- Exact `LOCAL_TEST_PAYMENTS_ENABLED=true`, `APP_ENV=dev`, and `NODE_ENV=development`.
- Exact database `vendure_demo_market_ops`, schema `public`, valid port and exact loopback host. Alternate database URLs, PostgreSQL service overrides and TLS redirect configuration are rejected.
- Actual PostgreSQL server address is loopback. Current canonical storefront hostname must be `localhost` or end in `.localhost`.
- Existing paid attribution and `local-demo-no-refunds-v1` policy are required. Local refunds and external provider/network configuration are forbidden.
- The raw dummy handler is never registered. The test handler is never registered in production; production configuration rejects the new opt-in. Normal production/Stripe configuration is unchanged with the flag off.
- Removing opt-in rejects payment use even if the database still contains the method. The development checker reports retained methods ineligible. Handler registration disappears on restart. Manipulating a frontend request cannot grant a placement capability or enable payment.

The shared socket guard blocks external SDK, fetch, SMTP/TLS and UDP connections for this opt-in composition. Existing local inventory, order/event, snapshot and follow effects are retained. Email, SMS, POS and external billing/communications adapters are disabled; no provider credentials, Stripe PaymentIntents, webhook requests, charges, payouts, external fulfillment requests or external notifications are generated. The existing local email file sink remains available for account messages. These controls apply only to local testing.

## Checkout and context preservation

Checkout reuses the existing shared Button, Input and Select. No new UI component, card system, CSS framework or dependency was created. The server's checkout availability calls Vendure's payment eligibility checker; the browser never decides eligibility from an environment flag. Its payment step provides the requested method name and notice: **This is a test purchase. No real payment will be made.** The developer explicitly selects the method and clicks **Place order** or **Complete purchase**.

The existing submission lock prevents duplicate clicks. The component rechecks server availability before beginning. Once payment work starts, a lost response keeps payment unavailable until an explicit status refresh. Refresh uses the known order ID, so a successfully placed order can still be reconciled after Vendure clears the active cart. Refresh never automatically submits a second payment. Pending or reconciliation-required results never display success. Existing terminal hold errors and release controls remain.

A Direct Vendor order retains `DIRECT_VENDOR`, its origin storefront/channel, canonical vendor, native lines, quantities, server totals, customer ownership and pickup. A Market order retains `MARKET_OCCURRENCE`, market and occurrence IDs, pickup promise, aggregate/customer order and existing seller portions. Each line retains its original vendor link. The dummy does not alter splitting, merging, allocations or fulfillment rules. Vendor operational visibility continues to use existing native channels and validated line links.

## Manual purchase walkthrough

Existing customer credentials are in [demo-customer-account.json](../demo-customer-account.json): `demo.customer@example.test`, password `local-identity-regression-only-password`. Sign in at `http://auth.platform.localhost:4321/account/login`; use the existing **Sign in** entry on each storefront to complete the normal account handoff. Keep the same customer throughout the walkthrough.

For a working Direct Vendor purchase now:

1. Open `http://manna-roots.localhost:4321/products/manna-roots-green-garden-juice`.
2. Add one product, open `/cart`, and continue to `/checkout`.
3. Check the customer contact, select the existing Manna Roots pickup, and review the server total. The verified one-item purchase totaled $8.50.
4. Continue to payment, select the test method, and click **Place order**. Open the normal confirmation and customer order detail.
5. Sign into Vendor Admin at `http://localhost:4322` with `manna-roots@example.test` and the existing local regression password. Inspect `/vendor/orders` in that Vendor workspace.

For the requested two-Vendor Market plus distinct Direct Vendor sequence, after the fixture prerequisites below are completed through existing supported administration:

1. Purchase A: open `http://localhost:4321/occurrences/2`. This is the existing October 17, 2026 occurrence, starting at 9:00 a.m. America/Chicago. Use an occurrence with an actually open preorder window if this date has passed.
2. Add Manna Roots' product as Vendor A and an eligible Showbread Catering product as Vendor B. Both must appear in this same occurrence's real catalog. Confirm that `/cart` shows both Vendor groups and that the occurrence is unchanged.
3. Complete contact, choose an existing pickup method for **each** Vendor, review the total, select the test method and place the Market order. Verify the normal confirmation, occurrence and two vendor portions. Do not create two customer orders to simulate this Market purchase.
4. Purchase B: visit `http://norma-jeans-greens.localhost:4321/products`. Norma Jean's Greens is Vendor C, distinct from A and B. Add an enabled in-stock product and complete its ordinary Direct Vendor checkout after its required pickup configuration exists.
5. Open `http://auth.platform.localhost:4321/account/orders` and the two order details. Check the real Vendor names, Market/occurrence for Purchase A, server totals and customer ownership.
6. Inspect `/account/markets` for Bulverde Market Day Demo and `/account/vendors` for A, B and C. The existing purchase callback writes follows; neither this task nor the frontend fabricates them.
7. Inspect `/account` and the Market/Vendor sections for future occurrences and favorite Vendor attendance. Existing events require actual future scheduled dates, active subjects/storefronts, confirmed participation and **verified Vendor consent**. A directory listing or legacy membership alone is insufficient.

Guest add-to-cart was rechecked with a separate native Shop session. Anonymous add and remove succeeded with real products. The integration removed its guest lines through normal APIs. Guest checkout rules were not changed; automatic shopper follows still require the established authenticated purchase contract. Guest history/claim behavior remains the existing flow.

## Existing data blockers and smallest required setup

The current API reports **10 eligible products, all Manna Roots**, for occurrence 2. Occurrences 3 and 4 have no currently eligible products. No two-Vendor Market purchase was completed or claimed as verified.

Read-only diagnosis of the existing occurrence 2 data found:

| Vendor                    | Membership/attendance | Offerings in the open time window | Current occurrence-version provenance | Existing pickup methods |
| ------------------------- | --------------------- | --------------------------------: | ------------------------------------: | ----------------------: |
| Manna Roots, ID 7         | approved / confirmed  |                                14 |                                    10 |                       1 |
| Showbread Catering, ID 8  | approved / confirmed  |                                 4 |                                     0 |                       0 |
| Norma Jean's Greens, ID 9 | approved / confirmed  |                                 4 |                                     0 |                       0 |

Showbread and Norma Jean's offerings still contain **stale `windowProvenance.occurrenceVersion`**. The existing catalog deliberately excludes them when that version differs from the occurrence. Their four variants are assigned to the Market channel, so mere channel assignment is not the blocker. The existing supported Admin mutation `rematerializeMarketOfferingWindow(id, expectedVersion)` recalculates the stored window from the current rules without inventing new rules. Use the legitimate Market/Vendor account and current offering version. Do not edit provenance, occurrence versions or windows with SQL to evade validation. Then verify canonical prices/publication and stock through the normal catalog.

Create appropriate Vendor-owned pickup ShippingMethods for B and C through existing supported administration, using approved fixture pickup descriptions and fees. This is required existing checkout setup, independent of payment. The payment task did not invent a free pickup policy, bypass shipping coverage, change prices, seed broadly or reset data.

All three inspected memberships currently have `consentState=LEGACY_UNVERIFIED`. The existing customer upcoming-event projection requires `VERIFIED`; this explains why the newly followed Manna Roots has no favorite-Vendor appearances despite confirmed participation. Complete the existing Vendor consent flow to qualify appearances. A Market purchase will follow its Market, but no Market follow was invented here. Historical projections are not backfilled by this feature.

One failed setup probe added a product to test cart 50 before discovering C's missing pickup method. That task-created line was removed through the Shop API. Empty native order history was retained. Test cart 52 was resumed by its explicit ID and completed. Pre-existing orders and relationships were preserved.

## Verification and local files

Checks performed:

- Frontend `npm run typecheck`: passed, including 78 Astro files with zero errors, warnings or hints.
- Focused frontend `tests/local-test-checkout.test.tsx` and `tests/local-account-environment.test.ts`: 11 tests passed. Covers authoritative disabled presentation, explicit selection, duplicate submit, response-loss uncertainty, status-only reconciliation and eligibility recheck.
- Backend focused compilation: `node node_modules/typescript/bin/tsc --noEmit --project scripts/market-operations-demo/tsconfig.json` passed.
- Backend `test-payment.test.ts`: passed opt-in, exact database, provider/network and production guards; retained-method rejection; guarded dummy settlement; server amount/local provenance; missing placement evidence; early ineligible-selection rejection.
- Existing demo `guards.test.ts`: passed.
- Backend `npm run build`: passed for dashboard, server and worker with explicit development environment. Initial ordinary build required `APP_ENV`; the sandbox then blocked Vite realpath, so the authorized local build was rerun outside the sandbox. No project configuration was weakened.
- Live integration: existing database/schema/loopback preflight passed; guest add/remove passed; Direct Vendor order 52 settled with one genuine Payment; completion replay retained one Payment; customer history/follow receipt and Manna Roots follow passed.
- Live opt-out against retained order 52: method became ineligible, checkout status became payment-unconfigured while retaining the confirmed order, and Shop `beginLocalCheckout` returned `LOCAL_TEST_PAYMENTS_DISABLED`.
- Final diff/scope inspection completed. Two-Vendor Market purchase, distinct Vendor C purchase, browser navigation, associated Market follow and upcoming appearances remain manual acceptance after the exact data prerequisites above.

Focused commands, from the frontend folder:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
node node_modules/vitest/vitest.mjs run tests/local-test-checkout.test.tsx tests/local-account-environment.test.ts
npm run typecheck
```

From `E:\coding\farmers-market-platform`:

```powershell
node node_modules/typescript/bin/tsc --noEmit --project scripts/market-operations-demo/tsconfig.json
node node_modules/ts-node/dist/bin.js --project scripts/market-operations-demo/tsconfig.json scripts/market-operations-demo/test-payment.test.ts
node node_modules/ts-node/dist/bin.js --project scripts/market-operations-demo/tsconfig.json scripts/market-operations-demo/guards.test.ts
# Read-only preflight against the explicitly approved demo; no purchase by default.
node node_modules/ts-node/dist/bin.js --project scripts/market-operations-demo/tsconfig.json scripts/market-operations-demo/test-payment.integration.ts
```

The integration helper's explicit `--complete` opt-in boots an ephemeral guarded API against the existing local demo and performs native purchases where prerequisites exist. It refuses pre-existing nonempty customer carts unless the exact order ID is deliberately passed with `--resume-order=<id>`. `--complete --verify-order=52` checks opt-out on the existing completed test order without buying again. These commands may require local socket access outside the filesystem sandbox. They do not migrate, seed, reset or delete database history. The helper closes its API afterward; persistent demo servers were not left running by this task.

Frontend files changed: `apps/storefront/src/components/Checkout.tsx`, new `tests/local-test-checkout.test.tsx`, this document, and the appended Phase A note.

Backend files changed: `src/vendure-config.ts`, `src/production-policy.ts`, `src/plugins/marketplace-commerce/types.ts`, `marketplace-commerce.plugin.ts`, `commerce/checkout-coordinator.ts`, `commerce/native-commerce.adapter.ts`, `commerce/local-verified-payment.adapter.ts`, `customer-account/service.ts`, `scripts/market-operations-demo/environment.ts`, and `scripts/market-operations-demo/network.ts`. New backend files are `commerce/local-test-payment-policy.ts`, `commerce/local-test-payment-network.ts`, `scripts/market-operations-demo/test-payment.test.ts` and `test-payment.integration.ts`. The network implementation was moved from the existing demo helper into shared backend source, with the helper re-exporting it, to preserve the server build layout.

No new dependencies, schema migrations, screenshots, evidence folders, browser automation, full end-to-end/unit suites, commits, pushes, pull requests or deployments were performed. No real money moved. All earlier working-tree changes were retained.

Future Stripe integration should continue to use the existing provider registry, verified result adapter and separate provider Shop operations. Turn local test payments off before enabling an external provider. This feature chooses no production funds-flow, payout, refund, provider confirmation or webhook policy and does not qualify Stripe for production.
