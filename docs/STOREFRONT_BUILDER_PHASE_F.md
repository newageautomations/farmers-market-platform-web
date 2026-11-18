# Storefront builder Phase F

Implemented locally on November 9, 2026. The developer authorized the directly required local backend edits in `E:\coding\farmers-market-platform`. Existing work in both repositories was preserved. No database records, permissions, catalog assignments, saved websites or publication state were changed. No migration, seed, deployment or remote Git operation is required or was performed.

## Implemented behavior

Harvest v1 now offers exactly five additional versioned sections: Image Banner, Image Gallery, Feature Grid, Product Showcase and Category Showcase. They use the existing full-screen editor, authenticated Astro preview, section hierarchy, inspector, drag/drop, keyboard and button movement, duplicate, visibility, confirmed deletion, history, Save draft and explicit publication workflow. The Add Section dialog has a Section category selector whose choices and membership come from registry metadata: Content, Media and Shop.

The native Harvest Featured Products section retains its existing renderer and behavior. The new Product Showcase is an independent optional editorial section. Modern Farmhouse and Editorial Market expose none of these five additions. Their homepage dispatchers received only a shared-union type guard to exclude Harvest-only records, and the Farmhouse renderer-map type was narrowed to its existing supported sections. Their visual designs and commerce behavior were not changed by Phase F.

The new inspectors compose existing Field, Input, Textarea, SelectField, Checkbox, Button and IconButton controls. Photographs use the existing CategoryImageField library picker, including its existing authorized upload behavior. There are no new UI primitives or dependencies. A feature-owned inspector and five theme-owned Astro compositions were necessary because existing sections do not provide these bounded image/item lists or the requested layouts. This does not approve or replace pending product-card or category-card design standards.

## Versioned schemas and layouts

Every new section stores the existing exact envelope: unique typed instance `id`, `type`, `version: 1`, `visible`, `content` and `presentation`. Missing or unknown properties, unknown types/versions, unregistered layouts, invalid IDs and duplicate list identities fail the canonical validator. Copy remains escaped plain text. New sections use curated presentation settings rather than arbitrary CSS or the older sections' numeric sizing controls.

All five have heading and optional description strings, limited to 160 and 1,200 characters. Their common presentation fields are alignment, paper/surface/ink background and compact/balanced/spacious spacing. Feature Grid permits left/center alignment; the others permit left/center/right for their copy or section heading.

| Type                | Additional content and bounds                                                                                                                                                                                                             | Curated presentation                                                                                                                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `image-banner`      | Introductory text up to 80 characters; one authorized `{ assetId, url, alt }` image; alt up to 200 characters, with empty alt for decorative images; optional CTA label up to 80 characters and an existing approved internal destination | Photo overlay with a readable inset copy surface; split editorial image/copy columns; minimal centered composition with arched photography. Full/contained width; top/middle/bottom copy placement; five image focal points; none/subtle/strong image overlays; small/medium/large minimum heights |
| `image-gallery`     | Up to eight ordered `{ id, image, caption }` entries; image alt and caption up to 200 characters each                                                                                                                                     | Balanced grid, asymmetric mosaic, staggered editorial strip or button-controlled carousel; landscape/square/portrait image ratios; caption visibility                                                                                                                                              |
| `feature-grid`      | Up to six ordered `{ id, title, description, icon }` entries; titles up to 120 and descriptions up to 400 characters; optional icon                                                                                                       | Two/three/four desktop columns; icon above/beside text; standard columns, highlighted shaped surfaces or bordered cards                                                                                                                                                                            |
| `product-showcase`  | Up to eight unique, ordered numeric product IDs; optional Shop link                                                                                                                                                                       | Product grid, first-product editorial emphasis or compact rows; two/three/four desktop columns where the layout uses equal columns                                                                                                                                                                 |
| `category-showcase` | Up to eight unique, ordered numeric category IDs; optional Shop link                                                                                                                                                                      | Arched category cards, larger photographic tiles or compact category navigation; landscape/square/portrait image ratios for photographic layouts                                                                                                                                                   |

The six allowed feature icons are the existing Farmstand `carrot`, `apple`, `heart`, `truck`, `map-pin` and `shield-check` glyphs. Arbitrary icon names, SVG markup and executable icon content are rejected. Category images reuse `categoryPresentation`, with HarvestArtwork as the existing decorative fallback. Section-specific category image overrides were intentionally omitted so there is no duplicate image configuration.

Gallery images and features have focused Add, Remove and Move up/down controls inside their inspector. Product and category selections have corresponding selection, removal and ordering controls. Products retain the existing owned-product picker read, with search for the endpoint's bounded results. Gallery and feature identities are local to their containing section, so duplicating a section preserves its content while assigning the copy a new section identity. No new nested-block framework was introduced; Phase D Image with Text blocks retain their original contract.

## Theme and page eligibility

| Section                             | Harvest pages                                                      |
| ----------------------------------- | ------------------------------------------------------------------ |
| Image Banner, Feature Grid          | Home, About, Contact, FAQ, Policies, Find Us and Shop (`products`) |
| Image Gallery                       | Home, About and Find Us                                            |
| Product Showcase, Category Showcase | Home and About                                                     |

Existing before/after regions remain authoritative for informational pages. Shop accepts only its existing before region above the entire native listing. Product Showcase and Category Showcase are rejected on Shop, and structural sections remain rejected on product details, cart, checkout, account, authentication, order and confirmation pages. This is enforced by backend theme/page validation as well as picker eligibility. Existing per-page section budgets, identity checks and the overall appearance size limit remain in force.

## Product, category and asset authorization

Product and category showcases display only records in the current vendor's catalog. The editor's existing global category hierarchy was unsuitable for showcase selection because it describes the platform taxonomy. A read-only `ownStorefrontShowcaseCategories` operation now returns only categories represented by the authorized vendor catalog, including represented ancestors. The current draft's category visibility and ancestor visibility also filter the new picker.

The existing public vendor taxonomy query was extracted without changing its SQL behavior into `vendorCatalogTaxonomy`. Both public taxonomy navigation and authorized backend showcase checks call that same helper. It requires the vendor owner and current channel, enabled/non-deleted products, enabled/non-deleted channel-assigned variants and channel/currency prices. Its existing 10,000-product ceiling is preserved. There is no separate category management system or independently maintained product projection.

Save, authenticated preview and publication all validate every configured product/category ID against this projection, including hidden sections. Foreign, disabled, deleted, unpublished or otherwise unavailable product references fail. Category references require a represented, active category whose complete path is visible in the draft's existing category presentation. Picker output is never trusted as authorization. If catalog data changes after publication, storefront rendering re-resolves the references and omits unavailable records safely.

Storefront Product Showcase first intersects selected IDs with the complete request-local vendor taxonomy, then uses `requestShop(Astro).catalog()` for the selected products. It restores saved order after the catalog response and renders the existing Harvest ProductCards component. Prices, images, product routes and existing availability/purchase controls remain owned by that component and its commerce APIs. `vendorPreorder` supplies its established pickup and availability behavior; authenticated preview skips cart/session bootstrap and cookie writes and suppresses purchase actions. No independent add-to-cart, price, stock, discount, variant or checkout logic was added.

Category Showcase uses `vendorCategoryNavigation`, preserving taxonomy identities, visible ancestor paths, category counts, existing presentation images and `/products?category=...` links. The taxonomy request is shared within a single SSR request. Neither showcase falls back to another vendor, an unscoped catalog or invented sample records.

Banner and gallery images, including hidden gallery content, enter the existing image-reference extraction and ownership checks. Channel-owned PNG/JPEG assets or the existing same-theme authorized library exception are accepted only with their exact resolved delivery URL. Arbitrary URLs, mismatched asset IDs/URLs, SVG assets and assets from other channels without the existing theme-library authorization are rejected. Icons do not introduce asset references.

## Rendering, persistence and compatibility

Five static Harvest Astro adapters are registered in the existing WebsiteSections dispatcher. They reuse Harvest colors, heading typography, spacing, rounded/arched image treatments, native Button, ProductCards and HarvestArtwork. CSS layout handles responsive columns, stacking, mosaic and editorial strip presentation. There is no gallery engine or section-level hydration. ProductCards can still hydrate its existing purchase island on a live storefront when its existing purchasing conditions permit it.

Draft preview and published storefronts use the same adapters. Preview provides actionable empty states for galleries and commerce selections; missing public records are omitted without exposing authorization or backend errors. Text/attribute output uses Astro's normal escaping and existing safe asset/internal navigation helpers. Photo-overlay copy retains a readable surface even when the image overlay is disabled.

Storage remains in `harvestComposition`, `pageSections` and the existing draft/published JSON snapshots. Optimistic versions, publication switching, history and protected commerce regions are unchanged. There are no new tables or migrations. The dependency-free backend section contract is byte-identical to the web contract, verified by the existing parity test. API transport types remain independent matching shapes.

Absent new sections, the old Harvest configuration still follows the exact native rendering path. Existing SSR tests compare legacy/explicit native composition, and Phase A-E block, section, route-region and draft/publication checks remain in the focused verification selection.

## Files changed for Phase F

This list describes Phase F work, not all pre-existing working-tree changes. Paths are relative to the named repository.

| Repository | Files                                                                                                                                                                         | Purpose                                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Web        | `packages/theme/src/website-section-contract.ts`, `website-sections.ts`, `storefront.ts`                                                                                      | Versioned registry, eligibility, schemas, defaults, image extraction and editor selection IDs                     |
| Web        | `packages/api/src/storefront-appearance.ts`                                                                                                                                   | Matching transport types and vendor-only category picker read                                                     |
| Web        | `apps/admin/src/HarvestSectionEditor.tsx`, `WebsiteTextSectionEditor.tsx`, `WebsiteSectionManagement.tsx`, `VisualStorefrontEditor.tsx`                                       | Existing inspector adapters, bounded lists, catalog choices, registry category filter and draft visibility wiring |
| Web        | `apps/storefront/src/components/home/ImageBanner.astro`, `ImageGallery.astro`, `FeatureGrid.astro`, `ProductShowcase.astro`, `CategoryShowcase.astro`, `section-renderers.ts` | Five Harvest SSR compositions and registrations                                                                   |
| Web        | `apps/storefront/src/components/WebsiteSections.astro`, `apps/storefront/src/lib/harvest-showcase.ts`, `apps/storefront/src/styles/harvest-sections.css`                      | Dispatcher typing, request-scoped catalog resolution and isolated Harvest library styles                          |
| Web        | `apps/storefront/src/components/modern-farmhouse/Home.astro`, `section-renderers.ts`, `apps/storefront/src/components/editorial-market/Home.astro`                            | Directly required type/dispatch exclusion of Harvest-only union members                                           |
| Web        | `tests/website-sections.test.tsx`, `tests/website-sizing.test.tsx`, `scripts/test-website-sections-ssr.ts`                                                                    | Expanded contract/editor/SSR coverage and retained legacy test eligibility assumptions                            |
| Web        | `docs/STOREFRONT_BUILDER_PHASE_F.md`                                                                                                                                          | This single implementation report                                                                                 |
| Backend    | `src/plugins/platform-identity/website-section-contract.ts`                                                                                                                   | Byte-identical canonical contract                                                                                 |
| Backend    | `src/plugins/farmers-market/api/storefront-appearance.ts`, `services/storefront-appearance.service.ts`                                                                        | Authenticated category choices and save/preview/publication reference checks                                      |
| Backend    | `src/plugins/marketplace-commerce/taxonomy/storefront.ts`, `market-public-shop.service.ts`                                                                                    | Reuse of the existing authorized public catalog projection                                                        |
| Backend    | `src/gql/graphql-env.d.ts`                                                                                                                                                    | Build-generated schema introspection including the additive query                                                 |
| Backend    | `test/farmers-market/website-sections.ts`                                                                                                                                     | In-memory authorization and lifecycle qualification                                                               |

## Targeted automated verification

From `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/website-sections.test.tsx tests/website-blocks.test.tsx tests/website-sizing.test.tsx tests/storefront-visual-editor.test.tsx tests/website-library.test.tsx --reporter=dot
npx tsx scripts/test-website-sections-ssr.ts
npm run typecheck --workspace @market/storefront
npm run build --workspace @market/admin
```

The five-file test selection passes 96 tests. Coverage includes strict schemas and limits, theme/page allowlists, gallery order, feature icon validation, vendor-only picker sources, product selection order, new-type add/duplicate/hide/move/delete management, existing history/preview behavior, persistence contracts and web/backend byte parity. Real Astro SSR passes for all five additions and their layouts, escaped copy, gallery order/captions, hidden sections, wrong-theme exclusion, actual native product rendering/prices, vendor-only product/category resolution, missing records, category images/visibility and non-transactional preview. It also retains the existing native-order and 18 theme/page route checks. Its transport responses are deterministic in-memory stubs; it does not contact a live catalog or database.

Astro typecheck passes with zero errors, warnings or hints across 226 files. The admin production build passes with the existing large-chunk advisory. Scoped ESLint passes for changed TypeScript/TSX source and test files. Formatting and scoped whitespace checks were also run.

From `E:\coding\farmers-market-platform`:

```powershell
npx ts-node --project test/farmers-market/tsconfig.json test/farmers-market/website-sections.ts
$env:APP_ENV='dev'
$env:NODE_ENV='development'
npm run build
```

The backend section suite and dashboard/server/worker build pass. The suite exercises real validators/service flow over in-memory repositories, including hidden media authorization, mismatched URLs, foreign/missing product and category references, save/preview/publication rejection, publication separation and unchanged old-theme behavior. It checks that the reused SQL receives vendor/channel parameters and retains enabled/price/channel restrictions. It does not qualify actual PostgreSQL execution or transaction isolation.

Two unrelated existing verification issues remain untouched: the root TypeScript check reports 20 diagnostics in LoyaltyDashboard, table-navigation and application/market/layout test fixtures; and the initially included `tests/storefront-appearance.test.tsx` has one failure at its existing `Color palette` label lookup. That extra file passed its other tests. The visual-editor tests also print an existing React `act` advisory for asynchronous category loading while passing. No full regression suite, browser automation, screenshot comparison, visual sweep or retained test artifact was created.

## Manual testing in the populated local environment

Use the existing `vendure_demo_market_ops` environment. From the web directory, start or reuse the matching processes in separate terminals:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Do not run migration, seed, reset or fixture commands for Phase F. Use the existing Manna Roots vendor account (`manna-roots@example.test`) and its current credentials, or another existing authorized vendor with products, assigned categories and image-library assets. These are the documented populated-test accounts; this implementation did not inspect or curate their current saved data. Choose another existing authorized vendor if a specific test needs data that account lacks. No deterministic test records were necessary for the automated checks.

### Create a separate test draft

1. On a desktop browser, open `http://localhost:4322/vendor/storefront` in the correct vendor/channel context. Record the current live website and keep its Visit Website destination open as a baseline.
2. Choose New Website, select Harvest and name the separate draft `Phase F Harvest draft`. Do not edit the established live website.
3. Open its existing full-screen editor. Confirm the original Hero, Featured Products, About and Closing sections and their existing settings still appear.

### Exercise the five additions

1. Open Add Section and test its category filter. Add each of the five new sections. Confirm selection opens the corresponding inspector.
2. Image Banner: choose an existing authorized image, set descriptive or decorative alt text, optional introductory text and CTA. Test all three compositions, full/contained width, heights, focal points, placement, alignment and overlay choices. Confirm disabled informational destinations do not produce storefront CTA links.
3. Image Gallery: select multiple library images, edit alt text/captions, add/remove/reorder them, toggle captions and try grid/mosaic/strip plus each aspect ratio. Verify the eight-image limit and saved order.
4. Feature Grid: edit titles/descriptions, try the offered icons and no icon, add/remove/reorder items and verify the six-item limit. Test columns, alignment, icon placement and all three treatments.
5. Product Showcase: search/select real products belonging to this vendor, change selection order and test grid/featured-product/compact-row. Compare names, product links and prices against the vendor's existing Shop/product details. Confirm native availability/pickup behavior and disabled preview purchase controls; there should be no editable price, inventory, discount or checkout fields.
6. Category Showcase: choose categories represented in this vendor's catalog, change order/remove choices and test cards/photographic tiles/compact navigation and image ratios. Confirm existing category images are reused and category links use the native Shop filter. Categories hidden in the draft or beneath hidden ancestors should not be offered.
7. For every type, duplicate, hide/show, reorder with drag/drop and Move up/down, confirm deletion and use Undo/Redo. Test the existing Desktop, Tablet and Mobile preview widths and customer rendering. Editing itself remains desktop-only.

### Check page boundaries and persistence

1. Visit each eligible page in the editor and compare Add Section choices with the eligibility table above. Add sections before/after informational native content as allowed.
2. On Shop, add Image Banner or Feature Grid above the listing. Verify Product/Category Showcase are absent and the native catalog, filters, sorting, pagination and pickup controls remain intact.
3. Confirm protected product/cart/checkout/account pages expose no structural section editing. Open older Harvest, Modern Farmhouse and Editorial Market drafts and confirm their prior sections and settings remain usable.
4. Save the Phase F draft and reload its exact editor URL. Confirm lists, order, layouts, visibility and selections persist. Test Undo/Redo around content and structural edits before saving again.
5. Refresh the baseline live storefront. Draft changes must not affect it. Missing/deleted/disabled catalog records should be omitted on rendering; saves/previews/publication with unavailable configured references should require removing or replacing those references.

Publication is optional and unnecessary for verification. Publishing this separate website would switch the vendor storefront's live website to this saved draft for that same storefront; it would replace the current public website selection. Keep the test draft unpublished to preserve the established live site.

## Limitations and deferred work

Visual acceptance on actual desktop/tablet/mobile storefront widths remains a manual task, as requested. Media/catalog sections need real authorized selections; they do not invent photographs, products or categories. Product search retains the existing endpoint's maximum 100 results per search. Large catalogs retain the existing taxonomy ceiling. Category photos are shared presentation assets, with no per-section overrides. New sections use the requested curated layouts rather than arbitrary sizing or custom CSS. No lightbox, video, mobile editing, other-theme implementation, new page type, commerce customization, theme switching or cross-website library was introduced.

## Follow-up editing improvements

Fixed missing feature icons by loading the existing Farmstand icon stylesheet in the Feature Grid adapter. Added a gallery `carousel` layout to the canonical and mirrored backend contracts and API types. It uses native horizontal scrolling, CSS scroll snap, keyboard-focusable content and shared Previous/Next buttons, with reduced-motion handling. Browse preview permits only these presentation controls through the existing commerce-action guard; Inspect mode continues selecting sections.

Gallery photographs, feature items, selected products and selected categories now appear as children of their expanded section in the left hierarchy. Choosing a child uses the existing inspector-selection context and displays that item's editing controls, with Section settings returning to the full list. Removal and undo safely invalidate stale item selections. This adds no block persistence or nested-block framework.

Selected Category Showcase entries expose the existing authorized image picker. Images update the vendor's shared `categoryPresentation` and therefore represent the category wherever that shared presentation is used, including Shop navigation. Existing positions, visibility and image authorization remain intact. There is no independent section image override. No database migration or data preparation is needed.

Follow-up files: the section contract and backend mirror, API transport types, HarvestSectionEditor, WebsiteSectionManagement, WebsiteTextSectionEditor, VisualStorefrontEditor, FeatureGrid/ImageGallery Astro adapters, Harvest section CSS, editor-preview-client, existing section/SSR tests and this report. Manual checks: expand each list section and select/edit a child; choose a category photo and save/reload; select Carousel, add several photographs and test Previous/Next in Browse preview plus native keyboard/touch scrolling. Confirm icons in both preview and public rendering.

Follow-up verification passed: 81 tests across the section/block/visual-editor selection, followed by 62 section tests after adding hierarchy-selection and authorized category-image picker coverage; real Astro SSR including Carousel; Astro check with zero diagnostics; scoped ESLint; admin production build; backend section authorization suite and backend build. The previously documented unrelated root TypeScript diagnostics remain. No browser automation or database changes were performed. Restart the existing demo backend, admin and storefront processes if they are not watching these local changes; use the same demo scripts listed above.

### Focused item inspector correction

HarvestSectionEditor now omits section heading/description, layout, columns, background, spacing, caption visibility, Shop CTA and add-item controls whenever a child item is selected. The inspector retains only that item's fields, replacement/media controls and item actions, plus Section settings to return to the section. Item removal and movement remain scoped to the selected item. Existing Image with Text block inspectors remain separate. Updated tests cover focused gallery, feature, product and category inspectors and restoration of section controls. Verification: 76 section/block tests passed, scoped ESLint passed and the admin build passed with the existing chunk-size advisory. Files changed for this correction: HarvestSectionEditor.tsx, tests/website-sections.test.tsx and this report. Refresh the local editor to test; no migration or additional command is needed.

### Icon sizing, product labels and carousel presentation

Feature Grid now exposes the existing range control for a section-wide icon size of 16–96 px (40 px when absent in older drafts). The optional integer is validated in both byte-identical contracts, mirrored in transport types, and applied to the existing icon mask and beside-text layout. Individual item inspectors still omit section controls.

The product picker now resolves saved product IDs separately from search results, using an optional bounded `ids` argument on the existing owned-product endpoint. Existing owner/channel/enabled/non-deleted restrictions remain in its query. This fixes selected records beyond the first search page appearing as Current selection; actual unavailable records are labeled as unavailable. Gallery descriptions and captions render only in individual image inspectors.

Gallery Carousel now uses shared icon-only buttons containing stroked chevrons at the left and right of the image track. Native scrollbars are hidden while touch/keyboard scrolling and scroll snapping remain. Banner frame/image sizing is isolated, decorative placeholder glyphs are suppressed in photo-overlay banners, and the native footer separator following a final authored section is spaced away and removed so they do not appear as an underline attached to the rounded banner.

Changed files for this refinement: HarvestSectionEditor.tsx; web/backend website-section-contract.ts; API storefront-appearance transport; backend storefront-appearance API/service and generated introspection; FeatureGrid.astro; ImageGallery.astro; harvest-sections.css; existing section tests; this report. Restart the demo backend if it is not watching changes so the additive product-picker argument is available, then reload the local editor. No migration is needed. Manual visual review remains required; no browser automation or screenshot artifacts were used.

Verification for this refinement: 89 focused section/block/visual-editor tests passed; SSR passed; Astro check reported zero errors/warnings/hints; scoped ESLint, admin build, backend section suite and backend build passed. Existing unrelated root TypeScript errors and React act/chunk-size advisories remain. Visual appearance has not been browser-verified.

### Anchored carousel and full-width image viewport

Gallery Carousel now has a Visible images setting with one, two, three or four desktop images (default three for old drafts). Tablet widths cap the count at two and mobile widths at one. The optional `visibleImages` field is strictly validated in web/backend contracts and mirrored in the API transport type.

Arrow navigation uses measured image-start anchors instead of scrolling an arbitrary viewport distance. Each press advances one anchor; rapid presses retain the requested target, native scrolling snaps to image starts, resize reanchors the current position and controls disable at the first/last complete view. The small feature-owned `gallery-carousel.ts` utility keeps those calculations testable without a new carousel dependency or hydration framework.

The image viewport fills the section/container width, with no reserved inner arrow padding. Chevrons are positioned in the outer gutters. Their transform is fixed across hover/focus/active, including themes configured to lift or scale buttons. Scrollbars remain hidden and native keyboard/touch scrolling remains supported.

Files changed: canonical and backend section contracts, API transport, HarvestSectionEditor.tsx, ImageGallery.astro, harvest-sections.css, gallery-carousel.ts, existing section tests and this report. Verification: 70 section tests passed (including anchor/end-stop and visible-count validation), real Astro SSR passed, Astro check passed with zero diagnostics across 227 files, scoped ESLint and admin build passed. Backend section suite also passed. Use the existing demo processes and reload the editor; no migration is needed. Manually check one-image advances, repeated arrow clicks, first/last disabled controls, each visible-count setting, outer gutters and theme hover settings at desktop/tablet/mobile widths.

The backend dashboard/server/worker build also passed for this carousel refinement. Visual browser verification remains manual.

### Product Showcase carousel

Product Showcase now offers Carousel alongside its existing grid, featured-product and compact-row layouts. Its Visible products setting supports one to four desktop cards, capped at two on tablet and one on mobile. It retains the current native product-card image format, with no square/portrait/landscape field; the strict schema rejects category/gallery aspect-ratio properties on product sections.

Both gallery and products now reuse CarouselControls.astro, the same gallery-carousel.ts controller and the same scoped carousel CSS. Product arrows advance one anchored card, disable at either end, sit outside the full-container-width viewport and do not lift/scale on hover. Scrollbars remain hidden and keyboard/touch scrolling remains available. The controller installs once even when both types are present. ProductCards remains authoritative for product images, prices, availability, product links and existing purchase controls; no new commerce behavior or data source was added.

Changed files: canonical/backend website-section-contract.ts, API transport type, HarvestSectionEditor.tsx, ImageGallery.astro, ProductShowcase.astro, new CarouselControls.astro, gallery-carousel.ts, harvest-sections.css, existing section/SSR tests and this report. The shared controls composition was extracted from the gallery to avoid duplicating carousel buttons or behavior. Verification: 71 section tests passed; real Astro SSR passed including the product carousel with owned catalog records/prices; Astro check passed with zero diagnostics across 228 files; scoped ESLint passed. To test, choose Product Showcase > Layout > Carousel, adjust Visible products, navigate rapidly in both directions and compare card formatting with the existing grid. Confirm gallery/product carousels work independently together. Reload the local editor; no migration is needed.

The admin build, backend section authorization suite and backend dashboard/server/worker build also passed for Product Showcase Carousel. Existing chunk-size advisories remain; visual browser review is manual.

### Selected product label ID normalization

The preceding lookup fix missed a transport mismatch: ownStorefrontProducts returns raw SQL rows through a JSON GraphQL field, so numeric IDs can arrive as numbers while saved section IDs are strings. Strict equality then treats an existing product as unavailable. The storefront appearance API now normalizes product IDs to strings on both search and selected-ID reads, preserving the existing authorization and avoiding saved-data rewrites. A regression test uses an actual API transport response with a numeric ID and verifies that the focused dropdown displays the product name and selects its saved string ID. Changed files: packages/api/src/storefront-appearance.ts, tests/website-sections.test.tsx and this report. Verification: all 72 section tests, scoped ESLint and the admin build passed (existing chunk-size advisory). Reload the local editor; no backend restart, migration or seed is needed for this correction.

### Informational page heroes and unified hierarchy

About, Contact, Find Us, FAQ and Policies now use the existing theme-owned Image with Text section as their editable default hero in Harvest v1, Modern Farmhouse v2 and Editorial Market v1. An unconfigured before region derives a stable, page-specific section identity and existing introductory copy; Find Us also carries its existing authorized image reference into the derived section. Hero fields, layout, media and child blocks use the same inspector and controls as any Image with Text section. Unsupported older theme versions retain their previous controllers.

The default is derived without mutating stored websites or marking a draft dirty. Editing or moving the hero persists it in existing pageSections arrays. Explicit saved region arrays remain authoritative, including an empty before array: deleting the hero therefore stays deleted through save/reload and publication. Previously customized explicit regions are preserved, rather than overwritten with a new starter. A default is not inserted into a page already using its entire editorial budget. Hero deletion does not restore the old introduction. Native page titles remain available to assistive technology and route metadata.

The left hierarchy now uses one shared section manager for each of these pages. Authored sections and a protected Page content group can be dragged/reordered relative to each other, with Move up/down alternatives. The manager splits that display list at the protected group into the original before/after storage arrays, so no second composition document or native controller is persisted. Existing story, contact, schedule, question and policy controllers are nested beneath the Page content group and retain their specialist validation and behavior. Empty legacy About placeholders are omitted in the new layout; populated legacy stories and their editing controls are retained.

There is one Add Section button using the existing registry-backed modal. The separate before/after add actions and the Native page content explanatory sentence are removed. The old About-only Add Section action is suppressed in this workspace so it cannot open a competing picker. Existing section/block duplicate, visibility, confirmed deletion, history, selection and explicit draft/publication flows are preserved. Reordering across regions follows the same selected section without clearing a selected child block during ordinary edits.

Native introduction markup and fields are suppressed when the shared hero applies, preventing two competing hero editors. Actual contact forms/information, market schedules, FAQ questions, policy contents/publication metadata, About story content and closing invitations retain their existing controllers. Shop continues exposing editorial content only above its protected listing; product detail, cart, checkout, account and transactional pages gain no structural controls.

Files changed for this request: new packages/theme/src/website-page-heroes.ts and its export in storefront.ts; VisualStorefrontEditor.tsx; WebsiteSectionManagement.tsx; AboutStoryEditor.tsx; ContactEditor.tsx; FaqEditor.tsx; PoliciesEditor.tsx; FindUsEditor.tsx; WebsitePageRegion.astro; the five informational Astro routes; modern-farmhouse/Content.astro and FindUs.astro; editorial-market/Content.astro; existing section and SSR tests; this report. The new helper shares derived defaults between the actual renderer and editor because neither previous region wrapper supplied default hero composition. There is no new UI primitive, persistence service, backend schema, migration, seed or database write.

Verification: the focused section/block/visual-editor selection passed 95 tests, including the updated single-picker workflow, default hero derivation and limits, protected-page exclusion, moving the About hero across native content, explicit deletion, save/reload and undo/redo. Existing informational Image with Text block editing/history tests pass in all three supported themes. Actual Astro SSR passed, with added default-hero and deletion checks across all fifteen supported theme/page combinations, plus the previous route/native-content coverage. Astro check passed with zero diagnostics; scoped ESLint, whitespace checks and the admin build passed. The existing root TypeScript diagnostics remain outside the changed files; the admin build retains its existing large-chunk advisory. No browser automation or retained test artifact was used.

Manual verification: reload the local editor and select About on a new/unconfigured draft; confirm its Image with Text hero, one Add Section button and nested Page content controls. Edit hero copy/image/blocks/layout; drag it or use Move down/up across page content; verify actual preview order. Delete the hero, save and reload, then verify it stays deleted. Repeat on Contact, Find Us, FAQ and Policies. Confirm there is no second native introduction or old introduction inspector, and native forms, schedules, questions and policies still work. Open Add Section and confirm it uses the shared picker. Test undo/redo and confirm draft edits do not update the live website. No migration or extra startup command is needed beyond the existing local demo processes.

### Page controls follow-up

Removed the Page content dropdown wrapper and exposed its existing specialist rows directly. Removed the metadata-only page dropdowns in the managed informational-page workspace, including editable page titles. Consolidated enablement into one switch above Theme settings, suppressing duplicated specialist toggles. Changed VisualStorefrontEditor, WebsiteSectionManagement, the five specialist page editors and focused tests. Scoped source lint and the admin build passed. Independent Closing invitation ordering is implemented in the follow-up below. Other native body content remains grouped in the existing native controller; this update does not claim that every native body section has been independently migrated.

### Independently movable closing invitations

Closing invitation now has its own movable hierarchy row on About, Contact, Find Us, FAQ and Policies, across the three supported theme versions. Its existing specialized fields remain the authority for its content; they appear in the selected invitation inspector rather than inside a Page content wrapper. The invitation supports drag/drop against authored sections or the native content group, keyboard handle movement and Move up/down, with undo/redo and save/reload retaining its location. The original native body and its permissions/validation remain unchanged.

An optional bounded integer `closingPosition` inside the existing per-page pageSections entry records where the native invitation belongs among the authored sections and native body. The shared contract and byte-identical backend mirror reject invalid types/ranges, unknown regions, Shop placement and protected-page placement. The position is not an independently editable product record or a new section/block type and does not consume an authored-section budget. Before/after arrays remain authoritative for authored content. Public appearance filtering adjusts the index when hidden sections before the invitation are removed, preserving its relative published position.

WebsitePageRegion renders the invitation exactly once at the selected position using WebsitePageClosing.astro, which reuses the existing Harvest/Editorial ClosingInvitation or Farmhouse Invitation adapter. The old in-body invocation is suppressed for managed informational pages. Existing destination-page enablement checks remain: disabled destinations omit public CTAs, and the preview hint is rendered at the same selected position. Existing drafts without the position field retain the previous invitation-after-native-body placement. Page enable switches also retain complete default configurations when enabling previously unconfigured pages, with fixed About metadata and no editable page-title control.

Files changed: web/backend website-section-contract.ts; API storefront-appearance.ts transport type; backend storefront-appearance-config.ts public index filtering and its existing section test; VisualStorefrontEditor.tsx; WebsiteSectionManagement.tsx; AboutStoryEditor.tsx; ContactEditor.tsx; FindUsEditor.tsx; FaqEditor.tsx; PoliciesEditor.tsx; new WebsitePageClosing.astro; WebsitePageRegion.astro; ClosingInvitation.astro; modern-farmhouse/Invitation.astro; Contact/FAQ/Policies routes and the Farmhouse/Editorial Content adapters for obsolete preview hints; existing section/SSR tests; this report. The new renderer composition is required to place the existing native invitation between authored sections without duplicating CTA content or rewriting the protected body controllers.

Verification: the three-file section/block/visual-editor selection passed 102 tests. Added all-five-page tests exercise invitation editing, crossing the native-content boundary, first-position movement limits, undo/redo, save and reload. Real Astro SSR tests check all four possible positions around before/native/after content across fifteen theme/page combinations and assert exactly one invitation. Backend tests verify invalid/protected placements and position adjustment after hidden-section filtering. Astro check, scoped ESLint, admin build and backend build pass. The existing unrelated root TypeScript diagnostics and chunk-size advisories remain. No browser automation, database change, seed or migration was performed.

Manual verification: reload the local editor, select each informational page, choose Closing invitation and edit its existing fields. Drag it before the hero, between the hero and native content, or below added sections; repeat with Move up/down and keyboard arrows. Save/reload, test undo/redo and compare the actual preview order. Check enabled and disabled destination pages. Restart the demo backend if its file watcher has not loaded the additive JSON validation changes, using the existing demo script; no migration is required.
