# SMS verification and signup UX fixes

Local implementation report, October 11, 2026, updated October 12, 2026. Frontend: `E:\coding\farmers-market-platform-web`. Backend: `E:\coding\farmers-market-platform`.

## Executive Summary

IMPLEMENTED: password-first signup, exact password confirmation and complexity checks, short-lived native credential staging, six-box SMS verification, one immediate resend, durable subsequent 60-second cooldowns, fresh-code generation and old-code invalidation, stricter shared phone input, and restrained shared focus styling.

IMPLEMENTED subsequent Vendor/Market signup policy: after personal phone verification, completing business details immediately creates the new business and its scoped owner access. No Platform reviewer or email proof is required. Business/Market address fields were removed from this onboarding process; contact phone defaults to the current verified personal number, including when an older draft has no number. Market signup and Market settings now share the same friendly timezone dropdown. Account action links and related cart/checkout/purchase actions use the existing button styles. The user's newer instruction explicitly replaces the earlier requirement for reviewed initial role activation.

October 12 follow-up: the complete-national-number text was always-present helper copy, including for valid numbers. It now disappears for a valid populated field, while actual errors remain. Invalid phone requests now fail before counting/hashing a staged password. Duplicate starts blocked by the cooldown no longer spend SMS allowance. Removed the two requested signup paragraphs and replaced the green brand-derived input outline with neutral gray. Existing rate windows were not reset or edited.

October 12 console follow-up: process inspection verified the existing demo backend on 4407/4567 started at 00:09:24 America/Chicago, before the rate-counting source fix saved at 00:19:38. Astro reloads frontend source, but this backend is launched with plain `ts-node` and requires a restart. Its old generic `SMS_RATE_LIMITED` line cannot uniquely identify the quota involved. The test suite also spends shared phone/client/credential budgets before `--serve` reaches manual readiness. New demo startups now clear only their own disposable phone-rate fixture rows once at that handoff, retaining normal limits for all subsequent manual traffic. The existing running demo was left untouched.

The browser `contentscript.js` stream warnings are not present in the application sources or a clean Chromium run. A browser extension is the likely source; its exact identity is UNVERIFIED without the script's full source URL. The React DevTools message is normal development information. A separate Node terminal warning was found in the demo's IPC helper: resolved requests kept their `exit` listeners. That helper now removes its message, exit and timeout handlers on success, timeout or process exit, without raising the listener limit.

VERIFIED: real Chromium signup and native password login against Vendure/PostgreSQL, desktop and mobile OTP interaction, actual 60-second waiting, immediate and later resends, old-code rejection, refresh and multi-tab cooldown protection, provider failure recovery, atomic native activation, concurrent consumption, populated migration safety, account/session/role boundaries, application/linking regressions, and checkout/history.

PARTIAL: frontend repository-wide lint has an existing formatting failure in `docs/vendor-application-account-identity-audit.md`. ESLint and workspace boundaries pass. An additional backend formatting spot check reports nine existing files, detailed under Test Results; they were not broadly reformatted. The historical October 11 21:15:57 verification rejection cannot be uniquely diagnosed from its old sanitized log. The concrete stale-receipt defect described below is fixed and covered by a real browser regression. Real SMS delivery and a persistent database upgrade are UNVERIFIED.

Only this new Markdown report was created. Prior Markdown reports and `docs/evidence` files were preserved. The existing test runners create their normal disposable `.runtime` outputs. Preexisting dirty source was patched locally without reset, stash, commit, branch creation, push, PR, hosting or deployment.

## SMS Verification Failure: Root Cause

The original execution path was signup form, `/api/account` register action, authenticated server bridge, `CustomerAccountService.register`, `AccountPhoneService.request`, fake SMS transport, HttpOnly `phone-challenge` receipt, verification POST, bridge, and locked challenge consumption/native account creation.

Two precise defects were present in the inspected source:

1. The verification page's “Request a new SMS code” link returned to signup. There was no browser-bound resend action. In `AccountPhoneService.request`, the throttle branch generated a random token and returned `{ challenge: token, accepted: true }` without storing a challenge or sending SMS. The Storefront accepted that result and replaced `phone-challenge`. The fake lookup still returned the last actually delivered SMS. Verification of that SMS against the replacement receipt had no matching challenge and was rejected. This also lost the useful original browser binding.
2. The controller classified errors using `error.name`. Installed Vendure's `ForbiddenError` is an `I18nError`, and ordinary OTP denials fell into `DeniedOrUnavailable`. The bridge mapped every non-success HTTP response to an authentication error, and the verification page presented the same retry message for input errors and genuine backend failures. The supplied log therefore cannot distinguish wrong code, expiry, a missing receipt, binding mismatch, conflicts or an internal failure.

The prior code did not regenerate an OTP when throttled. The fake lookup showing the same value was consistent with the unchanged last delivery, rather than evidence that a second SMS was accepted.

VERIFIED baseline: the unmodified valid-code browser/signup suite passed 19 groups against a fresh guarded database on unused ports. A separate attempted pre-fix stale-receipt browser reproduction stopped at Node's `ENOTFOUND auth.platform.localhost` before its restart POST. Chromium resolves the local account hostname; Playwright's Node request client did not. Subsequent tests perform central requests inside Chromium or use the loopback URL with the correct Host header.

UNVERIFIED historical cause: the original request's challenge row, lifecycle/audit trail, browser cookie and password validity were not supplied. No protected database was inspected to recover them. It would be inaccurate to claim that the exact 21:15:57 rejection was conclusively an expired code, bad password, stale cookie or bridge key mismatch. The stale-receipt defect is established by source; the new full-stack regression proves an immediate duplicate signup is honestly rejected and preserves the working browser receipt, followed by successful resend and activation.

The HTTP 303 was expected Post/Redirect/Get: the verification POST catch set `/account/verify?error=1` and returned a redirect, then the GET returned 200 with failure feedback. The redirect itself was not the failure.

Configuration checks: matching bridge key and account origin, strict request Origin, host-only HttpOnly cookie, path `/`, SameSite Strict, HTTP local/Secure HTTPS behavior, server-derived client boundary, missing/stale cookies, expired/consumed/locked state, unavailable/unsupported SMS transport, and Vendure's default `requireVerification=true` are covered by source inspection and targeted tests. A synthetic stale receipt and a wrong bridge key produce safe public denial with distinct internal reasons. Real reverse-proxy attribution, HTTPS deployment and carrier delivery remain UNVERIFIED. The original requested ports 4407/4567 were already occupied; existing servers were left running and independent ports were used. The harness now refuses a requested port conflict instead of silently shifting Astro to another port.

## Verification Bug Fix

`request` no longer returns an accepted phantom challenge when blocked. Rejected starts retain the browser cookie. `resendPhoneRegistration` acts on the specific bound signup and keeps its opaque token while replacing authoritative code state. Accepted delivery is the only successful resend response.

Verification uses a row lock, client binding, current state, expiry, attempt limits and timing-safe keyed-MAC comparison. It checks unique verified phone ownership and normalized email identity under existing locks. Native User, credential, Customer, verified personal phone and challenge consumption commit together. Password staging is deleted in that transaction. Native User creation failures roll back the entire activation, preserving the still-valid staged credential for retry.

The controller now uses `instanceof` and fixed internal reason codes such as `challenge_not_found`, `binding_mismatch`, `code_mismatch`, `challenge_expired`, `identity_conflict`, `bridge_authentication`, `SMS_RATE_LIMITED`, and `backend_failure`. Logs contain category, stage and reason, without OTPs, passwords, phone numbers, email addresses, tokens, hashes, SQL or provider exception text. Public errors retain generic identity/verification denial. Delivery failures use 503 `SMS_UNAVAILABLE`; genuine activation failures use 503 `ACCOUNT_UNAVAILABLE`; cooldown/budget rejection uses 429. Password/input validation remains separate.

Rate denials additionally log a fixed `rateScope` (`signup_credentials_hourly`, `client_sms_hourly`, `phone_sms_hourly`, `global_sms_hourly`, `signup_cooldown` or `resend_cooldown`) and retry timestamp. Public responses omit that scope and return only the generic code plus eligibility/server time. Hourly limits now provide their window expiry, and browser feedback reports the server-derived wait in seconds or minutes. These are diagnostics and feedback changes; the limits are unchanged.

VERIFIED: real browser and database tests activate and log into a new account. Wrong and prior codes fail without disabling retry. Replay and concurrent activation cannot create duplicate Users. Injected provider and native creation exceptions exercise actual transaction rollback and sanitized bridge responses, rather than substituting a mocked successful signup.

## New Two-Screen Signup

Screen one collects first name, last name, email, country, national phone, password and confirmation. US +1 is the default and the selector remains left of the national field. The button reads “Send Verification Code”. Names/email/phone and both password fields are required before SMS delivery.

The exact shared policy is 12 through 72 characters, at least one `A-Z`, one `0-9`, and one common keyboard symbol. Supported characters are visible ASCII `!` through `~`: English letters, digits and every ASCII keyboard punctuation symbol. Spaces, control characters, Unicode/invisible characters and supplementary characters are rejected, rather than normalized. Passwords and confirmation must match exactly.

Symbol allowlist:

```text
! " # $ % & ' ( ) * + , - . / : ; < = > ? @ [ \ ] ^ _ ` { | } ~
```

The requested 128 maximum was reduced because installed Vendure 3.7.3 uses `BcryptPasswordHashingStrategy` with bcrypt's 72-byte effective bound. ASCII-only input makes the browser character limit equal the byte limit and avoids accepting passwords whose suffix is silently ignored. No common ASCII keyboard symbol was removed. Existing passwords and existing native identities are not rewritten. New change/reset passwords use the same stronger server policy; their UI maximum/help text was updated.

The first-screen hint uses the requested minimum/uppercase/number/special-character sentence. A live checklist, visibility toggle for each input and “Passwords do not match” feedback accompany the fields. The maximum/character guidance paragraph and the phone activation/marketing paragraph were removed at the user's October 12 request; the underlying password policy is unchanged. Client validity and the BFF both enforce the rules, and the backend also invokes Vendure's configured native password validator before hashing.

Secure staging uses `ConfigService.authOptions.passwordHashingStrategy.hash`, the same approved strategy invoked by Vendure's `PasswordCipher`. Only its one-way native hash is stored in a dedicated `select:false` column, never the pending registration JSON. After phone proof, `UserService.createCustomerUser` creates the existing native authentication method; the already-approved hash is assigned to that method without double hashing. Its email verification token is cleared and the User is verified atomically with phone ownership.

The hash expires with the challenge, is removed on consumption, lockout, identity conflict and supersession, and is purged on expiration by both lazy cleanup and a registered minute scheduler. Resends can extend a five-minute OTP only within a 15-minute maximum pending lifetime. A failed provider resend preserves the hash for an eligible retry. Expired/locked registrations create no active account. Obsolete password-last challenges cannot use the new registration resend/status protocol.

After form values are captured for the request, controlled password fields are cleared, including after delivery rejection. Non-password entries stay in the current form. No password is copied into cookies, URLs, localStorage, sessionStorage, response JSON, GraphQL fields or logs. In-memory request values remain only as needed to submit; JavaScript strings cannot guarantee physical memory erasure. Screen two has no password controls.

Vendor and Market onboarding now has “Finish Vendor signup” / “Finish Market signup” actions. Save progress remains available for partial details, without creating business authority. Finished signup returns to the account dashboard with a ready message and the new dashboard button. Old pending submissions can be finished by their verified account owner; suspended/closed roles remain inactive. Existing draft contact details are retained, and a blank contact phone gets the personal-phone default. Contact phone can be edited separately from personal identity.

The old Market Manager `TimezoneField` and its seven US zone choices were moved to `packages/ui/src/TimezoneField.tsx`. The original Admin module re-exports the shared control and continues to own its existing DST/date conversion functions. Both settings and onboarding now use that exact component, with friendly labels such as Central and Mountain. Signup submits the corresponding IANA value, and backend timezone validation remains authoritative. Market operating venue can be configured later in settings; new signup starts with an empty venue.

Navigation actions retain real anchors/URLs but render as the existing `.button` / `.button.secondary` controls. Covered surfaces include all account pages, role signup/dashboard actions, Admin personal-account actions, and cart/checkout/purchase actions. Brand, product-title and ordinary site navigation links retain their existing presentation. The signup forms keep shared labels, controls, spacing and restrained focus styling. [Vendor form evidence](evidence/signup-onboarding-2026-10-12/vendor.png) and [Market form evidence](evidence/signup-onboarding-2026-10-12/market.png) were rendered and visually checked.

## Six-Digit OTP Component

Six separate digit boxes represent one backend code. Typing advances; deleting a populated digit stays in that box; Backspace from empty moves left; arrows move between boxes; focusing selects the current digit for correction. Six-digit paste fills all boxes, including whitespace, period and dash separators. Letters and unsupported pasted content are rejected as a whole rather than extracting a different code. The first box supports a six-character autofill event, then immediately distributes the digits.

Every box has a positional accessible label, numeric input mode and required numeric validity. A fieldset/legend explains the shared code and the first input uses `autocomplete="one-time-code"`. A hidden combined field supplies one string; the BFF also combines individual named digits for native form submission. Feedback and keyboard focus remain usable after rejection.

VERIFIED: actual Chromium typing, focus advancement, both Backspace cases, arrows, harmless paste, non-digit rejection, programmatic six-digit autofill event, correction, wrong-code recovery, mobile layout, numeric attributes and Axe WCAG checks. Receipt from an actual mobile OS/carrier autofill integration is UNVERIFIED, since tests use desktop Chromium with mobile emulation and fake SMS.

## SMS Resend and Cooldown

An initial fresh signup is eligible for one immediate resend, subject to the same general safety budgets. Each accepted resend generates a cryptographically secure six-digit `randomInt` code and compares its MAC to the immediately prior code in a loop, preventing an accidental identical value. The row's token/client binding remains stable; old code state is replaced before provider delivery. Attempts are preserved across resends.

Per-phone advisory locking and a locked challenge row serialize starts and resends. The service reserves `PENDING`, increments `resendCount`, and records `resendAvailableAt` before sending outside the transaction. Concurrent resends, verification during delivery, expired/locked/consumed receipts and foreign client boundaries cannot bypass that state. Delivery success promotes only the matching reservation to `SENT`. Failure becomes `FAILED`, reports no success and permits a later safe retry while preserving the credential.

Every successful resend reserves 60 seconds. A recent signup restart cannot acquire another immediate allowance, and the shared per-phone start gate prevents duplicate starts from racing delivery. Normalized phone/client/global limits remain durable: 3 phone send attempts/hour, 10 client send attempts/hour, configurable global hourly spending budget (default 100), 30 verification attempts/client/15 minutes, and 5 wrong attempts per challenge. Credential hashing has its own durable 10/client/hour bound. Invalid phone input fails before that credential counter, and cooldown-blocked starts and resends do not spend SMS allowance. Valid password-hashing attempts remain bounded even if a later cooldown rejects the start. An eligible SMS attempt still spends its safety budget if delivery fails.

Status and accepted responses return eligibility plus server time. Rate errors with an eligibility timestamp also return server time. The browser converts the server interval to a monotonic `performance.now()` deadline, updates displayed seconds, disables/hides resend during cooldown and clears its interval on page hide/navigation. A refresh reloads backend state. Another tab can have an older visible button, but its POST is still denied and returns authoritative cooldown information. The countdown itself is not a repeating live-region announcement; delivery/failure status is announced once.

Accepted feedback reads “A new verification code has been sent.” Failures never use that success text. Fake SMS retains only the latest accepted message per phone, updates insertion order, and exposes lookup only through the guarded test-process IPC/terminal. Terminal wording explicitly says the latest accepted value is unchanged after a rejected send.

VERIFIED: initial immediate send, different successive values, old-code rejection, concurrency, refresh, multi-tab rejection, a real 60-second browser wait, later resend/countdown restart, hourly/global budgets, and provider failure recovery. Database tests advance an eligibility timestamp only in their owned fixture to test additional concurrency/budget cases; the browser suite separately waits a real minute.

## Phone Input Restrictions

The shared `PhoneInput` blocks alphabetic/symbol typing, rejects unsupported pasted content and misplaced `+`, preserves numeric canonical values, and generates display punctuation with `libphonenumber-js/max`. US/Canada national values are exactly ten digits when valid. An eleventh digit or overlong paste is rejected with feedback; it is not truncated into another valid number. The user can delete, replace a middle selection and paste complete formatted or E.164 numbers. An E.164 paste safely selects its parsed country. The complete-national-number hint is shown for an empty field and hidden once valid; incomplete/invalid values retain explicit validation feedback and block native form submission.

GB continues to accept/format its national trunk prefix and AU/CA parsing remains country-aware. The backend identity path requires an already-canonical, valid, extension-free E.164 value. The existing general contact normalizer still supports formatted business contacts; contact snapshots remain separate from verified personal ownership.

VERIFIED: US default/formatting, ten-digit limits, alphabet and overlong rejection, caret/deletion/selection, international E.164 paste, GB, CA and AU cases, malformed direct identity requests, and real UK phone replacement without changing historical application contacts.

## Platform-Wide Input Styling

`packages/ui/src/styles.css` reduces the shared 3px branded focus outline and the separate 3px blue Operations outline to a shared 2px neutral indicator. The October 12 correction sets `--input-focus-color: #5f6368` explicitly: the earlier `--brand-foreground` fallback was still green. Input, textarea and select focus now has no shadow, no focus transition and a 2px offset. Pointer focus that does not require focus visibility does not show an outline. Text inputs may receive a restrained visible outline even when clicked, as browsers intentionally consider text-entry focus visible. Forced-colors mode uses the system Highlight color.

The Market-only pointer suppression rule in `apps/admin/src/market/dashboard.css` was removed so Market fields inherit the same accessible shared behavior. No focused background brighten/glow rule was found in the other custom source styles. Card/dropdown/tooltip shadows, caret/selection, error indicators, non-input navigation focus and status backgrounds were retained because they are not input-focus glow. The new password/OTP controls use the same shared rule.

The shared stylesheet is used by Customer/account, public applications, checkout, Vendor Admin, Market Admin and Platform Admin. Source inspection covers their custom inputs, textareas and selects. Browser computed-style checks assert unchanged background, `box-shadow: none` and a 2px focus indicator on representative signup, OTP, login, profile, onboarding, application and reviewer controls while Axe checks accessibility. The October 12 run also asserts computed outline color `rgb(95, 99, 104)`. Desktop and 390px mobile OTP were verified visually; both [original evidence](evidence/sms-signup-ux/verification-mobile.png) and [October 12 gray-focus evidence](evidence/sms-signup-ux/verification-mobile-2026-10-12.png) are preserved. Scope is the custom platform, not bundled Vendure Dashboard internals. Exhaustive certification of every field, configured theme and every browser is UNVERIFIED; no unrelated dashboard redesign was performed.

## Security and Identity Compatibility

One existing Vendure User and native credential remain authoritative. A new Customer activates after verified personal phone, with no administrator or email activation requirement. Unique personal phone ownership remains constrained; a conflict never merges or transfers another account. SMS activation alone grants no business authority or marketing consent. A separate explicit completion of Vendor/Market signup now activates the requested new business immediately, per the user's updated policy.

Existing enrollment, native administrator proof, safe personal phone replacement, optional email proof, lost-password policy, purpose-bound central/Shop/Admin sessions, scoped affiliations, role switching, Vendor linking/consent, independent application/date review, participation, publishing and preorder restrictions remain intact. The current browser suite exercises immediate Vendor/Market activation and role switching without visiting the approval UI. Earlier reviewed-onboarding results are historical. Backend suites test permission revocation, tenant isolation, immutable application identity, date/assignment/finance boundaries and consent. The checkout browser suite exercises actual purchase, guest claim, phone/password enrollment, history and cross-domain handoff.

Automatic activation is one transaction: onboarding row, canonical Seller/Channel/business, native Administrator linked to the same User, active owner membership, fixed scoped native Role, completion evidence and audits. Ordinary platform provisioning/membership APIs retain their existing checks. New server-only owned-signup entry points require a Shop context, active transaction, current verified User/personal-phone proof and that User's pending row. They prohibit existing Seller/Channel attachment and require the newly created business to match the row's provisioning key. The role uses the existing initial permission list on only the new channel, validates configured assignable permissions, and publishes Vendure's native `RoleEvent` for cache consistency. Existing User roles/credentials are preserved; there is no SuperAdmin impersonation or grant. Completion is idempotent, failed activation rolls back, and old pending rows need no bulk data migration. Platform moderation and existing-business membership workflows remain restricted.

No authentication bypass was enabled to make tests pass. Old synthetic signup fixtures were updated to supply a valid staged password; existing actor credentials remained unchanged. A CustomerRelationship fixture previously tried the now-forbidden native public signup mutation. It now explicitly asserts that denial and creates only its synthetic channel-assignment test Customer through the service, preserving the original unverified-purchase and channel/CRM assertions.

## Migrations

New forward-only migration: `E:\coding\farmers-market-platform\src\migrations\1791760000000-PendingSignupCredential.ts`.

It adds nullable `pendingPasswordHash varchar(255)`, nullable `resendAvailableAt timestamptz`, and nonnegative `resendCount integer default 0` to the existing challenge table. It expires only old pending/sent password-last signup rows (`userId IS NULL`) and clears their registration metadata. Existing Users, native hashes, Customers, administrator identities, verified phones, memberships, sessions, historical contacts and account enrollment challenges are not rewritten. Rollback deliberately throws.

VERIFIED populated-schema tests compare native identity/customer/credential/grant/phone records before and after, retain enrollment state and reject negative persisted resend counters. Existing phone, role and legacy migration suites pass. Old migration history was not changed. No GraphQL type regeneration is needed because these are private challenge fields, not schema response fields.

Only guarded loopback `vendure_test_*` databases owned by each test runner were created/migrated. Protected `vendure`, persistent development and production databases were not queried or modified. Successful owned runs use their normal cleanup; failed initial runs are retained by the guard for diagnosis and were not forcibly dropped. This migration has not been applied to a persistent environment.

The later immediate-role-signup change needs no new migration or generated GraphQL changes. It uses the existing onboarding fields/states. Historical completed businesses and memberships are retained; an old pending owner can explicitly finish the new flow after verification.

## Test Results

All commands below ran locally. Backend commands use `E:\coding\farmers-market-platform`; frontend commands use `E:\coding\farmers-market-platform-web`. Set `$env:DB_HOST='127.0.0.1'` for database tests and `$env:FRONTEND_NO_EVIDENCE='true'` for frontend checks. Local sandbox permission was needed for loopback PostgreSQL/browser processes; no external providers were enabled.

For backend rows abbreviated as a filename, the exact command is `npx ts-node --project test/market-operations/tsconfig.json test/market-operations/<filename>.ts`.

VERIFIED latest Vendor/Market follow-up: backend `account-signup-onboarding` passes 23 groups, `platform-input-validation` passes 10 and `phone-verification` passes 16, using guarded PostgreSQL/Vendure databases. New cases cover automatic activation, concurrent idempotent retries, restricted role/channel grants, preserved User/credentials, legacy pending completion, existing-business/commerce-attachment denial, suspension enforcement and injected activation rollback/retry. The browser suite passes 20 groups against actual frontend/backend services: no approval page is used; it checks removed location inputs, initial and saved-blank phone defaults, button classes, the shared timezone selector and the selected Mountain zone persisted in the Market dashboard. The full frontend suite passes 23 files / 302 tests. Frontend typecheck reports 68 Astro files with zero errors/warnings/hints. `npx eslint .`, `npx tsx scripts/check-boundaries.ts` and the full synthetic local frontend/backend build pass. An initial audit field name was rejected by the existing privacy filter; it was corrected to an ID-only `proofId` without weakening that filter, and the final reruns pass.

The latest browser command is `npx tsx scripts/test-account-signup-onboarding.ts` with ports 4457/4597, `$env:ONBOARDING_TEST_EVIDENCE_DIR` pointing to `docs/evidence/signup-onboarding-2026-10-12`, and `$env:PHONE_TEST_SCREENSHOT='onboarding-mobile.png'`. Backend and build commands use the exact patterns above/below. An attempted one-off frontend build invocation emitted no build confirmation; the established full build helper and a temporary frontend-only helper were used for confirmation instead. Scratch helpers/logs were removed after verification. Older broader suite counts below retain their original dated scope.

VERIFIED October 12 follow-up: reran `sms-signup-ux` (15 groups), `phone-verification` (16 groups), the real signup browser suite (20 groups), the focused phone/password Vitest suite (12 tests), `npm run typecheck`, targeted ESLint, and `npx tsx scripts/build-production-local.ts`, all successfully. The new database regression submits twelve malformed phone requests, asserts unchanged credential/SMS rate rows and no challenge or SMS, then successfully starts a corrected signup. A blocked duplicate start preserves its SMS counters; the subsequent initial send plus two accepted resends fit the original three-send allowance without clearing rate state. The browser checks incomplete-phone submission creates zero POST requests, valid-number feedback disappears, the requested paragraphs are absent, and focus stays gray across representative forms. Older broader regression results below are from October 11.

For the follow-up browser command, set `$env:PHONE_TEST_STOREFRONT_PORT='4457'`, `$env:PHONE_TEST_ADMIN_PORT='4597'`, and `$env:PHONE_TEST_SCREENSHOT='signup-followup-mobile.png'` before `npx tsx scripts/test-account-signup-onboarding.ts`. The existing manual demo commands below remain valid. Targeted ESLint command: `npx eslint packages/ui/src/PhoneInput.tsx apps/storefront/src/components/SignupPasswords.tsx apps/storefront/src/pages/account/signup.astro scripts/test-account-signup-onboarding.ts tests/phone-input.test.tsx`.

VERIFIED subsequent console follow-up: `sms-signup-ux` now passes 16 groups, including scoped credential/client/phone/global limits and public retry deadlines. `npx vitest run tests/account-rate-feedback.test.ts` passes 3 tests for server-relative hourly/short waits and malformed timestamp handling. The real browser suite with `--serve` on 4457/4597 passes 21 groups, including a fresh owned manual rate window and zero retained IPC `exit` listeners. A clean Chromium account page produced none of the reported content-script stream warnings. The first run exposed a separate terminal IPC listener warning; the final run after cleanup passed without it. Final frontend typecheck, targeted ESLint and full local frontend/backend build pass. These new demos were stopped with an empty line and dropped only their own successful disposable databases; the existing 4407 demo and its data remain untouched.

The console follow-up browser command was `npx tsx scripts/test-account-signup-onboarding.ts --serve` with the same follow-up environment, and `$env:PHONE_TEST_SCREENSHOT='sms-console-mobile.png'`. Targeted ESLint was `npx eslint apps/storefront/src/lib/account.ts scripts/test-account-signup-onboarding.ts tests/account-rate-feedback.test.ts`. The backend command and production-build helper are unchanged from the table below.

| Command                                                                                          | Result                                                                                           | Evidence type                                                                             |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `sms-signup-ux`                                                                                  | 16 passed, 0 failed                                                                              | Real PostgreSQL/Vendure/HTTP bridge; budgets, scopes, retry deadlines and native failures |
| `phone-verification`                                                                             | 16 passed, 0 failed                                                                              | Real phone identity, migration/enrollment, native password, replacement and replay        |
| `account-signup-onboarding`                                                                      | 19 passed, 0 failed                                                                              | Real account, review/role/consent and session security                                    |
| `pending-signup-migration`                                                                       | 3 passed, 0 failed                                                                               | Populated previous schema, forward migration, record comparisons                          |
| `phone-migration`                                                                                | 5 passed, 0 failed                                                                               | Populated identity migration and constraints                                              |
| `phone-sms-transport`                                                                            | 4 passed, 0 failed, 0 network calls                                                              | Controlled provider contract responses, not real carrier delivery                         |
| `platform-input-validation`                                                                      | 10 passed, 0 failed                                                                              | Real API validation, Unicode boundaries and versioned application answers                 |
| `unified-account`                                                                                | 15 passed, 0 failed                                                                              | Real Shop/Admin handoff, role isolation and revocation                                    |
| `application-identity`                                                                           | 17 passed, 0 failed                                                                              | Real application provenance, Vendor links, consent and tenant boundaries                  |
| `account-role-migration`                                                                         | 5 passed, 0 failed                                                                               | Populated role/session/capability preservation                                            |
| `legacy-upgrade`                                                                                 | 5 passed, 0 failed                                                                               | Populated historical business/application preservation                                    |
| `run`                                                                                            | 21 passed, 0 failed                                                                              | Real Market operations GraphQL and lifecycle                                              |
| `npm run test:marketplace-commerce`                                                              | 47 passed groups, 0 failed; owned database dropped                                               | Actual local commerce plus recursive earlier phase regressions                            |
| `npm run test:communications`                                                                    | 25 passed groups, 0 failed; owned database dropped                                               | Real DB communications/consent/leases; controlled provider adapters                       |
| `npm run test:customer-relationships:workers`                                                    | 59 passed groups, 0 failed; owned database dropped                                               | All domain/worker checks; commerce/build checked independently                            |
| `npx tsx scripts/test-account-signup-onboarding.ts` with ports 4417/4577                         | 20 passed, 0 failed                                                                              | Actual Chromium, fake SMS, Vendure and PostgreSQL; fixture mode off                       |
| `npx tsx scripts/test-checkout-account.ts` with Storefront port 4437                             | Passed full-stack journey, exit 0                                                                | Actual browser/API/DB, local payment, guest claim, history and SSO                        |
| `npx vitest run`                                                                                 | 22 files, 298 passed, 0 failed                                                                   | Full frontend component/contract suite                                                    |
| `npx vitest run tests/phone-input.test.tsx tests/signup-passwords.test.tsx`                      | 12 passed, 0 failed                                                                              | Final phone/password additions, including CA/AU and policy parity                         |
| `npm run typecheck`                                                                              | Passed; Astro 68 files, 0 errors/warnings/hints                                                  | Frontend TypeScript and Astro                                                             |
| Backend `npx tsc --noEmit` and `npx tsc --noEmit --project test/market-operations/tsconfig.json` | Passed                                                                                           | Backend and integration-test types                                                        |
| `npm run lint`                                                                                   | ESLint and 9-workspace boundaries passed; Prettier failed only on unchanged prior audit Markdown | Existing formatting blocker preserved                                                     |
| `npx tsx scripts/build-production-local.ts`                                                      | Both frontend applications, Vendure Dashboard, server and worker passed                          | Existing synthetic production build environment; providers/network disabled               |

Initial diagnostic attempts hit sandbox loopback EACCES, occupied ports, and Node DNS for the account subdomain. Later browser tests used independent ports and in-browser same-origin POSTs. A prior browser assertion read Market business options before asynchronous rendering; it now waits for the expected option before asserting exactly two choices. A policy source-parity assertion was corrected to compare normalized TypeScript output so formatting-only parentheses cannot fail it. One old phone fixture and one native Customer registration fixture were updated as described above; security assertions were retained or strengthened. Intermediate failed databases remain guarded and retained. Later passing reruns, not initial failures, determine the results above.

Warnings observed: existing large bundle advisories, existing `pg` concurrent-query deprecation warnings in test infrastructure, and normal intentionally denied API error output in legacy suites. These were not hidden or reclassified as successful checks.

An additional backend `npx prettier --check` over the 18 backend files in the initial October 11 file list returned formatting warnings in nine existing files: `customer-account/service.ts`, `marketplace-commerce.plugin.ts`, `test/platform-identity/config.ts`, `test/frontend-integration/cookie-client.ts`, `test/market-operations/phone-verification.ts`, `account-signup-onboarding.ts`, `platform-input-validation.ts`, `phone-migration.ts`, and `test/customer-relationships/acceptance.ts`. The new backend files and the rewritten phone/controller/SMS files passed that check. The backend has no configured lint/format script. Existing files with substantial prior dirty work were not broadly reformatted; backend compilation, build and acceptance tests pass.

## Manual Testing Instructions

Start a fresh disposable demo in PowerShell:

```powershell
Set-Location E:\coding\farmers-market-platform-web
$env:FRONTEND_NO_EVIDENCE='true'
$env:DB_HOST='127.0.0.1'
$env:PHONE_TEST_STOREFRONT_PORT='4417'
$env:PHONE_TEST_ADMIN_PORT='4577'
npx tsx scripts/test-account-signup-onboarding.ts --serve
```

The harness first runs the browser acceptance tests, including a real one-minute cooldown, then clears only that new disposable database's automated phone-rate counters once and prints readiness. It retains account fixtures and enforces normal SMS limits during manual use. There is no public reset endpoint or repeatable terminal reset command. Existing old demos must be stopped in their own terminal before reusing their ports; starting this harness does not replace an already-running backend. An empty line performs the old demo's normal disposable database cleanup, so its manual test accounts are cleared. Use 4407/4567 instead only after confirming those ports are free.

URLs:

- Signup: `http://auth.platform.localhost:4417/account/signup`.
- Verification: `http://auth.platform.localhost:4417/account/verify`.
- Login/dashboard: `http://auth.platform.localhost:4417/account/login` and `/account`.
- Phone replacement: `http://auth.platform.localhost:4417/account/phone`.
- Market/public application: `http://127.0.0.1:4417/` and the advertised `/apply` link.
- Custom Admin: `http://localhost:4577/`.

Walkthrough:

1. Open signup in a fresh browser profile. Use unique email `manual-sms@test.invalid`, names, and US national digits `2105550160`. The automated fixtures use other numbers. Confirm `(210) 555-0160` is system formatted and +1 defaults left of the field.
2. Enter `Manual-signup-password-1!` in both password fields. Try a mismatch, missing uppercase/number/symbol, too-short value and invisible character before using the valid password. Confirm the checklist, match error and both visibility toggles.
3. Select “Send Verification Code”. On screen two confirm six boxes, no password field and the displayed recipient. In the demo terminal enter `sms +12105550160` and record the initial code.
4. Select “Resend code” immediately once. Confirm “A new verification code has been sent.” Enter `sms +12105550160` again and confirm a different code.
5. Enter the old code into the boxes, then “Verify & Create Account”. Confirm retry feedback, enabled boxes and no account creation.
6. Watch the 60-second countdown. Reload or open a second verification tab and confirm the countdown remains. The terminal always labels its lookup as the latest accepted SMS; a blocked request does not indicate a newer send.
7. Paste the current code with a harmless space/dash separator or type the digits. Confirm automatic focus movement, corrections, Backspace and arrows. Verify to create the personal account immediately.
8. At login, use `manual-sms@test.invalid` and `Manual-signup-password-1!`. Confirm the verified personal phone, free account dashboard, optional email proof and separate Vendor/Market onboarding. No reviewer approval is needed for personal signup.
9. To test a later resend, wait for zero before verification, resend again and look up the third code. Confirm the second now fails, the new countdown starts and only the third succeeds. Three accepted sends consume the hourly per-phone allowance; use another unused valid number for independent scenarios rather than restarting repeatedly.
10. Check signup phone input: letters/punctuation typing cannot enter the national model, an extra digit or overlong paste is rejected without shortening, deletion and middle selection work. For GB choose +44 and use an unused example such as `02079460019`; UK national formatting remains supported. CA example: `4165550160`. AU example: paste `+61412345678`.
11. Tab through login, account/profile, Vendor onboarding, Market onboarding, public application, checkout and Admin forms. Confirm a thin neutral visible keyboard indicator and no focus shadow or bright focus background. Use phone replacement only with the current password and an unused number; a wrong OTP must leave the old personal identity intact.

Verified multi-role fixture: `identity-owner-0@test.invalid`, password `local-identity-regression-only-password`. Native Platform reviewer fixture: identifier `identity-regression-superadmin`, same password. These are disposable test actors only. The automated new signup fixture is `browser-free@test.invalid`, password `Browser-replacement-1!password` after the suite's password recovery step. Use a fresh manual identity for the walkthrough.

An empty terminal line stops the successfully running demo and invokes its normal owned-database cleanup. No real SMS/payment credentials are needed or used.

After personal signup, choose “Become a Vendor” or “Create / Manage a Market”. Confirm the button styling and prefilled phone. Enter business/Market name, contact name and email. There is no address input. On Market signup choose a friendly time zone such as Mountain. “Save progress” keeps a draft; “Finish Vendor signup” or “Finish Market signup” immediately enables the corresponding dashboard. No reviewer login/decision is needed. In Market settings, confirm the same dropdown shows the chosen zone. Existing live demos must restart their backend to load this policy change; the normal empty-line stop clears their disposable test data.

## Exact Files Changed

Paths below identify this task's changes, not all preexisting Git dirt. Existing files listed here were extended in place; files marked new are additions from this task.

Backend root `E:\coding\farmers-market-platform`:

- `src/plugins/marketplace-commerce/customer-account/phone.service.ts`
- `src/plugins/marketplace-commerce/customer-account/service.ts`
- `src/plugins/marketplace-commerce/customer-account/onboarding.service.ts`
- `src/plugins/marketplace-commerce/customer-account/controller.ts`
- `src/plugins/marketplace-commerce/customer-account/sms.ts`
- `src/plugins/marketplace-commerce/customer-account/errors.ts` (new)
- `src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts`
- `src/plugins/platform-identity/phone-identity.ts`
- `src/plugins/platform-identity/password-policy.ts` (new)
- `src/plugins/platform-identity/signup-provisioning.ts` (new, owned-signup guard)
- `src/plugins/platform-identity/vendor-provisioning.service.ts`
- `src/plugins/platform-identity/identity.service.ts`
- `src/plugins/farmers-market/services/market-provisioning.service.ts`
- `src/plugins/farmers-market/services/market.service.ts`
- `src/migrations/1791760000000-PendingSignupCredential.ts` (new)
- `test/platform-identity/config.ts`
- `test/frontend-integration/cookie-client.ts`
- `test/market-operations/phone-verification.ts`
- `test/market-operations/account-signup-onboarding.ts`
- `test/market-operations/platform-input-validation.ts`
- `test/market-operations/phone-migration.ts`
- `test/market-operations/sms-signup-ux.ts` (new)
- `test/market-operations/account-experience-server.ts`
- `test/market-operations/pending-signup-migration.ts` (new)
- `test/customer-relationships/acceptance.ts`

Frontend root `E:\coding\farmers-market-platform-web`:

- `apps/storefront/src/pages/account/signup.astro`
- `apps/storefront/src/pages/account/verify.astro`
- `apps/storefront/src/pages/account/reset.astro`
- `apps/storefront/src/pages/account/onboarding/[role].astro`
- `apps/storefront/src/pages/account/admin-phone.astro`
- `apps/storefront/src/pages/account/communications.astro`
- `apps/storefront/src/pages/account/index.astro`
- `apps/storefront/src/pages/account/login.astro`
- `apps/storefront/src/pages/account/orders/[id].astro`
- `apps/storefront/src/pages/account/orders/index.astro`
- `apps/storefront/src/pages/account/phone.astro`
- `apps/storefront/src/pages/account/recover.astro`
- `apps/storefront/src/pages/account/sign-in.astro`
- `apps/storefront/src/pages/api/account.ts`
- `apps/storefront/src/lib/account.ts`
- `apps/storefront/src/lib/account-form.ts`
- `apps/storefront/src/lib/phone-verification.ts` (new)
- `apps/storefront/src/components/SignupPasswords.tsx` (new)
- `apps/storefront/src/components/CentralAccount.astro`
- `apps/storefront/src/components/Checkout.tsx`
- `apps/storefront/src/components/MarketCart.tsx`
- `apps/storefront/src/components/MarketPurchase.tsx`
- `apps/storefront/src/components/ProductPurchase.tsx`
- `apps/storefront/src/components/PurchaseSuccess.tsx`
- `apps/storefront/src/components/ShopSignIn.tsx`
- `apps/storefront/src/components/VendorCart.tsx`
- `apps/storefront/src/styles/checkout.css`
- `apps/admin/src/market/dashboard.css`
- `apps/admin/src/market/timezones.tsx`
- `apps/admin/src/AccountModes.tsx`
- `apps/admin/src/management/AccountOnboardingReview.tsx`
- `packages/ui/src/TimezoneField.tsx` (new, shared existing timezone control)
- `packages/ui/src/PhoneInput.tsx`
- `packages/ui/src/password-policy.ts` (new)
- `packages/ui/src/index.tsx`
- `packages/ui/src/styles.css`
- `scripts/test-account-signup-onboarding.ts`
- `tests/phone-input.test.tsx`
- `tests/signup-passwords.test.tsx` (new)
- `tests/account-rate-feedback.test.ts` (new, server-relative rate feedback)
- `docs/sms-verification-signup-ux-fixes.md` (this sole new Markdown report)
- `docs/evidence/sms-signup-ux/verification-mobile.png` (new browser QA evidence)
- `docs/evidence/sms-signup-ux/verification-mobile-2026-10-12.png` (follow-up QA evidence)
- `docs/evidence/signup-onboarding-2026-10-12/vendor.png`
- `docs/evidence/signup-onboarding-2026-10-12/market.png`

Generated scratch test logs, standard `.runtime` outputs and visual QA screenshots are not handwritten application code. No package dependency, existing migration, protected database, generated GraphQL source or production credential change was required.

## Remaining Work

UNVERIFIED: qualify a real SMS provider, carrier acceptance and mobile OS autofill under a separately authorized operational test. No real SMS or payment-provider calls were made here.

Before any separately authorized persistent rollout, apply the new forward-only migration through the existing migration workflow, restart all backend/Storefront instances together, ensure the existing Vendure scheduler/worker runs the pending-credential expiry task, and verify the deployed origin/proxy/cookie/client-boundary configuration. Do not directly enable production databases or provider networking from these demo commands.

The historical single rejection remains UNVERIFIED without its original challenge/cookie/audit state. New sanitized reasons make future occurrences diagnosable without exposing secrets. The known phantom-receipt/stale-resend defect has been removed and real current signup/resend/activation is VERIFIED.

The old audit report's formatting is the sole frontend repository-wide lint blocker. Its existing contents were preserved. The optional backend formatter check also reports the nine existing files above. Scriptless full signup remains PARTIAL because the preexisting React phone selector requires hydration; the OTP digit fields and native POST fallback are present, but this work does not claim an end-to-end no-JavaScript signup or exhaustive browser/theme certification.
