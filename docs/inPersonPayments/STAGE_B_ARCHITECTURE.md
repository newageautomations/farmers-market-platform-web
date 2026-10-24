# Stage B architecture

## Commerce boundary

The register can start directly from a product. Start checkout by itself opens local empty UI and performs no write. When the first variant is chosen, `startOwnPosDraft` passes it through the existing native add command within the draft creation transaction. Its original start key is also the original add receipt, so an interrupted response retries one populated draft. Invalid additions roll back both native order and POS draft. Subsequent additions retain the existing serialized cart queue. Saved draft reads omit empty snapshots, including carts emptied by removing their last item; original native/audit/idempotency records are retained. The legacy no-variant service entry remains available to internal fixtures and compatible callers, but the register never invokes it for an empty cart.

`InPersonPaymentCoordinator` consumes the existing cashier-owned native POS draft and its two-minute quote. It checks current `OperateOwnPos` authority, the exact version and quote identity/expiry, optional customer activity, product ownership/publication, canonical source, prices, native tax/promotions, physical availability and physical market participation. These checks run under the existing order and sorted stock locks. Browser amounts, customer IDs and success flags have no payment authority.

The coordinator installs a private AsyncLocalStorage capability bound to native order, channel, current actor and payment method. Native POS transitions remain denied outside that scope. The existing `placementCapability` still guards native payment and allocation; it is not replaced. The common provider contracts and independently committed `ProviderOperation`/`ProviderResultFact` records are reused through that scope without replacing the online provider registry or binding cash as Square/Clover.

An additive `IN_PERSON` OrderContext describes a single vendor's native Regular order, optional actual market/occurrence and `IN_PERSON_HANDOFF`. The existing direct self-link topology and its ownership/hold guards extend to this context. There is no Aggregate/Seller split for a one-vendor register, preorder window, preorder cap commitment or invented shipping charge. Context/source provenance is retained in the immutable financial observations and existing native links.

## Durable state and accounting

`1792900000000-InPersonPayments.ts` adds `pos_payment_attempt`, append-only `pos_payment_event`, append-only `pos_refund_attestation` and nonsecret `pos_merchant_connection` metadata. It extends the existing context/provider constraints and permits a genuinely anonymous in-person financial snapshot with null customer references. Online purchases still require their existing customer identity. No dummy anonymous customer/account is invented.

Each POS draft has at most one payment attempt, one unique request key/fingerprint and one capacity attempt. Existing native commerce already requires one capacity attempt per native order. Reusing the same payment key/input returns the same sale; changing input or attempting another key against that draft fails. Cash evidence, tender, change, method, expected amount, original actor/order identity and confirmation time are immutable. Payment-locked draft terms cannot be rewritten or reopened. Original financial/vendor/line/unit allocations remain the existing authoritative accounting records.

The explicit transitions are:

```text
PREPARING -> AWAITING_PAYMENT -> PROCESSING
PREPARING -> FAILED
AWAITING_PAYMENT -> CANCELLED
PROCESSING -> PAID | UNCERTAIN | DECLINED | CANCELLED | FAILED
UNCERTAIN -> PAID | DECLINED | CANCELLED | FAILED
PAID -> COMPLETED
```

Completed/failed/declined/cancelled states are terminal. Refunds are separate original-unit operations and a PAID/PARTIALLY_REFUNDED/REFUNDED projection; they do not rewrite the original capture or reopen the sale. SQL guards preserve valid transitions and audit/attestation history.

## Capacity, payment and delivery

Preparation and existing physical capacity acquisition commit before payment execution. The coordinator creates a durable provider intent in that preparation transaction. No external provider effect runs while a database transaction or stock lock is held. Stage B providers perform no network payment calls.

An in-person hold uses the existing hold records with a nonexpiring operational deadline (year 9999). Unknown outcomes and captured-but-unfinalized sales therefore remain part of canonical free-capacity calculations. Ordinary shortage/expiry invalidation cannot release these claims. The POS coordinator releases them only after a definitive decline or cancellation. Frozen paid prices survive catalog edits; current canonical source correspondence and physical counters are still checked by InventoryCoordinator before conversion. Source drift quarantines the paid sale for reconciliation instead of allocating another source or charging again.

After verified evidence, the existing NativeCommerceAdapter creates the settled native Payment, self-links, initial allocations and immutable financial units inside InventoryCoordinator's checked conversion transaction. The existing operational inventory writer then creates native delivered manual fulfillments explicitly labelled `In-person handoff`. It verifies SALE movements and stock counters. Placement, conversion and handoff commit together. Each item decrements on-hand once and releases its allocation once. No preorder fulfillment or second inventory balance is simulated.

Evidence commits independently before finalization. If finalization fails, the attempt remains PAID with the original evidence and hold. `Retry order completion`, repeated identical requests and the bounded recovery sweep finalize that original capture. They never create a replacement charge. A completely unpaid abandoned draft retains Stage A's ordinary expiry. A prepared cash attempt has a durable cashier attestation; a prepared simulated attempt can be deterministically reconciled from its stored scenario.

## Cash and simulated provider

Cash requires explicit actual-receipt confirmation and safe integer tender at least equal to the official total. Change is integer subtraction. The adapter records `CASHIER_ATTESTED_CASH`, actor, expected total, tender, change and timestamp. This is a real cash sale with cashier evidence, not processor verification. Currency entry reuses `@market/config`'s BigInt-based `parsePrice` and exact money formatting, including zero- and three-decimal currencies. Native integer quantities and tax-exclusive supported pricing remain in force.

The simulated provider records `SIMULATED_PROVIDER` and uses durable deterministic effect identities. It supports success, decline, cancellation, timeout, interrupted response, delayed success/failure and duplicate success observations. Timeout/interruption first return UNKNOWN, then reconcile the original operation. Delayed scenarios resolve after three seconds. Duplicate success observations reuse the exact result/effect identity. Refund scenarios include success, duplicate observation and a first-execution failure whose original idempotent operation can be retried.

Every simulated execution/refund checks explicit `inPersonSimulator`, runtime `test`, nonproduction process settings, actual PostgreSQL `current_database()`, public schema and loopback server address. Only fresh `vendure_test_pos_*`, `vendure_test_pos_demo_*` or `vendure_test_pos_payments_*` harness names with timestamp/random suffixes qualify. Both protected database names fail the gate. There is no public callback/success mutation, card-entry form, real provider credential or merchant connection seeded in ordinary environments.

## Customers, invitations and orders

Stage A exact email/phone matching, ambiguity checks, throttling and minimal customer projections remain authoritative. Existing accounts are associated directly without OTP or customer-session access. Anonymous sales remain anonymous. For guest invitation intent, the current CustomerAccountService creates the same guest contact/user context used by online purchases, with an internal anonymous session and frozen CheckoutContact. The coordinator invokes the existing purchase-linked secure account link only after a committed settled sale. Account activation/claim security remains unchanged.

The existing per-purchase invitation marker prevents another successful issuance on repeated completion. Failed delivery can be retried by the POS recovery sweep, preserving sale completion and applying the existing delivery throttles. The disposable sender captures fictional `.invalid` recipients in memory and makes no external delivery. Its manifest exposes no guest capability or session token. Real external exactly-once email delivery remains subject to the existing account transport's guarantees.

Existing vendor Orders includes the IN_PERSON source/filter, native delivery state, financial context and an in-person receipt/refund composition in its detail view. Customer purchase projections and the existing relationship consumer understand the same single-vendor topology; anonymous purchases create no customer relationship. The register exposes unresolved attempts after reload and the latest completed receipt for a lost response. A new cart clears that prior receipt selection. No separate order-history system is introduced.

## Refund authority and recovery

Existing `RequestOwnVendorRefund` plus current owner membership is required. POS-only staff do not inherit refund rights. `RefundCoordinator` rejects in-person requests outside the protected attestation scope, including its ordinary generic API. Requests name original unit IDs, require a reason and, for cash, explicit actual cash-return attestation. Original-unit reservations prevent overlap/over-refunding and settle through the existing native Refund and RefundAllocation writer. Refunds never automatically restock delivered items.

A lost refund response reuses the original request key. Orders exposes original-operation status/retry controls after reload. Scheduled recovery reads persisted actor/channel/attestation/provider identities and resumes pending original refunds. Failed simulator refunds can retry that same provider operation. Native finalization failures retain independently verified reverse evidence. No refund amount or success flag is accepted from the browser.

Scheduled and manual recovery reload current actor grants/membership. Revoked cashiers/owners remain quarantined with their evidence and capacity retained; this work does not invent an authorization bypass or a platform remediation console. Such cases require reviewed authority restoration or later operator tooling.

## Merchant connections and remaining stages

The metadata boundary provides vendor ownership, provider, merchant/location/device references, status, revocation and capability metadata. No connection API, OAuth or secret storage is implemented. `credential_ref` is constrained to null. Stages C/D must integrate an approved secret store/encryption facility before persisting access credentials, plus verified external reconciliation/cancellation adapters. No live Square/Clover or hardware qualification is claimed.

IN_PERSON financial placement, native handoff and refund hooks deliberately exclude both loyalty engines. Stage G remains the final integration stage, including explicit cash-evidence qualification policies.
