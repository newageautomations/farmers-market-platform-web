# Storefront product details

Implemented locally on October 23, 2026. Existing local work was preserved. No deployment, remote Git operation, persistent migration or persistent fixture mutation was performed. No browser automation, screenshots or visual comparisons were performed.

## Page, gallery and shared components

The real Astro `/products/[slug]` template has a large gallery beside the purchasing column, stacking on phones. It retains SiteLayout, the shared Harvest header/footer, theme fonts, palette, button behavior and corner tokens. Category labels use Shop's native category-facet recognition. Product name, tax-inclusive price, concise description, variants, quantity and pickup context remain real catalog data. The main price updates with the selected variant. Multiple-option products require explicit selection rather than automatically choosing an available option.

ProductGallery is a feature composition because no selectable product gallery existed. It reuses native images and approved Button presentation with thumbnail-specific geometry. Its small controller supports native keyboard activation and pressed states. Featured, ordered product and variant-featured assets are deduplicated by ID. Selecting a variant changes its main photograph without dropping other photographs. Retained variant selection determines the initial SSR photograph. No-photo products retain the existing placeholder. Optional fullscreen/lightbox viewing is deferred.

The full product description appears once beneath the price, without an accordion or truncation. Remaining accordions reuse the approved native disclosure presentation: Ingredients, Allergens, Storage & Care, Pickup Information, then ordered custom entries. Blank/disabled entries are omitted. The legacy `descriptionEnabled` metadata key is retained for compatibility, but no longer controls an accordion or appears in the vendor information settings. Astro escapes plain text, and CSS preserves multiline formatting. Metadata never enters `set:html`. Existing legally enforced disclosures and compliance workflows were not changed. No UI library, competing primitive, HTML editor or alternate styling system was introduced.

Product interaction correction: Harvest product cards now establish their own positioned, isolated containing block in every placement. Previously this rule required a vendor homepage ancestor, allowing related-card link overlays to extend across the product gallery and purchase controls. Thumbnail buttons only update the main image; the main image has no link or click action. Gallery load errors preserve the main image element so selecting another thumbnail can recover, while retaining the existing placeholder presentation. The reported product page was checked through actual local HTTP markup and DOM/controller tests, without browser automation or screenshots; both referenced photos returned successful JPEG responses.

## Existing data and new information

Reused Vendure 3.7.3 fields: product translations/name/slug/description/enabled, native variants/options, `priceWithTax`/currency, native product and variant assets, category facets, canonical inventory and occurrence offerings. There is no second full-description, price, stock, category or image store.

New private Product custom field: nullable internal, read-only text `productInformation`, containing bounded JSON:

```text
descriptionEnabled: boolean
pickupEnabled: boolean
ingredients, allergens, storage, pickup: { enabled: boolean, content: string }
custom: [{ title: string, enabled: boolean, content: string }]
```

Defaults show description/pickup and leave optional content empty. `pickup` contains only product-specific instructions. Dates, hours, venue and occurrence/participation instructions come from the selected occurrence. Limits: 8,000 characters per content value, 100 per custom title, 12 custom entries, and 120,000 UTF-8 bytes for the entire supplied JSON. Backend validation rejects unknown keys, malformed shapes, control characters, oversized values and incomplete custom entries. All content remains plain text, including text resembling markup.

Owned catalog reads expose full metadata, including hidden entries. Shop `Product.productInformation` removes hidden custom entries and hidden standard content. Disabled products receive empty defaults. Omitted metadata in older update clients preserves saved information. Commands retain existing tenant permissions, ownership checks, locks and transactions. Invalid metadata or foreign assets roll back the command.

Additive backend migration `src/migrations/1794100000000-ProductInformation.ts` adds nullable `product."customFieldsProductinformation"`, preserving existing rows and refusing destructive rollback. It has **not** been applied to `vendure_demo_market_ops`.

## Product editor and purchasing

The existing create/edit form now supports standard information plus custom add/edit/hide/reorder/confirmed-delete controls. These actions preserve other unsaved fields. Hiding retains content, and custom entries stay beneath standard sections.

Inspection found no image controls in the product form. ProductImages extends the existing category asset picker instead of creating another upload mechanism. Vendors can select/upload/remove up to 20 native photographs. After an image edit, the first selected image becomes featured. Untouched image controls omit asset changes, preserving original featured selection and ordering. Removing an image retains the library asset. Existing vendor-channel authorization, PNG/JPEG validation, size bounds, scanning and native AssetService storage/preview generation remain authoritative. Existing variant-featured relationships are displayed; there is no separate new per-variant image-assignment editor.

The page reuses `vendorPreorder` and ShopMarketSelection. The Shop page's existing preorder banner was extracted into `VendorPreorderBanner.astro` so both pages share the same markup, states, styling and market picker. On product details it spans the full content width above the gallery and purchasing columns, replacing the pickup selector beside the product. This is an extraction of an existing feature composition, with no new primitive or competing appearance. Changing market retains the product URL and variant query parameter. The active cart takes priority; protected switching refuses incompatible nonempty carts. Availability now includes the existing capacity service's quantity, without another inventory calculation. The occurrence DTO also projects authoritative occurrence/participation pickup instructions.

ProductPurchase validates whole quantities against capacity, refreshes every 30 seconds while visible and on window focus, and rechecks the selected variant before add. Read failures fail closed and duplicate submissions are locked. The existing occurrence-bound add, session transport, cart event, native Order mutation and server eligibility enforcement remain authoritative. `product-availability` is a bounded same-origin read on the existing Shop bridge. Preview disables purchase and refresh calls.

## Related products and visual editor

Related products reuse ProductCards and Shop availability/purchase behavior. Selection uses only the authorized public vendor catalog, excludes the current product, prefers matching category facets and fills up to four places from other eligible products. Empty results omit the section. Discovery retains the existing 10,000-product bound; failures omit recommendations without erasing the product.

The strict appearance contract adds optional `vendor.relatedEnabled` and `vendor.text.relatedHeading`, defaulting to visible and “You might also like”. Heading changes use the existing text bridge; visibility uses actual-Astro structural rendering. Product Details exposes Product details, Product information and Related products selection targets. Individual records remain managed in Products. Draft/publish versions, capability authorization, exact-origin messaging, host isolation, CSP and mutation blocking are retained. No React imitation of the page was created.

## Local files and verification

Web additions: `components/ProductGallery.astro`, `lib/product-gallery.ts`, `styles/product-details.css`, vendor `ProductInformationFields.tsx` and `ProductImages.tsx`, `packages/api/src/product-information.ts`, `tests/product-details.test.tsx` and this report. Integration edits cover the product route/purchase form/Shop API, category image picker, catalog form/fixtures, visual editor/preview bridge, theme contract, storefront-core related selection, API operations/schema/generated types, schema extractor and focused tests. Their configured JSON evidence output was refreshed.

Backend additions: product-information validator/public resolver and additive migration. Integration edits cover identity custom fields, owned catalog commands/reads, asset-authorization reuse, plugin/schema registration, quantity/pickup projections, appearance validation, optional Shop fixtures/demo dispatch and disposable test configuration/qualification.

Verification results:

- 98 frontend tests passed across product details, vendor catalog/tax/categories, Shop, appearance, editor and preview security/bridge suites. They cover keyboard gallery changes, explicit variants, price/images, quantity bounds, correct add payload, duplicate prevention, late capacity rejection, unsaved fields, custom ordering/deletion/visibility, untouched assets and related settings.
- Backend `npm run test:storefront:shop-fixture` passed using a guarded disposable database: migration, defaults, create/update, public GraphQL hidden-content projection, limits, rollback, tenant/asset isolation, asset assignment, two-date availability and optional fixture idempotence. Successful databases were cleaned by the existing guard.
- Backend `npm run test:storefront:appearance` passed with the related heading and visibility included in real persistence, draft/publish, preview authorization and vendor/market isolation checks.
- Web TypeScript/Astro, focused ESLint, formatting, package/source boundaries, Astro/admin builds, backend server build and demo-tooling TypeScript passed. Existing large-chunk and pg concurrent-query warnings remain.
- Full backend `npm run build` hits the previously documented dashboard configuration-loader failure `APP_ENV_EXPLICIT_MODE_REQUIRED`. No unrelated runtime policy was changed.
- Existing backend `npm run test:storefront:shop` passed occurrence, stock/foreign-variant, real add, protected switching, native checkout/seller, raw direct-add and concurrent-switch assertions. Its final virtual-clock check advances beyond the occurrence start, removing it from discovery and throwing Forbidden instead of returning rows. That existing test and production behavior were not changed. The failed disposable database was retained by its existing guard.

## Manual preparation and review

The read-only audit verified `vendure_demo_market_ops` on loopback. Dedicated products: 109 greens, 110 loaf, 111 honey. Occurrences: 7 on October 30 and 8 on November 6, 2026. At audit, greens had offerings on both dates, loaf only on the first, honey on neither; all had 20 physical units. The only pending migration was `ProductInformation1794100000000`. Future audits remain authoritative.

Run intentionally from `E:\coding\farmers-market-platform-web`. Persistent preparation commands below were **not** executed during implementation:

```powershell
npx tsx scripts/inspect-shop-fixtures.ts
npx tsx scripts/inspect-shop-fixtures.ts --migrations

# Apply the reviewed additive migration without resetting or reseeding:
npm run demo:market-operations:migrate

# Optional dedicated sample information and second variant:
npm run demo:market-operations:storefront-shop-fixtures -- --product-details
```

Optional setup fills missing metadata only on the dedicated greens product and adds a named Large sample using native option-group/option/variant services. The extra variant is intentionally not offered at these markets. Repeated setup preserves metadata edits and avoids extra variants/stock. Authored option structures are preserved and require manual variant preparation instead of replacement. Photographs and appearance are not overwritten. No new account or fake product photography is seeded.

Start each process in its own terminal, or normally restart existing processes after migration:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. Sign in at `http://localhost:4322` as `homepage.vendor@example.test`, using the existing local `demoPassword` reference in backend `scripts/market-operations-demo/environment.ts`. Leave established accounts such as Manna Roots unchanged.
2. Open `/vendor/products/109`. Select/upload two PNG/JPEG photographs and save. Upload uses the existing scanner started by serve. Check order/featured selection. Enter optional text and a multiline Nutrition Facts entry, save and reopen. Hide/re-enable entries, reorder them and cancel/confirm deletion.
3. Open `/vendor/products/new`. Enter name, slug, description and categories, then add photographs and sections. Verify other unsaved inputs survive. Existing variant, price, inventory and publication workflows remain necessary to make a new product purchasable.
4. Visit `http://homepage-vendor.localhost:4321/products/shop-page-0?occurrence=7`. Review desktop/phone layout, main price, keyboard thumbnails, assigned variant images, description and accordion order. With optional fixtures, choose the original greens option; Large sample is unavailable. Try zero, fractional/excessive quantities, valid add and rapid repeat submission.
5. Change to occurrence 8 on the same product; confirm compatible variant retention. Repeat with a nonempty cart and expect incompatible switching to be refused. Check `/products/shop-page-1?occurrence=8` and `/products/shop-page-2?occurrence=7`: information stays visible while purchasing is disabled. Review venue, hours and pickup instructions.
6. Review related cards and market state. At `http://localhost:4322/vendor/storefront`, choose Product detail and the greens example, then Related products. Edit heading/visibility and confirm actual-page unsaved preview updates. Save draft and verify live content stays unchanged until Publish. Hide/re-enable and verify heading preservation.
7. Review palette, typography, button shape/hover, phone wrapping, touch controls, focus visibility and reduced motion. Successful live upload, visual acceptance and full manual media review remain manual checks.

No reviews, ratings, wishlists, recommendation engine, manual related curation, new checkout or unrelated page redesign were added.
