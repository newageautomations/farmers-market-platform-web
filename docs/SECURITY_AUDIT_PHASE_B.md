# Phase B security validation

November 17, 2026. Private review. The production storefront reproduced both A-05 failures. The contact and upload requests each reached the specific Vendure admission guard predicted by Phase A. **Fix the storefront-to-Shop contract before enabling either workflow.** Keep private Shop operations subject to the same policy across supported encodings.

The production build also corrected a material assumption in Phase A. An unapproved hostname could obtain a transformed public image, but the selected Node image handler read the image from disk. The controlled receiver saw zero image fetches. No test established an unauthorized customer read, write, session, or private download.

## Revisions and test boundary

| Repository | Local main revision | Difference from Phase A at start of review |
|---|---|---|
| Web | `073475be852c80d5e02cafc3e04db8a0e38b1053` | Same commit. The input `docs/SECURITY_AUDIT_PHASE_A.md` was already untracked. |
| Backend | `75092f15568780770d1d3ba32cf03e53a01de994` | Same commit and clean working tree. |

Paths below use `web/` and `backend/` for the two repository roots. Revision checks were `git rev-parse HEAD` and `git status --short --branch` in each root. No standalone `validation` skill was available. The supplied Phase B criteria governed this pass.

**Runtime setup.** The pre-existing storefront bundle explicitly rejected production startup in `apps/storefront/dist/server/virtual_astro_middleware.mjs:9`. I built a separate copy of the tracked storefront and shared packages, excluding environment files, with installed dependencies, Node 24.19.0 and the repository's synthetic production settings. Fixture mode was off. Direct TLS was enabled, proxy trust was disabled and the test certificate covered the individual synthetic names. The setup first rejected a wildcard certificate before application dispatch. All results below come from the subsequent verified TLS run.

| Local component | What ran |
|---|---|
| Storefront | Real Astro production entry, wrapper, middleware, routes and outbound adapters on loopback port 49375. |
| Request ingress and image receiver | A dedicated loopback TLS listener on 49374 preserved wire authority and forwarded the selected application routes to Astro. It served the exact public image source path itself and counted requests and marker presence. A direct positive control reached it once before the counters were reset. |
| Vendure admission | Express on loopback port 49373 ran the backend source's `productionPolicy` and ordered `productionMiddlewares`, using Vendure's own early middleware wrapper. HTTPS, API authority and origin checks were active. A resolver fixture returned the normal published context shape for one enabled vendor and one market, and 404 for the unknown host. A post-admission sentinel identified requests that survived the guards. This listener had no database, GraphQL business resolvers, file store, mail delivery adapter or provider clients. |
| Side effects | An owned loopback mail sink counted connections. No migrations, seeds, provider calls or database connections occurred. The test never used the populated demo database or existing accounts. |

**Focused commands.** With paths relative to the temporary copy, the build ran `node --require ../../scripts/production-hardening-network.cjs ../../node_modules/astro/bin/astro.mjs build` from `apps/storefront`. The bounded driver ran from the web root with `node --require ./scripts/production-hardening-network.cjs --require tsx/cjs <temp>/bounded.cjs`. It launched `scripts/start-storefront.ts` with `node --import tsx`, the same network restriction and a listener-readiness hook. Each result below names the driver case or source check. The temporary driver and fresh build were removed. The fixture descriptions and inputs below specify what to repeat.

## A-03. Unknown hostname and the image handler

**Disposition: refuted by evidence** for the proposed authority-derived fetch of a relative image in this production build. **Reproduced** for the narrower failure to reject the unknown hostname before serving a public asset. **Severity:** low for the observed public-image behavior. **Confidence:** high for the tested build and input.

| `local-image` case | Expected | Observed |
|---|---|---|
| Approved vendor host, relative public PNG | Resolver succeeds, transform succeeds, zero image requests to the receiver | Resolver 200. Image 200, `image/png`, 387 bytes with a PNG signature. Receiver count 0. |
| Syntactically valid unlisted host, identical PNG and marker | Unknown host rejected before transforming the image | Resolver 404 and Astro logged resolution failure. Image still returned 200, `image/png`, 387 bytes with a PNG signature. Receiver count 0. |

Both requests asked for a 16-pixel-wide PNG derived from `/assets/editorial-market/footer.png` through `/_image`. The only application network destination observed on these cases was the configured loopback storefront resolver. No image request carried the harmless marker to the receiver. Neither case used cookies or tokens.

The wrapper validates authority syntax. The Node adapter builds the request URL from the socket protocol and wire authority. With an empty Astro `allowedDomains` list, forwarded host metadata supplies no approved host override. The tenant resolver connects to its configured backend peer using the merchant authority as routing input. Middleware records a lookup failure and continues unless another route-specific check intervenes. See `web/scripts/start-storefront.ts:52`, `web/apps/storefront/config.ts:35`, `web/node_modules/astro/dist/core/app/node.js:19`, `web/packages/storefront-core/src/backend.ts:54`, `web/apps/storefront/src/middleware.ts:193`, `:204`, `:227` and `backend/src/plugins/platform-identity/public-storefront.controller.ts:136`.

The fresh build's `apps/storefront/dist/server/entry.mjs:358` selected `assets/endpoint/node.js`. Its generated `chunks/node_DlPDjOVr.mjs:1742` and `:1780` selected the local loader and read the file. The installed implementation checks containment before reading. Remote sources take a separate allowlist branch. Phase A cited the generic endpoint, which this build did not select. Stable references are `web/node_modules/astro/dist/assets/endpoint/node.js:7`, `:19`, `:26` and `web/node_modules/astro/dist/assets/endpoint/shared.js:49`. **Gap:** the fixture admitted both authorities. Actual edge rejection, production egress, other builds and remote asset configurations remain unverified.

## A-04. Vendor Shop policy across request encodings

**Disposition: source-supported only** for inconsistent placement of the common operation policy. **Blocked/deferred** for its effect on protected operations. **Severity:** potentially high for private customer disclosure if the prerequisites hold. **Confidence:** high in the source distinction, low in any unauthorized outcome.

**Admission control.** The `vendor-public-field-admission` case sent the same harmless `PhaseBControl` query selecting only `__typename` to the owned Shop listener as JSON and as a multipart operations envelope. Both had the synthetic vendor channel, an originless request and a placeholder session cookie. Expected observation was whether the operation was available after production admission. JSON reached the sentinel with the exact parsed query and received the fixture's 204. Multipart received Vendure 403 `BROWSER_ORIGIN_REQUIRED` before its native upload parser. The 204 was a parser observation. It did not execute GraphQL or establish an authorized vendor session.

**Policy after admission.** Shop middleware checks active channel context and applies common restrictions when a query string is available. Vendure registers its native upload parser, which populates the request body later. The explicit post-parse multipart interceptor checks the selected operation for market traffic. The separate customer privacy interceptor is Admin-scoped. See `backend/src/production-http.ts:112`, `:149`, `backend/src/plugins/platform-identity/shop-context.middleware.ts:11`, `:34`, `:58`, `:74`, `backend/src/plugins/platform-identity/platform-identity.plugin.ts:41`, `:92`, `backend/node_modules/@vendure/core/dist/api/api.module.js:41`, `backend/node_modules/graphql-upload/graphqlUploadExpress.mjs:73` and `backend/src/plugins/platform-identity/customer-privacy.ts:37`.

There is a substantive second control for native accounts. The registered input interceptor denies registration and verification at the resolver boundary and, with central accounts enabled, also denies native login, reset and related account changes. Vendure evaluates declared permissions and the access strategy reloads an authenticated session and enforces its API purpose. Record-specific ownership is an additional control where a resolver implements it. Those checks do not establish uniform enforcement for every nested field. See `backend/src/plugins/platform-identity/input-validation.ts:53`, `:57`, `backend/src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts:127`, `backend/node_modules/@vendure/core/dist/api/middleware/auth-guard.js:53` and `backend/src/plugins/platform-identity/account-session-policy.ts:34`.

**Gap:** no protected operation was exercised through an admitted, native multipart GraphQL path. There was no observed unauthorized read, write or session creation. A supported ingress that admits multipart, an active vendor channel, real parser dispatch and case-specific authorization evidence are prerequisites for judging any of those outcomes. The market upload denial in A-05 supplies no vendor-policy result.

## A-05. Legitimate contact and applicant upload

**Disposition: reproduced** for both production admission failures. **Severity:** medium for loss of the two workflows, a release blocker if promised. **Confidence:** high for the request construction and rejection points. No confidentiality or privilege impact was demonstrated.

| Driver case and route | Expected product behavior | Observed |
|---|---|---|
| `contact`, enabled vendor, `POST /api/contact` | Accept a valid guest submission once and route it to that vendor | Astro resolved the vendor and sent JSON with its bridge credential and canonical origin. Vendure's global HTTP guard returned 403 `BROWSER_ORIGIN_DENIED` before GraphQL parsing. Astro returned 403. |
| `contact`, wrong tenant kind | Reject the same same-origin submission on a market host | Market resolution succeeded. Astro returned 403. Zero outbound Shop requests on this control. |
| `upload cookie-shaped`, `POST /api/application-documents` | A permitted applicant should upload one allowed document for the selected market and vendor | Astro parsed the multipart form and constructed a Shop upload with a bridge credential and placeholder cookie. Vendure's multipart guard returned 403 `BROWSER_ORIGIN_REQUIRED`. Astro returned 400. Applicant authentication and file processing were never reached. |
| `upload anonymous`, same file and scope | No anonymous upload or stored bytes | Removing the cookie produced the same Vendure 403 and Astro 400. This exercised admission only. |

Contact used a synthetic address, valid submission UUID and the published, enabled vendor form. Upload used same-origin market context, a valid numeric vendor ID, synthetic document metadata and a one-pixel PNG with an allowed extension. All three outbound Shop form requests stopped before the post-admission sentinel. Mail sink connections were zero. The fixture created no submission, outbox entry or stored file. There was no live database or storage inventory to reconcile.

Contact evidence is in `web/apps/storefront/src/pages/api/contact.ts:10`, `:29`, `web/apps/storefront/src/lib/shop.ts:144`, `backend/src/production-http.ts:88` and `backend/src/plugins/platform-notifications/contact.ts:48`, `:103`. Upload evidence is in `web/apps/storefront/src/pages/api/application-documents.ts:37`, `:64`, `web/packages/api/src/document-upload.ts:26`, `web/apps/storefront/src/lib/shop.ts:32`, `backend/src/production-http.ts:114`, `backend/src/plugins/documents-compliance/api.ts:119` and `backend/src/plugins/documents-compliance/service.ts:193`, `:510`, `:566`.

**Gap:** the cookie was synthetic and unbacked. The guard exits before its validity could affect the result. An authorized applicant, an unrelated signed-in applicant, recipient persistence, scan completion and durable side effects still need a database-backed check after admission is repaired.

## Tenant isolation baseline

**Runtime disposition: blocked/deferred** for all three controls. The proposed setup pairs unrelated vendors A and B with customers A and B respectively, and gives market M an explicit share of A's file. No such principals or records were created in this pass. The table records expected outcomes and the source evidence for them.

| Control | Authorized and negative expectations | Observed source and remaining proof gap |
|---|---|---|
| Admin `ownCustomerPurchaseHistory(customerId)` | A's CRM reader sees A's portion for customer A. Substituting unrelated customer B yields no private history. | The resolver derives the vendor from current CRM authority, validates the vendor/customer relationship, then filters allocations on both IDs. High confidence in those predicates. No paired HTTP result. `backend/src/plugins/marketplace-commerce/customer-relationships/api.ts:48`, `backend/src/plugins/marketplace-commerce/customer-relationships/projections.ts:45`, `backend/src/plugins/platform-identity/customer-relationships.service.ts:65`. Existing assertions at `backend/test/customer-relationships/acceptance.ts:400` and `:414` were read only. |
| Admin `downloadComplianceDocument(fileId)` | A receives the known bytes of A's available file. B cannot obtain those bytes with A's file ID. | Available-file and owner or explicit share predicates precede the storage read. High confidence in the ordering. No authorized-byte comparison or foreign response was observed. `backend/src/plugins/documents-compliance/api.ts:96`, `backend/src/plugins/documents-compliance/service.ts:606`, `:614`, `:633`. Existing fixture assertions at `backend/test/documents-compliance/run.ts:635` and `:642` were read only. |
| Same market session, same shared file, after grant revocation | M downloads while the grant is active. A revokes that submission grant. The next download with M's original session returns no bytes. | The command updates the specific grant. A shared download reloads and locks a current grant inside the transaction before reading storage. High confidence in the sequential source check. No same-session replay or concurrent revocation was measured. `backend/src/plugins/documents-compliance/service.ts:622`, `:631`, `:841`. Existing fixture steps at `backend/test/documents-compliance/run.ts:721` and `:811` were read only. |

**Isolation preflight.** `Get-Command initdb,pg_ctl,psql -ErrorAction SilentlyContinue` found no standalone PostgreSQL tools on PATH. The local Docker engine returned “No such image” for `docker --host npipe:////./pipe/dockerDesktopLinuxEngine image inspect postgres:16-alpine --format '{{.Os}}/{{.Architecture}}'`. A filtered local cache listing also found no PostgreSQL-compatible tag. The repository's disposable helper enforces loopback and a test database prefix, but loads dotenv and requires a provisioned PostgreSQL server and credentials. The existing qualification entry points run broader suites. See `backend/test/test-database.ts:6`, `:14`, `:20`, `backend/test/documents-compliance/run.ts:330` and `backend/test/customer-relationships/run.ts:33`. No existing database, credentials or network download was substituted. These three controls carry no runtime pass or independent severity finding.

## A-02. GraphQL fragment traversal

**Disposition: source-supported only. Severity:** high availability impact conditional on untrusted access to raw market Shop queries. **Confidence:** high for repeated traversal and the missing collector budget. External reachability and service impact are unmeasured.

Expected behavior is bounded application work before resolver execution. The production route limits JSON bytes, rejects batches and caps query text at 65,536 characters. On the market path the collector tracks fragments currently being visited, removes a name on return, and appends selected root field names to an array before checking the allowlist. A later reference to a completed fragment visits it again. The collector has neither a total visit limit nor a cache of completed results. An HTTP byte limit and rate counter do not impose a per-operation traversal budget. See `backend/src/production-http.ts:96`, `:121`, `:153` and `backend/src/plugins/platform-identity/shop-context.middleware.ts:91`, `:100`, `:109`, `:113`.

Focused harness search: `rg -n -i 'budget|visit.*fragment|fragment.*visit' ../farmers-market-platform/test/platform-identity ../farmers-market-platform/test/production-hardening ../farmers-market-platform/test/frontend-integration`. No collector visit-counter fixture was identified. No API traversal experiment, benchmark or stress test ran. Raw Shop ingress and actual edge restrictions require separate operator evidence.

## Deferred findings

| Finding | Disposition, severity and confidence | Release question |
|---|---|---|
| A-01, release build context | **Blocked/deferred.** Conditional high severity for a future secret-bearing release. Owner-supplied context says the tracked backend environment file contains only test variables. Contents, history and image inventory were not inspected. | Keep release-context hardening open before production secrets are introduced. No confirmed credential incident. Prior reference: `backend/Dockerfile:7`. |
| A-06, Stripe recovery workload | **Blocked/deferred.** Phase A rated workload severity medium. No new runtime confidence or payment-effect evidence. | Qualify recovery coalescing separately. The live mutation gate was untouched. Prior references: `backend/src/plugins/payments/webhook.service.ts:237`, `backend/src/plugins/payments/recovery.service.ts:54`. |
| A-07, deployed PostgreSQL and Redis exposure | **Blocked/deferred.** Conditional high severity if a sensitive listener is reachable. Deployment confidence unknown. | Operator to verify deployed listener and firewall scope. No listener probes or provider inspection. Prior references: `backend/docker-compose.yml:47`, `:91`. |

Repository-root `docs/` is outside the observed storefront static root. Neither app's public directory, the existing admin output nor the fresh storefront client output contained a `docs/` tree. The temporary build did not include private review documents as inputs. See `web/node_modules/@astrojs/node/dist/serve-static.js:90` and `web/apps/admin/vite.config.ts:31`. External serving rules remain unverified.

## Remediation order

1. **Repair A-05 and align A-04 at the same boundary.** Give contact a bridge-authenticated tenant identity that the backend verifies against the active recipient. For uploads, narrowly admit the storefront bridge and enforce the permitted operation after parsing, before business effects. Keep applicant identity, document grant, size and scan checks. Preserve browser origin restrictions and test equivalent policy decisions for every supported encoding.
2. **Bound A-02 before exposing arbitrary Shop traffic.** Give the collector an explicit work budget and reuse completed fragment results. If the operator confirms raw Shop is public, prioritize this alongside the bridge changes.
3. **Close the A-01 release-context gate before introducing production credentials.** Complete the three database-backed controls before signing off tenant isolation. Resolve actual origin and data-service exposure with the operator.
4. **Make the unknown-host response deliberate.** If tenant approval is required for transformed public assets, stop dispatch on failed resolution for that route. The filesystem-backed local image path needs no fix for the outbound fetch alleged in Phase A. Schedule A-06 and A-07 under their separate scopes.

## Manual staging checklist after fixes

- Use a verified disposable database, two unrelated vendors and customers, one eligible market, synthetic sessions, a mail sink and private test storage. Record the actual database and service destinations before creating records.
- On `/api/contact`, submit once on the enabled vendor and repeat with the same submission key. Expect one vendor-owned submission and one acceptance event. The market and mismatched-origin controls should create none.
- On `/api/application-documents`, upload one allowed file as the authorized applicant. Verify tenant, file status and expected bytes after scanning. Repeat as an unrelated applicant and as a guest. Expect no additional file or document.
- On `/shop-api`, verify the supported encodings reach the intended parser with synthetic principals. A public read should succeed as designed. Protected operations should produce the same policy decision before private data, writes or session creation. Record which layer made each decision. Confirm a tiny shared-fragment regression stays within the new work budget.
- Repeat the three tenant controls above. Compare actual returned data and bytes. Reuse the same market session and file ID before and after grant revocation.
- On `/_image`, repeat both hostname cases with the public PNG and the monitored receiver. Expect the approved transform to succeed, the unapproved authority to receive the chosen rejection, and zero receiver requests for the relative image. Verify the deployed edge route and origin policy separately.
