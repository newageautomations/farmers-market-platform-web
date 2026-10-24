# Vendor category management

Implemented locally October 23, 2026. No persistent migration, fixture rerun, seed, reset, deployment, remote Git operation, browser automation or screenshot verification was performed.

## Fixture diagnosis and correction

The original immediate-teardown path was reproduced in a newly created `vendure_test_appearance_*` database. After the fixture printed all products and occurrences, closing the application caused `QueryFailedError: Connection terminated` at `PostgresQueryRunner.startTransaction` and `SqlJobQueueStrategy.add`, matching the reported failure.

Vendure 3.7.3 `CollectionService.onModuleInit()` subscribes to product/variant events with a 50 ms debounce and an asynchronous, unawaited queue submission. Native search subscribers also submit queue writes without awaiting them. The command closed Nest and its PostgreSQL connection immediately after fixture creation. The failure was a background queue submission racing application teardown, after domain records persisted.

`scripts/market-operations-demo/fixture-jobs.ts` disables automatic collection filtering for this one-shot command, explicitly awaits one native collection-filter job, and tracks/drains native strategy additions before the application closes. Queue failures propagate. No forced exit or arbitrary shutdown sleep was added. Queue consumers remain disabled according to the existing demo workflow; durable submission, rather than background processing, is the completion boundary. The wrapper prints its completion message only after that boundary.

The fixture now also reuses its existing dates, recognizes a dedicated product left without a variant, restores missing fixture category relationships without replacing unrelated facets, and restores missing canonical-source/offerings through existing services. Restock operation keys remain unchanged, preventing repeated stock additions. Existing stock, products, storefront appearance and saved occurrence identities survive reruns.

## Persistent database inspection

`scripts/inspect-shop-fixtures.ts` uses a PostgreSQL `BEGIN READ ONLY` transaction without bootstrapping Vendure. The actual database was `vendure_demo_market_ops`, server address `::1`.

| Persisted record      | Observed result                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| Occurrences           | 7, October 30, 2026; 8, November 6, 2026; both scheduled                                              |
| Products and variants | 109, 110, 111; all enabled; SKUs `SHOP-PAGE-0`, `SHOP-PAGE-1`, `SHOP-PAGE-2`                          |
| Categories            | Produce 43, Bakery 44, Pantry 45, assigned respectively                                               |
| Physical stock        | 20 on hand, 0 allocated for each; canonical source 23                                                 |
| Ownership             | Products and source belong to vendor 26                                                               |
| Participation         | 78 and 79, confirmed for the two occurrences                                                          |
| Offerings             | Greens 352 and 353 for both dates; loaf 354 for the first date; all enabled, preorder enabled, cap 20 |
| Listings              | 96 and 97, approved; greens and loaf assigned to vendor/default/market channels                       |
| Honey                 | Vendor/default channels, no market listing or offering, as intended                                   |

Stored preorder windows were open at inspection and close before their respective market start times. The disposable test additionally verified the authoritative availability matrix: greens on both dates, loaf on the first, honey on neither. No missing fixture domain records were found. No recovery mutation is currently necessary.

The read-only migration audit found exactly one pending migration: `VendorCategoryImages1794000000000`. It was not applied.

## Existing architecture and selected approach

The vendor catalog already had owned product/variant creation and editing, tenant-authorized catalog commands, native Vendure facets/collections and native public asset storage/preview generation. The Shop already projects public Category-named facet values from eligible channel products. Existing product forms exposed no category selector, and there was no vendor category manager or reusable public-image picker. Storefront appearance uses image URLs; compliance uploads use private document controls, which are inappropriate for public category images.

Category facet values remain authoritative. New values belong to a vendor-specific native facet named `Category`. The new `vendor_category_metadata` table stores only facet-value ownership, a normalized duplicate-name key and an optional native asset reference. It stores no product memberships. Native `product.facetValues` remains the only membership relation, supporting multiple categories per product. Collections remain unchanged; converting to collections would require replacing existing assignments and the public filtering contract without a corresponding benefit here.

Existing exclusively vendor-owned public Category facets, including the Shop fixtures, are recognized without data migration. Market-channel publication of those facets is allowed. A facet shared by multiple vendor channels, or a value attached to foreign products/variants, is excluded from vendor mutation rather than silently changing other vendors' data. Such legacy assignments remain recognized by public Shop filtering and are preserved by product saves.

## Dashboard and product forms

`/vendor/categories` appears beside Products in the existing shared dashboard navigation. The table shows an image or neutral fallback, name and product count. The name opens an editor; Create Category opens the same composition. Editors support empty categories, names, optional uploaded/selected images, clearing images, searchable product membership and confirmed deletion.

Product creation and editing reuse `ProductCategories`, with searchable multiple selection and a compact Create New Category dialog. Creating a category refreshes choices and selects the returned ID while retaining other draft values. The dialog is portalled outside the product form and stops submit bubbling, so category creation cannot submit the product. Category relationships are sent only through the existing product create/save mutation. A failed initial category read leaves existing assignments untouched. Business/product keys prevent draft selections crossing contexts.

The new feature compositions reuse `Dialog`, `CommandForm`, `DataTable`, `SearchSelect`, `SearchableMultiSelect`, `Field`, `Input`, `Button`, `ReadState` and `ErrorState`. No existing category editor or public image picker could be reused as a whole. No UI library, primitive, stylesheet or competing design contract was introduced.

## Shop integration and authorization

No Shop layout or filtering rewrite was necessary. New categories appear through the same public facet projection when they contain eligible products. Empty categories do not appear. Market availability remains a separate projection, so unavailable-at-market products remain visible in their categories. Category assignment also propagates native facet/value channels to the product's existing publication channels, preserving the existing publication consistency checks.

All category reads, mutations and uploads require backend `ManageOwnCatalog` and the existing freshly resolved vendor membership/channel policy. Client IDs never select the vendor. Product ownership and vendor channel membership are checked on every assignment. Category commands serialize on the vendor, with product locks and transactional membership writes. Foreign category/product/asset attempts fail; a failed membership save rolls back preceding name/product changes. Non-category facet values are retained. Deletion uses native facet-value deletion and preserves products/variants.

Names are trimmed, required and limited to 100 characters; same-vendor duplicates are rejected case-insensitively. Image selection requires a PNG/JPEG native asset in the vendor's channel. Uploads reuse the bounded stream reader, signature/extension validation and fail-closed ClamAV scanner from document compliance, followed by native AssetService storage, MIME/size checks and preview creation. Authorization is checked again after scanning. Public asset URLs use the configured native storage URL adapter. Removing a category image only clears its reference.

## Verification

Passed:

- Backend `npm run test:storefront:shop-fixture`: injected interruption before offering creation, recovery from partial records, repeated execution with identical stock/product/occurrence/storefront records, missing-category recovery, two-date authoritative availability, durable collection-job presence and immediate teardown without the connection failure. Uses only guarded disposable databases.
- The same focused backend test: category CRUD, empty categories, duplicate/length validation, multiple memberships, page/editor synchronization, atomic rollback, optional images, image removal, foreign category/product/image rejection, retained market publication and deletion preserving products/variants. Invalid images and scanner failure create no asset.
- Four category DOM tests: quick-create preserving unsaved form values, independent product save with selected IDs, product selection from category editing, confirmed deletion and optional upload ID handling. DOM tests are not browser automation.
- 66 existing focused vendor, vendor-tax and storefront-shop tests passed, alongside the category tests (70 tests across the four files with the added membership test).
- Web TypeScript, focused ESLint and Prettier; source-only GraphQL schema extraction/code generation; Astro storefront and Vite admin builds.
- Backend demo-tooling TypeScript and `npx vendure build server`.

The backend `npm run build` full dashboard build remains blocked by the existing `APP_ENV_EXPLICIT_MODE_REQUIRED` runtime configuration guard. It also rejects `APP_ENV=dev` under the dashboard build's production Node mode. No unrelated configuration policy was changed. Builds report existing large-chunk warnings, and backend tests report the existing pg concurrent-query deprecation. Failed disposable runs are retained by the existing guard, including the intentional original-shutdown reproduction; successful runs clean up only their own databases.

## Manual testing and preparation

Run from `E:\coding\farmers-market-platform-web`. These commands are instructions for explicit user execution, not actions already taken:

```powershell
# Read-only inspection, safe before any preparation:
npx tsx scripts/inspect-shop-fixtures.ts
npx tsx scripts/inspect-shop-fixtures.ts --migrations

# After approving the pending metadata migration, preserve the populated dataset:
npm run demo:market-operations:migrate
```

Start each process in its own terminal using the existing guarded environment:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

The serve script also starts the existing document scanner needed for uploads. No additional fixture seeding is required for the inspected dataset. If a future read-only audit confirms a partial dedicated Shop fixture, the guarded, idempotent repair/setup command is `npm run demo:market-operations:storefront-shop-fixtures`; run it only intentionally, after reviewing the audit and pending migrations. It adds/restores dedicated fixture relationships and does not reset or reseed established accounts.

1. Sign in at `http://localhost:4322` as `homepage.vendor@example.test`. Existing dedicated-account password: `local-identity-regression-only-password` (the backend `demoPassword` constant).
2. Open `http://localhost:4322/vendor/categories`. Confirm Produce, Bakery and Pantry counts/images, then create an empty category without an image.
3. Edit that category, select greens and honey, save and reopen. Upload a PNG/JPEG, select an existing vendor image, replace it, then clear it. Check that an invalid image or unavailable scanner leaves the category unchanged.
4. Open `http://localhost:4322/vendor/products/109`. Assign several categories, save and verify the same memberships from Categories.
5. Open `http://localhost:4322/vendor/products/new`. Enter name, slug and description, then use + Create New Category. Confirm the new category is selected, all draft fields remain, and the product exists only after Create product. Cancel the dialog once and verify the draft remains.
6. Open `http://homepage-vendor.localhost:4321/products`, then `?occurrence=7` and `?occurrence=8`. Check new populated category filters, multiple membership, existing fixture filters, and the greens/loaf/honey availability matrix. Honey remains visible while unavailable. Empty categories stay out of public filters.
7. Confirm-delete a category and verify its products and variants still exist. Switch vendor businesses and confirm lists/selections reload; the backend automated tests cover foreign-ID rejection without modifying established accounts.

## Local files and limits

Web: new `apps/admin/src/vendor/categories.tsx`, `packages/api/src/vendor-categories.ts`, `scripts/inspect-shop-fixtures.ts`, `tests/vendor-categories.test.tsx` and this report. Integration edits are in vendor catalog/service/routes, NavigationIcon, admin-core navigation, the API barrel/product input, schema extractor and generated Admin schema/types/provenance.

Backend: new `vendor-categories.ts`, migration `1794000000000-VendorCategoryImages.ts` and `fixture-jobs.ts`; integration edits in marketplace-commerce plugin/catalog/API, the guarded demo runner, Shop fixture and focused fixture test. Pre-existing unrelated working-tree changes were preserved.

The image picker lists the newest 100 authorized PNG/JPEG assets. Category membership saves accept up to 1,000 products and product forms up to 100 categories. Ambiguous cross-vendor legacy facets require a separately reviewed compatibility migration before vendor editing; they are never silently adopted. Uploaded public assets remain in the vendor library if the category dialog is cancelled, and category deletion does not delete shared assets. Live successful ClamAV upload and visual acceptance remain manual checks. The persistent schema migration remains deliberately unapplied.
