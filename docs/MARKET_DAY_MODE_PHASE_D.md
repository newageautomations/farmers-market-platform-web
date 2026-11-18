# Market Day assistance, completion and recaps

Implemented locally November 12, 2026, extending Phase C. No deployment, remote service, browser automation, screenshots or full test suite was used. Existing unrelated working-tree edits were preserved.

## What shipped

Vendor Market has Request assistance with Booth, Equipment, Payment and Other categories and a 600-character description. Requests persist independently of notifications. Vendors see only their own requests; managers get an occurrence-scoped searchable queue, open first, with vendor, known booth, age, status and an inline detail panel. Resolution records actor and time. Closing retains the queue and unresolved work. Private vendor-managed dates omit assistance on both server and client.

Closing provides Finish my market day and Finish market, independently. Vendor completion belongs to the vendor and occurrence; manager completion belongs to the market occurrence. Each Finish/Reopen records actor, timestamp and revision, preserving all earlier events. UUID retry keys and payload hashes protect request creation, resolution and completion; a serialized transaction and expected revision reject conflicting stale writes. A request is limited to 100 records per vendor/date. Multiline descriptions are validated server-side. Keys and hashes are excluded from read projections.

Finish is unavailable before scheduled start, for cancelled occurrences or cancelled vendor participation, and without the existing write grant. Scheduled end never completes anything. Finish does not call or alter `CLOSE_DAY`, `operationsComplete`, attendance finalization, occurrence scheduling, order fulfillment, POS, billing or storefront behavior. Reopen retains history. Private dates create only the owning vendor's completion record.

Confirmation freshly reads authorized closing tasks, pickups, assistance, fee and attendance warnings. Failed or inaccessible sources say unavailable. Warnings do not prevent finishing. Existing pickup, attendance, invoice, adjustment and refund controllers remain accessible after Finish.

A newly confirmed Finish opens a recap with a 360ms opacity/position transition, removed after the action and disabled by reduced-motion preference. It never delays interaction. Refresh or View recap does not replay it. A failed recap read leaves completion saved and offers a read-only retry. Setup, Market and Closing remain freely selectable.

Assistance/completion reads refresh after local actions, on focus and on returning to a visible document. Active Market/Closing views poll every 30 seconds while visible, skipping in-flight reads and commands. Setup does not poll. Reads are bounded to the active occurrence and grants. Failed refreshes retain last-known information with an explicit stale/failure warning. There is no push or global synchronization.

## UI reuse

Read the Phase A audit, Phase C report, root usage guide and approved component registry; inspected their relevant source paths rather than repeating the architecture audit.

- Kept `MarketDayWorkspace`, `WorkspaceFrame`, the dashboard shell, occurrence header, content width, padding, tab placement and phase navigation.
- Reused actual `FarmstandTable`, `FarmstandSearch`, `FarmstandPagination`, row-action `FarmstandButton`, and shared `Badge`, matching the Orders presentation contract.
- Reused `SettingsPanel`, `Dialog` including its busy/focus contract, `Field`, `FarmstandSelect`, shared `Textarea`, `Alert`, `EmptyState` and `ReadState`. The new composition opts into the same `farmstand-controls` context as Documents and Settings.
- `DayActions` is feature composition because no existing component owns assistance, independent completion and recap recovery. It introduces no primitive, library or alternate design standard. CSS is limited to layout, centered label/value rows and the recap transition. Checklist title grouping is unchanged. Browser alignment and responsive visual checks remain manual as requested.

## Permissions and data decisions

The backend reuses `MarketPreparationService.authorize`: validates occurrence ID, active market, channel/workspace and current membership. Vendor reads require existing vendor-read access, verified approved market membership and occurrence participation; writes require `ManageOwnMarketParticipation`. Private locations require their owner. Manager reads require authorized market membership and `ReadOwnMarketAssignments`; writes require `OperateOwnMarketDay`. Permissions are reread server-side rather than trusted from client controls. Another market, vendor or a private date outside ownership fails closed. Assistance contains no order or customer projection.

Vendor recap uses the existing canonical financial allocation/refund facts and shared `vendorCapturePredicate` used by financial reporting. Finance data requires `ReadOwnVendorFinance` plus current vendor finance authorization. The defined sales basis is merchandise gross less discounts and settled merchandise refunds, excluding tax and shipping. Order count is distinct canonical purchase ID per vendor/currency; parent orders and vendor portions are never counted separately. Best seller ranks variant units minus settled refunded units, with deterministic ties. Attributed platform POS can contribute, including anonymous purchases; external POS and unattributed purchases are excluded. Guest purchases are included in attributed sales. No-capture coverage and unsupported metrics render unavailable, not invented totals. New/returning customers remain explicitly unavailable; no anonymous or guest customer is classified as new.

Manager recap prioritizes confirmed vendor participation and recorded check-ins separately, attendance follow-ups, requests resolved, fees collected by currency and payment method, and outstanding invoice balances including drafts. Attendance counts require the existing day-operation grant and an existing attendance session; otherwise unavailable. Billing figures require `ReadOwnMarketBilling`. Recorded cash stays separate from Stripe collections; Stripe collection does not imply bank settlement. Fee collections subtract recorded customer-returned/completed invoice refunds and exclude waivers/complimentary entries. Managers receive no vendor monetary-sales metric. Neither sales nor fees are labeled profit. Attendance is never shopper foot traffic or proof that a vendor remains onsite.

Comparisons select the immediately preceding scheduled, non-cancelled occurrence of the same market, with matching timezone and scheduled duration. The same role's current permission and owner checks apply to that date. Metric key, currency and coverage definition must match and both values must be available. If the preceding candidate is inaccessible or incomparable, it is omitted rather than replaced by a different market or older substitute. Best-product identities are not compared as percentages. Comparisons show actual prior values, never fabricated percentages. Private comparisons remain owner-scoped. Recaps use current records and display read time, so later refunds/corrections appear on a refreshed read. No delayed analytics projection is represented as live data.

## Local files

Web paths are relative to `E:\coding\farmers-market-platform-web`:

| Files                                                                                  | Change                                                                     |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `apps/admin/src/market-day/DayActions.tsx`, `market-day.css`, `MarketDayWorkspace.tsx` | Assistance, completion, warnings, recap composition and layout integration |
| `packages/api/src/market-day.ts`, `index.ts`                                           | Typed channel-bound read/command/recap client                              |
| `apps/admin/src/vendor/service.ts`, `market/service.ts`                                | Existing workspace service wiring                                          |
| `tests/market-day-actions.test.tsx`, `tsconfig.market-preparation.json`                | Focused UI tests and inclusion in existing typecheck scope                 |
| `scripts/demo-market-operations.ts`, `package.json`                                    | Local fixture command                                                      |
| `docs/MARKET_DAY_MODE_PHASE_D.md`                                                      | This report                                                                |

API paths are relative to `E:\coding\farmers-market-platform`:

| Files                                                                                              | Change                                                                          |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/plugins/market-operations/market-day.entity.ts`, `market-day.service.ts`, `market-day.api.ts` | Separate persistence, authorization, commands and role-specific recap readers   |
| `src/plugins/market-operations/market-operations.plugin.ts`, `preparation.service.ts`              | Register feature and reuse existing guarded authorization method                |
| `src/migrations/1797600000000-MarketDay.ts`                                                        | Add completion and assistance tables/indexes; forward-only history preservation |
| `test/marketplace-commerce/market-day.ts`, `package.json`                                          | Guarded disposable integration qualification                                    |
| `scripts/market-operations-demo/market-day-fixture.ts`, `invoice-fixtures.ts`, `run.ts`            | Dedicated manual scenario using existing account and invoice setup paths        |

## Migration and fixture status

Applied `MarketDay1797600000000` to **`vendure_demo_market_ops`** through the web directory's guarded migrate script. Read-only preflight established it was the sole pending migration. No reset, truncate, reseed, replacement or established-account credential change occurred. The existing Manna Roots and Boerne accounts and their data were not used to manufacture states.

The dedicated fixture ran successfully and reran with the same IDs and balances. It reuses the existing Preorder Fee D market and dedicated owner identities. It adds only Market Day-owned dates, booth invoices, a private pickup location and Closing tasks. Existing invoice setup commands create assignments, issued/unpaid, partial cash, paid cash and draft examples. To make Finish available immediately without changing the clock, the fixture alone adjusts the effective times of its newly initialized 2030-keyed dates to current/prior times. Immutable generation identity, original schedule date and original local times remain intact, as with a rescheduled occurrence. Existing initialized dates are not moved on rerun. This is fixture setup, not a new scheduling capability. No provider is contacted and no real settlement is fabricated.

| Item                                  | Persistent fixture                       |
| ------------------------------------- | ---------------------------------------- |
| Manager                               | `stripe-fee-d-manager@example.test`      |
| Vendor                                | `stripe-fee-d-orchard@example.test`      |
| Existing fixture password, both roles | `Local-Fee-D-2026!`                      |
| Public market                         | 34, Preorder Fee D Market                |
| Current occurrence                    | 76                                       |
| Comparable prior occurrence           | 75                                       |
| Private vendor occurrence             | 77                                       |
| Unpaid invoice                        | 72, USD 100.00                           |
| Partial cash invoice                  | 73, USD 100.00 total, USD 40.00 recorded |
| Paid cash invoice                     | 74, USD 100.00 recorded                  |
| Draft invoice                         | 75, USD 100.00                           |
| Other unpaid examples                 | 76, 77, 78                               |

These fixtures intentionally do not synthesize commerce sales or a pending pickup. The supported outstanding invoice satisfies the follow-up scenario. Vendor sales/order/product metrics are unavailable until captured occurrence-attributed purchases exist. Manager recap initially has USD 140.00 cash recorded and USD 560.00 outstanding including the draft, before deliberate manual changes. Confirmed participants, recorded check-ins and assistance remain separate facts. The prior date supports matching operational comparisons; no sales comparison is fabricated.

From the web directory, safe setup commands are:

```powershell
npm run demo:market-operations:migrate
npm run demo:market-operations:market-day-fixtures
```

Both have already been run. The migration is additive and repeat-safe; the fixture preserves manual requests, completion, task completion and payment changes on rerun. It requires the existing dedicated Fee D fixture identities and memberships and fails if those prerequisites are missing; it does not recreate or reset them.

Start each environment process in a separate terminal from the web directory:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Restart a previously running backend to load the new schema and plugin code. These commands target the persistent demo database, not the ordinary `vendure` database.

## Manual flow

1. Sign in as the dedicated vendor and open `http://localhost:4322/vendor/day/76#market`. Request Equipment assistance with a brief description. Double-click or retry after a failed response: only one request should exist. View its open status and details. A separate vendor cannot retrieve this request.
2. In a separate manager session, open `http://localhost:4322/market/day/76#market`. Focus the window or refresh requests. Search Orchard, its booth, category or description. Open View request and resolve it. Confirm the resolved actor/time and vendor-visible status after focus/refresh. Cancelled and unauthorized writes should fail server-side.
3. Submit another request and leave it open. In manager Closing, verify it remains follow-up work. Review Invoices and payments at `http://localhost:4322/market/finances/invoices?occurrence=76`. Do not use legacy Close day or finalize attendance for this scenario.
4. As vendor, open `http://localhost:4322/vendor/day/76#closing`. Finish my market day shows the saved open Closing task and a current pickup count or honest unavailable warning. Confirm. The recap transition plays once; unavailable sales coverage is explicit. Setup and Market, POS, pickups, orders and finance links remain reachable under their grants. The manager still has an independent Finish action.
5. As manager, use Finish market at `http://localhost:4322/market/day/76#closing`. Confirm unresolved assistance, outstanding fees and attendance warnings without treating them as blockers. Check confirmed participation separately from check-ins. Review cash collections and balances with currency/method labels and the comparable date's available operational values. The vendor's completion is unchanged.
6. Refresh Closing and choose View recap. Animation must not replay. Reopen one role using the confirmation, then finish again. The other role remains finished, and backend history/revisions persist. In two tabs, keep an older confirmation open while the other completes/reopens: the older revision must be rejected, with recovery through cancel and refresh.
7. After Finish, deliberately record USD 5.00 cash against dedicated invoice 72, or make an authorized invoice adjustment through its existing detail workflow. Refresh/view the manager recap: cash and balance reflect that change. No completion revision changes just from reading the recap. Resolve the remaining assistance request after Finish. Refund and pickup continuation are covered by the real API qualification; manual pickup requires an actual eligible order, and a refund requires an actual refundable test purchase.
8. As vendor open `http://localhost:4322/vendor/day/77#closing`. There is no assistance recipient, manager check-in, booth requirement or manager Finish record. Finish, view the owner-scoped recap, revisit and reopen. Another vendor or manager entering this ID must be denied.
9. Test read failure after successful Finish: block the recap request manually using your own development tools. Finished state stays saved and Refresh records retries only the recap. Restore connectivity and retry. Focus reads and visible 30-second polling should surface the other session's request changes; hidden/Setup views should not poll.
10. Manually check keyboard focus, dialog busy state, phone/tablet/desktop layout, field/table presentation against Orders/Documents/Settings and reduced motion. New label/value rows explicitly center both cells and reset component `dd` margins. No automated browser or screenshot check was performed.

## Focused verification

- Backend `npm run test:market-day` passed against its guarded disposable database. Covers concurrent duplicate requests, changed-payload rejection, vendor isolation, wrong-market rejection, manager resolution actor/time, independent vendor/manager completion and reopen, retry history, stale revisions, pre-start/cancelled guards, private ownership and no invented manager record. Snapshots establish no attendance/session/scheduling mutation from Finish. Real split-vendor and guest purchases verify distinct purchase counts and net merchandise aggregation; an unattributed direct sale is excluded. A real fulfilled unit and settled refund remain authorized after Finish and change recap totals. Canonical invoice adjustment and cash payment remain authorized after manager Finish. Billing revocation yields unavailable data. Missing private sales and incomparable previous dates produce no fabricated zero/comparison.
- Frontend `npx vitest run tests/market-day-actions.test.tsx tests/market-day.test.tsx --reporter=default`: 17 tests passed. Covers request retry key/double-click, manager search/detail resolution, finish warnings/confirmation, saved completion on recap failure, read-only recap retry, revisiting without animation, reopen revisions, stale confirmation snapshot on focus, private/ineligible controls, failed reads and free phase navigation. Existing Phase C pickup/check-in/navigation tests remain included.
- Backend `npx tsc --noEmit --pretty false` passed. `npx vendure build server` passed. The required ordinary `npm run build` was attempted; its dashboard stage is blocked by the existing `APP_ENV_EXPLICIT_MODE_REQUIRED` configuration policy. No policy or unrelated dashboard configuration was changed.
- Focused frontend ESLint passed. Formatting and whitespace checks cover touched feature sources. The focused web typecheck remains blocked by pre-existing `LoyaltyDashboard.tsx:465-466` and `packages/ui/src/table-navigation.ts:29`; no feature diagnostics remain.
- Persistent migration and fixture commands succeeded; fixture rerun preserved IDs and invoice balances. Successful disposable runs clean up their own database. Failed qualification attempts were retained by the existing safety harness for inspection; none targeted the persistent dataset.

## Deferred capabilities and limits

No new/returning customer engine, external POS reconciliation, profit calculation, shopper count, equipment handoff/return proof, notifications/dispatch/chat, customer storefront mode, push infrastructure or unrelated redesign. No captured-purchase coverage is inferred from attendance or participation. Private manual sales coverage is intentionally empty until actual transactions exist. Anonymous POS is supported by the identity-independent financial query but was not separately exercised as a new POS end-to-end scenario in this qualification; guest and unattributed purchases were exercised.

The queue uses occurrence-scoped reads with client search/pagination and a per-vendor request limit, rather than a new global queue/indexing service. Recap readers aggregate existing canonical records directly and may become expensive for exceptionally large occurrences; no new analytics pipeline was introduced. Visual QA, reduced-motion preference verification and the manual multi-session flows remain for the user. Existing generic typecheck/dashboard-build blockers are reported above and were not repaired.
