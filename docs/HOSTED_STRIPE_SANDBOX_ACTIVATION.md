# Hosted Stripe Sandbox activation

## Release status

The local web and Vendure changes prepare the existing integration for the **Farmerlane Staging Sandbox**. Hosted acceptance is an operator task. Stripe, Railway and Cloudflare settings were untouched. Use the existing staging releases, named Tunnel, private network, provisioned tester admission and PostgreSQL database. This change adds no migration. API and worker startup still require the existing migration ledger and verify the `market_staging` database, `public` schema, runtime role and staging database marker.

## Payment and security boundaries

- Stripe Standard OAuth uses the configured Sandbox Connect application, `read_write`, and a single-use state bound to the initiating actor, channel, organization, platform, application and redirect URI. The browser callback sends the original actor to `/vendor/settings/payments` or `/market/settings/payments` on the configured Admin. The authenticated Admin mutation claims the attempt and completes the exchange. The default state lifetime is 300 seconds. The exchange requires `livemode=false`, and account refresh uses the authenticated platform with explicit connected-account context. Use distinct, authorized merchant accounts for the qualification fixtures. Existing intentional shared-account mappings still use separate business authorization and original financial attribution.
- Both API and worker use the pinned Stripe SDK, retrieve the authenticated US platform account and require its ID to match `STRIPE_TEST_PLATFORM_ACCOUNT_ID`. They require `livemode=false` from Stripe's authenticated Balance API. A failed check prevents Stripe-enabled startup. Compare the publishable key and Connect client ID against the same Sandbox in Workbench. The OAuth exchange and connected card initialization exercise those separate identities in acceptance. [Stripe Balance API](https://docs.stripe.com/api/balance/balance_retrieve) · [Standard OAuth](https://docs.stripe.com/connect/oauth-standard-accounts)
- Merchandise and booth invoices keep the existing direct-charge routes, fees, minor-unit rounding and original-resource reconciliation. Market baskets containing multiple vendors authorize and settle each vendor's obligation. Invoices charge the market's original connected account. Provider evidence and durable records drive settlement, refunds and compensation. Existing zero-percent Vendure baseline and application tax rules still apply.
- The storefront's verified hostname registry supplies the canonical origin, tenant and Shop context, including for newly registered dynamic storefronts. Checkout's existing fixed relative return/success paths stay on that origin. Cancel returns to the same checkout context. Astro requires the canonical origin for Shop mutations and preserves the host-specific session and central account handoff. `STRIPE_STOREFRONT_ORIGIN` is optional in staging and has no role in routing payment returns. A supplied staging value must still be a canonical public HTTPS origin. Production continues to require the value under its independent policy.
- Checkout and the vendor invoice Admin documents get exact Stripe.js origins in `script-src`, `connect-src` and `frame-src`. Use `https://js.stripe.com` for scripts, `https://api.stripe.com` for connections and `https://js.stripe.com` plus `https://hooks.stripe.com` for frames. These forms use hosted Elements and card authentication. Preview, unrelated Admin documents and the existing asset-origin policy retain their rules. The optional Stripe.js subdomain optimization and Address Element, Link, wallet, and hosted Checkout allowances are outside the staged card qualification. Configure the Sandbox merchant payment methods for cards only, including where the existing integration uses automatic payment methods. [Stripe CSP reference](https://docs.stripe.com/security/guide#content-security-policy)
- The qualified card form does not need individual storefront registrations in Stripe. Link, Apple Pay and Google Pay have separate domain registration requirements if introduced in a future release. [Stripe payment method domain registration](https://docs.stripe.com/payments/payment-methods/pmd-registration)

## Public ingress

| Method | Exact URL                                                           | Admission                                                                |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| GET    | `https://staging-api.farmerlane.com/payments/stripe/oauth/callback` | OAuth query parameters allowed. An original pending attempt is required. |
| POST   | `https://staging-api.farmerlane.com/payments/stripe/platform`       | No query string. Platform destination signature required.                |
| POST   | `https://staging-api.farmerlane.com/payments/stripe/connected`      | No query string. Connected destination signature required.               |

Caddy and the private API check the exact staging authority, path and method. Caddy preserves the signature and raw bytes while replacing the existing ingress and client-IP headers. The API keeps its gateway credential check and excludes these routes from the private SSR allowlist. Webhooks accept identity-encoded JSON up to 1 MiB with one `Stripe-Signature` header. The SDK verifies its timestamp tolerance and signature. A live event is rejected before receipt persistence. Successful receipt returns 200 only after the durable write. Invalid input returns 400, oversize input returns 413, and persistence failure returns 503. The database-backed recovery queue processes receipts and uses the existing bounded retry and reconciliation paths. Deduplication is by provider, mode and Stripe event ID. Connected scope and original payment/account identity are checked before effects. Current provider reads resolve out-of-order notifications.

## Stripe Workbench

1. Use the Stripe Dashboard account picker to select **Farmerlane Staging Sandbox**. Verify Test mode and the platform account ID. In **Connect settings → Onboarding options → OAuth**, enable existing Standard OAuth for the Sandbox and verify the Sandbox `ca_…` ID. Register the exact API callback URL in the table above. Leave unrelated OAuth redirect URLs alone.
2. Open **Workbench → Webhooks**. Reuse a destination if its scope, URL, exact subscriptions and version match. Otherwise choose **Create an event destination**, choose the scope below, select **Snapshot**, and select `2026-09-30.endive`, the version pinned by the vendure payment SDK and snapshot validator. Choose **Webhook endpoint** and the matching URL. Use explicit event selections. If Workbench cannot provide the pinned version or the Sandbox OAuth option, pause before enabling collection and resolve the Stripe account/configuration issue.
3. Open each destination, select **Reveal secret**, and save its own `whsec_…` value in the deployment secret store. Prepare or pause deliveries until the receiver and matching variables are ready. If Workbench enables a new destination on creation, pause it promptly and check its delivery history after enabling it. [Workbench destinations and delivery controls](https://docs.stripe.com/webhooks) · [Connect snapshot scope](https://docs.stripe.com/connect/webhooks?accounts-namespace=v1)

**Platform destination, Your account**

```text
application_fee.created
application_fee.refunded
application_fee.refund.updated
transfer.created
transfer.updated
transfer.reversed
balance.available
reserve.hold.created
reserve.hold.updated
reserve.plan.created
reserve.plan.disabled
```

Transfer events serve existing reconciliation and do not enable transfers. Balance and reserve events produce review evidence while reserve allocation remains deferred.

**Connected destination, Connected accounts**

```text
account.updated
capability.updated
account.application.authorized
account.application.deauthorized
payment_intent.amount_capturable_updated
payment_intent.requires_action
payment_intent.processing
payment_intent.succeeded
payment_intent.payment_failed
payment_intent.canceled
charge.succeeded
charge.updated
charge.captured
charge.failed
charge.refunded
refund.created
refund.updated
refund.failed
charge.dispute.created
charge.dispute.updated
charge.dispute.closed
charge.dispute.funds_withdrawn
charge.dispute.funds_reinstated
payout.created
payout.updated
payout.paid
payout.failed
payout.canceled
payout.reconciliation_completed
balance.available
```

The Standard OAuth path uses v1 snapshots with `data.object`, `livemode=false`, `api_version=2026-09-30.endive`, and a top-level `account` on connected events. The existing Accounts v2 thin notification path belongs to the separate hosted provisioning flow. It is outside this release qualification. Farmerlane invoice payment uses PaymentIntents, charges and refunds, so the catalog has no Stripe Billing invoice subscriptions. Payout observations use the existing vendor ledger. Payout events for market accounts are retained for review with `MARKET_PAYOUT_ALLOCATION_UNSUPPORTED`. Invoice settlements and refunds use their own market records. [Stripe snapshot catalog](https://docs.stripe.com/api/events/types)

## Operator deployment

### Stage A. Deploy dormant

Record the current Railway release IDs and environment settings. Deploy the reviewed backend to API and worker, and the reviewed web release to Admin, Astro and gateway. Use the existing private listeners and readiness checks. Set `STRIPE_ENABLED=false` and `STRIPE_COLLECTION_SUSPENDED=true` on API and worker. Leave the Stripe credential bundle and authorization flags unset. Check sign-in, one published storefront and an owned Admin request. The exact new routes should reach a dormant receiver and reject a callback without state and unsigned webhook requests. Existing firewall, WAF, cache bypass, admission, storage, asset proxy and private transport settings remain in effect. [Staging deployment](STAGING_DEPLOYMENT_PHASE_B1.md) · [Public ingress](STAGING_PUBLIC_INGRESS.md) · [Dynamic routing](DYNAMIC_STOREFRONT_ROUTING.md)

### Stage B. Inject the Sandbox configuration

Set this identical runtime bundle on **API and worker**. The worker verifies and processes the same Sandbox and needs Stripe identities and policies. Keep its existing media configuration. Stripe qualification requires no private storage credentials or document encryption key on the worker. All listed values are singular except the two webhook secret lists. Seal `STRIPE_TEST_SECRET_KEY` and both `*_WEBHOOK_SECRETS` in each service. The publishable key is browser-safe and is supplied at runtime through the existing authorized payment responses.

| Runtime variable                                                                                           | Exact value or placeholder                                          |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `STRIPE_ENVIRONMENT`                                                                                       | `staging`                                                           |
| `STRIPE_ENABLED`                                                                                           | `true`                                                              |
| `STRIPE_COLLECTION_SUSPENDED`                                                                              | `true`                                                              |
| `STRIPE_SANDBOX_COLLECTION_AUTHORIZED`                                                                     | `false`                                                             |
| `STRIPE_ACCOUNT_ONBOARDING_ENABLED`                                                                        | `true`                                                              |
| `STRIPE_TEST_CHECKOUT_ENABLED`, `STRIPE_TEST_INVOICE_ENABLED`, `STRIPE_TEST_INVOICE_COLLECTION_AUTHORIZED` | `false`                                                             |
| `STRIPE_TEST_SECRET_KEY`                                                                                   | `<Sandbox sk_test_…>`                                               |
| `STRIPE_TEST_PUBLISHABLE_KEY`                                                                              | `<same Sandbox pk_test_…>`                                          |
| `STRIPE_TEST_CLIENT_ID`                                                                                    | `<Sandbox Connect ca_…>`                                            |
| `STRIPE_TEST_PLATFORM_ACCOUNT_ID`                                                                          | `<Sandbox platform acct_…>`                                         |
| `STRIPE_TEST_REDIRECT_URI`                                                                                 | `https://staging-api.farmerlane.com/payments/stripe/oauth/callback` |
| `STRIPE_TEST_PLATFORM_WEBHOOK_SECRETS`                                                                     | `<platform whsec_…>`                                                |
| `STRIPE_TEST_CONNECTED_WEBHOOK_SECRETS`                                                                    | `<connected whsec_…>`                                               |
| `STRIPE_SETTINGS_ORIGIN`                                                                                   | `https://staging-admin.farmerlane.com`                              |
| `STRIPE_PLATFORM_WEBHOOK_URL`                                                                              | `https://staging-api.farmerlane.com/payments/stripe/platform`       |
| `STRIPE_CONNECTED_WEBHOOK_URL`                                                                             | `https://staging-api.farmerlane.com/payments/stripe/connected`      |
| `STRIPE_STOREFRONT_ORIGIN`                                                                                 | Unset                                                               |
| `STRIPE_RECOVERY_ENABLED`, `STRIPE_HISTORICAL_REFUNDS_ENABLED`                                             | `true` (also default on in staging)                                 |

Each webhook list accepts one signing secret or a comma-separated pair with no spaces during rotation. Use distinct values across both lists. Keep all live Stripe values and SaaS Stripe credentials unset. Retain `APP_ENV=production`, `NODE_ENV=production`, `DEPLOYMENT_ENV=staging`, `API_ORIGIN=https://staging-api.farmerlane.com`, `ADMIN_ORIGIN=https://staging-admin.farmerlane.com`, `ENABLE_PAID_ATTRIBUTION=true`, the existing refund policy value, and existing database identity and transport on API and worker. Keep the local simulator, unrelated providers, subscription billing and external communications disabled. On API keep `HOSTED_TRANSPORT=railway-private`, its private upstream and ingress/SSR keys. Keep the existing `STAGING_TESTER_ACCESS=provisioned` and `STAGING_ANONYMOUS_STOREFRONTS=published` wherever currently configured.

| Other Railway service | Build and runtime requirements                                                                                                                                                                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gateway               | Use `Dockerfile.gateway`. Keep runtime `DEPLOYMENT_ENV=staging`, `STAGING_INGRESS_MODE=application`, `MARKET_API_HOST=staging-api.farmerlane.com`, the named Tunnel token, loopback listener, current private upstreams, public host mappings and matching sealed ingress keys. No Stripe variables. |
| Admin                 | Build and run with existing staging frontend origins and deployment identity. Keep the runtime ingress key sealed. No Stripe build or runtime variables.                                                                                                                                             |
| Astro                 | Build and run with the existing staging origins, including the asset prefix. Keep runtime ingress, Shop SSR and account bridge credentials sealed. Retain dynamic routing and the current pilot mappings. No Stripe build or runtime variables.                                                      |
| PostgreSQL            | Keep `market_staging`, private-only connectivity and existing roles and marker. No Stripe variables.                                                                                                                                                                                                 |

### Stage C. Qualify connectivity while suspended

1. Redeploy API and worker with Stage B values. Require API readiness and `server_started`, worker `worker_started`, and `stripe_sandbox_verified` with `collectionSuspended=true` in both logs. Check the first scheduled `stripe_recovery_completed`. Resolve initialization, identity, schema or recovery errors before proceeding.
2. From a client without a Farmerlane session, run the following probes. Expect the API's callback rejection or `INVALID_WEBHOOK` with HTTP 400 and an `X-Request-Id`. The webhook response should come from Vendure without an authentication redirect. An unsupported method or trailing slash should be rejected at the gateway. Repeat the callback request on an actual staging storefront authority and require rejection. Verify public `/shop-api`, private SSR endpoints and the guarded Admin operations are still inaccessible on the public transport where applicable.

   ```powershell
   curl.exe -i 'https://staging-api.farmerlane.com/payments/stripe/oauth/callback?state=fixture'
   curl.exe -i -H 'Content-Type: application/json' -H 'Stripe-Signature: invalid' --data-binary '{}' 'https://staging-api.farmerlane.com/payments/stripe/platform'
   curl.exe -i -H 'Content-Type: application/json' --data-binary '{}' 'https://staging-api.farmerlane.com/payments/stripe/connected'
   curl.exe -i -X POST 'https://staging-api.farmerlane.com/payments/stripe/oauth/callback'
   curl.exe -i --path-as-is 'https://staging-api.farmerlane.com/payments/stripe/oauth/callback/'
   ```

3. Enable the prepared Workbench destinations. As the vendor and market owners, connect the distinct Sandbox accounts through **Connect existing Stripe account** in their payment settings. Resume the original workspace on the returned settings page and verify Test, Connected and active card capability. Check the platform's Sandbox connected-account list. As an unrelated workspace actor and as a user without financial administration, verify access is denied and no mapping changes. Verify a consumed or expired attempt fails without replaying the authorization code in logs or support tickets.
4. Cause a benign `account.updated` on a mapped Sandbox account, for example by updating a test-only profile field. Match Workbench's 200 delivery to the API receipt and worker `stripe_webhook_processed` with `PROCESSED`. A synthetic event with no original mapping can prove delivery but may correctly require reconciliation. Verify new card collection still cannot start. Check the platform destination's delivery when the first real Sandbox application fee exists in Stage D.

### Stage D. Authorize simulated collection

Only after Stage C passes, set these values on API and worker and redeploy both. Retain all other Stage B values. If releasing sequentially, verify the worker on the new settings before making the API release ready to initiate new collection.

```dotenv
STRIPE_SANDBOX_COLLECTION_AUTHORIZED=true
STRIPE_COLLECTION_SUSPENDED=false
STRIPE_TEST_CHECKOUT_ENABLED=true
STRIPE_TEST_CHECKOUT_FEE_TAX_POLICY=EXPLICIT_NO_FEE_TAX_TEST
STRIPE_TEST_INVOICE_ENABLED=true
STRIPE_TEST_INVOICE_COLLECTION_AUTHORIZED=true
STRIPE_TEST_INVOICE_FEE_POLICY=booth-invoice-sandbox-5pct-v1
STRIPE_TEST_INVOICE_FEE_TAX_POLICY=EXPLICIT_NO_FEE_TAX_TEST
```

Confirm `stripe_sandbox_verified` with `collectionSuspended=false`, `checkoutEnabled=true` and `invoiceEnabled=true` on both services. Explicit authorization, explicit unsuspension, and the independent checkout/invoice flags are all required. Sandbox fee-tax settings remain limited to the existing test policies.

The native merchandise refund policy is frozen with each purchase. The Stage B1 example defaults `ALLOW_VENDOR_REFUND_REQUESTS` to `false`. To qualify vendor original-unit refunds, use a staging release already authorized to set `ALLOW_VENDOR_REFUND_REQUESTS=true` on API and worker before placing the dedicated refund fixture order. Keep the existing policy version and calculation rules. If that existing permission is disabled in the approved staging policy, record the merchandise refund check as blocked and qualify invoice refunds independently.

## Hosted payment acceptance

Sign in through `https://staging-auth.farmerlane.com/account/login` with dedicated provisioned testers. Use two dedicated vendor owner workspaces and one dedicated market owner workspace, with independent Sandbox merchants. Use an existing provisioned customer for both storefront purchases and a vendor with an approved participation and spot assignment for booth billing. Confirm the canonical vendor and market hosts in their `/vendor/storefront` and `/market/storefront` settings. Use the published registry origin, such as `https://cedar-bend.farmerlane.com`, only if it is the designated fixture's assigned domain. Use a separate fixture for any decline, interrupted payment, or refund scenario that needs independent state.

| Check                      | Operator action and expected result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vendor purchase            | Publish a product with positive test inventory and an enabled pickup fulfillment option. Sign in as the provisioned customer on the vendor's published host. Add two units, open `/checkout`, confirm pickup, inspect the tax and fee breakdown and pay by test card. `/checkout/success` should show one owned order. Check `/vendor/orders` and `/vendor/finances` in the original vendor workspace for the exact order and financial amounts.                                                                                                                                                                                                      |
| Market purchase            | Publish an upcoming orderable market occurrence with pickup and eligible inventory from both vendors. Add at least one item from each. On that market's `/checkout`, pay from the same provisioned customer account. Verify one purchase, separate seller obligations and direct Stripe charges to the two original vendor accounts. Each vendor sees its assigned portion. Verify the applicable market order view and that a third workspace cannot read or modify the purchase.                                                                                                                                                                    |
| Tax, fees and refunds      | Use at least one taxable line. Match app-calculated item/tax/fee amounts, checkout total, Stripe amounts and the vendor allocations to the cent. The zero-percent Vendure baseline must leave the Farmerlane tax represented exactly once. From `/vendor/orders` use **Refund items** with the existing grant. Refund one of the two paid units and verify the approved customer amount plus any corresponding application-fee refund, then validate the remaining eligible refund on the original charge if desired.                                                                                                                                 |
| Invoice collection         | As manager, open `https://staging-admin.farmerlane.com/market/booth-billing/<occurrenceId>`. Issue USD booth/rental invoices to an approved vendor spot assignment. Use a $100 open invoice with no tax or unsupported adjustments and a second invoice with a partial cash payment or an existing adjustment. A vendor test payer opens `https://staging-admin.farmerlane.com/vendor/booths`, chooses **View invoice → Pay invoice** and confirms the displayed principal and fee. Confirm the native principal, exact direct charge to the market account and platform fee separately. A wholly cash-paid invoice stays paid without a card action. |
| Invoice refunds            | In the same manager billing route, use the original card collection's refund control. Exercise a supported partial refund on one fixture and a full refund on another. Match invoice status/history, credit and fee legs to the original provider IDs and amounts. Confirm the vendor sees the corresponding owned record and cannot act as manager.                                                                                                                                                                                                                                                                                                  |
| Decline and authentication | Use fresh orders/invoices. For a decline require no placement or paid status. For 3DS use the Stripe Sandbox challenge, complete it and verify one financial effect. Test a canceled challenge separately. For a redirect, require the canonical storefront return or the owned vendor invoice route and a clean URL after the application's redirect cleanup. A browser return alone cannot mark a payment paid.                                                                                                                                                                                                                                     |
| Deliveries and retry       | Check the connected payment events and platform `application_fee.created`/refund events in **Workbench → Webhooks → Event deliveries**. Resend one previously delivered event on its original destination. Confirm one receipt/effect and unchanged order, invoice and refund counts. Redeploy API and worker while monitoring selected records and verify existing balances and reconciliation state survive.                                                                                                                                                                                                                                        |
| Suspension                 | Apply the suspension procedure below and start a new order/invoice as the same users. Require no new payment initiation. Verify signed event delivery, historical records and recovery continue. Restore collection only with explicit authorization and both releases healthy.                                                                                                                                                                                                                                                                                                                                                                       |

Use Stripe's Visa success `4242424242424242`, generic decline `4000000000000002`, and US-issued required 3DS `4000008400000027` with a future expiry and any three-digit test CVC. For a market decline after the platform SetupIntent succeeds, use `4000000000000341`, which Stripe permits attaching before it declines a charge. Use test-only cardholder and merchant information. [Stripe testing cards and authentication](https://docs.stripe.com/testing)

Local manual qualification uses dedicated feature fixtures on `vendure_demo_market_ops` through the existing `demo:market-operations:serve`, `:worker`, `:admin` and `:storefront` scripts. The existing `:stripe-connect-fixtures`, `:preorder-fee-fixtures` and `:invoice-fixtures` fixture commands are described in the prior phase reports. Automated suites use guarded disposable databases. [Checkout fixtures](STRIPE_CONNECT_PHASE_E.md) · [Invoice fixtures](STRIPE_CONNECT_PHASE_G.md)

## Diagnostics and recovery

- `startup_failed` and `worker_startup_failed` surface approved Stripe configuration codes for invalid credentials, flags and destination settings. `stripe_initialization_failed` records a provider identity mismatch or connection failure. Verify the expected platform ID, the runtime key's Sandbox selection, and outbound provider connectivity. Use the settings page's readiness reasons to distinguish stale account evidence, outstanding requirements and missing card capability. Check the same connected account under the approved workspace and Sandbox.
- Match `X-Request-Id` to `stripe_oauth_callback_rejected`, `stripe_oauth_exchange_failed` or `stripe_webhook_rejected` on API. For OAuth, verify the exact redirect, original workspace, original actor and state lifetime. An ambiguous exchange goes to review. For webhooks, confirm the destination, signing secret, version, scope and delivery status. Keep delivery payloads and tokens out of operational logs and tickets.
- Match `stripe_webhook_received` to `stripe_webhook_processed` or `stripe_webhook_processing_failed` using the internal receipt ID. Checkout/invoice operation failures carry an internal group or collection ID and operation kind. The existing SuperAdmin-only `stripePaymentReconciliation(limit: 100)` read and `stripe_recovery_stage_failed` / `stripe_recovery_completed` logs expose pending work, account mismatches and reconciliation codes without raw provider data. Use the current Stripe object under the original account and environment to verify the record before retrying.
- To suspend collection, set `STRIPE_COLLECTION_SUSPENDED=true` on **both** API and worker and redeploy promptly. If releasing sequentially, suspend the API first to stop new attempts. Keep `STRIPE_ENABLED`, checkout/invoice flags, Sandbox authorization, webhook credentials, recovery and historical refunds enabled so existing resources remain readable and recoverable. The gate blocks new attempts and further collection mutations, including capture. Existing confirmed provider effects can be observed and reconciled. Pending intents may need cancellation, compensation or authorized review. Railway applies the switch when the affected release starts, so verify all old replicas have stopped and both services report suspension.
- For a frontend or gateway regression after payments exist, restore the last compatible staging frontend build or gateway release while retaining the three receiving routes, signed receipts and worker processing. Prefer a suspended known-good backend with compatible ingress and the same database and credentials. A pre-activation backend/gateway removes the routes and is suitable only after existing work has been reconciled or an operator has made a delivery recovery plan. Keep destinations and signing keys available for Workbench retries. Preserve payment journals, refunds, receipts and the database during rollback.

## Local verification and files

- Passed the Admin, Astro, Vendure API and worker release builds, the dynamic Caddy/Frontend topology suite, and the hosted API and production hardening policy checks. The synthetic HTTP suite checked path/method/authority admission, unchanged webhook body and signature forwarding, checkout CSP and return cleanup on a dynamically registered host, and denial for an unpublished host.
- The focused production policy and Stripe transport suite passed with mocked Stripe account, Balance and OAuth responses and SDK-signed fixtures. It checked platform mismatch, test/live separation, correct and incorrect signatures, byte alteration, signing secret scope and timestamp tolerance. On guarded disposable databases, checkout and order refunds passed 27 groups, invoices passed 15, invoice adjustments/refunds passed 15, and foundational tax passed the vendor and market checkout checks. Frontend Stripe phases C, E, F and G passed 57 tests.
- The focused OAuth run on the current checkout database fixture passed Standard OAuth for both vendor and market owners, callback destinations, actor/workspace binding, expiration, replay rejection and denial without financial authority. A signed market payout receipt reached reconciliation review without a vendor ledger write. Reproduce this run from the Vendure directory with `node node_modules/ts-node/dist/bin.js --project test/payments-stripe/phase-e.tsconfig.json test/payments-stripe/phase-e.ts --hosted-oauth-only`.
- The older backend accounts suite stopped at missing `Market.ownerVendorId`. The legacy focused Stripe and broader commerce suites stopped during fixture setup at missing `Administrator.avatarId` and `seller_translation`. The Phase D frontend suite has six fee-label expectations for “Online payment fee” where the existing storefront renders “Preorder fee.” Both focused frontend typechecks stop at `packages/ui/src/table-navigation.ts` (`target` may be undefined). Scoped lint reports existing React hook rules in `AdminShell.tsx` and `management/payments.tsx`, and the repository boundary check stops at `DashboardWidgets.tsx`. The generic Vendure build also tried to build its scaffold dashboard and required `APP_ENV`; the actual hosted API and worker build targets passed. The older fixture failures and unrelated checks were left as found.
- Web changes cover `scripts/Caddyfile.hosted`, `scripts/serve-admin.ts`, `scripts/test-hosted-topology.ts`, `packages/config/src/security.ts`, `apps/storefront/src/middleware.ts`, `apps/admin/src/AdminShell.tsx`, `apps/admin/src/vendor/common.tsx`, `apps/admin/src/env.d.ts`, `apps/admin/vite.config.ts` and `tsconfig.stripe-connect-phase-g.json`.
- Admin's existing `management/payments.tsx` and `settings/SettingsWorkspace.tsx` now describe test mode without saying simulated collection is always off. `tests/stripe-connect-phase-c.test.tsx` checks the updated copy.
- Vendure changes cover `src/{hosted-api,index,index-worker,production-policy,production-http}.ts` and `src/plugins/payments/{account.service,api,checkout.service,invoice.service,payments.plugin,production-policy,stripe-transport,webhook.service}.ts`. Tests changed in `test/production-hardening/{policy,hosted}.ts` and `test/payments-stripe/{phase-e,phase-h}.ts`.
- Automated qualification uses synthetic loopback topology, mocked Stripe SDK/transport and disposable database fixtures. Hosted signatures, connected accounts, card confirmation and Workbench deliveries still require Stages C and D. Existing card-only US and USD payment constraints, fee-tax assumptions, original-account refund rules and reconciliation review limits apply. Live collection and new providers remain disabled.
