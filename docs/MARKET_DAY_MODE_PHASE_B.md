# Market Preparation implementation

Implemented November 12, 2026, following `MARKET_DAY_MODE_PHASE_A_AUDIT.md`. All changes are local. The sibling backend was included with explicit user authorization.

## Implementation

Vendors have an occurrence-specific preparation page with market timing and location, participation, booth assignment, market invoice status, equipment allocations, existing packing progress and a link to the full packing interface. Private vendor-owned occurrences use the same page without manager, booth, invoice or rental requirements.

Vendors and managers can add, edit, delete, complete, reopen and reorder their own workspace's occurrence tasks. Tasks preserve creation, update and completion timestamps. Templates support creation, editing and deletion. Applying a template appends independent task instances, never overwrites existing tasks, and is allowed once per template identity per occurrence. Applied buttons remain disabled even if that template is subsequently edited. Editing or deleting a template does not change copied tasks. Creating a genuinely new template is an explicit new application choice.

Vendor readiness is an explicit, timestamped, reversible declaration: Not Reported, Ready, Not Ready or Needs Reconfirmation. Completing tasks never declares readiness. Opening readiness confirmation refreshes preparation and authorized packing first. The confirmation dialog lists unfinished personal tasks and current operational states. Optional tasks need not be finished. Every custom task mutation invalidates a previous Ready declaration, including reordering. Template edits alone do not invalidate occurrence readiness.

The manager page shows readiness counts, participation, booth and invoice information, rental allocation counts, searchable vendor rows and an attention filter. Assigned/unassigned booth counts come from existing assignments and the selected layout. Without a layout, the unassigned count is unknown. Outstanding invoice counts require the existing billing grant. External businesses with confirmed occurrence approvals are included, with readiness Not Applicable because they have no vendor declaration workflow. Managers also have a separate occurrence checklist and reusable templates.

## Important files

Paths below are relative to the indicated local project.

| Project | Files                                                                                                                         | Purpose                                                                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web     | `apps/admin/src/preparation/PreparationPage.tsx`, `preparation.css`                                                           | Shared feature composition with distinct vendor and manager projections; tasks, templates, declaration confirmation, error handling and system facts |
| Web     | `packages/api/src/preparation.ts`, `packages/api/src/index.ts`                                                                | Named Admin API adapter and public feature types                                                                                                     |
| Web     | `apps/admin/src/vendor/service.ts`, `vendor/VendorRoutes.tsx`                                                                 | Vendor service and preparation routing                                                                                                               |
| Web     | `apps/admin/src/vendor/MarketOccurrence.tsx`, `UpcomingMarketDates.tsx`                                                       | Entry points from market date details and Upcoming Dates                                                                                             |
| Web     | `apps/admin/src/market/service.ts`, `market/MarketRoutes.tsx`, `market/OccurrenceDetail.tsx`                                  | Manager service, route and occurrence entry point                                                                                                    |
| Web     | `packages/admin-core/src/index.ts`, `apps/admin/src/AdminShell.tsx`                                                           | Route visibility and reuse of the existing workspace heading/shell                                                                                   |
| Web     | `tests/market-preparation.test.tsx`, `tsconfig.market-preparation.json`                                                       | Focused frontend qualification                                                                                                                       |
| Backend | `src/plugins/market-operations/preparation.entity.ts`, `preparation.model.ts`, `preparation.service.ts`, `preparation.api.ts` | New persistence, validation, revisions, authorization, copying and projection                                                                        |
| Backend | `src/plugins/market-operations/market-operations.plugin.ts`                                                                   | Registers the feature in the existing plugin                                                                                                         |
| Backend | `src/plugins/market-operations/service.ts`, `packing.service.ts`                                                              | Narrow preparation operational reader, using existing assignment/rental/invoice entities and permissions, including historical/cancelled dates       |
| Backend | `src/migrations/1797500000000-MarketPreparation.ts`                                                                           | Additive persistence migration                                                                                                                       |
| Backend | `test/marketplace-commerce/preparation.ts`, `package.json`                                                                    | Guarded disposable database qualification and `test:market-preparation` command                                                                      |

No existing component supplies the combined preparation workflow or occurrence task/template persistence, so `PreparationPage` is a new feature composition. It reuses WorkspaceFrame, the existing application-detail Panel, Farmstand buttons/links/search/table, Checkbox, Badge, Field, Input, Textarea, Dialog, ReadState, existing navigation helpers and design tokens. No new UI primitive, library, design standard or approval of pending component categories is introduced. Its definition-list selector explicitly resets `dd` margin and centers values. Visual center alignment remains a manual check because browser and screenshot automation were explicitly excluded.

## Data and migration

`market_preparation` has a unique `(scope, ownerId, occurrenceId)` record, revision and JSON state containing only personal tasks, applied template identities and an optional readiness declaration. `scope` is VENDOR or MANAGER; the owner is the vendor workspace or market workspace respectively. The occurrence has a foreign key with restricted deletion and an occurrence/scope index. The service validates owner identity rather than accepting an owner ID from a caller.

`market_preparation_template` stores workspace scope/owner, name, revision and task titles, indexed by scope/owner. Templates contain no occurrence completion state. Limits are 160 characters per task, 80 per template name, 100 tasks per occurrence/template and 50 templates per workspace. Inputs, boolean completion values, task membership and exact reorder permutations are validated on the server.

Writes run inside existing Vendure transactions. A workspace advisory transaction lock serializes initial record creation, task changes and template writes. Every mutation requires the current occurrence preparation revision; edits, deletes and application of existing templates additionally check template revision. Declaring Ready also checks the operational source fingerprint shown by the page. Concurrent stale writes fail rather than overwrite newer work. Occurrence read locks on writes prevent a concurrent cancellation/reschedule from being silently ignored.

Rescheduling retains the occurrence ID and preparation records. Cancelled occurrences/participations are readable but not writable. Scheduled historical occurrences remain readable and editable, with an ended-time notice; no new completion or attendance lifecycle rule is invented.

Migration `MarketPreparation1797500000000` was applied through `npm run demo:market-operations:migrate` to `vendure_demo_market_ops`. Inspection first confirmed it was the only pending migration. The existing guarded runner confirmed completion without application bootstrap, reset or seeding. No migration remains necessary for this local demo database. Other local databases need the normal migration before starting the updated backend. Rollback is deliberately refused to preserve preparation records.

## Authority and privacy

- Vendor reads require current vendor identity, an approved verified membership and participation for the selected occurrence. Writes require `ManageOwnMarketParticipation`. Private markets additionally require the owning vendor and are rejected by manager authorization.
- Manager reads require current market membership, `ReadOwnMarket` and `ReadOwnMarketAssignments`; writes also require `OperateOwnMarketDay`. The operational reader retains the existing administrator and workspace checks. Billing data requires `ReadOwnMarketBilling`; denied invoice data returns unavailable, not zero or paid.
- The manager roster explicitly projects vendor name, participation, readiness and last declaration time, booth labels, authorized invoice status information and rental snapshots. It never returns vendor task titles, timestamps, individual completion, templates or packing details. Selecting VENDOR scope in a manager session fails vendor authorization; selecting another manager's occurrence fails market authorization.
- Vendor packing progress is read through the existing packing API under the caller's existing order permission. Packing quantities and completion remain owned by that subsystem. Vendor assignments/invoices/rentals come from the existing vendor assignment reader. Preparation tables do not copy authoritative attendance, payment, packing or assignment facts.
- Readiness and attendance are independent. No preparation command calls attendance, self-check-in, POS, payment, assignment, scheduling-closeout or `CLOSE_DAY` mutations.

## Freshness and unavailable states

The readiness fingerprint compares occurrence and participation versions, active assignment revisions, invoice/allocation update indicators persisted packing revision and current packing source-line signatures. Task changes durably invalidate Ready even if later reversed. Manager reads can compare indicators internally without disclosing private packing or checklist contents.

The vendor page reconciles packing through the existing reader before fetching preparation. Both vendor and manager preparation reads also compare a read-only digest from the existing packing source-line projection, so new preorders can require reconfirmation even before the packing screen is reopened. The digest is language-independent and exposes no customer or packing details. There is no new event stream or guarantee that every operational change is detected immediately. The page shows the last declaration timestamp, explains this limitation and offers Refresh information. It does not claim that a previous Ready declaration certifies all current preparation.

Unavailable packing is displayed as Unavailable. Missing invoice records are Unknown (no invoice), rather than paid or zero. Void/cancelled invoices are excluded from active payment requirements. An authoritative empty allocation list is labelled no allocations; private-market booth/payment/equipment sections say Not Applicable. A missing layout or missing billing permission produces an unknown/unavailable summary.

## Automated verification

Passed:

- Backend `npm run test:market-preparation`: task add/edit/delete/reorder/completion timestamps, input limits, stale revisions, simultaneous writes, template copying and independence, template deletion, duplicate application prevention, cross-vendor isolation, readiness declaration/reversal/reconfirmation, stale operational fingerprint rejection, new-preorder reconfirmation before reopening Packing, manager-private boundaries, manager templates, billing-grant denial, external participants, private-market ownership, reschedule persistence, cancelled reads/write rejection, GraphQL manager read/privacy and persisted records. The final run created and removed its guarded `vendure_test_preparation_*` database. It never targeted the persistent demo database.
- Web `npx vitest run tests/market-preparation.test.tsx tests/upcoming-market-dates.test.tsx tests/vendor-market-detail.test.tsx`: 25 tests passed, including 9 new preparation tests. Existing Upcoming Dates tests emit React act warnings.
- Backend `npx tsc --noEmit -p tsconfig.json` and `npm run build:server` passed.
- ESLint for the new preparation page, API adapter and preparation tests passed.

Existing verification limits:

- Focused frontend `npx tsc -p tsconfig.market-preparation.json --pretty false` is blocked by the pre-existing `packages/ui/src/table-navigation.ts:29` possibly-undefined `target` error. There are no diagnostics in the new preparation files. The initial broader diagnostic also found existing LoyaltyDashboard and unrelated test-fixture errors; these were not investigated or modified.
- Required backend `npm run build` stops in the existing Vendure dashboard configuration at `APP_ENV_EXPLICIT_MODE_REQUIRED`. The server-only build passes. No environment policy or secret configuration was changed to bypass this check.
- Early qualification attempts exposed test-harness issues that were corrected: JSON object key ordering in a persistence assertion, a wrong fixture manager login and custom-permission enum typing. Failed disposable runs were retained by the existing guard. The final focused run passes and cleans up its own database.
- No full repository test suite, browser automation or screenshot verification was run.

## Integrated data

No new persistent accounts, tasks, readiness declarations, templates or occurrences were created. Existing established accounts, including Manna Roots, were not changed to manufacture a ready scenario. Only the additive schema migration touched the persistent demo database. Existing data was inspected through a read-only connection to identify the routes below.

Existing realistic examples at implementation time:

| Account/workspace                                                                        | Exact route                                                    |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Manna Roots, Boerne membership 39, occurrence 69                                         | `http://localhost:4322/vendor/markets/39/dates/69/preparation` |
| Boerne Market Manager, occurrence 69                                                     | `http://localhost:4322/market/preparation/69`                  |
| Manna Roots private pickup membership 56, occurrence 74                                  | `http://localhost:4322/vendor/markets/56/dates/74/preparation` |
| Existing dedicated Cedar Creek Farm private-market fixture, membership 55, occurrence 71 | `http://localhost:4322/vendor/markets/55/dates/71/preparation` |

The first Boerne example starts November 13, 2026, and the private pickup example is also on November 13. Historical links remain valid after those dates. For a later upcoming occurrence, use Markets > Upcoming Dates > Market preparation. Existing Cedar Creek fixture credentials, already documented in `VENDOR_MANAGED_MARKETS.md`, are `vendor.markets@example.test` / `Local-Vendor-Markets-2026!`. No credentials were created or reset for Phase B. Use your existing Boerne manager and Manna Roots sign-in for their workspaces.

## Manual testing

Restart the local processes to load the new backend API. In separate terminals in `E:\coding\farmers-market-platform-web`, use only:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

The migration is already applied locally. Do not reset or reseed the database. The storefront process is useful for checking existing preorder flows but Phase B does not change customer storefront behavior.

1. As a vendor, open Markets > Upcoming Dates, select a participating date and follow Market preparation. The same action exists on the market date detail page. For a read-only integration review, use Manna Roots' exact Boerne route above and compare time/location, booth, invoices and rentals with the existing date and assignment pages. Follow Open packing list and compare quantities and completed customer groups. Do not manufacture a paid or fully packed state.
2. For personal-task mutation testing, use the existing dedicated Cedar Creek fixture or your chosen test vendor. Add two tasks, edit one, move it up/down, complete and reopen it, then delete it. Refresh the browser and verify committed task order and timestamps persist. These changes should not reload the page when made.
3. Create a template from the current tasks, edit its name and newline-separated titles, and apply it to an eligible date. Existing tasks remain. Applied to this date is disabled. Edit the occurrence copy and verify the template is unchanged; edit/delete the template and verify existing occurrence copies remain. Apply it to another date before deleting to check independent state.
4. Verify a fresh date says Not Reported. Click Declare ready and review the incomplete task count and source states before confirming. Confirm with an optional task still open, then edit/complete/reorder a task and verify Needs Reconfirmation. Confirm again and then Mark not ready. Refresh to verify declaration state/time persist. Attendance must remain unchanged throughout.
5. Open the same preparation page in two tabs. Save in one and attempt a save in the older tab. Expect an error and authoritative refresh, without a lost update. Retry deliberately after reviewing the latest list.
6. As the existing Boerne manager, open Occurrences > the selected date > Market preparation, or the exact manager route above. Search for a vendor, enable Needs attention only and compare booth/payment information with Assignments and Booth invoices. Verify missing billing permission gives unavailable values, not paid or zero. External businesses have readiness Not Applicable. A vendor who has never reported must remain Not Reported even if participation is confirmed.
7. Add/complete/reorder manager tasks and create/apply a manager template. Refresh and verify persistence. In the vendor workspace these manager tasks and templates must be absent. In manager responses, vendor task titles, individual completion and packing contents must be absent. For a vendor you deliberately use for declaration testing at this manager's market, refresh the manager page to observe only the shared declaration and its last timestamp.
8. Attempt to access the vendor preparation query with MANAGER credentials and VENDOR scope, another manager's occurrence with MANAGER scope, and another vendor's template ID. They must fail authorization rather than expose private tasks. The manager UI has no control to declare readiness for another vendor.
9. Open the owning vendor's private occurrence route. Check location, packing link, custom tasks, templates and readiness; booth/payment/manager equipment are Not Applicable. A manager or different vendor must not read it by changing the ID. Use the existing Cedar Creek fixture for mutation testing without altering Manna Roots' established state.
10. On a test occurrence you intentionally choose for scheduling tests, reschedule through the existing schedule UI and verify the preparation route and tasks remain associated with the same ID. A prior Ready declaration requires reconfirmation. For an already cancelled occurrence, verify saved preparation is readable and controls are disabled. Do not cancel an established occurrence just to perform this check.
11. Simulate a failed request or expired session during a task save. The UI must show failure, refresh authoritative state and retain the text draft for review. Confirm no task is shown completed solely because a failed request was attempted. Refresh source information after packing changes; check that the last declaration timestamp and freshness caveat remain visible.

Manual browser visual checks remain for the developer: responsive layout, dialog focus/scroll behavior and label/value center alignment. No automated visual claim is made.

## Deferred work and limits

No Setup/Market/Closing tabs or shared phase state, market completion, animated recap, changes to `CLOSE_DAY`, attendance finalization, storefront Market Day activation, pickup-map highlighting, assistance requests, equipment handoff/return tracking, WebSockets, new financial reporting engine, deployment or unrelated refactoring were implemented.

Preparation is available only after existing authorized occurrence participation is present; it does not create participation or approve a vendor. Templates are managed from an eligible occurrence rather than a separate global settings page. Managers cannot set a vendor's declaration. Source refresh is on entry and explicit refresh, not a new real-time subscription. Readiness is never attendance, check-in or permission to attend, operate POS or bypass payment requirements.
