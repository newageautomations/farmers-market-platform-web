# Product category taxonomy Phase D

Implemented locally November 2, 2026. Phases A, B and C remain the taxonomy authority. Existing working-copy changes and their reports were preserved.

## Implementation

The existing `/vendor/pos` register now uses canonical Farmstand category IDs and primary Product classifications. Collection membership no longer supplies POS categories or category filtering. Other Collection consumers are unchanged.

The first horizontal row shows All Products and populated canonical parents. Selecting a parent immediately requests its complete descendant scope and reveals a second horizontal row with All <parent> and populated children. A child is an optional refinement. Switching parents clears the child; All Products clears both and hides the child row. Selection changes are local React state, with no route navigation, modal or page reload.

The existing shared Button supplies native keyboard activation, focus and pressed-state presentation, including a selected underline. Parent choices reuse secondary/tertiary variants; children use tertiary with the existing compact option and the retained 44px POS touch target. Both rows use native overflow scrolling and nonwrapping labels. The existing parent-row overflow arrows, favorites control, product tiles, variant Dialog, cart and dashboard shell remain. This extends the register composition in place. No new primitive, library, category editor, tag control, count, image or metadata UI was introduced. Shared Tabs is a panel selector; these controls retain the existing POS button-filter semantics rather than creating tab panels.

## Local files and operations

| Repository | File                                                    | Change                                                                                                                                                                    |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web        | `apps/admin/src/vendor/pos.tsx`                         | Parent/child state and controls, bounded page cache, filtered Enter-to-add, loading announcement and stale-response protection.                                           |
| Web        | `apps/admin/src/vendor/pos.css`                         | Prevent category-label wrapping and bound the child scroller to the product browser. Shared button presentation remains authoritative.                                    |
| Web        | `packages/api/src/in-person.ts`                         | Canonical `parentId` and ordering metadata in `PosCatalog.categories`; optional exact `sku` input.                                                                        |
| Web        | `tests/in-person.test.tsx`                              | Hierarchical navigation, immediate parent selection, reset, search, cache, stale responses, filtered Enter-to-add, cart persistence and unchanged checkout-read coverage. |
| Backend    | `src/plugins/marketplace-commerce/in-person/service.ts` | Replace Collection category filtering and projection with canonical classifications; validate references and add exact SKU matching.                                      |
| Backend    | `test/product-taxonomy/phase-d.ts`                      | Focused real-service and JSON API checks against a guarded disposable database.                                                                                           |
| Web        | `docs/PRODUCT_CATEGORY_PHASE_D.md`                      | Consolidated implementation, verification and manual-testing report.                                                                                                      |

The existing `ownPosCatalog(input: JSON): JSON!` operation remains in use. Its category records now contain canonical `id`, translated `name`, `parentId` and `position`. The adapter explicitly types the hierarchy. No GraphQL schema or generated-operation change is necessary for this JSON contract. Other POS operations and variant identities are unchanged.

## Filtering, authorization and performance

The backend reuses `taxonomy/storefront.ts` recursive classification CTEs. A primary leaf's ancestor path supplies parent membership. Parent filtering matches the selected ID anywhere in that path; leaf filtering therefore includes only direct classifications. Unknown, malformed, inactive or inactive-ancestor references are rejected. A valid but unpopulated category returns no products. Storefront category visibility, images and order overrides are never read.

The category projection is an SQL existence query over the full owned, vendor-channel Product scope before search, favorites, category filtering or pagination. A populated branch requires an enabled, undeleted Product and at least one enabled, undeleted variant published to the current vendor channel. In a selected market context, that variant must also have the existing approved listing, verified approved membership, confirmed participation, and native Product/variant market-channel publication. The existing occurrence-context validation runs first. Category IDs only narrow these predicates and cannot provide authority.

Availability is browsing eligibility, not a promise of current stock. Existing bounded price, source, stock, external-freshness and market-validation projection still supplies unavailable reasons for variants. Checkout remains authoritative. All Products retains existing unavailable-card behavior for disabled, unclassified or otherwise unavailable records. Such records do not populate categories merely by being classified. Otherwise valid historical unclassified Products remain accessible through All Products. No classification is inferred or written.

The existing 30-Product server pagination and 100-variant limit remain. Category switching requests only a filtered page, never the full catalog or per-Product classifications. Existing taxonomy Product/category and hierarchy indexes are reused; no schema change is needed. Category existence is independent of the displayed page and variant multiplicity. No counts are shown.

The register retains up to 24 recently loaded pages for 15 seconds, keyed by search, page, effective category, favorites, refresh generation and occurrence. Changing API or occurrence clears the cache. Existing refresh generations invalidate prior pages. Checkout still revalidates every addition/review, including cached cards. A first visit can require one bounded server round trip; repeat visits within the cache window commit locally. This is not a fully preloaded catalog or offline POS.

Existing cards stay visible but disabled while a replacement page is pending. The existing status area announces Updating products; there is no POS-covering loading screen. Late catalog responses cannot overwrite a newer selection, including cache hits. Failed reads clear obsolete product results rather than enabling cards from the previous filter. Category selection does not refresh draft, payment, customer or cart data.

Submitting the search field now acts only on the current visible, filtered catalog results, as requested in the follow-up correction. Category and Favorites restrictions apply equally to browsing and Enter-to-add. While search debounce or a catalog request is pending, Enter does nothing. Once results are loaded, an exact visible SKU adds its matching variant; a single visible Product can use the existing product/variant-selection fallback. Hidden products never trigger a separate unfiltered lookup. Barcode devices that enter an existing SKU followed by Enter follow these same filters. The backend exact-SKU input remains available, but the register no longer calls it to bypass browsing filters.

## Database and preserved scope

No migration, taxonomy conversion, seed, manual fixture creation, account-grant change or persistent data write was performed. Read-only transactions verified `vendure_demo_market_ops` on loopback address `::1`, existing account permissions, classifications and sample SKUs. Existing dedicated Phase C data already supports child navigation; Twice Baked Cafe supports switching parent categories. Established accounts were not curated.

Automated integration tests create only guarded `vendure_test_taxonomy_d_*` databases through the existing test-database mechanism. Failed test databases are retained under its established policy; successful runs are dropped. Test-only products and classification lifecycle checks never touch the persistent demo dataset.

Pricing, taxes, discounts, stock policy, inventory operations, product ownership, authorization, cart serialization, favorites writes, payment providers, receipts, keyboard shortcuts and mobile cart handling were not changed. Square, Clover, Stripe and cash implementations were not modified. No deployment, browser automation, screenshots or full repository suite was run.

## Automated verification

- `FRONTEND_NO_EVIDENCE=true npx vitest run tests/in-person.test.tsx tests/pos-payments.test.tsx`: 53 tests passed, including existing product selection, multi-variant selection, cart serialization and payment behavior.
- ESLint on the changed web TypeScript/TSX files passed.
- A temporary scoped TypeScript configuration covering admin, shared packages and the two relevant test files passed; the temporary configuration was removed.
- `npm run build --workspace @market/admin`: passed, with the existing large-chunk advisory.
- Backend `npm run build:server`: passed.
- Backend focused integration test: 8 groups passed against the real services and `ownPosCatalog` HTTP contract. Coverage includes descendants, leaf narrowing, search, all-page availability, variant identities, SKU lookup, malformed/inactive IDs, empty branches, vendor and channel isolation, disabled Products, unclassified drafts, and market listing approval/native publication. The successful disposable database was dropped.

The backend `npm run build` dashboard step stopped at the existing `APP_ENV_EXPLICIT_MODE_REQUIRED` configuration guard. It was not bypassed; the narrower server build passed.

Reproduce the backend checks from `E:/coding/farmers-market-platform`:

```powershell
npx ts-node --project test/product-taxonomy/tsconfig.json test/product-taxonomy/phase-d.ts
npm run build:server
```

## Manual testing

Start only the required integrated processes in separate terminals from `E:/coding/farmers-market-platform-web`:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
```

Use `http://localhost:4322/vendor/pos`, sign in and select the matching vendor business. No migration or fixture command is required. The optional storefront process, if needed for the existing sign-in flow, is `npm run demo:market-operations:storefront`.

| Account                          | Password                                  | Existing examples                                                                                                                                                                                                                     |
| -------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `twice-baked-cafe@example.test`  | `local-identity-regression-only-password` | Cafe Drip Coffee, Product 50, SKU `TWICE-BAKED-CAFE-001`, Beverages / Coffee; Almond Biscotti, Product 52, SKU `TWICE-BAKED-CAFE-003`, Bread & Baked Goods / Cookies & Bars. Product 331, Coffee & Biscotti Pairing, is unclassified. |
| `taxonomy-c-garden@example.test` | `Local-Taxonomy-C-2026!`                  | Phase C Tomatoes, Product 428, SKU `TAXONOMY-C-1`, Produce / Vegetables; Phase C Strawberries, Product 429, SKU `TAXONOMY-C-2`, Produce / Fruits; Phase C Unapproved Herbs, Product 430, SKU `TAXONOMY-C-3`, Produce / Herbs.         |
| `manna-roots@example.test`       | `local-identity-regression-only-password` | Green Garden Juice, Product 6, SKU `MANNA-ROOTS-001`; other juices under Beverages / Juices & Cider.                                                                                                                                  |

1. With Twice Baked Cafe, open the POS in Independent Sale. All Products is selected and there is no child menu. Choose Bread & Baked Goods. Biscotti appears immediately before any child selection. Select Cookies & Bars, then All Bread & Baked Goods. Switch to Beverages. The previous child clears, coffee products appear immediately and All Beverages is selected. Choose Coffee, then All Products. Both category filters clear and the child row disappears. Product 331 remains under All Products without an invented category.
2. With the garden fixture in Independent Sale, select Produce. Tomatoes, Strawberries and Herbs are included immediately, subject to existing card availability. Vegetables narrows to Tomatoes; Fruits narrows to Strawberries; All Produce restores the parent results. Herbs is not approved for the market but remains an owned independent-sale product. If choosing an available dedicated market occurrence, its category must disappear unless it has approved native publication in that context. An expired occurrence must not be used.
3. Start checkout and add an available item. Switch parents and children several times. Its cart quantity, selling context and transaction must persist. In browser network tools, category clicks should call only `ownPosCatalog` when needed, with no document navigation or payment/cart refresh. Revisit a recent category within 15 seconds to observe cache reuse. Product availability remains governed by the existing add/review validations.
4. With Beverages selected in Twice Baked Cafe, enter or scan `TWICE-BAKED-CAFE-003` and press Enter. Almond Biscotti remains hidden and nothing is added to the cart. Repeat with Favorites hiding a nonfavorite product. Switch to Bread & Baked Goods or All Products, wait for the matching search result to appear, and press Enter: the visible Almond Biscotti variant can now be added subject to existing stock validation. Enter during a pending search does nothing. Try an unknown SKU and confirm nothing unrelated is added.
5. Type Coffee while Bread & Baked Goods is selected. The combined filter should have no coffee results. Clear the search and switch to Beverages; coffee returns. Search `TWICE-BAKED-CAFE-001` there. Name/variant/SKU browsing search still combines with the category. For Manna Roots, Beverages and Juices & Cider both show the juices; unrelated empty parents are hidden.
6. Where an existing eligible product has multiple variants, choose its tile and select a variant in the existing Dialog. Add it and change categories. The selected variant and quantity remain unchanged. Existing automated tests cover this even when the chosen manual account has only single-variant products.
7. At a small mobile width, swipe each category row independently. Labels stay on one line, touch targets remain comfortable, and the product grid/cart layout remains the existing layout. A vendor with too few categories to overflow needs no scrolling. On desktop, use a horizontal trackpad gesture or the existing parent arrows when overflow exists. Tab through both rows and activate choices with Enter/Space; focus and selected underline must be clear. No URL change, Apply button or confirmation is involved.

Manual interaction and latency acceptance belong to the product owner. No manual sale was created for this implementation. No requested category-navigation behavior is deferred; limitations are the retained bounded network loading, brief cached availability and existing SKU-based barcode model described above.
