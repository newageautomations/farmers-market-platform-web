# Vendor Our Story sections

Implemented locally in the existing vendor editor and `/about` Astro route. No deployment, remote Git operation, persistent database migration, seed, account change, or modification to `vendure_demo_market_ops` was performed.

## Page and layouts

The existing Harvest header and footer surround an editorial page at a narrower 68rem content width while the header and footer retain their existing width. There is no required hero. Vendors can add up to 12 storytelling sections, including repeated layouts:

- **Text Only:** optional heading and plain text with preserved paragraphs and line breaks, limited to a comfortable 68-character reading measure.
- **Image Only:** an authorized library image, alternative text, and the existing image shape.
- **Text + Image:** the same text and image controls, with image-left or image-right positioning. Desktop grid tracks stretch both outer columns to equal heights. Long text grows naturally without clipping; the image stays centered inside a square frame bounded by its selected size. Small, medium, and large use 16rem, 24rem, and 32rem frames and up to 30%, 45%, and 60% image-column shares, bounded by the displayed image and equal column padding. Mobile stacks the columns and bounds the chosen frame to available width, with a left-positioned image appearing first. Text and image columns share identical responsive padding. Text Only and Text + Image sections support left, center, and right alignment.

The shared shape CSS remains authoritative. About sections retain square, rounded square, circle, dome, star, and single rounded corner, and add Straight edges and Rounded options that preserve original image proportions. The new choices are enabled only for the About section adapter, leaving existing homepage shape choices unchanged. The square outer frame is bounded instead of competing with shared shape rules that intentionally remove image max-height. Cropped shapes use `object-fit: cover` and square dimensions. Proportional options use intrinsic image dimensions with automatic width/height, `object-fit: contain`, and the selected size as their maximum height; the iframe bridge removes square dimension attributes when switching to them. Images retain lazy loading and asynchronous decoding. Public empty sections and missing images are omitted; mixed sections with only text fall back to readable text. Incomplete and hidden sections remain visible and selectable only in the authorized editor preview.

## Editor management and reuse

Select **About page** in `/vendor/storefront`. It is selectable even when disabled, so the vendor can prepare its content before enabling it. Page settings expose the title. A green/red enabled/disabled switch sits beside Add Section, below the grouped Header, Footer, and Theme settings. The old full-page controls under Theme now link to this page editor. Homepage About controls remain independent.

**Add Section** opens the existing shared Dialog with exactly the three supported layouts. Adding appends a section above the fixed CTA and selects it. New sections and duplicates use UUIDs, independent of array position. Each storytelling section has up/down arrow buttons in a persistent left-side rail outside its disclosure, plus Duplicate, visibility, and Delete controls inside its settings. Delete uses the shared confirmation Dialog and only removes the draft reference, retaining its library asset. At 12 sections, Add and Duplicate are disabled with an explanation. Undo and Redo reuse existing editor history.

`AboutStoryEditor.tsx` is a feature composition, not another UI primitive or page renderer. Existing homepage settings could not represent repeatable, independently identified sections. It composes the existing Button, Field, Input, Textarea, Checkbox, SelectField, native disclosure presentation, Dialog, `ImageShapeField`, and `CategoryImageField`. The existing AdminShell remains in use. No UI library or parallel styling system was added.

The media picker supports an opt-in library dialog variant and an optional selected-image callback, preserving the existing inline product/category consumers. The sidebar shows only a selection trigger. The dialog displays image thumbnails, selection, No image, and the existing upload field; thumbnails, upload, and removal controls are absent from the visible sidebar. Library pages contain 100 images, with Load more images exposing additional vendor images through a bounded optional skip argument on the existing media query. The appearance API delegates to the existing vendor media API using the selected channel. Existing scanner, file validation, PNG/JPEG restrictions, asset storage, upload permissions, and library selection remain authoritative. Upload callbacks use the current edit handler and stop affecting a section after its picker unmounts. Removing a photograph never deletes its asset.

## Closing invitation

One permanent **Closing invitation** follows the storytelling sections and precedes the shared footer. It uses a compact horizontal theme-colored band across the content width, with copy left and a shared Astro Button right. Mobile wraps it vertically. Heading, optional supporting copy, button label, and destination are editable. Destinations are explicitly limited to Shop (`/products`) and Homepage (`/`). Defaults are the requested growing/shop invitation. It has no visibility, reorder, duplicate, or delete controls.

## Data and legacy preservation

The existing appearance JSON gains optional `about.sections`, `about.sectionsVersion: 1`, and `about.cta`. Each section contains `id`, `layout`, `heading`, `body`, `imageAssetId`, `image`, `alt`, `shape`, `imagePosition`, and `visible`, plus optional `textAlign` and `imageSize` presets. Missing alignment and size retain left/medium defaults without changing older records. CTA configuration is separate from the array.

Frontend and backend enforce the same limits: 12 sections, 64-character safe stable IDs, unique IDs, 160-character headings, 20,000-character section bodies, 200-character alt text, 2,000-character image URLs, the six existing cropped shapes plus two About-only proportional shapes, two positions, and exactly three layouts. CTA heading/supporting copy/label limits are 160/600/80. Appearance JSON is limited to 80,000 UTF-16 code units overall. HTML remains escaped text, with no HTML/CSS/script authoring controls.

Image references require a numeric asset ID paired with its image URL. Preview authorization, Save Draft, and Publish all verify the asset's vendor channel, supported image MIME type, and exact preview URL from the existing asset storage strategy. Invalid IDs, foreign assets, and mismatched URLs are rejected. The preview resolver forwards its request context for storage URL generation while ownership checks continue using the capability owner's context. Hidden sections are removed from the public appearance projection. Vendor section settings cannot be saved to a market storefront.

Existing full-page content is synthesized as one stable `legacy-story` Text Only section without writing any database data. Its complete title and body survive, including long legacy content. An absent or accidentally empty unversioned array falls back to that original text. Explicit section edits persist `sectionsVersion: 1`, distinguishing intentional deletion of the final section from accidental empty adoption. Original `about.content` remains stored and recoverable in draft and published records. Existing homepage About text, imagery, settings, and visibility are not copied or overwritten. The previous full About page had no image field, so there are no full-page legacy image references to transform.

An empty new storefront exposes one blank Text + Image starter with Straight edges in the editor. This does not enable the page or publish example copy or photographs. Existing disabled pages remain disabled publicly. Published enabled pages render the permanent invitation even when every storytelling section is hidden or intentionally deleted.

## Preview, save, publish, and security

The public renderer is Astro SSR. No React imitation or whole-page hydration was introduced. Stable `story:<id>` section attributes extend the existing editor selection bridge; unknown or stale incoming IDs cannot select nonexistent settings. Exact-window/origin messaging, capability checks, CSP, host binding, expiry, preview commerce blocking, and the existing navigation allowlist remain in place.

Heading/body text, alt text, shape, image position, CTA settings, and theme changes patch the current real Astro elements. Text uses `textContent`. Structural edits such as add, delete, order, visibility, and image replacement use the existing 300ms debounced POST to Astro. The iframe's document is replaced by that existing render mechanism; the editor remains mounted with its unsaved state, selection, and same-page scroll. Structural edits do not require a dashboard navigation or a build.

Save Draft persists validated configuration using the existing optimistic version. Public pages continue using the published version. Publish remains disabled until local changes are saved, and revalidates owned image references before publishing. Configuration never bypasses backend ownership checks through the preview bridge. Disabled-page preview is private and does not change public visibility or navigation.

No database migration is required because the existing draft/published JSON columns store the additive fields. Do not run migration, seed, reset, or fixture commands for this feature.

## Local files changed

Web project:

- `packages/theme/src/storefront.ts`: shared section/CTA schemas, limits, compatibility adapter, section identities, and authoritative image shape values.
- `packages/api/src/storefront-appearance.ts`: optional additive types and existing channel-scoped media API delegation.
- `apps/admin/src/AboutStoryEditor.tsx`: section settings and management composition.
- `apps/admin/src/VisualStorefrontEditor.tsx`: About page selection/settings and trusted stable-ID selection.
- `apps/admin/src/vendor/categories.tsx` and `apps/admin/src/vendor/image-library.css`: existing inline media picker plus opt-in library dialog, paging, and protected upload lifecycle.
- `apps/admin/src/storefront-appearance.css` and `packages/ui/src/utility.tsx`: sidebar rails, the requested scoped switch, and shared arrow/chevron icons.
- `packages/api/src/vendor-categories.ts` and schema/provenance snapshots: optional bounded media paging; generated operation outputs refreshed with the normal codegen command.
- `apps/storefront/src/pages/about.astro` and `apps/storefront/src/styles/about-story.css`: public editorial rendering and responsive bounded layout.
- `apps/storefront/src/lib/editor-preview-client.ts` and `editor-preview-server.ts`: selection/content bindings and bounded Unicode form capacity.
- `tests/storefront-about-sections.test.tsx`, `tests/storefront-about-preview.test.ts`, and `scripts/test-storefront-homepage.ts`: targeted editor, bridge, and real HTTP SSR coverage.
- This report.

Backend project, explicitly authorized during this task:

- `src/plugins/platform-identity/storefront-appearance-config.ts`: strict additive validation and public hidden-section projection.
- `src/plugins/farmers-market/services/storefront-appearance.service.ts`: preview/save/publish asset checks.
- `src/plugins/farmers-market/api/storefront-appearance.ts`: request context for preview image URL verification.
- `src/plugins/marketplace-commerce/vendor-categories.ts`: optional validated media-page offset while retaining vendor authorization and the 100-image page bound.
- `test/farmers-market/storefront-appearance.ts`: guarded disposable-database coverage.

## Automated verification

- All 40 focused frontend tests passed across eight suites. Coverage includes schema limits/invalid values, all layouts/shapes/positions, legacy and intentional-empty behavior, stable IDs, add/duplicate/reorder/hide/delete, media select/upload/remove, late upload races, trusted/stale selection messages, CTA restrictions, draft-save/publish sequencing, bridge updates and structural SSR, plus existing editor/media regressions.
- `npm run test:storefront:homepage` passed against a temporary local Astro server and fake backend. It verifies real public/preview HTML, layout/order/visibility, both image positions, shapes, escaping, shared shell, CTA placement, legacy/Unicode preservation, draft/public separation, and invalid capability/host/path/origin rejection. No database or browser is used.
- Backend `npm run test:storefront:appearance` passed using the established `freshTestDatabase` guard. It verifies persistence, optimistic versions, tenant/role isolation, valid/invalid section records, owned/foreign/missing assets, URL mismatch, public hidden-section filtering, and asset revalidation at Publish. Its successful `vendure_test_*` database was dropped by the harness. An earlier failed synthetic-storage qualification database was retained by the existing guard: `vendure_test_appearance_1792795438243_9fd530`. The populated demo database was never targeted.
- Frontend production build passed, with the existing large-chunk advisories. Backend server compilation passed using `npx vendure build server`.
- The full backend `npm run build` was attempted but its dashboard config loader stops at `APP_ENV_EXPLICIT_MODE_REQUIRED`: Vite's production build mode conflicts with a missing/non-production explicit application environment. Production environment configuration was not changed to run an unrelated dashboard build.
- `npm run typecheck` passed, including Astro checks over 118 files with zero errors, warnings, or hints. Focused ESLint, package/source boundaries across nine workspaces, and Prettier checks over the changed web files and this report passed.

## Exact manual testing

From `E:\coding\farmers-market-platform-web`, start or normally restart the existing demo processes in separate terminals as needed:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Use the existing `homepage.vendor@example.test` account at [the editor](http://localhost:4322/vendor/storefront). Its local password reference is `demoPassword` in backend `scripts/market-operations-demo/environment.ts`. Keep the dedicated vendor context selected. No setup command or new fixture is required. Do not use Manna Roots or market-manager accounts for this review.

1. Open [the public About page](http://homepage-vendor.localhost:4321/about) and the existing [homepage](http://homepage-vendor.localhost:4321/). Note the current text and homepage About settings before editing. A currently disabled About page correctly returns 404.
2. In the editor, select **About page**. Existing full-page text appears as an editable section. If there was no text, the blank Text + Image starter appears. Open **Our Story page**, keep a meaningful page title, and use the switch next to **Add Section** to enable the page if desired. This is still only an unsaved change.
3. Use **Add Section** to add Text Only, Image Only, and Text + Image. Each new section should immediately become selected. Edit headings and multiple paragraphs. The actual Astro preview should reflect edits while the public page remains unchanged.
4. In both image layouts, open **Section image** to select a thumbnail or upload a PNG/JPEG in the shared library dialog. For libraries over 100 images, use **Load more images**. Confirm the visible sidebar has no thumbnail, upload input, or Remove image action. Add meaningful alternative text. Try replacing and removing the image. Upload uses the existing scanner; an unavailable scanner should show the existing upload error without removing saved references.
5. Try square, rounded, circle, dome, star, and single rounded corner. Confirm all remain bounded. Switch a mixed section between image left and image right. Choose Small, Medium, and Large and confirm both the frame and its desktop column share change. Try all three text alignments and confirm the narrower page and consistent column padding. Add enough text to grow its desktop composition; verify no clipped copy or distorted images.
6. Duplicate a section. Confirm text, image, shape, position, and visibility are preserved independently. Move it up and down using the arrows outside the disclosure, including while its settings are collapsed. Confirm the selected content follows the same section rather than whichever section occupies its previous array index. Try Undo and Redo.
7. Hide a section, save a draft, and confirm its content remains in its settings. Re-enable it. Delete a section using the confirmation Dialog and confirm other sections and the media library image remain. At 12 storytelling sections, Add and Duplicate should be disabled.
8. Click sections directly inside Inspect preview and through the sidebar. Both should open the right settings. Browse mode should preserve its existing route/security restrictions. Test the desktop/tablet/mobile preview buttons and inspect the real storefront at desktop and narrow mobile widths.
9. Select **Closing invitation**. Edit its heading, supporting copy, label, and Shop/Homepage destination. Confirm it remains after the storytelling sections and before the footer, with no move/duplicate/delete controls.
10. Click **Save draft**. Reload the public About page and homepage: published content must remain unchanged. Reload editor settings and confirm the saved draft retains order, text, images, shape, position, visibility, and CTA. Publish the saved changes and confirm the public `/about` now reflects them.
11. Publish a hidden section and confirm its content is absent publicly, then re-enable and publish it. Delete every storytelling section and publish if testing a CTA-only page; the CTA must remain and the original legacy text must not unexpectedly reappear. Undo before saving if you want to retain the previous composition.
12. Disable the About page, save, and publish. Confirm the public route is unavailable and its navigation link disappears. Re-enable it and confirm saved sections return. Check that the homepage About component, header/footer, Shop, and another vendor's configuration retain their own existing behavior.

## Limits and deferred work

Exactly three section layouts and two safe CTA destinations are supported. No drag-and-drop builder, custom code, rich-text framework, new theme, new media system, or unrelated page redesign was added. Visual layout acceptance remains manual as requested; browser automation, screenshots, and visual comparisons were not performed. Existing media permissions/scanner availability and the current iframe SSR navigation mechanism remain prerequisites rather than new systems. No requested feature is intentionally deferred.

An encoding error while extending `scripts/test-storefront-homepage.ts` truncated that existing untracked script. Its previous exact source was not recovered. The script was reconstructed in place with the HTTP checks documented above and passed against the real Astro routes. This repair changes the test harness more broadly than the intended addition of About assertions, and prior assertions could have been lost during reconstruction.

## Preview 403 follow-up

The reported Add Section 403 was traced to the running demo backend having started at 2:51 PM on October 23, before the section schema changes. `demo:market-operations:serve` uses a long-running `ts-node` process without source watching, while Astro and the admin frontend reload their source. This left the frontend sending new section fields to an older backend validator.

The stale backend was restarted through the web directory's approved `demo:market-operations:serve` script. Startup verified the existing populated demo schema and explicitly served without migrations. A read-only API health request passed. Existing preview capabilities are process-local, so use **Reconnect preview** or reload the editor after a backend restart. Local startup output is in ignored `.runtime/storefront-preview-backend.out.log` and `.runtime/storefront-preview-backend.err.log`.

The guarded backend appearance test now explicitly submits a newly added blank section of each layout through real preview authorization, before any text or image is chosen. This covers the exact initial Add Section draft state in addition to the existing filled-section cases.

## Sidebar and layout controls follow-up

The requested red/green page switch is a feature-scoped presentation of the existing Checkbox with native switch semantics, explicit enabled/disabled text, and shared success/danger/focus tokens. This implements the developer's specific request without approving the pending universal switch category. No existing visual switch or image-grid modal was available. The image dialog extends the existing media field and uses the shared Dialog and Buttons instead of adding an independent picker lifecycle. The existing library authorization, scanning, asset storage, and upload errors remain in place.

Alignment and image-size controls patch the actual Astro preview immediately, and persist through the existing strict backend validation, Save Draft, and Publish. The optional media-page offset is restricted to safe integers between 0 and 100,000. Pages retain a 100-image bound and vendor-channel filtering. Focused tests cover library paging and sidebar-only controls, collapsed reorder actions, switch placement/state, alignment/size persistence and preview attributes, invalid presets, and scoped backend media pages. The HTTP-only Astro harness verifies all nine combinations of alignment and image size. Backend schema changes require restarting the existing demo API and reconnecting the preview; no database migration is needed.

Opening a sidebar settings disclosure increases the desktop sidebar from 300px to 450px, expanding to the right and giving the preview the remaining width. Closing the last open disclosure restores its original width. The grid transition and settings-content opening animation share the same 180ms duration and ease-out curve. This applies to both ordinary and expanded editor views; the existing single-column layout at 900px and below remains in place. Reduced-motion preferences disable both animations. For manual review, open and close Header, Theme settings, and a story section, switch directly between sections, and repeat in expanded preview mode.

## Mirrored spacing, compact controls, and section-type changes

Both mixed-layout orientations now use the same bounded, intrinsic image-column calculation. The image column cannot reserve an unused wide percentage beyond the selected frame and matching padding. Portrait proportional images can use a narrower intrinsic track; switching image position mirrors the same track and gap instead of leaving extra room between a left image and its text.

Sidebar item gaps changed from 0.5rem to 0.325rem, a 35% reduction. Reorder controls use the shared Button height token locally: the two controls and their 0.2rem gap fit the standard closed disclosure's 3.5rem height plus its outer border. Their arrows are 16px. Image-library filenames use a single line and CSS ellipsis, retaining the complete accessible button label. Alternative text uses the existing Field information action and tooltip to explain its purpose and decorative-image behavior.

Each story section starts with a Section type selector for Text Only, Image Only, and Text + Image. Choosing another type opens the shared warning Dialog before changing data. Closing the Dialog preserves the section. Confirming clears its heading, body, image reference, alternative text, and layout options, using the new type's blank defaults. Its stable ID, position, and visibility are retained; the asset is not deleted. Existing Undo restores a confirmed change before saving. The CTA has no type selector.

New sections default to Straight edges. Existing saved shape choices retain their crop behavior. Straight edges and Rounded preserve the source aspect ratio within the selected size limits; square and masked shapes continue to use intentional square cropping. No database migration is required. Backend preview/save/publish checks accept the two bounded shape values, and the local demo backend is restarted after the update.

Manual checks: compare both image positions using the same image and size; check the tighter sidebar and aligned arrow pair; focus the alternative-text information icon; inspect a long filename in the library; cancel and confirm a section-type change and try Undo; compare landscape and portrait images under Straight edges, Rounded, Square, and Rounded square. The automated suites cover the warning/reset/cancel/undo behavior, help text, all shape values, actual Astro natural-image markup, and direct bridge updates between cropped and proportional frames. Visual comparison remains manual as requested.
