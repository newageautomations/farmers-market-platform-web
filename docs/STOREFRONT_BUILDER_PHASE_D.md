# Storefront builder Phase D

Implemented locally on November 8, 2026. The developer explicitly authorized the directly related backend changes in `E:\coding\farmers-market-platform`. Existing Phase A-C work and unrelated concurrent modifications were preserved. No database, account, saved website, publication, deployment or remote Git state was changed. No migration or seed is needed.

## Implemented functionality

The website editor now opens as a full-screen workspace inside the authenticated admin application. The left panel contains page navigation and the existing section hierarchy; expanding Image with Text exposes its ordered child blocks. The center remains the authenticated iframe showing actual storefront routes. The right panel receives the selected section, block, informational-page or global inspector. Desktop, tablet and mobile storefront preview widths remain available, with iframe scrolling and existing section click selection.

The top toolbar contains Exit, website identity, saved/unsaved/publication status, icon Undo/Redo, viewport buttons, Inspect/Browse, the live-site link, Save draft and Publish saved changes. Existing validation, save locks, optimistic versions, unsaved navigation warnings, channel context and Website Library return URLs remain in place. Fullscreen is the default rather than a separate expansion mode. The normal dashboard navigation and topbar are hidden while this workspace is mounted, including their obscured keyboard tab stops. The existing desktop-only editing gate is unchanged.

Image with Text supports Heading, Paragraph, Image, Button and optional Eyebrow blocks in Modern Farmhouse v2 and Editorial Market v1. Vendors can select/edit blocks, add eligible optional content, reorder text and buttons with desktop drag/drop, keyboard arrows on handles or inspector move buttons, duplicate repeatable blocks, hide/show optional blocks, confirm deletion and undo/redo changes. The image remains in the theme-controlled image region. Section layout settings include image left/right, image/text proportions of 50/50, 40/60 or 60/40, top/center/bottom text placement, existing text alignment/background/Standard/Featured/Framed choices and compact/balanced/spacious internal spacing.

The ratio control replaces the editor's old image-size selector. Its initial value reflects legacy small/medium/large settings, without writing an explicit ratio until changed. Legacy stored image-size values remain supported by validation and rendering.

## Reused editor patterns and controls

The existing `market/phase14/designer.css` supplies the layout creator's dark shell/panel/raised surfaces, shared control token overrides, focus treatment, compact control proportions and light dialog treatment. The website composes these existing classes with a small feature stylesheet for the three workspace regions. Existing disclosure/inspector transitions from `storefront-appearance.css` remain in use, including reduced-motion behavior. The Market Manager Layout Creator's source, behavior and stylesheet were not changed.

All controls continue using shared Button/IconButton, Field, Input, Textarea, SelectField, Checkbox, Dialog, Badge, Spinner and the authorized `CategoryImageField`. There is no new UI library or parallel primitive system. `WebsiteEditorContext` routes existing contextual forms into one inspector with React portals and retains an inline fallback for standalone consumers. It does not own permissions, persistence or commerce. `WebsiteBlockEditor` is a feature composition because existing primitives do not own block eligibility, order or selection. Existing theme and specialist page controllers remain responsible for their settings.

## Block contract and composition rules

The canonical dependency-free `website-section-contract.ts` and its byte-identical backend copy register block types and version 1. Each block has a section-scoped unique `block-...` identity, a registered type/version, boolean visibility, exact content and exact presentation properties. Unknown keys, nested containers, HTML/CSS configuration, unknown versions and invalid references fail validation.

| Block     | Count                       | Content and presentation                                                                       |
| --------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| Heading   | Exactly one, always visible | Plain text, at most 160 characters; standard/large size                                        |
| Paragraph | Zero to three               | Plain text, at most 1200 characters each; standard/large size                                  |
| Image     | Exactly one, always visible | Existing asset ID, matching delivery URL and alt text up to 200 characters                     |
| Button    | Zero to two                 | Nonblank label up to 80 characters; approved internal destination; primary/secondary treatment |
| Eyebrow   | Zero or one                 | Plain text up to 80 characters; standard/large size                                            |

There are at most eight blocks. Required heading/image blocks cannot be removed, hidden or duplicated. Paragraphs and buttons can be duplicated within their limits. Optional hidden blocks still count toward limits. Image order does not change its visual region; text/button relative order is deterministic. Scope is explicitly Image with Text on the two supported theme homepages. Registering a block does not enable it in other sections or pages.

The backend template validators invoke the mirrored shared section contract. The appearance service extracts images from effective blocks in both themes, retaining existing ownership, same-theme library-asset, permitted MIME type and exact asset URL checks during save, preview and publication. CTA route validation remains strict and theme renderers also suppress unavailable destinations. No product, pricing, inventory, authorization, cart, checkout or order component is registered as an editable block. Shop/product/cart/checkout composition remains rejected by the existing page/template contracts.

## Legacy compatibility and serialization

An existing Image with Text section keeps its original version-1 content object with heading, body, image, label and destination. Reading, previewing, selecting blocks or changing layout does not migrate that object. Its renderer retains the legacy markup branch, and absent new layout attributes retain the existing proportions and spacing.

`effectiveWebsiteBlocks()` derives deterministic identities for the existing image, heading, nonempty body and nonempty CTA. On the first block mutation, the editor replaces the content object with `{ blocks: [...] }`. It does not keep the old copy/media/CTA fields alongside the array. Exact validation rejects a content object containing both representations. Section-wide layout/variant fields remain in `presentation`. Legacy controls are absent from the inspector once blocks become authoritative.

The existing history stores the whole draft, including nested blocks, so undo can restore the exact legacy representation. Selection uses stable identities; if an undo removes the selected item, the inspector falls back to a valid section or its section settings. Draft save/reload, preview serialization and explicit publication use the same existing lifecycle. No destructive migration or saved-record rewrite occurs. Running older application validators after saving block content would reject that newer shape, so both applications must run this additive contract.

## Theme rendering

Modern Farmhouse retains `Photo`, warm surfaces, its typography and farmhouse CTA classes. Editorial Market retains its geometric spread, framed image region, editorial typography, accent treatments and existing Astro Button adapter. Each theme renders the same block array through its own static Image with Text component, with no universal conditional renderer and no storefront hydration added. Both escape text/alt content and stack image/copy at the existing small-screen breakpoint. Explicit ratios and alignment override only the selected section's curated layout; absent attributes preserve legacy behavior.

## Files changed

These are Phase D edits, not an inventory of all pre-existing working-tree modifications.

| Repository | Files                                                                                                                                                                                                       | Purpose                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Web        | `packages/theme/src/website-section-contract.ts`, `website-sections.ts`                                                                                                                                     | Block registry, strict validation, legacy derivation, reference extraction and immutable editing operations |
| Web        | `packages/api/src/storefront-appearance.ts`                                                                                                                                                                 | Independent transport types matching both content representations and layout settings                       |
| Web        | `apps/admin/src/VisualStorefrontEditor.tsx`, `WebsiteEditorContext.tsx`, `website-editor.css`                                                                                                               | Dedicated workspace, toolbar, inspector routing and selection                                               |
| Web        | `apps/admin/src/WebsiteBlockEditor.tsx`, `WebsiteSectionManagement.tsx`, `WebsiteTextSectionEditor.tsx`                                                                                                     | Block hierarchy/inspector and section layout controls                                                       |
| Web        | `apps/admin/src/FarmhouseEditor.tsx`, `EditorialMarketEditor.tsx`, `AboutStoryEditor.tsx`, `ContactEditor.tsx`, `FindUsEditor.tsx`, `FaqEditor.tsx`, `PoliciesEditor.tsx`, `StorefrontCategoriesEditor.tsx` | Reuse existing contextual forms in the right inspector                                                      |
| Web        | `apps/storefront/src/components/modern-farmhouse/ImageWithText.astro`, `apps/storefront/src/components/editorial-market/ImageWithText.astro`                                                                | Separate block-aware SSR adapters with legacy branches                                                      |
| Web        | `apps/storefront/src/styles/farmhouse-v2.css`, `editorial-market.css`                                                                                                                                       | Curated layouts and theme-specific block presentation                                                       |
| Web        | `tests/website-blocks.test.tsx`, `tests/website-sections.test.tsx`, `tests/storefront-visual-editor.test.tsx`, `scripts/test-website-sections-ssr.ts`                                                       | Focused contract, editor, serialization and actual SSR coverage                                             |
| Web        | `docs/STOREFRONT_BUILDER_PHASE_D.md`                                                                                                                                                                        | This single report                                                                                          |
| Backend    | `src/plugins/platform-identity/website-section-contract.ts`                                                                                                                                                 | Byte-identical contract                                                                                     |
| Backend    | `src/plugins/farmers-market/services/storefront-appearance.service.ts`                                                                                                                                      | Block image extraction through existing reference checks                                                    |
| Backend    | `test/farmers-market/website-sections.ts`                                                                                                                                                                   | Block validation plus existing service save/preview/publish/ownership tests                                 |

## Automated verification

Run frontend commands from `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/website-blocks.test.tsx tests/website-sections.test.tsx tests/storefront-visual-editor.test.tsx tests/website-library.test.tsx tests/farmhouse-v2.test.tsx tests/editorial-market.test.tsx tests/storefront-appearance.test.tsx --reporter=dot
npx tsx scripts/test-website-sections-ssr.ts
npm run typecheck --workspace @market/storefront
npm run build --workspace @market/admin
```

The seven-file selection passed 89 tests. Focused reruns cover the final drag/drop, ratio-control and toolbar refinements. The real Astro SSR script passed for both themes, including legacy order/assets, all variants, block order, hidden blocks, escaped copy/alt, unavailable links and absence of section hydration. Astro checked 205 files with zero errors, warnings or hints. The admin build passed with the existing advisory about chunks larger than 500 kB. Focused ESLint passed for changed source/test files; changed web files were formatted and the scoped Git whitespace check passed.

Run backend commands from `E:\coding\farmers-market-platform`:

```powershell
npx ts-node --project test/farmers-market/tsconfig.json test/farmers-market/website-sections.ts
$env:APP_ENV='dev'
$env:NODE_ENV='development'
npm run build
```

The focused backend test and dashboard/server/worker build passed. The service suite uses in-memory repositories and exercises real validators and service control flow: block contract rejection, media ownership/URL checks in both themes, preview permissions/capabilities, optimistic versions and draft/publication separation. It does not qualify PostgreSQL transaction atomicity. No database harness was pointed at the persistent demo database.

The root `npx tsc --noEmit --pretty false` still reports 20 unrelated existing diagnostics in LoyaltyDashboard, table-navigation and application/market/layout test fixtures. None is in a Phase D file. No repair was made to those areas. No full regression suite, browser automation, screenshot, screenshot comparison or retained verification artifact was produced. Visual acceptance remains for manual review.

## Manual testing in the populated local environment

Use `vendure_demo_market_ops`. In separate terminals from the web directory, start or reuse the matching demo processes:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Do not run migrations, seeds, resets or fixture commands for this phase. Use the existing Manna Roots vendor account (`manna-roots@example.test`) with its current credentials, or an existing vendor account with storefront-management permission. Keep established accounts and website settings intact.

### Full-screen workspace

1. On a desktop browser, open `http://localhost:4322/vendor/storefront` in the intended vendor/channel context. Record the existing Live website's name and publication date, and keep its Visit Website tab open as a baseline.
2. Use New Website to create a separate `Phase D Farmhouse draft` with Modern Farmhouse. Do not modify the existing Live website. Retain the `storefront`, `website` and channel selections in its editor URL.
3. Verify a dedicated full-screen toolbar, dark left/right panels and dominant storefront preview, using the Market Layout Editor as the visual reference. The dashboard header/sidebar should be absent.
4. Select pages on the left. Select native and added sections, theme/global settings and informational-page settings. Their relevant controls should appear on the right. Expand/collapse a section and verify selected states and keyboard focus.
5. Verify Desktop, Tablet and Mobile preview buttons, horizontal workspace scrolling when needed, and scrolling through the entire storefront. Click sections in Inspect mode and browse permitted pages in Browse mode.
6. Change content, use Undo/Redo and Save draft. Unsaved changes should disable Publish saved changes. Try Exit and browser navigation with unsaved edits; decline the discard warning and verify edits remain. Save, then Exit and verify the correct Website Library/storefront context.

### Block editing and layouts

1. Add Image with Text on Homepage or open a legacy draft section. Its heading/image blocks already exist and cannot be added twice, hidden or deleted. The existing nonempty body and CTA appear as blocks too.
2. Select Heading, edit its text/size and verify the preview. Select Image, choose an existing owned/theme library image and edit alt text. Inspect Add Block: required/maxed types must be disabled.
3. Add Paragraph, Eyebrow and Button as permitted. Edit each block's content and settings. Choose only the offered internal destinations for buttons. Set a disabled informational-page destination and verify its CTA is omitted from the storefront.
4. Reorder copy by dragging its handle. Repeat using the handle's arrow keys and inspector move buttons. Confirm the image remains in its own region. Check actual copy order in the preview.
5. Duplicate a paragraph and button within their limits. Hide/show optional blocks, confirm deletion and undo/redo. Verify three-paragraph, two-button, one-heading, one-image and one-eyebrow limits.
6. Return to Section settings. Test image left/right, every column ratio, each vertical/text alignment, background, internal spacing and Standard/Featured/Framed variants. Recheck tablet/mobile preview stacking and CTA wrapping.
7. Save, reload the exact draft and verify blocks, identities/order, visibility, content and layouts persist. Legacy flat content fields should no longer appear as competing controls after a block edit.
8. Open a separate existing legacy Image with Text draft without changing it. Verify its original appearance and flat content/layout editing still work. Merely selecting its blocks must not mark the draft dirty.

### Theme comparison and safety

1. Create a separate `Phase D Editorial draft` using Editorial Market. Configure a comparable Image with Text composition and repeat the block/layout checks. Confirm editorial borders, geometric spread, typography and CTA treatment differ from Farmhouse.
2. After editing/saving either separate draft, refresh the baseline public website. Its content and Live selection must remain unchanged.
3. Select Product listing and Product detail in the preview picker where available. Verify the product listing remains locked and there are no structural block controls. Cart and checkout are not editable composition targets. Existing native presentation settings retain their prior scope.
4. Open the admin route on a phone/tablet or viewport at or below the existing 1024px editing restriction. Verify the desktop/laptop requirement still blocks editing. This does not disable responsive storefront preview inside the desktop editor.
5. Publish only if intentionally changing the active local public website. Saving a separate draft never publishes it. Publish saved changes makes that saved website the storefront's live website, replacing the current live selection. It does not erase the previous website from the library. To keep the existing local publication untouched, stop after save/reload; use the automated service tests for publication verification. Restoring an earlier website also requires an explicit publish and should use a reviewed saved snapshot.

## Limitations and deferred functionality

Only Image with Text homepage sections in the two named themes support blocks. Harvest, informational-page block conversion, arbitrary nesting, custom HTML/CSS/JavaScript, free-positioned images, new themes, theme switching, cross-website libraries, AI integration and mobile editing remain out of scope. Preview clicks still select sections; child blocks are selected in the hierarchy. Content history remains the existing bounded client history, not a persisted revision system. Empty required heading/image placeholders are valid for compatibility. Manual browser review, including precise visual density, focus behavior and responsive presentation, remains with the developer as requested.
