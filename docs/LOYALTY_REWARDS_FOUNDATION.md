# Loyalty rewards foundation

Loyalty is owned by the actual vendor. One eligible product cent earns one point. The rate cannot be changed by a vendor. Wallets use the existing global Customer identity and the protected Vendor identity, independently of the market, storefront hostname or native seller channel used to buy. No new customer accounts, payment handlers, inventory system or monetary allocation system were introduced.

## Architecture and authority

The backend implementation lives in `farmers-market-platform/src/plugins/marketplace-commerce/loyalty`. It is composed into MarketplaceCommercePlugin with `loyalty: true`, requiring paid attribution. Ordinary configuration enables it only with `ENABLE_LOYALTY=true`. This task does not enable or migrate any existing database. Programs are disabled until the vendor explicitly enables them.

The existing TenantAccessPolicy resolves current channel, grants and active vendor membership. Program and reward commands require `ManageOwnCoupon` and an owner membership. Vendor reports require `ReadOwnCRM`. Every report derives its vendor from that policy, never a submitted vendor ID. Customers require a verified, non-deleted global User/Customer. Applying a reward verifies the actual order owner, channel, active state and established commerce context. The centralized account bridge uses its existing authenticated customer session for the customer loyalty read.

Native vendor merchandise promotions supply the actual line discounts. Every loyalty application creates an order-bound promotion and an immutable entitlement snapshot. The existing promotion guard still enforces approved publication channels and one promotion per vendor. Loyalty promotion mappings cannot be edited through ordinary coupon editing. A leaked coupon cannot be applied to a different order or customer.

## Ledger and schema

The additive migration is `1792500000000-LoyaltyFoundation.ts`. It creates:

- `loyalty_program`: explicit vendor participation, inactive by default.
- `loyalty_wallet`: unique vendor/customer identity and transactional mutex, without a mutable balance field.
- `loyalty_reward` and `loyalty_reward_version`: reward identity/current status and append-only terms.
- `loyalty_qualification`: durable version qualifications, protecting already qualified customers from prospective edits.
- `loyalty_redemption`: issued terms, order, promotion, checkout attempt, lifecycle state and actual paid discount.
- `loyalty_award_unit`: original financial unit, pending/final/cancelled/refunded projection and fulfillment reference.
- `loyalty_ledger`: append-only signed available, pending and reserved deltas, event, source order/unit/redemption, original entry, reason, timestamp and unique idempotency key.

Foreign keys restrict historical deletion. The downgrade refuses to run once ledger or redemption history exists. Indexed owner, order, unit, version, attempt and reversal references support scoped reads. Database triggers reject ledger/version/qualification mutations and changes to an issued redemption's identity or terms. Raw SQL uses the transaction-bound Vendure repository, matching existing backend SQL adapters. These tables are migration-managed, not schema synchronization targets.

The ledger is authoritative. Wallet balances are sums of signed deltas. The unit and redemption records are lifecycle projections, not independently writable balances. There is no frontend balance editor or arbitrary adjustment endpoint. Demo adjustments are explicit, explained ledger events in a guarded disposable database.

The additive `1792600000000-LoyaltyEditableSelection` migration replaces the order/wallet unique constraint with a partial unique index excluding cancelled choices. It preserves earlier snapshots and allows only one non-cancelled choice per vendor/order. Its downgrade refuses to discard multiple-choice history. This task applies it only to new disposable databases.

`LoyaltyService.reconcile` compares pending and reserved sums to unit and redemption projections and independently checks available sums against finalized units minus reserved/completed spending plus auditable adjustments. It reports discrepancies without rewriting history. Recovery must append a separately authorized corrective transaction, never edit or delete historical entries.

## Checkout and points lifecycle

1. Opening a vendor card shows its reward dialog. Reviewing spends nothing. Its vendor-cart link carries the chosen version; the cart route stores only that preference in a short-lived HTTP-only same-storefront cookie. Both cart types show `Use Rewards`, disabled when nothing qualifies, and a shared options dialog. The prior dashboard choice is preselected and still requires confirmation. Successful application clears the preference. The applied reward remains visible at checkout.
2. Applying freezes terms against the editable order as `SELECTED`. No points move. Use Rewards stays visible and can remove or replace this choice. Replacement cancels the old entitlement and appends a new immutable snapshot in the same order-locked transaction. Invalid replacements preserve the original coupon and selection. Direct native coupon removal also cancels an unreserved entitlement. Reserved or paid choices remain locked.
3. The inventory capacity acquisition transaction holds the existing order/resource locks, acquires vendor wallets in stable vendor order and checks current balances, limits, dates and cart restrictions. It atomically moves the point cost from available to reserved as `RESERVED`. Concurrent orders cannot spend the same points.
4. The existing independently verified payment and native order placement create immutable paid-unit allocations. In that same transaction, the redemption becomes `COMPLETED`, reserved points are consumed and eligible cents become `PENDING_AWARD` entries.
5. The existing vendor fulfillment command delivers its real fulfillment and finalizes the corresponding original units. Those pending points become available. Other vendors' portions remain independent.
6. Repeated placement, fulfillment, refund and hold events do not duplicate ledger entries. Checkout release, invalidation and expiry return reserved points through an original-entry-linked release, then mark the entitlement `CANCELLED`. The existing expiry worker performs abandoned-hold recovery; local demo expiry is also scheduled.

Pending points are never spendable. There is no point expiration. Pausing stops new claims and new paid-order awards while preserving balances, history and already issued cart terms. Previously recorded pending units can still finalize. A permanent closure uses the same preservation policy; outstanding points are retained without conversion to cash or transfer to another vendor. Resuming allows the retained program and qualifications to be used again.

Eligible points are `original unit gross - original unit discount`, exclusively from the existing financial allocation. Item tax, shipping, shipping tax, platform surcharges and other non-product charges are excluded. Loyalty line discounts lower that eligible spending. All money and point accounting uses bounded integer minor units and BigInt allocation; percentages are rounded once and allocated by the existing largest-remainder allocator. No tax or payout totals are independently reconstructed by the frontend.

One loyalty reward is allowed per vendor order. That vendor's ordinary coupon cannot stack with it. Different vendors' supported coupons or loyalty rewards remain independent. Discounts cannot exceed eligible product totals. The existing tax-exclusive/native-commerce boundaries remain in force.

## Rewards and version transitions

The four-stage wizard chooses a type, collects its details, configures points/availability and reviews before publication. Fixed discounts, integer percentages with a mandatory monetary cap, and free catalog products are supported. A fixed discount's minimum eligible subtotal cannot exceed its discount value, enforced by native form constraints and backend normalization. Existing issued versions remain immutable. Point costs must be positive integers. Optional dates and per-customer redemption limits are validated on the server. Limits count successful and currently reserved uses across reward versions.

The free product must be the vendor's selected variant, already present in the cart in at least the required quantity. Each rewarded vendor portion must retain at least one paid product cent. A free reward therefore requires additional paid merchandise from that same vendor, or a greater quantity of the selected item. This preserves the existing positive-payment and full original-unit refund boundaries. The native line receives a deterministic discount for that quantity. Normal product publication, inventory, offering capacity, taxes, fulfillment and refund-unit allocation remain authoritative. The system never adds stock or creates an unfulfillable free line. The wallet read suppresses redemption for disabled/deleted products or insufficient canonical stock; checkout performs authoritative capacity checks.

Saving a reward appends a version. Existing issued entitlements retain their snapshot, including cost/value/restrictions. Qualification rows are recorded when finalized points reach a published threshold and when rewards are published against existing wallets. Before a published reward changes, current qualifiers are recorded under the old version. Qualified historical versions remain claimable under their original dates and limits, even after prospective editing or archiving, while the program is enabled. A qualification is not a points reservation: the customer must still have enough usable points at checkout. Dates retain their promised meaning. Archiving preserves all history and cannot be undone through the reward editor.

## Refunds and cancellations

The existing verified original-unit refund coordinator remains the only monetary refund owner. Once a refund settles, loyalty reverses the selected units' original eligible points. Full, multiple partial and repeated refunds use the original allocation, never current catalog prices or guessed discount shares. Unfulfilled cancellation passes the exact refund unit IDs to the loyalty hook, preventing a rounded allocation from being reversed on two different units. A fulfillment cancellation returns its specifically linked available award units to pending.

If earned points were already spent, available points may become negative. This is a debt, not silently forgiven points. Further earning repays it; pending balances do not authorize more spending.

Spent reward points are restored once when every original unit in that vendor's paid portion has a settled refund allocation. Partial refunds reverse product earnings but do not restore spent reward points. This deliberately conservative rule also applies to free-product allocations. Zero-paid units must be included in a supported original-unit refund batch before a full restoration; the system does not guess that the free merchandise was returned. `REVERSED` means the reward cost was restored. There is no transferable cash value.

## Customer and vendor experience

Customer loyalty lives at `/account/loyalty`, within the existing SSR shell. A React island supplies reward review and history interactions. Cards have a plain left-aligned icon/name heading, available balance ring, next-reward caption and one eligible Redeem action. Pending/reserved/debt information belongs in details. Paused programs retain their wallets. Vendor names and rewards come from the backend.

`LoyaltyProgressRing` targets the next strictly higher distinct point threshold. At 3,500 points with 2,000 and 5,000 milestones, the primary arc fills 70% and the entire remaining 30% uses a slightly stronger translucent primary tint to indicate the passed milestone. There is no old-color fragment. The horizontally centered SVG animates from zero to the current position on load; reduced motion shows the final position immediately. Equal-cost rewards share a milestone. The highest reached threshold is complete; affordable rewards remain accessible in the vendor card's dialog. Spending recalculates from available points. Zero, debt and no-reward states have numeric labels. `LoyaltyRedeemButton` composes the existing Button; its eligibility pulse respects reduced motion.

The approved styled Dropdown shows a list of activity labels and signed-point success/danger Badges. Purchases are grouped by original order/vendor; reservation/release/finalization bookkeeping is omitted. Clicking an entry opens shared details with pending amounts, original products/spending, reward terms or the owned order link. The immutable ledger remains authoritative. Queries filter by the authenticated wallet and use indexed wallet/unit/order references.

Vendor routes are `/vendor/loyalty`, `/vendor/loyalty/rewards`, `/vendor/loyalty/rewards/new`, `/vendor/loyalty/rewards/:id/edit`, `/vendor/loyalty/leaderboard` and `/vendor/loyalty/redemptions`. They reuse AdminShell, approved tabs, cards, KPI markup, form controls, searchable catalog selection, row detail dialogs and pagination. Reports use actual ledger and immutable order data. Net issuance differs from gross lifetime finalized credits; outstanding totals sum positive customer balances, with pending shown separately. Leaderboard rank uses net lifetime finalized earning and ignores reward spending. Display identifiers are `Customer <wallet id>`, without names or contact details. Daily trends cover earning credits, spent points, redemptions and repeat-customer activity. The date range affects trends, while KPI and leaderboard totals are lifetime values.

## APIs

| Surface               | Operation                                                                              | Authority                                                      |
| --------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Shop GraphQL          | `myLoyalty`, `loyaltyCheckout`                                                         | Current verified customer                                      |
| Shop GraphQL          | `applyLoyaltyReward(versionId, orderId)`, `removeLoyaltyReward(redemptionId, orderId)` | Current verified customer and owned editable order             |
| Admin GraphQL         | `ownLoyalty(filter)`                                                                   | Current vendor CRM grant and membership                        |
| Admin GraphQL         | `setOwnLoyaltyProgram(enabled)`                                                        | Current vendor coupon owner                                    |
| Admin GraphQL         | `saveOwnLoyaltyReward(terms, id, status)`                                              | Current vendor coupon owner                                    |
| Central server bridge | `customerLoyalty`                                                                      | Existing server bridge key and centralized customer capability |
| Storefront BFF        | `POST /api/loyalty` with `checkout`, `apply` or `remove`                               | Same origin plus current Shop session                          |

JSON projections follow the existing inbox adapter pattern, with named typed API factories on the frontend. No frontend submits a point balance, unit allocation, customer ID or authoritative vendor ID. New shop roots are explicitly registered in both existing market allowlists.

## Notifications and phase boundaries

No new automatic loyalty notification is emitted in this foundation. The existing centralized notification system was inspected and kept as the sole delivery infrastructure. There are no point-increase, pending, redemption-status or dashboard-visit notifications. A future Reward Available adapter must use an immutable qualification identity, the current customer recipient, existing preferences/authority and a loyalty destination; it must not notify on reads or repeated lifecycle deliveries. This optional notification is deferred instead of creating a parallel or noisy delivery path.

Deliberately excluded: market-owned points, attendance/challenges, multipliers, VIP tiers, transfers, reimbursements, birthday/referral rewards, POS/in-person earning, mobile apps, expiration and external loyalty services. Program configuration enforces the project's current USD storefront currency; other currencies require a separately instructed UI/accounting extension. Automatic free-item insertion, reward stacking, cash conversion, manual point adjustment tools, scheduled point expiration and loyalty-specific provider adapters are not implemented. Catalog restrictions use the existing owned variant policy. The wizard offers searchable optional eligible-product selection for ordinary discounts and a required product/variant for free products. No competing component category or hosting configuration was introduced.
