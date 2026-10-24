# Vendor storefront Shop page

Implemented locally on October 22, 2026. No deployment, remote Git operation, persistent database migration, or persistent fixture mutation was performed. The editor's controls, dropdowns, styling, page selector, and preview authorization remain unchanged.

## Implementation and shared components

`/products` uses the existing `SiteLayout`, `HarvestHeader`, `HarvestFooter`, `ProductCards`, `FeaturedAdd`, native Astro Button adapter, `cardClassName`, `selectClassName`, React SelectField/Button, and native disclosure presentation. The page has a desktop category sidebar, compact preorder banner, heading/count/sort controls, and responsive grid. Mobile uses the category dropdown in the same GET form. There is no outer page card, breadcrumb, extra filter, promotional section, or new theme.

`ProductCards` has an opt-in Shop composition. Existing featured cards retain their shared presentation. Cards use the vendor's existing palette, typography, image fallback, and `--storefront-card-radius` derived from button shape. Unavailable imagery is subtly dimmed; names and prices remain readable. Product links and purchase buttons are independent. Multiple-variant products use the existing product-detail selector even when only one option is eligible.

`ShopMarketSelection` is a feature composition of the existing disclosure, SelectField and Button. There was no shared vendor occurrence selector: market storefront purchase controls assume a market-owned cart and do not select between markets for a vendor. No primitive or editor interface was introduced.

## Categories, order and selection

Categories come from public native product facet values whose facet is named Category, Categories, Product Category, or Product Categories. Other facets are not misrepresented as categories. Vendors without these relationships show All Products. Vendor category management now edits the same native memberships, with optional image metadata and no Shop layout change; see [Vendor category management](VENDOR_CATEGORY_MANAGEMENT.md). Catalog order and Name A to Z are supported; price ordering is deliberately omitted rather than making ambiguous multi-variant price comparisons. Filtering and ordering happen before 12-product pagination. The bounded native catalog read refuses catalogs over 10,000 products rather than silently truncating them.

Selection uses the existing MARKET_OCCURRENCE order context. A valid active preorder cart takes priority, followed by the supplied occurrence query, a storefront-scoped HTTP-only cookie, and the first confirmed upcoming occurrence. Category, sort, pagination, product links, product details, cart, and checkout retain that context. The cookie is a preference, never purchase authorization. Preview does not read a customer's cart or persist selection.

Change Market uses the existing protected context selector. A nonempty cart or protected checkout attempt blocks incompatible changes and explains that the current items must first be removed. Failed selection does not navigate or save the requested selection.

## Availability and backend changes

Two public vendor projections were added to the existing marketplace-commerce plugin:

- `vendorPreorderOccurrences`: derives the vendor from the approved storefront/channel and returns confirmed appearances with approved membership, active markets and storefronts, and scheduled future dates within the existing 90-day discovery horizon.
- `vendorPreorderAvailability`: checks vendor publication/ownership before returning any variant facts, uses the existing occurrence catalog's domain/time/publication projection, and delegates capacity to the existing inventory owners. Requests are bounded to 20 variants.

Availability reuses `OfferingEligibilityService`, `CatalogPublishingService`, `CapacityService`, `CapacityLocks`, the canonical stock source, live checkout holds, and occurrence caps/commitments. It distinguishes physical out-of-stock from exhausted market capacity where known. Missing, failed or unconfirmed availability disables purchasing. Closed or unopened windows retain the public product cards. Individual unavailable variants do not disable a product with other valid options.

The existing native Order context guard already permits vendor-origin market preorders. The application now supplies the required vendor ownership on that context. No schema migration was needed. Native seller splitting and protected vendor/market order reads now recognize these vendor-origin market orders while retaining seller, market, customer, channel and line-link ownership checks.

`addVendorPreorderItem` is an occurrence-bound wrapper around the existing context selector and native `OrderService.addItemToOrder`. Both run in one transaction under the same Order lock, preventing a concurrent market switch from changing the intended pickup occurrence between selection and add. The existing cart interceptor repeats eligibility, publication, freshness, inventory and capacity checks for additions and quantity increases. Checkout continues to own authoritative holds and placement. No second cart, inventory calculation, payment flow, or reservation system was created.

Vendor storefront purchases now require an occurrence, including raw native Shop add attempts and direct product URLs. Homepage quick-purchase buttons direct customers to choose a market first. Existing legacy direct carts can still be read, reduced and emptied. Shop additions preserve the current session and cart, prevent duplicate UI submissions, report failures and dispatch the existing vendor cart update event.

The real Astro page remains available in the existing editor. Preview purchase controls are disabled and the existing client/server mutation guards remain authoritative. No editor styling file or editor control was changed.

## Local files

Web changes are in `apps/storefront/src/pages/products/`, `pages/api/shop.ts`, `pages/cart.astro`, `components/ProductCards.astro`, `components/FeaturedAdd.tsx`, `components/ProductPurchase.tsx`, `components/VendorCart.tsx`, new `components/ShopMarketSelection.tsx`, new `lib/vendor-preorder.ts`, and new `styles/vendor-shop.css`. Shared logic/contracts are in `packages/storefront-core/src/vendor-shop.ts`, its barrel export, `packages/api/src/storefront.ts`, `errors.ts`, Shop operations, and generated schema/type artifacts. Scripts and focused tests were added; the existing FeaturedAdd test now supplies an occurrence. Package scripts expose the verification and optional fixture command.

Backend changes are in marketplace-commerce `api.ts`, `market-public-shop.service.ts`, `occurrence-catalog.service.ts`, new `preorder-error.ts`, `inventory/capacity.service.ts`, `commerce/order-context.service.ts`, `commerce/strategies.ts`, `commerce/native-commerce.adapter.ts`, `commerce/topology.api.ts`, and `customer-relationships/projections.ts`. The optional fixture adds `scripts/market-operations-demo/storefront-shop-fixture.ts` with guarded command routing and two focused test entry points. Existing unrelated working-tree changes were preserved.

## Verification

Passed:

- 10 focused frontend tests in `storefront-shop.test.tsx` and `storefront-refinement.test.tsx`: categories, ordering, variant eligibility, disabled detail purchasing, occurrence-bound requests, duplicate submissions, late rejection feedback, preview mutation blocking, dropdown conflict feedback, and existing theme/editor control behavior.
- `npm run test:storefront:shop` in the web repository: HTTP-only real Astro rendering for shared header/footer/theme, categories, occurrence links, multi-variant choice, and unavailable/no-market/closed/error/empty states. No browser automation or screenshots.
- `npm run test:storefront:shop` in the backend repository: real public Shop API projections, cross-market availability, foreign-variant isolation, stock/cap limits, changed eligibility, raw direct-add blocking, unopened/closed windows, context conflicts, full native checkout/seller splitting, owned vendor/market order views, and an atomic add racing a market switch. Uses only newly created guarded disposable databases.
- `npm run test:storefront:shop-fixture` in the backend: optional setup run twice in a disposable database; identical fixture IDs, stock and storefront records on repetition, plus authoritative verification of the two-date availability matrix.
- Web TypeScript, Astro diagnostics, focused ESLint/formatting, storefront build, backend server build, and backend demo-tooling TypeScript.

Unrelated limits recorded without repair:

- The full backend `npm run build` stops in the existing dashboard config loader with `APP_ENV_EXPLICIT_MODE_REQUIRED`, including a retry with `APP_ENV=dev`. Its environment policy was not relaxed.
- The established HTTP homepage/editor test passes its real Shop/detail preview, global theme, shared shell, public isolation and preview security assertions, then fails at `scripts/test-storefront-homepage.ts:420` on an About-page text assertion.
- Existing large client chunk warnings remain in the storefront build. Manual appearance/accessibility/responsive review is deferred to the developer as requested.
- Failed integration iterations are retained by the existing disposable-database guard; successful runs were automatically dropped. The populated demo database was only inspected through a connection forced to read-only.

## Actual manual-test data and setup

Read-only inspection of `vendure_demo_market_ops` confirmed the dedicated vendor `Willow & Grain Design Fixture`, vendor ID 26, primary channel 29, and these existing records:

| Record                    | Actual value                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market                    | Willow Green Market Design Fixture                                                                                                                                                     |
| Confirmed occurrence      | ID 6, October 29, 2026, 9:00 AM to 2:00 PM America/Chicago                                                                                                                             |
| Existing product variants | 106: Seasonal greens (design fixture), SKU HOMEPAGE-PHASE1-0; 107: Country loaf (design fixture), SKU HOMEPAGE-PHASE1-1; 108: Wildflower honey (design fixture), SKU HOMEPAGE-PHASE1-2 |
| Vendor account            | homepage.vendor@example.test                                                                                                                                                           |
| Dedicated manager         | homepage.market@example.test                                                                                                                                                           |
| Credential reference      | `demoPassword` in backend `scripts/market-operations-demo/environment.ts`                                                                                                              |
| Shop                      | http://homepage-vendor.localhost:4321/products                                                                                                                                         |
| Existing occurrence link  | http://homepage-vendor.localhost:4321/products?occurrence=6                                                                                                                            |
| Admin                     | http://localhost:4322/vendor/storefront                                                                                                                                                |

The persistent database does not yet contain the new Shop-specific fixture matrix. The following optional command is intentionally supplied for explicit manual execution and was not run against it:

```powershell
# From E:\coding\farmers-market-platform-web
npm run demo:market-operations:storefront-shop-fixtures
```

The command refuses a missing database or pending schema migrations. It requires the existing dedicated homepage vendor, manager, market, source and approved membership. It never resets/reseeds the database, edits Manna Roots or Boerne accounts, rewrites existing merchandise, or saves/publishes appearance. It uses normal ownership, occurrence, participation, listing, publication and inventory workflows. Repeating it on the same date reuses IDs and the inventory operation keys.

It adds two dedicated confirmed occurrences at 9:00 AM to 2:00 PM America/Chicago, 7 and 14 days after invocation. Running on October 22 yields October 29 and November 5, 2026. IDs are allocated locally and printed with exact URLs; do not substitute IDs from the disposable test. It also adds:

| Product            | SKU         | Category | First date  | Second date |
| ------------------ | ----------- | -------- | ----------- | ----------- |
| Shop sample greens | SHOP-PAGE-0 | Produce  | Available   | Available   |
| Shop sample loaf   | SHOP-PAGE-1 | Bakery   | Available   | Unavailable |
| Shop sample honey  | SHOP-PAGE-2 | Pantry   | Unavailable | Unavailable |

These fixture products have 20 units of initial physical stock, with a 20-unit market cap on enabled offerings. Test purchases reduce future availability normally. The command does not overwrite later manual eligibility or product edits. Fixtures are test merchandise with taxes disabled. Existing unrelated products/occurrences remain visible according to their own real rules.

## Manual test sequence

Start or restart the local environment in separate terminals from the web directory:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. Open the Shop URL. Verify the shared vendor header/footer, current palette/type/corners, category sidebar and four-column layout where width permits. On tablet/mobile verify the category dropdown, readable market summary, sensible column reduction and no horizontal overflow.
2. If the optional matrix is installed, use its printed first occurrence URL. Verify all three sample cards remain visible. Greens and loaf are purchasable, honey is disabled. Filter Produce/Bakery/Pantry and change sorting; the occurrence remains selected.
3. Open a product, return to Shop and use the shared header navigation. Verify the occurrence persists. Open the unavailable honey directly; its purchase control must stay disabled.
4. Add greens. Verify success feedback, quantity in `/cart`, pickup date/venue, and the existing checkout flow. With items present, Change Market must reject the second date without moving items. Empty the cart, then change market successfully. Loaf must become unavailable while greens remain purchasable.
5. For an existing multi-variant product, verify the card opens Choose options and detail purchasing follows each option's actual eligibility. Dedicated sample products are single variant; the mixed-variant case is also covered automatically.
6. In the dedicated vendor/manager workflows, temporarily close a test offering, reduce stock/cap, or remove confirmation after opening Shop in another tab. Add must reject stale availability; refreshing must preserve the public card and disable purchasing. Restore those deliberate manual edits afterward.
7. In the existing editor, select Shop, change global palette/type/button shape, and inspect desktop/tablet/mobile previews. The same Astro Shop should reflect those tokens and shared header/footer changes. Purchase controls must not mutate a cart. Editor dropdown styling and layout should match their prior appearance.

No persistent migration or seed was applied. The optional fixture command and manual visual review remain for the developer. Prices continue to come from the native public catalog; checkout remains authoritative for final tax and totals. Completing payment in the persistent demo requires its existing local test-payment configuration; this change does not enable a payment provider. The discovery horizon, bounded catalog read and category-facet convention are the intentionally limited scope of this implementation.
