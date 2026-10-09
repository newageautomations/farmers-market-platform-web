# Phase 13E Market storefront implementation

## Summary

Phase 13E is COMPLETE. Full-stack classification: **REAL FULL-STACK PASS**.

The existing Storefront application now serves a real Market homepage, public upcoming occurrences, occurrence-scoped catalog and Variant detail, eligible Vendor filters, and one native active Market cart with merchandise grouped by its protected Vendor owner. Existing Vendor coupons coexist under the unchanged Phase 6 rules.

The final Market acceptance run used fixture mode OFF, real Chromium, Astro SSR, the unchanged Phase 13D hostname resolver, Vendure Shop HTTP, native verified-customer cookies, and guarded disposable PostgreSQL. No GraphQL responses were mocked in that acceptance flow.

Phase 13E migration added: **NO**.

## Scope and repository write boundaries

Frontend: E:\coding\farmers-market-platform-web. Changes are local to the existing apps/storefront, Shop API package, public Storefront utilities, generation outputs, test configuration/harnesses, and this report. No unrelated Admin refactor was made.

Backend: E:\coding\farmers-market-platform. The nine intentional paths listed below implement only public Shop reads, narrow query allowlists, and their disposable integration/report-suppression harness. Backend writes used the authorized narrow scope. No cart mutation semantics, inventory coordination, order splitting, protected Seller strategy, merge guard, financial attribution, Vendor promotions, customer relationships, hostname resolution, payment, or checkout implementation changed.

One Market, one occurrence, one Market Channel, and one native active customer Order remain the permanent cart architecture. Cart Vendor groups are business presentation groups. No Seller Orders exist during the new cart acceptance flow.

Checkout, pickup finalization, payment, Stripe, placement, Customer Account, purchase history, Vendor-origin Market preorder, communications, Platform Admin, and deployment remain deferred.

## Evidence suppression and historical evidence

FRONTEND_NO_EVIDENCE=true was set and verified in the first shell command, before any frontend regression, build, schema extraction, or generation command. It was explicitly set and checked again for subsequent frontend commands.

Historical docs/evidence content, existing result JSON, screenshots, and logs were left unchanged. No Phase 13E evidence directory, screenshot, video, trace, acceptance JSON, browser-results JSON, unit-results JSON, build log, Git audit artifact, or hash manifest was retained.

The new Playwright configuration disables screenshot/video/trace. A test-only preload suppresses Playwright's incidental .last-run.json and error-context.md writes during evidence-free runs. One transient failure-context Markdown file from an earlier locator correction was removed. No screenshots were taken.

The backend permanent suites normally write historical-style runtime JSON/logs. The new disposable-harness preload keeps those seven suites' reporter writes in memory and passes their recursive assertions unchanged. It does not change production behavior or test assertions. Console output was inspected without saving logs.

This file is the only new Phase 13E Markdown report. Source hashes used to compare the baseline and final state were held in tool memory, never written as manifests.

## Pre-existing Git state

Frontend HEAD before and after: f7a87c7f6d0d59a86c91e77535aff270a1991008.

Backend HEAD before and after: d0f2e0a97823b5bfb6f2320c96c2d7af7a2e0993.

Both repositories were inspected with ordinary git status --porcelain and git rev-parse HEAD before changes. No reset, clean, stash, checkout-away, commit, push, remote branch action, repository creation, or PR creation occurred.

Pre-existing frontend paths:

```text
 M README.md
?? .env.example
?? .gitignore
?? .prettierignore
?? .prettierrc.json
?? apps/
?? codegen.ts
?? docs/
?? eslint.config.mjs
?? package-lock.json
?? package.json
?? packages/
?? playwright.config.ts
?? playwright.live-market.config.ts
?? playwright.live.config.ts
?? playwright.phase13c.config.ts
?? playwright.storefront-live.config.ts
?? playwright.vendor.config.ts
?? scripts/
?? tests/
?? tsconfig.json
?? vitest.config.ts
```

Pre-existing backend paths:

```text
 M README.md
 M package.json
 M src/gql/graphql-env.d.ts
 M src/index-worker.ts
 M src/index.ts
 M src/plugins/analytics/api.ts
 M src/plugins/billing-entitlements/api.ts
 M src/plugins/billing-entitlements/authority.service.ts
 M src/plugins/billing-entitlements/billing-entitlements.plugin.ts
 M src/plugins/communications/communications.plugin.ts
 M src/plugins/farmers-market/api/admin-api.ts
 M src/plugins/farmers-market/farmers-market.plugin.ts
 M src/plugins/farmers-market/services/market-read.service.ts
 M src/plugins/farmers-market/services/occurrence-generation-worker.service.ts
 M src/plugins/marketplace-commerce/catalog-publishing.service.ts
 M src/plugins/marketplace-commerce/commerce/topology.api.ts
 M src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts
 M src/plugins/payments/payments.plugin.ts
 M src/plugins/platform-identity/api.ts
 M src/plugins/platform-identity/entities.ts
 M src/plugins/platform-identity/entitlement-port.ts
 M src/plugins/platform-identity/platform-identity.plugin.ts
 M src/plugins/platform-identity/tenant-access-policy.ts
 M src/plugins/pos-integration/pos-integration.plugin.ts
 M test/analytics/.runtime/results-full.json
?? docs/frontend-api-gap-closure-phase13b5.md
?? docs/frontend-api-gap-closure-phase13c5.md
?? scripts/
?? src/database-migrations.ts
?? src/migrations/1791230000000-StorefrontPublicHostname.ts
?? src/plugins/farmers-market/services/market-organizer-read.service.ts
?? src/plugins/marketplace-commerce/owned-admin-reads.ts
?? src/plugins/platform-identity/public-storefront.controller.ts
?? src/plugins/platform-identity/storefront-host.ts
?? test/analytics/.runtime/phase13b5-regression.log
?? test/analytics/.runtime/vendure_test_analytics_1791159987260_3b54cc-messages.jsonl
?? test/analytics/.runtime/vendure_test_analytics_1791224257219_acf919-messages.jsonl
?? test/database-startup/
?? test/frontend-integration/
```

All pre-existing work was preserved, including pre-existing changes within marketplace-commerce.plugin.ts.

## Backend capability characterization

Actual source was inspected before implementation, including PublicStorefrontController, ShopContextMiddleware, explicit Market Shop operation contracts, OccurrenceCatalogService, occurrence/domain services, OrderContextService, ContextCartInterceptor, ProtectedOrderSellerStrategy, NativeMergeGuard, VendorPromotionService, Shop authentication, activeOrder, and native line-edit roots.

| Capability                            | Existing source contract                                                                                      | Phase 13E decision                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Public upcoming occurrences           | Market catalog required an explicit occurrence; organizer reads were Admin-only                               | Add a bounded current-Market public Shop list                                             |
| Direct occurrence lookup              | No safe public own-Market lookup                                                                              | Add a scheduled own-occurrence projection                                                 |
| Occurrence Product/detail             | Catalog had public names/description/prices but lacked exact identity filtering and usable Asset presentation | Extend the same catalog with exact Variant filtering and safe assets; reuse it for detail |
| Eligible Vendor filters               | Catalog had per-item Vendor identity but no complete eligible Vendor faceting/filtering                       | Extend catalog options/result using its existing eligible relation                        |
| Active Market cart Vendor attribution | Native activeOrder did not expose protected merchandise Vendor ownership for every line                       | Add marketActiveCart, a read-only current-customer projection                             |
| Vendor coupons                        | applyCouponCode/removeCouponCode already permitted through the Phase 6 guarded Market Shop path               | Reuse unchanged native mutations and VendorPromotionService policy                        |

No duplicate Product/detail root, generic GraphQL executor, mutation wrapper, or new commerce selection mutation was created.

## Backend changes

Intentional Phase 13E backend paths:

```text
src/plugins/marketplace-commerce/market-public-shop.service.ts
src/plugins/marketplace-commerce/api.ts
src/plugins/marketplace-commerce/occurrence-catalog.service.ts
src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts
src/plugins/marketplace-commerce/commerce/contracts.ts
src/plugins/marketplace-commerce/market-browse.interceptor.ts
src/plugins/platform-identity/shop-context.middleware.ts
test/frontend-integration/market-storefront-run.ts
test/frontend-integration/regression-no-evidence.cjs
```

Three read roots were added: marketStorefrontOccurrences, marketStorefrontOccurrence, and marketActiveCart. Existing marketOccurrenceCatalog was narrowly extended. Allowlist/interceptor changes expose only those public reads. Broad native Market products, product, search, collections, shipping, payments, and refund access was not enabled.

### Public occurrence discovery

Current approved Shop context resolves a single active MARKET Storefront and its active Market. No client marketId is accepted as authority.

marketStorefrontOccurrences options use from/through/skip/take. Defaults are now through 90 days ahead, skip 0, take 20. The maximum take is 50, skip is bounded to 10,000, and the range must be future, increasing, and within the explicit 90-day horizon. Results contain scheduled current-Market occurrences, ordered startsAt ascending then ID ascending, with totalItems before paging.

marketStorefrontOccurrence(id) checks the same current-Market authority and returns only an upcoming scheduled own occurrence. Foreign/cancelled/past occurrences fail safely. The ID is a resource identity, never tenant authority.

Public fields are ID, scheduleDate, startsAt, endsAt, timezone, and venue. Organizer pickup instructions, recurrence/override policies, version internals, membership data, and configuration are absent. No occurrence-wide preorder window is invented. These reads do not generate occurrences, materialize windows, repair publication, or write business state.

### Occurrence Product/detail contract

Detail uses marketOccurrenceCatalog with occurrenceId and options.variantIds=[variantId], skip=0, take=1. Its eligible CTE is the same implementation used for discovery. Protected Vendor ownership, approved membership/listing, confirmed participation, enabled/preorder-enabled offering, effective current window, enabled Product/Variant, current Market publication, and supported price/currency/tax envelope still precede filtering and paging.

A detail item disappearing from discovery therefore disappears from detail. Real tests cover elapsed window, disabled offering, withdrawn listing, unpublished Product, foreign Product, foreign occurrence, and wrong own occurrence.

Safe featuredAsset fields are ID, preview/source URLs, width, and height. The Asset must belong to the current Channel and uses the configured native Asset URL strategy. No stock, physical source, private Channels, Seller, or inventory counts are added.

Detail routes address one eligible Variant. Other eligible Variants may have their own routes; the UI does not invent a combined Product variant-selector contract.

### Vendor filtering

Catalog options accept at most 20 positive safe-integer Vendor IDs and at most 20 Variant IDs. Multiple Vendor IDs use OR semantics. Multiple exact Variant IDs use OR semantics. Vendor, Variant, and facet dimensions combine with AND. Existing facet filtering retains its established semantics.

Eligible Vendor facets expose only public ID, name, and authoritative eligible Variant count. Counts come from the eligible relation after public facet filters, before Vendor selection and paging. Ordering is Vendor name then ID. Vendor C with attendance but no eligible offering, suspended Vendors, and foreign Market resources are absent. Public facet display names are projected from public translations.

### Market cart projection

marketActiveCart requires the current approved MARKET Shop context and a verified native customer. It resolves the current active native Order without an arbitrary Order ID input, and validates customer/session ownership, Channel, MARKET_OCCURRENCE context, origin Storefront, current Market, and occurrence ownership.

Every line's Vendor comes from protected permanent Product/Variant ownership. It does not infer ownership from Seller, Channel ordering, SKU, line position, client fields, or current catalog discovery. Line grouping survives an elapsed/disabled offering. Vendor filters cannot alter ownership.

The DTO contains native Order identity/state/currency/quantity, cart occurrence, customer-facing subtotal/total/tax/discounts/coupon codes, Vendor business identity/name, line identity/display/quantity/native prices, and optional safe image. No Seller, Seller Order, payout, earnings, financial allocation, Payment, StockLocation, or private Customer graph is returned. A persisted native Order snapshot is unchanged across projection reads.

There is no frontend-authoritative aggregate total or Vendor financial subtotal. Existing selectCommerceContext and native addItemToOrder, adjustOrderLine, removeOrderLine remain unchanged.

### Coupon characterization

The existing safe Market Shop coupon API is enabled. The shopper enters a code; the backend determines ownership, eligibility, minimum, and discount. At most one coupon per Vendor is enforced. Different Vendors' coupons coexist. No Market-wide coupon is supported.

Real Shop HTTP and browser tests proved A-only and B-only merchandise discounts, coexistence, rejection of a second A coupon, denial of A on a B-only cart, denial of an unscoped/Market-wide code, and removal of A while B remains. Backend discounted line values, native totals, actual codes, and adjustments are rendered. No discount formula was introduced in React.

## Frontend routes and presentation

| Public route                                     | MARKET behavior                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| /                                                | Real resolved Market identity and paged upcoming occurrence selection    |
| /occurrences/[occurrenceId]                      | Own upcoming occurrence plus authoritative eligible catalog              |
| /occurrences/[occurrenceId]/products/[variantId] | Exact currently eligible offering/Variant detail                         |
| /cart                                            | Verified-customer native cart grouped by Vendor, stopped before checkout |
| /api/shop                                        | Existing narrow same-origin bridge extended with named Market actions    |

The existing apps/storefront remains the only Storefront application. VENDOR hosts retain Phase 13D native Vendor catalog, detail, login, and DIRECT_VENDOR cart. Vendor hosts do not invoke Market occurrence APIs. Bulverde Market Day remains a MARKET synthetic development fixture; production errors never substitute it.

### Market homepage and occurrence selection

The real homepage uses backend resolved display identity and public occurrence facts. It presents the earliest upcoming occurrence clearly and offers other occurrences with visible date/time. Homepage occurrences page server-side, eight at a time. No address, opening hours, Vendor count, history, parking, fees, social links, or other real Bulverde claims were fabricated.

Anonymous navigation chooses a browsing occurrence. Verified cart selection explicitly uses the existing selectCommerceContext. With a nonempty A1 cart, A2 shows the existing cart occurrence and instructs the shopper to remove current items first. It does not empty, move, merge, or silently switch lines. Empty context changes follow the current backend behavior.

### Catalog and Product detail

The catalog uses marketOccurrenceCatalog with 12 rows per server-side page. Controls submit supported NAME_ASC/NAME_DESC/PRICE_ASC/PRICE_DESC sorts, public facet filters, and eligible Vendor filters. Counts are backend-derived, never counted from the loaded page. Every card and detail clearly identifies its Vendor.

DOMAIN_TIME_ONLY wording is preserved. Catalog presence does not promise stock, capacity, reservation, or purchase authorization. Detail shows public Product/Variant name, description, safe image, exact minor-unit price, Vendor, and occurrence date. Anonymous shoppers can browse; adding requires existing verified login.

### Multi-Vendor cart and authentication boundary

The cart prominently shows Market name and the authoritative bound occurrence date/time. Semantic Vendor sections contain native lines and accessible quantity/removal controls, with one navigation badge using backend totalQuantity.

Mutations prevent duplicate submissions and refresh marketActiveCart after success. Rejected mutations also refresh authority. Totals use the existing exact BigInt/minor-unit formatter, with no floating-point price arithmetic or optimistic final totals. Expired offerings do not hide active cart lines.

Phase 13D's ShopSignIn/native login pattern is reused. No registration, verification, account/profile, addresses, password management, purchase history, or parallel authentication system was added. Anonymous browsing is not advertised as guest checkout.

The cart clearly stops at review and says checkout/pickup selection are unavailable. There is no submit-order/checkout CTA, pickup-selection workflow, hold acquisition, payment, provider call, or placement.

### Loading and safe failures

The UI handles no upcoming occurrences, unavailable/cancelled occurrence, empty catalog, missing/ineligible detail, backend failure, authentication requirement, rejected cart edits, and nonempty occurrence mismatch. Pending controls, polite status announcements, and safe generic alerts are present. Raw backend messages and private capacity classifications are not rendered.

### SEO

Valid Market, occurrence, and detail pages use tenant-safe canonical URLs, titles, OpenGraph, and robots policy. Occurrence and Product URLs remain distinct. Cart and unavailable/error pages are noindex.

Event structured data uses only real name, start/end, venue, and canonical URL where supplied. Product structured data uses genuine name/description/image/URL. It does not invent availability, inventory, reviews, shipping, returns, ticket prices, attendance, organizer contact, or offers.

### Tenant isolation

Host resolution remains GET /storefront-context/resolve unchanged. The middleware resolves each request; the same-origin bridge verifies canonical Origin and matching Storefront identity, and derives approved Market/Channel server-side. Browser Market, Vendor, occurrence, and item IDs never grant authority. Interactive islands receive no Channel token.

SSR context is request-local. No currentMarket/currentOccurrence/currentChannel singleton or persistent browser catalog/cart cache was introduced. Full tenant navigations replace page state; cart update events are scoped by Storefront identity. Real A/B and Vendor/Market host tests deny foreign resources and prevent cart leakage. Public code uses named generated Shop documents, no Admin roots or database connection.

## Accessibility and responsive checks

Real Chromium axe checks passed for Market homepage, occurrence selector/catalog/Vendor filters, Product detail, verified multi-Vendor cart, and native login/cart-auth state.

At 390px, 768px, and 1280px, each tested page had no page-level horizontal overflow; visible enabled controls had reachable viewport bounds. Skip-to-content keyboard activation focused main. Native labeled filters, quantity controls, visible focus styling, semantic Vendor sections, and status/alert announcements are used. Mobile Vendor boundaries do not depend on a wide table. No screenshots were saved.

## Full-stack integration

The synthetic disposable fixture includes Market A/B with active hostname-bound Storefronts, A1/A2 and foreign/cancelled occurrences, Vendors A/B with approved relationships, confirmed participation and public offerings, Vendor C with no eligible offering, enough catalog items for paging, public facets/assets, guarded physical/catalog state, and verified native customers.

The final Market run passed five browser tests plus the real HTTP fixture assertions. The path is Chromium to real Astro SSR to the unchanged hostname resolver to real Vendure Shop HTTP/native cookie to disposable PostgreSQL. Fixture mode was OFF.

Covered behavior includes anonymous homepage/discovery, paging/sort/facet/Vendor filters, exact detail and foreign/wrong/closed attacks, native verified login, three lines across two Vendors in one Order, backend totals, coupon coexistence/removal, quantity/removal refresh, nonempty occurrence switch denial, empty context switching, elapsed and disabled offering behavior, and cross-Market cart isolation.

Trusted fixture assertions confirmed zero Seller Orders, OrderLineLinks, CheckoutAttempts, and CheckoutHolds in this new Market flow. Historical recursive backend regressions retain their existing isolated commerce tests; their placement checks do not extend the Phase 13E frontend workflow.

Early harness attempts uncovered fixture coupon percentage scaling, native Order snapshot inspection, guarded mutation error shape, and ambiguous coupon locators. These test issues were corrected, then the entire real Market acceptance flow passed. The existing Vendor regression's old expectation that a MARKET /cart returned 404 was updated to require the newly implemented Market cart and exclude Vendor cart composition; its other Vendor checks stayed intact.

## Frontend regressions and builds

| Command                                | Final result                                                      |
| -------------------------------------- | ----------------------------------------------------------------- |
| npm run graphql:schema                 | PASS, extracted from current backend source without bootstrap/DB  |
| npm run graphql:codegen                | PASS, generated Shop/Admin types                                  |
| Schema extraction and codegen repeated | PASS, all five schema/provenance/generated files byte-identical   |
| npm run typecheck                      | PASS, TypeScript and Astro; zero errors/warnings/hints            |
| npm run lint                           | PASS, ESLint, nine package boundaries, Prettier                   |
| npm run test                           | PASS, 184 tests across seven files                                |
| npm run test:e2e                       | PASS, 33 existing browser regressions                             |
| npm run test:live:market-storefront    | PASS, five real Market browser tests and real HTTP assertions     |
| npm run test:live:vendor-storefront    | PASS, seven real Vendor Storefront browser tests                  |
| npm run test:live                      | PASS, eight real Vendor Admin browser tests and 10 harness checks |
| npm run test:live:market               | PASS, 12 real Market Admin browser tests and 19 harness checks    |
| npm run build                          | PASS, Storefront and Admin production builds                      |
| npm run check:bundles                  | PASS, 50 output files checked for fixture markers                 |

Frontend total: **184 unit/component + 65 browser tests**. Of the browser tests, 32 are the four real full-stack integration commands and 33 are existing regression coverage. Accessibility checks are included in the browser suites.

The Admin build retains its existing large-chunk warning. It completes successfully. No deployment occurred.

## Backend regressions and build

The normal customer-relationships recursive suite passed its 66 top-level checks, migration characterization, and recursive permanent suites: Platform Identity, Farmers Market, Catalog Publication, Inventory/Capacity, Marketplace Commerce, Paid Attribution/Coupon guards, and Customer Relationships. Recursive child pass markers were verified by the unchanged permanent assertions.

The suite's normal npm run build completed with PASS BN build, covering Vendure Dashboard, server, and worker. Backend disposable integration TypeScript checking also passed after the final elapsed-window harness change. No production backend source changed after the successful recursive build/regressions.

The in-memory reporter preload only suppresses historical artifact writes; all assertions, database guards, migration checks, and recursive builds execute.

## Protected database and cleanup

The database named exactly vendure was not connected to, migrated, seeded, reset, truncated, or dropped by automated tests. Only locally guarded vendure_test_* databases were used, with administrative database operations through postgres.

Every successful normal Market/Vendor/Admin integration database was removed by its owning process. The final Market database vendure_test_marketshop_1791244074714_b49562 was dropped successfully. Successful permanent-suite databases were similarly removed.

Earlier failed/interrupted harness databases were retained by the established failure policy for debugging. The permanent cleanup characterization deliberately retains its KEEP_TEST_DB and failure examples. No unrelated process deleted those databases. Empty process-owned temporary harness directories were cleaned without touching historical files.

## Migration status

**Phase 13E migration added: NO.**

No new table or persistent business fact was needed. No old migration was modified. The pre-existing Phase 13D hostname migration remains unchanged and was used only when provisioning disposable integration databases.

## STOREFRONT-B blockers

None. Required narrow missing reads were implemented within the authorized A-E backend scope, and the existing guarded coupon API was already safely exposed. No missing out-of-scope contract was worked around.

## Git diff summary

| Audit item                           | Result |
| ------------------------------------ | ------ |
| Backend HEAD changed?                | NO     |
| Frontend HEAD changed?               | NO     |
| Intentional Phase 13E backend paths  | 9      |
| Unexpected backend paths count       | 0      |
| Intentional Phase 13E frontend paths | 31     |
| Unexpected frontend paths count      | 0      |
| Pre-existing work preserved          | YES    |
| Historical evidence changed          | NO     |
| New/modified migrations              | NONE   |

Final ordinary Git status/diff commands and in-memory source comparisons were used. Because most frontend source was already untracked, ordinary tracked-file diff alone cannot enumerate the implementation. The baseline file comparison identifies the intentional paths below. Pre-existing README and other unrelated modifications remain as captured.

Intentional Phase 13E frontend paths:

```text
apps/storefront/src/components/MarketCart.tsx
apps/storefront/src/components/MarketCartLink.tsx
apps/storefront/src/components/MarketPublicHome.astro
apps/storefront/src/components/MarketPurchase.tsx
apps/storefront/src/layouts/SiteLayout.astro
apps/storefront/src/lib/shop.ts
apps/storefront/src/pages/api/shop.ts
apps/storefront/src/pages/cart.astro
apps/storefront/src/pages/index.astro
apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro
apps/storefront/src/pages/occurrences/[occurrenceId]/products/[variantId].astro
apps/storefront/src/styles/market.css
package.json
packages/api/operations/shop.graphql
packages/api/schema/provenance.json
packages/api/schema/shop.graphql
packages/api/src/generated/shop.ts
packages/api/src/index.ts
packages/api/src/market-storefront.ts
packages/api/src/storefront.ts
packages/storefront-core/package.json
packages/storefront-core/src/index.ts
packages/storefront-core/src/market.ts
playwright.config.ts
playwright.market-storefront-live.config.ts
scripts/playwright-no-evidence.cjs
scripts/test-market-storefront.ts
tests/e2e/market-storefront-live.spec.ts
tests/e2e/storefront-live.spec.ts
tests/market-storefront.test.tsx
docs/frontend-phase13e-market-storefront-implementation.md
```

The existing schema/provenance.json is reproducible GraphQL generation metadata, not a test result or acceptance artifact. Generated Shop types were regenerated from source and never hand-edited.

## Acceptance table

Each requested gate is listed individually. PASS means supported by the implementation, source comparison, and/or the completed real tests described above. Scope exclusions refer to the Phase 13E changes and acceptance flow.

| Gate | Requirement                                             | Status |
| ---- | ------------------------------------------------------- | ------ |
| A    | Frontend baseline captured                              | PASS   |
| B    | Backend baseline captured                               | PASS   |
| C    | Pre-existing work preserved                             | PASS   |
| D    | FRONTEND_NO_EVIDENCE set before regression runs         | PASS   |
| E    | Historical evidence untouched                           | PASS   |
| F    | No Phase13E evidence folder                             | PASS   |
| G    | No Phase13E screenshots                                 | PASS   |
| H    | Exactly one Phase13E Markdown report                    | PASS   |
| I    | No acceptance JSON                                      | PASS   |
| J    | No unexpected backend changes                           | PASS   |
| K    | No unexpected frontend changes                          | PASS   |
| L    | Protected vendure DB untouched                          | PASS   |
| M    | No old migration modified                               | PASS   |
| N    | No unauthorized new migration                           | PASS   |
| O    | Public Market occurrence discovery exists               | PASS   |
| P    | Current Market derived from Shop context                | PASS   |
| Q    | No trusted client marketId authority                    | PASS   |
| R    | Scheduled own occurrences returned                      | PASS   |
| S    | Cancelled occurrence excluded                           | PASS   |
| T    | Foreign occurrence excluded                             | PASS   |
| U    | Discovery bounded                                       | PASS   |
| V    | Discovery deterministic ordering                        | PASS   |
| W    | Direct occurrence lookup safe                           | PASS   |
| X    | Public DTO excludes Admin configuration                 | PASS   |
| Y    | No occurrence read side effects                         | PASS   |
| Z    | Real Market homepage                                    | PASS   |
| AA   | Market display identity real                            | PASS   |
| AB   | Upcoming occurrence UI                                  | PASS   |
| AC   | Occurrence selection visible                            | PASS   |
| AD   | No fabricated Market facts                              | PASS   |
| AE   | No Vendor storefront composition on MARKET              | PASS   |
| AF   | Vendor storefront regression preserved                  | PASS   |
| AG   | Bulverde fixture remains MARKET                         | PASS   |
| AH   | marketOccurrenceCatalog remains authoritative           | PASS   |
| AI   | No native broad Market products root                    | PASS   |
| AJ   | Server-side paging                                      | PASS   |
| AK   | Backend sorting                                         | PASS   |
| AL   | Facet filtering                                         | PASS   |
| AM   | DOMAIN_TIME_ONLY wording preserved                      | PASS   |
| AN   | No stock availability claim                             | PASS   |
| AO   | Vendor identity visible per item                        | PASS   |
| AP   | Eligible Vendor filter/facet implemented                | PASS   |
| AQ   | Vendor filter counts authoritative                      | PASS   |
| AR   | No ineligible Vendor leakage                            | PASS   |
| AS   | Occurrence-scoped Product/detail implemented            | PASS   |
| AT   | Same eligibility predicate reused                       | PASS   |
| AU   | Foreign Market item denied                              | PASS   |
| AV   | Wrong occurrence item denied                            | PASS   |
| AW   | Closed offering denied                                  | PASS   |
| AX   | Withdrawn listing denied                                | PASS   |
| AY   | Unpublished item denied                                 | PASS   |
| AZ   | Safe public assets                                      | PASS   |
| BA   | No protected inventory fields                           | PASS   |
| BB   | No broad native Product bypass                          | PASS   |
| BC   | Market cart uses selectCommerceContext                  | PASS   |
| BD   | Context kind MARKET_OCCURRENCE                          | PASS   |
| BE   | Exactly one occurrence per cart                         | PASS   |
| BF   | Nonempty occurrence switch denied                       | PASS   |
| BG   | Empty context switch follows backend policy             | PASS   |
| BH   | addItemToOrder real                                     | PASS   |
| BI   | adjustOrderLine real                                    | PASS   |
| BJ   | removeOrderLine real                                    | PASS   |
| BK   | Backend quantity validation authoritative               | PASS   |
| BL   | Closed offering increase denied                         | PASS   |
| BM   | Allowed decrease/removal preserved                      | PASS   |
| BN   | No checkout hold created by normal cart browsing        | PASS   |
| BO   | One native Market active Order                          | PASS   |
| BP   | Vendor A and Vendor B coexist                           | PASS   |
| BQ   | Vendor attribution backend-authoritative                | PASS   |
| BR   | No frontend-only ownership mapping                      | PASS   |
| BS   | Vendor groups have safe business names                  | PASS   |
| BT   | Cart line remains groupable after catalog ineligibility | PASS   |
| BU   | No Seller exposed                                       | PASS   |
| BV   | No Seller Order created/displayed pre-placement         | PASS   |
| BW   | Overall total backend-authoritative                     | PASS   |
| BX   | No Vendor earnings/payout terminology                   | PASS   |
| BY   | Vendor coupon apply supported                           | PASS   |
| BZ   | Vendor coupon remove supported                          | PASS   |
| CA   | Coupon owner inferred by backend                        | PASS   |
| CB   | A coupon discounts only A merchandise                   | PASS   |
| CC   | B coupon discounts only B merchandise                   | PASS   |
| CD   | Different Vendor coupons coexist                        | PASS   |
| CE   | Second same-Vendor coupon follows backend rule          | PASS   |
| CF   | Market-wide coupon remains unsupported                  | PASS   |
| CG   | Discount values backend-authoritative                   | PASS   |
| CH   | Anonymous browsing supported where backend allows       | PASS   |
| CI   | Existing verified login reused                          | PASS   |
| CJ   | No parallel auth system                                 | PASS   |
| CK   | No customer registration workflow                       | PASS   |
| CL   | No guest-checkout claim                                 | PASS   |
| CM   | No Customer Account                                     | PASS   |
| CN   | No purchase-history UI                                  | PASS   |
| CO   | Market A/B SSR isolation                                | PASS   |
| CP   | Market A/B catalog isolation                            | PASS   |
| CQ   | Market A/B cart isolation                               | PASS   |
| CR   | Vendor host/Market host isolation                       | PASS   |
| CS   | Wrong occurrence attack denied                          | PASS   |
| CT   | Wrong Product attack denied                             | PASS   |
| CU   | Client Vendor IDs do not grant ownership                | PASS   |
| CV   | No Admin API used by public storefront                  | PASS   |
| CW   | No direct DB access                                     | PASS   |
| CX   | No fixture production fallback                          | PASS   |
| CY   | No raw backend error leakage                            | PASS   |
| CZ   | Market canonical tenant-safe                            | PASS   |
| DA   | Occurrence canonical distinct                           | PASS   |
| DB   | Product canonical safe                                  | PASS   |
| DC   | Cart noindex                                            | PASS   |
| DD   | Error pages noindex                                     | PASS   |
| DE   | Structured data real facts only                         | PASS   |
| DF   | Market home axe pass                                    | PASS   |
| DG   | Catalog axe pass                                        | PASS   |
| DH   | Product detail axe pass                                 | PASS   |
| DI   | Cart axe pass                                           | PASS   |
| DJ   | Keyboard navigation                                     | PASS   |
| DK   | 390px usable                                            | PASS   |
| DL   | 768px usable                                            | PASS   |
| DM   | 1280px usable                                           | PASS   |
| DN   | No tested page-level overflow                           | PASS   |
| DO   | No pickup-selection workflow                            | PASS   |
| DP   | No checkout                                             | PASS   |
| DQ   | No payment                                              | PASS   |
| DR   | No Stripe/provider call                                 | PASS   |
| DS   | No Order placement                                      | PASS   |
| DT   | No Customer Account                                     | PASS   |
| DU   | No Vendor-origin Market preorder                        | PASS   |
| DV   | No communications                                       | PASS   |
| DW   | No Platform Admin work                                  | PASS   |
| DX   | No Phase13F implementation                              | PASS   |
| DY   | No deployment                                           | PASS   |
| DZ   | No remote Git action                                    | PASS   |
| EA   | Real Market hostname resolution                         | PASS   |
| EB   | Real public occurrence discovery                        | PASS   |
| EC   | Real occurrence catalog                                 | PASS   |
| ED   | Real Product/detail                                     | PASS   |
| EE   | Real verified customer login                            | PASS   |
| EF   | Real MARKET_OCCURRENCE context                          | PASS   |
| EG   | Real Vendor A add                                       | PASS   |
| EH   | Real Vendor B add                                       | PASS   |
| EI   | Real one-cart multi-Vendor projection                   | PASS   |
| EJ   | Real cart adjust/remove                                 | PASS   |
| EK   | Real nonempty occurrence switch denial                  | PASS   |
| EL   | Real foreign Market attack denial                       | PASS   |
| EM   | Real Vendor Storefront regression                       | PASS   |
| EN   | Real Vendor Admin regression                            | PASS   |
| EO   | Real Market Admin regression                            | PASS   |
| EP   | GraphQL schema extraction reproducible                  | PASS   |
| EQ   | GraphQL codegen reproducible                            | PASS   |
| ER   | Frontend typecheck                                      | PASS   |
| ES   | Frontend lint                                           | PASS   |
| ET   | Frontend unit/component tests                           | PASS   |
| EU   | Frontend browser tests                                  | PASS   |
| EV   | Frontend accessibility checks                           | PASS   |
| EW   | Backend relevant regression suite                       | PASS   |
| EX   | Backend build                                           | PASS   |
| EY   | Frontend Storefront build                               | PASS   |
| EZ   | Frontend Admin build                                    | PASS   |
| FA   | Frontend root build                                     | PASS   |
| FB   | Bundle fixture-marker checks                            | PASS   |

## Remaining Phase 13A blockers

| Blocker                                                     | Status |
| ----------------------------------------------------------- | ------ |
| Phase13A-B3: production many-domain cookie/CORS/CSRF policy | OPEN   |
| Phase13A-B4: Market communications API inconsistency        | OPEN   |

Neither blocker is closed by local Phase 13E integration success.

## Deferred Phase 13F work

Checkout preparation and pickup finalization, payment/provider integration, successful placement and downstream Seller Orders, customer registration/account/history, and Vendor-origin Market preorder remain deferred. Communications and Platform Admin are outside this phase. Work stopped at the active cart.

## Local commands

No additional command is needed to consume the completed implementation. To start local development, use npm run dev:storefront with the existing backend and hostname/resolver configuration.

To reproduce the real Market acceptance flow from the frontend folder:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npm run test:live:market-storefront
```

For other existing frontend browser commands in an evidence-free run, also preload the transient Playwright reporter suppression before invoking the commands:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
$env:NODE_OPTIONS='--require=E:/coding/farmers-market-platform-web/scripts/playwright-no-evidence.cjs'
npm run test:e2e
npm run test:live:vendor-storefront
npm run test:live
npm run test:live:market
```

The recursive backend regression command, from the backend folder:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
$env:NODE_OPTIONS='--require=E:/coding/farmers-market-platform/test/frontend-integration/regression-no-evidence.cjs'
npm run test:customer-relationships
```

Use the established disposable database guards. No deployment or remote Git command is required.
