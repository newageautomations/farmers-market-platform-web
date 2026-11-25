# Foundational commerce configuration

## Root cause and tax behavior

Staging reported `VendorCatalog` → `ownVendorCatalog` → `UNSUPPORTED_PUBLICATION_CONFIGURATION` with the private reason `MISSING_DEFAULT_TAX_ZONE`. Vendure creates a tax-exclusive, single-currency USD platform channel without a tax zone. Vendor and market provisioning copied that empty default. Catalog and product reads require the channel configuration because they can use native rates to infer collection for legacy products and variants. Inventory reads use independent stock queries. Catalog, publication, checkout and POS validation continue to apply.

Farmerlane stores vendor defaults and per-market overrides in `vendor_tax_settings`, product collection and overrides in `vendor_product_tax`, and variant policies in catalog details. A market override belongs to the vendor and applies in the relevant approved market context. There is no single market-manager rate imposed on all vendors. `VendorTaxStrategy` uses the variant policy when present and otherwise the product policy. The collection flag can turn tax off. For taxable items the precedence is product or variant override, then market override, then vendor default. An explicit 0% is a configured rate. A taxable item without a configured rate still fails validation. Market checkout uses the selected occurrence and POS uses its draft occurrence. Vendure stores the strategy’s resolved tax line and private evidence on the order line. It uses that line when computing order totals and recording financial allocations. Completed orders retain their stored tax.

Vendure selects the active channel’s default tax zone for native rate lookup. Products without an application policy can still depend on that native rate. The job preserves existing native rates, categories in use, and existing channel tax assignments. Vendure already falls back to a zero rate for categories without a matching native rate in a configured zone. `Farmerlane Default` supplies a zone with no regions and an enabled 0% rate for the default tax category. This is foundational Vendure configuration. Actual tax remains governed by the existing business rules. The baseline carries no legal determination about exemptions or jurisdictions. Geographic determination, external tax services, new overrides, and reporting and remittance remain outside this work.

## Initialization and repair

Run the explicit job after normal Vendure bootstrap has created the platform channel and after the database has the expected release ledger. No schema migration is required. The job reuses an appropriate existing region-free zero-rate platform zone or the `Farmerlane Default` zone, as well as a single existing default category and compatible enabled rate. It adds missing foundational records. The platform currency and tax-exclusive pricing must already match the supported catalog configuration. An out-of-policy currency, inclusive pricing, ambiguous category or rate, geographic or nonzero candidate zone, or an unexpected identity is reported for review.

The staging job inspects the platform channel and channels linked through vendor primary-channel and market records, including suspended businesses. It assigns only a verified baseline zone to in-scope channels with a missing zone and compatible pricing. It reports differing existing zones and other conflicts. A conflict in the platform foundation blocks changes that depend on that foundation. Channel conflicts can coexist with safe repairs. The transaction performs targeted Vendure entity writes and serializes against concurrent operator jobs and native tax configuration writes. Inspection uses a PostgreSQL read-only transaction. The command has no API listener, Vendure startup hooks, provider credentials, or job consumption. It leaves ownership, memberships, shipping defaults, product tax configuration, vendor percentages, and financial history intact.

Future vendor and market provisioning copies the validated default through Vendure’s channel service. Existing platform-authorized attachments must have valid channel pricing and a default zone. If a prerequisite is missing, private API logs record `FOUNDATIONAL_COMMERCE_CONFIGURATION_REQUIRED` with the reason and either `PlatformDefaultChannel` or `AttachedChannel`. Check this report before retrying. No initialization runs during registration. The explicitly targeted `demo` and `production` commands initialize only the platform channel. Future production initialization requires the corresponding hardened `market_production` runtime identity and private Railway service context. Existing production business-channel repair is outside this staging procedure.

## Private Railway job

1. In the existing **staging** environment, prepare one temporary backend service such as `foundational-commerce-job` from the reviewed backend revision and its normal release Dockerfile. Use one replica, restart policy **Never**, and disable automatic deployments. Leave public networking, volumes, health checks, cron and pre-deploy commands unset. Use staging’s private PostgreSQL DNS. SSH and a public PostgreSQL endpoint are unnecessary. [Existing private job procedure](STAGING_TEST_ACCOUNTS.md#run-once-in-railway-without-ssh)
2. Set only the job variables below. Reference the staging API’s sealed runtime database values where indicated. Railway injects `RAILWAY_ENVIRONMENT_NAME=staging` and `RAILWAY_SERVICE_ID`. The image sets `NODE_ENV=production`.

| Variable | Value |
| --- | --- |
| `APP_ENV`, `NODE_ENV`, `DEPLOYMENT_ENV` | `production`, `production`, `staging` |
| `HOSTED_TRANSPORT` | `railway-private` |
| `FARMERLANE_FOUNDATIONAL_COMMERCE` | `true`, scoped to the temporary service |
| `DB_HOST`, `DB_PORT` | Existing `*.railway.internal` PostgreSQL host and private port |
| `DB_NAME`, `DB_SCHEMA`, `DB_USERNAME` | `market_staging`, `public`, `market_staging_runtime` |
| `DB_PASSWORD` | Existing sealed runtime password |
| `DB_TRANSPORT_POLICY`, `DB_TLS_CA` | Match staging’s `plaintext-private` or `verify-full`. Supply the existing CA only for `verify-full`. |
| `DB_SYNCHRONIZE` | `false` |

The existing runtime role needs `CONNECT`, schema `USAGE`, reads of the migration ledger and scoped channel, vendor, market, zone, category and rate data, native entity insert/update privileges, usage of the native sequences, and its existing DML privileges on the locked native configuration tables. Keep its existing role grants and read-only ledger access. The guard rejects elevated and migrator roles, verifies both the session and current login, the database owner’s `farmers-market:staging` marker, PostgreSQL 17, the exact release ledger, and private addresses at both ends. Operators need permission to manage the temporary staging service and reference the existing runtime secret. No SuperAdmin password, API ingress key, storage credential, or integration secret is needed for the job. [Runtime grants and database identity](STAGING_DEPLOYMENT_PHASE_B3_C_PREPARATION.md)

3. Set this as the Railway custom start command and deploy the temporary job. Review each proposed `assignments` entry and any `conflicts` in the `foundational_commerce_complete` log. Record the deployment ID and summary. Resolve conflicts through the normal commerce configuration workflow if they affect the planned acceptance accounts.

   ```sh
   node dist/foundational-commerce.js staging --dry-run
   ```

4. After review, schedule a short window without concurrent commerce configuration edits and set the same temporary service’s command to the following. Keep the API and worker available during inspection and apply. The job rechecks the database and recomputes the plan in its transaction. Review the completed summary against the inspection.

   ```sh
   node dist/foundational-commerce.js staging --apply
   ```

5. Use `event=foundational_commerce_complete` to find `status`, `zoneId`, the foundational `changes`, planned or completed `assignments`, the `preserved` count, and any `conflicts` with reasons and channel IDs. Exit `0` means completion without conflicts. Exit `2` means the summary contains conflicts and any listed apply assignments committed. Exit `1` logs `foundational_commerce_failed` with a fixed diagnostic and rolls back any open repair transaction. An interrupted or unknown outcome can be reconciled by inspection. Repeat the dry run. A successful repeat has empty `changes` and `assignments`. Record and resolve any remaining conflicts before signing off on the affected workspace.
6. When the release is authorized, use the corrected backend revision for the API and worker. Their normal deployment restarts process-local channel and tax caches. If they already use that revision, restart them after apply before manual acceptance. Remove the temporary deployment and service, including its scoped variables, after recording the result. The compiled TypeScript command is included by the backend Dockerfile’s existing source copy and compiled `dist` copy.

## Manual acceptance

1. Run the private inspection, review the plan, apply it, then inspect again. Verify Cedar Bend Farm’s channel appears in the expected result or already has a valid default.
2. Sign in as Cedar Bend Farm and select its vendor workspace. Open **Products & Inventory**, create a dedicated test product and variant, add inventory, then adjust it. Reopen the product detail and its category and verify the updated stock. Use the private API request ID to correlate any `VendorCatalog`, `VendorProduct`, or `VendorInventory` error. [Hosted API diagnostics](HOSTED_API_DIAGNOSTICS.md)
3. In an existing market manager workspace, verify market settings, listings, and an existing occurrence. Use test listings if checking publication. From the SuperAdmin test account manager, create a new dedicated vendor, sign in as that user, and check the empty catalog and inventory before adding any products. [Staging test accounts](STAGING_TEST_ACCOUNTS.md)
4. On the dedicated vendor, verify that tax settings and product collection controls save and reload. In the existing checkout test mechanism, confirm that a $20 taxable fixture product produces $1.60 at an 8% vendor default, $1.20 at a 6% approved market override, and $1.00 at a 5% product override. Verify that a non-taxable product stays at $0. If POS is already enabled in the test environment, check the same prices in an independent and market-scoped quote. Keep Stripe disabled and stop at the cart or quote in hosted staging. Use guarded local simulation for any completed-order checks.

For local manual testing, use `vendure_demo_market_ops` with dedicated fixtures and leave Manna Roots and established manager accounts intact. Start `npm run demo:market-operations:serve`, `npm run demo:market-operations:worker`, `npm run demo:market-operations:admin` and `npm run demo:market-operations:storefront` from the web checkout. If the persistent demo needs the platform initializer, build the backend with `npm run build:server`. In a local backend shell, supply the existing demo `DB_HOST`, `DB_PORT`, `DB_USERNAME`, and `DB_PASSWORD` along with `APP_ENV=dev`, `NODE_ENV=development`, `DEPLOYMENT_ENV=development`, `DB_NAME=vendure_demo_market_ops`, `DB_SCHEMA=public`, `DB_SYNCHRONIZE=false`, `SUPERADMIN_USERNAME=demo.platform@example.test`, and `FARMERLANE_FOUNDATIONAL_COMMERCE=true`. Run `node dist/foundational-commerce.js demo --dry-run` and then `node dist/foundational-commerce.js demo --apply` if needed. [Local demo fixture setup](TEST_DATA_MANAGER_PHASE_A.md#local-demo-accounts)

## Changed files and verification

- Backend `src/foundational-commerce.ts`, `src/plugins/marketplace-commerce/foundational-commerce.ts`, `src/hosted-database.ts`, and `src/database-migrations.ts` implement the guarded release command and data transaction.
- Backend `src/plugins/marketplace-commerce/channel-commerce-configuration.ts`, `catalog-command.service.ts`, and the vendor and market provisioning services validate channel defaults and keep the existing catalog requirements. `src/production-error-diagnostics.ts`, `src/plugins/platform-admin/test-accounts.service.ts`, and `src/test-data.ts` preserve the new diagnostic through the API and fixture workflows.
- Backend `test/market-operations/test-data.ts` and `test/production-hardening/catalog-diagnostics.ts` exercise initialization, authorization, conflict handling, and catalog and stock operations. `test/marketplace-commerce/foundational-tax.ts` and `package.json` add the focused checkout and POS qualification.

| Local verification | Result |
| --- | --- |
| `npm run build:server`, `tsc --noEmit --project tsconfig.json`, and `git diff --check` | Passed. The server build emits the job at `dist/foundational-commerce.js`. The Docker context and copy rules were checked against the build output. A full image build was unavailable because the local Docker daemon was down. |
| `npm run test:test-data` | Passed on disposable PostgreSQL 17. Verified CLI target and identity guards, read-only inspection, initialization and repeat, existing-channel repair, a blocked unsafe platform zone, conflicting channel preservation, valid vendor and market inheritance, empty and populated catalog, product creation and editing, detail and stock reads, inventory writes, and tenant and anonymous denial. |
| Compiled operator, `npm run test:database-hosted`, and production policy checks | Passed. Exercised the emitted operator modules’ exact-ledger preflight and inspection/apply/repeat on a disposable database with no application bootstrap. The release entry point rejected missing opt-in. Hosted migration and production policy regressions passed. |
| `npm run test:marketplace-commerce:foundational-tax` | Passed on disposable PostgreSQL 17. Exercised vendor and market cart totals and independent and market POS drafts after repair, including configured overrides, non-taxable lines and explicit zero. |

The older QuickBooks native fixture stopped before tax verification because its migration connection lacked `OrderLine` metadata. The focused tests use the current guarded migrator and marketplace fixtures. The passing database suites emitted an existing `pg` concurrent-query deprecation warning. Hosted deployment and manual staging acceptance remain pending. The persistent demo was outside automated verification.
