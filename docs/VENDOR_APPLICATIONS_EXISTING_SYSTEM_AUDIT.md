# Existing vendor application system audit

Audit date: October 29, 2026.

This is a source inspection of the existing local code in `E:/coding/farmers-market-platform-web` and `E:/coding/farmers-market-platform`. It covers market applications, related Vendor onboarding, market relationships, date participation, booth assignment, and connected document and policy workflows. No application code, configuration, schemas, dependencies, or test data were changed. No database was accessed. Migrations were read as source only. Builds, linting, automated tests, browsers, UI testing, and screenshots were not run.

Implementation labels describe identifiable code paths, not successful execution in the current environment. Historical reports, roadmap statements, fixture data, and interface copy are not evidence that a feature works. Runtime configuration, applied migrations, populated records, and actual delivery remain unverified.

## 1. Executive summary

The platform already has a substantial market application system. Market Managers can build custom forms, save template drafts, publish immutable versions, collect submissions from anonymous people or authenticated accounts, review applications, record private notes, waitlist or decline applicants, and accept a business into the market's operational directory. Applications can request multiple market dates and rentals. Each requested date receives its own decision after business acceptance.

The most important architectural distinction is that **application acceptance, directory identity verification, platform market membership, canonical date participation, operational date confirmation, booth assignment, document readiness, and billing are separate records and decisions**. Accepting an application does not automatically approve a `MarketVendorMembership`, confirm an `OccurrenceParticipation`, reserve a booth, issue an invoice, or publish products.

The main gaps are in the applicant's experience after submission. No application history/detail endpoint or page, persistent applicant draft workflow, submitted-answer editing, application reply thread, applicant withdrawal control, or reopening/resubmission of the same application was found. `NEEDS_INFO` produces a status and an eligible in-app notification, but has no general answer-correction or response workflow. Documents do have their own submission, rejection, replacement, sharing, and review paths.

Custom questions and reusable versioned templates are implemented already. Conditional questions, general attachment questions, application fees, reviewer scoring/jurying, category eligibility rules, and application deadlines are not implemented in the inspected application subsystem. Waitlisting exists as a manual application status and as a separate manual date decision. Template drafts must not be confused with applicant drafts.

Primary implementation sources:

| Source | Main responsibility |
| --- | --- |
| [Backend market operations service](E:/coding/farmers-market-platform/src/plugins/market-operations/service.ts) | `MarketOperationsService.read`, `command`, `publicApplication`, `submit`, `approve`, `assign`, and `vendorAssignments` |
| [Backend application entities](E:/coding/farmers-market-platform/src/plugins/market-operations/entities.ts) | Templates, versions, submissions, directory identities, operational approvals, assignments, invoices, audit records |
| [Backend application model and validation](E:/coding/farmers-market-platform/src/plugins/market-operations/model.ts) | `defaultDefinition`, `validateDefinition`, `validateAnswers`, `requirements`, and booth compatibility |
| [Backend GraphQL resolvers](E:/coding/farmers-market-platform/src/plugins/market-operations/api.ts) | Application public reads/submission and authorized market operations |
| [Public application component](E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketApplication.tsx) | Account choice, form entry, date/rental requests, submission confirmation |
| [Manager application builder](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/ApplicationBuilder.tsx) | Form authoring, draft versions, preview, publishing |
| [Manager application review](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/ApplicationReview.tsx) | Business decision, notes, documentation summary, separate requested-date decisions |

## 2. Existing Vendor application experience

### Discovery and initiation

On a backend-backed market homepage, [the index route](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/index.astro) attempts `createPublicMarketOperationsApi().application()` without a slug. The backend resolves the market from the Shop API channel and looks for a public, advertised template with a published version. If that read succeeds, [MarketPublicHome](E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketPublicHome.astro) displays “Become a vendor” linking to `/apply`.

[The application route](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/apply/[...applicationSlug].astro) supports both `/apply` and `/apply/<slug>`. It renders the definition on the server and hydrates the `MarketApplication` React island. The route is marked `noindex`. A failed read returns a 404 for forbidden access or 503 for other failures.

With a slug, `publicApplication()` permits a published template whose visibility is either `PUBLIC` or `PRIVATE`, provided it belongs to the current active market. Here, private means accessible through its direct link and omitted from the advertised entry point. It is not an authenticated invitation, recipient allowlist, or one-time access token. The builder exposes the private/public setting, but no copy-link or invitation-sending control was found in `ApplicationBuilder` or `Applications`; the template slug is available in manager API data.

The homepage button is implemented in the backend-backed `MarketPublicHome` branch. This does not establish an equivalent discovery button in every appearance/template or fixture branch. A functioning direct application route and a visible discovery link are separate claims.

### Applicant identity and required information

Every application starts with a platform-owned required Yes/No account question. It cannot be removed or redefined through the manager's custom question definition.

| Choice | Result and restrictions |
| --- | --- |
| No | Submit anonymously without a platform Vendor business. Even a signed-in person can deliberately opt out of association. No applicant principal or Vendor ID is retained on that submission. |
| Yes, account only | Requires an authenticated eligible account, but no Vendor business association. |
| Yes, authorized Vendor | Requires an active owner relationship to the selected active Vendor and appropriate current role/channel access. Staff access alone does not authorize applying as the business. |

`PlatformAccountFoundation.principal`, `applicant`, `affiliations`, and `requireApplicantVendor` in [account-foundation.ts](E:/coding/farmers-market-platform/src/plugins/platform-identity/account-foundation.ts) establish the authenticated identity. The principal must be verified, not deleted, and have an `AccountPhoneIdentity`. The applicant lookup returns personal contact details and Vendor businesses the principal may apply for.

The applicant can explicitly fill empty semantic fields from account information. This is not automatic synchronization: it does not overwrite existing answers, and business profile changes do not rewrite submitted answers. The core required business/contact fields are business name, contact first name, contact last name, and email. Phone is optional in the default application definition, even though authenticated account eligibility separately requires the verified account/phone identity.

Default optional questions cover phone, business description, website, social URL, business type, primary category, booth width/depth, electricity, vehicle/trailer access, and setup notes. Managers can remove optional system questions or make them required. Managers can add further required custom questions. Website, social URL, business type, and setup notes remain in `answers`; the compact `Applicant` projection contains business name, contact names, email, phone, description, and category.

Source: [model.ts](E:/coding/farmers-market-platform/src/plugins/market-operations/model.ts), `systemFields`, `defaultDefinition`, `validateAnswers`, and `requirements`.

### Filling and submitting

Applicants can:

- Answer the manager's currently published questions, grouped by section.
- Select zero or more offered future, scheduled market dates. There is no minimum-one-date rule in `submit()`.
- Request quantities from the template's enabled rental/add-on options. Quantities apply to each requested date. Requests do not reserve resources.
- See rental prices and maximum quantities. Submission collects no payment.
- Upload or reuse eligible compliance documents when applying as an authorized Vendor, as described below.

The frontend posts through `/api/market-application` to `submitMarketApplication`. It includes the published version ID, answers, requested occurrence IDs, rental quantities, a browser-generated idempotency key, and the explicit identity choice. The backend validates everything and creates the submission directly as `SUBMITTED`.

Success returns only `{ submitted: true }`. The page displays a success message; it does not receive a submission reference, application detail URL, or status-tracking token. This distinction is especially important for anonymous applicants.

### Drafts and editing

There is no persistent applicant draft workflow. Form answers normally live in React state and are not automatically saved as an application record. The entity's `DRAFT` status is not used by the public creation path, and no save/resume applicant-draft operation was found.

There is a narrower sign-in continuity mechanism. `MarketApplication.signIn()` saves encrypted, compressed progress in HTTP-only cookies before navigating to login. [application-progress.ts](E:/coding/farmers-market-platform-web/apps/storefront/src/lib/application-progress.ts) binds it to origin, path, nonce, expiry, and the authenticated principal after login. The cookies expire after 600 seconds, have a sealed-payload limit of 9,900 characters, and restoration requires the same application slug/version. This is temporary login handoff, not a durable, cross-device draft or a draft list.

Submitted answers, the definition snapshot, applicant contact, requested dates, rental request snapshots, identity provenance, and derived requirements are protected by migration-defined immutability triggers. No applicant or manager API edits these submitted fields. Separate directory contact edits do not revise the application.

Sources: [progress endpoint](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/api/application-progress.ts), [MarketOperationsPhase14 migration](E:/coding/farmers-market-platform/src/migrations/1791400000000-MarketOperationsPhase14.ts), and [ApplicationIdentityProvenance migration](E:/coding/farmers-market-platform/src/migrations/1791730000000-ApplicationIdentityProvenance.ts).

### Documents, manager requests, and later participation

[ApplicationDocuments](E:/coding/farmers-market-platform-web/apps/storefront/src/components/ApplicationDocuments.tsx) shows the market's enabled automatic requirements at the `Application` stage. An authorized Vendor can choose an existing private document or upload a new one, then explicitly share it against a requirement. Uploading and sharing are separate acts. Manager review can still be pending when the application is submitted.

Anonymous and account-only applicants cannot upload/share application documents through this path. If a market has submission-blocking document requirements, those applicants must first establish an authorized Vendor identity and satisfy the requirements or obtain an applicable waiver. The public page explains this restriction, and the backend enforces it.

After submission, `/vendor/documents` supports responses to document requests, replacement files, re-sharing updated documents, viewing rejection reasons, and policy acknowledgments. These actions do not edit the application or transition `NEEDS_INFO` automatically. No general applicant reply or requested-information conversation was found.

The Vendor dashboard's `/vendor/markets` shows canonical market memberships, not submitted application records. It can request a market relationship using a Market ID, confirm business-link requests, and manage participation under an approved relationship. The Vendor can configure future canonical participation as `planned`, `confirmed`, or `cancelled`, subject to backend authority and market policy. Selecting dates on the application alone does not do this.

Sources: [vendor/markets.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/markets.tsx), [membership service](E:/coding/farmers-market-platform/src/plugins/farmers-market/services/market-vendor-membership.service.ts), and [participation service](E:/coding/farmers-market-platform/src/plugins/farmers-market/services/participation.service.ts).

### Status visibility, withdrawal, and resubmission

An authenticated business can receive eligible in-app notices for acceptance, decline, and `NEEDS_INFO`; account-only applicants have corresponding account notices. These do not provide a full application history/detail interface. Anonymous applicant email addresses are contact information, not an authenticated ownership mechanism or an automatic email-notification subscription.

No applicant withdrawal mutation or control was found. The `WITHDRAWN` application transition belongs to manager review. Declined and withdrawn applications cannot be reopened by the current review command. A person can revisit the public form and submit a new application with a new idempotency key, but there is no resubmission lineage, “revise and resubmit” operation, or automatic carry-forward of previous answers.

Signup does not claim a previous anonymous application. [signup.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/signup.astro) explicitly describes that boundary, and immutable submission identity plus the absence of a claim mutation supports it.

## 3. Existing Market Manager application experience

### Form configuration and publishing

Managers with `ReadOwnMarketApplications` can view templates and submissions. `ManageOwnMarketApplications` permits template management and application decisions. The main interfaces are `/market/applications` and `/market/application-submissions`.

The implemented builder supports:

- Creating a named template with a generated stable slug and initial draft version.
- Adding, renaming, reordering, and removing sections. Removing a section moves its questions into a remaining section.
- Adding, editing, moving, reordering, and deleting eligible questions, including drag controls and up/down controls.
- Editing labels, help text, section membership, choice options, required flags, text length limits, and number bounds.
- Previewing questions with the shared `ApplicationFields` renderer.
- Selecting future scheduled occurrences and enabled rental options offered by the form.
- Saving the draft definition and publishing it as public or private/direct-link.
- Advertising a public template on the market storefront, retiring a template, and cloning a version into a new draft.

Question types are `SHORT_TEXT`, `LONG_TEXT`, `BOOLEAN`, `NUMBER`, `SINGLE_SELECT`, `DROPDOWN`, `MULTI_SELECT`, `DATE`, `TIME`, `EMAIL`, `PHONE`, `URL`, and informational `INFO`. There is no file-upload question type. The four required identity semantics have fixed types and cannot be hidden or made optional. Other system semantic types are fixed, although their questions may be removed.

The model supports a static `hidden` property. The current builder can display existing hidden state, but has no general hide/unhide toggle. No conditional visibility expression, branching rule, or answer-dependent validation is modeled or evaluated.

Publishing retires a template's previous published version. Definitions of non-draft versions are immutable; changes require another draft and publish. Only one template may be advertised per market, and only one version may be published per template. `CLONE_APPLICATION` creates another version under the same template; it does not create a separate shared template library or copy a template into another market. Template retirement hides access without deleting submissions. Republishing a suitable draft can restore a non-retired visibility.

### Review controls and information

[Applications](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Applications.tsx) displays submissions with business, email, application status, conditional-acceptance marker, and documentation summary. Opening a submission shows contact identity, identity mode, read-only answers from its original definition snapshot, documentation counts/outstanding requirements, and links to document review or additional document requests.

The manager can choose `UNDER_REVIEW`, `NEEDS_INFO`, `WAITLISTED`, `ACCEPTED`, `DECLINED`, or `WITHDRAWN`, record private manager notes/decision reason, and save. A reason is not mandatory in the application backend. The UI disables edits for declined/withdrawn applications and prevents saving an already accepted application while leaving it accepted. The backend likewise rejects accepting an already accepted record, so this is not a general notes-only edit surface after acceptance.

Acceptance can reuse an eligible existing directory entry or create one. For a Vendor-associated application, the backend revalidates the applicant's active business ownership and relevant current user/channel permission before verifying the directory identity. For anonymous or account-only submissions, acceptance uses an external directory identity. Supplying an arbitrary Vendor ID is not an allowed substitute for proven application identity.

The reviewer can mark acceptance conditional while documents remain outstanding. The flag records that choice; it is not a separate application status or an enforcement engine. The acceptance code does not require readiness to be complete when conditional acceptance is false.

The submission list has status badges but no application-specific status, template, category, date, or text-search filters, bulk decisions, pagination, or jury assignment controls. The API returns bounded collections rather than a filterable application queue. Related membership and compliance pages have their own filters; those do not add application filtering.

The application data contains `rentalRequests`, but the current `ApplicationReview` component does not render a dedicated rental-request summary. Requests are used to initialize the separate assignment editor. The introductory submission-page text mentions reviewing rentals, which is broader than this dialog's rendered content.

### Requirements and eligibility settings

Application definitions and their available dates/rentals are market-specific. Compliance requirements are also market-specific, configured in `/market/documents`, rather than embedded in a template version. Managers can configure required versus optional documents, instructions, category, collection stage, due date, approval/expiration requirements, manual distribution, or automatic distribution for market-wide requirements. A market automation switch must also be enabled for automatic lifecycle assignment and submission-blocking enforcement.

Only required, automatic, application-stage document requirements can be submission-blocking. Additional documents can be requested for eligible Vendors individually, including application-associated Vendors without an approved membership. This requires `ManageOwnMarketMemberships`, which is separate from application-management permission.

Platform-owned constraints include protected account/identity fields, permitted question types and validation limits, Vendor ownership checks, allowed document types/categories, sensitive-document restrictions, and authorization rules. No market application category quota, allowed Vendor-category rule, geographic eligibility rule, or admission deadline setting was found. Managers can ask a category question, but an answer does not create an eligibility policy.

### Dates, booths, and fees

After acceptance, the review interface exposes each requested date with `PENDING`, `CONFIRMED`, `WAITLISTED`, `DECLINED`, or `CANCELLED`, plus an optional date reason. Date decisions require `ManageOwnMarketAssignments`. A date can be confirmed without a booth; assignment checks availability and compatibility later. If the manager also has assignment read access, the application workspace loads plans/spaces/assignments for an advisory compatibility message.

For a verified platform-linked directory business, operational confirmation requires a separately approved, consent-verified membership and an already confirmed canonical participation for that occurrence. External directory businesses can follow the operational approval and booth workflow without a platform Vendor account. Separate directory-based operational approvals are also supported without an application through `APPROVE_OCCURRENCE`.

There is no application fee. Booth fees and rentals are later assignment charges. `ASSIGN` validates dimensions, electricity/vehicle/food-truck amenities, rental amenity requirements, quantities, capacity, occupancy, and currency. It creates or updates an assignment and draft invoice. Billing then supports manual invoice issue and payment recording. The market invoice provider is explicitly `NOT_CONFIGURED`; online issue is rejected. This is unrelated to other commerce/payment systems elsewhere in the platform.

Sources: [assignment editor](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Assignments.tsx), [billing UI](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Billing.tsx), `MarketOperationsService.assign`, `checkCapacity`, `rebuildInvoice`, and [provider.ts](E:/coding/farmers-market-platform/src/plugins/market-operations/provider.ts).

## 4. Complete application lifecycle and status transitions

### Template lifecycle

| Operation | Actual behavior |
| --- | --- |
| `CREATE_APPLICATION` | Creates template and version 1 in `DRAFT`; initializes default questions. |
| `SAVE_APPLICATION` | Updates only a draft definition; validates allowed dates/rentals and expected revision. |
| `CLONE_APPLICATION` | Copies a chosen version into the next numbered `DRAFT` of that template. |
| `PUBLISH_APPLICATION` | Requires a draft; validates definition, sets visibility/advertising, retires the previous published version, publishes this version. |
| `RETIRE_APPLICATION` | Sets template visibility to `RETIRED` and advertising false. Existing versions/submissions remain. |

Publication and visibility are separate: retiring a template does not change every version's status. Public submission always checks the currently published version and rejects a stale version ID as `APPLICATION_VERSION_CHANGED`.

### Application statuses and transition rules

| Status | Existing meaning and reachability |
| --- | --- |
| `DRAFT` | Declared in entity/database status values, but no applicant save/create path creates it. Manager template drafts are different records. |
| `SUBMITTED` | Initial public submission state. No review action returns an application to this status. |
| `UNDER_REVIEW` | Manager-selected review state; no assigned-reviewer or scoring semantics. |
| `NEEDS_INFO` | Manager-selected information-required state, eligible for an in-app notice. No application reply/edit workflow. |
| `WAITLISTED` | Manual application waitlist status; no ordering, quota, automatic promotion, or expiration. |
| `ACCEPTED` | Business accepted and associated with a directory entry. Does not confirm dates, membership, a booth, or document completion. |
| `DECLINED` | Terminal for `REVIEW_APPLICATION`; no reopening operation. |
| `WITHDRAWN` | Manager-recorded withdrawal and terminal for `REVIEW_APPLICATION`; no applicant withdrawal endpoint. |

The review logic is not a strict linear state machine. From a nonterminal, non-accepted record, a manager may choose any of the six review targets directly; starting review first is not required. Repeating a non-accepted target can update notes/revision. Existing `DECLINED` or `WITHDRAWN` rows reject all review transitions.

An accepted application cannot be accepted again. To move it to another review target, every associated occurrence approval must be acknowledged in `reviewedOccurrenceIds`. For occurrences that have not ended, confirmed approvals must first be cancelled and active assignments released. Historical approval, assignment, and invoice records remain separate. Returning to a nonterminal review state does not delete the directory entry or automatically revoke canonical market membership.

`conditionalAcceptance` is true only when the new application status is `ACCEPTED` and the command explicitly supplies true. It is otherwise false. No code automatically clears it when documentation becomes ready.

### End-to-end business and date approval

1. A manager publishes a template and, optionally, advertises it.
2. An applicant opens `/apply` or its direct slug route, chooses identity association, answers required questions, selects offered dates/rentals, and shares required documents if applicable.
3. `submit()` verifies the live template/version and identity, checks document blocking, validates answers/dates/rentals, stores immutable snapshots as `SUBMITTED`, writes audit evidence, and publishes a submission event.
4. A manager opens the submission queue and records a review status, notes, waitlist/decline, or acceptance.
5. Acceptance creates/reuses a directory identity. Proven Vendor provenance can verify its platform link, but no canonical membership is created here.
6. Where platform participation is intended, the Vendor separately requests/consents to the market relationship, the market approves it, and the Vendor confirms canonical participation for a date.
7. The manager separately reviews requested dates. A new `CONFIRMED` operational approval references the canonical participation for a verified platform identity; an external approval has no participation ID.
8. The manager assigns compatible booths and accepted rental quantities. Booth allocation and a draft invoice follow assignment, not application acceptance.
9. Billing and market-day check-in/attendance continue independently. Document/policy readiness may remain outstanding, subject to the actual submission-blocking rules rather than an assumed global participation gate.

### Date decisions and cancellation

`REVIEW_OCCURRENCE` requires an accepted application, a directory ID, and a requested future scheduled occurrence. It creates or updates a unique occurrence/directory approval. An existing approval tied to a different application is rejected. No-date applications can still be accepted, but have no requested-date decisions to review.

`PENDING`, `WAITLISTED`, and `DECLINED` date records may be changed to other permitted decisions. `CONFIRMED` can only leave confirmation through explicit `CANCELLED`; it cannot be silently changed to pending, waitlisted, or declined. Cancellation requires a previously confirmed/cancelled decision. Existing rows require their expected revision.

Cancelling a confirmed date requires explicit release of active booth assignments. Draft invoices require explicit voiding and billing permission. Open/paid invoices block this path until their obligations are resolved. Releasing assignments soft-deletes them and makes the occurrence plan draft, retaining its previous public snapshot as history. If a canonical participation is linked, cancellation also requires occurrence-management permission and changes it to `cancelled`.

Reconfirmation revalidates confirmed canonical participation for verified identities. Future external approvals can be explicitly associated with a verified identity's existing canonical participation through `CONVERT_OCCURRENCE_IDENTITY`; historical occurrences and approvals with assignment history cannot use that conversion.

The submission's `approvedOccurrenceIds` remains in the model but is not maintained by the current separate date-review flow. `MarketOccurrenceApproval.decision` is the operational date-decision record. The legacy `ACCEPT_ASSIGN` action remains in the API enum but always fails with `SEPARATE_APPLICATION_AND_DATE_DECISIONS_REQUIRED`.

### Notifications and history

Application submission and changed review status publish durable events in the same transaction. [InboxProjector](E:/coding/farmers-market-platform/src/plugins/platform-notifications/inbox-projector.ts), [inbox-registry.ts](E:/coding/farmers-market-platform/src/plugins/platform-notifications/inbox-registry.ts), and [inbox-delivery-policy.ts](E:/coding/farmers-market-platform/src/plugins/platform-notifications/inbox-delivery-policy.ts) define the current human-facing behavior:

| Trigger | Identifiable delivery behavior |
| --- | --- |
| `market.application.submitted` | Market inbox notice links to `/market/application-submissions`, subject to current recipient authorization and inbox policy. Vendor submission confirmation notice is disabled because the submitter already receives immediate UI confirmation. |
| Application becomes `ACCEPTED`, `DECLINED`, or `NEEDS_INFO` | Vendor-associated application maps to approved/rejected/action-required Vendor inbox types linking to `/vendor/markets`. Account-only application maps to an account notice linking to `/account`. |
| Other application review statuses | Domain event is published on a status change, but no matching applicant status notice was found for under-review, waitlisted, or withdrawn states in this projector. |
| Per-date decision | `APPLICATION_DATE_DECISION_CHANGED` audit record. No dedicated notification event is published by `REVIEW_OCCURRENCE`. Canonical participation changes have their own independent events. |
| Booth assigned or changed | `market.booth.assigned`, including an eligible Vendor notice for a verified assignment identity. |
| Document/policy lifecycle | Separate request, submission, decision, waiver, expiration, publication, acknowledgment, revision-request, and readiness events exist in the compliance subsystem. Delivery policies/preferences vary by type. |

The application status notice is generic; it does not include the manager's private notes or an actionable edit/reply link. No application-specific email or SMS delivery path was found. The notification plugin schedules inbox projection; its separately registered preference-based transport in `PlatformNotificationsService` writes console notifications, which is not proof of email delivery. Actual worker execution, recipient eligibility, preferences, suppression, and receipt are unverified.

Every successful operations command writes a `MarketOperationsAudit` action/result. Review additionally records `APPLICATION_STATUS_CHANGED` with previous/new status and notes as reason; date review records previous/new decision and date reason. Submission records a rate-limit network hash and a submission event; it is not a complete applicant-facing activity feed. The migration makes operations audit records append-only. No application audit-history query or timeline UI is exposed by `ownMarketOperations`.

## 5. Backend architecture and relevant data models

### Plugin and service boundaries

[MarketOperationsPlugin](E:/coding/farmers-market-platform/src/plugins/market-operations/market-operations.plugin.ts) registers operational entities, permissions, `MarketOperationsService`, `MarketVendorLinksService`, and Admin/Shop GraphQL extensions. [vendure-config.ts](E:/coding/farmers-market-platform/src/vendure-config.ts) includes it alongside `FarmersMarketPlugin`, `PlatformNotificationsPlugin`, and `DocumentsCompliancePlugin`.

The operational service owns application templates/submissions and directory/date/booth coordination. `FarmersMarketPlugin` owns canonical market memberships and participation. `PlatformIdentityPlugin` owns Vendor businesses, user-to-tenant membership, and current authority. `DocumentsCompliancePlugin` owns private document and published agreement workflows. Calling a lifecycle helper across these domains does not transfer their authority to the application.

### Main entities and relationships

Operational entity classes are in [market-operations/entities.ts](E:/coding/farmers-market-platform/src/plugins/market-operations/entities.ts). They inherit Vendure IDs/timestamps plus `marketId` and `revision`. Many relationships are explicit integer IDs with foreign keys established in migrations, rather than TypeORM relation properties.

| Model/table | Relevant fields and relationships |
| --- | --- |
| `MarketApplicationTemplate` / `market_application_template` | Market, name, globally unique slug, `PUBLIC/PRIVATE/RETIRED`, advertised flag. Parent of versions. |
| `MarketApplicationTemplateVersion` / `market_application_template_version` | Template, version number, `DRAFT/PUBLISHED/RETIRED`, JSON definition containing sections/questions/offered occurrence IDs/rental IDs. |
| `MarketApplicationSubmission` / `market_application_submission` | Template version; status; definition, answer, contact, requirements and rental snapshots; requested dates; legacy approved dates; optional directory; private notes; idempotency key; conditional-acceptance flag; immutable applicant identity/provenance. |
| Submission identity | `accountAnswer`, `applicantPrincipalId`, `applicantVendorId`, `identityMode`, `identityVerification`. Legacy records can remain `LEGACY_UNKNOWN`; new submissions are `ANONYMOUS`, `ACCOUNT_ONLY`, or `AUTHORIZED_VENDOR`. |
| `MarketVendorDirectoryEntry` / `market_vendor_directory_entry` | Operational market business/contact with optional platform Vendor ID; `EXTERNAL/PLATFORM_LINKED` kind, active status, notes, and independent link verification state. |
| `MarketVendorLinkRequest` / `market_vendor_link_request` | Directory identity, intended Vendor, previous link/state, reason, and `PENDING/CONFIRMED/DECLINED/CANCELLED`. |
| `MarketOccurrenceApproval` / `market_occurrence_approval` | Unique occurrence/directory pair; optional source application and canonical participation; decision, requirements, check-in, attendance, and manager notes. |
| `MarketOccurrencePlan`, `MarketSpace`, `MarketOccurrenceSpaceAssignment` | Occurrence layout and booths; assignments reference approval/directory, retain space/business snapshots and verified Vendor identity, and support historical retention. |
| `MarketRentalOption`, `MarketRentalAllocation` | Rental catalog, quantity/capacity/pricing rules, and accepted occurrence-assignment allocations. Submission rental requests are separate snapshots. |
| `MarketInvoice`, `MarketPayment` | Assignment-based invoice and payment records, not application-payment records. |
| `MarketOperationsAudit` | Market, nullable actor, action, JSON detail, timestamps. No reviewer score or review-round relationship. |

Canonical entities in [farmers-market/entities/market.entities.ts](E:/coding/farmers-market-platform/src/plugins/farmers-market/entities/market.entities.ts):

- `Market`: channel-owned market with status, timezone, venue, and commerce/preorder policy.
- `MarketOccurrence`: scheduled/cancelled concrete market date with timezone and start/end times.
- `MarketVendorMembership`: unique market/Vendor business relationship, `pending/approved/suspended/withdrawn`, plus `LEGACY_UNVERIFIED/VENDOR_REQUESTED/VERIFIED` consent state and actor/time evidence.
- `OccurrenceParticipation`: unique membership/occurrence pair, `planned/confirmed/cancelled`, pickup instructions and optional preorder override.
- Product listing/offering records: downstream commerce eligibility. Application acceptance does not create these.

`Vendor` and `TenantMembership` in [platform-identity/entities.ts](E:/coding/farmers-market-platform/src/plugins/platform-identity/entities.ts) represent the platform business and the user's role within a tenant. This is different from the business's `MarketVendorMembership`. Email or business-name matching does not establish either relationship.

The main integrity migrations are [MarketOperationsPhase14](E:/coding/farmers-market-platform/src/migrations/1791400000000-MarketOperationsPhase14.ts), [MarketRelationshipConsent](E:/coding/farmers-market-platform/src/migrations/1791690000000-MarketRelationshipConsent.ts), [VerifiedMarketRelationships](E:/coding/farmers-market-platform/src/migrations/1791700000000-VerifiedMarketRelationships.ts), and [ApplicationIdentityProvenance](E:/coding/farmers-market-platform/src/migrations/1791730000000-ApplicationIdentityProvenance.ts). These define same-market foreign keys, unique advertised/published records, unique submission keys, identity constraints, and immutable history. Their presence does not establish that they have been applied to a particular database.

### Application and connected APIs

These are GraphQL operations, with Astro same-origin endpoints acting as storefront proxies. Primary schema/resolvers: [market-operations/api.ts](E:/coding/farmers-market-platform/src/plugins/market-operations/api.ts). Frontend client: [packages/api/src/market-operations.ts](E:/coding/farmers-market-platform-web/packages/api/src/market-operations.ts).

| API | Operations and purpose |
| --- | --- |
| Shop query | `publicMarketApplication(slug)` reads the advertised or direct-link published form. `marketApplicationApplicant` reads the authenticated applicant/contact/owned-business projection. |
| Shop mutation | `submitMarketApplication(input)` submits new immutable application data. No create-draft/update/withdraw/read-own-submission mutations or queries exist here. |
| Admin query | `ownMarketOperations(section: APPLICATIONS)` returns templates, versions, submissions with current documentation readiness, directory, approvals, rentals, and eligible Vendor choices for the active market. |
| Admin mutation | `marketOperationsCommand(input)` dispatches `CREATE_APPLICATION`, `SAVE_APPLICATION`, `CLONE_APPLICATION`, `PUBLISH_APPLICATION`, `RETIRE_APPLICATION`, `REVIEW_APPLICATION`, `REVIEW_OCCURRENCE`, and connected operational commands. `ACCEPT_ASSIGN` is declared but deliberately rejected. |
| Identity links | `ownVendorLinkRequests`, `respondToVendorLink`; manager `REQUEST_VENDOR_LINK` command; platform-only `correctMarketVendorLink`. |
| Vendor operational read | `ownVendorBoothAssignments` returns current/future scheduled assignments for an active verified directory identity and the assignment's recorded Vendor identity, including public booth/map details, rentals, and invoice totals/status. |
| Canonical market relationship | `requestOwnMarketMembership`, `setMarketVendorMembership`, `ownMarketBusinessMemberships`, `marketMembershipState`; manager paginated relationship reads such as `ownMarketVendorMemberships` and `ownMarketMembership`. |
| Canonical date participation | `configureMarketParticipation`; date reads including `ownMarketMembershipOccurrences` and manager `ownMarketMembershipParticipations`. |
| Application compliance | Shop `applicationCompliance` actions `START/READ/SUBMIT`; `uploadApplicationCompliance`. These address document requirements, not application submission status. |
| Dashboard compliance | `ownComplianceDocuments`, `ownComplianceSummary`, `ownAdvancedCompliance`, `uploadComplianceDocument`, `complianceDocumentCommand`, `downloadComplianceDocument`. |

Canonical operations are defined in [farmers-market/api/admin-api.ts](E:/coding/farmers-market-platform/src/plugins/farmers-market/api/admin-api.ts); compliance resolvers are in [documents-compliance/api.ts](E:/coding/farmers-market-platform/src/plugins/documents-compliance/api.ts).

### Authorization and validation

Manager operations derive the market from the current channel and require an active market, active non-deleted Administrator, an active `marketAdmin` tenant relationship, `ReadOwnMarket`, and the specific current operation permission. The service checks current database grants, rather than relying only on cached session permissions. `own()` loads every operational target with both its ID and owning market ID. Mutations use a transaction, market write lock, and expected revisions where applicable.

See [TenantAccessPolicy](E:/coding/farmers-market-platform/src/plugins/platform-identity/tenant-access-policy.ts), `requireMarket`, `currentGrants`, `requireCurrentPermission`, and `requireVendor`, plus [operations permissions](E:/coding/farmers-market-platform/src/plugins/market-operations/permissions.ts). Assignment, billing, day operations, document management, and canonical membership management have separate permissions.

Public form read/submission is deliberately allowed without login, but only on a market Shop API channel. Yes/account submissions revalidate the principal and optional Vendor authority; No submissions cannot specify a Vendor ID. The public application-document path additionally requires an authenticated session and authorized Vendor; writes require the Vendor-channel `ManageOwnStorefront` permission.

Validation includes:

- At most 30 sections and 100 questions, unique question IDs and system semantics, supported types, valid section references, protected identity semantics, and reserved account-preamble semantic.
- At most 50 choice options with allowed unique answers; text limits, number bounds, booleans, email syntax, canonical phone formatting, HTTP(S) URLs without embedded credentials, and valid date/time values.
- Answer objects limited to 50,000 serialized characters. Required visible answers must be supplied. Hidden and informational questions are skipped by answer validation.
- At most 100 requested dates, without duplicates, all in the public form's currently available future scheduled occurrences. Saving template dates also verifies future scheduled occurrences in the same market.
- At most 50 rental requests, unique options in the template, enabled options, and integer quantities within configured maxima. Prices and currency are captured from the catalog at submission, not accepted from the applicant.
- Idempotency key validation and a database unique market/key pair. Reusing a key with different identity/version/content is rejected; the idempotency check occurs after resolving the current published version, so retirement/version replacement can still prevent an otherwise repeated request.
- A public submission rate limit of ten successful recorded submissions per market/network-hash bucket in the preceding hour. This is abuse control, not applicant-level duplicate-business detection.
- The storefront submission proxy requires the canonical same origin, JSON content, bounded request size, and an allowlist of input keys. It exposes a specific document-required error but otherwise returns a generic submission-unavailable error.

Validation is in `MarketOperationsService.submit`, `model.ts`, and [the submission proxy](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/api/market-application.ts). No application-level duplicate-by-email/business rule, deadline, category quota, attachment-answer validation, or automated acceptance rule was found.

## 6. Existing frontend pages, routes, and components

### Routes and entry points

| Route/surface | Source and implemented role |
| --- | --- |
| Market `/` | [index.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/index.astro) and [MarketPublicHome.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketPublicHome.astro): conditionally advertised application link. |
| `/apply`, `/apply/<slug>` | [apply route](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/apply/[...applicationSlug].astro): SSR definition and hydrated application island. |
| `/api/market-application` | [market-application.ts](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/api/market-application.ts): public submission proxy with identity and request checks. |
| `/api/application-applicant` | [application-applicant.ts](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/api/application-applicant.ts): authenticated contact/owned Vendor lookup. |
| `/api/application-progress` | [application-progress.ts](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/api/application-progress.ts): temporary login progress save/restore. |
| `/api/application-documents` | [application-documents.ts](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/api/application-documents.ts): authenticated application-document read/start/share/upload proxy. |
| `/market/applications` | [Applications.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Applications.tsx) template view and `ApplicationBuilder`. |
| `/market/application-submissions` | Same `Applications` component in submissions view, with `ApplicationReview` dialog and `DateDecision`. |
| `/market/directory`, `/market/rentals` | [Directory.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Directory.tsx): operational contacts/links and rental catalog. |
| `/market/assignments`, `/market/booth-billing`, `/market/day` | [OperationsRoutes.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/OperationsRoutes.tsx): separate date selection, layout/booth assignment, billing, day operations. |
| `/market/vendors/memberships`, `/market/vendors/participation` | [market/vendors.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/market/vendors.tsx): canonical membership review and participation surfaces. Manager participation controls remain subject to the stricter backend rules. |
| `/vendor/markets`, `/vendor/markets/<membershipId>` | [vendor/markets.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/markets.tsx): relationship request/status, link confirmation, canonical date participation. No submitted-application list. |
| `/vendor/booths` | [vendor/booths.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/booths.tsx): verified current/future booth assignments and related totals/map. |
| `/market/documents`, `/vendor/documents` | [DocumentsWorkspace.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/documents/DocumentsWorkspace.tsx), [Agreements.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/documents/Agreements.tsx), and [ComplianceReports.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/documents/ComplianceReports.tsx): requirements, document responses/reviews, policies, reports/exceptions. |
| Central `/account/onboarding/vendor` | [onboarding route](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/onboarding/[role].astro): separate platform role signup/progress, not a market application. |

Admin navigation/permission routing is registered in [packages/admin-core/src/index.ts](E:/coding/farmers-market-platform-web/packages/admin-core/src/index.ts), [MarketRoutes.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/market/MarketRoutes.tsx), and [VendorRoutes.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/VendorRoutes.tsx). [AdminApp](E:/coding/farmers-market-platform-web/apps/admin/src/AdminApp.tsx) uses the shared [AdminShell](E:/coding/farmers-market-platform-web/apps/admin/src/AdminShell.tsx).

### Shared UI and API infrastructure

- [ApplicationFields.tsx](E:/coding/farmers-market-platform-web/packages/ui/src/ApplicationFields.tsx) is reused by public form entry, builder previews, and read-only submitted-answer review. It renders the same question contract and omits blank optional answers in read-only mode.
- [packages/ui/src/documents.tsx](E:/coding/farmers-market-platform-web/packages/ui/src/documents.tsx) provides shared upload/share dialogs, metadata fields, document status/feedback, and version selection. `ApplicationDocuments` and the dashboards reuse these components.
- The application pages use existing shared `Button`, `Card`, `Input`, `Select`, `Textarea`, and `PhoneInput` primitives. Manager pages use shared table/dialog/status and form adapters through [market/common.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/market/common.tsx), [market/presentation.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/market/presentation.tsx), and [vendor/common.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/vendor/common.tsx).
- [market-operations.ts](E:/coding/farmers-market-platform-web/packages/api/src/market-operations.ts) provides the shared question/submission/template contracts and public/admin API factories. [application-documents.ts](E:/coding/farmers-market-platform-web/packages/api/src/application-documents.ts), [documents.ts](E:/coding/farmers-market-platform-web/packages/api/src/documents.ts), and [compliance-phase3.ts](E:/coding/farmers-market-platform-web/packages/api/src/compliance-phase3.ts) cover the connected document and policy APIs.
- GraphQL operation documents are in [public-market-operations.graphql](E:/coding/farmers-market-platform-web/packages/api/operations/public-market-operations.graphql), [market-operations.graphql](E:/coding/farmers-market-platform-web/packages/api/operations/market-operations.graphql), [application-documents.graphql](E:/coding/farmers-market-platform-web/packages/api/operations/application-documents.graphql), and [documents.graphql](E:/coding/farmers-market-platform-web/packages/api/operations/documents.graphql). Backend validation remains authoritative despite JSON responses and frontend TypeScript types.

## 7. Related systems and reusable infrastructure

### Platform Vendor onboarding

Platform role onboarding is a separate process. [AccountOnboardingService](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/customer-account/onboarding.service.ts) stores a role-specific draft with optimistic revision, accepts save versus submit, and provisions an owned Vendor or market on completion of the verified signup flow. For current verified signup, `save(..., submit=true)` calls `activateOwnedSignup()` within the transaction and completes the role; the presence of `PENDING_REVIEW` and a platform review queue does not mean every new Vendor awaits a Market Manager's approval.

The Vendor details are business name, contact name, contact email, and optional contact phone; account/phone verification is checked separately. `PlatformRoleOnboarding` retains role, state, draft, subject, verification provenance, timestamps, revision, and review fields. A SuperAdmin review path handles `APPROVE`, `RETURN`, `SUSPEND`, and `CLOSE` in the applicable states. None of this grants admission to a particular market or claims an anonymous application.

The reusable pieces already present are account identity verification, user-to-business ownership, profile prefill, draft/revision handling for role onboarding, and controlled Vendor provisioning. Their existence does not establish equivalent draft or review behavior for market applications.

### Market membership and identity linking

`MarketVendorMembershipService.request()` records Vendor-owner consent and creates/updates a pending relationship. `set()` is the market's independent approval/suspension/withdrawal operation. Approval requires an existing relationship with consent beyond `LEGACY_UNVERIFIED`; an application directory link alone does not satisfy this.

[MarketVendorLinksService](E:/coding/farmers-market-platform/src/plugins/market-operations/vendor-links.service.ts) supports manager link requests and explicit Vendor-owner confirmation. It distinguishes `EXTERNAL`, `LINK_PENDING`, `LINK_VERIFIED`, `LEGACY_UNVERIFIED`, and `LINK_REVOKED`. One market cannot have two verified directory entries for the same Vendor. Platform correction is separately SuperAdmin-restricted and audited. These paths provide directory identity proof, not market membership approval or historical reassignment.

### Document compliance

Relevant code: [service.ts](E:/coding/farmers-market-platform/src/plugins/documents-compliance/service.ts), [workflow.ts](E:/coding/farmers-market-platform/src/plugins/documents-compliance/workflow.ts), [model.ts](E:/coding/farmers-market-platform/src/plugins/documents-compliance/model.ts), [storage.ts](E:/coding/farmers-market-platform/src/plugins/documents-compliance/storage.ts), and [scanner.ts](E:/coding/farmers-market-platform/src/plugins/documents-compliance/scanner.ts).

The SQL-backed tables, defined in [DocumentsCompliance](E:/coding/farmers-market-platform/src/migrations/1792000000000-DocumentsCompliance.ts) and [DocumentsApplicationIntegration](E:/coding/farmers-market-platform/src/migrations/1792100000000-DocumentsApplicationIntegration.ts), are:

| Table | Existing role |
| --- | --- |
| `compliance_document`, `compliance_file` | Tenant-owned private document metadata and scanned file versions, with deletion/status history. |
| `compliance_requirement`, `compliance_market_settings` | Market-specific document requirement, stage, due date, review/expiration rules, distribution/blocking flags, and market automation setting. |
| `compliance_assignment` | Unique requirement/Vendor request, waiver/revision, lifecycle source, optional application/version provenance. |
| `compliance_submission`, `compliance_grant` | Explicit shared document/file snapshot and revocable market access. |
| `compliance_review`, `compliance_audit` | Decision reasons, actors, times, and append-only history. |

The upload pipeline accepts PDF, JPG/JPEG, PNG, and WebP up to 10 MiB, validates content, stores privately, and scans before availability. Owners can upload replacements and edit metadata, but previously shared submissions retain their file/metadata snapshot. Sharing again creates another document submission. Managers review the latest shared submission, with required reasons for rejection/waiver/restoring a requirement; approved review reasons may be empty. Sensitive document types are restricted by the backend policy validator.

`assignDocumentLifecycle()` is called when an authorized Vendor starts/submits an application, when a Vendor-associated application is accepted, and when canonical membership first becomes approved. Automatic application-stage requirements are assigned at start/submission; automatic after-acceptance and before-participation requirements are assigned on acceptance/membership approval. A stage label does not by itself create an enforcement gate.

Document access eligibility includes pending/approved memberships, active authorized Vendor applications, and valid pre-submission application provenance. Suspended/withdrawn memberships block this eligibility. This allows application document collection before canonical membership approval without granting commerce or attendance authority.

`validateApplicationDocuments()` blocks submission only when market automation and a required automatic application-stage document's blocking flag are enabled. A waiver or a latest live, unrevoked, unexpired share with status `Pending review` or `Approved` satisfies its query. Manager approval is therefore not universally required before applying. This is a different query from full documentation readiness; it does not apply every readiness predicate or policy acknowledgment rule.

`applicationReadiness()` summarizes the Vendor's current market-wide document and agreement assignments. It is not a frozen checklist specific to one application's template version. Account-only and anonymous records return “Vendor identity needed.” Assignments are unique per requirement/Vendor, so repeated applications do not create an independent requirement set for every submission. Application/version provenance supports traceability without turning the document store into arbitrary per-answer attachments.

### Published market policies and acknowledgments

[AdvancedCompliance](E:/coding/farmers-market-platform/src/plugins/documents-compliance/advanced.ts), [agreement-workflow.ts](E:/coding/farmers-market-platform/src/plugins/documents-compliance/agreement-workflow.ts), and the [CompliancePhase3 migration](E:/coding/farmers-market-platform/src/migrations/1792300000000-CompliancePhase3.ts) implement:

- `compliance_agreement`: market-owned editable policy draft, required/readiness flags, collection stage, automatic distribution, due date, archival, current published version.
- `compliance_agreement_version`: immutable published content, title/type, content hash, publisher/time, and reacknowledgment setting.
- `compliance_agreement_assignment`: Vendor assignment to a particular published version, with optional application/version provenance.
- `compliance_acknowledgment`: explicit actor/time acknowledgment of an assigned version, with retained history.
- `compliance_exception`: dated, optionally occurrence-specific document exception, reason/actor and audited revocation. This is not an application acceptance or a jury decision.

Managers can draft/publish policies, preview affected assignments, assign them, and request acknowledgment again on a new published version. Vendor document workspaces render assigned published policy content and require an explicit confirmation to acknowledge it. Required policies with `affects_readiness` contribute to readiness.

Application lifecycle hooks can automatically assign policies, but the public application component does not render an agreement reader or acknowledgment control. An agreement-only setup does not activate `ApplicationDocuments`, whose startup effect depends on document requirements being present. Application submission's document-blocking query does not check policy acknowledgments. Consequently, published-policy support must not be described as mandatory application-form signature collection.

### Operational readiness and notifications

[operational-readiness.ts](E:/coding/farmers-market-platform/src/plugins/documents-compliance/operational-readiness.ts), `AdvancedCompliance.report`, and shared compliance projections provide current/date-window forecasts, document expiration and outstanding-policy counts, exceptions, and report/export infrastructure. These are advisory. They do not automatically approve, reject, suspend, or withdraw applications, memberships, or participation, and the booth assignment path does not enforce a universal readiness check.

`publishPlatformEvent`, the shared outbox, inbox projection, compliance request/review history, expected revisions, same-market foreign keys, and immutable template/submission snapshots are existing reusable infrastructure. Their current contracts are documented here without selecting changes or an implementation approach.

## 8. Feature inventory table with implementation status

Definitions: **Implemented** means supported by identifiable code paths. **Partially implemented** means an existing path has material limits or missing pieces. **Not implemented** means absent from the inspected relevant models, APIs, and consumers. **Unverified** means source inspection cannot establish the result.

| Feature | Status | Evidence and practical limit |
| --- | --- | --- |
| Public application discovery | Implemented | Backend-backed `MarketPublicHome` advertises `/apply` only when the advertised published form resolves. Other appearance branches are not established by this path. |
| Private/direct-link application | Implemented | `publicApplication(slug)` permits non-retired published private templates; no invitation authentication or recipient restriction. |
| Anonymous and account-only applications | Implemented | `submit()` identity modes and required account answer; conditional on document-blocking requirements. |
| Applying as an existing Vendor | Implemented | Owner/current identity authority validated by `PlatformAccountFoundation` and revalidated at acceptance. |
| Account/profile prefill | Implemented | Explicit empty-field autofill in `MarketApplication`; no full business-profile or old-answer replication. |
| Custom forms and questions | Implemented | `Definition`, `validateDefinition`, `ApplicationBuilder`, shared `ApplicationFields`; thirteen question types. |
| Reusable application templates | Implemented | Persistent market-scoped template/version records; new drafts clone existing versions under the same template. |
| Cross-market template library/import | Not implemented | No library ownership model, import operation, or cross-market cloning path in scoped template code. |
| Conditional questions | Not implemented | No condition/branching contract or evaluation. Static `hidden` state is not conditional logic. |
| Static hidden questions | Partially implemented | Model/backend/renderer support exists; builder displays hidden state but lacks a general hide toggle. |
| Manager template drafts | Implemented | `CREATE/SAVE/CLONE_APPLICATION` and draft-only definition updates. |
| Persistent applicant drafts | Not implemented | Submission `DRAFT` enum alone; creation is directly `SUBMITTED`, no save/resume/list API. |
| Temporary sign-in progress | Implemented | Ten-minute encrypted cookie handoff; same principal/path/version, bounded size. |
| Edit submitted application | Not implemented | No update-answer operation; immutable submission/provenance triggers. |
| Required compliance documents | Implemented | Market requirements, lifecycle assignment, application-document sharing, manager review. Requires authorized Vendor identity. |
| Supporting attachments | Partially implemented | Scanned private compliance documents can support an application; no arbitrary file question or anonymous/account-only attachment upload. |
| Reusable private documents | Implemented | Saved document store, versions, explicit sharing/grants and revocation; reuse depends on Vendor ownership and requirement category. |
| Request further information | Partially implemented | `NEEDS_INFO` and generic eligible notice; separate additional-document requests exist. No application reply/edit loop. |
| Applicant application status/history page | Not implemented | No read-own-submissions API or matching page in inspected storefront/vendor/account consumers. Membership status and notifications are separate. |
| Accept/decline application | Implemented | `REVIEW_APPLICATION`; decline terminal, acceptance links directory but not canonical membership. |
| Conditional acceptance | Partially implemented | Stored flag/UI; no condition list, due date, automatic completion, or readiness gate on unconditional acceptance. |
| Manager-recorded withdrawal | Implemented | `REVIEW_APPLICATION` target `WITHDRAWN`, with accepted-obligation safeguards. |
| Applicant withdrawal | Not implemented | No applicant mutation/control. Cancelling canonical participation is different. |
| Reopen/resubmit same application | Not implemented | Declined/withdrawn terminal, answers immutable; new independent submission remains possible. |
| Internal reviewer notes | Implemented | Single application `managerNotes` field plus decision audits; no per-reviewer private notebook or comment thread. |
| Reviewer assignment, scoring, jurying | Not implemented | No reviewer assignment, rubric, score, round, or aggregation model/API/UI. Shared manager authority and revisions are not jurying. |
| Application waitlist | Implemented | Manual `WAITLISTED`; no ranked queue, automatic promotion, or waitlist notifications in application projector. |
| Date-specific application requests | Implemented | One application requests offered occurrences; per-date approvals after acceptance. No separate per-date answers/forms. |
| Date waitlist/decline/cancellation | Implemented | `REVIEW_OCCURRENCE`, separate decision and reason; explicit confirmation/cancellation safeguards. |
| Vendor category restrictions/quotas | Not implemented | Category is an answer/contact value; no application eligibility/category-capacity policy. |
| Application opening/closing deadlines | Not implemented | No application deadline fields/enforcement. Future-date filtering and document/policy due dates serve other purposes. |
| Application fees/payment prerequisite | Not implemented | No application charge model or payment gate. Explicit no-payment submission behavior. |
| Booth/rental fees | Implemented | Assignment snapshots, draft/manual invoices and manual payment recording; separate from application submission. |
| Online market invoice collection | Not implemented | `UnconfiguredMarketInvoiceProvider`; online issue rejected. |
| Submission idempotency/abuse limits | Implemented | Content/identity-aware key comparison, market/key uniqueness, network-hash hourly limit. No applicant business deduplication. |
| Application filters/bulk review | Not implemented | Submission table has no filtering/bulk controls and reads bounded whole-market data. |
| Application audit persistence | Implemented | Snapshot preservation, command result audits, explicit status/date audits, append-only audit trigger. |
| Application audit timeline/export UI | Not implemented | No application history read/timeline/export in inspected application APIs/components. Compliance reports are a different system. |
| Application notifications | Partially implemented | Submission manager notice and three applicant decision types; no general email/SMS path, anonymous notice, date-decision notice, or full status feed. |
| Published policy versions and acknowledgment | Implemented | `AdvancedCompliance`, immutable versions, explicit Vendor acknowledgment, reacknowledgment history. |
| Policy acknowledgment in public application | Not implemented | No agreement reader/ack control or policy-blocking application validation. Lifecycle assignment exists separately. |
| Automatic acceptance-to-membership/date/booth | Not implemented | Distinct consent, membership, participation, operational approval and assignment operations are required. |
| Readiness forecasts/exceptions | Implemented | Current/occurrence projections, date-scoped exceptions and reports; advisory rather than universal enforcement. |
| Current database/schema readiness | Unverified | No database access or migration inspection against a live target was authorized. |
| Working scans, live UI and notification receipt | Unverified | Source paths inspected; no scanner access, execution, browser, worker run, or tests performed. |

## 9. Known limitations and architectural constraints

1. **The applicant workflow largely ends at confirmation.** The system stores application state for managers, but does not expose a full applicant status/detail/history surface. Notices link to account or market-relationship pages, not a saved application. Anonymous people receive no claim or tracking credential.
2. **Submitted content is immutable by design in the inspected schema.** A needs-information status does not open a revision. New submissions are independent records; document replacement/sharing follows another history model.
3. **Draft terminology spans unrelated records.** Manager template drafts, role-onboarding drafts, temporary login progress, draft invoices, and the unused submission `DRAFT` value must not be represented as one applicant draft feature.
4. **Acceptance is bounded to the business/directory decision.** Canonical consent and participation are separate. `ParticipationService.configure()` allows manager authorization for cancellation, but non-cancelled changes additionally require Vendor participation authority. The manager participation UI offering planned/confirmed options does not override that backend restriction.
5. **Directory identity and historical identity are distinct.** Acceptance with proven Vendor provenance can verify the directory. Later linking cannot silently transfer old assignments. Future explicit canonical conversion is restricted by occurrence timing and assignment history. Legacy identities remain unverified until a supported verification path is used.
6. **Documentation is market/Vendor state, not a frozen application checklist.** Requirements are not embedded in the application definition snapshot. The summary may include policies and stages beyond the particular form. Repeated application/version provenance does not duplicate unique requirement/Vendor assignments.
7. **Readiness, submission blocking, and acceptance have different rules.** Pending document review can satisfy submission blocking while readiness is incomplete. Conditional acceptance is descriptive; neither it nor an after-acceptance/before-participation stage establishes universal attendance or assignment enforcement. Policy acknowledgments do not block public application submission.
8. **Templates are versioned within one market.** Direct-link/private is discoverability, not identity-based access control. The builder does not supply an invitation workflow or a visible copy-link control. The currently published version must still resolve even before an idempotent submission replay is returned.
9. **Date and waitlist semantics are manual.** Applications can contain no requested dates, and confirmed dates do not reserve booths. Waitlists have no ranking or capacity-driven promotion. Application `approvedOccurrenceIds` is not the current operational decision source.
10. **Review notes have a limited editing surface.** They are one mutable string captured in audits rather than reviewer-attributed discussion entries. Accepted applications cannot remain accepted and simply save new notes/conditional flags through the current review action. Declined and withdrawn records are locked for review changes.
11. **Application reads are capped without queue pagination.** `rows()` takes 2,000 records per operational collection ordered by ascending ID; the occurrence list in `read()` takes the latest 100 by start time descending, and eligible Vendor choices take 100. Application code does not expose total/cursor or a truncation warning. Older/larger datasets can therefore be incompletely represented, including requested dates absent from the reviewer date lookup. Public occurrence/rental resolution separately caps reads at 2,000.
12. **Document projections also have explicit bounds.** Application readiness reads at most 501 rows and summarizes 500 with an incomplete-view marker. Document request/Vendor projections and version/share histories are bounded. These are not evidence of exhaustive per-application history.
13. **The reviewer does not render every stored submission field.** Rental request snapshots are available to assignment initialization but have no dedicated review-dialog summary. Full provenance fields, original submission key, and audit history are also not presented as a manager application-history view.
14. **Submission errors are largely generic in the storefront.** Version change, validation, rate limiting, and other failures are collapsed to a common error response, except the document-required case. Source validation exists, but precise recovery behavior is not established without execution.
15. **Later financial obligations constrain reversals.** Cancellation can require assignment release, invoice handling, and additional permissions. A paid/open invoice cannot be bypassed by changing the application status. The local invoice provider does not implement online collection or sending.
16. **Stored contact fields do not prove identity or notice delivery.** Form email can differ from the authenticated account; it is contact data. Account opt-out deliberately prevents ownership association. Generic in-app events do not establish email communication with anonymous applicants or an information-request response loop.
17. **Some interface copy describes implemented pieces as planned.** `MarketApplication`'s optional signup invitation and [CentralAccount.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CentralAccount.astro) refer to future accounts, reusable documents, or application notifications. The current signup, document, and notification code paths establish narrower implemented capabilities. That copy does not establish either their absence or a completed applicant application-history feature.

These findings describe existing boundaries and gaps. They do not select future behavior or authorize changes.

## 10. Areas requiring clarification or manual verification

The following remain unverified because this audit was restricted to source inspection. No item below was executed as part of the audit.

| Area | What is not established |
| --- | --- |
| Database state | Whether the current environment has the relevant application, identity, document, and policy migrations applied; which templates, permissions, links, and applications are populated. The persistent test database was not accessed. |
| Manager and Vendor account grants | Which real local accounts hold application, assignment, membership, billing, document-write and occurrence-cancellation permissions, and whether legacy relationships carry verified consent/provenance. |
| Public application discovery | Which configured market appearances currently reach the backend-backed `MarketPublicHome`, whether an advertised form is published, and how managers obtain/distribute private links in actual use. |
| Login handoff | End-to-end restoration across the central account bridge, cookie/security settings, expired progress, changed versions, and multiple business choices. No bridge secrets were inspected. |
| File handling | Storage/scanner availability, active file-validation configuration, successful upload/share/replacement, and user-visible scan failures. |
| Notification receipt | Worker/scheduler activity, inbox preferences/suppression, correct live recipient roles, and actual receipt for market, Vendor, and account-only actors. No application email or SMS path was identified in scope. |
| Readiness presentation | Whether people understand that the application summary is current market/Vendor readiness and that conditional acceptance is descriptive rather than a blanket participation gate. |
| Policy-only markets | Actual experience when automatic application-stage agreements exist without document requirements, including where a Vendor discovers and acknowledges them. The public form has no policy acknowledgment surface. |
| Large/historical queues | Behavior when submissions exceed 2,000, dates fall outside the 100-occurrence manager projection, or compliance projections are truncated. |
| Cancellation obligations | Actual manager experience resolving invoices and canonical participation before cancelling dates or reversing acceptance, including restricted permission combinations. |
| Applicant communication practice | How managers currently obtain corrected application details or communicate with anonymous applicants outside the implemented application UI. No external communication process was inferred. |
| Meaning of a successful outcome | Whether operational use treats “accepted business,” “approved membership,” “confirmed date,” and “assigned booth” as different milestones. The code does; no business-policy reinterpretation is made here. |

