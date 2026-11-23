# Phase B1 hardened staging configuration

Hosted staging runs with the production security profile and an explicit `DEPLOYMENT_ENV=staging`. Storefront, Admin, API and worker consume this identity. Staging can use a dedicated Stripe Sandbox after configuration and can start with every external payment and communication provider disabled. The baseline is for private operator qualification. External tester admission still requires Phase D.

## Environment model

| Capability                                | Local development                     | Isolated tests                 | Hosted staging                           | Hosted production                                  |
| ----------------------------------------- | ------------------------------------- | ------------------------------ | ---------------------------------------- | -------------------------------------------------- |
| `APP_ENV`                                 | `dev`                                 | `test`                         | `production`                             | `production`                                       |
| `NODE_ENV`                                | Existing development behavior         | Existing test behavior         | `production`                             | `production`                                       |
| `DEPLOYMENT_ENV`                          | `development`, inferred if omitted    | `test`, inferred if omitted    | Explicit `staging`                       | Explicit `production`                              |
| Local environment files                   | Existing local files                  | Existing test harness rules    | Injected process configuration           | Injected process configuration                     |
| HTTPS, exact origins and hardened cookies | Existing local behavior               | Harness-specific               | Required                                 | Required                                           |
| Fixtures, mailbox and test authentication | Existing guarded development features | Guarded disposable fixtures    | Disabled                                 | Disabled                                           |
| Stripe                                    | Existing explicit local test paths    | Mocked or separately qualified | Dedicated Sandbox, off initially         | Existing live policy and launch blockers           |
| Outbound email and SMS                    | Existing local mailbox and opt-ins    | Existing test transports       | Disabled                                 | Existing provider and approval requirements        |
| Search indexing                           | Existing local directives             | Harness-specific               | All website responses excluded by policy | Tenant SEO and existing private-route restrictions |
| External tester admission                 | Local workflows                       | Harness-specific               | Pending Phase D                          | Existing application authorization                 |

The separate `local-qualification` identity requires both `APP_ENV` and `NODE_ENV` to be `production`. It applies the hardened profile to loopback public authorities and API URLs. The backend requires a loopback database host and a disposable `vendure_test_*` name. This identity cannot select hosted Stripe environments. Qualification scripts continue to own disposable database creation and cleanup. They are distinct from the persistent market operations scripts and database.

Hosted startup rejects missing or unknown identity, `APP_ENV=staging`, a local app mode with a hardened identity or production Node mode, and a hardened app mode without production Node mode. The supported frontend build commands distinguish the tools' default build-time Node mode from an explicit process setting. The web and API repositories mirror the same policy so their deployments can be built independently. The API retains its requirement for explicit `APP_ENV` in local configuration. Frontend local development can still infer `dev` and local Vitest configuration can infer `test`.

## Configuration and isolation

Use the four environment examples as input inventories for each service. Inject hosted values into the process environment. Hosted Vite and Astro builds disable local environment file loading. Hosted API and worker configuration skip `.env` and `.env.documents.local`. Existing local development and `demo:market-operations:*` startup commands keep their local configuration workflow.

| Scope                               | Settings                                                                                                                                                                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All services                        | Match `APP_ENV`, `NODE_ENV`, `DEPLOYMENT_ENV`, `ADMIN_ORIGIN` and `PLATFORM_ACCOUNT_ORIGIN`.                                                                                                                                                              |
| Frontend build and runtime          | Match the corresponding public host and endpoint settings. Storefront checks its Shop API, Admin API, account, Admin and full asset-prefix settings. Admin checks its Admin API and origin, central account origin and optional customer storefront link. |
| Frontend and backend                | Use the backend public `API_ORIGIN` for the browser Admin URL and the initial Shop URL. Use `/admin-api` and `/shop-api` respectively. Match Storefront's `ASSET_URL_PREFIX` to the backend media URL.                                                    |
| Storefront SSR, API and worker only | Match the server-only `PLATFORM_ACCOUNT_BRIDGE_KEY`. Admin runtime and both web builds can omit it.                                                                                                                                                       |
| API and worker only                 | Match the staging database, transport, cookie secret, administrator credentials, provider and feature policy. Generate environment-specific secrets. Use a shared document encryption key if document storage is qualified.                               |

Build settings contain public values only. Both launchers compare them against runtime configuration before listening. The built Storefront also checks its settings on SSR initialization. The Admin launcher keeps its build metadata out of HTTP responses. Hardened builds allow `PUBLIC_ADMIN_API_URL` as the sole public-prefixed application setting. Hardened launcher entry points are `npm run start:storefront:production`, `npm run serve:admin:production`, `npm run start:server` and `npm run start:worker` in their respective projects. Use the raw Astro preview command only for local builds.

Public staging origins require canonical HTTPS and public DNS hostnames. This rejects localhost, loopback, IP literals, local-only DNS names and ambiguous URLs. The API retains its exact Admin-only credentialed CORS policy. Staging requires the discrete PostgreSQL fields, rejects known development and disposable database names, requires a strong database password and leaves schema synchronization off. Use `verify-full` with a CA or the existing explicit `plaintext-private` policy if the actual private topology is approved. Validate the database server certificate, network placement, login permissions and credential separation during provisioning. Environment validation can identify incompatible settings. Actual database, credential, storage and provider isolation require verification against the provisioned resources.

Unified accounts use the existing paid-attribution and purchase-history composition. The examples therefore set `ENABLE_PAID_ATTRIBUTION=true` and an explicit dormant `REFUND_POLICY_VERSION`, with refunds and provider collection disabled. That configuration supplies the account plugin's existing dependencies. Review refund and other monetary policies separately before any transaction qualification. Reserve independent credentials for the staged administrator, authentication cookies, account bridge, database, document encryption, object storage and each provider.

## Security controls

Staging continues through the existing production branches for HTTPS, HSTS, canonical authority checks, host-only authentication cookies, `Secure` and `HttpOnly` cookie settings, `SameSite=Lax` where used, exact origin and CSRF rules, proxy trust, tenant authorization, rate limits, CSP and other headers. Safe responses and redacted operational logs continue to apply. Astro retains its empty trusted forwarded-domain configuration. The API retains explicit immediate-peer proxy validation. Phase B2 will qualify the actual transport and ingress arrangement.

Hosted staging rejects fixture, mailbox, remote demo, local checkout and refund simulation and test-provider flags. The demo proxy, Admin demo launcher and Quick Tunnel entry points reject hardened intent. The backend's guarded demo runner also rejects it before loading the persistent demo configuration. GraphiQL, introspection, debug tooling and the scaffold Dashboard route stay unavailable under the existing production controls. R2, private API transport, ClamAV networking and migration-only release orchestration remain deferred.

## Payments and communications

Marketplace Stripe test credentials are accepted under the hardened policy only with staging deployment and `STRIPE_ENVIRONMENT=staging`. Configuration retains the validated Sandbox key types and account identifiers, exact HTTPS settings and callback origins, the two webhook destinations and separate webhook signing secrets, and the isolated database requirement. Staging rejects live credential settings and live read, collection and onboarding grants. Hosted production continues to reject test credentials and retains the existing live policy blockers. The separate SaaS billing transport receives no Sandbox exception.

The initial examples omit Stripe credentials and use `STRIPE_ENABLED=false` and `STRIPE_COLLECTION_SUSPENDED=true`. Staging also defaults to suspended collection without `STRIPE_SANDBOX_COLLECTION_AUTHORIZED=true`. The explicit suspension switch still takes precedence. Existing checkout, invoice, recovery, refund, fee and tax checks apply independently. In Phase F, supply `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_PUBLISHABLE_KEY`, `STRIPE_TEST_CLIENT_ID`, `STRIPE_TEST_PLATFORM_ACCOUNT_ID`, `STRIPE_TEST_REDIRECT_URI`, the separate `STRIPE_TEST_PLATFORM_WEBHOOK_SECRETS` and `STRIPE_TEST_CONNECTED_WEBHOOK_SECRETS`, and `STRIPE_SETTINGS_ORIGIN`, `STRIPE_STOREFRONT_ORIGIN`, `STRIPE_PLATFORM_WEBHOOK_URL` and `STRIPE_CONNECTED_WEBHOOK_URL`. Verify all provider identities and URLs against the dedicated Sandbox before authorizing any collection. Square, Clover, native POS and SaaS billing stay disabled. QuickBooks and the general POS integration have network access disabled.

Staging leaves account email, general communication delivery and phone OTP networking off. Staging does not construct the Resend, Twilio or local mailbox transports, even if provider credentials are present. Credential-less configuration uses the existing delivery-unavailable paths and leaves database-backed in-app notifications available. Production and local provider and mailbox composition keep their existing validation and approval rules.

| Account workflow                                                                          | Effect of unavailable delivery                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New customer registration, vendor or market signup, and phone verification or replacement | The required SMS ownership proof cannot complete. Existing verification requirements still apply.                                                                                               |
| Business team invitations and resends                                                     | Invitation email delivery is unavailable. Existing recipient binding and token checks still apply.                                                                                              |
| Central password recovery, purchase-claim delivery and email verification                 | Email delivery is unavailable. Recovery requiring additional phone proof also cannot send an OTP.                                                                                               |
| Existing provisioned accounts                                                             | Existing password login and authorized workspaces are available subject to their existing account and verification state. Authenticated password change retains its current proof requirements. |

Use the configured staging SuperAdmin for private operator qualification. The existing SuperAdmin provisioning commands can create a vendor or market and assign an existing eligible principal. They do not bootstrap a new verified tester account. For a clean staging database, qualify a narrowly scoped, audited initial-account provisioning workflow or authorize the existing verified delivery path separately before opening tester access. Do not copy persistent development accounts or bypass verification. See [Unified Authentication](UNIFIED_AUTHENTICATION_IMPLEMENTATION.md) and the [platform provisioning service](../../farmers-market-platform/src/plugins/platform-admin/service.ts).

## Indexing and tester access

Storefront SSR and the HTTPS wrapper set `X-Robots-Tag: noindex, nofollow` for staging. The shared HTML layout overrides indexable tenant metadata without writing tenant records, and the existing Admin, private account layout and editor preview meta restrictions remain in place. The Admin wrapper applies its existing response header to all responses and serves a restrictive staging `robots.txt`. Astro serves the same restrictive file on staging storefront and account hosts, without resolving a tenant for that route. Production storefront SEO and existing private and preview restrictions keep their previous behavior. Robots directives are indexing instructions. They provide no access control, and blocking crawlers with `robots.txt` alone cannot prevent an address from appearing in search results.

`STAGING_TESTER_ACCESS` defaults to `closed` and `STAGING_ANONYMOUS_STOREFRONTS` defaults to `disabled`. Phase B1 rejects attempts to change either setting to an open mode. These settings validate the intended posture. The request handlers do not use them as an admission gate. Keep staging private and withhold external tester access until Phase D enforces and qualifies admission at ingress and in the application. An ungated public route would still be reachable.

Phase D must attach server-side policy to the central account bridge and Shop/Admin GraphQL authority before enabling signup, invitation or application submission, verification sends, checkout or other mutations. Reuse existing principal, membership, invitation-token and ownership checks. Separate genuinely read-only browsing for explicitly approved storefronts from privileged reads and state changes, including same-origin Astro POST routes. Qualify protected Admin and account entry, credentialed cross-origin Admin and preview access, and exact provider OAuth and signed webhook routes. Preserve provider signature checks and raw-body handling when those routes are admitted.

## Implementation files

| Area                      | Changes                                                                                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web policy and tooling    | `packages/config/src/deployment-environment.ts`, `index.ts`, `security.ts`, `scripts/frontend-tooling.ts`, `frontend-build-environment.mjs`, `frontend-build-manifest.ts`, and the two app package scripts.            |
| Web build and runtime     | `apps/storefront/config.ts`, Storefront middleware, locals, shared layout and robots route, `apps/admin/vite.config.ts`, `scripts/start-storefront.ts`, `serve-admin.ts`, and the three remote demo entry points.      |
| API and worker            | `src/deployment-environment.ts`, `runtime-environment.ts`, `production-policy.ts`, `production-http.ts`, `vendure-config.ts`, both entry points, the Stripe production policy and the guarded demo environment loader. |
| Examples and verification | The default web `.env.example`, two web and two backend staging `.env.*.example` files, existing production policy tests, local build and hardening harnesses.                                                         |

## Verification

The five targeted frontend Vitest suites passed all 123 cases, including configuration, build/runtime parity, private preview and remote demo regression checks. A synthetic hosted build passed for both frontend apps. The standard bundle guard checked 246 artifacts and a separate scan found none of the injected bridge, cookie or database credential markers in generated files. A loopback HTTPS probe with a mocked API verified launch rejection on build mismatch, actual vendor and market HTML overrides, central login, Admin and restrictive `robots.txt`. The probe made no browser, database or external provider calls.

The backend build passed with synthetic `local-qualification` settings, including server, worker and scaffold Dashboard compilation. The scaffold build re-emitted its already-modified `src/gql/graphql-env.d.ts`. Both compiled entry points rejected an invalid deployment identity with redacted startup logs. Backend checks passed for full API/worker configuration composition without bootstrapping Vendure, the production proxy policy over loopback, existing Stripe production preflight and collection gates, provider adapter contracts, and the guarded local demo configuration. The mirrored deployment contracts matched. Targeted ESLint and Storefront `astro check` passed. The web root typecheck still reports unrelated errors in the existing Loyalty Dashboard, shared table navigation and application and checkout test fixtures. The production audit, persistent `vendure_demo_market_ops` database, other saved development data and external infrastructure were left untouched.

### Repeatable local checks

Run these in PowerShell in the web project. The tests exercise local-only mocks and create no evidence output. The build uses the example's illustrative endpoints. It starts no application listeners and requires no real credentials.

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
$env:ASTRO_TELEMETRY_DISABLED = '1'
node node_modules/vitest/vitest.mjs run tests/production-policy.test.ts tests/platform.test.ts tests/storefront-preview-security.test.ts tests/remote-demo-phase-b.test.ts tests/remote-demo-proxy.test.ts
Get-Content -LiteralPath '.env.staging.frontend-build.example' |
  Where-Object { $_ -match '^[A-Z_]+=' } |
  ForEach-Object {
    $pair = $_ -split '=', 2
    [Environment]::SetEnvironmentVariable($pair[0], $pair[1], 'Process')
  }
npm run build
npm run check:bundles
```

In the same isolated shell after a successful staging build, run the following negative checks. Each launcher should exit with a build mismatch before opening a socket or reading any TLS certificate. Close the shell afterward to discard the sample settings.

```powershell
$env:DEPLOYMENT_ENV = 'production'
$env:PLATFORM_ACCOUNT_BRIDGE_KEY = node -p "require('node:crypto').randomBytes(48).toString('base64url')"
npm run start:storefront:production
npm run serve:admin:production
```

Run `npm run build:production-local` from the normal web checkout with `FRONTEND_NO_EVIDENCE=true` to build the hardened loopback profile using the existing synthetic environment. That build command skips database startup and migrations.

Run these in the backend project for environment, plugin, provider and topology checks without connecting to a real database:

```powershell
node --require ts-node/register test/production-hardening/policy.ts
node --require ts-node/register test/production-hardening/topology.ts
npm run test:stripe-connect:production
npm run test:communications:providers
npm run demo:market-operations:test
```

### Before Phase B2 and hosted verification

Decide the native TLS or authorized ingress topology for Admin, Astro and Vendure. Confirm exact wire Host, HTTPS detection, proxy peer allowlists, original tenant authority and rate attribution. Plan the private SSR-to-API path and verify that direct provider-issued origins and internal endpoints are inaccessible from public networks. On Railway, verify runtime injection, worker's private placement, database identity and grants, CA validation or approved private transport, credentials, and a nondestructive release plan. Existing API and worker entry points still run their current migration path. Phase B3 must qualify migration-only release orchestration before pointing them at a hosted database.

When the Cloudflare route and temporary domain exist, verify real configured hostnames and certs, Admin-to-API CORS, the central account and tenant cookies, preview framing and staging robots directives on each host. Keep tester admission closed pending Phase D. Verify real Sandbox identity, separate metadata and signed webhook delivery only in Phase F. Object storage, the hosted scanner and any later approval for external communications require their own isolation and rollout checks. The architectural reference remains the [Staging Deployment Audit](STAGING_DEPLOYMENT_AUDIT.md).
