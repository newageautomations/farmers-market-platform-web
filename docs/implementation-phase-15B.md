# Phase 15B: Dashboard fixes and booth assignment cleanup

Work started October 8, 2026. Changes are local to the web and backend projects, as previously authorized.

## Request failure

- Reproduced the running local API's HTTP 400 response with a read-only request. `RelationshipPageOptions` and `ownOccurrenceCustomerOperations` were absent from that running schema.
- Traced the missing operations query to the backend's customer-history feature flag. The overview and Operations page depend on this query even when paid attribution and customer history are disabled.
- Moved the operational page DTOs and query into the native commerce schema and registered a separate market operations read resolver whenever native commerce is enabled.
- Kept the existing `ReadOwnMarket` permission, current market access checks, scoped database projection, bounded paging, and safe operational DTOs. This does not enable customer history or paid attribution.
- Changed the operations query to use `OwnMarketPageOptions`, which is independent of customer history. Regenerated source-derived schemas and typed GraphQL documents.
- Verified the listening process was the existing local `market-operations-demo/run.ts serve` backend, then restarted that same server to load the updated registration. Startup preserved the persistent demo database and workflow records.
- A read-only request to the reloaded `http://127.0.0.1:3000/admin-api` confirmed `ownOccurrenceCustomerOperations` is present, customer history remains disabled, and no GraphQL errors were returned.

## Booth map and assignments

- Added a booth hover card with dimensions, only amenities the booth has, the assigned business, and paid status when applicable.
- Added tooltip positioning that keeps the card inside the map viewport, including corner booths.
- A deliberate map click opens a native scrollable booth modal. Dragging pans the map rather than selecting a booth.
- Collapsed booth rows show the booth name and a labeled color indicator for Available, Assigned, or Paid. Expanding a row reveals details and an assignment action.
- Expanded administrative rows include booth type, fee, description, manager notes, and preferred business when present.
- The assignment modal allows directory business selection. Businesses without an occurrence approval can be approved for the date there before assigning the booth.
- Existing assigned booths open their current business assignment for edits. Issued-invoice safeguards and booth/rental constraints continue to use the existing backend commands.
- Command errors are also visible inside the assignment modal. Read-only users can inspect booths without assignment controls.
- Selecting a booth already occupied by a business with multiple booths opens that booth's assignment rather than the first assignment in the list.
- Kept map labels compact. Attendance, billing, rental, and note indicators appear in hover cards and expanded rows instead of overflowing adjacent booths.
- Grouped assignment modal actions in a wrapping toolbar so stacked mobile buttons remain aligned and spaced.

## Dashboard presentation

- Added stronger hover backgrounds, borders, and shadows for all administrative button styles, including secondary refresh buttons. Shared buttons, login buttons, and public map controls also receive hover feedback.
- Added horizontal spacing for adjacent buttons while retaining flex toolbar gaps and responsive wrapping.
- Added inline SVG icons to navigation labels and a slightly heavier local system font for desktop and mobile navigation.
- Replaced the navigation arrow button with a decorative SVG chevron. Active navigation groups expand automatically; hover and keyboard focus reveal other groups. Mobile parent navigation opens its subpages.
- Native field dropdowns use decorative chevrons instead of platform arrows.
- Added consistent white cards matching the repeating schedule editor for overview groups, operation controls, vendor search, Settings summary, analytics controls, occurrence facts, map, record lists, and tables. Existing command forms and invoice/day cards share the same surface styling.
- Added a Refresh records control to the market operations screens.

## Validation

- Source schema extraction and GraphQL code generation passed.
- Added a real backend regression using a disposable local database with native commerce enabled and paid attribution/customer history disabled. The paged operations request succeeded; cross-market access, oversized paging, and same-session revoked membership were refused. The successful database was removed automatically. The initial test label was rejected by the existing database naming guard before database creation; corrected it to `dashboard_b`.
- The existing real backend market operations suite passed all 21 checks. The live browser workflow suite passed all 14 checks, including public map search, actual booth assignment, attendance, paid-invoice preservation during a map-selected move, manual invoice settlement, tenant boundaries, responsive layouts, and accessibility. The successful disposable test database was removed automatically.
- The first browser run exposed an ambiguous business-name selector after adding expanded booth details. Scoped that selector to the booth list, and waited for Astro hydration before interacting with the public map. The complete rerun passed. The first run's disposable database was also removed by the existing runner.
- Added nine focused frontend regressions covering collapsed rows, actual amenities, corner positioning, invoice-derived status, void invoices, modal approval, and the clicked assignment when a business has multiple booths.
- Final frontend unit suite: 233 passed across 13 files. Saved the report in `docs/evidence/phase15b/unit-results.json`.
- Phase 15B local browser qualification passed: actual SVG hover/click, business approval and assignment, hidden collapsed details, paid safeguards, navigation icons/decorative chevrons, refresh-button hover feedback, and widths of 1440, 768, and 390 pixels. No page runtime errors, Axe violations, or horizontal page overflow occurred.
- Saved and visually inspected seven synthetic-data screenshots. Inspection prompted the compact map labels and aligned modal action toolbar described above; regenerated the screenshots after those refinements.
- TypeScript and Astro checks passed with zero errors, warnings, or hints. ESLint, package-boundary checks, and Prettier passed.
- The production-local build passed for storefront, admin, backend dashboard, server, and worker. Rebuilt the final storefront/admin assets after the last map and modal refinements. Builds used synthetic local configuration with provider integrations disabled and did not deploy anything.
- No new database migration is required. No demo reset, seed, or showcase command was run.

## Local files changed

Web project:

- `apps/admin/src/AdminShell.tsx`, `NavigationIcon.tsx`, and `phase15b.css`: navigation icons, decorative chevrons, typography, button feedback/spacing, and shared card surfaces.
- `apps/admin/src/market/overview.tsx`, `operations.tsx`, `analytics.tsx`, `occurrences.tsx`, `settings.tsx`, and `vendors.tsx`: grouping existing information and controls in cards.
- `apps/admin/src/market/phase14/Assignments.tsx`: booth status, expanded details, assignment modal, date approval, selected multi-booth assignment, and aligned modal actions.
- `apps/admin/src/market/phase14/OperationsRoutes.tsx`: records refresh and modal command-error propagation.
- `packages/ui/src/MarketMap.tsx`, `styles.css`, and `index.tsx`: reusable hover cards, viewport positioning, collapsed booth rows, selection gestures, statuses, styles, and exports.
- `packages/api/operations/market.graphql`: operations paging input independent of customer history.
- `packages/api/schema/admin.graphql`, `shop.graphql`, `provenance.json`, and `packages/api/src/generated/admin.ts`, `shop.ts`: regenerated schema artifacts and typed documents.
- `tests/phase15b.test.tsx`, `tests/fixtures/phase15b-data.ts`, and `phase15b-preview.tsx`: focused regressions and explicit synthetic browser data. The preview entry point is outside production application imports.
- `tests/market-operations.test.tsx` and `scripts/test-phase14.ts`: existing regressions updated to use collapsed booth rows and the assignment modal.
- `scripts/test-phase15b.ts`: dedicated local browser qualification and evidence generation.
- `docs/evidence/phase15b/`: seven screenshots, final unit report, and backend reload logs.
- `docs/implementation-phase-15B.md`: this implementation record.

Backend project:

- `src/plugins/marketplace-commerce/commerce/topology.api.ts`: native-commerce operations DTOs and query using `OwnMarketPageOptions`.
- `src/plugins/marketplace-commerce/customer-relationships/api.ts`: separate operational read resolver and removal of the query from the customer-history schema.
- `src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts`: unconditional operational resolver registration when native commerce is enabled.
- `test/farmers-market/phase15b.test.ts`: feature-disabled API and access-control regression.
- The normal backend build also refreshed `src/gql/graphql-env.d.ts` from the current API definitions.

## Local commands

The existing local backend was reloaded and is running. Refresh the browser to load the changes. If starting the local demo backend again is needed, run `npm.cmd run demo:market-operations:serve` from the web project. This preserves existing demo records.

Frontend checks, from the web project:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:live:market-operations
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/jake_/AppData/Local/ms-playwright'
npx.cmd tsx scripts/test-phase15b.ts
$env:FRONTEND_NO_EVIDENCE='true'
npm.cmd run build:production-local
```

Focused backend regression, from the backend project:

```powershell
node node_modules/ts-node/dist/bin.js --project test/farmers-market/tsconfig.json test/farmers-market/phase15b.test.ts
```

The browser qualification closes its own loopback-only server. Database integration checks use the project's disposable test database guard. No remote Git operation, hosting operation, or deployment was performed.
