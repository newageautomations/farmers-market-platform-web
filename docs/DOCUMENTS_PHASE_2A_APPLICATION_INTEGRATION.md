# Vendor application and documentation integration

Phase 3 reuses this Market automation switch and lifecycle assignment hooks for digital agreement requests. Current readiness now combines assigned acknowledgments and document requests, while date-specific reports add scoped forecasts and exceptions. Application acceptance and participation remain separate. See [Phase 3 implementation](DOCUMENTS_COMPLIANCE_PHASE_3.md) for configuration, migration and tests.

Phase 2B now uses the authoritative assignment/review transitions described here to publish committed platform events, with opt-in console delivery and dashboard summaries. See [platform notifications and dashboard compliance](PLATFORM_NOTIFICATIONS_PHASE_2B.md). The historical Phase 2B recommendations at the end of this guide are superseded by that implementation.

Implemented locally on October 15, 2026, across the frontend and backend repositories. No deployment, remote Git change, provider notification, protected database reset or historical requirement backfill was performed.

## Architecture inspected and retained

Applications remain versioned Market Operations forms with immutable answer/identity snapshots. The Astro application uses the existing request-local Shop session, account preamble and optional verified Vendor selection. Managers retain the form builder and independent application, date and rental decisions.

Application statuses remain DRAFT, SUBMITTED, UNDER_REVIEW, NEEDS_INFO, WAITLISTED, ACCEPTED, DECLINED and WITHDRAWN. Acceptance creates/reuses a directory business and can verify its link from applicant provenance. It does not create Market Vendor membership or participation. Membership request/approval remain separate services.

Phase 1 still owns saved documents, file versions, private encrypted storage, ClamAV, explicit Market sharing grants, independent reviews, waivers and immutable audit records. There is no parallel upload/storage or onboarding-compliance system. Current tenant grants and account switching remain authoritative.

## Manager automation controls

Open Market Documents, Requirements. The Market switch defaults off, including for existing Markets. Use **Enable automatic requests** explicitly. Enabling it does not distribute historical requirements or deliver notifications. Each requirement additionally needs automatic distribution.

| Requirement configuration       | Result                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Manual                          | Only an explicit manager assignment or synchronization creates requests. Works while Market automation is off.                    |
| Application, automatic          | Creates requests when an authorized Vendor starts or submits an application.                                                      |
| After acceptance, automatic     | Assigns at application acceptance or a separate transition to approved Market membership.                                         |
| Before participation, automatic | Assigns at acceptance/membership approval; stage and optional due date describe when it is due. No attendance enforcement occurs. |
| On request                      | Manual only.                                                                                                                      |
| Required before submission      | Available only for required, automatic Application requirements. Otherwise documentation may remain outstanding.                  |

Automatic distribution applies to future eligible Vendors and requires Market-wide scope. Selected-Vendor requirements retain manual assignment. Existing requirements default to `automatic=false` and `submission_blocking=false`; no existing review, waiver or assignment is rewritten.

Creating an automatic requirement does not assign historical Vendors. A manual requirement's **Assign to all associated vendors now** is an explicit immediate action. The synchronization button previews affected Vendor/request counts, then requires confirmation. The server rechecks the count under the Market lock. A changed count requires a new preview.

## Application documents and submission

The form presents enabled automatic Application requirements, instructions, required/optional status, strict/outstanding policy and current submission status. Selecting a verified Vendor starts its requests without sharing anything.

The existing Phase 1 upload and saved-document dialogs are reused. A saved document must be explicitly selected and shared with this Market. A new upload is first saved privately using the same format/size checks, encryption and fail-closed scanner. Its sensitive-information warning remains before the file picker. If sharing fails, the saved upload can be reused.

The authoritative submission service checks strict collection, including direct API calls. A valid explicitly shared Pending review or Approved submission, or a waiver, satisfies collection. Missing, rejected, revoked, deleted and expired submissions do not. Manager approval need not finish before application submission. Assignment/document/grant locks protect validation against concurrent changes.

Nonblocking requests permit outstanding documents. An idempotent retry preserves an already committed submission. No action automatically shares the Vendor library.

## Pre-acceptance authorization and security

The Shop adapter derives Market identity from the request channel and published form. It rechecks the verified principal, current active Vendor owner membership, active business and channel grants. Writes also require the existing `ManageOwnStorefront` grant, reloaded before processing and after scanning. Cached sessions cannot preserve revoked write authority.

Existing assignments gain application/version provenance. An explicitly started application's assignment establishes Documents-only eligibility through a Market-matched version reference. A submitted authorized application also establishes narrow eligibility. No accepted membership or unrelated Market privilege is fabricated. Suspended/withdrawn Market relationships remain denied. These checks protect reads, explicit submissions, reviews and grant-based downloads.

Managers retain active tenant membership and existing permissions. Review links open the existing Documents workspace or preselected request dialog. Client-supplied Market labels/IDs never select a manager's tenant.

Vendure's existing multipart parser is reused. Before parsing, middleware validates the provisioned Market and non-simple preflight header. After parsing, the paired identity-plugin interceptor permits only a single `uploadApplicationCompliance` mutation before any resolver executes, including when the optional commerce plugin is absent. Mixed operations and unrelated native roots are refused. JSON operations retain the pre-authentication root allowlist. Storage, scanning, ownership, sensitive-category restrictions and version/history protections remain intact.

## Acceptance and backend readiness

The existing acceptance action now supports an optional **Accept conditionally while required documentation remains outstanding** flag. An additive boolean records that choice without another application status. Documents never reverse acceptance, reject an application, change attendance/bookings/payments or disable a business/storefront.

Backend summaries count total, complete, missing, pending, rejected, expired, expiring-soon and required outstanding requests. Approved/Waived satisfy mandatory requests. Optional outstanding requests do not block Ready; Expiring Soon stays valid today. Empty assignments are No requirements. Truncation is Incomplete view. Anonymous/account-only review records show Vendor identity needed rather than an invented compliance result.

Application review shows the counts, outstanding titles, readiness and detailed-review/manual-request links. Vendor Market requests include per-Market readiness. Rejection explanations and replacement sharing stay in the existing Documents workflow.

## Transactions, lifecycle and audit

`documents-compliance/workflow.ts` is called from authoritative application submission/acceptance and membership approval services inside their transactions. Assignment failure rolls back the enclosing transition. There is no polling or frontend-only acceptance hook.

The existing unique `(requirement_id,vendor_id)` constraint and `ON CONFLICT DO NOTHING` prevent duplicates across concurrent starts, retries, manual assignment and overlapping lifecycle triggers. Existing reviews, waivers and grants are preserved.

Assignments record source, creation time and optional application/version references. Immutable audit records capture assignment and configuration actions. Audit detail contains configuration values only. No file contents, storage keys, private URLs, encryption data or provider notifications are logged.

## Additive migration

Backend `src/migrations/1792100000000-DocumentsApplicationIntegration.ts` follows Phase 1 and existing application/identity migrations. It adds:

- `compliance_market_settings`, with automation off and optimistic revision.
- Requirement distribution/strict flags, default false; After acceptance stage and valid-combination constraints.
- Assignment source/provenance, tenant-matched application/version foreign keys and indexes.
- Application `conditionalAcceptance`, default false.
- Audit `detail`, default an empty object, preserving existing immutable records.

This migration is forward-only to preserve history. Synchronization remains disabled. Only owned `vendure_test_*` databases were migrated during verification. Normal backend server/worker startup discovers migrations through the existing guarded runner. Review the configured local database before starting it. Do not reset an existing dataset or run baseline adoption solely for this feature.

## API and UI reuse

Admin JSON commands gain SET_AUTOMATION, CONFIGURE_REQUIREMENT and SYNC_PREVIEW. SYNC requires the preview's `assignmentCount`. Existing reads add settings, readiness and assignment provenance. Requirement creation accepts the new flags; REVIEW_APPLICATION accepts conditional acceptance. Public application reads expose requirement metadata; manager application reads add document summaries.

Shop mutations: `applicationCompliance(input: JSON!)` supports START/READ/SUBMIT; `uploadApplicationCompliance(input: JSON!,file: Upload!)` reuses the upload service. Astro `/api/application-documents` applies same-origin checks, request-local cookies, bounded bodies and safe errors. Its Shop-only API adapter contains no Admin operations. Schema extraction and typed operations follow the existing code-generation workflow.

Reused standards: dashboard shell, Card, Dialog, Button, Field/Input, SelectField, Badge, Alert, Tabs, DataTable and Pagination. The upload/share compositions moved to `@market/ui/documents` because the public application cannot import the Admin controller. Warning and metadata fields are reused there too. No new primitive, UI library or competing design standard was created. Optional `Tabs.initialTab` supports a link into the existing workspace.

Inspection found Phase 1 already used the shared low-level Select foundation, not a separate custom legacy menu. All ordinary Documents selection sites now use approved SEL-03 SelectField: metadata category, requirement category/template, stage, initial Vendor selection, saved-document choice and additional-Vendor selection. New distribution controls use it too. The retained searchable directory combobox in application review remains approved SEL-07.

`@market/ui/document-status` centralizes BDG-02 tones: Ready/Complete/Approved/Available/Valid use success; Pending review/Expiring Soon/Scanning use warning; Incomplete/Missing/Expired/Rejected/Scan Failed/Access revoked use danger; Waived/No requirements use neutral. Text labels remain visible. No arbitrary colors or contextual overrides were added.

## Automated verification

From the frontend root:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
npm run test:documents
npm run test:documents:live
npm test -- tests/documents.test.tsx tests/market-application.test.tsx tests/market-operations.test.tsx tests/admin.test.tsx tests/vendor.test.tsx tests/ui-foundations.test.tsx
npm run typecheck
npm run build:production-local
```

The backend tests require loopback PostgreSQL; live tests additionally require healthy local ClamAV. They create guarded disposable databases, retain failed databases for diagnostics and drop successful ones. Scanner mocks exist only on the isolated service instance; there is no runtime bypass.

Actual October 15, 2026 results:

- Mock-scanner protocol/storage/HTTP/Phase 2A suite: **44 checks passed**, successful database dropped.
- Real ClamAV suite: **42 checks passed**, including the current-grant revocation case; the successful database was dropped. Clean files, harmless EICAR and real applicant uploads passed with ClamAV 1.4.6/signatures 28153.
- Existing application identity/acceptance suite: **17 passed**, successful database dropped.
- Documents/application/operations/Admin/Vendor/shared UI frontend: **108 tests passed** in the final combined run.
- TypeScript and Astro: **84 files, zero errors/warnings/hints**. Targeted ESLint and nine-workspace boundaries passed.
- Local synthetic production-profile frontend and backend dashboard/server/worker builds passed. Existing large-chunk advisory remains.
- Playwright: **4 passed** at 390px and 1280px, with no scoped Axe violations or page overflow. Checks include central sign-in/return to application, saved-document sharing, a valid PDF upload through the Astro adapter and real ClamAV, the visible warning and absence of nested forms. Screenshots were visually inspected.

Expected multipart-denial tests emit a safe forbidden error. The installed pg driver also emits its concurrent-query deprecation advisory. These outputs do not indicate failed assertions or notification delivery.

## Disposable demo and accounts

Use three terminals from the frontend root:

```powershell
# Terminal one
npm run documents:scanner:health
npm run demo:documents

# Terminal two
npm run demo:market-operations:admin

# Terminal three
npm run demo:market-operations:storefront
```

The existing ignored local account environment must contain `PLATFORM_ACCOUNT_ORIGIN=http://auth.platform.localhost:4321`, `ADMIN_ORIGIN=http://localhost:4322` and a shared server-only `PLATFORM_ACCOUNT_BRIDGE_KEY` of at least 32 characters. The demo helper forwards only that existing account configuration; it never prints the key or edits environment files. The demo uses the existing central login, verified-phone fixtures and test-only SMS transport, with payment/refund test actions disabled and no provider delivery.

Use these commands when port 3000 is free; do not stop an unrelated backend. The demo creates a fresh `vendure_test_documents_*` database, runs security checks and serves until Ctrl+C. Its encryption key is process-local, and the dataset is disposable. Normal exit cleans it up. No protected database is reset.

All synthetic accounts use `local-identity-regression-only-password`:

| Account                                                                                            | Role                                                                                                                        |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `market-a@test.invalid`                                                                            | Manual Market A                                                                                                             |
| `market-b@test.invalid`                                                                            | Automatic Market B                                                                                                          |
| `documents-applicant@test.invalid`                                                                 | Applicant Orchard; starts with no Market membership, then exercises conditional acceptance and separate membership approval |
| `identity-owner-0@test.invalid`, `identity-owner-1@test.invalid`, `documents-owner-c@test.invalid` | Existing Phase 1 library/review fixtures                                                                                    |

Open `http://localhost:4322` and use the existing Administrator username option or platform login. The demo prints full storefront and application URLs for both Markets. Storefronts are `http://documents-market-0.platform.localhost:4321/` and `http://documents-market-1.platform.localhost:4321/`. Application slugs change each time the disposable demo restarts, so use the full application URLs printed by the current session. Each storefront also provides its advertised application link.

The fixture explicitly provisions the two public hostname records and verifies the public HTTP resolver before reporting readiness. The Storefront entity intentionally excludes `hostname` from ordinary ORM inserts and updates, so setting it in an entity constructor alone does not configure routing. A missing hostname makes storefront resolution return 404 even when the Market and application exist. Keep that routing boundary intact when changing demo fixtures.

For desktop/mobile Playwright checks, leave those three processes running and use the printed B URL:

```powershell
$env:DOCUMENTS_APPLICATION_B_URL = 'http://documents-market-1.platform.localhost:4321/apply/REPLACE-WITH-PRINTED-SLUG'
npm exec -- playwright test --config playwright.documents.config.ts
```

This suite accepts only the disposable local B hostname. Screenshots go to ignored `.runtime/documents-ui/`.

## Manual scenarios

1. As Market A, verify automation is off. Apply and accept without automatic assignments. Manually request a document and verify it in the Vendor's Market requests.
2. As Market B, create an automatic required Application requirement with strict submission off. Sign into its public form as Applicant Orchard, select the business and submit with documents outstanding.
3. Enable strict submission. A new attempt without sharing must fail server-side. Explicitly select/share an Available saved document; Pending review permits submission. The other Market must have no download access until separately authorized.
4. Configure an automatic After acceptance requirement. Accept a new verified application, optionally conditionally. Confirm exactly one request, Incomplete readiness and no automatic date/attendance change.
5. Open Documents from application review. Request another document with the Vendor preselected. Reject a submission with a reason, verify the Vendor sees it, and share a replacement or another saved document.
6. Approve mandatory requests. Leave an optional one Missing and one valid document expiring within 30 days. Readiness must be Ready. A past expiration becomes Expired without changing acceptance.
7. Create a requirement after acceptance. Verify no retroactive assignment. Inspect the synchronization counts and confirm; a repeat preview should show zero new requests.
8. Test wrong-business/other-Market IDs, revoked sharing, revoked current write grants, prohibited formats and scanner failure. Automated tests cover these without touching the protected database.
9. Repeat dialogs/table at mobile width with keyboard navigation. Account switching must clear the prior workspace before the next tenant loads.

## Known limits and future phases

Libraries remain Vendor-owned. Anonymous/account-only applicants cannot upload into a Vendor's library. A strict Market therefore requires an authorized Vendor business through existing onboarding. Manual/nonblocking applications still work. No email-based ownership inference, anonymous upload capability or automatic account claiming was added.

An abandoned explicitly started application can leave a Documents-only request. Draft cleanup/retention is deferred. Retiring a form stops its applicant endpoint; submitted requests remain available through Vendor Documents subject to eligibility. Requirement-content editing, larger pagination, future-date readiness and participation enforcement remain deferred. Existing bounds of 100 requirements, 500 requests/vendors and 20 library documents per page remain explicit.

Phase 2B must use configurable notification preferences and a unified platform event architecture. Initial delivery should write structured, sanitized messages only to application console/logs. Assignment audit resource/source/time and authoritative application/membership transitions are integration points; dispatch after commit and deduplicate by event/resource. Later email/SMS/push should extend that unified system. No document-only notification service or file contents/private URLs/storage keys/encryption information belong in these logs.

## Changed local files

Paths below are relative to their respective repository roots. Pre-existing Phase 1 work was preserved.

| Repository/area         | Files added, extended or refreshed                                                                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web, manager            | `apps/admin/src/documents/DocumentsWorkspace.tsx`; `apps/admin/src/market/phase14/{ApplicationReview,Applications,OperationsRoutes}.tsx`                                                                                                                                                         |
| Web, applicant          | `apps/storefront/src/components/{ApplicationDocuments,MarketApplication}.tsx`; `apps/storefront/src/pages/api/{application-documents,market-application}.ts`; `apps/storefront/src/lib/shop.ts`                                                                                                  |
| Web, shared UI          | `packages/ui/src/{documents,index}.tsx`; `packages/ui/src/document-status.ts`; `packages/ui/package.json`                                                                                                                                                                                        |
| Web, API                | `packages/api/src/{application-documents,document-upload,documents,errors,index,market-operations}.ts`; `packages/api/operations/application-documents.graphql`; `packages/api/schema/{shop,admin}.graphql`; `packages/api/schema/provenance.json`; `packages/api/src/generated/{shop,admin}.ts` |
| Web, tooling/tests      | `codegen.ts`; `scripts/{documents,extract-schema}.ts`; `tests/documents.test.tsx`; `tests/e2e/documents-live.spec.ts`; `playwright.documents.config.ts`; `playwright.config.ts`                                                                                                                  |
| Web, guidance           | `COMPONENT_USAGE_GUIDE.md`; `docs/DOCUMENTS_AND_COMPLIANCE.md`; this guide                                                                                                                                                                                                                       |
| Backend, schema         | `src/migrations/1792100000000-DocumentsApplicationIntegration.ts`                                                                                                                                                                                                                                |
| Backend, Documents      | `src/plugins/documents-compliance/{workflow,service,api,documents-compliance.plugin}.ts`                                                                                                                                                                                                         |
| Backend, lifecycle      | `src/plugins/market-operations/{entities,service}.ts`; `src/plugins/farmers-market/services/market-vendor-membership.service.ts`                                                                                                                                                                 |
| Backend, request guards | `src/plugins/platform-identity/{shop-context.middleware,platform-identity.plugin}.ts`; `src/plugins/marketplace-commerce/market-browse.interceptor.ts`                                                                                                                                           |
| Backend, fixtures/tests | `test/documents-compliance/run.ts`; `test/market-operations/harness.ts`                                                                                                                                                                                                                          |

Scanner/storage implementation, customer authentication, checkout/payment controllers and account-switching services were not changed. Browser screenshots and build outputs are local ignored artifacts.
