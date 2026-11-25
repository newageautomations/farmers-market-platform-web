# Farmerlane hosted file storage, Phase C

Hosted uploads start disabled. The staging API can accept synthetic test uploads after the operator qualifies both private R2 buckets, confirms existing files are safe, and enables both upload flags. The worker uses the media bucket for existing reads and initialization. Production rejects either flag set to `true`. Local development and test configurations retain filesystem storage and ClamAV.

## Upload authorization and file status

- The staging API requires the hardened Railway private runtime, its verified isolated PostgreSQL database, provisioned admission and both valid R2 credential sets. The flags must both be `true`. Omitted flags default to `false`. A partial pair, malformed boolean, or enabled pair on the worker fails startup.
- A current session must belong to a Vendor or Market Manager recorded in the existing staging fixture-creation audit. Native Vendure asset uploads also admit the individually audited initial staging operator when Vendure grants native asset creation. Ordinary customers and the configured bootstrap administrator have no upload exception. Existing channel, resource and business permissions apply. The media grant is scoped to the four supported Admin mutation resolvers. Background jobs and other paths cannot use it.
- Vendors’ product and category images, business profile images, vendor and market website images, and layout and rental images continue through their existing PNG/JPEG libraries. Native `createAssets` retains Vendure’s existing types, validation and limits. Vendure still serves assets with its CSP and `nosniff` headers. Markup such as SVG retains its sandbox and attachment handling.
- The private upload service still validates, encrypts and stores quarantine bytes before making a file available. It checks staging fixture provenance at upload and rechecks it alongside resource authority at promotion. The staging path skips the scanner and sets `staging_scan_bypassed=true` while promoting the file. `Available` is download eligibility. Documents shows **Available · Unscanned** and Finances adds **(unscanned)** to the receipt name. Upload audits record the disposition. The media admission log records the operation without the filename, object key or credentials.
- Migration `StagingUploadScanDisposition1798300000000` adds a boolean to `compliance_file` and `finance_receipt`. Existing rows default to `false` and retain their original status, bytes and associations. A true marker requires the corresponding available state. Staging files from this exception stay in staging.

Backend changes are in `src/file-storage-policy.ts`, `src/vendure-config.ts`, `src/r2-media-storage.ts`, the production-hardening, documents-compliance and financial-reporting plugins, the shared test-account audit code, and the additive migration. The Dockerfile packages `scripts/inspect-staging-files.cjs`. The two staging environment examples describe service scope. Focused tests extend the existing storage, document, receipt, staging-account, hosted ingress and worker suites. The web changes are in `DocumentsWorkspace.tsx`, `ExpenseDialog.tsx`, the document and finance API types, and `tests/documents.test.tsx`.

## Inventory and preserve existing files

Run the inventory before replacing the current staging API container or switching storage reads. Its filesystem may be ephemeral. Quiesce changes through the existing staging maintenance procedure, take a database backup, and record the current release IDs. Use the running API service’s existing authorized Railway SSH access. The command uses the API runtime login, verifies PostgreSQL identity and private network addresses, and runs a read-only transaction. The default output is counts by reference type and status.

On the current Phase B release, open `railway ssh --service api --environment staging` in the linked staging project. From the backend release working directory, enter the first line below, paste the complete [inventory script](../../farmers-market-platform/scripts/inspect-staging-files.cjs), and enter `NODE` alone on the final line. For detailed output, append `--keys` after `node -`. Keep the output in the operator’s restricted workspace.

```sh
FARMERLANE_STORAGE_INVENTORY_STAGING=true node - <<'NODE'
# Paste the complete script here.
NODE
```

On Phase C and later the API image contains the same tool.

```sh
FARMERLANE_STORAGE_INVENTORY_STAGING=true node scripts/inspect-staging-files.cjs
FARMERLANE_STORAGE_INVENTORY_STAGING=true node scripts/inspect-staging-files.cjs --keys
```

If API SSH is unavailable, use the existing one-shot private Railway job pattern with the Phase C backend release. Give the temporary job the API's existing runtime database fields and private transport settings, plus the hardened deployment identity. Use `FARMERLANE_STORAGE_INVENTORY_STAGING=true` on that job and the packaged counts-only command. Use one replica and restart policy **Never**, verify exit 0, then remove the job. Preserve access to the current API container or its backup if the inventory identifies files to copy. [Private job procedure](STAGING_TEST_ACCOUNTS.md#run-once-in-railway-without-ssh)

1. Review all Vendure source and preview keys, stored media URL references, document versions and receipt statuses. Include legacy absolute asset references from both website states, business profiles, layout definitions and rentals. An empty bucket has no bearing on database references. An inventory failure blocks the cutover.
2. If there are no objects to preserve, skip the copy. If files are already verified in the correct R2 buckets, retain their keys and the original encryption key. For remaining files, retrieve originals from the current source container or its verified backup before replacing it. A private file’s existing ciphertext requires its original encryption key.
3. Copy originals and previews under their existing keys with conditional create-only writes. Convert legacy Windows separators to `/` after checking for collisions. Copy encrypted private blobs byte-for-byte under their stored `*.bin` keys. Keep database associations and existing public URLs. Review legacy absolute URLs on other origins before cutover and resolve them through the existing saved configuration workflows. Cache keys can regenerate. Leave removed, failed and rejected files inaccessible.
4. Compare object keys, counts, lengths and hashes against the source inventory. For an existing R2 key, compare the destination bytes before accepting it. Stop on a mismatch or a missing required object. Keep the source and backups intact. Verify several existing media URLs and authorized private downloads after switching reads.

## Railway configuration

Apply the variables to the existing staging services only. Retain `APP_ENV=production`, `NODE_ENV=production`, `DEPLOYMENT_ENV=staging`, `HOSTED_TRANSPORT=railway-private`, private PostgreSQL and API networking, and the existing provisioning, provider and ingress settings. Keep `STAGING_TESTER_ACCESS=provisioned` and `STAGING_ANONYMOUS_STOREFRONTS=published` on the API. Preserve `API_ORIGIN=https://staging-api.farmerlane.com` and `ASSET_URL_PREFIX=https://staging-api.farmerlane.com/assets/` wherever already configured.

| Variable                       | API                                             | Worker            |
| ------------------------------ | ----------------------------------------------- | ----------------- |
| `R2_ENDPOINT`                  | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | Same endpoint     |
| `R2_MEDIA_BUCKET`              | `farmerlane-staging-media`                      | Same bucket       |
| `R2_MEDIA_ACCESS_KEY_ID`       | Seal the existing media access key ID           | Same sealed value |
| `R2_MEDIA_SECRET_ACCESS_KEY`   | Seal the existing media secret                  | Same sealed value |
| `R2_PRIVATE_BUCKET`            | `farmerlane-staging-documents`                  | Omit              |
| `R2_PRIVATE_ACCESS_KEY_ID`     | Seal the existing documents access key ID       | Omit              |
| `R2_PRIVATE_SECRET_ACCESS_KEY` | Seal the existing documents secret              | Omit              |
| `DOCUMENT_ENCRYPTION_KEY`      | Seal the stable 64-digit hex key                | Omit              |
| `HOSTED_FILE_UPLOADS_ENABLED`  | `false` initially                               | Omit              |
| `STAGING_MALWARE_SCAN_BYPASS`  | `false` initially                               | Omit              |

Use distinct Object Read & Write credentials scoped to each existing bucket. Both buckets stay private. Admin, Astro, Gateway, PostgreSQL and the migration service receive no new storage settings. If existing ciphertext needs preservation, retrieve the existing key from its secure backup. Otherwise generate one with this PowerShell command in an unrecorded local terminal and save it directly to the operator vault and the sealed Railway variable. Preserve the same key across deployments and restores.

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $rng.GetBytes($bytes)
    [System.BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
} finally {
    $rng.Dispose()
    [Array]::Clear($bytes, 0, $bytes.Length)
}
```

## Hosted acceptance

### Configure R2 with uploads disabled

1. Complete the inventory and preserve files before replacing the running API. Follow the [guarded Railway database release](STAGING_DEPLOYMENT_PHASE_B3_C_PREPARATION.md) to drain the old services, back up the database and run `node dist/migrate-hosted.js staging market_staging` from the Phase C release using the temporary migrator. Confirm `hosted_migration_complete` before starting the Phase C API and worker. Release the corresponding Admin web build for the status labels.
2. With both flags `false`, configure the table above and start the API and worker. The API checks both pre-created buckets with `HeadBucket`. The worker checks only the media bucket. Confirm `server_started` and `worker_started` and Railway’s private `/health/ready` response. From the API shell, a loopback check is `node -e "fetch('http://[::1]:'+process.env.PORT+'/health/ready',{headers:{Host:'healthcheck.railway.app'}}).then(r=>{console.log(r.status);process.exitCode=r.ok?0:1})"`. Expect HTTP 200. Test a preserved object through the application if the inventory found one.
3. Open both pilot storefronts signed out and then log in through the [staging account page](https://staging-auth.farmerlane.com/account/login) as a designated uploader. Confirm the correct workspaces and storefronts load, and that synthetic media and document uploads are refused. Stage A qualifies startup and connectivity. Stage C and D qualify real writes and reads.

### Activate trusted staging uploads

1. Change both flags to `true` in one staging API deployment. Confirm readiness again. Leave worker settings as above.
2. Use designated audited Vendor and Market Manager fixtures. Existing examples are `sarah.bennett@fixtures.invalid` for Cedar Bend Farm and `daniel.carter@fixtures.invalid` for Juniper Grove Market, if those workspaces are designated for the test. Use the [existing test-account workflow](SUPERADMIN_TEST_ACCOUNTS.md) to create dedicated fixtures if needed. Use only workspaces and records approved for acceptance.
3. Confirm an ordinary signed-in customer, an unaudited business login, and a signed-out browser cannot upload. Try selecting an unrelated channel with a trusted tester and confirm existing business authorization still denies it.

### Qualify public media

1. In Admin go to `/vendor/products`, use a test product’s Images picker, save and reopen it. On the Categories view, check its existing image picker where enabled. Use `/vendor/settings/profile` to save a synthetic business logo as the profile image. Test the existing Market profile picker at `/market/settings/profile` if the fixture uses it.
2. Open `/vendor/storefront` and `/market/storefront`. Upload a harmless PNG or JPEG, save and publish through each existing editor. In a separate signed-out browser session visit the corresponding vendor and market storefront URLs. The existing pilot fixtures use `https://staging-vendor.farmerlane.com/` and `https://staging-market.farmerlane.com/`. Inspect one preview and one resize such as `?w=80&mode=resize` on a real `/assets/` preview URL. The public media host stays `https://staging-api.farmerlane.com/assets/`.
3. In the test Market workspace, use `/market/layouts` and the layout or rental image picker to verify the shared market library. An audited staging operator with native Vendure permissions can also use the existing Admin API `createAssets` operation with a synthetic PNG. Check that unsupported and oversized files are rejected.

### Qualify private files

1. In `/vendor/documents`, add a PDF or image with invented content. Confirm **Available · Unscanned**, preview and download it, and compare the downloaded bytes with the original. Replace the file with a different sample. Verify the version count increments and the new file downloads. If the first version had a grant before replacement, check that the grant still serves the first sample until it is revoked.
2. Create a dedicated published application at `/market/applications` with an application-stage document request. Have the trusted Vendor sign in on the Market storefront and open its published `/apply/<slug>` URL. Upload a sample, explicitly share it, and check the granted version from the corresponding Market review. Confirm an unrelated Market cannot download it and revocation withdraws the original Market’s access.
3. In `/vendor/finances/expenses` or `/market/finances/expenses`, add a test expense and upload a sample receipt. Confirm **(unscanned)** and compare its authorized download. Verify an unrelated tenant cannot retrieve it. Keep real compliance and financial records out of this exercise.

### Verify persistence after a redeploy

1. Redeploy the staging API and worker with the same buckets and encryption key. Reopen the test product, published sites, document versions and expense. Confirm URLs, previews, downloads, IDs and record associations survive.
2. In Cloudflare R2 Object Storage, open each private bucket and compare the acceptance inventory with the object list. Media normally uses `source/<hash>/<filename>`, `preview/<hash>/<filename>__preview.<extension>` and `cache/<variant path>`. Private objects have opaque UUID-style `<uuid>.bin` names with no plaintext document names. Download only a synthetic ciphertext sample through the authenticated dashboard. It should be 28 bytes longer than the input and have a different SHA-256. Check the original plaintext SHA-256 through an authorized application download. Phase B’s format is a 12-byte IV followed by a 16-byte GCM tag and ciphertext. Dashboard inspection verifies that the object is not stored as the original bytes. The app’s successful authenticated decryption and integrity check verify its round trip.

## Local verification and manual regression

The existing guarded workflow applied only `StagingUploadScanDisposition1798300000000` to `vendure_demo_market_ops` and verified its migration ledger. Records and fixture data were preserved. Run the same migration on another copy before starting that demo on Phase C. Use the backend’s `npm.cmd run documents:scanner:health` to confirm local ClamAV. If needed, use the existing `npm.cmd run documents:scanner:up`.

```powershell
npm.cmd run demo:market-operations:migrate
npm.cmd run demo:market-operations:serve
npm.cmd run demo:market-operations:worker
npm.cmd run demo:market-operations:admin
npm.cmd run demo:market-operations:storefront
```

Run each long-lived process in a separate terminal. Use the [guarded demo fixture workflow](TEST_DATA_MANAGER_PHASE_A.md#local-demo-accounts) with a unique namespace such as `storage-phase-c`, one Vendor, one Market Manager and one Customer. In the backend checkout, review then apply the fixture spec with `npm.cmd run test-data:seed -- --spec fixture-accounts.json --target demo --dry-run` and `npm.cmd run test-data:seed -- --spec fixture-accounts.json --target demo --apply`. Sign in at each returned destination. Use the matching Admin routes above on `http://localhost:4322`, and the dedicated Market’s local storefront URL for `/apply/<slug>`. Follow the media, document, replacement, share, revoke and receipt checks using only new fixture records. Local valid files should become available with normal scanner behavior and no unscanned label. Leave Manna Roots and established manager data intact.

| Automated verification                                                                                                                                | Result                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend `npm.cmd run build` with explicit local environment and Admin staging build from the example settings                                         | Passed.                                                                                                                                                                                                 |
| Backend `npm.cmd run test:file-storage`                                                                                                               | Five checks passed for policy, storage strategy, media retrieval and transforms, active-content headers, failure cleanup, and authenticated private ciphertext format and integrity.                    |
| Backend `npm.cmd run test:documents -- --mock-r2 --live --storage-only`                                                                               | 43 checks passed, including real local ClamAV detection, private staging uploads, applicant sharing and revocation, replacement and failed-write handling.                                              |
| Backend `test/financial-reporting/run.ts test --mock-r2`                                                                                              | Both focused receipt checks passed, including staging provenance, failed writes, encryption, download authorization and tamper rejection.                                                               |
| Backend `npm.cmd run test:test-data`, `npm.cmd run test:database-startup -- --mock-r2`, `npm.cmd run test:database-hosted`, and hosted ingress checks | Passed. Covers real multipart native and custom media resolvers, denied principals and limits, the inventory query, worker startup with media credentials only, and hosted database and ingress guards. |
| Targeted web ESLint and Vitest                                                                                                                        | ESLint passed. Vitest passed 58 of 59. The existing Documents navigation assertion still fails.                                                                                                         |
| Web `tsc --noEmit`                                                                                                                                    | Reports unrelated existing diagnostics in vendor loyalty, shared table navigation and test fixtures.                                                                                                    |

Automated integration used mocked R2 and guarded disposable PostgreSQL. Live bucket qualification, hosted UI acceptance and manual demo workflows are pending.

## Disable uploads and recover

- Set both API flags to `false` in one release with the same R2 variables and key. Confirm readiness, denied new uploads and working reads of existing R2 media and authorized files. On a failed state, restore the known-good paired settings and redeploy the API. During a rollout where an old active process is still serving, quiesce staging uploads through the existing ingress maintenance procedure until the replacement is ready.
- For bad credentials or an outage, keep writes closed. Inspect fixed startup codes such as `R2_MEDIA_BUCKET_UNAVAILABLE`, `R2_PRIVATE_BUCKET_UNAVAILABLE` and `DOCUMENT_ENCRYPTION_KEY_INVALID`. Check the bucket names, account endpoint, scoped permissions, credentials and provider health. Restore the original key from the vault if incorrect. A valid-looking but wrong key can pass startup format validation and fail decrypting existing files. Prove existing reads before reopening uploads.
- If an operation fails, compare the failed or pending database record with the object inventory. Verify no in-flight request still owns it. Preserve quarantine and audit history. Check for an incomplete multipart upload or a possible orphan after failed cleanup. Keep the original material and recover missing available objects only from verified backups. A retry uses the ordinary upload workflow.
- The prior release rejects the newer migration ledger and a local-only release cannot read R2. Prefer a forward-compatible build with upload flags disabled. If an older artifact is required, test recovery in an isolated environment using a matched application and database snapshot plus all needed byte stores. Existing Phase C R2 writes and classifications require preservation and reconciliation before any database or app cutback. Keep live and backup bucket contents intact.

Production activation requires scanner integration and operational qualification for every upload path, including native and custom media, with fail-closed availability, signature freshness, throughput and timeout verification. The staging exception is restricted to the documented fixture classes. Real R2 signature, multipart, bucket policy, and redeploy persistence checks remain pending until the hosted procedure is run.
