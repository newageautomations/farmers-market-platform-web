# Local vendor catalog

Populated on November 1, 2026 in the persistent local PostgreSQL database `vendure_demo_market_ops`.

All 22 existing vendors now have 18 enabled products each: 396 products and 397 variants. The import added 302 products and updated the existing 94 in place. Existing product and variant IDs were preserved, including the two package-size variants of Willow's spinach.

The catalogs include retail names, descriptions, package sizes, USD prices, SKUs, ingredients or apparel materials, allergen information, storage or care instructions, pickup information, and vendor-owned inventory sources. New variants received stock through the existing inventory service. Existing tax policies, prices for genuine products, and allocated inventory were preserved. Placeholder products were given realistic names and descriptions.

Products have both marketplace category facets and vendor-editable categories. The existing supported legacy category groups remain in use where appropriate. No category UI or business authorization rules were changed.

Pexels photographs were downloaded, visually reviewed, scanned through the existing upload service, and stored in the normal local asset store. The catalog uses 66 distinct stock photographs, reused for related products. No images were generated. Source pages are recorded in `scripts/data/vendor-catalog-photos.cjs` and the local verification report. Stock photographs illustrate product types; they are not photographs of these fictional vendors' actual inventory.

The read-only verification checks each product's category relationships, positive USD price, variant and asset channel membership, vendor-owned canonical stock source, stock balances, structured information, local image files, and absence of placeholder copy. The native search index was refreshed for all 397 variants.

All 18 currently active vendor storefronts returned 18 products each through the local Shop API, and every returned product image loaded successfully. Texas Wild Seafood Demo, Hill Country Honey Demo, Canyon Bakery Demo, and Cedar Creek Produce did not already have active public storefronts. Their catalogs are populated and verified in the database; storefront provisioning was outside this change.

Market records, occurrences, market memberships, listings, participation, offerings, orders, order lines, payments, refunds, market invoices, and market payments were compared before and after the import and remained unchanged. No migration, database reset, deployment, or remote write was performed.

Files added:

- `scripts/data/vendor-catalog.cjs`: curated product definitions and vendor mappings.
- `scripts/data/vendor-catalog-photos.cjs`: reviewed Pexels source manifest.
- `scripts/download-vendor-catalog-photos.cjs`: bounded JPEG downloader and image validation.
- `scripts/seed-vendor-catalog.cjs`: guarded, repeatable catalog import using existing vendor, category, asset, inventory, and ownership services.
- `scripts/verify-vendor-catalog.cjs`: read-only database and optional HTTP qualification.

Local backups, downloaded originals, import reports, and verification results are saved under `.runtime/vendor-catalog/`. Those files are ignored by Git. The existing asset server stores its uploaded originals and previews in its normal local runtime directory.

From the web project folder, inspect or verify with:

```powershell
node scripts/seed-vendor-catalog.cjs --plan
node scripts/verify-vendor-catalog.cjs
node scripts/verify-vendor-catalog.cjs --http
```

The HTTP check expects the existing local demo API on port 3000. To start the manual testing environment, use the project's existing `demo:market-operations:serve`, `demo:market-operations:worker`, `demo:market-operations:admin`, and `demo:market-operations:storefront` npm scripts.

For an explicitly requested catalog refresh, the reusable import commands are:

```powershell
node scripts/download-vendor-catalog-photos.cjs
node scripts/seed-vendor-catalog.cjs --apply --refresh-index
```

The import defaults to a read-only plan. `--apply` changes the persistent test catalog, and `--vendor=19` restricts a refresh to a particular existing vendor ID. Existing orders and market schedules are never created, removed, or rewritten by this importer.
