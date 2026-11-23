# Phase C storefront contact and applicant uploads

Private local review, November 18, 2026. **Both A-05 workflows passed the disposable database check with production HTTP guards enabled.** A guest retry produced one submission, one outbox event and one notification in the intended vendor's inbox. An authorized applicant uploaded a PNG through the market storefront handler. After a real ClamAV scan, the database showed `Available` and the decrypted private file matched the submitted bytes.

Phase B established two early denials, `BROWSER_ORIGIN_DENIED` for contact and `BROWSER_ORIGIN_REQUIRED` for upload. A-04 was a concern about where Shop operation policy ran. Phase B established no disclosure. The changes here cover the multipart path involved in A-05.

## Changes by repository

| Repository and files | Change |
| --- | --- |
| Web, `apps/storefront/src/lib/shop.ts` | Contact sends the backend-resolved canonical origin in a server-set header using the existing credential. Applicant upload sends the resolved market storefront ID alongside the existing bridge credential, session cookie and preflight header. An upstream upload admission denial returns a forbidden response to the website. |
| Web, `scripts/test-storefront-contact.ts` | Updated the existing Astro HTTP fixture's outbound header expectation. The two Astro POST handlers retain their same-origin, tenant and input checks. The shared multipart encoder required no change. |
| Backend, `src/production-http.ts` | Reused the timing-safe credential comparison. Production Shop multipart requires a POST to Shop, an originless authenticated website bridge, a token from Vendure's signed Shop cookie, and the preflight header. Vendure still validates the session and the resolver requires an authenticated applicant. The separate Admin browser and bearer admission rules remain in place. |
| Backend, `src/plugins/platform-identity/shop-context.middleware.ts` and `platform-identity.plugin.ts` | The active-market lookup binds the bridge's storefront ID to the selected channel. Vendor Shop multipart is rejected. Apollo checks the parsed, selected operation before field execution. Only one mutation with one direct `uploadApplicationCompliance` field is supported. Additional definitions and mixed fields are rejected. Admin uploads bypass this Shop-only policy. |
| Backend, `src/plugins/platform-notifications/contact.ts` | The handler verifies the website credential, resolves the canonical origin through the public storefront service, and checks the active vendor, channel, seller relationship and published contact setting. The resolved vendor receives the submission. Existing validation, per-store and per-peer rates, transactional retry lock, deduplication and notification projection remain in use. |
| Backend tests | Updated the existing bridge contract in `test/farmers-market/storefront-contact.ts`. Added the focused runner `test/production-hardening/run-storefront-forms.cjs` and checks in `test/production-hardening/storefront-forms.ts`. |

The existing compliance service still enforces the active user's vendor membership, current document permission, current market channel and published application slug. It checks ownership before reading bytes, validates the file signature and extension, writes encrypted quarantine data, scans and rechecks authority before marking the file available. The existing 10 MiB document limit, 11 MiB storefront multipart envelope limit, scan concurrency limits and private download rules remain in place.

## Evidence from the focused run

The runner called the real Astro POST handlers with contexts resolved by Vendure, then sent their actual requests over verified loopback HTTPS to a bootstrapped Vendure instance. It used Vendure's native multipart parser, Apollo, production middleware and error redaction, real PostgreSQL migrations, native purpose-scoped sessions and private encrypted storage. The test created the sessions through Vendure's auth service and signed the corresponding Shop and Admin cookies. It invoked the inbox projector directly so recipient checks did not depend on the scheduler interval.

| Case | Observed outcome |
| --- | --- |
| Guest contact and concurrent retry | Both requests returned acceptance. Exactly one submission matched vendor A, its channel and storefront. Exactly one `storefront.contact.accepted` event existed. Projecting it twice produced one `vendor.contact.received` item for vendor A's owner. The local account-mail sink received zero messages. The verified delivery was the vendor inbox. |
| Contact negatives | A foreign browser origin and a market storefront were denied by Astro. A canonical vendor origin paired with another active vendor channel was denied by Vendure. Missing and invalid credentials failed at admission and at the contact handler when the existing bearer admission path was used. Submission and event counts were zero before the positive case. |
| Applicant upload | Vendor B's verified applicant uploaded one allowed PNG to the published market application. Vendure returned a document ID, file ID and `Available`. The file belonged to B, and its sole encrypted storage object decrypted to the exact original PNG. |
| Applicant and input negatives | No cookie, a signed cookie with an unknown session, an unrelated signed-in owner, the wrong vendor, an unknown application slug and a mismatched market storefront ID all failed. The validator rejected a PNG presented with a disallowed extension. Before the successful upload there were zero document rows, file rows, private objects or remaining native parser spool files. |
| HTTP and operation policy | Direct requests missing a valid bridge, preflight or session and requests carrying browser Origin failed. A valid bridge and cookie reached the native parser. An unrelated named query, a mixed mutation, and a document containing a second operation each received HTTP 403 and no GraphQL data. The selected operation was checked before dispatch. |
| Encoding parity | Market `activeCustomer` failed under the JSON market allowlist and the parsed multipart policy. For vendor `activeOrder.customer`, JSON returned `CUSTOMER_PROFILE_PRIVATE`. Multipart returned `SHOP_CONTEXT_REQUIRED` at tenant admission. |
| Admin regression | A vendor Admin session from the configured Admin origin uploaded the allowed file and received `Available`. A foreign browser origin received 403. |

**Diagnostic limitation.** For the disallowed extension, the internal code was `DOCUMENT_FORMAT_INVALID`. Existing production redaction converted this into a generic backend 503. Astro returned an error and the inventories were empty. This pass did not change the shared public error mapping.

## Commands and isolation

PowerShell on this computer. PostgreSQL 17 was installed outside `PATH`. The runner defaults to its local bin directory and accepts `PG_BIN` for another installation. Node, OpenSSL and the installed dependencies from both repositories are required.

The dedicated scanner used the cached Docker image and a read-only signature volume. Only `clamd` ran in that container. Its published address was verified as `127.0.0.1:49176`; ClamAV reported version 1.4.6 and signature revision 28186. The normal scanner health and freshness checks ran before database creation. To repeat with this local cache, run the test after the named container shows that exact loopback binding and the scanner is ready.

```powershell
Set-Location E:\coding\farmers-market-platform
docker --host npipe:////./pipe/dockerDesktopLinuxEngine run --detach --rm --pull=never --name phase-c-standalone-scan-49176 --publish 127.0.0.1:49176:3310 --mount type=volume,src=farmers-market-platform_clamav_signatures,dst=/var/lib/clamav,readonly --entrypoint clamd clamav/clamav:1.4_base --foreground
docker --host npipe:////./pipe/dockerDesktopLinuxEngine ps --filter name=phase-c-standalone-scan-49176 --format '{{.Names}} {{.Ports}}'
node test/production-hardening/run-storefront-forms.cjs 49176
docker --host npipe:////./pipe/dockerDesktopLinuxEngine stop phase-c-standalone-scan-49176
```

The acceptance command exited 0. It started its own loopback PostgreSQL cluster with a random password and unused port, verified the database user and actual data directory, then created a fresh `vendure_test_storefront_forms_*` database. The mail adapter captured messages in process. Private files and parser spool files were confined to that run's temporary directory. The existing loopback-only network restriction was active. The runner dropped the successful database, stopped PostgreSQL and removed its temporary cluster, certificate and storage. No migrations or fixtures were applied to `vendure_demo_market_ops`. The run emitted a PostgreSQL driver deprecation warning about overlapping queries during fixture setup.

Additional local checks all exited 0.

```powershell
Set-Location E:\coding\farmers-market-platform
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/@vendure/cli/dist/cli.js build server --no-progress

Set-Location E:\coding\farmers-market-platform-web
node node_modules/eslint/bin/eslint.js apps/storefront/src/lib/shop.ts scripts/test-storefront-contact.ts
node node_modules/prettier/bin/prettier.cjs --check apps/storefront/src/lib/shop.ts scripts/test-storefront-contact.ts
```

## Manual staging walkthrough

Use the staging website and Vendure with production guards, HTTPS, a test mail sink, private storage and a healthy test scanner. The disposable run created contact recipient `identity-owner-0@test.invalid` for vendor A and applicant `identity-owner-1@test.invalid` for vendor B. Those accounts were removed with the cluster. For a manual run, provision dedicated equivalents in staging through normal onboarding. Use a separate synthetic market manager. Complete the applicant's verification and give it vendor B's application and document permissions. Keep the credentials in the staging test environment.

1. **Prepare the two storefronts.** Publish an enabled contact form for vendor A. On the synthetic market publish an open application, enable document automation and configure an automatic application-stage document requirement for vendor B. Record the canonical vendor URL and the application's published link. The routes are `https://<vendor-host>/contact` and `https://<market-host>/apply/<published-slug>`. For repeat runs reuse the same dedicated accounts, storefronts and requirement.
2. **Try guest contact first.** In a signed-out window open vendor A's contact page, select **General Question** and put a unique test reference in the message. As A, open `/vendor/contact-submissions` on the Admin origin and check the message and matching inbox notification. B should see neither item. The automated command above repeats the exact submission key and verifies both counts.
3. **Test the applicant handoff.** Open the market's published application link, sign in as B through the normal account flow and select vendor B. On its document request choose **Upload for request** and select a harmless PNG. Verify the saved file reaches **Available** in B's library. Sharing with the market is a separate action. Repeat with a disallowed extension and verify that the library gains no file.
4. **Check the access boundary.** Sign out and reopen the application, then sign in as A. Neither session should be able to add a file to B's library. Confirm B's document count and the existing file are unchanged.

The remaining acceptance step is the browser flow in that staging setup, including real sign-in and handoff, cookie delivery through the staging ingress and scheduled inbox projection. The automated checks exercised the route handlers and durable effects. They did not exercise a browser, a deployed proxy, a worker schedule or external email delivery. A normal development smoke test on `vendure_demo_market_ops` uses the web repo's four `demo:market-operations:{serve,worker,admin,storefront}` scripts and is separate from production-guard acceptance. This phase used disposable fixtures only. Phase A and B reports, other audit findings and the live Stripe gate were outside scope.
