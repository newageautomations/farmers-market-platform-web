# Phase A Vendor context correction

October 29, 2026. This report supersedes the Customer/account-only management instructions in the original Phase A implementation report. The original report and system audit remain unchanged.

## Changes and root cause

Phase A treated a verified general account as sufficient application-management authority. Its list/detail queries explicitly included principal-owned account-only submissions, drafts with no Vendor, and account-only claims. Customer navigation and `/account/applications` pages exposed that policy directly.

Resume linked straight from the Admin dashboard on port 4322 to `/apply/<slug>?draft=<id>` on a different market host on port 4321. A native Vendor Admin session is not a market Shop session. The storefront handled the missing session through the ordinary account login, with return destinations under Customer Applications. In addition, both market request guards omitted Phase A's authenticated application read/command fields, blocking genuine draft operations even after a successful Shop handoff.

Application management now requires a currently verified principal with active ownership and current channel permissions for an active Vendor business. Admin operations use the selected Vendor channel; a supplied Vendor ID cannot override it. Market Shop operations require an explicit authorized Vendor selection. Lists, details, draft writes, final submission, discard, withdrawal, claims, and history all enforce this backend boundary. Customers and Vendor staff cannot gain access by knowing IDs.

Lists are scoped to the selected business. Submitted Vendor applications remain business-owned; editable drafts additionally retain their original applicant principal. A draft cannot change businesses during an update. New authenticated applications require a Vendor; anonymous submission still works. The form no longer offers “Apply with my account only.” Accounts without a business receive Vendor onboarding guidance and cannot save or submit an authenticated draft.

Customer Applications navigation and its renderer were removed. Legacy account list/detail/draft pages return HTTP 410 without fetching application data. The legacy claim page redirects only to the protected Vendor continuation, preserving any still-valid host-only proof cookie. New management destinations are exclusively under `/vendor/applications`.

## Vendor resume and signup continuity

An existing draft resumes through these bounded steps:

1. Vendor Applications links to the originating market's `/vendor/application-continue?draft=<id>&vendor=<id>&channel=<channel>`.
2. The market sets a random browser correlation cookie and a validated local return destination. These cookies are HTTP-only, host-only, and SameSite=Lax.
3. It redirects to `/vendor/applications/continue` on the existing Admin dashboard, retaining the business channel and draft ID.
4. The existing authenticated Admin session calls the Vendor-guarded `CONTINUE` command. The backend rechecks the draft owner, selected business, canonical market origin, current native session, and exact Admin request origin.
5. The existing account capability infrastructure issues a short-lived, one-use `HANDOFF` bound to the principal, market origin/storefront, and browser correlation. No Admin session cookie or reusable session token is shared with the storefront. This reuses the central account system's existing capability storage, identity materialization, exchange, and session-issuance paths.
6. The market's existing `/auth/callback` exchanges the handoff into a market Shop session. It then rechecks Vendor/draft authority and opens the original form with the saved answers and locked business selection.

A valid native Vendor session can therefore resume without a central account cookie or another password prompt. If the Admin session has genuinely expired, the existing Admin sign-in preserves the complete Vendor continuation path, selected channel, and intended destination. Invalid/expired state produces Vendor-specific recovery guidance rather than a Customer application page.

Return and detail links retain the selected channel, including reload/new-tab navigation. Switching accounts or selecting another business does not grant that identity access to the draft. Backend checks run again after the handoff and on save/submit.

After anonymous submission the CTA is **Create a Vendor account to track your application**. Existing owners may instead track with their Vendor business. Both use the existing central signup/login and Vendor onboarding flow. A small contextual selection page uses the existing SiteLayout, account panel, native select adapter and Buttons; it adds no password form or new authentication layout. A general account must finish phone verification and Vendor onboarding before continuing. Existing owners explicitly select an authorized business. Successful proof consumption redirects to Vendor Applications on port 4322 through the existing account handoff, so a different pre-existing Admin login cannot select the wrong identity.

## Claim and historical-data protections

New claims store the selected Vendor ID on the separate claim ownership record. The original anonymous application remains anonymous: submitted principal/Vendor fields, answers, definition snapshot, and identity provenance are not rewritten. Claiming does not verify a Directory Business link or grant membership, participation, or booth approval.

The existing high-entropy proof, HTTP-only originating-market cookie, verifier storage, 48-hour expiry, one-time consumption, replay protection, durable rate limit, and non-enumerating failures remain in place. Customer-only accounts cannot consume a claim. Another business cannot use a guessed record ID as authority.

Historical account-only drafts, submissions, and consumed claims without a Vendor association remain intact and inaccessible through management APIs. They are not automatically associated when an account later creates a business. Email/name matching is never used. This correction does not add a legacy reassociation workflow; any future recovery must independently verify the original claimant and explicitly authorize a Vendor association while preserving provenance. A fresh Vendor application is the available self-service alternative.

Existing application notification actions now resolve only to authorized Vendor application details. Account-only historical notices cannot link through a Customer management route. New Vendor-associated anonymous claims use the Vendor notification context for future status events. New account-only status notices are no longer projected; historical notification records remain stored with no Customer management action. No notification type was added.

## Files changed for this correction

Paths in this table are relative to the named repository. Earlier Phase A work remains in the local working trees.

| Repository | Files                                                                                                                                               | Purpose                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Web        | `packages/ui/src/ApplicantApplications.tsx`                                                                                                         | Vendor/channel-scoped list/detail actions and secure resume links                                      |
| Web        | `packages/api/src/{applicant-applications,market-operations}.ts`, schema provenance                                                                 | Vendor context contracts and current source provenance                                                 |
| Web        | `packages/admin-core/src/index.ts`                                                                                                                  | Owner-only Vendor navigation and continuation/draft routes                                             |
| Web        | `apps/admin/src/account-login.ts`                                                                                                                   | Safe preservation of Vendor application destinations through existing sign-in                          |
| Web        | `apps/admin/src/vendor/{VendorRoutes,application-continuation}.tsx`                                                                                 | Existing shell routing, continuation exchange, retained draft preview                                  |
| Web        | `apps/storefront/src/components/{MarketApplication,ClaimApplication}.tsx`                                                                           | Vendor-only form choices, locked draft identity, signup/claim guidance, Vendor returns                 |
| Web        | Customer navigation and `lib/customer-dashboard.ts`                                                                                                 | Remove Customer Applications entry                                                                     |
| Web        | Former `components/ApplicantApplications.tsx`                                                                                                       | Remove unused Customer management renderer                                                             |
| Web        | `/account/applications` route files, `account/application-signup.ts`                                                                                | Retire management and preserve safe old claim invitations                                              |
| Web        | `pages/vendor/application-{continue,return,help}`                                                                                                   | Bounded market entry, authenticated return, and recovery guidance                                      |
| Web        | `pages/account/vendor-applications.astro`, `pages/api/vendor-application-access.ts`                                                                 | Existing central account/Vendor onboarding continuation and authorized business selection              |
| Web        | Existing login/signup pages, `pages/api/account.ts`, `lib/account.ts`, `pages/auth/callback.ts`, `pages/api/applicant-applications.ts`, apply route | Preserve context and proof while reusing existing authentication/session exchanges                     |
| Web        | `tests/{market-application,application-progress}.test.*`                                                                                            | Scoped form, Customer guidance, and safe continuation checks                                           |
| Backend    | `src/plugins/market-operations/{applicant.service,entities,api,service}.ts`                                                                         | Vendor-only management, claim association, authenticated submission restriction, guarded continuation  |
| Backend    | `src/plugins/marketplace-commerce/customer-account/service.ts`                                                                                      | Reuse identity materialization and existing one-time Shop handoff for a verified native Vendor session |
| Backend    | `src/plugins/platform-identity/account-foundation.ts`                                                                                               | Include authorized Vendor channel metadata in applicant projection                                     |
| Backend    | `src/plugins/platform-identity/shop-context.middleware.ts`, `src/plugins/marketplace-commerce/market-browse.interceptor.ts`                         | Allow the specific authenticated application operations through both market guards                     |
| Backend    | `src/plugins/platform-notifications/inbox-{projector,service}.ts`                                                                                   | Vendor-only application destinations and claimed-business status context                               |
| Backend    | `src/migrations/1794500000000-VendorApplicationClaims.ts`                                                                                           | Add nullable Vendor association and index, with no backfill                                            |
| Backend    | `test/market-operations/{harness,vendor-application-context,applicant-phase-a}.ts`, `package.json`                                                  | Guarded migration and focused Vendor-context verification                                              |

The application editor is still the existing Astro market form/React island. Shared fields, buttons, cards, dialogs, status display, Vendor RouteLink, dashboard shell, account switcher, login, signup, phone verification, and Vendor onboarding are reused. There is no competing UI or authentication system.

The Market Manager builder/review UI and Directory Business selector were not edited. The manager-side `REVIEW_APPLICATION` and `REVIEW_OCCURRENCE` command blocks were not changed. Submitted-answer/provenance immutability, compliance authority, independent approvals, and accepted-application reversal safeguards remain in place. Phase B functionality was not implemented.

## Database and verification

Inspection verified loopback PostgreSQL and only `VendorApplicationClaims1794500000000` pending on `vendure_demo_market_ops`. The required guarded web command `npm run demo:market-operations:migrate` applied it successfully. It adds a nullable FK column, consistency check, and index. It does not backfill, reset, delete, reseed, or overwrite historical application data. No test accounts or fixtures were added, converted, or updated in the populated database.

Automatic approval review initially rejected the migration because it had not recognized the attached task's database permission. After rereading and providing the explicit section 6 authorization and sole-pending-migration evidence, approval review accepted it. No database approval blocker remains.

Focused verification:

- Backend `npm run test:applications:vendor-context`: nine focused checks on a guarded disposable database. Coverage includes Customer denial for each management command; Vendor owner access; cross-Vendor isolation; historical account-only preservation; real native Admin-to-market Shop handoff; wrong-origin/correlation and replay rejection; resumed save/final submit and idempotency; immutable answers; withdrawal; Vendor-only anonymous claims; expiry; historical unassociated claims; accepted application review; correct selection for multiple businesses; and revoked ownership. The successful disposable database is removed by the normal harness.
- Frontend `npx vitest run tests/market-application.test.tsx tests/application-progress.test.ts --reporter=default`: fourteen focused tests, including Customer onboarding guidance, absence of account-only management, saved Vendor identity and revision, and safe Vendor/Admin continuation destinations.
- Web `npx tsc --noEmit`, scoped ESLint, and storefront `npm run typecheck --workspace @market/storefront` check the changed shared React/TypeScript and Astro routes.
- Backend TypeScript and `APP_ENV=dev NODE_ENV=development npm run build` verify the dashboard, server, and worker build.

The previous Phase A test entry now runs these Vendor-only checks; its positive account-only management expectations were superseded by the requested policy correction.

The first integration attempts exposed the missing middleware and resolver-level market allowlist entries described above. Those were corrected, then the relevant checks were rerun. No broad regression suite, browser, browser automation, screenshots, or visual tests were used. No unrelated failing tests were repaired.

## Manual testing on the populated environment

### Safe startup

The migration has already been applied. Stop and restart existing demo processes so the backend loads the new authorization and guard code. From `E:\coding\farmers-market-platform-web`, use four terminals:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Optional read-only migration check: `npm run demo:market-operations:inspect`. It should report no pending migrations. Do not run reset, ordinary backend development commands, or reseed historical account-only data. No new fixture setup is required for these walkthroughs.

All dedicated accounts use local-development-only password **`PhaseA-Local-Only!2026`**:

| Account                          | Purpose                                                |
| -------------------------------- | ------------------------------------------------------ |
| `phase-a.applicant@example.test` | Customer/account-only applicant, no Vendor business    |
| `phase-a.vendor@example.test`    | Authorized owner of Phase A Orchard, Vendor channel 35 |
| `phase-a.other@example.test`     | Separate Customer account for isolation checks         |
| `phase-a.manager@example.test`   | Dedicated Phase A market manager, market channel 34    |

Market: **Phase A Applications Test Market**, ID 7. Form: **Phase A Seasonal Vendor Application**.

Public form:

`http://phase-a-applications-local.platform.localhost:4321/apply/6b03638e-c6e4-4f56-8f9d-7f8d8335fabb`

Historical fixture references: Vendor application 6 originally Under review and 9 Accepted; account-only submissions 5, 7, 8, 10, 11. Their current statuses may reflect your earlier manual testing. This correction does not reset them. Draft links supply the actual saved draft ID. If a draft was already submitted/discarded, create another with the existing Vendor using the public form.

### Test B and C first: Vendor dashboard and resume

1. Sign in as `phase-a.vendor@example.test` through `http://localhost:4322/vendor?channel=35&account=1`, using the password above. If you already have a valid Vendor dashboard session, retain it for this test.
2. Visit **`http://localhost:4322/vendor/applications?channel=35`**. Expect Phase A Orchard's existing draft and Vendor submissions, including 6 and 9 if still present. No account-only submissions should appear.
3. Open a submitted record. Expect original read-only answers, status, dates/rentals, permitted compliance/history, and Vendor next steps. Application 9, while Accepted, must not offer withdrawal.
4. Return to the list and click **Resume Application** on the Phase A draft. Expect a brief Vendor continuation and then the existing market form. You should not have to enter credentials again while the Admin session is valid, even if the central account session is absent.
5. Confirm saved answers and **Phase A Orchard** are retained. The business selector is locked for a saved draft. Edit an answer and click **Save draft**. Expect an updated saved timestamp.
6. Select **Return to Vendor Applications**. Expect port 4322, `/vendor/applications?channel=35`. Reopen the draft and confirm the saved answer persists.
7. Complete required answers, optionally request a market date, and submit. **View application** should open the new detail in Vendor Applications on port 4322 with channel 35. Original answers are read-only; the draft is no longer in the active draft list.
8. For a separate disposable manual application, exercise Discard draft and cancel its confirmation once before confirming. Exercise withdrawal on a newly Submitted application, cancel once, then confirm. It becomes Withdrawn while answers/history remain intact. No separate membership, participation, invoice, or booth record should be reversed.
9. If there is no remaining draft, open the public form URL, select Yes, and use **Sign in with my Vendor account** if needed. Complete the existing Vendor continuation, select Phase A Orchard, enter part of the form, and Save draft. Return to the Vendor list and repeat steps 4 through 6.

### Test A: Customer isolation

1. In a separate browser profile, sign in at `http://auth.platform.localhost:4321/account/login` as `phase-a.applicant@example.test`, password above. Do not complete Vendor onboarding for this dedicated isolation account.
2. Visit `http://auth.platform.localhost:4321/account`. There must be no Applications navigation item.
3. Visit `http://auth.platform.localhost:4321/account/applications`, `/account/applications/5`, and `/account/applications/drafts/1`. Expect the retired-route message/HTTP 410 without application answers, status, or history. The historical records remain stored.
4. Visit `http://localhost:4322/vendor/applications?channel=35` and `/vendor/applications/9?channel=35` in that profile. A Customer account must not acquire a Vendor workspace or application data. Knowing channel 35 or application 9 does not grant authority.
5. Open the public form URL and choose Yes. Sign in with this general account through the Vendor continuation if necessary. Expect **Complete Vendor onboarding**, no account-only choice, and no Save draft action. Authenticated submission remains blocked until an authorized business is selected. Choosing No still permits anonymous submission.

### Test D: Anonymous signup and secure claiming

1. Use a signed-out/private browser profile on the public Phase A form URL. Select No, complete the required fields, and submit.
2. Expect **Create a Vendor account to track your application** and **Finish without creating an account**. Finishing without signup must leave the anonymous submission intact.
3. For a claim you want to test now, follow the Vendor CTA and select **Sign in with my Vendor account**. Use `phase-a.vendor@example.test` and the password above in the same browser. No proof should be copied into a URL or another browser.
4. Select **Phase A Orchard** on the existing-account continuation. The originating market should show the selected business and **Track this application**. Confirm the action.
5. Expect `http://localhost:4322/vendor/applications/<newSubmissionId>?channel=35`. The original answers/status should display. It must not open Customer Applications. The market manager should still see the original anonymous identity/provenance.
6. Sign out and use another profile without the originating market's proof cookie. Knowing the claim/submission ID must not allow another account to claim it or see its answers. Replaying a consumed claim must fail safely; its ordinary Vendor detail remains accessible to the authorized business.
7. To test the new-business path, create a fresh anonymous submission and follow the Vendor CTA, then **Create a Vendor account**. After existing phone verification and password sign-in, an account without an active owned Vendor must complete `/account/onboarding/vendor`. It cannot manage or consume the claim merely by becoming a Customer. After successful Vendor onboarding, return through the selection and explicit claim action.
8. **SMS limitation:** the current offline demo has no verification SMS transport. Fresh signup cannot complete its phone-verification step until that existing infrastructure is separately configured. No verification bypass or seeded one-time token was added. Steps 3 through 6 using the existing verified Vendor owner are the usable manual claim workflow now.

### Test E: Authorization and business selection

1. Sign in as `phase-a.other@example.test` in another profile, using the same dedicated local password. Visit `http://auth.platform.localhost:4321/account/applications/9`: expect HTTP 410 with no data. Visit `http://localhost:4322/vendor/applications/9?channel=35`: no authorized Vendor data should load.
2. Copy a saved draft's exact Resume URL from the Vendor profile and open it as the other account. It must not expose saved answers. The Admin session must authorize the original business and draft before issuing the continuation.
3. In an account that legitimately owns multiple test businesses, select the business that owns the draft in the existing account switcher. Resume it and confirm that business remains fixed. Changing `vendor`, `channel`, or draft IDs to another business must not authorize the wrong combination. Each business list should show only that selected business's records.
4. The populated fixture intentionally has only one dedicated Vendor business. Cross-business and same-owner/multiple-business isolation are covered by the disposable automated fixture; no established business was changed to create a second populated test Vendor.
5. Historical account-only records must remain unavailable even if an account later obtains Vendor ownership. This correction does not automatically convert them or associate them by email/name.

### Test F: Market Manager regression

1. Sign in as `phase-a.manager@example.test` using `http://localhost:4322/market?channel=34&account=1`, password above.
2. Visit `http://localhost:4322/market/application-submissions?channel=34`. Existing applications should remain present, including historical account-only submissions.
3. Open a fresh submitted application from Test C or D. Verify the existing read-only answers, review status controls, and **Directory Business** selector behave as before. The selector and its identity/approval logic were not changed in this correction.
4. If accepting the fresh anonymous submission, follow the existing Directory Business rules. A Vendor claim alone must not rewrite that submission's anonymous provenance, automatically select/verify a directory business, or approve market membership/participation/booths.
5. Return as the Vendor owner and reload the corresponding detail. Expect the current status and permitted history; private manager notes must remain absent. Accepted applications cannot be withdrawn by the applicant.

## Limits and unchanged behavior

No Phase B responses, amendments, conditional questions, deadlines, jurying, fees, quotas, automatic promotion, or approval automation were added. Immutable submissions remain immutable. Draft saves are explicit. Retired/replaced template versions retain their saved work and cannot be silently submitted against another definition.

Handoffs expire after the existing short lifetime and require the target browser correlation cookie. The native resume correlation lasts two minutes; restarting Resume Application recovers an expired flow. Signup/onboarding continuation lasts 30 minutes and the anonymous claim proof retains its original 48-hour limit. Lost/expired proof requires safe recovery rather than email-only claiming.

No deploy, push, external hosting operation, browser session, or visual testing was performed.
