# Advanced Vendor Applications Phase D

October 29, 2026. Local implementation in the web and backend repositories. Existing Phase A, B and C work and other working-tree changes were preserved. No deployment, push, remote branch or pull request was created. No browser, screenshot or browser automation was used.

## Implementation summary

Market Managers can search and filter submitted applications using a database-backed list, open a submission on demand, inspect the immutable original answers and existing information-request history, review requested dates and rentals, and follow the established post-acceptance workflows. Accepted Vendors see the same read-only onboarding progress with destinations authorized for their own business.

The application table contains only business name and status. Its shared DataTable interaction opens the existing review dialog using keyboard or pointer input. Search accepts business name, contact name and email. Filters cover status, template, the submitted primary category and requested date. Sort choices are newest, oldest and business name. Reset clears filters and returns to the first page. Search is debounced by 300 ms. Each page contains 20 records. Filters keep their options while another page loads; old result rows are hidden by the loading state.

Review includes the application/template name, contact details, submission timestamp, status, category, applicant identity, verified linked Vendor where present, document readiness, Phase B requests and responses, original answers, dates and rentals, private notes and chronological application history. Acceptance stays open and reloads the accepted application's onboarding summary. Other successful application decisions return to the list. Failed decisions remain open.

## Frontend and backend files

Paths below are relative to the named repository and describe Phase D work only.

| Repository | Files                                                                                                                                         | Changes                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Web        | `apps/admin/src/market/phase14/ApplicationSubmissions.tsx`                                                                                    | Scoped list/detail query controller, compact controls, shared table, pagination and review dialog |
| Web        | `apps/admin/src/market/phase14/Applications.tsx`, `OperationsRoutes.tsx`                                                                      | Preserve template editor; use the list controller and lightweight application context             |
| Web        | `apps/admin/src/market/phase14/ApplicationReview.tsx`                                                                                         | Organized details, rentals, history, notes explanation, directory label and onboarding            |
| Web        | `packages/ui/src/ApplicationOnboarding.tsx`, `ApplicantApplications.tsx`, `index.tsx`                                                         | Shared read-only onboarding presentation and Vendor detail integration                            |
| Web        | `packages/api/src/market-operations.ts`, `applicant-applications.ts`, `operations/market-operations.graphql`                                  | List/detail input and response contracts and onboarding/history types                             |
| Web        | `packages/api/schema/admin.graphql`, `schema/provenance.json`, `src/generated/admin.ts`                                                       | Source-extracted schema and generated operation update                                            |
| Web        | `scripts/demo-market-operations.ts`, `package.json`                                                                                           | Guarded Phase D fixture entry point                                                               |
| Web        | `tests/application-phase-d.test.tsx`, `tests/fixtures/application-review-api.ts`, `tests/market-dashboard.test.tsx`, `tests/phase15.test.tsx` | Focused tests and adaptations for on-demand details                                               |
| Backend    | `src/plugins/market-operations/application-review.ts`                                                                                         | Market-scoped paging, safe chronological history and actual-record onboarding projection          |
| Backend    | `src/plugins/market-operations/service.ts`, `api.ts`                                                                                          | Optional JSON read modes and authorized selected-record detail projection                         |
| Backend    | `src/plugins/market-operations/applicant.service.ts`                                                                                          | Owner-authorized Vendor onboarding and sanitized history                                          |
| Backend    | `scripts/market-operations-demo/phase-d-fixture.ts`, `run.ts`, `package.json`                                                                 | Dedicated non-destructive fixture provisioning                                                    |
| Backend    | `test/market-operations/application-phase-d.ts`                                                                                               | Focused disposable-database integration checks                                                    |

ApplicationSubmissions is a feature query controller because the existing template editor and bounded in-memory submission branch cannot provide server pagination or independent selected-record loading. ApplicationOnboarding is a read-only feature composition because the existing membership, participation, documents and assignment screens each own a different workflow. Neither adds a UI primitive or authority. Both reuse the shared dashboard shell, DataTable, query hook, dialog, Button, Field/Input, SelectField, Pagination, Card, Badge and loading/error/empty states. No CSS system, library or component-category approval was introduced.

## Filtering, pagination and history decisions

The existing `ownMarketOperations` query accepts an optional `input` with three application-only modes:

- `CONTEXT` preserves existing editor/supporting context but omits submissions and their expensive per-record projections.
- `PAGE` queries the whole selected market's submitted application set. It excludes draft rows, applies all predicates before counting/paging and returns only ID, business name and status for each row. Search uses escaped, bound case-insensitive substrings, including the combined contact name. Template filtering resolves the submission's original version to its template. Category comes from the immutable submitted applicant projection. Date filtering uses the requested occurrence IDs.
- `DETAIL` rechecks current market/application permission and loads only the selected submission and its related requests, snapshot, history, dates, approvals, eligible directory choices and permitted assignment context. Requested dates are read directly and are not limited by the old occurrence selector's 100-row bound.

Page size is validated between 1 and 100; the UI uses 20. All sort orders use the record ID as a deterministic tie breaker. Newest uses submission timestamp descending and ID descending; oldest uses both ascending; business sorting uses the lowercase submitted business name and ID ascending. Counts and rows use the same market and filter predicates. This is ordinary offset pagination: concurrent new submissions or decisions can move page boundaries on the next refresh. It does not promise a frozen multi-request snapshot. No filtering is performed over the old capped frontend collection.

Template/category/date options are market scoped and independently read across the submitted record set, so a later page is not needed to discover a filter value. Existing market/status indexes are retained. No unmeasured index migration or new database column was required. More specialized search/order indexes can be considered if real production query plans justify them.

History begins with original submission and includes the existing explicit application-status, withdrawal, information-request, submitted-response, resolution/cancellation and requested-date audit events. It orders by timestamp and audit ID. Generic command-result audits are deliberately omitted to avoid duplicate decisions and raw payload exposure. Saved private amendment drafts are not application timeline events. Manager history may show actor IDs where recorded. Applicant history returns only event, time, status and relevant date reference, with no manager note, reason, actor identity or raw audit payload. Private notes and the original audits remain stored separately. Original question rendering still uses the submission's immutable definition snapshot and Phase C visibility behavior.

## Post-acceptance architecture and protections

No new approval engine or automatic operation is introduced. The summary reads current records independently:

| Step                   | Evidence used                                                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Acceptance             | The selected application has status ACCEPTED                                                                                                                                                                                                                       |
| Membership and consent | The current directory association is LINK_VERIFIED, its Vendor matches the authorized applicant business where applicable, and the market membership is approved with VERIFIED consent, consent actor and timestamp                                                |
| Participation          | Confirmed canonical participation for the verified Vendor's membership and requested dates; external businesses instead show the selected application's independent operational confirmations                                                                      |
| Documents              | The existing compliance readiness projection. Missing, rejected, expired or pending required documents do not become approved through acceptance. Unknown/incomplete views remain unavailable; no requirements is not applicable. Readiness is explicitly advisory |
| Booths and rentals     | Active assignments for the accepted directory business and requested dates, with the current verified Vendor identity where applicable, plus actual rental allocations meeting the requested quantities                                                            |

External directory records do not become Vendor accounts. Their membership step is not applicable and explains the need to establish and verify platform identity. Managers can still follow the existing directory, operational-date and assignment workflows. An unrelated Vendor cannot inherit another business's onboarding through a name/email match, claim or changed directory association.

Links use current actor permissions and selected channel. Vendor relationship detail URLs use membership IDs, as required by the existing route. A missing membership links to the existing Vendor Markets request screen and provides the market reference. Manager membership/participation links target their existing workflows; assignment links target a requested date. Vendor-only links are absent for external directory businesses. No API operation is initiated merely by rendering or opening a link. Existing endpoints continue to enforce owner consent, manager capabilities, canonical participation, assignment compatibility and billing obligations.

The renamed Existing Market Business selector retains its eligibility rules and explicit backend identity verification. Its options distinguish external directory records from verified platform Vendors. It never matches or associates records automatically. The guidance explains when an existing directory record can be reused.

Private Manager Notes are explicitly applicant-invisible. Accepted/declined/withdrawn restrictions remain unchanged, including the refusal to accept an already accepted application just to edit notes. Withdrawing acceptance still requires the established date/obligation checks. No new Customer application-management route, notification type, document approval control, fee, billing workflow, scoring, quota, waitlist promotion or automatic assignment was added.

## Development database and dedicated fixtures

The guarded inspect command verified local `vendure_demo_market_ops`, with no pending migrations. Phase D introduces no migration. The dedicated fixture creation succeeded without applying migrations. Actual IDs are recorded below.

Fixture creation was initially rejected by automatic approval review because attachment authorization was not accepted. The user then directly confirmed: "Yes, create the dedicated Phase D fixtures." The guarded command is authorized only for these dedicated records and retains the existing dataset.

The fixture script verifies both configured and actual database name and a loopback server address. The existing runner rejects pending migrations, blocks external provider traffic and never resets, drops, truncates or reseeds this database. Market/account/Vendor identities have dedicated `phase-d-` provisioning keys. Existing records, manual decisions, template publications and relationship states are preserved on rerun. Missing dedicated records are created through the normal services. Reserved fictional phone verification follows the existing local fixture-account convention; Vendor ownership, market consent, membership approval, canonical participation, date approval, booth/rental allocation and draft invoices use their normal provisioning or domain services. No completed compliance or payment state is fabricated.

Prepared scenarios include 29 applications, two templates, Produce/Crafts/Prepared food categories, two requested dates, resolved submitted amendment history, accepted pending/approved membership, confirmed participation with no booth, an actual booth/rental allocation, and external directory businesses. A spare booth supports the manual assignment test. The assignment service may create its ordinary draft invoice; no payment is made. A dedicated required insurance item remains outstanding for the platform Vendors.

Creation and an idempotent rerun succeeded. Both returned the same market, channels, templates, dates and application IDs. The rerun read each primary scenario through the actual manager detail projection. It confirmed pending membership for application 22; approved membership without participation for 23; confirmed participation without a booth for 24; complete booth/rental allocation for 25; four amendment-history events for 26; and external identity without membership for 27. Insurance remains Action needed for all four accepted platform scenarios.

Market: **Phase D Applications Test Market**, market ID **10**, market channel **42**, timezone **America/Chicago**. Dates: **17** on June 5, 2027, and **18** on June 12, 2027, both 9 AM to 2 PM market time. Template **10** is Phase D Seasonal Growers; template **11** is Phase D Artisan Stalls.

All seven dedicated accounts use password **`PhaseD-Local-Only!2026`**. These are local test credentials.

| Account                              | Vendor ID      | Channel | Exact starting page                                                                                      |
| ------------------------------------ | -------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `phase-d.manager@example.test`       | Not applicable | 42      | [Manager submissions](http://localhost:4322/market/application-submissions?channel=42&account=1)         |
| `phase-d.pending@example.test`       | 32             | 43      | [Pending Vendor application 22](http://localhost:4322/vendor/applications/22?channel=43&account=1)       |
| `phase-d.approved@example.test`      | 33             | 44      | [Approved Vendor application 23](http://localhost:4322/vendor/applications/23?channel=44&account=1)      |
| `phase-d.participating@example.test` | 34             | 45      | [Participating Vendor application 24](http://localhost:4322/vendor/applications/24?channel=45&account=1) |
| `phase-d.booth@example.test`         | 35             | 46      | [Assigned Vendor application 25](http://localhost:4322/vendor/applications/25?channel=46&account=1)      |
| `phase-d.amendment@example.test`     | 36             | 47      | [Amendment application 26](http://localhost:4322/vendor/applications/26?channel=47&account=1)            |
| `phase-d.isolation@example.test`     | 37             | 48      | [Isolation Vendor applications](http://localhost:4322/vendor/applications?channel=48&account=1)          |

| Scenario                                                 | Application ID | Directory ID | Membership ID | Manager review                                                                             |
| -------------------------------------------------------- | -------------- | ------------ | ------------- | ------------------------------------------------------------------------------------------ |
| Accepted, membership pending                             | 22             | 23           | 26            | [Review 22](http://localhost:4322/market/application-submissions?channel=42&submission=22) |
| Accepted, approved verified membership, no participation | 23             | 24           | 27            | [Review 23](http://localhost:4322/market/application-submissions?channel=42&submission=23) |
| Confirmed participation, no booth                        | 24             | 25           | 28            | [Review 24](http://localhost:4322/market/application-submissions?channel=42&submission=24) |
| Assigned D Orchard booth and one folding table           | 25             | 26           | 29            | [Review 25](http://localhost:4322/market/application-submissions?channel=42&submission=25) |
| Resolved amendment, application under review             | 26             | None         | None          | [Review 26](http://localhost:4322/market/application-submissions?channel=42&submission=26) |
| Accepted external Phase D External Honey                 | 27             | 27           | None          | [Review 27](http://localhost:4322/market/application-submissions?channel=42&submission=27) |
| Submitted external reapplication for directory selection | 28             | None         | None          | [Review 28](http://localhost:4322/market/application-submissions?channel=42&submission=28) |

The remaining external application IDs and baseline statuses are:

| Status       | Actual application IDs |
| ------------ | ---------------------- |
| Accepted     | 27, 33, 39, 45         |
| Submitted    | 28, 34, 40, 46         |
| Under review | 29, 35, 41, 47         |
| Waitlisted   | 30, 36, 42, 48         |
| Declined     | 31, 37, 43, 49         |
| Withdrawn    | 32, 38, 44, 50         |

Public Phase D forms: [Seasonal Growers](http://phase-d-applications-local.platform.localhost:4321/apply/ec75d957-786a-4615-a4c3-12bb55b46001) and [Artisan Stalls](http://phase-d-applications-local.platform.localhost:4321/apply/4394f7a0-6a0b-4303-b4ed-2ec36431f907). Manager workflows: [Templates](http://localhost:4322/market/applications?channel=42), [Documents](http://localhost:4322/market/documents?channel=42), [Directory](http://localhost:4322/market/directory?channel=42), and [June 5 assignments](http://localhost:4322/market/assignments/17?channel=42).

To create missing dedicated fixtures safely, from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:inspect
npm run demo:market-operations:phase-d-fixtures
```

Do not reset the database or delete populated records. Rerunning preserves existing submissions and their manual state. If a fixture run is interrupted after creating a submission, inspect it and finish any remaining normal workflow explicitly rather than deleting it or overwriting protected states. The script prints current IDs and credentials on each successful run.

Start/restart the environment in four terminals from the web directory:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

## Focused verification

| Check                                                    | Result                                                                                                                                                                                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend `npm run test:applications:phase-d`              | Seven focused checks passed in a guarded disposable database; successful database removed                                                                                                                                                                       |
| Pagination/isolation checks                              | 2,006 total applications, final page beyond offset 2,000, tied timestamps, narrow row projection, all filter predicates, literal wildcard search, foreign-market and unauthorized Vendor denial                                                                 |
| Detail/history checks                                    | Immutable snapshot, submitted response projection, applicant note/reason privacy, information history, explicit date events                                                                                                                                     |
| Onboarding/authorization checks                          | Independent acceptance, pending membership, verified approval/consent, canonical participation, missing required insurance, booth without rental completion, actual allocation, external identities, missing-permission links and current permission revocation |
| Frontend scoped application tests                        | Passed: 36 tests across five application/editor/review files                                                                                                                                                                                                    |
| Web root `npx tsc --noEmit` and scoped ESLint            | Passed                                                                                                                                                                                                                                                          |
| Backend demo/test TypeScript projects                    | Passed                                                                                                                                                                                                                                                          |
| Admin production build                                   | Passed with existing bundle-size advisory                                                                                                                                                                                                                       |
| Backend `APP_ENV=dev NODE_ENV=development npm run build` | Final dashboard/server/worker rebuild passed                                                                                                                                                                                                                    |
| Guarded fixture run and idempotent rerun                 | Passed: creation, unchanged IDs on rerun and actual manager onboarding projections                                                                                                                                                                              |

Initial local Postgres attempts were blocked by the sandbox and were rerun through approved execution. An intermediate frontend check caught filter options disappearing during a server refresh; retaining the same-market option data while hiding stale table rows fixed it. Lint caught synchronous effect-state updates; the controller now reuses the existing dashboard query hook. No unrelated pre-existing failure was repaired. The existing pg concurrent-query deprecation, demo CSRF configuration warning and Admin bundle-size advisory remain unchanged.

## Manual walkthrough

Use the dedicated Phase D manager and Vendor accounts only. All use `PhaseD-Local-Only!2026`. Use separate browser profiles or sign out between roles. Use the account and application links in the fixture tables above. Tests that change state should be performed after inspecting the prepared baseline scenarios.

### Test A: Application list

Sign in as `phase-d.manager@example.test` at `http://localhost:4322/market/application-submissions?channel=42&account=1`. Expect two columns and 29 initial records over two pages. Search for `External Honey`, `phase-d.external-3@example.test`, and contact `Alex Grower 3`. Filter status, either template, Produce/Crafts/Prepared food, and each June market date. Expect matching server counts, with page reset after a filter change. Exercise all sort orders, Next/Previous and Reset filters. Rows must open their review dialog without visible per-row action buttons.

### Test B: Application details

Open the booth scenario using `?channel=42&submission=25`. Expect contact and template information, original questions and answers, the June 5 requested date with its independent confirmed decision, one folding table requested per date, and the outstanding insurance requirement. Document links lead to the established document workspace. No approval controls are embedded in the reviewer.

### Test C: Information history

Open the amendment scenario. Expect original "Seasonal fruit and herbs", the manager clarification request, submitted "We grow the fruit and herbs ourselves in Boerne.", and the resolved request with its timestamp. The chronological history includes request, submitted response and resolution once each. Original submitted answers remain unchanged. Sign in as `phase-d.amendment@example.test` on that Vendor's channel and open `/vendor/applications/26` to inspect the applicant-visible version.

### Test D: Private notes

On the amendment application while it remains under review, select Under Review, enter a distinctive private note and Save. Reopen it as manager and verify the note persists. Open the same record as `phase-d.amendment@example.test`; expect no private note, private decision reason or manager note input anywhere in the application or history. Accepted/final records do not gain a special note-edit bypass.

### Test E: Existing Market Business

Open the still-submitted external-1 application. Its applicant is another submission from Phase D External Honey, whose external-0 application has an accepted external directory record. Verify the Existing Market Business guidance and the eligible external record option. Selecting it stays local until Save. Close without saving unless intentionally accepting the reapplication. Do not choose or alter another Vendor's identity. A platform-associated pending review must only offer its own verified eligible directory association.

### Test F: Membership onboarding

Inspect the pending scenario as manager and as `phase-d.pending@example.test`. Expect acceptance complete and membership pending review, with participation and booths still requiring action. Follow the existing manager membership link and approve the already owner-requested relationship if testing progression. Separately, after Test C/D, accept the amendment application. Expect membership not started. As its authorized Vendor, use the existing market relationship request screen and supplied market reference to record consent. As manager, approve it. Refresh the application: only then does membership become complete.

### Test G: Participation

Use `phase-d.approved@example.test`. Its membership is initially approved with verified consent and its requested date is not confirmed. Follow the application link to its existing relationship details, then confirm the June 5 participation through the existing occurrence form. Refresh the application in each role. Expect participation complete, booth still missing and required insurance still outstanding. Application acceptance alone must not have confirmed this date.

### Test H: Booth assignment

Inspect `phase-d.participating@example.test` first: participation is confirmed and no booth exists. As manager, follow the assignment link, choose this business and assign the free D Meadow booth with one Phase D folding table. The existing canonical participation, date approval, compatibility and capacity checks must still run. Refresh the application and expect booth/rental completion. The existing booth scenario is the prepared comparison, with D Orchard already assigned and a normal draft invoice. Do not mark any invoice paid.

### Test I: External business

Open external-0, Phase D External Honey. Expect acceptance complete, external directory guidance, membership not applicable, and no Vendor-account-only link. Its requested operational date remains independently pending. Managers can still use the established external date and booth workflows. No membership or platform owner should appear from a matching name or email.

### Test J: Authorization and regression

Sign in as `phase-d.isolation@example.test` on its own Vendor channel. Paste another Phase D Vendor's application detail path while retaining the isolation channel. Expect denial and no answers, private notes or onboarding information. Vendor access to manager submission pages must also be denied. With the authorized amendment Vendor, smoke-test saved drafts, explicit Vendor continuation, immutable answers and information responses. In the dedicated Phase D templates, smoke-test Phase C conditional-question preview and availability by making a new draft through the existing builder, without changing Phase A/B/C fixture templates. Anonymous submission and authorized claiming retain their existing public workflow; use a new Phase D public application, not a Customer management route. Withdrawal remains available before acceptance and must cancel eligible outstanding requests through the established confirmation flow.

## Limitations and deferred work

Desktop/mobile visual review is reserved for the developer. The list uses offset pagination and does not freeze results across concurrent changes. Readiness summarizes required requirements rather than approving documents. Workflow changes made in another page require reopening or refreshing the application; no polling or new notification type was added. The reusable template editor and unrelated operational pages retain their existing collection behavior; this work replaces the application-review list path only. Existing history has no actor display name if only an actor ID was recorded. General identity recovery, file attachments, scoring, fees, quotas, automated promotions/approvals, payments, new notification types and unrelated dashboard redesign remain excluded.
