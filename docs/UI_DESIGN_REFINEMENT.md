# Shared UI design refinement

Implemented locally on 2026-10-16. Developer visual review is pending. Functional checks use the existing test framework; screenshots were stopped at the developer's request.

## Selected site-wide button rollout

The developer explicitly selected and authorized the playground's geometry, semantic fills, Soft shadow and Slide up on action buttons, then clarified that tertiary, icon-only and disclosure controls stay in place and horizontal navigation retains underline styling. This is the latest production standard and supersedes the earlier 44px buttons and separate hover designs recorded below.

Ordinary action buttons use 40px height, 18px horizontal padding and a default 22px radius. More rounded corners remain valid. Single-line fields/selects use the shared 40px control token and retain rectangular corners. Long button labels may wrap and exceed the minimum height rather than being clipped. Icon-only controls are 40px circles with zero text padding; borders remain absent on utility icons, and the modal X keeps its translucent circle.

Primary hover/focus fills match Stronger color: primary mixed with black at 28%. Secondary, tertiary, icon and disclosure variants use the soft primary-at-10%/surface mix. Every enabled action button adds the Soft shadow (0 5px 16px, 26% primary), using 180ms ease. Tertiary, icon-only and disclosure controls remain stationary on hover and keyboard focus regardless of fill variant; ordinary primary/secondary/destructive actions move upward by 4px. This covers sidebar collapse/expand, refresh, modal X and record names such as Vendor X. Disabled/busy controls do not move or shadow; reduced motion removes movement and animation. Keyboard focus remains visible.

Button, buttonClassName and the native Astro adapter remain the production action-button presentation contract. Tertiary is a shared semantic variant. Drag controls and InfoTip compose that contract; existing map buttons already used it. Native file-selector buttons reuse the same CSS rule. Account palette variables drive the colors throughout, with no backend changes or preference migration.

Horizontal navigation is restored to the existing TAB-01 contract. Shared Tabs and RouteLink tabs no longer receive BTN-01 classes. The current view has a solid 3px primary underline; other entries animate a lighter underline at 35% opacity on hover or keyboard focus. Entries retain transparent backgrounds, square corners and no shadow or lift. Active underlines stay solid while hovered; reduced motion disables their transitions. Existing tab roles/panel associations, disabled handling, keyboard navigation, real hrefs and modifier clicks remain intact. The shared stylesheet owns both React and route-link presentation, with inherited button hover rules excluding tab controls. No new component was needed.

Competing ancestor hover/transition rules were removed or adapted. Status/decision controls now supply semantic button variables while retaining selected-state and domain-color cues. The layout editor tool rail was widened and its controls aligned horizontally so the selected text/padding fits the 40px geometry. Record row/card surface clicks now focus and activate their real named button, preserving entire-surface activation while avoiding a moving stretched pseudo-element. Embedded links and controls keep their own actions. Browser-owned select internals and the invisible application-editor hit target retain structural behavior.

Grow remains in the isolated button playground, with synchronized actual font-size and decorative-surface growth. The playground resets to 22px/40px/18px and keeps the selected fill/shadow/lift rules, including stationary tertiary buttons, while previewing optional extra effects. Samples now use the actual shared tertiary variant and inherit its motion contract across all nine effects. No new UI library, hosting integration, remote Git action or backend change was introduced.

Initial tertiary motion follow-up: the shared semantic hover-transform variable disabled translation for the explicit tertiary variant and InfoTip controls. Focused browser checks passed at 390px, 768px and 1280px, and all 27 playground effect samples passed motion/shadow checks with Grow's 6% text/surface scaling retained. Developer review then identified utility icons using the secondary variant, record names using disclosure, and horizontal navigation incorrectly sharing button effects. The correction described above extends stationary behavior to those controls and restores the independent TAB-01 presentation.

Latest correction verification: 74/74 component tests passed across the existing presentation, foundations, refinement and dialog lifecycle suites. All seven focused browser cases passed: shared controls and the real Documents workspace at 390px/768px/1280px, plus the Market overview's collapse/expand, vendor-record and modal-X controls. The Documents cases verify transparent square entries without shadow/lift, lighter animated hover underlines and a solid active underline even while hovered. An initial run caught active-line opacity being overridden by hover; the selector priority was corrected and all three Documents cases passed on rerun. TypeScript, focused ESLint, Prettier and whitespace checks passed. No screenshots were taken. Rerun the browser cases in PowerShell with `$env:UI_REFINEMENT_DISPOSABLE='true'`, then `node node_modules/@playwright/test/cli.js test --config playwright.ui-refinement.config.ts --grep 'shared control|Market utility|document library'` against the existing local admin/disposable Documents servers. The full-suite results below belong to the preceding rollout.

Rollout verification:

| Check                           | Result                                                                                                                                                                                                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full component suite            | 466/466 tests passed across 36 files after the record-surface activation fix. Native submit, confirmation, authorization, disabled and selection assertions remain.                                                                                                                                                        |
| Live/responsive Playwright      | All 17 unique cases passed. Fourteen passed in the final full run; the three Documents cases passed after the generic input sizing fix. Widths: 390px, 768px and 1280px, with Axe checks, account isolation, modal/row navigation and explicit primary/secondary/tertiary/compact/link/disabled geometry and hover checks. |
| Native renderer checks          | Base, Admin-context and storefront SSR specimens passed 40px/22px/18px sizing, primary/secondary fills, soft shadow and lift. The native-compatible action specimen also passed.                                                                                                                                           |
| File selector and retained Grow | Native file-selector sizing/shadow/lift passed. All nine playground secondary/tertiary fill pairs still match; Grow retains 6% actual font/surface growth and reduced-motion behavior.                                                                                                                                     |
| Typecheck                       | Passed; Astro checked 84 files with zero errors/warnings/hints.                                                                                                                                                                                                                                                            |
| Lint/format/boundaries          | Passed, including all nine workspace boundaries. Existing nonfatal TSNonNullExpression diagnostic remains.                                                                                                                                                                                                                 |
| Frontend builds                 | Storefront SSR and Admin builds passed. Existing large-chunk notices remain.                                                                                                                                                                                                                                               |
| Whitespace                      | git diff --check passed.                                                                                                                                                                                                                                                                                                   |

Browser checks found a real stretched-row click-target regression from transforms; delegating to the native target fixes it while retaining complete surface activation and focus restoration. They also exposed the older generic input selector overriding 40px fields with a 44px minimum; that selector now has low specificity and consumes the shared height. Hover assertions wait for the intended transition before comparing geometry. No tests were skipped to hide these issues. No screenshots were taken. Developer visual acceptance remains manual.

Changed files in this rollout, relative to the frontend repository:

- packages/ui/src/presentation.ts
- packages/ui/src/index.tsx
- packages/ui/src/styles.css
- packages/ui/src/record-details.tsx
- apps/admin/src/market/phase14/ApplicationBuilder.tsx
- apps/admin/src/market/phase14/Layouts.tsx
- apps/admin/src/market/phase14/designer.css
- apps/admin/src/market/dashboard.css
- apps/admin/src/phase15.css
- apps/admin/src/phase15b.css
- apps/admin/src/vendor/common.tsx
- tests/ui-foundations.test.tsx
- tests/phase-cd-presentation.test.tsx
- tests/ui-refinement.test.tsx
- tests/e2e/ui-refinement-live.spec.ts
- tests/fixtures/control-refinement-preview.tsx
- tests/fixtures/ui-component-gallery/src/components/ButtonPlayground.tsx
- tests/fixtures/ui-component-gallery/src/components/button-playground.css
- UI_COMPONENTS.md
- COMPONENT_USAGE_GUIDE.md
- docs/UI_DESIGN_REFINEMENT.md

Manual review uses the existing [admin app](http://localhost:4322), [storefront](http://localhost:4321) with its normal configured data/server, and [button playground](http://127.0.0.1:4343/buttons). Visit sign-in/signup, customer account/checkout, Market/Vendor/Platform dashboards, Documents, application decisions and the layout editor with the appropriate existing role. Check enabled/disabled buttons, tabs, action links, utility icons, modal dismiss/confirm actions and file selectors. Ordinary primary/secondary action hover retains the selected fills, lift and shadow. Tertiary, icon-only and disclosure controls stay still. Horizontal navigation shows only solid active and lighter animated hover underlines. Use Tab, Enter/Space and reduced motion; click records outside their title and verify one dialog opens and focus returns. Normal local startup commands remain npm.cmd run dev:admin and npm.cmd run dev:storefront. The isolated playground launcher is documented below.

## Implementation and architecture

The frontend repository contains the React admin application, Astro storefront/customer SSR adapters, shared UI/theme packages and named API adapters. The sibling backend repository owns Vendure authentication, document authorization, compliance calculations and durable account settings. Both repositories had substantial pre-existing modified/untracked work. Existing files were preserved before first edit under the ignored `.runtime/ui-refinement/before` inventory; no reset, clean, commit, remote Git action or deployment was performed.

The pre-edit inventory inspected all three admin scopes, CustomerLayout, Documents Library/Requirements/Vendor compliance/reports/agreements, shared primitives, tokens and account settings. Existing UI_COMPONENTS.md and COMPONENT_USAGE_GUIDE.md govern these extensions. This task adds bounded compositions to their standards without selecting unrelated pending categories.

Existing Button, Card, Dialog, DataTable, SearchSelect, Badge, Field, Input, DashboardFrame, DashboardMenu and navigation icon paths are reused. New components exist only where these primitives lacked the requested composition:

| Component                                      | Why and reuse                                                                                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RecordDetailsTable, internal DataTable adapter | Existing DataTable did not provide record summaries or a dialog lifecycle. It composes DataTable/Button/Dialog and keeps feature-owned cells/commands.            |
| RecordCard                                     | Existing Card is a surface without a record-detail interaction. Composes Card/Button/Dialog and accepts an existing feature dialog callback.                      |
| SearchableMultiSelect                          | SearchSelect supported one value. Both now compose the same internal SearchChoices search, popup, keyboard and option presentation.                               |
| IconButton and UtilityIcon                     | Button already supports icon sizing/loading; this composition adds required action names, shared SVG geometry and Tooltip.                                        |
| Tooltip                                        | InfoTip retains its small information button and now composes Tooltip. All targets share native top-layer positioning, dismissal and the account-colored surface. |
| MarketPlatformLogo                             | Reuses the existing market-stall navigation icon in one replaceable platform-brand component.                                                                     |
| DocumentVersionPicker                          | Document-specific, read-only composition of SearchSelect, status, metadata, placeholder and exact-file download.                                                  |
| DashboardAppearance provider/settings          | User preference lifecycle and form composition around existing tokens and settings-store APIs. No existing account palette editor was available.                  |

## Record and document behavior

Management summaries expose only the primary identifier and meaningful status. A single named native button provides keyboard activation; row/card surface clicks delegate to it without nested summary controls. Original cell content is grouped under its original field labels inside the established Dialog. Native modal focus, Escape, the circular header X, mobile scrolling and existing action confirmations remain in force. Existing complete feature dialogs are reused directly for application submissions, listing approval and occurrence participation.

Stable keyed records update open detail content after refreshed data. Feature controllers retain search, sorting, pagination, empty/loading/error states, command validation, permission checks and backend commands. Unrecognized stateful row shapes retain their full original table; the Vendor publication row was adapted into ordinary cells with its read/mutation controller retained inside detail content. No domain calculations or API action names changed.

Library summaries contain only the document title, safe file-type placeholder, category, scan/expiration status and applicable expiry. The modal retains notes, issue/expiry dates, created/updated timestamps, replace/edit/delete actions, all accessible file versions and market-grant revocation. The selected file changes its placeholder, filename, size, original metadata, scan status and download target. It never changes the current version or publication state. Unavailable files cannot download; existing available older versions remain selectable. Existing confirmation and grant boundaries remain unchanged.

Agreement summaries open the existing reader. Request summaries open their actions and decision history. Vendor readiness rows open authoritative counts and the vendor's request cards. Reports keep filter/export behavior and expose every original field and action in record dialogs, including complete reasons instead of the previous 240-character excerpt.

## Coverage inventory

| Area                                                  | Coverage                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| /market/documents and /vendor/documents, Library      | Migrated document cards, metadata/actions/version selection and access grants.                                                                                                                                                                                                                                                       |
| Documents, Requirements                               | Both requirement creation and Add vendors use shared multi-select. Existing distribution/assignment controllers retained.                                                                                                                                                                                                            |
| Documents, Agreements                                 | Summary cards reuse the reader; published version uses SearchSelect; acknowledgment vendor assignment uses multi-select.                                                                                                                                                                                                             |
| Documents, Vendor compliance/Market requests          | Vendor readiness table and request cards open detail dialogs.                                                                                                                                                                                                                                                                        |
| Documents, Readiness and reports                      | Summary and detailed report rows, exception records and upcoming readiness use the summary pattern. Export and date/filter authority retained.                                                                                                                                                                                       |
| Market/Vendor overview document panels                | Request-by-market and upcoming readiness summaries migrated.                                                                                                                                                                                                                                                                         |
| /market, /market/vendors                              | Overview relationships and membership directory migrated.                                                                                                                                                                                                                                                                            |
| Market relationship details                           | Listing approvals and occurrence participation open their existing complete dialogs directly.                                                                                                                                                                                                                                        |
| /market/occurrences, /market/operations               | Occurrence selection lists migrated; operational order quantities remain visible comparison tables.                                                                                                                                                                                                                                  |
| /market/applications, /market/application-submissions | Application template summaries and submission summaries migrated; existing review dialog retained.                                                                                                                                                                                                                                   |
| /vendor/products, /vendor/customers                   | Product and customer directories migrated; original detail navigation retained inside dialogs.                                                                                                                                                                                                                                       |
| /vendor/markets                                       | Relationship, publication/listing and occurrence-management lists migrated.                                                                                                                                                                                                                                                          |
| /platform/tenants                                     | Tenant directory migrated; tenant detail routes and authority retained.                                                                                                                                                                                                                                                              |
| Admin scopes                                          | Shared sidebar rail, logo, tooltips, workspace refresh and Settings colors.                                                                                                                                                                                                                                                          |
| Other utility actions                                 | Shared ReadState refresh, document edit, account refresh, agreement draft edit and occurrence-layout edit use named icon buttons.                                                                                                                                                                                                    |
| Customer SSR                                          | Reuses the platform logo; existing shell/navigation and public palette remain unchanged.                                                                                                                                                                                                                                             |
| Ordinary dropdowns                                    | Shared SEL-03 and SEL-07 truncation, height and arrow spacing apply to existing consumers.                                                                                                                                                                                                                                           |
| Already suitable specialists                          | Directory/rental edit dialogs, saved-layout disclosures, calendar/timezone controls, maps, customer SSR forms and status mapping remain with their existing controllers.                                                                                                                                                             |
| Intentional exceptions                                | Orders, line items, inventory/stock, monetary attribution, invoices, analytics and sales-window/cap comparisons retain essential visible columns. Decision/version/acknowledgment audit tables already inside detail dialogs retain their meaningful historical columns. Public product/storefront cards are outside this migration. |

## Searchable selection

Selected options always precede unselected options. Both groups use Intl.Collator with case-insensitive locale-aware alphabetical comparison and a stable value tie-breaker. Searching preserves the two groups; selection changes re-sort immediately. Check-style indicators, aria-selected, disabled options, active-descendant navigation, Home/End/arrows/Enter, Escape and outside blur are shared with single selection. Single-select retains compact display labels such as phone prefixes while announcing the complete country identity.

Controlled or default selections serialize repeated hidden form values through the original field name. Required selection uses native custom validity on the combobox. Native form reset is retained. A long result list scrolls inside the popup. The three permanently visible document multi-selection lists were replaced. Existing vendor IDs, assignment commands, permission checks and backend contracts are unchanged.

## Sidebar, utility actions and branding

Market, Vendor and Platform use the same AdminShell/DashboardFrame. Desktop collapse retains a 76px icon rail, platform mark, active states, hierarchy and expand control. The unboxed panel control is inside the sidebar. Link names remain accessible; custom focus/hover tooltips supplement the hidden visible labels. At 767px and below, the existing mobile disclosure/navigation remains in control. Customer SSR keeps its existing collapse adapter.

IconButton composes the approved Button variants, a two-curved-arrow refresh icon, paper-and-pencil edit icon, 44px touch target, accessible full label, tooltip, disabled and loading states. Meaningful action labels remain for other commands. Contextual labels were shortened where unambiguous; destructive confirmations retain their descriptive consequences.

MarketPlatformLogo reuses navigationIconPaths.markets. The same component renders the admin sidebar, admin session screens and customer SSR sidebar. Actual tenant logos in the admin header and public storefront branding are retained.

## Account palette and backend persistence

Palette coverage and sizing follow-up, 2026-10-17: the Theme preset field and its native popup now use half the available form width from 768px upward, with full width below that breakpoint. Popup anchor sizing keeps its width matched to the control while preserving all four swatches and chevron clearance. Shared table rows now use the surface token, a 3% primary stripe and 7% primary hover/focus tint. Native/selectable option highlights use primary at 6% for hover/keyboard active and 12% for selected; native/searchable popup surfaces, foregrounds, borders and shadows also use palette tokens. The platform mark/name now uses primary, Account mode labels use secondary, and sidebar hover no longer retains fixed green. Status colors and preference persistence are unchanged. Changes are owned by `packages/ui/src/styles.css`; no new component or backend change was needed.

Coverage verification: 37 existing component tests and 10 responsive/persistence browser cases passed. Direct local browser checks with temporary Plum tokens verified logo text/SVG stroke, the real Account mode label, native option hover, matching half-width desktop/full-width mobile control and popup geometry at 390px/768px/1280px, and no horizontal overflow. The real Documents workspace passed themed alternating/hover rows and searchable option hover/selection checks. An initial direct row probe expected the record-card 6% tint; the existing higher-specificity table hover correctly uses the documented 7%, and the corrected probe passed. Prettier and whitespace checks passed. No screenshots were taken. The direct palette probes did not save settings; the existing persistence browser case used and restored the disposable fixture accounts. Refresh Settings and save a non-green preset, then review the brand, Account mode, table rows and dropdown highlights.

Preset swatch follow-up, 2026-10-17: every Theme preset option and its selected value now includes four 14px squares with 4px rounded corners, ordered primary, secondary, dashboard background and card surface. A subtle foreground-token border keeps light colors visible. The existing SelectField native customizable picker handles rich option content and selectedcontent cloning; older native pickers retain plain names and selection semantics. Decorative swatches are hidden from assistive technology. Workspace default reflects the workspace colors, and Custom colors uses the valid draft or saved fallback. No new component, library or persistence behavior was introduced. Files changed for this follow-up: `apps/admin/src/DashboardAppearance.tsx`, `packages/ui/src/styles.css`, root `UI_COMPONENTS.md`, root `COMPONENT_USAGE_GUIDE.md` and this report.

Swatch verification: all 14 existing refinement component tests passed. Direct local browser checks at 390px, 768px and 1280px confirmed four visible rounded swatches for every option, correct Ocean colors in the selected value, preserved 40px height, clearance before the chevron, no horizontal overflow and no page errors. TypeScript, focused ESLint, Prettier and whitespace checks passed. No screenshots were taken and no account settings were saved during these checks. Refresh Settings, open Theme preset and compare the four colors beside each name.

The existing significant dashboard groups are primary, secondary, background and surface. An account without a saved preference retains its existing workspace defaults, including the current approved branding accent. Restore defaults uses those existing defaults; saving an explicit palette then shares it across that account’s admin scopes. The four picker/HEX fields edit the existing --brand-* tokens. Contrast tips are advisory. Any structurally valid four-token HEX palette can be saved and reloaded, including light accents and dark surfaces. Foreground and muted text are derived for the chosen surface, and button/tooltip text is derived for their backgrounds. Fixed semantic status colors and retained domain specialists remain in place. This is not a migration of every specialist to a full dark theme.

The compact preview contains primary, secondary and tertiary buttons, a card, ordinary text and a status. Tertiary retains the shared soft fill/shadow and stationary hover behavior. Draft edits affect only the preview. Save persists and applies the palette to the current admin wrapper. Cancel restores the saved draft. Restore defaults previews defaults and requires Save. Load failures offer Retry; failed saves retain the saved palette.

Settings now includes a Theme preset SelectField with Workspace default plus five palettes: Forest, Ocean, Clay, Plum and Slate. The existing `@market/theme` package owns their four-token values; the existing PaletteEditor applies them as a draft without a new component or styling system. Each selection updates all four picker/HEX fields and the preview. A case-insensitive value match identifies the current preset, including saved presets after reload. Individual edits outside the presets display Custom colors. Save writes the existing palette payload, without a preset ID, schema change or backend modification. Cancel and Restore defaults retain their existing behavior, and the selector is disabled with the form while saving.

Settings follow-up verification: all 14 refinement component tests passed, including every preset's four-token preview, no automatic persistence, Custom colors, Cancel, defaults, saving and busy protection. Seven focused browser cases passed: Market/Vendor Settings at 390px, 768px and 1280px, plus account persistence/isolation. These verify the stationary tertiary preview, preset preview isolation, cancellation, saved Ocean selection after reload, and unchanged invalid-write rejection. TypeScript, focused ESLint, Prettier and whitespace checks passed. No screenshots were taken. Changed files: `apps/admin/src/DashboardAppearance.tsx`, `packages/theme/src/index.ts`, `tests/ui-refinement.test.tsx`, `tests/e2e/ui-refinement-live.spec.ts` and the root registry/usage guide plus this report. Manual review: choose each preset in Settings, hover all three preview buttons, customize a field, Cancel, then choose a preset, Save and reload.

The backend registers marketDashboard.palette on Vendure's existing SettingsStore through PlatformIdentityPlugin. Requires Authenticated; scope is derived only from ctx.activeUserId and excludes channel/tenant IDs, so the user's own scopes share it. Server validation enforces exactly four six-digit HEX fields and rejects CSS injection/extra tokens. Contrast is not a server-side rejection condition. Unauthenticated scope resolution fails closed. The frontend uses generated named get/setSettingsStoreValue operations with existing cookie/channel transport. No arbitrary CSS, client account override, localStorage authority, authentication changes, new entity, schema extension or database migration.

The provider belongs to the current authenticated account. Changing account immediately replaces the previous palette with defaults while the next preference loads; late reads are ignored. Signing out unmounts the provider. No preference is applied to storefront/customer commerce pages or written to tenant branding.

## Verification

Initial refinement verification (before the follow-up control changes below):

| Check                               | Result                                                                                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend full Vitest suite          | 465/465 passed, 0 failures across 36 files.                                                                                                                                                                                         |
| New responsive/live browser cases   | 13/13 passed: Documents Library/readiness/reports/vendor selection and Market/Vendor/Platform navigation at 390px, 768px and 1280px, plus real two-user palette persistence and invalid-write rejection.                            |
| Equivalent record-list browser case | 1/1 passed across five Market/Vendor fixture routes: occurrences, relationships, products, customers and Market relationships. Total new browser cases: 14 passed.                                                                  |
| Accessibility                       | Axe checks passed for the tested pages/dialogs, including Platform fixture shell and all tested widths; no page-wide overflow. Keyboard activation, Escape/focus restoration, truncation, fixed height and arrow alignment checked. |
| Frontend typecheck                  | Passed. Astro: 84 files, zero errors/warnings/hints.                                                                                                                                                                                |
| Frontend lint/format/boundaries     | npm.cmd run lint passed; nine-workspace package graph valid. Final added browser helper also passed ESLint/format checks. ESLint emits an existing AST utility diagnostic about TSNonNullExpression without a rule failure.         |
| Frontend builds                     | Both Astro storefront SSR and Vite admin builds passed. The existing large-chunk warning remains; the temporary invalid-pseudo-element warning found during implementation was corrected.                                           |
| Backend account-preference tests    | 2/2 passed: authenticated user/channel scoping and exact-value/contrast/injection rejection.                                                                                                                                        |
| Backend typecheck/build             | tsc --noEmit passed. Build passed with APP_ENV=dev and NODE_ENV=development. An initial build without the explicit environment was rejected by the existing APP_ENV_EXPLICIT_MODE_REQUIRED guard; no guard was changed.             |
| GraphQL generation                  | Generated through the existing codegen configuration; no schema or generated file was hand-edited.                                                                                                                                  |
| Whitespace                          | git diff --check passed in both repositories.                                                                                                                                                                                       |

Commands executed include npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, the full Vitest runner, the dedicated Playwright config, node --import tsx scripts/check-boundaries.ts, GraphQL codegen, backend tsc --noEmit and node --require ts-node/register --test test/dashboard-preferences.test.ts. The backend build used process-local development environment values only.

The baseline gallery build-guard failure did not recur in the final full suite. All regressions introduced during implementation were corrected. Existing behavior assertions were retained while their entry points were updated to the new summaries. Some initial browser attempts failed due to stale test selectors, a missing channel header in the direct invalid-write test, in-progress animation measurements and the Documents fixture's missing Platform API. Those harness issues were corrected. A real heading-order issue in the fixture shell fallback was also corrected.

Limits: developer visual acceptance is pending. Platform browser checks use FixtureAdmin because the disposable Documents harness does not include Platform-management APIs. Live tenant-directory mutations were not exercised. Financial/comparison specialists were intentionally retained. The follow-up accepts dark palettes, while retained fixed-color specialist surfaces remain an explicit limit of general dark-theme coverage. No requested functional feature is deferred; manual design acceptance and the listed environment-specific coverage remain explicit.
The initial pre-edit Vitest baseline had 451 passes and one existing isolated UI gallery build-guard failure. Tests for changed flows were updated to enter the new dialogs while preserving command, permission, stale-read and confirmation assertions. A phone-country keyboard regression found during the full suite was corrected in shared SearchChoices.

The Documents backend harness was started against a newly created guarded vendure_test_documents_* database using freshTestDatabase. The protected vendure development database was not modified. Existing document/compliance/notification/authorization checks completed during fixture setup. The test scanner is synthetic for this disposable fixture; no live antivirus service was started or reconfigured. Platform-management APIs are not included in that harness; Platform sidebar browser checks use the existing FixtureAdmin entry and the actual shared shell. Market/Vendor routes and two-user preference tests use the real local backend.

No screenshots are required for acceptance. Developer design review remains manual.

## Follow-up control refinement, 2026-10-16

The additional developer review is implemented through the same shared components. No new production UI primitives, libraries or business controllers were introduced.

- Buttons and action anchors use pill edges and a 44px shared height. Matching inputs/selects shorten to 44px and retain rectangular corners; multiline controls retain their specialist geometry. Utility icon actions have no border or filled hover surface.
- Dialog and Drawer place a Close-named X SVG in a circular translucent background beside the title. Footer Close controls were removed from the shared component and the Vendor inventory, Market relationship/listing/offering/participation and application-review forms. Submit/confirmation actions and the existing busy/draft/focus lifecycle remain intact.
- Tooltip now uses a native manual popover in the browser top layer, retains inherited account variables, measures its actual width and places it beside the control. InfoTip composes it, so modal help is not clipped or forced into the form layout. Older browsers without the Popover API retain fixed positioning and the maximum fallback z-index; full escape from ancestor clipping requires native popover support.
- Native React selects enhance to an explicit customizable picker button and constrained selectedcontent where supported, retaining native values, form semantics and an SSR-safe fallback. Select and SearchSelect reserve 3rem before the right-aligned chevron. SearchableMultiSelect composes the existing native Checkbox, with vertically centered alignment and no custom surrounding indicator.
- Record-row/card outlines depend on focus-visible descendants. Pointer selection does not leave the harsh outline; keyboard navigation retains it.
- Contrast guidance is advisory in the editor and the existing account-preference validator. Strict HEX/allowlist validation, authenticated user scope and isolation remain. Derived readable foregrounds cover shared text, primary buttons and tooltip surfaces. Secondary hover borders and inactive sidebar icons consume the saved secondary color. The existing minimal backend preference file was adjusted for this Save behavior; no entity, dependency or migration was added.

The browser-only control preview composes production primitives to test geometry and tooltip placement inside a modal at all three requested widths. It is not shipped by the application. The insurance workflow itself remains a manual design check; the browser checks exercise the same Dialog, Field/InfoTip and Input composition.

Follow-up verification:

| Check                            | Result                                                                                                                                                                                                                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full frontend component suite    | 466/466 tests passed across 36 files. Includes the new advisory-color save/reload case.                                                                                                                                                                                                                               |
| Local browser cases              | 17 unique cases passed. The first 14 existing cases passed in the full run; the updated account case and three new control cases passed in the focused rerun.                                                                                                                                                         |
| Responsive shared control checks | Passed at 390px, 768px and 1280px: 44px/pill geometry, theme hover border and tooltip surface, truncation before the chevron, native checkbox centering, modal header X, top-layer help without layout movement, pointer outline absence and keyboard outline presence. Axe passed for the tested dialog composition. |
| Live preference persistence      | Valid white primary/dark surface colors save despite tips and survive reload. Saved secondary color reaches hover borders and inactive sidebar destinations. Two-user isolation and injection rejection still pass.                                                                                                   |
| Frontend typecheck/build         | Passed. Astro reports 84 files with zero errors, warnings or hints. Both storefront and admin build successfully, with existing large-chunk notices.                                                                                                                                                                  |
| Backend preference tests/build   | 3/3 tests passed, including advisory contrast acceptance, strict injection/token validation and authenticated scope isolation. Backend dashboard/server/worker build passed with process-local development environment values.                                                                                        |
| Lint/format/boundaries           | Passed; the existing nonfatal TSNonNullExpression diagnostic remains. Documentation and final test edits were formatted and rechecked.                                                                                                                                                                                |

The initial full run had five obsolete footer-location assertions. These were revised to assert the X in the header while preserving submission, confirmation, busy protection and restored-focus assertions. The initial three browser control cases incorrectly treated a computed outline width as visible even when outline-style was none; the assertions now verify the actual style, plus the solid 2px keyboard ring. Those are resolved test-contract updates, not skipped cases. No screenshots, recordings or traces were captured for this follow-up.

## Isolated button playground

The separately requested experimental page is at [http://127.0.0.1:4343/buttons](http://127.0.0.1:4343/buttons). It runs in the existing isolated gallery and requires no sign-in or backend. To start it from the frontend repository:

```powershell
$env:NODE_ENV = 'development'
node --import tsx scripts/dev-ui-gallery.ts --enable-local-gallery
```

Adjust Roundness, Height and Horizontal padding. Height owns the vertical space, so there is no duplicate vertical-padding control. All samples update together. The preview displays primary, secondary and tertiary text buttons plus the current CSS values. Reset restores the initial values. Nine comparisons below show stronger color, darker background, slide up, grow, soft shadow, solid fill, inset edge, color sweep and soft shine. Hover or keyboard-focus a sample, or enable Keep effects visible to compare them together. Reduced motion removes movement.

This is a fixture composition because the existing gallery only supplies static specimens. It reuses Button, Card, Field, Input and Checkbox. The tertiary appearance and sample geometry/effects are scoped beneath `.button-playground` and are not shared variants. No application routes, shared UI/theme files, other gallery specimens or backend code were changed. The fixture middleware only adds `/buttons` to its existing local GET allowlist; build/preview rejection and network/form guards remain.

Playground follow-up: Grow enlarges both its surface and text by 6%, with the same 180ms ease transition. The label animates actual font size from 1em to 1.06em so the browser renders the glyphs at their current size. A hidden, aria-hidden measurement label reserves the normal width, keeping the visible text centered without moving neighboring buttons. The button and text have no scale transform or forced compositing. This supersedes the earlier fixed-size label experiment. Secondary hover fills still match the corresponding tertiary samples, and the primary Inset edge sample retains no outer border. All adjustments remain local to the playground.

The latest browser measurements passed for all three Grow variants: font size increased from 16px to 16.96px as the surface reached 1.06 scale. Across 25 to 26 animation frames per variant, the maximum difference between their growth ratios was below 0.00001, with zero button layout movement. Reduced motion disables both kinds of growth. Root TypeScript, targeted ESLint and formatting checks pass. Paint appearance remains subject to the developer's manual review. No screenshots were taken. Refresh the gallery page to load the updated fixture styles.

Files for this page: `tests/fixtures/ui-component-gallery/src/pages/buttons.astro`, `src/components/ButtonPlayground.tsx`, `src/components/button-playground.css` and the existing `src/middleware.ts` under that same fixture. This registry and report were updated to identify the experiments without approving a new standard.

Verification: root TypeScript, fixture Astro diagnostics (16 files, zero errors/warnings/hints), targeted ESLint/Prettier and all eight existing gallery tests passed. Local browser checks verified all sliders at their extremes, reset, all nine visible effect states, actual hover, reduced motion and no page-wide overflow at 390/768/1280px. Axe reported no violations at 390px and 1280px, with no page errors. Protected gallery routes still return 404. No screenshots were taken.

## Manual verification

The current local review uses the existing backend port 3000 and admin port 4322. If those servers are already running, open [the admin application](http://localhost:4322/market/documents). Use the existing fixture accounts printed by the disposable Documents harness, including the Market A/Market B managers and Vendor owners; use the password printed by that harness. No passwords are recorded here.

For the disposable demo, choose **Administrator username** in **Sign in with**. The existing manager fixtures are `market-a@test.invalid` and `market-b@test.invalid`; the existing Vendor owner fixture is `identity-owner-0@test.invalid`. Use the fixture password printed by startup. For normal project data, use your existing authorized account and normal sign-in method.

For an ordinary local project session, start the existing configured backend from the sibling repository with npm.cmd run dev:server, then start this repository with npm.cmd run dev:admin. Existing scanner/account environment prerequisites still apply. Do not run migrations or reset the protected database for this UI change. For a fresh disposable Documents environment, use this repository's existing npm.cmd run demo:documents workflow and its printed fixture/account instructions. It uses the same documented ports. Keep the test fixture separate from protected development data.

1. Visit /market/documents. Library cards should show only the requested summary. Click any card, then use Tab, Enter/Space, Escape and the header X. Verify focus returns to the card. In its dialog, select another file version and check metadata/status/download; selection must not publish or replace anything. Check edit, replace, delete confirmation and access revocation using disposable records.
2. Open Vendor compliance. Rows should show Vendor and Readiness. Click a row to inspect counts and requests, then open a request. Verify review/waiver/download actions retain permissions and explanations. Close each dialog with Escape and Close.
3. Open Readiness and reports. Apply existing date/status/vendor/report filters. Open a row to inspect all report fields and available actions. Download the CSV and verify it still includes the authorized filtered records. Inspect/revoke a manager exception only in the disposable fixture.
4. Open Requirements and Add vendors. Search, select multiple vendors, deselect one and confirm that selected matches stay alphabetically above unselected matches. Use keyboard arrows, Home/End and Enter. Verify disabled controls and required selection. Check Request documents and agreement acknowledgment assignment use the same selection behavior.
5. On /market/settings, /vendor/settings and /platform/settings, verify the shared sidebar expanded and collapsed. Collapsed navigation remains visible as icons; focus/hover displays destination tooltips. Expand shows names and branding. The Platform live route requires your normal authorized Platform account because the Documents fixture omits platform-management APIs.
6. Check /market/occurrences, /market/operations, /market/applications, /market/application-submissions, /market/vendors, /vendor/products, /vendor/customers, /vendor/markets and /platform/tenants with the applicable existing role/data. Open records and verify original navigation/actions. Financial, analytics, stock and invoice comparisons retain their columns.
7. In admin Settings, change each color with both picker and HEX input. Only the mock preview should change before Save. Cancel restores the saved draft. Restore defaults previews defaults until Save. Invalid HEX disables Save. Contrast tips remain optional and Save stays enabled for valid colors, including white accents or dark card backgrounds. Check the secondary hover border, tooltip surface and inactive sidebar icons follow the chosen palette. Save should update the dashboard; reload and navigate to Documents to verify persistence.
8. Two-user isolation in the same browser: sign in as User A, customize and save, reload, sign out completely, sign in as User B and verify defaults or B's own palette, sign out, return to A and confirm A's original palette. Return disposable test accounts to their defaults after verification.
9. Open a document or insurance edit modal. Hover/focus its help icon and check the tooltip appears next to it above the modal without moving content. Close through the circular header X, verify focus returns to the trigger and check busy forms cannot be dismissed. Check refresh/edit icons have no border and controls are shorter.
10. On /market/vendors, click/open/close a row using the pointer and verify no harsh outline remains. Navigate back to that row with Tab and verify the keyboard indicator is visible.
11. Repeat at approximately 390px, 768px and 1280px. Mobile retains the existing navigation menu and dialog scrolling. Check there is no page-wide horizontal overflow, controls remain reachable, selected dropdown text stays on one line, arrows stay at the right edge and utility icons have usable touch targets. Test reduced motion and keyboard focus.

To rerun the new live functional/accessibility suite with the disposable demo active, use PowerShell:

```powershell
$env:UI_REFINEMENT_DISPOSABLE = 'true'
node node_modules/@playwright/test/cli.js test --config playwright.ui-refinement.config.ts
```

Do not set that flag against protected development data. The palette test saves and restores only disposable fixture-account preferences.

## Exact changed files

Paths below are relative to the named repository. Added/modified status describes this task, including pre-existing untracked document files that were extended. Source files not listed retain their pre-task contents. Ignored local test logs, screenshots created before the developer requested no more screenshots, snapshots and helper scripts remain under .runtime/ui-refinement; they are not product changes.

Frontend repository, E:/coding/farmers-market-platform-web:

| File                                                      | Task change                 |
| --------------------------------------------------------- | --------------------------- |
| COMPONENT_USAGE_GUIDE.md                                  | Modified                    |
| UI_COMPONENTS.md                                          | Modified                    |
| apps/admin/src/AdminApp.tsx                               | Modified                    |
| apps/admin/src/AdminShell.tsx                             | Modified                    |
| apps/admin/src/DashboardAppearance.tsx                    | Added                       |
| apps/admin/src/documents/Agreements.tsx                   | Modified                    |
| apps/admin/src/documents/ComplianceOverview.tsx           | Modified                    |
| apps/admin/src/documents/ComplianceReports.tsx            | Modified                    |
| apps/admin/src/documents/DocumentsWorkspace.tsx           | Modified                    |
| apps/admin/src/management/payments.tsx                    | Modified                    |
| apps/admin/src/management/platform.tsx                    | Modified                    |
| apps/admin/src/market/occurrences.tsx                     | Modified                    |
| apps/admin/src/market/operations.tsx                      | Modified                    |
| apps/admin/src/market/overview.tsx                        | Modified                    |
| apps/admin/src/market/phase14/ApplicationReview.tsx       | Modified                    |
| apps/admin/src/market/phase14/Applications.tsx            | Modified                    |
| apps/admin/src/market/phase14/OccurrenceLayoutActions.tsx | Modified                    |
| apps/admin/src/market/vendors.tsx                         | Modified                    |
| apps/admin/src/vendor/inventory.tsx                       | Modified                    |
| apps/admin/src/vendor/catalog.tsx                         | Modified                    |
| apps/admin/src/vendor/common.tsx                          | Modified                    |
| apps/admin/src/vendor/customers.tsx                       | Modified                    |
| apps/admin/src/vendor/markets.tsx                         | Modified                    |
| apps/storefront/src/layouts/CustomerLayout.astro          | Modified                    |
| docs/UI_DESIGN_REFINEMENT.md                              | Added                       |
| packages/api/operations/admin.graphql                     | Modified                    |
| packages/api/src/dashboard-preferences.ts                 | Added                       |
| packages/api/src/generated/admin.ts                       | Regenerated from operations |
| packages/api/src/index.ts                                 | Modified                    |
| packages/theme/src/index.ts                               | Modified                    |
| packages/ui/src/SearchSelect.tsx                          | Modified                    |
| packages/ui/src/dialog.tsx                                | Modified                    |
| packages/ui/src/documents.tsx                             | Modified                    |
| packages/ui/src/index.tsx                                 | Modified                    |
| packages/ui/src/record-details.tsx                        | Added                       |
| packages/ui/src/styles.css                                | Modified                    |
| packages/ui/src/utility.tsx                               | Added                       |
| playwright.config.ts                                      | Modified                    |
| playwright.ui-refinement.config.ts                        | Added                       |
| tests/compliance-phase3.test.tsx                          | Modified                    |
| tests/documents.test.tsx                                  | Modified                    |
| tests/e2e/ui-refinement-live.spec.ts                      | Added                       |
| tests/dialog-lifecycle.test.tsx                           | Modified                    |
| tests/phase-a-remediation.test.tsx                        | Modified                    |
| tests/fixtures/control-refinement-preview.tsx             | Added                       |
| tests/market-c5.test.tsx                                  | Modified                    |
| tests/market-dashboard.test.tsx                           | Modified                    |
| tests/market-operations.test.tsx                          | Modified                    |
| tests/market.test.tsx                                     | Modified                    |
| tests/notifications.test.tsx                              | Modified                    |
| tests/phase-cd-presentation.test.tsx                      | Modified                    |
| tests/phase15.test.tsx                                    | Modified                    |
| tests/ui-refinement.test.tsx                              | Added                       |

Backend repository, E:/coding/farmers-market-platform:

| File                                                      | Task change |
| --------------------------------------------------------- | ----------- |
| src/plugins/platform-identity/dashboard-preferences.ts    | Added       |
| src/plugins/platform-identity/platform-identity.plugin.ts | Modified    |
| test/dashboard-preferences.test.ts                        | Added       |

No new migration is needed. No protected database migration was run. No dependencies were added.
