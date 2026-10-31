# Booth identity Phase A

The Phase A.1 section below supersedes the original manual identity-selection and layout-copy instructions. Earlier verification results describe Phase A only.

Implemented locally on October 30, 2026. The backend repository is `E:/coding/farmers-market-platform`. No changes were applied to `vendure_demo_market_ops`, no permanent fixtures or accounts were created, and no browser, preview, deployment or remote Git operation was used. The architecture audit remains unchanged.

## Implementation

`MarketPhysicalBooth` is a market-owned permanent record. It has an integer identity, an initial display name, a revision, an optional retirement timestamp and a unique migration provenance field, `legacySpaceId`. Display names are descriptive, never matching keys. A booth's familiar label remains editable on its layout representation.

Every `MarketSpace` now has a required `physicalBoothId`. Its existing ID, layout version, graphical element ID and details remain intact. Geometry stays in the version definition. A composite database foreign key enforces matching market ownership, and a unique index prevents two representations of one physical booth in the same version. Physical records survive representation deletion and cannot be deleted while referenced.

Shared and occurrence saves inherit identity only from the version actually being edited, by its retained graphical element ID. Position, dimensions, rotation and labels do not determine identity. Published edits retain the earlier version and spaces. Occurrence edits retain the existing assigned-booth removal and compatibility protections, assignment IDs, booth/business snapshots, allocations and issued invoices. Their assignment references move to the new version's corresponding spaces through the existing protected workflow.

New drawing objects receive new physical identities on save. Object duplication and whole-layout copies create independent identities. A copied layout can deliberately reuse a market's existing identities through the inspector, one booth at a time. There is no automatic matching between independently created layouts.

## Migration

Backend migration: `src/migrations/1795000000000-PermanentBoothIdentity.ts`.

The additive, forward-only migration creates the physical table, backfills the new space column, then enforces its required value, uniqueness and market-scoped foreign key. It never changes existing space IDs, geometry, details, assignments, financial rows or occurrence plans.

Backfill walks spaces in market, layout, version-number and space-ID order. It reuses an identity only for the same graphical element in immediately consecutive shared versions within the same market and layout. A missing predecessor representation, version gap, occurrence-specific version, different layout or different market creates a separate identity. Labels never establish continuity. Occurrence versions lack sufficiently reliable recorded parentage, so historical occurrence relationships remain conservatively separate.

Each backfilled root uses its original space ID as unique provenance. Already-associated spaces are skipped. Repeating the migration preserves existing identities and manager reconciliations. Production migration execution uses the existing transactional migration runner. During backfill the published-space trigger permits only a null-to-identity update with every pre-existing column unchanged; the migration restores the original immutable-space guard before finishing. The required column prevents unresolved rows after success. Rollback is deliberately refused to preserve identity history.

The populated migration rehearsal used authentic pre-Phase-A tables in a guarded disposable database. It included adjacent shared versions, occurrence ambiguity, separate layouts, separate markets, assignments, rental allocations and an issued invoice. It verified all original space columns and all version/assignment/allocation/invoice rows were unchanged, then retried the migration and verified identity count and mappings were unchanged.

**The persistent database has not been migrated.** When ready for manual testing, use only the guarded command below from the web directory. It selects local `vendure_demo_market_ops`. Review its target and pending migrations before allowing it to proceed. Do not use reset or seed commands.

```powershell
cd E:\coding\farmers-market-platform-web
npm run demo:market-operations:migrate
```

## Layout editor

The existing booth inspector now offers a Physical booth identity select. New objects default to New physical booth. Existing choices show the booth name with a secondary identity number, so managers can distinguish repeated names without replacing familiar booth labels with database identifiers.

Choosing another identity or choosing a new identity opens the existing shared confirmation dialog. Cancel leaves the drawing unchanged. Confirm changes the draft only; Save persists the mapping. Already-represented identities and retired identities are excluded from reuse choices. Assigned representations cannot change identity in the inspector. The backend independently checks ownership, retirement, confirmation, duplicates and assignment history, including soft-deleted assignments.

The editor carries identity selections through movement, resizing, synchronization, undo and redo. Copying objects keeps the target drawing's mappings and does not inherit the source object's identity. Deletion removes the drawing mapping while retaining the physical record.

Retire physical booth is a separate confirmed action, available on a saved representation. Save dirty layout edits first. Retirement retains drawings and history, blocks new assignments and explicit reuse, and rejects any active assignment rows for that physical identity. Existing retired representations may retain their identity during ordinary edits. Retirement is forward-only in this phase; there is no reactivation workflow.

No new UI primitive, page, styling system or library was created. The additions reuse the existing operations Control, shared Select and Button, and MarketDialog adapter over shared Dialog. The existing dashboard and canvas specialists remain in place.

## Assignment and financial safety

COPY_ASSIGNMENTS now matches the source space's physical identity within the target occurrence's selected layout version. It does not fall back to labels or unrelated graphical IDs. A missing representation reports SPACE_MISSING; it does not become an available booth. Retired identities fail placement checks. Existing approval, compatibility, occupancy, rental capacity and proposal-confirmation checks remain authoritative.

Ordinary ASSIGN still requires a space from the selected occurrence version and now also requires an active physical identity. Multiple-space, moving, payment, invoice, refund and layout-switch policies remain unchanged. Layout switching continues to use the existing explicit clearing workflow rather than remapping assignments. This phase does not rewrite billing snapshots or issued obligations.

All writes retain the existing market authorization, permission checks, market transaction lock and command audit. Layout saves additionally audit source and resolved booth associations in the same transaction. Retirement uses the existing layout-management permission and revision check. The guarded attendance fixture writer was updated to create physical identities when it creates spaces; that fixture was not run against the persistent database.

## Automated verification

Passed:

- Backend `npx ts-node --project test/market-operations/tsconfig.json test/market-operations/booth-identity.ts` from the backend directory: five combined scenario groups. Covers populated migration and retry, conservative historical matching, geometry/label continuity, new booths, published history, occurrence edits with issued invoices, assigned-removal and identity-change rejection, stale revisions, wrong-version assignment rejection, explicit reuse, duplicate and cross-market rejection, database ownership constraint, independent layout copies, assignment-copy proposals and absent-target conflicts, deletion/recreation and retirement guards.
- Web `$env:FRONTEND_NO_EVIDENCE='true'; npx vitest run tests/phase15c.test.ts tests/occurrence-layouts.test.tsx --reporter=default`: 32 tests passed. Includes identity confirmation/cancel, duplicate/retired choice filtering, assigned identity/retirement controls, and identity preservation through drawing operations/history.
- Web `npx tsc --noEmit --project tests/tsconfig.booth-identity.json`.
- Backend `npm run build:server`.
- Web `npm run graphql:schema` and `npm run graphql:codegen`, using local source extraction without database access.
- Scoped whitespace checks for changed frontend files.

The successful backend rehearsal database, `vendure_test_operations_1793401400049_e2357e`, was removed by the existing guard. Failed development iterations were retained by that harness under the disposable `vendure_test_operations_` prefix; none used the persistent database. Initial test issues and migration-trigger/SQL issues were corrected and the relevant suite rerun successfully.

The requested backend `npm run build` was attempted, but its dashboard stage stopped at the existing configuration requirement `APP_ENV_EXPLICIT_MODE_REQUIRED`. The targeted server build passed. No unrelated configuration was changed. A PostgreSQL client deprecation notice appeared during the harness run. No full test suite, repository-wide lint/formatting, browser automation, preview or screenshot generation was performed.

## Manual testing

After applying the guarded migration, start each required process in its own terminal from the web directory:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Admin: `http://localhost:4322`. Storefront: `http://localhost:4321`. Use your existing manager credentials and normal market context. No credentials or accounts were added or changed. Use a dedicated layout named Phase A identity check and unused future occurrences in an authorized test market. Use an eligible external test directory entry or normal approved test vendor, without changing Manna Roots or other established business configuration. Test data is created by your normal UI actions, not a seed script.

1. Open `/market/layouts`, create Phase A identity check, add A01 and Save. Select it and record the identity number beside its name. Add A02 and save; expect a different identity.
2. Move A01, resize it, rotate it and rename it. Save and reopen. Expect the same identity number and updated geometry/details. Undo and redo should also retain the selected identity.
3. Publish the layout. In `/market/day/<occurrenceId>` or `/market/assignments/<occurrenceId>`, select it for an unused future occurrence and assign an eligible test business. Record its booth label and any invoice total. Use only test dates and accounts you intend to modify.
4. Edit the shared layout, change A01 geometry and Save. Expect a new version with the same physical identity. Reopen the earlier assigned date; expect its earlier version, geometry, assignment and financial records to remain intact.
5. Use the earlier date's existing Edit layout action. Move or resize its assigned booth compatibly and save. Expect the identity, assignment and issued financial records to survive. Attempt deletion or an incompatible resize; expect the existing protection to reject it. Identity selection is disabled for an assigned representation.
6. On an unassigned test booth, delete its drawing object and save. Add a new object with the same label and save. Expect a different identity. Deleting the representation does not retire or destroy the old identity.
7. Delete that unassigned replacement and add another object. Choose the original booth in Physical booth identity. Cancel the confirmation first; expect no mapping change. Select it again, confirm and Save. Expect the original identity with the new graphical representation. If the original identity is already represented in this version, it must not be offered as another choice.
8. Copy the whole layout. Expect the copy's booths to have new identities despite matching labels and graphical IDs. To establish deliberate continuity, select existing physical identities in the copied layout's inspector and confirm each change. This is allowed only where assignment-history and duplicate restrictions permit it.
9. Select a layout with explicitly continuous identities for a later unused occurrence. Approve the same test business and preview assignment copying. Expect the corresponding physical booth proposal even if its graphical ID changed. Repeat with an independent copy or a layout missing that physical booth; expect a missing-space conflict and no automatic reassignment.
10. Save an unassigned test representation and use Retire physical booth. Cancel first, then confirm. Expect its history and drawing to remain, while new assignments and reuse are blocked. Retirement of a booth with active assignment rows must fail.
11. Reopen Market Day and the existing public map using their normal links. Familiar labels, attendance, vendor information and assignments should remain intact. Publishing still uses the existing explicit map publication action.
12. Switch to another authorized test market. Create another A01; expect a different identity and no choices belonging to the first market. Cross-market IDs submitted outside the UI are also rejected, as exercised by the automated tests.

## Limitations and Phase B

- Historical occurrence parentage is not invented. Ambiguous associations remain separate. Managers can reuse an existing identity for an unassigned editable representation or replacement; this does not merge physical records globally or rewrite historical spaces with assignment references. A broader historical merge/remap workflow remains deferred.
- An identity attached to any assignment-history row cannot be reassigned through this editor. Assigned graphical replacement/removal keeps the existing resolution requirement, even if a manager would like to link a new object explicitly.
- Retirement requires no active assignment rows, including retained past rows. There is no forced retirement, reassignment, reactivation or cancellation workflow.
- Physical display names reflect their initial creation/backfill label. Per-version labels remain independent; the secondary identity number disambiguates names. Identity choices use the existing bounded operations read model.
- Layout switches retain their existing explicit clearing behavior. This phase provides no automatic mapping or financial adjustment across arbitrary layouts.
- No calendar, recurrence rules, bulk scheduling, waitlist or new cancellation/refund workflow was implemented. Phase B can group spaces by market-owned physical identity and determine presence from each occurrence's selected layout version.

## Local files changed

Backend:

- `src/plugins/market-operations/entities.ts`: physical entity and required version-space association.
- `src/plugins/market-operations/service.ts`: resolution, validation, copy matching, retirement, audit and read data.
- `src/plugins/market-operations/api.ts`: retirement command enum value.
- `src/migrations/1795000000000-PermanentBoothIdentity.ts`: additive backfill and constraints.
- `test/market-operations/harness.ts` and `test/market-operations/booth-identity.ts`: focused disposable verification.
- `scripts/market-operations-demo/attendance-fixture.ts`: compatibility for its existing space writer.

Web:

- `apps/admin/src/market/phase14/Layouts.tsx` and `LayoutInspector.tsx`: identity state, selection, confirmation and retirement.
- `packages/ui/src/map/model.ts`: identity-aware drawing/history operations.
- `packages/api/src/market-operations.ts` and `errors.ts`: typed data/action and manager feedback.
- `packages/api/schema/admin.graphql`, `shop.graphql`, `provenance.json`, and `packages/api/src/generated/admin.ts`, `shop.ts`: refreshed local schema artifacts. Some existing uncommitted schema work is also present in these files.
- `tests/phase15c.test.ts`, `tests/occurrence-layouts.test.tsx`, `tests/tsconfig.booth-identity.json`: focused editor verification.
- This implementation report only. The existing audit was not overwritten.

## Phase A.1: Layout copying UX

Ordinary editing now manages identity automatically. The booth inspector no longer offers identity selection, identity-change confirmation or permanent identity numbers. Creating a booth, duplicating an object, or deleting and recreating one creates a new physical identity. Moving, resizing, rotating and renaming an existing booth retains its identity across normal layout revisions. Individual identity overrides are also rejected by the backend. Retirement remains a separate confirmed action with its existing assignment and revision safeguards, using the familiar booth label without displaying an identity number.

Both the saved-layout library's Copy button and the editor's Copy Layout button now open the same small dialog, composed from existing MarketDialog, Control, Select and Button components. This feature composition is needed to keep the two copy entry points consistent; it introduces no new UI primitive or styling.

- **Create a variation**, selected by default: copy drawing and booth rows into a new layout while directly preserving each source booth's physical identity. No label matching or heuristic reconciliation occurs.
- **Create an independent layout**: copy the drawing and booth details into a new layout with new physical identities for every copied booth.

Both modes stay in the authorized source market, check the source revision, retain per-version identity uniqueness and record the mode in the existing command audit. Each copy has its own definition and versioned space rows. Saving geometry changes, adding booths or removing representations in a variation leaves the original layout unchanged. Neither mode copies assignments, switches occurrence plans or changes historical versions, attendance, cancellations or financial records. Existing layout-switch and occupied-booth safeguards continue to apply.

Limitations: existing copies are not retroactively converted to variations. Older API callers omitting `copyMode` retain the independent-copy behavior; the manager dialog always sends its explicit selection. Variation copies preserve retirement status through the shared physical identity, and new assignments remain blocked for retired booths. Retiring a shared physical booth affects its eligibility across variations, as intended. There is no individual reconciliation workflow, scheduler or new database migration in Phase A.1.

Manual testing, using the existing local environment and manager account:

1. Open `/market/layouts`, create a dedicated test layout, add A01 and save. Expect normal editing with no identity dropdown, identity-change dialog or permanent identity number.
2. Move, resize, rotate and rename A01; save and reopen. Expect updated details with automatic continuity. Deleting and recreating a booth starts separate identity history. Save dirty changes before using the retained retirement action.
3. Choose Copy from the library or Copy Layout from the saved editor. Expect Create a variation selected by default. Create the copy, then move or resize a copied booth and add another booth. Existing copied booths retain their source identities; the added booth receives a new identity.
4. Copy again, select Create an independent layout and create the copy. Expect a separate layout with fresh physical identities for all copied booths. If checking existing assignment-copy previews on unused test occurrences, a variation can match a represented source booth by identity, while an independent copy does not match merely because its labels or graphical IDs are the same. Assignment previews still require ordinary approvals and confirmation.
5. In the variation, remove an unassigned booth representation and save. Reopen the original and verify its booth, geometry and details remain unchanged. Normal assigned-booth removal protections still apply.
6. Reopen existing assigned dates through `/market/day/<occurrenceId>` or `/market/assignments/<occurrenceId>`. Expect their original selected versions, assignments and financial records to remain unchanged. Selecting a variation for a date still uses the existing layout-switch confirmation and clearing rules; sharing identities does not transfer assignments automatically.

Phase A.1 changed only `Layouts.tsx`, `LayoutInspector.tsx`, the backend operations `service.ts`, API error feedback and this report. Verification was a read-only review of the affected code paths. Per request, no automated tests, builds, linting, typechecking, browser operations, screenshots, fixtures or database modifications were performed for Phase A.1. Earlier tests asserting manual identity selection/reconciliation describe the superseded Phase A UI and were not run or updated here.


### Phase A.1 follow-up: Retirement UI removed

The layout inspector no longer shows Retire physical booth or its confirmation dialog. The unused UI callback and retirement-only state were removed. The backend retirement command, authorization, validation and assignment safeguards remain available and unchanged. This supersedes the retirement UI instructions above. No tests, builds, typechecking or database operations were performed for this UI removal.
