# Stage A architecture

## Dashboard and authority

`/vendor/pos` is a vendor route within the existing AdminShell. The permanent In-Person Checkout entry requires `OperateOwnPos`. Account and channel selection remain the existing centralized account workflow. No vendor identifier in a URL or command grants authority.

TenantAccessPolicy reloads the current channel grants and active vendor membership on every operation. Only an active owner or staff member with the explicit POS grant can operate the register. Existing owners, staff, managers and customers receive no automatic grants. A draft additionally belongs to its exact cashier, vendor and channel. Another cashier at the same vendor must explicitly create their own draft; they cannot read or edit the first cashier's draft. Switching vendor remounts the controller and disposes its queue.

## Native draft and lifecycle

`InPersonCheckoutService` composes real inactive Vendure `Draft` orders with migration-managed POS records. There is no second monetary order engine. Native OrderService owns line prices, tax calculation and compatible native vendor coupon allocations.

The persistent states are OPEN, VALIDATING, READY_FOR_PAYMENT, CANCELLED and EXPIRED. Validation runs in the quote transaction, so clients see either the prior state or a committed ready quote. There is no paid/completed state. A POS-specific order process rejects transitions out of the native Draft state. Cashier cancellation closes the POS record and retains the inactive native draft for audit. Nothing can allocate or sell stock through that cancellation.

Drafts expire 24 hours after creation. Reads lazily expire the selected cashier's due drafts; an enabled backend scheduler can expire batches of 200 using `SKIP LOCKED`. History is retained, with no stock reservations to release. The demo needs no separate worker for POS. Closed drafts cannot be edited. Each cashier can have up to 30 open drafts and each cart up to 100 different variants. Quantities are positive whole numbers, bounded to 9,999 and further constrained by existing native limits and stock.

## Pricing, inventory and catalog

Products and variants are the existing protected vendor catalog. Queries search product name, variant name and SKU on the server, with 30 products per page and up to 100 variants per product. Categories are real native Collections. Favorites are durable vendor/product references. Image previews are lazy loaded with a fixed display area and the existing store icon fallback. A single batched catalog availability projection avoids full ownership/source validation for every rendered tile; actual additions and review always repeat the complete authoritative checks.

Every actual addition verifies product ownership, active native product/variant, vendor-channel publication, canonical source ownership and source-channel assignment, supported inventory configuration, external inventory freshness where applicable, canonical currency/price and free physical stock after native allocations and existing live online holds. Quote review locks canonical stock rows in the existing sorted order and repeats eligibility. No POS operation writes stock movements or holds. Two ready quotes may refer to the same remaining stock; neither authorizes payment. Stage B must acquire current capacity before any provider attempt.

Native Vendure calculates official totals. The UI projects pending quantities immediately and labels pending amounts as saving. The displayed final amount remains the last authoritative server value until the serialized mutation completes. Review reprices every native line and recomputes tax and promotions. Tiles show canonical prices before tax; the cart displays unit price before tax and line totals including applicable tax.

Ordinary active vendor merchandise coupons use VendorPromotionService policies and native promotion calculation, including ownership, publication, minimums, restrictions and one coupon per vendor. A private POS draft edit scope extends only the existing order and coupon guards for that exact inactive draft and transaction context. Ordinary online checkout behavior remains intact. Loyalty mappings are rejected. Custom prices, arbitrary cashier discounts, shipping discounts, online shipping workflows and loyalty redemption are unavailable.

Weighted/decimal order quantities are not supported by the current native integer inventory model. Stage A preserves that limitation. A later explicit policy should define unit conversion, rounding, labels, pricing authorization and inventory accounting within the existing commerce infrastructure.

## Optional customer association

Anonymous is the default. The UI provides Add Customer (Optional), exact existing-account association, removal/correction and invitation intent. CustomerAccountService resolves normalized email against both Customer email and User identifier, or a country-code phone through AccountPhoneIdentity. Only active, non-deleted, verified accounts qualify. No OTP or new authentication is performed at the register. Ambiguous matches are rejected.

Each cashier is limited to 20 lookup attempts per minute across vendors. The durable throttle increments outside the draft transaction so rejected lookups count. Responses contain only association status and minimal checkout facts, without names, addresses, payment details, history or another vendor's loyalty data. The cashier gains no customer login/session/capability. Browser-supplied customer IDs are rejected. Every association/removal/invitation change appends an immutable audit row; incorrect pre-sale attribution can be removed and replaced.

An invitation email is only an unpaid intent. It creates no customer and sends no email. Existing-account emails take the association path even when invitation intent was requested. No marketing preference is created. `PosInvitationHandoff.afterVerifiedSale` is an internal seam with no API operation. It requires an existing immutable purchase snapshot, committed checkout attempt, settled matching native payment and the exact guest-session CheckoutContact before delegating to the existing `CustomerAccountService.purchaseLink`. Isolated contract tests verify that delegation and unpaid rejection. Stage B must create the legitimate guest/order context through the existing onboarding system after verified payment; Stage A cannot exercise this seam from its vendor UI.

A future post-sale correction must append an authorized attribution correction with the original customer, new customer, operator, reason and evidence. It must preserve original payment and financial allocations, reverse/reapply any later loyalty effects idempotently and never impersonate the customer. There is no post-sale correction endpoint in Stage A.

## Physical market context

Independent Sale uses the selected vendor's primary commerce channel and canonical source. Market attribution requires the actual active market, scheduled occurrence, verified approved vendor relationship and confirmed participation. Applicable occurrences have not ended and begin within seven days. Market and vendor tax/currency envelopes must agree. Every market-sale variant must have an approved listing and native publication in that market. Changes of context revalidate every current line.

These checks deliberately do not treat an online preorder window or occurrence preorder sales cap as physical stock authority. POS uses canonical physical free stock. Review rechecks occurrence status, relationship/participation versions and product publication. The draft/quote preserve market/occurrence identity and source provenance. A vendor's participation elsewhere does not attach an independent sale to a market. Cross-market and forged references fail closed.

## Concurrency and payment boundary

Start operations use a vendor/cashier advisory mutex and unique start receipt. Commands lock the exact POS row and native order, require the current version and persist a UUID operation receipt plus request fingerprint in the same transaction. Repeating the same key/input returns the current draft without another increment. Reusing a key with different input fails. Conflicting versions cannot overwrite each other.

The browser serializes additions and uses relative increments/decrements. It preserves the exact operation key/version for an interrupted request and exposes Retry saved change. Validation failures clear the remaining pending queue and show the error; a conflict requires reloading the draft. Unmounting disposes unsent work. There is no offline payment or offline pricing authority.

A successful review creates a durable quote with UUID, draft version, two-minute expiration, fingerprint, vendor/cashier/order/customer references, canonical source allocations, quantities, native money/tax/discounts, currency and selling context. Continue to Payment remains disabled and explains that integrations are not configured. An expired quote can be refreshed. Stage B must compare the durable version/fingerprint and revalidate ownership, amount, price, tax, context and stock under the existing inventory locks before creating a real payment attempt. No provider credentials, tokens, merchant connections, payment confirmations or loyalty awards are introduced here.

## Admin GraphQL API

| Operation                                     | Purpose                                                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ownPosCatalog(input: JSON)`                  | Bounded vendor catalog, search, categories and favorites                                                                |
| `ownPosContexts`                              | Authorized applicable market occurrences                                                                                |
| `ownPosDrafts`                                | Current cashier's latest open drafts                                                                                    |
| `ownPosDraft(id)`                             | Explicit owned draft resume                                                                                             |
| `startOwnPosDraft(key, occurrenceId)`         | Idempotent draft creation                                                                                               |
| `commandOwnPosDraft(id, version, key, input)` | Add, relative decrement, quantity, remove, customer, anonymous, context, coupon, removeCoupon, review, reopen or cancel |
| `setOwnPosFavorite(productId, value)`         | Owned durable favorites                                                                                                 |

All are admin-only and require the POS permission plus current membership. Financial inputs, customer IDs and unknown command fields are rejected. There is no Shop POS operation, customer directory, payment-completion operation or public invitation sender.

## Additive database change

`1792800000000-InPersonCheckout.ts` creates `pos_draft`, `pos_operation`, `pos_customer_audit`, `pos_favorite` and `pos_lookup_rate`. Foreign keys retain native/vendor/customer identity. Scope, expiry, audit and foreign-key indexes support bounded access. Triggers protect draft identity and append-only customer audits. The downgrade refuses to discard checkout history.

The tables follow the existing migration-managed SQL extension pattern used by loyalty. New TypeORM financial/order entities were unnecessary. The runtime option is `inPersonCheckout`, exposed as `ENABLE_IN_PERSON_CHECKOUT` in ordinary configuration, and requires native commerce, paid-attribution policies and centralized customer accounts. This task enables it only in disposable test/demo composition and does not edit environment secrets or migrate populated databases.
