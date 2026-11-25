# Farmerlane Test Data Manager Phase A

The backend CLI creates customer, vendor owner, and market owner fixtures. It uses Vendure’s `CustomerService` and `AdministratorService` for native users and password hashing. Farmerlane’s vendor and market provisioning services, protected owner membership, and channel permissions give business users a dedicated workspace. Unified login and session handoffs remain the normal entry points.

The CLI records simulated email and phone status on the same user through the existing personal contact entity and writes a fixture audit record. **Simulated status establishes fixture eligibility only. Ownership proof requires control of the real mailbox or phone.** Batch identities use email addresses under `fixtures.invalid` and reserved North American fictional phone numbers. The tool sends no verification messages. There is no fixture API, schema migration, or change to normal phone verification or Vendure bootstrap behavior.

## Local demo accounts

Save a JSON file such as `fixture-accounts.json` in the backend checkout. Use a lower-case namespace of up to 32 characters with letters, digits and single hyphens. The command accepts one group per account type and up to 25 total accounts per batch. The optional `realistic` profile provides deterministic fictional names. The basic profile uses recognizable fixture names.

```json
{
  "namespace": "vendor-dashboard-test",
  "verification": "simulated_verified",
  "accounts": [
    { "type": "vendor", "count": 3, "profile": "realistic" },
    { "type": "market_manager", "count": 2, "profile": "realistic" },
    { "type": "customer", "count": 5 }
  ]
}
```

From `farmers-market-platform`, review and apply the specification against the integrated demo using its existing guarded environment file and shell settings.

```powershell
npm.cmd run test-data:seed -- --spec fixture-accounts.json --target demo --dry-run
npm.cmd run test-data:seed -- --spec fixture-accounts.json --target demo --apply
```

On macOS or Linux, use `npm` in place of `npm.cmd`.

Dry-run validates the requested target settings and shows the deterministic plan without connecting to a database. Apply verifies the live loopback PostgreSQL connection, `vendure_demo_market_ops`, the `public` schema, the existing bootstrap identity, and the current migration ledger. The utility reuses the demo database settings and starts an offline worker context for fixture creation. Pending migrations stop the tool. Apply never creates or resets the database. The batch commits together after credential handoff. An unrelated email or workspace collision fails the batch. An exact repeat skips the recorded fixtures and preserves their passwords and memberships. Increasing a count appends new identities. Reducing a count leaves prior fixtures in place.

The successful JSON result reports statuses, email addresses, roles, verification status, workspace names and IDs, login destinations, and `credentialOutput`. For new demo accounts the path points to an exclusive `credentials.json` under gitignored `.runtime/test-data-*`. The directory is restricted to the running user on Windows with its own ACL. On Unix the directory and file use owner-only permissions. Open the file locally, create one Bitwarden login per account with the returned URL, email and password, and remove the file once the entries work. Keep it out of chat, tickets and Git. Repeated runs do not recover or rotate passwords. If the CLI reports an uncertain commit, keep the received credentials and rerun the same spec to reconcile before discarding them.

For manual verification, start the existing `demo:market-operations:serve`, `demo:market-operations:worker`, `demo:market-operations:admin`, and `demo:market-operations:storefront` commands from the web checkout as usual. Open the returned destination for each account. Customers start at the central login, vendor owners return to `/vendor`, and market owners return to `/market`. Confirm the active workspace matches the result and that the business accounts cannot enter `/platform`.

## Railway staging

Build and verify the backend revision locally with `npm run build:server` and `npm run test:test-data`. Deploy that same revision through the existing staging API and worker release procedure. The backend Dockerfile packages `dist/test-data.js`. Keep the usual service start commands and current runtime database grants. This change needs no new migrations. [Existing Railway release procedure](STAGING_DEPLOYMENT_PHASE_B3_C_PREPARATION.md)

The release CLI requires the existing hardened staging and private Railway settings, Railway service context for the `staging` environment, and the command-scoped `FARMERLANE_TEST_DATA_STAGING=true` flag. It checks the connected database is `market_staging`, the schema is `public`, the marker is `farmers-market:staging`, PostgreSQL is version 17, the login is `market_staging_runtime`, the ledger matches, and both ends of the database connection use private addresses. Production, arbitrary database targets, public PostgreSQL access, and the migrator role are ineligible. Keep the existing email and SMS settings disabled. [Staging API configuration](../../farmers-market-platform/.env.staging.api.example)

An authorized person connects to the existing staging API service with an interactive Railway CLI session linked to the correct project.

```sh
railway ssh --service api --environment staging
cd /usr/src/app
```

For a normal staging batch, put the non-secret JSON specification in that container, for example at `/tmp/fixture-accounts.json`. Run both commands from the interactive shell. The review needs no credentials. Apply asks for the existing bootstrap password at a hidden prompt.

```sh
FARMERLANE_TEST_DATA_STAGING=true npm run test-data:seed:release -- --spec /tmp/fixture-accounts.json --target staging --dry-run
FARMERLANE_TEST_DATA_STAGING=true npm run test-data:seed:release -- --spec /tmp/fixture-accounts.json --target staging --apply
```

For **first staging Administrator setup**, use the separate initialization command instead. It asks for the current Vendure bootstrap password, the approved operator email, and the operator’s first and last name. Retype the displayed email to confirm the grant. The CLI creates a separate Administrator and audits the simulated contact status and SuperAdmin grant. It retains `farmerlane_staging_admin` as the configured bootstrap user. An existing unrelated user cannot be adopted or elevated. A matching repeat skips the existing staged operator. A second operator is refused.

```sh
FARMERLANE_TEST_DATA_STAGING=true npm run test-data:init-staging-operator -- --target staging --apply
```

For either apply command, use an unrecorded controlling terminal with screen sharing off. The CLI hides the bootstrap password and displays each generated password directly in a temporary terminal screen. It excludes passwords from the structured result, logs, process arguments and files. Save each login directly to Bitwarden and type `saved` to continue. Cancel if a controlled terminal is unavailable. Keep the staging flag out of persistent variables. For manual Platform login, pass Cloudflare Access, follow central sign-in, and use the newly created operator’s email and password. [Staging Platform workspace](https://staging-admin.farmerlane.com/platform)

## Verification and scope

The server build and the full backend build with synthetic qualification settings passed. All seven check groups in `npm run test:test-data` passed on a guarded disposable PostgreSQL database. They cover specification bounds, target and migration guards, credential handling, normal unified login, vendor and market handoffs, owner permissions, simulated contacts, retries, collisions, rollback, and the separate staging SuperAdmin authorization. Local dry-run, Windows credential-file and packaged staging CLI smoke checks passed. The packaged CLI refused production, a wrong database name and noninteractive privilege grants. Live Railway terminal handling and manual browser sign-in remain to be verified after deployment.

The previous `staging:provision-operator` command, two-person phone handoff, special verification callback, focused test and report were retired. The replacement retains hosted identity and migration checks, supported administrator creation, bootstrap preservation, auditable authorization and single-operator protection. The staging exception uses simulated contacts solely for the explicitly confirmed initial operator.

Phase A creates accounts and empty workspaces. Product catalogs, orders, applications, booth assignments, public storefronts, feature entitlements, fixture deletion, and credential rotation remain outside this phase. A customer or business fixture can be used for account and workspace testing without those datasets.
