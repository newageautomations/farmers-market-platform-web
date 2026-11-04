# Product and variant editing

Add variant and Edit variant open `/vendor/products/:productId/variants/new` and `/vendor/products/:productId/variants/:variantId` inside the existing dashboard shell. Both reuse `ProductFields`, Farmstand panels and controls, the image library, tax fields, product information editor and CommandForm. The organization panel belongs only to the parent product. The small variant identity composition extends existing fields with a product-prefixed live slug label; an existing field did not supply that dependent preview. No UI primitive or styling system was introduced.

New product forms and add/edit variant pages start Product details and Additional information expanded. Existing main product pages start both sections collapsed. Product details retains its store icon. Native validation opens every containing disclosure before focusing an invalid input. Collapsed fields retain their values and participate in submission.

New variants copy the parent description, additional information, ordered photos and tax policy. Saved variants keep independent values. Existing variants inherit until first saved and receive a collision-safe initial slug based on their name and ID. Vendor ownership, photo ownership, category requirements and native option-combination validation remain backend responsibilities. For products without configured options, the catalog maintains a native option group so additional named variants can be added. Existing configured groups retain their selection flow.

Slugs are lowercase path segments unique within the parent product. The form displays `Slug /apple-juice/12oz`; public routes use the existing product URL prefix, for example `/products/apple-juice/12oz`. Those routes reuse the existing SSR product page and expose only the matching authorized variant's description, public information and photos. Tax settings and production costs remain private. Checkout reads the variant tax policy.

Creation with a production cost uses the existing transactional finance command. Editing retains the existing separate metadata, price and cost commands, reports completed portions after a later failure and blocks unsafe retries after uncertain outcomes.

## Local changes

- Web editor: `apps/admin/src/vendor/catalog.tsx`, `VendorRoutes.tsx`, `ProductInformationFields.tsx`, `product-editor.css`, `fixture.ts` and `packages/admin-core/src/index.ts`.
- Web contracts: `packages/api/src/vendor.ts`, `storefront.ts`, `errors.ts`, Admin/Shop operations, schema snapshots, provenance and generated types.
- Public routes: `apps/storefront/src/pages/products/[slug].astro`, its nested variant adapter, and `packages/storefront-core/src/variant-page.ts` with its index export.
- Backend: catalog commands, owned reads, public information resolver and plugin registration, variant content helpers, tax calculation, protected custom fields, the costed-variant input allowlist and generated `src/gql/graphql-env.d.ts` declarations.
- Migration: backend `src/migrations/1795600000000-VariantProductDetails.ts`. It adds a nullable private variant-content column and a unique per-product slug index. It does not rewrite existing products or variants.
- Qualification: `tests/variant-editor.test.tsx`, `scripts/check-variant-editor.mjs` and backend `test/product-taxonomy/variant-details.ts`.

## Verification and startup

Qualification passed: 21 focused UI tests, six backend integration groups, Chromium checks at three viewport widths, scoped ESLint, both frontend builds and the full backend dashboard/server/worker build.

From the web folder:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
npx vitest run tests/variant-editor.test.tsx tests/vendor-catalog.test.tsx
node scripts/check-variant-editor.mjs
npm run build --workspace @market/admin
npm run build --workspace @market/storefront
```

The Chromium check uses in-memory services on the existing local admin server, blocks API/external requests, checks 1600/768/390px layouts and removes its temporary entry. It writes no database records or screenshots.

From the backend folder:

```powershell
npx ts-node --project test/product-taxonomy/tsconfig.json test/product-taxonomy/variant-details.ts
$env:APP_ENV = 'dev'
$env:NODE_ENV = 'development'
npm run build
```

The backend test creates its own guarded `vendure_test_variant_details_*` database and applies migrations there. The persistent `vendure_demo_market_ops` database is untouched. The repository-wide web TypeScript check retains 11 unrelated test-fixture errors; the changed feature files have no TypeScript errors.

Before manually testing against the persistent demo, the new migration must be applied following a separate explicit migration request through `npm run demo:market-operations:migrate` in the web folder. Restart the environment using the existing `demo:market-operations:serve`, `:worker`, `:admin` and `:storefront` scripts. No deployment is required.
