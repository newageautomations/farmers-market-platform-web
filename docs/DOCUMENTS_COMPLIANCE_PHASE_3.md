# Documents and compliance, Phase 3

Implemented locally on October 15, 2026, in the web repository and the explicitly authorized sibling backend. Phase 3A, 3B and 3C are implemented together. Existing uncommitted Phase 1, 2A and 2B work was retained. Nothing was deployed, pushed or connected to a hosting service. Protected development databases were not reset or migrated.

## Architecture and authority

The existing Documents Vendure plugin remains the authority for private files, explicit grants, reviews, assignments and compliance projections. `advanced.ts` extends that plugin for reports, exceptions and digital agreements. Every Admin operation derives the active Market or Vendor from the current authenticated Channel through the existing `DocumentsComplianceService.owner` checks. Managers remain Market-scoped. There is no organization-wide reporting privilege.

Market writes require current `ManageOwnMarketMemberships`, active Market management and Administrator identity. Vendor acknowledgments require current active Vendor ownership and the existing storefront write grant. Read permissions remain distinct. The Shop file adapter does not gain an Admin report or agreement API. Shared upload/share components now accept the narrower `DocumentFileApi` contract.

Application acceptance, Market membership, canonical participation, operational date approval, attendance and documentation clearance remain separate. Phase 3 business actions never create or cancel participation, suspend a Vendor, reject an application, alter a booking, modify a payment or disable a storefront. The disposable fixture deliberately invokes existing membership and participation services to demonstrate confirmed participation.

## Date-specific readiness

`workflow.ts:complianceProjection` is the shared metadata projection used by application readiness, current dashboard summaries, Documents and Phase 3 reports. It combines uploaded-document assignments and assigned digital acknowledgments. There is no frontend readiness engine.

For each document assignment it checks waiver state, scoped exception, latest explicit submission, current sharing grant, undeleted document, Available scanned file, issue date, expiration date and independent Market review. Dates come from the pinned submission snapshot. Changing a saved library document does not rewrite a prior Market submission. The Vendor must explicitly resubmit it where necessary.

An issue date after the participation start fails readiness. An expiration date before the participation end fails readiness. Expiration on the final participation day remains valid through that day. Expiring Soon remains valid. An absent necessary date is Unknown, never Ready. Optional outstanding requirements do not block readiness. A required agreement contributes only when its manager-controlled readiness setting is enabled.

Existing events use `market_occurrence.startsAt/endsAt`, converted to calendar dates in the Market's IANA timezone. The exclusive ending instant is reduced by one microsecond before deriving the last participating day, so an event ending at midnight does not gain a phantom extra day. Manual previews use strictly validated ISO calendar dates, with at most 366 days per range and a two-year forecast horizon. Invalid dates and reversed ranges are refused.

Reports return Ready, Incomplete, Pending review, No requirements or Unknown, with reasons and complete filtered counts. Current file expiry is always evaluated against the current Market date for current views. Historical previews return Unknown and explicitly explain that past approval state is not reconstructed. Immutable review and acknowledgment history remains available as evidence; it is not presented as a reconstructed historical readiness certificate.

## Scheduling and participation

The event selector reads existing scheduled Market occurrences. Canonical `occurrence_participation` with confirmed status and an approved membership produces Confirmed participation. A verified active directory business with an existing confirmed `market_occurrence_approval` is labeled Confirmed operations approval. These labels retain the distinction between the two models.

Other eligible businesses are labeled Associated, participation unconfirmed. A manual date preview is also explicitly unconfirmed. Accepted applications are not treated as confirmed attendance. External or unverified directory businesses are not invented as canonical Vendors. No second recurrence, enrollment or attendance system was added.

Market Day and booth assignments link the selected occurrence to Documents readiness. Market Overview links to the report tab. Vendor Overview shows the next five applicable dates, server-calculated forecasts, participation labels, outstanding reasons and links into Market requests or Agreements. The existing upload/share/review workflow fulfills ordinary documents.

## Exceptions and waivers

Ongoing waivers retain the existing assignment and immutable review mechanism. New `compliance_exception` records exist only for date-range or event-specific decisions. Each records the assignment, Market, Vendor, responsible manager, reason, inclusive start/end dates, optional occurrence and creation timestamp. Revocation records its manager, timestamp and reason.

An exception must cover the entire requested period. An event-specific exception cannot clear another occurrence or a free-date preview. Expired or revoked exceptions do not satisfy current or future readiness. Reports identify manager exceptions/waivers explicitly and link to the underlying Vendor compliance. The original file and review are not edited or approved by an exception. Database triggers preserve exception identity and permit only a single complete revocation transition.

## Agreements, versions and evidence

The Agreements tab provides plain-text draft editing, eight editable operational starter templates, title/type, required/optional collection, collection stage, optional due date, automation choice and whether acknowledgment contributes to readiness. Content is bounded to 30,000 characters, with bounded title/type and prohibited-sensitive-material checks. React renders content as text, including malicious HTML, rather than executing or interpreting it.

Collection settings on an existing policy apply to its existing assignments when saved, as explained in the editor. Edited text, titles and types remain private until publication; Vendor reads use their authorized immutable published version. New drafts have no assignments or readiness effect. These settings remain distinct from the explicit publication decision to distribute a new version.

Publishing creates an immutable version with its own ID, number, title/type, text, SHA-256, publisher and timestamp. Editing the draft never rewrites published content. Publishing first exposes the existing assignment/acknowledgment counts. A manager explicitly chooses whether to request the new version from existing assigned Vendors. The server rechecks revision and affected count under locks. No additional historical Vendors are selected by publication.

Manual assignments work with Market automation off and deduplicate by agreement and Vendor. Automatic assignment reuses Phase 2A's existing Market switch, off by default, and lifecycle entry points. Each agreement must separately enable automation and choose Application, After acceptance or Before participation. On request is manual. Application provenance remains Market-checked. Publication does not backfill historical Vendors.

Vendors see the requested version, full text, outstanding state and acknowledgment history. The confirmation checkbox starts unchecked. Opening, scrolling or reading never acknowledges. The explicit action is bound to the authenticated Vendor, assignment and requested published version. Acknowledging twice is idempotent. An unrelated Vendor, manager impersonating a Vendor, unpublished/archived policy or stale version is refused. Agreement-before-assignment locking serializes acknowledgment with publication.

When re-acknowledgment is requested, the existing assignment points to the new immutable version while all earlier evidence stays intact. A minor revision without that choice leaves prior assigned versions and acknowledgments valid. New manual/automatic assignments receive the current published version. Archiving retires outstanding readiness effects and preserves history. Existing uploaded acknowledgment documents are not converted into digital evidence.

This is a simple electronic acknowledgment system. It does not verify a legal signature, certify a legal waiver, guarantee enforceability or integrate an electronic-signature provider. Only the authenticated principal ID, Vendor, Market, assignment/version, explicit action and timestamp are stored. No device fingerprint, identity document, tax identifier or additional identity service is introduced.

## Templates and jurisdiction guidance

The document catalog retains existing categories and adds Product Liability Insurance, Participation Agreement Acknowledgment, Event-Specific Insurance Documentation and Other Business Permits. Each has editable title/category, description, suggested applicability, purpose, instructions and expiration relevance. Selecting a category populates editable fields. No template becomes an active requirement without the manager's existing create/assign workflow. Existing uploaded acknowledgment categories remain compatible; digital acknowledgments are managed through Agreements.

The separate agreement starter catalog contains General Market Rules, Vendor Conduct, Arrival/Setup, Cleanup/Waste, Cancellations/Attendance, Weather/Emergencies, Product Quality and Participation Guidelines. These are operational writing prompts, without invented legal contract clauses, universal insurance minimums, fees or validity periods.

The guidance catalog contains two Texas entries reviewed against official DSHS pages on October 15, 2026:

- [Farmers market permitting](https://www.dshs.texas.gov/retail-food-establishments/texas-farmers-market): describes product-dependent permitting and exemptions, and the need to consult the relevant local health jurisdiction.
- [Cottage food documentation](https://www.dshs.texas.gov/retail-food-establishments/permits-retail-food-establishments/texas-cottage-food-production): points managers to product eligibility, registration, training and labeling guidance and its limitations.

Every entry records jurisdiction, topic, summary, official source name/URL, verification date, limitations and a suggested category. The UI requires an explicit jurisdiction choice, displays provenance and offers customization through the existing requirement dialog. No structured jurisdiction can safely be inferred from the Market's free-text venue. Other jurisdictions explicitly have no verified coverage. Nothing is activated because of geography. The catalog is maintained source data, not a legal rules engine or a promise that a source cannot change.

## Reports and CSV

The existing Documents workspace contains five reports:

| Report                    | Authorized data                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vendor compliance summary | Current readiness, required work, approvals, missing/pending/rejected/expired/expiring documents, outstanding required acknowledgments and exceptions/waivers |
| Upcoming Market readiness | Selected event or explicit preview, participation distinction, full-period validity, outstanding reasons and aggregate counts                                 |
| Expiration                | Available authorized submitted metadata, category, manually entered expiry, status and whether required action remains                                        |
| Agreement acknowledgments | Vendor, current published version, version requiring acknowledgment, acknowledgment status/timestamp and matching assigned/acknowledged/outstanding counts    |
| Requirement summary       | Assigned/outstanding totals by document requirement or agreement                                                                                              |

Filters cover event/date range, Vendor, requirement, document category, applicable status and expiration bounds. Status choices apply to the relevant report: Ready/Incomplete for Vendor reports, Approved/Expired/etc. for documents, Acknowledged/Outstanding for agreements and Outstanding for requirement summaries. Empty combinations return an honest empty result. When requirement/category/expiry filters are used, Vendor totals describe those filtered assignments, rather than unfiltered legal compliance.

Results are paged in groups of 20. Readiness counts cover the entire authorized matching dataset. Compact readiness rows expose counts in the approved native disclosure and show a bounded reason preview; Vendor detail and CSV contain the full reason text. File contents and downloads are never loaded for reporting.

CSV uses the same backend filters and authorized query, exports every matching row up to 5,000, and refuses larger exports rather than silently cutting them off. A repeatable-read transaction keeps export counts and rows consistent. Context and generation timestamp are included. Every cell is quoted, embedded quotes are escaped, and formula/control-character prefixes are neutralized. Exports exclude bytes, storage paths/keys, encryption material, credentials, contact details and private URLs. No PDF engine was added.

## Console notifications

`AgreementNotifications` is another source adapter for the existing platform outbox/consumer. It does not replace document reminders or create another notification pipeline. Existing Settings expose additional opt-in choices, off by default:

- `agreements.request.created`: Vendor acknowledgment requested.
- `agreements.revision.requested`: new version explicitly requested.
- `agreements.acknowledged`: relevant Market notified of an explicit acknowledgment.
- `agreements.version.published`: relevant Market publication fact.
- `compliance.upcoming.outstanding`: advisory forecast for an event in the next seven days.

Exceptions publish the existing `documents.compliance.changed` fact. Stable logical event identities and existing receipts/deliveries prevent ordinary duplicate notifications. Source resolution rechecks active relationships, archived policies, requested versions, acknowledgment state, event dates and current outstanding work before output. Console output retains the existing diagnostic allowlist, without agreement text or private metadata. Delivery failures are retried asynchronously and do not undo business actions.

The existing scheduler runs `compliance-upcoming-readiness` daily at 06:15 in the worker process's timezone. Business date calculations use the relevant Market timezone. It examines keyset pages of 100 candidate event/Vendor pairs, up to 1,000 per run, only for enabled recipient scopes. One warning is published per occurrence/Vendor/scheduled period; a reschedule creates a new identity. A repeated check does not repeat it. There is no automatic enforcement. The existing manual `notifications:check` command now checks upcoming readiness too and still requires an owned, fully migrated `vendure_test_*` database.

## Additive migration and API

Backend migration `src/migrations/1792300000000-CompliancePhase3.ts`, class `CompliancePhase31792300000000`, follows the previous document migrations. It adds:

- `compliance_agreement`: drafts and manager configuration.
- `compliance_agreement_version`: immutable published snapshots.
- `compliance_agreement_assignment`: unique per agreement/Vendor, scoped version and application provenance.
- `compliance_acknowledgment`: immutable version-specific explicit evidence.
- `compliance_exception`: scoped manager decisions and revocation evidence.

Foreign keys, indexes, uniqueness and triggers protect Market/version relationships, acknowledgment/assignment identity, application provenance and immutable evidence. Published versions and acknowledgments cannot be rewritten or deleted. Assignment identity cannot be silently reassigned. The migration is forward-only. No existing migration, document, review or Vendor state is rewritten. Normal synchronization remains disabled. Verification migrated only owned disposable databases.

Protected Admin query:

```graphql
query Advanced($input: JSON!) {
  ownAdvancedCompliance(input: $input)
}
```

Views are `catalog`, `agreements`, `agreement`, `upcoming`, `exceptions` and `report`. Inputs are bounded and parameterized. No manager-supplied Market ID grants authority. Existing `complianceDocumentCommand` adds `SAVE_AGREEMENT`, `PUBLISH_PREVIEW`, `PUBLISH_AGREEMENT`, `ARCHIVE_AGREEMENT`, `ASSIGN_AGREEMENT`, `ACKNOWLEDGE`, `GRANT_EXCEPTION` and `REVOKE_EXCEPTION`. The existing private file pipeline is unchanged. Schemas and typed named operations were regenerated through the existing source extraction/codegen workflow.

## UI reuse and local files

No new UI primitive or competing design category was introduced. The existing AdminShell/DashboardFrame, Card, Button, Dialog, Field/Input/Textarea, Checkbox, SEL-03 SelectField, DDN-03 native disclosure, Tabs, DataTable, Pagination, Alert, EmptyState, read states and `@market/ui/document-status` are reused. Unknown stays neutral with readable explanations; incomplete/expired/rejected stay danger; pending/expiring stay warning; Ready stays success. An exception/waiver is labeled separately. No breadcrumb, numbered decorative section, uppercase subheading or custom select menu was added.

New feature compositions `Agreements.tsx`, `ComplianceReports.tsx` and `ComplianceGuidance.tsx` own workflow controllers because existing shared primitives do not provide agreement versioning, report querying or source catalogs. They compose approved components rather than duplicate them. `UpcomingReadiness` is reused inside the existing compliance overview. Shared changes are limited to domain status meanings and the narrower file-adapter type. Root design approvals are unchanged.

| Repository            | Created or extended files                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend domain        | `src/plugins/documents-compliance/{advanced,advanced-notifications,agreement-workflow,catalog}.ts`; existing `service.ts`, `workflow.ts`, `summary.ts`, `model.ts`, plugin and API |
| Backend migration     | `src/migrations/1792300000000-CompliancePhase3.ts`                                                                                                                                 |
| Backend verification  | `test/documents-compliance/{phase3,run}.ts`; `test/market-operations/harness.ts`; `scripts/documents/notifications.ts`                                                             |
| Frontend Documents    | `apps/admin/src/documents/{Agreements,ComplianceReports,ComplianceGuidance}.tsx`; existing workspace/overview/CSS                                                                  |
| Frontend integrations | Market Operations date link; notification preference labels; narrowed application file adapter and shared upload/share type                                                        |
| Frontend API          | `packages/api/src/compliance-phase3.ts`; Documents/notification adapters, errors/index, named operation, generated Admin schema/types/provenance                                   |
| Frontend verification | `tests/compliance-phase3.test.tsx`; `tests/e2e/compliance-phase3-live.spec.ts`; dedicated Playwright config/script; existing Documents/notification mocks                          |
| Documentation         | This guide; Phase 1/2A/2B forward links; root component usage note                                                                                                                 |

## Local startup and accounts

From `E:\coding\farmers-market-platform-web`, use the existing local account configuration described in the Phase 2A guide. Its bridge key stays server-only and is never printed by setup. Keep the normal API port 3000 free or stop your own existing backend before starting a disposable demo.

```powershell
# Terminal one: creates an owned vendure_test_documents_* database and uses real ClamAV
npm run documents:scanner:health
npm run demo:documents

# Terminal two
npm run demo:market-operations:admin

# Terminal three, for public application regression
npm run demo:market-operations:storefront
```

Open [Admin](http://localhost:4322). Use Administrator username sign-in. Synthetic password for all demo accounts: `local-identity-regression-only-password`.

| Account                            | Purpose                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `market-a@test.invalid`            | Manual Market A, Phase 3 rules and multi-day event                             |
| `market-b@test.invalid`            | Independent Market B with separate required rules and Phase 2A automation      |
| `identity-owner-0@test.invalid`    | Vendor A, shared records, acknowledgment history and outstanding revised rules |
| `identity-owner-1@test.invalid`    | Vendor B, separate business authority                                          |
| `documents-owner-c@test.invalid`   | Existing third document fixture business                                       |
| `documents-applicant@test.invalid` | Applicant Orchard, conditional acceptance and separate membership workflow     |

The demo prints fresh Market A/B application URLs on each run. Use those exact current slugs for public application checks. The backend encryption key is process-local, so this dataset is disposable. Do not reuse it after the process/key is lost. Tests retain failed owned databases for diagnosis; none is a protected development database.

## Manual acceptance

1. **Future dates:** As Market A open Documents, Readiness and reports, choose the Phase 3 multi-day event or a date preview. Filter Vendor A and the Phase 3 insurance requirement. Expiration is inclusive; a date after its expiration is incomplete. The fixture also demonstrates a future issue date and revoked sharing. Explicitly share a replacement in Vendor Documents, review it as the manager, and reapply the report filters.
2. **Exception:** Record date exception from a Vendor row, select the affected assignment, dates and a reason. For an event-specific exception keep that event selected. The row identifies exception-based clearance. Review manager exceptions, supply a revocation reason and verify the underlying issue returns. Existing participation and reviews do not change. The fixture includes active, revoked and expired decisions.
3. **Create policy:** Open Agreements, Create agreement. Choose a template, customize title/type/content and collection settings, then Save draft. Open it, Preview publication and publish. No Vendor is assigned merely by saving or publishing. Select eligible Vendors and Request acknowledgment.
4. **Acknowledge:** Sign in as Vendor A, open Documents, Agreements and read the requested full version. The checkbox starts unchecked. Explicitly acknowledge, then inspect history from both Vendor and manager accounts.
5. **Revision:** Edit the draft and preview publication. Select Request this version again from existing assigned vendors. Publish and verify the old acknowledgment is preserved and the new version is outstanding. Repeat with that choice off; the prior assigned version remains valid.
6. **Automation:** Keep Market automation off in Requirements, create/publish an automatic agreement and trigger its supported future lifecycle event. No request is created. Manual assignment still works. Enable the existing switch, use a new eligible application/acceptance/membership transition and verify one assignment across retries. Creation and publication never backfill historical Vendors.
7. **Reports:** Exercise all five report types, Vendor/status/category/requirement/date/expiry filters and paging. Export matching CSV and compare it with the authorized dataset, including more than one page. Larger than 5,000 results must require narrower filters.
8. **Multiple Markets:** Acknowledge A's rules and verify B's remain outstanding. Try another business's assignment/version and another Market's policy/event through the API. Requests must be denied. Switch accounts and verify the previous workspace's policy/draft is gone.
9. **Guidance:** Choose Texas under Templates and guidance. Inspect both official links and verification date. Customize a suggestion in the existing requirement dialog. Choose Other jurisdictions and verify missing coverage without invented obligations.
10. **UI:** Repeat at mobile/desktop widths. Use keyboard navigation for tabs, version selection and the unchecked acknowledgment control. Read long plain-text policies, scroll wide reports and exercise empty/error/retry states.

## Automated verification

Run from the frontend root:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npm run test:documents
npm run test:documents:live
npm exec -- vitest run tests/compliance-phase3.test.tsx tests/documents.test.tsx tests/notifications.test.tsx
npm run typecheck
npm run build:production-local

# With the disposable demo and frontend running
$env:PHASE3_DISPOSABLE_DEMO='true'
npm run test:e2e:compliance-phase3
$env:NOTIFICATIONS_DEMO='1'
npm run test:e2e:notifications
$env:DOCUMENTS_APPLICATION_B_URL='REPLACE-WITH-CURRENT-PRINTED-B-APPLICATION-URL'
npm exec -- playwright test --config playwright.documents.config.ts
```

Actual results on October 15, 2026:

- Mock-scanner/backend security suite: 72 checks passed; the successful database was dropped. Includes a 21-row export matching a 20-row visible page.
- Real ClamAV/backend security suite: 70 checks passed, including the 21-row export proof, one-time application provenance binding and unpublished-title privacy. Real PDF uploads and harmless EICAR detection passed with ClamAV 1.4.6, signatures 28154; its successful database was dropped.
- Focused Documents/notifications/Phase 3 frontend: 46 tests passed, including malicious markup, explicit confirmation, version mismatch display, publication preview, manual defaults, coverage and server-owned filters. The final focused run including Market Operations and account switching passed 58 tests.
- Phase 3 Chromium: four passed at 390px and 1280px. Existing Documents/application Chromium: four passed. Existing notification dashboard Chromium: four passed. All 12 passed with scoped Axe checks and no viewport overflow. Generated screenshots were inspected; a dense mobile report was refined into a compact readiness table.
- Frontend TypeScript and Astro: 84 Astro files, zero errors/warnings/hints. Backend source and Documents tooling TypeScript passed. Source schema extraction and GraphQL codegen passed.
- Local synthetic production-profile frontend and backend dashboard/server/worker builds passed. Existing large-chunk/framework advisories remain.
- Targeted changed-file ESLint and nine-workspace source boundaries passed. Full ESLint reports six errors and two warnings in unchanged `InvoiceTable.tsx`, `market/schedule.tsx` and shared `dialog.tsx`; those files have no local diff and were not rewritten.
- Full frontend suite: 448 passed, four failed, in 35 files. Two `market-c5.test.tsx` cases use an ambiguous Vendor business label matching both combobox and listbox. Two `market.test.tsx` cases expect older operation-status text and a Workspace unavailable view after grant loss, while the current UI returns the personal-account view. Those existing test/production files have no local diff in this task. The full suite is not claimed green. Full-repository formatting also identifies six untouched legacy files; changed Phase 3 files pass targeted formatting checks.

Expected denied multipart tests log a safe forbidden error. The pg driver emits its existing concurrent-query deprecation warning. Initial sandboxed loopback scanner attempts failed before checks; the authorized local-network runs above passed. No unrun test is counted as passed.

## Limits and remaining production work

Verified legal guidance covers only two topics in Texas and requires ongoing official-source review. No other jurisdiction is inferred. Historical approval reconstruction, formal electronic signatures, OCR, legal enforceability decisions and automatic enforcement are deliberately unsupported.

The existing workspace still limits its eligible Vendor/request selectors to 500 and document requirements to 100. Agreements are capped at 100 definitions per Market; lists, assignments, history, exceptions and report rows are paged at 20. Version selection exposes the latest 100 authorized versions. The event selector shows 20 upcoming dates and later dates remain available through explicit previews. The Vendor overview is a compact five-date forecast. Reports query the complete authorized filtered scope and exports have an explicit 5,000-row cap. These bounds do not grant larger-dataset migration or new scheduling authority.

The new scheduler uses the existing console delivery retry/at-least-once semantics, not exactly-once delivery. Retention, outbox monitoring, database capacity review, production storage/key backup and rotation, HTTPS/origin validation in the intended environment, official-source maintenance and manual assistive-technology acceptance remain operational responsibilities. Normal migration rollout must be reviewed against the explicitly selected database; this task only exercised disposable databases. The unrelated full-lint and four broad-suite failures above remain visible limitations of the current workspace verification.
