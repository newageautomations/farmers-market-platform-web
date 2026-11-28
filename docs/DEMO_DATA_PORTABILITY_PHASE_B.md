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

Connected dry run verifies the target and release ledger, then plans against a PostgreSQL `REPEATABLE READ`, `READ ONLY` transaction. It reports proposed account and catalog creation or skip status, and conflicts in emails, business names, provisioning keys, slugs, SKUs, and taxonomy. Apply requires the same reviewed digest, repeats the checks, and requires an existing active bootstrap principal and both passwords before opening an offline Vendure application context. Account provenance is written in the existing verification audit transaction. Each vendor catalog, opening stock operations, vendor tax setting, and catalog receipt commit together under a vendor lock. The catalog receipt records destination product and variant IDs. On replay, ownership and identity are verified and completed resources are skipped, preserving later tester edits and passwords. A failed vendor transaction can be rerun, including after an uncertain deployment result. There is no schema migration.

The job starts neither an HTTP listener nor a consumer for queues or recurring tasks. Existing domain writes may enqueue native search indexing and add normal provisioning, catalog, stock, and in-app inbox facts. Whole-cohort tests check the fixture format, and disposable qualification checks that the import creates no payment, provider, financial allocation, storefront or asset rows. The job starts with provider integrations disabled and receives no provider credentials. Jobs on the already-running worker continue independently. Its internal catalog inbox handler requires an active storefront or market listing, neither of which this job creates. The import emits no order or provider result facts.

## Temporary Railway job

Use the **backend** `farmers-market-platform` repository at a reviewed revision that includes the startup correction below, with the repository root as the build context and the existing `Dockerfile`. Create one temporary service in the existing **staging** environment using the reviewed release artifact. Disable automatic deploys and service restarts, use one replica and restart policy **Never**, and leave public networking, health checks, pre-deploy commands, volumes and cron unset. The CLI runs inside Railway and connects to the PostgreSQL private DNS. [Named account job pattern](STAGING_TEST_ACCOUNTS.md#run-once-in-railway-without-ssh) · [Database identity and runtime grants](STAGING_DEPLOYMENT_PHASE_B3_C_PREPARATION.md)

| Setting | Value |
| --- | --- |
| Deployment | `APP_ENV=production`, `NODE_ENV=production`, `DEPLOYMENT_ENV=staging`, `HOSTED_TRANSPORT=railway-private`. Railway supplies `RAILWAY_ENVIRONMENT_NAME=staging` and `RAILWAY_SERVICE_ID`. |
| Job opt-in | `FARMERLANE_TEST_DATA_STAGING=true` and `FARMERLANE_TEST_DATA_CATALOG=true` on the temporary service for both modes. |
| Database | `DB_NAME=market_staging`, `DB_SCHEMA=public`, `DB_USERNAME=market_staging_runtime`, `DB_SYNCHRONIZE=false`. Reference the existing PostgreSQL private `*.railway.internal` hostname in `DB_HOST` and the configured `DB_PORT`. Reference or seal `DB_PASSWORD` for the runtime role. Match the existing `DB_TRANSPORT_POLICY` and supply the existing `DB_TLS_CA` if the transport is `verify-full`. |
| Provider isolation for both modes | Set `STRIPE_ENABLED=false` and `STRIPE_COLLECTION_SUSPENDED=true` on the temporary service. Keep email, SMS, communications, billing, POS, QuickBooks and file uploads disabled. Omit provider, mail, R2, document, live ingress, cookie and bridge credentials. |
| Existing bootstrap principal for apply | Set `SUPERADMIN_USERNAME` to the identifier of the existing active, verified bootstrap administrator in the destination database. Supply its current password in the sealed apply credential variable. |
| App composition for apply | `PORT=3000`, `HOST=::`, `INTERNAL_API_ORIGIN=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000` using the API service's private reference, `TRUSTED_PROXY_CIDRS=disabled`, `STOREFRONT_PARENT_DOMAIN=farmerlane.com`. Use `API_ORIGIN=https://staging-api.farmerlane.com`, `ADMIN_ORIGIN=https://staging-admin.farmerlane.com`, `PLATFORM_ACCOUNT_ORIGIN=https://staging-auth.farmerlane.com`, `ASSET_URL_PREFIX=https://staging-api.farmerlane.com/assets/`, `CORS_ORIGINS=https://staging-admin.farmerlane.com`, `STAGING_TESTER_ACCESS=provisioned`, and `STAGING_ANONYMOUS_STOREFRONTS=published`. Match any approved current origin changes. The job generates ephemeral compatibility keys for its offline bootstrap. |
| Account plugin composition for apply | `ENABLE_PAID_ATTRIBUTION=true` and `REFUND_POLICY_VERSION=staging-collection-disabled-v1` from the staging example. These load the schema modules required by unified login. Keep the refund operation flags false and provider credentials absent. The job starts no financial recovery task. |
| Apply-only sealed credentials | `FARMERLANE_TEST_DATA_JOB_CREDENTIALS` with `{"bootstrapPassword":"<current bootstrap password>","sharedPassword":"<operator-supplied trial password>"}`. Keep these in the approved vault and out of dry-run variables and logs. |

For dry run, set the deployment, job opt-in, database and provider isolation variables above. Leave `SUPERADMIN_USERNAME`, `SUPERADMIN_PASSWORD`, `FARMERLANE_TEST_DATA_JOB_CREDENTIALS` and the apply composition variables unset. Set the custom start command to this direct invocation.

```sh
node dist/test-data-catalog.js --cohort trial --dry-run
```

Review the `status: dry-run` result and digest. Expect 4 new accounts and vendor catalogs of 18/18 and 18/19 products/variants on the first clean trial. `status: conflicts` exits 2. Review each logical ID, key and code before proceeding. An unrelated occupant requires changing the fictional definition in a reviewed revision or choosing a different selection. Leave the occupant untouched. A foundation or release ledger mismatch exits 1 and must be resolved through its existing staging workflow before retry.

After reviewing the plan, set the apply variables above and seal the credential bundle. Replace `REVIEWED_DRY_RUN_DIGEST` with the exact 64-character `digest` from the successful dry run in the custom start command.

```sh
node dist/test-data-catalog.js --cohort trial --apply --approve REVIEWED_DRY_RUN_DIGEST
```

Both commands accept `--accounts morning-hearth,lark-grain` in place of `--cohort trial`. The apply command must use the selection that produced the digest. Success exits 0 with `status: applied` and per-account creation or skip statuses. A release without the shutdown correction can print `status: applied` and then exit 1. See [Apply shutdown correction](#apply-shutdown-correction). If an apply fails or the commit outcome is unclear, keep the revision, selection and credential handoff. Rerun dry run to see what committed and repeat the same approved apply after resolving the reported issue. Record the non-secret output and deployment ID. Remove the temporary service, deployment and scoped variables when acceptance is complete. Keep the release artifact and credentials in their existing approved storage.

### Hosted dry-run startup correction

The original CLI called `prepareTestDataDatabase()` before reaching the dry-run return. The shared preflight looked for an exact `SUPERADMIN_USERNAME` match joined to a verified, non-deleted user and a non-deleted administrator. If the query returned no row, the failure mapper emitted `TEST_DATA_BOOTSTRAP_REQUIRED`. Apply used the same code later in startup, after reading credentials. With no credential bundle, reaching the apply branch would instead have failed first with `TEST_DATA_JOB_CREDENTIALS_INVALID`. The exact state of the live principal row remains unverified.

The preflight did not change or remove environment variables. The compiled entry point parsed `--dry-run` as dry run. The job credential variable is read and deleted only in the apply branch, and the hosted path uses injected environment settings. The Dockerfile compiles the entry point to `/usr/src/app/dist/test-data-catalog.js` and copies the allowlisted fixture to `/usr/src/app/fixtures/staging-catalog-v1.json`. Its custom start command selects the catalog CLI in place of the default API command. Both command forms can reach the same preflight.

The catalog CLI now passes the parsed mode to database preflight. Dry run retains the opt-ins, private connection and destination identity checks, database role and migration ledger checks, and fixture and foundation validation. The bootstrap principal check runs for apply and continues to protect Vendure startup from creating or reviving the configured administrator. Apply also retains credential validation, bootstrap password and SuperAdmin role authorization, digest validation and tenant ownership safeguards. The separate Test Data Manager continues to use the apply preflight by default.

### Apply bootstrap principal diagnostic

The corrected hosted dry run succeeded. Apply with the approved digest and sealed bundle then failed with `TEST_DATA_BOOTSTRAP_REQUIRED` while the job had `SUPERADMIN_USERNAME=farmerlane_staging_admin`. That code comes from the apply preflight. It runs before the credential bundle is read and before Vendure starts, so the bootstrap and trial passwords played no part.

**How staging creates its administrators**

- **The bootstrap administrator.** Every API and worker start runs Vendure 3.8.2 `AdministratorService.ensureSuperAdminExists()`. It looks up a user by the *raw* configured `SUPERADMIN_USERNAME`.
  - If no user matches, it creates one through `UserService.createAdminUser()`, which stores the identifier trimmed (and lower-cased when it looks like an email) with `verified = true`. It also creates a native password method from `SUPERADMIN_PASSWORD`, an administrator named `Super Admin`, and the native `__super_admin_role__` grant.
  - If the user exists, it creates a missing administrator, clears `deletedAt` on a deleted administrator or user, and never changes the password, verification or role.
- **The named platform operator.** The initial operator comes from `test-data:init-staging-operator`. It is a separate native Vendure administrator with the SuperAdmin role and an email identifier. It is audited as `InitialStagingTestOperatorCreated` and signs in through unified login. It leaves `farmerlane_staging_admin` as the configured bootstrap user.
- **No project code alters these rows.** No project migration, plugin or account flow rewrites administrator identifiers, clears verification, soft-deletes a user or administrator, or removes the SuperAdmin grant. The only project `verified = false` write is for new checkout customer users, and it excludes administrators. Vendure's own Admin API can still update or delete an administrator or change its roles, and that was not ruled out.

**Finding: the gate matches native initialization. No implementation defect is confirmed.** The apply gate requires exactly what native bootstrap produces: an exact identifier match on a verified, non-deleted user with a non-deleted administrator. The existing compiled regression already passed this gate with a natively bootstrapped principal. The match must stay byte-exact. A case- or whitespace-insensitive match would pass the gate while Vendure's raw lookup still found nothing and created a second SuperAdmin during the job's offline bootstrap.

A working API with the same variable rules out a missing row only for the identifier that API deployment actually booted with. These live causes remain possible, and only a database read can tell them apart:

- The running API deployment uses a different value from the service's current or staged variables.
- The stored identifier differs by case or whitespace.
- The user is unverified.
- The user or administrator was deleted, or the administrator was detached, after the API last started.

The preflight reported all of these as the same generic code, so the hosted failure needs the diagnostic below before any correction can be chosen.

**Changes.** The gate's conditions are unchanged. It now uses a shared read-only classifier, and a failure carries a specific reason, for example `{"status":"failed","code":"TEST_DATA_BOOTSTRAP_REQUIRED","reason":"TEST_DATA_BOOTSTRAP_USER_UNVERIFIED"}`. The Test Data Manager CLI reports the same `reason`. A new diagnostic mode explains the gate without credentials.

The image currently deployed on `staging-catalog-job` predates this mode and rejects the flag with `TEST_DATA_CATALOG_USAGE`. Before running the diagnostic, commit and push this backend change, then rebuild that same temporary service from the reviewed revision that contains it. Don't redeploy the API or worker. Keep the deployment, job opt-in, database and provider isolation variables from the table above, and keep `SUPERADMIN_USERNAME` set to the value under investigation. `SUPERADMIN_PASSWORD`, `FARMERLANE_TEST_DATA_JOB_CREDENTIALS` and the apply composition variables are not needed and are never read. Set the custom start command, deploy once, and read the single JSON line.

```sh
node dist/test-data-catalog.js --diagnose-bootstrap
```

The diagnostic keeps every existing guard:

- the catalog opt-in and provider isolation
- the staging Railway identity and private connection
- the `market_staging` marker, runtime role and ledger privilege checks
- the complete migration ledger

It reads in a `REPEATABLE READ`, `READ ONLY` transaction and rolls back. It needs no password, performs no writes, does not load the Vendure configuration, and starts no HTTP listener, job consumer or provider client.

The output contains only reason codes, booleans and counts. It never includes the identifier, emails, names, hashes or passwords.

| Exit | Meaning |
| --- | --- |
| 0 | `TEST_DATA_BOOTSTRAP_ELIGIBLE` |
| 3 | The diagnostic completed with a blocking reason |
| 1 | A guard failed with its usual code, for example `HOSTED_DATABASE_IDENTITY_MISMATCH` |

```json
{"status":"bootstrap-diagnostic","target":"staging","reason":"TEST_DATA_BOOTSTRAP_USER_UNVERIFIED","preflight":"fail","applyAuthorization":"blocked","identifier":{"configured":true,"normalized":true,"emailLike":false},"principal":{"exactMatches":1,"similarIdentifiers":0,"userActive":true,"verified":false,"administrator":true,"administratorActive":true,"superAdminRole":true,"nativeAuthentication":true,"duplicateIdentifier":false},"otherEligibleAdministrators":{"total":1,"vendureBootstrapDefaults":0,"auditedStagingOperators":1}}
```

Each `principal` flag is reported independently for any exactly matching row, so a single run shows every failed condition. `reason` is the first condition, in the order of the table below, that stops one row from qualifying. `preflight` is the unchanged apply gate. `otherEligibleAdministrators` counts other verified, non-deleted native SuperAdmins with a password method:

- `vendureBootstrapDefaults`: still named `Super Admin`, for example a bootstrap user created under an earlier `SUPERADMIN_USERNAME`
- `auditedStagingOperators`: the audited initial named operator

To identify the right principal without listing accounts, rerun the diagnostic with `SUPERADMIN_USERNAME` set to a candidate the operator already knows, such as the value in the active API deployment or the vault entry for the named operator. The diagnostic confirms or rejects each candidate.

| Reason | Meaning | Safe next step |
| --- | --- | --- |
| `TEST_DATA_BOOTSTRAP_ELIGIBLE` | The gate passes. Apply continues to the SuperAdmin role and password checks inside Vendure. | Repeat the approved apply. If it then fails with `TEST_DATA_BOOTSTRAP_AUTHORIZATION_REQUIRED`, the sealed `bootstrapPassword` is not this principal's current password. Replace it from the vault entry for this principal. |
| `TEST_DATA_BOOTSTRAP_IDENTIFIER_MISSING` | `SUPERADMIN_USERNAME` is absent on the job. | Set it on the temporary service only. |
| `TEST_DATA_BOOTSTRAP_IDENTIFIER_UNNORMALIZED` | The value has surrounding whitespace, or is an email with capitals. Vendure stores the normalized form, but its startup lookup uses the raw value. | Correct the job variable to the stored normalized form. Do not apply with this value: bootstrap would create a new SuperAdmin. |
| `TEST_DATA_BOOTSTRAP_IDENTIFIER_MISMATCH` | No exact match exists, but `similarIdentifiers` users differ only by case or whitespace. | Find the exact spelling from the active API deployment variables or the vault, and set it on the job. |
| `TEST_DATA_BOOTSTRAP_USER_NOT_FOUND` | No user has this identifier or a near variant. Either the value is not the one the database was initialized with, or the administrator's email was changed through Admin since the API last started. | Check the variables of the API's **active deployment**, not only staged service variables. Rerun the diagnostic with that value or with the audited named operator's email. Do not redeploy the API to make Vendure create a new administrator. |
| `TEST_DATA_BOOTSTRAP_USER_DELETED` | The matching user is soft-deleted. | Stop. Use another eligible SuperAdmin if `otherEligibleAdministrators.total` is non-zero, and have an authorized SuperAdmin review the deletion. Never reactivate the user directly. |
| `TEST_DATA_BOOTSTRAP_USER_UNVERIFIED` | The matching user has `verified = false`, which native bootstrap never produces. | Stop and escalate for an audit of how the flag changed. Use another eligible principal meanwhile. Do not verify it directly. |
| `TEST_DATA_BOOTSTRAP_ADMINISTRATOR_MISSING` | The user exists, but no administrator is linked to it. | Stop and escalate. Do not create or relink an administrator. |
| `TEST_DATA_BOOTSTRAP_ADMINISTRATOR_DELETED` | The linked administrator is soft-deleted. | Stop and escalate, as for a deleted user. |
| `TEST_DATA_BOOTSTRAP_SUPERADMIN_ROLE_MISSING` | The gate passes, but the principal lacks the native SuperAdmin grant, so apply stops with `TEST_DATA_BOOTSTRAP_AUTHORIZATION_REQUIRED`. | Use an eligible SuperAdmin. Grant changes go through an authorized SuperAdmin in Admin, never direct row edits. |
| `TEST_DATA_BOOTSTRAP_NATIVE_AUTHENTICATION_MISSING` | The principal has no native password method, so password verification would fail. | Use another eligible principal. |

The audited named operator is a supported apply principal. Set the job's `SUPERADMIN_USERNAME` to its exact lower-case email, and put that operator's own vault password in `bootstrapPassword`. Vendure's offline bootstrap reuses that administrator and creates nothing. Change only the temporary service. Leave the API, worker, database rows, roles, permissions and Stripe settings unchanged. After acceptance, return the start command to apply or remove the service as described above.

## Manual acceptance

1. Run the connected staging dry run and review the account list against the expected 36 products and 37 variants. Confirm the four accounts are new fixtures or matching prior imports and there are no conflicts. Apply only after reviewing the identity mapping and digest.
2. Sign in as Morning Hearth and open **Products & Inventory**. Check 18 products, category assignments and variant prices. Sign in as Lark & Grain and check 18 products and 19 variants. Open Baby Spinach Bag and verify the 6 oz and 12 oz options, prices of $6.50 and $11.00, and opening stock of 36 and 24 respectively. Confirm inventory is available on the vendor's own location. In vendor settings check the display name and 0% default. Confirm the account has no connected Stripe mapping or market membership and can only access its own workspace.
3. Sign in as Orchard Lantern and confirm the empty market workspace and manager access. Sign in as Trial Customer 01 at central sign-in and confirm access to the customer account without a vendor, market or Platform workspace. Verify the owner accounts are barred from Platform privileges too.
4. Rerun the identical apply and expect skipped accounts and catalogs. Confirm earlier passwords still sign in, stock has not increased, and the same product and variant records are present. For another cohort, start with its own dry run and digest. Use `onboarding` for empty account testing and `curated` for the broader catalogs.

For local manual testing, use the backend's `npm.cmd run test-data:catalog:demo -- --cohort trial --dry-run`. It uses the guarded local demo environment and verifies `vendure_demo_market_ops`. To create dedicated trial fixtures locally, supply the credential variable to the temporary process using the approved vault and run `npm.cmd run test-data:catalog:demo -- --cohort trial --apply --approve <reviewed-local-digest>` with the actual digest substituted. Use the usual `demo:market-operations:serve`, `demo:market-operations:worker`, `demo:market-operations:admin`, and `demo:market-operations:storefront` scripts from the web checkout for manual sign-in. The local and hosted paths share the fixture definitions and domain commands. The named account password is supplied at execution in both cases.

## Verification and changed files

The startup regression ran against disposable PostgreSQL 17.10 on an isolated Docker network with the staging database identity, private DNS, runtime role, release ledger and commerce foundation.

- The original compiled CLI exited 1 with `TEST_DATA_BOOTSTRAP_REQUIRED` under both the shell-wrapped and direct start commands. The supplied username had no matching active principal. Both passwords were omitted.
- With the correction, both command forms returned the same successful trial plan and 64-character approval digest. The plan had 4 new accounts, 36 products, 37 variants and no conflicts. Omitting `SUPERADMIN_USERNAME` entirely returned the same result. Full PostgreSQL dump hashes matched before and after the dry runs and rejected apply attempts.
- Compiled apply rejected missing credentials with a valid principal and reviewed digest. It also rejected a missing principal and an incorrect digest. Dry run rejected absent authorization from either opt-in and a mismatched database identity marker.
- `npm.cmd run build:server`, the full backend build with an explicit development environment, and the fixture generator's `--check` passed. The original Dockerfile `release` stage packaged and ran both compiled builds without bind mounts. The regular offline Docker build stopped at `npm ci` because required registry packages were unavailable to it. The release-stage test used locally compiled server output and cached Linux runtime dependencies supplemented with lockfile-matched packages already installed locally.

The startup correction changes four files.

- Backend `src/test-data-catalog.ts` passes the parsed command mode to `src/test-data/database.ts`, which gates the bootstrap principal query on apply.
- Backend `test/database-startup/release-smoke.ps1` adds the focused `-CatalogOnly` regression. From the backend root, run it with a current release image and the cached `postgres:17.10-bookworm` image.
- Web `docs/DEMO_DATA_PORTABILITY_PHASE_B.md` records the cause, corrected Railway commands and verification.

```powershell
docker build --target release -t farmers-catalog-startup:local .
pwsh -NoProfile -File test/database-startup/release-smoke.ps1 -CatalogOnly -BackendImage farmers-catalog-startup:local
```

### Bootstrap principal diagnostic verification

The extended `-CatalogOnly` regression reproduces the original staging initialization on disposable PostgreSQL 17.10 with the staging marker, private DNS, runtime role, restricted ledger and commerce foundation. Native `bootstrapWorker()` creates the bootstrap administrator from `SUPERADMIN_USERNAME`. The audited named operator is then provisioned through the same `initializeStagingOperator()` path that `init-staging-operator` uses. The cases below ran through the compiled `dist/test-data-catalog.js` with locally built output mounted on the cached Linux runtime image `farmers-catalog-runtime:local`. PowerShell 7.7 was installed for the run.

```powershell
npm.cmd run build:server
pwsh -NoProfile -File test/database-startup/release-smoke.ps1 -CatalogOnly -MountLocalBuild -BackendImage farmers-catalog-runtime:local
```

| Case | Diagnostic reason and exit | Apply result |
| --- | --- | --- |
| Correctly initialized bootstrap administrator | `ELIGIBLE`, exit 0. One other eligible SuperAdmin, the audited operator. | With the correct identifier but a wrong `bootstrapPassword`, apply exits 1 with `TEST_DATA_BOOTSTRAP_AUTHORIZATION_REQUIRED`. Administrator and SuperAdmin grant counts are unchanged. |
| Unset identifier | `IDENTIFIER_MISSING`, exit 3. Two other eligible SuperAdmins. | Not run. |
| Missing bootstrap administrator | `USER_NOT_FOUND`, exit 3. | `TEST_DATA_BOOTSTRAP_REQUIRED` with the same reason. |
| Case variant of a non-email identifier | `IDENTIFIER_MISMATCH`, exit 3. | Rejected with the same reason. |
| Leading whitespace | `IDENTIFIER_UNNORMALIZED`, exit 3. | Not run. |
| Upper-case named operator email | `IDENTIFIER_UNNORMALIZED`, exit 3. | Rejected with the same reason. |
| Unverified user | `USER_UNVERIFIED`, exit 3. | Rejected with the same reason. |
| Deleted user | `USER_DELETED`, exit 3. | Rejected with the same reason. |
| Deleted administrator | `ADMINISTRATOR_DELETED`, exit 3. | Rejected with the same reason. |
| Detached administrator | `ADMINISTRATOR_MISSING`, exit 3. | Rejected with the same reason. |
| SuperAdmin grant removed | `SUPERADMIN_ROLE_MISSING`, exit 3. Preflight `pass`. | Passes preflight, then exits 1 with `TEST_DATA_BOOTSTRAP_AUTHORIZATION_REQUIRED` and no principal changes. |
| Valid named platform operator | `ELIGIBLE`, exit 0. | A wrong password is rejected. With its own password, apply created all 4 trial accounts and both catalogs. Exactly one user with the operator identifier, one `Super Admin` administrator and the original two SuperAdmin grants remain. |

Each state was set up on the disposable database only and restored after use.

- **Independent facts.** For every failing state, the diagnostic reported only the altered fact as `false` and every other principal fact as `true`.
- **Read-only.** Every diagnostic matched the full `pg_dump` hash taken immediately before it.
- **Guards.** The diagnostic still rejected a disabled catalog opt-in, an enabled provider flag, extra selection arguments and a production identity marker. The existing dry-run, digest, opt-in and credential assertions still pass.
- **No disclosure.** No diagnostic or apply output contained either password, a bcrypt hash, the bootstrap identifier or the operator email.
- **Credential handling.** The regression passes the credential bundle from the host environment rather than as a container argument.

The backend `tsc --noEmit`, `npm.cmd run build:server` and the full `npm.cmd run build` with `APP_ENV=dev` and `NODE_ENV=development` passed. The full build re-emitted the generated `src/gql/graphql-env.d.ts`, and that unrelated change was reverted. The harness typecheck reported only existing errors in the unchanged `scripts/market-operations-demo/storefront-shop-fixture.ts`. No other suites or browser automation ran. The live database, API, worker, credentials, permissions and Stripe settings were not touched, and nothing was pushed or deployed.

#### Apply shutdown correction

**Defect.** This is a separate, pre-existing defect that the positive apply exposed. It does not involve bootstrap authorization. After committing and printing `status: applied`, the compiled apply exited 1 in every positive run with an uncaught `Connection not available` from Vendure's `SqlJobQueueStrategy.add`.

**Cause.** The job called `app.close()` immediately after its last transaction. Committed product and variant writes publish native events, and Vendure 3.8.2 `CollectionService` debounces those events by 50 ms before enqueuing `apply-collection-filters`. Closing destroyed the job queue connection first. The late enqueue then failed as an unhandled rejection, and that queued work was lost for the running worker.

**Fix.** Before closing, `runCatalogJob()` now waits until no new `job_record` row appears for three consecutive 200 ms samples. The wait is bounded at 15 seconds. It runs on success and failure paths alike. The context still starts no job consumers, so the queued work stays pending for the existing staging worker.

**Verification.** In repeated compiled runs, the named operator apply exited 0 with no queue error. Each run persisted 2 `apply-collection-filters` jobs and 146 `update-search-index` jobs, all still `PENDING`. The regression now requires a clean exit and a newly persisted collection filter job.

**Earlier releases.** If a release without this correction printed `status: applied` and then exited 1:

1. Treat the import as committed.
2. Rerun dry run to confirm `skip` statuses. Do not repeat the import with different inputs.
3. Check collection membership and search for the imported products. If they are missing, rebuild the search index through the existing Admin.

Changed files:

| Repository | File | Change |
| --- | --- | --- |
| Backend | `src/test-data/database.ts` | Adds the shared read-only classifier and the credential-free diagnostic. The apply gate keeps its exact predicate and now reports `TEST_DATA_BOOTSTRAP_REQUIRED:<reason>`. |
| Backend | `src/test-data-catalog.ts` | Adds `--diagnose-bootstrap` after the existing environment authorization, the `reason` output field and the exit code 3 mapping. Waits for deferred native enqueues before closing the apply context. |
| Backend | `src/test-data/catalog-fixture.ts` | Parses the diagnostic as a standalone mode. |
| Backend | `scripts/test-data-catalog-demo.ts` | Uses the same exit mapping locally. |
| Backend | `src/test-data.ts` | Reports `reason` for the Test Data Manager CLI. |
| Backend | `test/database-startup/release-smoke.ps1` | Adds the principal state matrix, named operator provisioning, apply checks, and the clean-exit and queued-work assertions to the focused `-CatalogOnly` regression. |
| Web | `docs/DEMO_DATA_PORTABILITY_PHASE_B.md` | Records this report. |

### Original Phase B qualification

- `npm.cmd run build:server` passed. Offline smoke checks passed for the documented staging configuration, digest mismatch and production rejection.
- `npm.cmd run test:test-data` passed in guarded disposable PostgreSQL. The sample exercised two products with three variants, all three account types, simulated verification, native hashing, tenant isolation, an interrupted stock stage, and replay with a different supplied password. It checked the emitted outbox types and unchanged payment, provider, financial, storefront and asset counts. The harness dropped the successful database and retained isolated databases from failed iterations under its normal diagnostics policy.
- Connected read-only runs on `vendure_demo_market_ops` passed for `trial` (4 accounts, 36 products, 37 variants) and `curated` (22 accounts, 396 products, 397 variants). Both reported zero conflicts. The generator passed ESLint and reproduced the bundled fixture exactly.

The corrected revision has only been exercised locally. Hosted sign-in acceptance and verification of the corrected command in Railway remain operator steps.

- Backend `src/test-data-catalog.ts`, `src/test-data/catalog-{fixture,plan,apply}.ts`, `fixtures/staging-catalog-v1.json`, and the Dockerfile allowlist package and run the job. Existing Test Data Manager files and the foundational commerce check supply guarded reuse. `scripts/test-data-catalog-demo.ts` and `package.json` provide the dedicated local entry point. `test/market-operations/test-data.ts` adds disposable qualification.
- Web `scripts/build-staging-catalog-fixture.cjs` centralizes the mapping and writes reviewed definitions from `scripts/data/vendor-catalog.cjs`. This report is the operator runbook.

## Phase C handoff

Vendure creates real products and variants without any asset IDs or URLs. The bundle's `assetKey` names point to the existing curated photo manifest for operator review. Verify rights, bytes and asset ownership before using an authenticated fixture owner to upload media through the existing staging API. Resolve the Phase B keys to destination assets, products and vendor channels through their audited mappings. Establish storefront designs and hostnames only after checking publication readiness. Phase B leaves all storefronts, historical records, Stripe Sandbox state, private files and market operations untouched.
