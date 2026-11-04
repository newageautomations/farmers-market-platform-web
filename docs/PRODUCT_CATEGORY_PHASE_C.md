# Product category taxonomy Phase C

Implemented locally November 2, 2026. Phases A and B remain the classification authority. Their reports were read and were not edited by this work. Pre-existing changes in both working copies were preserved.

## Implementation

Vendor storefronts and occurrence-specific market storefronts now browse the existing canonical category hierarchy and predefined product tags. Parents include all descendants. Category selections combine with OR; tags combine with AND. Vendor filters, search, sorting and pagination remain available. Unknown category/tag IDs, mixed category/tag identities and malformed IDs are rejected. Generic public facets are not presented as categories or approved tags.

Market navigation and counts come from the complete authorized occurrence catalog, not a homepage sample or displayed page. Category and tag counts are distinct Products. Public market browsing requests distinct Product pagination and renders each Product once, with links to its eligible variants through the existing occurrence/product detail routes. Variant-based reads remain available for existing item and availability consumers. Vendor identity stays on every Product.

Storefront owners can order parents, order siblings within a parent, hide/restore categories and select existing category images. Hiding a parent hides descendant navigation; it never unpublishes Products or alters catalog eligibility. Empty categories disappear automatically. The editor retains the entire active hierarchy, including hidden and empty categories. Settings belong to the individual appearance draft or website instance and use its existing save, publish, optimistic version and preview flows.

## Architecture and decisions

### Authorized catalog projections

`OccurrenceCatalogService.catalog` retains its original eligible SQL CTE and all its market, channel, membership, participation, listing, offering, ownership, publication, price/currency, version/provenance and preorder-window predicates. Recursive canonical category paths and approved tags decorate those eligible rows. Category/tag/search filtering occurs before grouping, sorting, LIMIT and OFFSET. The same SQL statement returns items, total, vendor filters and complete taxonomy summaries from one PostgreSQL snapshot.

`taxonomy/storefront.ts` supplies narrowly shared classification CTEs and summaries. It reads `farmstand_product_category`, `farmstand_category` and `farmstand_tag`, rather than translated Facet names or legacy category metadata. Counts use `count(DISTINCT productId)`. Category filters overlap the primary leaf's recursive ancestor path; tag filters require every selected approved tag. Public tags must also have native public/channel-published FacetValues. No tag implies verification, guaranteed certification or inventory availability.

`vendorStorefrontTaxonomy` is a bounded Shop projection behind the existing `vendorAuthority` checks. It returns the complete published, owned vendor Product classification and eligible variant IDs, category/tag summaries, and filtered Product identities. The storefront passes those identities to its existing channel-authorized native Shop Product read before native pagination, then retains its existing display pagination, pricing, product/variant cards and commerce controllers. It never uses Admin Product reads. It does not provide a substitute market catalog.

The existing vendor catalog ceiling remains 10,000 Products, with an explicit error instead of silently showing sampled counts. Reads are request-local and are never cached across hosts, visitors or previews. There are no per-Product classification requests. Editorial Market's existing available-only view uses the full classification/variant projection and its existing batched preorder-availability reads to narrow category/tag counts before display pagination. It never derives counts from the visible page.

Market `distinctProducts` is opt-in, preserving existing variant/item consumers. Representative rows follow the requested stable sort. Each grouped item also carries the eligible variants for its Product. Category/tag summaries are independent of selected category/tag branches, allowing additional selections; they respect occurrence eligibility, search, vendor, variant and retained generic-facet constraints. Vendor summaries retain their independent vendor-selection behavior and count Products when grouped browsing is requested.

### Presentation and component reuse

Optional `categoryPresentation` entries are keyed by canonical category ID and contain sibling position, navigation visibility and an existing Asset ID/URL pair. No parent relationship or category definition can be edited. Unconfigured/new categories use their canonical positions, with deterministic canonical tie breaking. Reordering writes only sibling positions. Reset sibling order retains visibility and images.

The backend appearance validator checks structure and bounds. The existing appearance service rechecks canonical IDs, Asset existence, image type, actual stored URL, channel scope and approved theme-asset scope on save, publish and preview. Existing assets are referenced directly. Selecting a library or theme image does not create another Asset. Uploads use the existing AssetService/storage strategy, scoped appearance authority, PNG/JPEG signatures and a 10 MB limit.

`StorefrontCategoriesEditor` is a feature composition of existing native disclosures, SelectField, Checkbox/Field, Button, error/loading controls and `CategoryImageField`. The existing image field cannot edit hierarchy-aware sibling order and visibility, which is why this small composition is needed. It uses move buttons for keyboard-accessible ordering and does not create a competing drag, form or styling system. Both vendor visual-editor and market appearance controllers retain their ownership and save/publish responsibilities.

`TaxonomyFilters.astro` is a native SSR adapter of the existing public GET filter, disclosure and button contracts. Full path labels and indented category choices expose the hierarchy without hydrating the page. Each theme retains its existing layout, category links, images and visual identity. Modern Farmhouse, Editorial Market, Harvest and the retained legacy Farmhouse adapter consume the same presentation rules. Editorial artwork and existing product-photo fallbacks remain available. Farmhouse category-linked promotion tiles obey visibility and category image overrides; unrelated custom promotional tiles retain their own settings.

Home category previews and Farmhouse footer navigation read the complete authorized taxonomy projection, independently of featured Product samples. Market home previews link to the specific represented occurrence. Category presentation read failures omit decorations without hiding unrelated homepage content. Existing canonical Editorial image overrides remain compatible; discarded legacy associations are never reconstructed.

## Files changed

Paths below are relative to the indicated local repository. Changes that existed before this request are not claimed as Phase C work.

| Repository | Files                                                                                                                                                                                    | Purpose                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Backend    | `src/plugins/marketplace-commerce/taxonomy/storefront.ts`                                                                                                                                | Canonical recursive projection, filter validation and distinct Product summaries.                                                     |
| Backend    | `src/plugins/marketplace-commerce/occurrence-catalog.service.ts`                                                                                                                         | Extend the existing authorized occurrence query; Product grouping and eligible variant links.                                         |
| Backend    | `src/plugins/marketplace-commerce/market-public-shop.service.ts`, `api.ts`                                                                                                               | Authorized vendor taxonomy projection and public catalog contracts.                                                                   |
| Backend    | `src/plugins/platform-identity/storefront-appearance-config.ts`                                                                                                                          | Optional per-appearance category settings and validation.                                                                             |
| Backend    | `src/plugins/farmers-market/services/storefront-appearance.service.ts`, `api/storefront-appearance.ts`                                                                                   | Canonical reference checks and vendor/market-authorized image library/upload operations.                                              |
| Backend    | `scripts/market-operations-demo/taxonomy-phase-c-fixture.ts`, `scripts/market-operations-demo/run.ts`, `package.json`                                                                    | Guarded additive dedicated fixture and focused test commands.                                                                         |
| Backend    | `test/product-taxonomy/phase-c.ts`                                                                                                                                                       | Eight focused disposable-database qualification groups.                                                                               |
| Web        | `packages/api/src/storefront-taxonomy.ts`, `storefront.ts`, `market-storefront.ts`, `storefront-appearance.ts`, `index.ts`                                                               | Named public projection, typed metadata and authorized appearance/media adapters.                                                     |
| Web        | `packages/api/schema/shop.graphql`, `packages/api/operations/shop.graphql`, `packages/api/src/generated/shop.ts`                                                                         | Checked-in Shop schema, operations and generated contracts.                                                                           |
| Web        | `packages/storefront-core/src/taxonomy.ts`, `vendor-shop.ts`, `market.ts`, `index.ts`, `fixtures.ts`                                                                                     | Shared hierarchy/presentation/query helpers, availability count restriction, canonical facet-code reads and synthetic-fixture typing. |
| Web        | `packages/theme/src/storefront.ts`                                                                                                                                                       | Optional category presentation schema in the existing appearance contract.                                                            |
| Web        | `apps/storefront/src/lib/storefront-taxonomy.ts`, `components/TaxonomyFilters.astro`                                                                                                     | Request-local complete metadata and shared native GET controls.                                                                       |
| Web        | `apps/storefront/src/pages/products/index.astro`, `pages/index.astro`, `pages/occurrences/[occurrenceId]/index.astro`                                                                    | Vendor filters, occurrence-specific distinct Product browsing and home query options.                                                 |
| Web        | `apps/storefront/src/components/MarketPublicHome.astro`                                                                                                                                  | Categories for the represented occurrence, with independent market presentation.                                                      |
| Web        | `apps/storefront/src/components/editorial-market/{Home,Shop}.astro`, `modern-farmhouse/{Home,Shop,Footer}.astro`, `legacy-modern-farmhouse/Home.astro`                                   | Theme-specific navigation, promotions and image fallbacks.                                                                            |
| Web        | `apps/admin/src/StorefrontCategoriesEditor.tsx`, `StorefrontAppearance.tsx`, `VisualStorefrontEditor.tsx`, `EditorialMarketEditor.tsx`, `FarmhouseEditor.tsx`                            | Reusable presentation composition in existing editors; retire legacy image controls and category reads.                               |
| Web        | `tests/product-taxonomy-phase-c.test.tsx`, `editorial-market.test.tsx`, `storefront-shop.test.tsx`, `market-storefront.test.tsx`, `cart-refinement.test.tsx`, `product-details.test.tsx` | New presentation/filter coverage and migrated canonical contract fixtures.                                                            |
| Web        | `scripts/demo-market-operations.ts`, `package.json`                                                                                                                                      | Guarded dedicated fixture entry point through the web directory.                                                                      |
| Web        | `docs/PRODUCT_CATEGORY_PHASE_C.md`                                                                                                                                                       | This consolidated report.                                                                                                             |

## Database and manual fixture status

No Phase C database migration is required. Existing taxonomy definitions, classifications and the Phase A conversion were not rerun. After explicit user approval, the dedicated Phase C fixture was added to the persistent database. Established Boerne, Manna Roots and other existing business data were not changed.

A read-only transaction verified the actual database as `vendure_demo_market_ops` on PostgreSQL address `::1`. Inspection found no upcoming Boerne occurrence. Existing upcoming occurrences belonged to other markets and each had only one participating vendor. Manna Roots Products 6, 7, 8 and 9 remain classified as `beverages.juices-cider`, with no inferred tags.

The requested dedicated fixture is implemented and passes disposable qualification, including repeat-run idempotency and complete-row hash comparisons for pre-existing vendors, markets, users, memberships, Products, variants, listings, offerings, occurrences, orders, order lines and stock levels. It adds only dedicated identities, a market, two vendor storefronts, four Products, initial stock through the existing coordinator, and two future occurrence scenarios. Existing fixture data and appearance settings are reused rather than reset.

**Persistent fixture setup completed November 2, 2026 after explicit user approval.** The guarded command verified the local `vendure_demo_market_ops` target and existing schema, applied no migrations and blocked external services. Its authorized catalog verification returned three Products on occurrence 41 and two on occurrence 42, with two Certified Organic + Fresh Products on each. Unapproved Herbs was absent from both market results.

The first attempt stopped on an already-used synthetic phone number after creating the dedicated manager account. The fixture now chooses an unused number in the reserved fictional range and resumes a dedicated account missing its phone identity without resetting credentials or changing another user's identity. A disposable regression covers both phone collision and partial-account recovery, including preservation of the occupied phone identity. The approved command then completed successfully.

Created storefronts: Orchard 35, Garden 36 and Market 37. Created Products: 427 Carrots, 428 Tomatoes, 429 Strawberries and 430 Unapproved Herbs. Their names carry the `Phase C` prefix. Each has one variant; the three market-eligible variant IDs are 428, 429 and 430 respectively. Three dedicated accounts, two vendors, one market and two occurrences were added, with only their supporting memberships, listings, offerings, ownership records and initial inventory.

To reuse or refresh the dedicated fixture, run from `E:/coding/farmers-market-platform-web`:

```powershell
npm run demo:market-operations:taxonomy-c-fixtures
```

The guarded demo path verifies existing migrations without applying them, requires the local persistent target and blocks external services. Repeating the command reuses the same upcoming dedicated dates and Product identities without duplicating records or resetting stock, account credentials or appearance choices. When its fixture dates age out, it can create fresh dedicated upcoming dates. It never changes established Boerne or Manna Roots records.

## Automated verification

The backend command is:

```powershell
# From E:/coding/farmers-market-platform
npm run test:product-taxonomy:phase-c
npm run test:product-taxonomy:types
npm run build:server
```

Eight integration groups passed using the existing guarded disposable database mechanism:

- Parent/leaf aggregation across two eligible vendors, Product deduplication with two variants, and empty-category omission.
- Category OR, tag AND, combined vendor filtering, search, invalid cross-kind identities and stable pagination with complete summaries.
- Occurrence isolation, Admin-versus-Shop authority, foreign market channel denial and market-versus-vendor operation boundaries.
- Exclusion under suspended membership, cancelled participation/occurrence, withdrawn listing, disabled offering/Product/variant, closed window and mismatched market price.
- Vendor canonical filtering, distinct Product counts, seller-declared claims and foreign-vendor isolation.
- Appearance draft/publish, invalid category references, scoped image selection, foreign writes, website-instance isolation and hidden navigation retaining catalog Products.
- Public GraphQL contracts and continued denial of native market `products` reads.
- Dedicated fixture idempotency, phone-number collision handling, partial-account recovery, preservation of pre-existing protected rows and occurrence-specific category aggregation through the real authorized query.

Successful test databases were dropped by the guard. Earlier failed fixture iterations remain retained according to the existing failure policy. None used the persistent test database. PostgreSQL emitted an existing concurrent-query deprecation advisory during native event processing; the assertions passed.

Final frontend qualification passed all 107 tests across these 12 files in one focused run:

```powershell
# From E:/coding/farmers-market-platform-web
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/product-taxonomy-phase-c.test.tsx tests/storefront-shop.test.tsx tests/market-storefront.test.tsx tests/farmhouse-shop.test.ts tests/cart-refinement.test.tsx tests/product-details.test.tsx
npx vitest run tests/storefront-appearance.test.tsx tests/storefront-visual-editor.test.tsx tests/editorial-market.test.tsx tests/farmhouse-v2.test.tsx tests/website-library.test.tsx tests/vendor-categories.test.tsx
npm run typecheck --workspace @market/storefront
npm run build --workspace @market/admin
npm run build --workspace @market/storefront
```

The tests cover hierarchy ordering, hidden parent/child behavior, restoration, image isolation and theme-image reuse without upload, malformed/repeated filter IDs, available-only distinct counts from the complete projection, read failure/retry, query transport, and existing appearance, website, shop, product-option, cart and Farmhouse behaviors. Astro checking, focused TypeScript checking, changed-file ESLint and the admin/storefront builds passed. Builds retain their existing large-chunk advisories. No complete repository suite, browser automation, screenshot comparison, visual capture or UI sweep was performed.

The root TypeScript check continues to report unrelated pre-existing operations-read fixture signature errors in application review/dashboard/phase tests and the removed `retire` prop in `tests/occurrence-layouts.test.tsx`. Those were not repaired. A temporary scoped configuration checked admin, shared packages and the affected focused tests; it was removed after checking.

## Manual testing

Use the integrated local environment. No migration, conversion, reset or ordinary-backend startup is required. Start the needed processes in separate terminals from `E:/coding/farmers-market-platform-web`:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

The following existing routes and accounts were verified read-only:

| Surface                         | Route / account                                                                  | Checks                                                                                                                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manna Roots public catalog      | `http://manna-roots.localhost:4321/products`                                     | Beverages and Beverages / Juices & Cider contain Green Garden Juice, Carrot Sunrise Juice, Berry Beet Juice and Ginger Citrus Shot. Selecting either branch includes the juices. No categories are inferred from their names. |
| Manna Roots editing             | `http://localhost:4322/vendor/storefront`, `manna-roots@example.test`            | Open an existing website in its existing editor. Use Category presentation for order, visibility and existing image selection. Save draft, then deliberately publish when ready to test the public snapshot.                  |
| Existing product classification | `http://localhost:4322/vendor/products/6`, same vendor                           | Inspect Green Garden Juice. Phase C does not change its primary category or add tags. Existing product/variant, pricing and purchase flows remain in use.                                                                     |
| Existing Boerne market          | `http://boerne-farmers-market.localhost:4321/`, `market.manager@example.test`    | No future occurrence was present at inspection. Categories must not imply availability from a past or unrelated occurrence. Use the dedicated fixture for the aggregate demonstration.                                        |
| Existing Willow vendor          | `http://homepage-vendor.localhost:4321/products`, `homepage.vendor@example.test` | Exercise the currently selected premium theme and check its existing layout/commerce interactions. Category settings remain isolated from Manna Roots and markets.                                                            |

Existing account passwords remain the existing local demo password defined in backend `scripts/market-operations-demo/environment.ts`. Existing records were not changed to curate a demonstration.

The dedicated fixture is ready. Use these fixed accounts with password `Local-Taxonomy-C-2026!`:

| Account                           | Role / fixed route                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `taxonomy-c-manager@example.test` | Taxonomy C Market owner. Public home: `http://taxonomy-c-market.localhost:4321/`. Appearance: `http://localhost:4322/market/storefront` in the matching business context. |
| `taxonomy-c-orchard@example.test` | First vendor. Catalog: `http://taxonomy-c-orchard.localhost:4321/products`. Editor: `http://localhost:4322/vendor/storefront`.                                            |
| `taxonomy-c-garden@example.test`  | Second vendor. Catalog: `http://taxonomy-c-garden.localhost:4321/products`. Editor: `http://localhost:4322/vendor/storefront`.                                            |

The exact created occurrence routes are:

- First occurrence, November 6, 2026 at 9:00 AM America/Chicago: [http://taxonomy-c-market.localhost:4321/occurrences/41](http://taxonomy-c-market.localhost:4321/occurrences/41).
- Second occurrence, November 7, 2026 at 9:00 AM America/Chicago: [http://taxonomy-c-market.localhost:4321/occurrences/42](http://taxonomy-c-market.localhost:4321/occurrences/42).
- Produce filter: [occurrence 41 with category 96](http://taxonomy-c-market.localhost:4321/occurrences/41?category=96).
- Vegetables filter: [occurrence 41 with category 97](http://taxonomy-c-market.localhost:4321/occurrences/41?category=97).
- Fruits filter: [occurrence 41 with category 98](http://taxonomy-c-market.localhost:4321/occurrences/41?category=98).
- Category OR: [Vegetables and Fruits](http://taxonomy-c-market.localhost:4321/occurrences/41?category=97&category=98).
- Category plus tag AND: [Produce, Certified Organic 186 and Fresh 200](http://taxonomy-c-market.localhost:4321/occurrences/41?category=96&tag=186&tag=200).
- Existing market Product detail routes for the fixture: `/occurrences/41/products/428` (Carrots), `/occurrences/41/products/429` (Tomatoes) and `/occurrences/41/products/430` (Strawberries), on the same market host.

These IDs were returned by the populated database and authorized catalog, not inferred from disposable tests. If refreshed dates are created later, use the replacement occurrence URLs printed by the command.

| Verified occurrence | Produce count | Vegetables count | Fruits count | Organic + Fresh results  |
| ------------------- | ------------- | ---------------- | ------------ | ------------------------ |
| 41, November 6      | 3             | 2                | 1            | Carrots and Strawberries |
| 42, November 7      | 2             | 1                | 1            | Carrots and Strawberries |

| Scenario                                  | Actions                                                                                                                                                                                                                                                                                      | Expected result                                                                                                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cross-vendor aggregation                  | Open occurrence 41 using the exact link above. Select Produce, then Vegetables.                                                                                                                                                                                                              | Produce contains Phase C Carrots from Orchard, Phase C Tomatoes from Garden and Phase C Strawberries from Garden. Parent count is 3; Vegetables count is 2 and contains both vendors. Vendor identity remains visible.   |
| Child/parent selection                    | Select Fruits alone, then both Vegetables and Fruits.                                                                                                                                                                                                                                        | Fruits shows Strawberries. Multiple branches use OR and show all three Products once.                                                                                                                                    |
| Categories with tags                      | Select Produce plus Certified Organic and Fresh. Then add the Garden vendor filter.                                                                                                                                                                                                          | The combined tags use AND: Carrots and Strawberries first, then Strawberries only for Garden. The UI describes tags as seller declared, with no verification badges.                                                     |
| Occurrence differences                    | Open occurrence 42 using the exact link above. Repeat Produce and Vegetables.                                                                                                                                                                                                                | Only Carrots and Strawberries are offered. Tomatoes are absent from this date; counts are 2 and 1. The homepage preview corresponds to its represented date.                                                             |
| Ineligible Product                        | Search the market for Unapproved Herbs. Open `http://taxonomy-c-garden.localhost:4321/products/taxonomy-c-unapproved-herbs`.                                                                                                                                                                 | Herbs are absent from both market occurrences and their category summaries. The owned published vendor Product remains accessible at its vendor URL; classification does not authorize market publication.               |
| Category ordering                         | In the Garden vendor editor, select Fruits and Move earlier. For parent ordering use an existing Willow website with multiple nonempty parents; classification changes are unnecessary. Save draft; inspect preview; publish deliberately. Repeat with different order in market appearance. | Sibling order changes inside Produce only. No child can move under another parent. Draft settings do not alter the published site until publish. Market and vendor orders stay independent.                              |
| Visibility and restore                    | Hide Produce, save/publish, then browse All Products and direct vendor Product URLs. Reopen the editor and restore it. Hide only Fruits next.                                                                                                                                                | Parent and descendant navigation/promotions disappear while all authorized Products and details remain available. Hidden choices remain in the editor. Child hiding leaves Vegetables navigation present.                |
| Images                                    | Choose a parent/child from Category presentation and select an existing image or upload a dedicated image. For Editorial Market, also choose an approved Theme Image. Save and publish.                                                                                                      | The canonical category uses that storefront's image in its category presentation/promotion, with existing theme fallback where appropriate. Reusing an existing image performs no upload and creates no duplicate Asset. |
| Independent website instances             | Duplicate/add a vendor website through the existing library, alter its category settings and save without publishing it. Compare the live website and market.                                                                                                                                | The draft instance, live instance and market retain their independent settings. Publishing uses the existing explicit live-site switch/version checks.                                                                   |
| Search, sorting, paging and accessibility | Combine category/tag/vendor selections, search and a sort. Use keyboard disclosure/checkbox controls, then pagination and browser history. Test a narrow public viewport.                                                                                                                    | Query state survives sorting/paging. Filters reset the display page, stable results remain in scope, full path labels remain understandable and existing theme layouts remain responsive.                                |

The fixture creates one variant per demonstration Product to stay small. The automated backend test separately covers a two-variant Product and checks Product grouping, counts and pagination.

## Exclusions and limitations

No POS migration, global taxonomy editor, custom category definitions, new tags, membership workflow changes, stock/preorder policy changes, certification verification, new theme or editor redesign was implemented. POS still uses its existing Collection-based category path and needs a separately authorized migration.

Manual interface acceptance is pending the product owner's testing. The approved persistent dedicated fixture is created and verified as described above. Existing storefront-editor desktop access restrictions were preserved; public category controls retain responsive native behavior. The vendor catalog keeps its established 10,000-Product bound. The two mixed bundles left unresolved by Phase A, Product 331 (Coffee & Biscotti Pairing) and Product 408 (Farmhouse Pantry Pair), remain unclassified; Phase C does not infer a category or change their publication. Market catalog eligibility remains `DOMAIN_TIME_ONLY`; capacity and cart operations remain authoritative for actual purchasable quantities.

Future POS work must replace its Collection category filter/read with canonical identities and hierarchy, preserve register search, variant selection, favorites, pricing and inventory authority, qualify distinct Product counting, and leave storefront presentation settings independent of register behavior.
