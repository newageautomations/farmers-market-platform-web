# Unified authentication implementation

Implemented locally on October 30, 2026, in the web and backend repositories. No deployment, remote Git changes, account resets, or persistent database writes were performed. Existing unrelated working changes were preserved.

## Final architecture

| Flow                  | Implemented behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login                 | `http://auth.platform.localhost:4321/account/login` is the email/password entry for Customers, Vendors, Market Managers and authorized Platform Administrators. It verifies the existing Vendure native credential. React redirects anonymous protected routes here and has no credential form.                                                                                                                                                                                                                                                               |
| Destination selection | Customer-only accounts open `/account`. Operational or Platform accounts without a specific destination see `/account/workspaces`, using shared card presentation and UtilityIcon. Explicit Vendor, Market and Platform deep links retain safe paths and query parameters. Customer guards retain their requested account routes.                                                                                                                                                                                                                             |
| Authorization         | Current server-loaded memberships, active businesses, exact channel grants, verified phone and live Administrator status remain authoritative. Platform selection additionally requires current SuperAdmin authority. Explicit unavailable channels never select a different business. Recovery cannot grant roles or memberships.                                                                                                                                                                                                                            |
| Switching             | Account menus use central continuation and single-use Shop/Admin handoffs. Explicit switching runs before Admin restoration. The initiating principal is checked against central authentication and the resulting session. A different person's remembered session cannot satisfy the request. Failed Admin callbacks retain a fresh-login marker, so reload cannot restore an unrelated session. Customer navigation uses the same central identity check.                                                                                                   |
| Registration          | `/account/signup` retains SMS activation, one personal User/native credential and existing same-User Vendor/Market onboarding. Vendor or Market signup intent continues into that onboarding after authentication. Existing signed-in users enter onboarding directly. Signup never grants Platform access or attaches an existing business by email.                                                                                                                                                                                                         |
| Recovery              | `/account/recover` sends an expiring central reset capability with a generic receipt. `/account/reset` keeps the capability in an HttpOnly cookie after removing it from the URL. Existing verified mailbox proof permits reset. Otherwise an additional SMS challenge goes only to the User's existing verified personal phone. Its digest, User, client boundary and recovery transaction must match. Phone proof cannot enroll or replace a number. Native password credentials, password policy, rate limits, expiry and single-use checks remain shared. |
| Password changes      | Reset and authenticated password change revoke all native authenticated sessions, central capabilities, pending handoffs, recovery/proof capabilities and outstanding User-bound phone challenges. Neither creates a new authenticated session.                                                                                                                                                                                                                                                                                                               |
| Sign out              | All visible Sign out actions revoke every active Shop/Admin session and central capability for the current User. The separate Sign out everywhere button is removed. Explicit current-session backend operations remain available internally.                                                                                                                                                                                                                                                                                                                 |
| Sign out              | All visible Sign out actions revoke every active Shop/Admin session and central capability for the current User. The separate Sign out everywhere button is removed. Explicit current-session backend operations remain available internally.                                                                                                                                                                                                                                                                                                                 |

The central chooser reuses SiteLayout, shared card presentation, UtilityIcon and approved buttons. Customer, Vendor and Market Manager cards retain server-authorized business links. Vendor and Market setup buttons appear underneath the cards. Forms retain shared input/button presentation and native navigation. Settings no longer duplicate the account menu's workspace selector. No new UI primitive, styling system or dashboard shell was introduced.

## Sessions and cross-domain boundaries

| State                   | Policy                                                                                                                                                                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Central capability      | Seven days by default from password login. Handoffs do not rotate or extend its server expiration.                                                                                                                                                                                                                    |
| Shop and Admin sessions | Explicit seven-day Vendure duration plus a persisted creation-time limit, preventing sliding cache refresh from extending a session beyond seven days. Each surface session starts when issued; central expiration prevents new handoffs but does not itself revoke already-issued surface sessions.                  |
| Browser cookies         | Separate `platform-shop-session` and `platform-admin-session` names, including their Vendure signatures. Seven-day maximum cookie age, HttpOnly, SameSite=Lax, host-only scope and existing production Secure policy. Ports are not security boundaries. Central authentication uses only `platform-unified-account`. |
| Handoffs                | Existing 60-second default, random digest storage, single use, browser correlation and exact registered origin/channel binding. Admin capabilities also bind the validated destination and current principal, rechecked at exchange. Browser continuation cookies last up to 30 minutes for signup.                   |
| Recovery                | Existing 15-minute default reset capability and native reset state; five-minute SMS challenges use the existing delivery budgets, failed-attempt limits and replay controls. Phone proof remains bound to the current verified number.                                                                                |

Per-User transaction locks serialize session minting and global revocation. A concurrent exchange cannot leave a session surviving successful global sign-out.

Unrelated merchant domains still use top-level central redirects, registered storefront resolution, a one-time Shop code and a first-party session set by Astro. They receive neither central credentials nor privileged Admin sessions in JavaScript. Inactive, unregistered and mismatched origins fail closed. Admin/API browser hosts still need the supported same-site cookie topology; unrelated Admin/API sites require a separately reviewed BFF or topology change. No provisioning or hosting infrastructure was added.

## Retired paths

- React's Administrator username/password presentation and its native login/logout adapters and generated operations.
- General Customer email-link requests, legacy central authorization/logout bridge actions, legacy `platform-account` cookie issuance and redemption, and old Customer-only handoff exchange.
- `/account/sign-in` now redirects through canonical password login. `/account/admin-phone` redirects to canonical login; the separate credential enrollment handlers are removed.
- Native public login/authenticate/logout and native Customer verification/reset/password/email-change entry points are rejected when central accounts are enabled. Native password verification, hashing, session creation and trusted backend account operations remain.
- The scaffold Vendure Dashboard route and unused native verification/reset/address-change email handlers and templates.
- Storefront `POST /api/shop` ordinary password login intentionally returns 410 with the central entry location.

Old MAGIC tokens cannot become privileged authentication. Purchase invitations use the distinct `PURCHASE_CLAIM` purpose. Guest purchase claiming retains email ownership, restricted phone/password enrollment and return to the registered storefront through unified login. Vendor application continuation, ownership validation, guest checkout, phone verification and existing business onboarding remain separate supported mechanisms.

## Migration and local files

Backend migration: `src/migrations/1795200000000-UnifiedAuthentication.ts`. It changes capability CHECK constraints to distinguish purchase claims and permit transaction-bound recovery phone proof. It does not reset tables, rewrite identities or business records, seed data, or grant permissions. Downgrade refuses to discard existing new-purpose capabilities.

The migration was qualified on guarded disposable databases. A read-only connection confirmed that it is **not applied** to `vendure_demo_market_ops`. That populated environment needs the migration before the updated server can start. No persistent migration was executed.

Main web changes: AdminApp/account-login/AccountModes/AdminShell; central account pages and `/api/account`; customer return handling and settings; shared auth/API adapters, operations and generated contracts; focused authentication tests. Main backend changes: customer-account service/controller/resolvers and phone service; account contexts, session and native-entry policies; runtime account handlers; the migration and focused test harnesses. The previous account-switching document is marked historical instead of retaining conflicting active guidance.

## Verification

- Focused frontend Vitest: **55 tests passed** across unified authentication, account switching, rate feedback, local environment, Customer dashboard and platform contracts.
- Disposable backend checks: unified authentication **13**, unified accounts **15**, signup/onboarding **23**, phone verification **16**. These cover all supported identity types, multiple affiliations, unrelated Admin sessions, revoked memberships, purpose isolation, proof-bound recovery, local/global logout including concurrent exchange, seven-day expiry, native entry rejection, replay and unrelated registered storefront origins.
- Astro check: zero errors, warnings or hints. Targeted production/authentication TypeScript check: zero diagnostics. Backend market-operations and frontend-integration TypeScript projects pass. Focused ESLint passes.
- Offline schema extraction and GraphQL code generation pass. The local synthetic production build builds Astro, React, Vendure dashboard assets, server and worker without deployment or application/database bootstrap. The native dashboard assets are not registered as an application route.
- Root web `tsc --noEmit` still has 11 unrelated errors in existing application-review/market test mocks using the newer SCHEDULE read contract and an occurrence-layout `retire` prop. These were left outside authentication scope. Builds retain existing large-chunk warnings. Plain backend `npm run build` without the existing production environment fails its explicit APP_ENV guard; the synthetic production build passes.
- No browser automation, screenshots, full regression suite or live custom-domain browser tests were run. Successful disposable databases were dropped by the existing guard; failed intermediate runs were retained by that harness policy. The persistent dataset was only read for the account details below.

Focused reruns from the web directory:

```powershell
npx vitest run tests/unified-authentication.test.tsx tests/account-switching.test.tsx tests/account-rate-feedback.test.ts tests/local-account-environment.test.ts tests/customer-dashboard.test.ts tests/platform.test.ts
npm run typecheck --workspace @market/storefront
$env:FRONTEND_NO_EVIDENCE = 'true'
npm run build:production-local
```

Backend reruns, from `E:\coding\farmers-market-platform`, use `npx ts-node --project test/market-operations/tsconfig.json test/market-operations/<suite>.ts`, with suites `unified-authentication`, `unified-account`, `account-signup-onboarding`, and `phone-verification`. They create only guarded `vendure_test_*` databases.

## Manual testing

When ready to apply this schema change, inspect pending migrations and use only the guarded web-directory command `npm run demo:market-operations:migrate`. This is a manual rollout step requiring the developer's migration authorization, not an action already taken. It must report the local `vendure_demo_market_ops` target. Do not reset or reseed.

Restart the environment using these commands in separate terminals from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

These existing launchers require the ignored local account-origin/bridge configuration. Do not substitute ordinary backend development commands.

Existing documented password for both accounts below: `local-identity-regression-only-password`. Their identifiers, active memberships and verified phones were confirmed read-only; passwords were neither changed nor tested against the persistent database.

| Account                       | Existing membership                                     | Direct entry                                        |
| ----------------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| `boerne.manager@example.test` | Boerne Farmers Market, active `marketAdmin`, channel 26 | `http://localhost:4322/market?channel=26&account=1` |
| `manna-roots@example.test`    | Manna Roots, active `owner`, channel 9                  | `http://localhost:4322/vendor?channel=9&account=1`  |

1. Open either direct entry while anonymous. Expect central email/password login, then the same requested workspace. Try `/vendor/orders?channel=9&account=1` for a preserved Manna Roots deep link.
2. Open `http://auth.platform.localhost:4321/account/login` without a target. Expect the authorized workspace chooser for these business accounts. Customer goes to `/account`; the account menu returns to the authorized business without another password while central authentication remains valid.
3. Keep Manna Roots signed into Admin, then sign into Boerne centrally and select its Market workspace. Expect the Boerne identity and channel, with no reuse of Manna Roots' Admin identity. An explicitly mismatched principal requires the intended person's password. An unavailable channel offers current choices without selecting another business.
4. Open `http://boerne-farmers-market.localhost:4321/account/orders` or `http://manna-roots.localhost:4321/account/orders`. Expect central authentication and return to that first-party Customer route. Customer sessions must not authorize Admin APIs.
5. Use Sign out on each surface, then reload other open surfaces. Expect all platform sessions to be revoked and no restoration from old capabilities.
6. Open `http://auth.platform.localhost:4321/account/signup?context=vendor` or `?context=market`. New accounts require the existing SMS activation and then role onboarding. An existing signed-in account enters the same-User onboarding flow. Do not finish new business provisioning unless you intend to create that business.
7. Open `http://auth.platform.localhost:4321/account/recover`; emailed links use `/account/reset?token=...`. Without prior mailbox proof, require SMS to the existing personal phone before showing the password form. After reset, old central, Shop and Admin sessions fail and a fresh login is required. Never use the established business accounts for destructive password testing without intending to change their passwords.
8. Visit `/account/sign-in` and `/account/admin-phone`. Expect canonical login rather than the retired forms. Legacy general magic links fail; legitimate purchase invitations still require their specific claim and phone/password proof.

## Deferred behavior and limitations

Universal magic-link login, email-verification onboarding, social identity, custom-domain provisioning and an onboarding redesign remain deferred. Existing optional email proof is retained, not made mandatory. Recovery cannot proceed without either supported verified mailbox proof or the additional existing verified-phone proof.

The guarded persistent demo deliberately disables outbound delivery. New SMS signup and recovery delivery need the existing configured transports in an explicitly authorized environment; the disposable suites qualify these paths with local in-memory delivery. No fake identity proof or external transport was added to the populated demo. No dedicated accounts were seeded. Non-email legacy Administrator identifiers intentionally lose interactive login compatibility. Additional organizations remain governed by existing same-User provisioning and explicit membership workflows.
