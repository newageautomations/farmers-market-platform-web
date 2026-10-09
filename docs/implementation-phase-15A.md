# Phase 15A: Dashboard cleanup

Implementation started October 8, 2026. All work is local. The user explicitly authorized changes to both the web project and its sibling backend after the existing contracts were found to lack advanced recurrence, time questions, and application renaming.

## Application editing

- Replaced the separate question list and inspector with form cards modeled on Google Forms. One card is editable at a time; the other cards show the applicant-facing controls.
- Added editable question titles, friendly question-type names, individual option inputs, add/remove option buttons, required toggles, and a six-dot drag handle.
- Supported short answer, paragraph, multiple choice, checkboxes, dropdown, date, time, Yes/No, number, email, phone, website, and description fields. Multiple choice now uses radio buttons and checkboxes use actual checkbox groups in both the builder preview and storefront renderer.
- Retained the recommended base questions already supplied by the backend: business and contact identity, phone, business description, website/social links, business type/category, booth dimensions, electricity, vehicle access, and setup notes.
- Preserved the four system-required identity fields. Their type and required status remain protected. Optional system questions and custom questions can be removed. Optional system questions retain their semantic types while present so booth and contact data remain valid.
- Create application immediately creates `Untitled application` and opens its draft. Application name can be edited and saved with the draft. Creating a new draft version opens the returned version.
- Made sections visible immediately, with editable names, drag ordering, keyboard-friendly move buttons, and removal. Removing a section moves its questions into a remaining section. Questions can move between sections using the section selector or drag/drop. New sections are inserted after the selected question's section.
- Separated template editing from submitted applications into distinct navigation pages.
- Submitted applications open in a native, centered, scrollable modal with close/Escape behavior. Initial focus goes to the title and the response starts at the top rather than scrolling to a decision control. Blank optional answers and empty optional sections are omitted; meaningful `No` and `0` answers remain visible. Empty booth requirements and empty phone separators are also omitted.
- Added backend support and validation for `TIME` answers. Corrected required checkbox-group validation to reject an empty answer array.
- Draft application renames use the existing scoped, revision-checked, transactional `SAVE_APPLICATION` command. Published definitions and historical submissions retain their existing protections.

## Layouts, businesses, and rentals

- Create layout immediately creates `Untitled layout` without a preliminary name form.
- Separated the external business directory, add external business page, rental catalog, and add rental equipment page.
- Added an explanation of external businesses: managers can reserve booths and track participation for businesses without a platform account, and link them later.
- Rental prices are entered in USD, limited to two decimal places, formatted to `.00` on blur, and converted to integer cents only when saving. Currency is fixed to USD in the rental editor.
- Added one-sentence hover/focus information bubbles for every rental field, including availability, capacity, quantity limits, sort order, and required amenities.
- Business and rental editors preserve their entered values when a command fails.
- Invalid or oversized rental prices show an inline error before submitting a command.

## Occurrences and settings

- Split the occurrence list, repeating schedule/generation page, and manual creation page.
- Moved recurrence editing out of Settings so repeating rules and generated dates are managed together. A repeating rule describes the pattern; generation creates the individual market dates. Saving a rule never rewrites existing dates.
- Added weekly, every-other-week, and selected weeks of the month, with multiple weekdays and multiple monthly positions. Second and fourth Saturdays are supported.
- Every-other-week uses Monday-based weeks anchored to the week containing the first effective date. Monthly positions refer to the first through fifth occurrence of each selected weekday.
- Added backend validation and matching for these patterns. Synchronous and queued generation both use the same existing generation service, transaction, authority checks, horizon, DST checks, snapshots, and persisted generation keys. Legacy weekly JSON rules continue to work without a migration.
- Added a generation-execution information bubble and friendly choices: Create now or Run in background.
- Manual creation and revision now use start/end dates and times plus a US timezone dropdown. The UI converts local wall times to UTC for the API and rejects nonexistent or ambiguous daylight-saving times. It exposes no UTC entry field. The stored occurrence is interpreted in the market's configured timezone by the existing backend contract.
- Settings offers friendly Pacific, Mountain, Central, Eastern, Arizona, Alaska, and Hawaii choices backed by real IANA timezone identifiers. Arizona and Hawaii retain their distinct daylight-saving behavior.
- Added information bubbles for venue snapshots, pickup instruction snapshots, and preorder overrides.
- Renamed preorder opening/closing controls to explain days before market day and local times, with Saturday examples. These shared controls also apply to vendor participation and Settings.
- Preorder override inputs appear only when the override is enabled, making the checkbox's effect visible immediately.

## Navigation and presentation

- Added sidebar subpages that expand on hover, keyboard focus, or the expand button. On mobile they use the same expandable groups.
- Split vendor detail workflows into business membership, occurrence participation, listing approvals, and product offerings pages.
- New routes retain existing read/manage permission boundaries; direct unrecognized routes still fail closed.
- Styled navigation links as buttons, added button hover/focus treatments and spacing, aligned buttons with adjacent fields, and grouped editing controls into readable cards.
- Added responsive styles for narrow screens and a reduced-motion override. Added no breadcrumbs, eyebrow headings, decorative section numeration, or em dashes.

## Files changed

Web project:

- `apps/admin/src/AdminShell.tsx`: grouped sidebar navigation and cleanup stylesheet.
- `apps/admin/src/phase15.css`: dashboard cards, spacing, button alignment, modal sizing, and responsive layout.
- `apps/admin/src/market/MarketRoutes.tsx`: new routed subpages.
- `apps/admin/src/market/occurrences.tsx`: separated occurrence workflows and friendly generation/manual controls.
- `apps/admin/src/market/settings.tsx`: timezone selection and removal of redundant recurrence editing.
- `apps/admin/src/market/schedule.tsx`: repeating schedule editor and validation.
- `apps/admin/src/market/timezones.tsx`: US timezone options and DST-safe wall-time conversion.
- `apps/admin/src/market/common.tsx`: clearer preorder fields and local-time session forms.
- `apps/admin/src/market/vendors.tsx`: separate vendor workflow pages.
- `apps/admin/src/market/fixture.ts`: updated development recurrence data.
- `apps/admin/src/market/phase14/ApplicationBuilder.tsx`: form-card builder.
- `apps/admin/src/market/phase14/Applications.tsx`: untitled creation, submissions page, modal review.
- `apps/admin/src/market/phase14/Directory.tsx`: separate business and rental pages, USD editor, information bubbles.
- `apps/admin/src/market/phase14/Layouts.tsx`: untitled layout creation.
- `apps/admin/src/market/phase14/OperationsRoutes.tsx`: new operation-page mappings.
- `apps/admin/src/market/phase14/common.tsx`: shared field information bubbles.
- `apps/admin/src/vendor/common.tsx`: button-style route links and information support for fields.
- `packages/admin-core/src/index.ts`: subpage navigation and permission checks.
- `packages/ui/src/index.tsx`: reusable information bubbles, field information support, and optional title focus for long dialogs.
- `packages/ui/src/ApplicationFields.tsx`: time fields, radio/checkbox rendering, omission of unanswered optional fields.
- `packages/ui/src/styles.css`: information-bubble and choice-group styles.
- `packages/api/src/market-operations.ts`: time question type.
- `packages/api/operations/market.graphql`: recurrence fields in configuration reads.
- `packages/api/schema/admin.graphql`, `packages/api/schema/shop.graphql`, `packages/api/schema/provenance.json`, `packages/api/src/generated/admin.ts`, and `packages/api/src/generated/shop.ts`: regenerated schemas, source hashes, and typed API documents.
- `tests/market.test.tsx`: regression tests updated for the new pages and local-time controls.
- `tests/phase15.test.tsx`: focused dashboard cleanup and timezone regressions.
- `tests/fixtures/phase15-data.ts` and `tests/fixtures/phase15-preview.tsx`: explicit local test data and an in-memory test entry point, kept outside the production application.
- `scripts/test-phase15.ts`: actual browser drag/drop, saved edits, modal scrolling/focus, accessibility, and desktop/mobile qualification.
- `scripts/test-phase14.ts`: updated the existing real backend/browser application workflow to use the new builder, untitled creation, submissions page, and layouts. Its independent storefront server now uses Astro's `--ignore-lock` option so it can run beside an existing development server without replacing it.
- `tests/e2e/market.spec.ts`, `tests/e2e/market-live-mock.spec.ts`, and `tests/e2e/market-live.spec.ts`: updated routed scheduling and vendor workflows.
- `docs/evidence/phase15/`: 16 local screenshots of the builder at 1440/768/390 pixels, the long submission modal, and the generation, manual occurrence, rental, external business, Settings, and vendor participation pages at desktop/mobile sizes.
- `docs/evidence/phase15/unit-results.json`: a copy of the final 224-test unit report. The existing unit runner also refreshed its default report at `docs/evidence/phase13c5/unit-results.json`.
- `docs/implementation-phase-15A.md`: this implementation and validation record.

Backend project:

- `src/plugins/farmers-market/types.ts`: compatible recurrence options.
- `src/plugins/farmers-market/api/admin-api.ts`: recurrence GraphQL options.
- `src/plugins/farmers-market/recurrence/local-time.ts`: recurrence validation and date matching.
- `src/plugins/farmers-market/services/occurrence-generation.service.ts`: shared pattern matching for generation.
- `src/plugins/market-operations/model.ts`: time answers and required checkbox validation.
- `src/plugins/market-operations/service.ts`: draft-name persistence.
- `test/farmers-market/phase15.test.ts`: recurrence and application validation regressions.
- `test/market-operations/run.ts`: real database assertions for untitled creation, saved application rename, and submitted time answers.
- The existing backend build also refreshes `src/gql/graphql-env.d.ts` from its current API definitions.

## Validation log

- Extracted schemas from backend source without starting the backend or accessing a database; regenerated typed GraphQL documents.
- Initial frontend regression run exposed tests tied to the old combined pages and UTC labels. Updated those tests to exercise the new pages and equivalent commands.
- Dashboard regression suite: 74 tests passed.
- New cleanup suite: 17 tests passed.
- Focused backend checks passed for legacy weekly rules, alternate weeks, monthly combinations, effective boundaries, invalid rules, DST conversion, time-answer validation, optional deletion, protected identities, and required checkbox arrays.
- Initial backend build required an explicit application mode. Retried with local development mode; the sandbox then refused access to Vendure's installed dashboard entry file. Retried with approved local execution and the dashboard, server, and worker builds passed.
- Frontend full unit suite: 224 tests passed across 12 files, including the 17 new cleanup checks. TypeScript and Astro checks reported zero errors, warnings, or hints.
- Backend market operations database suite: 21 checks passed, including name/time persistence and existing tenant boundaries, snapshots, capacities, and transactions. Successful disposable databases were removed by the existing runner.
- Real application workflow browser suite: 14 checks passed, covering builder customization/publishing, anonymous application submission, manager acceptance, layouts, map, billing, Market Day, and vendor projections. The first attempt encountered an already running Astro development server; the independent test server was corrected to run alongside it and the rerun passed.
- Phase 15 browser qualification passed with no page runtime errors or Axe accessibility violations on the builder, modal, and six changed subpages. Native question drag/drop across sections was exercised with real mouse events. Responsive checks passed at 1440, 768, and 390 pixels without horizontal overflow.
- Inspected local screenshots and corrected the long modal's centering and initial scroll position. Browser assertions now enforce those behaviors. The automated screenshots use explicitly synthetic local data.
- Initial full lint found a formatting-only issue in the new browser script; formatted that file before the final lint run.
- Final ESLint, package boundary checks, and Prettier checks passed. The final production-local build passed for the storefront, admin, backend dashboard, server, and worker.
- Broader real scheduling/vendor integration passed all 12 browser checks, including queued generation followed by an authoritative occurrence list read, cross-market access refusal, same-session revocation, context switching, native dialog focus, and Axe/responsive checks at 390/768/1280 pixels. Its backend qualification checks also passed.
- The first broader browser attempt found old page routes and a non-exact selector that also matched the new information button. Corrected those test selectors and routes, and the complete rerun passed. That runner retained its failed-attempt database, `vendure_test_frontend_1791507042749_7a341d`, for diagnostics; it dropped the successful rerun database automatically.

## Local usage

Restart the local backend after changing its API and restart the admin development server. No database migration is required because recurrence and question definitions already use JSON columns.

From the web project:

```powershell
npm.cmd run dev:admin
npm.cmd test
npm.cmd run typecheck
$env:FRONTEND_NO_EVIDENCE='true'
npm.cmd run build:production-local
```

The production-local helper builds both projects using synthetic local configuration with provider integrations disabled. It does not publish or deploy anything. Use your existing local backend/demo startup workflow. Existing market dates and published application snapshots are preserved.

Optional focused browser qualification from the web project:

```powershell
npx.cmd tsx scripts/test-phase15.ts
```

On this computer the installed Playwright browser was selected with `PLAYWRIGHT_BROWSERS_PATH=C:/Users/jake_/AppData/Local/ms-playwright`. The browser qualification starts and closes its own loopback-only server.
