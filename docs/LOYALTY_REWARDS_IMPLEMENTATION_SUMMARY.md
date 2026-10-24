# Loyalty rewards implementation summary

Implemented locally across `E:\coding\farmers-market-platform` and `E:\coding\farmers-market-platform-web` on October 17, 2026. The existing uncommitted notification, identity, documents and market work was preserved. No commit, remote Git action, deployment, hosting integration or screenshot was performed. Neither `vendure` nor the populated `vendure_demo_market_ops` database was migrated, seeded or reset.

## Implemented behavior

- Vendor-owned, explicitly enabled programs with a universal one-point-per-eligible-cent rule. No adjustable earning rate or cross-vendor spending.
- Global customer/vendor wallets that survive storefront and market context changes. Available, pending, reserved and refund debt are distinct, ledger-derived values.
- Immutable, idempotent accounting entries; original paid-unit earning; transaction-bound wallet locking; original-entry-linked reversals; independent reconciliation; immutable entitlement/version history and a downgrade guard.
- Fixed, capped whole-percentage and free-product rewards, optional minimums, owned product restrictions, start/end dates and per-customer limits. The four-stage wizard supports drafts, publication, editing, deactivation and archiving.
- Durable grandfathering for existing published qualifications and issued terms. Exact same-term versions are collapsed for customer presentation without deleting history.
- Real vendor merchandise promotion integration, correct multi-vendor discount allocation, native tax/inventory/fulfillment handling and verified local/provider checkout composition. Selection spends nothing; capacity acquisition reserves points; verified order placement consumes them and records pending earning.
- Actual vendor fulfillment finalizes only its original units. Unfulfilled cancellation, fulfillment reversal, hold cancellation/expiry and settled full/partial refunds reconcile original unit amounts without duplicate credit.
- Vendor overview KPIs, actual daily charts, top customers, scoped/searchable/paged ranking, reward management and filterable redemption history with shared detail dialogs and operational-order links.
- Customer SSR loyalty route and navigation, vendor cards, generic store logo fallback, cumulative milestone rings, reduced-motion redeem controls, real cart-specific reward eligibility, review dialogs and immutable reward/transaction history.
- Guarded disposable PostgreSQL demo, four fictional customer accounts, three independent vendors, two market contexts, real catalog/inventory/market relationships, actual historical purchases/redemption/refund, auditable demo adjustment entries and narrowly scoped fulfillment/refund/cancellation helpers.

## Components and design contracts

New reusable exports are `LoyaltyProgressRing`, `LoyaltyRedeemButton` and the pure `loyaltyProgress` helper in `@market/ui/loyalty`. The ring was necessary because there was no existing cumulative multi-milestone indicator. The button composes the existing Button and adds the requested eligibility bounce/glow state while keeping native button and focus semantics.

Feature compositions are `VendorLoyalty`, `LoyaltyRewardWizard`, its leaderboard/trend views, `CustomerLoyalty` and `CheckoutLoyalty`. They reuse AdminShell, CustomerLayout, approved navigation adapters, route tabs, Card/RecordCard, UtilityIcon, Badge, Button, Dialog, Dropdown, DataTable/recordDetails, Pagination, Input/Field, SelectField, SearchSelect, SearchableMultiSelect, EmptyState and the existing request/read controllers. Existing chart implementations did not provide the requested domain trends; the bounded composition now uses SVG bars, dates, numeric axes, totals and the shared date-range Dialog, without another library or chart standard.

Customer cards now use plain left-aligned icon/name headings, centered animated rings, a stronger 38% translucent achieved track, and only next-reward text plus an eligible bouncing/glowing Redeem action below the graphic. Pending/reserved/debt facts live in details. History is a list of activity labels and green/red signed-point Badges inside the approved Dropdown, opening shared detail dialogs. RecordCard gained compatible optional header/renderTrigger adapters. Full gold/silver/bronze leader cards have trophy/medal icons and clickable details, with no visible card rank numbers. Vendor graph Buttons open UTC date-range dialogs, real scoped graphs and all daily values, including zeros. Fixed-discount minimums remain capped at the discount amount.

Both carts reuse CheckoutLoyalty. A dashboard preference travels through a short-lived HTTP-only same-storefront cookie and is preselected without moving points. Use Rewards remains after application and permits removal or atomic replacement while editable. Native coupon removal also cancels an unreserved entitlement. Invalid replacement rolls back to the original coupon and immutable choice; held/paid choices stay locked. The additive `1792600000000-LoyaltyEditableSelection` migration preserves cancelled snapshots while enforcing one active choice per vendor/order, and refuses destructive downgrade. It was applied only to fresh disposable databases.

The root `UI_COMPONENTS.md`, `COMPONENT_USAGE_GUIDE.md` and existing authoritative `docs/UI_DESIGN_REFINEMENT.md` record the interfaces, states, milestone segments, motion behavior, renderer boundaries and reuse rationale. No pending design category was silently approved.

## Database and accounting

Migration: `src/migrations/1792500000000-LoyaltyFoundation.ts` in the backend. New tables are program, wallet identity, reward, immutable reward version, immutable qualification, redemption, original award-unit projection and immutable ledger. Indexed references preserve customer/vendor/order/unit/reward/version/attempt/reversal provenance. This migration was applied only to new disposable test/demo databases.

The existing financial snapshot owns gross, discount, tax, shipping and unit allocation. Loyalty reads `gross - discount` for points, excludes other components and uses integer/BigInt arithmetic. It never replaces native prices, payout authority, provider evidence or refund verification. Refunds may create debt after points have been spent. Spent reward points return once every original vendor unit is refunded. One reward per vendor order and no stacking with that vendor's ordinary coupon are intentional conservative policies.

Each rewarded vendor portion must retain paid product value. Free rewards require the selected variant in the real cart plus additional paid merchandise from that vendor, or additional units beyond the free quantity. This keeps the existing positive-payment and original-unit refund architecture valid. Applying an invalid reward never creates inventory or a fake order. A refused reservation restores cart editability when no held attempt or payment work exists.

## Validation results

| Check                                                 | Result                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New backend loyalty integration                       | 33/33 groups passed against real isolated PostgreSQL, including atomic choice replacement/removal, immutable history, locking and custom date ranges                                                                                                                                                                         |
| Existing paid-attribution/refund regression           | 62/62 groups passed, including its prior-phase regression chain and database safety checks                                                                                                                                                                                                                                   |
| Full frontend unit suite                              | 488/488 tests passed across 39 files                                                                                                                                                                                                                                                                                         |
| DOM-only browser qualification                        | 7/7 groups passed: responsive cards and Axe, centered animated rings and reduced motion, cart redemption and original-unit fulfillment/refund, graph date dialogs, tinted medal cards, cart reward removal/replacement, all reward wizards and minimum validation, persisted dashboard preselection, and reservation release |
| Frontend TypeScript and Astro                         | Passed; 92 Astro files, zero errors/warnings/hints                                                                                                                                                                                                                                                                           |
| Backend typecheck                                     | Passed                                                                                                                                                                                                                                                                                                                       |
| Backend build                                         | Dashboard, server and worker passed with explicit local environment flags                                                                                                                                                                                                                                                    |
| Frontend builds                                       | Storefront SSR and Admin passed                                                                                                                                                                                                                                                                                              |
| Focused ESLint, shared-boundary and formatting checks | Passed                                                                                                                                                                                                                                                                                                                       |

The foundation's first full unit pass exposed one expected navigation-list change for the new Loyalty route; its exact-route expectation was extended. The latest refinement rerun passes all 488 tests. The existing 62-group financial regression result is from the foundation run; the refinement adds guarded cancellation of unreserved choices during native coupon removal; financial earning and refund writes remain unchanged. Development iterations caught and corrected an SVG title hydration mismatch, percentage defaults, browser hydration timing, original-unit allocation and database update-return handling. Refinement tests also corrected their waits for dialog dismissal and analytics loading. The boundary check rejected an initial browser-storage preference; it was replaced with the server's HTTP-only cookie and the boundary check passes. These development failures are resolved, not presented as pre-existing failures.

Existing nonfatal notices include the PostgreSQL driver's concurrent-query deprecation in shared fixtures and the frontend's large shared chunk warning. The isolated demo also exposes an existing unavailable notification-inbox read on market storefront hosts (`POST /api/notifications` returns 503), while the central customer inbox and all loyalty flows work. This source/allowlist gap was not broadened into unrelated notification feature work. No new loyalty notification is emitted. Failed development runs retain only their random test databases under the existing diagnostic retention guard; successful qualification databases are closed and dropped.

## Deliberate boundaries and remaining limitations

- Other currencies are not enabled by this UI foundation; program configuration enforces the current USD storefront convention.
- Point expiration and a manual adjustment UI are not provided. Existing data remains intact on pause/archive. Internal demo adjustments are explicitly audited and isolated.
- Optional Reward Available notification delivery is deferred. The existing notification infrastructure remains the only delivery system, and no repetitive point/status notifications were added.
- Free products are already in the cart and require a paid vendor remainder. There is no automatic free-line insertion or zero-payment checkout.
- Each issued snapshot is immutable, but an unreserved editable-cart choice can be cancelled and replaced with a new snapshot. Reserved/paid choices and existing terminal checkout/cart reset rules remain locked.
- Analytics use lifetime KPIs/ranking and selectable recent daily trends; no previous-period comparison is shown. Daily values and privacy-safe ranking are actual ledger data. This phase has no cached analytics materialization.
- No market-owned programs, attendance/challenges, tiers, multipliers, referrals/birthdays, cross-vendor transfers/reimbursements, POS/in-person integration, separate mobile app or paid external loyalty service was built.

## Local files changed by this task

Backend additions:

- `src/migrations/1792500000000-LoyaltyFoundation.ts`
- `src/migrations/1792600000000-LoyaltyEditableSelection.ts`
- `src/plugins/marketplace-commerce/loyalty/{api,calculations,service}.ts`
- `test/loyalty/{fixture,run,demo}.ts` and `test/loyalty/tsconfig.json`

Backend integrations:

- `src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts` and `types.ts`
- `src/plugins/marketplace-commerce/market-browse.interceptor.ts`
- `src/plugins/marketplace-commerce/commerce/checkout-coordinator.ts`
- `src/plugins/marketplace-commerce/financial/{vendor-promotion.service,financial-attribution.service,refund-coordinator,refund-writer.service}.ts`
- `src/plugins/marketplace-commerce/inventory/{inventory-coordinator,operational-inventory.service}.ts`
- `src/plugins/marketplace-commerce/customer-account/controller.ts`
- `src/vendure-config.ts`, `package.json` and `.gitignore`

Frontend additions:

- `packages/api/src/loyalty.ts`
- `packages/ui/src/loyalty.tsx` and `loyalty.css`
- `apps/admin/src/vendor/loyalty.tsx`
- `apps/storefront/src/components/{CustomerLoyalty,CheckoutLoyalty}.tsx`
- `apps/storefront/src/lib/loyalty.ts`
- `apps/storefront/src/pages/account/loyalty.astro` and `pages/api/loyalty.ts`
- `scripts/loyalty.ts` and `tests/loyalty.test.tsx`

Frontend integrations:

- `apps/admin/src/vendor/{VendorRoutes.tsx,service.ts}` and `apps/admin/src/NavigationIcon.tsx`
- `packages/admin-core/src/index.ts`, `packages/api/src/index.ts`, `packages/ui/src/presentation.ts` and `packages/ui/package.json`
- `packages/ui/src/record-details.tsx` (compatible optional RecordCard props)
- `packages/ui/src/utility.tsx` (shared trophy/medal icon variants)
- `apps/storefront/src/components/Checkout.tsx`
- `apps/storefront/src/components/{MarketCart,VendorCart}.tsx` and `apps/storefront/src/pages/cart.astro`
- `apps/storefront/src/lib/{shop,customer-dashboard}.ts`
- `tests/customer-dashboard.test.ts`, root `package.json` and `.gitignore`

Documentation created/updated:

- `docs/LOYALTY_REWARDS_FOUNDATION.md`
- `docs/LOYALTY_REWARDS_TESTING.md`
- `docs/LOYALTY_REWARDS_IMPLEMENTATION_SUMMARY.md`
- Root `UI_COMPONENTS.md` and `COMPONENT_USAGE_GUIDE.md`
- Existing `docs/UI_DESIGN_REFINEMENT.md`

Other changes already present in either worktree are not attributed to this task. No environment credential file or existing protected database configuration was changed.

## Start or recreate the manual demonstration

From the web repository, run `npm run demo:loyalty`. The command starts the owned local backend and both frontends, prints all URLs/accounts and writes only an ignored runtime manifest. Stop with Enter or Ctrl+C, then run the same command to recreate fresh fictional data. It refuses occupied ports and arbitrary database targets. Exact credentials, starting balances, original-unit refund expectations and every manual step are in [the testing guide](LOYALTY_REWARDS_TESTING.md).
