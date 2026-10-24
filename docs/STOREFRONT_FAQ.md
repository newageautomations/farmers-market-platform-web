# Storefront FAQ

## Status and implementation

Implemented locally on October 24, 2026 across the web project and the explicitly authorized sibling backend project. No database schema migration, populated test record/account edit, fixture population in the demo database, deployment or remote Git operation was performed.

The backend's existing appearance JSON validator now accepts the optional versioned FAQ configuration with matching field, identity, visibility, count, link and total-size bounds. Public projection removes disabled FAQ configuration and filters hidden/incomplete questions. Preview authorization, Save Draft, Publish, optimistic versions and tenant ownership continue through the existing services. No new database table, migration, resolver or public draft endpoint was needed.

## Public layout

The new, single `/faq` Astro route uses SiteLayout and the existing Harvest header/footer. Only the FAQ article receives a 68rem maximum width, matching Our Story. Other page widths are untouched. The compact text introduction has no image or banner. Questions use native `details`/`summary`, approved shared disclosure presentation, separators and readable multiline answers. This preserves browser keyboard activation, focus, disclosure state, screen-reader semantics and reduced-motion behavior. The list omits hidden questions and any row missing a question or answer. A deliberately empty FAQ renders its introduction and eligible closing invitation without inventing questions.

The shared ClosingInvitation retains its horizontal desktop layout and mobile stacking. FAQ has independent heading, supporting text and label settings, and a fixed `/contact` destination. It is omitted when Contact is disabled. Header/footer FAQ links appear only when FAQ is enabled. Ordinary visitors receive 404 when FAQ is absent or disabled. Authorized private preview can render it while disabled.

## Editor and defaults

Preview page > FAQ page now follows the About editor pattern, updated at the developer's request on October 24. Add Question sits to the left of the existing About-style Enabled/Disabled switch. Page title, heading and introduction are grouped inside the FAQ page dropdown. Each question has its own dropdown with a single-line, ellipsized question-only summary and the existing About reorder-arrow rail beside it. Opening a question shows its Question input, Answer textarea, Show question checkbox and Delete control. Delete stays inside the dropdown and still requires confirmation; Cancel preserves content. Add Question appends and opens a blank pair, changes the unsaved history and focuses its Question field. Only the selected dropdown is open, and preview inspection opens the matching question. The independent closing invitation has its own dropdown. The Add control disables at 30 questions. Existing sidebar expansion remains available.

FAQ is an optional, version-1 appearance property. Absence offers four editable starter questions in the editor/private preview: upcoming markets, selected preorder market, availability and pickup. It does not enable, save or publish them automatically. The selected-market answer follows the existing banner and cart market boundary, without promising an automatic cart switch. Existing saved FAQ always takes precedence. `questions: []` stays empty after editing, saving and reloading, so deleted starter content is never reinserted.

## Answer links and validation

Answers remain plain textarea text. The only link syntax is `[label](/route)`, with exact destinations `/`, `/products`, `/about`, `/find-us`, `/contact` and `/faq`. Query strings, fragments, external URLs, protocol-relative destinations, account/API paths, encoded paths and JavaScript URLs are unsupported. Valid links to disabled optional pages render their labels as plain text. There is no raw HTML or general Markdown rendering. Astro escapes all authored text, preserving line breaks through CSS.

The shared web schema validates unique stable IDs, boolean visibility, at most 30 rows, 300-character questions, 5,000-character answers, title/heading/description/CTA bounds and supported links. Existing 80,000-character total appearance limits remain in place. Inputs use the corresponding bounds. Incomplete draft pairs are allowed but omitted publicly. Unsupported link syntax matching a complete link is rejected with the existing editor validation feedback; incomplete syntax remains escaped text. The backend independently enforces the same constraints and rejects unsupported properties.

## Preview, history and persistence

FAQ reuses the real Astro iframe and structural POST rendering bridge, with no React copy of the page. Changes to the FAQ object use the existing debounced SSR path. Stable `faq:ID` section bindings let inspect mode focus the corresponding Question input. Unknown/stale question IDs are ignored by the parent, and origin/window/protocol validation remains in place. The editor retains existing Undo/Redo, unsaved-exit guards, Save draft and Publish saved changes sequencing. The mocked-service editor test verifies that saving does not publish and publishing uses saved state; the guarded backend qualification additionally exercises actual persistence and authorization.

## Local files and component reuse

Added:

- `packages/theme/src/faq.ts`: bounded schema, editable starter configuration and minimal link tokenizer.
- `apps/admin/src/FaqEditor.tsx`: ordered disclosure/form composition.
- `apps/storefront/src/pages/faq.astro` and `styles/faq.css`: actual SSR FAQ page and local layout.
- `tests/storefront-faq.test.tsx` and `scripts/test-storefront-faq.ts`: focused DOM/schema and HTTP qualification.
- This report.

Extended:

- `packages/theme/src/storefront.ts` and `packages/api/src/storefront-appearance.ts`: optional configuration, section IDs and preview route.
- `apps/admin/src/VisualStorefrontEditor.tsx` and `storefront-appearance.css`: page choice, form integration and subtle row separators.
- `apps/storefront/src/lib/editor-preview-client.ts`: structural FAQ changes.
- `apps/storefront/src/components/ClosingInvitation.astro`: supported Contact destination.
- `apps/storefront/src/components/home/HarvestHeader.astro` and `HarvestFooter.astro`: conditional FAQ links.
- `tests/storefront-preview-bridge.test.ts`: FAQ-triggered structural render coverage.

Reused AdminShell, Button, IconButton/UtilityIcon, Checkbox, Field, Input, Textarea, Dialog, SiteLayout, Harvest header/footer, native disclosure presentation, ClosingInvitation, Harvest theme tokens and the existing appearance service/preview bridge. FaqEditor is a feature composition because About's layout/media controls and Contact's fixed detail fields cannot express a flat ordered question list. It adds no UI primitive, library, parallel styling system or approval of a pending design category. The disclosure adapter changes only FAQ row surface geometry for the explicitly requested cohesive list.

Backend files extended:

- `farmers-market-platform/src/plugins/platform-identity/storefront-appearance-config.ts`: additive FAQ type/validation and public filtering.
- `farmers-market-platform/test/farmers-market/storefront-appearance.ts`: invalid inputs, preview, saved/public isolation, hidden/incomplete/disabled projections, intentional emptiness, compatibility and cross-vendor/market denial through the existing guarded harness.

## Automated verification

- Focused FAQ, visual-editor, preview bridge, preview security and About/Find Us compatibility tests: 34 passed. Coverage includes defaults, intentional emptiness, existing content, IDs, count/length/total limits, unsafe links, all form operations, add focus, delete cancellation/confirmation, Undo/Redo, trusted/stale selection, unsaved messages and mocked save/publish.
- Actual Astro HTTP qualification passed using temporary loopback servers and an in-memory fake backend. It verifies disabled/starter privacy, real authorized preview rendering, shared shell, native disclosure markup, order, hidden/incomplete rows, escaping, safe/disabled links, conditional CTA, intentional emptiness and unsaved/public isolation. It does not prove backend authorization or persistence. No browser automation, screenshot or visual comparison was used.
- Guarded backend appearance qualification passed with actual persistence, preview authorization, draft/public separation, public filtering, intentional emptiness, optimistic versions and vendor/market isolation. The successful disposable database was dropped by the existing guard. One earlier failed assertion run was retained by the guard as `vendure_test_appearance_1792871203844_1ea48f`; it compared raw saved About content against public filtered content and was corrected. The populated demo database was never selected. The PostgreSQL client emitted its existing concurrent-query deprecation warning.
- Backend `npx tsc --noEmit` passed.
- Web TypeScript and Astro checks passed with zero errors, warnings or hints.
- The existing synthetic local production build helper passed for the storefront, admin, backend dashboard, server and worker. Frontend builds retain existing large-chunk/framework advisories. No saved environment configuration was changed.
- Focused ESLint and Prettier checks passed on the changed feature files. The About compatibility suite emitted existing React act warnings; all assertions passed.

Reproducible commands from `E:\coding\farmers-market-platform-web`:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
npx vitest run tests/storefront-faq.test.tsx tests/storefront-visual-editor.test.tsx tests/storefront-preview-bridge.test.ts tests/storefront-preview-security.test.ts tests/storefront-find-us.test.tsx tests/storefront-about-sections.test.tsx --reporter=default
npx tsx scripts/test-storefront-faq.ts
npm run typecheck
npm run build
```

Backend qualification from `E:\coding\farmers-market-platform`:

```powershell
npm run test:storefront:appearance
npx tsc --noEmit
```

The appearance test creates its own `vendure_test_*` database through the existing guard and drops it on success. It never uses `vendure_demo_market_ops`. To run the existing local production build helper for both repositories without changing saved environment files, use `$env:FRONTEND_NO_EVIDENCE = 'true'; npm run build:production-local` from the web project.

The HTTP script requires local loopback connections. The sandbox initially denied one connection; the approved loopback rerun passed. Its first empty-state assertion also matched the header disclosure and was corrected to inspect FAQ rows specifically.

## Exact manual testing

Restart the backend and frontend processes to load the local changes before testing. No migration or seed command is required. The demonstration storefront has not been automatically enabled or published.

Use the populated `vendure_demo_market_ops` environment. Do not reset, reseed, run fixture population or migrate merely to add FAQ JSON. Start or restart each process in its own terminal from the web directory:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. Sign in as `homepage.vendor@example.test` using the existing local test credentials. Open `http://localhost:4322/vendor/storefront` and select Willow & Grain Farmstead. Choose FAQ page in Preview page. Confirm it is editable while disabled and the four starter question dropdowns are listed.
2. Before publishing, visit `http://homepage-vendor.localhost:4321/faq` in a separate window. Confirm it remains unavailable if no FAQ has previously been published.
3. Set the page switch to Enabled. Open FAQ page to edit its title, heading and introduction; open a starter question to edit it. Confirm the actual Astro preview updates while other saved page settings remain intact.
4. Click Add Question beside the page switch. Confirm a blank question dropdown appears at the bottom, opens and focuses Question. Enter a question and a multiline answer. Leave another pair incomplete and confirm it creates no preview row.
5. Use Move up/down and confirm preview order. Open a complete question and clear Show question; confirm it disappears from the preview. Check Show question again and confirm its original answer is retained.
6. Open a question and click its internal Delete question control, cancel the dialog and confirm preservation. Repeat and confirm deletion. Use Undo and Redo before saving and verify the fields/preview follow the history.
7. Enter `Read our [Find Us](/find-us) page.` in an answer. Enable Find Us if appropriate and confirm the link's same-storefront destination. Disable Find Us in the unsaved editor and return to FAQ: confirm the label becomes plain text. Try `[Bad](javascript:alert(1))` and confirm validation blocks saving. Remove it. Enter literal HTML and confirm it displays as text.
8. Edit Invitation heading, Invitation text and Button label. Confirm the destination remains Contact. Disable Contact and confirm the invitation disappears, then restore the intended Contact configuration before saving.
9. Use Inspect mode to click a complete question in the real preview. Confirm its matching Question input receives focus. Use Browse mode to expand/collapse a question. Check keyboard Tab and Enter/Space on the native disclosure summary, visible focus, long answers and multiple open questions.
10. Click Save draft. Refresh the editor and confirm FAQ/order/hidden state persists. Recheck the public FAQ before publishing: only previously published content should be visible. Publish saved changes, then reload the public FAQ and confirm the new saved configuration.
11. Review desktop and mobile editor viewports, expanded preview and the public page. Confirm a 68rem maximum article width, readable wrapping, compact separators and a mobile-stacked invitation. Header/footer retain normal widths.
12. Open and remove every question, save, publish and reload the editor. Confirm no defaults return. Set the FAQ switch to Disabled, save and publish: public FAQ/navigation should disappear while the editor still opens it privately. Restore whatever published configuration is desired through the editor.
13. Compare Our Story, Find Us, Contact, Homepage, Shop, Product Details, Cart and Checkout. Confirm their prior content, specialist controls and widths remain unchanged. Verify another vendor cannot read or save this storefront's draft through the existing ownership boundaries.

## Editor refinement verification

After the requested disclosure/switch refinement, 26 focused tests passed across FAQ, the visual editor and About sections. Coverage includes the grouped page settings, question-only summary markup, About reorder rails, page switch, checkbox visibility, disclosure open/close behavior, Add Question opening/focus, move up/down, Delete inside the disclosure, cancellation/confirmation, inspect selection, Undo/Redo and save/publish. Web TypeScript, focused ESLint and Prettier checks passed. Existing asynchronous React act warnings appeared in the visual-editor compatibility suite without failing assertions. This UI-only refinement changes no backend configuration, public rendering or database data. No browser automation or screenshots were used.

## Remaining work and limitations

The populated demonstration environment has not been used to publish FAQ content. Native keyboard operation and desktop/mobile visual layout await the user's manual review, as requested. Answer links are limited to exact supported routes, with no external links, fragments or query strings. The existing 80,000-character whole-appearance bound can be reached before 30 questions when many answers are very long. No categories, rich text, search, policies, chat or tickets were added.
