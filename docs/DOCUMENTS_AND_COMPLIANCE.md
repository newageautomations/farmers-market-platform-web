# Documents and compliance, Phase 1

Phase 3 extends the existing projection with Market-date forecasts, scoped manager exceptions, versioned digital agreements, advanced templates, reports/CSV and a small verified optional guidance catalog. See [Phase 3 implementation and local testing](DOCUMENTS_COMPLIANCE_PHASE_3.md). The future-date and geographic-guidance deferrals below describe the original Phase 1 scope and are superseded by that guide; file storage, scanning and explicit sharing retain their authority.

Phase 2B adds opt-in console notifications, notification preferences in Settings, daily expiration checks and dashboard compliance summaries. See [platform notifications and dashboard compliance](PLATFORM_NOTIFICATIONS_PHASE_2B.md) for architecture, local commands and verification. The Phase 1 expiration-reminder deferral below is now implemented through that shared platform foundation.

Phase 2A now integrates applications, opt-in automation and backend documentation readiness. See [application integration](DOCUMENTS_PHASE_2A_APPLICATION_INTEGRATION.md) for controls, migration, authorization, testing and the four-Vendor/two-Market disposable demo. Existing Markets and requirements remain manual until enabled. Real local ClamAV/EICAR and applicant-upload tests passed October 15, 2026; the earlier scanner-unavailable results below describe the initial Phase 1 verification only.

This feature adds private Vendor and Market document libraries, reusable saved documents, market requirements and assignments, per-submission review, independent sharing grants, and manually entered expiration dates. Documentation readiness never changes vendor acceptance, application outcomes, orders, payments or attendance. There is no legal determination, document intelligence, OCR or automatic date extraction.

Implementation is local across `farmers-market-platform-web` and the explicitly authorized sibling `farmers-market-platform`. No deployment, hosting, remote Git action or third-party document service is involved.

## Architecture and ownership

The backend uses `src/plugins/documents-compliance/`, registered in the normal Vendure configuration. `service.ts` reuses `TenantAccessPolicy`, current native Channel grants, active business membership and the existing Market/Vendor models. Every operation determines ownership from the authenticated current Channel. IDs and client-selected role names never grant access. Shop API customers have no document endpoints.

The current backend has Market-scoped management memberships, rather than a shared management-organization tenant. Manager libraries therefore belong to a single Market. Even the same principal managing two markets gets separate libraries and separate permissions. Vendor libraries belong to the Vendor business, not the uploading user. Vendor staff with existing read authority can read their business library; writes require current owner authority and `ManageOwnStorefront`. Market writes require `ManageOwnMarketMemberships` in addition to active Market management membership and native Administrator identity. Read-only market managers cannot review or mutate documents.

The Admin feature uses `apps/admin/src/documents/DocumentsWorkspace.tsx` for both roles inside the existing `AdminShell` and `DashboardFrame`. It reuses Button, Input, Select, Field, Card, Dialog, Alert, Badge, Tabs, DataTable, Pagination, Spinner and EmptyState from `@market/ui`. Cards follow the existing layout-card structure: safe placeholder, title, status and actions. There is no new UI library, authentication system or dashboard shell. The upload warning and forms are feature-level compositions because no existing component implements the document policy, metadata and private scanning flow. They do not establish a new shared primitive or approve a pending UI category.

Named GraphQL operations live in `packages/api/operations/documents.graphql`. The typed API adapter handles cookie credentials, the exact current Channel token, multipart upload and authority invalidation. UUID inputs use GraphQL `String`, because native Vendure `ID` decoding uses the project's numeric entity ID strategy. Switching accounts unmounts the prior document workspace; old async reads cannot update the replacement workspace.

## Database migration

The additive, forward-only migration is `farmers-market-platform/src/migrations/1792000000000-DocumentsCompliance.ts`. Normal backend startup discovers it through the existing migration mechanism, with synchronization disabled. No migration was applied to the protected `vendure` database during implementation; tests use owned `vendure_test_documents_*` databases.

| Table                    | Purpose                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `compliance_document`    | Exactly one Vendor or Market owner, current metadata, revision, soft deletion and timestamps                          |
| `compliance_file`        | Immutable version metadata, private object key, SHA-256, MIME, size, uploading principal and scan status              |
| `compliance_requirement` | Market requirement, allowed category, instructions, stage, due date, required/optional, approval and expiration rules |
| `compliance_assignment`  | Unique requirement/vendor assignment and waiver state                                                                 |
| `compliance_submission`  | Explicitly submitted file version and metadata snapshot; independent market review state                              |
| `compliance_grant`       | Per-submission grant with revocation timestamp                                                                        |
| `compliance_review`      | Append-only decision, reason, responsible principal and timestamp                                                     |
| `compliance_audit`       | Append-only upload, replacement, edit, download, delete, sharing, revocation and review events                        |
| `compliance_rate`        | Durable per-principal rate windows shared across processes                                                            |

Composite foreign keys bind submissions to the assignment's vendor and market, the document's owning vendor, and a file version of that exact document. Uniqueness prevents duplicate assignments. Foreign keys restrict removal of audit subjects. Triggers prevent rewriting file identity/content metadata, submission snapshots, review history and audit records. File scan status transitions only from Scanning to Available, Rejected or Scan Failed. Owner, assignment, version, grant and access paths are indexed. SQL uses parameterized queries through the current Vendure transactional manager. Authorization predicates are applied in every data-access path; this follows the existing server-authority model and does not introduce public database access or database RLS.

## Private storage and downloads

The existing Vendure asset server is public, so compliance files must not use it. The small dedicated storage adapter writes AES-256-GCM encrypted files to the backend's ignored `.runtime/private-documents/` by default. A unique random nonce and server-controlled UUID object key are generated for every version. Filesystem permissions are restricted where the operating system supports them. On Windows, restrict the directory and configuration file ACLs to the backend service/developer account. Back up encryption keys separately and protect encrypted backups with equivalent access controls.

`DOCUMENT_ENCRYPTION_KEY` is a 32-byte random key encoded as 64 hex characters. Missing or invalid keys prevent uploads and downloads; other application features can still start. Never put it in frontend, `PUBLIC_` or `VITE_` variables. Losing this key loses access to stored files. Key rotation and external object storage are outside Phase 1.

The configurable storage directory must be absolute and cannot be under a `static`, `public`, `assets` or `dist` path. There is no static file route, storage-key API, public object URL or bearer download link. `downloadComplianceDocument` authorizes each request, checks Available status and current sharing permissions, decrypts and verifies the content hash, audits the access, and returns at most 10 MB of file bytes encoded in the authenticated response. The browser creates a temporary local Blob and requests an attachment download with `application/octet-stream`, then revokes that Blob URL. It never renders uploaded HTML, images or active PDFs inline. All previews are placeholders.

Production uses the project's existing required HTTPS transport for API/browser traffic; this integration does not add an HTTP exception. Local development uses loopback HTTP. The ClamAV protocol has no TLS or authentication and must remain on the same private host or isolated container network.

Deleting a document immediately blocks all versions and revokes grants. Encrypted file objects are removed after the database transaction; basic review and audit history remain. Backups and copies previously downloaded outside the application cannot be recalled. If filesystem removal fails, authorization still denies the file, and an operator must finish removing the encrypted object. Interrupted scans can leave encrypted, inaccessible objects with Scanning status; there is no automatic garbage collector in this phase.

## Upload validation and scanning

Only PDF, JPG/JPEG, PNG and WebP are allowed, at most 10 MiB (10,485,760 bytes) each. Actual headers are inspected with the established `file-type` library, using a bounded 4,100-byte header; extensions must agree with detected MIME. Browser MIME is ignored. Archives, scripts, executables, SVG, text and mismatched files are rejected. Filenames with path separators/control characters are rejected; filenames are display metadata only. Empty files and invalid metadata are rejected. Signature detection identifies format rather than proving complete semantic correctness; no untrusted content is executed or decoded for previews.

The upload body is read with a 10 MiB cap and 15-second deadline. The existing native Vendure multipart parser retains its own outer limit. A non-simple `Apollo-Require-Preflight: true` header is required; existing production browser-origin/CSRF and session protections remain in force. Upload authorization is checked before content buffering and again before publication. Two uploads/scans per backend process are permitted, with no unbounded queue. Durable limits are 20 uploads per principal per 15 minutes, 90 commands per minute, 180 reads per minute and 30 downloads per minute.

The pipeline is:

1. Authenticate and resolve the active business/market and current write permission.
2. Validate metadata, format and size; write encrypted quarantine bytes and a Scanning version record.
3. Stream the same immutable bytes through ClamAV INSTREAM. The scanner receives no storage path or user filename.
4. Require PING/PONG, a parseable loaded signature timestamp within the configured age, and exactly `stream: OK` for the complete scan.
5. Reauthorize and commit Available in a short transaction. Until then, every download/share path rejects that file.

Timeouts, refused connections, malformed/truncated/oversized replies, stale signatures, scanner overload, detections, encrypted documents and scanner limit alerts all fail closed. Failure records show Rejected or Scan Failed, and quarantine objects are removed. A failed replacement leaves the earlier scanned version available; it never relabels the replacement safe. There is no development scan bypass or environment switch for a fake scanner. Test doubles are assigned only to disposable test service instances.

## Official ClamAV Docker setup

Use Docker Desktop with Linux containers and Compose v2. Native ClamAV installation is unnecessary. Allocate at least 4 GiB to the scanner and enough additional memory for PostgreSQL and the application. The existing backend `docker-compose.yml` includes `clamav/clamav:1.4_base`, the maintained official LTS feature-release image. The feature tag receives patch updates; review and pull image updates regularly. See [official Docker instructions](https://docs.clamav.net/manual/Installing/Docker.html) and [the vendor's support policy](https://docs.clamav.net/faq/faq-eol.html).

The scanner publishes only `127.0.0.1:3310:3310`, because the existing backend runs natively on Windows. Never change that binding to `0.0.0.0`, forward the port, route it through a public proxy or open it to the LAN. If the backend is later containerized, connect it to the same private Docker network using `CLAMAV_HOST=clamav` and remove the host port mapping. Scanner host validation allows only loopback, RFC1918 IPv4 addresses or that explicit Compose service name.

The named `clamav_signatures` volume persists `/var/lib/clamav`. The official entrypoint initializes missing signatures before clamd can run. FreshClam remains enabled and checks 12 times daily. Outbound signature downloads are required; the scanner's incoming port remains private. Do not disable FreshClam or remove the signature volume during routine shutdown. A Docker PING healthcheck waits through initialization; the backend/helper also verifies signature age, so a responsive daemon with stale definitions is still rejected.

Configured scanner limits: 10 MiB stream/file, 30 MiB total expanded scan, 8 recursion levels, 100 files, 2 threads, queue size 4, 20-second engine scan limit, 4 GiB memory, 2 CPUs and 128 PIDs. `AlertExceedsMax` and encrypted-document alerts prevent skipped or limited scans from becoming clean results. The client applies a 30-second total deadline across readiness and scanning. FreshClam and engine startup may take several minutes, especially on the first run.

From the open frontend folder:

```powershell
npm run documents:configure
npm run documents:scanner:up
npm run documents:scanner:health
```

The configure command writes a random key to the sibling backend's ignored `.env.documents.local`, with exclusive creation so it never overwrites a key. It does not print the key. The backend reads this file with no override of existing environment values. Preserve it across restarts. It is separate from the frontend environment and account bridge.

These commands also exist directly in the backend. `npm run dev` and `npm run dev:server` there run scanner startup first. The frontend's `npm run demo:market-operations:serve` also waits for the scanner before starting the normal demo backend. Fixture-only frontend development retains its existing scanner-free behavior because fixture mode has no document service. Ordinary `npm run dev` in the frontend still starts only the two frontend apps, so start the backend separately as before.

Health and maintenance:

```powershell
npm run documents:scanner:logs
npm run documents:scanner:health
npm run documents:scanner:update
npm run documents:scanner:up
npm run documents:scanner:stop
```

`update` pulls the official image; the subsequent `up` recreates it while preserving signatures. `stop` stops only the scanner and preserves its volume. Equivalent backend diagnostics are `docker compose ps clamav`, `docker compose logs --tail 100 clamav`, and `docker compose exec clamav clamdscan --ping 1`. Inspect FreshClam download/update messages if startup or health fails. An OOM kill often means insufficient Docker memory. A signature-download rate limit requires waiting for the mirror's retry time, not repeatedly destroying the volume. A failed health command exits nonzero and never enables uploads.

| Backend environment              | Default / requirement                                                   |
| -------------------------------- | ----------------------------------------------------------------------- |
| `DOCUMENT_ENCRYPTION_KEY`        | Required for file access; 64 hex characters                             |
| `DOCUMENT_STORAGE_DIRECTORY`     | Absolute private path; defaults to backend `.runtime/private-documents` |
| `DOCUMENT_VENDOR_TIMEZONE`       | `America/Chicago`; valid IANA timezone                                  |
| `CLAMAV_HOST`                    | `127.0.0.1`; private endpoint only                                      |
| `CLAMAV_PORT`                    | `3310`                                                                  |
| `CLAMAV_TIMEOUT_MS`              | `30000`; bounded from 100 to 60000                                      |
| `CLAMAV_MAX_SIGNATURE_AGE_HOURS` | `72`; bounded from 1 to 168                                             |

Docker is suitable for this architecture, so no alternative scanner or native installation is required. Docker was not installed or discoverable on this implementation machine. Docker configuration and real signature initialization/EICAR scanning remain explicitly unverified until the live commands below are run on a Docker-enabled machine. This does not enable a permissive fallback.

## Requirements, sharing and review

The supported categories and optional starting templates are General Liability Insurance, Food Handler Certificate, Food Manager Certificate, Health Department Permit, Cottage Food Documentation, Mobile Food Vendor Permit, Organic Certification, Nursery/Floral License, Sales Tax Permit, and Market Rules Acknowledgment. They are convenience labels, not statements of legal necessity.

Managers customize names/instructions, required/optional, stage, due date, approval requirement and whether an expiration date is required. Assignments use current pending/approved Vendor-to-Market relationships or the Phase 2A verified applicant/start scope described in the integration guide. Suspended/withdrawn relationships and inactive businesses remain excluded from document access. A requirement can target selected associated vendors or all currently associated vendors. The explicit market-wide synchronization action assigns those requirements to newly associated vendors and deduplicates existing assignments. No automatic classification or legal rules engine exists.

Vendors deliberately choose a compatible Available saved document or upload a new one for a specific request. A successful new upload is first saved privately; if sharing fails, it remains available in the library and can be selected without uploading again. Submission metadata and file version are pinned. A replacement or metadata edit does not rewrite earlier submissions. Multiple markets can reuse the same file without creating additional file objects. Review outcomes remain independent. Requirements that do not require approval produce an Approved submission immediately after explicit sharing, while expiration is still evaluated separately.

Review statuses are Missing, Pending review, Approved, Rejected, Expired, Waived and Access revoked. Missing is an unfulfilled assignment rather than a fake file. A manager must give a rejection or waiver reason, with their principal recorded. Restore requirement removes a waiver. Approval of an expired submission is refused. A rejection can be followed by another saved-document selection or upload. Vendor cards list market grants; revocation prevents all new authorized downloads for that grant. Delete revokes all grants for the document.

The readiness table counts outstanding required assignments, pending reviews, approved/rejected/expired submissions and expiring-soon dates per associated vendor. A vendor is ready only when every required assignment is Approved or Waived. No required assignments is reported explicitly. Optional requests do not block readiness. A truncated response never claims complete readiness.

## Expiration

Expiration and issue dates are strictly validated ISO date-only strings. The uploader must enter an expiration date or select This document does not expire. Contradictory dates are refused. Metadata and submission dates are never extracted or independently verified.

An expiration date remains valid throughout that business-local day. A date before today is Expired; dates through today plus 30 days are Expiring Soon; later dates are Valid. No-expiration is separate. Manager libraries and submission readiness use the Market's existing IANA timezone; Vendor library display uses the configured business default. Cross-market review evaluates the same saved date in each market's timezone. Automatic validity against a future attendance date and notification reminders are deferred.

## Sensitive information policy

Every file picker, including replacement and upload-for-request, is preceded by a visible shared warning composition. It prohibits SSNs, W-9/tax forms, driver's licenses, passports, bank statements, payment information, medical records and other sensitive personal or financial information, and explains market-manager access. The warning stays in the dialog on narrow screens and is never a tooltip.

The server permits only the supported categories and rejects identifiable prohibited descriptions/names in document and requirement metadata. Names are not a permission to collect prohibited information. These checks and warnings cannot detect sensitive content in arbitrary files; there is deliberately no OCR or AI inspection. Owners should use Delete immediately for prohibited content. Authorized operators must follow the private storage removal and backup procedures above when handling reports. Managers should ask the owning vendor to remove content rather than redistribute it.

## Local test accounts and workflows

The existing normal demo accounts and local account switching still work. Configure the encryption key, initialize the scanner, and apply the additive migration through the normal explicitly selected development database workflow before using Documents. The persistent demo's serve command deliberately refuses pending migrations; it never upgrades the database silently. Do not reset an existing dataset simply to test this feature. The isolated document demo below provides a separate choice.

```powershell
npm run demo:documents
```

This requires Docker and local PostgreSQL configured as the existing backend tests expect. It creates a fresh owned `vendure_test_documents_*` database, reuses existing account/market fixtures, adds a third Vendor through the normal provisioning services, runs real ClamAV checks and seeds document states, then serves the API on port 3000 until Ctrl+C. Preserve an already-running backend by stopping it yourself or use the existing normal demo instead. No protected database is reset. The fixture encryption key exists only in that process; after shutdown this dataset is disposable.

Start the frontend separately with its existing live-mode account configuration:

```powershell
npm run dev
```

Open the Admin at `http://localhost:4322`, use the existing Administrator sign-in method, and select the intended native workspace. The disposable fixture uses synthetic accounts `identity-owner-0@test.invalid`, `identity-owner-1@test.invalid`, `documents-owner-c@test.invalid`, `market-a@test.invalid`, and `market-b@test.invalid`, with password `local-identity-regression-only-password`. These are test-only accounts, not production credentials. The current model has two independent Market management tenants, not a shared management organization.

Manual acceptance scenarios:

1. **Vendor upload:** Open Vendor Documents, Upload document. Verify the sensitive-information warning appears before File. Upload a clean insurance PDF with a manually entered expiration. Upload a rules image with no expiration. Confirm cards, dates, Available status and authorized attachment downloads.
2. **Manager requests:** Switch to Market A, Documents, Requirements, Request documents. Select an optional starting category, customize the name/instructions/stage/due date, and assign to an associated vendor. Check Vendor compliance. Add another associated vendor to the same requirement; repeated assignment must not duplicate it.
3. **Saved reuse:** Return to that Vendor's Market requests. Choose saved document, select the insurance certificate and explicitly Share with Market A. Verify Pending review without a second file upload.
4. **Review:** In Market A Vendor compliance, download the submitted file, verify the manually entered date, and approve. Reject another submission with an explanation. Verify the vendor sees that explanation and can submit a replacement or another saved document. Test a waiver with its mandatory reason and Restore requirement.
5. **Multiple markets:** Request the same category in Market B. Explicitly share the saved document there. Approve or reject B independently and verify A's decision stays intact. Before sharing with B, B must not download A's file.
6. **Expiration and versions:** Upload a past date, a date within 30 days, and no-expiration. Confirm their statuses. Replace the expired file. Previously submitted versions and dates must remain in review history until the vendor explicitly submits the replacement.
7. **Security and failure:** Try another vendor's file ID, a file shared only with a different market, and an assignment from another market. Each must be refused. Revoke a grant and retry downloading. Verify ZIP, executable, mismatched extension, and files over 10 MiB are refused. Stop the scanner, attempt a supported clean upload, and confirm Scan Failed with no download. Restart the scanner and check health before retrying.

## Automated checks and actual results

```powershell
# From the frontend folder
$env:FRONTEND_NO_EVIDENCE = 'true'
npm test -- tests/documents.test.tsx
npm run test:documents
npm run test:documents:live
```

`test:documents` runs isolated protocol/validation/storage tests plus real HTTP multipart upload, download, sharing and review operations against a fresh local PostgreSQL database, with the scanner mocked on that test instance only. `test:documents:live` runs those operations against real ClamAV instead. It scans the harmless standard EICAR antivirus test string from memory and asserts rejection; no real malware is used and no EICAR file is written to disk. The protocol suite tests framing and scanner failure responses using a local TCP test double. A format-rejected EICAR `.com` upload alone would not prove malware scanning, so direct real-scanner EICAR detection is tested separately.

Actual verification on October 14 and 15, 2026:

- Backend suite: **29 checks passed**, including real HTTP uploads/downloads, encrypted storage, tenant isolation, manager-library scope, independent reviews, pinned replacements, revocation, unscanned-file denial, mocked malware failures, actual scanner connection refusal, expired approval refusal and immutable review history. The successful owned database was dropped. Earlier failed test databases were retained by the existing diagnostic convention; none is the protected development database.
- Frontend document, Admin and Vendor suites: **69 tests passed**, including all eight document-specific tests. The navigation expectation was updated for the new Documents entry.
- Frontend typecheck and Astro check: passed, with 82 Astro files and zero errors, warnings or hints.
- Local production-profile frontend, backend dashboard, server and worker builds: passed using the existing synthetic build-only environment. No production service was started. Build output contains the existing large-chunk advisory.
- A wider Market regression run reported **two existing failing assertions outside the document feature**: operation status-label text, and the account view expected after revoking all Market grants. Both failures were reproduced with the original HEAD version of AdminApp, without its document integration. Those unrelated behaviors were not changed by this task.
- Docker startup command: exited nonzero with a clear Docker-required message because the executable is absent. **Real image startup, signature downloads, actual ClamAV clean-file scanning and EICAR detection remain unverified.** Live tests fail closed when that dependency is missing. No production-readiness claim is made.

Targeted lint, schema/code generation and backend TypeScript compilation also passed during implementation. The broader Market failures and live-scanner limitation require separate verification before release.

## Changed local files

- Backend feature: `src/plugins/documents-compliance/{documents-compliance.plugin,api,service,model,scanner,storage}.ts`, the additive `1792000000000-DocumentsCompliance` migration, and `test/documents-compliance/`.
- Backend setup: `docker-compose.yml`, `src/vendure-config.ts`, `scripts/documents/`, package scripts/lockfile, ignore rules and README. `file-type@21.3.4`, already present transitively, is now a pinned direct dependency. The build refreshed `src/gql/graphql-env.d.ts` for the new contract.
- Frontend feature: `apps/admin/src/documents/`, the Documents connection in AdminApp/AdminShell, navigation and its icon, the named API adapter and GraphQL operations, generated Admin schema/types and schema extraction/codegen configuration.
- Frontend setup and verification: `scripts/documents.ts`, the existing demo startup helper, package scripts, `tests/documents.test.tsx`, the Vendor navigation expectation, README, component usage guidance and this document. No customer, checkout, payment or ordering source was edited.

## Limits and later phases

The library is paged in groups of 20 documents. Each card shows the most recent 50 file versions and 100 market grants; audit records remain in the database. Each market supports 100 requirements. The compliance view and market-wide assignment support at most 500 vendors/assignments; truncation is explicitly flagged. Expand these bounded views with proper pagination before larger deployments. Market-wide requirements keep explicit synchronization for existing Vendors. Phase 2A can opt into lifecycle assignment for future applicants and acceptances; both Market and requirement defaults remain manual. Requirement retirement/editing after creation, automatic quarantine cleanup, key rotation, distributed scanner autoscaling, object storage and legal retention holds are not implemented.

Production acceptance still requires real ClamAV/Docker verification, secure service-account ACLs, persistent encrypted-volume and key backups, HTTPS/origin/session verification in the intended environment, and manual browser/mobile/assistive-technology acceptance. The system does not guarantee that a clean file is free of all malware or prohibited sensitive content.

Phase 2/3 may add scoped future-date readiness, retention administration and operational integrations under separate authorization. OCR, AI analysis, geographic legal rules, government/insurance verification, e-signatures, automatic attendance blocking and tax/identity/banking document collection remain outside this feature.
