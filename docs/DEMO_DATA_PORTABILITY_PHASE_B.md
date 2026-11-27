# Farmerlane fictional accounts and catalog population

Phase B adds a guarded catalog command to the backend release image. It provisions fictional accounts through the Test Data Manager and creates owner-scoped catalogs through the regular Vendure services. The accounts, products, taxonomy codes, inventory and tax inputs come from the reviewed release fixture. Neither the source database nor live staging is needed to build it. [Phase A audit](DEMO_DATA_PORTABILITY_PHASE_A.md)

## Accounts and cohorts

The fixture namespace is `farmerlane-fictional-trial`, revision `2026-11-r1`. `trial` selects Morning Hearth, Lark & Grain, Orchard Lantern and Trial Customer 01. `curated` selects the 22 vendors with 18 products each, with 396 products and 397 variants in total. `scenario` selects Briarstone and Orchard Lantern. `markets` selects all three manager accounts. `onboarding` selects Silver Meadow and Trial Customer 02. `--accounts` accepts up to 25 comma-separated logical IDs. Cohorts share the same identity namespace, so running `curated` after `trial` skips the two vendors already created.

Vendor owners sign in through the [vendor dashboard](https://staging-admin.farmerlane.com/vendor). Market owners use the [market dashboard](https://staging-admin.farmerlane.com/market). Customers use [central sign-in](https://staging-auth.farmerlane.com/account/login). Apply output includes the route for each account, with a channel selector for business owners. Cloudflare Access admission continues through the existing operator workflow. The account emails below are application identities. Demonstration names make no claim of trademark clearance.

| Source reference | Fictional vendor owner workspace | Login email | Logical ID | Products / variants |
| --- | --- | --- | --- | ---: |
| Manna Roots | Fern & Furrow Farm | `fern-furrow@fixtures.invalid` | `fern-furrow` | 18 / 18 |
| 9-1 Produce Farm | Golden Acre Produce | `golden-acre@fixtures.invalid` | `golden-acre` | 18 / 18 |
| Anna’s Kimchi | Red Jar Ferments | `red-jar@fixtures.invalid` | `red-jar` | 18 / 18 |
| Canyon Bakery Demo | Morning Hearth Bakery | `morning-hearth@fixtures.invalid` | `morning-hearth` | 18 / 18 |
| Cedar Creek Produce | Copperleaf Produce | `copperleaf@fixtures.invalid` | `copperleaf` | 18 / 18 |
| Grammies Crackers | Little Mill Crackers | `little-mill@fixtures.invalid` | `little-mill` | 18 / 18 |
| Hill Country Honey Demo | Amber Meadow Honey | `amber-meadow@fixtures.invalid` | `amber-meadow` | 18 / 18 |
| Hisco Apparel | Oakthread Goods | `oakthread@fixtures.invalid` | `oakthread` | 18 / 18 |
| Jake n Bake | Butterfield Bakes | `butterfield@fixtures.invalid` | `butterfield` | 18 / 18 |
| Last Watch Coffee | Early Finch Coffee | `early-finch@fixtures.invalid` | `early-finch` | 18 / 18 |
| Manna Tallow | Meadowcraft Naturals | `meadowcraft@fixtures.invalid` | `meadowcraft` | 18 / 18 |
| Mummy’s Macarons | Sugar Finch Macarons | `sugar-finch@fixtures.invalid` | `sugar-finch` | 18 / 18 |
| Norma Jean’s Greens | Greenhaven Gardens | `greenhaven@fixtures.invalid` | `greenhaven` | 18 / 18 |
| Priceless Honey | Honeycrest Apiary | `honeycrest@fixtures.invalid` | `honeycrest` | 18 / 18 |
| Pucker Up! | Citrus & Sprig | `citrus-sprig@fixtures.invalid` | `citrus-sprig` | 18 / 18 |
| Showbread Catering | Gathered Table Kitchen | `gathered-table@fixtures.invalid` | `gathered-table` | 18 / 18 |
| Smith Pastures | Briarfield Ranch | `briarfield@fixtures.invalid` | `briarfield` | 18 / 18 |
| Sunflour & Crumb | Wildgrain Bakery | `wildgrain@fixtures.invalid` | `wildgrain` | 18 / 18 |
| Tamales De Reina | Luna Masa Kitchen | `luna-masa@fixtures.invalid` | `luna-masa` | 18 / 18 |
| Texas Wild Seafood Demo | Blue Heron Seafood | `blue-heron@fixtures.invalid` | `blue-heron` | 18 / 18 |
| Twice Baked Cafe | Second Sunrise Cafe | `second-sunrise@fixtures.invalid` | `second-sunrise` | 18 / 18 |
| Willow & Grain Farmstead | Lark & Grain Farmstead | `lark-grain@fixtures.invalid` | `lark-grain` | 18 / 19 |
| Cedar Bend Farm | Briarstone Farm | `briarstone@fixtures.invalid` | `briarstone` | 1 / 1 |
| New onboarding account | Silver Meadow Farm | `silver-meadow@fixtures.invalid` | `silver-meadow` | 0 / 0 |

The populated vendors start with USD prices, one vendor-owned stock source, no allocations, and a 0% vendor default. Oakthread and Meadowcraft products have their collect-tax flag enabled so testers can inspect the setting against the existing zero-rate foundation. Red Jar and Citrus & Sprig include the `fermented` tag where applicable. Silver Meadow retains the provisioning defaults and empty catalog.

| Source reference | Account type and fictional workspace or name | Login email | Logical ID | Products / variants |
| --- | --- | --- | --- | ---: |
| Juniper Grove Farmers Market | Market owner, Orchard Lantern Market | `orchard-lantern-market@fixtures.invalid` | `orchard-lantern-market` | 0 / 0 |
| Boerne Farmers Market | Market owner, Foxglove Community Market | `foxglove-market@fixtures.invalid` | `foxglove-market` | 0 / 0 |
| Bulverde Market Day Demo | Market owner, Stonebrook Farmers Market | `stonebrook-market@fixtures.invalid` | `stonebrook-market` | 0 / 0 |
| New trial customer | Customer, Rowan Hale | `trial-customer-01@fixtures.invalid` | `trial-customer-01` | 0 / 0 |
| New onboarding customer | Customer, Iris Hale | `trial-customer-02@fixtures.invalid` | `trial-customer-02` | 0 / 0 |

The market owners receive standard workspace defaults and zero operational records. The customers receive central account access and no Admin workspace. Every ownership grant and simulated verification record is created through the existing account workflow.

## Fixture contract and recovery

The web generator reads the curated product pools and uses only generic product names and descriptions, pack sizes, minor-unit prices, fixture opening quantities, taxonomy mappings and logical photo keys. The centralized mapping supplies fictional business names, synthetic contact identities and new SKU and slug prefixes. The bundle includes no source IDs, custom JSON, local URLs, addresses, social links, logos, credential material, payments, orders, documents, application content or messages. Review new source copy and taxonomy mappings whenever regenerating the fixture. The fixture uses the curated definitions and excludes later edits to established businesses. Business profiles contain the new display name and native workspace defaults. Pack sizes use Vendure's existing single-dimension variant options. Pickup methods depend on market participation or a separately configured commerce context, so this release leaves them unset.

The versioned JSON is bundled with the existing backend Dockerfile using one explicit `.dockerignore` admission. It is 271,571 bytes as generated. Railway receives the cohort or logical IDs and a SHA-256 approval digest, with no large environment payload. From the web directory, use `--write` after reviewing a fixture revision to regenerate the backend artifact, then compare it with `--check`.

```powershell
node scripts/build-staging-catalog-fixture.cjs --check
```

Connected dry run verifies the target and release ledger, then plans against a PostgreSQL read-only snapshot. It reports proposed account and catalog creation or skip status, and conflicts in emails, business names, provisioning keys, slugs, SKUs, and taxonomy. Apply requires the same reviewed digest, and repeats the checks before opening an offline Vendure application context. Account provenance is written in the existing verification audit transaction. Each vendor catalog, opening stock operations, vendor tax setting, and catalog receipt commit together under a vendor lock. The catalog receipt records destination product and variant IDs. On replay, ownership and identity are verified and completed resources are skipped, preserving later tester edits and passwords. A failed vendor transaction can be rerun, including after an uncertain deployment result. There is no schema migration.

The job starts neither an HTTP listener nor a consumer for queues or recurring tasks. Existing domain writes may enqueue native search indexing and add normal provisioning, catalog, stock, and in-app inbox facts. Whole-cohort tests check the fixture format, and disposable qualification checks that the import creates no payment, provider, financial allocation, storefront or asset rows. The job starts with provider integrations disabled and receives no provider credentials. Jobs on the already-running worker continue independently. Its internal catalog inbox handler requires an active storefront or market listing, neither of which this job creates. The import emits no order or provider result facts.

## Temporary Railway job

Use the **backend** `farmers-market-platform` repository at the reviewed revision, root build context and existing `Dockerfile`. Create one temporary service in the existing **staging** environment using the reviewed release artifact. Disable automatic deploys and service restarts, use one replica and restart policy **Never**, and leave public networking, health checks, pre-deploy commands, volumes and cron unset. The CLI runs inside Railway and connects to the PostgreSQL private DNS. [Named account job pattern](STAGING_TEST_ACCOUNTS.md#run-once-in-railway-without-ssh) · [Database identity and runtime grants](STAGING_DEPLOYMENT_PHASE_B3_C_PREPARATION.md)

| Setting | Value |
| --- | --- |
| Deployment | `APP_ENV=production`, `NODE_ENV=production`, `DEPLOYMENT_ENV=staging`, `HOSTED_TRANSPORT=railway-private`. Railway supplies `RAILWAY_ENVIRONMENT_NAME=staging` and `RAILWAY_SERVICE_ID`. |
| Database | `DB_NAME=market_staging`, `DB_SCHEMA=public`, `DB_USERNAME=market_staging_runtime`, `DB_SYNCHRONIZE=false`. Reference the existing PostgreSQL private `*.railway.internal` hostname in `DB_HOST` and the configured `DB_PORT`. Reference or seal `DB_PASSWORD` for the runtime role. Match the existing `DB_TRANSPORT_POLICY` and supply the existing `DB_TLS_CA` if the transport is `verify-full`. |
| Existing bootstrap principal | Set `SUPERADMIN_USERNAME` to the configured staging bootstrap identity. The current bootstrap password is supplied inside the apply-only credential variable below. |
| App composition for apply | `PORT=3000`, `HOST=::`, `INTERNAL_API_ORIGIN=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000` using the API service's private reference, `TRUSTED_PROXY_CIDRS=disabled`, `STOREFRONT_PARENT_DOMAIN=farmerlane.com`. Use `API_ORIGIN=https://staging-api.farmerlane.com`, `ADMIN_ORIGIN=https://staging-admin.farmerlane.com`, `PLATFORM_ACCOUNT_ORIGIN=https://staging-auth.farmerlane.com`, `ASSET_URL_PREFIX=https://staging-api.farmerlane.com/assets/`, `CORS_ORIGINS=https://staging-admin.farmerlane.com`, `STAGING_TESTER_ACCESS=provisioned`, and `STAGING_ANONYMOUS_STOREFRONTS=published`. Match any approved current origin changes. The job generates ephemeral compatibility keys for its offline bootstrap. |
| Account plugin composition | `ENABLE_PAID_ATTRIBUTION=true` and `REFUND_POLICY_VERSION=staging-collection-disabled-v1` from the staging example. These load the schema modules required by unified login. Keep the refund operation flags false and provider credentials absent. The job starts no financial recovery task. |
| Provider isolation | Set `STRIPE_ENABLED=false` and `STRIPE_COLLECTION_SUSPENDED=true`. Keep email, SMS, communications, billing, POS, QuickBooks and file uploads disabled. Omit provider, mail, R2, document, live ingress, cookie and bridge credentials. |
| Apply-only sealed credentials | `FARMERLANE_TEST_DATA_JOB_CREDENTIALS` with `{"bootstrapPassword":"<current bootstrap password>","sharedPassword":"<operator-supplied trial password>"}`. Keep these in the approved vault and out of dry-run variables and logs. |
| Reviewed apply input | `FARMERLANE_TEST_DATA_CATALOG_DIGEST` set to the exact successful dry-run `digest` for the selected cohort or IDs. The commands below supply both opt-in flags only to this process. |

Set the custom start command for the trial dry run.

```sh
/bin/sh -c 'FARMERLANE_TEST_DATA_STAGING=true FARMERLANE_TEST_DATA_CATALOG=true exec node dist/test-data-catalog.js --cohort trial --dry-run'
```

Review the `status: dry-run` result and digest. Expect 4 new accounts and vendor catalogs of 18/18 and 18/19 products/variants on the first clean trial. `status: conflicts` exits 2. Review each logical ID, key and code before proceeding. An unrelated occupant requires changing the fictional definition in a reviewed revision or choosing a different selection. Leave the occupant untouched. A foundation or release ledger mismatch exits 1 and must be resolved through its existing staging workflow before retry.

Set the apply command after sealing the credentials and setting the reviewed digest.

```sh
/bin/sh -c 'FARMERLANE_TEST_DATA_STAGING=true FARMERLANE_TEST_DATA_CATALOG=true exec node dist/test-data-catalog.js --cohort trial --apply --approve "$FARMERLANE_TEST_DATA_CATALOG_DIGEST"'
```

Both commands accept `--accounts morning-hearth,lark-grain` in place of `--cohort trial`. The apply command must use the selection that produced the digest. Success exits 0 with `status: applied` and per-account creation or skip statuses. If an apply fails or the commit outcome is unclear, keep the revision, selection and credential handoff. Rerun dry run to see what committed and repeat the same approved apply after resolving the reported issue. Record the non-secret output and deployment ID. Remove the temporary service, deployment and scoped variables when acceptance is complete. Keep the release artifact and credentials in their existing approved storage.

## Manual acceptance

1. Run the connected staging dry run and review the account list against the expected 36 products and 37 variants. Confirm the four accounts are new fixtures or matching prior imports and there are no conflicts. Apply only after reviewing the identity mapping and digest.
2. Sign in as Morning Hearth and open **Products & Inventory**. Check 18 products, category assignments and variant prices. Sign in as Lark & Grain and check 18 products and 19 variants. Open Baby Spinach Bag and verify the 6 oz and 12 oz options, prices of $6.50 and $11.00, and opening stock of 36 and 24 respectively. Confirm inventory is available on the vendor's own location. In vendor settings check the display name and 0% default. Confirm the account has no connected Stripe mapping or market membership and can only access its own workspace.
3. Sign in as Orchard Lantern and confirm the empty market workspace and manager access. Sign in as Trial Customer 01 at central sign-in and confirm access to the customer account without a vendor, market or Platform workspace. Verify the owner accounts are barred from Platform privileges too.
4. Rerun the identical apply and expect skipped accounts and catalogs. Confirm earlier passwords still sign in, stock has not increased, and the same product and variant records are present. For another cohort, start with its own dry run and digest. Use `onboarding` for empty account testing and `curated` for the broader catalogs.

For local manual testing, use the backend's `npm.cmd run test-data:catalog:demo -- --cohort trial --dry-run`. It uses the guarded local demo environment and verifies `vendure_demo_market_ops`. To create dedicated trial fixtures locally, supply the credential variable to the temporary process using the approved vault and run `npm.cmd run test-data:catalog:demo -- --cohort trial --apply --approve <reviewed-local-digest>` with the actual digest substituted. Use the usual `demo:market-operations:serve`, `demo:market-operations:worker`, `demo:market-operations:admin`, and `demo:market-operations:storefront` scripts from the web checkout for manual sign-in. The local and hosted paths share the fixture definitions and domain commands. The named account password is supplied at execution in both cases.

## Verification and changed files

- `npm.cmd run build:server` passed. Offline smoke checks passed for the documented staging configuration, digest mismatch and production rejection.
- `npm.cmd run test:test-data` passed in guarded disposable PostgreSQL. The sample exercised two products with three variants, all three account types, simulated verification, native hashing, tenant isolation, an interrupted stock stage, and replay with a different supplied password. It checked the emitted outbox types and unchanged payment, provider, financial, storefront and asset counts. The harness dropped the successful database and retained isolated databases from failed iterations under its normal diagnostics policy.
- Connected read-only runs on `vendure_demo_market_ops` passed for `trial` (4 accounts, 36 products, 37 variants) and `curated` (22 accounts, 396 products, 397 variants). Both reported zero conflicts. The generator passed ESLint and reproduced the bundled fixture exactly.

Live Railway execution and hosted sign-in acceptance remain operator steps. No live staging changes or persistent local demo writes were performed.

- Backend `src/test-data-catalog.ts`, `src/test-data/catalog-{fixture,plan,apply}.ts`, `fixtures/staging-catalog-v1.json`, and the Dockerfile allowlist package and run the job. Existing Test Data Manager files and the foundational commerce check supply guarded reuse. `scripts/test-data-catalog-demo.ts` and `package.json` provide the dedicated local entry point. `test/market-operations/test-data.ts` adds disposable qualification.
- Web `scripts/build-staging-catalog-fixture.cjs` centralizes the mapping and writes reviewed definitions from `scripts/data/vendor-catalog.cjs`. This report is the operator runbook.

## Phase C handoff

Vendure creates real products and variants without any asset IDs or URLs. The bundle's `assetKey` names point to the existing curated photo manifest for operator review. Verify rights, bytes and asset ownership before using an authenticated fixture owner to upload media through the existing staging API. Resolve the Phase B keys to destination assets, products and vendor channels through their audited mappings. Establish storefront designs and hostnames only after checking publication readiness. Phase B leaves all storefronts, historical records, Stripe Sandbox state, private files and market operations untouched.
