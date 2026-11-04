# Guided product creation

Slug inputs accept lowercase letters, digits and hyphens, convert spaces to hyphens as entered, discard unsupported characters and cap input at 120 characters. Submission also requires valid path segments. The preview explains theme-dependent visuals, uses 75% of the available width, and places the option selector above Quantity and the information disclosures beneath Add to cart within the purchase column. Its toolbar places Add variant before the first variant edit action and lists every saved variant's Edit action and an Add variant action, independently of the selected preview variant.

Product photos use the existing authorized asset library. The sibling backend's `src/plugins/marketplace-commerce/vendor-categories.ts` previously rejected every upload with `CATEGORY_PRESENTATION_IS_UNAVAILABLE_IN_PHASE_A`. Its upload method now checks vendor catalog access, PNG/JPEG MIME and file signatures, and the 10 MiB bound before creating an asset with the current request/channel context. Centrally managed category writes remain restricted. `test/product-taxonomy/product-image-upload.ts` qualifies successful upload, content/type/size rejection and access denial without a database. Restart the backend through `npm run demo:market-operations:serve` from the web folder to load this change; no migration is required.

Product creation now follows basic details, variants, preview and publication. It uses existing catalog commands and the product's existing enabled flag. No schema change or migration is required.

On `/vendor/products/new`, the shared heading InfoTip explains that variants and prices come next. Next includes the existing arrow icon, stays disabled until native and domain validation pass, and pulses a translucent ring when enabled. Reduced-motion preferences disable the animation. Existing category requirements still apply. Next creates a disabled product and opens `/vendor/products/:id/setup/variants/new`. The creation history entry becomes the saved details route so Back can reopen the completed first step.

The initial variant form explains variants through the existing InfoTip. Additional variant saves the current variant and opens an empty variant form. Publish product saves the current variant and opens `/vendor/products/:id/setup/preview?variant=:variantId`. Neither action enables the parent product. Existing metadata, pricing, photo, tax, option and production-cost commands retain their validation and ownership boundaries. Creating with a production cost still uses the existing transactional command; editing retains separate metadata, price and cost writes and partial-save reporting.

The preview selects the just-saved variant and displays its price, description, ordered photos and enabled information sections. Switching variants updates the visual and Edit action. Edit Product and Edit [variant name] return to the existing forms and Save and preview returns to the selected variant. Only the final Publish enables the product, after at least one enabled variant exists. Backend category and publication rules remain authoritative. Initial-setup actions are absent from ordinary variant creation and from setup URLs for an already enabled product.

The preview is an administrative React renderer adapter because the public Astro route cannot display disabled, privately authorized products. It composes approved Button, Field, Input, Select and disclosure presentation. `@market/ui/harvest-product.css` is extracted from the existing storefront product stylesheet and is consumed by both renderers; shared Harvest theme tokens provide the basic palette and typography. There is no public session, purchase controller, market selector, storefront header or footer in the preview. The existing dashboard shell remains around the workflow. This feature adapter introduces no new primitive, UI library or design standard.

Product and variant forms opt into `CommandForm` validity gating and unsaved-progress protection. The form observer includes serialized photo, category and information changes. Before unload uses the native browser leave/reload notification; page arrows, internal links and browser history use native confirmation. Cancel keeps the mounted form and values. Saved transitions clear the guard. AdminShell asks the guard before updating a route, preventing earlier history listeners from unmounting the form before it can veto navigation. Failed or uncertain commands preserve input and existing retry restrictions.

## Local files

- `apps/admin/src/vendor/catalog.tsx`: guided creation, scoped setup actions, saved-step history and help bubbles.
- `apps/admin/src/vendor/ProductSetupPreview.tsx`: authorized Harvest preview composition and final publication.
- `apps/admin/src/vendor/common.tsx` and `useFormProgress.ts`: opt-in validation, native submitter intents and leave protection.
- `apps/admin/src/vendor/VendorRoutes.tsx`, `apps/admin/src/AdminShell.tsx` and `packages/admin-core/src/index.ts`: setup routes, permission checks and navigation veto.
- `apps/admin/src/vendor/product-editor.css`: scoped preview layout and ready-state pulse.
- `packages/ui/src/harvest-product.css`, its package export and `apps/storefront/src/styles/product-details.css`: shared existing Harvest product presentation.
- `tests/product-setup.test.tsx` and `scripts/check-product-setup.mjs`: workflow and browser qualification. `tests/vendor-tax.test.tsx` follows the current action labels and readiness gating.
- `COMPONENT_USAGE_GUIDE.md`: reuse and behavior documentation.

## Verification

Focused tests cover required inputs/category, disabled draft creation, additional variants, preview changes, editing, publication, unsaved native/history navigation, photo-only changes, uncertain saves and permission/initial-setup boundaries. The browser script runs the full flow at 1600, 768 and 390 pixels with in-memory services and blocks API/external requests. It verifies the actual browser Back and before-unload dialogs, help bubbles, pulse and absence of horizontal overflow. Screenshots are written under ignored `test-results/product-setup`.

From the web folder:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
npx vitest run tests/product-setup.test.tsx tests/variant-editor.test.tsx tests/vendor-catalog.test.tsx tests/vendor-tax.test.tsx
npm run build --workspace @market/admin
npm run build --workspace @market/storefront
```

For Chromium qualification, use the existing local admin server or start it with `npm run demo:market-operations:admin`, then run `node scripts/check-product-setup.mjs`. If the sandbox redirects Playwright's browser directory, set `PLAYWRIGHT_BROWSERS_PATH` to the installed local browser directory first. The temporary fixture entry is removed after each run and no database records are written.

All 45 focused tests, both frontend builds, scoped ESLint and formatting checks pass. Chromium qualification passes at all three widths. The repository TypeScript check retains 11 unrelated errors in application-review/market test fixtures and an occurrence-layout test. The broader admin suite retains its existing Sign in versus You are signed out assertion failure. The boundary checker retains an unrelated undeclared `@market/config` import in `packages/ui/src/ApplicantApplications.tsx`.

For manual testing, no database migration command is needed. Use the existing demo environment scripts and open Add product from Products & Inventory.

## Product identity and category picker refinements

Variant-table actions share a right-aligned flex row and a content-sized actions column. The editable table uses automatic column sizing, with no reserved fixed action width; only normal cell padding remains at the right edge. A named container query switches Edit variant to the existing edit UtilityIcon and Adjust stock to + Stock below 720px of panel width, before allowing wrapping below 360px. The single mounted buttons retain their accessible labels, navigation, stock confirmation and disabled states. Edit help reuses Tooltip, and the compact edit action consumes the shared control-height token. This is scoped responsive presentation, with no new primitive. The fixture browser check verifies full/compact visibility and action alignment at desktop/tablet/mobile widths.

ProductIdentityFields composes the existing Field/Input controls because TextField has no controlled dependent-value contract. New product names generate the slug until it is manually edited. Existing product slugs stay stable during renaming. Product and variant slug fields reuse InfoTip with the address-bar explanation.

The category dialog reuses native disclosure cards, Radio and CategoryIcon. Root category cards use a two-column grid, stacking on narrow screens; only root categories display artwork. Leaf labels keep radios beside their text with scoped hover/focus feedback. The organization action displays the selected category while retaining its Choose category accessible name.

Text limits across the flow are 200 for product/variant names, SKU and category search; 120 for slugs; 10,000 for description; 100 for information section titles; 8,000 for information contents; 11 for price/cost input; and six for tax-rate entry, additionally constrained to 0 through 100. Existing shared tag searches cap at 200. File uploads retain their independent type and byte limits.

Latest qualification: 30 focused product/variant/tax tests, scoped ESLint, admin build and fixture-only Chromium checks at 1600/768/390 pixels. The broader taxonomy suite still has two stale expectations for historical tag labels and the former Create product/draft controls.
