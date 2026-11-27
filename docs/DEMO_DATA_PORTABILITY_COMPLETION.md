# Farmerlane demo population completion

The completion job extends the Phase B cohort `farmerlane-fictional-trial` and catalog revision `2026-11-r1` with public media, storefronts, market operations and offline financial examples. The completion revision is `completion-r1`. It is an operator-run staging release. The local implementation does not deploy or apply it to hosted staging.

**Railway deployments required: one.** Deploy the reviewed backend commit to the temporary `staging-catalog-job` service once. Use Railway SSH to run the dry run and apply inside that same deployment. The existing API handles uploads. The existing API, worker, Admin, storefront and gateway need zero deployments when the documented storage and dynamic routing prerequisites are already active. This release adds no migrations. [Phase A audit](DEMO_DATA_PORTABILITY_PHASE_A.md) · [Phase B foundation and catalog](DEMO_DATA_PORTABILITY_PHASE_B.md) · [Dynamic storefront routing](DYNAMIC_STOREFRONT_ROUTING.md)

## Fixture scope

The job resolves each Phase B identity from the account creation audit, provisioning key, owner membership and channel. It resolves product and variant IDs from committed catalog receipts and verifies current ownership. It creates no accounts or products and adds no stock. Expect 29 existing accounts, 397 products, 398 variants, 23 vendor websites and three market websites. Silver Meadow Farm and Iris Hale remain available for onboarding.

Sign in through the central account host. Vendors and managers use the corresponding Admin workspace. The `@fixtures.invalid` logins are application identities. Use the secure account inventory for the actual credentials and existing staging admission. [Central sign-in](https://staging-auth.farmerlane.com/account/login) · [Vendor Admin](https://staging-admin.farmerlane.com/vendor) · [Market Admin](https://staging-admin.farmerlane.com/market)

| Workspace or customer     | Login                                     | Storefront after apply                                                  | Theme            | Existing products / variants |
| ------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- | ---------------- | ---------------------------: |
| Fern & Furrow Farm        | `fern-furrow@fixtures.invalid`            | [fern-furrow](https://fern-furrow.farmerlane.com)                       | Bloom            |                      18 / 18 |
| Golden Acre Produce       | `golden-acre@fixtures.invalid`            | [golden-acre](https://golden-acre.farmerlane.com)                       | Harvest          |                      18 / 18 |
| Red Jar Ferments          | `red-jar@fixtures.invalid`                | [red-jar](https://red-jar.farmerlane.com)                               | Editorial Market |                      18 / 18 |
| Morning Hearth Bakery     | `morning-hearth@fixtures.invalid`         | [morning-hearth](https://morning-hearth.farmerlane.com)                 | Modern Farmhouse |                      18 / 18 |
| Copperleaf Produce        | `copperleaf@fixtures.invalid`             | [copperleaf](https://copperleaf.farmerlane.com)                         | Harvest          |                      18 / 18 |
| Little Mill Crackers      | `little-mill@fixtures.invalid`            | [little-mill](https://little-mill.farmerlane.com)                       | Modern Farmhouse |                      18 / 18 |
| Amber Meadow Honey        | `amber-meadow@fixtures.invalid`           | [amber-meadow](https://amber-meadow.farmerlane.com)                     | Bloom            |                      18 / 18 |
| Oakthread Goods           | `oakthread@fixtures.invalid`              | [oakthread](https://oakthread.farmerlane.com)                           | Editorial Market |                      18 / 18 |
| Butterfield Bakes         | `butterfield@fixtures.invalid`            | [butterfield](https://butterfield.farmerlane.com)                       | Bloom            |                      18 / 18 |
| Early Finch Coffee        | `early-finch@fixtures.invalid`            | [early-finch](https://early-finch.farmerlane.com)                       | Editorial Market |                      18 / 18 |
| Meadowcraft Naturals      | `meadowcraft@fixtures.invalid`            | [meadowcraft](https://meadowcraft.farmerlane.com)                       | Bloom            |                      18 / 18 |
| Sugar Finch Macarons      | `sugar-finch@fixtures.invalid`            | [sugar-finch](https://sugar-finch.farmerlane.com)                       | Bloom            |                      18 / 18 |
| Greenhaven Gardens        | `greenhaven@fixtures.invalid`             | [greenhaven](https://greenhaven.farmerlane.com)                         | Harvest          |                      18 / 18 |
| Honeycrest Apiary         | `honeycrest@fixtures.invalid`             | [honeycrest](https://honeycrest.farmerlane.com)                         | Modern Farmhouse |                      18 / 18 |
| Citrus & Sprig            | `citrus-sprig@fixtures.invalid`           | [citrus-sprig](https://citrus-sprig.farmerlane.com)                     | Bloom            |                      18 / 18 |
| Gathered Table Kitchen    | `gathered-table@fixtures.invalid`         | [gathered-table](https://gathered-table.farmerlane.com)                 | Editorial Market |                      18 / 18 |
| Briarfield Ranch          | `briarfield@fixtures.invalid`             | [briarfield](https://briarfield.farmerlane.com)                         | Modern Farmhouse |                      18 / 18 |
| Wildgrain Bakery          | `wildgrain@fixtures.invalid`              | [wildgrain](https://wildgrain.farmerlane.com)                           | Modern Farmhouse |                      18 / 18 |
| Luna Masa Kitchen         | `luna-masa@fixtures.invalid`              | [luna-masa](https://luna-masa.farmerlane.com)                           | Editorial Market |                      18 / 18 |
| Blue Heron Seafood        | `blue-heron@fixtures.invalid`             | [blue-heron](https://blue-heron.farmerlane.com)                         | Harvest          |                      18 / 18 |
| Second Sunrise Cafe       | `second-sunrise@fixtures.invalid`         | [second-sunrise](https://second-sunrise.farmerlane.com)                 | Modern Farmhouse |                      18 / 18 |
| Lark & Grain Farmstead    | `lark-grain@fixtures.invalid`             | [lark-grain](https://lark-grain.farmerlane.com)                         | Editorial Market |                      18 / 19 |
| Briarstone Farm           | `briarstone@fixtures.invalid`             | [briarstone](https://briarstone.farmerlane.com)                         | Harvest          |                        1 / 1 |
| Silver Meadow Farm        | `silver-meadow@fixtures.invalid`          | Onboarding                                                              |                  |                        0 / 0 |
| Foxglove Community Market | `foxglove-market@fixtures.invalid`        | [foxglove-market](https://foxglove-market.farmerlane.com)               | Pasture          |                              |
| Stonebrook Farmers Market | `stonebrook-market@fixtures.invalid`      | [stonebrook-market](https://stonebrook-market.farmerlane.com)           | Hearth           |                              |
| Orchard Lantern Market    | `orchard-lantern-market@fixtures.invalid` | [orchard-lantern-market](https://orchard-lantern-market.farmerlane.com) | Meadow           |                              |
| Rowan Hale                | `trial-customer-01@fixtures.invalid`      | Customer account                                                        |                  |                              |
| Iris Hale                 | `trial-customer-02@fixtures.invalid`      | Customer onboarding                                                     |                  |                              |

Vendor websites use the existing starter and publication services with new business-specific copy, an approved channel-owned image and up to five featured products from that vendor's Phase B catalog. Fern & Furrow and Lark & Grain use the local Bloom and Editorial scenarios as design references. The job authors new typed content and uses the native template versions and protected pages. It reserves the logical ID as both the route key and the hostname label, validates the owner, and publishes the supported snapshot. Existing storefronts and occupied keys surface as conflicts. Host routing outside the trial is unchanged.

## Market and finance scenarios

Use **December 8, 2026** for the runbook example. If any first date would already have passed when applying, choose a later anchor before approving or uploading. The dry run prints the actual dates and rejects unpopulated markets outside the saved scheduling horizon. After a stage commits, keep that anchor and digest. Dates use America/Chicago and the native weekly occurrence generator.

| Market          | Venue, regular hours and dates                                                            | Approved applications and memberships                                                                               | Pending applications           |
| --------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Foxglove        | Foxglove Commons. Saturdays 9 a.m. to 1 p.m. Dec 12, 19, 26, 2026 and Jan 2, 9, 16, 2027. | Fern & Furrow, Lark & Grain, Morning Hearth, Golden Acre, Amber Meadow, Red Jar, Early Finch, Luna Masa, Briarfield | Meadowcraft, Oakthread         |
| Stonebrook      | Stonebrook Green. Sundays 10 a.m. to 2 p.m. Dec 13, 20, 27, 2026 and Jan 3, 2027.         | Copperleaf, Wildgrain, Little Mill, Honeycrest, Sugar Finch                                                         | Gathered Table, Citrus & Sprig |
| Orchard Lantern | Lantern Orchard Court. Wednesdays 3 p.m. to 6 p.m. Dec 9, 16, 23, 2026.                   | Briarstone, Greenhaven, Butterfield                                                                                 | Second Sunrise                 |

Blue Heron has a vendor storefront and no scheduled market relationship. These fictional venues have no street address. All three application templates open through the native public application workflow. Applicant content comes from the fictional identity and catalog definitions. Application acceptance establishes the verified relationship. A separate manager action confirms each requested date. The native layout workflow publishes the booth library and an occurrence map for every date. The layout uses adapted booth-row geometry and fictional labeling. The Foxglove layout includes its approved photo. The first two dates have assignments, leaving other spaces and dates available for manual testing.

| Market          | Dates | Booths | Assignments | Listings / offerings | Draft / open / cash-paid invoices |
| --------------- | ----: | -----: | ----------: | -------------------: | --------------------------------: |
| Foxglove        |     6 |     12 |          18 |             18 / 108 |                        16 / 1 / 1 |
| Stonebrook      |     4 |      7 |          10 |              10 / 40 |                         8 / 2 / 0 |
| Orchard Lantern |     3 |      5 |           6 |               5 / 15 |                         4 / 2 / 0 |
| Total           |    13 |     24 |          34 |             33 / 163 |                        28 / 5 / 1 |

Expect 22 applications, 17 verified memberships, 83 confirmed participations, three published layouts, 13 published maps and six rental definitions. Each market offers a folding table and canopy. The regular preorder window opens seven days before each session at 8 a.m. local time and closes the day before at 6 p.m. Each approved vendor's first two eligible product variants, or Briarstone's single variant, get listings and offerings with an eight-unit cap. The job keeps the existing stock and skips disabled product or variant selections, so an edited catalog can produce fewer listings. Market booth pickup uses existing vendor and market fulfillment.

The held booth cost is $35 at Foxglove and $22 at the other markets. The first two vendors in each market rent a $9 table. Foxglove's Fern & Furrow cash settlement is $44 and its Lark & Grain invoice remains open. The first two approved vendors at Stonebrook and Orchard Lantern each have open invoices. Cash uses the standard market invoice ledger. Fern & Furrow, Lark & Grain and Morning Hearth each receive two manual expenses for fictional packaging and supplies. Dates are relative to the anchor and at least 12 days behind the earlier of that anchor and the trial apply day.

Websites, market dates and vendor discovery are browsable. Rowan follows Fern & Furrow, Lark & Grain, Foxglove and Orchard Lantern. The hosted sales eligibility gate can hide orderable offers and prevent adding to a cart even when listing, pickup and stock records are present. **All 23 populated vendors need authorized Sandbox merchant setup before live checkout, and all three market managers need their own authorized Sandbox setup to exercise online booth collection.** An eligible vendor and market combination can then use the normal hosted checkout acceptance. The fixture covers offline invoice payment and manual expenses. Cash POS, placed orders, purchase history, provider records and attendance check-ins for past dates are deferred. Future attendance is represented by confirmed participations and assignments. [Hosted Stripe Sandbox activation](HOSTED_STRIPE_SANDBOX_ACTIVATION.md)

## Public media and replay

The reviewed release photo manifest pins 58 local JPEG originals by SHA-256 and records the selected Pexels source pages. It reuses the curated local catalog and Willow photo inventories. The visual review removed market scenes with recognizable people or signage and substituted generic photos for product images with visible branding or people. Oakthread uses a crop with the clothing label outside the frame. Briarstone and the three markets use produce close-ups. The operator reviews the selected source and allowed use as part of the same approval. [Local vendor catalog and photo provenance](LOCAL_VENDOR_CATALOG.md) · [Hosted public media restrictions](HOSTED_FILE_STORAGE_PHASE_C.md)

The workstation takes a reviewed digest, validates all paths, file types and hashes, then decodes and re-encodes the photographs without metadata. It signs in as each fixture owner using the central account and one-time native Admin handoff and matches the exact provisioned channel. The existing `uploadOwnStorefrontImage` mutation authorizes each upload. Vendure creates the source and preview objects using the staging API's existing R2 storage. Reuse is by channel and sanitized source hash. Expect 102 distinct channel/photo combinations and up to 102 new uploads. Profile, hero and product references reuse that channel's media. The offline job checks each supplied ID and exact source against database ownership and uses the native product and profile services. It preserves already-set profile and product images.

The workstation journal records upload intent before the mutation and records the asset after verifying the public source's bytes. A later run reconciles unfinished owners through their library and exact source hashes. For an owner whose entire journal is complete, the runner rechecks the public source bytes and reuses those receipts without another sign-in. Apply checks channel ownership for every receipt. The handoff contains only the reviewed digest and asset references. Existing storefront upload admission and scanner scope still apply.

## Operator release instructions

Use the two sibling checkouts already named in the project. Scope Git commands to these files because either checkout may have other staged changes. In the backend, stage and commit this explicit set. Use the reviewed release branch for the temporary Railway service and push once after review.

```powershell
Set-Location E:\coding\farmers-market-platform
$backendFiles = @(
  '.dockerignore', 'Dockerfile',
  'fixtures/staging-population-media-v1.json',
  'scripts/test-data-catalog-demo.ts', 'scripts/test-data-population-demo.ts',
  'src/test-data-catalog.ts', 'src/test-data-population.ts', 'src/test-data/accounts.ts',
  'src/test-data/population-apply.ts', 'src/test-data/population-fixture.ts',
  'src/test-data/population-markets.ts', 'src/test-data/population-plan.ts',
  'src/test-data/population-websites.ts', 'test/market-operations/test-data.ts'
)
git switch -c codex/demo-population-completion
git add -- $backendFiles
git diff --cached -- $backendFiles
git commit --only -m "Complete Farmerlane trial population" -- $backendFiles
git push -u origin codex/demo-population-completion
```

Commit the runbook and workstation scripts in the web checkout. Push the documentation branch when reviewed. It does not need a hosted build.

```powershell
Set-Location E:\coding\farmers-market-platform-web
$webFiles = @(
  'docs/DEMO_DATA_PORTABILITY_COMPLETION.md',
  'scripts/build-staging-population-media.cjs',
  'scripts/upload-staging-population-media.cjs'
)
git switch -c codex/demo-population-completion
git add -- $webFiles
git diff --cached -- $webFiles
git commit --only -m "Document Farmerlane trial population and media handoff" -- $webFiles
git push -u origin codex/demo-population-completion
```

Confirm the staging Phase B import is complete, the foundational commerce check is healthy, wildcard dynamic routing is active, and the storage runbook's existing fixture-owner public uploads are qualified. Keep Resend, Twilio, QuickBooks network activity and other unrelated providers disabled. Keep the existing API and worker online. The job emits native search and in-app fixture events and creates offline invoice/expense records. The job launches no HTTP listener, scheduler or queue consumer. The existing worker can process native indexing and in-app events. Existing background work, Stripe collectors, and unrelated connector settings remain under their current release configuration. [Foundation](FOUNDATIONAL_COMMERCE_CONFIGURATION.md) · [Hosted media prerequisite](HOSTED_FILE_STORAGE_PHASE_C.md) · [Routing prerequisite](DYNAMIC_STOREFRONT_ROUTING.md)

Reuse the temporary service `staging-catalog-job` in Railway's **staging** environment. Set the backend repository root as the source and use its existing Dockerfile, the reviewed backend branch and one replica. Disable automatic deploys. Use **Never** for restart policy and leave public networking, health checks, volumes, cron and pre-deploy commands unset. For this single deployment, set the start command below. The process keeps an SSH target available without opening a listener.

```sh
node -e "setInterval(() => {}, 60000)"
```

| Setting                             | Job value                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Environment identity                | `APP_ENV=production`, `NODE_ENV=production`, `DEPLOYMENT_ENV=staging`, `HOSTED_TRANSPORT=railway-private`. Railway supplies `RAILWAY_ENVIRONMENT_NAME` and `RAILWAY_SERVICE_ID`.                                                                                                                                                                                         |
| Opt-ins                             | `FARMERLANE_TEST_DATA_STAGING=true`, `FARMERLANE_TEST_DATA_CATALOG=true`, `FARMERLANE_TEST_DATA_POPULATION=true`.                                                                                                                                                                                                                                                        |
| Database                            | `DB_NAME=market_staging`, `DB_SCHEMA=public`, `DB_USERNAME=market_staging_runtime`, `DB_SYNCHRONIZE=false`. Set `DB_HOST` to the staging PostgreSQL private `*.railway.internal` reference and `DB_PORT` to its private port. Seal/reference the existing runtime `DB_PASSWORD`. Match `DB_TRANSPORT_POLICY`; include the existing `DB_TLS_CA` for `verify-full` only.   |
| Private composition                 | `PORT=3000`, `HOST=::`, `INTERNAL_API_ORIGIN=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000`, `TRUSTED_PROXY_CIDRS=disabled`, `STOREFRONT_PARENT_DOMAIN=farmerlane.com`.                                                                                                                                                                                                    |
| Public composition                  | `API_ORIGIN=https://staging-api.farmerlane.com`, `ADMIN_ORIGIN=https://staging-admin.farmerlane.com`, `PLATFORM_ACCOUNT_ORIGIN=https://staging-auth.farmerlane.com`, `ASSET_URL_PREFIX=https://staging-api.farmerlane.com/assets/`, `CORS_ORIGINS=https://staging-admin.farmerlane.com`, `STAGING_TESTER_ACCESS=provisioned`, `STAGING_ANONYMOUS_STOREFRONTS=published`. |
| Payments and notification isolation | `STRIPE_ENABLED=false`, `STRIPE_COLLECTION_SUSPENDED=true`, `ENABLE_PAID_ATTRIBUTION=true`, `REFUND_POLICY_VERSION=staging-collection-disabled-v1`. Leave test collection, recovery, refund, billing, POS, contact delivery, file uploads and QuickBooks network flags unset or false. Omit R2, live ingress/bridge/cookie, scanner-bypass and provider credentials.     |
| Named principal                     | `SUPERADMIN_USERNAME` is the exact existing named SuperAdmin used for the successful Phase B apply. Leave `SUPERADMIN_PASSWORD` and `FARMERLANE_TEST_DATA_JOB_CREDENTIALS` unset on the service. The job generates ephemeral composition keys.                                                                                                                           |

Deploy the temporary service once. From the linked Railway project, use the existing authorized staging SSH path. For the first inspection, run exactly one connected dry run. It uses the database marker, private connection check, runtime role and migration ledger, and then a read-only repeatable-read plan. It never bootstraps Vendure.

```sh
railway ssh --service staging-catalog-job --environment staging
cd /usr/src/app
node dist/test-data-population.js --dry-run --anchor 2026-12-08
```

Review the exit-0 `status: dry-run` record, counts, dates, planned URLs, stages and `digest`. Exit 2 reports `status: conflicts` with a logical account and code, for example `PHASE_B_CATALOG_REQUIRED`, `STOREFRONT_ALREADY_CONFIGURED_OR_ROUTE_OCCUPIED`, `MARKET_ALREADY_CONFIGURED`, `MARKET_DATES_OUTSIDE_HORIZON` or `FIXTURE_PAYMENT_ACCOUNT_PRESENT`. Exit 1 reports a startup or check failure. Resolve a prerequisite through its established workflow and rerun inspection before approving. Preserve the reviewed release commit and digest together.

### Upload and apply

Build locally first so the workstation script uses the same compiled fixture. Use the existing local `.runtime/vendor-catalog/photos` and `.runtime/willow-photos` directories. `--check` validates the media without network or credentials. The upload command needs the current fixture owner passwords. Prepare a vault value of the shape `{"sharedPassword":"<vault value>","passwords":{"logical-id":"<current per-owner password if changed>"}}` and paste it at the masked prompt. The override map is optional. Use one workstation and wait for successful completion before applying.

```powershell
Set-Location E:\coding\farmers-market-platform
npm.cmd run build:server
Set-Location E:\coding\farmers-market-platform-web
$approved = 'REVIEWED_DRY_RUN_DIGEST'
node scripts/upload-staging-population-media.cjs --anchor 2026-12-08 --approve $approved --check
$env:FARMERLANE_FIXTURE_MEDIA_CREDENTIALS = Read-Host -MaskInput 'Paste the sealed fixture owner credential JSON'
try {
  node scripts/upload-staging-population-media.cjs --anchor 2026-12-08 --approve $approved --upload
} finally {
  Remove-Item Env:FARMERLANE_FIXTURE_MEDIA_CREDENTIALS -ErrorAction SilentlyContinue
}
```

The command emits one `media-owner-verified` message for each owner and prints a ready-to-paste apply command with the complete compressed handoff. On the same Railway SSH deployment, enter the named operator password bundle from the vault in the masked shell prompt. The bundle is `{"bootstrapPassword":"<named SuperAdmin's current password>"}`.

```sh
old_tty=$(stty -g)
trap 'stty "$old_tty"; unset FARMERLANE_TEST_DATA_JOB_CREDENTIALS' EXIT HUP INT TERM
printf 'Paste the sealed named SuperAdmin credential JSON: '
stty -echo
IFS= read -r FARMERLANE_TEST_DATA_JOB_CREDENTIALS
stty "$old_tty"
printf '\n'
export FARMERLANE_TEST_DATA_JOB_CREDENTIALS
```

Paste the exact command printed by the uploader into that SSH shell. Its form is below.

```sh
node dist/test-data-population.js --apply --anchor 2026-12-08 --approve REVIEWED_DRY_RUN_DIGEST --media GENERATED_HANDOFF
unset FARMERLANE_TEST_DATA_JOB_CREDENTIALS
```

Apply repeats the connected preflight, checks bootstrap eligibility and verifies the named SuperAdmin password. It serializes jobs with a PostgreSQL advisory lock. Per-owner media, per-market operations, per-site publication and per-vendor expenses each commit with a receipt in the existing platform audit. The receipt binds the fixture revision, approval digest and destination business. Market work and its receipt are atomic across occurrences, applications, rentals, assignments and offerings. Apply rechecks committed state and waits for deferred Vendure queue writes before the offline context closes.

Expect `status: applied` and 59 stage receipts on an untouched import. Each stage has `created` or `skip` and a scoped results summary. An error logs `status: failed`, a code and, when available, the logical ID and stage. An interrupt can leave earlier stages committed. Review the affected stage and repeat with the same release, anchor, approved digest and media handoff. Completed stages are skipped and tester edits are preserved. A new digest on a partially applied release reports a receipt conflict. Correct non-fixture business state through the existing workflows.

If an upload outcome is uncertain, rerun the same upload command first. It reconciles the owner library with the expected source hash without sending that photo again. If the photo is absent after verified reads and the operator has confirmed the original request has ended without an asset commit, wait at least two minutes and repeat the upload with `--retry-uncommitted logical-id/asset-key`. It reconciles again before retrying that one key. For `MEDIA_CONTENT_CONFLICT` or `MEDIA_RECEIPT_DRIFT`, review the owner's actual asset rows and storage with the existing media runbook. Preserve existing objects. Keep the workstation journal in `.runtime/staging-population` until acceptance. If a process is killed and leaves an `upload.lock`, confirm the old runner has exited before removing that lock file and resuming.

On acceptance, save the non-secret result, approval digest, and deployment ID in the operator record, exit SSH, and remove the temporary service and its scoped secrets. Retain the released fixture and secure tester account inventory. No API or worker restart is required for the fixture because the website registry and published snapshots are loaded on request.

## Manual acceptance

1. Open Lark & Grain, Fern & Furrow and Morning Hearth in a signed-out window. Check the theme, correct fictional story and product imagery. In each Admin workspace compare product IDs and inventory with the Phase B view and check the product and profile picture. Browse Oakthread as a different supplier type. Confirm preview and publication controls still work for each owner and deny access from a different owner.
2. Open all three market storefronts. Verify the date, local time and fictional venue against the dry run. Open the Foxglove first-date map with the photograph, compare its assignments to the dashboard, and confirm Stonebrook and Orchard Lantern each have open booth space. Check the later dates with published maps and no preset assignments.
3. In Foxglove Admin confirm Fern & Furrow and Lark & Grain are accepted and verified; check that Meadowcraft is pending. In Stonebrook compare Copperleaf and Gathered Table. In Orchard Lantern compare Briarstone and Second Sunrise. Check the occurrence-specific approval and membership, rental quantities, maps, listing publication, native booth pickup and the saved preorder window.
4. Check Foxglove's $44 cash-paid Fern & Furrow invoice and Lark & Grain's open invoice. Compare Stonebrook's and Orchard Lantern's open invoices and one draft. Check the two manual expenses in each designated vendor's Finances view. The demo paid invoice should show cash.
5. Sign in as Rowan. Check that the four preset vendor and market follows appear. Browse the market directory and vendor shops. Check the expected hosted eligibility state while Sandbox is disconnected. To test the full checkout, an authorized operator connects one of the 17 approved market vendors through the ordinary Stripe Sandbox flow, then checks stock, preorder availability, add to cart, market pickup and payment using the Sandbox acceptance runbook. A vendor with a pending application or no approved date also needs a fulfilled pickup context before shopping. Use a supported merchant and a synthetic test purchase.
6. Sign in as Silver Meadow and Iris. Confirm Silver Meadow has no storefront, catalog or market relationship and Iris has no order history. Confirm an unrelated working staging business retains its storefront, Stripe connection and saved data.
7. Before any deliberate Sandbox connection or tenant edits, repeat the generated apply command with the same digest if explicit repeat acceptance is required. It should report `skip` for every stage and preserve counts. Verify a single invoice/payment, occurrence and set of asset references for each tested fixture operation.

### Local manual acceptance

Use the four web `demo:market-operations:serve`, `demo:market-operations:worker`, `demo:market-operations:admin` and `demo:market-operations:storefront` scripts with `vendure_demo_market_ops`. Use the dedicated fictional Phase B identities. If they are absent locally, use the existing guarded Phase B demo catalog command for `--cohort curated` and a second selection of `briarstone,orchard-lantern-market,foxglove-market,stonebrook-market,silver-meadow,trial-customer-01,trial-customer-02`. Review each selection before applying. Keep the normal local scanner available and use the existing local account-origin configuration. [Local Phase B command](DEMO_DATA_PORTABILITY_PHASE_B.md#manual-acceptance)

From the backend, run the guarded dry run below. Use its local digest with the same workstation command prefixed with `--demo` immediately after the script path and the local owner credentials. It prints the guarded local apply command. The local fixture uses `http://<logical-id>.localhost:4321`. The local wrapper verifies the persistent demo target and blocks external networking in the offline job. The hosted staging digest is distinct. Perform the same representative checks with the dedicated fictional tenants. Established Manna Roots, Boerne and other source fixtures are outside the change.

```powershell
node node_modules/ts-node/dist/bin.js --project scripts/market-operations-demo/tsconfig.json scripts/test-data-population-demo.ts --dry-run --anchor 2026-12-08
```

## Verification and files

- `npm.cmd run build:server` passed. The compiled CLI accepted the full hosted and demo definitions and rejected a mismatched approval digest before any database connection.
- `npm.cmd run test:test-data` passed in a guarded disposable PostgreSQL database. The sample reused a Phase B catalog and exercised read-only planning, the named SuperAdmin, host collisions, cross-tenant media rejection, image association, committed publication, occurrences, verified membership and application decisions, layouts, booth assignments, pickup, offerings, cash settlement, expenses, follows, interruption and replay. Order, provider, financial allocation, catalog, inventory and user counts stayed stable. The harness dropped the successful database. Earlier failed iterations were retained by its normal diagnostic policy.
- The two web scripts passed ESLint. Both fixture generators matched their bundled manifests. The workstation `--check` decoded and sanitized all 58 reviewed originals and validated all 102 channel/photo mappings without contacting staging.
- An offline workstation mock interrupted the first upload after it committed, then recovered the same asset by its source hash. The full run created exactly 102 mock assets across 26 channels. A repeat produced the identical compressed handoff without new uploads or sign-ins.
- The existing Linux catalog release smoke passed its read-only database dump comparison, named SuperAdmin apply and clean shutdown after deferred native queue work persisted. It exercised the same worker composition and shutdown functions used by completion.
- The compiled entry returned the same plan in the cached Linux runtime with the two fixtures at their release paths. The Dockerfile admits and copies only the new media manifest in addition to the existing catalog fixture. The full offline Docker build stopped at `npm ci` because the registry dependency was absent from the local cache. The Docker smoke used cached Linux dependencies and mounted the current build and manifests.
- Hosted dry run, real R2 uploads, real hosted application, and browser acceptance remain operator steps. No browser launched during qualification.

| Checkout | Paths                                                                                                              | Change                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Backend  | `src/test-data-population.ts`; `src/test-data/population-{fixture,plan,apply,markets,websites}.ts`                 | Guarded command, full plan, provenance, staging, market and storefront domain calls.            |
| Backend  | `src/test-data-catalog.ts`; `src/test-data/accounts.ts`                                                            | Reuse the isolated job composition, deferred queue shutdown and named SuperAdmin authorization. |
| Backend  | `fixtures/staging-population-media-v1.json`; `Dockerfile`; `.dockerignore`                                         | Pin public photo definitions and include the fixture in the deny-by-default release.            |
| Backend  | `scripts/test-data-catalog-demo.ts`; `scripts/test-data-population-demo.ts`; `test/market-operations/test-data.ts` | Guarded local entry and focused disposable test.                                                |
| Web      | `scripts/build-staging-population-media.cjs`; `scripts/upload-staging-population-media.cjs`; this report           | Check original photos, perform owner uploads, and generate the reviewed apply handoff.          |
