# Frontend Phase 13C.5 integration implementation

Phase 13C.5 is complete locally. MARKET-B1 through MARKET-B6 are CLOSED. Real integration classification: REAL FULL-STACK PASS. The real Market flow passes 12 Chromium tests and 19 backend contract groups with frontend fixture mode OFF, native HTTP-only Vendure cookie login, real local Admin GraphQL, real Vendure and a fresh guarded disposable PostgreSQL database. No GraphQL response mocking is used in this acceptance flow.

## Scope and historical acceptance

The existing Market Admin now uses canonical safe Vendor identities, listing labels, current publication truth, real server pages/totals, direct persisted occurrence detail, and durable generation-job status. No new app or Phase 13D functionality was added. Vendor Admin, Platform shell and public Storefront were not redesigned.

The original Phase 13C implementation report and evidence remain unchanged: **127 PASS, 1 INCONCLUSIVE, 0 FAIL**. Its gate Z occurrence-completeness limitation is superseded by this phase's PASS evidence, including full traversal beyond 1,000 occurrences and 1,005 canonical Vendor relationships. The capability document retains its original characterization and adds a clearly labeled closure addendum.

## Previously open blockers and closure evidence

| Blocker   | Previous limitation                                                                | Production closure                                                                                                             | Status |
| --------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| MARKET-B1 | Relationships exposed opaque Vendor references; no safe new-relationship selector. | Canonical Vendor names/slug/status in joined pages and bounded searchable eligible directory; existing authoritative mutation. | CLOSED |
| MARKET-B2 | Listings exposed variantId without recognition labels.                             | Protected listing projection carries current Product name, Variant name and SKU.                                               | CLOSED |
| MARKET-B3 | Market had no authorized current publication read.                                 | Separate Market root and listing publication field reuse permanent native publication characterization.                        | CLOSED |
| MARKET-B4 | Capped arrays and returned-set counts could not prove completeness.                | Server pages with scoped totalItems for all needed collections; precise independent operational overview.                      | CLOSED |
| MARKET-B5 | Detail required presence in the currently selected date list.                      | ownMarketOccurrence loads persisted own detail directly, including history/cancelled.                                          | CLOSED |
| MARKET-B6 | Queue acceptance did not prove completion.                                         | Safe durable own-job status and bounded active-page observation with authoritative completion reread.                          | CLOSED |

Each closure has a safe backend contract, deterministic passing backend tests, extracted generated schema, production adapter, production UI consumption and real disposable browser evidence.

## New GraphQL operations and production adapters

`packages/api/operations/market.graphql` and `packages/api/src/market.ts` remain the named-operation boundary. No generic raw executor or Vendor factory is exposed to Market scope.

| Named operation          | Root(s) / adapter                                                                                                    | Used production path                                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MarketEligibleVendors    | ownMarketEligibleVendors / eligibleVendors                                                                           | Add Vendor searchable directory                                                                                                                         |
| MarketVendorPage         | ownMarketVendorMemberships / relationshipPage                                                                        | Vendors server pages and Overview preview                                                                                                               |
| MarketOccurrencePage     | ownMarketOccurrences / occurrencePage                                                                                | Occurrences, Operations occurrence selector, participation choices                                                                                      |
| MarketOccurrenceDetail   | ownMarketOccurrence / occurrence                                                                                     | Direct occurrence route                                                                                                                                 |
| MarketRelationshipDetail | ownMarketMembership + ownMarketMembershipOccurrencePage / Participations / Listings / Offerings / relationshipDetail | Independently paged relationship detail                                                                                                                 |
| MarketOverviewSummary    | ownMarketOverviewSummary / overview                                                                                  | Authoritative core Overview                                                                                                                             |
| MarketListingPublication | ownMarketListingPublication / listingPublication                                                                     | Separate single-listing API adapter; listing UI reads the same Market-authorized projection as the nested publication field in MarketRelationshipDetail |
| MarketGenerationStatus   | ownMarketOccurrenceGenerationStatus / generationStatus                                                               | Active queued-generation status component                                                                                                               |

Safe fragments are MarketVendorDisplayFields, MarketOrganizerMembershipFields and MarketOrganizerListingFields. Listing pages return labels and publication within the same named HTTP request; no browser per-row label lookup exists.

Existing production operations retained are MarketIdentity, MarketConfiguration, MarketConfigure, MarketRecurrence, MarketGenerate, MarketEnqueue, MarketManual, MarketReviseOccurrence, MarketCancelOccurrence, MarketMembershipStatus, MarketApproveListing, MarketParticipation, MarketConfigureOffering, MarketRematerialize, MarketOperations, MarketAnalytics and MarketOccurrenceAnalytics. Optional analytics retains its existing capability/entitlement handling. Legacy MarketOccurrences, MarketRelationships and MarketRelationshipState documents/adapters remain compatibility-only and are not used by production Market pages for completeness.

Every new read uses backend `ReadOwnMarket`, current native grants, selected exact native Channel, own Market identity and fresh active marketAdmin human membership through TenantAccessPolicy. Reads do not grant ManageOwnMarketMemberships, ManageOwnMarketListings, Vendor catalog editing or publication mutation. Existing commands retain their separate narrow permissions and expectedVersion behavior.

## Vendors UI closure

The relationship list uses server take 20 / skip pages, canonical business names and slug, authoritative totalItems and safe name/slug search. Existing suspended and approved relationships retain their real identity. A ManageOwnMarketMemberships organizer can open Add Vendor, page/search the safe eligible directory, choose a Vendor and initial supported status, then invoke setMarketVendorMembership and reread authoritative relationships. Initial selection defaults to pending, so there is no silent auto-approval. An arbitrary Vendor ID is not the normal workflow.

The directory excludes all current Market relationships, including suspended/withdrawn/pending rows. Eligibility follows the existing command's valid canonical Vendor/Channel/Seller pairing, including suspended Vendor domain records where valid; the mutation repeats the checks. A globally safe Vendor identity can appear even if another Market has a relationship, but no other Market relationship fact is returned.

Dialog fields are labeled, submitting state disables duplicate intent, errors are safe, and native dialog keyboard/Escape/focus return is preserved. Search uses at most 200 trimmed characters and only canonical name/slug fields. The joined page supplies safe identity without N+1 HTTP requests.

## Listing labels and publication UX

Relationship listing pages display canonical Product name, Variant name and SKU. These are current display metadata, so a Vendor rename may appear on reread. They are not immutable order descriptions or Market catalog ownership/edit authority.

Approval, current publication and offering are visually distinct columns/sections. Publication states are PUBLISHED, UNPUBLISHED and RECONCILIATION_REQUIRED from the shared permanent backend calculation. Approval/withdrawal refreshes detail and publication state; the UI does not infer publication from approval or a remembered command receipt. Only existing trusted Vendor authority performs publish/repair/unpublish in the test fixture. No Market Product editing control or Vendor catalog request was introduced.

Schema/privacy checks exclude native broad catalog graphs, stock/cost/finance, customer/provider data, Channel tokens, technical Sellers, Administrator identity and other Markets' private relations.

## Server paging and authoritative totals

All new page contracts default to take 20 and permit take 1..100 / skip 0..1,000,000. Invalid bounds fail safely. Relationship and directory ordering is business name ascending with stable ID tie-breaker. Occurrences order startsAt ascending then ID ascending. Listing/participation/offering pages order their stable IDs ascending. Tenant scoping precedes counts, filters, ordering and paging.

Occurrence list date bounds remain UTC lower-inclusive / upper-exclusive and at most 366 days. The backend also supports bounded persisted-history pages with omitted dates. The UI maintains ordinary date filtering while direct detail is independent of it. Offset pages represent current committed state, not an immutable cross-request snapshot; concurrent insert/delete/rename can shift later pages and requires refresh.

Relationship detail has four independent page offsets and totals for listing, participation, offering and attendance-linked occurrence history. No 1,000-item array is reintroduced. The Operations occurrence selector and participation selector also use real occurrence pages. A shared Pagination primitive gained only an optional accessible label, so multiple new pagers can have distinct landmarks; its existing default behavior remains intact for other screens.

Overview uses ownMarketOverviewSummary rather than counting loaded React rows. Relationship totals are all current own records grouped by their actual pending/approved/suspended/withdrawn status. Upcoming count is own scheduled occurrences starting at/after the backend asOf and any explicit interval; next occurrence uses the same predicate and startsAt/ID order. Optional Phase 12 analytics remains separate, and no new financial metric or analytics entitlement is required for core Overview.

## Direct occurrence detail

`/market/occurrences/:occurrenceId` calls MarketOccurrenceDetail directly. It works for own persisted history and cancellation outside the list's current date filter. The backend decides ownership, never the URL. Foreign and unknown IDs return safe denial without foreign data. Existing authority-failure architecture rechecks the workspace, clears refused detail, and recovers to the current authorized overview where appropriate. Revise/cancel/attendance mutation eligibility remains backend-controlled and unchanged.

## Queued generation status

Enqueue confirms acceptance only. The active page reads persisted own queue status every two seconds, at most 60 reads, stopping on COMPLETED/FAILED/CANCELLED, error, route leave, logout or context/service change. No automatic business retry occurs. After observation expires, the organizer may deliberately Check generation status. After COMPLETED the page refreshes authoritative occurrences/configuration.

PENDING includes installed RETRYING; RUNNING, COMPLETED, FAILED and CANCELLED preserve installed state meaning. Safe failure exposes only GENERATION_FAILED and fixed organizer guidance, without raw error/stack/payload. Worker matchedOccurrences comes from its own trusted result and includes existing matched rows; it is not a before/after frontend creation estimate. No promise of a particular newly created count is made.

Completed/failed native jobs can be cleaned up by installed count-based retention: latest 1,000 settled jobs across queues, normally a two-hour cleanup schedule where active. Missing/pruned/unknown/foreign IDs uniformly fail safely. No new job receipt or completion boolean was created.

## Tenant isolation, revocation and unavailable behavior

Every new state key includes a unique guarded-service readKey, selected Market ID and request inputs. Routes are service-keyed. Context/logout/workspace changes clear directory/page/detail/publication/job state. useRead and the status component discard late results; polling timers clean up on unmount. Deterministic unit tests delay a new Market A directory response, switch to B, load B, then release A and prove A cannot render. Job tests switch A to B during a delayed status read and prove cleanup and late-result rejection.

All twelve new protected roots deny fresh queries after either human membership revocation or native ReadOwnMarket grant loss in the same cookie session. Browser tests prove the workspace clears on both revocations. Wrong selected Channel and foreign relationship/listing/occurrence/job attacks fail. Suspended Markets retain administrative reads under existing policy; active-only generation remains refused.

Production fixture mode OFF never falls back to synthetic Market/Vendor/Product/occurrence data when the API is unavailable. Existing transport safe errors, service boundaries and production marker checks remain active.

## Real full-stack integration and fixture strategy

`npm run test:live:market` extends the existing Phase 13B.5 runner with a dedicated Market profile. It owns fresh guarded loopback PostgreSQL, real Vendure, native HTTP-only login, fixture-disabled Admin Vite and real Chromium. No response interception/mocking participates in the real suite. Trusted test-only fixture controls publish/unpublish/rename/drift/revoke through the local guarded composition, and never become a production seed endpoint.

The backend fixture has Market X/Y, both organizer contexts, 23 initial X relationships, 23 initial eligible Vendors including another Market's private relationship, recognizable canonical Product/Variant/SKU, persisted history/future/cancelled occurrences and durable queued jobs. It adds 1,005 historical occurrences, matching participations and offerings with constraints enabled, plus 22 listings for ordinary real subpage tests. A separate high-cardinality Market contains 1,005 canonical Vendor relationships; bulk repository fixtures retain actual FK/unique/check/trigger ownership constraints while avoiding unnecessary 1,005 full Administrator workflows. Chromium renders bounded pages only.

Final real suites:

| Suite                   | Real browser tests | Backend groups | Disposable database                        | Cleanup |
| ----------------------- | ------------------ | -------------- | ------------------------------------------ | ------- |
| Market                  | 12                 | 19             | vendure_test_frontend_1791226076017_dd4131 | dropped |
| Existing Vendor bound   | 8                  | 10             | vendure_test_frontend_1791225799115_968a70 | dropped |
| Existing Vendor unbound | 1                  | 10             | vendure_test_frontend_1791225947066_2bcc87 | dropped |

The Market suite proves Vendor selection/authoritative creation, real labels, publication drift/read-only repair boundaries, ordinary real server paging, direct historical/cancelled/foreign lookup, actual durable terminal status/reread, cross-Market attacks, same-session human/native revocation, context-switch cleanup and loaded-screen axe/responsive checks. Real backend tests also induce FAILED through the unchanged worker and test durable RUNNING/RETRYING mapping; short browser jobs may transition from PENDING directly to COMPLETED between polls. No unobserved transient state is claimed.

Existing Vendor live commands retain their complete original coverage rather than being repurposed. Their evidence defaults to the new phase directory, and backend runtime subdirectories preserve previous Phase 13B.5 evidence. Failed/interrupted development databases remain for diagnosis; successful runs clean up, and KEEP_TEST_DB=1 retains its prior semantics. Exact `vendure` was never test-connected, migrated, seeded, reset, adopted, truncated or dropped. No external provider request occurred.

## Accessibility and responsive verification

Loaded Vendor relationship/directory pages, listing/publication detail, occurrence pages, historical detail and completed generation status pass axe at 390, 768 and 1280 pixels with no page-level overflow. Labels, semantic tables, visible focus, live status/error descriptions and distinct pager landmarks are retained. Keyboard Enter/Escape and dialog focus return are tested. Screenshots are in this phase's evidence directory and were visually inspected. Wide tables keep local scroll rather than unusable page-level overflow.

A first broader regression caught duplicate pagination navigation labels; optional labels were added and all suites rerun. An early screenshot assertion checked absence of a loading label before the route chunk had loaded; it was corrected to wait for actual tables/detail facts before axe, overflow and screenshot assertions. Final evidence reflects the loaded pages. No accessibility rule or assertion was disabled.

## Tests and builds

| Command                                         | Final result / evidence                                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| npm run graphql:schema                          | PASS, source-only schema extraction; no backend bootstrap/DB                                                                            |
| npm run graphql:codegen                         | PASS; schema/provenance/generated outputs repeat byte-identically in schema-reproduction.json                                           |
| npm run typecheck                               | PASS, strict TS and 14 Astro files with zero errors/warnings/hints                                                                      |
| npm run lint                                    | PASS, ESLint/boundaries/Prettier                                                                                                        |
| npm run test                                    | PASS, 164 tests in five files, including 10 new C.5 deterministic tests and existing Vendor/Market/platform coverage                    |
| npm run test:e2e                                | PASS, 33 Chromium fixture/production-adapter regression tests, including Vendor/Admin shell/Storefront/Bulverde MARKET and axe coverage |
| npm run test:live:market                        | PASS, 12 real Chromium tests + 19 backend groups                                                                                        |
| npm run test:live                               | PASS, 8 real Vendor browser tests + 10 backend groups                                                                                   |
| npm run test:live:unbound                       | PASS, 1 real Vendor browser test + 10 backend groups                                                                                    |
| npm run build                                   | PASS, Storefront Astro Node SSR and fixture-disabled Admin Vite                                                                         |
| npm run check:bundles                           | PASS, 29 production artifacts free of checked fixture/credential markers                                                                |
| Backend npm run test:billing                    | PASS, 19 groups and recursive permanent Phase 1 through Phase 10 regressions                                                            |
| Backend npm run test:analytics                  | PASS, 17 groups                                                                                                                         |
| Backend npm run build                           | PASS, Dashboard/server/worker                                                                                                           |
| Backend npm run test:frontend-integration:types | PASS                                                                                                                                    |

Unit, browser, live integration and bundle-check commands now default to the new Phase 13C.5 evidence directory, preserving historical evidence on future ordinary reruns. FRONTEND_EVIDENCE_DIR remains an explicit override. The browser regression runner now uses direct Astro/Vite CLIs to respect independent test ports, as established in Phase 13C. Tests used FRONTEND_TEST_PORT_OFFSET=200 to preserve user development ports. Local process approval was needed for native browser/server execution; a sandboxed Astro startup probe failed before tests and was replaced with the properly authorized local process run. This did not change Storefront source. The existing Admin bundle chunk-size warning remains advisory.

Evidence includes unit-results.json, browser-results.json, live-market-browser-results.json, live-market-integration.json, live-browser-results.json, live-integration.json, live-unbound-browser-results.json, live-unbound-integration.json, schema-reproduction.json, backend-validation.json, build/typecheck/lint logs, loaded-page screenshots and the acceptance artifact. Regression mocked tests are explicitly separate from real full-stack acceptance.

## Backend/frontend diff audit

Before statuses and hash manifests were captured before source modification. Both HEADs remain unchanged. Every actual dirty/changed path is classified against exact planned source files and authorized generated evidence/build/runtime paths. Zero UNEXPECTED changes. Old migrations are byte-identical. Unchanged pre-existing work remains PRE-EXISTING; phase changes to an already dirty file carry a preExistingDirty flag.

Source groups changed locally are backend FarmersMarket read API/service/worker/plugin, shared Market publication read registration/calculation, generated declarations, package script and test-only harness/fixtures; frontend Market operations/adapter/generated schema, existing Market screens/state/fixture, the narrowly compatible pager label, regression/integration tests/runners, audit script and docs/evidence. Public Storefront source, Vendor Admin source, old Phase 13C/B.5 reports and evidence remain unchanged. Generated Storefront build/typecheck outputs changed only through authorized verification commands.

See backend-before.json, frontend-before.json, backend-status-before.txt, frontend-status-before.txt, backend-after.json, frontend-after.json, expected-intentional manifests, diff-classification manifests, old-migration-hashes.json and audit-summary.json. The reusable local audit command is `node scripts/audit-phase13c5.mjs`.

## Acceptance and deferred work

`docs/evidence/phase13c5/acceptance.json` retains every gate A through FT with requirement, PASS/FAIL/INCONCLUSIVE status, concrete evidence and limitations. Final result is 176 PASS, 0 FAIL, 0 INCONCLUSIVE. Limitations such as count-based queue retention, offset concurrency and transient RUNNING observability are recorded without inventing guarantees.

Phase13A-B1 hostname/theme/discovery, Phase13A-B3 production many-domain cookie/CORS/CSRF policy and Phase13A-B4 Market communications remain OPEN. VENDOR-B1 through VENDOR-B6 and Phase13A-B2 remain CLOSED. No deployment, provider calls, remote Git, public Storefront implementation, checkout, customer account, communications UI, Platform Admin implementation or Phase 13D work occurred. Work stops at Phase 13C.5.
