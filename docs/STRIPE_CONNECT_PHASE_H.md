# Stripe Connect Phase H: Production readiness and launch hardening

Completed locally on November 10, 2026, with the explicit launch blockers below. This expands the existing naming clarification into the Phase H implementation report. Previous phase reports are unchanged. All work is local in the existing web/backend projects. No production service, live account, live transaction, persistent test-database migration, established merchant account, deployment or remote Git operation was performed. No browser automation or screenshots were used.

The implementation prepares independently validated dormant production configuration, isolated staging configuration, collection/recovery controls, dispute evidence and attribution, operational reporting, and a read-only preflight. It preserves the direct-charge architecture and existing fee/refund arithmetic. It does **not** claim that the sandbox monetary policies or adapters are approved for live use. Live collection, provisioning, OAuth onboarding, financial recovery mutations and transfers remain blocked until a separately authorized implementation can bind approved production policy versions. Loading live credentials or setting an authorization flag cannot bypass this boundary.

The approved naming and compliance sections below are retained. Their original validation results describe the completed naming work; the additional Phase H implementation and qualification follow them.

## Display contract and financial boundaries

The displayed name is **Online payment fee** for both preorders and booth invoice payments. This is the intended platform checkout fee model. No card-specific surcharge system, card-funding eligibility rule, or new fee classification has been implemented.

The existing preorder platform application fee remains centrally controlled at 5% of eligible discounted merchandise. Vendor processing recovery preferences, including Automatic and existing custom modes, remain separate from that platform component. Booth invoices retain their independently configured platform and processing recovery policy. Vendor preorder preferences cannot alter invoice fees.

Automatic gross-up, backend minor-unit calculation and rounding, frozen financial snapshots, Stripe application-fee allocations, original-account identity and proportional refunds are unchanged. Estimated recovery is not an assertion of actual Stripe expense. Historical database descriptions and financial components retain their existing names and values. The naming clarification requires no migration, reseeding, provider call or database write. The separate additive Phase H evidence migration is described below.

## Local presentation changes

Existing components and approved UI primitives are reused; no new component, styling system or renderer is introduced.

- Both storefront checkout renderers show Online payment fee in per-vendor and aggregate summaries. Vendor checkout and market checkout consume these existing summaries.
- Shared CartTotals recognizes historical `Preorder fee` descriptions as well as `Online payment fee`, combines only those rows once and leaves other charges alone. Stored descriptions and amounts are not rewritten.
- PurchaseSuccess and Modern Farmhouse Success reuse the updated summaries for verified payment confirmations and their order breakdowns.
- BoothInvoicePayment uses the same name for the quote, verified completion display and historical online payments. Market Billing uses it for collection history, keeping principal and fee components distinct.
- OrderRefunds labels the original fee in the preview and shows the sum of the already returned platform, recovery and fee-tax snapshot components in refund history. The separate customer-refund and application-fee reconciliation statuses remain intact.
- Vendor settings describe the combined Online payment fee and identify the vendor-controlled portion as processing recovery. Existing preferences, validation and save payloads remain unchanged.

The customer account order projection exposes paid/refunded totals, with no combined online-fee breakdown. It is not extended with an inferred fee. No customer payment-email/PDF receipt template exists in this web project; finance expense attachments and inventory command receipts are unrelated. Production receipt qualification must include the actual backend/provider receipt surfaces and frozen fee descriptions. These remain an explicit verification requirement, rather than a claim that external receipt wording was changed.

## Compliance assessment and production approval gates

The name and calculation do not determine legality. Treat the intended platform checkout fee as the model under review. Neither numerical similarity to Stripe costs nor the new label proves a surcharge classification, a prohibition, or approval. No production approval evidence was supplied. Existing live collection and fee-policy gates remain unchanged.

| Review area                        | Observed structure and required evidence before launch                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payment-method neutrality          | Phase E documents Card Element and card-only setup/intents; Phase G also collects cards. The customer fee is quoted before card details and is not selected by credit/debit/prepaid funding type. That alone does not prove neutrality across payment methods. Inventory every offered method and online/offline channel, compare equivalent purchase totals and exemptions, and have Stripe/acquirer and counsel assess the actual arrangement. Do not add a credit-only fee branch as a naming fix.                                                                                  |
| Platform versus merchant ownership | Direct charges belong to the connected vendor or market account. Only the frozen platform component is collected as a Stripe application fee; recovery remains in connected-account gross. A customer-facing platform checkout fee and Stripe's contractual Platform Fees are distinct concepts. Confirm who supplies the checkout service, imposes and receives each component, contracts with the payer, owes tax and refunds, and acts as merchant for each flow. Application-fee routing alone does not settle that analysis.                                                      |
| Applicable rules                   | Obtain jurisdiction- and payment-method-specific review of consumer protection, pricing disclosure, network/acquirer terms and Stripe's current agreements. Visa describes separate surcharge, convenience and restricted service-fee rules; Mastercard also has specific credit-surcharge requirements and debit/prepaid exclusions. Those rules must be assessed if applicable to this structure, without assuming their classification or importing a surcharge cap into the existing platform fee model. Do not relabel the model as a convenience fee to seek automatic approval. |
| Disclosure and consent             | Review advance price presentation, the combined Online payment fee amount, total before authorization, identity of the fee owner, refund terms, required notices and receipts for both flows. Verify every supported storefront, invoice quote, confirmation and actual receipt. Record approved disclosure text/version and retain evidence of customer consent. Existing visibility is not approval of the complete disclosure journey.                                                                                                                                              |
| Tax treatment                      | Obtain separate tax determinations for preorder merchandise and invoice rental/service principal, each fee component, mixed/exempt baskets, sourcing and refund tax allocations. Texas guidance states separately stated merchant processing recovery associated with taxable sales can be part of taxable sales price. That does not by itself classify this combined platform fee or every booth rental. No tax rate, exemption or fee tax calculation has been changed. Sandbox fee-tax assumptions are not production approval.                                                    |

The release evidence must identify the reviewed model, flow, jurisdictions, supported payment methods/channels, merchant/platform responsibilities, fee basis and limits where applicable, approved disclosures and receipt presentation, tax treatment, refund rules, policy version, approvers and effective dates. Any unresolved requirement keeps its production path disabled. Invoice refund/credit and other Phase H operational gates remain independently applicable. Historical policy versions must remain authoritative for existing payments and refunds.

## Official references

Reviewed November 10, 2026. These references support the review areas, not an approval of this implementation.

- [Stripe Services Agreement, Service Terms](https://stripe.com/legal/ssa-service-terms): applicable financial-provider obligations, Connect platform fee definition and contractual responsibilities.
- [Stripe direct charges](https://docs.stripe.com/connect/direct-charges): connected-account charge context and application fees.
- [Visa rules and merchant FAQs](https://www.visa.com/en-us/support/visa-rules): regional scope, acquirer agreement, and distinct surcharge/convenience/service-fee requirements.
- [Mastercard merchant surcharge rules](https://www.mastercard.com/content/mccom/us/en/business/support/merchant-surcharge-rules.html): requirements that need review if the actual arrangement falls within surcharge rules.
- [Texas Comptroller, July 2024 Tax Policy News](https://comptroller.texas.gov/taxes/tax-policy-news/2024-july.php) and [memorandum 202406004M](https://star.comptroller.texas.gov/view/202406004M): sales-price treatment of retailer processing-cost recovery on taxable sales.

## Completed naming validation

Focused tests cover historical/current cart labels, unrelated charge preservation, both checkout and confirmation renderers, unchanged settings payloads and example totals, original-unit refund previews/history, and booth invoice quoting/history. Run from the web project:

```powershell
npx vitest run tests/stripe-connect-phase-d.test.tsx tests/stripe-connect-phase-f.test.tsx tests/stripe-connect-phase-g.test.tsx tests/storefront-checkout-ui.test.tsx --reporter=default
npm run typecheck:stripe-connect:invoices
```

Results: all 47 tests across the four focused suites passed. The targeted typecheck reports the existing unrelated `packages/ui/src/table-navigation.ts:29` TS18048 error (`target` is possibly undefined); that shared navigation file was not changed for this task.

No deployment, external production configuration or live activation is part of this change.

## Implementation and qualification status

| Status                                           | Scope and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Implemented and automated-test verified          | Pure live/test/environment validation; key and publishable-key mode matching; platform/application identity shape; HTTPS settings/callback/webhook origins; test/live and webhook-scope secret isolation; two-secret rotation bounds; fail-closed activation; new-collection suspension at admission and provider mutations; separate recovery/refund permissions; legacy Standard compatibility and readiness regressions; signed dispute ingestion, original invoice and multi-vendor payment attribution, deduplication, current-state retrieval for delayed events, immutable evidence, independent provider balance effects; read-only preflight; safe stage-failure isolation. |
| Implemented, requiring real staging verification | Environment-driven API and worker composition with staging test credentials, explicit staging fee quotation/collection authorization, permanent endpoints, key/application association, hosted Accounts v2 responsibility mapping through v1 observation, OAuth relationships, actual provider cost observations, worker scheduling/failover, external network timeouts, process restarts and secret rotation under real hosted topology. Controlled SDK/database tests do not prove external staging behavior.                                                                                                                                                                      |
| Blocked by business-policy decisions             | Independent production preorder/invoice policy versions; invoice credits, debt reopening and fee-refund rules; eligible cancellation/withdrawal cases; supported methods/currencies/jurisdictions; approved disclosure/receipt wording and consent retention. No production policy version is registered.                                                                                                                                                                                                                                                                                                                                                                            |
| Blocked by Stripe/legal/accounting approval      | Platform-versus-merchant fee ownership, payment-method neutrality, contracts and responsibility allocation, applicable network/acquirer rules, tax sourcing/allocation and reporting treatment. The earlier compliance analysis remains applicable to the actual Online payment fee structure.                                                                                                                                                                                                                                                                                                                                                                                       |
| Intentionally deferred                           | Live activation, live onboarding and provider mutations; infrastructure provisioning; domain/DNS/hosting changes; custom dispute evidence submission UI; new queue/monitoring services; general invoice refunds/credits without approved accounting authority. These were not silently replaced with new business rules.                                                                                                                                                                                                                                                                                                                                                             |

## Production configuration and account readiness

`payments/production-policy.ts` defines `STRIPE_ENVIRONMENT=dev|test|staging|production`. Local development remains compatible with the existing guarded demo configuration when this variable is absent. Staging uses TEST financial identities. Production uses LIVE financial identities. `APP_ENV=production` and `NODE_ENV=production` still activate the existing HTTP, authentication, trusted-origin, database-transport and shutdown safeguards. For hosted sandbox operation, use those production process safeguards with `STRIPE_ENVIRONMENT=staging`.

Production configuration requires all of the following values, supplied outside source control by the eventual operator:

| Configuration                                                                                                      | Requirement                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `STRIPE_LIVE_SECRET_KEY`, `STRIPE_LIVE_PUBLISHABLE_KEY`                                                            | Matching `sk_live_` and `pk_live_` keys. Test keys are rejected. No real keys were supplied or inserted.                                                                                                                                         |
| `STRIPE_LIVE_PLATFORM_ACCOUNT_ID`, `STRIPE_LIVE_CLIENT_ID`                                                         | Intended platform `acct_` identity and Connect `ca_` application. Authoritative platform GET verification is available independently of activation. Application association still requires Stripe evidence.                                      |
| `API_ORIGIN`, `ADMIN_ORIGIN`, `STRIPE_STOREFRONT_ORIGIN`                                                           | Canonical non-loopback HTTPS origins. Settings origin must match Admin. Existing storefront/account deployment origin rules remain applicable to every supported vendor/market host.                                                             |
| `STRIPE_LIVE_REDIRECT_URI`                                                                                         | Exact `API_ORIGIN/payments/stripe/oauth/callback`. No credentials, query string, fragment or substitute origin.                                                                                                                                  |
| `STRIPE_PLATFORM_WEBHOOK_URL`, `STRIPE_CONNECTED_WEBHOOK_URL`                                                      | Exact permanent `API_ORIGIN/payments/stripe/platform` and `/payments/stripe/connected`.                                                                                                                                                          |
| `STRIPE_LIVE_PLATFORM_WEBHOOK_SECRETS`, `STRIPE_LIVE_CONNECTED_WEBHOOK_SECRETS`                                    | Separate signing-secret arrays, one current secret or current plus previous during rotation, at most two per scope. Duplicates across scopes are rejected. Sandbox and production settings cannot coexist in one selected payment configuration. |
| `STRIPE_PRODUCTION_PREORDER_POLICY`, `STRIPE_PRODUCTION_INVOICE_POLICY`, `STRIPE_PRODUCTION_INVOICE_REFUND_POLICY` | Explicit independently reviewed policy versions. No supported production versions currently exist. An arbitrary string is not approval.                                                                                                          |

For staging, use the corresponding `STRIPE_TEST_*` keys/platform/application/callback/secret values, `STRIPE_SETTINGS_ORIGIN=ADMIN_ORIGIN`, and the same permanent HTTPS endpoint pattern. `STRIPE_SANDBOX_COLLECTION_AUTHORIZED=true` is required for staging collection. Preorder collection still requires `STRIPE_TEST_CHECKOUT_ENABLED=true`, its test publishable key and `STRIPE_TEST_CHECKOUT_FEE_TAX_POLICY=EXPLICIT_NO_FEE_TAX_TEST`. Invoice collection still requires its separate test authorization, policy and fee-tax flags from Phase G. These explicit test assumptions are not production tax approval. Use a dedicated staging database and staging merchant identities, never the production database or account history. The staging composition never enables the local payment simulator.

`STRIPE_LIVE_READ_ENABLED=true` permits authenticated read-only live platform/account observation when the configured payments subsystem is enabled, and verifies the platform with Stripe at bootstrap. Default is false. It does not permit onboarding or financial mutation. `STRIPE_LIVE_ONBOARDING_AUTHORIZED=true` or `STRIPE_LIVE_COLLECTION_AUTHORIZED=true` is rejected at this phase because no approved live execution path exists.

Accounts v2 hosted setup retains full Dashboard, Stripe-collected processing fees and Stripe loss responsibility requirements. Existing compatible legacy Standard-account inference remains unchanged and explicitly conflicting controller evidence still fails. Readiness retains organization/channel ownership, platform/application mapping, freshness, capability, requirements, restrictions and independent payout checks. A stored account ID or redirect does not confer collection authority. Live readiness still includes `LIVE_ACCOUNT_ACTIVATION_DISABLED`. Original account/generation mappings remain authoritative for historical refunds and disputes; no sandbox association is promoted to live.

## Collection suspension and recovery

Use the same operational settings on every API and worker process:

| Control                                     | Effect                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_COLLECTION_SUSPENDED=true`          | Reject new preorder setup/start and invoice prepare/confirm. Provider boundaries also reject new customer/setup/clone/authorization/invoice/capture calls, including attempts initiated by recovery. Existing object retrieval, cancellation, reconciliation, native completion of verified captures and permitted refunds remain available. |
| `STRIPE_RECOVERY_ENABLED=false`             | Suspend recovery sweeps explicitly. Default is enabled in local/test/staging and disabled in dormant production until explicitly configured. This is independent of collection suspension.                                                                                                                                                   |
| `STRIPE_HISTORICAL_REFUNDS_ENABLED=false`   | Block customer/application-fee refund mutations independently. Default is enabled in local/test/staging and disabled in dormant production. Reads retain original authority.                                                                                                                                                                 |
| `STRIPE_ENABLED` / configured adapter flags | Existing subsystem/composition gates remain. Do not disable or remove the configured adapter to suspend only new collection, because those older gates also remove recovery functionality. Use the collection-suspension control instead.                                                                                                    |

The demo environment allowlist accepts only boolean operational flags with its existing Stripe sandbox opt-in. It continues rejecting live credentials and unrelated external provider configuration.

The existing original-operation journals, explicit idempotency keys, 23-hour replay limits, bounded attempts, PostgreSQL advisory locks, short financial transactions and independently verified customer/application-fee refund legs remain in use. Multi-vendor checkout still authorizes all, captures all and then performs native commit. Partial capture uses existing compensation; pending compensation never implies a completed refund or fulfillment permission. Restart, lost-response, concurrent-request and disconnected-account regressions exercise these paths in isolated databases.

Recovery stages now fail independently, so a checkout-stage exception does not abandon invoice/refund/webhook processing. Fixed structured events `stripe_recovery_stage_failed` and `stripe_recovery_completed` report stage codes, counters and suspension state without exception bodies, secrets, card data or customer details. Existing Vendure durable job queues and scheduler remain the only scheduling infrastructure. A failed database query can still fail the job; that failure remains visible in the job queue and preflight. Internal bounded item retries and original reconciliation codes are retained.

## Webhooks, disputes and financial reporting

Existing early raw-body middleware and SDK signature verification remain in place. Receipt identity, signature timestamp tolerance, payload hashing, mode/scope checks, pinned API version `2026-09-30.endive`, account/platform binding, lease recovery, eight-attempt bounded receipt retry and delayed-event current-object retrieval remain authoritative. Accounts v2 thin events remain account-lifecycle hints; payload URLs are never followed. Production/staging require permanently registered HTTPS destinations. A local Stripe CLI listener is a local testing tool, not a permanent destination.

Rotation procedure for a later staging/launch operator: add the new secret alongside the previous secret for exactly its environment and scope, restart every API instance with identical settings, verify correctly signed delivery and reject wrong-scope/mode signatures, then remove the old secret after the provider overlap/retry window and restart all instances again. Record endpoint ownership, selected events, mode and API version. This task did not create or rotate external destinations.

The existing signed dispute event set covers created, updated, closed, funds withdrawn and funds reinstated. Dispute processing now serializes by original mode/account/dispute, retrieves the current object under the original connected account, and appends evidence to `stripe_effect_observation`. Evidence includes original merchant/organization, charge and PaymentIntent, native preorder payment/order or invoice collection attribution, authoritative status, amount, currency, reason, evidence deadline and actual provider balance-transaction effects where exposed. Event payload status never changes local money. Unknown original payment or unsuitable Dashboard access produces an explicit review code. Unavailable account access leaves a durable receipt for operational review.

No customer refund, application-fee refund, invoice debt reopening, order cancellation or native ledger change occurs because a dispute exists. The latest serialized observation is surfaced in the existing reconciliation report; prior evidence remains append-only. Full-Dashboard merchants use Stripe's supported Dashboard dispute workflow. Loss and contract review remain separate from a provider status such as won or lost.

The reconciliation service now returns `operationalState`, original `financialEvidence` and dispute details. The read-only Admin API query `stripePaymentReconciliation(limit: Int)` exposes this existing service only to `SuperAdmin`; it is not added to the Shop API or vendor permissions. It retains existing capture/refund/application-fee/invoice review codes, adds all unresolved webhook receipt codes to operational visibility, and separates original invoice principal, platform application fee, recovery, fee tax and gross.

The checkout SDK can observe expanded balance transactions. `providerCost.totalFee` is the actual total provider fee, while `processingFee` and `applicationFee` use their separately identified provider fee details. Missing detail is null, not an invented processing expense or an estimate substituted for actual cost. Original fee snapshots and allocations do not change. No new revenue, tax, dispute or expense posting is fabricated, and no unrelated finance dashboard is redesigned.

The additive migration `1797100000000-StripeProductionReadiness.ts` adds nullable dispute evidence JSON and a partial history index. It does not backfill, reset, reseed, rename, delete or reallocate existing financial data. It has a forward-only financial-evidence rollback boundary. It was applied only through the guarded disposable test harness, never to `vendure_demo_market_ops`.

## Invoice refund and credit boundary

The existing invoice domain supports issued principal, manual settlement, online reservations and replacement of unpaid manual invoices. `VOID_REISSUE` already rejects paid invoices, provider-linked invoices and active online reservations. Online payment principal remains independent of the fee. External Stripe refunds already move collections into review without silently changing native debt.

There is no approved general credit/refund authority that settles the following decisions: whether an incorrect/duplicate charge reopens debt; whether a canceled date or vendor withdrawal creates a credit, waiver or refund; how partial offline/online settlement affects refund priority; which platform/recovery/tax shares are refundable; who funds insufficient-balance refunds; and how a manager grants a credit without erasing payment history. No arbitrary-amount invoice refund endpoint or automatic unpaid transition was added. Production invoice collection remains blocked until those decisions and a qualified operational resolution path exist.

For a genuine future refund emergency, preserve original invoice, collection, merchant, charge, fee and provider refund identities; stop new collection; have an authorized merchant/operator use the existing Stripe Dashboard workflow under the original account; record the event and financial evidence; and reconcile the existing review state under an approved accounting decision. An external Dashboard refund by itself must not reopen debt or rewrite invoice principal. No such intervention was performed here.

## Deployment requirements and read-only preflight

Existing API/worker startup wrappers, production runtime policy, trusted proxy/origin controls, PostgreSQL pool bounds, migration lock, graceful shutdown and private credential boundaries remain. No hosting configuration, deployment project or infrastructure dependency was added.

A future release needs API and durable worker processes using the same release, database/schema, payment policy and environment identity; isolated PostgreSQL with approved transport (`verify-full` with trusted CA or explicitly approved private plaintext transport); persistent database-backed job/scheduler tables; secret injection outside source control; correctly built Admin/Astro applications using their existing production wrappers; valid account bridge and trusted vendor/market origins; HTTPS callbacks/destinations; explicit migration review/backup/roll-forward procedure; and operational ownership for reconciliation, disputes, refunds and worker failures. Server and worker startup already invoke migrations under the existing migration lock. Starting the new build against a populated database therefore also requires migration authorization.

From `E:/coding/farmers-market-platform-web`:

```powershell
npm run payments:production:preflight
```

This returns fixed-code JSON with an overall `PASS`, `BLOCKED` or `MANUAL REVIEW`, individual checks, and `liveCollection: DISABLED`. Exit codes are 0, 2 and 1 respectively. Without flags it reads local environment/source configuration only and makes no database or Stripe connection. The default local run correctly reports BLOCKED. It never bootstraps Vendure, runs migrations, creates provider objects or writes configuration.

Later authorized operators may supply `-- --database` to perform SELECT-only inspection in a PostgreSQL read-only transaction with connection/statement timeouts. It checks registered migration names, payment schema, recent scheduler and successful recovery job evidence, stalled/failed jobs, unresolved webhooks and financial obligations. No worker heartbeat is inferred from credentials. `-- --stripe-read` performs only an authenticated platform GET using the configured identity; it cannot provision an endpoint/account or charge/refund. Neither optional external check was run against production during this task.

Example future operator invocations, with environment/secret selection performed outside this command:

```powershell
npm run payments:production:preflight -- --database
npm run payments:production:preflight -- --database --stripe-read
```

Preflight checklist:

- Confirm explicit production environment and isolated live credentials, platform/application identity and non-loopback HTTPS origins.
- Confirm current independently approved preorder/invoice fee, tax, disclosure, refund and accounting policy versions. They are presently BLOCKED.
- Confirm migration state and safe collection-disabled state. Confirm no sandbox references were copied into live history.
- Confirm durable scheduler and recent successful worker completion, investigate stale jobs, webhook backlog, stuck captures, refund/application-fee legs and invoice reviews.
- Manually verify external destination mode/scope/events/API version, secret rotation, Connect application association, responsibility contracts, supported payment methods/geography and receipt disclosures.
- Complete real staging restart, duplicate/out-of-order delivery, concurrency and disconnected-account exercises. Keep production activation blocked until separate launch authorization and implementation qualification.

## Manual testing with the existing integrated database

No persistent migration, fixtures or existing account changes were performed. Preserve `vendure_demo_market_ops`, Manna Roots, Boerne and all current credentials/data. Do not use ordinary backend dev commands that select `vendure`, and never point destructive acceptance harnesses at this database.

Before running the new backend against this populated database, obtain separate migration authorization. After that authorization only, the reviewed additive migration can be applied from the web directory with:

```powershell
npm run demo:market-operations:migrate
```

Then start the integrated environment in four separate terminals from `E:/coding/farmers-market-platform-web`, using its existing ignored local sandbox settings:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Use existing saved identities and credentials. Confirm Payments settings show the same historical connections and independent charge/payout readiness, and use existing orders and invoices to verify Online payment fee labels in both storefront renderers, confirmations, fee examples and refund/payment history. Do not disconnect or change established Manna Roots/Boerne accounts as a test step. For any deliberate new sandbox payment/refund exercise, use the dedicated already-existing Phase E/G fixtures documented in those reports and preserve prior transactions.

For suspension verification after migration authorization, restart both API and worker terminals with `$env:STRIPE_COLLECTION_SUSPENDED='true'` while retaining the existing adapter/test flags. New checkout setup/start and invoice prepare/confirm must fail; historical reads and reconciliation must remain available. With recovery and historical refunds enabled, pending original sandbox refunds must reconcile through their original identities. Check the SuperAdmin report with the authenticated Admin API:

```graphql
query PhaseHPaymentOperations {
  stripePaymentReconciliation(limit: 100)
}
```

Inspect suspension state, original components, unknown versus actual provider cost, pending customer/application-fee legs, invoice discrepancy codes and disputes. Use existing worker completion records/logs to verify sweeps. After the deliberate suspension check, remove the temporary shell override (`Remove-Item Env:STRIPE_COLLECTION_SUSPENDED`) and restart the same two scripts. Do not turn on any LIVE flag. Failed, pending or review financial states must remain visible and must not be presented as refunded or paid without verification.

Provider disconnections, process interruption, ambiguous capture/refund responses, concurrency, dispute events and migration integrity are automated against disposable databases here. Real staging versions of those exercises require a separately authorized staging environment and dedicated staging merchants. Do not simulate them by editing historical records in the persistent demo database.

## Phase H local files

Backend changes are bounded to:

- `src/plugins/payments/production-policy.ts`, `production-preflight.ts`, `contracts.ts`, `payments.plugin.ts`, `stripe-transport.ts`, `checkout-contracts.ts`, `checkout-sdk.ts`, `checkout.service.ts`, `invoice-policy.ts`, `invoice.service.ts`, `refunds.service.ts`, `account.service.ts`, `entities.ts`, `webhook.service.ts`, `recovery.service.ts`, `reconciliation.service.ts` and `api.ts`.
- `src/plugins/marketplace-commerce/types.ts`, `marketplace-commerce.plugin.ts` and `financial/preorder-fee.service.ts` for explicit isolated staging quotation, plus `commerce/local-test-payment-policy.ts` for validated demo operational flags, without changing calculations.
- `src/vendure-config.ts`, `src/migrations/1797100000000-StripeProductionReadiness.ts`, `scripts/stripe-production-preflight.ts`, `scripts/market-operations-demo/environment.ts`, `scripts/market-operations-demo/guards.test.ts` and `package.json`.
- `test/payments-stripe/phase-h.ts`, `phase-h-integration.ts`, `phase-h.tsconfig.json`, plus focused additions to `phase-e.ts` and `phase-g.ts`.

Web changes for the remaining Phase H work are `package.json` command forwards and this expanded report. The earlier label changes listed above remain intact. No additional Phase H report, new dashboard, frontend primitive or UI migration was introduced.

## Additional official technical references

Reviewed November 10, 2026:

- [Stripe Accounts v2](https://docs.stripe.com/connect/accounts-v2): v2 merchant configuration and supported v1 observation interoperability.
- [Stripe webhook documentation](https://docs.stripe.com/webhooks): permanent HTTPS delivery, signature authentication and destination configuration.
- [Stripe dispute lifecycle](https://docs.stripe.com/disputes/how-disputes-work): merchant dispute workflow and provider balance effects.

## Phase H verification results

- `npm run test:stripe-connect:production`: passed configuration/security, read-only preflight, staging quotation, worker-stage isolation, actual-cost separation and permission-boundary assertions.
- `npm run test:stripe-connect:accounts`: 14 verification groups passed.
- `npm run test:stripe-connect:checkout`: 24 verification groups passed, including existing Phase F refund qualification and new Phase H multi-vendor dispute/suspension checks.
- `npm run test:stripe-connect:invoices`: 15 verification groups plus the additional Phase H invoice-dispute/read-only-preflight assertions passed.
- `npm run demo:market-operations:test`: passed. Its existing fixture neutralization was extended to ignore developer invoice configuration, and new operational flag cases were added; the ignored local settings were not edited.
- `npx tsc --noEmit --project test/payments-stripe/phase-h.tsconfig.json`: passed.
- `npm run build:server` and `npm run build:worker`: passed.
- The four focused frontend suites above were rerun: 47 tests passed.
- `npm run payments:production:preflight` through the web command forward: correctly reports BLOCKED and `liveCollection: DISABLED`, with no database or Stripe connection. Missing approvals are reported explicitly. The optional SQL checks were exercised in an actual read-only transaction in a disposable database.

The pre-existing frontend `table-navigation.ts:29` typecheck limitation recorded above is unchanged. Controlled SDK tests never use real provider transport. Database qualification uses only the existing `vendure_test_*` lifecycle guard, with additive migration preservation and cleanup of successful disposable runs.
