# Stage G loyalty architecture

## Existing owners

`LoyaltyService`, `MarketLoyaltyService`, `FinancialAttributionService`, `InventoryCoordinator`, `OperationalInventoryService`, `ProviderFactsService` and `RefundCoordinator` retain their responsibilities. There is one vendor wallet, one point ledger, one reward lifecycle and one market contribution projection. No provider owns a loyalty balance.

Vendor earning remains one point per eligible original merchandise cent after discounts. It becomes pending when verified payment creates the native purchase snapshot and available when the existing POS delivery operation completes. Anonymous purchases do not create wallets. Online earning still waits for ordinary fulfillment.

Market challenge types remain Discovery, Visits and Spending. Published terms are immutable. The adapter creates the same pending original-unit contributions as online orders, and POS handoff finalizes them through the same operational hook. Refunds retain their original order and occurrence identity.

## Cashier reward selection

The existing `commandOwnPosDraft` JSON command accepts `reward` with a reward version and `verballyAgreed: true`, or `removeReward`. It accepts no discount amount. The existing cashier, channel, vendor, draft version, operation key and edit-state checks run first.

`LoyaltyService.applyPos` resolves the customer from the owned draft, verifies its active account and enforces reward vendor ownership. Its private shared implementation then performs the existing date, balance, published/historical qualification, usage limit, cart, product, positive payable value and stacking checks. Native Vendure promotion conditions and integer allocation calculate the quote before collection. Changing the customer clears the old selection atomically. Removing a reward cancels that selection without spending points.

Selection does not spend points. The existing capacity-acquisition transaction locks the wallet and reserves the point cost and usage limit. Concurrent checkouts may review the same option but cannot consume a single-use reward twice. Definitive payment failure releases the reservation through the existing release ledger entry. Unknown or captured-but-unfinalized attempts retain it. Original-attempt recovery completes the original native payment, delivery and redemption once.

Migration `1793300000000-InPersonLoyalty` adds only `pos_loyalty_consent` and `pos_identity_lookup`. Consent has immutable customer, vendor, draft, responsible cashier, timestamp and explicit verbal agreement, with a database trigger validating its lineage. Reward identity, native order, capacity/payment attempt, paid discount and state are joined from the existing redemption and POS records. Lookup audits retain outcome and operational IDs, without raw phone or email. Neither table is a balance cache.

## Original market context and time

The existing POS selector validates approved membership, verified consent, confirmed participation, market status and product publication. Quote verification rechecks that context before payment starts. Its frozen context carries occurrence identity, start/end instants, configured time zone and participation/membership/occurrence versions into the immutable financial snapshot.

Cash uses the backend cash-receipt attestation time. Simulated delayed capture has its deterministic controlled completion time. Square Terminal, mobile POS app and Mobile Payments evidence carry independently retrieved capture/payment timestamps. Clover REST uses the independently retrieved payment timestamp. Controlled Clover Go can supply its original provider timestamp. Missing, invalid or future timestamps fail closed for attendance-based market qualification; a verified financial purchase can still earn ordinary vendor points.

The adapter evaluates the original time against the frozen occurrence's half-open interval `[start, end)`. It does not use browser time, webhook delivery time or refund time. Stored canonical instants already encode the occurrence's configured time zone, DST offset, midnight crossing and multi-day duration. Delayed processing may enter an automatically closed occurrence window when the original verified time belonged to it. Current online window behavior is preserved.

POS financial units do not require online occurrence offerings or preorder caps. Their vendor participation was validated and frozen by the POS quote. Original draft/order/vendor/occurrence lineage is checked when adapting the units. Later membership changes do not rewrite the original purchase evidence.

## Market reward boundary

Existing market rewards contain a manager's fulfillment promise, instructions and claim lifecycle. They contain no authoritative checkout discount or vendor reimbursement rules. Relevant valid rewards are displayed with collection instructions and an explanation that the market manager fulfills them. They are not converted from free text into a coupon. Vendor rewards are redeemable directly in checkout. Introducing monetary market rewards requires an explicit domain design; this stage does not fabricate such a contract.

## Shared UI

The register extends its existing feature composition and `PosCartQueue`. It reuses Button, Card with contained spacing, Field, Input, Dialog, the dashboard shell, existing money formatting and touch tokens. No new component, renderer adapter, primitive, styling system or UI category is introduced. Customer name, balances, exact cart discount, restriction reason and availability come from the authorized server projection. Market collection promises remain clearly distinct from usable vendor discounts.
