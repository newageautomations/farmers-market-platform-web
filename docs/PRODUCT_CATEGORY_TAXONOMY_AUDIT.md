# Farmstand product category taxonomy audit

Audit date: November 1, 2026. Status: architecture recommendation only. The proposed requirements and taxonomy remain subject to product-owner approval.

## Findings

Farmstand currently has overlapping category models: vendor-managed category FacetValues, shared marketplace category FacetValues supplied by local catalog scripts, and a separate Collection-based category filter in the in-person catalog. There is no enforced global hierarchy, single primary leaf, or governed category-specific product tagging contract in the inspected paths.

The existing occurrence catalog is the correct integration point for market category aggregation. It already combines participating vendors through approved listings and enabled offerings while enforcing publication, ownership, channel, pricing and time constraints. A category hierarchy must narrow that authorized result, never supply a replacement product catalog.

Recommended direction: retain Vendure Facets and FacetValues for classification and add a narrowly scoped backend taxonomy extension for parent relationships, lifecycle, one primary product category and tag applicability. Keep storefront ordering, visibility and images in separately authorized presentation settings. Collections can remain merchandising groupings; they should not become occurrence eligibility authority.

## Scope and evidence limits

This report inspects the current local working copies of both repositories, including relevant modified and untracked source already present. Findings describe that source, not a deployed version or verified database contents. Only this report was created. No tests, builds, applications, migration commands, seed commands or database queries were run. No external services were accessed.

Inspection followed `marketplace-commerce` catalog services, their immediate ownership/publication/appearance dependencies, vendor product management, `apps/storefront`, relevant API adapters and theme contracts. Local catalog scripts were read only to distinguish existing shared and vendor category conventions. The in-person Collection dependency was inspected only far enough to identify compatibility risk. Unrelated dashboards and business workflows were not audited.

Source references below use absolute local paths with line anchors. Backend means `E:/coding/farmers-market-platform`; web means `E:/coding/farmers-market-platform-web`. Vendure primitive descriptions are supported by the installed 3.7.3 dependency, not assumptions about a newer release.

## Current implementation

### Product ownership and editing

The catalog uses native Vendure Product and ProductVariant records. Product ownership is the protected `Product.customFields.platformOwner` relation. Variant ownership follows its Product, rather than channel membership alone. These identity fields are internal, read-only and excluded from public custom fields. See [custom-fields.ts](E:/coding/farmers-market-platform/src/plugins/platform-identity/custom-fields.ts:5) and [OwnershipDirectory](E:/coding/farmers-market-platform/src/plugins/platform-identity/ownership-directory.ts:35).

`VendorCatalogService.createProduct` creates a native Product, assigns its owner through a trusted write and optionally assigns `categoryIds`. Updates recheck vendor authority, lock the Product and verify ownership. Categories are optional and plural; there is no required primary category. Variant creation deliberately avoids automatically publishing a newly created variant to every existing parent Product channel. Imported products can initially be disabled and uncategorized. See [vendor-catalog.service.ts](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/vendor-catalog.service.ts:40), its [update path](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/vendor-catalog.service.ts:76), [variant publication protection](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/vendor-catalog.service.ts:54) and [import path](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/vendor-catalog.service.ts:119).

Admin reads also require both protected Product ownership and the vendor channel. Category memberships are loaded separately from the category service rather than returned as a primary category in the owned Product DTO. See [owned-admin-reads.ts](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/owned-admin-reads.ts:51). `TenantAccessPolicy` checks current grants, active business membership, current channel and vendor status on each invocation. A new taxonomy API must preserve these checks, including distinctions between catalog reads and catalog management. See [tenant-access-policy.ts](E:/coding/farmers-market-platform/src/plugins/platform-identity/tenant-access-policy.ts:50).

### What represents a category

| Current representation | Identity and membership | Scope and limitations |
| --- | --- | --- |
| Vendor category | Native FacetValue ID; membership in `Product.facetValues` | Created under public facet code `vendor-category-{vendorId}`, translated name `Category`. Arbitrary vendor names; flat, multiple or no assignments. |
| Shared marketplace category | Native FacetValue ID under facet code `market-category` | Local scripts define shared codes and assign them across vendor channels. Flat and potentially multiple assignments. No centrally governed hierarchy or runtime primary-leaf contract. |
| Recognized legacy category | FacetValue whose facet translation matches `Category`, `Categories`, `Product Category` or `Product Categories` | Editable through the vendor service only when its exclusivity and member ownership checks pass. Recognition depends on display names. |
| In-person category | Native Collection ID; membership through ProductVariant collections | A separate catalog filter, not the vendor category service or market occurrence filter. |

The vendor category implementation is [vendor-categories.ts](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/vendor-categories.ts:82). It accepts vendor metadata or qualifying legacy values, rejects private/non-category facets and foreign Product/variant membership, and sorts returned values alphabetically. Creation and rename enforce a nonempty name of at most 100 characters and case-insensitive uniqueness within the vendor. Codes for new values are random category UUIDs. Assignment accepts up to 100 category IDs, verifies the owned Product and vendor channel, retains other facet values and publishes the selected Facet/FacetValue dependencies to the Product's current channels. See its [assignment](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/vendor-categories.ts:242), [save](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/vendor-categories.ts:297) and [delete](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/vendor-categories.ts:377) methods.

`vendor_category_metadata` supplements FacetValue identity with `vendor_id`, optional `image_asset_id` and a vendor-unique `name_key`. It stores neither category membership nor a parent relationship. Deleting a FacetValue cascades its metadata; the migration's rollback refuses to discard populated metadata. See [VendorCategoryImages migration](E:/coding/farmers-market-platform/src/migrations/1794000000000-VendorCategoryImages.ts:3).

Both vendor-specific and shared categories therefore exist in source. The local fixture setup creates public `market-category` with the display name `Category`; its codes include `produce`, `greens`, `drinks`, `bakery`, `breads`, `desserts`, `pantry`, `fermented`, `poultry`, `prepared`, `dairy`, `wellness`, `skincare` and `apparel`. The expanded catalog adds `seafood`. See [shared facet creation](E:/coding/farmers-market-platform-web/scripts/seed-testing-vendors.cjs:550), [existing code vocabulary](E:/coding/farmers-market-platform-web/scripts/data/testing-vendors.cjs:11) and [expanded vocabulary](E:/coding/farmers-market-platform-web/scripts/data/vendor-catalog.cjs:7).

The expanded catalog explicitly assigns one vendor group through `categoryIds`, then separately adds shared marketplace FacetValues. Some products get multiple shared classifications, such as greens plus produce or bakery plus breads. See [both assignment paths](E:/coding/farmers-market-platform-web/scripts/seed-vendor-catalog.cjs:325) and [classification rules](E:/coding/farmers-market-platform-web/scripts/data/vendor-catalog.cjs:2648). These scripts are evidence of intended record shapes, not proof that they have been run against any particular database.

### Facets, Collections and tags

Vendure 3.7.3 Facets and FacetValues are translated, channel-aware classification primitives. Facet has `isPrivate`, `code` and values; FacetValue has a facet, channels, Product and ProductVariant memberships, but no native parent property. See installed [Facet declaration](E:/coding/farmers-market-platform/node_modules/@vendure/core/dist/entity/facet/facet.entity.d.ts:20) and [FacetValue declaration](E:/coding/farmers-market-platform/node_modules/@vendure/core/dist/entity/facet-value/facet-value.entity.d.ts:17).

Collections provide a native tree, positions, images, filters, inherited filters, channels and ProductVariant memberships. However, those memberships are filter-driven and maintained through a collection filter job queue. They do not enforce exactly one primary Product leaf or category-specific tags. See installed [Collection declaration](E:/coding/farmers-market-platform/node_modules/@vendure/core/dist/entity/collection/collection.entity.d.ts:18) and [CollectionService queue](E:/coding/farmers-market-platform/node_modules/@vendure/core/dist/service/services/collection.service.js:101).

The market publisher explicitly does not copy vendor Collection hierarchies, describing Collections as market-managed merchandising. The scoped public storefront queries do not use Collections for category discovery. There is a separate in-person use: `categoryId` filters Products by variant Collection membership, and its category list returns Collections containing owned Products. This is an existing second convention, not evidence of a unified taxonomy. See [publication dependency boundary](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/catalog-publishing.service.ts:131), [in-person filter](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/in-person/service.ts:327) and [in-person category list](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/in-person/service.ts:434).

No governed product tag vocabulary, tag selector, tag applicability relation or category-aware tag validation was found in the inspected catalog inputs and forms. Generic FacetValues already provide a possible mechanism, and arbitrary public facets can enter the occurrence projection, but that is not the proposed tagging system. Product information contains ingredients, allergens, storage, pickup and custom text sections, not controlled tag IDs. Asset tags identify theme assets and placements and must remain separate from product tags. See [catalog input](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/api.ts:20), [product information contract](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/product-information.ts:15) and [theme asset tags](E:/coding/farmers-market-platform/src/plugins/farmers-market/services/storefront-appearance.service.ts:219).

### Market publication and aggregation

The underlying relationship is:

```text
Vendor -> Product -> ProductVariant
Market -> MarketVendorMembership -> MarketListing -> ProductVariant
Market -> MarketOccurrence -> OccurrenceParticipation -> OccurrenceOffering
OccurrenceOffering -> MarketListing + ProductVariant
```

Membership is market/vendor-specific; participation is occurrence/membership-specific. Listing is unique per membership/variant; offering is unique per participation/variant and carries enabled flags, effective preorder window, provenance and optional cap. None stores category identity. See [market entities](E:/coding/farmers-market-platform/src/plugins/farmers-market/entities/market.entities.ts:65).

`CatalogPublishingService` requires authorized vendor publication access, owned variant, approved membership/listing, active market and an existing offering. It assigns the same native Product and variant to the market channel, assigns dependent assets/facets/options and canonical stock source, and copies the owner's canonical price into that channel. It does not create another Product or transfer ownership. Unpublishing removes target native publication. See [publication commands](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/catalog-publishing.service.ts:73).

`OccurrenceCatalogService.catalog` is the actual cross-vendor aggregation. Before filtering/pagination, its eligible CTE requires:

- Shop context, matching market channel, active market and active storefront.
- Scheduled occurrence, confirmed participation, approved market membership and active vendor.
- Approved listing matching membership and offering variant; enabled, undeleted Product and variant owned by that vendor.
- Product and variant publication to the market channel.
- Compatible vendor/market currency and tax configuration, the required technical market seller topology, and market price equal to the current canonical vendor price.
- Enabled preorder offering inside its effective window, matching occurrence version and allowed window provenance/close policy.

It then gathers the union of Product and variant FacetValue IDs, including only public facets whose Facet and FacetValue are assigned to the market channel. Its current `facetValueIds` filter means **all selected exact IDs must be present**, using PostgreSQL array containment. It has no descendant expansion or category/tag distinction. Vendor and variant identity filters further narrow eligible rows. Rows, total and facet counts come from one SQL statement/snapshot, before pagination. Facet counts are offering/variant-level counts from the filtered set, capped at 100 values; vendor counts use eligible rows with facet filters, intentionally independent of the selected vendor/variant filters. See [occurrence-catalog.service.ts](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/occurrence-catalog.service.ts:59).

The returned eligibility marker is `DOMAIN_TIME_ONLY`: this query deliberately does not calculate stock, reservation or cap availability. The adjacent vendor availability path consults `CapacityService` after eligibility. Category results must not be advertised as stock guarantees. See [vendor availability](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/occurrence-catalog.service.ts:28) and [query scope](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/occurrence-catalog.service.ts:75).

### Public contracts and channel safeguards

Shop contracts expose `marketOccurrenceCatalog(occurrenceId, options)` with facet, vendor and variant IDs; returned items have Product/variant/vendor identities and facet IDs, while filter summaries have only FacetValue ID, name and count. They do not expose canonical category paths or tag applicability. The custom resolver is public but its service enforces Shop and channel boundaries. See [Shop schema and resolver](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/api.ts:49).

The Shop middleware requires an active provisioned storefront channel token, rejects the default channel and applies a default-deny market operation allowlist, including aliases/fragments through parsed field names. Native `products`, `search` or `collections` are not substitute market catalog roots. See [shop-context.middleware.ts](E:/coding/farmers-market-platform/src/plugins/platform-identity/shop-context.middleware.ts:32) and [market commerce roots](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/commerce/contracts.ts:8). Public occurrence lookups bind to the current market; assets are independently restricted to the current channel. See [market-public-shop.service.ts](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/market-public-shop.service.ts:72).

Frontend request helpers obtain channel tokens from the resolved storefront and enforce vendor versus market API selection. The market item adapter also looks up an item through the occurrence catalog with `variantIds`, preserving eligibility on detail routes. See [shop.ts](E:/coding/farmers-market-platform-web/apps/storefront/src/lib/shop.ts:15) and [market-storefront.ts](E:/coding/farmers-market-platform-web/packages/api/src/market-storefront.ts:77).

### Frontend category and filtering flow

| Surface | Current flow | Consequence |
| --- | --- | --- |
| Vendor product form | `ProductCategories` loads vendor categories, renders `SearchableMultiSelect`, and allows inline category creation. `productInput` submits plural `categoryIds` only after categories load. | Supports arbitrary categories and multiple assignments. The loaded sentinel avoids silently clearing assignments on read failure. |
| Vendor catalog workspace | Category sidebar/filter uses `VendorCategory.productIds`; management users can add categories and open category management. | Counts and membership depend on vendor categories rather than a global primary category. |
| Vendor storefront shop | Shop API `products` includes Product facets. SSR loads catalog pages, derives categories by facet display-name regex, filters by exact FacetValue ID, then slices the display page. | Shared and vendor facets named Category can both render, even with similar names. No hierarchy or primary distinction. |
| Market storefront | Homepage previews the first upcoming occurrence. The occurrence page parses repeated `facet` and `vendor` parameters and calls the authorized occurrence catalog with server pagination. | Displays every returned public facet as “Filter by public category,” without distinguishing category from tag or other facet. |

Sources: [vendor form input](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/catalog.tsx:29), [category selector](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/categories.tsx:466), [category editor](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/categories.tsx:369), [workspace](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/CatalogWorkspace.tsx:185), [Shop Product operation](E:/coding/farmers-market-platform-web/packages/api/operations/shop.graphql:161), [vendor category helpers](E:/coding/farmers-market-platform-web/packages/storefront-core/src/vendor-shop.ts:31), [vendor SSR listing](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/products/index.astro:47), [market homepage](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/index.astro:35), [market filter inputs](E:/coding/farmers-market-platform-web/packages/storefront-core/src/market.ts:20) and [occurrence page](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro:183).

Vendor catalog loading has a roughly 10,000-item guard. Modern Farmhouse shares that authorized load within a request; Editorial Market homepage requests at most 100 products and derives its category tiles from that subset. A future category summary should come from the authorized catalog scope rather than a sampled homepage list. See [farmhouse-catalog.ts](E:/coding/farmers-market-platform-web/apps/storefront/src/lib/farmhouse-catalog.ts:18), [homepage query](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/index.astro:89) and [Editorial homepage categories](E:/coding/farmers-market-platform-web/apps/storefront/src/components/editorial-market/Home.astro:21).

### Storefront category presentation and editors

The Editorial Market theme name does not imply a market-owned aggregate storefront: the inspected homepage routes this template through the vendor branch. Its category settings contain section visibility, heading, link label, display limit and an image map keyed by numeric FacetValue ID. They have no per-category order or visibility field. Categories are alphabetically derived by `shopCategories`; hiding the homepage section does not hide the shop's category filters. The image fallback uses regexes on category names. See [theme schema](E:/coding/farmers-market-platform-web/packages/theme/src/editorial-market.ts:81), [editor](E:/coding/farmers-market-platform-web/apps/admin/src/EditorialMarketEditor.tsx:225), [homepage branch](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/index.astro:129), [shop category strip](E:/coding/farmers-market-platform-web/apps/storefront/src/components/editorial-market/Shop.astro:125) and [category artwork](E:/coding/farmers-market-platform-web/apps/storefront/src/components/editorial-market/category-art.ts:24).

There are two existing image locations: vendor category metadata and website template category-image overrides. The Editorial editor reads its category list through the vendor category API and saves template overrides. Backend validation explicitly recognizes vendor metadata or exclusive legacy categories, so globally shared IDs cannot simply replace them without revising that validation. See [media API adapter](E:/coding/farmers-market-platform-web/packages/api/src/storefront-appearance.ts:438) and [editorial reference validation](E:/coding/farmers-market-platform/src/plugins/farmers-market/services/storefront-appearance.service.ts:153).

Existing ordered featured products and Modern Farmhouse section ordering are presentation controls, not category ordering. In the generic appearance editor, “Automatic collection” refers to featured Product IDs, not a Vendure Collection. Market presentation currently lacks the proposed category ordering/visibility contract. Preserve appearance draft/publish versions and vendor website-instance settings; do not store a website-specific order in the shared taxonomy or overwrite archived appearance data. See [featured controls](E:/coding/farmers-market-platform-web/apps/admin/src/StorefrontAppearance.tsx:709), [appearance versions](E:/coding/farmers-market-platform/src/plugins/farmers-market/services/storefront-appearance.service.ts:343) and [website-instance change path](E:/coding/farmers-market-platform/src/plugins/farmers-market/services/storefront-appearance.service.ts:539).

## Gaps against the proposal

| Proposed requirement | Current gap |
| --- | --- |
| One centrally controlled hierarchy | Vendor-created values and a script-defined shared vocabulary coexist; no parent or taxonomy lifecycle contract. |
| One primary leaf per Product | Optional many-to-many facets; variant facets also enter market filtering. No leaf or primary validation. |
| Vendors cannot create categories | Explicit create, rename and delete APIs and UI exist today. Removing only UI would leave mutations available. |
| Predefined category-appropriate tags | No governed tag definitions, applicability rules or catalog inputs. Public facet summaries conflate dimensions. |
| Standardized cross-vendor browsing | Market aggregation exists, but exact heterogeneous facet IDs do not establish shared meaning or ancestor browsing. |
| Preserve all eligibility boundaries | Strong existing authorized query path must be extended rather than bypassed by Collection/search reads. |
| Independent storefront category presentation | Some images and section visibility exist; per-category ordering/visibility and market controls are absent. |
| Compatible migration | Existing IDs occur in memberships, URLs, image maps and multiple category conventions. No approved mapping or transition policy. |

## Recommended architecture

### Canonical identity and hierarchy

Make the backend taxonomy service the sole authority, shared across all vendors and markets. Use one reserved canonical category Facet with one FacetValue per category node. Reuse native translations and channel assignments. Give every node a stable machine code independent of its display name; IDs and codes must not depend on vendor, market, locale or label matching.

Add a small category metadata entity keyed one-to-one to the canonical FacetValue, with a parent reference, active/retired state and deterministic platform default order. A self-referencing relation or protected relation custom field could carry the parent; the entity approach makes taxonomy-specific lifecycle and validation explicit. Validate same-taxonomy parents, no cycles, bounded depth and retirement rules. Derive leaf status from active children rather than allowing contradictory editable flags. Do not put parent relationships in frontend arrays or vendor metadata.

Add one protected nullable Product relation to the canonical category node during transition. This is the authoritative **primary category**, with exactly one active assignable leaf required for the agreed final publication policy. ProductVariants inherit it through their Product and cannot override it. Keep a native Product FacetValue assignment to that leaf as a compatibility/search projection, updated atomically by the same command. Unrelated facets remain untouched. Do not store every ancestor as another vendor-editable category assignment; expose a computed category path and resolve ancestor browsing from the canonical tree.

This intentionally adds a small extension: native Facets are flat and many-to-many; native Collections have a tree but neither primitive alone guarantees one primary Product leaf, controlled writes and category-aware tags. A Collection-backed hierarchy is technically possible with its own governed assignment/validation extension, but would add filter-job synchronization and collide with the existing merchandising/in-person meanings. It offers less reuse of today's storefront Facet contracts. Avoid parallel independent category names or product catalog records.

### Governed tags and authority

Use a distinct reserved product-tag Facet, with predefined FacetValues and narrowly scoped metadata relating tags to allowed category nodes. Define whether applicability inherits to descendant leaves. Keep tags product-level initially, matching the proposal; variant tags require a separate approved use case. Validate that selected tag IDs are active, predefined and applicable to the selected primary leaf, including when a product changes category. Define an explicit policy for incompatible existing tags rather than silently retaining invalid assignments.

Separate permissions for platform taxonomy administration, vendor Product classification, and storefront presentation. Vendor/market category creation, rename, reparent and deletion must be denied in backend commands, including the legacy JSON mutations. Audit native Facet/FacetValue mutation permissions and imports as part of implementation; shared channel assignment alone does not prevent global editing. Protect canonical Product fields from direct writes and ensure legacy assignment code cannot preserve or overwrite a conflicting canonical assignment. Use current business authority checks and existing transaction/locking conventions.

Central definitions may be shared; classification does not grant Product publication or tenant access. Reconcile canonical Facet/FacetValue and authorized image dependencies into vendor and market channels without publishing new Products/variants or changing price, membership, offering or stock authority. Retiring a category should preserve identity and references until an approved replacement mapping exists.

### Category filtering within authorized catalog queries

Extend `OccurrenceCatalogOptions` additively with typed category and tag inputs. Resolve a requested canonical parent to its permitted descendant leaves, then apply an `EXISTS`/join predicate on the eligible row's Product primary-category relation inside the existing query, before counts, sorting and pagination. Compute category path/buckets from those same eligible rows. Keep old exact `facetValueIds` behavior during transition; passing every descendant to its current AND filter would incorrectly require all descendants simultaneously.

Retain every existing domain, publication, channel, owner, price and time predicate. Tags must narrow that same set. Do not query Collections or native market `products`/`search` as candidate authority, even if category membership or market channel matches. Do not fetch arbitrary vendor catalogs and merge them in Astro. Keep detail lookups through the occurrence catalog and cart/capacity revalidation unchanged.

Return distinct category and tag summaries with stable identities and paths, rather than labeling every public facet as a category. Canonical Product classification must ignore conflicting legacy variant category facets; otherwise variants can disagree with the primary Product leaf. Explicitly approve OR/AND behavior for multiple categories and tags. A reasonable starting policy is OR across category branches and AND across selected tags, subject to approval.

Choose count units explicitly. Existing market counts represent eligible offerings/variants, so a Product with several variants can count more than once. If the new UI promises Product counts, use distinct Product IDs per bucket; parent counts must deduplicate across descendants rather than sum overlapping buckets. Preserve the single-statement snapshot and define whether summaries show selected-filter counts or available alternative choices. The existing vendor-summary behavior is a separate contract that should not change accidentally.

Vendor storefronts should receive explicit primary category/path and authorized category summaries through their Shop contract. Replace translated-name regex recognition and sampled-list category discovery. Continue using current vendor Shop context, SSR and request-scoped transport. If a new market taxonomy root is necessary, add only that narrowly bounded public root to the allowlist, with no Product or private tenant data leakage. Prefer enriching the existing occurrence response where practical.

### Storefront presentation and form changes

Store category presentation overrides by canonical node identity within the existing authorized storefront/website draft and published settings: ordered IDs, hidden IDs, image overrides and bounded display options. Use platform defaults when no override exists; append newly introduced available categories predictably. Reject duplicates and unknown IDs. Keep canonical parentage and names outside vendor/market presentation writes.

Define whether hiding means only navigation/tiles or also excludes products from that storefront's catalog. Navigation hiding is the narrower recommendation; any catalog exclusion must be implemented server-side within authorized queries and explicitly approved. A presentation setting cannot make an ineligible product visible. Preserve channel-scoped asset validation and approved platform theme asset exceptions.

Vendor forms need one leaf picker with parent context and a filtered predefined tag selector, replacing the current multi-category/create flow. Preserve load/error behavior so failed reads cannot clear classification. Show inherited parents as explanatory context, not editable assignments. Replace catalog category CRUD affordances and adapt the workspace filter/counts and category management route. Reuse existing shared Select/SearchSelect, SearchableMultiSelect, Field, Dialog, image selection and reorder controls where suitable; any new composed picker needs a documented reuse reason under the root UI guides. Do not hydrate entire Astro storefronts to share presentation.

Editors need canonical category options independent of vendor category-edit permission, per-category ordering/visibility, and canonical image keys. Update both frontend theme schemas and backend reference validation together. Preserve vendor website-instance draft/publish behavior and market-owned appearance authority; do not route market settings through the vendor category service. Adapt existing theme renderers and retain specialist interactions rather than introducing a new styling system.

## Migration considerations and risks

No populated records were inspected. A later separately authorized inventory must establish actual counts and relationships before approving a mapping or migration. The persistent manual-test database is `vendure_demo_market_ops`; this audit does not authorize any schema/data change there. Future development qualification should use the guarded disposable mechanisms. An explicitly requested manual-test migration must use the guarded `npm run demo:market-operations:migrate` command from the web repository, preserve existing data and verify its target first.

| Records/references to inventory later | Required mapping or preservation |
| --- | --- |
| Shared `market-category` values and Product memberships | Map old codes/IDs to canonical leaves. Multiple broad values do not identify a primary leaf automatically. |
| `vendor-category-*` values and vendor metadata | Preserve vendor context and images; map each Product, not just each category name. A vendor group can span several canonical leaves. |
| Legacy name-recognized category facets | Inventory Product and variant use, channels, translations and ownership before deciding whether to map, retain or retire. |
| ProductVariant facet memberships | Preserve non-category facets; resolve category conflicts through Product primary identity without rewriting ownership or publication. |
| Uncategorized, disabled and imported Products | Keep readable/editable during transition; agree on when classification becomes mandatory. |
| Collection tree/filter definitions and variant memberships | Preserve merchandising and in-person behavior. Collection IDs are not interchangeable with FacetValue IDs. Defer consumer migration unless separately authorized. |
| `vendor_category_metadata.image_asset_id` | Transfer appropriate images into scoped presentation overrides, retaining original records for recovery. |
| Editorial category-image maps in drafts/published websites and legacy appearance | Map old numeric keys to canonical identities independently for each website and publication state; resolve image collisions with owner review. |
| Existing `?category=` and occurrence `facet=` links | Provide aliases or explicit legacy-filter support. One old group mapping to several leaves needs a union or reviewed landing destination. |
| API documents/types, fixtures and local catalog scripts | Update approved contracts and future writers so old classification logic cannot reintroduce inconsistent data after cutover. |

Examples requiring review include `breads` (“Breads & Flour”), which can span Bread & Baked Goods and Pantry & Preserves; `desserts`, which can span baked goods and confections; and `wellness`, which is not a proposed top-level category. `greens` plus `produce` are overlapping classifications rather than a stored hierarchy. Existing vendor display names or free-text ingredients/allergens must not become automatic authoritative taxonomy/tag mappings.

Use an additive, resumable backfill with a durable mapping ledger and explicit ambiguity queue. Keep Product/variant IDs, prices, stock, assets, listings, offerings, memberships and channels intact. Distinguish deterministic mappings from owner-reviewed decisions. Reuse existing shared FacetValue IDs only where their meaning is an exact approved match; otherwise preserve aliases to new canonical nodes. Do not merge or delete values by label alone.

Transition readers should explicitly understand canonical versus legacy representations, avoiding duplicate sidebar entries. Run backfill and classification writes through the same validation/locking strategy; generic facet updates must not race the primary relation. Category changes on already-published Products require dependency-channel reconciliation even without republishing listings. Verify that existing image overrides are not lost when several vendor groups map to one canonical category.

Rollout and rollback must preserve old memberships and presentation archives until acceptance. Require future checks for channel leakage, inactive/retired nodes, shared-value permissions, parent cycles, duplicate Product counts, invalid tags, pagination/count consistency and unchanged publication/eligibility. These are suggested future qualification criteria; no checks or tests were executed for this audit.

## Suggested implementation phases

| Phase | Bounded proposed work | Exit decision |
| --- | --- | --- |
| Taxonomy decisions and inventory | Approve definitions, leaves, tag vocabulary, ownership and filter semantics; separately authorize a read-only record inventory and mapping proposal. | Owner signs off on scope and ambiguity rules. |
| Additive backend foundation | Add canonical metadata, protected Product relation, controlled APIs, permissions and validation. Preserve legacy reads and writes until a defined transition policy applies. | Review invariants and compatibility contracts. |
| Authorized query integration | Extend occurrence catalog and vendor Shop projections with typed classification/filter summaries; preserve all existing gates and count semantics unless explicitly changed. | Qualify against guarded disposable data in later implementation work. |
| Product forms and presentation | Replace vendor category creation with leaf/tag assignment; add scoped editor ordering/visibility/images using existing components and SSR adapters. | Review behavior, authority and template compatibility. |
| Mapping and staged cutover | Apply approved resumable mappings, resolve ambiguous Products and presentation collisions, support old URLs and monitor reconciliation. | Explicit approval before touching persistent manual-test data. |
| Enforce and retire | Enforce agreed single-leaf publication policy, disable legacy category mutation, update future seed/import writers, and retire obsolete readers only after compatibility acceptance. | Separate authorization for any cleanup or in-person consumer migration. |

These phases are recommendations, not implementation or migration authorization.

## Open product-owner decisions

- Approve or revise the proposed roots: Produce; Meat & Poultry; Seafood; Dairy & Eggs; Bread & Baked Goods; Pantry & Preserves; Sweets & Confections; Prepared Foods; Beverages; Flowers & Plants; Bath & Body; Home & Handmade; Clothing & Accessories; Pet Products; Farm & Garden Supplies. Approve leaf definitions, maximum depth and overlap rules before mapping products. Roots with no children need an explicit assignability policy.
- Decide who administers taxonomy changes, how changes are reviewed, and how retirement, replacement, translation and stable URL aliases work.
- Decide whether one primary leaf is mandatory for drafts, new publication, existing publication or all saved Products, and how imported/uncategorized Products behave during transition.
- Approve predefined tags, applicability inheritance, whether unsupported tags are rejected or removed on category change, and any evidence/review requirements for claims. Do not infer tags from free text automatically.
- Approve category/tag filter logic, Product versus variant count units, parent deduplication, availability-summary behavior and treatment of empty categories.
- Decide whether market browsing remains occurrence-specific. A cross-occurrence market category landing page needs explicit deduplication and occurrence-selection semantics; it must not imply universal availability.
- Define whether visibility affects navigation only or catalog inclusion, whether parent hiding affects children, default ordering and whether any storefront label overrides are permitted.
- Decide whether presentation belongs per vendor website instance, market storefront, or business-wide default with per-site overrides, and how conflicting legacy images/order preferences are resolved.
- Approve how legacy vendor groups are mapped or archived, who resolves ambiguous Products, how long old links/API inputs are supported, and whether in-person Collection categories remain a retained specialist.

The existing catalog foundation can support the proposal without replacing Vendure Products or market eligibility. The missing layer is governed classification and presentation contracts, plus an explicit compatibility migration. No implementation is approved or performed by this report.
