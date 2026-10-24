# Storefront Find Us and Willow & Grain demonstration

Implemented locally on October 23, 2026. The user explicitly authorized the scoped population of `vendure_demo_market_ops` in the attached brief. No migration, reset, reseed, remote operation, deployment, demo order, or payment was performed.

## Page and architecture

`/find-us` renders through the actual Astro `SiteLayout`, Harvest header/footer and normal storefront content boundaries. The About-only `68rem` width remains confined to `.story-page`. Find Us has a compact editable introduction, the earliest confirmed upcoming appearance, remaining appearances in chronological month groups with native accessible disclosures, and the permanent compact closing invitation. Optional images do not leave empty placeholders. Images and actions stack on mobile. Empty attendance and failed reads have distinct truthful states, with the introduction and invitation retained.

The new `vendorMarketAppearances` Shop projection derives the vendor from the active channel/storefront. It requires approved membership, confirmed participation, scheduled future occurrences, and active markets/storefronts. It reads at most 24 appearances in the next 90 days and does not generate occurrences or mutate commerce. Separate dates remain separate. Featured selection uses the first result; the list excludes it. Market names, dates, time zones, venue, pickup instructions and published market photography come from the owning records, never appearance configuration.

Preorder availability uses the existing occurrence catalog and capacity services, including publication, window, pricing/topology, inventory and caps. Up to 100 candidate offerings per appearance are examined. Attendance remains visible outside preorder windows. The direct appearance action checks current eligibility on the protected Shop route, then uses the existing `select-occurrence` workflow, authoritative cart protections and HTTP-only preference. Successful selection navigates to `/products?occurrence=ID`; conflicts retain the cart and show its existing refusal message with a cart link. Product add and checkout retain their existing authority.

Directions use the existing Google Maps search-link convention with the actual saved venue string. Bare venue names and old test-location placeholders omit directions. There is no geocoder, map embed, invented coordinate, manual attendance calendar or purchasing context.

## Editor and component reuse

The actual-Astro visual editor now offers Find Us even while disabled. Separate disclosures edit page enable/title, introduction heading/body, authorized photo and alternative text, existing image shape/size and alignment, and independent invitation heading/text/label/supported destination. Market appearances have explanation-only settings. Preview selection opens the corresponding settings. The existing unsaved state, Undo/Redo, Save draft and Publish operations remain authoritative.

Find Us is added to the existing preview path allowlist. Structural Find Us edits trigger the same debounced authorized Astro render. Origin/window checks, capability checks, CSP, private draft isolation and commerce blocking remain in place. Backend save, publish and preview validate the introduction image's actual channel ownership, MIME type and storage URL. Disabled Find Us content is removed from the public projection.

`FindUsEditor` is a feature composition of existing Field, Input, Textarea, Checkbox, SelectField, image shape controls, native disclosures and CategoryImageField library picker. It cannot reuse the repeatable About editor wholesale because Find Us has a fixed introduction and invitation and automatic attendance. `AppearancePreorder` composes the existing Button and Shop action boundary for a single known occurrence. `ClosingInvitation.astro` extracts the existing About presentation and is used on both pages; its CSS and theme tokens remain shared. Schedule disclosure layout is feature-specific. No new UI primitive, design system, library, pending component approval, broad hydration or business controller replacement was introduced.

## Persisted demonstration data

Database target and actual PostgreSQL server were checked as local loopback `vendure_demo_market_ops` before modification. Fixture vendor provisioning key, active storefront, channel, hostname and existing owner membership were checked. Existing content was inspected and saved locally to ignored `.runtime/willow-before.json` before changes.

- Vendor: **Willow & Grain Farmstead**, vendor ID `26`, channel `29`, storefront `24`.
- Login: `homepage.vendor@example.test`. Existing credential reference: backend `scripts/market-operations-demo/environment.ts`, `demoPassword`. Credentials and ownership were retained.
- Storefront: [Homepage](http://homepage-vendor.localhost:4321/), [Find Us](http://homepage-vendor.localhost:4321/find-us), [Our Story](http://homepage-vendor.localhost:4321/about), [Shop](http://homepage-vendor.localhost:4321/products).
- Dedicated manager: `homepage.market@example.test`. New per-market roles and memberships use its existing account; the original single-channel fixture role is preserved.
- Published appearance version: `38`. The final repeat run retained this version.

| Market ID | Market                      | Channel / storefront | Verified demonstration venue                              | Photo asset |
| --------- | --------------------------- | -------------------- | --------------------------------------------------------- | ----------- |
| 4         | Oak Bend Saturday Market    | 31 / 26              | Boerne City Park, 106 City Park Road, Boerne, TX 78006    | 5           |
| 5         | Riverstone Community Market | 32 / 27              | River Road Park, 415 River Road, Boerne, TX 78006         | 6           |
| 6         | Cedar Grove Farmers Market  | 33 / 28              | Boerne City Lake Park, 1 City Lake Road, Boerne, TX 78006 | 16          |

These are fictional markets. Actual public venues are used only to test directions. Saved pickup instructions explicitly distinguish the demonstration from real events and affiliations. Locations were verified against the City of Boerne's [City Park page](https://www.ci.boerne.tx.us/167/Boerne-City-Park), [River Road Park page](https://www.ci.boerne.tx.us/181/River-Road-Park), and [parks master plan](https://www.ci.boerne.tx.us/DocumentCenter/View/18105/Boerne_Parks_MP-revision-2-18-2022-002).

All six new occurrences run **9 a.m. to 1 p.m. America/Chicago**. Temporal scheduling correctly changes from CDT to CST on November 1. Five occurrences permit preorders from 60 days before at midnight until market day at 8 a.m.; November 15 attendance is confirmed with preorder disabled.

| Occurrence ID | Date       | Market                      | Preorder    |
| ------------- | ---------- | --------------------------- | ----------- |
| 13            | 2026-10-24 | Cedar Grove Farmers Market  | Available   |
| 9             | 2026-10-31 | Oak Bend Saturday Market    | Available   |
| 11            | 2026-11-01 | Riverstone Community Market | Available   |
| 14            | 2026-11-07 | Cedar Grove Farmers Market  | Available   |
| 10            | 2026-11-14 | Oak Bend Saturday Market    | Available   |
| 12            | 2026-11-15 | Riverstone Community Market | Unavailable |

At execution, the featured next appearance is **Cedar Grove on October 24, occurrence 13**. After that date passes it advances automatically. Existing Willow Green Market Design Fixture occurrences `6`, `7`, `8` on October 29, October 30 and November 6 remain visible in their correct positions. Their attendance, original Shop offerings and regression behavior were preserved; their test venue intentionally has no directions link.

## Catalog, inventory and offerings

Existing categories were reused: Produce `43`, Bakery `44`, Pantry `45`. Each new product has its own enabled Vendure product/variant, vendor-channel publication, featured photo, ingredients, storage and realistic allergy information. Product slugs are `willow-grain-0` through `willow-grain-7`.

| Product / variant ID | SKU            | Product                    | Category | Price  | Initial physical units | Photo asset |
| -------------------- | -------------- | -------------------------- | -------- | ------ | ---------------------- | ----------- |
| 112 / 113            | WILLOW-GRAIN-0 | Swiss Chard Bundle         | Produce  | $5.00  | 30                     | 8           |
| 113 / 114            | WILLOW-GRAIN-1 | Fresh Heirloom Carrots     | Produce  | $6.00  | 30                     | 9           |
| 114 / 115            | WILLOW-GRAIN-2 | Seasonal Salad Mix, 6 oz   | Produce  | $7.00  | 30                     | 7           |
| 115 / 116            | WILLOW-GRAIN-3 | Country Sourdough Boule    | Bakery   | $11.00 | 30                     | 10          |
| 116 / 117            | WILLOW-GRAIN-4 | Rosemary Focaccia          | Bakery   | $12.00 | 30                     | 11          |
| 117 / 118            | WILLOW-GRAIN-5 | Wildflower Honey, 12 oz    | Pantry   | $14.00 | 30                     | 12          |
| 118 / 119            | WILLOW-GRAIN-6 | Strawberry Preserves, 8 oz | Pantry   | $9.00  | 30                     | 13          |
| 119 / 120            | WILLOW-GRAIN-7 | Fresh Culinary Herb Bundle | Produce  | $6.00  | 30                     | 14          |

The canonical inventory source is the existing owned fixture source. There are **34 actual occurrence offerings**, each with a 15-unit market cap, shared against physical inventory. Chard, carrots, salad, sourdough and honey are offered at every new market. Focaccia is offered only at Oak Bend; preserves only at Riverstone. The herb bundle is public with stock but has no preorder offering. November 15 offerings retain attendance with `preorderEnabled=false`. Categories, related products and purchasing continue using existing architecture. Existing `SHOP-PAGE-*` merchandise is intentionally retained, including its unavailable states.

## Our Story and homepage preservation

The published About page now has five curated stable sections: introduction with a farm photograph; three-paragraph origin story; baking/growing text with the opposite image orientation; a market photograph; and market-morning text. A sixth section retains the meaningful existing `legacy-story` content, “We love grains.” The old lorem placeholder section and paint image references were replaced; their assets were not deleted. The original complete draft/published record remains in the local snapshot.

The About invitation reads “From our farmstead to your table.” Find Us has its independent “Shop ahead. Pick up fresh.” invitation, both leading to `/products`. Existing customized homepage title, introduction, story and short About copy were preserved. Its non-Pexels hotlinked photographs were replaced with imported Pexels assets, and the homepage featured selection now uses the new chard, sourdough and honey products. Other saved theme settings remain intact.

## Photography provenance

Twelve individually reviewed photographs were downloaded from Pexels, scanned through the existing ClamAV workflow, validated and imported through `VendorCategoryService.upload` into the vendor channel. Market photos were additionally assigned to their dedicated market channels. Normal rendering uses Vendure storage and previews, not Pexels hotlinks. No generated images were used. Market/farm photos are illustrative stock imagery, never evidence of the fictional vendor, venue, staff or event.

| Asset | Use                                  | Photographer     | Pexels photo page                                                                                            |
| ----- | ------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| 5     | Oak Bend; Our Story market image     | @coldbeer        | [Photo 17590744](https://www.pexels.com/photo/vegetables-on-stall-at-market-17590744/)                       |
| 6     | Riverstone; Find Us introduction     | Natalia S        | [Photo 28930884](https://www.pexels.com/photo/vibrant-farmers-market-with-fresh-produce-display-28930884/)   |
| 7     | Salad mix; homepage About photograph | Matheus Bertelli | [Photo 30893230](https://www.pexels.com/photo/fresh-green-leafy-vegetables-close-up-photo-30893230/)         |
| 8     | Swiss chard                          | Eva Bronzini     | [Photo 5738772](https://www.pexels.com/photo/green-leaves-with-red-stem-5738772/)                            |
| 9     | Carrots                              | Natalia S        | [Photo 25682814](https://www.pexels.com/photo/close-up-of-a-bunch-of-carrots-25682814/)                      |
| 10    | Sourdough; Our Story baking section  | Marta Dzedyshko  | [Photo 7693924](https://www.pexels.com/photo/loaves-of-sourdough-bread-on-table-7693924/)                    |
| 11    | Focaccia                             | Natalia Olivera  | [Photo 30666809](https://www.pexels.com/photo/close-up-of-freshly-baked-focaccia-bread-with-herbs-30666809/) |
| 12    | Honey                                | Nothing Ahead    | [Photo 4480158](https://www.pexels.com/photo/jar-of-honey-4480158/)                                          |
| 13    | Preserves                            | K Zoltan         | [Photo 12369983](https://www.pexels.com/photo/a-glass-jar-with-strawberry-jam-on-the-table-12369983/)        |
| 14    | Herb bundle                          | Yana Nadolinska  | [Photo 12178852](https://www.pexels.com/photo/parsley-leaves-bundle-12178852/)                               |
| 15    | Homepage; Our Story introduction     | Mark Stebnicki   | [Photo 2253334](https://www.pexels.com/photo/rural-field-in-order-2253334/)                                  |
| 16    | Cedar Grove                          | Magda Ehlers     | [Photo 28797265](https://www.pexels.com/photo/fresh-organic-root-vegetables-and-greens-28797265/)            |

The [Pexels license](https://www.pexels.com/license/) and [current terms](https://www.pexels.com/terms-of-service/) were checked. This was a finite curated set of individual downloads, with no Pexels API or search scraping. Website use is permitted; attribution is optional for this method and is provided above. Do not imply endorsement, sell unaltered stock copies, redistribute a stock library, or use the imagery as a trademark. The specific leaf and carrot photos replace the generic starting-reference produce views to match the actual products. Swiss Chard Bundle and parsley herb copy reflect the chosen photography without asserting rainbow coloration or certifications.

## Reliability and verification

Setup: `npm run demo:market-operations:willow-fixtures`. It refuses any other database, missing demo schema, mismatched fixture vendor/channel/host and missing photographs/scanner. It never calls reset/seed or applies migrations. Stable SKUs, market provisioning keys, occurrence generation keys, imported filenames and stock operation UUIDs allow recovery. Existing source ownership is checked; existing prices, stock changes, authored text, participation and offering settings are not reset. Market membership approval, participation, listings, publication, inventory and appearance changes use the existing services. The explicitly authorized business rename uses only the guarded fixture vendor's name field and existing storefront identity service.

Background queue submissions are tracked and drained with `runFixtureJobs`; failures are surfaced before app shutdown. Two permission-context issues during initial setup were fixed and safe retries reused the already created catalog/assets. Final setup and subsequent reruns exited successfully, with no shutdown `Connection terminated` error.

Completed verification:

- 95 focused frontend tests across Find Us, About, appearance, visual editor, preview bridge, preorder, Shop, Product Details and Cart passed.
- HTTP-only actual Astro SSR qualification passed for Find Us featured/schedule/month groups/directions, empty/disabled states, independent unsaved preview and public isolation, plus the existing page and preview-security coverage.
- Guarded disposable backend Shop qualification passed, including confirmed/ordered appearances, closed preorder windows, canceled occurrences, planned attendance, suspended membership, inventory/caps and incompatible nonempty cart protection. Its successful isolated database was dropped.
- Guarded disposable backend appearance qualification passed for Find Us draft/publish, optimistic versions, unsupported destinations, asset authorization, tenant isolation and preview authorization. Its successful isolated database was dropped.
- Web TypeScript and Astro checks passed with zero errors/warnings/hints. Backend script/server typechecks passed. Focused ESLint, formatting and package boundaries passed. Shop/Admin schemas were extracted from source and generated clients updated.
- Local web storefront/admin and backend dashboard/server/worker builds passed through the existing synthetic production build helper. This is a build-only local check with no deployment or database bootstrap.
- Public backend read services verified every new appearance's preorder status and all eight new variants' public visibility, including the unavailable herb bundle. A separate read-only persistent audit verified IDs, stock, prices, photos, categories, offerings, story and publication.
- The final exact idempotency comparison checks unchanged products, physical stock, images, categories, dates, offerings, published version, story IDs and existing SHOP-PAGE fixture state.

Two unrelated old assertions in `tests/storefront.test.tsx` still assume direct purchases without the required market selection and fail against the pre-existing preorder contract. The current preorder/Shop/Product Details/Cart suites above pass. Existing build bundle-size advisories, PostgreSQL-client deprecation and demo CSRF configuration warning were observed; unrelated runtime/security configuration was not changed. No browser automation or screenshots were used.

## Manual testing

Start each needed process in its own terminal from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

No reset, seed or migration is needed. Restart existing processes to load the new API/schema if they were already running.

1. Open [Find Us](http://homepage-vendor.localhost:4321/find-us). Before October 24 at 9 a.m., expect Cedar Grove occurrence `13` first; later, expect the next remaining confirmed date. Confirm its photo, date/day, 9 a.m. to 1 p.m. hours, venue, attendance and directions. The map target must contain the saved City Lake Park address.
2. Review chronological remaining rows, including multiple dates for the same market and November grouping. Expand Oak Bend `9`/`10` and Riverstone `11`/`12`. Confirm directions use each saved address. Riverstone `12` has confirmed attendance and no preorder action. Original Willow Green test-location rows have no directions.
3. Click Cedar Grove's preorder action or another eligible new date. Expect `/products?occurrence=13` (or the chosen ID) after authoritative selection. New chard, carrots, salad, sourdough and honey should be available. At Oak Bend `9`, focaccia is available and preserves are unavailable. At Riverstone `11`, preserves are available and focaccia is unavailable. Herbs remain visible but unavailable.
4. Open [the new sourdough](http://homepage-vendor.localhost:4321/products/willow-grain-3?occurrence=13), review its photo, price, ingredients/allergens/storage and related products. Add one unit, inspect the cart and its selected date. Return to Find Us and attempt another occurrence. Expect the refusal explaining that existing items must be removed, without switching the cart. Remove the item before switching. Do not place an order or pay.
5. Visit [the homepage](http://homepage-vendor.localhost:4321/) and [Our Story](http://homepage-vendor.localhost:4321/about). Confirm the business name, photography, three featured products, curated sections, retained legacy text, image orientation, About-only editorial width and compact invitation. Browse Produce/Bakery/Pantry in Shop and check each of the eight new product routes.
6. Sign into [the vendor editor](http://localhost:4322/vendor/storefront) as `homepage.vendor@example.test`, using the existing credential reference above. Select **Find Us page**. Edit its heading, description, photo, shape, size, alignment and invitation. Preview changes before saving; click the actual intro/market/invitation in inspection mode to open its settings. Market rows remain automatic. Preview actions must never select a purchasing context or order.
7. Change the shared theme and inspect desktop/tablet/mobile. Confirm optional-image removal leaves balanced text. Toggle Find Us off: unsaved preview remains editable, and public navigation/page only changes after publishing.
8. Save draft, reload the editor and confirm saved values. The public page must remain unchanged until **Publish saved changes**. Publish deliberately on this dedicated account, then confirm the public page/navigation. Restore any manual test edits afterward. About invitation content must remain independent.
9. For safe fixture reruns, first retain downloaded files under `.runtime/willow-photos`. Run `npm run demo:market-operations:willow-fixtures`, then `npx tsx scripts/verify-willow-fixtures.ts`. Use `--compare` only against an immediately preceding audit snapshot when no manual changes have occurred. If photos are missing, `python scripts/download-willow-photos.py` reacquires only the reviewed manifest entries.

## Limits

Find Us is a bounded upcoming view, not a calendar/history browser. Preorder status checks the first 100 catalog-eligible offerings per appearance and may conservatively show unavailable if all those are exhausted while later candidates have stock. Existing fixture appearances and products remain intentionally visible for regression work. Dates advance by real time; reruns preserve dates rather than continuously creating new ones. Regenerating dates after all fixtures expire is deferred. Visual/browser acceptance remains manual as requested. New market hostnames/domains were not provisioned; the vendor page reads those markets directly from authoritative participation. The local photo cache, pre-change content snapshot, execution logs and persisted-data audit are ignored runtime artifacts, not committed credentials.

## Local files changed

Web: `apps/storefront/src/pages/find-us.astro`, `styles/find-us.css`, `components/AppearancePreorder.tsx`, `components/ClosingInvitation.astro`; existing About route, Harvest header/footer, Shop action route and preview client; `apps/admin/src/FindUsEditor.tsx` and visual editor; appearance/theme/API types, Shop operation/schema/generated client and schema provenance; guarded demo command, download manifest/helper, read-only verifier, focused tests and HTTP qualification; root package script; this report.

Backend: market public read/catalog services and Shop schema/resolver; appearance validation/public filtering and existing save/preview asset checks; `scripts/market-operations-demo/willow-fixture.ts`, guarded runner and package script; focused Shop and appearance tests. The original homepage fixture helper now reuses the dedicated vendor after a customer-facing rename, preserving its immutable identity and later fixture compatibility. Existing unrelated local work was preserved.

## October 24 schedule refinement

Upcoming appearances now use two columns per month on desktop, collapsing to one column on mobile. Cards reuse the approved native disclosure surface, hover/focus feedback and existing open/close size animation. An opt-in shared plus-icon variant rotates to a close icon when expanded; reduced-motion preferences disable transitions. The icon sits beside the card copy rather than after a distant status column. No preorder-available/unavailable captions are displayed; eligible purchasing actions indicate availability. The featured market hides the displayed timezone while all time formatting continues to use the saved market timezone. Details beneath its name are slightly indented.

Featured and expanded appearances include a secondary Visit Market Website button when their authoritative active market storefront has a valid configured hostname. Website destinations use the existing public storefront resolver and canonical origin rules, including the configured local port. Unconfigured market websites omit the action rather than generating a fictitious destination. The original homepage market has a configured local website; the three new demonstration markets currently have no hostname. This refinement changes no persistent database data.

Refinement verification: 20 focused Find Us/preview/preorder tests, the actual-Astro HTTP qualification, disposable backend Shop and website-resolution checks, web TypeScript/Astro, focused lint/formatting, and local web/backend builds passed. The HTTP reader now decodes UTF-8 across chunks correctly. The disposable Shop schema includes the existing public-hostname migration for website testing; no new migration was created or applied to the demo database. Restart the existing demo backend with `npm run demo:market-operations:serve` to load the new `marketWebsite` GraphQL field.

## October 24 typography and hover controls

Schedule cards now use a color-only hover/focus treatment, with no lift or shadow. Body copy uses the selected theme body font, market names use the theme heading font, and the plus/close icon stays at the right edge with the existing summary padding.

Every editable storefront heading and paragraph now has independent size controls in its section settings: homepage hero, featured heading, homepage About, final invitation, footer tagline, related heading, every text-capable Our Story block, and the About/Find Us closing invitations and Find Us introduction. Sections without an editable paragraph or heading expose only their relevant control. Protected navigation/button labels and automatic market/catalog text remain governed by their shared presentation.

`TextSizeControls.tsx` composes existing Field/Input with native accessible range inputs because no slider component existed. Heading sliders cover 75–200% and paragraph sliders 75–150%, in 5% increments, with visible current percentages and native keyboard control. Defaults remain 100% of the current responsive theme size. No font family, button size, or product-card price is changed by these settings. About duplication copies sizes independently; deletion removes orphaned story sizing entries.

Optional root `textSizes` maps stable section identities to bounded integer heading/paragraph percentages. Frontend and backend reject unknown keys, injected CSS, fractional or out-of-range values and more than 64 entries. Older documents preserve their existing defaults. Public SSR and live preview use the same validated CSS generator and each existing responsive font base. Preview updates the existing style node without a frame reload; draft/save/publish and tenant/asset boundaries remain unchanged. No schema migration or persistent demo mutation is needed. Restart the demo backend to load the extended appearance validation before saving sizes.

Local changes: Find Us CSS; shared theme/API appearance contracts and backend validation; shared admin TextSizeControls and existing homepage/About/Find Us editor compositions; SiteLayout and preview bridge; responsive font bases in homepage/story/product-detail styles; focused frontend/HTTP and disposable backend appearance qualification. No other page layout or commerce behavior was changed.

Typography qualification: 28 focused frontend tests passed for controls, bounds, section independence, duplicate behavior, draft/publish and live preview. Actual-Astro HTTP rendering and public/unsaved isolation passed. Disposable backend appearance validation/persistence/publication checks, web TypeScript/Astro, lint/formatting, package boundaries and local web/backend builds passed. No browser automation or screenshots were used.

The market card border and summary hover fill now share the opt-in `--ui-disclosure-radius` token, set from the storefront corner setting. This prevents stylesheet ordering from applying a different radius to the hover surface. Other disclosures retain their existing 8px default, and keyboard focus outlines remain unclipped.
