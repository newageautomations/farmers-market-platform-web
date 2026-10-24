# Storefront cart refinement

Implemented locally on October 23, 2026. No deployment, remote Git operations, backend changes, persistent migrations, fixture changes, browser automation, screenshots or visual captures were performed. Existing unrelated local work was preserved.

## Implementation

Vendor `/cart` retains SiteLayout and the Harvest header/footer, normal storefront width, theme fonts, palette, button shape/hover behavior and card-radius tokens. The shared market banner sits above a two-thirds item area and one-third order summary. Below 900px the summary follows the items; below 520px line totals move below item details. Rows use whitespace and separators rather than separate cards. Long labels and amounts wrap, controls have 44px touch targets, and shared focus/reduced-motion behavior remains in force.

Items show safe thumbnails with a missing-image fallback, linked product names, the selected variant name, native tax-inclusive unit prices, discounted line totals, quantity steppers, an editable centered integer quantity that saves on blur or Enter, and accessible Remove actions. Remove uses the shared destructive-outline variant: danger-red text and outline by default, with danger-red fill and white text on hover/focus. Quantity step buttons use the outline transition independently of the global hover selection. Storefront input corners follow the live button-radius token, including square, soft and pill settings. Native number spinners are hidden to keep the quantity visually centered. Quantity one is the minimum; removal is explicit. Server inventory/capacity and order-state restrictions remain authoritative. A shared request lock prevents competing cart writes, market selection and checkout. Successful changes update items and amounts without document reload. Failures reread authoritative state, including native partial results; failed rereads preserve visible items and block uncertain checkout.

The genuine empty cart uses the existing EmptyState presentation, a small decorative basket and Continue Shopping with the valid market in its URL. It has no summary or checkout action.

The subsequent requested Cart refinement makes Continue Shopping a primary action with a decorative left arrow in both populated and empty states. The unnecessary account/sign-in prompt is removed from Cart. Below the cart and above the shared footer, You might also like reuses ProductCards, the existing related-product category ranking, and the configured related heading/visibility. It excludes all products currently in the cart, displays up to four authorized catalog products, and uses the cart's selected market and existing availability. Optional catalog failures omit suggestions without hiding the cart. Existing FeaturedAdd events refresh the live cart and totals; a refresh arriving during a cart operation is queued until that operation finishes. No recommendation service or new card component was introduced.

## Shared market banner and order context

`VendorPreorderBanner.tsx` composes the existing banner and ShopMarketSelection. Its thin Astro adapter renders and hydrates the same component on Shop and Product Details; the existing cart island composes it directly so cart refreshes can update its context. Shared CSS was extracted into `preorder-banner.css`. Shop's banner now precedes both category/sidebar and catalog columns. Product Details retains one banner above its gallery and purchase content. No page-wide hydration or second selection system was introduced.

The banner shows market name, date, time zone-aware **Market hours**, venue, existing pickup instructions and Change Market. The occurrence API exposes operating times rather than a separate committed pickup window, so those times are not labelled as a pickup window. Final pickup details remain in checkout.

`vendorPreorder` resolves a populated cart using its actual MARKET_OCCURRENCE order context, matching the order ID. A query string or cookie cannot substitute another market when the order context is missing, mismatched or no longer eligible. The actual occurrence date is retained for explanation when available. Empty carts reuse the existing valid query/cookie/default selection behavior. Preferences remain scoped by storefront in HTTP-only cookies. Protected switches still go through the existing backend/API guard; a refusal explains removal and links to Cart.

The existing private `/api/shop` cart read accepts `includePreorder: true` to return the same order-bound context and batched availability facts. Ordinary cart/session consumers keep their existing responses. Origin, storefront, channel and customer session checks remain intact. Cart refreshes on window focus/page restoration and immediately before checkout navigation.

## Summary, eligibility and shared components

The summary displays item count, native subtotal including tax, existing discounts, surcharges, included taxes, nonzero pickup fees and the native current total. It does not sum monetary rows or calculate unit prices, tax, fees or discounts. The public Shop order fragment now requests Vendure's existing `unitPriceWithTax`; generated Shop types/documents were refreshed. No schema or backend migration is required.

Availability warnings identify affected lines using the existing public availability reason and quantity. Missing facts or context, unavailable variants, excessive quantities, and noneditable orders block checkout while permitting correction/removal where the order permits it. Unpublished products, closed windows and canceled/ineligible markets use the reasons the API actually supplies, with truthful generic feedback when details cannot be confirmed. Valid items are preserved. Checkout still navigates once to `/checkout` using the existing cookie session and preorder order context. Final pricing recalculation, eligibility, payment and fulfillment validation remain in that workflow.

Reused components/contracts: SiteLayout, HarvestHeader/Footer, Button and `buttonClassName`, Input, SelectField, Card, EmptyState, existing alert classes, native disclosure presentation, occurrenceLabel, safeAsset, formatMoney and ShopMarketSelection. The existing optional CheckoutLoyalty widget and preselection behavior were retained, including its lock and authoritative reread; no new loyalty or promo-code UI/infrastructure was added.

The React banner is an adapter of the existing feature composition because an Astro-only component cannot update inside the live cart island. Cart rows extend VendorCart's existing controller using shared controls; there was no reusable rich cart-row composition to import. These changes introduce no new UI primitive, design system or approval of pending component categories.

## Verification

- Cart suggestions follow-up: focused cart, Product Details and Shop tests, browser-safe hydration bundle verification, typechecking, targeted lint/format checks and storefront build. Manual review should confirm the primary left-arrow action, absent account prompt, suggestions above the footer, exclusion of cart products and automatic total updates after adding a suggestion. The related section is omitted when the existing setting is disabled or no other catalog products remain.
- Quantity-control follow-up: 35 cart/appearance tests passed, including automatic blur/Enter saves, unchanged-value suppression, invalid quantities and stepping from a typed draft. Update was removed; presentation changes remain scoped to cart controls and storefront input shape.
- 85 tests passed across 10 focused files: cart-refinement, vendor-preorder, vendor-cart-session, storefront-shop, product-details, market-storefront, storefront-preview-security, storefront-preview-bridge, storefront-appearance and local-test-checkout.
- Coverage includes native monetary values, quantity changes, duplicate requests, invalid integers, removal/empty state, stock rejection/partial results, unavailable items, missing market facts, checkout blocking/navigation, market persistence and protected switching, cross-request cookies/channels, preview isolation, theme contracts and responsive CSS structure.
- `npm run typecheck`: passed, including Astro check with zero errors, warnings or hints.
- Targeted ESLint, `npx tsx scripts/check-boundaries.ts`, targeted Prettier checks and the storefront production build: passed. Cart imports occurrence formatting and safe assets through browser-safe `market` and `catalog` package entry points. The root entry also exports a Node-only resolver and must not be used by hydrated cart code. The build no longer emits Node HTTP/HTTPS browser externalization warnings; only the large-chunk advisory remains.
- `npx tsx scripts/test-storefront-client-bundle.ts`: passed. This builds the real ResilientSurfaces hydration entry in memory, rejects all Node builtin imports and checks for browser-externalization stubs. All 27 cart interaction tests also passed after this hydration fix. No browser automation was used.
- Backend tests were not needed because no backend code changed. No repository-wide regression suite or browser automation was run. Responsive geometry and appearance require manual review.

To repeat the focused tests from `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/cart-refinement.test.tsx tests/vendor-preorder.test.ts tests/vendor-cart-session.test.ts tests/storefront-shop.test.tsx tests/product-details.test.tsx tests/market-storefront.test.tsx tests/storefront-preview-security.test.ts tests/storefront-preview-bridge.test.ts tests/storefront-appearance.test.tsx tests/local-test-checkout.test.tsx
npm run typecheck
npm run build --workspace @market/storefront
npx tsx scripts/test-storefront-client-bundle.ts
```

## Exact manual testing

The read-only fixture audit verified local `vendure_demo_market_ops` on October 23. Dedicated products/variants: 109 greens (`shop-page-0`), 110 loaf (`shop-page-1`), 111 honey (`shop-page-2`). Each had 20 physical units and zero allocated. Occurrences 7 (October 30) and 8 (November 6) have 9am to 2pm America/Chicago market hours. Greens has enabled offerings on both dates, loaf only on 7, honey on neither. Offering caps were 20. The preorder windows close at 8am on the respective market date. Audit again before testing; saved orders or elapsed time can change availability.

```powershell
# Read-only, no reset, seed or migration:
npx tsx scripts/inspect-shop-fixtures.ts

# Start each in its own terminal, or restart the existing processes:
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. Use the dedicated vendor `homepage.vendor@example.test` at `http://localhost:4322` only if vendor inspection is needed. Use existing local credentials. No fixture preparation or migration is required for this cart change. Do not reset/reseed or change Manna Roots/market-manager accounts.
2. Open `http://homepage-vendor.localhost:4321/products`. With an empty cart, choose occurrence 7 using Change Market. Open `http://homepage-vendor.localhost:4321/products/shop-page-0?occurrence=7`. Confirm the same banner, market hours and pickup instructions, then add an eligible greens variant. Add loaf from `/products/shop-page-1?occurrence=7` for a multi-item cart.
3. Open `http://homepage-vendor.localhost:4321/cart`. Inspect desktop and phone widths, long names, image fallback, focus visibility and reduced motion. Confirm item details, counts, prices, line totals and the summary. Test plus/minus, manual whole quantities, invalid/fractional/excessive input, repeated clicks and removal. Failed updates must never appear as accepted. Removing one item must preserve the other; removing the last shows the empty state and no checkout action.
4. With items present, try occurrence 8 through Change Market on each page. Expect refusal with a Review your cart path. Try `/cart?occurrence=8` and refresh: the banner must still show the populated order's actual occurrence 7. Remove all items, select 8, return to Shop and Product Details and refresh; the new valid selection must persist. Loaf and honey availability must match their actual offerings.
5. Review genuine sold-out/closed/unpublished/canceled conditions when they exist in dedicated data. The existing public reason or a generic inability-to-confirm message must identify affected lines and block checkout. Do not alter shared data solely to manufacture these conditions. Simulate a connection failure locally, try an update, then restore connectivity and refresh; the cart must recover without pretending it was empty.
6. Continue to Checkout from a valid cart. Confirm the existing `/checkout` route has the same market/order and native totals. Final taxes, pickup fees and payment eligibility remain backend-owned. Use a second browser profile/customer and another storefront to check session separation. Returning from another tab should refresh the actual market and item quantities.
7. In the existing vendor visual editor, review Shop/Product Details with theme changes. The same banner and approved controls should follow theme tokens. Commerce remains disabled and no customer cart is displayed. Cart page selection/editing remains unsupported.

## Limitations and deferred work

Visual acceptance, real browser/session interaction and payment completion remain manual. API explanations are limited to existing public facts; no new scheduling fields, inventory model, price-recalculation endpoint or checkout validator was added. There is no polling; refresh, page restoration/focus and pre-checkout reads update current facts, and backend checkout performs final validation. Full cart visual editing, checkout redesign and every other explicitly excluded feature remain deferred. The reference screenshots were not attached to this request; implementation follows the supplied layout proportions and existing Harvest components.
