# Market loyalty implementation summary

Implemented locally across the existing backend and web repositories. Existing uncommitted notification, vendor loyalty, market and UI work is preserved. No commit, push, PR, remote branch change, deployment, hosting service, production database operation or screenshot is part of this work. Neither `vendure` nor `vendure_demo_market_ops` was migrated, seeded, reset or otherwise changed.

## Delivered behavior

- Explicitly enabled market programs, disabled by default for existing markets, and multiple independent campaigns.
- Configurable Vendor Discovery, Market Visits and Market Spending objectives. Single-order minimums are preserved; only spending aggregates across separate purchases.
- Four-stage manager wizard, multiline arbitrary reward description, suggestions, optional pickup instructions, drafts, immutable publication, pause/close/archive and separate replacements.
- Original paid-unit attribution through actual market occurrence offerings, vendor participation and memberships. Direct vendor and wrong-market purchases are excluded.
- Independent pending/finalized contributions, partial fulfillment, fulfillment reversal, cancellations, original-unit refund reversal and durable event receipts.
- Completion evidence and promised terms, transactional/idempotent customer claims, manager fulfillment notes, actor/timestamp history and explicit audited review of invalidated claims.
- Manager overview, real occurrence participation, active campaign completion rates, minimal identifier/status tables and detail-dialog actions.
- Existing customer Vendor Rewards retained, Market Challenges tab, shared fixed-objective rings, pending labels, confirmation dialogs and claim/fulfillment history.
- Existing customer sessions, server bridge, market Shop allowlists and current tenant permissions reused. No frontend authority over progress is added.
- Guarded disposable demo with four vendors, six irregular occurrence opportunities, five customer states and real purchase/fulfillment/refund provenance.

## Schema and architecture

The additive backend migration is `src/migrations/1792700000000-MarketLoyaltyChallenges.ts`. Program, campaign, frozen window, original-unit contribution, purchase receipt, completion, claim and append-only audit tables have restrictive references and historical mutation guards. This migration is applied only in fresh disposable databases during qualification.

MarketLoyaltyService is composed into the existing MarketplaceCommercePlugin. Its opt-in requires paid attribution and customer relationships. Payment, operational fulfillment and settled refunds call it inside their existing transactions. It never invokes vendor point accounting, changes monetary allocation formulas, creates promotions or deducts inventory for manager-described rewards. Existing vendor ledger reconciliation is run in the integration suite.

One publication per campaign provides the durable version identity. Replacements get a new campaign ID. Window slots freeze actual occurrence sequence and timestamps; cancellations append audited replacement opportunities. Missing future slots wait for the existing schedule generator, without a parallel recurrence engine. Expiry stops new admission while preserving admitted fulfillment and earned entitlements.

See [architecture and lifecycle policies](MARKET_LOYALTY_CHALLENGES.md) for exact rules and [manual demo/testing](MARKET_LOYALTY_TESTING.md) for credentials, commands and expected outcomes.

## Reused and added UI

Reused AdminShell and customer SSR shell, route navigation, Tabs, Card, Badge, UtilityIcon, DataTable record details, Dialog, Field/Input/SelectField/Textarea, loading/error/empty states, LoyaltyProgressRing and LoyaltyRedeemButton. The existing Textarea remains compatible shared code; no pending design category is newly approved.

`LoyaltyProgressRing.display` is an optional presentation prop. Omitting it preserves existing cumulative vendor milestones, thresholds, labels and animation. MarketChallengeCard and MarketChallengeTermsView are shared domain compositions because the existing primitives and vendor wallet card do not express market objectives, occurrence terms and manually fulfilled promises. They introduce no competing primitive or styling system. Both use existing palette tokens, numeric SVG accessibility and reduced-motion behavior. Root component documentation records these contracts.

## Files introduced or integrated

Backend additions:

- `src/migrations/1792700000000-MarketLoyaltyChallenges.ts`
- `src/plugins/marketplace-commerce/market-loyalty/{api,calculations,service}.ts`
- `test/market-loyalty/{fixture,run,demo-setup}.ts` and `tsconfig.json`

Backend integrations:

- `src/plugins/marketplace-commerce/{marketplace-commerce.plugin,market-browse.interceptor,types}.ts`
- `src/plugins/marketplace-commerce/financial/{financial-attribution.service,refund-writer.service}.ts`
- `src/plugins/marketplace-commerce/inventory/operational-inventory.service.ts`
- `src/plugins/marketplace-commerce/customer-account/controller.ts`
- `src/vendure-config.ts`, backend `package.json`
- Existing guarded `test/loyalty/demo.ts` and `test/platform-inbox/third-vendor.ts` extended with optional market demo setup and an additional vendor index; existing defaults retained.

Frontend additions:

- `packages/api/src/market-loyalty.ts`
- `packages/ui/src/market-challenges.tsx`
- `apps/admin/src/market/loyalty.tsx`
- `apps/storefront/src/components/CustomerMarketChallenges.tsx`
- `apps/storefront/src/lib/market-loyalty.ts`
- `apps/storefront/src/pages/api/market-loyalty.ts`
- `scripts/market-loyalty-browser.ts`, `tests/market-loyalty.test.tsx`

Frontend integrations:

- `packages/api/src/index.ts`, `packages/ui/src/{loyalty.tsx,loyalty.css}`
- `packages/admin-core/src/index.ts`, `apps/admin/src/market/{MarketRoutes.tsx,service.ts}`
- `apps/storefront/src/pages/account/loyalty.astro`
- Existing `scripts/loyalty.ts`, root `package.json`, `.gitignore`
- Root `UI_COMPONENTS.md`, `COMPONENT_USAGE_GUIDE.md`
- The three `docs/MARKET_LOYALTY_*.md` documents

Other pre-existing local changes are not attributed to this feature. The vendor loyalty foundation documentation is retained intact.

## Qualification results

Final qualification on October 18, 2026:

| Check                                      | Result                                                                                                                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full frontend Vitest suite                 | 500 passed, 0 failed, across 40 files; includes 12 new market cases and the existing vendor/customer/navigation suites                                                                                                |
| Market backend integration                 | 38 groups passed, 0 failed, in a fresh guarded database                                                                                                                                                               |
| Existing vendor loyalty backend regression | 33 groups passed, 0 failed, in its own fresh guarded database                                                                                                                                                         |
| DOM-only market browser suite              | 12 groups passed, 0 failed, including all three wizards, 1280/390px accessibility/layout, reduced motion, real browser checkout, pending/final progress, claims, fulfillment, occurrence purchases and refund history |
| Frontend typecheck and Astro check         | Passed; 95 Astro files, zero errors, warnings or hints                                                                                                                                                                |
| Storefront and admin production builds     | Passed                                                                                                                                                                                                                |
| Backend dashboard/server/worker build      | Passed                                                                                                                                                                                                                |
| Full ESLint check                          | Passed, with the existing nonfatal JSX AST non-null-expression notice                                                                                                                                                 |
| Package/source boundary check              | Passed across nine workspaces                                                                                                                                                                                         |
| Repository-wide Prettier                   | Fails on the pre-existing formatting of `packages/ui/package.json`, which this feature did not edit. New and changed feature sources/documents are formatted separately.                                              |

The original frontend suite had 488 tests; this feature adds 12 component cases. No screenshot-based testing, video recording or tracing is used. Successful qualification databases were closed and dropped by their owning guards. Failed development runs retained only their own random disposable databases under the existing diagnostic policy.

Development checks found and corrected a missing follows migration in the isolated fixture, fourth-vendor setup ordering/identity, an API enum mismatch in demo setup, an older backend TypeScript array-helper target, both market navigation registries, test selectors for shared record controls, native financial-test recalculation, frontend currency draft editing and a render-time clock lint issue. These are resolved implementation corrections, not pre-existing failures. The final checks above have no functional test failures.

Nonfatal existing notices include the shared fixture's PostgreSQL concurrent-query deprecation, frontend chunk-size advisories and JSDOM's navigation notice. The existing market notification-inbox availability gap may still report unavailable; no new notification feature was introduced.

## Limitations and deferred work

- Only USD is supported by the current storefront envelope.
- No new automatic notifications; dashboard state is the intended initial contract.
- No materialized reporting cache, large-dataset server pagination or recurring campaign automation. Customer history shows the latest 100 audit events while durable history is retained.
- Future window slots require dates from the existing schedule system. The loyalty feature does not invent dates or change global time.
- Manager fulfillment is a recorded manual action, without inventory reservation, automatic merchandise dispatch or reimbursement.
- No persistent test database migration was requested or applied. Manual testing uses the fresh disposable environment, leaving populated accounts/data intact.

The functional scope, known limitations and demo-only setup mechanisms are explicit. There is no mocked progress API or replacement checkout service.

## Manual environment handoff

The subsequent UI refinement adds 24px of spacing above wizard actions, moves reward suggestions into a modal opened by the underlined See common rewards link, splits occurrence activity into Customers, Orders and Eligible spending cards with values dialogs, and makes both manager/customer challenge cards activate through the existing RecordCard contract. Customer challenge titles have extra top spacing and the status aligned to their right. Claim Reward remains independent of the card's details action.

This refinement changes only local web UI, tests and documentation. Validation: 34 focused component tests passed, five DOM-only browser groups passed at 1280px and 390px, typecheck/Astro check, scoped ESLint and storefront/admin builds passed. The browser checks used the existing disposable demo without changing business records or taking screenshots. These are the refinement results; the earlier complete Phase 2 qualification remains recorded above.

`npm run demo:market-loyalty` starts the fresh disposable environment on storefront port 4357 and admin port 4575. It is separate from the pre-existing vendor demo on 4347/4565. The final fresh instance is left running for manual testing. Central login is `http://auth.platform.localhost:4357/account/login`; the manager enters `http://localhost:4575/market?channel=6&account=1`, then Loyalty. Exact accounts, password, occurrence URLs, helper commands and safe teardown/reset are in [the testing guide](MARKET_LOYALTY_TESTING.md). Stop its owned terminal with Enter or Ctrl+C, then restart the same command to recreate it.
