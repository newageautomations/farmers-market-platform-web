# Advanced Vendor Applications, Phase A

Implemented locally on October 29, 2026. The original system audit is unchanged. No browser, browser automation, screenshots, deployment, remote Git changes, or external services were used.

## Implementation

Authenticated applicants now have an Applications dashboard in the existing Customer account and Vendor dashboard shells. Both use the same application list and submitted-detail presentation. Lists show the market, template, status, saved/submitted date, and a primary action. Drafts and all seven submitted lifecycle statuses are supported. Submitted lists page in batches of 30. Drafts are capped at 100 active drafts per account.

Details show original read-only questions and answers, requested dates and their independent current decisions, requested rental snapshots, authorized compliance readiness, submission date, and safe status history. Private manager notes, audit reasons, submission keys, identity internals, and other applicants' data are excluded. Acceptance explicitly remains separate from membership, date participation, and booth assignment. Existing Vendor workflows provide the next steps.

Applicants can save incomplete drafts, leave and resume from another authenticated session, edit, submit, and discard through confirmation. A saved timestamp distinguishes saved work from subsequent unsaved edits. Final submission uses the existing submission service, answer validation, document checks, date/rental validation, and idempotency path. The original submitted application schema and its immutable-answer/provenance triggers remain intact.

Drafts retain their original version. Republishing or retiring a template blocks submission of that old draft. Saved original answers remain readable through the saved-draft route; the user can contact the market or start another application. Phase A does not silently migrate answers between definitions.

Anonymous applications remain available. Successful anonymous submission now offers **Create an account to track your application**, plus a finish-without-signup option. The existing signup, phone verification, password login, and account handoff retain the return destination. Linking requires an explicit action from the authenticated recipient after returning to the originating market.

Authorized applicants can withdraw only `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_INFO`, or `WAITLISTED` submissions. Confirmation explains that unrelated operational records are not reversed. Drafts are discarded instead. Acceptance/decline/withdrawal restrictions are enforced by the backend under the same market lock used by manager decisions.

## Local files and routes

### Frontend

| Route or file group                                              | Purpose                                                                                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `/account/applications`                                          | Customer/account application list, including accounts without a Vendor business                |
| `/account/applications/<submissionId>`                           | Applicant-only read-only submitted details and withdrawal                                      |
| `/account/applications/drafts/<draftId>`                         | Original saved draft display, including changed/retired forms                                  |
| `/account/applications/claim/<submissionId>`                     | Explicit secure account-link action                                                            |
| `/vendor/applications`, `/vendor/applications/<submissionId>`    | Shared application experience inside the existing Vendor shell                                 |
| `/apply/<slug>?draft=<draftId>`                                  | Resume the original editable form when still published                                         |
| `/account/application-signup?application=<submissionId>`         | Start signup with the existing validated account handoff                                       |
| `/api/applicant-applications`                                    | Same-origin, bounded authenticated read/command proxy                                          |
| Existing `/api/market-application`                               | Issues the server-generated anonymous proof cookie and forwards only its secret to the backend |
| Existing signup/login/account action routes and `lib/account.ts` | Preserve signup, verified-password-login, and draft/claim return destinations                  |

New feature files are under `apps/storefront/src/components/{ApplicantApplications,ClaimApplication}.tsx`, `apps/storefront/src/lib/applicant-applications.ts`, the routes above, `packages/api/src/applicant-applications.ts`, and `packages/ui/src/ApplicantApplications.tsx`.

Existing changes include `MarketApplication.tsx`, Customer navigation, Vendor route/service adapters, the admin navigation registry, shared API exports, GraphQL documents/schema/generated contracts, shared UI exports, a layout-only CSS rule, the demo command wrapper/package scripts, and focused frontend tests.

Shared Button, Card, Badge, Dialog, EmptyState, Spinner, ApplicationFields, existing form fields, dashboard shells, and Vendor RouteLink are reused. The new applicant feature composition is necessary because manager review contains privileged controls and private notes, and no applicant list/detail composition existed. It introduces no primitive, competing design standard, or new UI library. Customer pages remain Astro SSR with bounded React islands. Layout CSS only adds grid spacing and minimum-width behavior.

### Backend

| File                                                                       | Change                                                                                                                  |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/plugins/market-operations/applicant.service.ts`                       | Principal/business authority, safe list/detail projections, draft lifecycle, claims, withdrawal                         |
| `src/plugins/market-operations/entities.ts`                                | Separate `ApplicantApplicationDraft` and `ApplicantApplicationClaim` entities                                           |
| `src/plugins/market-operations/api.ts`                                     | Authenticated Shop/Admin `applicantApplications` query and `applicantApplicationCommand` mutation                       |
| `src/plugins/market-operations/market-operations.plugin.ts`                | Registers the shared service and resolvers                                                                              |
| `src/plugins/market-operations/service.ts`                                 | Submission reference, optional anonymous proof verifier, retry verification, internal market-context submission support |
| `src/plugins/marketplace-commerce/customer-account/controller.ts`          | Existing server-only verified central-account bridge adapters                                                           |
| `src/plugins/platform-notifications/inbox-{projector,service,actions}.ts`  | Existing application notices resolve authorized detail destinations, including subsequently claimed accounts            |
| `src/migrations/1794400000000-ApplicantSelfService.ts`                     | Additive draft/claim tables, ownership indexes, immutable consumed claims                                               |
| `scripts/market-operations-demo/{run,phase-a-fixture}.ts`, package scripts | Guarded inspection and idempotent dedicated test-data setup                                                             |
| `test/market-operations/{harness,applicant-phase-a}.ts`                    | Disposable migration and focused security/lifecycle qualification                                                       |

All backend paths above are relative to `E:\coding\farmers-market-platform`. Frontend paths are relative to `E:\coding\farmers-market-platform-web`.

## Authentication and ownership

- Every applicant operation requires the existing verified, nondeleted account and phone identity. The existing central-account bridge authenticates its own account capability before calling this service. Shop/Admin sessions retain their existing authority boundaries.
- Account-only drafts and submissions are principal-owned. Vendor drafts/submissions additionally require current active owner membership and current channel-scoped business grants. Staff permissions alone do not authorize business application access. Removing ownership blocks access even for the original business applicant.
- Lists select authorized principals, owned Vendors, and separately claimed submissions. Details and commands independently recheck authority. Market, template version, selected Vendor, and offered date/rental identities are validated on saves and submissions.
- Draft saves use revision checks and a principal/client key. Principal locking serializes create retries and quotas. Final draft submission uses a stable server-owned idempotency key and retains a reference to its created submission for retry recovery. Saved work cannot mutate an already submitted record.
- Anonymous proof uses 32 random bytes. The raw credential lives in a host-only, HTTP-only, SameSite=Lax cookie on the originating market. It is never included in URLs, browser JavaScript responses, ordinary lists, notes, or audit records. A SHA-256 verifier is stored separately, excluded from ordinary entity selection. The proof expires 48 hours after submission.
- Claiming requires both that credential and a verified authenticated account. The claim row is locked, consumed once, and retained as separate ownership evidence with actor/time audit. Replays, expired/missing proofs, wrong application IDs, and already claimed records return the same unavailable error. Attempts use the existing account rate-counter infrastructure, under a claim-specific namespace, and are durably limited to 10 per account per hour, including failures, without recording guessed IDs or secrets. Failed guesses do not create audit entries in unrelated markets.
- Original anonymous identity/provenance remains anonymous after claiming. Claiming grants account access only. It creates no Vendor ownership, directory identity verification, membership, participation, invoice, or booth assignment.
- Legacy anonymous applications have no proof and cannot be claimed by email/name matching. Safe recovery requires market-assisted verification through an independently established identity process. Do not manually rewrite immutable applicant provenance or manufacture a claim credential. A new authenticated application is the available self-service alternative.
- Withdrawal records a safe applicant event and preserves answers/history. Manager accepted-application reversal safeguards and downstream operational controls are unchanged.
- Existing notification rows receive an application detail destination only when the current recipient can access that submission. Revoked business owners/staff do not receive an authorized detail link through this change. No new notification type was introduced.

## Database and prepared data

The target was inspected using `npm run demo:market-operations:inspect` from the web directory. It verified loopback PostgreSQL, `vendure_demo_market_ops`, and only `ApplicantSelfService1794400000000` pending. The migration was applied using the required `npm run demo:market-operations:migrate` command. It created two tables and indexes; it did not reset, truncate, reseed, or replace existing data. The populated database is ready for this phase.

Automatic approval review initially rejected migration because it had not recognized the task-specific authorization. After rereading and providing the attached request's explicit section 7 authorization, review accepted the guarded migration. No approval blocker remains.

`npm run demo:market-operations:phase-a-fixtures` completed and then completed again as an idempotency check. It uses existing market/Vendor provisioning, native account creation, normal restricted roles/memberships, normal submission, and manager decision services. Only dedicated Phase A actors receive script-only synthetic phone identity fixtures using unused reserved fictional numbers. No authentication bypass, public test endpoint, or production-facing test permission was added. Existing Manna Roots, established managers, and other clean accounts were not changed.

The fixture refuses collisions with unrelated identities. An initial attempt encountered an already assigned fictional phone, stopped without replacing it, and was corrected to allocate an unused reserved number. An initial session-cleanup mismatch was corrected before the successful rerun. These corrections did not reset the dataset.

### Local-development-only credentials

All four dedicated accounts use password **`PhaseA-Local-Only!2026`**. This is newly created local fixture data, not an existing secret.

| Account                          | Role                                  | Exact entry point                                   |
| -------------------------------- | ------------------------------------- | --------------------------------------------------- |
| `phase-a.applicant@example.test` | Account-only applicant                | `http://auth.platform.localhost:4321/account/login` |
| `phase-a.other@example.test`     | Separate account with no applications | Same central login                                  |
| `phase-a.vendor@example.test`    | Owner of Phase A Orchard              | `http://localhost:4322/vendor?channel=35&account=1` |
| `phase-a.manager@example.test`   | Manager of the Phase A test market    | `http://localhost:4322/market?channel=34&account=1` |

Market: **Phase A Applications Test Market**, ID **7**, channel **34**. Vendor: **Phase A Orchard**, channel **35**. Application: **Phase A Seasonal Vendor Application**. Requested test date: **June 5, 2027**, 9 a.m. to 2 p.m. America/Chicago.

Public form:

`http://phase-a-applications-local.platform.localhost:4321/apply/6b03638e-c6e4-4f56-8f9d-7f8d8335fabb`

The fixture also created one incomplete account draft and one incomplete Vendor draft. Their Resume actions supply the correct draft ID. Do not assume that application IDs are identical in another database; the fixture prints its actual IDs on rerun.

| Submission ID in this populated database | Status            | Applicant                        |
| ---------------------------------------- | ----------------- | -------------------------------- |
| 5                                        | Submitted         | `phase-a.applicant@example.test` |
| 6                                        | Under review      | `phase-a.vendor@example.test`    |
| 7                                        | Needs information | `phase-a.applicant@example.test` |
| 8                                        | Waitlisted        | `phase-a.applicant@example.test` |
| 9                                        | Accepted          | `phase-a.vendor@example.test`    |
| 10                                       | Declined          | `phase-a.applicant@example.test` |
| 11                                       | Withdrawn         | `phase-a.applicant@example.test` |

## Focused verification

| Check                                                                                                             | Result                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Backend `npm run test:applications:phase-a`                                                                       | Passed 15 focused checks against a guarded disposable database; migration applied there and successful database removed |
| Frontend `npx vitest run tests/market-application.test.tsx tests/application-progress.test.ts --reporter=default` | Passed 11 tests                                                                                                         |
| Web `npx tsc --noEmit`                                                                                            | Passed                                                                                                                  |
| Storefront `npm run typecheck --workspace @market/storefront`                                                     | Passed, 183 Astro files, no errors/warnings                                                                             |
| Scoped ESLint on changed TypeScript/React files                                                                   | Passed after correcting a ref used during render and loading-effect state handling                                      |
| Backend `npm run test:market-operations:types`                                                                    | Passed                                                                                                                  |
| Backend `npm run demo:market-operations:types`                                                                    | Passed                                                                                                                  |
| Backend `npm run build` with `APP_ENV=dev`, `NODE_ENV=development`                                                | Passed dashboard, server, and worker build                                                                              |
| Populated-database migration/setup                                                                                | Guarded migration passed; dedicated fixture setup and idempotent rerun passed                                           |

The first unconfigured backend build stopped at `APP_ENV_EXPLICIT_MODE_REQUIRED`; the explicit local-development build passed. No unrelated failing tests were repaired. Disposable test attempts retained databases when qualification stopped; only successful disposable runs removed their own database. No destructive test harness was pointed at the populated database.

Backend coverage includes incomplete save/resume across sessions; final validation; revision conflicts; market/template/Vendor mismatches; cross-account reads and mutations; idempotent final submission; immutable answers and original identity at SQL level; safe projections; proof secrecy, binding, expiry and replay; a newly registered phone-verified account claiming without Vendor provisioning; account-only draft submission through the authenticated central-account service; withdrawal and terminal statuses; template publication changes; owner revocation; durable failed-claim limits; and notification destination metadata.

No broad repository test suites or visual testing were run.

## Manual walkthrough

### Start the populated environment

The migration and fixture setup have already run. To inspect or safely recreate missing dedicated fixtures, use the web directory:

```powershell
cd E:\coding\farmers-market-platform-web
npm run demo:market-operations:inspect
npm run demo:market-operations:phase-a-fixtures
```

If inspection reports the Phase A migration pending in a different copy of the environment, run `npm run demo:market-operations:migrate` before fixture setup. Do not use reset or ordinary backend development commands.

Start each process in its own terminal from the web directory:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

These reuse the existing ignored local account environment. Do not change the configured database to `vendure`. Use separate browser profiles/private windows when comparing accounts, or sign out before changing accounts.

### First test: account-only draft, leave, and resume

1. Sign in at `http://auth.platform.localhost:4321/account/login` as `phase-a.applicant@example.test`, password `PhaseA-Local-Only!2026`.
2. Visit `http://auth.platform.localhost:4321/account/applications`. The list should show the incomplete Phase A draft and submissions 5, 7, 8, 10, and 11. No Vendor business is required.
3. Open the public form URL above to create a fresh draft, select Yes, and use **Sign in to my platform account** if the market has no local session yet. The central bridge returns you to the application.
4. Choose account-only if asked, enter only a business name, and select **Save draft**. Other required fields may remain empty. Expect a saved timestamp and a draft ID in the URL, with no submitted success message.
5. Leave for `/account/applications`, close the tab, and return to Applications. Select **Resume draft**. Expect the saved name and original question version. In another browser/device, sign in with the same account and use that same list action; persisted values should be available.
6. Change the business name and save again. Expect a new saved timestamp. A stale second session should fail to overwrite the newer revision and should direct you to reload/resume the latest saved copy.

### Submit and inspect read-only details

1. Continue the preceding draft as `phase-a.applicant@example.test` on the same Phase A market/form.
2. Complete business name, first/last contact names, email, and any displayed required fields. Optionally answer the seasonal-products question and request June 5, 2027.
3. Select **Submit application**, then **View application**. Expect Submitted status, original read-only answers, requested-date Pending decision, empty rentals if none were requested, and the submission timestamp/history.
4. Reload and revisit `/account/applications`. The draft should be gone from the active draft list and the submitted record should remain. Retrying the same final draft submission must not create another submission.
5. Sign in as `phase-a.manager@example.test` at the manager entry above, then open `http://localhost:4322/market/application-submissions?channel=34`. Open the new application. The same original answers should be present. Add a private manager note and move it to Under review.
6. Return to the applicant detail and reload. Expect Under review and safe status history. The private note must not appear.

### Vendor application and accepted next steps

1. Sign in using the Vendor entry as `phase-a.vendor@example.test`, password `PhaseA-Local-Only!2026`.
2. Visit `http://localhost:4322/vendor/applications?channel=35`. Expect the Vendor draft, application 6 Under review, and application 9 Accepted.
3. Resume the Vendor draft. Sign in through the market bridge if prompted, confirm **Phase A Orchard** as the applying business, complete or save the draft, and return to Applications. The ownership check runs again on save and submit.
4. Open `http://localhost:4322/vendor/applications/9?channel=35`. Expect Accepted, read-only answers, requested-date decisions, and links to existing market relationships, documents, and booths. **Withdraw application** must be absent.
5. Visit the linked membership/participation/booth workflows. Application acceptance alone must not create approved membership, confirmed canonical participation, or an assigned booth.

### Withdraw an eligible application

1. As `phase-a.applicant@example.test`, open `http://auth.platform.localhost:4321/account/applications/5` or the newly submitted record from the preceding walkthrough.
2. Select **Withdraw application**. Cancel once and verify nothing changed.
3. Open the confirmation again and confirm. Expect Withdrawn, preserved answers, a withdrawal entry in history, and no remaining withdrawal action.
4. Reload; it should remain Withdrawn. Repeat with application 8 to exercise Waitlisted withdrawal if desired. Under review and Needs information are also eligible, while Accepted, Declined, and Withdrawn are rejected by the backend.
5. As the manager, revisit the same submission in `/market/application-submissions?channel=34`. Expect Withdrawn without deletion or changes to original answers. Unrelated records are not automatically reversed.

### Discard a draft

1. As the account-only applicant, visit `http://auth.platform.localhost:4321/account/applications` and choose an unused Phase A draft.
2. Select **Discard draft**, cancel, and verify it is still listed.
3. Confirm the discard. It should disappear and be unavailable through its old draft URL. A submitted application must never be discarded through this action.

### Anonymous submission and secure claiming with an existing verified account

1. In a signed-out browser profile, visit the public Phase A form URL. Select No, complete the required answers, and submit.
2. Expect the prominent **Create an account to track your application** action and the secondary finish-without-signup option. The original application is already submitted regardless of the choice.
3. Follow the signup action, then use **Sign in to an existing account** on the signup page. Sign in as `phase-a.other@example.test`, password `PhaseA-Local-Only!2026`. Use the same browser and originating market; do not copy a secret or URL token.
4. Expect to return to the market's `/account/applications/claim/<newId>` page. Select **Track this application**. Expect the application detail and its original Submitted status/answers.
5. Visit `/account/applications` as that account. The newly claimed application should now be visible. This account still has no Vendor business or membership created by claiming.
6. Reloading/replaying the claim route must not claim it again. The application remains available through the ordinary detail route after a successful claim.
7. In a different browser, sign in as `phase-a.applicant@example.test` and try the exact detail URL. Expect unavailable, with no answers disclosed.

### Anonymous submission, new signup, and claiming

1. Start with another anonymous submission in the same signed-out browser, using the Phase A form. Follow **Create an account to track your application**.
2. On the existing central signup page, enter a new account email, your own reachable phone, and a password meeting the displayed policy. Use the same browser. No Vendor onboarding is needed.
3. Complete the existing SMS verification page. On success, sign in with the newly created email/password. The signup return preserves the originating market and claim page through that sign-in.
4. On returning to `/account/applications/claim/<newId>`, select **Track this application**. Expect read-only Submitted detail and no Vendor/membership provisioning. The manager's original submission provenance remains Anonymous.
5. Important environment limitation: the current offline populated demo disables external delivery and does not configure a verification SMS transport. In this environment step 2 reports delivery unavailable, so a genuinely new manual signup cannot complete until the existing SMS verification infrastructure is separately configured. No code or secret is seeded to bypass verification. Use the preceding existing-verified-account workflow to manually validate claiming now. The automated disposable check completed actual new signup, OTP verification, claiming, and account-only drafting using the existing guarded test SMS transport.

### Negative authorization and terminal-status checks

1. Sign in centrally as `phase-a.other@example.test`, password `PhaseA-Local-Only!2026`. Its initial list is empty unless you have claimed a fresh application during testing.
2. Visit `http://auth.platform.localhost:4321/account/applications/5` and `/account/applications/9`. Expect unavailable; neither another account's answers nor Vendor data should load. Trying someone else's draft URL likewise fails.
3. Sign in as the Vendor and inspect `/vendor/applications/9?channel=35`; Accepted has no withdrawal control. Sign in as the account-only applicant and inspect `/account/applications/10` and `/account/applications/11`; Declined and Withdrawn also have no withdrawal control.
4. Application 7 shows Needs information with contact-the-market guidance and no invented answer-amendment workflow.
5. To inspect proof failure behavior, revisit a new claim URL in a different browser without its host-only proof cookie. Expect the same unavailable/recovery message. Do not paste raw credentials into URLs or logs.

### Changed or retired form

1. Create and save a fresh Phase A draft as the applicant. Record its Resume URL.
2. As the dedicated manager, open `http://localhost:4322/market/applications?channel=34`, clone the published application into a new version, change a question, and publish it. Alternatively retire the dedicated test template.
3. Return to the applicant list. The old draft should offer saved-work viewing and contact guidance rather than submitting against a different definition. Its original saved answers remain readable; old-version submission is rejected.
4. This deliberately changes the dedicated test form and may prevent fixture reruns that assume a published version. Republish an appropriate manager-owned draft when you finish. Do not modify established markets for this scenario.

## Deferred work and practical limits

Phase B information requests, amendments, structured responses, conditional questions, opening/closing schedules, jurying/scoring, fees, waitlist promotion, quotas, general attachment question types, and manager-review redesign are not implemented. Acceptance still creates no automatic membership or booth approval.

Drafts require an explicit save; they are not an autosave system. Changed definitions require deliberate fresh applications instead of answer migration. Claim proofs are browser/market-bound and expire after 48 hours; signup continuity expires after 30 minutes. Losing the cookie prevents self-service claiming. Existing legacy anonymous submissions remain unclaimable without independently verified manual recovery.

Application lists share the underlying applicant API rather than importing privileged manager controllers. Compliance uses the existing authorized readiness projection; no new document-upload authority is granted to account-only or anonymous applicants. No new email/SMS notification delivery or authentication provider was configured.
