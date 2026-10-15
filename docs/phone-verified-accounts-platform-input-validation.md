# Phone-verified accounts and platform input validation

Local implementation report. Work performed on October 10 and 11, 2026, in the frontend and backend repositories specified in the task. No deployment or remote Git operations were performed.

## 1. Executive Summary

Personal signup now requires a valid personal phone and a six-digit SMS proof. The pending request creates no Vendure User. Successful verification creates the canonical User, native password credential and Customer in one database transaction, with immediate basic account access. Email proof is separate and optional for activation. Vendor and Market authority still requires the existing review, membership and purpose-specific session boundaries.

The implementation adds a unique personal phone identity, a production Twilio adapter, a strictly guarded in-memory test transport, mandatory legacy enrollment, native administrator enrollment, atomic personal number replacement, shared country-aware phone controls, shared field limits, a GraphQL input interceptor and published application-question limits. The checkout guest claim now completes mailbox proof, SMS proof and native password setup before it opens order history.

Local PostgreSQL, unit, browser, type and build checks are recorded below. Production SMS has not been configured or exercised. Recovery of a disputed or recycled number remains a manual security process. Some validation presentation and third-party UI limitations remain in sections 8, 9 and 16. Full repository lint is blocked by the formatting of a preexisting report.

## 2. Previous Account Verification Behavior

The previous signup implementation collected first name, last name and email, created or located a pending native User and Customer, emailed a verification capability, then activated a password through the native verification service. Successful email verification was the personal activation condition. This was verified against the customer-account service and the account signup/verify pages, after reading `docs/unified-platform-identity-implementation.md` and `docs/unified-account-signup-onboarding-implementation.md`.

The new signup stores only pending name/email metadata and a phone challenge before proof. Password entry occurs with the SMS code and uses native Vendure password storage. A successful SMS proof activates the account immediately without an administrator, business application, email approval or role-review action. The old registration-email verification bridge method rejects activation attempts. Native GraphQL registration and verification mutations cannot bypass the phone workflow.

Existing guest purchase email links still prove the mailbox for the existing Customer. They now produce a short-lived restricted phone-enrollment capability instead of activating an account on mailbox proof alone.

## 3. New Phone Identity Architecture

Vendure `User` remains the canonical identity. `Customer` remains its personal profile. There is no separate identity per phone, business, Vendor or Market.

| Table                        | Authority and constraints                                                                                                                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `platform_phone_identity`    | One current verified E.164 number per User; unique User FK and unique phone; `verifiedAt`, ISO country, optional `emailVerifiedAt` and exact `emailVerifiedAddress`; email timestamp/address must be both set or both null |
| `platform_phone_challenge`   | Pending signup or replacement; token SHA-256, keyed code MAC, keyed client binding, phone/country, optional User FK, limited attempts, registration metadata, expiry and explicit state                                    |
| `platform_phone_rate`        | Durable counters keyed by HMAC, with window start and count                                                                                                                                                                |
| `unified_account_capability` | Existing identity capability storage plus constrained `ENROLL_PHONE` purpose                                                                                                                                               |

A phone identity exists only after proof; there is no client-set verification flag. Pending replacement lives in the challenge table. The old verified number remains current while replacement is pending. The same identity row is updated atomically after verification.

Both unique constraints are authoritative under concurrent requests. Advisory transaction locks serialize canonical email, phone ownership and User replacement, and a row lock serializes OTP consumption. These locks supplement the database constraints.

The migration performs no legacy backfill. Authentication can establish a restricted legacy session, but protected operations, account affiliations, applicant identity and account handoffs require the authoritative phone row. Public browsing and anonymous checkout remain available.

Phone uniqueness also reserves numbers held by deleted or closed identities. This is intentionally stricter than uniqueness among active Users and prevents an automatic recycled-number transfer.

## 4. SMS Provider Integration

The existing communications plugin already had Twilio infrastructure for approved communications. Authentication OTPs use a contained adapter around the installed Twilio SDK, with separate policy and no marketing subscription side effect.

`TwilioVerificationSms` sends a transactional six-digit code through a Messaging Service. It has an eight-second SDK timeout, disables automatic retries, explicitly suppresses SDK debug payload logging even when TWILIO_LOG_LEVEL=debug, rejects failed/undelivered/canceled provider status, and requires explicit network enablement. Provider exceptions are reduced to a safe delivery-unavailable message. API acceptance is not a guarantee of final handset delivery.

Configuration is read in `src/vendure-config.ts` and passed through plugin options:

| Variable                                  | Use                                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `PHONE_OTP_KEY`                           | Independent server secret, at least 32 characters; generate a cryptographically random secret outside source control |
| `PHONE_SMS_COUNTRIES`                     | Comma-separated ISO countries; runtime default `US,CA`; test harness explicitly supports `US,CA,GB,AU`               |
| `PHONE_SMS_HOURLY_BUDGET`                 | Platform-wide send cap, default 100; supported configuration 1 to 10,000                                             |
| `PHONE_SMS_MESSAGING_SERVICE_SID`         | Dedicated Twilio Messaging Service identifier                                                                        |
| `PHONE_SMS_ALLOW_NETWORK`                 | Explicit `true` required for real sending                                                                            |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Existing server-only Twilio credentials                                                                              |

The adapter is available only when credentials and service configuration are present. A missing transport/key or unsupported SMS country fails before account activation. An empty build-only key is treated as unset. No production environment file was edited.

`LocalVerificationSms` requires environment `test`, a nonproduction process and a database matching `vendure_test_[a-z0-9_]+`. Codes exist only in process memory. The account browser harness exposes lookup through parent/child IPC and the interactive terminal. The checkout browser harness uses a separate loopback-only test controller protected by a random fixture key. Neither mechanism is registered in the production application.

Before operational use, configure the Messaging Service, sender registrations and destination permissions, set a random OTP key, choose permitted countries and spending limits, and test real delivery deliberately. Key rotation invalidates outstanding challenges. No real SMS was sent in this task.

For a later, separately approved real-SMS test:

1. Use an approved isolated environment with the reviewed phone migration applied. Do not use the protected development database or the fake-SMS acceptance harness for this test.
2. Supply the server-only variables in the table above through that environment's secure configuration. Set PHONE_SMS_ALLOW_NETWORK=true, permit the country of a phone you control, and choose a deliberately small hourly budget. The Messaging Service must have an approved sender and permission to send to that destination.
3. Start the existing backend with `npm run dev:server` from the backend root and the storefront with `npm run dev:storefront` from the frontend root, using the approved environment's matching SHOP_API_URL and PLATFORM_ACCOUNT_ORIGIN. These commands already exist; no new hosting service is required. Confirm the configured provider is TwilioVerificationSms, rather than LocalVerificationSms.
4. Open `/account/signup` at the configured PLATFORM_ACCOUNT_ORIGIN. Enter a unique test email and the actual phone you control, choose **Send SMS verification code**, and retrieve the code from the handset. Submit it with a new password, then sign in and confirm immediate personal activation with email still separately unverified.
5. Verify the recorded current number is E.164, that a wrong code fails, and that the consumed code cannot activate another account. Test replacement with a second controlled phone and the current password. Respect the one-minute resend cooldown and three-per-phone hourly limit while testing.
6. Disable PHONE_SMS_ALLOW_NETWORK again after the approved test and review only redacted lifecycle/delivery evidence. No production code lookup or plaintext OTP log is available. Provider acceptance alone is insufficient evidence; receiving the message on the handset is the delivery check.

This guide was not executed. Environment/provider configuration and the migration rollout need separate authorization and setup.

## 5. Registration and Immediate Account Activation

1. At the central signup page, enter first name, last name, email and personal phone.
2. Select a country, default United States +1, and enter or paste the national number.
3. The server validates and canonicalizes the phone and returns an opaque challenge receipt. No User or business identity exists yet.
4. Enter the SMS code and a password of 12 to 128 characters.
5. The server locks the challenge, verifies its keyed MAC, expiry, client binding and attempt budget, then creates User, native password credential, Customer and phone identity atomically.
6. Sign in immediately and open the free personal dashboard. Vendor and Market onboarding are available as separate next actions.

Native Vendure handles hashing and password authentication. Passwords are not stored in challenge JSON. Successful retries or concurrent verification cannot create duplicate identities.

The dashboard shows personal phone proof separately from email ownership. Optional email verification enables sensitive email recovery and private email communications, while personal activation already succeeded.

## 6. Existing Account Migration

| Existing case                                         | Behavior                                                                                                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| No phone or old unverified Customer phone             | Password login enters mandatory personal-phone enrollment. Old contact data is not proof and is not copied into identity                              |
| Two Users sharing an old contact phone                | Both old fields survive. The first successful personal identity claim reserves the number; the second cannot take it                                  |
| Multi-role Customer/Administrator User                | One User and one phone identity across roles; enrollment preserves all existing membership and role rows                                              |
| Administrator with a native username instead of email | Central `/account/admin-phone` accepts the existing native identifier and password before SMS proof; subsequent access uses the existing Admin login  |
| Deleted User or deleted Administrator                 | Enrollment and account capability binding reject the inactive identity                                                                                |
| Suspended business membership                         | Phone proof does not restore suspended or revoked operational membership                                                                              |
| Historical guest Customer                             | Mailbox proof gives restricted enrollment; SMS and a native password activate the same User and Customer; existing orders and pickup contacts survive |
| Verified account replacing its phone                  | Current password plus new SMS proof; current number remains authoritative until commit                                                                |
| Recycled or disputed number                           | No automatic reassignment, merge or ownership transfer                                                                                                |

For a guest claim, the enrollment capability remembers only the previously validated storefront identity. After SMS, the server resolves its current canonical hostname and active eligibility again before minting a Customer-only storefront capability. If the storefront is no longer available, the verified central account remains usable without trusting a caller-selected return URL.

The administrator path requires live native credentials and a live Administrator row. It creates no replacement User or permissions. It cannot enroll an ordinary Customer as an Administrator.

There is no new self-service lost-password-and-unverified-email recovery bypass. Legacy Users who cannot authenticate and cannot securely prove the necessary existing identity require trusted remediation.

## 7. Phone Input Component

`packages/ui/src/PhoneInput.tsx` renders a distinct country selector to the left of a national `type="tel"` field. Calling codes come from `libphonenumber-js/max`; static country display names avoid Node/browser locale hydration differences.

US typing produces `(210) 555-0123`. Pasting `+442079460018` selects Great Britain and displays `020 7946 0018`. International numbers use their country's formatting instead of a US mask. The hidden form value or React change value is E.164 only when valid. Malformed input remains invalid and visible.

The control supports middle edits, backspace, pasted international numbers, country changes, restoring saved E.164 values, optional blanks, required numbers and complete country-aware validation. It rejects extensions and wrong-country number combinations. Overlong numbers are not silently truncated into a different number. Fields wait for hydration before accepting input so Astro island replacement cannot erase typed values.

Labels, country labels, validation feedback, `aria-describedby`, `aria-invalid` and native custom validity are wired together. The selector and national input remain adjacent in responsive layouts. Browser acceptance includes mobile widths and accessibility checks.

Migrated phone usage includes signup, existing-account enrollment, replacement, native administrator enrollment, Vendor/Market onboarding, checkout pickup contact, application PHONE questions and Market directory contact editing. Business contact fields stay independent of the verified personal number.

## 8. Platform-Wide Input Audit

The source inventory reviewed all input-bearing React and Astro files in `apps` and `packages/ui/src`, including wrappers and select-only forms. "Shared" means semantic attributes plus the existing command/domain validator; it does not mean a generic text ceiling replaces domain validation.

| Component or form, relative to frontend root                                 | Validation and task coverage                                                                                                                                                        |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/PhoneInput.tsx`                                             | New country-aware parsing, formatting, required/optional behavior, canonical payload and accessible errors                                                                          |
| `packages/ui/src/form-controls.tsx`, `input-validation.ts`, `index.tsx`      | Shared Input/Textarea limits, semantic types, required nonblank text pattern, finite numeric HTML bounds; explicit field limits remain narrower                                     |
| `packages/ui/src/ApplicationFields.tsx`                                      | All published question types; personal-name semantic limits; custom length/range; PHONE control; email, URL, date/time, selection and optional rules                                |
| `packages/ui/src/MarketMap.tsx`                                              | Shared controls for map interaction; existing owned layout and selection validators retained                                                                                        |
| `apps/storefront/src/pages/account/signup.astro`                             | Names 100, email 254, required personal phone; backend pending signup                                                                                                               |
| `account/verify.astro`                                                       | Six digits and password 12 to 128; backend OTP attempts and lifecycle                                                                                                               |
| `account/phone.astro`, `account/admin-phone.astro`                           | Reauthentication, country-aware personal phone and SMS proof; safe retry feedback                                                                                                   |
| `account/login.astro`, `account/sign-in.astro`                               | Email semantics/254, bounded current password; existing session purpose and canonical target checks                                                                                 |
| `account/recover.astro`, `account/reset.astro`, `account/email-verify.astro` | Bounded email/password and server-owned capability proof; separate proven email policy                                                                                              |
| `account/onboarding/[role].astro`                                            | Business/Market name 200, contact name 100, email 254, shared optional phone, location 500, trusted timezone                                                                        |
| `lib/account-form.ts`, `layouts/SiteLayout.astro`, `pages/api/account.ts`    | Progressive account-form submission retains entered values and country selection after rejection; accessible contextual feedback; same-origin continuation only; no browser storage |
| `components/CentralAccount.astro`                                            | Names 100; immutable email identity presentation; verified phone replacement link; bounded password changes and consent choices                                                     |
| `account/index.astro`, `pages/auth/claim.astro`, `pages/auth/logout.astro`   | Existing capability/action forms and fixed controls; phone gate added to account routing                                                                                            |
| `components/Checkout.tsx`                                                    | Shared names/email and optional pickup phone; contact frozen independently from personal phone proof                                                                                |
| `components/MarketApplication.tsx`                                           | Shared published application fields; protected account preamble, current affiliations and provenance retained                                                                       |
| `components/MarketCart.tsx`, `VendorCart.tsx`                                | Shared quantities and coupon code limits; integer/capacity/order context guards retained                                                                                            |
| `components/MarketPurchase.tsx`, `ProductPurchase.tsx`                       | Shared quantity controls; existing positive quantity and maximum quantity rules                                                                                                     |
| `components/CommunicationPreferences.tsx`                                    | Explicit consent controls; proof never supplies marketing consent                                                                                                                   |
| `pages/products/index.astro`, `pages/occurrences/[occurrenceId]/index.astro` | Reviewed existing bounded search and allowlisted sort/filter fields; no weaker alternate phone input                                                                                |
| `apps/admin/src/AdminApp.tsx`                                                | Shared credential controls; native administrator enrollment entry on unavailable account context                                                                                    |
| `AccountModes.tsx`, `FixtureAdmin.tsx`                                       | Reviewed select-only context/fixture controls; existing authoritative choices retained                                                                                              |
| `vendor/common.tsx`                                                          | Shared TextField contract; quantity inferred as numeric with minimum 1; command integer/text validation                                                                             |
| `vendor/catalog.tsx`                                                         | Existing shared product/variant/name/slug/SKU/description/price controls; backend description now rejects overlong content instead of slicing                                       |
| `vendor/inventory.tsx`, `vendor/orders.tsx`                                  | Quantity and stock integer validators, owned order/stock commands; shared TextField limits                                                                                          |
| `vendor/customers.tsx`, `vendor/analytics.tsx`                               | Reviewed bounded search/period controls; private contact projection and reporting scope unchanged                                                                                   |
| `vendor/markets.tsx`                                                         | Shared contact-like text and operational settings; existing linking, consent, positive quantity and preorder rules                                                                  |
| `market/common.tsx`                                                          | Shared Market fields, dates, numeric rules and timezone validation; validators retained                                                                                             |
| `market/settings.tsx`                                                        | Market name 200, venue 500, pickup instructions 2000 and allowlisted status; backend settings validator                                                                             |
| `market/schedule.tsx`, `market/occurrences.tsx`                              | Shared date/time/numeric controls; recurrence/timezone/interval/DST and optimistic-version validators retained                                                                      |
| `market/vendors.tsx`                                                         | Shared search, participation and listing fields; backend membership/listing authority and stock/range rules                                                                         |
| `market/analytics.tsx`, `market/timezones.tsx`, `market/presentation.tsx`    | Reviewed date/filter/select wrappers; existing timezone and reporting contract                                                                                                      |
| `market/phase14/common.tsx`                                                  | Shared Entry, Check and Control; PHONE routed to PhoneInput; email 254 and contextual description/note limits                                                                       |
| `market/phase14/ApplicationBuilder.tsx`                                      | Question labels/help/sections and versioned length/range controls; changing type clears incompatible old constraints                                                                |
| `market/phase14/ApplicationReview.tsx`                                       | Shared typed answers and review controls; business acceptance/date decision distinction retained                                                                                    |
| `market/phase14/Directory.tsx`                                               | Country-aware contact phone, email, names and business limits; directory/rental domain validators                                                                                   |
| `market/phase14/Assignments.tsx`, `Billing.tsx`                              | Shared text/numeric controls; booth eligibility, quantities, cents, currency, issued invoice and payment invariants                                                                 |
| `market/phase14/LayoutInspector.tsx`                                         | Explicit booth label 80/text 500, space type 80, description 2000, currency 3, fee cap; removes silent label slicing                                                                |
| `market/phase14/Layouts.tsx`, `OperationsRoutes.tsx`                         | Shared controls and existing geometry, plan, layout lifecycle and Market Day validators                                                                                             |
| `management/AccountOnboardingReview.tsx`                                     | Review evidence 1000, slug 120, fixed decisions; actual trusted approval remains required                                                                                           |
| `management/catalog.tsx`, `management/platform.tsx`                          | Shared controls, explicit checkbox labels and existing billing/provisioning/domain validators                                                                                       |
| `management/common.tsx`, `management/pos.tsx`                                | Reviewed inherited shared controls and existing safe provider configuration fields                                                                                                  |

Exceptions and practical limits:

- Astro account forms retain explicit native HTML controls for text/password/code, with shared PhoneInput islands and backend service validation. They are reviewed and bounded, but are not a new all-React form framework.
- Generic shared text inputs default to 500 and generic textareas to 5000. GraphQL unknown string keys retain a 50,000 ceiling for versioned JSON and opaque inputs. The domain service supplies the tighter field limit. A generic fallback alone is not evidence of semantic parity.
- Drawing controls now match the backend geometry range of ±100,000, image URL limit of 2000, and existing style bounds. Booth label, description, fee, currency and payment-note limits are explicit. An exhaustive test of every drawing/style attribute and every billing metadata editor at every boundary was not performed.
- Native bundled Vendure dashboard controls were not replaced with React PhoneInput. Direct APIs receive backend validation; the custom platform Admin forms above use the shared controls.
- Signup, phone requests, profile edits, onboarding, password changes and email-proof requests progressively preserve entered values after server rejection and show accessible contextual feedback. The browser test exercises an unsupported SMS country and confirms names, email and country stay in the signup form. Values remain only in the current DOM. Without JavaScript, these forms retain the safe native submission/error page; React command forms retain their existing drafts. Backend-to-field error mapping for every Astro action remains a presentation enhancement.

## 9. Field Limits and Validation Contracts

Frontend `packages/ui/src/input-validation.ts` and backend `src/plugins/platform-identity/input-validation.ts` have matching semantic maps, checked by a parity test. GraphQL root interception validates both variables and literal arguments. Services enforce required fields, narrower domain rules, approved values and authorization.

| Domain                              | Actual bounds and enforcement                                                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personal names/contact name         | 100; HTML/shared controls and account services; application semantic names also 100                                                                                                                 |
| Business/Market/catalog names       | General name 200; onboarding 200; application businessName up to 500; directory businessName 200                                                                                                    |
| Email                               | 254, trimmed, no whitespace/multiple @; email HTML type and backend syntax checks                                                                                                                   |
| Phone                               | Raw server input up to 64; valid country-specific E.164 up to 15 digits plus +; identity DB varchar(16); optional blank supported                                                                   |
| Slug/provisioning/operation keys    | 120, with existing route/key character rules                                                                                                                                                        |
| URL/website/social URL              | 2048; HTTP(S), no embedded credentials; application URL uses URL parsing                                                                                                                            |
| Product description                 | 10,000; frontend named description textarea and backend rejection instead of truncation                                                                                                             |
| Application short/long answer       | Defaults 500/5000; manager maxLength 1..500 or 1..5000, with semantic name/email/URL limits also applied                                                                                            |
| Application labels/options/sections | Existing model defaults 200; question help 2000; max 100 questions, 30 sections and 50 options                                                                                                      |
| Application number                  | Finite ±1,000,000 with published minimum/maximum; frontend answer step permits decimals                                                                                                             |
| Application DATE/TIME               | Valid calendar date YYYY-MM-DD and 24-hour HH:MM; native HTML date/time controls                                                                                                                    |
| Venue/pickup/location               | 500/2000/500; Market and onboarding validators                                                                                                                                                      |
| Notes/reason/review                 | Shared note ceiling 5000, reason 2000; onboarding review evidence specifically 1000; domain-specific tighter limits retained                                                                        |
| Booth/rental text                   | Label 80, space type 80, space/rental description 2000, manager notes 5000, currency exactly three uppercase letters                                                                                |
| Money/quantity                      | Vendure price nonnegative integer minor units to 2,147,483,647; Market operation money to 100,000,000; rental quantity to 1000 and capacity to 100,000; stock/order-specific guards retained        |
| Password                            | New/reset password 12..128; existing authentication password up to 1024 for compatibility                                                                                                           |
| Search/identifiers                  | Search 200; account hint 200; native administrator identifier 254; hostnames 253                                                                                                                    |
| Postal/address                      | Street/city/province 255, postal 32; backend validates US ZIP/ZIP+4 and Canadian postal syntax when countryCode is available                                                                        |
| Structural API limits               | Nesting at most 20, list at most 1000, unknown string at most 50,000; account bridge decoded JSON at most 4096, account form transport at most 16 KiB to accommodate URL-encoded international text |

Unicode text is retained intact. Shared backend limits, catalog descriptions, existing domain validators and native HTML maxlength consistently count UTF-16 units. Accented and non-Latin strings are covered by persistence and browser checks; supplementary characters occupy two units, with explicit tests at the valid and overlong boundaries. This preserves the existing browser/domain convention without silently truncating saved names or descriptions. Grapheme-based counters are a possible future presentation enhancement.

The email policy preserves the established lowercase canonical account normalization. Directory contacts are trimmed without introducing local-part lowercasing; onboarding retains its prior lowercase contact policy. Syntactic validity is never ownership proof. Full SMTPUTF8/EAI support and every browser's internationalized-domain behavior were not certified.

Question constraints are stored in versioned definition JSON. Old definitions without new properties use safe defaults. Existing submission snapshots are not rewritten. The platform-owned account preamble remains nonmovable and cannot be impersonated through a custom semantic field.

No generated GraphQL types were hand-edited. New phone actions use the existing server-only bridge, and custom question properties use existing versioned JSON and the handwritten domain interface. No new GraphQL schema shape was required.

## 10. Vendor/Market Onboarding Compatibility

SMS proof creates only basic personal-account authority. It does not provision a Vendor, a Market, an Administrator, an owner grant, a Market membership, a confirmed occurrence participation or communications consent.

Vendor and Market onboarding drafts still move through their existing review lifecycle. Trusted Platform review provisions or links the operational identity and grants only the intended role and Channel permissions. Vendor linking still requires deliberate authorized-owner confirmation. Application acceptance still differs from date approval and confirmed canonical participation.

A verified multi-role person has one User and one personal phone, with separate business contacts. Existing role memberships, tenant ownership, suspended/revoked state, application provenance, invoice history, operational orders and finance allocation remain separate from phone proof.

## 11. Security and Privacy

OTP generation uses cryptographic randomInt, six digits including leading zeros, and a 32-byte random opaque token. The database stores a SHA-256 token digest and an HMAC-SHA256 of token plus code using an independent secret. Verification uses constant-time MAC comparison. Passwords and plaintext OTPs never enter challenge storage.

Codes expire after five minutes. Five wrong attempts lock a challenge. A new eligible request expires older pending/sent challenges for the same number. Successful consumption clears registration metadata and overwrites the stored code MAC. Expiry detection persists its state, and registration metadata older than a day is lazily cleared on new requests. A scheduled retention purge for old challenge/rate rows is not yet implemented.

Durable send limits are 10 per client/hour, 3 per phone/hour, one per phone/minute and a configurable global hourly budget. Verification is limited to 30 attempts per client/15 minutes. Reauthentication is separately rate limited. Counter transactions commit independently of failed verification transactions, so rejection cannot roll back attempt/rate evidence.

Unknown, conflicting and throttled requests receive the same opaque receipt shape. The system does not expose phone availability. A duplicate phone request may still receive a transactional SMS within its budget; the subsequent generic verification failure does not reveal the owning User. Delivery failure does not display a false success receipt.

Audit events record requested, wrong code, locked, expired, verified, replaced and conflicting ownership transitions, plus optional email proof. They contain no OTP, raw phone or registration email metadata. Phone identity/challenge tables remain private backend storage.

Phone changes require password reauthentication and proof of the replacement. Existing sessions, protected actions, capabilities, client binding and current User status are checked. SMS proof supplies neither a trusted email nor a marketing subscription. Email recovery requires proof bound to the current canonical address, including after a native identifier edit. Old mailbox proof cannot verify a new address.

Existing purpose-specific Shop/Admin authentication remains: shared identity does not carry privileged Role grants into Shop. Deleted or invalidated native sessions are rejected, as are protected requests without phone identity. BFF actions remain server-secret authenticated and browser posts remain origin checked. OTP/capability values are kept in HttpOnly cookies, not browser localStorage.

The built-in budget and country policy are SMS-pumping protections; they do not certify a deployed edge bot/WAF/CAPTCHA configuration. No live security load test or carrier-delivery verification was performed.

## 12. Migrations

The only new migration in this task is backend `src/migrations/1791750000000-VerifiedPersonalPhone.ts`, class `VerifiedPersonalPhone1791750000000`.

It creates the three phone tables, User foreign keys with ON DELETE RESTRICT, unique User/phone/token/rate constraints, E.164 checks, attempt/state constraints, the paired email-proof constraint and phone/state, User and expiry indexes. It extends unified capability purpose checks for ENROLL_PHONE while preserving the prior accepted CENTRAL shape.

The migration is forward-only and refuses down(). It does not update or delete a User, Customer, Administrator, role, membership, old contact, application answer, order or invoice. It does not mark any old number or email verified. Re-running through migration history applies nothing a second time.

All database integration used disposable, guarded local `vendure_test_*` names. The protected `vendure` database was not migrated, reset or queried by the test workflows. Test-only fixture proof is explicit synthetic setup after asserting the disposable target; it is not a production backfill or evidence of real SMS delivery. Failed runs retain their owned test databases for diagnosis; successful runs drop theirs.

## 13. Test Results

The pass figures below are test groups where the repository runner groups many assertions. Recursive regression counts are reported separately and are not added to the parent's total.

| Check                                                            | Result and evidence scope                                                                                                                                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone verification                                               | 16/0, PostgreSQL with fake SMS, including exact-address email proof and native password-reset denial after an identifier change                                                          |
| Phone migration                                                  | 5/0, populated PostgreSQL upgrade; uniqueness, FK, old capability preservation, attempts and forward-only behavior                                                                       |
| Platform input validation                                        | 10/0, PostgreSQL plus direct public/Admin GraphQL and account services; boundaries, invalid values, Unicode, optional blanks, preserved records                                          |
| Signup/onboarding backend                                        | 19/0, PostgreSQL/fake SMS; pending account, native credential, approvals, separate email recovery                                                                                        |
| Unified account backend                                          | 15/0, real PostgreSQL/native sessions                                                                                                                                                    |
| Application identity                                             | 17/0, real published applications, provenance, autofill and authority isolation                                                                                                          |
| Market operations                                                | 21/0, PostgreSQL; application/date decision, layout, assignment, invoice, payment and Market A/B isolation                                                                               |
| Account-role upgrade                                             | 5/0, populated forward-only migration compatibility                                                                                                                                      |
| Communications                                                   | 25/0, final address-bound email eligibility rerun passed; fake providers                                                                                                                 |
| Stripe adapter focused                                           | 65 passed; 2 external checks NOT_EXECUTED; local database and controlled adapter boundary                                                                                                |
| Finance attribution/refund                                       | 62/0; real local database and fake payment/refund adapter                                                                                                                                |
| Recursive commerce/inventory/catalog/Market/identity regressions | 47/42/29/25/19 passed respectively through the successful finance regression invocation                                                                                                  |
| Frontend Vitest                                                  | 294/0 across 21 files; final phone controls 7/0 and drawing/billing regressions 40/0 after the last relevant changes                                                                     |
| Account browser acceptance                                       | 19/0, final rerun including rejected-request value preservation and a 500-character Japanese onboarding location; Chromium + PostgreSQL + Astro/Admin, no fixtures replacing the backend |
| Checkout/account browser                                         | 1 complete end-to-end scenario passed, plus native backend assertion chain; production Astro SSR, unclaimed purchases, SMS enrollment, order history, cross-domain SSO, local payment    |
| Frontend typecheck                                               | Passed; TypeScript and Astro 66 files, 0 errors/warnings/hints                                                                                                                           |
| Backend types                                                    | Passed for main source, frontend-integration and market-operations projects, including final address-bound email column and recovery tests                                               |
| ESLint and package boundary checks                               | Passed; 9 workspace package graph valid                                                                                                                                                  |
| Full frontend lint                                               | Fails only Prettier on preexisting `docs/vendor-application-account-identity-audit.md`; report deliberately untouched                                                                    |
| Production local builds                                          | Frontend, Vendure dashboard, server and worker passed with synthetic configuration and provider networking disabled; final form-preservation and Unicode changes compiled successfully   |

The final SMS transport checks passed 4/0 with all provider calls replaced by controlled responses. They verify logging override, timeout/retry configuration, networking disabled before delivery, intended payload, queued acceptance, failed statuses and missing provider identifiers. Zero network calls occurred; this does not certify real carrier delivery.

Exact commands, using PowerShell:

```powershell
# Frontend root
Set-Location E:\coding\farmers-market-platform-web
$env:FRONTEND_NO_EVIDENCE='true'
npm test
npx vitest run tests/phone-input.test.tsx
npx vitest run tests/phase15b.test.tsx tests/phase15c.test.ts tests/market-operations.test.tsx
npm run typecheck
npm run lint
npm run build
npm run build:production-local

# Browser ports chosen to preserve existing local servers on 4337/4555
$env:PHONE_TEST_STOREFRONT_PORT='4407'
$env:PHONE_TEST_ADMIN_PORT='4567'
npx tsx scripts/test-account-signup-onboarding.ts
npx tsx scripts/test-checkout-account.ts

# Backend root, local PostgreSQL
Set-Location E:\coding\farmers-market-platform
$env:DB_HOST='127.0.0.1'
npx tsc --noEmit --project tsconfig.json
npx tsc --noEmit --project test/frontend-integration/tsconfig.json
npx tsc --noEmit --project test/market-operations/tsconfig.json
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/phone-verification.ts
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/phone-sms-transport.ts
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/phone-migration.ts
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/platform-input-validation.ts
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/account-signup-onboarding.ts
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/unified-account.ts
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/application-identity.ts
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/account-role-migration.ts
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/run.ts
npx ts-node --project test/communications/tsconfig.json test/communications/run.ts --focused
npx ts-node --project test/payments-stripe/tsconfig.json test/payments-stripe/run.ts --focused
npx ts-node --project test/paid-attribution-refund/tsconfig.json test/paid-attribution-refund/run.ts
```

Finance invokes the existing commerce, inventory, catalog, Market and identity regression runners recursively. Their successful JSON records in each `test/<suite>/.runtime` were inspected for the counts above. Browser account results print a suite/count/database receipt. Checkout reports its complete scenario as passed.

Corrections discovered during implementation included persisted failed-attempt rollback, an incorrect native authentication table name, old shared-country hydration/caret behavior, entered values before hydration, fixture actors missing explicit phone proof, invalid old test contact numbers, a package self-import, empty synthetic SMS key handling, a formatter-induced browser reload, nullable email-column metadata, an Admin instead of Shop context in a native recovery test, checkout fixtures needing new proof after their email changed, a named form-control collision, and synchronizing test SMS retrieval after asynchronous form submission. The successful reruns, rather than the failed initial attempts, determine the pass claims. The semantic parity test was corrected to tolerate formatter-added trailing commas without weakening compared values.

No security assertions were removed to force a pass. Test fixtures that represent already verified actors gained explicit disposable-only proof; guest/pending actors still exercise actual SMS enrollment. Malformed phone fixture strings were replaced with valid contact numbers while remaining unverified contact snapshots.

Builds reported bundle chunks over 500 kB. Existing pg concurrent-query deprecation warnings and an IPC listener-count warning occurred in test infrastructure. Default sandbox execution initially blocked local PostgreSQL/network dependency installation and a Vendure dashboard dependency realpath; permitted local reruns succeeded. No real payment, SMS, marketing or external sandbox-provider check ran.

Not exhaustively verified: every native Vendure dashboard control, every custom form at every boundary on every viewport, real carrier delivery, all international countries, SMTPUTF8, and a trusted manual disputed-phone recovery operation.

## 14. Manual Testing Guide

Use the disposable harness. Do not start the normal backend against protected data to test migrations.

Prerequisites: installed repository dependencies, Node 24 or newer, Chromium installed for the existing browser runner, local PostgreSQL configured as required by `test/test-database.ts`, and available loopback ports. The test guard requires a local host and creates its own database. Use the existing local test connection configuration; no production credentials are needed.

```powershell
Set-Location E:\coding\farmers-market-platform-web
$env:FRONTEND_NO_EVIDENCE='true'
$env:DB_HOST='127.0.0.1'
$env:PHONE_TEST_STOREFRONT_PORT='4407'
$env:PHONE_TEST_ADMIN_PORT='4567'
npx tsx scripts/test-account-signup-onboarding.ts --serve
```

The command first runs the browser acceptance and then prints the disposable environment URLs. It keeps the guarded backend, storefront and Admin open. In the same terminal, `sms +12105550160` retrieves the most recent fake message for that number. An empty line stops the environment and drops its successful owned database.

Use these actual URL bases:

- Central signup: `http://auth.platform.localhost:4407/account/signup`.
- Central login/account: `http://auth.platform.localhost:4407/account/login` and `/account`.
- Enrollment/replacement: `http://auth.platform.localhost:4407/account/phone`.
- Existing native administrator enrollment: `http://auth.platform.localhost:4407/account/admin-phone`.
- Market storefront: `http://127.0.0.1:4407/` and `/apply`; choose the published application listed there, since its slug is generated per disposable run.
- Admin workspace: `http://localhost:4567/`.

Personal registration:

1. Open central signup in a fresh browser profile. Enter a unique `@test.invalid` email, names and US national number `2105550160`.
2. Confirm the country selector is on the left and defaults to United States +1. Confirm formatting becomes `(210) 555-0160`.
3. Choose **Send SMS verification code**. In the terminal enter `sms +12105550160`.
4. Enter that code and a password of at least 12 characters, then **Verify phone and activate account**.
5. Sign in with the email/password. Confirm **Your account**, the verified personal number, unverified email status, and the Vendor/Market onboarding entries. No administrator action occurs.

Wrong/duplicate codes:

1. For a fresh number, enter a wrong six-digit code. Confirm accessible failure feedback and retry with the real code. Five wrong attempts lock that challenge.
2. Reuse a successfully consumed code and confirm rejection.
3. Try a second email with the same verified personal number. The request does not reveal the account owner. Lookup the fake code and confirm it cannot create a second User.
4. Resend requests less than one minute apart do not create another eligible delivery. Wait or use another unused number for a separate case.

Legacy/multi-role enrollment:

1. The automated browser test explicitly removes only a synthetic actor's fixture phone and exercises mandatory enrollment before showing its two Vendor and two Market choices.
2. In interactive mode, an additional synthetic reset can be requested through the existing parent IPC only if editing the harness for another test; there is no production reset endpoint. Prefer rerunning the automated test rather than altering data manually.
3. The verified multi-role fixture email is `identity-owner-0@test.invalid`, password `local-identity-regression-only-password`. Its legacy enrollment is already completed by the browser suite when interactive mode starts.
4. Native Admin fixture login is `identity-regression-superadmin` with the same password. A legitimate unverified native administrator would use **Administrator identifier**, **Current password**, personal phone and SMS on `/account/admin-phone`. The backend acceptance test exercises this path with its fixture phone removed.

Phone replacement:

1. From your new personal account choose the personal-phone change link or open `/account/phone`.
2. Enter an unused number and the current password; send a code.
3. Submit a wrong code. Return to the account and confirm the old personal number is still authoritative.
4. Return to the pending verification form, enter the correct code and choose **Verify personal phone**. Confirm only the replacement is current and prior application answers remain unchanged.

International input:

1. Choose Great Britain +44. Enter `02079460018` or paste `+442079460018` and confirm UK formatting instead of a US mask.
2. The browser suite already uses that UK number for a synthetic replacement. For an independent manual signup use another unused valid UK example such as `+442079460019`.
3. The disposable transport supports US, CA, GB and AU. Real runtime SMS defaults to US and CA and requires configured provider support for any added country.

Email and text limits:

1. Enter a malformed email on signup, checkout, onboarding or an EMAIL application question. Confirm native client validation and direct API rejection from the input suite.
2. On your account use **Send optional email verification** only if testing that separate feature. The browser suite uses its fake mailbox IPC to complete it; manual email lookup is not exposed by the terminal SMS command.
3. At the application builder in the Market workspace, create a draft custom short/long question, set **Maximum answer length**, save and publish. Enter the exact maximum and one extra character on its public form. The public published definition is the backend authority.
4. Open Vendor and Market onboarding from a verified account. Check name 200, contact name 100, location 500, valid email and country-aware optional contact phone. Saving progress remains separate from **Submit for review**.
5. In the reviewer workspace, inspect pending onboarding and use the existing **Save review decision** action to approve the intended business identity. Confirm it adds only the intended dashboard mode.
6. Revisit the Market public application and role selector. Confirm the protected **Do you have an account** question, scoped autofill, separate date decisions and existing workflow behavior.

For checkout order-history testing, run `npx tsx scripts/test-checkout-account.ts` with the same test-port override after stopping interactive mode. That separate harness creates its own storefront fixtures and guarded database and tests the actual guest purchase/claim/SMS/history flow automatically.

## 15. Exact Files Changed

Paths below are relative to the indicated repository root. "Extended existing local file" includes files that were already modified or untracked when work began. Their prior contents were preserved and patched locally. This inventory describes this task's scope, not every line of the current Git diff.

Frontend additions and extensions:

| File                                                          | Task classification                   |
| ------------------------------------------------------------- | ------------------------------------- |
| `packages/ui/package.json`                                    | Extended existing local file          |
| `package-lock.json`                                           | Extended existing local file          |
| `packages/ui/src/PhoneInput.tsx`                              | New in this task                      |
| `packages/ui/src/phone-countries.ts`                          | New in this task                      |
| `packages/ui/src/input-validation.ts`                         | New in this task                      |
| `packages/ui/src/index.tsx`                                   | Extended existing local file          |
| `packages/ui/src/styles.css`                                  | Extended existing local file          |
| `packages/ui/src/ApplicationFields.tsx`                       | Extended existing local file          |
| `packages/ui/src/MarketMap.tsx`                               | Extended existing local file          |
| `packages/api/src/market-operations.ts`                       | Extended existing local file          |
| `apps/admin/src/AdminApp.tsx`                                 | Extended existing local file          |
| `apps/admin/src/management/AccountOnboardingReview.tsx`       | Extended existing local file          |
| `apps/admin/src/management/catalog.tsx`                       | Extended existing local file          |
| `apps/admin/src/management/platform.tsx`                      | Extended existing local file          |
| `apps/admin/src/market/common.tsx`                            | Extended existing local file          |
| `apps/admin/src/market/occurrences.tsx`                       | Extended existing local file          |
| `apps/admin/src/market/phase14/ApplicationBuilder.tsx`        | Extended existing local file          |
| `apps/admin/src/market/phase14/ApplicationReview.tsx`         | Extended existing local file          |
| `apps/admin/src/market/phase14/Assignments.tsx`               | Extended existing local file          |
| `apps/admin/src/market/phase14/Billing.tsx`                   | Extended existing local file          |
| `apps/admin/src/market/phase14/Directory.tsx`                 | Extended existing local file          |
| `apps/admin/src/market/phase14/LayoutInspector.tsx`           | Extended existing local file          |
| `apps/admin/src/market/phase14/Layouts.tsx`                   | Extended existing local file          |
| `apps/admin/src/market/phase14/OperationsRoutes.tsx`          | Extended existing local file          |
| `apps/admin/src/market/phase14/common.tsx`                    | Extended existing local file          |
| `apps/admin/src/market/schedule.tsx`                          | Extended existing local file          |
| `apps/admin/src/market/settings.tsx`                          | Extended existing local file          |
| `apps/admin/src/market/vendors.tsx`                           | Extended existing local file          |
| `apps/admin/src/vendor/common.tsx`                            | Extended existing local file          |
| `apps/admin/src/vendor/markets.tsx`                           | Extended existing local file          |
| `apps/storefront/src/components/Checkout.tsx`                 | Extended existing local file          |
| `apps/storefront/src/components/CommunicationPreferences.tsx` | Extended existing local file          |
| `apps/storefront/src/components/MarketApplication.tsx`        | Extended existing local file          |
| `apps/storefront/src/components/MarketCart.tsx`               | Extended existing local file          |
| `apps/storefront/src/components/MarketPurchase.tsx`           | Extended existing local file          |
| `apps/storefront/src/components/ProductPurchase.tsx`          | Extended existing local file          |
| `apps/storefront/src/components/VendorCart.tsx`               | Extended existing local file          |
| `apps/storefront/src/components/CentralAccount.astro`         | Extended existing local file          |
| `apps/storefront/src/lib/account.ts`                          | Extended existing local file          |
| `apps/storefront/src/lib/account-form.ts`                     | New in this task                      |
| `apps/storefront/src/layouts/SiteLayout.astro`                | Extended existing local file          |
| `apps/storefront/src/pages/api/account.ts`                    | Extended existing local file          |
| `apps/storefront/src/pages/account/index.astro`               | Extended existing local file          |
| `apps/storefront/src/pages/account/signup.astro`              | Extended existing local file          |
| `apps/storefront/src/pages/account/verify.astro`              | Extended existing local file          |
| `apps/storefront/src/pages/account/phone.astro`               | New in this task                      |
| `apps/storefront/src/pages/account/admin-phone.astro`         | New in this task                      |
| `apps/storefront/src/pages/account/email-verify.astro`        | New in this task                      |
| `apps/storefront/src/pages/account/login.astro`               | Extended existing local file          |
| `apps/storefront/src/pages/account/sign-in.astro`             | Extended existing local file          |
| `apps/storefront/src/pages/account/onboarding/[role].astro`   | Extended existing local file          |
| `scripts/production-hardening-environment.ts`                 | Extended existing local file          |
| `scripts/test-account-signup-onboarding.ts`                   | Extended existing local file          |
| `scripts/test-checkout-account.ts`                            | Extended existing local file          |
| `tests/e2e/checkout-account-live.spec.ts`                     | Extended existing local file          |
| `tests/phone-input.test.tsx`                                  | New in this task                      |
| `packages/ui/src/form-controls.tsx`                           | New in this task                      |
| `docs/phone-verified-accounts-platform-input-validation.md`   | Only new Markdown report in this task |

Backend additions and extensions:

| File                                                                      | Task classification          |
| ------------------------------------------------------------------------- | ---------------------------- |
| `package.json`                                                            | Extended existing local file |
| `package-lock.json`                                                       | Extended existing local file |
| `src/plugins/platform-identity/phone-identity.ts`                         | New in this task             |
| `src/plugins/platform-identity/input-validation.ts`                       | New in this task             |
| `src/plugins/platform-identity/platform-identity.plugin.ts`               | Extended existing local file |
| `src/plugins/platform-identity/account-session-policy.ts`                 | Extended existing local file |
| `src/plugins/platform-identity/account-foundation.ts`                     | Extended existing local file |
| `src/plugins/marketplace-commerce/customer-account/phone.service.ts`      | New in this task             |
| `src/plugins/marketplace-commerce/customer-account/sms.ts`                | New in this task             |
| `src/plugins/marketplace-commerce/customer-account/options.ts`            | Extended existing local file |
| `src/plugins/marketplace-commerce/customer-account/service.ts`            | Extended existing local file |
| `src/plugins/marketplace-commerce/customer-account/controller.ts`         | Extended existing local file |
| `src/plugins/marketplace-commerce/customer-account/onboarding.service.ts` | Extended existing local file |
| `src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts`         | Extended existing local file |
| `src/plugins/marketplace-commerce/vendor-catalog.service.ts`              | Extended existing local file |
| `src/plugins/market-operations/model.ts`                                  | Extended existing local file |
| `src/plugins/market-operations/service.ts`                                | Extended existing local file |
| `src/plugins/communications/eligibility.service.ts`                       | Extended existing local file |
| `src/vendure-config.ts`                                                   | Extended existing local file |
| `src/migrations/1791750000000-VerifiedPersonalPhone.ts`                   | New in this task             |
| `test/platform-identity/config.ts`                                        | Extended existing local file |
| `test/platform-identity/fixture.ts`                                       | Extended existing local file |
| `test/platform-identity/verified-phone-fixture.ts`                        | New in this task             |
| `test/farmers-market/fixture.ts`                                          | Extended existing local file |
| `test/market-operations/harness.ts`                                       | Extended existing local file |
| `test/market-operations/account-experience-server.ts`                     | Extended existing local file |
| `test/market-operations/account-role-migration.ts`                        | Extended existing local file |
| `test/market-operations/account-signup-onboarding.ts`                     | Extended existing local file |
| `test/market-operations/application-identity.ts`                          | Extended existing local file |
| `test/market-operations/phone-verification.ts`                            | New in this task             |
| `test/market-operations/phone-sms-transport.ts`                           | New in this task             |
| `test/market-operations/phone-migration.ts`                               | New in this task             |
| `test/market-operations/platform-input-validation.ts`                     | New in this task             |
| `test/market-operations/run.ts`                                           | Extended existing local file |
| `test/marketplace-commerce/fixture.ts`                                    | Extended existing local file |
| `test/marketplace-commerce/acceptance.ts`                                 | Extended existing local file |
| `test/customer-relationships/acceptance.ts`                               | Extended existing local file |
| `test/frontend-integration/checkout-account-run.ts`                       | Extended existing local file |

Preexisting dirty work outside this inventory was not claimed as this task's implementation. Examples include the prior layout library/designer, dashboard restructuring, application identity provenance, verified Vendor relationship work, existing account-mode files, generated API/schema artifacts, earlier migrations, prior reports and their evidence. Existing `1791500000000` through `1791740000000` migrations were not edited; only the new `1791750000000` migration was added.

The preexisting generated GraphQL/schema files remain distinct from the handwritten question-domain interface changed here. Build output and disposable test runtime evidence are generated/ignored artifacts. An initial frontend test run touched tracked `docs/evidence/phase13c5/unit-results.json`; its original clean tracked bytes were restored and subsequent runs used FRONTEND_NO_EVIDENCE=true.

No reset, clean, stash, commit, push, remote branch, PR, deployment, hosting project, DNS or production credential changes were performed.

## 16. Remaining Work

Production setup remains: configure transactional SMS credentials/sender permissions, an independent OTP secret, countries, spending limits and deliberate real-delivery verification. No production migration was applied.

Disputed/recycled-number and lost-credential recovery needs a trusted, audited operational remediation design. The current implementation refuses silent transfer and retains the prior verified ownership. There is no self-service proof that can take over an existing account by supplying its email or a recycled number.

Add a scheduled retention policy for old challenge/rate rows, review deployed origin/client attribution and bot protections, and monitor SMS spend/delivery. Lazy metadata expiry and durable budgets already operate locally.

Further presentation work can map each backend error to an individual Astro field and improve the no-JavaScript retry page. The main account forms now preserve values after rejection with JavaScript enabled. UTF-16 limits now match browser and backend conventions; a future grapheme counter can explain supplementary-character counting. Deliberately decide SMTPUTF8 support. The source audit and tests cover all major custom platform modules, but do not certify every possible field/viewport combination or replace bundled third-party dashboard controls.

Resolve the unrelated Prettier warning in the existing application-identity audit report separately. Bundle size and existing test-infrastructure warnings remain observable limitations.

Recommended next stage: review the local code and this report, complete the targeted UX/operational items above, and then perform a separately authorized rollout rehearsal and real SMS verification. No deployment is included in this task.
