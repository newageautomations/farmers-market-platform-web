# Storefront builder Phase B

Implemented locally on November 8, 2026. Scope is the Modern Farmhouse v2 homepage and its directly related shared/backend contracts. No database records, website snapshots, vendor accounts or live-site selections were changed during development. No migration, seed, deployment or publication is required or was performed.

## Implemented functionality

- Add Section opens the shared Farmstand Dialog with Text, Image with Text and Call-to-Action Banner choices. Each choice has its registry name, description and existing UtilityIcon. Theme/version/page eligibility comes from the shared registry. The picker has no independent section-type list.
- Homepage rows identify the type and authored heading, show selection through the existing disclosure and theme border token, and explicitly identify hidden sections. Drag handles reorder the unified list with before/after drop indicators. Move Up/Down buttons remain available, and the focused handle also accepts arrow keys. Visibility controls and permitted duplicate/delete actions are available on each row. The selected row puts these actions before its settings.
- The original six sections remain required, unique, reorderable and hideable. They have no duplicate/delete actions. All three repeatable types support multiple independent instances, deep-copy duplication with new IDs, visibility, reordering and confirmed deletion.
- Image with Text supports heading, body, an existing media-library photograph, alt text, optional button label and an internal destination. Presentation choices are image left/right, text left/center/right, small/medium/large image proportions and warm paper/light/theme-color backgrounds. Empty images use the existing theme placeholder. The storefront stacks the image above the copy at small widths.
- Call-to-Action Banner supports heading, optional description, required button label, internal destination, left/center alignment and the same three background treatments. It is presentational and introduces no commerce behavior.
- The existing history, authenticated preview, draft save/reload and explicit publication flow carries all three types. A drag commits on drop as one history change; hovering or abandoning a drag does not rewrite configuration. Draft edits do not publish automatically.

## Shared section and UI architecture

The canonical dependency-free `website-section-contract.ts` now declares three version-1 types. Manifest metadata defines defaults, limits, eligibility, editor adapters and theme renderer adapters. The backend copy stays byte-identical through the existing parity test. No application imports runtime code from the other repository.

The only persisted order remains `settings.sections`. The original six compatibility objects coexist with versioned repeatable instances. The existing budget is preserved: at most twelve additional sections combined, eighteen homepage entries overall, and at most twelve of any registered type. Existing six-section and Phase A Text configurations remain valid. IDs retain the `text-` namespace or use `image-with-text-` / `cta-banner-`; each ID must match its type and be unique across the composition.

Validation rejects unknown properties at every new object level, unsupported versions/types, invalid IDs, unbounded copy, unsupported presentation values and nonallowlisted CTA routes. Heading/body/button/alt limits are 160 / 1200 / 80 / 200 characters for Image with Text. Banner descriptions are limited to 600 characters. CTA destinations use the retained internal homepage, Shop/product/category and informational-page route patterns, rejecting external links and protected cart/checkout/account destinations. Informational links whose pages are disabled are omitted by the theme renderer.

Image data stores `{ assetId, url, alt }`, with either an empty ID/URL pair or a syntactically valid pair. The appearance service now extracts these images alongside original-section photographs, including hidden sections, and sends them through the existing asset checks on save, preview and publication. The asset must be an authorized PNG/JPEG in the current channel or an existing authorized Modern Farmhouse theme-library asset, and its URL must match that asset's storage-strategy preview/source URL. Pasting an arbitrary URL is not exposed by the editor, and a syntactically valid foreign URL cannot bypass backend ownership/URL checks.

The picker, row controls and section settings compose the existing Dialog, native disclosure presentation, Button, IconButton, Checkbox switch, Field, Input, Textarea, SelectField and CategoryImageField. The existing Destination control supplies route choices, including deferred catalog-product choices. No new UI framework, UI primitive, global standard or dependency was introduced. There is no installed focused drag-and-drop dependency in this project; native desktop HTML drag events are sufficient for this one bounded list, with explicit keyboard alternatives. No general drag framework was built and no market-specific drag controller was imported.

The new settings adapter extends `WebsiteTextSectionEditor.tsx` because existing Text fields cannot express media/CTA settings. The two new Astro adapters are necessary because existing Story/Invitation render branches own original-section or informational-page shapes. They reuse Photo, navigation availability checks, theme typography/colors/spacing and the existing farmhouse button presentation. Scoped feature layout rules use the current token system. Static sections add no hydration. The existing manifest dispatch, preview-selection attributes, iframe protocol, desktop-only editing restriction and mobile storefront preview remain in place.

Structural eligibility remains Modern Farmhouse version 2, `home`, only. Harvest, Editorial Market, legacy Farmhouse, informational-page composition, product pages, cart, checkout and Shop product-list structure are not registered. Existing specialist page settings are retained. Snapshot separation, optimistic versions, tenant/channel authorization and atomic publication remain in their existing controllers/services. No columns, persistence migration or destructive conversion was needed.

## Files and systems changed

Paths are relative to the repository named in the first column. Existing unrelated workspace changes were preserved.

| Repository | Files                                                                                                                          | Purpose                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Web        | `packages/theme/src/website-section-contract.ts`, `website-sections.ts`                                                        | Contracts, manifest metadata, registry eligibility/defaults, immutable content/presentation patches and drop reordering |
| Web        | `packages/theme/src/modern-farmhouse.ts`, `storefront.ts`                                                                      | Unified bounds and new safe preview-selection IDs                                                                       |
| Web        | `packages/api/src/storefront-appearance.ts`                                                                                    | Corresponding transport-only section union                                                                              |
| Web        | `apps/admin/src/FarmhouseEditor.tsx`, `WebsiteTextSectionEditor.tsx`, `storefront-appearance.css`                              | Registry picker, row management/dragging and settings adapters                                                          |
| Web        | `apps/storefront/src/components/modern-farmhouse/Home.astro`, `section-renderers.ts`, `ImageWithText.astro`, `CtaBanner.astro` | Existing SSR dispatch extended with static theme adapters                                                               |
| Web        | `apps/storefront/src/styles/farmhouse-v2.css`                                                                                  | Token-based surfaces and responsive editorial layouts                                                                   |
| Web        | `tests/website-sections.test.tsx`, `tests/farmhouse-v2.test.tsx`, `scripts/test-website-sections-ssr.ts`                       | Extended Phase A coverage and queries for now-visible row controls                                                      |
| Web        | `docs/STOREFRONT_BUILDER_PHASE_B.md`                                                                                           | This report, the only new report                                                                                        |
| Backend    | `src/plugins/platform-identity/website-section-contract.ts`, `modern-farmhouse-settings.ts`                                    | Mirrored strict contract and composition budget                                                                         |
| Backend    | `src/plugins/farmers-market/services/storefront-appearance.service.ts`                                                         | Include registered image sections in existing asset validation                                                          |
| Backend    | `test/farmers-market/website-sections.ts`                                                                                      | Extend existing validator/service qualification for new content and asset authority                                     |

`VisualStorefrontEditor.tsx`, commerce hooks/services and database configuration did not need changes.

## Automated verification

Run from `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/website-sections.test.tsx tests/farmhouse-v2.test.tsx tests/website-library.test.tsx tests/storefront-appearance.test.tsx --reporter=dot
npx tsx scripts/test-website-sections-ssr.ts
npm run typecheck --workspace @market/storefront
npm run build --workspace @market/admin
npm run build --workspace @market/storefront
```

The focused frontend selection passed 60 tests across four files. Coverage includes registry eligibility and picker choices, independent addition/duplication/editing, actual media-picker selection/clearing, confirmed deletion/cancel, visibility, limits, immutable ordering/IDs, simulated native drag/drop, undo/redo, preview messages, save/reload/publish gating and transport, strict schemas, old-section compatibility, backend contract parity and protected-page rejection.

Actual Astro homepage SSR passed for all three types, checking interleaved order, hidden instances, image/presentation attributes, escaped content and alt attributes, CTA routes, disabled informational destinations and absence of section hydration. Its temporary compiled modules are removed by the existing helper. Astro checked 200 files with zero errors, warnings or hints. Admin and storefront production builds passed, with the existing large-chunk warnings. Focused ESLint passed on the changed TypeScript/TSX/Astro sources and tests. Prettier was applied to the changed frontend files and backend test; the canonical contract was then copied to the backend.

Run from `E:\coding\farmers-market-platform`:

```powershell
npx ts-node --project test/farmers-market/tsconfig.json test/farmers-market/website-sections.ts
$env:APP_ENV='dev'
$env:NODE_ENV='development'
npm run build
```

The backend validator/service test and dashboard/server/worker build passed. The test uses real validators and appearance service methods with in-memory repository and access-policy boundaries. It covers all three types through save, authenticated preview and publication; foreign/missing/wrong-MIME assets; mismatched URLs; authorized same-theme library assets and wrong-theme rejection; permission changes; preview host/token/expiry/deleted-website rejection; optimistic/stale publication versions; and published-snapshot isolation after subsequent saves. It does not claim PostgreSQL transaction-isolation qualification.

Root `npx tsc --noEmit --pretty false` still reports 20 unrelated diagnostics in LoyaltyDashboard, table-navigation and existing application/market/layout fixtures. None are in the changed feature files. These predate Phase B and were not repaired. The existing disposable database website harness was not rerun: Phase A already documents its unrelated `ProductVariant.customFieldsCatalogdetails` fixture failure. No full regression suite, browser automation, screenshots, visual artifacts, external services or database mutation was used for this phase.

## Manual testing with the populated database

No special seed or migration is necessary. Use the existing `vendure_demo_market_ops` environment. Start or restart the matching processes after the local code update, each in a separate terminal from the web directory:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. In a desktop browser, sign in using an existing authorized vendor account such as Manna Roots (`manna-roots@example.test`) and its current credentials. Select its vendor channel and open `http://localhost:4322/vendor/storefront`.
2. Record which website is Live and open its Visit Website link in another tab. Keep that tab for comparison. Click New Website, name it `Phase B section draft`, select Modern Farmhouse and create the separate draft. Do not edit the existing Live website for preparation.
3. In the new website editor on Homepage, open Add Section. Confirm the three named choices have descriptions/icons. Add Text, edit its heading/body/alignment, and add a second Text to check independent content.
4. Add Image with Text. Choose a photograph through My Images, an existing Theme Image or a normal PNG/JPEG upload. Add alt text and copy, set an optional button label and select an internal destination. Try both image sides, all sizes, alignments and backgrounds. Clear the image and verify the theme placeholder, then choose it again. No image URL or free-form CSS field should appear.
5. Add Call-to-Action Banner. Edit its heading/description, button label/destination, alignment and background. Link to Shop, or enable Our Story using the existing page settings before testing an Our Story button. Disabled informational destinations intentionally produce no storefront link. An empty banner button label must prevent saving a valid draft.
6. Select a section row to reopen its settings. Drag its grip above/below an original section and observe the drop indicator and preview order. Move an original section too. Cancel a drag outside the list and verify the previous order remains.
7. Use Move Up/Move Down, including the first/last disabled boundaries. Focus a grip and try its Up/Down arrow keys. Verify selection still identifies the same section after moving it.
8. Duplicate each repeatable type and change the copy's heading. Confirm the source is unchanged. Hide/show either copy and check the row's hidden state and preview. Delete through confirmation, try dismissing confirmation once, and confirm only the intended instance disappears. Original sections must have no duplicate/delete actions.
9. Undo/Redo additions, text/presentation changes, a drag, visibility, duplication and deletion. A single Undo after a drag should restore the previous full order with section IDs/content intact. After undoing a deletion, reselect its row if necessary to inspect the restored settings.
10. Inspect the existing authenticated preview. Try Desktop and Mobile viewport modes. Confirm image/text stacking, wrapping, alt content, backgrounds and button presentation. Preview inspection should select the corresponding registered section in the sidebar. Editing remains desktop-only; inspect mobile storefront responsiveness without attempting mobile editing.
11. Save draft, reload the same website editor URL and reselect the rows. Confirm copy, images, presentation, visibility and ordering persist. The new website should remain a draft. Unsaved edits must keep Publish saved changes disabled.
12. Refresh the separate public storefront tab. Its existing live content and publication selection must remain unchanged by draft edits, authenticated preview or Save draft. Stop here to preserve the current public website throughout testing.
13. Open the editor's Shop and product views and inspect the actual cart/checkout routes outside the editor if desired. There must be no Add Section, homepage drag handles or duplicate/delete controls for protected page structures. Retained specialist settings such as the product gallery are not structural section editing. Do not make test purchases for this phase.

Publishing is optional and explicitly changes the storefront's Live website. A separate draft in the same vendor library still shares that vendor's public address: publishing it will replace the current live selection. To avoid affecting an existing live website, stop at draft verification or publish only on an already available local test storefront with no live website. Do not create accounts, reseed or replace populated settings just to prepare this test.

If intentionally testing a temporary switch on the populated local storefront, first record the original Live website ID/name and inspect its saved draft for unintended unpublished changes. Save the Phase B draft, explicitly click Publish saved changes and verify the public site. Edit/save the new draft again without publishing and confirm public content still uses the previous published snapshot. Restore the original only after reviewing its saved draft, because publishing that website publishes its current saved draft. Do not assume switching back discards its unpublished edits. This task performed no such switch.

## Known limitations and later phases

Manual desktop drag behavior, visual polish and responsive appearance still require the developer's browser check. Automated drag tests simulate events in JSDOM; no browser automation or visual comparisons were run, as requested. Service qualification uses isolated in-memory repositories, preserving the populated database and avoiding the known unrelated integration fixture failure.

Only Modern Farmhouse v2 homepages support these repeatable sections. The twelve-additional-section budget is shared across types. Content is plain text, layouts are curated, and informational CTAs are hidden when their destination page is disabled. Image selection deliberately retains the existing media library's PNG/JPEG and theme-asset authorization rules. Both backend and frontend must run the additive contract before saving new-type configurations; older application validators do not understand new types.

Future work intentionally remains separate: additional pages/themes, nesting, cross-website libraries, rich text, arbitrary HTML/CSS, free positioning, AI generation, mobile editing, theme switching, commerce structural editing and unrelated UI/test-infrastructure migrations. No broader rendering architecture or validation rewrite was introduced.
