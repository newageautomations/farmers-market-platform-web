# Storefront builder Phase A

Implemented locally on November 8, 2026, in the web repository and the specifically authorized related backend files. No deployment, publishing, seeding or persistent test database changes were performed. No migration is required.

## Implemented behavior

Modern Farmhouse v2 homepages now support up to twelve repeatable Text sections alongside the original six sections. Vendors can add, edit, align left/center/right, move up/down, hide/show, duplicate and confirm deletion. The existing editor history, draft save, authenticated preview and explicit publishing workflow carry the new sections.

Text sections render in the actual Astro homepage, without additional hydration. The renderer preserves plain-text line breaks, escapes markup, uses the theme's existing spacing, typography and colors, and bounds the text width within responsive gutters. The original six render branches, content fields, visibility settings, featured products and section requirements remain intact.

## Architecture and compatibility

- `packages/theme/src/website-section-contract.ts` is the canonical dependency-free contract and declarative manifest. It identifies type/version, supported theme/version and page, repeatability, limits, defaults, editor adapter and renderer adapter. The API holds a byte-identical copy. A focused test compares them; neither application imports the other repository at runtime. Update the canonical file, copy it to the backend, and rerun the parity test when changing the contract.
- A Text instance is `{ id, type: 'text', version: 1, visible, content: { heading, body }, presentation: { alignment } }`. IDs occupy the `text-` namespace and are unique across the entire homepage composition. Heading/body limits are 160/1200 characters. Every object rejects unknown properties; field types, versions, IDs, control characters and alignments are validated. Text is escaped content, never interpreted HTML, CSS or executable code.
- `website-sections.ts` wraps validation for Zod consumers, exposes the registry/default factory and supplies an immutable reorder operation. Editor controls and Astro renderers are separate static adapter maps selected through the manifest. A later theme can supply materially different markup without changing Text's meaning or creating a universal conditional renderer.
- The existing `settings.sections` array is the only serialized order. It accepts the unchanged original objects plus new versioned instances. The original six IDs must each exist exactly once and cannot be duplicated or deleted through the editor. Their relative position is still vendor-controlled. There is no second list or stored-record rewrite.
- Existing template/settings version 2 remains compatible with six-section records. New sections have their own version. Legacy Modern Farmhouse v1, Harvest and Editorial Market are not converted. Other page editors retain their existing specialist contracts.
- The architecture allowlist currently permits registered Text sections only on Modern Farmhouse v2 `home`. Unknown types/themes/versions/pages fail closed. No product detail, cart, checkout or product listing component is registered. Strict template/page shapes reject alternate compositions on protected pages. Future informational-page support requires explicit page contracts and renderer registration; the page picker alone grants no editability.
- Draft and published JSONB snapshots, optimistic website versions, publication generations, atomic publishing, tenant/channel ownership, asset/product validation and host-scoped preview capabilities remain with their existing services. Reference extraction ignores Text because its strict contract cannot contain product or asset references. Existing referenced content retains its authority checks.
- The API package retains a small transport-only structural type because its package boundary does not allow importing the theme package. Editor calls and focused transport tests check compatibility with the shared theme shape.
- No new database columns or migrations are needed. Both applications must understand the additive contract before new snapshots are used. Rolling application code back to validators that require exactly six sections would reject newer snapshots; this pilot does not implement backward application-version rollback conversion.

## Files and systems changed

Paths below are relative to their respective repository roots.

| Repository | Files                                                                                                                                           | Purpose                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Web        | `packages/theme/src/website-section-contract.ts`, `website-sections.ts`                                                                         | Shared versioned definition, validation, manifest, defaults, allowlists and reorder helper |
| Web        | `packages/theme/src/modern-farmhouse.ts`, `storefront.ts`                                                                                       | Compatible mixed composition and safe preview-selection IDs                                |
| Web        | `packages/api/src/storefront-appearance.ts`                                                                                                     | Transport shape for Text instances                                                         |
| Web        | `apps/admin/src/FarmhouseEditor.tsx`, `WebsiteTextSectionEditor.tsx`                                                                            | Existing section management extended with Text controls and confirmation                   |
| Web        | `apps/storefront/src/components/modern-farmhouse/Home.astro`, `Text.astro`, `section-renderers.ts`                                              | Real SSR dispatch and theme-specific Text presentation                                     |
| Web        | `apps/storefront/src/pages/index.astro`                                                                                                         | Collect featured-product references from retained original sections                        |
| Web        | `apps/storefront/src/components/modern-farmhouse/Shop.astro`                                                                                    | Type narrowing for the existing shared opening photo; no product listing behavior change   |
| Web        | `tests/website-sections.test.tsx`, `tests/farmhouse-v2.test.tsx`, `scripts/test-website-sections-ssr.ts`, `scripts/test-storefront-homepage.ts` | Focused verification and union-type compatibility in existing checks                       |
| Web        | `docs/STOREFRONT_BUILDER_PHASE_A.md`                                                                                                            | This report                                                                                |
| Backend    | `src/plugins/platform-identity/website-section-contract.ts`, `modern-farmhouse-settings.ts`                                                     | Identical shared contract and bounded homepage validation                                  |
| Backend    | `src/plugins/farmers-market/services/storefront-appearance.service.ts`                                                                          | Preserve reference validation for original sections in a mixed composition                 |
| Backend    | `test/farmers-market/website-sections.ts`, `website-library.ts`                                                                                 | Isolated service/contract tests and real-database lifecycle regression assertions          |

The new editor adapter composes existing Field, Input, Textarea and SelectField controls. Management reuses the current disclosure/sidebar, Checkbox switch, Button/IconButton and Dialog confirmation pattern. The Astro adapter is necessary because the existing Our Story renderer owns a different page controller and section shape; Text reuses theme presentation without importing that controller or introducing a UI primitive. No shared UI standard was changed. Unrelated concurrent workspace changes were left alone.

## Automated verification

Run web commands from `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/website-sections.test.tsx tests/farmhouse-v2.test.tsx tests/website-library.test.tsx tests/editorial-market.test.tsx tests/storefront-appearance.test.tsx --reporter=default
npx tsx scripts/test-website-sections-ssr.ts
npm run typecheck --workspace @market/storefront
```

Results: the five-file frontend selection passed 45 tests, then the added undo/redo/save/publish test passed with the Text test file at 20 tests, for 46 covered frontend tests in total. The actual homepage SSR check passed. Astro checked 198 files with zero errors, warnings or hints. Focused ESLint passed on all changed web source/test files. Prettier was applied to changed web files and the new backend service test. Tests emitted no screenshots or retained verification artifacts; the SSR helper removes its temporary compiled modules.

Coverage includes old six-section compatibility, repeated/interleaved instances, IDs, limits, strict unsafe-property/type rejection, page/theme allowlists, add/edit/duplicate/reorder/hide/confirmed-delete controls, immutable content, history, explicit draft-before-publish gating, scoped transport serialization and contract parity. SSR asserts order, visibility, alignment metadata, paragraph preservation, escaped markup and absence of Text hydration.

Run backend commands from `E:\coding\farmers-market-platform`:

```powershell
npx ts-node --project test/farmers-market/tsconfig.json test/farmers-market/website-sections.ts
$env:APP_ENV='dev'
$env:NODE_ENV='development'
npm run build
```

Both passed. The focused backend test uses the real validators and appearance service with in-memory repository and permission-policy boundaries. It verifies unchanged defaults, rejected unsafe/protected-page settings, snapshot separation, stale versions/publication generations, and preview token/host/expiry/current-permission/deleted-website rejection. It verifies service control flow, not PostgreSQL atomicity or the underlying permission-policy implementation. The build successfully compiled the Vendure dashboard, server and worker. Initial build attempts without both explicit local environment settings failed the existing `APP_ENV_EXPLICIT_MODE_REQUIRED` guard.

Broader check limitations, left outside this feature:

- `npx tsc --noEmit --pretty false` reports 20 unrelated diagnostics in LoyaltyDashboard, table-navigation and existing application/market/layout test fixtures. No diagnostics remain in the changed feature files.
- `npx tsx scripts/check-boundaries.ts` stops at the existing undeclared `@market/config` import in `packages/ui/src/ApplicantApplications.tsx`.
- Backend `npm run test:storefront:websites` reached its guarded disposable database after sandbox access to loopback PostgreSQL was allowed, but failed during existing fixture setup because `ProductVariant.customFieldsCatalogdetails` is missing. It did not reach the new database assertions. The harness retained failed database `vendure_test_websites_1794182426250_1f9b13` according to its normal failure policy. The populated `vendure_demo_market_ops` database was not used or changed. No fixture/schema repair was made.

No complete frontend/backend suites, browser automation, screenshot tests or viewport sweeps were run.

## Manual testing in the populated environment

Manual browser verification remains for the developer. Use a desktop browser for editing. From the web directory, start each process in its own terminal, or reuse the already running matching demo processes:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

These guarded demo commands select `vendure_demo_market_ops`. No migration or seed command is needed for Phase A.

1. Sign in with the existing Manna Roots vendor account, `manna-roots@example.test`, using its current credentials. Select its vendor channel and open `http://localhost:4322/vendor/storefront`. Use the owner account or an existing account with storefront-management permission. Willow & Grain's existing `homepage.vendor@example.test` account at the same admin route is an alternative if its storefront fixture already exists; do not run a seed to create it.
2. Record the current Live website's name and publication date. Open Manna Roots' existing public storefront at `http://manna-roots.localhost:4321/`, or the Live card's Visit Website link. Note its heading, content/order and visible products. Keep it open separately from the editor.
3. Click New Website, name it `Phase A Text draft`, choose Modern Farmhouse and click Create Website. This creates a separate draft with starter content. Do not edit, duplicate over or publish the existing Live website. The editor URL includes `storefront` and `website` query parameters; retain those instance selections.
4. On Homepage, click Add Text section. Edit Heading and Body text, including two paragraphs, and choose Alignment. Add another Text section. Move them up/down between the original sections. Confirm duplicate copies content into a different independently editable instance. Toggle Enabled off/on. Delete a Text section through its confirmation, and verify Undo/Redo. The original six sections have no duplicate/delete controls.
5. Inspect the authenticated real-route preview in the existing iframe. Confirm order, heading, paragraphs, alignment and hidden state. Its Mobile preview remains available; editing stays desktop-only. The other page views must not expose Add Text section or structural commerce controls.
6. Click Save draft. Reload this exact website editor and confirm order, IDs/content, alignment and visibility survived. The separate public tab and original Live card must still show the original publication. Unsaved changes disable Publish saved changes. Changes in a draft or preview must never publish implicitly.
7. Publishing is an intentional change to the selected storefront's public site. Perform this step only when ready to temporarily switch the local storefront: save the pilot draft, then click Publish saved changes. Refresh the public storefront outside the iframe and verify the Text sections match the saved composition. The pilot is now Live and the previous website remains in the library. This task did not perform that switch automatically.
8. Edit and save another Text heading without publishing. Refresh the public storefront and verify it still shows the published heading. The editor preview should show the new draft heading. Verify the original website still exists with its prior published snapshot; do not republish an original website with unreviewed unpublished changes as a restoration shortcut.

To leave the current populated site's public state completely unchanged, stop after step 6. The isolated automated service tests cover publishing without switching that site's Live website. A same-storefront publish necessarily changes which website is live; it cannot simultaneously preserve the original website at that public address.

## Limitations and next phase

Only Text on the Modern Farmhouse v2 homepage is registered. Sections are flat, bounded and plain text; there is no rich text, arbitrary styling, nesting, theme conversion, AI or mobile editor. Existing original sections are retained as compatibility objects rather than migrated into the new instance shape. Other themes and informational pages are intentionally not converted.

The next separately authorized phase can extend the same registry to selected informational pages and a second theme, add the appropriate theme adapters and compatibility rules, and decide whether a generated schema artifact should replace contract copying at larger scale. Preserve explicit commerce exclusions, the existing snapshot/preview authority boundaries and desktop-only editing. Repairing the existing disposable integration fixture is separate work before rerunning its full website lifecycle qualification.
