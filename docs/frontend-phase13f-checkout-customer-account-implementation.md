# Phase 13F checkout and customer account implementation

## Summary

Phase 13F delivers local and architectural checkout, passwordless account access and centralized SSO foundations. Classification: **REAL FULL-STACK PASS**. Production Stripe shopper payment remains **UNCONFIGURED**. Real Stripe qualification is **NOT_EXECUTED**.

The real Chromium acceptance flow completed an anonymous Vendor purchase, an anonymous Market purchase containing Vendors A and B, a later claim of the original Customer/User, cross-Storefront history, both SSO directions, sign out everywhere, claimed-account magic login and an authenticated third purchase. Fixture mode was OFF. No GraphQL responses were mocked in these acceptance flows.

## Product decision: purchase first / claim later

Contact entry and payment do not require registration, a password, an email click or a login. Successful unclaimed purchases remain valid indefinitely. A fresh account link can claim the same historical identity later; only individual capabilities expire. Success offers optional account access after payment. No account requirement was added before purchase.

## Repository write boundaries

Frontend work is confined to E:\coding\farmers-market-platform-web. Authorized backend work is confined to E:\coding\farmers-market-platform and checkout/contact/customer/account/session behavior, necessary provider attribution compatibility, additive persistence and disposable tests.

Vendor/Market ownership, catalog ownership, InventoryCoordinator mathematics, occurrence caps, seller grouping, OrderLineLink identity, financial formulas, refunds, Connect ownership, transfers/payout policy, POS, marketing policy, billing, analytics and unrelated Admin behavior were not redesigned.

## FRONTEND_NO_EVIDENCE confirmation

The first frontend shell operation set and verified FRONTEND_NO_EVIDENCE=true before any frontend generation, regression, build or integration command. It was set again for subsequent frontend commands. Browser commands used the existing absolute Playwright no-evidence preload. Screenshots, videos and traces were off. The backend regression preload virtualized legacy runtime reporters, including recursive children and fresh-process fake transport effects, in process memory without weakening their assertions.

No Phase 13F evidence directory, screenshot, acceptance JSON, result JSON, retained test/build log, trace or additional report was produced. Generated GraphQL schema/provenance/types are source contract artifacts, not acceptance evidence. Transient live-harness readiness files contain synthetic fixture configuration only and are removed with their owned runtime directory.

## Pre-existing Git state

Frontend HEAD: f7a87c7f6d0d59a86c91e77535aff270a1991008. Backend HEAD: d0f2e0a97823b5bfb6f2320c96c2d7af7a2e0993.

Both repositories already contained substantial local work. Frontend README was modified and most of its project was untracked. Backend had modified and untracked previous-phase source, migration, harness and historical runtime files. Baseline status/HEAD were read before edits. The sandboxed backend status read required an authorized local retry because the sandbox did not recognize the worktree.

Initial SHA-256 maps for 456 frontend and 1,235 backend files were retained in tool memory only. The complete in-memory comparison before the usage interruption identified this phase's intended changes separately from the ordinary diff against HEAD. Subsequent changes were confined to the recorded checkout/account paths and suppressed generation/test commands. Historical evidence and all old migrations remain byte-for-byte unchanged. No reset, clean, stash, discard, commit, push, remote branch change or PR action occurred.

## Native Vendure identity characterization

Installed Vendure 3.7.3 source was inspected before adding schema. Customer remains the shared profile; User remains the authentication identity. Customer.user is an eager one-to-one link with a unique join constraint. Native Customer.emailAddress and User.identifier do not have unique email constraints. Native normalizeEmailAddress trims and lowercases email-like values. Soft-deleted identities are excluded from matching.

UserService.createCustomerUser supplies the native Customer role and NativeAuthenticationMethod. With no password, the native password hash is empty; requireVerification leaves account verification pending. Native registration can create/reuse profiles and emits native registration events, but does not serialize the two concurrent checkout identity writers required here.

Installed native registration also preserves an existing User's saved profile and native credential. Anonymous registration cannot overwrite the password on this linked unclaimed User. Adding a native credential to an existing external account requires email activation. Phase 13F does not introduce password setup or another password store.

AuthGuard Owner operations create native AnonymousSession authority. ActiveOrderService persists session active-order state without necessarily replacing the current request's cached context object. Anonymous ownership therefore checks durable native Session or the checkout-contact session binding. AuthService.createAuthenticatedSessionForUser is used only after email proof, with the installed native strategy and native merge/session primitives.

Native Session is cart/channel-aware and its bearer authority is not bound to one unrelated browser origin. It is unsuitable as a shared merchant cookie or central origin identity store. Native AuthService logout deletes all sessions for the User; direct entity removal alone does not clear the session cache. Current-session logout explicitly clears the native cache, while customer-only sign out everywhere uses native SessionService deletion. Administrative/dual-role identities are excluded from customer capability authentication.

Native session creation loads the anonymous cart with its Customer and refuses to merge an already customer-linked guest Order. Signing in therefore does not reparent a frozen checkout to another account. Contact/placement identity checks independently retain the exact Customer/User binding.

## Customer/User lifecycle

Anonymous means a native anonymous browser session without a canonical customer attached to checkout. Contact creates/reuses one Customer linked to one native User. New checkout Users have the Customer role, no password and verified=false. This is the unclaimed state, not another identity table. Claim sets verified=true on that same User and issues native authenticated Shop sessions. No purchase is copied, reparented or migrated during claim.

## Unclaimed identity behavior

Matching uses the native normalized email under PostgreSQL pg_advisory_xact_lock in the identity transaction. Two independent checkouts using the same previously unseen normalized email produced one Customer and one User. Existing unclaimed and claimed identities are reused without overwriting their saved profile or returning account state.

Ambiguous legacy matches, inconsistent Customer/User email pairs, soft-deleted links, administrative Users and Users with non-customer roles fail closed. No automatic legacy merge is attempted. Authenticated checkout uses the current verified Customer/User and fixes its authoritative account email.

## Checkout contact

setCheckoutContact accepts first name, last name, email and optional phone only. Shop session/cart context determines the Order. No customerId, userId, tenant, channel or order authority is accepted. Generic native setOrderCustomer is rejected on public Storefront Shop requests, including aliased/fragmented requests.

The uniform response contains entered contact only. Matching a claimed email never reveals saved names, phone, addresses, history or account state. Anonymous payment using an existing claimed email was placed against the same canonical Customer. Authenticated checkout prefills shared profile data, fixes email, and keeps edited names/phone checkout-specific.

Native Order.customer would otherwise expose the canonical saved profile through an anonymous activeOrder. Storefront Shop requests therefore reject that native customer graph, including aliases and fragments, and use checkout contact or the verified customerAccountProfile projection. The real API harness checks rejection for both claimed-email and unclaimed checkouts.

## Historical contact persistence

Native Order.customer references a mutable profile; Phase 6 freezes identity/money but does not preserve entered contact. CheckoutContact therefore stores one root Order, exact Customer/User, originating anonymous session ID, entered names, normalized email, optional phone and timestamps. It freezes once payment begins. Database UPDATE/DELETE protection preserves frozen contact, including after profile changes and account claim.

The transient session ID is an opaque historical ownership reference without a Session foreign key, so native session cleanup does not erase purchase contact. Order/Customer/User foreign keys are restrictive. Contact survives unclaimed abandonment of account access and committed purchase email failure.

## Magic-link architecture

One flow serves claim and sign-in. A cryptographically random 32-byte capability is placed only in the outbound central-origin email URL. The database stores its SHA-256 digest, native identity/email binding, purpose, timestamps and approved Storefront origin. Claim verifies the existing User, creates a central capability and redirects through the approved merchant sign-in route to establish a native Shop session.

Account email reuses Phase 10's account transport boundary. Configuration uses the same optional ResendAccountEmailSender instance as native account email, or the existing Nodemailer file transport in development. Acceptance uses a synthetic sender and in-memory mailbox capture. No real email provider call occurred. Production without transport still allows purchase and displays account delivery unavailable with a later request path.

## Magic-link security

Tokens default to 900 seconds, bounded to 60 through 3,600 seconds. PostgreSQL locking and consumedAt enforce one use. Concurrent claims produced exactly one success; replay, expiry, tampering, foreign tokens, changed email and administrative role elevation were denied.

Rate limits are durable, with HMAC email/boundary keys and a 15-minute window: three requests per normalized email and twenty per server-derived client boundary. Account existence, throttle and delivery rejection share an enumeration-resistant public receipt. Delivery readiness exposes configuration only. Purchase-specific accepted wording requires actual sender acceptance. Per-purchase issuance is durably idempotent across refresh and double-click. Email failure leaves settled payment, allocation, relationships and original identity committed.

Creation, expiry and consumption use the database clock. Raw magic/handoff/central capabilities are never custom database fields, audit data, evidence or diagnostic output. Magic URL history is removed before the claim form submits; capability values stay in process memory and cookie/form/outbound URL boundaries only.

## Central SSO architecture

PLATFORM_ACCOUNT_ORIGIN and a server-only PLATFORM_ACCOUNT_BRIDGE_KEY are explicit configuration. No production hostname is hardcoded. Production rejects HTTP origins. The central origin renders account security routes in apps/storefront and never resolves to a Vendor, Market or Channel.

CENTRAL capabilities are thin identity/session authority bound to native User/Customer, verified email and revocation state. The central HttpOnly host-only SameSite=Lax cookie is Secure for HTTPS and bounded to seven days. Backend central TTL defaults to seven days and is configurable from 300 to 2,592,000 seconds; backend expiry remains authoritative. It rotates on deliberate SSO handoff.

SSO discovery occurs on account routes or explicit sign-in, not ordinary anonymous browsing. Checkout remains purchase-first and does not force a central round trip.

## Cross-domain handoff

A top-level central round trip issues a random, single-use HANDOFF bound to the approved Storefront ID, exact canonical origin and a merchant-generated HttpOnly correlation nonce. Handoff TTL defaults to sixty seconds, bounded to ten through 120 seconds. The server derives the fixed /auth/callback route rather than accepting arbitrary return paths.

Foreign Storefront, changed return input, missing/wrong correlation, expired and replayed codes are denied. Concurrent exchange produced one native session result. Malicious https://evil.example, protocol-relative, javascript, encoded host confusion, userinfo and foreign Storefront inputs failed.

The callback exchanges the capability server-side, forwards native signed HttpOnly session cookies to that merchant only, then redirects to /account and removes the code. Neither native session credentials nor central credentials travel in query strings or localStorage. Real Market A to Vendor A and Vendor A to Market B worked with no new email or email entry.

## Logout behavior

Sign out ends the current native merchant session and redirects to explicit central logout controls. Central sign out revokes the current central capability and pending handoffs, preventing immediate silent re-login from it. Other already authenticated merchant sessions may remain until expiry or sign out everywhere.

Sign out everywhere revokes this customer's central capabilities, pending handoffs and active native authenticated sessions, including cached session authority. The flow only accepts customer-only Users without an Administrator identity, so it cannot revoke an Admin User's sessions. Native Session lacks a durable Shop/Admin distinction; dual-role magic access is deliberately refused rather than granting or revoking administrative authority.

## Checkout routes

The shared Astro app implements /cart, /checkout, /checkout/success, /account, /account/sign-in, /account/orders, /account/orders/[id] and /auth/callback. Central claim/logout routes remain in the same app. Account, authentication, checkout and success are noindex, private and uncached. Private values are excluded from SEO metadata.

## Contact step

A separate keyboard-accessible form collects required first/last/email and optional pickup phone. Browser validation, associated labels, bounded fields, safe errors and focus transitions support correction. Verified checkout email is read-only and independently enforced on the server.

## Pickup step

availableOwnedPickup and selectOwnedPickup supply and validate Vendor ownership. Direct carts require one method for their Vendor. Market carts require one per purchased Vendor. A single option may be displayed/preselected; the backend price is visible. Missing and foreign pickup choices block begin. No frontend ShippingMethod ownership map, Market-wide method or delivery system was added.

## Review step

Review displays Storefront context, occurrence/pickup promise, Vendor groups, entered contact, native lines, coupon adjustments, tax, shipping fees and total. All money values come from backend native Order projections. formatMoney uses exact integer/BigInt formatting; React never computes final totals.

## Payment step

The first attempt uses CheckoutCoordinator and the existing InventoryCoordinator. Real physical/cap holds, pricing, offering and pickup-policy revalidation remain authoritative. Contact is frozen before payment. Held cart/contact edits are denied. Deliberate cancellation uses coordinated release and compensation semantics.

currentCheckoutStatus provides owned safe display/attempt/payment state for reload and recovery. Existing attempts are resumed rather than begun again. The safe payment status distinguishes not started, pending, succeeded, failed and reconciliation required without provider IDs. Pending/reconciliation results display uncertain status and cannot be shown as success or blindly submitted again. Only a committed placement navigates to confirmation. Expiry, missing capacity and invalidated checkout do not render success.

## Direct Vendor placement

The real browser created a DIRECT_VENDOR native Regular Order, one settled customer Payment, native physical allocation, exact financial snapshot and Vendor purchase relationship. There was no seller split. Duplicate finalization produced one committed purchase/payment.

## Market placement

Real one-Vendor Shop integration preserved Aggregate plus one Seller. Real Chromium purchased Vendors A and B through one occurrence and produced one Aggregate, two Sellers and one settled customer Payment on the Aggregate. Sellers had zero Payments.

OrderLineLinks, operational Seller allocations, zero Aggregate stock movements, exact occurrence commitments, financial Vendor allocations and relationships were asserted in disposable PostgreSQL. No grouping, allocation mathematics or financial formulas were altered.

## Provider availability

Explicit dev/test local composition is AVAILABLE/LOCAL only when the existing guarded adapter permits it. A bound external provider remains UNCONFIGURED because the shopper confirmation contract is incomplete. Unconfigured production payment fails closed and cannot use local simulation. Provider-neutral begin/finalize/release adapters and safe recovery projection are wired; the missing browser workflow is CHECKOUT-B1.

Local and Stripe bindings remain mutually exclusive. FundsFlowPolicy is NOT_CONFIGURED. No fees, charges-routing, transfers, reserves, payout timings or dispute-loss policy were chosen.

## Stripe external status

Stripe sandbox and live qualification: **NOT_EXECUTED**. There were no real Stripe PaymentIntents, charges, transfers or payouts, and no real Resend/Twilio sends. Offline/deterministic Stripe regression uses the existing fake transports only.

## Customer Account

Authenticated home displays shared name/email/optional phone and recent purchases with all-orders and sign-out links. It requires email proof and a native verified customer session. No password setup, tenant account duplication, direct email mutation or delivery address book was implemented. Profile editing/email changes are deferred; checkout edits do not silently save a global profile.

## Purchase history

myPurchases is the sole history contract, with bounded server paging (ten per page; three for recent purchases). Direct roots appear once; Market roots appear once with Vendor portions underneath. Seller Orders are not additional customer purchases. The owner sees their own history across Storefronts.

## Order detail

myPurchase(orderId) provides the safe root purchase, origin, occurrence, lines, quantities, Vendor portions, pickup promise/status and financial original/refunded/remaining amounts. Financial wording uses the existing paid/refunded projection and remains independent of operational pickup status.

Foreign root and Seller IDs are denied. Session-scoped success reads the committed purchase without re-paying, re-placing or repeatedly issuing mail. Payment entity graphs, provider IDs, account mappings, transfers, payouts and Vendor financial internals are not selected or rendered.

## Privacy boundaries

Purchase authority remains separate from verified account-read authority. Unclaimed history is denied even after payment. Anonymous matching returns entered fields only. SSO only proves customer identity and grants no new tenant administrative permission.

Existing Phase 7 Vendor CRM and Market operational projections remain scoped. Neither can read global customer history. Customer contact snapshots are not added to public or foreign-business projections.

## Relationship behavior

Direct purchase creates/updates the purchased Vendor relationship. Market A containing Vendors A and B creates only those Vendor relationships, with no automatic Market relationship. Full-stack assertions check exact relationship owners and no Market CRM row. Account claim/SSO does not establish a business relationship.

## Marketing-consent separation

Checkout phone is an unverified observation and grants no SMS authority. Purchase, contact, claim and SSO create no CommunicationSubscription or marketing consent. The isolated acceptance composition contains no marketing capability/table, while the existing communications deterministic suite verifies verified-contact, account-email and consent boundaries.

## Migrations

One additive migration: backend src/migrations/1791240000000-CheckoutCustomerAccount.ts. It introduces checkout_contact, customer_account_capability and customer_account_rate only. Native Customer/User/Order/Payment tables and all old migrations are unchanged.

The migration adds restrictive identity/root foreign keys, unique digests/order contact, expiry and consumed-state checks, purpose/target constraints, indexes and immutable frozen-contact protection. Down refuses frozen meaningful purchase contact. Fresh migration-chain execution and preserving a populated native Customer row passed. Production migrations were not executed; only guarded disposable vendure_test_* databases were migrated.

## Full-stack integration

Reproduce from the frontend folder:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npm run test:live:checkout-account
```

The command owns disposable PostgreSQL, native backend, production-built Astro SSR, synthetic account/merchant origins, real Chromium, in-memory account mailbox and cleanup. A worker is unnecessary for these synchronous acceptance paths; durable relationship work is swept through its real consumer. Fixture mode is OFF and checkout GraphQL is never mocked.

Backend acceptance also exercises same-email concurrency, claimed-email anonymous payment, original history before/after claim, tampering/expiry/replay/concurrent consume, foreign handoff and open redirects, rate limiting, changed-email binding, non-customer role refusal, frozen contact, missing/foreign pickup, held-cart mutation, attempt recovery, duplicate finalization, release, expiry, last-unit denial and email-failure isolation.

Failed development runs were corrected and rerun. Their owned disposable databases and transient configuration directories were cleaned. No failure artifacts were retained. Sandbox loopback restrictions required authorized local execution for real server/browser commands. Automatic approval review rejected relaxing the payment identity check; the stricter check was retained and its offline regression passed.

## Backend regressions

The evidence-suppressed permanent communications command passed its focused/fresh-process work and recursive POS dependency chain through Phases 1-8, including native identity, markets, catalog, inventory/capacity, commerce, paid attribution/refunds, relationships and deterministic payments. No optional external-provider runner was invoked.

The focused payments-stripe suite passed again after canonical checkout User attribution support. Backend integration TypeScript and backend server/worker/dashboard build passed. Existing price/offering/pickup quote drift, scoped CRM and Admin authority checks remain covered by the permanent suites.

## Frontend regressions

| Command                             | Final result                                                   |
| ----------------------------------- | -------------------------------------------------------------- |
| npm run graphql:schema              | PASS; source extraction only                                   |
| npm run graphql:codegen             | PASS; reproducible generated contract                          |
| npm run typecheck                   | PASS; 44 Astro files, zero errors/warnings/hints               |
| npm run lint                        | PASS; package boundaries, ESLint and Prettier                  |
| npm run test                        | PASS; 184 tests in seven files                                 |
| npm run test:e2e                    | PASS; 33 existing browser tests                                |
| npm run test:live:vendor-storefront | PASS; seven real browser tests                                 |
| npm run test:live:market-storefront | PASS; five real browser tests                                  |
| npm run test:live:checkout-account  | PASS; one complete real lifecycle test plus backend assertions |
| npm run build                       | PASS; Storefront and Admin                                     |
| npm run check:bundles               | PASS; 65 production artifacts                                  |

Combined frontend results: 184 unit tests and 46 browser tests passed across the four browser commands. Admin regression includes both Vendor and Market modules. The Admin build retains its existing large-chunk warning; it is not a failed build.

## Accessibility

Axe passed for contact, pickup, review, local payment state, success, magic-link request, account home, order history and order detail. Tests ran programmatically without media capture. Keyboard contact entry, form submission, stage focus, pickup controls, review, cancellation/status controls and request-link form remain accessible.

## Responsive checks

390, 768 and 1,280 pixels were checked throughout checkout/account, including repeated authenticated and unclaimed flows. No tested page had page-level horizontal overflow. Existing Vendor/Market storefront and Admin responsive/axe regressions also passed.

## Protected DB confirmation

Every automated database create/migrate/checkout/drop used guarded loopback vendure_test_* names. The protected vendure database was not used or modified. Cleanup refused non-test targets and removed only databases created for this task.

## Provider/deployment confirmation

No external provider, hosting project, deployment, DNS, remote Git, production migration, live payment qualification or Phase 13G work occurred. Local .localhost SSO does not close production deployment policy.

## CHECKOUT-B blockers

### CHECKOUT-B1: shopper provider confirmation contract

Required workflow: a configured production provider lets the shopper authorize/confirm payment in the browser, then safely recover/finalize the same checkout attempt.

Current source: Phase 8 beginProviderCheckout/finalizeProviderCheckout/releaseProviderCheckout return attemptId, orderId and state. Provider transport and reconciliation are durable server-side; there is no reviewed safe public browser confirmation payload/client secret or browser-action contract. FundsFlowPolicy remains NOT_CONFIGURED.

Missing contract: provider-neutral shopper action/readiness and confirmation/exchange API with exact attempt, quote and ownership binding. Unsafe workarounds rejected: exposing ProviderOperation/Payment internals, deriving readiness from environment alone, inventing funds flow or silently using local simulation in production.

Recommended future solution: separately define funds-flow policy, add a bounded provider-neutral shopper confirmation contract, then explicitly qualify a real authorized test provider and production domain/proxy policy.

Frontend consequence: typed provider adapters and safe status/recovery are present, but production payment is unavailable. No Stripe browser payment readiness is claimed.

## Git diff summary

Ordinary frontend status still contains the pre-existing modified README and untracked project tree, plus the new dedicated Playwright config. Final ordinary backend diff against HEAD reports 39 tracked modified paths with 532 insertions and 96 deletions; most are pre-existing. Those numbers are not attributed wholly to Phase 13F.

This phase's intended local source changes are listed below.
Frontend: 24 existing files changed and 23 files added, including this report.

- .env.example
- apps/storefront/src/components/Checkout.tsx
- apps/storefront/src/components/MarketCart.tsx
- apps/storefront/src/components/MarketPurchase.tsx
- apps/storefront/src/components/ProductPurchase.tsx
- apps/storefront/src/components/PurchaseDetail.astro
- apps/storefront/src/components/PurchaseSuccess.tsx
- apps/storefront/src/components/ShopSignIn.tsx
- apps/storefront/src/components/VendorCart.tsx
- apps/storefront/src/layouts/SiteLayout.astro
- apps/storefront/src/lib/account.ts
- apps/storefront/src/lib/shop.ts
- apps/storefront/src/middleware.ts
- apps/storefront/src/pages/account/index.astro
- apps/storefront/src/pages/account/orders/[id].astro
- apps/storefront/src/pages/account/orders/index.astro
- apps/storefront/src/pages/account/sign-in.astro
- apps/storefront/src/pages/api/account.ts
- apps/storefront/src/pages/api/shop.ts
- apps/storefront/src/pages/auth/callback.ts
- apps/storefront/src/pages/auth/claim.astro
- apps/storefront/src/pages/auth/logout.astro
- apps/storefront/src/pages/auth/signed-out.astro
- apps/storefront/src/pages/checkout/index.astro
- apps/storefront/src/pages/checkout/success.astro
- apps/storefront/src/styles/checkout.css
- codegen.ts
- docs/frontend-phase13f-checkout-customer-account-implementation.md
- package.json
- packages/api/operations/checkout.graphql
- packages/api/schema/admin.graphql
- packages/api/schema/provenance.json
- packages/api/schema/shop.graphql
- packages/api/src/checkout.ts
- packages/api/src/generated/shop.ts
- packages/api/src/index.ts
- packages/api/src/market-storefront.ts
- packages/api/src/storefront.ts
- playwright.checkout-account.config.ts
- playwright.config.ts
- scripts/checkout-terminal-reporter.ts
- scripts/extract-schema.ts
- scripts/test-checkout-account.ts
- tests/e2e/checkout-account-live.spec.ts
- tests/e2e/market-storefront-live.spec.ts
- tests/e2e/storefront-live.spec.ts
- tests/e2e/storefront-session.ts

Backend: 19 existing files changed and seven files added. The generated native GraphQL environment file changed through the authorized backend build and safe Vendor-portion name addition.

- src/gql/graphql-env.d.ts
- src/migrations/1791240000000-CheckoutCustomerAccount.ts
- src/plugins/marketplace-commerce/commerce/checkout-coordinator.ts
- src/plugins/marketplace-commerce/commerce/contracts.ts
- src/plugins/marketplace-commerce/commerce/order-context.service.ts
- src/plugins/marketplace-commerce/commerce/topology.api.ts
- src/plugins/marketplace-commerce/customer-account/api.ts
- src/plugins/marketplace-commerce/customer-account/controller.ts
- src/plugins/marketplace-commerce/customer-account/entities.ts
- src/plugins/marketplace-commerce/customer-account/options.ts
- src/plugins/marketplace-commerce/customer-account/service.ts
- src/plugins/marketplace-commerce/customer-relationships/purchase-relationship-consumer.ts
- src/plugins/marketplace-commerce/financial/provider-facts.service.ts
- src/plugins/marketplace-commerce/market-public-shop.service.ts
- src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts
- src/plugins/marketplace-commerce/types.ts
- src/plugins/payments/api.ts
- src/plugins/payments/provider-executor.service.ts
- src/plugins/platform-identity/customer-relationships.service.ts
- src/plugins/platform-identity/platform-identity.plugin.ts
- src/plugins/platform-identity/shop-context.middleware.ts
- src/vendure-config.ts
- test/frontend-integration/checkout-account-run.ts
- test/frontend-integration/cookie-client.ts
- test/frontend-integration/market-storefront-run.ts
- test/frontend-integration/regression-no-evidence.cjs
  The single report is the only new Phase 13F Markdown deliverable. No dependency lockfile or historical report/evidence was changed.

## Acceptance table

All requested gates A through GY are retained. PASS means the named gate is satisfied in the local/source/offline scope described above. Production unconfigured and not-executed gates certify the deliberate closed/unexecuted state, not production payment qualification.

| Gate | Requirement                                                 | Result |
| ---- | ----------------------------------------------------------- | ------ |
| A    | Backend baseline captured                                   | PASS   |
| B    | Frontend baseline captured                                  | PASS   |
| C    | Pre-existing work preserved                                 | PASS   |
| D    | FRONTEND_NO_EVIDENCE set before frontend regressions        | PASS   |
| E    | Historical evidence untouched                               | PASS   |
| F    | No Phase13F evidence folder                                 | PASS   |
| G    | No Phase13F screenshots                                     | PASS   |
| H    | Exactly one new Phase13F Markdown report                    | PASS   |
| I    | No acceptance JSON                                          | PASS   |
| J    | No unexpected backend changes                               | PASS   |
| K    | No unexpected frontend changes                              | PASS   |
| L    | Protected vendure DB untouched                              | PASS   |
| M    | Old migrations unchanged                                    | PASS   |
| N    | Any new migration justified/additive                        | PASS   |
| O    | One canonical platform Customer identity                    | PASS   |
| P    | Native User remains authentication identity                 | PASS   |
| Q    | Purchase allowed before account claim                       | PASS   |
| R    | Checkout contact persisted                                  | PASS   |
| S    | New email creates canonical identity                        | PASS   |
| T    | Existing unclaimed email reused                             | PASS   |
| U    | Existing claimed email does not leak account existence      | PASS   |
| V    | Authenticated customer reused                               | PASS   |
| W    | Concurrent same-email checkout does not duplicate identity  | PASS   |
| X    | Account claim does not create second Customer               | PASS   |
| Y    | Account claim does not create second User                   | PASS   |
| Z    | Multiple pre-claim purchases remain on same identity        | PASS   |
| AA   | First/last name checkout support                            | PASS   |
| AB   | Email checkout support                                      | PASS   |
| AC   | Optional phone does not imply verification                  | PASS   |
| AD   | Purchase information survives no account claim              | PASS   |
| AE   | Historical contact semantics documented                     | PASS   |
| AF   | Marketing consent not created                               | PASS   |
| AG   | Market CRM relationship not auto-created                    | PASS   |
| AH   | Purchased Vendor relationships still created                | PASS   |
| AI   | Generic customer ID cannot be supplied as authority         | PASS   |
| AJ   | Claimed email cannot be silently changed in checkout        | PASS   |
| AK   | Secure random magic token                                   | PASS   |
| AL   | Raw token not persisted                                     | PASS   |
| AM   | Token hash persisted                                        | PASS   |
| AN   | Token expiry enforced                                       | PASS   |
| AO   | Single-use enforced                                         | PASS   |
| AP   | Concurrent double-consume safe                              | PASS   |
| AQ   | Tampered token denied                                       | PASS   |
| AR   | Expired token denied                                        | PASS   |
| AS   | Replay denied                                               | PASS   |
| AT   | Enumeration-resistant request                               | PASS   |
| AU   | Rate limiting                                               | PASS   |
| AV   | Unclaimed link claims/verifies account                      | PASS   |
| AW   | Claimed-account link signs in same User                     | PASS   |
| AX   | Claim creates authenticated session                         | PASS   |
| AY   | Claim email is transactional, not marketing                 | PASS   |
| AZ   | Account-email failure does not roll back purchase           | PASS   |
| BA   | Central account origin configurable                         | PASS   |
| BB   | Central identity bound to native User                       | PASS   |
| BC   | No merchant cross-domain cookie sharing                     | PASS   |
| BD   | Top-level SSO handoff                                       | PASS   |
| BE   | Central session can avoid repeated magic links              | PASS   |
| BF   | Handoff single-use                                          | PASS   |
| BG   | Handoff short-lived                                         | PASS   |
| BH   | Handoff bound to target Storefront                          | PASS   |
| BI   | Foreign Storefront handoff denied                           | PASS   |
| BJ   | Open redirects denied                                       | PASS   |
| BK   | Session credential not placed in URL                        | PASS   |
| BL   | Merchant receives own first-party session                   | PASS   |
| BM   | Vendor to Market SSO works locally                          | PASS   |
| BN   | Market to Vendor SSO works locally                          | PASS   |
| BO   | Central logout prevents immediate silent re-login           | PASS   |
| BP   | Sign-out-everywhere behavior characterized                  | PASS   |
| BQ   | Phase13A-B3 remains OPEN for production deployment          | PASS   |
| BR   | /checkout implemented                                       | PASS   |
| BS   | Contact step                                                | PASS   |
| BT   | Authenticated contact prefill safe                          | PASS   |
| BU   | Direct availableOwnedPickup                                 | PASS   |
| BV   | Direct selectOwnedPickup                                    | PASS   |
| BW   | Market pickup per Vendor                                    | PASS   |
| BX   | Foreign pickup method denied                                | PASS   |
| BY   | Missing Vendor pickup blocks checkout                       | PASS   |
| BZ   | Pickup fees backend-authoritative                           | PASS   |
| CA   | Review screen backend-authoritative                         | PASS   |
| CB   | Exact money formatting                                      | PASS   |
| CC   | Begin checkout uses coordinator                             | PASS   |
| CD   | Physical holds real                                         | PASS   |
| CE   | Market cap holds real                                       | PASS   |
| CF   | Cart editing blocked while held according to backend policy | PASS   |
| CG   | Hold expiry handled                                         | PASS   |
| CH   | Deliberate release handled                                  | PASS   |
| CI   | Refresh/recovery does not duplicate attempt                 | PASS   |
| CJ   | Duplicate submit does not duplicate Payment                 | PASS   |
| CK   | Price drift revalidated                                     | PASS   |
| CL   | Offering drift revalidated                                  | PASS   |
| CM   | Pickup quote drift revalidated                              | PASS   |
| CN   | Real direct checkout full-stack                             | PASS   |
| CO   | Native Regular Order                                        | PASS   |
| CP   | One settled customer Payment                                | PASS   |
| CQ   | Correct physical allocation                                 | PASS   |
| CR   | Financial snapshot                                          | PASS   |
| CS   | Purchase relationship                                       | PASS   |
| CT   | Customer ownership correct                                  | PASS   |
| CU   | Success page reads committed purchase                       | PASS   |
| CV   | Real Market checkout full-stack                             | PASS   |
| CW   | One-Vendor Market still creates Aggregate and Seller        | PASS   |
| CX   | Two-Vendor Market creates Aggregate and two Sellers         | PASS   |
| CY   | One customer Payment on Aggregate                           | PASS   |
| CZ   | Seller Orders have no duplicate Payment                     | PASS   |
| DA   | Exact OrderLineLinks                                        | PASS   |
| DB   | Operational allocations only on Seller lines                | PASS   |
| DC   | Aggregate has no duplicate stock movement                   | PASS   |
| DD   | Occurrence commitments correct                              | PASS   |
| DE   | Financial Vendor allocations correct                        | PASS   |
| DF   | Relationships only for purchased Vendors                    | PASS   |
| DG   | No automatic Market CRM relationship                        | PASS   |
| DH   | Unclaimed customer history denied                           | PASS   |
| DI   | Claimed customer /account works                             | PASS   |
| DJ   | myPurchases used                                            | PASS   |
| DK   | myPurchase used                                             | PASS   |
| DL   | Direct purchase appears once                                | PASS   |
| DM   | Market Aggregate appears once                               | PASS   |
| DN   | Seller Orders not duplicate purchases                       | PASS   |
| DO   | Cross-Storefront purchase history visible to owner          | PASS   |
| DP   | Foreign customer denied                                     | PASS   |
| DQ   | Seller-order ID cannot bypass root ownership                | PASS   |
| DR   | Provider/payment internals absent                           | PASS   |
| DS   | Financial status uses existing projection                   | PASS   |
| DT   | Operational status remains independent                      | PASS   |
| DU   | Account home                                                | PASS   |
| DV   | Orders list                                                 | PASS   |
| DW   | Order detail                                                | PASS   |
| DX   | Shared profile basics                                       | PASS   |
| DY   | Verified email cannot be casually overwritten               | PASS   |
| DZ   | Sign out                                                    | PASS   |
| EA   | Sign out everywhere or explicit characterization            | PASS   |
| EB   | Account pages noindex                                       | PASS   |
| EC   | Checkout pages noindex                                      | PASS   |
| ED   | Success page noindex                                        | PASS   |
| EE   | Local verified checkout works in test only                  | PASS   |
| EF   | Local adapter impossible in production                      | PASS   |
| EG   | Provider-neutral checkout adapter wired where supported     | PASS   |
| EH   | FundsFlowPolicy remains NOT_CONFIGURED                      | PASS   |
| EI   | No invented fee/transfer policy                             | PASS   |
| EJ   | Production unconfigured payment fails closed                | PASS   |
| EK   | No real Stripe calls                                        | PASS   |
| EL   | No real Resend/Twilio calls                                 | PASS   |
| EM   | Stripe sandbox NOT_EXECUTED unless explicitly authorized    | PASS   |
| EN   | Missing shopper provider fields become CHECKOUT-B blocker   | PASS   |
| EO   | No raw magic token in DB/logs                               | PASS   |
| EP   | No raw handoff token in DB/logs                             | PASS   |
| EQ   | No session token localStorage                               | PASS   |
| ER   | No open redirect                                            | PASS   |
| ES   | No email-account enumeration                                | PASS   |
| ET   | Customer A cannot access Customer B purchase                | PASS   |
| EU   | Vendor A cannot see Vendor B CRM data                       | PASS   |
| EV   | Market cannot see global Customer history                   | PASS   |
| EW   | Account claim grants no marketing consent                   | PASS   |
| EX   | Account claim grants no tenant Admin authority              | PASS   |
| EY   | No raw backend/provider errors                              | PASS   |
| EZ   | Contact step axe pass                                       | PASS   |
| FA   | Pickup step axe pass                                        | PASS   |
| FB   | Review step axe pass                                        | PASS   |
| FC   | Payment state axe pass                                      | PASS   |
| FD   | Success axe pass                                            | PASS   |
| FE   | Sign-in/magic-link axe pass                                 | PASS   |
| FF   | Account home axe pass                                       | PASS   |
| FG   | Orders axe pass                                             | PASS   |
| FH   | Order detail axe pass                                       | PASS   |
| FI   | Keyboard checkout flow                                      | PASS   |
| FJ   | 390px usable                                                | PASS   |
| FK   | 768px usable                                                | PASS   |
| FL   | 1280px usable                                               | PASS   |
| FM   | No tested page-level overflow                               | PASS   |
| FN   | Platform Identity regression                                | PASS   |
| FO   | Farmers Market regression                                   | PASS   |
| FP   | Catalog regression                                          | PASS   |
| FQ   | Inventory/Capacity regression                               | PASS   |
| FR   | Marketplace Commerce regression                             | PASS   |
| FS   | Paid Attribution/Refund regression                          | PASS   |
| FT   | Customer Relationships regression                           | PASS   |
| FU   | Payments/Stripe deterministic regression                    | PASS   |
| FV   | Communications/account-email regression                     | PASS   |
| FW   | Vendor Admin regression                                     | PASS   |
| FX   | Market Admin regression                                     | PASS   |
| FY   | Vendor Storefront regression                                | PASS   |
| FZ   | Market Storefront regression                                | PASS   |
| GA   | GraphQL schema reproducible                                 | PASS   |
| GB   | GraphQL codegen reproducible                                | PASS   |
| GC   | Frontend typecheck                                          | PASS   |
| GD   | Frontend lint                                               | PASS   |
| GE   | Frontend unit tests                                         | PASS   |
| GF   | Frontend browser tests                                      | PASS   |
| GG   | Accessibility checks                                        | PASS   |
| GH   | Backend build                                               | PASS   |
| GI   | Frontend Storefront build                                   | PASS   |
| GJ   | Frontend Admin build                                        | PASS   |
| GK   | Root build                                                  | PASS   |
| GL   | Bundle fixture-marker checks                                | PASS   |
| GM   | No delivery implementation                                  | PASS   |
| GN   | No Vendor-origin Market preorder                            | PASS   |
| GO   | No Platform Admin                                           | PASS   |
| GP   | No POS UI                                                   | PASS   |
| GQ   | No marketing campaigns                                      | PASS   |
| GR   | No billing UI                                               | PASS   |
| GS   | No production FundsFlowPolicy decision                      | PASS   |
| GT   | No live provider qualification                              | PASS   |
| GU   | No deployment                                               | PASS   |
| GV   | No DNS changes                                              | PASS   |
| GW   | No remote Git actions                                       | PASS   |
| GX   | No Phase13G implementation                                  | PASS   |
| GY   | No Phase13H production-hardening claim                      | PASS   |

## Remaining Phase13A blockers

| Blocker                                                    | Status                       |
| ---------------------------------------------------------- | ---------------------------- |
| Phase13A-B1 public hostname resolver                       | Previously CLOSED; preserved |
| Phase13A-B2 API gap closure                                | Previously CLOSED; preserved |
| Phase13A-B3 production many-domain cookie/CORS/CSRF policy | OPEN                         |
| Phase13A-B4 Market communications contract inconsistency   | OPEN                         |

Local SSO protocols do not qualify production domain, proxy, CORS, cookie or CSRF deployment. Market communications inconsistency is unrelated and remains open.

## Deferred Phase13G/13H work

Phase 13G was not begun. Vendor-origin Market preorder, delivery, Platform Admin, POS, marketing campaigns and billing UI remain outside this work. Phase 13H must characterize real production domain/proxy/security deployment. Production funds-flow decisions, shopper provider confirmation and real Stripe qualification require separate explicit authorization.

## Local files and commands

Checkout/account components, server routes/bridges, named GraphQL operations/adapters, schema generation and the real disposable integration command are the frontend changes. Backend changes are the narrow customer account service/entity/migration, native checkout/session authority compatibility, account transport composition and tests.

To reproduce ordinary frontend browser tests without retaining evidence:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
$env:NODE_OPTIONS='--require=E:/coding/farmers-market-platform-web/scripts/playwright-no-evidence.cjs'
npm run test:e2e
```

To reproduce the existing recursive backend regressions from the backend folder:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
$env:NODE_OPTIONS='--require=E:/coding/farmers-market-platform/test/frontend-integration/regression-no-evidence.cjs'
npm run test:communications
```

No deployment command is needed. The dedicated checkout live command supplies its own disposable composition. Ordinary local account development requires matching central origin/bridge secret in both servers, approved synthetic Storefront hosts/local port, native commerce, ENABLE_PAID_ATTRIBUTION, the existing explicit refund policy version and customer relationships. Local payment additionally requires explicit dev/test adapter configuration. Production requires HTTPS and remains payment-unconfigured.

Acceptance totals: **207 PASS, 0 FAIL, 0 INCONCLUSIVE** within the local/source/offline scope. Production provider/deployment qualification remains outside the pass classification.
