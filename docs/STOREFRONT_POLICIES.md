# Storefront Policies

Implemented locally on October 24, 2026 in the web project and the explicitly requested sibling backend. No migration, deployment, remote Git operation or change to the populated `vendure_demo_market_ops` database was performed. No browser automation, screenshots or visual comparisons were used.

## Public page

The single `/policies` Astro route uses SiteLayout and the existing Harvest header/footer. Its article reuses Our Story's `.story-page` layout and 68rem maximum width. Only policy spacing, multiline text and subtle section separators have local styling. Header/footer and other page widths are unchanged. The introduction contains the configurable heading and description. Each complete, visible policy renders its full text below its heading in configured order, without cards or public accordions. Empty, whitespace-only and hidden entries are omitted. Header desktop/mobile navigation and the footer link to Policies only when the published page is enabled. Disabled or absent configurations return 404; authorized preview can render a disabled page.

ClosingInvitation follows the policies at the same editorial width, using its existing compact desktop layout and mobile stack. Policies has independent heading, supporting text and button label. Its destination is fixed to `/contact`; the invitation is omitted when Contact is disabled. It cannot be removed, duplicated or reordered in the policy manager. There were no existing vendor-policy links in the checkout components to retarget. No checkout behavior was changed.

## Editor and shared components

Choose **Policies page** in the vendor visual editor's **Preview page** selector. Its existing disclosure groups expose page title, heading, description, enable switch, **Policies > Edit Policies**, and closing-invitation copy. Editing remains available while the page is disabled.

**Edit Policies** opens the shared wide Dialog. The shared dialog owns viewport bounds, internal scrolling, keyboard dismissal, focus management and the header X. Closing retains unsaved editor changes; it does not save or publish. The explanatory copy names the separate Save draft and Publish saved changes actions. A second shared confirmation Dialog identifies the policy before deletion. Cancel preserves it; confirmation changes only the current editor state.

Inside the manager, stable-ID rows use the existing native disclosure contract. Each collapsed row shows its title. The open row contains Policy Title, a 12-row Policy Content textarea, Show policy and Delete Policy. Switching rows preserves entered values. Add Policy appends a blank visible row with a UUID, expands it and focuses its title. Add disables at 20 with an explanation. Hidden rows remain editable. Deliberately deleting all rows stays empty after reload.

`StorefrontReorderControls` extracts the FAQ's exact IconButton arrow rail without changing its markup, icons, compact dimensions, classes, spacing or disabled rules. FAQ and Policies both import it. Up/down remain outside the disclosure and available when collapsed, moving one position while preserving IDs, fields, visibility and the open row. There is no drag sorting.

Reused: AdminShell and the existing editor controller, Button, IconButton/UtilityIcon, Field, Input, Textarea, Checkbox/switch presentation, Dialog, DDN-03 native disclosure presentation, FAQ arrow styles, SiteLayout, Harvest theme/header/footer, ClosingInvitation, and FAQ's bounded internal-link parser. PoliciesEditor is a feature composition because FAQ's sidebar question list cannot supply the requested large modal policy workflow. The reorder extraction is shared code; no new UI primitive, library, styling system or approval of a pending design category was introduced.

## Configuration, defaults and validation

Optional `appearance.policies` is a version-1 object containing enabled state, page title/heading/description, an ordered `policies` array and independent CTA copy. Each entry has a stable ID, title, content and boolean visibility. Absence means unconfigured. Presence with `policies: []` means intentionally empty. Existing saved configurations take precedence over defaults.

An unconfigured editor offers four editable titles: Preordering & Pickup, Order Changes & Cancellations, Refunds & Returns, and Product Information & Allergens. Their contents are blank. The page defaults to disabled. These defaults do not automatically save or publish, and no refund, cancellation or pickup guarantees are supplied.

Frontend and backend enforce unique bounded IDs, strict object shapes, booleans, at most 20 policies, 160-character policy titles and 20,000-character content. Page title/heading are bounded to 160, description and invitation text to 600, and invitation label to 80. Required page and invitation labels cannot be blank. Policy title/content may be incomplete in drafts. Authored policy text retains whitespace and line breaks and is never silently truncated. Inputs enforce their bounds; validation reports invalid links, imported overlength content and whole-configuration limits. The manager also exposes the editor's validation feedback while open.

The existing **80,000-character whole-appearance limit** remains authoritative. Twenty maximum-length policies cannot fit together with the rest of a storefront. Shorten content when the shared limit is reached. No size limit was raised.

Policy content reuses FAQ's plain-text `[label](/route)` parsing and exact internal route allowlist: `/`, `/products`, `/about`, `/find-us`, `/contact`, `/faq`, `/policies`. FAQ's matching frontend/backend allowlist now also includes Policies. External URLs, JavaScript, protocol-relative URLs, account/API paths, fragments and query strings are unsupported. Complete unsupported link syntax is rejected; malformed/incomplete syntax is escaped text. Links to disabled optional pages render as plain text. Astro escapes authored text, including literal HTML. No raw HTML or general Markdown/rich-text renderer is used.

## Preview, persistence, dates and history

All changes use the existing unsaved history, Undo/Redo, Save draft and Publish saved changes sequence. Policy changes trigger the existing structural SSR preview bridge and render the actual Astro page. Trusted `policy:ID` inspection selects an existing policy; stale IDs are rejected. Preview tokens, host/origin/window validation, CSP, vendor ownership, channel scoping and optimistic versions remain governed by the existing services. No new permissions, resolver or persistence workflow was added.

The backend already stores `appearancePublishedAt`. The public host-resolved context now explicitly selects and exposes that timestamp; storefront-core validates the optional date before using it. Policies displays it as **Last updated**, with a machine-readable ISO `time` value and a stable UTC calendar date. Missing/invalid metadata produces no date. Draft saves and opening the editor do not update it. Publish updates it through the existing service.

This is the authoritative **whole storefront appearance publication date**, not a separately tracked policy-only revision date. Publishing other saved appearance settings can advance it. The private preview labels this distinction; it never dates unsaved policy text as newly published.

The current service retains the current draft and current published snapshot, version counter and publication timestamp. It does **not** provide immutable publication history. This feature preserves that behavior and does not claim older policy revisions are archived. Immutable publication retention and order-to-policy revision binding remain future work. No automated refunds, cancellation enforcement, checkout acknowledgment, platform legal-document editing or market compliance-policy changes were implemented.

## Local files changed

New web files:

- `packages/theme/src/policies.ts`: defaults, limits, validation, public eligibility and existing parser reuse.
- `apps/admin/src/PoliciesEditor.tsx`: modal management and page settings composition.
- `apps/admin/src/StorefrontReorderControls.tsx`: extracted FAQ arrow component used by both editors.
- `apps/storefront/src/pages/policies.astro` and `styles/policies.css`: public document renderer and bounded presentation.
- `tests/storefront-policies.test.tsx` and `scripts/test-storefront-policies.ts`: focused component/schema and actual Astro HTTP qualification.
- This report.

Extended web files:

- `packages/theme/src/storefront.ts` and `faq.ts`: optional configuration, preview routes/section identities, shared link destinations and accurate aggregate-size feedback.
- `packages/api/src/storefront-appearance.ts`: additive Policies DTO type.
- `packages/storefront-core/src/index.ts` and `backend.ts`: authoritative publication metadata.
- `apps/admin/src/VisualStorefrontEditor.tsx`, `FaqEditor.tsx` and `storefront-appearance.css`: editor integration and exact arrow reuse.
- `apps/storefront/src/lib/editor-preview-client.ts`: policy changes trigger actual SSR preview.
- `apps/storefront/src/components/home/HarvestHeader.astro`, `HarvestFooter.astro` and `pages/faq.astro`: conditional navigation and safe optional-page links.
- `tests/storefront-preview-bridge.test.ts`: structural policy-preview coverage.

Backend files in `E:\coding\farmers-market-platform`:

- `src/plugins/platform-identity/storefront-appearance-config.ts`: additive optional policy type, independent bounded validation and public filtering.
- `src/plugins/platform-identity/public-storefront.controller.ts`: expose the existing publication timestamp.
- `test/farmers-market/storefront-appearance.ts`: guarded disposable-database policy qualification.

No table/entity/schema migration or populated test-data edit is required.

## Automated verification

All 40 focused tests passed across seven test files. Coverage includes private defaults, intentional emptiness, stable identities, count/field/aggregate bounds, unsafe links, whitespace, order/visibility filtering, shared modal/disclosures/arrows, add focus, long content, close retention, delete confirmation/cancel, Undo/Redo, trusted/stale preview selection, unsaved preview messages and saved publishing. The HTTP test uses temporary loopback Astro/fake API servers, verifies actual SSR markup and published-date output, and does not substitute for backend authorization testing.

The existing guarded backend appearance test passed with actual policy persistence, invalid input rejection in save/preview, cross-vendor/market denial, wrong-host preview denial, optimistic conflicts, unchanged public state/date during draft saves, authoritative publication metadata, hidden/incomplete filtering, compatibility and intentional emptiness. It created and dropped `vendure_test_appearance_1792873132148_17d5b7`. The populated demo database was never selected. PostgreSQL emitted the existing concurrent-query deprecation warning. Initial sandboxed loopback attempts were denied; approved loopback reruns passed.

Web TypeScript/Astro checks and backend TypeScript checks passed. The existing synthetic local production build helper passed for storefront, admin, backend dashboard, server and worker. Existing frontend framework and large-chunk advisories remain. The About compatibility tests emitted existing asynchronous React act warnings while passing all assertions. Focused ESLint and Prettier checks are used for the changed web files. No full repository regression suite was run.

Reproduce from `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
npx vitest run tests/storefront-policies.test.tsx tests/storefront-faq.test.tsx tests/storefront-preview-bridge.test.ts tests/storefront-preview-security.test.ts tests/storefront-visual-editor.test.tsx tests/storefront-about-sections.test.tsx tests/storefront-find-us.test.tsx --reporter=default
npx tsx scripts/test-storefront-policies.ts
npm run typecheck
npm run build:production-local
```

From `E:\coding\farmers-market-platform`:

```powershell
npm run test:storefront:appearance
npx tsc --noEmit
```

## Exact manual testing

Restart the populated demo environment processes to load local changes. No migration, seed, reset or fixture-population command is needed. Run each script in its own terminal from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. Sign in as `homepage.vendor@example.test` with the existing test credentials. Open `http://localhost:4322/vendor/storefront`, select Willow & Grain Farmstead, then choose **Policies page** under **Preview page**. If unconfigured, confirm Disabled and four starter titles with blank contents. Existing policies, if present, must remain intact.
2. Visit `http://homepage-vendor.localhost:4321/policies` separately. An unpublished/disabled page should be unavailable. Confirm that simply opening the editor did not enable or publish it.
3. Open **Policies page** in the sidebar. Edit Page title, Introductory heading and Introductory description while disabled. Confirm private preview updates. Toggle Enabled when ready to test publishing.
4. Open **Policies > Edit Policies**. Confirm Manage Policies fits the viewport and scrolls internally. Expand/collapse title-only dropdowns. Enter vendor-chosen content with several paragraphs and line breaks. Switch rows and return to verify retention. No text becomes public yet.
5. Click **Add Policy**. Confirm a blank row appears at the end, expands and focuses Policy Title. Rename it and enter long content. Keep another row incomplete and confirm it is omitted from the preview.
6. Use the up/down arrows while collapsed and expanded. Compare their presentation with FAQ's arrows. Confirm first Up and last Down are disabled, content/visibility stay attached to the moved policy, and preview order changes.
7. Clear **Show policy**, close/reopen its dropdown and confirm the content remains. Check Show policy again to restore it. Confirm the page itself stays enabled.
8. Click **Delete Policy**. Confirm the dialog identifies the title. Cancel and verify retention; repeat and confirm deletion. Close Manage Policies with its header X, then use Undo/Redo. Verify deletion and text changes are reversible before saving. Reopen the manager to confirm unsaved retention.
9. Try `[Contact Us](/contact)` and literal HTML in content. Confirm a safe same-storefront link and escaped text. Try `[Bad](javascript:alert(1))`; confirm visible validation and disabled saving, then remove it. Check limits and the Add-disabled message at 20 without saving unwanted temporary entries.
10. Edit the closing invitation's heading, text and button label in its sidebar group. Confirm the compact invitation always follows policy sections and targets Contact. Disable Contact in the editor and verify the invitation disappears, then restore the intended Contact setting.
11. Inspect a complete policy in the actual Astro preview and confirm its manager opens to the matching row. Use keyboard Tab, Enter/Space and Escape to exercise disclosures and shared dialogs; verify focus returns appropriately, including after delete cancellation. Confirm no public accordion is present.
12. Click **Save draft**. Reload the editor and check text, order and hidden state. Check the separate public page and its date: both should still reflect the previous publication. **Publish saved changes**, reload the public page and confirm full readable content, correct order, filtered rows, navigation links and a genuine publication date. Publishing only a new draft advances the authoritative storefront date; draft saves do not.
13. Check desktop and mobile editor viewports and the public page manually. Verify the 68rem article width, readable wrapping, separators, mobile invitation stack, viewport-bounded dialog and long-text scrolling. Compare Our Story and FAQ widths and Homepage, Shop, Product Details, Cart, Checkout, Find Us, Contact and shared header/footer widths/content.
14. If testing intentional emptiness, remove every policy, save and publish, then reload the editor. Confirm no starters return. Disable Policies, save and publish, then confirm public route/navigation disappear while disabled editing still works. Restore the desired final policy configuration through the editor. Preserve unrelated saved vendor settings and all other accounts.

Desktop/mobile visual acceptance and native keyboard/focus review remain for this manual pass as requested. No sample contractual content has been published to the demonstration vendor.
