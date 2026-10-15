# Occurrence layout changes

The occurrence map and booth-management page offer styled Change layout and Edit layout buttons. The picker shows published layouts as collapsed dropdowns, with Select layout beside each layout name. Opening and closing both animate, and previews remain mounted while closing. Choosing a different layout requires confirmation if the occurrence has assignments, accepted rentals, map instructions, a published map, or completed operations.

Edit layout opens a separate full-screen designer at `/market/assignments/:occurrenceId/edit-layout`. Saving creates an occurrence-specific version and remaps existing assignment records by stable booth element ID in one transaction. Assignment identities, accepted snapshots, rentals, attendance, notes, invoices, and payments are retained. Published maps refresh without changing reusable layouts or other occurrences. Removing an assigned booth, making it incompatible with accepted requirements, and saving a stale revision are rejected atomically.

The layouts library now has one current card per layout, inside an animated Saved layouts card. Cards include compact map previews, Edit layout, Copy Layout, and Archive layout. The editor opens at `/market/layouts/:layoutId/edit` and fills the screen. Saving a published layout updates its current entry; historical snapshots are retained for occurrences already using them. A database constraint enforces one active shared version per layout. Copy Layout creates a separate layout named `Copy - NAME`, with matching map elements and booth details, initially a draft. Archiving hides the layout from the library and picker while preserving existing occurrence maps and financial references.

On October 9, the local demo database's Layout v1 versions 6 and 5 were retired as requested. Version 1 remains current, and its occurrence reference was preserved. The running backend was restarted, and both included migrations were applied to `vendure_demo_market_ops` without resetting or reseeding it.

Confirmed switches clear active booth assignments, accepted rental allocations, map instructions, publication, and closeout state. Assignments are archived to retain invoice and payment references. Draft invoices are voided; issued invoices and payments remain in billing history. Date approvals and attendance remain available for reassignment.

Booth dropdown labels include the assigned business, for example `Booth 1 - Pucker Up!`. Unassigned booths keep their existing label.

## Files changed locally

Frontend:

- `apps/admin/src/market/OccurrenceMap.tsx`: occurrence actions and map status.
- `apps/admin/src/market/phase14/OccurrenceLayoutActions.tsx`: picker, confirmation, and editor.
- `apps/admin/src/market/phase14/Assignments.tsx` and `OperationsRoutes.tsx`: shared actions and permissions.
- `apps/admin/src/market/phase14/Layouts.tsx`, `LayoutInspector.tsx`, and `designer.css`: library cards, full-screen editor, copy/archive actions, occurrence saves, assigned-booth protection, and vendor labels.
- `apps/admin/src/market/presentation.tsx` and `dashboard.css`: animated disclosures, styled buttons, responsive dialogs, and full-screen sizing.
- `packages/ui/src/MarketMap.tsx`: booth labels and compact map previews.
- `packages/api/src/market-operations.ts`, `schema/admin.graphql`, `schema/provenance.json`, and `src/generated/admin.ts`: archive command and layout types, with regenerated API artifacts.
- `packages/admin-core/src/index.ts`: access to the occurrence editor route.
- `tests/layout-library.test.tsx`, `tests/occurrence-layouts.test.tsx`, `tests/market-operations.test.tsx`, and `tests/phase15b.test.tsx`: regression tests.
- `tests/fixtures/occurrence-layout-preview.tsx`, `scripts/test-occurrence-layouts.ts`, and `docs/evidence/occurrence-layouts/`: local browser checks and screenshots.
- `scripts/test-phase15b.ts`: updated booth-label expectations.

Backend in `E:\coding\farmers-market-platform`:

- `src/plugins/market-operations/entities.ts`: occurrence scope, layout archival, and assignment archival.
- `src/plugins/market-operations/service.ts` and `api.ts`: transactional edits, confirmed switches, current layout updates, independent copies, and archive command.
- `src/migrations/1791500000000-OccurrenceLayoutEditing.ts`: additive migration and uniqueness for active assignments.
- `src/migrations/1791600000000-LayoutLibrary.ts`: archival column, consolidation of older shared versions, and one-current-version constraint.
- `scripts/market-operations-demo/layout-library-cleanup.ts`: guarded, audited local cleanup of the two inspected Layout v1 duplicates.
- `src/gql/graphql-env.d.ts`: archive action in the generated enum type.
- `test/market-operations/occurrence-layouts.ts`: real HTTP/PostgreSQL preservation, rejection, isolation, switch, and reassignment tests.
- `test/market-operations/harness.ts` and `test/production-hardening/seed.ts`: migration in isolated test databases.
- `package.json`: `test:occurrence-layouts` command.

## Run locally

Both local demo servers are already running. Refresh the admin page; no further command is needed now. If you stop them later, start the persistent demo backend from `E:\coding\farmers-market-platform`:

```powershell
npm run demo:market-operations:serve
```

At `E:\coding\farmers-market-platform-web`, start the frontend if needed:

```powershell
npm run demo:market-operations:admin
```

## Verification

- 54 focused frontend tests passed. The 10 layout tests were rerun after the final changes; typecheck, ESLint, and storefront/admin builds passed.
- Browser picker, button placement, warning/cancel, full-screen edit/save, preserved assignment, confirmed switch, library previews, independent copies, archives, widths, and accessibility checks passed at 1440px and 390px. Opening and closing animations were measured with normal motion enabled.
- Backend `npm run test:occurrence-layouts` and all 21 existing `npm run test:market-operations` scenarios passed against isolated local PostgreSQL databases. Successful test databases were removed by their harness.
- Backend types and dashboard/server/worker build passed. The build used `APP_ENV=dev` and `NODE_ENV=development`.

The running demo backend exposes the new commands and has both migrations applied. All code and data changes remain local.
