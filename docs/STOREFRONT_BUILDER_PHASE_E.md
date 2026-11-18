# Storefront builder Phase E

Implemented locally on November 8, 2026. The developer authorized the directly related backend edits in `E:\coding\farmers-market-platform`. Pre-existing Phase A-D work and unrelated working-tree changes were retained. No database records, accounts, existing websites, live publication, remote Git state or hosting configuration were changed. No migration, seed or fixture setup is required.

## Implemented behavior

Harvest now uses the existing section manager for homepage composition, including Text, Image with Text and Call-to-Action Banner. All three supported vendor theme versions expose the same sections on About, Contact, FAQ, Policies, Find Us and Shop. The existing full-screen toolbar, authenticated iframe, contextual inspector, section/block controls, history, preview widths, desktop-only editing gate and explicit draft/publication lifecycle remain in use.

The page selector controls the actual preview route and the permitted hierarchy. Switching pages preserves the whole unsaved draft. Each editorial region has an explicit Add Section action, including empty pages. Add, duplicate, hide/show, confirmed deletion, pointer/keyboard reordering and undo/redo reuse `WebsiteSectionManagement`. Image with Text retains its block hierarchy, inspector and legacy-content compatibility. Required Harvest native entries have move controls and their original settings, with no duplicate/delete controls or new visibility authority.

## Investigation and storage decisions

The architecture audit and Phase C/D reports were checked against the affected code. Existing content remains authoritative in these locations:

| Content                  | Existing storage and rendering                                                                                  | Phase E addition                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Harvest home             | Appearance `homepage`, `vendor`, text overrides and catalog selection; `VendorHome.astro`                       | Optional appearance `harvestComposition` owns order only                        |
| Modern Farmhouse v2 home | `template.settings.sections`; native objects and reusable sections                                              | Existing composition retained                                                   |
| Editorial Market v1 home | Named template settings plus optional `composition` native references                                           | Existing composition retained                                                   |
| About                    | Appearance `about`, legacy content or `about.sections`; specialized story editor and per-theme content adapters | Editorial regions around the existing native story composition                  |
| Contact                  | Appearance `contact`; shared route, contact helpers and ContactForm controller                                  | Editorial regions around existing page content                                  |
| FAQ and Policies         | Appearance `faq` / `policies`; specialized editors, content parsing and per-theme adapters                      | Editorial regions around existing page content                                  |
| Find Us                  | Appearance `findUs`; authorized market appearance reads and existing schedule renderers                         | Editorial regions around existing page content                                  |
| Shop                     | Existing per-theme route/renderers and authorized commerce services                                             | One editorial region after the theme hero and above the complete native catalog |

A single optional appearance `pageSections` object stores the new page regions for every supported theme. Keeping shared page content in appearance avoids duplicating the same page model across incompatible template-settings documents. The existing API continues separating the template envelope from appearance on save. Both remain in their original JSONB snapshots.

## Harvest composition

`harvestComposition` is an ordered array of the three registered reusable section objects and native references of exactly `{ id }`. Its required, unique native IDs are `hero`, `featured`, `about` and `closing`. References cannot carry copy, images, visibility, arbitrary properties or replacement components. Native content is read from its original settings and uses the existing markup, commerce reads and visibility conditions. The header/footer stay outside composition.

Absence of the field derives the original order at read time. Merely opening/selecting a native section does not adopt or save a composition. The first structural change writes the optional order. Automated SSR compares the complete Harvest output with absent composition against explicit original references and verifies equality. Existing saved websites are never rewritten.

## Page and region rules

| Page                                                                               | Allowed editorial placement                              | Native behavior                                                                                                                |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Homepage                                                                           | Theme homepage composition                               | Required native entries remain registered and unique; original visibility rules apply                                          |
| About                                                                              | Before and after its native page content                 | Existing story list still adds, duplicates, deletes, hides and reorders its legacy sections; closing invitation remains native |
| Contact                                                                            | Before and after native page content                     | Contact form and contact-information controller stay native                                                                    |
| FAQ                                                                                | Before and after native page content                     | Existing questions and FAQ content controller stay native                                                                      |
| Policies                                                                           | Before and after native page content                     | Existing policy content/controller stay native                                                                                 |
| Find Us                                                                            | Before and after native page content                     | Authoritative market schedule and location reads stay native                                                                   |
| Shop (`products`)                                                                  | After the theme hero, before native catalog content only | Listing, filters, sorting, pagination, pickup selection and existing query logic stay together below all editorial sections    |
| Product detail, cart, checkout, accounts, authentication, orders and confirmations | None                                                     | Structural configurations are rejected                                                                                         |

The canonical manifest explicitly lists allowed pages, theme versions, types, renderer identities and variants. `websitePageRules` defines regions, page budgets and native elements. Each page allows at most twelve additional sections across its regions, including hidden instances. Existing content/block limits and the overall 80,000-character appearance budget still apply. The old twelve-section legacy About limit remains independent because those retained native objects are a different existing content contract.

Each region has one authoritative ordered array. Reordering stays inside that region; the native core is never an editable section object. About uses the same three-region interpretation: shared sections before, its existing ordered legacy story list in the native region, and shared sections after. There is no second editable copy of a legacy story. This deliberately avoids converting existing story layouts, image masks, long text or per-section text sizes into the narrower shared contract. Interleaving shared sections inside the legacy story list is not introduced.

Optional-page enablement is unchanged. Authorized editor previews can inspect a disabled page under the existing preview rules; its public route remains unavailable. Adding sections never changes an enablement flag. Shop has no after region, and its native composition is never moved into user configuration. Farmhouse and Editorial use a named editorial slot after the hero so their header, hero and overlay relationships stay intact. The slot precedes catalog search, category/filter controls and products; it does not change listing logic.

## Rendering and editor reuse

New Harvest adapters use its own brand typography/palette, shared native Astro Button adapter, rounded/arched photography, spacing and responsive conventions. They support existing Standard, Featured and Framed presentation, image proportions, alignment, backgrounds and internal spacing. Image with Text derives effective blocks for flat legacy content without rewriting it; the first block edit still replaces flat fields with the authoritative block array.

`WebsiteSections.astro` dispatches through the canonical renderer identities and static per-theme adapter maps. It shares orchestration only. Farmhouse and Editorial keep their existing independent visuals. `WebsitePageRegion.astro` is a small SSR composition around those adapters. No existing component previously orchestrated these route-specific regions, which is why these feature wrappers and the Harvest adapters were needed. No new UI primitive, library, styling system or editor shell was created.

The six real Astro routes insert regions inside their existing availability checks. The two themed Shop adapters expose only a named insertion slot outside their native catalog. No parallel preview renderer or storefront section hydration was added. Theme-specific variant selectors now also cover the new region wrappers, without applying homepage density/type presets to native informational or commerce content. Text and alt attributes remain escaped.

The existing Harvest simple-edit DOM patching stays in place. Its structural signature now includes both optional composition fields, so any shared-section content, block, visibility or ordering change uses the established authorized structural rerender. Native selection identities resolve to the original Harvest DOM markers, preserving the old patch selectors. Page sections use route/region-specific selection IDs; block selection resolves the corresponding section across the current page.

## Backend and safety boundaries

The dependency-free section contract is copied byte-for-byte to the backend and checked by the existing parity test. Strict validators reject unknown page/region keys, native replacement objects, unsupported types/versions, extra section/block properties, invalid destinations, duplicate section identities and count overflow. Website-version validation preserves legacy Modern Farmhouse v1 without exposing the new composition controls. Save and authenticated preview also check section identity collisions across the separately stored template and appearance documents.

Appearance reference extraction now includes every new region and Harvest composition, including hidden sections and nested Image with Text image blocks. These references enter the existing channel/theme-library ownership, PNG/JPEG and exact asset-delivery URL checks during save, authorized preview and publication. Existing permission, capability expiry/host, optimistic-version and atomic publication paths remain responsible for access and persistence. Internal destination allowlists remain strict; renderers omit links to disabled destination pages, preserving the prior compatibility behavior rather than making those pages available.

Pricing, variants, inventory, listing queries/filtering/pagination, purchasing, cart, payment, customer identity and orders were not changed. No generic block can replace any of these systems.

## Files changed for this phase

This inventory describes Phase E edits, not all existing local modifications. Paths are relative to each named repository.

| Repository | Files                                                                                                                                                                          | Purpose                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Web        | `packages/theme/src/website-section-contract.ts`, `storefront.ts`                                                                                                              | Canonical eligibility/region/native contracts, strict appearance validation, selection identities |
| Web        | `packages/api/src/storefront-appearance.ts`                                                                                                                                    | Matching independent transport shapes                                                             |
| Web        | `apps/admin/src/VisualStorefrontEditor.tsx`, `WebsiteSectionManagement.tsx`                                                                                                    | Harvest hierarchy, page-region management, reuse of native inspectors and block selection         |
| Web        | `apps/storefront/src/components/VendorHome.astro`                                                                                                                              | Reference-based Harvest composition with unchanged native branches                                |
| Web        | `apps/storefront/src/components/home/Text.astro`, `ImageWithText.astro`, `CtaBanner.astro`, `section-renderers.ts`                                                             | Harvest-specific shared-section adapters                                                          |
| Web        | `apps/storefront/src/components/WebsiteSections.astro`, `WebsitePageRegion.astro`                                                                                              | Static registry dispatch and bounded route-region rendering                                       |
| Web        | `apps/storefront/src/components/modern-farmhouse/{Text,ImageWithText,CtaBanner}.astro`, `apps/storefront/src/components/editorial-market/{Text,ImageWithText,CtaBanner}.astro` | Optional page-specific selection IDs on existing visual adapters                                  |
| Web        | `apps/storefront/src/pages/{about,contact,faq,policies,find-us}.astro`, `apps/storefront/src/pages/products/index.astro`                                                       | Eligible real-route insertion points                                                              |
| Web        | `apps/storefront/src/lib/editor-preview-client.ts`                                                                                                                             | Structural preview invalidation and native Harvest selection compatibility                        |
| Web        | `apps/storefront/src/styles/harvest-sections.css`, `farmhouse-v2.css`, `editorial-market.css`                                                                                  | Harvest presentation and existing variants on informational-page regions                          |
| Web        | `tests/website-sections.test.tsx`, `tests/website-blocks.test.tsx`, `scripts/test-website-sections-ssr.ts`                                                                     | Focused contracts, editor state/actions/blocks and actual Astro SSR qualification                 |
| Web        | `docs/STOREFRONT_BUILDER_PHASE_E.md`                                                                                                                                           | This single report                                                                                |
| Backend    | `src/plugins/platform-identity/website-section-contract.ts`                                                                                                                    | Byte-identical canonical contract                                                                 |
| Backend    | `src/plugins/platform-identity/storefront-appearance-config.ts`, `storefront-website-templates.ts`                                                                             | Appearance/version validation and public filtering                                                |
| Backend    | `src/plugins/farmers-market/services/storefront-appearance.service.ts`                                                                                                         | New image references and cross-document identity checks                                           |
| Backend    | `test/farmers-market/website-sections.ts`                                                                                                                                      | All-theme region, authorization and lifecycle verification using in-memory repositories           |

## Automated verification

From `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/website-sections.test.tsx tests/website-blocks.test.tsx tests/storefront-visual-editor.test.tsx tests/website-library.test.tsx tests/storefront-appearance.test.tsx --reporter=dot
npx tsx scripts/test-website-sections-ssr.ts
npm run typecheck --workspace @market/storefront
npm run build --workspace @market/admin
npm run build --workspace @market/storefront
```

The five-file focused selection passed 85 tests. A subsequent 50-test section-suite rerun passed after the final test synchronization cleanup. Coverage includes Harvest native/repeatable composition and legacy defaults; page/theme/region eligibility; strict protected-page rejection; hidden/overflow/identity constraints; all-theme page switching and retained unsaved state; add/move/duplicate/visibility/confirmed deletion/history; shared-page block editing; preview path/config messages; explicit save/reload; Website Library transport and existing publication separation.

The real Astro SSR script passed for Harvest legacy/explicit/native-interleaved homepages and all eighteen combinations of three themes and six interior routes. It checks native-before/after order, the locked Shop position, block content/escaping/visibility, disabled public routes and existing distinct theme adapters. It compiles actual Astro components and routes into guarded temporary modules, uses fixture contexts and the real React server renderer for existing native islands, and removes its temporary modules. It performs no browser, network or database actions.

Astro typecheck passed with zero errors/warnings/hints. Admin and storefront production builds passed, retaining the existing large-chunk advisories. Prettier and scoped Git whitespace checks passed. Scoped ESLint passed for the Phase E implementation except the existing unused `error` catch binding in `apps/storefront/src/components/editorial-market/Shop.astro:391`. The same binding exists in HEAD; this phase only adds its editorial slot and leaves the unrelated catalog handler unchanged. The root TypeScript check still reports twenty previously documented unrelated errors in LoyaltyDashboard, table-navigation and application/market/layout fixtures; no Phase E file has a diagnostic. Those areas were not investigated or repaired.

From `E:\coding\farmers-market-platform`:

```powershell
npx ts-node --project test/farmers-market/tsconfig.json test/farmers-market/website-sections.ts
$env:APP_ENV='dev'
$env:NODE_ENV='development'
npm run build
```

The focused validator/service test and backend dashboard/server/worker build passed. The service test exercises real save/preview/publish control flow with in-memory repositories, all three themes' new page content, hidden/nested image checks, foreign/wrong-MIME/mismatched assets, strict forbidden structures, public filtering, capability/permission checks, stale versions and draft/published separation. This does not claim PostgreSQL transaction-isolation qualification. No destructive fixture harness or populated database was used. The previously documented disposable database fixture issue remains outside this phase.

No broad regression suite, browser automation, screenshot comparison or retained test artifact was produced. Visual/manual acceptance remains for the developer.

## Manual testing in the populated local environment

Use the existing `vendure_demo_market_ops` environment and established credentials. No new seeded account is required. Restart or reuse these four processes in separate terminals from the web directory, so both applications understand the additive format before saving:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Do not run migration, seed, reset or fixture commands for Phase E.

### Prepare separate drafts

1. On a desktop/laptop, sign in at `http://localhost:4322` using the existing Manna Roots vendor account (`manna-roots@example.test`) and its current credentials, or another established vendor with website permission. Select the intended vendor/channel.
2. Open `/vendor/storefront`. Record the current Live website name/ID and publication time, then open Visit Website in a separate baseline tab.
3. Use New Website to create `Phase E Harvest draft`, choosing Harvest. Open that draft from Website Library. Preserve the website/storefront/channel selections in the editor URL. Do not edit the existing live website or change account settings during preparation.

### Harvest homepage

1. Verify Hero, Featured products, About and Final shopping invitation in the homepage hierarchy, with Header/Footer outside the reorderable list. Confirm original copy, images and catalog behavior. About retains its existing conditional visibility; a new draft can legitimately start with it hidden. Enable it and add its required blurb only in this separate draft when testing its visible state.
2. Add Text, Image with Text and Call-to-Action Banner using Add Section. Edit heading/body, choose an owned PNG/JPEG or an allowed Harvest library image, and set alt text and an internal destination. Interleave the added sections with the native entries using drag handles, handle arrow keys and inspector Move up/down controls.
3. Confirm native entries cannot be duplicated/deleted or hidden through generic section controls. Their original specialized settings still work. Header/Footer cannot enter the composition.
4. Duplicate an added section, edit the copy, hide/show it, cancel deletion once, then confirm deletion. Undo/Redo each action, including native movement. Verify the source is unchanged after editing its copy.
5. Select Image with Text, expand its blocks, select Heading and edit it. Add permitted Paragraph/Button/Eyebrow content, reorder copy, duplicate a paragraph/button within limits, hide optional content and confirm deletion. Heading/Image remain required; the image stays in its visual region. Test Section settings, ratios, sides, vertical/text alignment, spacing, backgrounds and all three variants.
6. Preview Desktop/Tablet/Mobile widths, checking copy wrapping, image stacking and button layout. Save draft, reload the same website and verify identities/order, content, images, visibility and blocks remain. Opening an untouched legacy flat section must not adopt blocks or mark the draft dirty merely from selection.

### Every eligible interior page

Repeat the following on About (`/about`), Contact (`/contact`), FAQ (`/faq`), Policies (`/policies`), Find Us (`/find-us`) and Product listing (`/products`). The editor labels Find Us as Find Us page and Shop as Product listing.

1. Select the page in Preview page. Confirm its native editor/hierarchy remains present. Use Add Section before page content and verify exactly Text, Image with Text and Call-to-Action Banner. Informational pages also expose Add Section after page content; Shop does not.
2. Add at least two sections before content and reorder them. On informational pages add a section after content too. Sections must remain inside their chosen region. Edit an Image with Text block and test duplicate/hide/delete/history on an added section.
3. On About, use its original Add Section to add a legacy story layout, duplicate/reorder/delete it, then undo. Verify the legacy content remains a single source and its closing invitation stays native. Shared editorial sections remain before/after that existing composition.
4. On Contact, inspect the existing form and public details. Preview retains its existing disabled-submit protection; on a deliberately published local test site, the real form still uses its established controller. On FAQ and Policies, edit their native content through the original specialized controls. On Find Us, verify existing authoritative market dates/locations and links remain present and cannot be replaced or moved by section controls.
5. On Shop explicitly confirm every editorial section appears below the theme header/hero and above the entire real listing. Filters, sorting, pagination and pickup controls remain with the native catalog below it; there is no user-controlled listing block or after region. Browse/filter using existing preview permissions without attempting purchases.
6. Change a section, switch to another page, then return before saving. Confirm unsaved content remains and Undo/Redo operates on the draft. Save and reload. Confirm the iframe route and restored composition match the selected page.
7. Keep an optional page disabled, add/save editorial sections and inspect it in the authorized preview. Its public route must still return Page unavailable. Enable it through its existing native page control only when deliberately testing enabled routing on this draft.

### Other themes and safety

1. Create separate `Phase E Farmhouse draft` (Modern Farmhouse v2) and `Phase E Editorial draft` (Editorial Market v1). Repeat representative homepage operations and the six-page checks above with comparable content and photographs. Farmhouse's warm typography/photography/buttons and Editorial's geometric framing/type/color treatments should remain distinct. Compare Standard, Featured and Framed on an informational page too.
2. Refresh the baseline public site after previewing and saving each separate draft. Both the Live selection and published content must remain unchanged. Save draft must never publish. Unsaved changes keep Publish saved changes disabled.
3. Select Product detail. It must expose no Add Section or structural section/block controls. Cart, checkout, authentication, account, order and confirmation pages are not structural targets. To verify backend rejection without touching saved data, run the focused in-memory backend command above; it submits the forbidden shapes to real validators/service paths.
4. Verify the existing desktop-only editing restriction at the established small-screen threshold. Desktop preview-width buttons must still show responsive storefronts without enabling mobile editing.
5. Choose only library/upload images and offered internal destinations. A CTA to a disabled optional page is omitted in the storefront. Use the backend test for foreign asset, wrong MIME, mismatched URL, invalid route and revoked authorization rejection; do not modify another tenant's real records.

### Optional publication without an unintended live replacement

Saving a separate website does not isolate publication: every website in one vendor library shares that vendor's public address. The safe default for Manna Roots is to stop at save/reload and use the automated service test for publication verification.

If publication is deliberately desired, prefer an existing local test vendor storefront with no live website. Record its initial state, save the selected Phase E draft, explicitly publish, inspect its public informational/Shop routes, then save another draft edit and confirm the public site retains the earlier published snapshot. This task performed none of those publication actions.

To test on a storefront that already has a live website, first record the original Live ID/name and verify its current saved draft exactly matches the published snapshot with no prior unpublished changes. If that cannot be established, skip the switch. An intentional trial publish changes the live selection; restoration requires explicitly publishing the reviewed original website afterward. Do not publish an original draft containing earlier unpublished work as a supposed restoration.

## Limitations and deferred work

The six named pages, their explicit regions and the three existing shared section types are the entire scope. Informational native components keep their original internal layout; arbitrary insertion inside the contact form, questions/policies, market data or legacy story list is unavailable. Cross-region dragging is intentionally unavailable. Existing legacy story operations remain independent inside their native region, without conversion to shared blocks.

Only Image with Text supports blocks. Empty required heading/image placeholders and legacy flat content remain compatible. History remains the existing bounded client history, not a persisted revision system. Preview canvas clicks select sections; block selection stays in the hierarchy. Actual visual quality, pointer drag feel and responsive appearance require the manual checks above.

Legacy Modern Farmhouse v1 rendering remains intact and does not gain the new section composition UI. No new theme/type, arbitrary page creation, nested containers, custom HTML/CSS/JavaScript, cross-website section library, AI generation, theme switching/content transfer, mobile editor or market-manager Website Library was introduced.

Both applications must run the new validators before writing these optional fields. An older application version will reject saved Phase E compositions. Rollback therefore requires retaining the compatible contract or restoring reviewed pre-Phase-E website snapshots through the normal lifecycle; rolling back code alone after saving new compositions is not supported. There is no database schema rollback or destructive migration.

## Requested editor refinements

The before-content Add Section action is no longer offered on Contact, FAQ, Policies or Find Us. Their after-content action remains. About and Shop retain their approved before-content action. Existing saved before-content sections still render and can be edited/removed, so this UI restriction does not discard saved work. The backend continues understanding that legacy data.

Header, Footer and Category presentation are grouped in one Theme settings dropdown. Theme-specific controls use the existing inspector portals; Appearance contains the existing palette/type controls. Selecting a global section from the preview opens the group. Description textareas use the same designer field surface, foreground and compact type as other inputs.

Image with Text now offers Image position > Full-width background with text overlay, using a strictly registered `background` position in both application contracts. Each theme's own renderer places its photograph across the viewport with copy over it and a contrast gradient. Both flat content and blocks are supported. Existing left/right layouts are unchanged. Restart backend and storefront processes before saving this new enum value. The existing SSR test now renders this layout through each of the three actual theme adapters. Visual acceptance remains manual.

Additional local files changed for these refinements: `apps/admin/src/FarmhouseEditor.tsx`, `EditorialMarketEditor.tsx`, `WebsiteTextSectionEditor.tsx`, `website-editor.css` and `tests/storefront-visual-editor.test.tsx`, alongside the editor, contract, transport, theme renderer/style and focused test files already listed above.

Refinement verification: 61 tests passed across `website-sections.test.tsx` and `storefront-visual-editor.test.tsx`; scoped ESLint, the real Astro SSR matrix (including all three overlay adapters), the focused backend validator/service suite, and both frontend production builds passed. The latest storefront typecheck found four unrelated diagnostics in `pages/account/[section].astro` and `pages/account/orders/{index,[id]}.astro` involving ARIA attribute types and an implicit-any purchase variable. No changed refinement file has a diagnostic; those account files were left untouched. Test-only React act warnings remain in the existing category-loading test.

Manual refinement checks: open Theme settings and verify Header, Footer, Category presentation and Appearance are nested there; select Header/Footer from the preview and verify the group opens. On Contact/FAQ/Policies/Find Us verify only the after-content Add action is offered. Inspect a Description textarea for the gray surface and small light text. For each theme, choose the new background image position on a separate draft, select a library image, and check the full viewport image and overlaid text at all three preview widths; save/reload and check block and flat-content versions. No database or publication was changed by this refinement.
