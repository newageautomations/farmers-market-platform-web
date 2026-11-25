# Farmerlane staging test accounts

The backend Test Data Manager accepts named accounts alongside the existing count and profile specifications. Named accounts use `fixtures.invalid` emails and reserved fictional phone numbers. The CLI simulates contact verification, records the fixture audit, and uses Vendure's native password validation and hashing. Vendor and market owners receive dedicated workspaces through the regular provisioning and ownership services. The customer receives customer access only.

Staging provisioning is pending. The remaining operation is one private Railway run of the revised backend CLI against `market_staging` to create the three accounts and activate both hostname mappings. No migration is needed. This batch contains no products, transactions, applications, or booth assignments. The existing staging SuperAdmin and development accounts were left untouched.

| Name | Email | Role and workspace | Storefront |
| --- | --- | --- | --- |
| Sarah Bennett | `sarah.bennett@fixtures.invalid` | Vendor owner, Cedar Bend Farm | [Vendor storefront](https://staging-vendor.farmerlane.com) |
| Daniel Carter | `daniel.carter@fixtures.invalid` | Market owner, Juniper Grove Market | [Market storefront](https://staging-market.farmerlane.com) |
| Emily Parker | `emily.parker@fixtures.invalid` | Customer | |

## Batch specification

Use this non-secret JSON as `FARMERLANE_TEST_DATA_JOB_SPEC` for the Railway job, or save it as `fixture-accounts.json` for the interactive command. For later batches, add new entries with unique fixture emails and a descriptive namespace. The limit is 25 accounts per batch. Business entries require `workspaceName`. Use `storefrontHostname` only for a business with an existing approved staging route. Omit it for an account-only batch.

```json
{
  "namespace": "staging-named-testers",
  "verification": "simulated_verified",
  "accounts": [
    {
      "type": "vendor", "firstName": "Sarah", "lastName": "Bennett",
      "email": "sarah.bennett@fixtures.invalid", "workspaceName": "Cedar Bend Farm",
      "passwordSource": "shared", "storefrontHostname": "staging-vendor.farmerlane.com"
    },
    {
      "type": "market_manager", "firstName": "Daniel", "lastName": "Carter",
      "email": "daniel.carter@fixtures.invalid", "workspaceName": "Juniper Grove Market",
      "passwordSource": "shared", "storefrontHostname": "staging-market.farmerlane.com"
    },
    {
      "type": "customer", "firstName": "Emily", "lastName": "Parker",
      "email": "emily.parker@fixtures.invalid", "passwordSource": "shared"
    }
  ]
}
```

`passwordSource` may be `shared` or `individual`. Omitting it keeps the existing generated-password flow in interactive staging and local demo mode. A supplied password is staging-only and requires 11 to 72 printable ASCII characters, including an uppercase letter, a digit and a symbol. The normal signup policy remains in place. Save the initial shared password supplied in the request in the authorized password vault before running the batch. Store each tester's email and sign-in URL with the login. Keep fixture and bootstrap passwords out of the JSON spec, command arguments, Git and logs.

Matching fixture emails are skipped on rerun, even under a new namespace. The CLI preserves their passwords, permissions and published websites. A conflicting account, workspace or hostname fails the batch. Account creation, publication and registration commit together. Storefront setup is available on initial fixture creation. Subsequent website edits use the regular owner workflows.

## Run once in Railway without SSH

The local CLI reported no linked project and a network error refreshing its Railway session. `railway run` executes locally and cannot reach private PostgreSQL. The release Dockerfile packages `dist/test-data.js`, so an isolated service can run it directly without an SSH session. [Railway CLI run](https://docs.railway.com/cli/run) · [Railway private networking](https://docs.railway.com/networking/private-networking/how-it-works)

1. In the existing Railway project's **staging** environment, create one temporary service, `named-fixture-job`. Use the reviewed backend revision containing this change and its normal release Dockerfile, or an approved prebuilt image of that revision. Disable automatic deployments or image updates. Use one replica, restart policy **Never**, and no public networking, volume, health check, cron or pre-deploy command. Set the custom start command before releasing the temporary service. [Existing release procedure](STAGING_DEPLOYMENT_PHASE_B3_C_PREPARATION.md) · [Railway start commands](https://docs.railway.com/builds/build-and-start-commands) · [Railway restart policies](https://docs.railway.com/deployments/restart-policy)
2. Configure the same hardened staging runtime values as the API using the [backend staging example](../../farmers-market-platform/.env.staging.api.example). Use service-scoped references or sealed values for secrets. Match the staging API's `PORT`, canonical origins, storefront parent domain, configured bootstrap identity and database transport. Use `market_staging_runtime`, `market_staging`, `public` and the existing private PostgreSQL host. Keep providers disabled. Set `FARMERLANE_TEST_DATA_JOB_SPEC` to the non-secret JSON above. Railway supplies the environment name and service ID at runtime.
3. Set the temporary service's start command to the line below and review the dry-run JSON. It lists the planned identities, destinations and hostnames without opening a database connection.

   ```sh
   /bin/sh -c 'FARMERLANE_TEST_DATA_STAGING=true exec node dist/test-data.js seed --target staging --railway-job --dry-run'
   ```

4. Add `FARMERLANE_TEST_DATA_JOB_CREDENTIALS` as a **sealed variable on this service only**. Its JSON shape is `{"bootstrapPassword":"<current bootstrap password>","sharedPassword":"<approved batch password>"}`. For each `individual` entry, use an `individualPasswords` object keyed by the lower-case fixture email. Omit `sharedPassword` if the batch has no `shared` entries. Every job entry needs a supplied password. Apply the start command below once. The CLI checks the private database connection, database identity, PostgreSQL version, runtime role, complete migration ledger and current bootstrap password before writing. [Railway sealed variables](https://docs.railway.com/variables)

   ```sh
   /bin/sh -c 'FARMERLANE_TEST_DATA_STAGING=true exec node dist/test-data.js seed --target staging --railway-job --apply'
   ```

5. Verify exit 0 and `"status":"applied"` in the job output. Expect `created` for the first run and `skipped` on a matching repeat. Keep the deployment ID and non-secret result, then remove the temporary deployment and service, including its sealed variables. For `commit-uncertain`, retain the vault logins and rerun the same spec and credentials to reconcile before cleanup.

If SSH becomes available, the same release supports interactive staging with the non-secret spec file already present in the container. Use an unrecorded terminal and enter the bootstrap and fixture passwords at the hidden prompts.

```sh
FARMERLANE_TEST_DATA_STAGING=true npm run test-data:seed:release -- --spec /tmp/fixture-accounts.json --target staging --dry-run
FARMERLANE_TEST_DATA_STAGING=true npm run test-data:seed:release -- --spec /tmp/fixture-accounts.json --target staging --apply
```

## Verify after provisioning

Pass the existing Cloudflare Access gate first. Sarah should reach [the vendor dashboard](https://staging-admin.farmerlane.com/vendor) with Cedar Bend Farm active. Daniel should reach [the market dashboard](https://staging-admin.farmerlane.com/market) with Juniper Grove Market active. Emily should use `/account/login` on the staging central account origin printed by the job and reach her customer account without a business or Platform workspace. Neither owner should be able to enter the other's workspace or `/platform`.

Both storefront root URLs should load their own published Harvest site. The backend resolver reads the committed mapping from PostgreSQL and serves `private, no-store`. Astro fetches the resolver with `no-store`, so there's no application resolver cache to purge. If a Cloudflare cache override serves a stale response, purge only the affected staging URL through the existing operator workflow. Hosted Cloudflare behavior still needs the manual check.

Local verification passed from the backend checkout.

- `npm.cmd run build:server` compiled the release CLI and backend.
- `npm.cmd run test:test-data` verified native sign-in, bcrypt hashing, authorization, workspace ownership, repeat runs, atomic rollback and storefront resolution using disposable PostgreSQL.
- `node_modules\.bin\ts-node.cmd --project tsconfig.json test/production-hardening/hosted.ts --database` verified the existing hosted resolver boundary and concurrent hostname registration using disposable PostgreSQL.
- A packaged CLI smoke check dry-ran the exact batch above and confirmed that apply rejects missing job credentials, production and the demo database.

The automated tests used generated passwords of the same length as the requested credential. The live Railway job and manual UI checks remain pending.
