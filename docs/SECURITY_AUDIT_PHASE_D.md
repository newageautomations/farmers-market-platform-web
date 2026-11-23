# Phase D tenant-isolation verification

Private local report, November 18, 2026. **All three database-backed authorization regressions passed.** The checks used the real Vendure Admin GraphQL API with production HTTP guards enabled, native synthetic sessions, and disposable PostgreSQL. This run resolves the three runtime gaps recorded in the [Phase B tenant isolation baseline](SECURITY_AUDIT_PHASE_B.md). It reused the [Phase C environment design](SECURITY_AUDIT_PHASE_C.md). A-05 remained closed based on the owner's staging confirmation.

## Revisions and setup

| Checkout | HEAD                                       | Relevant working-tree state                                                                                                                                                                                                                                                                                              |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web      | `073475be852c80d5e02cafc3e04db8a0e38b1053` | Prior phase reports and the existing Phase D report were untracked. The customer detail and documents workspace had existing loading-indicator changes. The tests called Vendure directly.                                                                                                                               |
| Backend  | `75092f15568780770d1d3ba32cf03e53a01de994` | Existing changes included production HTTP admission, the identity plugin's Shop multipart policy, and contact handling. The Phase C driver and runner were untracked. The CRM projection, relationship and tenant-access services, document resolver and service, Vendure configuration, and fixture sources were clean. |

Paths prefixed with `backend/` refer to the sibling `farmers-market-platform` checkout. The Admin route and middleware registration are in `backend/src/vendure-config.ts:88` and `:101`. The test installed the real production HTTP middleware and GraphQL error redaction from `backend/src/production-http.ts:32`, `:64`, `:108`, and `:158`. Every checked API response carried the production request ID and HSTS headers. Local HTTPS used a fresh certificate trusted by the test process. The requests used the configured Admin origin and the principal's native signed session and selected channel. The original manager session and workspace were reused without replacing the cookie.

Each runner started its own SCRAM-authenticated loopback PostgreSQL 17 cluster. It first verified the maintenance connection belonged to the new cluster, then created and connected to a uniquely named disposable database. Before migrations or fixtures, it compared the server-reported address, port, database, user, and data directory with the run-owned options. It resolved and verified an empty private-storage directory under the same temporary run root. The worker environment was allowlisted and its working directory was the new run directory. No existing account, project environment file, populated database, or live service was used.

| Successful run   | Verified PostgreSQL target                                  | Verified private-storage path relative to the web root                           | Vendure Admin API                   |
| ---------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------- |
| Customer history | `127.0.0.1:62563/vendure_test_phase_d_1795027281714_ec2acc` | `.tmp/phase-d-run-ZQCYOg/private-documents`, verified empty and unused by CRM    | `https://127.0.0.1:62564/admin-api` |
| Document checks  | `127.0.0.1:56243/vendure_test_phase_d_1795027163255_1238dd` | `.tmp/phase-d-run-tS8Sqd/private-documents`, used for encrypted document storage | `https://127.0.0.1:56244/admin-api` |

The CRM run used the existing repository-only test payment adapter to seed two paid Vendure purchases and the purchase relationship consumer to project them. The CRM fixture bootstrap ran in test mode with production HTTP policy explicitly enabled. The documents run bootstrapped in production mode and uploaded the Phase C 70-byte PNG through the normal Admin multipart route. ClamAV `1.4.6`, signature revision `28186`, passed the production health and freshness check on `127.0.0.1:49176`. The document row reached `Available`, belonged to Vendor A, and had a private storage object that did not contain the PNG in plaintext.

An Apollo error observer captured the selected field and denial code before production redaction. A TypeORM query observer checked the relevant SQL predicate and bound synthetic IDs in memory. Neither observer changed the authorization decision. The report retains no session tokens, SQL parameter dumps, request bodies, or private file data.

## Results

### Customer purchase history

**Passed.** `POST /admin-api`, query `PhaseDHistory` selecting `ownCustomerPurchaseHistory(customerId)`.

- **Expected.** Vendors A and B each receive one populated purchase belonging to their own customer. Vendor A's same valid session and workspace receive no purchase details for Customer B.
- **Observed.** A and B each received HTTP 200 with one purchase matching the fixture's operational order ID, paid amount, and quantity. The database confirmed a single allocation for the intended vendor on each order and no cross-vendor relationship. A's request for Customer B returned HTTP 200 with GraphQL `FORBIDDEN` and null data. The error came from the requested resolver, and the relationship query used Vendor A and Customer B as its bound IDs.
- **Source.** The resolver delegates to a projection that requires CRM authority and a vendor/customer relationship before querying allocations scoped to both IDs. See `backend/src/plugins/marketplace-commerce/customer-relationships/api.ts:48`, `projections.ts:45` and `:51` in the same directory, and `backend/src/plugins/platform-identity/customer-relationships.service.ts:57` and `:65`. Fixture references are `backend/test/customer-relationships/fixture.ts:13` and `acceptance.ts:48`, `:367`, and `:421` in the same directory.

### Private document download

**Passed.** `POST /admin-api`, mutation `PhaseDDownload` selecting `downloadComplianceDocument(fileId)`.

- **Expected.** Vendor A obtains the exact bytes of its available private file. Vendor B in its own valid workspace obtains neither bytes nor a private download capability.
- **Observed.** A received HTTP 200 and the exact 70 PNG bytes. B's authorized library query succeeded in the same session and workspace. B's request for A's file returned HTTP 200 with GraphQL `FORBIDDEN` and null data, with no file payload or download capability. The error came from the selected resolver, and the file authorization predicate ran with the same file and Vendor B's workspace.
- **Source.** The service resolves workspace permission and requires an available file plus ownership or an eligible grant before reading storage. See `backend/src/plugins/documents-compliance/api.ts:96`, `service.ts:107`, `:606`, `:614`, and `:633` in the same directory, and `backend/test/documents-compliance/run.ts:620`.

### Revoked document share

**Passed.** `POST /admin-api`, mutation `PhaseDCommand` selecting `complianceDocumentCommand` for `CREATE_REQUIREMENT`, `SUBMIT`, and `REVOKE`, and mutation `PhaseDDownload` selecting `downloadComplianceDocument(fileId)`.

- **Expected.** An explicit share lets the authorized market manager download the exact file. Once the vendor revokes the specific share and the change commits, the original manager session and workspace receive no bytes for the same file. The manager can still perform an unrelated authorized action, and the vendor can still download the file.
- **Observed.** The manager received HTTP 200 and the exact 70 bytes while the grant was active. A separate database read confirmed that `revoked_at` was set on the specific grant after the command returned. With the original session, workspace, and file ID, the manager received HTTP 200 with GraphQL `FORBIDDEN` and null data. The error came from the selected resolver, and the file authorization predicate ran with the same file and market workspace. The original session still returned the expected principal from `me { id }` with HTTP 200. A redownloaded the exact 70 bytes after revocation.
- **Source.** The command revokes the specific grant on the authorized document. Shared downloads check and lock a current grant inside the transaction before reading storage. See `backend/src/plugins/documents-compliance/api.ts:89`, `service.ts:616`, `:622`, `:840`, and `:957` in the same directory, and `backend/test/documents-compliance/run.ts:701` and `:811`.

## Invocations and cleanup

The scoped runs below were invoked from the web root. The temporary runner adapted `backend/test/production-hardening/run-storefront-forms.cjs:19` and used the database and native session setup from `backend/test/production-hardening/storefront-forms.ts:44` and `:117`. The locally cached scanner image and signature volume were verified before startup. The scanner port was verified as loopback-only before use.

```powershell
docker --host npipe:////./pipe/dockerDesktopLinuxEngine image inspect clamav/clamav:1.4_base --format '{{.Id}}'
docker --host npipe:////./pipe/dockerDesktopLinuxEngine volume inspect farmers-market-platform_clamav_signatures --format '{{.Name}}'
docker --host npipe:////./pipe/dockerDesktopLinuxEngine run --detach --rm --pull=never --name phase-d-standalone-scan-49176 --publish 127.0.0.1:49176:3310 --mount type=volume,src=farmers-market-platform_clamav_signatures,dst=/var/lib/clamav,readonly --entrypoint clamd clamav/clamav:1.4_base --foreground
docker --host npipe:////./pipe/dockerDesktopLinuxEngine ps --filter 'name=^/phase-d-standalone-scan-49176$' --format '{{.Names}} {{.Ports}}'
node .tmp/phase-d-loopback.cjs history
node .tmp/phase-d-loopback.cjs documents 49176
docker --host npipe:////./pipe/dockerDesktopLinuxEngine stop phase-d-standalone-scan-49176
```

The runner invoked `initdb.exe` and `pg_ctl.exe` from the PostgreSQL 17 installation with an unused loopback port and a generated password. It launched `phase-d-regressions.cjs` with the existing `scripts/production-hardening-network.cjs` loopback restriction and backend `ts-node/register`. Both successful scopes exited 0. To repeat the results, reconstruct the two temporary scopes from the listed fixture helpers and assertions. The bootstrap runs only the stated cases. It does not invoke the full CRM, document, or storefront suite.

Earlier CRM attempts stopped at loopback `EACCES`, missing synthetic `PLATFORM_ACCOUNT_BRIDGE_KEY`, a harness request-context helper mismatch, and a SQL observer that did not match schema-qualified reporting. The first two stopped before migration and seeding. The successful isolated retry used the native Vendure request-context service and matched the schema-qualified relationship query. Fixture setup emitted a PostgreSQL driver deprecation warning about overlapping queries. All run-owned databases, clusters, certificates, private files, upload spool files, and harness files were removed. The disposable scanner container was verified removed.

## Disposition

Phase D establishes tenant scoping for the two tested Admin API reads and enforcement of sequential revocation for the tested market grant. Platform-wide tenant isolation, other roles and routes, concurrent revocation, and deployed-edge behavior remain outside this evidence. No duplicate browser testing is needed for these cases. Proceed next to **A-02, the Shop GraphQL work limit**.
