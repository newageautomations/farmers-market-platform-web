# Account switching and authentication architecture

## A. Executive summary

Investigated the current source, Phase 13F report, subsequent unified-account and phone-verification implementations, component registry, development commands and installed Astro behavior. Changes are local to this frontend repository. No backend source, secrets, persistent development records, commerce logic, dependencies, production routing or database migrations were changed.

The customer header was deliberately disabled and had no account affiliations. It now uses the same extracted select presentation as Admin, with affiliations obtained server-side from the existing authenticated account contracts. The mobile rule hiding the customer control was removed. Selecting an authorized workspace initiates the existing Admin handoff, including when another Admin session is already present, so the selected central identity is used. Membership and current Channel permissions remain backend decisions.

The two development applications remain on their existing configured ports. Astro now has strict port handling, matching Admin. Password registration/login/recovery were already implemented after Phase 13F. This task connects normal customer account entry to password login, consistently exposes the existing email-link alternative, and preserves discovery of both central session kinds. It does not add another password store or authentication backend.

## B. Existing Phase 13F architecture

Historical reference: [Phase 13F implementation](frontend-phase13f-checkout-customer-account-implementation.md). Current source supersedes historical claims about features subsequently added.

Preserved Phase 13F behavior:

- One native Vendure Customer/User identity, including unclaimed checkout identities and their original orders.
- Purchase before registration, optional account claiming afterward, and no account requirement during guest checkout.
- Existing email capability issuance/claim, durable rate limits, digest storage, database-clock expiry, locked single-use consumption and identity/email binding.
- A central account origin with host-only HttpOnly cookies, configured server-only bridge, approved storefront target validation and correlation-bound one-time handoffs.
- Merchant-specific native Shop sessions, owned cross-storefront purchase history, central logout and sign out everywhere.
- Rejection of administrative/non-customer identities by the original customer-only magic-link capability flow.

Subsequent implementations already present before this task include `UnifiedAccountCapability`, native-password login and recovery, mandatory personal-phone verification, verified-email recovery gating, account onboarding, and separately tagged Shop and Admin sessions. See [unified identity](unified-platform-identity-implementation.md), [signup and onboarding](unified-account-signup-onboarding-implementation.md), and [phone-verified accounts](phone-verified-accounts-platform-input-validation.md). These are preserved existing functionality, not newly built here.

Verified backend sources are `src/plugins/marketplace-commerce/customer-account/{service,phone.service,controller,dashboard.service}.ts` and `src/plugins/platform-identity/{account-foundation,account-session-policy}.ts` in the sibling backend. Installed Vendure is 3.7.3.

## C. Root cause and account switching fix

`CustomerLayout.astro` rendered a native select with `disabled`, only a Customer option, and a comment explicitly stating that the layout had no authorized affiliations. No event handler or hydration was attached to this select. The shared mobile stylesheet also hid `.customer-account-mode`. These are direct source findings. The port difference did not cause the unresponsive control.

`AccountModeSelect` extracts the existing Admin label/select presentation and reuses the shared `Select`. Admin retains its existing account-context read, business selector, route updates, workspace clearing and reauthorization. The customer layout renders just this small React island inside the existing Astro shell and DashboardMenu. It supplies Customer plus the exact Vendor/Market affiliations returned by `centralProfile` or merchant `platformAccountContexts`. Multiple businesses have individually named choices. An unavailable read exposes an unavailable message and no invented roles. Without JavaScript, authorized business links are rendered in `noscript`.

Customer workspace URLs contain an ordinary Channel identifier and `account=1`, never credentials. Admin consumes this explicit navigation marker, removes it, then calls its existing `platformAccountLogin`. Its existing correlation cookie and exact destination restoration remain unchanged. An existing central session completes the handoff without another password. An expired central session requires normal login. This also prevents silently keeping an unrelated preexisting Admin identity during a customer-to-workspace transition.

The affiliation service verifies an active membership, active subject and exact current Channel grant. Admin subsequently verifies the native session and resolves the selected workspace again. Merely editing a Channel URL does not grant permission. Platform privileges are never inferred from customer state. The central affiliation contract currently projects Vendor/Market memberships; it does not project a Platform choice to the customer header. Existing authorized Platform Admin routing remains available in Admin.

This is a bounded extraction of existing presentation, necessary because importing Admin `AccountModes` into Astro would also import an administrative controller and services. Account-switcher design selection remains pending in `UI_COMPONENTS.md`; no competing design or category approval was introduced.

## D. Development server architecture

There are two applications, not two Astro instances:

| Experience                                    | Application                                                     | Normal local origin                        |
| --------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| Market/Vendor storefronts, carts and checkout | Astro SSR with React islands                                    | `http://<registered-storefront-host>:4321` |
| Central customer account/authentication       | Same Astro application; central host bypasses tenant resolution | `http://auth.platform.localhost:4321`      |
| Vendor, Market Manager, Platform Admin        | Vite React SPA                                                  | `http://localhost:4322`                    |

The port values are explicit in the workspace development scripts and Astro server configuration. Astro previously permitted port fallback; Admin already used `--strictPort`. No evidence establishes fallback as the cause of the user's observed split. `vite.server.strictPort: true` now makes occupied Astro ports fail. Astro 7 also refuses duplicate supervised development sessions for the same project. Do not use `--force` to replace an unrelated running session.

Consolidation onto 4322 was not performed. Assigning both processes that port cannot serve both applications. A gateway would need deliberate host/path routing, separate overlapping Vite development module/HMR endpoints, exact approved origins, cookie behavior and matching backend account/storefront configuration. No such gateway exists here. Changing only frontend origins would invalidate the existing security checks; changing persistent configuration was outside this task. The tested, maintainable result retains explicit origins and secure cross-port handoffs. A dedicated local gateway remains a possible separately scoped tooling change; production boundaries need not change for that.

From `E:/coding/farmers-market-platform-web`:

```powershell
npm run dev
```

Or use two terminals with `npm run dev:storefront` and `npm run dev:admin`. Stop your existing instances first. The frontend requires its existing ignored root `.env` and a separately running matching backend. Necessary account settings are `PLATFORM_ACCOUNT_ORIGIN`, `ADMIN_ORIGIN`, and a matching server-only `PLATFORM_ACCOUNT_BRIDGE_KEY` of at least 32 characters. `SHOP_API_URL` and `PUBLIC_ADMIN_API_URL` must target that backend. Backend `localStorefrontPort`/`PLATFORM_STOREFRONT_LOCAL_PORT` must agree with 4321. Only the public Admin origin was added to `.env.example`; no secrets were edited or printed.

## E. Customer authentication methods

### Password login

Normal unauthenticated customer dashboard routes and `ShopSignIn` use `/account/login`. A merchant visit creates its existing correlation cookie and redirects to the configured central login. Email, password, Sign in, Forgot your password and signup are primary. Sign in with Email Link is secondary and always reachable, including direct central login.

Existing `unifiedLogin` calls Vendure password verification, validates the existing identity, adds only the Customer role where appropriate and issues a unified central capability. It does not create a second credential database. Merchant handoff then creates a Shop-purpose session. This task adds recognition of the original `platform-account` cookie to the password entry's storefront handoff, through the original `authorize` action. It does not convert that cookie into Admin authority.

### Registration, verification and existing identities

Current `/account/signup` already collects email/password, names and a personal phone. Passwords use the existing shared and backend policy: 12 to 72 characters, uppercase, number and special character, with the established printable-character restrictions. Vendure's configured password validator/hash services remain authoritative. SMS proof activates the same native identity; plaintext passwords are not stored. An existing email/identity is not overwritten by anonymous signup, and unclaimed/ambiguous identities are not automatically merged.

The current product additionally requires phone verification. Email verification is a separate signed-in `/account/email-verify` flow. Recovery and email-link login for phone-enrolled identities require proof of the current email. Email verification is not currently mandatory for the initial password login after phone signup. Mandatory email activation remains unimplemented. Enforcing it requires a backend policy change outside the current frontend source-edit scope, rather than a bypassable frontend-only gate. The user's later approval covered sibling integration tests, not backend source edits.

### Password setup for existing magic-link customers

An unclaimed/passwordless customer requests the existing email link from their storefront. Claim proves mailbox ownership and returns an `ENROLL_PHONE` capability when phone enrollment is missing. `/account/phone` then verifies SMS and, when `needsPassword` is true, collects a new password. Existing `verifyPersonalPhone`/native credential services attach the hash to that same User. The original Customer, purchases, follows and memberships remain in place. Matching an entered email alone is never the ownership proof.

A fully enrolled account uses existing password recovery after verified-email ownership. A password change from account settings requires the existing password. Legacy ambiguous records, guest Customers without a linked User, or conflicting identities remain subject to trusted remediation; do not register another identity to work around those protections.

### Recovery and session policy

`/account/recover` submits the existing enumeration-resistant recovery request. Existing backend limits are 3 requests per email and 20 per client boundary per 15 minutes, with 20 reset attempts per boundary. Login limits are 10 per email and 30 per boundary. The frontend also retains its bounded request limit. Provider availability is configuration-level information, not account existence.

Recovery requires the existing verified identity, same-User Customer and current verified email. It uses Vendure's native reset token plus the existing digest-only, expiring, single-use `RESET_PASSWORD` wrapper, normally 900 seconds. Password reset/change deletes native sessions and revokes both capability families for that User; login is required again. Global credential invalidation can invalidate that same User's existing Admin sessions but does not grant new ones. Customer sign out everywhere instead preserves independently issued native Admin sessions under the existing purpose policy.

The reset and email-proof pages now remove capabilities from the visible browser URL while retaining them in their existing POST forms. GET requests never consume the capability. No password or session bearer token is placed in query strings or localStorage.

### Email-link alternative

`/account/sign-in` remains the existing email-link flow. When entered from a merchant, it retains that approved origin and correlation. When entered directly at central login, it asks for the participating storefront's address; the existing backend `target` check validates the exact registered origin before issuance. It does not choose a tenant from email or accept arbitrary return domains. An Admin-origin password login does not pass its Admin target to the customer-only email-link flow.

Already phone-enrolled magic-link customers keep the original central cookie and merchant SSO. Passwordless claim with phone enrollment can also establish the existing unified session. Both resolve to the same native Customer/User and owned purchase history. No customer email-link flow creates an Administrator identity.

## F. Centralized SSO

```text
Explicit account access on participating storefront
  -> merchant creates HttpOnly correlation cookie
  -> central /account/login (password primary, email link alternative)
  -> existing central session, or verified login/claim
  -> backend validates exact approved target and current identity
  -> rotate central capability; issue short-lived single-use handoff
  -> merchant /auth/callback?code=<one-time capability>
  -> server exchanges code with correlation and exact origin
  -> native Shop cookies set only on that merchant
  -> clean /account URL

Explicit authorized customer workspace selection
  -> Admin consumes account=1 and creates its existing correlation
  -> central /account/login
  -> existing unifiedAuthorize checks Administrator and phone identity
  -> Admin /auth/account?code=<Admin-purpose one-time capability>
  -> existing exchangeAdmin checks purpose, correlation, origin and identity
  -> native Admin session; fresh Channel/workspace authorization
```

Magic-link CENTRAL/HANDOFF and unified CENTRAL/HANDOFF/ADMIN_HANDOFF remain distinct capability purposes. Default handoff lifetime is 60 seconds; database locks and consumed state reject replay. Central cookies are host-only, HttpOnly, SameSite=Lax and Secure on HTTPS. Existing expiry/revocation checks remain authoritative. Only one-time handoff codes travel in callback URLs, which are cleaned after exchange. Sensitive native/central session tokens do not.

This top-level first-party flow supports unrelated custom domains without third-party cookies. Ordinary anonymous storefront browsing makes no SSO round trip. Exact production HTTPS custom-domain behavior still requires the environment's registered origins and provider qualification; localhost tests do not establish production readiness.

## G. Administrative authentication boundaries

The same native User can have Customer and administrative relationships, but authentication method and session purpose differ. Original email-link access is restricted to customer-only identities. Password proof can reuse an existing administrative identity; it cannot invent memberships or role grants. Admin-purpose handoff requires an existing nondeleted Administrator. Admin services subsequently verify active business membership and current Channel permissions.

`platformShop` tags customer sessions durably. `AccountSessionAccessStrategy` rejects them at Admin APIs and restricts Shop permissions to the supported public/authenticated/owner boundary. Native Shop credential paths that could bypass central policy are disabled. Selecting a role in a dropdown is navigation only. Customer UI imports no Admin controller or privileged services. Account switching does not change commerce authorization.

## H. Storefront integration

Default storefronts use the existing `/account/login`, `/account/sign-in`, `/auth/callback`, `/api/account` and request-local Shop cookie transport. Central security pages are selected by exact configured origin in middleware and skip Vendor/Market resolution entirely. They do not borrow a tenant's Channel.

A future custom frontend should integrate these same approved-origin, correlation and server-side exchange contracts. Keep the bridge key server-side, use host-only cookies and preserve the fixed callback, identity verification, session purpose, ownership checks and cart handling. A custom visual presentation does not require a new authentication backend. This task did not implement or publish a custom frontend SDK, identity provider or OAuth/OIDC service.

## I. Files modified by this task

Paths below are relative to this frontend repository. Preexisting dirty/untracked work was retained.

| File                                                     | Reason                                                                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env.example`                                           | Document the existing local public Admin origin.                                                                                                        |
| `README.md`                                              | Explain the two apps, strict ports and link this report.                                                                                                |
| `COMPONENT_USAGE_GUIDE.md`                               | Replace stale disabled-header guidance with the shared selector contract.                                                                               |
| `packages/ui/src/account-mode.tsx`                       | Extract existing select presentation, without account data reads or authority.                                                                          |
| `packages/ui/src/index.tsx`                              | Export that shared selector and its supplied-choice type.                                                                                               |
| `packages/ui/src/styles.css`                             | Remove the customer-only mobile hiding rule.                                                                                                            |
| `apps/admin/src/AccountModes.tsx`                        | Reuse the shared selector with the existing Admin controller.                                                                                           |
| `apps/admin/src/AdminApp.tsx`                            | Consume explicit customer selection through the existing correlated account handoff.                                                                    |
| `apps/storefront/config.ts`                              | Make Astro's configured port strict.                                                                                                                    |
| `apps/storefront/src/layouts/CustomerLayout.astro`       | Load verified affiliations, render the shared island and native fallback links.                                                                         |
| `apps/storefront/src/lib/customer-dashboard.ts`          | Reuse central/merchant account-context reads and password-first entry.                                                                                  |
| `apps/storefront/src/components/ShopSignIn.tsx`          | Link normal account access to password login.                                                                                                           |
| `apps/storefront/src/pages/account/settings.astro`       | Use password-first unauthenticated account entry.                                                                                                       |
| `apps/storefront/src/pages/account/communications.astro` | Use password-first unauthenticated account entry.                                                                                                       |
| `apps/storefront/src/pages/account/login.astro`          | Expose secondary email links and preserve legacy central-cookie discovery.                                                                              |
| `apps/storefront/src/pages/account/sign-in.astro`        | Support direct central email-link entry with an explicitly validated storefront target.                                                                 |
| `apps/storefront/src/pages/account/reset.astro`          | Remove recovery capability from the visible URL after rendering.                                                                                        |
| `apps/storefront/src/pages/account/email-verify.astro`   | Remove email-proof capability from the visible URL after rendering.                                                                                     |
| `tests/account-switching.test.tsx`                       | Test the shared selector, verified context transport and account POST boundaries.                                                                       |
| `tests/phase-a-remediation.test.tsx`                     | Test automatic correlated handoff after explicit customer selection.                                                                                    |
| `tests/phase-cd-presentation.test.tsx`                   | Replace the obsolete assertion requiring a disabled customer selector.                                                                                  |
| `tests/e2e/checkout-account-live.spec.ts`                | Align the existing regression with current payment selection, password policy and dashboard history markup; explicitly choose email login after logout. |
| `scripts/test-account-switching.ts`                      | Exercise actual cross-port switching and session restoration in Chromium using the guarded existing backend fixture.                                    |
| `docs/ACCOUNT_SWITCHING_AUTH_ARCHITECTURE.md`            | This investigation, implementation and testing report.                                                                                                  |

The new browser runner applies the already existing `CustomerDashboardFollows1791770000000` migration to its own disposable fixture because the older account-experience harness predates that dashboard. It changes no backend files and performs no persistent development migration.

## J. Automated tests and actual results

All commands use `FRONTEND_NO_EVIDENCE=true`. No screenshots, videos, traces, retained result JSON or new evidence directories were created.

- Focused Vitest: 58 tests in six files passed, including selector/context boundaries, automatic account handoff, dashboard menu behavior, password policy and local account configuration.
- Existing backend `account-signup-onboarding.ts`: 23 groups passed. Includes native password hashing/verification, signup identity reuse, expiry/replay, recovery and session invalidation, revoked membership, forged bridge requests, native Shop bypass rejection and Shop/Admin separation. Its successful disposable database was dropped.
- `npm run typecheck`: passed, 82 Astro files with zero errors/warnings/hints.
- `npm run build`: storefront and Admin passed. Existing large-chunk warnings remain.
- Focused ESLint, formatting of changed supported files, production artifact markers (107 files), and nine-workspace source/dependency boundaries: passed. Prettier does not support `.env.example`; its one public-origin addition was reviewed directly.
- Occupied-port probes: Astro 4321 and Admin 4322 both failed without fallback. Duplicate supervised Astro CLI startup also failed without stopping the existing server.
- Broad Vitest: 402 passed, 4 failed, in 32 files. Unresolved failures: two `market-c5.test.tsx` directory tests find multiple Vendor business labels; `market.test.tsx` expects the old Partially Completed text; its revoked-workspace test expects Workspace unavailable but receives the existing personal-account unavailable fallback. No change to those business controllers was made to satisfy these assertions. These failures remain reported, not counted as passing.
- Cross-port Chromium: all 6 groups passed with fixtures disabled. Actual central/storefront port 4337 and Admin 4555, desktop 1440px and mobile 390px, open/Escape/refresh, Customer to Vendor, Vendor to Customer, Customer to Manager, Manager to Vendor/Customer, native session restoration and Axe accessibility. The successful owned database was dropped.
- Existing production-built checkout/SSO browser regression passed, including its final extension: guest Vendor purchase, multi-Vendor Market purchase, purchase-specific email idempotence, original identity claim, phone proof/password setup, cross-storefront history, magic-link SSO, sign out everywhere, existing-account magic login and an authenticated third purchase. After signing out everywhere again, password login on Market A restored Vendor A and Market B without credentials; both displayed the same three owned purchases. The backend security setup also passed claim/handoff tampering, expiry, replay/concurrency, identity binding and admin-role rejection. Both successful owned databases were dropped.

Earlier live attempts exposed test setup/selector gaps: Node readiness could not resolve the synthetic central hostname; the old account fixture lacked the existing dashboard-follow migration; native summary controls and reopened mobile menus required current locators; the old checkout test targeted a replaced payment button. Those runs failed, and their guarded disposable databases were retained under the existing test policy. They are not persistent development data. Successful reruns and any remaining failure are recorded here after execution.

Initial sandbox loopback denial and automatic-review refusal were resolved by the user's explicit approval for sibling-backend/disposable-database integration tests. No backend source-edit authorization was inferred from that testing approval.

## K. Manual testing instructions

Use the normal two local apps and a matching backend with current migrations, registered storefronts, the configured account origin/key, and authorized test accounts. Do not create business permissions just to test a transition. Use the same browser profile, and distinguish `localhost` from `127.0.0.1` and merchant subdomains.

1. Open `http://auth.platform.localhost:4321/account/login`. Confirm email/password and Sign in are primary, with Forgot your password, signup, and Sign in with Email Link available. A valid password returns to `/account`. An invalid password produces the generic account failure and no authenticated dashboard.
2. With an existing multi-role account, open `/account`. Open Account mode, cancel it with Escape, then select the real Vendor by business name. Confirm `http://localhost:4322/vendor?channel=<authorized-channel>` and the correct business header. No password is needed while central login remains valid. Refresh, then choose Customer to return to the central overview.
3. Repeat Customer to Market Manager, Manager to Customer, and Manager to Vendor. For multiple businesses, confirm the selected Channel and business name. Repeat at 390px using the existing hamburger, reopening it after workspace refresh. Confirm no horizontal overflow. Refresh each dashboard and repeat.
4. With a customer-only account, confirm no Vendor/Manager/Platform role is offered. Try a saved foreign Channel URL and verify that the backend denies operational access. Revoke a test membership through the existing authorized workflow, refresh, and confirm it disappears. Do not change grants on production records.
5. Visit `/account/signup` on the central origin for a fresh test account. Provide valid email/password, names and phone, complete the existing local SMS proof, then sign in. Existing email registration must not overwrite a profile/password or claim historical orders. In Account Settings, use Send optional email verification, open the delivered proof in the same signed-in browser and submit Verify account email.
6. Open `/account/recover`, request recovery for that verified email, and use the delivered `/account/reset?token=...` link. The visible URL should lose the token while the form remains usable. Submit a valid new password, confirm login is required again, then confirm old credentials/session and link replay fail. To test expiration, use the disposable suites rather than editing persistent capabilities or clocks.
7. For a passwordless unclaimed purchase, choose its existing Email me an account link action. Follow the delivered central claim, complete required personal-phone proof and set a password when requested. Confirm the same historical purchases and profile remain. Then sign in with that password. Do not create another customer to add credentials.
8. Open a registered Market storefront's `/account/login`, sign in with a password, then another Vendor/Market storefront's `/account`. Confirm no new credential entry, the same account and owned history, and a clean callback URL. Repeat by explicitly selecting Sign in with Email Link. Direct central email-link entry requires the exact participating storefront address. An unregistered address must fail before account email issuance.
9. Sign out from a merchant, then complete central logout at the configured central `/auth/logout`. Confirm another storefront cannot silently use that central session; existing merchant sessions follow the documented logout scope. Repeat with Sign out everywhere and confirm customer sessions no longer restore. Existing native Admin sessions have a separate logout scope. Password reset/change has the broader credential-invalidation policy described above.
10. Browse and buy anonymously on both a real Vendor and a multi-Vendor Market occurrence. Use an existing eligible product, ordinary cart/pickup and the local Test Payment choice. Confirm no registration requirement, preserved cart/session, one committed purchase, later verified claim and one history entry per root purchase. Repeat authenticated checkout. No payment, inventory, pricing or settlement behavior was changed here.

Repeatable disposable commands from this frontend folder:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npx tsx scripts/test-account-switching.ts
# Run after the switching suite; use a separate known-free port if needed.
$env:PHONE_TEST_STOREFRONT_PORT='4441'
npm run test:live:checkout-account
Remove-Item Env:PHONE_TEST_STOREFRONT_PORT
```

The new switching suite uses storefront/central port 4337 and Admin 4555 by default, with synthetic local credentials held inside the harness. `PHONE_TEST_STOREFRONT_PORT` and `PHONE_TEST_ADMIN_PORT` can select free test ports for both sides. These are test origins, not a development-port migration. Backend regression reproduction requires the explicitly approved sibling test command using `test/no-evidence.cjs` and `test/market-operations/account-signup-onboarding.ts`.

## L. Remaining limitations

- No single-port gateway was introduced; development deliberately remains 4321/4322 with tested handoffs.
- Mandatory email-before-first-password-login is not implemented; existing mandatory phone enrollment and verified-email recovery/magic-link restrictions remain. This is a backend policy decision to resolve explicitly if strict email activation is required.
- The original magic-link path still rejects administrative identities. A dual-role user uses password proof and the existing Admin-purpose handoff. A customer-only capability is never exchanged for privileged authority.
- A legacy magic-only central cookie can restore participating merchant accounts but is not converted into a unified central dashboard/Admin credential. Existing phone-enrollment/password setup and subsequent password login provide the unified path.
- No new Platform affiliation projection, custom storefront frontend SDK, production identity provider, production email/SMS qualification or unrelated custom-domain deployment was added.
- Broad frontend regression failures above remain unresolved. Production provider checkout and real external-provider delivery were not tested. Local synthetic SMS/mail and local test payments were used only in guarded test environments.
- Failed disposable databases remain under the repository's existing retain-on-failure policy. No persistent users, orders or development database were deleted or recreated.

No deployment, remote Git write, commit, push, pull request, hosting integration, DNS change or secret modification occurred.
