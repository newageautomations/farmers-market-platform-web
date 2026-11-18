# Stripe Connect Phase G: Market booth invoice payments

Implemented locally on November 10, 2026. Changes in the sibling backend repository were explicitly authorized. Previous phase reports were not edited.

Follow-up local setup on November 10: after explicit user approval, the four invoice sandbox settings were enabled in the ignored backend demo environment, the dedicated Phase G fixtures were prepared, and API/worker were restarted through the required web scripts. The database already had no pending migrations; none were applied. Orchard invoices 26 (unpaid $100) and 27 ($60 remaining after $40 cash) both returned `eligible: true` through the owned invoice service. The dedicated occurrence is 66, manager route `/market/booth-billing/66`, and vendor route `/vendor/booths`. Other fixture invoices are 28 (offline paid), 29 (draft), 30 (decline), 31 (authentication) and 32 (interruption). No card payment was submitted.

This setup exposed and corrected the local test-payment policy's missing invoice-flag exception. The exception requires the complete independently approved test invoice gate and preserves live/foreign-provider rejection. `scripts/test-local-payment-policy.ts` now checks the valid configuration plus missing authorization, unapproved pricing/tax, live publishable key and missing demo opt-in rejection. Those checks and the backend server build passed. The fixture command now reports owned online eligibility for its unpaid and partial invoices. The original implementation-time boundaries below describe the earlier run; persistent fixture preparation is now complete.

## Qualification and boundaries

This phase implements a separately gated Stripe sandbox card flow against native market invoices. Controlled SDK, provider, database and component qualification is described below. Genuine Stripe sandbox invoice payments have not been executed during this task.

No migration or fixture command was run against `vendure_demo_market_ops`. No established Boerne, Manna Roots, Orchard, Garden or Market record was modified. No environment file, credentials, Stripe account, remote Git branch, deployment or hosting service was changed. The dedicated fixture command is prepared for use after migration approval. Failed test runs retain their disposable databases under the existing test harness policy; successful runs remove only their own disposable database.

Live invoice collection is disabled. The sandbox pricing version is not an approved production price. Invoice credits/refunds, invoice taxation, legal fee disclosures and invoice accounting mappings require approval before production activation. Phase H is not implemented.

## Implemented architecture

The native `market_invoice` and append-only `market_payment` tables remain the invoice and principal-settlement authority. There is no Stripe Billing invoice, merchandise order, purchase-unit allocation, transfer or destination charge.

The vendor opens an invoice from `/vendor/booths`, reviews its lines, balance and payment history, and chooses Pay invoice. The backend automatically freezes the full remaining balance and Service fee in a durable collection reservation. Stripe Card Element initializes under the original market connected account. Only the final Pay invoice button records consent and creates or resumes the original unconfirmed manual-capture PaymentIntent. Stripe.js confirms the card and handles required authentication. The backend retrieves the intent before capture and again before native settlement. A client callback alone cannot announce success.

Principal backend files are `src/plugins/payments/invoice-policy.ts`, `invoice.entities.ts`, `invoice.service.ts`, `src/migrations/1797000000000-StripeInvoicePayments.ts`, `scripts/market-operations-demo/invoice-fixtures.ts`, and `test/payments-stripe/phase-g.ts` / `phase-g-sdk.ts` / `phase-g.tsconfig.json`. Existing payment API, plugin, transport, SDK, webhook, recovery, reconciliation and account-disconnect files were extended, together with native market operations, runtime/demo configuration and npm scripts.

Principal web files are `apps/admin/src/vendor/BoothInvoicePayment.tsx`, `vendor/booths.tsx`, `vendor/service.ts`, `market/phase14/Billing.tsx`, `market/phase14/OperationsRoutes.tsx`, `packages/ui/src/stripe-card.ts`, `apps/storefront/src/lib/stripe-checkout.ts`, `packages/api/src/booth-invoice.ts`, `packages/api/operations/booth-invoice.graphql`, `tests/stripe-connect-phase-g.test.tsx` and `tsconfig.stripe-connect-phase-g.json`. API exports/errors/market-operation types, generated schema/documents, codegen, demo wrapper and package scripts were updated locally.

`StripeInvoiceService` uses the existing injectable `StripeTransport.checkout` interface, pinned SDK client, test-platform verification and exact-account request context. `CheckoutRequest` gains the invoice purpose and creation operation kind. The existing shared capture/cancel SDK primitives handle the remaining provider operations. The multi-vendor checkout coordinator is not duplicated.

New persistence:

| Record | Authority |
| --- | --- |
| `stripe_invoice_recipient` | Immutable invoice, payer vendor, original market account row/account ID/generation, platform, application and test mode. |
| `stripe_invoice_collection` | Original invoice/market/vendor, actor/channel, operation UUID, invoice revision/basis digest, frozen quote, reservation and consent. |
| `stripe_invoice_step` | Intent creation, capture and cancellation journals, original operation keys/requests, first-attempt time, attempts and sanitized provider observations. |
| `market_payment` with method `STRIPE` | Exactly the verified invoice principal, linked through a unique `stripe-invoice:<collection-operation-uuid>` idempotency key. |

PaymentIntent, charge and application-fee IDs are retained in the immutable collection's provider journal. The recipient and quote never come from browser-supplied account IDs, totals or success flags. Client secrets are transient responses after consent, are removed from stored observations, and are rejected by the journal's database check.

## Service fee policy and exact arithmetic

The independent configuration version is `booth-invoice-sandbox-5pct-v1`. Ordinary vendor and market settings cannot change it. Automatic, fixed and percentage Preorder fee preferences have no effect on invoices. The processing assumption is the existing Phase D US domestic standard estimate: 29/1000 plus 30 cents, using integer/BigInt arithmetic and the existing money allocator.

The current invoice model has only booth and rental amounts; it has no approved invoice tax or fee allocation model. Qualification accepts only exact USD booth/rental lines whose quantity times unit amount and sum match the native obligation, under the explicit sandbox no-fee-tax assumption. Unknown components, embedded tax/fee fields, mismatched totals, unsupported currencies and zero balances fail closed. The card total must meet the qualified USD 50-cent minimum. This does not establish a tax exemption or legal surcharge classification.

For each collection:

```text
B = totalMinor - paidMinor
M = B in the qualified tax-free booth/rental model
P = round-half-up(M * 5 / 100)
E = ceil((29 * (B + P) + 30 * 1000) / 971)
Service fee = P + E
T = B + P + E
PaymentIntent amount = T
PaymentIntent application_fee_amount = P
Native MarketPayment amountMinor = B
```

The ceiling is the least whole-cent recovery covering the assumed percentage cost on B, P and E plus the fixed estimate. Actual Stripe processing fees can differ. E remains part of the market's gross card charge, while P is the platform application fee. Neither component is added to booth rent or invoice amount-paid totals.

| Native obligation | Already settled offline | Online principal | P | E | Service fee | Card charge |
| --- | --- | --- | --- | --- | --- | --- |
| $100.00 | $0.00 | $100.00 | $5.00 | $3.45 | $8.45 | $108.45 |
| $100.00 | $40.00 | $60.00 | $3.00 | $2.20 | $5.20 | $65.20 |
| $100.00 | $100.00 | $0.00 | None | None | None | Ineligible |

Each new successful online collection has its own frozen calculation. Existing offline CASH, CHECK, EXTERNAL, COMPLIMENTARY, WAIVED and OTHER payments retain their native behavior and receive no online fee.

## Authorization and original ownership

Owned Admin API operations are `ownBoothInvoice`, `prepareBoothInvoicePayment` and `boothInvoicePayment`. They reload `businessAuthority`, require the vendor workspace, match the invoice's market/directory/assignment and verified vendor identity, and preserve any original recipient vendor binding. Invoice reads use the existing `ReadOwnVendorIdentity` grant. Preparing, confirming or canceling requires `ManageOwnBilling`. Restricted readers cannot obtain a payment action merely by calling the mutation directly.

The market continues using its existing billing permissions for issuance, offline settlement and unpaid replacement. A market workspace cannot invoke vendor payment authority. A different market cannot modify the invoice. Manager APIs cannot claim a Stripe settlement through RECORD_PAYMENT.

The original merchant mapping must be a ready TEST market organization for the configured platform/application. Account row, connected account, generation, market ID, mode and readiness must match before new authorization/capture. The SDK independently verifies the platform identity and US account context. Captured charge and application-fee evidence are checked against the original intent, account, amount, currency and fee. The Phase C legacy Standard-account compatibility correction is unchanged.

Ready newly issued invoices snapshot their recipient in the issuance transaction. Eligible pre-existing manual invoices without a snapshot bind their original online recipient once, under the same market lock, before their first online attempt. Replacing/disconnecting the market's account never reroutes a frozen collection. Historical identities remain stored after disconnection. The vendor payer does not need a Stripe merchant account.

Worker capture revalidates the original payer's current billing authority. If authority disappears before capture, the original authorization is canceled safely. An already captured valid obligation is still recorded or reserved for reconciliation rather than forgotten because someone lost workspace access.

## Invoice lifecycle, concurrency and settlement

The supported native states remain `DRAFT`, `OPEN`, `PAID` and `VOID`; past due is a display projection. Drafts cannot accept payment. Issuance remains an explicit existing manager command and never collects money. The existing qualified issuance seam can accept online issuance without calling Stripe Billing. The ordinary Issue invoice action still allows manual issuance when the market is not online-ready.

V1 online payments collect the entire remaining balance. Manual partial payments, waivers and complimentary entries count under the existing native rules. A successful online payment appends principal exactly once, advances invoice revision, and marks PAID only when native principal is fully covered. Previously recorded payments are never rewritten. Historical scheduled-date assignments remain accessible in the vendor invoice experience.

The coordinator takes a per-invoice PostgreSQL session advisory lock and checks that its connection remains alive before provider calls and journal writes. Short database transactions use the existing market-row lock order. No database transaction spans a Stripe network call. A partial unique index permits only one active reservation per invoice.

Database guards enforce frozen identities/quotes, exact reserved amounts, provider evidence for STRIPE ledger entries, append-only payment history and pending-balance protection. Offline payments, replacement, cancellation and invoice changes cannot overlap an unresolved reservation. Existing paid-invoice replacement remains blocked. An idempotent replay of an already recorded offline payment is not a new financial effect.

Unconfirmed reservations expire after 30 minutes. If an intent exists, expiration/cancellation first resolves it at Stripe; principal is released only after authoritative cancellation. A captured result always takes precedence and proceeds to native settlement. Unknown outcomes retain the reservation.

## Vendor and manager experiences

The vendor's existing Booth assignments page opens an owned invoice dialog with market name, invoice identifier, occurrence/assignment references, native line items, original amount, paid amount, balance, due date/status, and offline/online history. Pay invoice automatically prepares the quote and account-scoped card iframe. The final card total and combined Service fee are explicit, with the platform/recovery split and market business-name disclosure.

The shared Dialog, Button, Alert, Badge, Spinner and native `InvoiceTable` are reused. The Stripe.js loader/card interfaces were extracted to `@market/ui/stripe-card`; storefront checkout re-exports the same contract. `BoothInvoicePayment` is a feature controller because the merchandise checkout composition owns purchase groups and cannot authorize booth debt. No new UI primitive, component library, stylesheet, competing design standard, breadcrumbs or new label/value `dl` rows were introduced. Existing component guidance and the approved registry were consulted.

Busy state and an immediate submission lock prevent double confirmation. Refresh/reopen resumes the original collection. Pending, card/authentication failure, verified completion and reconciliation states are distinct. Vendor balances reload after committed settlement. There are no quote-loading, Stripe-initialization or provider-test buttons.

Manager billing retains its layout and manual controls, adds one native offline/online payment history and separate online gross/principal/P/E details, and suppresses conflicting controls during active reservations. Its existing authorized billing read refreshes quietly every five seconds while the page is visible. Server locks, permissions and revisions remain authoritative between reads.

## Webhooks, recovery and operational review

Existing `/payments/stripe/connected` and `/payments/stripe/platform` endpoints retain signed raw-body verification, test/live checks, receipt deduplication and the existing receipt/recovery queue. No new endpoint or event subscription is required. Invoice intents use `payment_purpose=BOOTH_INVOICE` plus their creation operation UUID. Local invoice step ownership is separate from merchandise group/obligation ownership.

Receipts are hints only. A bound invoice event cannot write a merchandise payment. The existing recovery worker independently retrieves original account-scoped intents, captures eligible authorizations, commits verified principal, and audits completed collections for external refunds/application-fee changes. Duplicate or out-of-order events do not supply invoice amounts or determine balance order.

Operations are persisted before network calls. Lost create responses replay only their original key within the existing 23-hour safe replay boundary. A known intent is retrieved before another financial decision. Lost capture responses are resolved by retrieving the original intent; recovered capture journal evidence is also recorded. Twelve unresolved provider attempts or identity/amount/currency contradictions require operational review. Unknown creates are never replaced by a fresh charge.

If capture succeeds and native settlement fails, the append transaction rolls back, the original captured evidence/reservation remains, and worker recovery retries the idempotent native commit. Another payment cannot be collected while that result is unresolved. Delayed application-fee identity retains a processing reservation rather than fabricating a fee reference. Reconciliation reports include unresolved invoice collections. External refunds or charge discrepancies preserve native debt history and surface review instead of inventing a credit.

## Refund and accounting policy boundaries

The invoice domain has no approved credit/refund allocation workflow. No customer/manager invoice refund action was invented. The Phase F merchandise-unit engine is unchanged. Paid or captured invoices cannot be canceled to erase payment history, and a void never implies a Stripe refund.

Normal local-commit interruption is recovered by recording the verified principal, so it does not require a speculative refund. If an unresolved discrepancy needs compensation, its original account, intent, charge, application fee and fee components are retained for a separately authorized invoice-credit policy using the existing provider refund primitives. There is no public arbitrary compensation control. Full/partial invoice refund authority, fee allocation and whether returned principal reopens debt remain unimplemented.

Existing native billing/finance projections consume only principal from `market_payment`. Booth principal remains market revenue/vendor booth expense, never vendor merchandise revenue. Online collection snapshots/history separately expose P, E and gross charge. Existing merchandise platform-fee allocations and QuickBooks exports are not repurposed for invoices. Invoice-specific recognition/export of Service fee recovery, platform fees, actual Stripe costs and invoice tax is not yet an approved bookkeeping mapping. The current principal finance totals must not be represented as a complete Stripe gross/net invoice accounting report.

## Automated verification

All provider effects in automated verification use controlled transports or the installed SDK with an injected HTTP fixture. They need no genuine credentials or Stripe requests. Database tests use the existing guarded loopback-only `vendure_test_*` harness, never the persistent test database.

Commands used from the web repository, or the corresponding backend npm script:

```powershell
npm run test:stripe-connect:invoices
npm run test:stripe-connect:refunds
npx vitest run tests/stripe-connect-phase-g.test.tsx tests/stripe-connect-phase-e.test.tsx tests/stripe-connect-phase-f.test.tsx --reporter=default
npm run typecheck:stripe-connect:invoices
npm --prefix ../farmers-market-platform run build
npm run build --workspace @market/admin
```

Results:

- Phase G backend: all 15 database verification groups passed, plus the installed-SDK direct-account/amount/fee/purpose and mode/platform/account checks. Coverage includes exact gross-up and odd cents, idempotent fixtures, eligibility, mixed principal history, concurrent preparations, pending offline/void protection, declines/3DS states, lost create/capture responses, rolled-back native settlement and worker recovery, current billing grants, revoked payer authority, provider currency mismatch, signed webhook replay, historical disconnection and external refund review. The successful disposable database was removed by its guard.
- Existing Phase E/F backend: all 23 verification groups and both installed-SDK check groups passed. The successful disposable database was removed by its guard.
- Frontend Phase G: all 11 tests passed, including a real parent-component refresh that preserves the verified completion dialog while the paid balance reloads. Existing Phase E (12 tests) and Phase F (8 tests) also passed, for 31 focused payment tests across the final relevant runs.
- Backend Phase G scoped TypeScript check passed. Full backend dashboard/server/worker build and affected Admin production build passed. Schema extraction/codegen passed without backend bootstrap or persistent database access.
- The web scoped typecheck remains blocked only by the pre-existing shared table-navigation error listed below.

No whole-repository suite, automated browser QA, screenshot or visual sweep was run.

Known unrelated checks: the scoped typecheck reports the existing possibly undefined `target` in `packages/ui/src/table-navigation.ts:29`. An additional affected-area run of `tests/market-operations.test.tsx` passes five tests and fails the existing published-application editor test at line 164, which expects removed draft-help copy. That application editor was already locally modified before Phase G and is outside this task; it was not repaired. The existing backend `pg` query deprecation and frontend bundle-size warnings were observed.

## Migration and configuration

The additive forward-only migration is `StripeInvoicePayments1797000000000`, in backend `src/migrations/1797000000000-StripeInvoicePayments.ts`. It creates recipient/reservation/journal records, extends the native payment method constraint to STRIPE, and adds financial guards. It does not reset, reseed, replace or backfill existing obligations/payments.

From the web directory, first inspect the actual target and every pending migration:

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:market-operations:inspect
```

Only after separate user approval, run:

```powershell
npm run demo:market-operations:migrate
```

No migration was applied automatically. The demo runner refuses pending migrations for serve, worker and fixture commands. Do not substitute ordinary backend development commands that select `vendure`.

In the existing ignored backend `.env.demo-market-operations`, review and configure these explicit sandbox settings using the existing TEST platform/application credentials:

```dotenv
DEMO_STRIPE_CONNECT_TEST=true
STRIPE_ACCOUNT_ONBOARDING_ENABLED=true
STRIPE_TEST_INVOICE_ENABLED=true
STRIPE_TEST_INVOICE_COLLECTION_AUTHORIZED=true
STRIPE_TEST_INVOICE_FEE_POLICY=booth-invoice-sandbox-5pct-v1
STRIPE_TEST_INVOICE_FEE_TAX_POLICY=EXPLICIT_NO_FEE_TAX_TEST
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_<matching-platform-key>
```

Retain the already configured matching test secret, platform account ID, Connect client/application ID, settings origin `http://localhost:4322`, callback `http://localhost:3000/payments/stripe/oauth/callback`, existing webhook secrets and local central-account composition. Keep `STRIPE_ENABLED=false`, live credentials absent and live collection disabled. Do not commit credentials. Invoice enablement does not require turning on preorder collection or all provider operations. Keep existing working Phase E/F preorder settings unchanged when regression testing them.

The runtime gate additionally requires the integrated `vendure_demo_market_ops` environment and explicit demo Stripe test opt-in. Automated controlled fixtures use `runtimeEnvironment=test` and their guarded disposable database. There is no approved production invoice policy or live-enable path.

Use separate web-directory terminals:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

## Dedicated integrated test data

After migrations are separately approved/applied, prepare only the additional Phase G records:

```powershell
npm run demo:market-operations:invoice-fixtures
```

Prerequisites are the existing dedicated Phase D/E/F organizations, verified Orchard membership in the dedicated Market, and their current credentials. If those organizations are entirely absent, review the existing `demo:market-operations:preorder-fee-fixtures` setup first. Do not rerun broad setup to repair unrelated established accounts. The Phase G command fails rather than provisioning missing business identities or changing their permissions.

| Account | Use |
| --- | --- |
| `stripe-fee-d-manager@example.test` | Dedicated Market owner, recipient setup, issuance and manual settlement. |
| `stripe-fee-d-orchard@example.test` | Invoice payer. No vendor merchant account is required for invoice payment. |
| `stripe-fee-d-garden@example.test` | Different vendor isolation check. |
| `stripe-fee-d-staff@example.test` | Existing restricted-member checks; do not expand its grants. |

Original fixture password: `Local-Fee-D-2026!`. Preserve any subsequently changed credentials.

The command adds a dedicated February 13, 2027 market occurrence (`stripe-invoice-g:market-date`), `Phase G invoice booths` layout and `Phase G table rental`. Each invoice has $80 booth rent plus one $20 table. It uses canonical confirmed participation and approved assignment commands, and does not execute Stripe onboarding or payments. Existing verified directory identity is reused; a new directory link is created only from the dedicated vendor's already verified canonical membership. Existing records and financial history are preserved on rerun.

The command prints `occurrenceId`, `managerRoute`, `vendorRoute` and an `invoices` map containing the exact local numeric IDs. IDs cannot be stated as already populated because this task did not apply the persistent migration or run setup. Use those printed IDs, not IDs from disposable automated runs.

| Fixture key / booth label | Initial invoice |
| --- | --- |
| `unpaid` / G unpaid | OPEN, $100 balance. |
| `partial` / G partial | OPEN, $40 CASH paid and $60 remaining. |
| `paid-offline` / G paid-offline | PAID, $100 CASH, no online fee. |
| `draft` / G draft | DRAFT, for manager issuance. |
| `decline` / G decline | OPEN, $100, decline scenario. |
| `authentication` / G authentication | OPEN, $100, 3D Secure scenario. |
| `interrupted` / G interrupted | OPEN, $100, refresh/resume scenario. |

The manager route is `http://localhost:4322/market/booth-billing/<printed occurrenceId>`. The vendor route is `http://localhost:4322/vendor/booths`. Rerunning setup does not reset paid attempts or turn a tester-edited invoice back into its original fixture state. If setup was interrupted, inspect its printed/current native state and finish any intended draft issuance through the existing manager UI.

## Market Stripe setup

Sign in as the dedicated manager and open `http://localhost:4322/market/settings/payments`. Use the Phase C Set up Stripe or Connect existing Stripe account flow with a compatible sandbox account belonging to this configured platform. Do not create accounts through fixture tooling. Complete required business information in Stripe, return to the same workspace, and use the existing account-status action if needed.

Before payment, verify Test mode, Connected and direct-charge readiness Ready, with card payments active, required information complete and compatible full-Dashboard/Stripe fee and loss responsibility evidence. Unknown configuration or stale/restricted accounts remain ineligible. Legacy Standard accounts still use the qualified Phase C compatibility path. In the configured platform's Stripe sandbox Dashboard, confirm this exact connected account is listed under that platform/application. A foreign account/platform, live account or vendor-payer merchant account is not a valid substitute.

Keep the existing signed webhook destinations/forwarder for both local endpoints and the existing Phase E/F subscriptions. The regular worker must remain running for browser interruption and reconciliation checks.

## Manual sandbox scenarios

Use only the dedicated records above. Use future expiry, valid sandbox CVC and postal code with test cards. Do not create rare failure conditions, change amounts in the database or inject network faults into the populated environment.

| Scenario | Exact action and expected result |
| --- | --- |
| Issue | Manager opens the printed billing route, finds G draft, supplies an optional due date and clicks Issue invoice. It becomes OPEN. No Stripe charge occurs. |
| View | Orchard opens `/vendor/booths` and View invoice for G unpaid. Market, lines, original $100, paid $0, remaining $100, due date and state are visible. Garden cannot read/pay this ID. |
| Automatic fees | Choose Pay invoice. No preparation control is needed. Balance $100, platform $5, estimated recovery $3.45, Service fee $8.45 and total $108.45 appear with secure card entry. |
| Full payment | Use `4242 4242 4242 4242` and click Pay invoice $108.45 once. Success appears only after Stripe verification and the native ledger commit. Balance becomes zero and state PAID. |
| Merchant charge | In the original market's connected-account sandbox Dashboard, find the $108.45 direct charge, original PaymentIntent and charge. The owner is the market account. There is no destination transfer or vendor connected-account debit. |
| Platform fee | In the configured platform sandbox Dashboard, verify the same charge's $5 application fee. The $3.45 processing recovery is not an application fee. Actual Stripe fees are a separate market cost. |
| Partial offline | Orchard pays G partial. Review $60 principal, $3 platform, $2.20 recovery, $5.20 Service fee and $65.20 total. After payment, history shows the original $40 CASH and $60 STRIPE principal. Native paid is $100, not $105.20. |
| Offline-only | G paid-offline has no Pay invoice action, intent or Service fee. On a separate still-unpaid dedicated invoice, a manager can record a manual partial payment before online preparation and the next online quote uses its new remaining balance. |
| Decline | On G decline, use `4000 0000 0000 0002`. Expect a card failure, unchanged principal and the original reserved intent. Correcting the card retries that intent; it must not create a second charge. |
| Authentication | On G authentication, use `4000 0025 0000 3155`. Complete Stripe's authentication challenge. Cancellation/failure does not settle principal. Successful authentication must still be followed by authoritative capture and native commitment. |
| Browser interruption | On G interrupted, refresh before confirmation and during processing. Reopen the same invoice. The original reservation/intent resumes; do not create another invoice. The worker finishes a verified capture and the refreshed balance/history show one STRIPE entry. |
| Conflicting edits | While a dedicated payment is reserved, manager manual payment/replacement controls are unavailable. A stale tab's attempted command is rejected server-side. Closing a dialog does not release an unresolved payment. An untouched reservation expires safely after 30 minutes; existing intents must be canceled before release. |
| Permission isolation | Sign in with Garden or restricted staff. Another vendor's invoice remains private. A reader without `ManageOwnBilling` cannot prepare/confirm/cancel even through direct API invocation. A different market cannot modify the invoice. Protected-owner account controls remain unchanged. |
| Paid cancellation/refund | For a PAID invoice, replacement/cancellation must remain blocked. There is no invoice Refund button. Do not manually refund it in Stripe as a normal test scenario; controlled fixtures cover external-refund review. A future approved invoice credit/refund policy is required. |
| Preorder regression | Use the existing dedicated Orchard/Garden storefront checkout and refund scenarios from Phase E/F, retaining their separate gates/settings. Invoice fees must not adopt Garden's custom Preorder recovery, and invoice collection must not change native merchandise allocations or refunds. |

Review the same invoice in manager billing while payment completes. Its automatically refreshed history must distinguish Stripe from cash, show original gross and fee components, and mark PAID only after native principal commitment. Use controlled automated fixtures for lost provider responses, native commit failure, duplicate/reordered webhooks, revoked authority and externally refunded charges.

## Remaining production work

Genuine sandbox card/3DS and connected/platform Dashboard verification remain manual qualification steps. The persistent migration and dedicated fixture preparation await the separate migration approval boundary.

Before any production activation, approve an invoice-specific production percentage and bases, legal/network fee treatment, tax jurisdiction/model, issuer/receipt requirements, invoice credit/refund authority and allocation rules, bookkeeping/export mappings, and operational resolution procedures for retained reservations/discrepancies. Resolve account availability and reconciliation under historical disconnection. Qualify supported currencies/countries and actual processing-cost reporting. No live switch, arbitrary online partial amount, new refund business workflow, accounting integration or Phase H feature was added.
