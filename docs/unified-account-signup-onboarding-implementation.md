# Unified account signup, role onboarding, and dashboard mode switching

Implementation report, October 10, 2026. Work was performed locally in `E:/coding/farmers-market-platform-web` and `E:/coding/farmers-market-platform`. This is the only new report for this phase. The previous [unified identity report](E:/coding/farmers-market-platform-web/docs/unified-platform-identity-implementation.md) was reviewed against source and preserved byte for byte.

## 1. Executive Summary

Implemented working free registration, email verification followed by native Vendure password activation, central login and account restoration, recovery, personal profile editing, password changes, preferences, and logout. A Customer-only person now has a central account dashboard with explicit Vendor and Market onboarding entry points. Both onboarding flows save drafts, submit for review, resume after returned changes, and activate through trusted Platform review using the existing canonical provisioning and membership services. Authorized modes and additional business selectors are discoverable on the account dashboard and existing Admin header.

Registration creates one Vendure User and Customer profile. It creates no Administrator, Vendor, Market, Seller, Channel, payment account, or billing subscription. Initial approval can add an Administrator linked to that same User and narrowly scoped business permissions. Submitted details alone grant no operational authority.

The functional acceptance criteria passed locally: 19 new real database security groups, 5 populated migration groups, 16 real browser groups, existing identity/application/operations and commerce regressions, frontend tests, typechecks, and builds passed. The delivery gate remains partial because repository-wide formatting fails on the unchanged previous audit Markdown file. Production email delivery and a deployed upgrade were not verified. These limits do not prevent exercising the implemented flows in the guarded local test environment.

Anonymous application claiming, application history, reusable private documents, application notifications, full operational/payment onboarding, and production delivery qualification remain deferred. The initial review workflow creates a new business or Market. Authority over an existing entity still uses the established trusted membership workflow. There is one initial onboarding record per User and role; additional operational memberships remain supported independently.

No migration was run against the protected `vendure` database or any persistent application database. No remote Git operation, commit, push, PR, deployment, hosting integration, DNS change, external provider request, or real email occurred.

## 2. Previous Dashboard Mode Switching Investigation

The old frontend and current security source were traced before implementation. The old report's statement that mode switching existed was only partially sufficient as a description of the user experience.

| Investigation question                 | Verified source finding and correction                                                                                                                                                                                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where exactly was it rendered?         | `AdminApp` supplied `AccountModes` through `AdminShell.controls`. `AdminShell` rendered it in `.admin-topbar .actions`, beside Refresh workspace and Sign out. It was outside the sidebar and account dropdown.                                                                                                             |
| Which URL showed it?                   | The configured Admin origin, with an authenticated authorized workspace, such as `/vendor?channel=<authorized-channel-id>` or `/market?channel=<authorized-channel-id>`. Visiting a public Market/application page did not show it.                                                                                         |
| Was there a Customer portal control?   | Storefront `/account` rendered mode links only when `accountContexts.affiliations.length` and `ADMIN_ORIGIN` were present. The central origin previously skipped storefront resolution while the account page expected storefront Shop context. There was no complete central dashboard.                                    |
| Desktop and mobile?                    | The Admin control had no desktop-only condition, but lacked its own responsive wrapper. It now wraps at narrow widths. Real browser checks exercised the account dashboard and Admin selector at 390px, including keyboard focus and no horizontal page overflow.                                                           |
| Account states and permissions?        | Account contexts require a verified, live User. Operational choices require an active business, active membership, and current exact Channel grants. An authenticated Customer cannot simply enter an Admin workspace.                                                                                                      |
| Customer-only onboarding entry points? | Previously absent. The central dashboard now shows Become a Vendor and Create / Manage a Market with actual draft/review status.                                                                                                                                                                                            |
| Existing affiliation required?         | For operational Vendor/Market choices, yes. For the new free dashboard or onboarding pages, no. The old Admin shell itself required an authorized Admin context, so it was not an entry point for account-only people.                                                                                                      |
| Vendor to Customer?                    | Previously Customer depended on `CUSTOMER_STOREFRONT_ORIGIN` and redirected to that storefront's `/account/login`. It now prefers `PLATFORM_ACCOUNT_ORIGIN`, and the direct central login route restores the dashboard.                                                                                                     |
| Market Manager to Vendor?              | Supported by backend affiliations when the same User has both roles. The updated selector changes the browser route and restores the exact authorized Channel.                                                                                                                                                              |
| Multiple Vendors or Markets?           | Backend affiliations already supported them and Admin had a Business selector. The central dashboard now also has Vendor business and Market organization selectors plus explicit per-business links.                                                                                                                       |
| Environment/authentication effects?    | Missing Admin/account origins can remove links or make Customer disabled. A failed contexts query previously returned `null`, hiding all controls. It now retains Your account or an explicit unavailable indication. Authentication, current grants, backend connectivity, or origin mismatches can still restrict access. |
| Separate login or handoff?             | One native password identity is reused, with distinct purpose-bound Customer and Admin sessions. Cross-origin entry uses correlation-bound, expiring, single-use capabilities. An existing central session avoids entering the password again. Native Admin sign-in remains available.                                      |
| Backend versus UI?                     | Backend supported multiple memberships and separate session purposes. The UI had placement, configuration, central-route, Customer-only onboarding, and route-refresh gaps. This phase exposes those supported relationships without deriving authority from UI selection.                                                  |

Exact current source evidence:

- [AdminApp.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/AdminApp.tsx:294) mounts controls and passes the account origin. Its `refreshSession` clears the old context and services before restoring the chosen Channel.
- [AdminShell.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/AdminShell.tsx:209) places controls in the top header.
- [AccountModes.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/AccountModes.tsx) queries contexts and implements mode/business routing. The inspected original had `if (!account) return null`, used only the customer storefront origin, and did not rewrite the route when switching.
- [account/index.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/index.astro) preserves the storefront purchase dashboard and adds central account rendering. The inspected original's mode navigation depended on affiliations and `ADMIN_ORIGIN`.
- [CentralAccount.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CentralAccount.astro) exposes current Customer mode, operational choices, business selectors, and onboarding.
- [platform-identity/api.ts](E:/coding/farmers-market-platform/src/plugins/platform-identity/api.ts:59) resolves `ownPlatformAccountContexts` through the existing account foundation. [account-foundation.ts](E:/coding/farmers-market-platform/src/plugins/platform-identity/account-foundation.ts:46) computes current affiliations.
- [account-session-policy.ts](E:/coding/farmers-market-platform/src/plugins/platform-identity/account-session-policy.ts) preserves Shop/Admin session purposes. [customer-account/service.ts](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/customer-account/service.ts:752), [Admin account-login.ts](E:/coding/farmers-market-platform-web/apps/admin/src/account-login.ts), and [auth/callback.ts](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/auth/callback.ts) implement handoffs.
- The layout editor intentionally hides the Admin header in [market/dashboard.css](E:/coding/farmers-market-platform-web/apps/admin/src/market/dashboard.css:533). [Layouts.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Layouts.tsx:234) has Back to layouts, which exits that screen and restores header controls.

The source proves discoverability gaps. The specific account, URL, environment, and permissions used in the user's earlier manual test were not supplied, so this report does not assert that one particular missing permission or variable caused that historical observation.

## 3. How to Switch Account Modes: Manual Instructions

These labels and transitions were exercised in Chromium against the real backend. The exact disposable origins were:

| Entry                  | URL                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Central account        | [http://auth.platform.localhost:4337/account](http://auth.platform.localhost:4337/account)                                     |
| Central password login | [http://auth.platform.localhost:4337/account/login](http://auth.platform.localhost:4337/account/login)                         |
| Signup                 | [http://auth.platform.localhost:4337/account/signup](http://auth.platform.localhost:4337/account/signup)                       |
| Vendor onboarding      | [http://auth.platform.localhost:4337/account/onboarding/vendor](http://auth.platform.localhost:4337/account/onboarding/vendor) |
| Market onboarding      | [http://auth.platform.localhost:4337/account/onboarding/market](http://auth.platform.localhost:4337/account/onboarding/market) |
| Admin                  | [http://localhost:4555](http://localhost:4555)                                                                                 |
| Trusted review         | [http://localhost:4555/platform/tenants](http://localhost:4555/platform/tenants)                                               |

Run the verified disposable demo from the frontend folder in PowerShell:

```powershell
Set-Location E:/coding/farmers-market-platform-web
$env:FRONTEND_NO_EVIDENCE='true'
npx tsx scripts/test-account-signup-onboarding.ts --serve
```

It creates a guarded local `vendure_test_*` database, starts the backend on a dynamically allocated loopback port, runs all 16 browser groups, then prints Disposable manual environment ready. In a separate browser, sign into the central account using the synthetic fixture identity `identity-owner-0@test.invalid` and fixture password `local-identity-regression-only-password`. This identity has Vendor A, Vendor B, market-a, and market-b authority. These are test fixtures only. Press Enter in the terminal when finished; the verified stop path closes the servers and drops the successfully owned database. Failed databases are retained under the existing guards. Signup mail in this demo is kept in the test process, not sent to an inbox. For manual fresh registration in a normal local environment, use the existing local file email transport described in section 4.

For an existing configured environment, replace those origins with its exact configured origins. A verified native account, current active membership, active business, and the appropriate current scoped permission are prerequisites for each operational choice. Existing legacy memberships remain usable even when initial onboarding provenance is unknown. Onboarding alone is not an operational permission.

### Customer to Vendor

1. Open the central `/account` URL and sign in if needed. The page says Current mode: Customer.
2. Click Open Vendor mode: Vendor A, or the matching real business name.
3. The browser opens Admin `/vendor?channel=<that-business-channel-id>`. If the Admin session is absent, click Use my platform account. The central session completes the secure handoff; enter the same account password if that central session has expired.
4. Verify the header Account mode selection is Vendor and the header business name matches the chosen Vendor.

Without Vendor authority, the account page shows Become a Vendor instead. Saving or submitting that form does not make the Vendor dashboard available.

### Vendor to Customer

1. In the Admin header, select Customer in Account mode, or click Your account.
2. The browser visits central `/account/login` and restores `/account` when its central session is valid.
3. If prompted, sign in with the same identity. Confirm Current mode: Customer.

If in the fullscreen Market layout editor, first click Back to layouts to restore the Admin header. The central account URL also works directly.

### Customer to Market Manager

1. At central `/account`, click Open Market Manager mode: market-a, or the authorized Market name.
2. Admin opens `/market?channel=<that-market-channel-id>`. Use Use my platform account if prompted by the Admin login screen.
3. Confirm Account mode is Market Manager and the header names the selected Market.

Without Market authority, Create / Manage a Market opens onboarding. Pending review and returned drafts have no Market dashboard permission.

### Market Manager to Vendor

1. In the Admin header, choose Vendor in Account mode.
2. The browser changes to `/vendor?channel=<authorized-vendor-channel-id>` and clears/restores the workspace.
3. If more than one Vendor is available, select the desired one in Business.
4. Confirm both Vendor mode and the header business name.

Vendor is absent when the current User lacks an active authorized Vendor affiliation. Selecting an invented Channel in a URL does not grant access.

### Between two Vendors

1. Select Vendor in Admin Account mode.
2. Use Business to select Vendor A or Vendor B. It appears only when multiple authorized Vendors exist.
3. Confirm the URL Channel and header name change.
4. Alternatively, at central `/account`, choose Vendor business and click Open selected Vendor mode, or use a specific Open Vendor mode: name link.

### Between two Markets

1. Select Market Manager in Admin Account mode.
2. Use Business to choose market-a or market-b.
3. Confirm the URL Channel and header name change.
4. Alternatively, choose Market organization on central `/account` and click Open selected Market Manager mode.

The Admin selector's selected option indicates the current operational mode. The Customer dashboard marks its Customer link as current. Authorized business links remain usable without the small selector enhancement script. Choices always come from current backend affiliations.

Configuration prerequisites are the shared backend/frontend `PLATFORM_ACCOUNT_ORIGIN`, server-only matching `PLATFORM_ACCOUNT_BRIDGE_KEY` of at least 32 characters, backend and Storefront `ADMIN_ORIGIN`, frontend server `SHOP_API_URL`, and Admin `PUBLIC_ADMIN_API_URL`. Admin `PLATFORM_ACCOUNT_ORIGIN` is embedded at build/start time through Vite. `CUSTOMER_STOREFRONT_ORIGIN` is retained as a fallback. Existing account configuration validation requires exact allowed origins; production requires HTTPS. Local storefront routing uses `PLATFORM_STOREFRONT_LOCAL_PORT` where configured. The demo supplies these values and uses actual backend storefront records. No live environment file was edited.

## 4. Account Registration

The central signup form accepts first name, last name, and normalized email. Names must be nonempty, at most 100 characters, and contain no control characters. Email is trimmed/lowercased and validated server-side, with a 254-character limit. The server uses the existing checkout-email advisory lock and checks current User and Customer records. Concurrent normalized submissions create exactly one unverified User. Ambiguous, deleted, guest-only, or conflicting legacy identities are not silently attached or merged.

Public valid registration and recovery receipts contain `accepted: true` and transport availability independent of account existence. Internal delivery failures and rate-limit suppression do not produce account-dependent public status. Login failures use generic errors and Vendure's dummy password comparison for missing identities. This provides response and credential-work protection; no claim of exhaustive statistical timing analysis is made.

A new native User starts unverified without a password. The transactional email contains a random 43-character capability; only its digest is stored in `unified_account_capability`. The existing native verification token is retained internally by Vendure. Visiting the verification GET page makes no identity change. Submitting its password form checks the capability purpose, ownership, expiration, current User state, and native verification token, then calls Vendure's existing password validation/hash/verification service. The transaction consumes the wrapper once. Replay fails. Passwords must be 12 to 128 characters in the new activation/change/reset flows and also satisfy the configured native validator. Passwords are not stored in new tables or returned to the browser.

Default verification/recovery links last 900 seconds. Expired or invalid links can be reissued through signup or recovery without creating another account. Resend revokes prior pending wrappers. Central login follows verification; success pages do not establish verification or grant roles.

Durable 15-minute limits are 3 registration or recovery requests per normalized email, 20 per client boundary, 20 verification/reset attempts per boundary, 10 login attempts per email and 30 per boundary, and 10 password changes per boundary. Rate keys are HMAC digests. The frontend additionally applies its existing bounded request limit. The secret bridge derives browser boundaries server-side and rejects forged origins.

The dashboard edits first name, last name, and phone only. Email changes are not exposed in this phase. Password and security requires the current native password. Recovery requires mailbox proof. Successful password change/reset invalidates all native sessions and pending account capabilities for that User and requires login again. Account Sign out ends the current central capability and outstanding handoffs. The existing Sign out everywhere flow revokes the relevant Customer sessions; independently issued native Admin sessions remain a separate explicit logout scope. Password reset/change is the global credential invalidation path.

Existing Vendor/Market Administrators use their existing native identity and password. After successful password proof, unified login can create only the missing Customer profile linked to that same User and add the Customer role additively. Existing membership and role grants are preserved. No second password or business is created. Existing native Admin login remains available.

Legacy limits are deliberate: a guest Customer with no User cannot be adopted solely by matching its email; ambiguous duplicate identities require trusted remediation. Central recovery requires a verified User, native method, and same-User Customer profile. An existing Administrator without such a Customer profile must first sign in using the existing identity or use its established administrator recovery path. A legacy unverified account with an already-set password may require its existing native verification/remediation path rather than password activation through the new form. No blanket re-registration is required. Existing passwordless purchase claims remain operational through the original Customer email-link flow; central password access can use recovery after verified identity binding.

Delivery reuses `CustomerAccountOptions.sendAccountEmail` configured by [vendure-config.ts](E:/coding/farmers-market-platform/src/vendure-config.ts). In development, the existing Nodemailer file sender writes to `E:/coding/farmers-market-platform/static/email/test-emails`. The existing `/mailbox` EmailPlugin route is configured for development when reviewed account email is disabled. This task did not write real emails there; acceptance mail used an in-memory transport.

Production account email requires the existing reviewed `ACCOUNT_EMAIL_ENABLED` configuration, transactional sender/provider fields, template approval, fingerprint key, configured account URLs, and explicit network allowance. No production provider credentials, delivery, inbox receipt, domain authentication, or operational rollout were qualified. If the sender is absent, the UI accurately reports delivery unavailable. A configured sender's internal failure is intentionally not disclosed per account. Provider enablement requires separate explicit operational work.

## 5. Unified Account Architecture

There remains one Vendure User and native authentication method. Customer is the personal account capability/profile. Administrator is added only through trusted existing access or approved activation and references the same User.

| Concept                            | Authoritative source                                                       |
| ---------------------------------- | -------------------------------------------------------------------------- |
| Personal identity and password     | Vendure User and native authentication method                              |
| Personal profile                   | Customer linked to that User                                               |
| Initial role progress and evidence | Existing PlatformRoleOnboarding, extended with drafts and review metadata  |
| Canonical Vendor/Market            | Existing VendorProvisioningService or MarketProvisioningService            |
| Membership                         | Existing TenantMembership authority                                        |
| Permissions                        | Current Roles on the exact Channel                                         |
| Operational eligibility            | Current business status and existing operational policies                  |
| Platform role communications       | Completion evidence, current affiliation, and separate preferences/consent |

The server-only account bridge handles central capabilities in host-only HttpOnly SameSite=Lax cookies, Secure for HTTPS. It never exports the bridge secret or an Admin bearer token to Storefront JavaScript. Central reads and mutations load the currently bound verified User and operate on that User's records; no caller-supplied principal ID is accepted.

Customer handoffs produce `platformShop` native Vendure sessions. Admin handoffs produce native Admin-purpose sessions only after a current Administrator check. Correlation, target origin, TTL, and purpose remain separate. Persisted session purpose prevents a Shop credential from turning into an Admin credential when a User later gains roles. Switching within Admin selects another current authorized Channel and resets the old workspace state.

Native Shop registration, verification refresh/activation, and password request/reset mutations are now rejected before their native side effects when unified account configuration is enabled. This closes a session-producing bypass around central activation and reset. Aliases/fragments are covered and batched requests are denied. When central accounts are not enabled, existing native behavior is preserved. Native Admin sign-in is not disabled.

## 6. Vendor Onboarding

At central `/account`, Become a Vendor opens `/account/onboarding/vendor`. The User can Save progress, leave, and resume the stored draft. Submit for review requires business name, primary contact name, contact email, and location. Phone is optional. Limits are 200, 100, 254, 500, and 40 characters respectively, with control characters rejected and email validated. Drafts can omit required submission content.

The lifecycle is NOT_STARTED to IN_PROGRESS to PENDING_REVIEW. A trusted reviewer can Return for changes, which restores IN_PROGRESS with a visible note. Pending requests are locked to the applicant. Exact duplicate submission retries return the same pending request; revision conflicts require reload. Applicant ownership is derived from the verified central capability and one principal/role record. It cannot be chosen by a browser principal ID.

A Platform SuperAdmin reviews at Admin `/platform/tenants`, chooses Approve and activate, enters a unique new business route slug and Review evidence or reason, then clicks Save review decision. Query and mutation permissions are enforced by GraphQL and by fresh service grants, including a repeat authority check inside the locked review transaction. Customer, Vendor, Market Manager, revoked reviewer, and Shop-purpose credentials cannot approve.

Approval calls the existing Vendor provisioning service with stable key `account-onboarding:<request-id>`, creates the canonical Vendor/Seller/Channel according to that service, and assigns an active owner membership to the same User. It creates the missing same-User Administrator and a scoped role for that Vendor Channel. The initial permissions are existing identity, storefront, membership, participation, catalog, and publication capabilities. No SuperAdmin or unrestricted native catalog/customer/role grant is added.

COMPLETED records VERIFIED_SIGNUP provenance, completedAt, a stable approval evidence reference, subjectId, reviewerId, reviewedAt, note, and incremented revision. Concurrent approval/retry creates one Vendor and one authority result. Review audit records identify the actual Platform actor.

Suspend access or Close onboarding revokes the membership created for that recorded subject and removes the corresponding mode on fresh lookup. Other role memberships remain active. The retained role alone is insufficient for tenant access without membership. Reactivation/reopening is not implemented; it requires a future trusted lifecycle workflow. No existing legacy membership is revoked because its historical onboarding status is unknown.

Business/contact/location details remain in the onboarding draft and review record. Canonical provisioning uses name and reviewer-approved slug; detailed operational profile setup continues in existing business workflows. Approval does not provision a public storefront, claim payment readiness, establish payouts, or create a paid subscription.

## 7. Market Manager Onboarding

Create / Manage a Market opens `/account/onboarding/market`. It uses the same ownership, revision, draft, submit, return, approval, suspension, and evidence controls as Vendor onboarding. Required fields are Market name, primary contact name, contact email, Market location, and valid timezone. Phone is optional. Timezone is at most 80 characters and must be accepted by the server's Intl timezone database.

Trusted approval calls the existing Market provisioning service with a stable request key, approved slug, name, location as venue, and timezone. It establishes an active Market manager membership for the existing User and grants existing Market/operations permissions only on that Market's Channel. It creates no second credentials and can coexist with Vendor roles.

Initial Market provisioning includes no recurrence, blank pickup instructions, and explicit initial preorder/override policy values required by the canonical service. They are starting configuration, not reviewed public schedules. There is no automatic public storefront, listing publication, launch, payments qualification, payout readiness, or billing activation. Operations require subsequent actual setup.

A matching name, address, or contact email does not authorize an existing Market. Initial approval creates a new identity; joining an existing Market must use established trusted membership administration. Multiple current Market memberships appear in the selectors. Staff operational relationships do not fabricate owner onboarding completion or apply-on-behalf rights.

## 8. Free Account Behavior

Immediately after mailbox verification and password login, the free User can view/edit personal details, manage security and role-update preferences, withdraw existing promotional consent, start/resume both initial onboarding flows, and sign out. They can authenticate to a published Market application as an account-only applicant, receive profile autofill, edit those answers, and submit without owning a Vendor.

These basic capabilities require no account billing record. Existing entitlement engines were left intact. No synthetic Vendor or subscription is created to support a free profile. The existing server plugin composition requires native commerce/customer-relationships/paid-attribution features as technical dependencies for the account bridge. In the current runtime config the latter two are enabled by `ENABLE_PAID_ATTRIBUTION=true`; that feature flag is not a requirement to purchase a subscription or supply Stripe credentials. The acceptance profile runs with payment network I/O disabled and no billing adapters/bindings.

Purchase history on existing Customer storefront routes remains functional and was regression tested. An application-history dashboard, automatic recovery of anonymous applications, reusable private documents, and applicant notifications are not included. UI copy explicitly identifies these as planned separately.

## 9. Application Integration

The existing successful application submission remains independent of signup. Claim My Free Account now navigates from the completed public form to real central registration. Maybe Later dismisses the invitation and retains success. Signup does not repeat the submission, create a Vendor, or attach the old submission by email.

The real browser acceptance submitted an anonymous application, used its invitation to create/verify an account with that same email, and checked that the original application remained one ANONYMOUS record with no principal ID and unchanged answers. The new verified User then used the secure application login/return flow and submitted a separate ACCOUNT_ONLY application. The original anonymous record remained untouched even after a personal profile edit.

Existing Vendor application login, encrypted in-progress return, authorized Vendor choice, editable semantic autofill, and authoritative provenance were retained. Application acceptance and date confirmation remain independent. Existing linking/consent/cross-Market rules were covered by real regression suites.

New signup alone does not display or claim past anonymous submissions. A future submission-specific proof workflow must authorize that action. Purchase account email claiming remains the separate existing commerce flow and does not claim a Market application.

## 10. Role Notification and Marketing Policy

Signup creates no role communication preference or promotional consent. A saved draft or pending submission is not completed-role evidence. Trusted approval persists actual role-specific evidence but supplies no marketing consent.

Platform UPDATES eligibility still requires completed VERIFIED_SIGNUP evidence, current active authorized affiliation, and updatesEnabled=true. The central dashboard's role-specific checkboxes explicitly save only updatesEnabled. They may be saved before completion, but do not make an incomplete User eligible.

PROMOTION eligibility additionally requires an existing explicit current-policy marketing consent timestamp/policy and no withdrawal. Approval and update opt-in cannot manufacture these fields. Withdraw platform promotional consent records withdrawal on that User's existing role preference rows. There is no new promotional opt-in form, campaign composer, or delivery implementation in this phase.

Transactional account verification/recovery, role updates, platform promotions, and Market-originated participant communications retain separate purposes. Existing consent workers were tested with real database fixtures and fake transports. No role update, campaign, promotion, or real provider message was sent. Historical UNKNOWN onboarding remains ineligible for verified completed-role audiences while retaining legitimate operational authority.

## 11. Database and Migrations

The sole new migration is [1791740000000-AccountRoleOnboarding.ts](E:/coding/farmers-market-platform/src/migrations/1791740000000-AccountRoleOnboarding.ts).

| Object                     | Exact effect                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unified_account_capability | Replace kind and target-shape checks to add VERIFY_ACCOUNT and RESET_PASSWORD. All previously valid CENTRAL shapes remain valid; HANDOFF/ADMIN_HANDOFF still require target and correlation; new verification/recovery purposes require both absent. Existing digest uniqueness/format, User/Customer foreign keys, and expiry-after-creation constraint remain. |
| platform_role_onboarding   | Add draft jsonb NOT NULL default {}, revision integer NOT NULL default 0 with nonnegative check, nullable submittedAt/reviewedAt timestamps, reviewerId foreign key to User with delete restriction, subjectId integer, and reviewNote text. Existing state/provenance/completion constraints remain.                                                            |
| Review index               | Add state/submittedAt/id index.                                                                                                                                                                                                                                                                                                                                  |
| Data and sessions          | No User merge, grant assignment, membership reassignment, backfilled completion/consent, identity creation, or session invalidation.                                                                                                                                                                                                                             |
| Rollback                   | down throws a forward-only error. Recovery requires a reviewed forward migration rather than deleting account history.                                                                                                                                                                                                                                           |

Existing migrations 179169 through 179173 were not rewritten. Shared tests include the new migration. The populated migration acceptance first creates the old schema, inserts prior valid central/handoff rows, a live Customer session, User/profile, IN_PROGRESS UNKNOWN and completed evidenced onboarding, and explicit preferences. Applying this migration preserves every existing field, initializes new fields safely, rejects invalid purpose shapes/revisions, and recognizes history on a second migration run. The existing legacy upgrade additionally preserves duplicate unverified directory links, paid invoices, attendance/assignments, application answers, and unknown provenance.

The earlier 179171 migration has its own documented legacy native Customer session invalidation. That historical behavior was not altered or attributed to this new migration. This migration itself requires no global reauthentication.

Only process-owned, loopback `vendure_test_*` databases were created/migrated/populated by acceptance tests. The guard rejects `vendure`, non-test names, remote hosts, and cleanup of databases not created by that process. Successful runs used their existing cleanup policy; failed account/browser runs were retained for diagnosis. No unrelated database cleanup occurred. Persistent development and production application data were not queried or migrated for this work. Standard PostgreSQL admin connectivity was used solely to create/drop guarded test databases.

## 12. Security and Tenant Isolation

The real backend checks verified input validation, normalized concurrent registration, no operational identity at signup, mailbox proof, hashed native credentials, purpose-bound expiry/single use, resend, generic receipts, durable limits, ownership, unauthorized and revoked reviewer denial, idempotent draft/approval, same-User Vendor plus Market activation, immediate membership suspension, safe profile updates, consent separation, and recovery/session invalidation.

The real Shop session check restores a Customer session, uses it on the Shop API, then proves it cannot call the Admin review API. Existing unified-account regressions additionally cover Admin/Shop purpose separation, multi-Vendor/multi-Market current affiliations, owner versus staff application capability, revoked/foreign memberships, session cache revocation, and additive Customer grants that cannot restore concurrently revoked Admin roles.

The bridge uses a timing-safe secret comparison, exact account origin, bounded input, server-derived boundaries, and generic redacted error categories. Browser forms require exact same-origin Origin before execution; the forged-origin browser/API test receives HTTP 403. Capabilities stay out of logs/report values. Account and auth responses use no-store/noindex and no-referrer protections. GET verification does not activate a User.

The new native Shop bypass-denial tests cover aliases and fragments and verify that no bypass User is created. Native password services remain available internally to central operations; native Admin login remains compatible.

Existing real application/operations/commerce suites checked cross-Market reads/commands, forged applicant Vendor authority, association consent, independent acceptance/date review, Vendor-owned catalog/customer boundaries, payment/refund authority, and immutable financial/application history. Provider effects in these tests are deterministic local fakes, not evidence of external provider operation.

No claim is made of a full penetration test, production TLS/network validation, exhaustive timing analysis, every existing operational permission combination, or every application page's accessibility. New central account accessibility and mobile/keyboard mode discovery were exercised, and checkout accessibility was checked at 390, 768, and 1280px.

## 13. Test Results

Commands below were executed from the named local repository. Frontend commands that can emit historical evidence were run with `$env:FRONTEND_NO_EVIDENCE='true'`. Real database commands required an approved sandbox override for loopback PostgreSQL. No external access or persistent database migration was part of that approval.

| Repository / command                                                                                                         | Final result                                                                                                                      | Evidence scope                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend: `npx ts-node --project test/market-operations/tsconfig.json test/market-operations/account-signup-onboarding.ts`    | 19 passed, 0 failed                                                                                                               | Real PostgreSQL, Vendure services, native authentication, GraphQL/session and bridge denials                                                                |
| Backend: same project, `test/market-operations/account-role-migration.ts`                                                    | 5 passed, 0 failed                                                                                                                | Populated previous-schema preservation and constraints                                                                                                      |
| Backend: same project, `test/market-operations/unified-account.ts`                                                           | 15 passed, 0 failed                                                                                                               | Existing identity/session/affiliation/consent regressions                                                                                                   |
| Backend: same project, `test/market-operations/application-identity.ts`                                                      | 17 passed, 0 failed                                                                                                               | Existing application provenance/link/acceptance/date/isolation checks                                                                                       |
| Backend: same project, `test/market-operations/legacy-upgrade.ts`                                                            | 5 passed, 0 failed                                                                                                                | Existing populated historical application and finance preservation                                                                                          |
| Backend: same project, `test/market-operations/run.ts`                                                                       | 21 passed, 0 failed                                                                                                               | Operations GraphQL isolation and lifecycle                                                                                                                  |
| Backend: `npx ts-node --project test/catalog-publication/tsconfig.json test/catalog-publication/run.ts`                      | 29 recorded groups passed                                                                                                         | Real catalog/publication and recursive prior tenant/Market tests                                                                                            |
| Backend: `npx ts-node --project test/communications/tsconfig.json test/communications/run.ts --focused`                      | 25 recorded groups passed                                                                                                         | Provider contracts with fakes plus real database communication/consent workers                                                                              |
| Backend: `npx ts-node --project test/customer-relationships/tsconfig.json test/customer-relationships/run.ts --workers-only` | 59 passed                                                                                                                         | Real Customer privacy/relationship/worker checks; recursive chain/build intentionally omitted by this mode                                                  |
| Backend: `npx ts-node --project test/payments-stripe/tsconfig.json test/payments-stripe/run.ts --focused`                    | 65 passed; 2 NOT_EXECUTED                                                                                                         | Real database provider boundaries with ControlledTransport. Sandbox OAuth/provider tests require explicitly supplied test credentials and were not executed |
| Backend: `npx ts-node --project test/paid-attribution-refund/tsconfig.json test/paid-attribution-refund/run.ts`              | 62 passed                                                                                                                         | Real financial history, refund/idempotency/isolation and recursive commerce chain                                                                           |
| Recursive children of finance                                                                                                | Commerce 47, inventory 42, catalog 29, Farmers Market 25, platform identity 19 recorded groups passed                             | Existing real database suites. These overlap other rows and are not summed into an inflated total                                                           |
| Frontend: `npx tsx scripts/test-account-signup-onboarding.ts`                                                                | 16 passed, 0 failed                                                                                                               | Real Chromium, backend APIs and PostgreSQL. In-memory mail only; frontend fixture mode off                                                                  |
| Frontend: same command with `--serve`                                                                                        | 16 passed, demo startup and Enter cleanup passed                                                                                  | Actual local manual environment lifecycle; final User-role journey and mobile controls                                                                      |
| Frontend: `npm run test:live:checkout-account`                                                                               | 1 comprehensive browser test passed; backend fixture/security assertions passed                                                   | Real production SSR, direct/multiple-Vendor checkout, local deterministic payment, claim, purchase history, SSO and accessibility                           |
| Frontend: `npm test`                                                                                                         | 287 passed in 20 files                                                                                                            | Unit/component tests, mostly mocks/fixtures; supplementary UI evidence                                                                                      |
| Frontend: `npm run typecheck`                                                                                                | Passed; 62 Astro files, 0 errors/warnings/hints                                                                                   | Root TypeScript and Astro checks                                                                                                                            |
| Backend: `npx tsc --noEmit --project test/market-operations/tsconfig.json`                                                   | Passed                                                                                                                            | Source and integration TypeScript                                                                                                                           |
| Frontend: `npx eslint .` and `npx tsx scripts/check-boundaries.ts`                                                           | Passed; 9 workspaces                                                                                                              | Lint and package boundaries                                                                                                                                 |
| Frontend: `npm run lint` / final `npx prettier --check .`                                                                    | Formatting gate fails on unchanged `E:/coding/farmers-market-platform-web/docs/vendor-application-account-identity-audit.md` only | New/edited source is formatted; old documentation was preserved                                                                                             |
| Frontend: `npm run graphql:schema`, then `npm run graphql:codegen`                                                           | Passed                                                                                                                            | Approved offline backend AST contract extraction and generated Admin types                                                                                  |
| Frontend: `npm run build:production-local`                                                                                   | Passed for Storefront, Admin, Vendure dashboard, server and worker                                                                | Existing synthetic production helper; no database connection or provider I/O                                                                                |
| Frontend: `npm run check:bundles`                                                                                            | Passed, 86 artifact files                                                                                                         | Existing fixture/credential marker check; not exhaustive secret scanning                                                                                    |

Representative successful owned databases were `vendure_test_operations_1791676951800_b4cc28` (19 new security groups), `vendure_test_account_upgrade_1791676512215_7eefbc` (populated migration), `vendure_test_operations_1791676830070_56540a` (16 final browser groups plus manual serve cleanup), `vendure_test_checkout_1791676745167_7b9519` (checkout browser), and `vendure_test_finance_1791676525340_ec3562` (finance). These were dropped by their owning successful harnesses. Runtime results/logs remained in existing ignored test runtime directories. No new screenshots, recordings, or public evidence reports were created.

Failures encountered and resolved are included to avoid treating first attempts as passes: the initial new capability purposes were missing from existing database checks, so the additive migration was required; an authentication method needed explicit loading; expired-token fixtures needed to preserve expiry-after-creation; JSONB key ordering required semantic idempotency comparison; the browser harness needed the actual Platform Admin plugin; the review select needed an explicit accessible label; and the final forged-Origin check needed a loopback connection with the account Host header. A new migration test initially lacked its explicit TypeScript row-array type and was corrected before its successful run.

The checkout regression caught an actual compatibility change: unauthenticated storefront `/account` had been redirected exclusively to password login, bypassing remembered legacy email-link Customer restoration. Its fallback now returns through the original `/account/sign-in`; that route also accepts remembered unified handoffs and exposes password login. The final unchanged comprehensive checkout browser test passed. No security assertion was removed to obtain the result.

Bare backend `npm run build` and an insufficient development override initially failed the existing production policy because Vendure's build evaluates production configuration. The existing synthetic production helper supplied safe build-only configuration; an initial dashboard build hit sandbox filesystem EPERM, then the approved local retry passed. Final production builds passed after the approval authority recheck. An Admin chunk-size advisory above 500 kB remains a warning.

Early unit/bundle checks emitted their existing tracked historical JSON outputs before the no-evidence flag was applied. Those outputs were restored only after verifying their original SHA-256 matched the exact saved baseline/HEAD bytes. Final hash comparison confirms all historical evidence and previous reports are unchanged.

Unexecuted scope: real email/provider delivery, Stripe sandbox/live operations, deployment/hosting/TLS qualification, full production-hardening/analytics/POS/billing suites, standalone Vendor/Market storefront browser suites, all browser engines, full campaign delivery, and persistent-database upgrade. The real checkout browser and recursive commerce/catalog/Market tests cover relevant regressions without implying these omitted suites ran.

## 14. Exact Files Changed

The workspace already had 170 dirty frontend paths and 62 dirty backend paths. Initial per-file SHA-256 hashes and porcelain status were captured before editing. The following lists compare final content to that baseline, not to Git HEAD. This distinguishes task changes from the substantial existing unfinished work. No baseline file was deleted. Preexisting modified/untracked files extended here retain their prior work; their existing status does not mean this task created all their content.

Backend task files:

| File                                                                                                                                                                                 | State before this task                    | Purpose                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| [src/migrations/1791740000000-AccountRoleOnboarding.ts](E:/coding/farmers-market-platform/src/migrations/1791740000000-AccountRoleOnboarding.ts)                                     | New in this task                          | Add onboarding draft/review fields and constrained verification/recovery capability purposes |
| [src/plugins/marketplace-commerce/customer-account/onboarding.service.ts](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/customer-account/onboarding.service.ts) | New in this task                          | Owned drafts, trusted review, canonical provisioning and scoped activation                   |
| [src/plugins/platform-identity/account-foundation.ts](E:/coding/farmers-market-platform/src/plugins/platform-identity/account-foundation.ts)                                         | Preexisting untracked file, extended here | Extend the existing onboarding entity, preserving authorization and audience policy          |
| [test/market-operations/account-experience-server.ts](E:/coding/farmers-market-platform/test/market-operations/account-experience-server.ts)                                         | Preexisting untracked file, extended here | Real browser fixture, multiple memberships and in-memory mailbox assertions                  |
| [test/market-operations/account-role-migration.ts](E:/coding/farmers-market-platform/test/market-operations/account-role-migration.ts)                                               | New in this task                          | 5 populated prior-schema migration groups                                                    |
| [test/market-operations/account-signup-onboarding.ts](E:/coding/farmers-market-platform/test/market-operations/account-signup-onboarding.ts)                                         | New in this task                          | 19 real account/onboarding security groups                                                   |
| [src/gql/graphql-env.d.ts](E:/coding/farmers-market-platform/src/gql/graphql-env.d.ts)                                                                                               | Preexisting modified file, extended here  | Vendure-generated GraphQL contract declarations                                              |
| [src/plugins/marketplace-commerce/customer-account/api.ts](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/customer-account/api.ts)                               | Preexisting modified file, extended here  | SuperAdmin review query and mutation                                                         |
| [src/plugins/marketplace-commerce/customer-account/controller.ts](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/customer-account/controller.ts)                 | Preexisting modified file, extended here  | Extend the protected server bridge                                                           |
| [src/plugins/marketplace-commerce/customer-account/service.ts](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/customer-account/service.ts)                       | Preexisting modified file, extended here  | Registration, verification, native recovery, profile, preferences and durable login limits   |
| [src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts](E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts)                 | Preexisting modified file, extended here  | Register onboarding service and central Shop account boundary                                |
| [src/plugins/platform-identity/shop-context.middleware.ts](E:/coding/farmers-market-platform/src/plugins/platform-identity/shop-context.middleware.ts)                               | Preexisting modified file, extended here  | Deny native Shop registration/verification/reset bypasses when central accounts are enabled  |
| [test/market-operations/harness.ts](E:/coding/farmers-market-platform/test/market-operations/harness.ts)                                                                             | Preexisting modified file, extended here  | Optional full account/Platform profile with offline providers                                |
| [test/platform-identity/config.ts](E:/coding/farmers-market-platform/test/platform-identity/config.ts)                                                                               | Preexisting modified file, extended here  | Include the new migration in shared test configuration                                       |

Frontend task files:

| File                                                                                                                                                             | State before this task                    | Purpose                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| [apps/admin/src/AccountModes.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/AccountModes.tsx)                                                         | Preexisting untracked file, extended here | Visible personal account link and authorized mode/business navigation                    |
| [apps/admin/src/account-modes.css](E:/coding/farmers-market-platform-web/apps/admin/src/account-modes.css)                                                       | New in this task                          | Responsive account controls                                                              |
| [apps/admin/src/management/AccountOnboardingReview.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/management/AccountOnboardingReview.tsx)             | New in this task                          | Trusted reviewer queue and decisions                                                     |
| [apps/storefront/src/components/CentralAccount.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/components/CentralAccount.astro)                 | New in this task                          | Free account dashboard, authorized mode/business selectors, profile/security/preferences |
| [apps/storefront/src/pages/account/login.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/login.astro)                             | Preexisting untracked file, extended here | Direct central password login and remembered session restoration                         |
| [apps/storefront/src/pages/account/onboarding/[role].astro](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/onboarding/%5Brole%5D.astro) | New in this task                          | Owned Vendor and Market forms, resumption and review status                              |
| [apps/storefront/src/pages/account/recover.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/recover.astro)                         | New in this task                          | Uniform recovery request                                                                 |
| [apps/storefront/src/pages/account/reset.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/reset.astro)                             | New in this task                          | Single-use native credential reset                                                       |
| [apps/storefront/src/pages/account/signup.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/signup.astro)                           | Preexisting untracked file, extended here | Working free account registration                                                        |
| [apps/storefront/src/pages/account/verify.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/verify.astro)                           | New in this task                          | Mailbox proof and native password activation                                             |
| [scripts/test-account-signup-onboarding.ts](E:/coding/farmers-market-platform-web/scripts/test-account-signup-onboarding.ts)                                     | New in this task                          | 16 real browser groups and disposable manual serve mode                                  |
| [scripts/test-unified-account.ts](E:/coding/farmers-market-platform-web/scripts/test-unified-account.ts)                                                         | Preexisting untracked file, extended here | Update obsolete signup-placeholder and Customer destination expectations                 |
| [apps/admin/src/AdminApp.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/AdminApp.tsx)                                                                 | Preexisting modified file, extended here  | Pass the configured central origin into existing controls                                |
| [apps/admin/src/management/ManagementRoutes.tsx](E:/coding/farmers-market-platform-web/apps/admin/src/management/ManagementRoutes.tsx)                           | Previously clean tracked file             | Show review at the existing Platform tenant route                                        |
| [apps/storefront/src/lib/account.ts](E:/coding/farmers-market-platform-web/apps/storefront/src/lib/account.ts)                                                   | Preexisting modified file, extended here  | Central account response type                                                            |
| [apps/storefront/src/pages/account/index.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/index.astro)                             | Preexisting modified file, extended here  | Central dashboard and compatible storefront Customer entry                               |
| [apps/storefront/src/pages/account/sign-in.astro](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/account/sign-in.astro)                         | Previously clean tracked file             | Preserve legacy email-link restoration and accept remembered unified handoffs            |
| [apps/storefront/src/pages/api/account.ts](E:/coding/farmers-market-platform-web/apps/storefront/src/pages/api/account.ts)                                       | Preexisting modified file, extended here  | Same-origin form actions through the existing secret bridge                              |
| [apps/storefront/src/styles/checkout.css](E:/coding/farmers-market-platform-web/apps/storefront/src/styles/checkout.css)                                         | Previously clean tracked file             | Account panel, checkbox and selector layout                                              |
| [packages/api/operations/market-operations.graphql](E:/coding/farmers-market-platform-web/packages/api/operations/market-operations.graphql)                     | Preexisting modified file, extended here  | Typed Platform review operations                                                         |
| [packages/api/schema/admin.graphql](E:/coding/farmers-market-platform-web/packages/api/schema/admin.graphql)                                                     | Preexisting modified file, extended here  | Generated Admin schema                                                                   |
| [packages/api/schema/provenance.json](E:/coding/farmers-market-platform-web/packages/api/schema/provenance.json)                                                 | Preexisting modified file, extended here  | Regenerated source contract provenance                                                   |
| [packages/api/src/generated/admin.ts](E:/coding/farmers-market-platform-web/packages/api/src/generated/admin.ts)                                                 | Preexisting modified file, extended here  | Generated Admin operation types                                                          |
| [packages/api/src/management.ts](E:/coding/farmers-market-platform-web/packages/api/src/management.ts)                                                           | Previously clean tracked file             | Typed review DTO and management methods                                                  |

The only new documentation file is this report, `E:/coding/farmers-market-platform-web/docs/unified-account-signup-onboarding-implementation.md`. Generated Shop schema/types were checked and did not differ from the starting hashes. Package manifests/locks, environment files, previous migrations/reports, and all other baseline dirty files remained unchanged.

For an exact inventory of the preexisting dirty paths not changed by this phase:

<details>
<summary>158 preexisting dirty frontend paths preserved byte for byte</summary>

```text
 M E:/coding/farmers-market-platform-web/apps/admin/src/AdminShell.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/main.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/analytics.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/common.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/generation-status.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/occurrences.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/operations.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/overview.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/ApplicationBuilder.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Applications.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Assignments.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Billing.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Directory.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/Layouts.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/OperationsRoutes.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/settings.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/market/vendors.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/vendor/markets.tsx
 M E:/coding/farmers-market-platform-web/apps/admin/src/vendor/service.ts
 M E:/coding/farmers-market-platform-web/apps/admin/vite.config.ts
 M E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketApplication.tsx
 M E:/coding/farmers-market-platform-web/apps/storefront/src/components/MarketPublicHome.astro
 M E:/coding/farmers-market-platform-web/apps/storefront/src/pages/api/market-application.ts
 M E:/coding/farmers-market-platform-web/apps/storefront/src/pages/auth/callback.ts
 M E:/coding/farmers-market-platform-web/apps/storefront/src/pages/index.astro
 M E:/coding/farmers-market-platform-web/docs/phase14-manual-testing.md
 M E:/coding/farmers-market-platform-web/package-lock.json
 M E:/coding/farmers-market-platform-web/package.json
 M E:/coding/farmers-market-platform-web/packages/admin-core/src/index.ts
 M E:/coding/farmers-market-platform-web/packages/api/operations/checkout.graphql
 M E:/coding/farmers-market-platform-web/packages/api/operations/public-market-operations.graphql
 M E:/coding/farmers-market-platform-web/packages/api/operations/shop.graphql
 M E:/coding/farmers-market-platform-web/packages/api/schema/shop.graphql
 M E:/coding/farmers-market-platform-web/packages/api/src/checkout.ts
 M E:/coding/farmers-market-platform-web/packages/api/src/generated/shop.ts
 M E:/coding/farmers-market-platform-web/packages/api/src/market-operations.ts
 M E:/coding/farmers-market-platform-web/packages/api/src/market.ts
 M E:/coding/farmers-market-platform-web/packages/config/src/index.ts
 M E:/coding/farmers-market-platform-web/packages/ui/package.json
 M E:/coding/farmers-market-platform-web/packages/ui/src/MarketMap.tsx
 M E:/coding/farmers-market-platform-web/packages/ui/src/index.tsx
 M E:/coding/farmers-market-platform-web/packages/ui/src/styles.css
 M E:/coding/farmers-market-platform-web/scripts/extract-schema.ts
 M E:/coding/farmers-market-platform-web/scripts/test-phase14.ts
 M E:/coding/farmers-market-platform-web/scripts/test-phase15b.ts
 M E:/coding/farmers-market-platform-web/tests/e2e/market.spec.ts
 M E:/coding/farmers-market-platform-web/tests/market-c5.test.tsx
 M E:/coding/farmers-market-platform-web/tests/market-operations.test.tsx
 M E:/coding/farmers-market-platform-web/tests/market.test.tsx
 M E:/coding/farmers-market-platform-web/tests/phase15.test.tsx
 M E:/coding/farmers-market-platform-web/tests/phase15b.test.tsx
 M E:/coding/farmers-market-platform-web/tests/setup.ts
 M E:/coding/farmers-market-platform-web/tests/vendor.test.tsx
?? E:/coding/farmers-market-platform-web/apps/admin/src/account-env.d.ts
?? E:/coding/farmers-market-platform-web/apps/admin/src/account-login.ts
?? E:/coding/farmers-market-platform-web/apps/admin/src/market/CommandForm.tsx
?? E:/coding/farmers-market-platform-web/apps/admin/src/market/OccurrenceMap.tsx
?? E:/coding/farmers-market-platform-web/apps/admin/src/market/dashboard.css
?? E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/ApplicationReview.tsx
?? E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/LayoutInspector.tsx
?? E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/LayoutLayers.tsx
?? E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/OccurrenceLayoutActions.tsx
?? E:/coding/farmers-market-platform-web/apps/admin/src/market/phase14/designer.css
?? E:/coding/farmers-market-platform-web/apps/admin/src/market/presentation.tsx
?? E:/coding/farmers-market-platform-web/apps/storefront/src/lib/application-progress.ts
?? E:/coding/farmers-market-platform-web/apps/storefront/src/pages/api/application-applicant.ts
?? E:/coding/farmers-market-platform-web/apps/storefront/src/pages/api/application-progress.ts
?? E:/coding/farmers-market-platform-web/docs/boerne-test-market.md
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/application-modal-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/application-modal-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/final-regression.json
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-application-submissions-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-application-submissions-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-applications-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-applications-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-directory-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-directory-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-occurrences-101-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-occurrences-101-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-rentals-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-rentals-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-vendors-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-vendors-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-vendors-listings-12-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-vendors-listings-12-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-vendors-offerings-12-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-vendors-offerings-12-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-vendors-participation-12-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/market-vendors-participation-12-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-dashboard/unit-results.json
?? E:/coding/farmers-market-platform-web/docs/evidence/market-fixes/assignments-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-fixes/assignments-2160.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-fixes/assignments-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-fixes/day-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-fixes/day-2160.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-fixes/day-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-fixes/editor-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-fixes/editor-2160.png
?? E:/coding/farmers-market-platform-web/docs/evidence/market-fixes/editor-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/occurrence-layouts/editor-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/occurrence-layouts/editor-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/occurrence-layouts/library-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/occurrence-layouts/library-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/occurrence-layouts/picker-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/occurrence-layouts/picker-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/booth-inspector-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/browser-summary.json
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/demo-compatibility.json
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/editor-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/editor-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/editor-768.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/layers-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/market-day-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/multi-selection-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/performance-500-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/phase15b-regression/booth-assignment-modal-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/phase15b-regression/booth-hover-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/phase15b-regression/booth-paid-modal-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/phase15b-regression/booths-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/phase15b-regression/booths-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/phase15b-regression/booths-768.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/phase15b-regression/overview-cards-1440.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/public-map-390.png
?? E:/coding/farmers-market-platform-web/docs/evidence/phase15c/unit-results.json
?? E:/coding/farmers-market-platform-web/docs/implementation-phase-15C.md
?? E:/coding/farmers-market-platform-web/docs/occurrence-layouts.md
?? E:/coding/farmers-market-platform-web/docs/testing-vendors.json
?? E:/coding/farmers-market-platform-web/docs/testing-vendors.md
?? E:/coding/farmers-market-platform-web/docs/unified-platform-identity-implementation.md
?? E:/coding/farmers-market-platform-web/docs/vendor-application-account-identity-audit.md
?? E:/coding/farmers-market-platform-web/packages/ui/src/map/KonvaElement.tsx
?? E:/coding/farmers-market-platform-web/packages/ui/src/map/MapCanvas.tsx
?? E:/coding/farmers-market-platform-web/packages/ui/src/map/MapGrid.tsx
?? E:/coding/farmers-market-platform-web/packages/ui/src/map/model.ts
?? E:/coding/farmers-market-platform-web/playwright.market-dashboard.config.ts
?? E:/coding/farmers-market-platform-web/scripts/check-phase15c-demo.ts
?? E:/coding/farmers-market-platform-web/scripts/data/testing-vendors.cjs
?? E:/coding/farmers-market-platform-web/scripts/konva-pointer.ts
?? E:/coding/farmers-market-platform-web/scripts/seed-boerne-test-market.cjs
?? E:/coding/farmers-market-platform-web/scripts/seed-testing-vendors.cjs
?? E:/coding/farmers-market-platform-web/scripts/test-market-dashboard.ts
?? E:/coding/farmers-market-platform-web/scripts/test-market-fixes.ts
?? E:/coding/farmers-market-platform-web/scripts/test-occurrence-layouts.ts
?? E:/coding/farmers-market-platform-web/scripts/test-operations-live.ts
?? E:/coding/farmers-market-platform-web/scripts/test-phase15c.ts
?? E:/coding/farmers-market-platform-web/tests/application-progress.test.ts
?? E:/coding/farmers-market-platform-web/tests/fixtures/market-dashboard-data.ts
?? E:/coding/farmers-market-platform-web/tests/fixtures/market-dashboard-preview.tsx
?? E:/coding/farmers-market-platform-web/tests/fixtures/occurrence-layout-preview.tsx
?? E:/coding/farmers-market-platform-web/tests/fixtures/phase15c-preview.tsx
?? E:/coding/farmers-market-platform-web/tests/layout-library.test.tsx
?? E:/coding/farmers-market-platform-web/tests/market-application.test.tsx
?? E:/coding/farmers-market-platform-web/tests/market-dashboard.test.tsx
?? E:/coding/farmers-market-platform-web/tests/market-operations-contract.test.ts
?? E:/coding/farmers-market-platform-web/tests/occurrence-layouts.test.tsx
?? E:/coding/farmers-market-platform-web/tests/phase15c.test.ts
```

</details>

<details>
<summary>52 preexisting dirty backend paths preserved byte for byte</summary>

```text
 M E:/coding/farmers-market-platform/package.json
 M E:/coding/farmers-market-platform/src/plugins/farmers-market/api/admin-api.ts
 M E:/coding/farmers-market-platform/src/plugins/farmers-market/entities/market.entities.ts
 M E:/coding/farmers-market-platform/src/plugins/farmers-market/services/market-vendor-membership.service.ts
 M E:/coding/farmers-market-platform/src/plugins/farmers-market/services/participation.service.ts
 M E:/coding/farmers-market-platform/src/plugins/market-operations/api.ts
 M E:/coding/farmers-market-platform/src/plugins/market-operations/entities.ts
 M E:/coding/farmers-market-platform/src/plugins/market-operations/market-operations.plugin.ts
 M E:/coding/farmers-market-platform/src/plugins/market-operations/model.ts
 M E:/coding/farmers-market-platform/src/plugins/market-operations/service.ts
 M E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/commerce/contracts.ts
 M E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/customer-account/entities.ts
 M E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/customer-account/options.ts
 M E:/coding/farmers-market-platform/src/plugins/marketplace-commerce/market-browse.interceptor.ts
 M E:/coding/farmers-market-platform/src/plugins/platform-identity/api.ts
 M E:/coding/farmers-market-platform/src/plugins/platform-identity/platform-identity.plugin.ts
 M E:/coding/farmers-market-platform/src/vendure-config.ts
 M E:/coding/farmers-market-platform/test/catalog-publication/run.ts
 M E:/coding/farmers-market-platform/test/communications/acceptance.ts
 M E:/coding/farmers-market-platform/test/communications/fixture.ts
 M E:/coding/farmers-market-platform/test/communications/run.ts
 M E:/coding/farmers-market-platform/test/customer-relationships/acceptance.ts
 M E:/coding/farmers-market-platform/test/customer-relationships/run.ts
 M E:/coding/farmers-market-platform/test/farmers-market/run.ts
 M E:/coding/farmers-market-platform/test/frontend-integration/cookie-client.ts
 M E:/coding/farmers-market-platform/test/frontend-integration/market-storefront-run.ts
 M E:/coding/farmers-market-platform/test/inventory-capacity/fixture.ts
 M E:/coding/farmers-market-platform/test/inventory-capacity/run.ts
 M E:/coding/farmers-market-platform/test/market-operations/run.ts
 M E:/coding/farmers-market-platform/test/marketplace-commerce/acceptance.ts
 M E:/coding/farmers-market-platform/test/marketplace-commerce/fixture.ts
 M E:/coding/farmers-market-platform/test/paid-attribution-refund/acceptance.ts
 M E:/coding/farmers-market-platform/test/payments-stripe/run.ts
 M E:/coding/farmers-market-platform/test/platform-identity/client.ts
 M E:/coding/farmers-market-platform/test/pos-integrations/run.ts
 M E:/coding/farmers-market-platform/test/production-hardening/seed.ts
?? E:/coding/farmers-market-platform/scripts/market-operations-demo/layout-library-cleanup.ts
?? E:/coding/farmers-market-platform/src/migrations/1791500000000-OccurrenceLayoutEditing.ts
?? E:/coding/farmers-market-platform/src/migrations/1791600000000-LayoutLibrary.ts
?? E:/coding/farmers-market-platform/src/migrations/1791690000000-MarketRelationshipConsent.ts
?? E:/coding/farmers-market-platform/src/migrations/1791700000000-VerifiedMarketRelationships.ts
?? E:/coding/farmers-market-platform/src/migrations/1791710000000-PlatformAccountFoundation.ts
?? E:/coding/farmers-market-platform/src/migrations/1791720000000-UnifiedAccountCapabilities.ts
?? E:/coding/farmers-market-platform/src/migrations/1791730000000-ApplicationIdentityProvenance.ts
?? E:/coding/farmers-market-platform/src/plugins/market-operations/vendor-links.service.ts
?? E:/coding/farmers-market-platform/src/plugins/platform-identity/account-session-policy.ts
?? E:/coding/farmers-market-platform/test/market-operations/application-identity.ts
?? E:/coding/farmers-market-platform/test/market-operations/legacy-upgrade.ts
?? E:/coding/farmers-market-platform/test/market-operations/occurrence-layouts.ts
?? E:/coding/farmers-market-platform/test/market-operations/phase15c-model.ts
?? E:/coding/farmers-market-platform/test/market-operations/unified-account.ts
?? E:/coding/farmers-market-platform/test/market-operations/verified-relationships.ts
```

</details>

Build outputs and isolated runtime diagnostics are existing ignored artifacts and are not source/report changes. No old evidence was replaced with results from this task.

## 15. Deferred Work and Recommended Next Implementation

The next applicant feature should be submission-specific anonymous claiming: authenticated User plus expiring proof tied to the actual submission, with explicit confirmation, ownership checks, replay protection, audit, and preserved snapshots. Email matching alone must remain insufficient. Once legitimate ownership exists, add a scoped application history projection that distinguishes application decisions, date decisions, identity mode, and Market access.

Reusable permits/insurance/certificates need a separate private document model and authorized storage/delivery policy. Public catalog assets must not be used as a shortcut. Application and Market notifications need real domain events, idempotent delivery, recipients, consent/purpose evaluation, failure handling, and reviewed transactional templates before being advertised.

Keep registration/profile/initial onboarding guaranteed free. Extend the existing entitlement system only when concrete document, notification, or other usage limits require it. No separate billing engine or fake business should be introduced.

Remaining onboarding work includes a reviewed join-existing-business workflow, additional initial business requests beyond the one per-role record, queue pagination/filtering beyond the newest 100 records, trusted suspension reactivation/reopening, richer contact/business profile propagation, and actual operational setup. None should bypass current memberships or Channel permissions. Legacy ambiguous/guest-only/password-activation conflicts need a trusted remediation design with explicit proof, rather than automatic identity merging.

Before production use, qualify reviewed account email delivery, exact HTTPS origins/cookies/proxy configuration, monitoring and recovery operations, and the normal reviewed migration rollout. The persistent database was left untouched. The unrelated previous Markdown formatting issue remains a repository lint blocker under the user's requirement to preserve old reports.
