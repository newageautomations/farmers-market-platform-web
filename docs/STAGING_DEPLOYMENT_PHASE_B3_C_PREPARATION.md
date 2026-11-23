# Phase B3 database release coordination and Railway preparation

The initial staging release uses a dedicated, temporary migration service. The API and worker verify the exact migration history before serving requests or taking jobs. The backend release image supplies all three entry points and the storefront hostname operator command. The web project supplies a shared Dockerfile for the Admin and storefront images and a separate Dockerfile for the private gateway.

The prior reports document the application contracts carried forward here. [Deployment audit](./STAGING_DEPLOYMENT_AUDIT.md), [Phase B1 staging policy](./STAGING_DEPLOYMENT_PHASE_B1.md), [Phase B2 ingress and tenant routing](./STAGING_DEPLOYMENT_PHASE_B2.md).

| Local files | Change |
| --- | --- |
| Backend `src/database-options.ts`, `src/database-migrations.ts`, `src/hosted-database.ts`, `src/migrate-hosted.ts`, `src/index.ts`, `src/index-worker.ts`, `src/production-http.ts` | Shared database configuration, compiled release command, guarded migration, and application startup checks. |
| Backend `Dockerfile`, `package.json`, `src/register-storefront-hostname.ts`, `scripts/register-storefront-hostname.ts`, and staging database examples | Non-root backend image, compiled operator entry point, and documented runtime login and transport. |
| Backend `src/vendure-config.ts` and documents-compliance `service.ts` and `storage.ts` | Staging asset and document writes disabled before durable storage is provisioned. |
| Backend `test/database-startup/hosted.ts` and `test/database-startup/release-smoke.ps1` | Disposable PostgreSQL 17 and isolated Linux verification. |
| Web `Dockerfile`, `Dockerfile.gateway`, `.dockerignore`, `.gitattributes`, npm manifest and lockfile, and frontend build example | Frontend and gateway packaging with public-only build inputs and the production launcher dependency. |
| Web `scripts/run-hosted-gateway.sh`, `scripts/hosted-gateway.mjs`, and `scripts/test-gateway-release.ps1` | Gateway supervision, runtime validation, loopback probe, and offline verification. |

## Database release contract

From the compiled backend image, the migration owner runs:

```text
npm run migrate:hosted -- staging market_staging
```

Railway uses the equivalent direct Node command so the process receives termination signals. The migration command requires `APP_ENV=production`, `NODE_ENV=production`, `DEPLOYMENT_ENV=staging`, and `HOSTED_TRANSPORT=railway-private`. Its explicit stage and database arguments must match the injected fields. Staging accepts only `market_staging`, schema `public`, and the `market_staging_migrator` login. The production contract uses `production`, `market_production`, and the corresponding production roles and database marker. Provision production separately when that environment is authorized.

The connection uses individual fields and the approved transport policy. PostgreSQL confirms the database name, current schema, login, effective role, major version 17 for staging, and database-owner marker `farmers-market:staging` on the same connection used for migrations. The checks reject development, demo, and disposable database names before connecting. The only accepted database destinations are private `<service>.railway.internal` DNS names. Separate Railway projects, separate roles and secrets, private DNS, restricted database access, and a database-owner-controlled marker enforce the staging boundary together.

The existing PostgreSQL advisory lock serializes migration and startup checks. TypeORM runs the native Vendure 3.7.3 baseline first, followed by the platform migrations and the subsequent Vendure upgrade. The two existing migrations with timestamp `1796500000000` have a deterministic order: VendorManagedMarkets, then StripeConnectAccounts. Each migration keeps its established transaction behavior. The runner verifies the ordered ledger before and after applying changes. A new target must have an empty application schema. A repeat run reports `hosted_migration_complete` with `applied:0`. The connection and lock close on success or failure. A 30-second lock timeout, 120-second per-statement timeout, and five-minute process deadline bound execution. Unhandled raw database exception text is suppressed in the hosted migration path.

Hosted startup uses `market_staging_runtime` and checks the ledger under the same lock. The runtime role has read-only access to the migration ledger and cannot create in `public` or assume the migration role. Pending migrations are reported as `DATABASE_MIGRATIONS_PENDING` with the first required migration. Duplicate, missing, out-of-order, or unrecognized history fails as `DATABASE_MIGRATION_HISTORY_INCOMPATIBLE`. An older artifact refuses a newer ledger even when its own migrations are all present. Both programs exit before Vendure bootstraps in these cases. The API listener and readiness open after startup verifies the schema. The worker starts consumption after verification and Vendure bootstrap. Its logs supply the startup signal. Ordinary development, test, and disposable local qualification retain their existing startup and migration workflows.

## PostgreSQL 17 provisioning

Use a single private `postgres` service sourced from the official `postgres:17.10-bookworm` image. Use a persistent Railway volume mounted at `/var/lib/postgresql/data`, with `PGDATA=/var/lib/postgresql/data/pgdata`. Use TCP 5432 and the private DNS name exposed by `RAILWAY_PRIVATE_DOMAIN`. The container's initial `POSTGRES_USER` is `postgres`, `POSTGRES_DB` is `market_staging`, and `POSTGRES_PASSWORD` is a generated credential used only for provisioning and break-glass recovery.

Use PostgreSQL password authentication with independent random passwords for the migrator and runtime roles. For this initial service, `DB_TRANSPORT_POLICY=plaintext-private` means PostgreSQL uses its native private endpoint inside the same Railway WireGuard network. Keep the public TCP proxy disabled. If using direct TLS, first qualify a PostgreSQL certificate that matches the private DNS name, then configure `DB_TRANSPORT_POLICY=verify-full` and the trusted PEM in `DB_TLS_CA` on all database clients. Confirm private IPv4 and IPv6 reachability before starting application traffic. API and worker each default to a max pool of 10 connections. Allow for both pools, the single migration connection, backups, and separate operator and recovery headroom. Use the direct PostgreSQL endpoint so advisory locking stays session-bound. [Railway private networking](https://docs.railway.com/networking/private-networking), [Railway database service setup](https://docs.railway.com/databases/build-a-database-service).

Open an authorized psql session to the private service, then explicitly connect to the new database. From Railway SSH into the PostgreSQL service, use `psql -X -U postgres -d market_staging`. Confirm `SELECT current_database(), current_user;` and `SHOW server_version;` before initialization. Run this only on the new staging database, as its PostgreSQL owner:

```sql
REVOKE ALL ON DATABASE market_staging FROM PUBLIC;
COMMENT ON DATABASE market_staging IS 'farmers-market:staging';
CREATE ROLE market_staging_migrator LOGIN;
CREATE ROLE market_staging_runtime LOGIN;
GRANT CONNECT ON DATABASE market_staging TO market_staging_migrator, market_staging_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO market_staging_migrator;
GRANT USAGE ON SCHEMA public TO market_staging_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE market_staging_migrator IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO market_staging_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE market_staging_migrator IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO market_staging_runtime;
\password market_staging_migrator
\password market_staging_runtime
```

Use the interactive psql password prompts so these passwords stay out of command arguments and SQL history. Generate each secret independently with `node -p "require('node:crypto').randomBytes(32).toString('hex')"` or a password manager. Store the values in the owner's secret manager and the designated Railway service variables.

The migrator owns the schema objects it creates, including tables, sequences, functions, triggers, and the migration ledger. It needs schema creation privileges inside `public`. Neither application role needs database ownership, superuser, replication, role creation, database creation, or bypass-RLS privileges. The runtime role uses normal Vendure and platform table DML, sequence access, and the normal function execution needed by the schema. After the first successful migration, restrict the ledger before starting the API or worker:

```sql
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.migrations FROM market_staging_runtime;
REVOKE ALL ON SEQUENCE public.migrations_id_seq FROM market_staging_runtime;
SELECT id, timestamp, name FROM public.migrations ORDER BY id;
```

Check the compiled artifact and ledger together. The first case in the ledger must be `NativeVendure3731790829659203`. TypeORM applies the remaining release migrations before the first native Vendure bootstrap initializes application defaults, including the configured superadministrator. The initial environment has no copied databases, fixtures, or test account seeding. A later hostname operator can use a separate login with CONNECT, schema USAGE, registry column SELECT, and hostname column UPDATE only. Its approved scope and syntax are in the Phase B2 report. The compiled equivalent is `npm run storefront:register-hostname:release -- market_staging vendor <storefront-key> <hostname>`.

## Release ownership and ordering

Railway's API pre-deploy command can access private networking and the new image, and a failure blocks the API deployment. It runs while the old API may still be present and shares the API service's variables. Use a temporary service named `migration` instead. This gives the one-off process exclusive access to the migration role's password, keeps a suspended release isolated, and allows the migration to run before the public origins are known. Leave the API and worker pre-deploy fields blank. [Railway pre-deploy lifecycle](https://docs.railway.com/deployments/pre-deploy-command).

Record a release entry in the owner's operational log with the staging project and environment, backend SHA, web SHA, expected last migration name, dependency lockfiles and Dockerfile revisions, database backup reference, and each Railway deployment ID. Select reviewed commits that contain the work from both repositories. Keep the corresponding release branches fixed for the duration of the release. The temporary migration service, API, and worker use the same backend SHA and Dockerfile, Node base digest, lockfile, architecture, and build context. Railway may build them separately. Record the SHA and build inputs for each. Capture the frontend public build variables and gateway binary tags in the same release record.

For the first release, run the migration after initializing the empty database roles. Wait for exit 0 and `hosted_migration_complete`, verify the ledger, and apply the ledger privilege restrictions. Remove the temporary migration deployment and service and discard its Railway copy of the password. Use `ALTER ROLE market_staging_migrator NOLOGIN` between maintenance windows if the DBA will re-enable it before the next migration. Deploy the API and require readiness, then start and verify the worker. Promote Admin and Astro after those gates and deploy the gateway only with the approved Phase D settings.

Before a later schema-changing release, close edge admission and stop the gateway. Quiesce incoming writes, let active work complete, stop the API and worker, and confirm that their old deployments and DB sessions have ended. Check active jobs and scheduler/reconciliation status before shutdown. Disable automatic redeploys and abort queued releases. Take the pre-release backup after draining and before migrating. The startup check protects processes starting during a migration. Stopping old processes closes the gap for processes already running.

## Backup and recovery

Enable Railway volume backups before storing staging data. Start with daily backups plus a pre-release backup for each schema or data-changing migration, including any release with uncertain effects. Record a minimum retention target of seven daily recovery points and retain the separately encrypted pre-release logical dump until the release is accepted and the rollback window closes. Confirm actual plan backup retention and quota in the Railway dashboard. Confirm that a backup completed and can be restored separately before treating it as a recovery point. For an empty first installation, record the verified empty database and role definitions, then take an initial recovery point after migration and first bootstrap. [Railway volume backups](https://docs.railway.com/volumes/backups), [PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html).

For a portable backup from an authorized PostgreSQL 17 client, open a loopback SSH port forward to the private PostgreSQL service as described below. Run `pg_dump -h 127.0.0.1 -p 55432 -U postgres -W --format=custom --file=<protected-backup-file> --dbname=market_staging`. Supply the password at the prompt. Record the marker and exact procedure for recreating roles and grants separately from the dump. Encrypt the dump and restrict access.

If a migration fails, keep the API, worker, and dependent frontend release stopped. Inspect the exit code, logs, and ordered ledger using authorized read-only access. Earlier successful migrations can remain committed. The failing migration rolls back its open transaction and receives no ledger entry. The exact-history gates reject both a new artifact that still needs the failed migration and any older artifact expecting fewer migrations. If the failure has a safe operational fix, apply that fix and rerun the reviewed migration owner. Use a reviewed forward fix or recover separately if the schema or data requires repair. Preserve the failed state for diagnosis. Escalate an incompatible history rather than manually changing the ledger to bypass it.

Rolling back the application is supported when the previous release expects the same complete migration ledger and the associated data contract is compatible. A rollback to an artifact expecting fewer migrations requires operator recovery. Restore the pre-release backup into a **separate isolated PostgreSQL 17 target and volume**. Keep the recovery target private and unreferenced by staging until validated. Recreate the original roles and use the recorded database name and marker. For a logical restore, use `pg_restore --exit-on-error --dbname=market_staging <protected-backup-file>` as the authorized owner on the empty recovery database, with the restored roles available. Verify owners, grants, ledger, data and application readiness against the matching release. Change the private database reference only after approving the recovery target. Preserve the failed database and its backup. Railway application rollback restores application state for that deployment, so recover PostgreSQL separately. [Railway deployment actions](https://docs.railway.com/deployments/deployment-actions), [PostgreSQL 17 pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).

When durable object storage is implemented, save database and object versions at a coordinated point, preserve encryption keys and object-store permissions separately, and verify that restored metadata resolves to the correct private and public objects before reopening traffic. Exercise a full restore and access check during hosted qualification.

## Railway service matrix

Use one staging project and environment, one region, and one replica for every service. Leave each service's public networking section empty. Configure the deployment settings in the dashboard. The Dockerfiles define the build, so leave Railway's custom build and pre-deploy command fields blank. Use the repository root `/` for every GitHub service. The backend GitHub repository is `farmers-market-platform`, and the web repository is `farmers-market-platform-web`. [Railway Dockerfile builds](https://docs.railway.com/builds/dockerfiles), [Railway deployment health checks](https://docs.railway.com/deployments/healthchecks).

Set deployment overlap to zero and the drain window to 40 seconds for API, worker, Admin, Astro and gateway, and 60 seconds for PostgreSQL. Use the service teardown settings or `RAILWAY_DEPLOYMENT_OVERLAP_SECONDS=0` and `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` with those values. The Railway default drain time is zero. [Railway deployment teardown](https://docs.railway.com/deployments/deployment-teardown).

| Service | Source and Dockerfile | Start command | Port and health | Restart, storage, dependencies |
| --- | --- | --- | --- | --- |
| `postgres` | Docker Hub `postgres:17.10-bookworm` | Image default entrypoint and `postgres` command | Private TCP `5432`. No Railway HTTP check. Verify in service with `pg_isready -h 127.0.0.1 -p 5432 -d market_staging`. | On Failure, 3 retries. DB volume only. |
| `migration` (temporary) | Backend GitHub repository, `Dockerfile`, same approved backend revision and inputs as API and worker | `node dist/migrate-hosted.js staging market_staging` | No listener or HTTP check. Verify exit status, completion event, and ledger. | Never restart. No volume. Private PostgreSQL. Remove after successful qualification. |
| `api` | Backend GitHub repository, `Dockerfile` | `node dist/index.js` | `PORT=3000`, `HOST=::`, Railway `/health/ready` with 180-second timeout. | On Failure, 3 retries. No volume. Private PostgreSQL. Receives gateway and Astro traffic. |
| `worker` | Backend GitHub repository, `Dockerfile` | `node dist/index-worker.js` | No listener. Leave `PORT` and Railway HTTP check unset. Require `worker_started`. | On Failure, 3 retries. No volume. Private PostgreSQL. |
| `admin` | Web GitHub repository, `Dockerfile`, `MARKET_WEB_APP=admin` | `node --import tsx scripts/serve-admin.ts` | `PORT=4322`, `HOST=::`, Railway `/health/ready` with 120-second timeout. | On Failure, 3 retries. No volume. Gateway ingress. Browser uses public API origin through the tunnel once qualified. |
| `storefront` | Web GitHub repository, `Dockerfile`, `MARKET_WEB_APP=storefront` | `node --import tsx scripts/start-storefront.ts` | `PORT=4321`, `HOST=::`, Railway `/health/ready` with 120-second timeout. | On Failure, 3 retries. No volume. Gateway ingress and private API for SSR, accounts, and tenant resolution. |
| `gateway` | Web GitHub repository, `Dockerfile.gateway` | `bash scripts/run-hosted-gateway.sh` | Caddy `127.0.0.1:8080`, connector metrics `127.0.0.1:20241`. No Railway HTTP check or public listener. | On Failure, 3 retries. No volume. Private Admin, Astro, and API. Outbound named Tunnel connectivity in Phase D. |

The backend image runs as the unprivileged Node user. It includes the compiled API, worker, migration and hostname operator entry points, checked-in migrations, production dependencies, and the static email templates. Both web images build with the pinned Node base and npm lockfile. The image stages package the selected app's production output, shared workspace packages, production dependencies including `tsx`, and the existing hardened launcher. They preserve the SPA fallback, Astro SSR, security headers, build/runtime verification, readiness and bounded shutdown. GraphQL contracts come from the checked-in generated source.

The gateway copies Caddy 2.11.7 and cloudflared 2026.10.1 from their pinned release tags. It runs them as an unprivileged user under a Bash supervisor using Docker's documented `wait -n` pattern. The wrapper validates the stage, exact first-level hosts, distinct ingress credentials and private destinations. It forwards SIGTERM to both children on termination or peer failure, bounds the drain to 35 seconds, and returns nonzero on unexpected process exit. Caddy binds only to loopback, keeps the admin API disabled, and uses the existing Phase B2 Access-header checks, request sanitization and upstream credentials.

Use `node scripts/hosted-gateway.mjs probe` inside the gateway container for Caddy readiness. In Phase D, check cloudflared separately with `node -e "fetch('http://127.0.0.1:20241/ready').then(r=>{console.log(r.status);process.exitCode=r.ok?0:1})"`. Require 200 for Tunnel connectivity and verify operator admission and end-to-end routing independently. The named, remotely managed Tunnel supplies exact hostname rules, operator-only Access, connector-side Access assertion validation for the correct team and per-host audience, and a terminal `http_status:404`. Preserve edge HTTPS and cache bypass while qualifying. [Docker process supervision](https://docs.docker.com/engine/containers/multi-service_container/), [Cloudflare Tunnel parameters](https://developers.cloudflare.com/tunnel/reference/run-parameters/), [Cloudflare origin Access settings](https://developers.cloudflare.com/tunnel/reference/origin-parameters/).

## Variables and secrets

Use the example files in the backend and frontend repositories for the public/runtime split. Substitute the reviewed temporary domain for every `<domain>`. Put resolved private origins, all credentials, and provider configuration only in runtime variables. The Dockerfiles declare only the frontend build selector and public build settings as build arguments. Database access is runtime-only. [Railway variables and references](https://docs.railway.com/variables), [Railway Dockerfile build arguments](https://docs.railway.com/builds/dockerfiles).

| Scope | Required settings |
| --- | --- |
| PostgreSQL | `POSTGRES_USER=postgres`, `POSTGRES_DB=market_staging`, generated `POSTGRES_PASSWORD`, `PGDATA=/var/lib/postgresql/data/pgdata`. Create the migrator and runtime credentials via the SQL procedure. |
| Migration, API, worker | `APP_ENV=production`, `NODE_ENV=production`, `DEPLOYMENT_ENV=staging`, `DB_HOST=${{postgres.RAILWAY_PRIVATE_DOMAIN}}`, `DB_PORT=5432`, `DB_NAME=market_staging`, `DB_SCHEMA=public`, `DB_SYNCHRONIZE=false`, and `DB_TRANSPORT_POLICY=plaintext-private` for the initial topology. For qualified `verify-full`, supply `DB_TLS_CA`. |
| Migration only | `HOSTED_TRANSPORT=railway-private`, `DB_USERNAME=market_staging_migrator`, its own `DB_PASSWORD`. This service needs no app origins, ports or provider keys. |
| API and worker | `DB_USERNAME=market_staging_runtime`, runtime `DB_PASSWORD`, `DB_POOL_MAX=10`, `API_ORIGIN=https://api.<domain>`, `ADMIN_ORIGIN=https://admin.<domain>`, `PLATFORM_ACCOUNT_ORIGIN=https://auth.<domain>`, `ASSET_URL_PREFIX=https://api.<domain>/assets/`, `CORS_ORIGINS=https://admin.<domain>`, `TRUSTED_PROXY_CIDRS=disabled`, `SUPERADMIN_USERNAME`, `SUPERADMIN_PASSWORD`, `COOKIE_SECRET`, `PLATFORM_ACCOUNT_BRIDGE_KEY`, `VENDURE_DISABLE_TELEMETRY=true`, `ENABLE_PAID_ATTRIBUTION=true`, and `REFUND_POLICY_VERSION=staging-collection-disabled-v1`. Share exact superadmin credentials, cookie key, and bridge key across the two backend runtimes. |
| API only | `HOSTED_TRANSPORT=railway-private`, `PORT=3000`, `HOST=::`, `STOREFRONT_PARENT_DOMAIN=<domain>`, `INTERNAL_API_ORIGIN` equal to the API private origin, and distinct `MARKET_INGRESS_KEY` and `MARKET_SSR_API_KEY`. Use `http://${{RAILWAY_PRIVATE_DOMAIN}}:3000` or the verified literal private origin for the API's own value. Leave these HTTP ingress settings unset on the worker. |
| API and worker staging flags | `STAGING_TESTER_ACCESS=closed`, `STAGING_ANONYMOUS_STOREFRONTS=disabled`, `STRIPE_ENABLED=false`, `STRIPE_COLLECTION_SUSPENDED=true`, `ACCOUNT_EMAIL_ENABLED=false`, `COMMUNICATIONS_ENABLED=false`, `COMMUNICATION_ALLOW_NETWORK=false`, `PHONE_SMS_ALLOW_NETWORK=false`, `POS_ALLOW_NETWORK=false`, `QBO_ALLOW_NETWORK=false`, `SAAS_BILLING_ENABLED=false`, `SAAS_BILLING_ALLOW_NETWORK=false`, `ENABLE_IN_PERSON_CHECKOUT=false`, `ENABLE_NATIVE_MOBILE_POS=false`, `ALLOW_VENDOR_REFUND_REQUESTS=false`, `ALLOW_REFUND_UNFULFILLED_CANCELLATION=false`, and `REFUND_SHIPPING_SHARES=false`. Leave Stripe, Resend, Twilio, POS, QuickBooks and other provider credentials unset. Leave fixture modes, demo flags, local payment providers, mailbox, file storage and scanner configuration unset. |
| Admin and Astro public build and runtime | `APP_ENV=production`, `NODE_ENV=production`, `DEPLOYMENT_ENV=staging`, `FRONTEND_FIXTURE_MODE=false`, `ADMIN_ORIGIN=https://admin.<domain>`, `PLATFORM_ACCOUNT_ORIGIN=https://auth.<domain>`, `SHOP_API_URL=https://api.<domain>/shop-api`, `PUBLIC_ADMIN_API_URL=https://api.<domain>/admin-api`, `ASSET_URL_PREFIX=https://api.<domain>/assets/`. Optionally set `CUSTOMER_STOREFRONT_ORIGIN` for the Admin link to an exact approved pilot HTTPS origin at both build and runtime. `MARKET_WEB_APP` selects the Docker build and must match the app. |
| Admin and Astro runtime only | `HOSTED_TRANSPORT=railway-private`, `HOST=::`, service-specific `PORT`, `TRUSTED_PROXY_CIDRS=disabled`, `STAGING_TESTER_ACCESS=closed`, `STAGING_ANONYMOUS_STOREFRONTS=disabled`, `STOREFRONT_PARENT_DOMAIN=<domain>`, `STOREFRONT_PILOT_HOSTS` as a single-space-separated list of exact first-level pilot hosts, and service-specific `MARKET_INGRESS_KEY`. Leave native TLS paths and `ADMIN_PORT` unset. |
| Astro runtime only | `INTERNAL_API_ORIGIN=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000`, API's matching `MARKET_SSR_API_KEY`, and the shared `PLATFORM_ACCOUNT_BRIDGE_KEY`. |
| Gateway runtime only | `DEPLOYMENT_ENV=staging`, `GATEWAY_PORT=8080`, `MARKET_ADMIN_HOST=admin.<domain>`, `MARKET_ACCOUNT_HOST=auth.<domain>`, `MARKET_API_HOST=api.<domain>`, matching `STOREFRONT_PILOT_HOSTS`, `MARKET_ADMIN_UPSTREAM=http://${{admin.RAILWAY_PRIVATE_DOMAIN}}:4322`, `MARKET_STOREFRONT_UPSTREAM=http://${{storefront.RAILWAY_PRIVATE_DOMAIN}}:4321`, `MARKET_API_UPSTREAM=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000`, and `MARKET_ADMIN_INGRESS_KEY`, `MARKET_STOREFRONT_INGRESS_KEY`, `MARKET_API_INGRESS_KEY` matching their respective application keys. Inject the named Tunnel's `TUNNEL_TOKEN` only here during Phase D. |

Generate each gateway-to-service ingress key separately as 32 random bytes encoded as lowercase hex. Generate the distinct SSR key, bridge key, cookie key, and strong superadmin password separately. Paste values into private Railway variables, use references only within the approved scope, and record secret identifiers or versions in the release log. See Phase B2 for paired rotation.

## Dashboard setup sequence

1. In Railway, create an **Empty Project** dedicated to staging. Name or select the **staging** environment and choose one region for all six application and database services. Limit project membership to operators. Open each service's **Settings → Networking** during setup to confirm it has only Private Networking.
2. In the project canvas create a **Docker Image** service named `postgres` using `postgres:17.10-bookworm`. Set its variables, attach the volume at the matrix path, and review the staged settings before deploying. Verify version, filesystem persistence, private DNS and TCP access. Initialize the marker and role grants in the private database and configure backups.
3. Select the approved commit pair. On GitHub, give the Railway app access only to the two approved repositories and select fixed staging release branches pointing at those exact reviewed commits. On Railway, create the application services as **Empty Service** entries. Use **Settings → Source → Connect Repo** when preparing each service. Select the matching release branch, disable **Automatic Deployments** immediately, and abort any automatically queued deployment. Do this before injecting credentials or approving runtime variables. Verify the staged deployment details and commit SHA every time. If links queue builds, connect later services only when their release gate opens. [Railway GitHub autodeploy controls](https://docs.railway.com/deployments/github-autodeploys).
4. Create the temporary `migration` service. Apply its matrix settings, source revision and runtime-only database variables. In **Variables**, enter the private DNS reference and the migrator password. Review and deploy only this service. Wait for the terminal outcome and `hosted_migration_complete`. Verify the ledger and apply the first-release privilege restrictions. Remove the migration service after recording its deployment IDs and logs.
5. Wait until the owner has the approved temporary domain before supplying canonical origins and starting the API. Prepare API **Settings → Deploy** with the exact start command, healthcheck path, timeout, restart policy and one replica. Set the API variables and private reference, deploy the reviewed backend revision, and confirm the DB-backed readiness probe returns 200.
6. Configure and deploy the worker from the same backend revision and build inputs. Watch the logs until `worker_started`. Verify the job queue and scheduled work through authorized operations and verify there is no worker HTTP listener.
7. Add Admin and Astro from the reviewed web revision after API and worker pass. Railway detects the root `Dockerfile`. Set the app selector and actual canonical origins before the first build. Set the runtime origin values to match. Apply the remaining variables and use each service's own start command. Verify both Railway checks and the private health responses. Frontend builds embed canonical origins. Domain changes require rebuilding affected web artifacts.
8. Set the gateway service variable `RAILWAY_DOCKERFILE_PATH=Dockerfile.gateway` and confirm its private dependencies and distinct ingress keys. Queue its normal deployment only when Phase D has approved the domain, exact operator Access rules, remotely managed Tunnel and protected credential. In the gateway container, verify Caddy and connector readiness separately. Check unknown hosts, blocked routes, wrong credentials and unauthorized edge requests before any use.
9. Confirm the commit pair, the database role separation, successful ledger check, API readiness, worker start, frontend readiness, backups, and absence of public Railway domains or TCP proxies. Require the Linux image verification below before accepting those images as ready. Record the private qualification outcome before proceeding to Phase D. Verify Cloudflare Access and actual Tunnel behavior during Phase D before admitting operators.

Before the domain purchase, the owner can create the isolated staging project, provision PostgreSQL, test its backup route, prepare the six service settings, and run the temporary migration service. The backend image and gateway image are domain-independent. API and worker runtime configuration and the two frontend builds require the real canonical origins. Gateway activation requires Phase D configuration.

Use authenticated `railway ssh --service <service> --environment staging` after linking the CLI to the intended project to inspect a running container. For API, Admin and Astro, send the health path from inside that service or from another authorized private service with `Host: healthcheck.railway.app`. Open psql inside the PostgreSQL service for initialization. For a client-side backup or restore, register the SSH key and use the PostgreSQL service's **Copy Service Instance ID** command in the dashboard. Run `ssh -N -L 127.0.0.1:55432:127.0.0.1:5432 <postgres-service-instance-id>@ssh.railway.com` and keep the session open while the local PostgreSQL client uses `127.0.0.1:55432`. Use the recovery service's instance ID for a restore. These checks require the correct Railway project and environment permissions. [Railway SSH and local port forwarding](https://docs.railway.com/cli/ssh).

## Local verification and remaining release checks

| Check | Result |
| --- | --- |
| Backend server build and migration regressions | The server build emitted the API, worker, migration and hostname operator entry points and all 91 migrations. The guarded local suite qualified native baseline adoption, local concurrent startup migrations, rollback and scheduler behavior. The hosted suite qualified fresh initialization and native ordering, upgrade from a release state two migrations behind, repeat and concurrent execution, identity rejection, exact history, transactional failure, and lock cleanup on PostgreSQL 17.5. |
| Compiled hosted backend on Linux | With the compiled release and templates mounted read-only into a cached Linux backend runtime with matching Vendure 3.8.2, TypeORM and pg, the Node user applied all 91 migrations on a fresh PostgreSQL 17.10 container. The repeat reported zero. The API and worker rejected pending and unknown history, and started using the provisioned runtime role after ledger permissions were restricted. IPv4 and IPv6 API readiness and liveness and bounded service shutdown passed. The Dockerfile precreates the empty asset cache directory required by Vendure's non-root bootstrap. |
| Frontend builds and hosted transport | Synthetic staging Admin and Astro builds, the HTTP-only hosted topology test with Caddy 2.11.7, and 14 focused frontend tests passed. The Admin client and Astro client and server output contained none of the injected synthetic ingress, SSR, bridge, DB-password or private-origin values. Targeted TypeScript checks for the launchers and ESLint for gateway validation passed. |
| Gateway process supervision | The Linux supervisor test passed with Caddy and connector stand-ins, covering termination and either required process exiting. The native Caddy run served the actual Caddyfile. These checks used no Tunnel. |
| Configuration regressions and broader checks | The backend production-policy and startup redaction checks passed. The web repository-wide typecheck reported existing errors in Admin loyalty, table navigation, and frontend test fixtures. The aggregate backend build stopped in the legacy Vendure dashboard because its configuration loader lacked explicit `APP_ENV`. The server-only build used for the release passed. |
| Initial offline Linux build attempt | The offline backend build lacked locked npm artifacts, and the uncached gateway images required download authorization. The final verification below records the subsequent clean builds and packaged smoke tests. |

Run from the backend repository:

```powershell
npm run build:server
npm run test:database-startup
npm run test:database-hosted
docker build -t farmers-b3-backend:local .
./test/database-startup/release-smoke.ps1
```

The first two database suites use the guarded `vendure_test_*` PostgreSQL databases and require a local PostgreSQL 17 server for the hosted suite. The Docker smoke script requires the backend image and `postgres:17.10-bookworm` in the local cache. It creates its own isolated private network, database roles, credentials and ephemeral volume. It publishes no ports and checks the compiled migration, protected startup gates, repeat execution, native API and worker startup, IPv4/IPv6 health and shutdown. The optional `-BackendImage farmers-phase-j:candidate -MountLocalBuild` run uses a compatible cached Linux runtime to qualify the current compiled outputs and templates.

From the web repository, set the synthetic build settings shown in `.env.staging.frontend-build.example` for local qualification, then run:

```powershell
npm run build
npm run typecheck
node --import tsx scripts/test-hosted-topology.ts
npm exec --offline -- vitest run tests/production-policy.test.ts tests/request-timeout.test.ts
node node_modules/eslint/bin/eslint.js scripts/hosted-gateway.mjs
```

For Linux images, use a machine with the approved base images and npm artifacts available. Build the two frontend images with only public arguments and the gateway separately:

```powershell
$publicBuild = @(
    '--build-arg','DEPLOYMENT_ENV=staging',
    '--build-arg','ADMIN_ORIGIN=https://admin.example.com',
    '--build-arg','PLATFORM_ACCOUNT_ORIGIN=https://auth.example.com',
    '--build-arg','SHOP_API_URL=https://api.example.com/shop-api',
    '--build-arg','PUBLIC_ADMIN_API_URL=https://api.example.com/admin-api',
    '--build-arg','ASSET_URL_PREFIX=https://api.example.com/assets/'
)
docker build @publicBuild --build-arg MARKET_WEB_APP=admin -t farmers-b3-admin:local .
docker build @publicBuild --build-arg MARKET_WEB_APP=storefront -t farmers-b3-storefront:local .
docker build -f Dockerfile.gateway -t farmers-b3-gateway:local .
```

Use the frontend runtime example to create synthetic environment files kept outside the Docker build context, with unique random keys and the matching build values. Set `PORT=4322` for Admin and `PORT=4321` for Astro. Set the Astro private origin to `http://api.railway.internal:3000` and generate placeholders for SSR and the bridge key. Run both without host-port publication:

```powershell
docker run -d --pull=never --network none --name market-b3-admin --env-file <admin-env-file> farmers-b3-admin:local node --import tsx scripts/serve-admin.ts
docker run -d --pull=never --network none --name market-b3-storefront --env-file <storefront-env-file> farmers-b3-storefront:local
$health = 'const h=require("node:http"); for (const host of ["127.0.0.1","::1"]) for (const path of ["/health/live","/health/ready"]) h.get({host,port:process.env.PORT,path,headers:{Host:"healthcheck.railway.app"}},r=>{r.resume();if(r.statusCode!==200)process.exitCode=1}).on("error",()=>{process.exitCode=1})'
docker exec market-b3-admin node -e $health
docker exec market-b3-storefront node -e $health
docker stop --time 35 market-b3-admin market-b3-storefront
docker logs market-b3-admin
docker logs market-b3-storefront
docker rm market-b3-admin market-b3-storefront
```

Check the packaged backend contents with `docker run --rm --pull=never --network none farmers-b3-backend:local node -e "const f=require('node:fs'); for (const p of ['dist/index.js','dist/index-worker.js','dist/migrate-hosted.js','dist/register-storefront-hostname.js','dist/migrations','static/email/templates']) if (!f.existsSync(p)) process.exit(1)"`. For the web images inspect `docker history --no-trunc <image>`, then use `docker save -o <scratch-archive> <image>`, unpack its layers and search for the synthetic runtime credentials and `api.railway.internal`. Scan the local Admin client and Astro client and server build outputs for those same runtime-only values. Only public origins and program code for reading runtime variable names belong in builds.

Run `./scripts/test-gateway-release.ps1` to qualify the real Caddy and supervisor in the gateway image with a connector stand-in and networking disabled. With a synthetic gateway environment file including private upstreams, ingress keys, and an invalid `TUNNEL_TOKEN`, run `docker run --rm --pull=never --network none --env-file <gateway-env-file> farmers-b3-gateway:local`. Require an unexpected process exit message and nonzero exit. A real Tunnel and Access policy require separate hosted verification.

## Final Linux image verification

On November 22, 2026, all four release images built locally with `docker build --no-cache --pull --platform linux/amd64` from the existing Dockerfiles. All four run as the unprivileged Node user.

| Local image | Qualified image ID prefix | Packaged smoke test |
| --- | --- | --- |
| `farmers-b3-backend:local` | `77b67f8dc45d` | The image applied all 91 migrations to fresh, isolated PostgreSQL 17.10 and reported zero on repeat. The API and worker rejected pending and incompatible history, started with the runtime role, and shut down on SIGTERM. API health passed on IPv4 and IPv6. The compiled hostname registration command reached the private registry with its scoped operator role and returned the expected missing-storefront result. |
| `farmers-b3-admin:local` | `aaba324e8f78` | The production launcher served the authenticated SPA deep link and security headers. IPv4 and IPv6 GET and HEAD health checks passed. SIGTERM exited cleanly. |
| `farmers-b3-storefront:local` | `2325deb24b88` | The production SSR launcher started, served a packaged stylesheet, and loaded Sharp and libvips. IPv4 and IPv6 GET and HEAD health checks passed. SIGTERM exited cleanly. |
| `farmers-b3-gateway:local` | `c6139d48f61a` | Packaged Caddy 2.11.7 validated and served its loopback readiness probe. With networking disabled, packaged cloudflared 2026.10.1 rejected a malformed synthetic token and the supervisor exited 1 without logging it. A correctly shaped synthetic token exercised both processes offline. Cloudflared readiness returned 503, SIGTERM drained both processes with exit 0, and a Caddy exit caused the supervisor to drain cloudflared and exit 1. |

The frontend lockfile gained four missing Linux x64 entries at the versions already requested by its locked dependencies. They cover Tailwind Oxide, Satteri, Sharp, and libvips. Existing lockfile versions were preserved. The frontend Dockerfile now disables Astro telemetry and compiles both apps with build-step networking disabled. The backend smoke test now invokes the compiled hostname command with a separate, scoped role.

The image scan inspected Docker history, image metadata, and all 22 distinct decompressed release layers across the four saved images. It found none of the injected synthetic credentials or private runtime addresses in 124,004 scanned layer files, including the Admin bundle and the Astro client and SSR output.

All four Dockerfiles are qualified for private Railway staging on Linux/amd64. The local frontend images use synthetic public origins. Build the staging images with the actual canonical origins. Railway networking, PostgreSQL backups and restore, and real Cloudflare Tunnel and Access behavior remain hosted qualification steps. The verification used isolated local containers and left the existing development databases untouched.

## Deferred work and provisioning readiness

Initial staging is limited to private infrastructure qualification. Keep tester access and anonymous storefront browsing closed. Stripe collection, live Stripe or simulated payments, email, SMS, the development mailbox, remote-demo features, customer-owned domains, SaaS billing, external POS and QuickBooks network access remain disabled. No Resend, Twilio, R2, or ClamAV credentials are necessary.

Staging rejects file writes through the Vendure asset strategy and private document upload service. Keep product, category, branding, website, profile and storefront media uploads, application attachments, applicant and vendor evidence, compliance submissions, and financial receipt uploads unavailable until durable public or private storage and scanning are qualified. Expect no stored attachments in the fresh staging environment. The later account provisioner must audit operator-created staging accounts without relying on email or SMS delivery.

The owner can start with the empty Railway project and private PostgreSQL service. Promote application services only after the corresponding local image gates and the private Postgres/backup rehearsal pass. Actual Railway DNS, volume persistence and separate-target restore, shutdown behavior, Cloudflare operator Access, Tunnel connectivity and edge routing remain infrastructure qualification work. This implementation makes no Railway or Cloudflare changes.
