# Platform notifications and dashboard compliance, Phase 2B

Phase 3 adds another source adapter to this same outbox/consumer for agreement requests, revisions, explicit acknowledgments and opt-in upcoming-date warnings. The existing Settings form owns all preferences and delivery remains console-only. The manual reminder check also evaluates upcoming readiness and now requires the Phase 3 migration. See [Phase 3 implementation and verification](DOCUMENTS_COMPLIANCE_PHASE_3.md).

Implemented locally on October 15, 2026, in the frontend and explicitly authorized sibling backend. Delivery is structured backend console output. No external notification was delivered and no protected development database was reset or migrated by this work.

## Architecture

`platform-notifications` is a domain-independent Vendure plugin. It reuses Platform Identity's `platform_outbox_record`, transaction-aware repositories, `DurableWorkService.consume`, consumer receipts, tenant access policy, and Vendure's existing database-backed scheduler. There is no additional broker, infrastructure dependency or user/tenant model.

Business services publish version 1 events inside their existing transactions through `publishPlatformEvent`. A deterministic event UUID represents the namespaced event type and logical operation key. `INSERT ... ON CONFLICT DO NOTHING` handles repeated publication. There is no logger or provider call in publication.

Sources register supported event types, allowed preference scopes and a recipient resolver. The Documents adapter owns document relationships and access rules. The shared consumer owns preferences, durable recipient delivery records, retries and console output. Future domains can supply another source adapter without modifying Documents or introducing another delivery pipeline.

The existing Communications plugin targets customer purchases/marketing through its own consent, contact, batching and provider contracts. Phase 2B does not route document events through that email/SMS pipeline or change its behavior. Both use the existing platform outbox. Only the new console consumer subscribes to the document events below.

## Events and recipients

| Stable event                    | Intended scope                       | Authoritative source                                                                              |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `documents.request.created`     | Vendor business                      | Newly inserted manual or automatic assignment                                                     |
| `documents.submission.created`  | Relevant Market                      | Explicit sharing that creates a Pending review submission                                         |
| `documents.submission.approved` | Vendor business                      | Manager approval or automatic approval on explicit sharing when review is unnecessary             |
| `documents.submission.rejected` | Vendor business                      | Manager rejection                                                                                 |
| `documents.requirement.waived`  | Vendor business                      | Transition to Waived                                                                              |
| `documents.expiring`            | Vendor business or authorized Market | Daily/manual reminder check                                                                       |
| `documents.expired`             | Vendor business or authorized Market | Daily/manual reminder check                                                                       |
| `documents.request.overdue`     | Relevant Market                      | Daily/manual due-date check                                                                       |
| `documents.compliance.changed`  | Relevant Market                      | Assignment, submission, changed review/waiver, deletion or revocation affecting a current request |

Events contain safe resource UUIDs, numeric Vendor/Market identifiers and, where applicable, pinned submission/file identifiers, revision, manually entered expiration date and reminder threshold. They contain no uploaded bytes, document names, rejection/waiver explanations, user contacts, private URLs, storage object keys, credentials or encryption material. Console serialization uses an explicit diagnostic-field allowlist and omits file IDs and expiration metadata.

Recipient identity is business/Market scope, rather than a copied list of personal accounts. This phase therefore makes no claim of delivery to an individual manager or employee.

## Preferences and authority

Open **Settings** in the existing Vendor or Market workspace. The notification preferences form appears alongside existing settings, using labeled shared Checkbox controls and a shared Button. Independent event choices are presented only for that scope. Three optional reminder checkboxes support 30, 14 and 7 days. Expired notifications have an independent setting. The form explicitly identifies backend-console testing and explains that preferences do not control requirements or acceptance.

No preference row means all event types are off, with supported reminder choices initially 30/14/7. The migration inserts no preferences, events, historical assignments or deliveries. Enabling a type records its activation timestamp. Earlier business events remain suppressed; changing settings does not replay previously consumed events. Disabling and re-enabling starts a new eligibility time, while existing event/reminder deduplication keys remain intact.

Preference reads and writes derive scope from the authenticated current Channel. No client-supplied business ID or role selects another tenant. Market writes require active Market management membership, native Administrator identity and the current `ManageOwnMarketMemberships` grant. Vendor writes use existing active owner membership and current `ManageOwnStorefront` authority; authorized staff may read. Current grants are reloaded, including within the write transaction. Optimistic revision conflicts require refresh before saving. A Market manager's other Markets have independent rows.

## Transaction safety, deduplication and retries

The business transaction and its outbox insert commit together. The consumer uses a separate context/transaction and cannot see uncommitted facts. Rolled-back document/application operations leave no successful notification. Console failures occur in delivery processing and cannot undo a completed document operation.

The consumer receipt is unique per consumer/event and commits with recipient delivery insertion. Delivery identity is unique per event, recipient scope and channel. Workers select at most 100 events and 100 pending deliveries per sweep; row locks and `SKIP LOCKED` serialize competing delivery workers. Enabled settings and source authorization are checked again before output. Preference and document/grant read locks serialize those checks with changes.

The console consumer retries output failures after one minute, up to ten attempts, then retains a `failed` delivery for operator investigation. Failed business-event consumption remains eligible for a subsequent sweep. Logs expose a sanitized retry outcome without exception payloads. Operators can inspect `platform_notification_delivery` states and `platform_consumer_receipt` using existing local database tools. Routine testing needs only Settings, Documents and the manual command.

Delivery is **at least once**, not exactly once. A process failure after a log write but before the delivery transaction commits can cause repeated output. Event IDs allow operators to recognize that crash window. A normal repeated check, synchronization, retry or account switch does not create another logical delivery. A published fact that is superseded, inaccessible or disabled before consumption is suppressed rather than replayed later.

The generic outbox's dispatch state remains owned by its existing transport contract. Notification completion is represented by this consumer's receipt and delivery state, independently of other outbox consumers.

## Expiration and overdue scheduling

The existing worker scheduler runs `documents-expiration-reminders` daily at 06:00 in the worker process's local timezone. Recipient date calculations independently use each Market's IANA timezone and `DOCUMENT_VENDOR_TIMEZONE` for Vendor libraries. The default Vendor timezone remains America/Chicago. No dashboard needs to be open. The daily task has a ten-minute timeout; the existing scheduler prevents overlapping executions. Operators can configure the registered Vendure task through the existing scheduler configuration if a different daily execution time is needed.

`platform-notifications-console` runs every minute. In normal server/worker development, structured notification messages appear in the **worker terminal**. In the disposable Documents demo, the scheduler is deliberately enabled on its API server and Info logging is enabled, so messages appear in the **demo backend terminal**. The manual check also drains pending notification work and prints messages in the **manual-command terminal**. Frontend development terminals and the browser console are not notification delivery transports.

Dates remain manually entered. A document remains valid throughout its local expiration day. The expired event becomes eligible the next local day, matching Phase 1 calculations. The nearest configured warning threshold is selected: a missed 30-day run at 13 days remaining produces the 14-day warning, not a backlog of warnings. With only 30 enabled, 13 remaining can still produce that one 30-day logical reminder. A repeated daily run does not repeat it.

Expired/due reminders catch up within seven days. Newly enabled expired/overdue settings consider dates no earlier than the previous local day, avoiding an old migration backlog. No Expiration records are excluded. Date-range indexes and 200-record keyset pages bound reminder work in memory. Query ranges include timezone boundary slack; Temporal performs the final recipient-local calculation. Delayed expiring reminders are rechecked against the currently applicable threshold before output.

Vendor reminder identity includes document, latest Available file, expiration date and threshold. Editing the expiration date makes a new date eligible; changing only a title or notes does not repeat a reminder. Returning to a previously reminded date/file combination preserves its deduplication record. A new Available file version creates a new identity. Market reminders use the actual current pinned submission/file and its immutable metadata. A Vendor metadata edit does not rewrite a Market's earlier pinned date; the Vendor must explicitly share a new submission.

Market candidates require an active Market/Vendor relationship, active requirement, latest submission for that request, Available pinned file, undeleted document and active sharing grant. Waived, rejected, superseded, revoked and deleted submission candidates are excluded from expiration delivery. Vendor-private documents can alert their own Vendor but cannot alert an unshared Market. Each Market evaluates its own pinned date, timezone and independent review. Overdue requests are checked against current outstanding status before delivery.

## Database and APIs

Backend migration: `src/migrations/1792200000000-PlatformNotifications.ts`, additive and forward-only like the existing document history migrations.

- `platform_notification_preference`: existing Vendor/Market foreign keys, exclusive recipient scope, enabled flags, activation timestamps, supported thresholds and optimistic revision.
- `platform_notification_delivery`: existing outbox event foreign key, unique event/recipient/channel identity, processing state, attempt count and timestamps. `console` is the only allowed active channel.
- Indexes cover preference scopes, pending deliveries, outbox event types, document/submission expiration candidates and due dates.

Synchronization stays disabled. The normal backend's existing guarded migration runner discovers the migration. Tests migrate only their owned `vendure_test_*` databases. Review the configured database before starting the normal backend; do not use baseline adoption or reset a protected dataset just to test notifications.

Protected Admin API operations:

```graphql
query {
  ownNotificationPreferences
}
mutation Save($input: JSON!) {
  setOwnNotificationPreferences(input: $input)
}
query Summary($vendorIds: [Int!]) {
  ownComplianceSummary(vendorIds: $vendorIds)
}
```

Save input contains `expectedRevision`, `enabled` and `thresholds`. Unknown event choices, invalid thresholds, stale revisions and unauthorized current contexts are rejected. Summary accepts at most 50 numeric Vendor IDs for a visible table batch; these IDs filter data only after tenant authorization. No Market/Vendor preference IDs or recipient labels are accepted as authority. No Shop notification API, inbox API or unauthenticated reminder endpoint was added. Named operations and generated frontend types follow the existing schema extraction/codegen workflow.

## Dashboard integration and UI reuse

Market Overview shows Vendors Ready/Incomplete, Pending review, Expired and Expiring Soon shared requests. Vendor relationship tables and verified Vendor Directory entries have readiness badges with links to the existing scoped Documents workspace. The Directory requests one batch for up to 50 linked Vendors; additional/unavailable badges explicitly say Incomplete view. External/unverified directory businesses do not get an invented readiness result. Application acceptance and conditional acceptance are unchanged.

Vendor Overview shows outstanding required requests, pending reviews, rejections and saved-library expiration counts, plus a compact list of up to five Markets with independent readiness. Contextual links open Market requests, a particular Market, or the saved library. Limited Market lists are identified; aggregate counts still cover all eligible requests. Dashboard data does not depend on notification preferences.

Summary queries load only metadata projections and aggregate counts. Application readiness and dashboards share the server-side status projection and readiness-status function. Market-wide aggregate counts are complete for the authorized scope; the badge query is bounded to the requested page. There are no per-row API calls, file downloads or review-history loads. Existing Documents workspace pagination/500-request limits remain explicit and do not become an assertion that omitted records are Ready.

Reused UI: DashboardFrame/AdminShell, Card, KPI-01 classes, DataTable, Button/RouteLink, Checkbox, Alert, Spinner/read states, existing document Tabs and `DocumentStatus` with `@market/ui/document-status`. Ready is success, Pending review/Expiring Soon warning, Incomplete/Missing/Expired/Rejected danger, Waived/No requirements neutral. Labels remain readable. No dropdown, primitive, UI library or new shared design category was introduced. `NotificationPreferences` and `ComplianceOverview` are feature compositions because existing components provide primitives but do not supply notification configuration or compliance data controllers. Root UI approvals remain unchanged.

Account switching, central login, file encryption, ClamAV fail-closed validation, explicit grants, independent reviews and immutable audit history retain their existing authority boundaries. Replaced account views cancel stale reads and are keyed by workspace identity. No notification is generated by frontend button clicks alone.

## Local setup and demo

From `E:\coding\farmers-market-platform-web`, keep the existing ignored account/environment configuration described in the Phase 2A guide. In separate terminals:

```powershell
# Backend demo, local scanner and an owned temporary database
npm run documents:scanner:health
npm run demo:documents

# Admin
npm run demo:market-operations:admin

# Storefront, when testing public application flows
npm run demo:market-operations:storefront
```

The demo prints its database name and application URLs. Use the new URLs each session. All synthetic accounts use `local-identity-regression-only-password`:

| Account                            | Scope             |
| ---------------------------------- | ----------------- |
| `identity-owner-0@test.invalid`    | Vendor A          |
| `identity-owner-1@test.invalid`    | Vendor B          |
| `documents-owner-c@test.invalid`   | Vendor C          |
| `documents-applicant@test.invalid` | Applicant Orchard |
| `market-a@test.invalid`            | Market A          |
| `market-b@test.invalid`            | Market B          |

Existing accounts and application fixtures are preserved. The suite adds clearly synthetic request/review and no-expiration fixtures. Preferences are reset to off after fixture checks. The demo then creates fresh saved documents dated 30, 14 and 7 days ahead, yesterday, and 15 days ahead. These are eligible for initial console output after enabling the corresponding preferences. Use the normal upload/metadata dialog to adjust dates or share them with a Market. No database edits are needed.

Run an immediate reminder check in another frontend terminal:

```powershell
npm run notifications:check -- vendure_test_documents_<name printed by this demo>
```

Replace the entire example database name with the printed name. The command refuses protected, remote, non-owned or unmigrated databases. It does not create/drop databases, run migrations, access document bytes or enable providers. It uses the default local PostgreSQL connection settings and America/Chicago Vendor timezone of this disposable demo. Repeat it to verify deduplication. Normal server/worker scheduling uses configured business/Market timezones.

If existing services occupy the defaults, preserve them. The disposable backend supports `DOCUMENTS_DEMO_API_PORT` and `DOCUMENTS_DEMO_ADMIN_PORT`. Browser verification for this change used API 3100 and Admin 4522, with `PUBLIC_ADMIN_API_URL=http://localhost:3100/admin-api` in a separate local Vite process. The standard demo remains 3000/4322. Port availability is checked before a demo database is created. These test port overrides do not modify central login or switching code.

## Manual acceptance scenarios

1. Sign in as Market A. Open Settings, enable New submissions awaiting review, leave expiration off, and save. Sign in as Market B in a separate browser session and confirm its independent choices.
2. As Vendor A, enable New document requests. As Market A, assign a new selected-Vendor requirement. Observe `documents.request.created` in the backend console within a minute, or run the manual check. Disable that Vendor preference and assign a different requirement: the request exists without a console delivery.
3. Share an Available saved document explicitly. The Market submission event appears only after commit. Approve, reject another submission with a reason, and waive a requirement. Enable the corresponding Vendor types to observe their console events; repeat with the settings off.
4. Enable expiration preferences and selected thresholds for the Vendor and relevant Market. Use manually dated fixtures, run `notifications:check`, and repeat. Check No Expiration, the inclusive expiration day, a changed date, replacement file, grant revocation, and separate Market shares. Revoked/deleted/superseded resources must not produce new Market warnings.
5. Open both Overviews. Compare the counts to Documents, click scoped request/readiness links, and distinguish the Markets' independent outcomes. Acceptance remains accepted even with Incomplete documents. Repeat after switching workspaces.
6. Use keyboard Tab/Space to change preferences and submit. At mobile widths, check all controls, table navigation and readable semantic labels. No notification bell, inbox, provider delivery or browser popup is part of this feature.

## Automated verification and actual results

Executed locally October 15, 2026:

- Backend real ClamAV suite: **54 checks passed**, including clean PDF/EICAR, applicant scanning and all Phase 2B preference, event, rollback, expiration, concurrency, HTTP API, security and summary checks. Successful disposable database dropped.
- Mock-scanner suite: **56 checks passed**, including scanner failure, quarantine and all Phase 2B checks. Successful disposable database dropped. Failed diagnostic runs initially retained their generated disposable databases; these task-owned databases and the temporary demo were removed after verifying ownership and no active connections at the end of verification.
- Existing Market Operations regression: **21 passed**, successful disposable database dropped.
- Frontend regression and new feature tests: **123 passed** across seven files.
- TypeScript checks for backend source, Documents tests and the manual CLI passed. Frontend TypeScript/Astro checked 84 files with zero errors/warnings/hints. Targeted ESLint and all nine workspace boundaries passed.
- Synthetic production-profile storefront, Admin, backend dashboard, server and worker builds passed. The existing large-chunk advisory remains.
- Manual reminder CLI completed against the owned disposable demo: no candidates while preferences were disabled, then a sanitized `documents.expiring` console record after enabling Vendor preferences. Repeating the command reported `selected: 9, published: 0` and produced no duplicate notification record.
- Targeted formatting checks, both repositories' diff whitespace checks, the nine-workspace boundary check and the production artifact marker check (112 files) passed.
- Chromium browser checks: **4 passed** at 390px and 1280px, including preference saves, keyboard controls, dashboard data and compliance links, with zero scoped Axe violations and no page overflow. Screenshot review also corrected checkbox spacing and reduced the Vendor Market summary to two readable columns. The Vendor relationship table uses the existing accessible wide-table variant for its control-bearing columns.

Commands from the frontend root:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npm run test:documents
npm run test:documents:live
npm test -- tests/notifications.test.tsx tests/documents.test.tsx tests/market-application.test.tsx tests/market-operations.test.tsx tests/admin.test.tsx tests/vendor.test.tsx tests/ui-foundations.test.tsx
npm run typecheck
npm run build:production-local

# With the disposable demo and Admin running
$env:NOTIFICATIONS_DEMO='1'
npm run test:e2e:notifications
```

For a separate Admin test port, set `NOTIFICATIONS_ADMIN_ORIGIN=http://localhost:4522`. Screenshots are ignored local artifacts under `.runtime/notifications-ui`. The existing Phase 2A public-application browser suite remains available through `playwright.documents.config.ts`; its original URLs/ports must point at its matching demo, not an unrelated existing backend.

The installed pg driver emits an existing concurrent-query deprecation advisory. Intentionally denied multipart and invalid-input tests emit expected safe errors. Neither indicates delivery to an external provider.

## Limitations and future delivery channels

Console output has no personal contact resolution, email/SMS/push transport, inbox, bell or browser popup. Customer preferences and unrelated business-event notifications are deferred. This phase does not approve or alter attendance, acceptance, payments, storage, scanning or document policies.

Before production use, operators need a deliberate retention policy for outbox/receipt/delivery history, monitoring for failed/lagging work, and an operational replay policy for terminal failures. No automatic deletion of audit/deduplication history was added. The 100-item sweep bounds and daily job timeout should be reviewed against actual tenant volumes. Directory badge batching and the existing Documents workspace limits are explicit, not full pagination migrations.

A future transport should consume the same committed versioned facts and resolved recipient scope. Add its delivery adapter and channel-specific consent/contact validation, extend the delivery-channel constraint and preferences through a reviewed migration, and preserve safe serialization/idempotency. Existing customer provider contracts can be reused where suitable after their authority/consent requirements are established. Do not turn on provider credentials or route console records to email as an implicit follow-up.

## Local file inventory for Phase 2B

Earlier uncommitted Phase 1/2A files were preserved. Paths below are relative to the named repository.

| Repository                         | Created or extended for this phase                                                                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend foundation                 | `src/plugins/platform-notifications/{events,preferences,service,api,platform-notifications.plugin}.ts`                                                                                                                       |
| Backend migration                  | `src/migrations/1792200000000-PlatformNotifications.ts`                                                                                                                                                                      |
| Backend Documents                  | `src/plugins/documents-compliance/{options,notifications,summary,workflow,service,api,documents-compliance.plugin}.ts`                                                                                                       |
| Backend registration/tooling/tests | `src/vendure-config.ts`; `scripts/documents/notifications.ts`; `test/documents-compliance/{notifications,run}.ts`; `test/market-operations/harness.ts`; `package.json`                                                       |
| Frontend settings/summary          | `apps/admin/src/notifications/NotificationPreferences.tsx`; `apps/admin/src/documents/{ComplianceOverview,DocumentsWorkspace}.tsx`                                                                                           |
| Frontend integration               | `apps/admin/src/AdminShell.tsx`; `apps/admin/src/vendor/{overview,service}.tsx/ts`; `apps/admin/src/market/{MarketRoutes,overview,vendors,service}.tsx/ts`; `apps/admin/src/market/phase14/{Directory,OperationsRoutes}.tsx` |
| Frontend API                       | `packages/api/operations/notifications.graphql`; `packages/api/src/{notifications,errors,index}.ts`; generated Admin types and refreshed schema/provenance                                                                   |
| Frontend tooling/tests             | `codegen.ts`; `scripts/{documents,extract-schema}.ts`; `package.json`; `playwright.config.ts`; `playwright.notifications.config.ts`; `tests/notifications.test.tsx`; `tests/e2e/notifications-live.spec.ts`                  |
| Guidance                           | This guide and links from `DOCUMENTS_AND_COMPLIANCE.md` and `DOCUMENTS_PHASE_2A_APPLICATION_INTEGRATION.md`                                                                                                                  |
