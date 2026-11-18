# Storefront builder Phase C

Implemented locally on November 8, 2026. Modern Farmhouse v2 and Editorial Market v1 now share the three existing repeatable section contracts and section-management controls while rendering them through separate theme adapters. No migration, seed, database mutation, account creation, deployment or publication was performed. Existing unrelated workspace changes were preserved.

## What was implemented

- Editorial homepages support Text, Image with Text and Call-to-Action Banner sections between their four original sections.
- Both themes use one extracted section manager for the registry-driven Add Section picker, selection, desktop drag/drop, keyboard and Move Up/Down alternatives, visibility, duplication, section budgets and confirmed deletion.
- Existing VisualStorefrontEditor history, draft saving, authenticated preview, viewport modes and explicit publishing carry the new composition and design fields. The shell and publication controllers were not rewritten.
- Both themes expose Standard, Featured and Framed presentation choices for the three reusable types. Optional homepage design controls offer Compact/Balanced/Spacious spacing and Standard/Expressive typography scale.
- Editorial has separate static Astro renderers with ruled text columns, bordered image spreads and structured CTA compositions. Modern Farmhouse keeps its existing renderer structures, warm surfaces, photography and buttons, with optional larger italic headings, arched photography and softly framed surfaces.
- Homepage-only selectors interpret the design settings separately in each theme. No new setting changes product listings, product detail, cart, checkout or informational pages.

## Shared and theme-specific architecture

The dependency-free `website-section-contract.ts` remains the canonical shared contract and has a byte-identical backend copy. It defines content validation, version/type, ID constraints, eligibility, defaults, renderer identifiers, supported variants per theme, global design enums and Editorial composition invariants. Frontend Zod adapters and backend hand-written template validators consume those same dependency-free predicates. Runtime code does not import from the other repository and no cross-repository build system was added.

Manifest entries register only Modern Farmhouse v2 and Editorial Market v1 on `home`. Variant lists are indexed by theme, so future themes can expose different subsets without making the picker assume a universal presentation list. Unsupported variants and extra presentation/design properties are rejected. Missing variants remain absent in stored JSON and render as Standard. There are no raw CSS values, user classes, HTML interpretation or executable configuration.

`WebsiteSectionManagement` extracts the existing Phase B interaction implementation rather than duplicating an editor. It retains the existing section-row CSS classes and composes Button, IconButton, Checkbox switch, Dialog and disclosure presentation. Template-specific native panels stay in their existing editors. The extracted destination selector and category-loading hook are reused. `WebsiteTextSectionEditor` still owns shared fields and uses the host theme ID for the existing media picker. `HomepageDesignEditor` composes SelectField for the two shared semantic controls.

These feature compositions are needed because no existing shared primitive manages mixed native/repeatable section instances or these homepage-only semantic settings. They introduce no new UI primitive, library, pending-category approval or styling system. Separate Editorial Astro components are necessary because its text columns, figure/copy spread and CTA action column differ structurally from Farmhouse's implementations. They reuse the native Astro Button adapter and existing Editorial color/type tokens. Farmhouse retains its existing button and Photo implementations. The small shared destination helper only handles bounded route safety and enabled-page availability, independent of visual presentation. No commerce logic was duplicated.

The new static sections add no hydration. Existing native product sections continue using the same catalog, taxonomy, pricing presentation and commerce adapters.

## Editorial composition

The only new composition field is optional `settings.composition`:

```json
[
  { "id": "hero" },
  {
    "id": "text-example",
    "type": "text",
    "version": 1,
    "visible": true,
    "content": { "heading": "Our market", "body": "Our story." },
    "presentation": { "alignment": "left", "variant": "featured" }
  },
  { "id": "categories" },
  { "id": "products" },
  { "id": "impact" }
]
```

Native references contain only their ID. Hero content and images remain in `hero` and `assets`; categories, products and impact keep their original named settings, visibility flags and asset references. The editor's transient rows project those existing visibility values and write changes back to their original locations. There is no second persisted visibility field or parallel ordering array.

When composition is absent, `editorialHomepageComposition()` derives Hero, Categories, Featured products, Community impact without mutating or rewriting the stored settings. A composition edit persists the explicit list. Editing native content or homepage design alone does not require adding a composition field.

All four original references must occur exactly once. All IDs are unique across the list. Original entries can be moved but cannot be deleted or duplicated. Categories, products and impact retain their visibility controls. Hero remains required and visible, retaining the original theme's heading behavior. Header, navigation and footer remain structural. There are at most twelve repeatable instances combined, sixteen entries overall, and the registry also enforces each type's count limit. Farmhouse keeps its six original entries and eighteen-entry total budget.

## Design options and compatibility

| Option           | Modern Farmhouse                                                                             | Editorial Market                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Standard         | Existing Phase A/B appearance                                                                | Ruled typographic columns, geometric image/copy spread, divided CTA copy/action layout                    |
| Featured         | Spacious warm surfaces, larger italic headings, arched image treatment and ruled CTA surface | Stronger heading weight/scale, green text-story surface, orange image-spread rule and expanded CTA layout |
| Framed           | Inset surface with a soft rounded frame                                                      | Inset surface with geometric border and offset paper shadow                                               |
| Spacing          | Theme-specific compact or spacious homepage section padding                                  | Theme-specific compact or spacious homepage section padding                                               |
| Expressive scale | Larger homepage headings while retaining the selected font/palette                           | Larger, stronger editorial homepage headings                                                              |

Absent `homepageDesign` fields preserve the existing defaults. Balanced and Standard are explicit equivalents of those defaults. The controls do not replace Farmhouse palette, font, button or crop selections. No universal stylesheet was introduced. Editorial's original native markup/assets and Farmhouse's original content remain intact, and Harvest and legacy Farmhouse v1 were not converted.

Strict template validation prevents composition from being attached to protected page settings. The registry does not permit sections on Shop, product detail, cart, checkout or informational pages. Header/footer are not repeatable registry entries. Product, inventory, cart, checkout, customer and order authority remains unchanged.

The appearance service now extracts Image with Text references from Editorial composition, including hidden instances, and checks them alongside original Editorial artwork/category assets. Save, preview and publish use the existing PNG/JPEG, channel ownership, same-theme library-asset and exact storage-URL checks. Foreign assets, wrong-theme assets and mismatched URLs fail. The existing draft/published JSONB snapshots, template immutability, optimistic versions, tenant/channel checks, authenticated preview and atomic publication code remain in place.

No database migration or dedicated seeded account is needed. Both backend and frontend must run this additive contract before saving these new optional fields; an older application version cannot validate newer configurations after a code rollback.

## Files changed for this phase

Paths are relative to the named repository. Pre-existing Phase A/B work and unrelated modifications were not reverted or included as new Phase C work.

| Repository | Files                                                                                                                                        | Purpose                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Web        | `packages/theme/src/website-section-contract.ts`, `website-sections.ts`                                                                      | Theme eligibility, variant/design contracts, Editorial composition validation             |
| Web        | `packages/theme/src/editorial-market.ts`, `modern-farmhouse.ts`, `storefront.ts`                                                             | Optional settings, legacy order fallback, frontend schemas, preview selection IDs         |
| Web        | `packages/api/src/storefront-appearance.ts`                                                                                                  | Matching transport-only shapes                                                            |
| Web        | `apps/admin/src/WebsiteSectionManagement.tsx`, `HomepageDesignEditor.tsx`                                                                    | Extracted management/destination controls and semantic design fields                      |
| Web        | `apps/admin/src/FarmhouseEditor.tsx`, `EditorialMarketEditor.tsx`, `WebsiteTextSectionEditor.tsx`                                            | Shared management integration, preserved native panels, theme-aware media/variant choices |
| Web        | `apps/storefront/src/components/editorial-market/Home.astro`, `Text.astro`, `ImageWithText.astro`, `CtaBanner.astro`, `section-renderers.ts` | Unified composition and distinct static theme adapters                                    |
| Web        | `apps/storefront/src/components/modern-farmhouse/Home.astro`, `Text.astro`, `ImageWithText.astro`, `CtaBanner.astro`, `navigation.ts`        | Optional design/variant attributes and shared destination availability                    |
| Web        | `apps/storefront/src/components/website-section-navigation.ts`                                                                               | Presentation-independent safe destination helper                                          |
| Web        | `apps/storefront/src/styles/editorial-market.css`, `farmhouse-v2.css`                                                                        | Theme-specific variants, responsive layouts and homepage-only design presets              |
| Web        | `tests/website-sections.test.tsx`, `tests/editorial-market.test.tsx`, `scripts/test-website-sections-ssr.ts`                                 | Focused editor, contract, serialization and SSR coverage                                  |
| Web        | `docs/STOREFRONT_BUILDER_PHASE_C.md`                                                                                                         | This single implementation report                                                         |
| Backend    | `src/plugins/platform-identity/website-section-contract.ts`, `editorial-market-settings.ts`, `modern-farmhouse-settings.ts`                  | Mirrored contract and strict template validation                                          |
| Backend    | `src/plugins/farmers-market/services/storefront-appearance.service.ts`                                                                       | Editorial repeatable-image authorization                                                  |
| Backend    | `test/farmers-market/website-sections.ts`                                                                                                    | Both-theme validation and service lifecycle qualification                                 |

## Automated verification

From `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/website-sections.test.tsx tests/farmhouse-v2.test.tsx tests/editorial-market.test.tsx tests/website-library.test.tsx tests/storefront-appearance.test.tsx --reporter=dot
npx tsx scripts/test-website-sections-ssr.ts
npm run typecheck --workspace @market/storefront
npm run build --workspace @market/admin
npm run build --workspace @market/storefront
```

- Focused frontend selection: 69 tests passed across five files. Coverage includes legacy defaults, mixed order and original invariants, limits/IDs, theme/page eligibility, strict variants/design, shared picker/actions, Editorial media selection and native panels, native movement/visibility, and both themes' preview messages, undo/redo, drag/drop, duplication/deletion, save/reload and explicit publication. Both themes are covered through Website Library save/publish transport serialization.
- Actual Astro homepage SSR: passed for both themes. Checks include original Editorial order/artwork, interleaving, all three variants, distinct adapter structures, design attributes, hidden sections, escaping of copy/alt text, disabled destinations, rejection of protected destinations and no added section hydration. Temporary compiled modules are removed by the existing helper.
- Astro typecheck: 205 files, zero errors, warnings or hints.
- Admin and storefront production builds: passed, with existing large-chunk warnings.
- Focused ESLint and Prettier checks: passed for the changed web sources/tests/styles. The backend test was formatted and the canonical contract copy remains byte-identical through the parity assertion.
- Root `npx tsc --noEmit --pretty false`: still reports 20 unrelated diagnostics in LoyaltyDashboard, table-navigation and existing application/market/layout fixtures. No diagnostics remain in Phase C files. These pre-existing failures were not repaired.

From `E:\coding\farmers-market-platform`:

```powershell
npx ts-node --project test/farmers-market/tsconfig.json test/farmers-market/website-sections.ts
$env:APP_ENV='dev'
$env:NODE_ENV='development'
npm run build
```

The backend validator/service test passed. It covers both themes, strict composition/variant/design values, protected page rejection, existing defaults, section-image validation even when hidden, foreign/missing/wrong-MIME/wrong-theme assets, mismatched URLs, authorized theme assets, save/preview/publish, stale versions, permission changes and published-snapshot isolation after draft changes. The test uses actual validators and service methods with in-memory repository boundaries; it does not claim PostgreSQL transaction-isolation qualification. Backend dashboard/server/worker builds passed.

No full regression suite, browser automation, screenshots or visual sweeps were run. The disposable database website integration harness was not rerun: its previously documented unrelated `ProductVariant.customFieldsCatalogdetails` fixture issue remains outside this phase. The populated test database was not used by these checks.

## Manual testing in the existing environment

Use the existing `vendure_demo_market_ops` database and existing vendor credentials. No migration or fixture command is required. Start or restart the matching processes from the web directory in separate terminals:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. On a desktop browser, sign in to the existing vendor account, select its vendor channel and open `http://localhost:4322/vendor/storefront`. For Manna Roots use its existing account and current credentials. Record the Live website ID/name and open Visit Website in a separate tab as a baseline.
2. Click New Website. Choose Editorial Market, give it a name such as `Phase C Editorial draft`, and click Create Website. Open that separate draft. Do not edit Manna Roots' existing live website during preparation.
3. On Homepage, verify the four original section rows are present. Select Hero and inspect its copy and desktop/mobile artwork. Inspect category settings, product selection and impact artwork. Existing theme assets remain selectable through Theme Images; no asset import is required.
4. Use Add Section to add Text, Image with Text and Call-to-Action Banner. Author comparable content in all three. For the image section choose a normal owned image or existing Editorial theme asset, set alt text, button label/destination, left/right image position and image size. No arbitrary URL, CSS or HTML input should be exposed.
5. Drag the rows into Hero, Text, Categories, Image with Text, Featured products, CTA Banner, Community impact. Check the before/after drop indicator and resulting preview order. Cancel a drag outside the list and confirm the order stays intact. Use Move Up/Down and the grip's Up/Down arrow keys too; check the disabled first/last boundaries.
6. Move an original section and hide/show Categories, Featured products and Community impact. Confirm native settings and artwork survive. Hero remains visible, and none of the four originals offers duplicate/delete. Header/footer stay outside the repeatable list.
7. Duplicate each reusable type, edit the copy and confirm the source is unchanged. Hide/show a copy. Open Delete section and dismiss the confirmation once, then confirm deletion. Undo/Redo addition, copy edits, reordering, visibility, duplication and deletion. One Undo should reverse one completed drag.
8. For each reusable section choose Standard, Featured and Framed under Presentation. Check that alignment changes retain the selected variant. Check the image's two sides and three sizes, and CTA destinations. Enable a destination page before testing its link; buttons for disabled informational destinations are intentionally omitted.
9. Open Homepage design. Try all spacing settings and both typography scales. Confirm the changes are confined to the homepage. Reset to Balanced/Standard to compare the default native Editorial styling.
10. Inspect Desktop, Tablet and Mobile preview widths. Check text wrapping, image stacking, framed insets, CTA readability and the existing artwork's responsive sources. Editing stays desktop-only; the viewport controls preview the responsive storefront rather than enabling mobile editing.
11. Click Save draft and reload the same draft website. Confirm explicit order, content, images, variants, visibility and homepage design persist. Confirm the library still identifies it as a draft and that unsaved edits disable Publish saved changes.
12. Return to Website Library. Create or open a separate Modern Farmhouse v2 draft, such as `Phase C Farmhouse draft`. Add the same three types with comparable content and the same photograph, then compare Standard/Featured/Framed. Its warm typography, arched featured image, rounded framing and Farmhouse CTA should differ from Editorial's columns, geometric image spread, strong heading treatment and divided banner. Existing Farmhouse palette and typography selections must still work.
13. Refresh the public baseline tab and confirm its live content and website selection remain unchanged after draft edits, preview, saving and reload. Existing Harvest and older Farmhouse websites require no conversion; inspect them only through their existing routes if available.
14. Browse Shop and product views in the editor, and the existing cart/checkout routes if needed. No Add Section, homepage reorder/duplicate/delete or structural listing controls should appear there. The new homepage design presets must not change those pages. No test purchase is required.

Publishing is optional and intentionally replaces the selected storefront's current live website with the chosen draft. Separate draft websites in one vendor library share the vendor's public address, so a separate draft alone does not isolate publication effects. To preserve Manna Roots' publication, stop at draft verification or intentionally publish only on an existing local test storefront with no live website.

If deliberately testing a temporary live switch, record the original Live website ID/name and review its saved draft first. Save the new draft, explicitly click Publish saved changes and inspect the public storefront. Save another draft change without publishing and confirm public content stays on its published snapshot. Restore the original only after reviewing its saved draft, since publishing it publishes its current saved draft, including any prior unpublished changes. This implementation performed no such switch.

## Known limitations and deferred work

Visual polish and actual desktop drag behavior still need the manual checks above. Automated checks establish renderer structure and behavior, not a screenshot comparison or a human judgment of visual quality. Service tests preserve the database by using in-memory repositories, and the unrelated disposable-integration fixture limitation remains.

This phase supports only the existing three flat repeatable homepage types on the two registered versions. Hero remains a required visible Editorial original. The twelve-additional-section budget is shared across types. Design controls remain curated enums and are homepage-scoped. No new theme, Harvest conversion, market Website Library, informational-page composition, mobile editor, theme switching/content transfer, nested layout, additional section type, arbitrary code, AI generation, commerce structural editing or unrelated UI/infrastructure migration was implemented.
