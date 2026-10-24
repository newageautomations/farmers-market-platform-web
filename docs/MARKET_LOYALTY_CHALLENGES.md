# Market loyalty challenges

Market loyalty extends the [vendor loyalty foundation](LOYALTY_REWARDS_FOUNDATION.md). It introduces objectives and manager-described rewards. It has no points, discount engine, reward currency, inventory reservation or automatic merchandise fulfillment.

## Ownership and availability

Each market owns an independent, explicitly enabled program. The additive migration creates no enabled programs for existing markets. Managers can prepare and publish campaigns before enabling the program. Multiple campaigns can run concurrently. Each customer has separate progress per campaign and can earn one claim per campaign.

Runtime composition uses `marketLoyalty: true` in MarketplaceCommercePlugin, or `ENABLE_MARKET_LOYALTY=true` in ordinary configuration. Paid attribution and customer relationships are prerequisites. This work does not change ordinary environment files or migrate existing databases. The guarded disposable demonstration enables the feature explicitly.

Disabling a program stops admission of new paid units. Units admitted while enabled can still finalize or reverse. Existing completions remain claimable, including after disable, pause, closure, expiry or archive. Pausing, closing or archiving a campaign stops new admissions. Closing is terminal except for archive; archive is terminal. Pending purchases already admitted retain their opportunity to finalize. There is no retrospective backfill when a program is enabled or a new campaign is published.

## Configurable objectives

| Type             | Target                                 | Qualification                                                                                                                                            |
| ---------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vendor Discovery | Configurable distinct vendor count     | Each vendor must have at least one independently qualifying order portion. Multiple smaller orders are never combined.                                   |
| Market Visits    | Configurable distinct occurrence count | At least one order's eligible fulfilled market portions must meet the configured minimum in that occurrence. Separate orders are never combined.         |
| Market Spending  | Configurable integer minor-unit amount | Sum original eligible units across a starting occurrence and configurable number of consecutive scheduled opportunities. Multiple orders may contribute. |

Discovery and Visits support optional occurrence windows. Spending requires a starting occurrence and a window of 1 through 100 opportunities. Vendor and visit targets are bounded to 1 through 1,000. Monetary configuration uses bounded integer USD minor units. A zero purchase minimum still requires positive eligible product spending. A single eligible order may contribute to every applicable active campaign and to independent vendor loyalty earning.

The manager's four-stage wizard chooses the objective, collects its requirements and title, accepts a required multiline reward description, then previews and publishes or saves a draft. Descriptions are up to 2,000 characters, reward text up to 4,000, and pickup instructions up to 2,000. The underlined See common rewards link opens a modal with plain-text suggestions, leaving the manager's custom description unchanged. No catalog item, discount or coupon is required. Text is rendered through React text nodes with preserved line breaks, never as HTML.

## Commerce authority

The authoritative path is the existing verified checkout placement transaction:

1. Native Payment and independently verified capture create PurchaseFinancialSnapshot.
2. Original vendor, line and unit allocations preserve the actual discounts and paid merchandise.
3. MarketLoyaltyService reads OrderContext and the original OrderLineLink offering, participation and membership.
4. Only `MARKET_OCCURRENCE` purchases in USD, with a matching market, canonical occurrence, actual vendor, approved membership and confirmed participation, are admitted.
5. A campaign/unit primary key prevents duplicate allocations. An immutable purchase receipt records the admission decision even when the program is disabled, preventing a later payment retry from backfilling that purchase.

Direct vendor storefront purchases and purchases from another market do not qualify automatically. The customer never submits spending, a balance, a vendor identity, an occurrence identity or a progress total. An order is admitted only through the canonical commerce coordinator. Checkout validation, stock, caps, tax, shipping, discounts, splitting, payments and refunds remain under their existing owners.

Eligible spending is each original unit's `gross - discount`. Item tax, shipping, shipping tax and platform charges are excluded. No current product price is used to reconstruct a purchase. Vendor loyalty discounts reduce market-eligible spending as they reduce actual paid merchandise. Claims do not read, spend, reserve, restore or transfer vendor points.

## Pending, finalized and reversed progress

Contributions begin as `PENDING`. The canonical vendor fulfillment coordinator finalizes only its actual original units as `FINAL`. Other vendors can remain pending. Partial fulfillment contributes only the eligible amount actually finalized. Pending discovery/visit counts are the additional distinct identities that would qualify if current pending units finalized. Pending progress never authorizes a claim.

The operational hook records a durable operation receipt per campaign, as well as unit audit events. Repeated payment or operational events cannot count another unit. Fulfillment cancellation returns its exact linked finalized units to pending. Unfulfilled cancellation and settled original-unit refunds invalidate the selected units. Refund allocation identity, including unevenly discounted original units, is reused from the existing refund coordinator.

Progress is recomputed from surviving unit projections, grouped by vendor/order or occurrence/order as appropriate. Other independently qualifying orders protect a vendor or visit from being removed incorrectly. A multi-day MarketOccurrence is one visit opportunity. Timestamps and calendar days do not create visit identities.

## Occurrence windows and schedule changes

At publication the service freezes the available scheduled occurrence sequence, ordered by canonical `startsAt, id`, starting with the selected occurrence. It stores IDs, labels, start and end instants. It never multiplies a weekly schedule by seven days. Subsequent schedule edits cannot reorder those stored slots or change their frozen closing instants.

Future dates need not all exist at publication. Missing slots remain visibly pending. When the existing scheduling system generates more occurrences, reconciliation appends the next actual scheduled occurrences after the frozen tail. The loyalty feature does not create its own calendar or duplicate the recurrence generator.

Before the window closes, a cancelled occurrence is retained as a skipped audit row and replaced by the next scheduled occurrence after that tail. A cancelled opportunity does not consume the configured count. Previously admitted original units and earned rewards are retained; cancellation of the corresponding purchases or refunds remains the authority for financial reversals. Replacements do not erase paid provenance. New earlier dates inserted into the schedule do not displace frozen opportunities. A cancellation discovered after a sealed window does not reopen the campaign.

Once all required non-skipped slots are materialized and their frozen ends have passed, the service seals `closed_at` and displays `EXPIRED`. A campaign awaiting unmaterialized slots cannot expire by a guessed calendar deadline. Expiry is evaluated during scoped reads or lifecycle processing, without a separate timer or global clock change. New admissions stop, but previously admitted pending purchases can finalize late. An unfinished campaign remains historical and earns nothing unless those previously admitted units subsequently meet the objective. Completed rewards and pending fulfillment remain usable after expiry.

## Immutable terms and campaign versions

A campaign has one publication version. Its campaign ID, `published_terms` and `published_at` identify that durable version. Published terms cannot be edited through the API or database updates. Requirements, reward description and pickup instructions are locked together. The manager can create a replacement using the prior configuration as an editable starting point. Replacement is a separate campaign, with independent future activity and no copied progress.

The first completion stores an immutable original terms snapshot, original finalized unit evidence and earned timestamp. A mutable `valid` projection reports current qualification. Restored qualification reuses the same completion identity. Every transition appends an event. Claims store the promised terms again and reference that completion. Later archive or program changes do not alter the promise.

## Claims, fulfillment and refunds

Customers review the objective, original promise, market and instructions in the shared confirmation dialog. The server rechecks ownership and current finalized progress inside a challenge-locked transaction. A unique completion/claim constraint and serialized insertion make retries and concurrent claims idempotent. Returning an existing claim does not issue another entitlement.

Claims have `CLAIMED` or `FULFILLED` status, with an independent `NONE`, `REQUIRED` or `RESOLVED` review state. Managers can record a fulfillment note. The server stores the current actor, timestamp and audit event. Fulfillment is manual and creates no checkout order, stock deduction, vendor reimbursement or payment obligation.

- An unclaimed completion loses eligibility when surviving units no longer meet the threshold.
- A claimed unfulfilled reward becomes `REQUIRED` for review when its qualification reverses.
- Fulfillment of a review-required claim needs an explicit nonempty resolution, recorded in the immutable audit history.
- A fulfilled physical reward keeps its fulfillment actor, date, note and original promised terms after reversal, and is flagged for review. Merchandise is not pretended to have disappeared.

## Authorization and APIs

Manager reads reuse `ReadOwnMarket`; commands reuse `ManageOwnMarketSchedule`. TenantAccessPolicy rechecks current channel-scoped grants and active marketAdmin membership on every action. No market ID is accepted as command authority. Cross-market reads or fulfillment are rejected. Customer actions require the current verified, undeleted global Customer/User. Claims derive the customer from that session.

| Surface                | Operations                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Admin GraphQL          | `ownMarketLoyalty`, `setMarketLoyaltyProgram`, `saveMarketChallenge`, `setMarketChallengeStatus`, `fulfillMarketReward`      |
| Shop GraphQL           | `myMarketChallenges`, `claimMarketChallenge`                                                                                 |
| Central account bridge | `customerMarketChallenges`, `claimCustomerMarketChallenge`, using the existing server bridge and central customer capability |
| Storefront BFF         | `POST /api/market-loyalty`, actions `list` and `claim`, same-origin and bounded-body checks                                  |

Both market Shop allowlists explicitly register the new customer operations. The central bridge does not expose administrative APIs to customer JavaScript. The frontend API factory is typed and separate from vendor loyalty. Customer discovery uses existing market follows or actual campaign activity/completions, never all unrelated markets. If market loyalty is unavailable in an older environment, the market tab reports unavailable while preserving the vendor rewards view.

## Schema and locking

`1792700000000-MarketLoyaltyChallenges` adds program, challenge, window, contribution, purchase receipt, completion, claim and event tables. All historical references use restrictive foreign keys. Queries have indexed campaign/customer/unit/order/occurrence/vendor/fulfillment and audit references. Monetary totals use integer minor units and checked sums, with BigInt for aggregate spending.

Campaign rows serialize claims, fulfillment and unit reconciliation. Multi-campaign lifecycle work locks campaigns in ascending ID order. Payment admission and publication first serialize through the market program row, then campaign rows. These are transaction-bound Vendure repositories, participating in the existing purchase/fulfillment/refund transaction. A failed hook rolls back the associated operation. No independent balance service is introduced.

Database triggers reject audit/receipt edits and historical deletion, changes to original contribution identity, published terms, window provenance, earned terms or fulfilled claim details. The downgrade refuses history destruction. Mutable fields are projections and operational state, not immutable accounting facts. Recovery must use the owning lifecycle, never direct total editing.

## UI and bounded extensions

Manager routes use the existing AdminShell at `/market/loyalty`, `/market/loyalty/challenges`, `/market/loyalty/challenges/new`, `/market/loyalty/challenges/:id`, draft `/:id/edit`, `/:id/replace`, and `/market/loyalty/rewards`. Tables show identifier/status and open details for actions. Overview metrics, real occurrence participation, eligible spending and active campaign completion rates come from actual records.

Customer `/account/loyalty` retains Vendor Rewards and adds Market Challenges using the shared keyboard-accessible Tabs. Shared challenge compositions reuse Card, Badge, UtilityIcon, Dialog, form controls and LoyaltyRedeemButton. LoyaltyProgressRing has a compatible optional objective display, leaving vendor milestones unchanged. Numeric accessibility, 100% arc caps, responsive sizing and reduced-motion rules are reused. No new primitive or design category is approved.

## Limitations and future work

- USD matches the existing storefront and vendor loyalty envelope.
- Notifications are deliberately dashboard-only. No new progress, purchase, completion or fulfillment notification is sent. Future notification integration must use the existing deduplicated inbox contract.
- No automatic recurring campaigns, in-person entries, QR/POS, points, market discounts, reimbursement, automatic merchandise fulfillment or external loyalty service.
- Overview and claim history are scoped live projections, without a reporting cache or large-dataset server pagination. Current customer audit panels show the most recent 100 events. Original database history is retained.
- Missing future window slots wait for the existing schedule generator or manual scheduling. Loyalty does not generate speculative dates.
- The demo uses broad, explicit occurrence-level preorder windows, so all six fictional future dates can be purchased without moving any system clock.

See [testing and demo access](MARKET_LOYALTY_TESTING.md) and [implementation results](MARKET_LOYALTY_IMPLEMENTATION_SUMMARY.md).
