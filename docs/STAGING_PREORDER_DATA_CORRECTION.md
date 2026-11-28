# Staging preorder data correction

The consolidated population approved and published only the first variant of each of the first two catalog products per approved vendor. It used a seven-calendar-day opening window. The saved offers therefore covered a small part of the catalog, and offers for distant dates were still closed. The occurrence storefront reads the materialized offering timestamps, so changing a market default alone leaves existing offers on their old window. [Consolidated population results](DEMO_DATA_PORTABILITY_COMPLETION.md#market-and-finance-scenarios)

## What the correction covers

- The saved defaults cover every `farmers_market` row in `market_staging`, including vendor-owned scheduling locations and pre-existing independently managed markets. Every existing vendor membership default and every explicit override on a future scheduled occurrence or its participation receives the same 60-day opening and one-day closing offsets. A null membership or attendance rule continues to inherit. Recurrence schedules carry dates, hours and venue, with the preorder rule inherited from the market. New dates on these schedules inherit the corrected rules. Brand-new markets use the existing platform creation defaults. Explicit local clocks, timezones and override policies are preserved. Missing clocks use 08:00 and 18:00. The existing resolver calculates both instants by local calendar day, including across DST.
- Fictional vendors are identified by the released catalog cohort and matching staging account audit receipts. The job checks their current full catalogs for each active, approved membership. It requests and approves missing eligible variant listings, approves existing pending requests, creates missing offerings for already-confirmed future attendance, and publishes through the native catalog service where supported. New fixture offerings have an eight-unit cap. For other vendors, the catalog operation is limited to approving existing eligible pending listings. `listingStatuses` records current approvals, pending requests, withdrawals, and native publication counts per membership.
- Existing future offerings get recalculated window timestamps and provenance. Existing flags and caps are preserved. Historical and cancelled occurrences and already-expired windows stay closed. The job also preserves deliberate listing withdrawals, unpublications, and offering disables. Policy conflicts involving saved local times or a market's preparation boundary are reported with the affected occurrence. Other exclusions identify such conditions as inactive or unapproved memberships, missing confirmed attendance, disabled or deleted catalog entries, unsupported publication or stock configuration, and missing or incompatible Stripe Sandbox evidence. Out-of-stock and capped items can have healthy approval and publication records while showing zero capacity.
- Native listing, offering and publication events follow the existing audit and outbox path. Vendure's variant-channel event also queues normal indexing work for the existing worker. Staging's Astro SSR catalog requests use fresh API reads and request-local memoization. A new request can see the committed rows with the existing cache policy. The apply check reads the native storefront projection, checks stock and caps, and runs the native one-unit cart-line gate without creating an order. The representative Sandbox payment still needs manual acceptance. [Storefront routing and cache behavior](DYNAMIC_STOREFRONT_ROUTING.md#routing-and-security) · [Stripe readiness](SUPERADMIN_STRIPE_CONNECTIONS.md)

The dry run lists the exact destination vendors, markets, occurrences, rules, proposed changes and exclusions. Availability in that report is a projection. The apply log records actual destination counts after commit and shows observed storefront, capacity and cart eligibility separately. Marketplace membership statuses, pending applications, assignments, fulfillment configuration, inventory, payment connections, orders, reservations and the original population audit receipts are preserved. The job uses the existing migration ledger and audit table.

## Release through the existing Railway job

Use the reviewed backend release branch. These path-scoped commands commit only the correction and its report. Review the staged paths before each commit.

```powershell
Set-Location E:\coding\farmers-market-platform
$correctionFiles = @(
  'src/test-data-preorder-correction.ts',
  'src/test-data/preorder-correction-data.ts',
  'src/test-data/preorder-correction-plan.ts',
  'src/test-data/preorder-correction-apply.ts',
  'test/market-operations/preorder-correction.ts'
)
git add -- $correctionFiles
git diff --cached --check -- $correctionFiles
git diff --cached --stat -- $correctionFiles
git commit --only -m "Add guarded staging preorder data correction" -- $correctionFiles

Set-Location E:\coding\farmers-market-platform-web
git add -- docs/STAGING_PREORDER_DATA_CORRECTION.md
git diff --cached --check -- docs/STAGING_PREORDER_DATA_CORRECTION.md
git commit --only -m "Document staging preorder correction" -- docs/STAGING_PREORDER_DATA_CORRECTION.md
```

In Railway **staging**, select only `staging-catalog-job` and the reviewed backend commit. Keep the repository root, existing `Dockerfile`, one replica, manual deployments, restart policy **Never**, and private networking. Leave public networking, health checks, pre-deploy commands, volumes and cron unset. Keep `staging-migrate` idle. The two deployments below reuse the same reviewed revision. [Existing job setup](DEMO_DATA_PORTABILITY_COMPLETION.md#operator-release-instructions)

| Setting | Value |
| --- | --- |
| Deployment | `APP_ENV=production`, `NODE_ENV=production`, `DEPLOYMENT_ENV=staging`, `HOSTED_TRANSPORT=railway-private`. Railway injects `RAILWAY_ENVIRONMENT_NAME=staging` and `RAILWAY_SERVICE_ID`. |
| Local job authority | `FARMERLANE_TEST_DATA_STAGING=true`, `FARMERLANE_TEST_DATA_CATALOG=true`, `FARMERLANE_STAGING_PREORDER_CORRECTION=true`. Keep `SUPERADMIN_USERNAME` set to the exact existing audited named staging SuperAdmin for both deployments. |
| Database | Keep `DB_NAME=market_staging`, `DB_SCHEMA=public`, `DB_USERNAME=market_staging_runtime`, `DB_SYNCHRONIZE=false`, the private staging `DB_HOST` and `DB_PORT`, and the sealed or referenced runtime `DB_PASSWORD`. Keep the existing `DB_TRANSPORT_POLICY` and `DB_TLS_CA` when using `verify-full`. Use the default database pool size, or keep `DB_POOL_MAX` at two or higher for the live-reservation check. |
| Vendure composition | Keep `PORT=3000`, `HOST=::`, `INTERNAL_API_ORIGIN=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000`, `TRUSTED_PROXY_CIDRS=disabled`, `STOREFRONT_PARENT_DOMAIN=farmerlane.com`, `API_ORIGIN=https://staging-api.farmerlane.com`, `ADMIN_ORIGIN=https://staging-admin.farmerlane.com`, `PLATFORM_ACCOUNT_ORIGIN=https://staging-auth.farmerlane.com`, `ASSET_URL_PREFIX=https://staging-api.farmerlane.com/assets/`, `CORS_ORIGINS=https://staging-admin.farmerlane.com`, `STAGING_TESTER_ACCESS=provisioned`, and `STAGING_ANONYMOUS_STOREFRONTS=published`. |
| Sandbox evidence | Keep `FARMERLANE_POPULATION_STRIPE_TEST_PLATFORM_ACCOUNT_ID` and `FARMERLANE_POPULATION_STRIPE_TEST_CLIENT_ID` with the same public Sandbox IDs used by the staging API. Keep `STRIPE_ENABLED=false`, `STRIPE_COLLECTION_SUSPENDED=true`, `ENABLE_PAID_ATTRIBUTION=true`, and `REFUND_POLICY_VERSION=staging-collection-disabled-v1`. Keep the temporary service's other provider flags false or unset and omit provider, mail, upload, live ingress, cookie and bridge credentials. |
| Remove population-only inputs | Remove `FARMERLANE_TEST_DATA_POPULATION`, `FARMERLANE_TEST_DATA_POPULATION_MEDIA`, and any population anchor or digest on the start command. Keep `SUPERADMIN_PASSWORD` unset. The correction does not consume the media handoff or fixture credentials. |
| Apply password | For apply only, seal `FARMERLANE_TEST_DATA_JOB_CREDENTIALS` as `{"bootstrapPassword":"<current named SuperAdmin password from the vault>"}`. Leave the variable unset for dry run. |

First deployment custom start command

```sh
node dist/test-data-preorder-correction.js --dry-run
```

Save the JSON logs. The last line should report `status: "dry-run"`, `target: "staging"`, `database: "market_staging"`, `revision: "staging-preorders-60-1-r1"`, `conflicts: 0`, a 64-character `digest`, and separate `actualDestination` and `planned` counters. Look through `listingChanges`, `missingOfferings`, `materialize`, `exclusions`, and `marketAvailabilityLimit` and `vendorAvailabilityLimit` before approving. `status: "conflicts"` exits 2 and identifies blocking conflicts. The plan is generated in a database-enforced read-only snapshot. `LIVE_MARKET_CHECKOUT_HOLDS` means an affected market has a live quote tied to the old window. Let the checkout complete or the hold expire naturally, then retry.

Second deployment custom start command, replacing the placeholder with the reviewed digest

```sh
node dist/test-data-preorder-correction.js --apply --approve REVIEWED_DRY_RUN_DIGEST
```

Expect exit 0 and `status: "applied"` with the reviewed digest, `completed`, `skipped`, and committed `actualDestination` counters. `storefront` rows show each checked date's `visible`, `inStock` and `cartEligible` counts. One transaction applies the reviewed work and writes the correction receipt. An interrupted uncommitted run can retry with the same digest as long as the plan still matches. If approval is stale, generate and review a fresh dry run. If apply reports `committed: true` after a verification failure, replay the same approved command to verify without writing again. A successful replay reports `status: "already-applied"` and `priorCompleted`. Belated acceptance may show legitimate exclusions if the calendar or inventory has moved on.

## Manual acceptance

1. Open the three fixture storefronts. Select a future date inside its window and compare the expanded catalog with the apply log's storefront results. A date beyond the 60-day opening remains unavailable. [Foxglove](https://foxglove-market.farmerlane.com) · [Stonebrook](https://stonebrook-market.farmerlane.com) · [Orchard Lantern](https://orchard-lantern-market.farmerlane.com)
2. Sign in as Foxglove's manager and review the product approvals. Sign in as Fern & Furrow or Lark & Grain and check a confirmed date in the vendor workspace. Verify that an eligible product previously outside the two-product selection is approved and orderable while in stock.
3. Inspect a fictional market, a pre-existing independent market and a vendor-owned location. Confirm the 60-day opening and one-day closing in their local timezones and check a specific date with a previous override.
4. Place one representative preorder in Stripe Sandbox and verify pickup and order confirmation. Compare with the storefront log if a product is unavailable. Confirm the pending application queue and unrelated market records are intact.
5. Once acceptance is complete, remove the two temporary services if they are no longer needed. Keep the reviewed digest, execution summary and deployment IDs with the staging records.

## Local verification

The focused correction test passed on guarded disposable PostgreSQL 17.10. It verified staging and provider guards, a read-only dry run, a full 19-variant fixture catalog, approval of an existing nonfixture request, native publication and cart eligibility on independent and vendor-owned markets, DST, inherited defaults on new dates, closed and historical date preservation, live-quote protection, native events, rollback and receipt replay. The backend server build passed. The compiled command rejected production with `TEST_DATA_STAGING_AUTHORIZATION_REQUIRED`. Hosted apply and Sandbox payment acceptance are operator steps.
