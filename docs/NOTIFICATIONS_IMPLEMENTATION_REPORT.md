# Notifications implementation report

## Simplification completed locally on 2026-10-17

The active delivery catalog is reduced from **82 to 51 types**, a 38% reduction. All 122 contracts remain: **51 KEEP, 24 DISABLE, 14 COVERED and 33 FUTURE**. Of the formerly integrated types, 24 are disabled and seven are covered by essential types or live reports. Seven other COVERED contracts were already inactive. Active types also have narrower meaningful-transition and recipient criteria, so the reduction in routine generated messages is greater than the type-count reduction alone.

The [full event catalog](NOTIFICATION_EVENT_CATALOG.md) records every exact disabled and retained ID, its authoritative source, receiving context and reason. The [current architecture](IN_PLATFORM_NOTIFICATIONS.md) supersedes historical Phase 1/2 active-delivery descriptions retained below.

## Changes and affected files

| Area                            | Local files changed by this cleanup                                                                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend policy and identity     | `src/plugins/platform-notifications/inbox-delivery-policy.ts`, `inbox-compliance-policy.ts`, `inbox-registry.ts`, `inbox-projector.ts`, `inbox-phase-two-projector.ts`, `inbox-service.ts`, `inbox-contract-reviews.ts` |
| Existing source metadata        | `src/plugins/farmers-market/services/participation.service.ts`, `market.service.ts`; `src/plugins/platform-identity/identity.service.ts`; `src/plugins/documents-compliance/service.ts`                                 |
| Backend integration tests       | `test/platform-inbox/run.ts`, `phase-two.ts`, `providers.ts`; `test/documents-compliance/inbox.ts`, `inbox-operations.ts`, `run.ts`; `test/market-operations/run.ts`                                                    |
| Frontend shared existing UI/API | `packages/api/src/inbox.ts`, `packages/ui/src/notifications.tsx`                                                                                                                                                        |
| Frontend verification and docs  | `tests/inbox.test.tsx`, `scripts/test-inbox.ts`, `scripts/notification-catalog.cjs`; the three notification documents in `docs/`; backend `docs/IN_PLATFORM_NOTIFICATIONS.md` pointer                                   |

Backend paths above are in the explicitly authorized local sibling `E:\coding\farmers-market-platform`. Frontend paths are in `E:\coding\farmers-market-platform-web`. The existing dirty working trees were preserved. No new UI component or primitive was created, so no reusable UI rule or approval registry needed changing.

## What stopped and what remains

Customer discovery notifications for follows, favorites, occurrence announcements, catalog publications and preorders stopped. Vendor self-submission/application receipts, ordinary fulfillment confirmations, new occurrences, stock depletion, preorder windows and successful payouts stopped. Document approval/waiver/approaching-expiration confirmations, generic compliance activity, acknowledgment/publication receipts, ordinary exception activity and restored readiness stopped. Routine Manager membership, booth-assignment and activation confirmations stopped. All exact IDs and covered replacements are listed in the catalog.

Retained essential delivery covers existing purchase lifecycle and meaningful fulfillment changes; payment uncertainty/failure; completed refunds and refund problems; new Vendor orders and cancellations; payment/payout/inventory problems; confirmed Market participation impacts; application decisions and review work; required invoices; document/policy obligations and review; required document access loss; actionable declined link responses; operational generation/billing problems; security/access changes; actionable daily readiness and the day-of checklist.

Application-form submission and a separate explicit membership request remain different workflows. Successful business-link confirmation is quiet; decline requires a Manager correction decision. Routine pending refunds are quiet; `PROVIDER_FAILED` and `RECONCILIATION_REQUIRED` remain financial problems. No financial state machine, provider decision, order invariant or money movement changed.

## Duplicate resolution

The allowlist is checked before sweep selection, in both projection paths, during preference validation and before storage. Disabled types cannot create a record even through direct replay or an existing subscription. The final inbox remains a historical view and does not filter disabled records out.

Required document request, pending review, rejection and expiration each have distinct canonical action intents. There is no submitting-Vendor receipt, routine approval notice or generic compliance companion. Automatic approval does not produce a review-required notice. Current required policy assignments and a new version requiring acknowledgment remain distinct; publication and acknowledgment receipts are silent.

Semantic identity uses intent family, authoritative operation or transition, receiving human, role and business. Shared and library expiry sources resolve to the current required assignment, pinned file and expiration date. Repeated payment observations use the provider operation/outcome. Revocation and deletion of the same current submission share one Manager access-replacement intent. Whole-order terminal notices replace their overlapping quantity notice. Payment deauthorization excludes the overlapping generic capability projection. Existing unique logical keys, receipts, locks and rollback recovery remain; known former logical identities are checked before insertion. Fanout cursor keys include entity/context to retain separate obligations at page boundaries.

An initiating Vendor's significant participation command creates no personal Vendor confirmation, but a separate Manager responsibility still receives attention. A single human can receive a required Vendor request and a Manager review across authorized contexts. Distinct required assignments, purchases, financial problems, security events and businesses are not grouped together.

## Readiness, security and existing data

Daily summaries require actual unresolved required-document/policy/readiness or planned-confirmation items on an eligible upcoming occurrence. All-clear summaries and restored-readiness activity are quiet. Existing Market-local dates, DST, occurrence selection, source counts, once-daily/once-per-occurrence identities and live refresh remain. The live Market Day Checklist is available through Market Operations independently of delivery and subscriptions.

Security notices, membership removal/restoration/access-role changes, required transactional alerts and owner/native permission checks remain. Private rows still disappear from all reads/counts/actions after authorization is revoked. Domain event publication, audit, console/email/SMS consumers and source-owned reminder settings remain independent. No historical inbox row, read/unread/star/delete state or preference history was rewritten. Inactive type preferences are preserved, labeled inactive, and cannot be offered or restored as active delivery.

No migration is needed. No migration, reset, seed, purge or other mutation was run against `vendure_demo_market_ops` or the ordinary development database. No historical migration, environment/credential, consent, remote Git, deployment or hosting change was made.

## Verification for this cleanup

Final verification results are recorded below. The existing guarded test database helper requires loopback, a generated `vendure_test_*` name and ownership before cleanup. Tests use the established no-evidence reporter and create no screenshots, video or traces. Failed intermediate runs retain their own disposable databases according to that helper; successful runs drop their owned databases. No protected database is selected.

| Check                                                                            | Result                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full frontend `npm test` with `FRONTEND_NO_EVIDENCE=true`                        | 482 tests passed across 38 files                                                                                                                                                                                    |
| Frontend `npm run typecheck`                                                     | TypeScript and 87 Astro files passed, zero diagnostics                                                                                                                                                              |
| Frontend `npm run lint`                                                          | ESLint, nine-workspace boundaries and repository-wide Prettier passed                                                                                                                                               |
| Frontend `npm run build`                                                         | Storefront and Admin passed; existing large-chunk advisory remains                                                                                                                                                  |
| Backend `npm run build` with process-local `APP_ENV=dev`, `NODE_ENV=development` | Dashboard, server and worker passed                                                                                                                                                                                 |
| Backend targeted TypeScript                                                      | Inbox and Documents test projects passed                                                                                                                                                                            |
| Guarded core inbox suite                                                         | 18 groups passed, including real checkout, settled refund, terminal lifecycle, significant participation, same human across contexts, isolation, preferences, rollback/recovery and replay                          |
| Guarded Market Operations suite with `--inbox`                                   | 22 passed, including application/relationship/assignment/invoice invariants and tenant isolation                                                                                                                    |
| Guarded billing suite                                                            | Two actual provider-uncertainty lifecycles, required suppression bypass, replay and isolation passed                                                                                                                |
| Expanded Documents suite                                                         | 84 document/security checks passed, including request/submit/approve/reject, automatic approval, expiry deduplication, same-human roles, policies, actionable/all-clear readiness and repeated document access loss |
| Expanded offline payment/refund/payout suite                                     | 67 originating regression groups passed, including a real failed refund to both contexts, silent pending refunds, repeated failed payment observations and required payout problems                                 |
| Desktop/mobile Chromium inbox and live checklist                                 | Seven groups passed at 1280px/390px, including role switching, equal global unread counts, destination handoff, scoped light/dark accessibility and live checklist refresh                                          |

Intermediate failures were in new or outdated test assumptions: the original Vendor suppression also muted the same human's optional Manager review; old tests still expected disabled exception receipts; an original deletion check assumed its document remained on the first 20-row library page; browser assertions used an obsolete discovery category and read the bell before its asynchronous load settled; the repeated provider observation test initially selected an already terminal reconciliation operation and then passed raw PostgreSQL bigint strings instead of the domain money transformer. Its final fixture uses an actual failed checkout and the existing transformed ProviderOperation entity. These were corrected in test fixtures/assertions. A source-state review also identified the actual failed-refund state as `PROVIDER_FAILED`, and the retained projector now explicitly uses that domain state. The provider qualification adds an originating failed refund rather than treating a routine pending receipt as a financial-problem test.

## Limits and deferred work

The requested cleanup is implemented and verified above. No new contracts, business features, scheduler, grouping/digest engine, timing preferences, alert thresholds, consent migration or UI redesign were introduced. Existing expiration source jobs still use their established business opt-in and timezone/reminder eligibility; personal inbox preferences do not independently start those jobs. This cleanup does not silently enable them. Future-only features/policies remain inactive and individually explained in the catalog.

Manual testing with the user's populated accounts was not performed. Real external providers, real ClamAV, Firefox/WebKit, load/EXPLAIN benchmarks and the entire recursive historical backend test chain were not run. Offline provider and scanner fixtures qualify the affected lifecycles. The existing pg concurrent-query advisory and intentional denied-input errors are not failed assertions.

## Manual verification in the populated local environment

No migration command is required. Restart these existing scripts in separate terminals from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. Use the existing Boerne Market Manager and Manna Roots Vendor accounts. Record current inbox counts or filter by today's time. Older noisy messages intentionally remain.
2. Request one new required document. The Vendor gets one Document required row; the requesting Manager gets no confirmation or generic compliance notice.
3. Submit an available file for a requirement needing approval. The existing UI shows success; the Vendor gets no receipt and each authorized reviewing Manager gets one Document awaiting review row. A requirement with automatic approval produces no review notice.
4. Approve it, then repeat with a separate submission and reject it. Approval adds no approval/compliance rows. Rejection adds one required Vendor action. Readiness updates from current records.
5. With the existing expiration source settings enabled, use an intentionally dated required document. Expiration creates one Vendor renewal per current obligation/file/date, without a second library/shared duplicate or individual Manager expiry notice. Managers see the issue in reports and their next eligible daily summary. An unused private library file produces no new in-app expiration alert.
6. Assign a required policy, acknowledge it, publish a version explicitly requiring re-acknowledgment, then acknowledge again. There are two distinct required Vendor actions and no publication/acknowledgment receipts.
7. Change pickup details or withdraw a confirmed participation. The initiating context gets no success receipt; the other affected business context gets one significant notice. Ordinary planned/confirmed/no-op transitions stay quiet.
8. Use a supported local test checkout for placement, completion/cancellation and refunds. Pending refunds stay quiet; actual failed/reconciliation-required refunds, completed refunds and payment/payout failures remain distinct. Do not manufacture provider events or initiate unintended money movement for manual verification.
9. Compare all role/business contexts for one human, then an unrelated account. Keep distinct required contexts; verify unrelated users/businesses cannot read or mutate the rows. Retry/replay through existing workers must not create another persisted row.
10. Resolve all current items on an eligible upcoming Market. Its next daily summary stays quiet, while its live checklist remains available and refreshable. A subscription suppression must not hide required security/transactional actions. Inactive types cannot be selected or restored in inbox settings, and historical messages retain read/star/delete state.

Allow the existing minute worker sweep and visible-page polling, or refresh after processing. Subscriptions do not retroactively recreate previously suppressed messages. Detailed commands for repeated automated qualification remain in the historical record below; its older active catalog and manual discovery scenarios no longer describe current delivery policy.

## Historical implementation record before simplification

Local work dated 2026-10-17. The unified persisted inbox foundation, shared UI, personal preferences and multiple real event adapters are implemented. The entire requested notification catalog is not complete, and production readiness is not claimed. Source gaps are explicit in the [event catalog](NOTIFICATION_EVENT_CATALOG.md).

The original sections below record Phase 1. The [Phase 2 section](#phase-2-implementation) records the current extension, qualification and normal-development procedure. Phase 1's 119/50/69 counts are historical.

## Files and reused systems

Backend: `src/plugins/platform-notifications/` adds registry/future contracts, InboxService, paged outbox projection and Admin/Shop APIs. The existing plugin supplies the scheduler and exports. Existing compliance eligibility is reused through `service.recipients`. The existing central account bridge adds notification operations; password change/recovery append safe facts in their existing transactions. Market domain events gain narrow notification transition metadata without changing commerce or participation invariants.

The only new migration is `src/migrations/1792250000000-UnifiedNotificationInbox.ts`. It is additive and forward-only, and has not been applied to protected development data. No historical migration, environment file, provider configuration, secret or synchronization setting changed.

Frontend: `packages/api/src/inbox.ts`; `packages/ui/src/notifications.tsx` and CSS; Customer notification island/BFF/routes; Customer navigation; AdminShell and CustomerLayout bells; global Admin route allowance. `Dropdown.label` now also accepts ReactNode while retaining string callers. Root component documents record the specialist list and reuse rules. New tests are in `tests/inbox.test.tsx`, `scripts/test-inbox.ts`, backend `test/platform-inbox/` and `test/documents-compliance/inbox.ts`. Package scripts expose tests, a guarded demo and catalog generation.

## Functioning sources and gaps

The registry contains 119 contracts, with 50 functioning adapters. They cover root purchase placement and attributed Vendor portions; settled refunds; quantity fulfillment/cancellation; Market occurrence publication/change/cancellation; followed Markets and confirmed favorite-Vendor attendance; relationship/membership/participation changes; real application submission/approval/rejection/information requests; booth assignment changes; document request/submission/review/expiration/overdue facts; policy assignment/acknowledgment/revision/publication; existing opt-in readiness warnings; business membership changes; password change/recovery; payment-account deauthorization; POS revocation; and supported problematic business subscription states.

Specialist password/provider/billing adapters and some transition variants are typechecked but have not received a complete originating-source lifecycle test in the new inbox suite. No external provider was called or enabled.

Invitations, catalog/stock changes, payouts, other payment failures and role-grant edits still need notification adapters. Vendor application notices contain safe decision summaries and link to existing Market relationships because a Vendor application-detail route does not exist. Quantity changes are distinct from whole-order terminal transitions. No pickup-ready state, watched-item relationship, support escalation, incident publisher, promotion publisher or participation target was fabricated.

Grouping/digests, quiet hours, personal reminder thresholds and new deadline/pickup timing remain unimplemented. Existing document/reminder jobs still depend on their business-configured source opt-in and thresholds. In-app suppression is independent, but personal settings do not independently start those jobs. Full custom-domain, scale/load and cross-process crash qualification remain outstanding.

## Executed verification

Frontend commands use `FRONTEND_NO_EVIDENCE=true`; backend integrations use the existing `test/no-evidence.cjs` wrapper. Browser checks create no screenshots, video, traces or evidence directories. PostgreSQL tests required sandbox escalation and used only guarded process-owned `vendure_test_*` databases. No protected database was reset. The full frontend suite passed all 472 tests across 37 files after fixing the new compile-time constant handling and updating the directly affected navigation expectation.

| Command                                                                           | Result                                                                                                                                                                                               |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend targeted Vitest (`tests/inbox.test.tsx`, `tests/notifications.test.tsx`) | 21 passed                                                                                                                                                                                            |
| Guarded backend inbox scenario                                                    | Eight groups passed, including a two-Vendor Market purchase, direct third-Vendor purchase, settled refund, injected worker failure/rollback/recovery, concurrent replay, preferences and isolation   |
| Frontend `npx tsx scripts/test-inbox.ts`                                          | Five Chromium groups passed: 1280px/390px, scoped axe scan, keyboard bell, details, unsubscribe/restore, settings, filters, bulk read and Customer/Vendor/Manager switching with equal unread counts |
| Guarded Documents regression                                                      | 74 document/security checks passed, including two new real document/policy inbox groups                                                                                                              |
| Frontend TypeScript and Astro                                                     | TypeScript and all 87 Astro files passed with zero diagnostics                                                                                                                                       |
| Frontend build                                                                    | Storefront/Admin passed, with large-chunk warnings                                                                                                                                                   |
| Backend build                                                                     | Initial ordinary command hit the existing explicit APP_ENV guard. With process-local `APP_ENV=dev`, `NODE_ENV=development`, dashboard/server/worker passed                                           |
| Targeted ESLint                                                                   | Full ESLint, source boundaries and repository formatting passed                                                                                                                                      |

Test-development failures were corrected: fixture channel grants, PostgreSQL UPDATE return shape, readiness DNS, hostname migration prerequisite, browser selectors, omitted top-level GraphQL registration in the fixture, optional commerce-schema assumptions, document metadata label lookup and IPC process cleanup. Failed disposable databases were retained by the established helper. Successful backend runs cleaned their owned database. The browser harness waits for guarded database cleanup and disconnects the fixture IPC channel before exit.

Final `npm run lint` passed ESLint, nine-workspace source boundaries and repository-wide Prettier validation. The existing JSX analyzer emits a non-failing TSNonNullExpression diagnostic. `npm run typecheck` passed TypeScript and all 87 Astro files with zero errors, warnings or hints. Frontend Storefront/Admin and backend dashboard/server/worker builds passed; frontend large-chunk warnings remain. Original provider lifecycle suites, the full recursive historical backend chain, real ClamAV, Firefox/WebKit, production custom domains and scale/load benchmarks were not executed.

## Changed-file inventory

Paths below are relative to their respective repository. No unrelated feature or historical migration was intentionally edited.

| Repository                  | Files                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend core                | `src/plugins/platform-notifications/inbox-api.ts`, `inbox-service.ts`, `inbox-projector.ts`, `inbox-registry.ts`, `inbox-future-types.ts`; existing `events.ts`, `service.ts`, `platform-notifications.plugin.ts`                                                                                                                                                                                                            |
| Backend hooks               | `src/plugins/documents-compliance/notifications.ts`, `advanced-notifications.ts`; `src/plugins/farmers-market/services/market-domain.service.ts`, `market-vendor-membership.service.ts`, `occurrence.service.ts`, `participation.service.ts`; `src/plugins/market-operations/service.ts`; `src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts`, `customer-account/controller.ts`, `customer-account/service.ts` |
| Backend schema/tests/docs   | `src/migrations/1792250000000-UnifiedNotificationInbox.ts`; build-generated `src/gql/graphql-env.d.ts`; `test/platform-inbox/run.ts`, `third-vendor.ts`, `tsconfig.json`; `test/documents-compliance/run.ts`, `inbox.ts`; `package.json`; `docs/IN_PLATFORM_NOTIFICATIONS.md`                                                                                                                                                |
| Frontend shared             | `packages/api/src/inbox.ts`, `index.ts`; `packages/ui/src/notifications.tsx`, `notifications.css`, `index.tsx`; `packages/ui/package.json`; `packages/admin-core/src/index.ts`                                                                                                                                                                                                                                               |
| Frontend consumers          | `apps/admin/src/AdminShell.tsx`; `apps/storefront/src/components/CustomerNotifications.tsx`, `layouts/CustomerLayout.astro`, `lib/customer-dashboard.ts`, `lib/shop.ts`, `middleware.ts`, `pages/api/notifications.ts`, `pages/notifications/[...view].astro`                                                                                                                                                                |
| Frontend tooling/tests/docs | `scripts/test-inbox.ts`, `notification-catalog.cjs`; `tests/inbox.test.tsx`, `customer-dashboard.test.ts`; `package.json`; root `COMPONENT_USAGE_GUIDE.md`, `UI_COMPONENTS.md`; the three notification documents in `/docs`                                                                                                                                                                                                  |

The existing Documents suite emits an expected rejection stack during its mixed multipart denial test and a pg concurrent-query deprecation warning. Neither was a failed assertion. Real ClamAV remains unqualified; the existing API suite uses its guarded scanner fixture. No remote Git or deployment operation occurred.

## Manual testing

From the frontend root:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npm run demo:inbox
```

The guarded demo starts its own disposable backend and local test frontends. Open `http://auth.platform.localhost:4337/notifications`. The terminal prints the actual synthetic email/password. Use the Customer Account mode selector to enter Vendor and Market Manager, then open `http://localhost:4555/notifications`. These accounts do not necessarily exist in your normal database. Press Enter in the demo terminal to stop its services and clean up its owned test database.

The fixture creates real purchases and domain events rather than seeding inbox rows. Inspect the bell preview, recent role/business indicators and global unread count. Open a row for full content; use the sibling star/read/delete controls. At mobile width the bell remains visible and row actions use Actions. Tab/Enter/Space should work; the shared dialog X restores focus.

Combine Receiving role, Receiving business, Category, Priority, dates, search and read status. Select this page applies bulk actions only to those IDs. Compare the bell after read/unread/delete and account switching. The same person sees every currently authorized context; an unrelated account cannot access those IDs.

Open a New market occurrence notice and choose Unsubscribe from this source. Confirm the Market, type and receiving account. `/notifications/unsubscribed` restores that exact rule. `/notifications/settings` can add broader optional type/category/workspace rules or a temporary mute, with explicitly labeled local time. Broader rules remain active after a narrower restore.

For ordinary development, review/apply the additive migration through the backend's existing workflow, then run the existing backend server/worker and frontend `npm run dev`. Use `/notifications` on the configured account and Admin origins, normally the existing 4321/4322 frontend ports. Do not change application origins or provider configuration for this feature.

Generate Customer notices through a real supported checkout. A two-Vendor Market cart creates one Customer purchase notice and Vendor notices for authorized recipients. A direct purchase creates another Customer notice. Create a future occurrence through Market Occurrences after following that Market or purchasing there. Use existing membership/participation commands for Vendor and Manager notices. Allow the worker's minute sweep and the visible-page minute poll, or refresh after processing.

After a source unsubscribe, create a distinct future occurrence. Its optional notice should be suppressed only for that scope. Cancel an occurrence affecting an existing purchase or participation to verify required notices continue. Restore the rule, create another new occurrence and verify optional notices resume. The guarded test executes these transitions automatically.

For compliance, use Market Documents to assign an eligible Vendor a required document, submit/review a scanned document, and publish/assign a real policy. Publish a new version requesting re-acknowledgment. Required requests must bypass optional compliance suppression. Expiration/readiness jobs require their existing explicit business settings and thresholds; resolving the source must stop obsolete eligibility. The guarded Documents command tests real workflows. The inbox demo itself does not include a compliance scanner/fixture. Future-only catalog events cannot yet be manually triggered as functioning notices.

Repeat verification:

```powershell
# Frontend root
$env:FRONTEND_NO_EVIDENCE='true'
npm run test:inbox
npx vitest run tests/inbox.test.tsx tests/notifications.test.tsx
npm run typecheck
npm run build

# Backend root
$env:FRONTEND_NO_EVIDENCE='true'
node -r ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/platform-inbox/tsconfig.json test/platform-inbox/run.ts
node -r ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/documents-compliance/tsconfig.json test/documents-compliance/run.ts
$env:APP_ENV='dev'
$env:NODE_ENV='development'
npm run build
```

## Phase 2 implementation

This is a local continuation of the existing architecture. No deployment, remote Git operation, provider call, environment/credential edit, historical migration edit, synchronization change or protected-development database migration/reset was performed.

### UI and coverage

Notifications now appears in the existing Customer, Vendor and Market Manager sidebars. All three notification routes share its active state, icon and responsive shell behavior. The existing header bell and global unread store remain. No separate sidebar polling/count query was introduced.

Shared `NotificationRole`/`NotificationContext` compositions provide blue Customer, amber Vendor, green Market Manager and purple Account badges, with icons, text and light/dark pairs. This applies to the bell, rows, detail, filters and subscription scopes. Severity remains separate. Backend destination metadata supplies truthful action labels for existing and historical notices; unavailable destinations have a safe state. Customer reauthorization/handoff and Admin channel selection remain unchanged.

The actual typed registry has **122 contracts, 82 integrated delivery types and 40 remaining non-delivery contracts**. Starting from 50 integrated types, Phase 2 adds **32 functioning types**: 29 formerly future-only contracts and three new contracts for the checklist and business-link workflow. The daily summary uses the existing `market.readiness.digest` contract as a fixed-purpose daily summary, without enabling generic digests. The catalog separates originating-source qualification from adapters whose complete inbox lifecycle has not been qualified.

New coverage includes real business-link requests/responses (separate from formal Market invitations); payment failure/uncertainty; whole attributed order cancellation/completion; intermediate refund activity; followed Vendor catalog publication; materialized preorder opening and Vendor closure; out-of-stock and reconciliation; payment-account/transfer problems; verified payout outcomes; document receipts/access invalidation; exception grant/revoke/expiry; advisory readiness restoration; listing review; membership activation; verified linked booth invoices; native permission edits; and safe generation worker failures. Vendor billing problem notices also accept the new uncertain provider-operation source. Terminal order notices replace overlapping quantity notices for the same operation.

Payout Settings remains the existing account/readiness page. A new payout-detail page was not fabricated. Generation failure notices describe a failed worker attempt and link to current occurrences; retry attempts share a logical request identity. They do not expose exception text or claim automatic repair.

The 40 remaining contracts are individually explained in the generated catalog: **24 lack an authoritative source feature, 8 lack an explicit business policy, 7 are covered by concrete types without duplicate delivery, and 1 cannot serve unverified users through the authenticated inbox**. Examples include absent formal membership/application/participation invitations, pickup-ready state, item watches, support/escalation, in-app announcements/promotions, verified email replacement and platform incidents. Missing policies include low-stock thresholds, before-close alerts, participation/policy/pickup reminders, attendance targets and critical blocker classification. Computed readiness does not enforce participation. Custom schedules, quiet hours and general grouping remain intentionally excluded.

Private notice generation and reads also preserve the existing domain owner requirement for Vendor finance, inventory, payment/POS and participation-command permissions. An explicit native grant on a staff membership does not bypass an owner-only domain rule. Billing read grants retain their separate existing staff policy.

### Manager operations

The existing scheduler runs a bounded operational source sweep each minute. Persistent cursor rows and transaction locks serialize each source page. Deterministic event identities and existing consumer receipts preserve idempotency/recovery. Daily readiness considers the next scheduled, not-ended occurrence within seven days, once per Market-local calendar date. Multiple Managers receive separately authorized projections; multiple Markets remain distinguishable. Delayed daily projection refreshes the next eligible occurrence and current source counts.

Counts use the shared date-specific compliance projection and actual approved participation/verified operations approvals. They cover confirmed/planned participation, required document/policy issues, advisory warnings and applicable exceptions. Set-based queries avoid per-row report requests. First observation does not claim readiness restoration; a previously observed outstanding state must resolve first.

Each eligible occurrence gets its own local-day notification and `/market/operations/{id}#checklist` link. The Admin-only checklist API checks current Market membership and native grants against the actual occurrence. The shared-primitives composition shows live statuses/counts, explanations, source resolution links and an as-of time. It has no editable completion flags or new Vendor-private order permission. Canceled, unavailable and historical contexts do not appear completed.

The exception pass is a bounded `(ends_on, id)` keyset scan. After historical catch-up it revisits a recent two-day boundary for timezone rollover; it does not repeatedly scan all historic exceptions. Source facts and cursor progress commit together. Preorder identity is the materialized offering window, not a new configurable schedule.

### Files and migration

| Area                        | Relevant local files                                                                                                                                                                                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend registry/projection | `src/plugins/platform-notifications/inbox-registry.ts`, `inbox-phase-two-types.ts`, `inbox-contract-reviews.ts`, `inbox-qualification.ts`, `inbox-actions.ts`, `inbox-phase-two-projector.ts`, `inbox-projector.ts`, `inbox-service.ts`                                                                    |
| Manager API/jobs            | `inbox-operations.ts`, `inbox-operations-api.ts`, existing notification plugin; `src/plugins/documents-compliance/operational-readiness.ts`                                                                                                                                                                |
| Narrow domain hooks         | Existing catalog publishing/Vendor catalog, inventory operation/physical/checkout coordination, provider facts/refund coordination/writer, payment account/webhook/transfer, billing provider, document service/advanced, Market admin membership/generation worker and Market Operations invoice services |
| Frontend                    | Shared `packages/ui/src/notifications.tsx`, CSS and bell icon presentation; `packages/api/src/inbox.ts`; shared Admin navigation/shell/icon and Customer native navigation; Market service/operations plus `ReadinessChecklist.tsx`                                                                        |
| Qualification               | `test/platform-inbox/phase-two.ts`, `providers.ts`, `billing.ts`; Documents `inbox-operations.ts`; opt-in inbox qualification in the existing Market Operations harness; frontend inbox/checklist/Vendor navigation tests and browser harness/fixture                                                      |
| Documentation               | This report, architecture and generated catalog; root `UI_COMPONENTS.md` and `COMPONENT_USAGE_GUIDE.md`; backend notification documentation pointer                                                                                                                                                        |

The new additive migration is **`src/migrations/1792400000000-NotificationOperationalSweeps.ts`**. It adds sweep cursors, prior advisory readiness observations and indexes for occurrence/end/window/exception/payout/terminal-operation lookups. It is forward-only and was applied only to disposable test databases. Phase 1's `1792250000000-UnifiedNotificationInbox.ts` is still required. Their applied status in the normal development database was not inspected or changed.

### Phase 2 automated verification

All commands below use process-local `FRONTEND_NO_EVIDENCE=true`. Backend database suites use `test/no-evidence.cjs` and only loopback, process-created `vendure_test_*` databases. Successful databases are cleaned by their owning harness. Failed development runs were retained by the established helper; they were not used to alter protected data. Browser tests create no screenshots, traces or video.

| Executed command                                                                                                                                         | Result                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node -r ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/platform-inbox/tsconfig.json test/platform-inbox/run.ts`               | 17 groups passed, including source workflows, terminal overlap and owner-only authority                                                                                                  |
| `node -r ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/platform-inbox/tsconfig.json test/platform-inbox/providers.ts`         | 66 groups passed, including repeated same-state payout observations, optional suppression and required bypass                                                                            |
| `node -r ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/platform-inbox/tsconfig.json test/platform-inbox/billing.ts`           | 2 real billing-uncertainty lifecycles passed, including required bypass, replay, accurate destination and isolation                                                                      |
| `node -r ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/market-operations/tsconfig.json test/market-operations/run.ts --inbox` | 22 passed, including verified linked Vendor invoice delivery and existing application/layout/billing/day regressions                                                                     |
| `node -r ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/documents-compliance/tsconfig.json test/documents-compliance/run.ts`   | 80 passed, including real exception expiry, summaries, document/policy transitions and live checklist counts                                                                             |
| Frontend `npx vitest run`                                                                                                                                | 480 tests passed across 38 files                                                                                                                                                         |
| `npx vitest run tests/inbox.test.tsx tests/readiness-checklist.test.tsx tests/vendor.test.tsx`                                                           | 57 passed after the navigation expectation update                                                                                                                                        |
| Frontend `npm run test:inbox`                                                                                                                            | 7 browser groups passed at 1280px and 390px, including actual BFF destination navigation, light/dark accessibility, account switching, mobile/collapsed navigation and checklist refresh |
| `npm run typecheck`                                                                                                                                      | TypeScript and 87 Astro files passed with zero errors, warnings or hints                                                                                                                 |
| Frontend `npm run build`                                                                                                                                 | Storefront SSR and Admin production builds passed; existing chunk-size warnings remain                                                                                                   |
| Frontend `npm run lint`                                                                                                                                  | ESLint, nine-workspace boundaries and Prettier formatting all passed                                                                                                                     |
| Backend `$env:APP_ENV='dev'; $env:NODE_ENV='development'; npm run build`                                                                                 | Full current dashboard, server and worker production builds passed                                                                                                                       |
| `npm run notifications:catalog`                                                                                                                          | Regenerated 122 contracts / 82 integrated from the actual registry                                                                                                                       |

Test development exposed and corrected a prior-state read-order issue, explicit date-only conversion for exception revalidation, delayed same-state payout observation handling, source-fixture prerequisites and browser async/DNS handling. Assertions and domain authorization were retained. The existing PostgreSQL concurrent-query deprecation warning, JSX static-analysis diagnostic and expected negative-case validation logs do not represent failing assertions. Frontend builds retain chunk-size advisories.

Unexecuted qualification: real development/production database testing, external provider/sandbox calls, real ClamAV, Firefox/WebKit, custom production domains, large-load/EXPLAIN benchmarks and the entire recursive historical backend chain. Some existing Phase 1 adapters and specialist transition variants remain explicitly marked as not fully lifecycle-qualified in the catalog. This phase does not claim exhaustive provider/account/authentication variants or scale qualification.

### Phase 2 normal-development testing

These steps are for the user after reviewing migrations. They were not performed automatically. Do not substitute a destructive demo reset/seed command for the persistent workflow.

1. Stop ordinary backend server/worker processes while reviewing the pending migrations. Both normal entry points automatically run pending migrations before startup. Review the two notification migrations, their prerequisites and the intended local database/schema. Preserve the existing data/backup procedure. Synchronization must remain false.
2. Inspect migration history and table presence using your existing PostgreSQL client with read-only queries:

   ```sql
   SELECT name FROM migrations ORDER BY timestamp;
   SELECT to_regclass('public.platform_inbox_notification'),
          to_regclass('public.platform_inbox_preference'),
          to_regclass('public.platform_inbox_event_progress'),
          to_regclass('public.platform_inbox_sweep_cursor'),
          to_regclass('public.platform_inbox_readiness_state');
   ```

3. If Phase 1 is unapplied, include `UnifiedNotificationInbox1792250000000`. Review/apply `NotificationOperationalSweeps1792400000000` after existing prerequisites, including Documents Phase 3. Use the repository's current migration workflow. `npm run db:prepare` is the existing explicit local development procedure, restricted to `APP_ENV=dev`, loopback PostgreSQL and the public schema; it applies **all** pending migrations after validating any legacy baseline adoption. Review that full pending set first. No new reset, reseed or synchronization command is required.
4. Once migration review/application is complete, start the ordinary backend server and worker from the backend root with `npm run dev:server` and `npm run dev:worker`, or your existing combined `npm run dev`. Existing scanner prerequisites still apply. Keep the worker running for scheduled operational sources and outbox recovery. Do not change provider credentials or app ports for this feature.
5. From the frontend root run `npm run dev`. Use the configured account/storefront origin on port 4321, commonly `http://auth.platform.localhost:4321`, and Admin at `http://localhost:4322`. The ordinary backend API is on its configured origin, commonly port 3000. Disposable inbox tests use their own 4337/4555 ports and are separate from these persistent services.
6. Sign in with your own existing verified account. This work did not create real-development users, purchases or business data. Use normal application setup for active Vendor/Market memberships and current native grants. Check Notifications in Customer, Vendor and Manager modes, desktop collapse and the mobile drawer. Inbox/settings/unsubscribed should all keep the entry active; the bell should retain the same global count across modes.
7. Generate source events through deliberate ordinary operations. Follow a publicly accessible Vendor, then publish a new enabled catalog offering. Request a listing and review it as its Manager. In Vendor Directory, request verification of an actual business link, then confirm or decline it from Vendor Market Relationships. Those notifications do not approve membership or attendance. Set valid confirmed participation and enable an offering with a real materialized preorder window. Opening/closure requires those source instants to actually pass; no before-close reminder interval was added.
8. Inventory changes modify persistent stock. Use an intended adjustment/observation that crosses available committed physical stock to zero, and check the Vendor notice and View Inventory action. Do not corrupt real data to create reconciliation conflicts. Use the separate guarded suite to qualify that negative condition.
9. Orders/refunds modify persistent commerce and may invoke your configured provider. Use only purchases/refunds you actually intend through the existing workflow. Verify root Customer attribution and the correct Vendor portions. Partial quantity changes and whole terminal notices should not duplicate the same meaning. Completion does not invent a pickup-ready state; cancellation does not confirm a refund. Intermediate refund notices appear only if still current when projected.
10. In Market Documents, assign a real required document, upload/share an allowed scanned document, review it and revoke sharing where intended. Verify the Vendor receipt, Manager invalidation and live checklist counts. Publish/assign a required policy and explicitly acknowledge its exact version. Required requests continue despite optional suppression. These operations change persistent compliance evidence.
11. Give the Market a scheduled occurrence within seven days. Wait for its source cursor turn, outbox projection and the visible inbox poll, or refresh. Check one daily readiness summary per Market-local date, including multiple authorized Managers/Markets. Compare counts to the occurrence's date-specific Documents report and actual participation. Associated Vendors without an attendance decision are not treated as missing expected attendees.
12. For an occurrence on today's date in its own timezone, open its Market Day Checklist notice or visit `/market/operations/{actualOccurrenceId}#checklist`. Confirm schedule, planned confirmations, documents, policies, warnings and exceptions. Resolve a source issue, choose Refresh checklist and confirm the live change. A revoked share or new policy requirement must become outstanding again. Canceled occurrences must show a canceled state. No presentation checkbox can complete a real requirement.
13. Grant/revoke a relevant date-scoped exception through its existing Manager workflow. Check required revoked/expired notices and optional grant/restoration behavior. Expiry uses the Market's calendar date; runtime grants cannot backdate an expired period. Native role/permission changes require the existing authorized account administration workflow and notify the affected human without exposing business-private details.
14. A verified linked Vendor can receive a required booth-invoice notice after the Manager deliberately issues an unpaid invoice. External/unverified directory entries must not receive private Vendor notices. View Booth Assignments opens the actual Vendor invoice-status surface. Manual invoices change persistent Market billing records.
15. Payment/payout and uncertain billing notices require genuine existing provider observations and current grants. Do not insert fabricated provider facts or initiate unintended money movement for testing. Their automated alternative is the existing offline guarded provider/billing commands listed above. Payment Settings exposes connected-account readiness; no new payout-detail route is claimed.
16. Open representative notices. Verify descriptive labels, authorized destinations and account handoff, including a second business. Revoke a test membership or native grant through normal administration and confirm private inbox rows/counts/actions are immediately unavailable. Unrelated users must be denied the same notification ID and foreign occurrence checklist.
17. Unsubscribe from an optional source/type, perform a distinct real source operation and confirm suppression. Required cancellation/compliance/security notices must continue. Restore the exact rule and create a future event; suppressed history is not backfilled and broader rules still apply. Daily summary resubscription resumes future local-day summaries. Test colors in light/dark settings, with icons/text still visible and severity separate.
18. Record normal-development results separately from disposable automated qualification. Do not infer missing sources from a registry entry: formal membership/application/participation invitations, announcements, ready-for-pickup, watches, incidents and missing reminder policies cannot be triggered as functioning notices. Business-link verification requests and responses are supported separately.

Reading inboxes, settings and checklists is safe read-only activity. Read/star/delete/unsubscribe actions change only personal notification state. Catalog, participation, permissions, document/policy, inventory, invoice, order and provider operations change persistent business or audit state and should be deliberate.

### Existing populated demo database

The user's Boerne Market Manager and Manna Roots dataset is `vendure_demo_market_ops`, not the ordinary configured `vendure` database. A read-only identity check confirmed the existing Market, Vendor and manager before migration. On the user's migration follow-up, the six pending Documents/Compliance and Notification migrations through `NotificationOperationalSweeps1792400000000` were applied to this populated demo. Its notification tables and four sweep cursor rows were verified, with no reset or seed. An earlier target-selection mistake also applied these six migrations to `vendure`; those migrations remain applied and were not destructively rolled back.

All demo startup commands run from `E:\coding\farmers-market-platform-web` in separate terminals: `npm run demo:market-operations:serve`, `npm run demo:market-operations:worker`, `npm run demo:market-operations:admin` and `npm run demo:market-operations:storefront`. The new worker reuses guarded demo configuration for notification and operational scheduled tasks while existing queue consumers remain disabled. Its startup was verified and the verification process stopped. Future explicit schema upgrades use `npm run demo:market-operations:migrate`; serving and worker startup refuse pending migrations. See the [persistent demo instructions](phase14-manual-testing.md).
