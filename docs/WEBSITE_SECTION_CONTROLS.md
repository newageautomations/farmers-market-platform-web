# Website section controls

Implemented locally on November 9, 2026 for authored Text, Image with Text and Call-to-Action Banner sections in Harvest, Modern Farmhouse version 2 and Editorial Market. The same adapters serve the homepage and informational page regions. Native commerce and account sections keep their existing controllers.

Overlay rules previously forced text to the center, regardless of the selected vertical alignment. Internal spacing changed column gaps in some themes and content gaps in another. Dark backgrounds forced a secondary button even when the block explicitly selected primary. Editorial Market also targeted a secondary class that the shared Astro Button does not emit. The updated shared geometry contract honors the selected settings with either stylesheet order, while each theme retains its presentation. Framed overlays draw their frame inside the photograph so that full-width layout does not hide the selected presentation.

## Sizing and saved compatibility

Section inspectors now include sliders for heading, paragraph and button scale where applicable, text content width, minimum section height, content spacing and padding. Image with Text includes image height and image column width. The image inspector reuses those dimensions, and individual heading, paragraph, eyebrow and button blocks have percentage sliders. Image width is omitted in background mode, where the photograph fills the section. Images still stack before copy on mobile. Explicit padding is bounded to the mobile viewport so maximum settings can wrap without horizontal clipping.

Sizes are optional bounded integers in `presentation.sizing`; per-block text/button sizing is `presentation.scale`. Text remains escaped, routes stay constrained, and image ownership validation is unchanged. No arbitrary CSS is accepted. Existing standard/large text presets and section presets remain valid when reading saved data. Changing the column or internal spacing preset clears the corresponding numeric override. Reset sizes restores the inherited theme values. The existing full-draft history, preview, save, reload and explicit publication lifecycle carry the added values.

The dependency-free validation contract is byte-identical in the web and backend repositories. The user explicitly authorized that matching local backend update. No database schema change, migration, seed, publication or deployment is required or performed.

## Local files changed for this task

- `apps/admin/src/TextSizeControls.tsx`, `WebsiteSectionSizingEditor.tsx`, `WebsiteTextSectionEditor.tsx`, `WebsiteBlockEditor.tsx`: reuse native range fields and extend the existing inspectors.
- `packages/theme/src/website-section-contract.ts`, `website-section-styles.ts`, `website-sections.ts`: bounded saved settings and shared renderer presentation helpers.
- `packages/api/src/storefront-appearance.ts`: matching independent transport shapes.
- `apps/storefront/src/components/{home,modern-farmhouse,editorial-market}/{Text,ImageWithText,CtaBanner}.astro`: apply the shared settings through the existing theme adapters. Image with Text uses the same effective blocks for legacy and block content without rewriting saved records.
- `apps/storefront/src/styles/website-sections.css`: section-scoped sizing, alignment, spacing, contrast and responsive geometry.
- `tests/website-sizing.test.tsx`, `tests/website-blocks.test.tsx`, `scripts/test-website-sections-ssr.ts`, `scripts/website-section-browser-checks.ts`: validation, editor lifecycle, real SSR and browser style checks.
- `COMPONENT_USAGE_GUIDE.md` and this report: document reuse and verification.
- Backend: `E:\coding\farmers-market-platform\src\plugins\platform-identity\website-section-contract.ts` only.

## Verification

85 focused unit/editor tests pass. The backend section suite passes with in-memory repositories. The SSR script verifies legacy and composed homepages, every supported theme/page combination, escaping, protected content order and enabled-page boundaries. Its optional browser mode passes 252 checks of actual component output with production styles for presentations, alignment, spacing, button variants, numeric sizing, individual block scale, both stylesheet orders, page-region wrappers, tablet/mobile widths and maximum mobile sizes. Frontend and backend builds pass, the storefront Astro check reports zero errors, and the modified TypeScript/Astro files pass targeted ESLint. The backend build uses the explicit local `APP_ENV=dev` and `NODE_ENV=development` settings required by its configuration guard.

The broad root TypeScript check still reports unrelated errors in LoyaltyDashboard, table navigation and existing application/layout test fixtures. The existing Farmhouse global-settings regression test also fails looking for Palette after opening Theme settings; this task does not modify those global controls. These checks are not claimed as passing.

Run from `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx vitest run tests/website-sizing.test.tsx tests/website-blocks.test.tsx tests/website-sections.test.tsx tests/storefront-visual-editor.test.tsx tests/editorial-market.test.tsx
npx tsx scripts/test-website-sections-ssr.ts --browser
npm run build
```

The browser check uses an installed Playwright Chromium, with local Edge as a fallback, and aborts network requests. On this Windows machine the browser check required running outside the execution sandbox with `PLAYWRIGHT_BROWSERS_PATH` set to `C:\Users\jake_\AppData\Local\ms-playwright`.

For manual testing, restart the local backend to load its updated validator, and refresh the editor. Use the existing demo scripts in separate terminals as needed:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

No migration or fixture command is needed. Existing saved test data is preserved.
