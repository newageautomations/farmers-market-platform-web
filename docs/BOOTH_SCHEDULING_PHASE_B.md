# Booth scheduling Phase B

Implemented locally on October 30, 2026. Backend paths refer to `E:/coding/farmers-market-platform`; frontend paths refer to `E:/coding/farmers-market-platform-web`. Existing uncommitted work was preserved. No remote Git, deployment, hosting, browser automation, screenshots or visual comparison was used.

## Implementation and architecture

Market Day now has Map and attendance and Schedule tabs. Schedule provides a desktop comparison table with permanent physical booths as rows, bounded market dates as columns, vendor search, a default 30-day window, a 60-day preset and explicit From date/To date fields capped at 60 days from the current date. On mobile, it uses a selected date and booth list. Both presentations use the same data and commands. A shared animated MarketDialog drawer provides assignment details, date-only placement, moving an existing vendor, replacement, release, recurring preview, cancellation and a link to the existing date map. For vendors occupying multiple booths, the manager explicitly chooses which assignment to move.

`SCHEDULE` is an authorized read through the existing operations API. It accepts a bounded date range of at most 60 days and returns every occurrence within it. Calendar headers and mobile date choices show the day and date without a time. Shared tabs are excluded from the legacy operations button styling, retaining the same text-and-underline presentation as Documents. Physical booths come from the market-owned Phase A identities. Each cell resolves the selected plan's version and its `MarketSpace.physicalBoothId`, never booth labels. No plan, an absent representation, retirement, a cancelled occurrence or a closed/frozen date is unavailable. Occupancy remains visible for closed dates. Per-version labels remain in cell details while the physical record supplies the row name.

The new feature composition is `apps/admin/src/market/phase14/BoothSchedule.tsx` with its responsive grid/list CSS. There was no existing multi-occurrence scheduling matrix or recurring-rule form. It reuses shared Tabs, Card, Table, Button, SelectField, Input, Checkbox, Textarea, loading/error/empty states, operations Control and the MarketDialog drawer. The comparison matrix is a domain table specialist, not a new table primitive. Shared primitive colors, geometry, focus and motion remain owned by the existing UI system. No component library or competing design standard was introduced. No physical identity selector or retirement control was added.

`BoothRecurringRule` stores market, directory vendor, permanent booth and inclusive effective dates. Rules use existing occurrence schedule dates, with a maximum 366-day difference and at most 128 existing future dates in a preview. Overlapping rules for the same vendor or booth are rejected. No weekday/calendar recurrence engine or vendor approval is introduced.

`BoothRuleResult` stores the latest evaluation for each rule/date: assigned, explicit exception, missing layout/booth, ineligible/unconfirmed vendor, conflict, financial restriction or ended coverage. `BoothScheduleException` stores an explicit market/date/vendor exception with kind OVERRIDE or CANCELLED and a note. `MarketOccurrenceSpaceAssignment.recurringRuleId` records provenance on the existing authoritative assignment, including its archived history.

Preview uses the existing ASSIGN service validation without persisting assignments. Save requires the returned preview hash and explicit confirmation, recomputes the preview under the existing market transaction lock and rejects stale information. Valid new-rule dates are assigned and blocked dates are reported. Editing or ending a rule cannot silently release a financially blocked existing assignment. Relevant draft invoices require explicit permission-backed void authorization for release; issued or paid invoices block release. Other blocked dates remain reported without being forced.

Manual and generated future occurrence workflows evaluate applicable rules through the existing market domain service in the same transaction. Selecting an occurrence layout and confirming its approval also reevaluates rules. A newly created date without a layout or confirmed participation records the restriction and stays unassigned. Recurrence never approves a vendor or invents a layout. Evaluation is idempotent, preserves manual exceptions and uses the same occupancy, vendor identity, compatibility, rental-capacity and invoice safeguards as map assignments. Existing rule-owned assignments are revalidated without rewriting their financial records.

## Overrides, cancellations and integration

This date only moves or replaces the ordinary assignment or explicitly releases it. Moving a recurring vendor detaches that date's assignment provenance and stores an exception. One-time map assignments also create explicit date exceptions. Repeated rule evaluation preserves these decisions, including a booth deliberately left empty or a replacement vendor. No historical assignment is changed by scheduler commands.

Future dates covered by a recurring assignment opens the persisted-rule form. The manager can change its booth and effective range, preview all affected future dates and confirm. End before this date previews shortening the rule through the preceding schedule date. Earlier historical assignments, exceptions and issued obligations are preserved. Rule changes retain a before/after operations audit. No-conflict dates with an existing manual assignment are never silently adopted or overwritten.

Cancel participation previews the selected vendor/date and the number of all booth assignments to release, checks financial restrictions and requires a fresh reviewed token at confirmation. The optional note is retained. Confirmation cancels the occurrence approval and linked canonical participation where present, archives assignments, explicitly voids authorized drafts and records a cancellation exception. Other dates stay unchanged. Issued invoices and payments are never voided or refunded. A linked cancellation requires the existing occurrence-management permission. The older application date-cancellation path also records a recurrence exception.

Cancellation remains separate from check-in. Scheduler changes are blocked after the occurrence starts, after attendance freezes/finalizes or after operations close. Cancellation changes the participation authority used by attendance roster reconciliation; it does not create an ordinary no-show or rewrite historical attendance. Existing attendance correction workflows remain responsible for historical corrections.

The calendar, map, attendance, vendor information and billing retain the same occurrence approvals, assignments, rental allocations and financial relationships. Returning to Schedule reloads current assignments; Refresh schedule also reloads them. Changes never implicitly publish a public map. Releases preserve its snapshot as history and return the plan to draft, requiring deliberate republication through the existing map action.

## Migration and local test data

Migration: backend `src/migrations/1795100000000-BoothScheduling.ts`. It adds the three scheduling tables, constraints/indexes and the nullable assignment provenance column. It does not backfill, reset or rewrite established records. It is retry-safe and refuses destructive rollback.

The user explicitly authorized migration and dedicated scenario creation after verification. The guarded inspection confirmed local loopback `vendure_demo_market_ops` and only `BoothScheduling1795100000000` pending. `npm run demo:market-operations:migrate` then applied that migration successfully, with no reset, seed or application bootstrap.

The new guarded command `npm run demo:market-operations:scheduling-fixtures` created only its dedicated scenario:

- Market: Booth Scheduling Phase B Test Market, ID 12, channel 54.
- Manager: `booth-scheduling.manager@example.test`.
- Local-only password: `Scheduling-Local-Only!2026`.
- External directory vendors: Scheduling Orchard and Scheduling Honey. They do not need separate platform accounts.
- Six occurrences: November 7, 14, 21, 28 and December 5, 12, 2026, IDs 23 through 28.
- Four booths, one recurring rule, six active assignments, three explicit exceptions and one absent cell.
- A shifted layout variation on November 28 omits A02 while preserving the other physical booth identities.

The fixture requires the approved local demo target and a current schema; it never runs migrations. Fixed provisioning keys and scoped existence checks support interrupted retries. A completed marker makes later runs read and report the saved scenario instead of resetting manual edits. It verifies the dedicated account scope and never changes Manna Roots or established manager accounts. Dates are fixed; an unfinished scenario refuses to manufacture historical data once its first date has passed.

## Focused verification

Passed locally:

- Backend `npx ts-node --project test/market-operations/tsconfig.json test/market-operations/booth-scheduling.ts`: eight scenario groups in the guarded disposable database. Covers identity across a variation, available/absent states, recurrence preview/save, stale preview and overlapping-rule rejection, idempotency, date overrides, cancellation preview/release, cancelled-date suppression, future occurrence evaluation without auto-approval, vendor compatibility, one-time and occupied-booth conflicts, ending future coverage, issued-invoice protection, market authorization, wrong-layout rejection, migration retry preserving assignment records historical-write rejection and returning all 37 occurrences in a dense bounded range. Successful databases were removed by the harness. An intermediate failed test assertion was corrected; its disposable database was retained by the existing harness policy, never substituted for the persistent database.
- Frontend `FRONTEND_NO_EVIDENCE=true npx vitest run tests/booth-scheduling.test.tsx`: seven focused DOM tests for bounded preset/custom date filtering, unavailable cells, date-only moves, recurring preview confirmation, cancellation confirmation explicit selection among multiple existing assignments and failed refresh protection.
- Web `npx tsc --noEmit --project tests/tsconfig.booth-scheduling.json`.
- Backend fixture tooling `npx tsc --noEmit --project scripts/market-operations-demo/tsconfig.json`.
- Backend `npm run build:server` and frontend `npm run build --workspace @market/admin`.
- Local source-only `npm run graphql:schema` and `npm run graphql:codegen`, without database bootstrap.

The required backend `npm run build` was attempted. Its unrelated Vendure dashboard stage fails on the existing `APP_ENV_EXPLICIT_MODE_REQUIRED` configuration guard. The focused server build passes. Existing chunk-size, PostgreSQL client deprecation and demo cookie/CSRF notices were recorded without unrelated configuration changes. No full test suite or broad lint/format pass was run. New frontend files alone were formatted.

## Manual testing

Migration and scenario creation are already complete. Start or restart the local processes from `E:/coding/farmers-market-platform-web`, one per terminal:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Admin: `http://localhost:4322/market/day?channel=54`. Sign in with the dedicated manager above and select Booth Scheduling Phase B Test Market if prompted. The storefront is `http://localhost:4321`; it is not needed to exercise the manager scheduler.

1. Open Market Day and choose Schedule. The default range runs from today through 30 days from today. Select 60 days to extend it, or choose From date `2026-11-07` and To date `2026-12-12` to display all six scenario dates, while those dates are within the current 60-day horizon. Search filters booths or vendors. Assignment changes reload the schedule automatically.
2. Verify A01 is Scheduling Orchard on November 7, A02 is Scheduling Honey for that single date, A03/A04 are available, and recurring versus one-date labels are visible.
3. On November 14, Orchard occupies A03 as a date-specific override and A01 is available. On November 21, Orchard is cancelled and A01 is available. Inspect the empty booth's details to see the stored cancellation. Other Orchard dates remain assigned to A01.
4. On November 28, A02 is unavailable with Absent from this layout. Open its details: no assignment action is offered. Open the date map using the drawer link to inspect the shifted variation and retained assignments.
5. Select an available A04 on an unused scenario date. Choose an eligible vendor, explicitly allow affected draft invoice voiding if required, and Review assignment change, then confirm. Selecting Orchard moves its existing date assignment rather than duplicating it. The change becomes an exception. Inspect the existing map and return to Schedule to verify the same assignment. Public map publication remains explicit.
6. On an assigned Orchard cell choose the future-dates scope. Preview the existing rule unchanged and confirm. The November 14 override and November 21 cancellation remain intact. To test a future booth change, select an available target booth on the relevant date, choose future-dates scope and the existing Orchard rule, adjust its effective range and preview. Review moves, releases, unavailable dates and conflicts before confirming. Use only this dedicated scenario.
7. To end coverage, select a later scenario date and the existing recurring rule, choose End before this date, preview and confirm. Draft invoice release needs the explicit void option and billing permission. Dates still within coverage, prior overrides and cancellations remain intact.
8. On an assigned vendor in this dedicated market, allow affected draft invoice voiding, choose Cancel participation, review the booth count, optionally add a phone note and confirm. Check that every booth for that vendor/date is released, the cancellation is recorded, and other dates remain unchanged. Re-preview the recurring rule to verify that cancellation remains an exception.
9. To test a financial block, issue a test invoice through the existing Booth billing interface for an assigned scenario date. Attempt cancellation or rule release. Expect the existing financial resolution requirement and unchanged invoice/payment records. Do not alter established vendors or invoices.
10. Use the same manager on a narrow/mobile viewport. Schedule presents a date selector and booth list; inspect or update a cell through the same drawer. Keyboard users can tab to dates/cells/actions and use the shared tabs and dialog focus behavior.
11. Create a new future occurrence within the rule range through the existing market occurrence workflow. Before layout selection/participation confirmation, expect a reported restriction and no auto-approval. Select a compatible layout and confirm the vendor's occurrence approval. Expect safe application of the rule, or a recorded conflict. Avoid cancelled dates and historical attendance scenarios.

The safe setup can be rerun without restoring or overwriting the completed fixture:

```powershell
npm run demo:market-operations:scheduling-fixtures
```

It prints the market, credentials, URLs, occurrence IDs, counts and a scenario fingerprint. Two completed retries returned the identical fingerprint `a1a484251636f5ba244e52720e92d3948575b47adf2463fa57590a1c4ca8154f`, verifying no scenario data changed on retry. Never use reset or the general seed command for these tests.

## Limits and deferred features

- No vendor cancellation requests, self-selection, waitlist, optimization, new layout editor, identity-management UI, retirement control, automatic approval, refund or unrelated billing change.
- Recurrence covers all existing market occurrences in its inclusive range. There is no separate weekday expression or general recurrence language.
- One recurring booth per vendor per overlapping effective period. Existing map-based multiple-booth workflows remain available; calendar moves require choosing the source where multiple assignments exist.
- Missing layouts, eligibility and capacity conflicts require normal manager resolution. Re-preview and confirm the unchanged rule to explicitly retry after resolving a conflict that did not itself trigger evaluation. There is no new background reconciliation worker.
- The calendar is limited to a 60-day span; its UI caps both endpoints at 60 days from the current date. It loads every occurrence in the selected range. Previous/next navigation, manual refresh and the explanatory range sentence have been removed.
- Rule date exceptions are vendor/date-wide and intentionally persist across later rules for that date. The normal manager participation workflow handles deliberate reinstatement; recurrence never reinstates a cancelled vendor automatically.
- Automated verification is DOM/service/database based. Manual review of responsive layout and animation remains necessary, as requested browser automation and screenshots were excluded.

## Local files

Frontend: new `apps/admin/src/market/phase14/BoothSchedule.tsx`, `booth-schedule.css`, `tests/booth-scheduling.test.tsx`, `tests/tsconfig.booth-scheduling.json`; updated `OperationsRoutes.tsx`, `packages/api/src/market-operations.ts`, `packages/api/src/errors.ts`, generated schema/API artifacts, `scripts/demo-market-operations.ts` and `package.json`.

Backend: new scheduling migration, `test/market-operations/booth-scheduling.ts` and `scripts/market-operations-demo/booth-scheduling-fixture.ts`; updated market operations entities/service/API, the market domain occurrence hook, focused harness migration registration, guarded demo runner and package scripts. This is the only new implementation report.
