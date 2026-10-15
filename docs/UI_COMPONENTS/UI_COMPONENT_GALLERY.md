# UI component comparison gallery

This is a standalone local development fixture in `tests/fixtures/ui-component-gallery`, outside both application routers and npm workspaces. It uses the current working tree, including existing uncommitted component changes. It records no design selections and makes no changes to `UI_COMPONENTS.md` or the audit.

The dropdown now has **19 categories and 77 unique audit IDs**. The original six categories (BTN, INP, SEL, CRD, DLG, DSH) and all 31 original IDs remain available. The 13 additional categories below cover all 48 requested records. MOB-01 and MOB-02 already existed in DSH, so the extension adds 46 unique IDs. DSH still includes those mobile regions; MOB also exposes them independently without duplicating metadata. The eight approved design decisions and four retained specialists remain unchanged. This fixture neither approves the added categories nor implements any migration.

## Start and access

From `E:\coding\farmers-market-platform-web`, with existing dependencies installed and Node 24 or newer:

```powershell
npx tsx scripts/dev-ui-gallery.ts --enable-local-gallery
```

Open **http://127.0.0.1:4343/**. The port is strict: startup fails if it is occupied. Stop with Ctrl+C. No backend, login, seed data, credentials, application dev servers or dependency installation are needed.

The launcher requires the exact opt-in argument and rejects an existing non-development `NODE_ENV`. It starts a native Astro child with `NODE_ENV=development`, `UI_COMPONENT_GALLERY=local-only` and telemetry disabled. A fixture integration independently rejects build and preview even with these values set. Type generation/checking is allowed only with the same development opt-in. The root build still builds only the existing storefront and admin workspaces.

The server binds only to `127.0.0.1`. Pages reject other hostnames, unknown candidate IDs, application/API paths and non-GET methods. Astro's own origin check can reject POST before the fixture returns its 404. CSP blocks connections and form actions, including with JavaScript disabled. An early display-only guard rejects fetch/XHR/beacons and prevents submission/navigation. Comparison frames additionally omit form, popup and top-navigation sandbox permissions. HMR is disabled; restart after editing fixture code if cached route metadata remains.

## Review controls

Choose a category, state and viewport width. Candidate names, audit IDs, exact source paths, existing scopes, implementation kinds and limitations come from the unchanged registry and fixture metadata. A local filter hides candidates by ID or name. Filtering is not a canonical selection.

Candidate ID/name and rendering kind appear above the comparison frames. Expand **Source and limitations** on the candidate or within its specimen for exact paths, CSS dependencies, adoption, representative routes and omitted behavior. The gallery's CSS-context explanation is also expandable. No approval/selection mechanism was added.

By default every candidate has an actual 1280px desktop iframe and an actual 390px mobile iframe. Desktop is displayed at 50% scale to make comparisons practical. Its media queries still evaluate at 1280px. Choose 100% to inspect typography/focus outlines at native size. Mobile stays at 100%. Scroll the comparison region horizontally to see neighboring candidates, and scroll within a frame for longer examples. Single-width choices include 390, 600, 601, 767, 768, 1280 and 1440px.

- Hover the actual candidate controls. No CSS class forces a fake hover or focus appearance.
- Tab and Shift+Tab into a specimen to inspect keyboard focus. Disabled controls retain native focus exclusion. Use Enter/Space for native disclosures and arrow keys for native selects.
- For SEL-07, type a synthetic business name, use ArrowUp/ArrowDown, Enter, Escape and click the options. Try a query with no matches.
- For BTN-05, use synthetic password text and mismatched confirmation to inspect actual visibility, `aria-pressed`, checklist and mismatch behavior. No signup form exists.
- For dialogs, open the specimen, inspect title focus, Tab/Shift+Tab, Escape, Close and focus return. DLG-01 also offers its existing Drawer and title-focus variants. Loading/disabled comparison sets the real `busy` prop; **End simulated wait** clears it locally. DLG-02's local close-veto checkbox exercises `beforeClose` and can be released inside the dialog.
- For the admin shell, switch market/vendor/platform scopes, inspect real current-page links, nested navigation, market collapse and mobile disclosure. No service props are supplied. Navigation changes local history; refresh/reset reloads the specimen. Logout only changes synthetic status text.
- For the customer shell, inspect the original Astro sidebar, topbar, native mobile disclosure and logout form. Submission is blocked. The disclosure also works with JavaScript disabled. Repeated SID/HDR/MOB specimens deliberately show the same actual shell because the audit indexes its regions separately.

**Reset specimens** reloads frames without recording anything. Changing controls reloads the gallery and returns specimens to their fixture defaults.

## Included candidates

| Audit IDs                      | Actual rendering or evidence                                             | Limits                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| BTN-01                         | Imported Button, primary and existing secondary class; React SSR         | Native props, no intrinsic loading/error/selected API                                                                     |
| BTN-02                         | Existing native `.button` button and action-link pattern, Astro          | Commerce handlers/controllers excluded; anchors cannot be natively disabled                                               |
| BTN-03                         | Existing native operations button pattern and ops ancestors, Astro       | Feature commands excluded                                                                                                 |
| BTN-04                         | Existing plain native account button pattern, Astro                      | Account form/controller excluded                                                                                          |
| BTN-05                         | Imported SignupPasswords island and native `.resend-button` pattern      | Resend request/countdown excluded; password states are interactive                                                        |
| INP-01                         | Imported Input and Field; React SSR with native behavior                 | Error props/message supplied by fixture caller                                                                            |
| INP-02                         | Existing Astro `.field` text input pattern and account constraints       | No React inference or account controller                                                                                  |
| INP-03                         | Original six-digit Astro OTP markup/classes                              | Verification script omitted; paste aggregation, auto-advance and autofill controller cannot be demonstrated               |
| SEL-01                         | Imported Select and Field; React SSR                                     | Native selection; caller feedback                                                                                         |
| SEL-02                         | Imported Market Choice island, including status tones                    | Disabled inherited from fixture fieldset                                                                                  |
| SEL-03                         | Imported required Market SelectField island                              | Choose selection manually; no preset selected-value prop                                                                  |
| SEL-04                         | Imported Management Choice island                                        | Controlled synthetic options; disabled inherited                                                                          |
| SEL-05                         | Imported Control island with existing native select pattern              | Feature options/handlers replaced with synthetic values/local state                                                       |
| SEL-06                         | Existing native public select pattern in Astro                           | ProductPurchase, account and mode controllers excluded                                                                    |
| SEL-07                         | Imported SearchSelect island                                             | Synthetic options/local filtering; no async/error API                                                                     |
| CRD-01                         | Imported Card, React SSR, plus Astro semantic `article.card`             | Surface has no state API                                                                                                  |
| CRD-02                         | Existing dashboard-card and command-section markup/classes               | Surface-family examples, no feature forms                                                                                 |
| CRD-03                         | Existing ops-editor, ops-section and ops-inspector markup/classes        | Surface-family examples, no feature editors                                                                               |
| CRD-04                         | Imported AnimatedDisclosure plus existing layout-card markup/classes     | Partial surface sample; canvas preview and layout actions omitted                                                         |
| CRD-05                         | Existing application-question/`.editing` surface classes                 | Display-only partial surface; full builder cannot be safely isolated                                                      |
| DLG-01                         | Imported Dialog and Drawer islands                                       | Existing native lifecycle preserved; caller child state is separate                                                       |
| DLG-02                         | Imported MarketDialog island                                             | Busy/veto/closing animation preserved; existing programmatic native-close callback gap and ignored focusTitle prop remain |
| DSH-01, SID-01, HDR-01, MOB-01 | Imported AdminShell, client-only shell presentation                      | Synthetic context with no service props; AdminApp/authentication and operational dashboard contents never mounted         |
| DSH-02, SID-02, HDR-02, MOB-02 | Imported CustomerLayout and CustomerNavigation, original Astro rendering | Synthetic name/content; no dashboard hydration; native submissions/navigation blocked                                     |
| HDR-03                         | Source path and representative `/market/layouts/:layoutId/edit` route    | Evidence only; local LayoutEditor header needs version/layout/command closures                                            |

The excluded portions also have representative route references: BTN-05 `/account/signup` and `/account/verify`, INP-03 `/account/verify`, CRD-04 `/market/layouts`, CRD-05 `/market/applications`. HDR-03 historical evidence already exists at `docs/evidence/phase15c/editor-1440.png` and `editor-390.png`. These are local source/route references, not instructions to perform live actions. Historical images are not embedded because their source age/data should be reviewed separately.

## Additional category coverage

Every ID below is represented in registry-derived metadata and the review interface. “Imported” means the production export actually renders. “Partial” means audited local markup/classes, sometimes composing an imported primitive, with explicitly excluded feature controllers. “Evidence” means a source/route explanation without fabricated component markup. Exact source, CSS and route evidence is available in each candidate's details and `additional-candidates.ts`.

| Category                              | Count | Imported implementations                                                               | Partial existing markup                                                                                                                                              | Evidence only                 |
| ------------------------------------- | ----: | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| DDN: Dropdowns and disclosures        |     3 | DDN-01 Dropdown; DDN-02 AnimatedDisclosure                                             | DDN-03 Assignments native disclosure and original Chevron                                                                                                            | None                          |
| BDG: Badges and status indicators     |     4 | BDG-01 Badge; BDG-02 StatusBadge; BDG-04 Readiness                                     | BDG-03 MarketMap booth-state pills                                                                                                                                   | None                          |
| ALT: Alerts and notifications         |     4 | ALT-01 Alert/ErrorState; ALT-02 Unavailable; ALT-04 Metadata                           | ALT-03 Checkout and customer feedback paragraphs                                                                                                                     | None                          |
| EMP: Empty states                     |     3 | EMP-01 EmptyState; EMP-02 Astro CustomerOrders                                         | EMP-03 plain no-results paragraphs; EMP-02 also shows partial product/cart patterns                                                                                  | None                          |
| LOD: Loading indicators and skeletons |     4 | LOD-01 Spinner/Skeleton; LOD-02 vendor ReadState; LOD-03 market ReadState              | LOD-04 VendorCart busy/status pattern                                                                                                                                | None                          |
| TBL: Tables and data tables           |     3 | TBL-01 Table/TableHead/TableBody; TBL-02 DataTable; TBL-03 read-only Invoice           | None                                                                                                                                                                 | None                          |
| KPI: Statistics and KPI displays      |     4 | KPI-04 Billing summary, no invoices                                                    | KPI-01 customer stat links; KPI-02 occurrence summary tiles; KPI-03 platform facts                                                                                   | None                          |
| FIL: Filtering controls and bars      |     5 | FIL-01 RangeForm, React SSR with blocked submission                                    | FIL-02 vendor/management forms with imported TextField/Choice/Button; FIL-03 public filters; FIL-04 operations toolbar with imported Control; FIL-05 customer search | None                          |
| TAB: Tabs and view selectors          |     3 | TAB-01 Tabs                                                                            | TAB-02 designer selector with simulated panels; TAB-03 route-link presentation                                                                                       | None                          |
| PAG: Pagination                       |     5 | PAG-01 Pagination; PAG-02 Pager                                                        | PAG-03 private PageControls markup with imported Pagination; PAG-04 public links; PAG-05 customer links                                                              | None                          |
| MOB: Mobile dashboard navigation      |     2 | MOB-01 AdminShell; MOB-02 Astro CustomerLayout/CustomerNavigation (existing specimens) | None                                                                                                                                                                 | None                          |
| PGH: Page headings                    |     4 | PGH-01 PageHeader; PGH-02 Astro CustomerLayout h1                                      | PGH-03 public hero/authentication h1 contexts                                                                                                                        | PGH-04 local designer heading |
| SCH: Section headings                 |     4 | SCH-01 SectionHeader                                                                   | SCH-02 customer section header; SCH-03 dashboard titles; SCH-04 public section title                                                                                 | None                          |

The fixture-specific `AdditionalSample.tsx` and `AdditionalMarkup.astro` are synthetic specimen callers, not a competing UI library. Existing exports supply presentation wherever safely isolated. Private PageControls, local feature markup and application pages cannot be imported independently of their controllers, so their samples preserve only the recorded structure/classes. No large controller was copied. Invoice uses `canManage=false`, and Billing receives only a synthetic summary with no invoices. The guard and sandbox remain active for every specimen.

## Inspecting the new states

- DDN: Use Enter/Space on native summaries or the original animated toggle. Choose **expanded** to supply DDN-02's actual `defaultOpen` and DDN-03's native `open`. DDN-01 has no preset-open prop; open it manually. Inspect the original Chevron, nested content, closed inertness and reduced-motion rule. Native Dropdown has no custom hover or animation; Assignments summary has its original hover styling.
- BDG: StatusBadge calls the original tone/label helpers for ACTIVE, PENDING, APPROVED, DECLINED, SCHEDULED and UNAVAILABLE. UNAVAILABLE is the existing neutral fallback; no new rejected/tone rule is introduced. Booth pills show only Available/Assigned/Paid. Readiness keeps plain text without fabricated badge colors. Badge also shows card context; StatusBadge shows table context.
- ALT: Alert supports a status presentation, not a severity prop. ErrorState receives a synthetic AppError. Native status/alert paragraphs demonstrate actual success/error contexts. Metadata shows ACTIVE, BUILDING and FAILED synthetic projections. ErrorBoundary crashes, live failures and analytics services are omitted.
- EMP/LOD: Empty collections use actual EmptyState/CustomerOrders or partial native no-results markup. CTAs are inert or local fragments. Loading samples receive synthetic caller state. The existing Spinner is a static ring; no rotation is added. Skeleton remains aria-hidden with a separate fixture loading announcement. Choose **error** for LOD-02/03, then use the actual retry button to complete a local display simulation without a request.
- TBL: Small synthetic datasets include long values and original captions/scoped headings/overflow. TBL-02 includes an empty tbody. **Selected** supplies its real `aria-sort` metadata only; it has no sorting controller. Invoice's native mobile layout limitations are retained, with every mutation form excluded.
- KPI: Compare linked customer counts, noninteractive occurrence tiles, platform definition lists and currency-separated Billing paragraphs. Every count/amount is synthetic; no aggregate query is run.
- FIL: Change native text, dates, selects and checkboxes. The local operations selector changes synthetic state. **Every submission is blocked**, including RangeForm's validation/onChange, paging reset and query normalization. The filter forms retain original native submit controls; no validation/filtering behavior is falsely advertised as tested.
- TAB: Tabs preserves ArrowLeft/Right/Home/End, roving focus and mounted hidden panels. It has no initial-selected prop, so choose the second tab manually. The designer's original `aria-pressed` buttons use explicitly simulated Inspector/Layers panel content with native Tab/Enter/Space, without invented arrow-key behavior. Billing section links retain anchor presentation with inert local fragments, not tab roles.
- PAG: Imported Pagination/Pager callbacks update synthetic local state through three pages and real disabled boundaries. **Selected** starts in the middle; **disabled** starts at the final boundary. Generic Pagination's page label is fixture caller content. Native public/customer links demonstrate missing boundary links instead of disabled anchors; they do not implement paging/query navigation.
- MOB: Inspect the actual existing shells at 390, 600, 601, 767 and 768px. Sidebar/mobile disclosure visibility remains at the original 600px boundary, with market-specific behavior between 601 and 767px preserved. Use Enter/Space, Tab and current-page links. Customer disclosure works without JavaScript; the client-only React admin shell requires JavaScript.
- PGH/SCH: Use the common synthetic page title where the implementation permits it. PageHeader, customer h1 and public hero/authentication headings stay distinct from HDR topbars. Section samples preserve h2 semantics, title-only and adjacent actions only where present. PGH-04 remains evidence-only because LayoutEditor h1/header needs version, dirty, area/history and save/publish closures. Its source/route and historical screenshot references remain visible; neither the editor nor an approximation is mounted.

Global display controls describe unsupported states and retain existing presentation. No new global state API, severity variant, sorting controller, animation or breakpoint is invented. CSS context overrides remain diagnostic; shells and PGH-02 keep their original renderer/CSS. Partial examples do not prove complete application behavior. Native popup appearance, long-label tab overflow, invoice overflow, non-Edge engines, touch interaction and assistive technology require separate review. Historical screenshots may differ from current uncommitted source.

The unchanged CSP blocks Vite development-client loopback HMR websocket attempts, and the unchanged route allowlist returns 404 for the browser's implicit favicon request. The browser harness recognizes only these verified development diagnostics; all other console/runtime errors fail verification. These blocks do not warrant loosening isolation. Designer CSS is linked only for TAB-02; existing specimens retain their original stylesheet set.

## CSS and renderer context

Separate iframe documents prevent styles from one comparison leaking into another. Base specimens import only `packages/ui/src/styles.css` and apply the existing `platformTheme`. Storefront specimens add the actual SiteLayout stylesheet set: storefront `vendor.css`, `market.css` and `checkout.css`. BTN-02 uses `.checkout-shell`; account patterns use `.account-panel`; OTP adds `.verification-panel`.

Admin specimens add the exact AdminShell stylesheet set: admin `vendor.css`, `market.css`, `management.css`, `phase15.css`, `phase15b.css` and `market/dashboard.css`. They retain `.admin-shell .admin-content` ancestors. Market samples additionally use `.market-dashboard .market-workspace`. SEL-04 uses `.management-workspace` without the market ancestor, preserving the management select behavior. Operations-specific samples additionally use `.ops-workspace`. An empty sidebar context region preserves the actual shell grid. It is explicitly labeled as ancestor context, not a candidate navigation implementation.

The context override controls intentionally let a developer investigate the base/admin/storefront cascade. Such combinations are diagnostic comparisons and do not imply existing adoption or approval. Dashboard candidates retain their own CSS/renderers regardless of override. The customer sample directly imports CustomerLayout, which loads shared CSS and `customer-dashboard.css` and applies its existing theme.

Static primitives render with React SSR or native Astro markup. Only interactive choices, disclosure, passwords and dialogs hydrate as small islands. The AdminShell island mounts the existing shell without services or operational content. Its transitive imports are still part of the development module graph. This is not an authentication/session fixture or a full hydrated operational dashboard.

Gallery-only components exist because there was no existing side-by-side inspection controller, safe synthetic overlay caller or service-free shell harness. Gallery controls reuse Button, Field, Input and Select. Production primitives and styles are imported without changes. Local markup-family examples reuse audited classes and structures; they are explicitly partial display samples where feature children/handlers cannot be reused safely. The fixture adds no UI library or production dependency.

## State interpretation and limitations

Each candidate/state combination states whether it is supported, a caller simulation or unsupported with the default specimen retained. Default, hover and focus use actual browser behavior. Disabled uses native props or a fixture fieldset. Loading text/field locking and caller error messages are synthetic display-only states. Neither represents a request or business outcome.

The original wrappers' gaps are preserved. For example, Field does not automatically connect arbitrary child errors, Choice has no disabled prop, SelectField cannot preset a selected value through its API, and a native action link has no disabled contract. The fixture explicitly supplies accessible error associations where its caller can, without changing production components. Card surfaces have no disabled/loading/error state; only their child controls change. CRD-05's selected/editing class is a display-only simulation of the existing surface.

The gallery demonstrates selected values for controls, not selected canonical candidates. Shell current-page selection and collapse/disclosure are interactive. A global shell disabled/loading/error state is unsupported. Account-mode controls, provider/tenant branding, operational records, purchasing/payment, authorization, account updates, OTP requests and designer geometry remain outside scope. Native-select popup styling is browser-dependent. Edge desktop was checked; touch devices, other browser engines, assistive technology and all allowed tenant themes still require developer review.

## Checks

With the gallery running, run the focused browser harness:

```powershell
npx tsx scripts/test-ui-gallery.ts
```

It checks all 77 IDs at genuine desktop/mobile viewports, every category and filter, actual hover/focus, disabled/error controls, combobox selection, native dialogs and busy/veto/focus return, disclosures, Tabs, simulated designer panels, callback pagination and native boundaries, read-state retry, responsive shell visibility at all five requested breakpoints, actual iframe widths, reset, no-JS customer disclosure, blocked form/API requests and absence of external browser requests. Evidence-only rendering is checked as an explanation, not claimed as interaction coverage. Synthetic review PNGs go to a new timestamped `review/expanded-<timestamp>/` directory on every run; historical images are never overwritten.

Run isolation unit tests without overwriting existing evidence:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
npx vitest run tests/ui-component-gallery.test.ts
```

For fixture Astro diagnostics in a separate PowerShell session:

```powershell
$env:NODE_ENV = 'development'
$env:UI_COMPONENT_GALLERY = 'local-only'
npx astro check --root tests/fixtures/ui-component-gallery
```

Project checks remain `npm run typecheck`, `npm run build`, `npm test` and `npm run lint`. Set `FRONTEND_NO_EVIDENCE=true` before tests to avoid rewriting existing evidence. Build/preview rejection and absence of production source references are checked by the focused unit tests. When production outputs exist, the isolation tests also scan them for gallery routes/markers.

Historical original-gallery verification passed: 314 unit tests across 25 files, all six original focused isolation tests, the local Edge browser harness, project TypeScript/storefront diagnostics, fixture Astro diagnostics, both production builds, ESLint and package boundary checks. Historical builds reported large-chunk warnings and formatting gaps in `AGENTS.md` and `docs/vendor-application-account-identity-audit.md`. This is prior evidence, not a claim those broad commands were rerun for this extension. Current focused verification is recorded below.

Extension verification: all eight focused unit tests pass, including real fixture build/preview rejection and production source/output isolation. The local Edge harness passes all 77 IDs, 19 categories and the requested interaction/security checks. `npm run typecheck` passes with zero storefront errors/warnings/hints; fixture Astro diagnostics pass with zero errors/warnings/hints. Both production builds pass with the historically documented large-chunk warnings. Focused ESLint, changed-file Prettier and `npx tsx scripts/check-boundaries.ts` pass. The root TypeScript baseline also passed before editing. Full application/live suites were not run for this bounded fixture task. Review screenshots use fresh timestamped fixture directories; historical image files are never targeted.

Additional reproducible checks:

```powershell
npm run typecheck
npm run build
npx tsx scripts/check-boundaries.ts
npx eslint tests/fixtures/ui-component-gallery scripts/test-ui-gallery.ts tests/ui-component-gallery.test.ts
npx prettier --check tests/fixtures/ui-component-gallery/*.ts tests/fixtures/ui-component-gallery/src/components/*.astro tests/fixtures/ui-component-gallery/src/components/*.tsx tests/fixtures/ui-component-gallery/src/pages/*.astro tests/fixtures/ui-component-gallery/src/pages/sample/*.astro scripts/test-ui-gallery.ts tests/ui-component-gallery.test.ts docs/UI_COMPONENT_GALLERY.md
```

## Recording a developer decision

Review actual interactions, responsive widths and relevant scope before choosing. Record the stable ID and source/export, approved renderer/theme/density/semantic variants, decision date, developer evidence and required improvements in the existing category fields of `UI_COMPONENTS.md`. Retain unresolved fields as pending and document retained specialists or deferred alternatives. Multiple implementations may be selected for explicitly different scopes. Screenshots or recommendations are evidence only. Request any approved consolidation or fixes in a separately scoped task.

## Files added

- `scripts/dev-ui-gallery.ts`: explicit loopback launcher.
- `scripts/ui-gallery-policy.ts`: development/sync opt-in and build/preview rejection.
- `scripts/test-ui-gallery.ts`: focused local browser harness.
- `tests/ui-component-gallery.test.ts`: isolation and stable-ID tests.
- `tests/fixtures/ui-component-gallery/.gitignore`: fixture caches and generated review artifacts.
- `tests/fixtures/ui-component-gallery/astro.config.mjs`: standalone fixture config.
- `tests/fixtures/ui-component-gallery/tsconfig.json`: standalone Astro diagnostics.
- `tests/fixtures/ui-component-gallery/candidates.ts`: registry-derived identity/scope, state contracts and limitations.
- `tests/fixtures/ui-component-gallery/src/middleware.ts`: local page allowlist, request guards and CSP.
- `tests/fixtures/ui-component-gallery/src/components/PreviewLayout.astro`: base CSS/theme document.
- `tests/fixtures/ui-component-gallery/src/components/Sample.astro`: actual primitives and explicit local pattern specimens.
- `tests/fixtures/ui-component-gallery/src/components/InteractiveSample.tsx`: synthetic callers for existing interactive components.
- `tests/fixtures/ui-component-gallery/src/components/ShellPreview.tsx`: existing shell without services.
- `tests/fixtures/ui-component-gallery/src/pages/index.astro`: gallery review controls and comparison frames.
- `tests/fixtures/ui-component-gallery/src/pages/sample/base.astro`: base context document.
- `tests/fixtures/ui-component-gallery/src/pages/sample/admin.astro`: actual admin/operations context document.
- `tests/fixtures/ui-component-gallery/src/pages/sample/storefront.astro`: actual storefront/account context document.
- `tests/fixtures/ui-component-gallery/src/pages/sample/customer.astro`: original Astro customer layout.
- `docs/UI_COMPONENT_GALLERY.md`: this guide.

The preceding 19 files were added by the original gallery task and were already present in this extension's baseline. Existing production candidates, application route sources/configs, AGENTS.md, registry, audit and migration plan remain unchanged by this extension. Type generation creates ignored fixture caches. No dependencies were installed, and no backend, database, commit, push, PR or deployment work is included.

For this extension, added files are `additional-candidates.ts`, `src/components/AdditionalSample.tsx` and `src/components/AdditionalMarkup.astro` under `tests/fixtures/ui-component-gallery/`. Modified fixture files are `candidates.ts`, `src/components/Sample.astro`, `src/pages/index.astro` and the existing `src/pages/sample/{admin,customer,storefront}.astro`. Also modified: `scripts/test-ui-gallery.ts`, `tests/ui-component-gallery.test.ts` and this guide. Launcher, policy, middleware, config and dependencies are unchanged. New synthetic screenshots are isolated in timestamped review subdirectories.
