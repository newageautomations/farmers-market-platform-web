# SuperAdmin Stripe Connections

Open **Platform → Administration → Stripe Connections** at `/platform/stripe-connections`. The page uses the existing Platform shell, `WorkspaceFrame`, Farmstand table, search and buttons, `Choice`, `Pager`, `IdentityIcon`, badges, alerts, dropdown, confirmation dialog and detail drawer. The new page composes these components because the Tenant Directory has no payment projection, Stripe actions or OAuth return handling. The status details were extracted from the existing payment Settings page so vendors, markets and Platform share one presentation.

The table shows Business, Business type, Stripe connection, Payment status, Payout status and Actions. Business images come from the saved workspace profiles. Search matches business name. Filters cover type, connection, payment readiness and attention, with name sorting and 20 results per page. The API calculates overall totals and filtered pages from persisted state without calling Stripe. The totals cover businesses, connected, payment-ready, connected requiring attention and unconnected. A connection that needs reconciliation, payment setup or payout setup appears under **Requires attention**. The Stripe environment and any collection suspension appear separately from account readiness.

The drawer shares the Settings indicators for connection, environment, masked account reference, verification, submitted details, charges, payouts, requirements, pending verification, deadline, capabilities, charge/transfer/payout readiness, restrictions, remediation and last observation. **Refresh status** uses the existing provider read and persisted account observation. For incomplete setup, follow the shared reasons and continue in the business owner's Stripe Dashboard or Settings as appropriate. Platform provides confirmation and Sandbox OAuth for eligible unconnected businesses. Existing mappings expose read and refresh actions.

## Authority, OAuth and audit

- Platform operations require an authenticated Admin request and a current native `SuperAdmin` grant in the request channel. The target is an active vendor or an active, independently managed market. Vendor-owned scheduling locations and suspended businesses cannot start delegated setup.
- The existing `stripe_oauth_attempt` table stores the hashed single-use state, initiating user and channel, target business/type/channel, Sandbox mode, Stripe platform/application, redirect URI and expiry. Purpose selects the fixed return path. The existing database trigger protects the authorization identity from updates.
- The public `/payments/stripe/oauth/callback` uses the stored state and configured Admin origin to select its return path. Delegated returns carry the code/state or denial in a fragment that the Admin page clears before submitting the authenticated completion. The vendor and market routes keep their existing owner return format. Completion rechecks the actor, grant, workspace and Stripe environment before exchange and rechecks the actor and target before attachment.
- The existing Stripe SDK exchange and account verification save the normal organization-owned payment account. The advisory locks and account constraints protect against concurrent replacement. An administrator approval fails if an active mapping already exists. The existing Stripe account sharing policy across independent organizations still applies.
- `StripeOAuthStarted`, `StripeOAuthCompleted` and `StripeOAuthRejected` record the delegated lifecycle in Platform audit with the initiating administrator, target, mode and safe failure reason when available. The payment account keeps its existing `PaymentAccountConnected` event. Recovery marks an abandoned exchange for reconciliation and records its initiating administrator. OAuth codes, raw state and credentials are excluded from audit metadata.
- Delegation requires the existing Sandbox onboarding policy and configuration in local development or verified staging. Production permits monitoring, with provider refresh where the existing live-read configuration permits it. Owner onboarding and owner-only continuation remain in Settings. The Platform feature has no disconnect, account reassignment or transaction controls.

## Local manual acceptance

Use the populated `vendure_demo_market_ops` database through the web checkout. Inspect first and review the pending migrations before running the approved migration. Use the dedicated Stripe Phase C organizations or dedicated test accounts you create for this check. Keep the existing Manna Roots and market manager workspaces out of the test.

```powershell
npm.cmd run demo:market-operations:inspect
npm.cmd run demo:market-operations:migrate
npm.cmd run demo:market-operations:stripe-connect-fixtures
```

Use the guarded local account composition and Sandbox settings in the Phase C guide. In the API and worker launch environment set `DEMO_STRIPE_CONNECT_TEST=true`, `STRIPE_ACCOUNT_ONBOARDING_ENABLED=true`, `STRIPE_ENABLED=false` and `STRIPE_COLLECTION_SUSPENDED=true`. Use the matching `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_CLIENT_ID` and `STRIPE_TEST_PLATFORM_ACCOUNT_ID`. Set `STRIPE_TEST_REDIRECT_URI=http://localhost:3000/payments/stripe/oauth/callback` and `STRIPE_SETTINGS_ORIGIN=http://localhost:4322`. Keep the existing local account bridge, paid-attribution and demo settings. If forwarding webhooks, use the corresponding Sandbox platform and connected webhook secrets. [Local Stripe Phase C setup](STRIPE_CONNECT_PHASE_C.md)

Start the integrated services in separate terminals from the web checkout.

```powershell
npm.cmd run demo:market-operations:serve
npm.cmd run demo:market-operations:worker
npm.cmd run demo:market-operations:admin
npm.cmd run demo:market-operations:storefront
```

## Hosted staging and acceptance

Keep the existing verified staging Stripe bundle on API and worker, including `DEPLOYMENT_ENV=staging`, `STRIPE_ENVIRONMENT=staging`, `ENABLE_PAID_ATTRIBUTION=true`, `STRIPE_ENABLED=true`, `STRIPE_ACCOUNT_ONBOARDING_ENABLED=true`, the same Sandbox `STRIPE_TEST_*` identities and webhook secrets, and `STRIPE_SETTINGS_ORIGIN=https://staging-admin.farmerlane.com`. The registered Stripe callback stays `https://staging-api.farmerlane.com/payments/stripe/oauth/callback`. For onboarding-only testing use the activation runbook's suspended collection configuration. There are no additional Admin build or runtime variables. [Hosted Stripe Sandbox activation](HOSTED_STRIPE_SANDBOX_ACTIVATION.md)

1. As the SuperAdmin, open `http://localhost:4322/platform/stripe-connections` locally or `https://staging-admin.farmerlane.com/platform/stripe-connections` on staging. Expect **Stripe Sandbox (test mode)**. Search for **Stripe Phase C Vendor** locally or an existing Phase B vendor on staging, such as **Lark & Grain**. Search a connected and an unconnected business to compare their rows.
2. Choose **Connect Stripe** on an eligible unconnected vendor. Check its name, type and Sandbox in the confirmation dialog. Continue to Stripe and select or create that business's legitimate Sandbox merchant account. After Stripe returns, expect the Platform page and the named business's details drawer. Check direct-charge and payout readiness independently. A connection can still need information, verification, restriction resolution or a fresh observation.
3. Close the drawer and repeat for **Stripe Phase C Market** locally or a Phase B market such as **Foxglove** on staging. Start another business and cancel from Stripe. Expect the cancellation message and the original connection status for that target. Use **Requires attention** to find connected businesses that need follow-up. **Refresh status** should reflect the latest Stripe observation after requirements are addressed.
4. In a separate business account session, open `/vendor/settings/payments` or `/market/settings/payments`. Check the same masked account, capabilities, requirements and readiness against the Platform drawer. A vendor, market manager, staff member or customer cannot open the Platform page or use its operations.
5. In an unconnected vendor's joined market workspace, open **Add products** and try to request preorder approval. Expect the setup restriction (`VENDOR_STRIPE_SETUP_REQUIRED`). For a vendor with qualifying card-payment evidence and otherwise eligible catalog/market data, the same request can proceed. In this checkout the gate is on the market listing and online sales path. The base catalog product creation path has no Stripe check. [Market listing guard](../../farmers-market-platform/src/plugins/farmers-market/services/market-listing.service.ts)

## Population job compatibility

The original `staging-catalog-job` would remain blocked after OAuth alone. Its planner rejected every saved payment mapping with `FIXTURE_PAYMENT_ACCOUNT_PRESENT`. Its offline worker lacked the Sandbox identity that the existing vendor sales guard uses to validate evidence. The guarded staging population command now accepts the following two public identifiers from the same Sandbox as the API.

```text
FARMERLANE_POPULATION_STRIPE_TEST_PLATFORM_ACCOUNT_ID=<same acct_ ID as STRIPE_TEST_PLATFORM_ACCOUNT_ID>
FARMERLANE_POPULATION_STRIPE_TEST_CLIENT_ID=<same ca_ ID as STRIPE_TEST_CLIENT_ID>
STRIPE_ENABLED=false
STRIPE_COLLECTION_SUSPENDED=true
```

Keep the existing job credentials, environment guards and saved media handoff. The planner accepts a single connected matching TEST mapping for a verified fixture business when existing audit proves the organization, environment and account generation. Historical or extra mappings, Live mappings, mismatched identities and missing provenance still conflict. Pending market stages require the approved vendors to satisfy the existing persisted sales readiness rule. A market connection can be recorded without requiring online invoice collection for the fixture's cash and open invoices. The job's reader uses the same readiness predicate only for approved and resolved fixture vendors. It uses no Stripe keys or provider calls and restores the ordinary reader on exit.

After connecting the fixtures, use the new backend artifact for an operator-run `node dist/test-data-population.js --dry-run --anchor 2026-12-08`. Review zero conflicts and the existing completed receipts. Keep anchor `2026-12-08`, digest `f56260fec3f8f72e128ad1e366db4823871d96d4e1fe91f372c8566f637bbb48` and the exact saved `FARMERLANE_TEST_DATA_POPULATION_MEDIA` handoff. After approval, this apply command resumes pending stages. The replay case on a disposable database verified that completed receipts, inventory, catalog and connection data survive the interrupted market stage and retry. [Population runbook](DEMO_DATA_PORTABILITY_COMPLETION.md)

```text
node dist/test-data-population.js --apply --anchor 2026-12-08 --approve f56260fec3f8f72e128ad1e366db4823871d96d4e1fe91f372c8566f637bbb48
```

## Migration, release order and Git file lists

Build from clean release worktrees based on the reviewed deployed revisions. Carry only the files below and review `git diff --cached --name-only` and `git diff --cached --check` before creating a release commit. The working checkouts contain unrelated storefront changes.

1. Stage the new backend build for the API and worker and the new web build for Admin (`MARKET_WEB_APP=admin`). Apply `PlatformStripeOAuth1798400000000` from the new backend image using the existing one-shot staging migration role and private transport. Run `node dist/migrate-hosted.js staging market_staging` and verify `hosted_migration_complete`. The migration adds purpose and target channel while existing rows default to `OWNER`. The forward-only migration keeps existing attempts and mappings. [Hosted migration contract](STAGING_DEPLOYMENT_PHASE_B3_C_PREPARATION.md)
2. Roll out the backend API and worker from the new artifact and verify their existing readiness/startup signals. The worker must recognize the new migration in the shared ledger and handles orphaned OAuth exchange audits. An older artifact rejects the newer ledger on restart.
3. Roll out Admin after the API passes readiness. Keep PostgreSQL, gateway and storefront on their current releases. The population job uses the matching backend artifact only when the operator resumes it separately.

Backend files

```text
src/migrations/1798400000000-PlatformStripeOAuth.ts
src/plugins/payments/account.service.ts
src/plugins/payments/api.ts
src/plugins/payments/entities.ts
src/plugins/payments/payments.plugin.ts
src/plugins/payments/readiness.ts
src/plugins/platform-admin/api.ts
src/plugins/platform-admin/service.ts
src/production-http.ts
src/test-data-population.ts
src/test-data/population-apply.ts
src/test-data/population-plan.ts
src/test-data/population-stripe.ts
test/market-operations/test-data.ts
test/payments-stripe/platform-connections.ts
```

Web files

```text
apps/admin/src/AdminShell.tsx
apps/admin/src/NavigationIcon.tsx
apps/admin/src/management/ManagementRoutes.tsx
apps/admin/src/management/StripeConnections.tsx
apps/admin/src/management/payments.tsx
apps/admin/src/management/stripe-presentation.tsx
docs/SUPERADMIN_STRIPE_CONNECTIONS.md
packages/admin-core/src/index.ts
packages/api/operations/management.graphql
packages/api/schema/admin.graphql
packages/api/schema/provenance.json
packages/api/src/errors.ts
packages/api/src/generated/admin.ts
packages/api/src/management.ts
tests/platform-stripe-connections.test.tsx
```

## Automated verification

- Admin GraphQL generation and Admin build passed. The scoped strict TypeScript check reaches the existing `packages/ui/src/table-navigation.ts` `target` diagnostic. The repository-wide check also reports existing Loyalty and unrelated test errors.
- The 25 focused Admin tests passed. They cover navigation authority, filters and pagination, details/refresh, confirmation, Live read-only display, cancellation and a single OAuth completion during React Strict Mode. Owner settings and authority refresh regressions are included.
- The focused Platform Stripe suite passed seven groups on guarded disposable PostgreSQL with controlled Stripe responses. It covers authorization, target and mode binding, owner OAuth, cancellation, expiry, replay, revocation, concurrent attempts, auditing, readiness and persisted population evidence. The production policy, interrupted population and 27 controlled Stripe checkout regression groups passed. The compiled population definition reproduced the approved anchor and digest. Real Stripe authorization remains a manual acceptance step. No hosted service, persistent test database or hosted population job was changed.

Backend verification commands

```powershell
npm.cmd run build:server
npm.cmd run build:worker
.\node_modules\.bin\ts-node.cmd --project test/payments-stripe/phase-h.tsconfig.json test/payments-stripe/platform-connections.ts
npm.cmd run test:stripe-connect:production
npm.cmd run test:stripe-connect:checkout
npm.cmd run test:test-data
```

Web verification commands

```powershell
npm.cmd run graphql:codegen
npm.cmd run build --workspace @market/admin
$env:FRONTEND_NO_EVIDENCE = 'true'
npm.cmd test -- tests/platform-stripe-connections.test.tsx tests/stripe-connect-phase-c.test.tsx tests/admin-authority-refresh.test.tsx
```
