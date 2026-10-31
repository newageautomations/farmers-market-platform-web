# Market Day Attendance V1

## Implementation

Manager attendance lives inside `/market/day` and `/market/day/<occurrenceId>`, using the existing occurrence selector and dashboard shell. Vendor navigation now includes `/vendor/day`. The manager view provides five summary cards, status filters, direct check-in, private notes, absence/undo confirmations, a responsive detail sidebar, vendor history, date/status filtering, and CSV export. Vendor views show their own scheduled appearances and history with market, operating hours, time zone, venue, booth, booking state, and official attendance. Scheduled and checked-in states are separate.

`MarketAttendanceService` belongs to the existing market-operations plugin. It materializes attendance from confirmed canonical participation with approved market membership, plus confirmed external-directory approvals. Planned, waitlisted, rejected and cancelled bookings do not create expected attendees. Booths come from existing assignments. No new scheduling, membership, compliance, billing or notification system is introduced.

The migration `1794700000000-MarketDayAttendance.ts` adds occurrence-scoped attendance sessions and records. Database constraints enforce identity uniqueness, market/occurrence/directory scope, supported states, and check-in timestamp/actor consistency. Indexes support manager, vendor and directory history. Transactions acquire market then occurrence locks; record and session revisions reject concurrent stale writes. Repeated population reads do not create duplicates or advance unchanged revisions.

Official states are Awaiting arrival, Checked in, Excused absence and No-show. Check-in stores the time and manager account ID. Notes and internal audit details are excluded by the vendor API's allowlisted projection. Tenant authorization is reloaded for each request. Vendors have only the occurrence/revision-scoped self-check-in mutation described below. The older `DAY_UPDATE` path cannot write check-in or attendance fields, and its competing status displays have been removed from the assignment specialist.

Managers can open and finalize attendance before the occurrence ends. Finalization still requires every expected Awaiting record to be resolved explicitly. Cancelled occurrences cannot be changed or finalized. Finalization is idempotent, records final counts and actor, and causes no financial action. Finalized edits require the explicit correction action and a nonblank reason; original and new status, note, check-in time and actor remain in the existing market operations audit log. Corrections cannot leave finalized records Awaiting.

Ended rosters and appearance snapshots freeze on materialization. An optional history-preservation hook in the existing membership service captures ended rosters before membership status changes. Application-date decisions and identity conversions also capture history before changing participation. Later booking edits do not rewrite those snapshots or finalized results. Future schedule and booth changes update nonfrozen snapshots and their revisions.

Existing Market Day attendance is imported once when records are first materialized. Recorded absence states are preserved; legacy check-ins recover their original actor/time from `DAY_UPDATE` audits. If legacy attendance has no recoverable actor/time, its evidence is retained in the private note and import audit, and the record remains Awaiting for explicit resolution. No historical timestamp is invented.

Frontend compositions reuse the Submitted Applications implementation's shared Card, DataTable, Badge, Button, Field/Input/Textarea, SelectField, Pagination, wide MarketDialog and existing dashboard shell. The attendance feature composition is new because application review and booth assignment controllers do not supply attendance revisions, finalization or correction semantics. Its CSS only arranges those components and the existing touch-height token. No new UI library or competing primitive is introduced. GraphQL operations use the existing schema extraction and generated-document pipeline.

## Local files

- Backend: new attendance entities/service/resolver and migration; bounded integration changes in the market-operations plugin/API/service, farmers-market domain/membership services and operations test harness.
- Frontend: `apps/admin/src/market/phase14/Attendance.tsx` and `attendance.css`; Market Day route integration and legacy display removal in `OperationsRoutes.tsx`/`Assignments.tsx`; vendor route/service and shared navigation additions.
- API: `packages/api/src/attendance.ts`, exports, market-operations adapter, safe error messages, GraphQL operations, extracted schema/provenance and generated contracts.
- Setup/tests: attendance fixture and guarded demo runner integration, npm commands in both repositories, `tests/attendance.test.tsx`, `tests/tsconfig.attendance.json`, and backend `test/market-operations/attendance.ts`.

Existing unrelated uncommitted application work was preserved. The initial Vitest invocation updated the existing `docs/evidence/phase13c5/unit-results.json` through the repository's default reporter. Subsequent attendance runs used `FRONTEND_NO_EVIDENCE=true`; no screenshots or additional implementation documents were created.

## Verification

- Backend `npm run test:attendance`: passed on a guarded disposable `vendure_test_operations_*` database, which was dropped after success. Covers population, planned/waitlist exclusions, repeat reads, transitions, actual timestamp/actor storage, optimistic conflicts and simultaneous writes, end-time and unresolved-record guards, idempotent finalization, reason-required correction, audit values, cancelled occurrences, market/vendor isolation, vendor privacy, previously unread history across membership changes, Chicago DST/local-date boundaries, GraphQL manager/vendor reads, legacy import, and fixture setup twice without duplicate records.
- Frontend `FRONTEND_NO_EVIDENCE=true npm run test:attendance`: six focused tests passed. Covers direct check-in, explicit unresolved finalization, consequential-change confirmation, finalized edit locking/reason fields, vendor read-only facts/privacy, Vendor Market Day routing, and CSV formula/quote escaping.
- `npx tsc --noEmit --pretty false --project tests/tsconfig.attendance.json`: passed.
- Targeted ESLint for attendance, affected route/service/navigation/API files and its UI tests: passed.
- Backend `npm run build:server` and `npm run build:worker`: passed. Full `npm run build` was attempted but dashboard configuration loading fails with `APP_ENV_EXPLICIT_MODE_REQUIRED` under Vite's production build environment. This unrelated environment-policy issue was not changed.
- `npm run graphql:schema` and `npm run graphql:codegen`: passed. Schema extraction uses source files without backend bootstrap or database access.
- No full regression suite, browser automation, screenshot comparison or manual UI sweep was run.

## Persistent test setup status

**Applied and populated on October 30, 2026, after explicit developer approval.** Read-only inspection verified the local `vendure_demo_market_ops` target and found only `MarketDayAttendance1794700000000` pending. The guarded migration command applied that migration and verified no pending migrations remained. The guarded attendance fixture command then created dedicated market ID **11**, five accounts, four vendors, booths A1 through A4, three occurrences, and twelve attendance records. A subsequent read-only database transaction verified the actual target (`::1` loopback), migration, accounts, booth snapshots, attendance counts and historical finalization. Existing Manna Roots and Boerne manager accounts were not altered; no reset, truncation, reseed or replacement of established data was performed.

Completed setup commands, run from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:inspect
npm run demo:market-operations:migrate
npm run demo:market-operations:attendance-fixtures
```

The fixture runner checks the actual database name and loopback server, refuses pending migrations, and creates only the dedicated `attendance-v1-*` market, vendors, accounts, relationships, booths and occurrence identities. Reserved fictional phone identities are script-only local fixtures. Existing identities/passwords are never reset. Audit initialization markers preserve manual attendance changes on reruns. The fixture does not reseed or reset the database, disable database guards, or issue invoices. Ordinary scheduling continues to forbid backdating; only newly inserted synthetic historical fixture records use historical dates.

## Manual testing

Start separate terminals in the web directory using the existing scripts:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Use the local admin app at `http://localhost:4322`. Select **Attendance V1 Test Market** (market ID 11). The persistent fixture routes are:

| Occurrence | Route | Saved attendance |
| --- | --- | --- |
| Historical, finalized | `/market/day/19` | 2 Checked in, 1 Excused, 1 No-show |
| Practice, not finalized | `/market/day/20` | 1 Checked in, 1 Awaiting, 1 Excused, 1 No-show |
| Upcoming, not finalized | `/market/day/21` | 4 Awaiting |

The practice occurrence runs from October 29 at 11:50 p.m. through October 30 at 5:50 a.m. in America/Chicago. The upcoming occurrence runs from November 7 at 11:50 p.m. through November 8 at 3:50 a.m. in America/Chicago. Dates remain fixed on repeated setup runs. Vendor access is `/vendor/day`.

All dedicated accounts use password **`Attendance-Local-Only!2026`**:

| Role           | Email                                |
| -------------- | ------------------------------------ |
| Market Manager | `attendance-v1.manager@example.test` |
| Orchard vendor | `attendance-v1.orchard@example.test` |
| Bakery vendor  | `attendance-v1.bakery@example.test`  |
| Flowers vendor | `attendance-v1.flowers@example.test` |
| Honey vendor   | `attendance-v1.honey@example.test`   |

All five accounts above now exist in the persistent test database with these fixture credentials. Vendor channel IDs are 50 (Orchard), 51 (Bakery), 52 (Flowers), and 53 (Honey).

Select **Attendance V1 Test Market** as the manager. The four businesses receive booths A1 through A4. Stable occurrence keys identify:

- `attendance-v1-history`: about a week before first setup, finalized with two Checked in, one Excused and one No-show.
- `attendance-v1-practice`: starts about an hour before first setup and ends five hours afterward, with one of each official status. Check in the Awaiting vendor directly; open a business to edit notes, change status with confirmation, and inspect filtered history/CSV. Before the end, finalization is unavailable. After the end, unresolved vendors block finalization until explicitly resolved.
- `attendance-v1-upcoming`: about nine days after first setup, four Scheduled/Awaiting appearances. Official physical attendance cannot be recorded before the occurrence starts.

On the historical occurrence, ordinary editing is disabled. Choose **Correct finalized record**, supply a reason, confirm the correction, and verify original/new values and counts. Open the same occurrence in two sessions to verify a stale write fails and requires refresh. Inspect a cancelled occurrence to verify no new no-shows or attendance writes occur.

Sign in as each vendor and open `/vendor/day`. Confirm the market, local date/hours, location, assigned booth, Scheduled booking and distinct attendance badge. Use date/status filters to inspect past and upcoming records. Verify the vendor sees only their own records and has no private notes, audit details, absence, correction or finalization controls. Check-in appears only for eligible active occurrences.

## Limits and deferred scope

The persistent migration and fixture activation are complete. Manual UI acceptance remains with the developer. Legacy attendance without recoverable audit timestamps requires manager resolution. Records freeze when first materialized after the occurrence ends, with safeguards for subsequent supported membership and application-date edits; information already removed before this feature existed cannot be reconstructed.

V1 intentionally excludes GPS, QR codes, offline synchronization, scoring, rankings, penalties, suspension automation, payment/refund adjustments, automatic booth reassignment, and new notifications. History is paginated; manager CSV export traverses all matching pages and includes private notes/correction reasons. As with existing exports, changes made during export can affect the exported view.

## Manager interface refinement

Vendor/booth table headings toggle exclusive alphabetical sorting for the displayed page and show an SVG direction indicator. Vendor names align left. Attendance filters reuse the Submitted Applications sliding selection treatment. Check-in retains the shared fill-color hover while disabling its rise transform. The explanatory attendance text and refresh control were removed. Finalization no longer requires the occurrence to have ended.

Booth and expected-vendor searches retain their matching behavior with shorter labels, three-column record grids, visible status and modal details. The vendor grid has its own card. Layout/change/edit/publish controls are inside the map card; the accessible area selector sits beside zoom controls without its visible label. The shared map enhancements are opt-in for booth cards.

Vendor Market Day retains its schedule/history view and now offers self-check-in during eligible market hours as described below.

Attendance spacing and loading refinement: sort headers use Editorial Market's left-origin animated underline with no button chrome. Table/check-in spacing is compact, with check-in padding matching BDG-02 status pills. The Submitted Applications highlight is now visible and remains mounted through filter changes. A centered loading/empty data row preserves the column headers; results reveal downward with reduced-motion support. Assignment dropdowns list all businesses with booth labels, vendor cards distinguish Assigned/Unassigned, and assignment actions share one row. Scoped grid selectors no longer stretch the shared Dialog close button. Eight focused attendance UI tests pass, including persistent headers during loading/empty results; targeted lint and typechecking pass. No backend or database changes were needed for this refinement.

Screenshot follow-up: sort controls now use the shared Button marker to opt out of legacy native-button chrome, with scoped text-only presentation. Removed the duplicate assignment sentence beside the business selector. Vendor search results use the same list-item/disclosure-button structure and booth-state presentation as booth results, with booth labels prefixed to vendor names only when assigned, lowercase assigned/unassigned statuses, and no inner cards. Unassigned retains the requested danger tone. Eight focused tests, targeted typechecking and lint pass.

Attendance details now enter with a subtle 220ms fade/slide and remain mounted for a 180ms closing animation. Reduced-motion preference removes both effects and closes immediately. The header uses the shared IconButton with the existing Dialog X path registered in UtilityIcon. A focused lifecycle test verifies the shared X and delayed unmount; nine attendance UI tests pass with targeted typechecking and lint. No backend or database changes.

The desktop table and details panel now share a 220ms grid-column/gap transition, so the table smoothly narrows on opening and expands during closing before the panel unmounts. Mobile retains its stacked layout. Reduced-motion preference disables the resizing transition. Nine attendance tests and targeted typechecking pass.


## Vendor self-check-in extension, October 30, 2026

`/vendor/day` reuses the existing appearance cards, Button, Badge, loading/error states and dashboard shell. The server projects `canSelfCheckIn` and the record revision. Eligible Awaiting appearances expose **Check In**, followed by a success message and **Self Check-In** status after the refreshed authoritative read. Availability refreshes at server-derived schedule boundaries, every 30 seconds and on window focus. No new UI component or styling standard was needed. The manager layout, actions and workflow are unchanged; its status badge and detail actor label now distinguish the source.

`vendorSelfCheckIn(occurrenceId: Int!, expectedRevision: Int!)` reloads the vendor's current identity and approved canonical membership/confirmed participation inside the existing market-then-occurrence transaction locks. It requires an active market, scheduled occurrence, nonfinalized session and `startsAt <= serverNow < endsAt`. Only Awaiting records can change. The mutation accepts no vendor identity, source, notes or timestamp. Duplicate self-check-ins acknowledge the existing record without changing timestamps, revisions or adding audits; manager decisions are never overwritten. Stale manager/vendor races retain the existing revision protections. Vendors have no undo, absence, notes or correction mutation.

Migration `1794800000000-VendorSelfCheckIn.ts` adds nullable `checkInSource` (`manager` / `vendor`) with a status/source consistency constraint. Existing Checked In records become manager-sourced. The four canonical states and checked-in totals remain unchanged. Server time and active account are saved with the source in the existing record and `ATTENDANCE_SELF_CHECK_IN` audit. Manager status changes clear or replace the source; note-only updates retain it. Explicit corrections to Checked In record the correcting manager/time. Before/after audits preserve original source, actor and timestamp. Vendor projections still exclude manager notes, actor IDs and audit details. Manager CSV adds check-in source. GraphQL schema and generated operations were refreshed locally.

Verification: the focused backend attendance test passed against a guarded disposable `vendure_test_operations_*` database and removed it after success. New assertions cover future/ended windows, unauthorized and unscheduled vendors, stale revisions, duplicate concurrent requests, source/account/time, vendor privacy, manager correction audits and manager/vendor concurrency. Eleven focused frontend tests pass, including vendor success/action replacement and unavailable actions. Targeted frontend typechecking, setup-script typechecking and lint pass. Backend server build passes. Full backend build still fails at the existing dashboard config policy `APP_ENV_EXPLICIT_MODE_REQUIRED`; worker build passes. No full regression suite, browser automation or screenshots were run.

The deterministic setup command is `npm run demo:market-operations:attendance-today` from the web root. It verifies local `vendure_demo_market_ops`, market **11**, the four existing dedicated vendor businesses and memberships, and the published A1-A4 layout. It creates only October 30, 2026 **1:00–4:00 PM America/Chicago** (`18:00–21:00 UTC`), canonical confirmed participations, approvals and ordinary booth assignments, then materializes four Awaiting/nonfinalized records. The exact time tuple is checked before insertion; a conflicting stable key fails. A transaction and initialization audit marker preserve manual changes on reruns. Because the requested start has already passed, this script uses the existing dedicated synthetic-fixture insertion convention for the date and participation/approval rows; ordinary scheduling continues to reject past starts. Booth assignments use the normal operations command. Existing accounts, markets and earlier occurrences are untouched.

Persistent setup was applied on October 30, 2026 after explicit developer approval. Inspection verified local `vendure_demo_market_ops` and only `VendorSelfCheckIn1794800000000` pending. The guarded migration applied it and verified no pending migrations remain. The guarded date setup created occurrence **22**, available at **`/market/day/22`**, for market **11**, October 30 **1:00–4:00 PM Central**. A read-only verification transaction confirmed exactly one matching occurrence, four confirmed approved participations, booths **A1–A4**, four **Awaiting Arrival** records, null check-in sources/timestamps and no finalization. A repeat run returned the same occurrence ID and verified exactly one matching date with the same four Awaiting/nonfinalized records. No existing accounts, earlier occurrences or established fixture data were reset or replaced. Completed commands:

```powershell
npm run demo:market-operations:migrate
npm run demo:market-operations:attendance-today
```

The second command prints occurrence **22** and `/market/day/22`. Restart the existing guarded demo serve/worker processes to load the updated API. Use the existing demo admin/storefront startup commands above.

Manual testing: log in as an existing Attendance V1 vendor with `Attendance-Local-Only!2026`, open `/vendor/day`, locate the October 30 appearance and click **Check In** between 1 and 4 PM Central. It becomes **Self Check-In** with its actual timestamp. As `attendance-v1.manager@example.test`, select Attendance V1 Test Market and open `/market/day/22`. The row shows **Self Check-In**, the Checked In total increases, and the existing details show the source, account and time. Manager corrections retain the original audit. Self-check-in outside this fixed window is unavailable; there is no clock override, GPS, QR, new notification or billing behavior.
