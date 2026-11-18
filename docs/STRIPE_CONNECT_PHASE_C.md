# Stripe Connect Phase C

## Legacy Standard compatibility correction

Accounts v1 OAuth retrieval may report `type=standard` while omitting individual controller properties. The transport now uses [Stripe's documented Standard mapping](https://docs.stripe.com/connect/migrate-to-controller-properties#standard) only for missing fields: full Dashboard, account-paid Stripe fees, Stripe payment-loss responsibility and Stripe requirements collection. Explicit provider fields remain preferred. A Standard type combined with an explicitly conflicting mapped field raises `STRIPE_CONFIGURATION_CONTRADICTORY`; refresh invalidates prior compatibility and records a rejected observation rather than preserving readiness from an older successful observation. Unknown or unsupported types with missing required settings remain blocked with `CONFIGURATION_UNKNOWN` and state Unknown.

The fallback is explicitly enabled only after a validated OAuth exchange, or for refresh of an existing OAuth association with `read_write` scope. Transport account binding and platform self-identity verification, stored application/platform association, connected status, test mode, observation freshness and separate card-payment/payout gates remain in force. Hosted onboarding never enables this fallback; its Accounts v2 creation and responsibility checks remain strict. No checkout collection or Phase D fee logic changed.

`account-configuration.ts` is a small normalization helper, used by `stripe-transport.ts`. Changes are otherwise limited to observation contracts, a transient entity provenance property, account observation/audit handling, readiness policy and `test/payments-stripe/legacy-standard.ts`. Provenance is persisted in the existing lifecycle audit/outbox event as `configurationEvidenceSource` (`EXPLICIT_CONTROLLER`, `LEGACY_STANDARD_TYPE` or `UNKNOWN`) and `configurationInferredFields` (the exact normalized field names supplied by the mapping). The entity property is deliberately not a database column: normalized account values remain in their existing columns, while their evidence source belongs to the matching versioned observation event. Historical events are not backfilled or described as explicit evidence. Rejected observations record `configurationRejection=STRIPE_CONFIGURATION_CONTRADICTORY`. No schema migration is required.

Focused verification command, from the backend project: `npx ts-node --project test/payments-stripe/phase-c.tsconfig.json test/payments-stripe/legacy-standard.ts`. The tests use offline SDK responses and in-memory persistence doubles, including the existing strict v2 creation contract; they create no provider accounts and connect to no database. Scoped compile check: `npx tsc --noEmit --project test/payments-stripe/phase-c.tsconfig.json`. Broad builds, regression suites and browser automation are intentionally excluded from this correction.

Both focused commands passed. The previously diagnosed OAuth account supplied omissions, not explicit contradictions. This implementation did not make provider requests, reconnect accounts, create accounts, refresh persistent observations, or change existing organizations.

Manual verification: restart the local API through the web project's `npm run demo:market-operations:serve` if it has not reloaded the new code. In the existing OAuth-connected sandbox workspace, open Payments and click Refresh status. A supported legacy Standard observation with active card payments, enabled charges/payouts, submitted details and no other blockers should now permit both readiness checks. No reconnect or new account is required. Verify the matching `PaymentAccountObserved` audit event records `LEGACY_STANDARD_TYPE` and its inferred fields. Explicit conflicting fields must instead remain blocked and be reported for investigation. This correction does not modify existing organizations or refresh their provider observations automatically.

Implemented locally on November 9, 2026. The architecture audit and Phase B report were not edited. Backend edits in the paired backend folder were explicitly authorized in this chat.

## Implementation summary

Vendor and market organizations now share test-mode account setup and management through the existing Stripe account records, OAuth flow, settings screen, signed webhook receipts and recovery queue. New merchant accounts request Accounts v2 with full Dashboard access, Stripe fee collection and Stripe loss collection. There is no liability fallback. Existing OAuth accounts remain v1 accounts and must meet the same observed responsibility policy.

Payment collection remains disabled. Runtime configuration sets `bindCustomerProvider: false`, including when account onboarding is enabled. No checkout capture, booth invoice collection, transfer, refund execution or live account creation is enabled by this phase. Provider readiness in settings is separate from permission to collect payments.

No Stripe requests or actual Stripe account creations were performed. Automated provider scenarios used controlled transport and SDK HTTP fixtures. No persistent database migration or fixture command was executed. Manna Roots, Boerne and established test-account permissions were not modified.

## Backend files changed

Paths in this section are relative to `E:\coding\farmers-market-platform`.

- `src/plugins/payments/account.service.ts`: canonical organization authority, extended OAuth binding, historical connections, lifecycle observations and guarded disconnect.
- `src/plugins/payments/onboarding.service.ts`: new hosted creation, continuation, reconnect and full Dashboard management service, sharing the existing account records.
- `src/plugins/payments/readiness.ts`: centralized, fail-closed readiness policy used by the existing account service.
- `src/plugins/payments/contracts.ts`, `entities.ts`, `stripe-transport.ts`, `api.ts`, `payments.plugin.ts`: account observations, durable attempts, supported SDK APIs, management mutations, configuration validation and registration.
- `src/plugins/payments/webhook.service.ts`: Accounts v2 signed thin lifecycle notifications, platform association checks and stale-deauthorization handling, inside the existing receipt worker.
- `src/plugins/platform-identity/business-capabilities.ts`: payment status permission for newly provisioned market roles and protected payment management for newly provisioned market owners. Existing native role grants are not rewritten.
- `src/plugins/platform-admin/service.ts`, `api.ts`: organization-scoped safe status projection and test-onboarding availability.
- `src/vendure-config.ts`: server-only onboarding settings with customer-provider binding disabled.
- `src/migrations/1796500000000-StripeConnectAccounts.ts`: forward-only account and attempt extension.
- `scripts/market-operations-demo/environment.ts`, `run.ts`, `stripe-connect-fixtures.ts` and `src/plugins/marketplace-commerce/commerce/local-test-payment-network.ts`: narrowly opted-in Stripe test onboarding, existing recovery queue activation and dedicated safe fixture setup.
- `test/payments-stripe/phase-c.ts`, `phase-c.tsconfig.json`, `package.json`: focused security and migration qualification command.

Other pre-existing backend edits, including Phase B provider executor, reconciliation and transfer changes, are outside this Phase C file list.

## Frontend files changed

Paths here are relative to `E:\coding\farmers-market-platform-web`.

- `apps/admin/src/management/payments.tsx`: one shared vendor/market test settings composition, setup, OAuth redirect, explicit return/refresh handling, status, remediation, Dashboard and confirmed disconnect.
- `apps/admin/src/management/service.ts`: existing permission adapter recognizes hosted actions and market owners.
- `apps/admin/src/settings/SettingsWorkspace.tsx`: scoped payment-panel explanation. Existing unrelated local changes were retained.
- `packages/admin-core/src/index.ts`: market payment settings route, retaining existing navigation authority.
- `packages/api/operations/management.graphql`, `packages/api/src/management.ts`, `packages/api/src/errors.ts`: typed commands and safe allowlisted remediation text.
- `packages/api/schema/admin.graphql`, `packages/api/src/generated/admin.ts`, `packages/api/schema/provenance.json`: source-extracted schema and generated operations. The shared generation command also refreshed the already-modified Shop schema/typing outputs against existing local sources; no customer checkout UI was implemented.
- `scripts/demo-market-operations.ts`, `package.json`: web-directory fixture command.
- `tests/stripe-connect-phase-c.test.tsx`, `tests/management.test.tsx`: scoped UI/permission coverage and updated assertions for the new settings behavior.
- This report is the only new Markdown report.

The root component guide and design registry were read. This feature composes existing Card, Alert, Badge, Button, Dialog, ErrorState, ReadState and provider-facts presentation inside the existing settings shell. No new primitive, competing styling system, global settings redesign or pending component-category approval was introduced. Existing provider-facts CSS already owns `dd` margins and centered row alignment. Browser automation and visual QA were not performed, as requested.

## Entities and migration

`VendorPaymentAccount` remains the original financial connection identity. It now records canonical organization type/ID, platform account ID, OAuth application ID, connection method, generation, responsibility/Dashboard observations, pending verification count and verification/restriction timestamps. Its legacy vendor foreign key becomes nullable only for market-owned records. Vendor identity is never synthesized for a market manager.

Existing account IDs and financial foreign keys remain unchanged. The migration backfills only the known vendor organization ID/type and defaults the existing method to OAuth. It leaves unknown platform/application and responsibility observations null. Those legacy connections cannot become ready until explicitly reconnected and authoritatively re-observed. Pending legacy OAuth attempts with unknown platform identity must be restarted.

A partial unique index allows one non-deauthorized account per organization/mode. A generation index preserves replacement ordering. The existing account/mode uniqueness prevents an account from being claimed by another organization, including after disconnect. Replacements require prior disconnection; they create another row, leaving all old references intact. Reconnecting the same original account retains its row and generation, increments its version and appends audit history.

`StripeOAuthAttempt` gains original organization/platform/application binding. New `StripeHostedAttempt` rows retain original actor, workspace, organization, mode, creation idempotency key, expiry, account result and hashed continuation nonce. Creation attempts and each continuation are independent durable records. Sensitive bank, identity-document and OAuth token data are not stored.

Database guards retain append-only history and immutable identity, enforce canonical organizations and protect single-use continuation results. Existing vendor-only financial tables reject market-owned account references. Market invoice collection remains later work. The migration is transactional and forward-only; it does not reseed, replace financial history or change established membership grants.

## Creation and onboarding architecture

The installed dependency remains `stripe@23.0.0`, pinned to `2026-09-30.endive`. Its typed `v2.core.accounts.create` and `v2.core.accountLinks.create` methods support the requested lifecycle, so no dependency upgrade was needed.

Creation requests explicitly set `dashboard: full`, `defaults.responsibilities.fees_collector: stripe`, `losses_collector: stripe`, US identity country and merchant `card_payments.requested: true`. Include-dependent defaults, merchant configuration and requirements are requested. The returned mode and responsibility configuration must match. Provider eligibility errors block setup; no alternative liability configuration is attempted. This follows [Stripe's account creation API](https://docs.stripe.com/api/v2/core/accounts/create) and [immutable responsibility configuration](https://docs.stripe.com/connect/accounts-v2/connected-account-configuration).

A durable operation exists before creation. Ambiguous retries reuse its original idempotency key only within 23 hours. An expired unresolved creation requires review; a new account is not silently created. Account creation is invoked only by an explicit authorized setup/resume action, never by recovery or fixture setup.

Hosted links use the SDK's supported v2 `account_onboarding` contract. All return/refresh destinations are generated from the validated server origin and canonical organization route. Links are not persisted. Each return has a hashed nonce, original actor/workspace and ten-minute application expiry. The effective link expiry is bounded by Stripe's expiry. A user explicitly checks the return or resumes the expired link from settings; current authenticated authority is required. A successful redirect alone changes no readiness. See [the account-link API](https://docs.stripe.com/api/v2/core/account-links/create).

Account status is retrieved through the documented v1 compatibility representation of the same v2 account ID. This reuses authoritative charges/payouts, controller and verification observations without pretending omitted v2 fields were returned. [Stripe documents v1 compatibility and the OAuth limitation](https://docs.stripe.com/connect/accounts-v2).

## Existing-account OAuth compatibility

The original OAuth path is retained: read/write scope, platform secret, configured application, test mode, exact redirect, cryptographic state, expiry, single use, current native membership and original workspace are enforced. OAuth codes are not replayed following ambiguous exchange. No OAuth credentials are stored.

The account is retrieved under the configured platform's test credentials, and the platform account identity is verified. Actual controller fee payer, loss responsibility and Dashboard access are recorded. An account type label alone is insufficient. Unknown or incompatible observations remain visible with remediation and cannot pass readiness. No conversion or immutable controller mutation is attempted.

The public REST OAuth landing validates the stored attempt and redirects to the fixed organization settings route with the transient state/code. It performs no exchange and attaches no account. The user clicks Check Stripe authorization; authenticated GraphQL requires the original actor and workspace, rechecks current membership, and only then exchanges and attaches. The query parameters are removed after completion. A browser workspace switch cannot retarget ownership. OAuth token credentials and account IDs are never exposed by the landing.

## Authorization and ownership

Authority comes from `businessAuthority`, which reloads canonical workspace organization, active native administrator/membership, managed channel-scoped role, protected ownership and current grants. Reads require `ReadOwnPaymentAccount`. Management requires `ManageOwnPaymentAccount` plus the existing protected-owner policy. This phase preserves the project's owner-only provider-ownership boundary rather than broadening delegation. Non-owner administrators cannot manage Stripe even if they can read status.

Every management mutation enforces this on the backend. Hosted completion additionally checks original actor, organization, channel, platform/application, mode, nonce, expiry and current account identity. Permissions are rechecked after provider I/O. Frontend service replacement/unmount invalidates pending redirects, while backend binding remains authoritative.

Legacy vendor account rows remain usable for authorized historical reconciliation. New-charge readiness is not historical refund authority. Disconnect never deletes financial obligations or original account references.

## Readiness and webhook synchronization

The centralized policy checks canonical ownership, configured platform/application, test mode, observed fee/loss/Dashboard compatibility, freshness, required card capability, details submission, verification requirements and restrictions. Missing identity/configuration/freshness fails closed. Transfer capability is not required for direct-charge readiness. Payout readiness is evaluated separately from charge readiness.

The UI distinguishes no connection, onboarding started, additional information, verification pending, ready, restricted, disconnected, incompatible configuration and unknown/stale state. A ready provider observation does not enable payment collection. Default freshness is 300 seconds.

The existing raw-body signature verification, receipt deduplication, retry lease and scheduled recovery queue are reused. Snapshot events use the pinned API version. Supported account events include `account.updated`, `capability.updated`, authorization and deauthorization. Signed Accounts v2 thin notifications use the SDK's separate `parseEventNotification` method and these account types:

- `v2.core.account.created`, `.updated`, `.closed`
- `v2.core.account[configuration.merchant].capability_status_updated` and `.updated`
- `v2.core.account[defaults].updated`, `[identity].updated`, `[requirements].updated`, `[future_requirements].updated`

Thin notifications are unversioned hints. They require the connected-account endpoint and related object type/ID, resolve an existing local account association and retrieve current state using configured provider credentials. Payload URLs and alleged account state are never followed or applied. See [Stripe's thin-event contract](https://docs.stripe.com/api/v2/core/events/event-types).

Platform/application association and test/live mode are checked before organization updates. Current provider GET results, not event order, control observations; event audit watermarks do not move backwards. A delayed deauthorization cannot downgrade a connection whose current access is confirmed. Corroborated revocation deauthorizes it; ambiguous access requires review. Deauthorized rows cannot be reactivated by an old update event.

Periodic recovery refreshes stale connected accounts, covering missing/delayed events. The explicit demo opt-in enables only the existing `stripe-provider-recovery` queue. Lifecycle observations and connection/disconnection operations append safe audit/outbox history. No webhook enables checkout.

Disconnect blocks unresolved provider, transfer and compensation/reconciliation operations. OAuth disconnect revokes OAuth authorization; hosted disconnect disables the local connection while preserving provider access for reconciliation and keeping the Stripe account open. The confirmation explains that distinction. Hosted reconnect retrieves and reuses the original account instead of creating another.

## Stripe test configuration

No credentials were read or provider eligibility exercised. Configure test keys in an ignored local environment or shell. Never use live keys. The persistent demo accepts these settings only with its explicit test opt-in; ordinary provider flags remain false.

Example shell configuration before starting the approved demo scripts:

```powershell
Set-Location E:\coding\farmers-market-platform-web
$env:DEMO_STRIPE_CONNECT_TEST = 'true'
$env:STRIPE_ACCOUNT_ONBOARDING_ENABLED = 'true'
$env:STRIPE_ENABLED = 'false'
$env:STRIPE_TEST_SECRET_KEY = '<dedicated sk_test_ key>'
$env:STRIPE_TEST_CLIENT_ID = '<test ca_ application id>'
$env:STRIPE_TEST_PLATFORM_ACCOUNT_ID = '<acct_ platform id for that key>'
$env:STRIPE_TEST_REDIRECT_URI = 'http://localhost:3000/payments/stripe/oauth/callback'
$env:STRIPE_SETTINGS_ORIGIN = 'http://localhost:4322'
$env:STRIPE_TEST_CONNECTED_WEBHOOK_SECRETS = '<snapshot whsec_>,<thin whsec_>'
$env:STRIPE_TEST_PLATFORM_WEBHOOK_SECRETS = '<platform whsec_ if needed>'
```

Retain the existing local account origin, admin origin and bridge-key configuration. The demo wrapper reads those existing settings from the ignored web environment; Stripe settings should be supplied in the shell or allowed backend `.env.demo-market-operations` settings. No environment file was changed by this task.

In Stripe, enable Connect and confirm platform eligibility for the exact full/Stripe/Stripe merchant configuration. Configure required onboarding branding and US test-account capabilities. Register the exact OAuth redirect above for the test application. Configure a connected-account snapshot destination at `/payments/stripe/connected` using API version `2026-09-30.endive`, and a thin-event destination for the supported v2 types at that same path with its own signing secret. Configure `/payments/stripe/platform` only for platform-scope events. Local forwarding must preserve original bytes and signature, and its signing secret must be included. The worker must run for receipt processing and recovery.

Hosted return URLs are generated as `http://localhost:4322/vendor/settings/payments?stripe_onboarding=...` or `/market/settings/payments?stripe_onboarding=...`; refresh adds `stripe_refresh=1`. No arbitrary client-provided redirect is accepted. Full Dashboard links use Stripe's own sign-in, not Express login links.

The demo network guard permits only `api.stripe.com` and `connect.stripe.com` on port 443, and only for explicitly opted-in serve/worker processes. This allows test onboarding/OAuth account operations. Customer-provider binding stays false. Fixture and migration commands retain blocked outbound networking.

## Automated verification

Run from the backend unless stated otherwise:

| Check | Result |
| --- | --- |
| `npm run test:stripe-connect:accounts` | Passed, 14 focused verification groups. Controlled provider fixtures and guarded disposable databases only. |
| `npx tsc --noEmit --pretty false --project test/payments-stripe/phase-c.tsconfig.json` | Passed; includes the safe manual fixture module and relevant source dependencies. |
| `npx tsc --noEmit --pretty false --project tsconfig.json` | Passed for backend source. |
| `npm run build:server` | Passed. |
| `npm run build` | Existing dashboard configuration stops at `APP_ENV_EXPLICIT_MODE_REQUIRED`; no unrelated configuration changes made. |
| Web scoped TypeScript command below | Passed. |
| Web `npm run build --workspace @market/admin` | Passed, with the existing chunk-size advisory. |
| Web focused Vitest commands below | 22 tests passed across the management, settings-workspace and Phase C UI files. |
| Web `npm run graphql:schema`, `npm run graphql:codegen` | Passed through read-only source extraction, without backend bootstrap or database access. |

```powershell
# Web directory, scoped TypeScript and UI tests
npx tsc --noEmit --skipLibCheck --allowImportingTsExtensions --jsx react-jsx --esModuleInterop --target es2022 --module esnext --moduleResolution bundler apps/admin/src/management/payments.tsx apps/admin/src/management/service.ts packages/api/src/management.ts
$env:FRONTEND_NO_EVIDENCE = 'true'
npx vitest run tests/stripe-connect-phase-c.test.tsx tests/management.test.tsx tests/settings-workspace.test.tsx
Remove-Item Env:FRONTEND_NO_EVIDENCE
```

An initial root web `tsc --noEmit` also found unrelated existing errors in `LoyaltyDashboard.tsx`, `table-navigation.ts`, storefront test fixtures and market application test types. These were not investigated or changed. The scoped check passed after using the project's required TypeScript import-extension option. Existing jsdom tests report unsupported scrollTo calls; the assertions pass.

Backend qualification covers populated legacy account/OAuth preservation, immutable history, idempotent dedicated setup, exact installed-SDK request configuration, vendor/market authorization, restricted members, workspace/actor binding, nonce replay/expiry, interrupted creation/resume, mode/platform/configuration failures, independent payouts, existing OAuth attachment/replay and account uniqueness, signed/deduplicated out-of-order updates, v2 notifications, stale deauthorization, corroborated revocation, historical disconnect/reconnect and disabled collection. Intermediate thin-event failures exposed the SDK's separate parser and worker version handling; both were corrected. The established harness retains failed disposable databases for diagnosis. No persistent dataset was used.

## Migration and safe setup commands

Prepared only. Do not run these against the populated demo until separately authorized to migrate. Inspect the actual local target and every pending migration, including unrelated earlier work:

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:market-operations:inspect
# Required target: loopback vendure_demo_market_ops. Review all pending migrations.
# After explicit migration authorization:
npm run demo:market-operations:migrate
```

Expected Phase C migration: `StripeConnectAccounts1796500000000`. No reset, drop, truncate, reseed, historical rewrite or established-role change is required. The normal guarded command may include pending earlier migrations, so inspect the complete list.

After authorized migration, create only the dedicated local organizations with the new guarded setup command:

```powershell
npm run demo:market-operations:stripe-connect-fixtures
```

This command refuses an unexpected actual database/address, requires native platform authority, refuses pending migrations, uses deterministic provisioning keys and does not call Stripe. Running it again preserves the same identities, memberships and account records. Dedicated fixture identities are:

| Purpose | Identity |
| --- | --- |
| Vendor organization | Stripe Phase C Vendor, slug `stripe-phase-c-vendor` |
| Market organization | Stripe Phase C Market, slug `stripe-phase-c-market` |
| Owner of both workspaces | `stripe-phase-c-owner@test.invalid` |
| Restricted test member | `stripe-phase-c-staff@test.invalid` |
| Local-only initial password for both | `Local-Stripe-Phase-C-2026!` |

The command prints the actual organization/channel IDs and tokens. It does not reset existing passwords or grants on a rerun. Neither this command nor actual Stripe test account creation was executed against the persistent database in this task.

Start the populated environment in separate terminals using only:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Use the same onboarding environment in serve and worker terminals. No ordinary backend dev command should substitute for these scripts.

## Manual testing

Use only the dedicated fixture organizations. Creating a real Stripe test account is a separate explicit manual action: select the dedicated workspace, then click Set up Stripe. Do not create accounts for screenshots or use Manna Roots/Boerne.

| Scenario | Action and expected result |
| --- | --- |
| Vendor setup | Sign in as the dedicated owner, select Stripe Phase C Vendor, open `http://localhost:4322/vendor/settings/payments`, click Set up Stripe. Stripe receives a TEST v2 merchant request with the exact responsibility configuration. Unsupported platform configuration blocks setup with no fallback. |
| Market setup | Select Stripe Phase C Market, open `http://localhost:4322/market/settings/payments`, repeat setup. A distinct canonical market-owned connection is created; it has no vendor ownership. |
| Hosted return | Complete or partially complete the Stripe form. On return, click Check returned setup. Backend retrieves the account; requirements and verification determine status. Returning alone never sets ready. |
| Interrupt and resume | Leave Stripe before completion, reopen the original settings and click Continue Stripe setup. The same account is used. A Stripe refresh return offers Resume Stripe setup and creates a new short-lived link after authorization. |
| Readiness | Check connection, details submitted, card payments, direct-charge readiness, payout readiness, requirements and last checked time separately. A pending payout does not imply disabled card capability; a connected ID alone does not imply readiness. Collection remains disabled even when provider requirements pass. |
| Workspace switch | Start a hosted flow, switch to the other dedicated workspace, then visit the original return URL. Checking it must reject the wrong workspace. Switch back to the originating workspace and retry before expiry, or request a fresh link. Never attach it to the new workspace. |
| Restricted member | Sign in as `stripe-phase-c-staff@test.invalid`. Payment controls are hidden or status-only where existing grants allow reading. Direct management API mutations reject this principal. No ownership or established grants are changed. |
| Existing account | In an unconnected dedicated organization use Connect existing Stripe account. Authorize the platform with read/write access. On return, use Check Stripe authorization in the originating workspace as the original owner. Compatible observations can pass provider readiness; unknown/incorrect responsibilities show remediation and stay blocked. Accounts already mapped to another organization cannot be claimed. |
| Refresh and delayed events | Click Refresh status; run the worker and deliver correctly signed test lifecycle events. Provider GET state controls observations. Duplicate/older updates do not replay state changes or move audit watermarks backwards. Missing webhook delivery is covered by the stale-account sweep. |
| Dashboard | An authorized owner can open the full Stripe Dashboard and sign in. No banking or identity-document data appears in our UI. |
| Disconnect | Confirm Disconnect. Pending provider/refund/transfer/reconciliation work blocks it. Otherwise new readiness stops while account/financial history remains. OAuth revokes access; hosted disconnect is local and clearly says the Stripe account remains open. |
| Reconnect | For hosted connections click Set up Stripe after local disconnect; the original account is re-observed and reused. For OAuth use Connect existing Stripe account. Different-account replacement requires prior disconnection and retains the old row/generation. |
| Replay/expiry | Checking a consumed/expired hosted return fails. Request a fresh setup link. OAuth state is single use; an expired or exchanged state cannot be used again. |
| Checkout boundary | Existing supported local checkout behavior remains under its existing gates. Stripe provider checkout mutations reject collection because customer-provider binding is false. No customer payment UI or Stripe booth invoice capture appears. |

## Limitations and Phase D dependencies

Actual Stripe onboarding, platform eligibility, API credentials, webhook delivery and end-to-end OAuth were not exercised. Code and mock qualification do not establish production readiness. Accounts v2 access or account-configuration rejection must be resolved with Stripe; do not substitute platform loss liability.

This implementation is US test-mode only. Exact compatibility observations must be available from Stripe's supported v1 representation; omitted controller fields block readiness. Stripe's current public documentation may show a newer default API version than the installed SDK; the code retains and tests the installed pinned API contract. Configure snapshot webhooks to match that pin.

Existing market owners do not receive new grants automatically. Use the new dedicated setup for testing; changing established account permissions requires separate authorization. The existing protected-owner rule means employee administrators cannot manage provider ownership. Expired ambiguous account creation and revoked original creators need reconciliation rather than automatic replacement.

Hosted disconnect preserves remote access for historical reconciliation and does not close the Stripe account. Closing/removing an account through Stripe or changing legal ownership is outside this phase. Existing pending historical recovery still requires the later qualified provider/refund execution path; no new execution permission was added.

Phase D still needs customer payment-method setup/cloning, coordinated direct-charge authorization/capture, invoice collection, application-fee calculation/refunds, payment-specific historical refund authority, financial compensation/recovery qualification and production eligibility. Readiness alone must never enable those operations. No deployment, remote Git operation or live financial operation was performed.
