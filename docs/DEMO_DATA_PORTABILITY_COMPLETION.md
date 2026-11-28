# Farmerlane demo population completion

The completion job extends the Phase B fixture namespace `farmerlane-fictional-trial` and catalog revision `2026-11-r1` with public media, storefronts, market operations and offline financial examples. The completion revision is `completion-r1`. It is an operator-run staging release.

Use two deployments of the existing temporary Railway service `staging-catalog-job`. Run the corrected dry run first, upload media once through the existing staging API, then deploy the apply command with the reviewed handoff. Both deployments run a direct Node start command without SSH. The API, worker, Admin, storefront, gateway and PostgreSQL require zero deployments. This correction adds no migrations. [Phase A audit](DEMO_DATA_PORTABILITY_PHASE_A.md) · [Phase B foundation and catalog](DEMO_DATA_PORTABILITY_PHASE_B.md) · [Dynamic storefront routing](DYNAMIC_STOREFRONT_ROUTING.md)

## Catalog receipt correction

Backend release `ea2c77a` flattened every vendor's catalog receipt into one set of numeric strings. Product and variant IDs come from separate PostgreSQL tables and sequences. A product ID can equal a variant ID, including the ID for one of its own variants. The completion planner treated those valid overlaps as duplicates and returned `PHASE_B_CATALOG_RECEIPT_INVALID` after the Phase B checks had already passed.

Phase B writes one atomic vendor receipt under the fixture namespace, logical vendor ID, definition hash and catalog revision `2026-11-r1`. Its mapping is a JSON string of rows, each containing one product ID followed by its variant IDs in fixture order. Phase B replay checked that the sizes, product-to-variant relationships, owner and channel matched. The receipt lookup had no pagination or result limit. Cohort-selection approval digests gate each apply independently. They are distinct from the fixture revision and are absent from the catalog receipt.

Disposable PostgreSQL reproduced the exact hosted discrepancy using the released Phase B writer and audit service. The complete receipts were 471 bytes for Morning Hearth's 18 products and 18 variants and 492 bytes for Lark & Grain's 18 products and 19 variants. Both had IDs shared across tables. Briarstone's 215-byte one-product, one-variant receipt had different IDs and passed the released check. The audit writer rejects metadata over 4,096 bytes and stores accepted metadata intact. The hosted pattern is consistent with the same overlap. Local verification did not inspect hosted receipt contents.

The original `PHASE_B_CATALOG_REQUIRED` conflicts had a separate cause. The initial curated import stopped before six vendor catalog transactions committed. Wildgrain was visibly empty, and the reviewed curated replay showed six catalogs to create and 16 to skip. The operator completed those six through Phase B. The second hosted completion dry run found all receipts and reported the duplicate-ID error on all 22 curated vendors. No further catalog recovery is required for the reported state.

Completion now resolves each vendor through the shared Phase B receipt lookup. It verifies the definition hash, revision, audit vendor and provisioned workspace, checks uniqueness separately for product IDs and variant IDs, and verifies each current product, variant, parent and owner-channel relationship. It consumes the stored mapping in fixture order. Original accounts, passwords, IDs, stock, tester edits and receipts stay in place. No identity is inferred from a name, slug or SKU.

| Conflict | Diagnostic `reason` and counts |
| --- | --- |
| `PHASE_B_CATALOG_REQUIRED` | `RECEIPT_NOT_FOUND`. No receipt matched the fixture namespace and vendor logical ID. Existing catalog contents alone cannot establish provenance. |
| `PHASE_B_CATALOG_RECEIPT_INVALID` | `RECEIPT_AMBIGUOUS`, `RECEIPT_DEFINITION_MISMATCH`, `RECEIPT_REVISION_MISMATCH`, `RECEIPT_VENDOR_MISMATCH` or `RECEIPT_PAYLOAD_MALFORMED`. The payload code covers invalid JSON, truncation and unsupported ID encoding. |
| `PHASE_B_CATALOG_RECEIPT_INVALID` | `PRODUCT_COUNT_MISMATCH`, `VARIANT_COUNT_MISMATCH`, `DUPLICATE_PRODUCT_ID` or `DUPLICATE_VARIANT_ID`. The output gives expected counts and, when decoded, receipt counts. |
| `PHASE_B_CATALOG_RECEIPT_INVALID` | `DESTINATION_RECORD_MISSING` for absent or deleted rows, or `DESTINATION_OWNERSHIP_MISMATCH` for a wrong parent, owner or channel. The output also gives the number of mappings that passed destination checks. |

Catalog conflicts identify the fictional logical vendor and counts without disclosing receipt contents or destination IDs. If any catalog still conflicts, stop before uploading media. Compare the result with the recorded Phase B import and preserve the existing data and audit history while investigating.

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

Use the two sibling checkouts. The correction deploys from a branch based on backend `ea2c77a`. These path-scoped commands leave unrelated staged work out of the commits. Pause automatic deploys on `staging-catalog-job` before pushing or selecting the correction branch.

```powershell
Set-Location E:\coding\farmers-market-platform
$backendFiles = @(
  'src/test-data-population.ts',
  'src/test-data/catalog-plan.ts',
  'src/test-data/population-apply.ts',
  'src/test-data/population-fixture.ts',
  'src/test-data/population-plan.ts',
  'test/market-operations/population-catalog.ts'
)
git switch -c codex/fix-population-catalog-receipts ea2c77a
git add -- $backendFiles
git diff --cached -- $backendFiles
git commit --only -m "Fix population catalog receipt validation" -- $backendFiles
git show --stat --oneline HEAD
git push -u origin codex/fix-population-catalog-receipts
```

Commit the runbook and workstation changes locally in the web checkout. The workstation uses these files directly and Railway builds only the backend correction branch.

```powershell
Set-Location E:\coding\farmers-market-platform-web
$webFiles = @(
  'docs/DEMO_DATA_PORTABILITY_COMPLETION.md',
  'scripts/upload-staging-population-media.cjs'
)
git add -- $webFiles
git diff --cached -- $webFiles
git commit --only -m "Document the non-SSH population workflow" -- $webFiles
```

Confirm the Phase B import has completed, foundational commerce is healthy, wildcard dynamic routing is active and the existing fixture-owner uploads are qualified. The job opens no listener, scheduler or queue consumer. The existing worker can process native indexing and in-app events. [Commerce foundation](FOUNDATIONAL_COMMERCE_CONFIGURATION.md) · [Hosted media](HOSTED_FILE_STORAGE_PHASE_C.md) · [Dynamic routing](DYNAMIC_STOREFRONT_ROUTING.md)

Reuse `staging-catalog-job` in Railway's **staging** environment. Use the backend repository root, its existing Dockerfile and the correction commit. Use one replica and the **Never** restart policy. Keep the service private with health checks, volumes, cron and pre-deploy commands unset. Review staged changes before each deployment and include only this service. [Railway staged changes](https://docs.railway.com/deployments/staged-changes) · [Restart policy](https://docs.railway.com/deployments/restart-policy)

| Setting | Job value |
| --- | --- |
| Environment identity | `APP_ENV=production`, `NODE_ENV=production`, `DEPLOYMENT_ENV=staging`, `HOSTED_TRANSPORT=railway-private`. Railway supplies `RAILWAY_ENVIRONMENT_NAME` and `RAILWAY_SERVICE_ID`. |
| Opt-ins | `FARMERLANE_TEST_DATA_STAGING=true`, `FARMERLANE_TEST_DATA_CATALOG=true`, `FARMERLANE_TEST_DATA_POPULATION=true`. |
| Database | `DB_NAME=market_staging`, `DB_SCHEMA=public`, `DB_USERNAME=market_staging_runtime`, `DB_SYNCHRONIZE=false`. Set `DB_HOST` to the staging PostgreSQL private `*.railway.internal` reference and `DB_PORT` to its private port. Seal or reference the existing runtime `DB_PASSWORD`. Match the database's `DB_TRANSPORT_POLICY` and provide its existing `DB_TLS_CA` for `verify-full` only. |
| Private composition | `PORT=3000`, `HOST=::`, `INTERNAL_API_ORIGIN=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000`, `TRUSTED_PROXY_CIDRS=disabled`, `STOREFRONT_PARENT_DOMAIN=farmerlane.com`. |
| Public composition | `API_ORIGIN=https://staging-api.farmerlane.com`, `ADMIN_ORIGIN=https://staging-admin.farmerlane.com`, `PLATFORM_ACCOUNT_ORIGIN=https://staging-auth.farmerlane.com`, `ASSET_URL_PREFIX=https://staging-api.farmerlane.com/assets/`, `CORS_ORIGINS=https://staging-admin.farmerlane.com`, `STAGING_TESTER_ACCESS=provisioned`, `STAGING_ANONYMOUS_STOREFRONTS=published`. |
| Provider isolation | `STRIPE_ENABLED=false`, `STRIPE_COLLECTION_SUSPENDED=true`, `ENABLE_PAID_ATTRIBUTION=true`, `REFUND_POLICY_VERSION=staging-collection-disabled-v1`. Keep test collection, recovery, refund, billing, POS, account email and SMS, contact delivery, uploads and QuickBooks network flags unset or false. Omit R2 and other provider credentials, scanner bypass and live ingress, bridge and cookie secrets. The job generates ephemeral composition keys for apply. |
| Named principal | Set `SUPERADMIN_USERNAME` to the exact existing named SuperAdmin who authorized Phase B. The previously tried `farmerlane_staging_admin` does not identify a hosted user. Leave `SUPERADMIN_PASSWORD` unset. |
| Apply inputs | Leave `FARMERLANE_TEST_DATA_JOB_CREDENTIALS` and `FARMERLANE_TEST_DATA_POPULATION_MEDIA` unset for the first deployment. Add both to this service for apply as described below. |

### First deployment

Set the Railway **Custom Start Command** to the command below and deploy the correction commit. If the example's first market date has already passed, choose a later anchor before deploying. Save the commit and anchor with the dry-run output.

```sh
node dist/test-data-population.js --dry-run --anchor 2026-12-08
```

Expect exit 0 with `status: dry-run`, an empty `conflicts` array, 59 pending stages on the untouched completion dataset and the approval `digest`. The manifest should show 29 accounts, 397 products, 398 variants, 102 upload mappings and 26 websites. The destination `resolvedCounts` should show `accounts: 29`, `products: 397`, `variants: 398`, `websitePlans: 26` and `mediaMappings: 0`. The first run has no uploaded asset handoff. Review the planned market dates, URLs, owners and photo sources. Exit 2 means a conflict prevented approval. Exit 1 indicates a startup or validation failure. The dry run uses the guarded connection and release ledger and runs in a read-only transaction.

### Workstation media upload

Build the correction locally. The web script reads the compiled backend fixture and checks the reviewed digest. `--check` verifies the 58 originals and their 102 mappings without calling staging. The upload uses the current fixture-owner passwords from the vault. Paste a bundle of the form `{"sharedPassword":"<vault value>","passwords":{"logical-id":"<current per-owner password>"}}` at the masked prompt. The override map is optional. Use a single workstation and keep its journal until acceptance.

```powershell
Set-Location E:\coding\farmers-market-platform
npm.cmd run build:server
Set-Location E:\coding\farmers-market-platform-web
$anchor = '2026-12-08'
$approved = 'REVIEWED_DRY_RUN_DIGEST'
node scripts/upload-staging-population-media.cjs --anchor $anchor --approve $approved --check
if ($LASTEXITCODE -ne 0) { throw 'Media check failed' }
$env:FARMERLANE_FIXTURE_MEDIA_CREDENTIALS = Read-Host -MaskInput 'Paste the fixture owner credential JSON'
try {
  node scripts/upload-staging-population-media.cjs --anchor $anchor --approve $approved --upload
  if ($LASTEXITCODE -ne 0) { throw 'Media upload failed' }
} finally {
  Remove-Item Env:FARMERLANE_FIXTURE_MEDIA_CREDENTIALS -ErrorAction SilentlyContinue
}
```

Expect 26 `media-owner-verified` records, followed by `media-handoff-ready` with the measured byte count, the `FARMERLANE_TEST_DATA_POPULATION_MEDIA=...` line and the exact apply command. The handoff carries the approval digest and the 102 ID/path pairs. If an upload outcome is uncertain, rerun the same upload command so it can reconcile the owner library by source hash. If the photo remains absent after verified reads and the original request ended without a commit, wait at least two minutes and repeat with `--retry-uncommitted logical-id/asset-key`. For `MEDIA_CONTENT_CONFLICT` or `MEDIA_RECEIPT_DRIFT`, inspect the asset and storage references before retrying. Remove a stale journal `upload.lock` only after confirming the runner has exited.

### Second deployment

Stage these two variables on `staging-catalog-job` only, together with the new start command. Use the same correction commit and anchor as the successful dry run.

| Service variable | Value |
| --- | --- |
| `FARMERLANE_TEST_DATA_POPULATION_MEDIA` | Paste only the base64url value to the right of the equals sign. Use one line without quotation marks. |
| `FARMERLANE_TEST_DATA_JOB_CREDENTIALS` | Add and seal the exact JSON `{"bootstrapPassword":"<named SuperAdmin's current password>"}` from the vault. The completion job needs only the named SuperAdmin password. |

Set **Custom Start Command** to the exact command the uploader printed. Its form is below. Node reads the staged variables directly, so Dockerfile exec form needs no shell, quoting or variable expansion. Apply uses the handoff and password without printing either value. [Railway start command](https://docs.railway.com/deployments/start-command) · [Railway service and sealed variables](https://docs.railway.com/variables)

```sh
node dist/test-data-population.js --apply --anchor 2026-12-08 --approve REVIEWED_DRY_RUN_DIGEST
```

Apply repeats connected preflight, verifies all 102 media mappings by exact source and channel, and authorizes the named SuperAdmin. It serializes jobs with an advisory lock and commits each stage together with its receipt. It waits for deferred Vendure queue writes before closing. Expect exit 0 with `status: applied`, 59 stage entries and `resolvedCounts.mediaMappings: 102`. Each stage reports `created` or `skip`. The service exits after writing its result. An exit 1 record includes a safe code and the logical ID and stage when available.

If apply was interrupted, identify the failing stage from the logs. After correcting the cause, redeploy the same commit, command, anchor, digest and handoff. Committed stages are skipped and one incomplete stage can be retried safely. Keep the original handoff and journal so a retry can reuse the same assets. A different digest on a partial apply conflicts. After manual acceptance, save the non-secret result, digest and deployment IDs. Remove the temporary service and its scoped variables. Keep the reviewed release and secure tester inventory.

## Manual acceptance

1. Open Lark & Grain, Fern & Furrow and Morning Hearth in a signed-out window. Check the theme, correct fictional story and product imagery. In each Admin workspace compare product IDs and inventory with the Phase B view and check the product and profile picture. Browse Oakthread as a different supplier type. Confirm preview and publication controls still work for each owner and deny access from a different owner.
2. Open all three market storefronts. Verify the date, local time and fictional venue against the dry run. Open the Foxglove first-date map with the photograph, compare its assignments to the dashboard, and confirm Stonebrook and Orchard Lantern each have open booth space. Check the later dates with published maps and no preset assignments.
3. In Foxglove Admin confirm Fern & Furrow and Lark & Grain are accepted and verified; check that Meadowcraft is pending. In Stonebrook compare Copperleaf and Gathered Table. In Orchard Lantern compare Briarstone and Second Sunrise. Check the occurrence-specific approval and membership, rental quantities, maps, listing publication, native booth pickup and the saved preorder window.
4. Check Foxglove's $44 cash-paid Fern & Furrow invoice and Lark & Grain's open invoice. Compare Stonebrook's and Orchard Lantern's open invoices and one draft. Check the two manual expenses in each designated vendor's Finances view. The demo paid invoice should show cash.
5. Sign in as Rowan. Check that the four preset vendor and market follows appear. Browse the market directory and vendor shops. Check the expected hosted eligibility state while Sandbox is disconnected. To test the full checkout, an authorized operator connects one of the 17 approved market vendors through the ordinary Stripe Sandbox flow, then checks stock, preorder availability, add to cart, market pickup and payment using the Sandbox acceptance runbook. A vendor with a pending application or no approved date also needs a fulfilled pickup context before shopping. Use a supported merchant and a synthetic test purchase.
6. Sign in as Silver Meadow and Iris. Confirm Silver Meadow has no storefront, catalog or market relationship and Iris has no order history. Confirm an unrelated working staging business retains its storefront, Stripe connection and saved data.
7. Verify a single invoice/payment, occurrence and set of asset references for each tested fixture operation. If explicit replay acceptance is required, redeploy the same apply command and variables before any Sandbox connection or tenant edits. Expect `skip` for every stage and unchanged counts.

### Local manual acceptance

Use the four web `demo:market-operations:serve`, `demo:market-operations:worker`, `demo:market-operations:admin` and `demo:market-operations:storefront` scripts with `vendure_demo_market_ops`. Use the dedicated fictional Phase B identities. If they are absent locally, use the existing guarded Phase B demo catalog command for `--cohort curated` and a second selection of `briarstone,orchard-lantern-market,foxglove-market,stonebrook-market,silver-meadow,trial-customer-01,trial-customer-02`. Review each selection before applying. Keep the normal local scanner available and use the existing local account-origin configuration. [Local Phase B command](DEMO_DATA_PORTABILITY_PHASE_B.md#manual-acceptance)

From the backend, run the guarded dry run below. Use its local digest with the same workstation command prefixed with `--demo` immediately after the script path and the local owner credentials. It prints the guarded local apply command. The local fixture uses `http://<logical-id>.localhost:4321`. The local wrapper verifies the persistent demo target and blocks external networking in the offline job. The hosted staging digest is distinct. Perform the same representative checks with the dedicated fictional tenants. Established Manna Roots, Boerne and other source fixtures are outside the change.

```powershell
node node_modules/ts-node/dist/bin.js --project scripts/market-operations-demo/tsconfig.json scripts/test-data-population-demo.ts --dry-run --anchor 2026-12-08
```

## Verification and changed files

The focused run used PostgreSQL 17.10 in a guarded disposable database. A source snapshot of `ea2c77a` supplied the release dependencies and original Phase B code. Verification reused the same database for the released and corrected planners. No unrelated local changes entered the build or test.

- Ran Phase B in the hosted cohort order: `trial`, `curated`, `scenario`, `markets`, `onboarding`. Interrupted the first curated pass inside the Gathered Table catalog transaction. The first completion plan found the same six missing catalogs. The ordinary curated replay created only those six. The released completion planner then reported exactly 22 invalid catalogs and accepted Briarstone.
- The corrected plan returned zero conflicts. It resolved all 29 accounts and checked every one of the 397 product and 398 variant IDs against the fixture relationships and both owner-channel associations. It produced 26 storefront plans. A second plan resolved 102 media mappings using locally created Vendure assets. A cross-tenant asset substitution resolved 101 and raised the expected conflict.
- Rejected missing, duplicate, malformed, revision-mismatched and definition-mismatched catalog receipts, wrong product or variant counts, duplicate IDs within a table, missing destination records, cross-tenant product and variant mappings, and a missing variant-channel association. The negative receipt cases used transaction-local copies of the audit table. The actual append-only audit table was preserved.
- Table fingerprints matched before and after the read-only plans and a complete Phase B replay with a different supplied fixture password. Existing account IDs, password hashes, product and variant rows, audit receipts, inventory operations and stock were preserved. A product title edited to a test value and its changed stock quantity survived replay.
- `npm.cmd run build:server` passed. The compiled definition reproduced the hosted December 8 completion digest `f56260fec3f8f72e128ad1e366db4823871d96d4e1fe91f372c8566f637bbb48`. The released fixture bytes also reproduced the curated Phase B digest `c4335aa51fcadcbd3deee6979d50db264700b5dc58404dfedcd107155c1422d7`. Keep the committed fixture's LF bytes when comparing digests on Windows because the definition hashes raw catalog fixture bytes.
- The upload script passed syntax and ESLint checks. Its `--check` validated 58 reviewed photographs and all 102 mappings without contacting staging.
- The measured full handoff for December 8 was **2,107 base64url bytes**, from 6,889 JSON bytes and 1,580 gzip bytes using the same encoding as the workstation uploader and the actual 102 local ID/path pairs. Hosted IDs and paths will change the exact byte count, which the uploader prints. The CLI allows 36,000 base64url characters and 64,000 decoded JSON bytes. Railway documents service variables at runtime. The measured payload was verified locally in a Linux container through the exact direct Node command and one scoped environment variable. Railway's service-specific variable capacity was not tested. [Railway service variables](https://docs.railway.com/variables)
- The offline Linux command rejected a wrong approval digest and a malformed handoff with their respective safe codes before any database connection. The valid measured payload passed both validation gates and reached the expected DNS failure with container networking disabled. Command output contained neither the uploaded payload nor the synthetic database password.
- Provider activity, real R2 uploads, the hosted correction dry run, the full completion apply and manual acceptance remain outside the local verification. PostgreSQL emitted an existing driver deprecation warning about overlapping client queries. No unrelated suites or browser checks ran.

Run the focused regression from the backend with loopback PostgreSQL and the existing disposable-test `DB_HOST`, `DB_PORT`, `DB_USERNAME` and `DB_PASSWORD` settings. The harness creates and owns a new `vendure_test_population_*` database.

```powershell
npm.cmd run build:server
node node_modules/ts-node/dist/bin.js --project test/market-operations/tsconfig.json test/market-operations/population-catalog.ts
```

| Checkout | Changed file | Change |
| --- | --- | --- |
| Backend | `src/test-data/catalog-plan.ts` | Shares catalog receipt resolution, separates product and variant ID uniqueness, and reports verified destination counts and failure conditions. |
| Backend | `src/test-data/population-plan.ts` | Uses the shared mapping directly and reports sanitized reasons, manifest counts and verified destination counts. |
| Backend | `src/test-data/population-fixture.ts` | Supplies the pinned Phase B revision for completion receipt validation. |
| Backend | `src/test-data/population-apply.ts` | Checks re-resolved actors for catalog conflicts and returns verified totals after apply. |
| Backend | `src/test-data-population.ts` | Accepts the staged media environment variable for hosted apply. The existing inline media option remains available. |
| Backend | `test/market-operations/population-catalog.ts` | Qualifies released receipts, realistic multi-cohort import and replay, ownership, read-only planning and full media resolution. |
| Web | `scripts/upload-staging-population-media.cjs` | Prints the handoff byte count, scoped variable value and direct hosted apply command. |
| Web | `docs/DEMO_DATA_PORTABILITY_COMPLETION.md` | Records the diagnosis, qualification, exact non-SSH release procedure and acceptance steps. |
