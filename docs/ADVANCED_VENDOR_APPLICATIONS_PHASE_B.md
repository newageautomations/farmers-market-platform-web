# Advanced Vendor Applications, Phase B

Implemented locally on October 29, 2026, on top of the existing uncommitted Phase A and Vendor-context correction. No deployment, remote Git operation, browser automation, screenshots, external account service, or new delivery service was used.

## Implemented behavior

Market Managers can open an eligible submission at `/market/application-submissions`, choose **Request Additional Information**, select original answers to clarify, add supplemental questions, review the request, and send it. Original-answer corrections retain the submitted question's type, choices, semantic validation and required setting. Supplemental questions support the existing text, yes/no, numeric, choice, date, time, email, phone and URL controls, with help and required settings. Informational-only fields cannot be response questions. A request supports up to 20 questions and 20 existing compliance requirement references.

The builder is deliberately smaller than the template editor. It does not change a published form. Supplemental choice options use a comma-separated input. Sending changes the application to `NEEDS_INFO`. Historical `NEEDS_INFO` applications with no structured request retain the existing explanatory message and can receive a real request if they have an authorized Vendor association.

Vendors answer inside their existing `/vendor/applications/<id>` detail. The requested original question and original answer remain visible above the response controls. Vendors can save incomplete progress, leave, resume, and submit. Saving displays a timestamp; subsequent edits display **Unsaved changes**. Draft saves do not complete requests or notify managers. Submitted amendments become read-only. Manager projections deliberately hide unsubmitted draft answers.

Submission returns the application to `UNDER_REVIEW`. Managers see original answers, submitted amendments, submission/review times, document statuses, and earlier rounds. They can resolve a responded request or explicitly cancel an outstanding request, then issue another round. Acceptance, decline and withdrawal remain separate decisions. They do not happen automatically when answers arrive.

Only one unresolved round is allowed per application. Final manager decisions require outstanding requests to be resolved or cancelled first. An applicant withdrawal explicitly confirms cancellation of outstanding requests, preserves all history, and retains the existing terminal-state protections. Accepted-application reversal protections are unchanged. An awaiting request cannot be hidden by moving the application to another review status.

## Local files

Paths in this table are relative to the named local repository.

| Repository and files                                                                                          | Change                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Web: `apps/admin/src/market/phase14/ApplicationInformationReview.tsx`                                         | Structured request builder, review/cancel controls, compliance references and history                                              |
| Web: `apps/admin/src/market/phase14/{ApplicationReview,Applications,OperationsRoutes}.tsx`                    | Integrates requests into the existing review, opens notification-selected submissions and refreshes decision state after revisions |
| Web: `packages/ui/src/ApplicationInformation.tsx`                                                             | Shared request record and Vendor response composition using existing fields and controls                                           |
| Web: `packages/ui/src/{ApplicantApplications,index}.tsx`                                                      | Applicant detail integration, safe notification anchor scrolling, explicit cancellation wording, shared exports                    |
| Web: `packages/api/src/{applicant-applications,market-operations}.ts`                                         | Request/response types and manager command names                                                                                   |
| Web: `packages/api/schema/{admin.graphql,provenance.json}`, `packages/api/src/generated/admin.ts`             | Additive manager command contract and generated types; existing Phase A contracts preserved                                        |
| Web: `apps/storefront/src/pages/api/applicant-applications.ts`                                                | Existing authenticated same-origin proxy permits the two response commands                                                         |
| Web: `scripts/demo-market-operations.ts`, `package.json`                                                      | Guarded Phase B fixture entry point                                                                                                |
| Web: `tests/application-information.test.tsx`                                                                 | Focused builder, save/resume and read-only response tests                                                                          |
| Backend: `src/plugins/market-operations/information.service.ts`                                               | Structured request validation, immutable history projections, revisions, responses, lifecycle, document status and events          |
| Backend: `src/plugins/market-operations/{entities,service,applicant.service,api,market-operations.plugin}.ts` | Dedicated entities, scoped manager/applicant dispatch, decision guards and plugin registration                                     |
| Backend: `src/migrations/1794600000000-ApplicationInformationRequests.ts`                                     | Additive request/amendment schema, indexes and history protection triggers                                                         |
| Backend: `src/plugins/platform-notifications/inbox-{registry,projector,service,actions}.ts`                   | Reuses application notification contracts and authorized application detail destinations                                           |
| Backend: `scripts/market-operations-demo/{phase-b-fixture,run}.ts`, `package.json`                            | Deterministic dedicated fixtures and guarded dispatch                                                                              |
| Backend: `test/market-operations/{information-phase-b,harness}.ts`                                            | Focused disposable-database qualification, migration and optional compliance integration                                           |

The new frontend files are feature compositions because the existing template builder edits whole published-form drafts, and the existing submitted-answer renderer has no request lifecycle or amendment controls. They compose `ApplicationFields`, `Button`, `Card`, `Badge`, existing `Entry`/`Control`/`Check`, and `Select`. No new UI primitive, styling system, library, dashboard shell, unrelated page or category standard was introduced. Existing layout classes provide spacing. The Phase A authentication and continuation implementations were retained.

## Persistent model and immutability

`application_information_request` stores the application/market/Vendor identity, sender, creation time, stable client key, revision, frozen question definitions, original-question references, document requirement references, status, reviewer and review time. Questions are contained in the dedicated immutable request's JSON definition, rather than added to the submitted form version. Document titles are captured when sent; current authorized statuses are projected independently.

`application_amendment` stores one response per request, current draft answers, Vendor/actor identity, revision, saved timestamps and nullable submission time. A null submission time is incomplete progress. Submission freezes the response. Original answers are never merged into this record or overwritten by it.

| State                                                | Meaning and transition                                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `AWAITING_RESPONSE`, no amendment                    | Sent, awaiting the Vendor; application `NEEDS_INFO`                                                               |
| `AWAITING_RESPONSE`, amendment without `submittedAt` | Private saved progress; application remains `NEEDS_INFO`                                                          |
| `RESPONDED`                                          | Valid response submitted; application `UNDER_REVIEW`                                                              |
| `RESOLVED`                                           | Manager reviewed the submitted response; history stays available                                                  |
| `CANCELLED`                                          | Explicit cancellation, including confirmed applicant withdrawal; existing draft/submitted content stays preserved |

Market-scoped transactions serialize requests, amendments and decisions using the same market lock. The database enforces one unresolved request per application with a partial unique index and one amendment per request with a unique constraint. Request sends use stable client keys. Revision checks reject stale saves. Exact normalized submit retries return the existing immutable response, including when JSON key order differs, without another record or notification.

Database triggers reject changes to sent request definitions/identities, changes to submitted amendments, deletion of request/amendment history, and invalid request transitions. Existing submission/provenance and published-template protection triggers remain intact. The feature changes application status/revision only. It does not change the original answer snapshot, applicant identity/contact snapshot, requested dates, rental snapshot, Vendor profile, directory contact, market membership, participation, or assignments.

Existing append-only market-operation audits record sends, draft saves, submissions, resolutions and cancellations with actor, application, request, status and timestamp. Draft progress is not advertised as a submitted amendment.

## Authorization and compliance

Manager commands require current market-scoped application management authority, an active market and the existing Administrator relationship. Application IDs and request IDs are independently checked against that market. Linking compliance requirements additionally requires the existing `ManageOwnMarketMemberships` permission. No request command grants document access.

Applicant commands go through Phase A's Vendor-only authorization, current active owner membership, verified principal and channel/business authority. They recheck the particular submission or secure claim, then restrict answers to the exact request's question IDs and recipient Vendor. Current ownership revocation blocks read and response access. Staff, other Vendors and managers using applicant endpoints cannot respond on the Vendor's behalf. Manager notes and unsubmitted progress are excluded from applicant/manager projections respectively.

An anonymous record needs the existing explicit secure Vendor claim before in-app management. No email/name matching, automatic claim or unauthenticated response link was introduced. Historical account-only submissions remain unavailable for Vendor management and require a new authorized Vendor submission. A claim alone does not create the canonical compliance identity or relationship required by the document system.

**Request a document** opens a new tab containing the existing `/market/documents?vendor=<id>&request=1` workflow. Managers create or assign requirements there, then return to the application, choose **Refresh document requirements**, and select an existing authorized assignment. Unsent questions remain in the original tab. The request stores references only. Vendors use `/vendor/documents?channel=<vendor-channel>` for upload, scanning, sharing, replacement and submission. The application shows only safe requirement titles and current compliance statuses, never document files, grants, storage metadata or private exception reasons.

Required referenced documents must have an authorized supplied/waived/exception status before the structured response can be submitted. `Pending review` is sufficient; document approval remains a separate manager operation. Optional compliance requirements retain their optional setting. Withdrawn/suspended/ineligible relationships, revoked sharing and unavailable assignments retain the existing compliance restrictions. Application request cancellation does not delete or cancel the independent compliance assignment.

## Notifications

Sending publishes one existing `market.application.status` fact with the request identity and `NEEDS_INFO`. Its existing `vendor.application.action` contract generates the application action-needed notice. No second generic status event is published for that send, and no question-level notices are created.

Submitting publishes one `market.application.responded` fact. The existing `market.application.submitted` inbox type also consumes that fact, with the broader title **Application ready for review** and response-specific text. Its permission remains `ReadOwnMarketApplications`. The manager destination selects the submission in the existing review dialog.

Vendor destinations open `/vendor/applications/<id>#information-request-<request-id>`. The existing inbox service rechecks current Vendor ownership before exposing the link and preserves only a validated request anchor. Draft saves, resolution and cancellation do not generate response-submitted notices. Durable outbox keys, the existing inbox delivery policy and receipt/intent deduplication preserve retry behavior. Delivery requires the existing worker and normal notification permissions/preferences. A request that is no longer actionable when projected may be suppressed by the existing current-state check.

Compliance creation/assignment remains a separate meaningful action with its own existing document notification. Linking an already issued requirement into an application request does not issue that compliance assignment again. No email or SMS service was added.

## Populated development database

The guarded inspect command verified loopback PostgreSQL, database `vendure_demo_market_ops`, and only `ApplicationInformationRequests1794600000000` pending. The required guarded `npm run demo:market-operations:migrate` command applied that additive migration successfully. It did not bootstrap, reset, reseed, drop, truncate or replace existing data.

Automatic approval review initially rejected migration because it did not recognize the attached request's database authorization. After surfacing section 7's explicit authorization and the inspected target, the same guarded command was approved and succeeded. No approval blocker remains.

`npm run demo:market-operations:phase-b-fixtures` creates missing dedicated records using existing provisioning, native authentication, roles, memberships, application services and compliance commands. Initial setup and an idempotent rerun succeeded. Dedicated local fixture accounts use unused reserved fictional phone identities through the existing script-only fixture pattern. There is no authentication bypass or production-facing fixture permission. Manna Roots, established managers, Phase A accounts and their saved data were not updated.

All accounts below use local-development-only password **`PhaseB-Local-Only!2026`**.

| Account                                 | Purpose                                                                       | Channel           |
| --------------------------------------- | ----------------------------------------------------------------------------- | ----------------- |
| `phase-b.manager@example.test`          | Manager, Phase B Applications Test Market                                     | 36                |
| `phase-b.vendor@example.test`           | Owner, Phase B Orchard                                                        | 37                |
| `phase-b.isolation-vendor@example.test` | Owner, Phase B Separate Vendor, no application authority over Phase B Orchard | 38                |
| `phase-b.other@example.test`            | Separate Customer/account-only negative case                                  | No Vendor channel |
| `phase-b.applicant@example.test`        | Additional dedicated Customer-only provisioning fixture                       | No Vendor channel |

Market ID: **8**. Template: **Phase B Seasonal Vendor Application**. Requested date: **June 5, 2027**, 9 a.m. to 2 p.m., America/Chicago.

Public application: `http://phase-b-applications-local.platform.localhost:4321/apply/60246743-4e5a-4ac5-8046-7430bf0f91cf`.

| Application ID | Original business name         | Prepared state                                                                   |
| -------------- | ------------------------------ | -------------------------------------------------------------------------------- |
| 14             | Phase B Create a request       | Submitted; use for Test A                                                        |
| 15             | Phase B Awaiting clarification | Awaiting response; original products clarification, required yes/no and dropdown |
| 16             | Phase B Saved response         | Partial saved response, not submitted                                            |
| 17             | Phase B Submitted amendment    | Submitted amendment awaiting manager review                                      |
| 18             | Phase B Resolved history       | Resolved request with preserved submitted answers                                |
| 19             | Phase B Accepted final         | Accepted, no amendments allowed                                                  |
| 20             | Phase B Declined final         | Declined, no amendments allowed                                                  |
| 21             | Phase B Withdrawn final        | Withdrawn, no amendments allowed                                                 |

The dedicated **Phase B product liability insurance** requirement is assigned to Phase B Orchard through the existing compliance service. No fabricated document, scan result or sharing grant was created. Use a legitimate local test file in the normal document UI for Test G.

## Focused verification

| Check                                                                                                                                               | Result                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Backend `npm run test:applications:phase-b`                                                                                                         | 13 focused checks passed in a guarded disposable database; successful test database removed |
| Web `npx vitest run tests/application-information.test.tsx tests/market-application.test.tsx tests/application-progress.test.ts --reporter=default` | 17 tests passed across three files                                                          |
| Web `npx tsc --noEmit`                                                                                                                              | Passed                                                                                      |
| Scoped ESLint on the changed application UI, API adapter, proxy, fixture wrapper and test files                                                     | Passed                                                                                      |
| Storefront `npm run typecheck --workspace @market/storefront`                                                                                       | Passed, 187 Astro files, no errors/warnings                                                 |
| Admin `npm run build --workspace @market/admin`                                                                                                     | Passed; existing large-chunk advisory remains                                               |
| Backend `npm run test:market-operations:types`                                                                                                      | Passed                                                                                      |
| Backend `npm run demo:market-operations:types`                                                                                                      | Passed                                                                                      |
| Backend `npm run build`, with `APP_ENV=dev`, `NODE_ENV=development`                                                                                 | Passed dashboard, server and worker                                                         |
| Guarded persistent migration and dedicated fixtures                                                                                                 | Passed; existing data preserved; fixture rerun preserved application IDs and progress       |

Backend checks cover manager/current Vendor authority, cross-market/business isolation, unrequested answer rejection, required/type validation, private progress and resume, stale revisions, immutable original answers and submitted amendments at SQL level, idempotent sends/submissions, multiple rounds, explicit cancellation/final-decision guards, ownership revocation, real compliance assignment references and missing-document submission blocking, notification delivery/deduplication/destinations, accepted/declined/withdrawn records, legacy `NEEDS_INFO`, and unclaimed anonymous records.

The initial sandboxed backend attempt could not connect to loopback PostgreSQL (`EACCES`); the permissioned guarded test succeeded. Non-failing existing output includes a pg concurrent-query deprecation notice, the admin bundle-size advisory, and the demo server's existing login-CSRF configuration warning. These were not expanded into unrelated changes. No full test suite, browser workflow, scanner acceptance run or visual comparison was performed.

## Begin manual testing

From `E:\coding\farmers-market-platform-web`, start or restart these in separate PowerShell terminals so the running processes load Phase B:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

These select `vendure_demo_market_ops`. Do not substitute ordinary backend development commands. The serve helper uses the existing local scanner startup; Docker Desktop and the configured scanner must be available for document uploads. Use separate browser profiles for manager, owner and isolation account to keep sessions independent.

Manager sign-in: `http://localhost:4322/market?channel=36&account=1`, account `phase-b.manager@example.test`, password above. Open `http://localhost:4322/market/application-submissions?channel=36`.

Vendor sign-in: `http://localhost:4322/vendor?channel=37&account=1`, account `phase-b.vendor@example.test`, same password. Open `http://localhost:4322/vendor/applications?channel=37`.

### Test A, manager creates an information request

1. Open `http://localhost:4322/market/application-submissions?channel=36&submission=14`. Expect the review dialog for **Phase B Create a request**.
2. Choose **Request Additional Information**, then **Clarify an answer**. Select **What will you bring to the market?**. Enter **Which products are produced by your own business?** as the clarification.
3. Choose **Ask a new question**. Label it **Do you produce these goods locally?**, select **Yes/No**, and leave **Response required** checked. Optionally add a required dropdown called **Preferred stall setup**, with choices `Canopy,Table only,Food truck`.
4. Choose **Review request**. Confirm the intended labels, context, type and number of document references. Choose **Send request** once.
5. Expect application `NEEDS_INFO`, one awaiting request and the original read-only answers. There must be no free editing of other application fields. Reopening the application retains the sent request. Its questions cannot be edited after sending.

### Test B, Vendor sees the request

1. As the Vendor owner, open `http://localhost:4322/vendor/applications/14?channel=37`.
2. Expect **Additional information requested**, the original question/answer, clarification, and the appropriate new inputs inside this detail.
3. Open application 15 if Test A has not been completed. It has a prepared correction, required yes/no question and required dropdown.
4. Confirm dates, rentals and original submitted answers remain read-only. Private manager notes must not appear.

### Test C, save and resume

1. In application 14 or 15, enter only the products clarification. Leave a required supplemental question blank.
2. Expect **Unsaved changes**. Choose **Save progress**. Expect a saved timestamp, no submitted status and application `NEEDS_INFO`.
3. Return to **All applications**, then reopen the same application. Expect the saved answer and blank remaining fields.
4. As manager, reopen that submission. Expect an awaiting response, without the Vendor's unfinished answers. Saving must not generate a manager response notice.
5. Application 16 independently demonstrates already saved progress.

### Test D, submit amendments

1. Complete all required questions, including the yes/no and dropdown controls. Try to submit with a required field blank first and confirm validation prevents completion.
2. Choose **Submit response**. Expect `UNDER_REVIEW`, **Response submitted**, submission time and read-only amended answers.
3. Reload and confirm there is no **Save progress** or editable response control for that request. The original products answer, dates, rentals and identity remain unchanged.
4. Application 17 independently demonstrates a submitted amendment.

### Test E, manager review

1. Open the submitted application as manager, or open application 17 directly using `http://localhost:4322/market/application-submissions?channel=36&submission=17`.
2. Compare the original answer and submitted amendment. Verify the supplemental answers and submission date.
3. Attempt to accept while the request is unresolved. Expect a refusal requiring resolution/cancellation, with history retained.
4. Choose **Mark request resolved**. Expect **Reviewed and resolved**, review time and `UNDER_REVIEW`. Acceptance remains a separate decision.
5. Open application 18 for a prepared resolved example.

### Test F, multiple rounds

1. After resolving a response, choose **Request Additional Information** again on the same application.
2. Ask another clarification, review and send it. Expect a second distinguishable request, `NEEDS_INFO`, and the earlier resolved questions/answers still visible.
3. Respond as Vendor. Expect only the new round to be editable. Submit, then resolve as manager.
4. Confirm the original submission and the first submitted amendment are unchanged. Another unresolved round must block a new overlapping request.

### Test G, document request

1. Use application 18 after resolving any active round, or another eligible dedicated application without an unresolved request.
2. In the builder choose **Request a document**. This opens `http://localhost:4322/market/documents?vendor=<Phase-B-Orchard-id>&request=1` with the existing workflow's Vendor selection.
3. Use the already assigned **Phase B product liability insurance** requirement. If testing a new additional requirement, create/assign it using the existing compliance UI and its normal permissions. Do not create a general attachment question.
4. Return to the application tab and choose **Refresh document requirements**. Your unsent questions should remain. Select the insurance requirement and send the request. Existing assigned requirements appear by name and current status.
5. As owner, open the application and choose **Open requirements and documents**. Expect `http://localhost:4322/vendor/documents?channel=37`.
6. Upload a suitable harmless local test PDF/image, complete the normal document metadata, wait for its scan, and explicitly submit/share it against the insurance requirement. A new uploaded private file alone does not satisfy sharing. Do not bypass scan failures or manufacture grants.
7. Return to the application. Before required document supply, response submission must fail safely. After authorized supply, expect **Pending review** or the current existing compliance status, and allow the structured response to be submitted.
8. As manager, review the document in the existing document UI. Application response submission must not approve it automatically. Revocation/expiry/ineligible relationships must continue to affect the displayed status.
9. An anonymous claimed record without a compliance-eligible relationship must explain the limitation and remain subject to compliance refusal. Claiming never grants document authority.

### Test H, notifications

1. Keep the guarded worker running and note the current inbox before sending a fresh round in Test A or F.
2. Expect one Vendor application action-needed notice for that round, with concise additional-information text. There must not be a second generic needs-information notice or one notice per question.
3. Select the notice as the authorized owner. Expect the existing application detail and the relevant request section. No response editor belongs in the notification drawer.
4. Save unfinished progress. Expect no manager response-submitted notice.
5. Submit the completed response. Expect one **Application ready for review** notice for the market manager, with response-specific text. Select it and expect the relevant application review dialog.
6. Repeated refresh/retry must not create another amendment or duplicate action notice. A separately created compliance assignment retains its separate existing document notice.

### Test I, authorization and terminal states

1. Sign into `phase-b.isolation-vendor@example.test` using `http://localhost:4322/vendor?channel=38&account=1`, same local password. Its application list must not contain Phase B Orchard's records.
2. Try `http://localhost:4322/vendor/applications/15?channel=38`. Expect unavailable/denied data and no response fields. Changing the URL to channel 37 must not confer that business's authority.
3. Sign into `phase-b.other@example.test` through `http://auth.platform.localhost:4321/account/login`. This Customer-only account must not gain Vendor application access. Historical Customer application routes retain Phase A's restrictions.
4. As manager, open applications 19, 20 and 21. Expect no request builder on Accepted, Declined or Withdrawn applications. As the owner, those details must not allow new amendments; Accepted must not offer withdrawal.
5. On a separate eligible application with an unresolved request, try a final decision. Expect an explicit resolve/cancel requirement. Cancelling must preserve the request/history. A Vendor withdrawal must explain cancellation before confirmation.
6. Existing account-only/legacy anonymous applications without an authorized Vendor association must show the appropriate limitation instead of a fabricated structured response. Existing `NEEDS_INFO` alone does not manufacture a request.

## Safe fixture recovery and limitations

Read-only inspection is available with `npm run demo:market-operations:inspect`. It should now show no pending migrations. To recreate missing dedicated setup, run `npm run demo:market-operations:phase-b-fixtures` from the web directory. It checks the actual database/loopback target and refuses pending migrations. It adds missing dedicated records, prints their actual IDs/channels/routes and leaves existing answers, decisions and manual progress intact. Never run reset/remove/reseed commands to repeat these tests.

Rerunning fixtures does not rewind a completed manual workflow. If application 14 has already progressed, continue through another resolved round or submit a fresh application from the public Phase B form while signed in as Phase B Orchard. Use its new application ID. Do not delete immutable history or manually change original answers to restore a starting state.

Manager builder work remains local until sent; there is no persistent manager request draft or autosave. Vendor progress saves are explicit. There is no concurrent active-round editing or request-definition editing after sending; cancel/resolve and send a new round. Detailed errors remain safe/generic, so a stale revision may require reload. Supplemental options are comma-separated and cannot contain embedded commas in this simple editor. Requirement references/status projections are bounded to 100 available compliance assignments and preserve existing document relationship limits.

No arbitrary attachments, direct file download UI, anonymous response editor, new Customer management, general editing of submitted applications, Phase C conditions, deadlines, jurying, fees, quota logic, waitlist automation, membership/participation/booth automation, broad list redesign, messaging system, email/SMS delivery, unrelated refactoring or dependency upgrade was implemented. Full UI/mobile behavior and scanner-dependent document upload remain for the manual walkthrough above.
