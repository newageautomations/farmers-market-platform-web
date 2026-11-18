# Market Day operational workspace

Implemented locally on November 12, 2026. Phase A and Phase B reports are unchanged. No browser automation, screenshots, deployment, backend changes or database writes were used for this phase.

## Implementation

Both roles now have occurrence-specific Setup, Market and Closing navigation. The existing dashboard shell wraps the shared WorkspaceFrame. The header includes market name, date, scheduled times in the market timezone, venue, occurrence status and an overview link. Vendors also see their booth assignment when applicable. Passing the scheduled end displays a notice, without asserting operational completion.

Vendor Setup composes the canonical attendance reader/self-check-in action, assigned booths, allocated equipment names and quantities, and the existing preparation checklist. Eligibility comes from `canSelfCheckIn`; writes use the displayed attendance revision. Private vendor-managed dates omit manager attendance and booth/equipment requirements.

Vendor Market provides permission-gated POS, pickup, orders and detailed finance links. The occurrence pickup queue uses the same FarmstandTable as Orders, existing status mappings, search and shared pagination. Review pickup opens the existing PickupDetails controller in the shared Dialog, including required customer identity confirmation. The existing `collectPickup` rereads the order, checks remaining-line signatures, validates vendor/fulfillment eligibility and submits sequential canonical idempotent fulfillment commands. Successful saves reread the queue. Closing uses that same queue plus the closing checklist. Counts are canonical pickup-order counts, not financial totals.

Manager phases retain the specialized Attendance controller, with compact counts, search across the selected occurrence's attendance pages, inline check-in, the existing detail panel/corrections and explicit finalization dialog. No attendance finalization happens automatically. Vendor operations show participation separately from attendance, booths, permission-filtered payment statuses and rental allocation record counts. Closing narrows the operational list to booth/payment/equipment work. Assignment/map/rental and occurrence-filtered invoice/payment links open existing specialist workflows, including their authorized cash-payment workflow. No payment mutation is recreated here.

## Files

Paths are relative to `E:\coding\farmers-market-platform-web`.

| Files                                                                                                                 | Change                                                                                      |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/admin/src/market-day/MarketDayWorkspace.tsx`, `market-day.css`                                                  | Shared role-aware feature composition and minimal layout rules                              |
| `apps/admin/src/preparation/PreparationPage.tsx`                                                                      | Embedded, phase-filtered reuse of the existing checklist editor and commands                |
| `apps/admin/src/vendor/VendorRoutes.tsx`, `apps/admin/src/market/MarketRoutes.tsx`                                    | Market Day route integration; retained vendor attendance history                            |
| `apps/admin/src/AdminShell.tsx`, `packages/admin-core/src/index.ts`                                                   | Avoid duplicate page headings; inherit vendor Market Day route visibility                   |
| `apps/admin/src/vendor/MarketOccurrence.tsx`, `UpcomingMarketDates.tsx`, `apps/admin/src/market/OccurrenceDetail.tsx` | Occurrence entry links                                                                      |
| `apps/admin/src/market/phase14/Attendance.tsx`                                                                        | Optional compact presentation, occurrence-wide client search and write-permission controls  |
| `apps/admin/src/vendor/pickup-data.ts`, `pickup.tsx`                                                                  | Scoped summary option; export existing pickup details/status; honor pickup occurrence links |
| `apps/admin/src/vendor/orders.tsx`, `pos.tsx`                                                                         | Honor occurrence context on entry; POS retains it for catalog/start requests                |
| `tests/market-day.test.tsx`, `attendance.test.tsx`, `in-person.test.tsx`                                              | Focused new coverage and intentional history-route expectation update                       |
| `tsconfig.market-preparation.json`                                                                                    | Include Market Day composition and tests in existing focused typecheck                      |

The working tree already contained extensive unrelated edits. Those were not reverted. Earlier Vitest runs also rewrote the existing configured `docs/evidence/phase13c5/unit-results.json` output; the final focused run uses the default console reporter.

## UI reuse and source review

- Orders: inspected `vendor/orders.tsx` and its styles. Reused FarmstandTable, FarmstandSearch, FarmstandButton/Link, FarmstandPagination, existing order status mappings and PickupStatus. No independent table spacing, colors, borders or row-action primitive was introduced.
- Markets: inspected `MarketOccurrence.tsx` and `UpcomingMarketDates.tsx`. Reused WorkspaceFrame, its heading/content width and WorkspaceMenu navigation, date/time formatting conventions, approved status badges and occurrence entry actions.
- Documents: inspected `documents/DocumentsWorkspace.tsx` and its direct imports. Reused the same shared search, table, panel, dialog, empty/loading/error controls and SettingsPanel composition used there.
- Settings: inspected `settings/SettingsPanel.tsx` and the shared implementation in `packages/ui/src/workspace.tsx`. Reused SettingsPanel, Field/Input, Checkbox and the existing preparation fieldset/form/saving behavior. Full preparation/template management remains intact.
- Attendance, pickup, map/rental and invoice/payment specialists retain their existing controllers and backend authority. No new primitive, library, competing standard or approval of a pending category is introduced.

The new Market Day composition exists because no existing page composes these role-specific day views. It imports established primitives and controllers. Its CSS only wraps action rows, lays out the pickup panel and removes the full preparation page's grid placement for the embedded checklist. Workspace spacing is inherited. No new label/value rows or contextual overrides of approved controls are added.

## Routing and phase selection

- Vendor selector: `/vendor/day`. Specific occurrence: `/vendor/day/69`. Legacy query entry `/vendor/day?occurrence=69` also resolves the date.
- Manager selector: `/market/day`. Specific occurrence: `/market/day/69`.
- Historical vendor attendance and packing status remain at `/vendor/day/history`.
- Existing preparation links and legacy specialized manager layout paths remain available.
- Phase links use `#setup`, `#market` and `#closing`. Ordinary activation updates local React state and replaces the URL fragment, without a reload or backend command. Refreshing or opening that link restores the selected phase. There is no shared persistence or browser-storage phase record. Each open workspace chooses independently.
- Direct IDs are read through the existing authorized preparation endpoint. A denied/mismatched occurrence never mounts attendance, tasks or order operations. Date choices reuse the existing preparation date projection, including private vendor-owned dates. Historical/cancelled dates can be opened directly even when absent from the upcoming selector.

## Tasks and compatibility

No task schema extension or migration is needed. The smallest compatible grouping uses an explicit `[Closing] ` title prefix in the existing task record. New Closing tasks receive it automatically. Existing unmarked tasks appear in Setup. Editing a title in full Preparation can move an existing task between groups by adding/removing that prefix. Templates keep their existing titles, so a template containing prefixed titles preserves grouping when applied.

Both phases use PreparationPage's original add/edit/delete/complete/reopen/reorder implementation and revision handling. Reordering swaps visible tasks in the full canonical permutation, preserving hidden tasks. Full Preparation still displays all tasks and templates. Embedded checklists link to full template management rather than duplicating it. Task completion remains self-reported and can invalidate an existing readiness declaration under Phase B rules, but never declares readiness or changes attendance. Completing an equipment-return task cannot update any equipment authority.

## Permissions and freshness

No API, GraphQL schema, backend service or permission grants changed. Every read/write uses the existing channel-bound service. Vendor pickup rows are additionally filtered by both selected occurrence and current vendor. Manager preparation data continues to expose its allowlisted operational projection, not vendor private tasks or customer/order data. Invoice reads retain existing billing authorization. Attendance writes require the existing day-operation grant; canonical backend checks remain decisive.

Refresh information remounts/refetches the active compositions. Attendance commands refresh their own reader, checklist commands use the canonical returned preparation record and pickups refresh after successful handoff. No new polling or WebSocket infrastructure is added. Other users' changes require refresh/re-entry. Missing invoice/booth summaries are unavailable, not zero or paid. Private-market manager requirements are not applicable.

The existing orders endpoint pages vendor orders without a server occurrence-filter argument. The scoped adapter filters immediately after those reads, then reads packing only for matching occurrences. It avoids the full CRM/customer-history join, catalog and image-library fetches in Market Day. Customer/order display names come from the authorized packing projection when available; otherwise the existing unavailable label and operational identifier are used. Managers do not call this adapter.

## Automated verification

Passed: 63 tests across `market-day`, `market-preparation`, `pickup`, `attendance`, `orders-workspace`, `upcoming-market-dates` and `vendor-market-detail` in the final combined run. Coverage includes freely selectable phases without mutations, direct occurrence read failure/isolation, private dates, canonical attendance revisions, permission-gated manager actions, Phase B checklist commands and canonical pickup fulfillment. The legacy attendance-route assertion was intentionally updated to the retained history route.

Focused ESLint passed for the new composition and changed route, attendance, order, pickup, preparation and POS controllers, shell, route guard and new tests. Prettier was applied to touched source files.

`npx tsc --noEmit -p tsconfig.market-preparation.json --pretty false` remains blocked by existing errors in `vendor/LoyaltyDashboard.tsx:465-466` and `packages/ui/src/table-navigation.ts:29`. It reports no Market Day diagnostics. Existing Upcoming Dates React act warnings and JSDOM scrollTo notices remain. No full repository tests or browser checks were run.

The additional POS suite passed all 25 tests, including the new catalog/start occurrence-context test. A final run of POS, Market Day and attendance passed 45 tests after the last functional changes. Across these scopes, 88 distinct tests passed. Final focused lint and touched-file formatting passed. Initial new-test failures were fixture setup/expected-call issues and were corrected; no backend behavior was changed to satisfy them.

## Database and test data

No Phase C migration is required. Phase B documents that its additive migration was already applied to `vendure_demo_market_ops`. No database reset, reseed, data replacement, new persistent fixture, account modification or credential reset was performed here. Backend authorization and database qualification from Phase B were not rerun for this frontend-only phase.

Use the previously documented populated accounts/routes below. These are inherited from Phase B's read-only inspection, not a new claim of live data validation in Phase C.

| Workspace                                                          | Route                                 |
| ------------------------------------------------------------------ | ------------------------------------- |
| Existing Manna Roots vendor, Boerne occurrence 69                  | `http://localhost:4322/vendor/day/69` |
| Existing Boerne Market Manager, occurrence 69                      | `http://localhost:4322/market/day/69` |
| Manna Roots private pickup occurrence 74                           | `http://localhost:4322/vendor/day/74` |
| Existing dedicated Cedar Creek Farm fixture, private occurrence 71 | `http://localhost:4322/vendor/day/71` |

Use your existing Manna Roots and Boerne manager logins. The existing Cedar Creek fixture is `vendor.markets@example.test` / `Local-Vendor-Markets-2026!`, as documented in the prior report. No new fixtures are needed. Preserve the established Manna Roots data; use Cedar Creek or a deliberately chosen test occurrence for task mutations. For public-market pickup/payment mutations, choose an existing test order/invoice you intend to change rather than manufacturing a paid state.

## Manual testing

From `E:\coding\farmers-market-platform-web`, start the persistent test environment in separate terminals:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. Sign in as Manna Roots and open `/vendor/day/69`, or Markets > Upcoming Dates > Open Market Day. Compare its occurrence time/location/booth with `/vendor/markets/39/dates/69`. `/vendor/day` must offer the occurrence selector. Check the matching row's badge and allocated equipment against Booth assignments.
2. Switch directly between Closing, Setup and Market. Refresh a `#closing` link. Attendance, readiness and order state must remain unchanged solely from navigation. In another authenticated browser/session, open the manager's `/market/day/69#market`; changing its phase must leave the vendor's phase untouched.
3. During the scheduled start-inclusive/end-exclusive check-in window, an eligible vendor sees Check in. Click it once and verify canonical attendance updates; readiness is unchanged. Before/after the window, on cancellation or after an existing check-in, server eligibility must suppress the action. Use manager correction for exceptions, without changing the clock or established scheduling data.
4. On the dedicated Cedar Creek `/vendor/day/71`, add/complete/reopen a Setup task. Add a Closing task and verify its `[Closing] ` title in `/vendor/preparation/71`. Refresh and switch phases: both records persist in their own group. Edit/delete/reorder tasks and verify the existing template UI still works in full Preparation. Test stale revisions in two tabs and verify failed saves show errors instead of overwriting another session.
5. Open Manna Roots' private `/vendor/day/74` read-only, or use Cedar Creek's private fixture for task writes. Manager attendance, booth and manager-equipment requirements must be not applicable. Orders/tasks and owning-vendor authorization still apply. A different vendor or manager entering the private ID must receive the existing authorization failure.
6. On a chosen public occurrence with an eligible pickup, open Market > Review pickup. The shared confirmation must require verified customer identity. Confirm deliberately and verify the canonical order/fulfillment and counts update. Reopen Closing and verify it no longer appears outstanding. Cancelled/collected orders must not appear in the outstanding queue; orders from other occurrences must never appear. Search and pagination must use the shared controls.
7. Open POS from Market. Its selling context and initial catalog must use the selected occurrence. Start a deliberately chosen test sale and verify the draft retains that occurrence. Resume an existing draft only when intended: the draft's saved context remains authoritative. View orders and Order Pickup should arrive with the occurrence filter selected.
8. As Boerne manager, open `/market/day/69`. Search attendance, use inline Check in on a chosen awaiting vendor and compare the result with canonical attendance. Open the existing detail panel for status changes/corrections. Finalization remains an explicit existing dialog; do not finalize just to test navigation. Read-only staff must have no enabled check-in/finalization writes.
9. Review participating vendors separately from attendance. Follow Booths, map and rentals to `/market/assignments/69`. Follow Invoices and payments to `/market/finances/invoices?occurrence=69`. For a chosen invoice, use its existing authorized cash-payment/reconciliation workflow and refresh Market Day. A recorded cash payment must retain the existing cash status semantics. Staff without billing access must see unavailable summaries and no payment entry link.
10. In manager Closing, complete a manager-owned task and refresh. Vendor private tasks must remain absent. Compare allocation counts with Assignments, without assuming a physical return. Verify no Finish control, assistance placeholder or lifecycle-close action is present in the new workspace.
11. Exercise an already cancelled/historical occurrence, empty pickup queue, no vendors, no booth/equipment and a failed/expired request. Saved task cancellation behavior must match Preparation; missing data must be unavailable rather than zero. Confirm errors can be refreshed and successful local mutations require no full browser reload.
12. Manually compare page padding, tables, badges, searches, forms and dialogs with Orders, Markets, Documents and Settings on phone/tablet/desktop widths. Verify keyboard navigation, dialog focus and reduced-motion behavior using existing components. These visual checks are intentionally left to the user.

## Limits and deferred features

No Finish Market Day/Finish Market command, use of `CLOSE_DAY`, lifecycle state machine, animated recap, assistance persistence, customer storefront mode, equipment handoff/return ledger, financial engine, new subscription infrastructure or unrelated redesign was implemented.

There is no new occurrence sales-total calculation. Pickup counts are shown; detailed finances open the existing finance workspace, whose date/market filtering remains authoritative. No occurrence filter is implied on that general finance link. A live countdown was optional and is omitted. Phase selection persists in its direct link, not in a remembered per-user preference.

The default selector uses the existing upcoming preparation range; older dates require a direct link or existing occurrence/history navigation. Payment details and complex booth/rental workflows remain in their existing authorized specialist interfaces. Existing generic typecheck failures and manual visual/live database verification remain outstanding as described above.
