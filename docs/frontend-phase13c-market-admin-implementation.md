# Phase 13C Market Admin implementation

Implemented locally on October 5, 2026 in `E:\coding\farmers-market-platform-web`. The shared Admin now has usable organizer Overview, Occurrences, Vendors, Operations, Analytics and Settings modules backed by permanent typed contracts. Phase 13C is complete for supported workflows, with six documented OPEN MARKET-B limitations. Acceptance is 127 PASS, 1 INCONCLUSIVE, 0 FAIL across all 128 supplied gates A through DX. Gate Z is INCONCLUSIVE because the backend supplies bounded occurrence arrays without complete paging.

## Scope

One existing `apps/admin`, seven existing reusable packages, one unchanged public Storefront application. No additional app, backend facade, database, commerce authority, provider integration, remote Git action or hosting project was created. Vendor modules and the Platform shell remain intact. Phase 13D has not begun. Historical Phase 13A/B/B.5 reports were not rewritten.

The capability matrix was written before broad implementation after reading current identity, Farmers Market, marketplace/customer operational projection, analytics and billing source. [Capability characterization](frontend-phase13c-capabilities.md) records the exact authority, inputs, versions, bounds, source references and every missing contract. Current schema extraction, not old reports alone, supplies DTO and operation authority.

## Backend read-only verification

The backend started dirty and was preserved. Initial porcelain status has 22 modified entries and 9 untracked entries, including earlier frontend integration scripts, source and runtime evidence. [Initial status](evidence/phase13c/backend-status-before.txt) and [final status](evidence/phase13c/backend-status-after.txt) are exactly equal. They are not a clean-checkout assertion.

The frontend's existing verification entry point now accepts `--read-only`, delegating to the Phase 13C audit. Before implementation it captured SHA-256 bytes and sizes for 6,393 files plus Git HEAD and both ordinary/all-untracked porcelain status. Coverage includes `.git`, dirty, untracked and ignored env/build/runtime/evidence files, excluding installed directories named `node_modules`. Git uses `GIT_OPTIONAL_LOCKS=0` to avoid an index refresh. Audit output is entirely in this frontend repository. The final [verification result](evidence/phase13c/backend-verification.json) reports identical HEAD, status, all-untracked status, 6,393 before/after files and an empty changed-path list. [Before manifest](evidence/phase13c/backend-before.json) and [after manifest](evidence/phase13c/backend-after.json) provide the byte proof. Excluded installed dependencies were only read as schema tooling references; no install or command ran there.

No backend process, harness, build, formatter, test, migration, seed or runtime-producing command ran. No backend env/config was loaded. The protected `vendure` database was neither connected to nor inspected, and no test database was created. No new full-stack backend integration is claimed. Existing Phase 13B.5 evidence remains historical characterization; new evidence consists of current extracted schema, frontend deterministic fixtures and HTTP GraphQL mocks.

## Market capability matrix and exact roots

The detailed [matrix](frontend-phase13c-capabilities.md) is the canonical source map. Every factory method uses a generated named Admin document, private Admin transport and the approved native Channel token. `createMarketApi` exposes no raw execute method, Vendor owner method or Shop client. The selected fields exclude infrastructure, customer contact and finance even where a wider backend DTO exists.

| Purpose                        | Exact roots consumed                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Session/identity               | `login`, `logout`, `me`, `ownMarketIdentity`                                                                      |
| Core reads                     | `ownMarket`, `marketOccurrences`, `marketVendorMemberships`, `marketMembershipState`                              |
| Profile/recurrence/generation  | `configureOwnMarket`, `reviseMarketRecurrence`, `generateMarketOccurrences`, `enqueueMarketOccurrenceGeneration`  |
| Occurrence commands            | `createManualMarketOccurrence`, `reviseMarketOccurrence`, `cancelMarketOccurrence`                                |
| Business/listing/participation | `setMarketVendorMembership`, `approveMarketListing`, `configureMarketParticipation`                               |
| Offering                       | `configureMarketOffering`, `rematerializeMarketOfferingWindow`                                                    |
| Safe operations                | `ownOccurrenceCustomerOperations`                                                                                 |
| Optional analytics             | `ownFeatureAvailability(boundary: "analytics.market.read")`, `ownMarketAnalytics`, `ownMarketOccurrenceAnalytics` |

`ownOccurrenceOperations` is the older capped compatibility root and is deliberately not used. `ownListingPublication` requires Vendor authority and is not called from Market. No native global Orders, Customers, Products, Sellers, Channels or Jobs are queried for Market workflows. No communication or Vendor CRM root is consumed.

## Routes

| Module      | Routes                                                               |
| ----------- | -------------------------------------------------------------------- |
| Overview    | `/market`; `/`, `/market/overview` alias the current Market Overview |
| Occurrences | `/market/occurrences`, `/market/occurrences/:occurrenceId`           |
| Vendors     | `/market/vendors`, `/market/vendors/:membershipId`                   |
| Operations  | `/market/operations`, `/market/operations/:occurrenceId`             |
| Analytics   | `/market/analytics`                                                  |
| Settings    | `/market/settings`                                                   |

Detail references must be positive numeric IDs under an authorized module. URLs select a view, never Market authority. Unsupported, deeper, cross-scope and permission-denied paths show a safe forbidden state. Navigation has only the six Market modules; no Billing, Customers, Product, Inventory, communication, POS, Channel or Seller module appears.

## Market bootstrap

Native `me` supplies the selected Channel and native per-Channel grants. `ownMarketIdentity` must match that exact Channel, current principal, own Market ID, active `marketAdmin` membership and current `ReadOwnMarket` authority. The resulting grants are the intersection of current native and identity grants. Market lifecycle may be active or suspended; a suspended Market is not treated as deleted or as a cancelled occurrence.

Initial loading, anonymous sign-in, unavailable and forbidden states contain no tenant records. Multiple native Channels can be selected; display labels for unvalidated alternatives are neutral Available workspace labels rather than technical codes. Selection never assumes the first Market from URL, role name, Channel code or cached ID. A wrong/unavailable workspace offers refresh and another selection.

Switch, logout, endpoint change and authority refresh clear both context and service before bootstrap. A core protected authentication/forbidden response invalidates the service and reboots identity. Context generation guards, effect cleanup and the service revocation flag prevent late old responses from restoring records. An optional analytics refusal performs a fresh core identity check; valid core authority remains usable, while revoked membership/read permission clears content.

## Permission mapping

All core views require current `ReadOwnMarket`; no broad native role substitutes for it. Forms additionally require the exact command grant below and backend guards recheck authority on every request. Synthetic full/schedule/relationship/operations/analytics presets are explicit grant combinations, not new backend roles.

| Operation                                                                 | Exact grant                  |
| ------------------------------------------------------------------------- | ---------------------------- |
| Identity/configuration/occurrence/relationship/operations reads           | `ReadOwnMarket`              |
| Configure Market, revise/remove recurrence, synchronous/queued generation | `ManageOwnMarketSchedule`    |
| Create/revise/cancel occurrence, create/revise organizer participation    | `ManageOwnMarketOccurrences` |
| Existing Vendor business status                                           | `ManageOwnMarketMemberships` |
| Listing approval/withdrawal                                               | `ManageOwnMarketListings`    |
| Configure/rematerialize offering                                          | `ManageOwnMarketOfferings`   |
| Analytics route/read                                                      | `ReadOwnMarketAnalytics`     |
| Neutral availability read only                                            | `ReadOwnBilling`             |

Market participation uses the organizer branch `ManageOwnMarketOccurrences`, not Vendor `ManageOwnMarketParticipation`. There is no Vendor owner restriction borrowed into Market actions and no grant of Product edit, stock or Seller-order authority. A reader can inspect settings without edit controls. Suspended Market management remains available; backend active-only generation/enabled-offering policy is explained, and analytics reports DENIED.

## Overview

Independent core reads load name/status/timezone, a bounded date view, existing relationships and one paged operations summary for the next returned occurrence. Counts are explicitly labeled as returned-set counts, never authoritative whole-Market aggregates. The 2 upcoming occurrences / 3 approved relationships fixture is shown without extra per-Vendor calls. Operational purchase count uses the paged root's real `totalItems`; sample portion states are labeled first-page facts. No fetching all operations to calculate a total occurs.

Optional analytics shows only the first returned bucket and its freshness, including 2 confirmed participations in the mandatory fixture. It is expressly a bucket, not a range-wide total or distinct Vendor sum. ALLOWED, DENIED, UNKNOWN and UNCONFIGURED all preserve core Overview. No financial metrics appear.

## Market settings and recurrence

`ownMarket` renders safe profile, lifecycle, IANA timezone, venue, pickup instructions, weekly recurrence, default preorder rule and override policy. Infrastructure identifiers and Channel token are not selected or displayed. Authorized profile writes include current Market `version`, independently of `policyVersion`, and reread the backend-normalized configuration. Read-only operators receive the same configuration without forms.

Weekly recurrence uses backend weekdays, local HH:mm times, optional end-day offset and local effective dates. Nullable removal requires confirmation. Revision uses Market `expectedVersion`, not recurrence version, and rereads configuration after success. A stale refusal blocks resubmission until Check current records refreshes authoritative state; there is no silent overwrite or automatic retry. Configuration edits do not rewrite persisted historical occurrences in the frontend.

## Occurrences

Explicit UTC [from, through) date views are limited to 366 days and disclose the backend 1,000-row cap. Backend start ordering is preserved; no artificial cursor, total or complete-history claim exists. Generated/manual source, scheduled/cancelled lifecycle, local IANA time, exact UTC instants, venue/pickup, configuration/recurrence/policy versions and overrides remain distinct backend facts. Detail uses the same explicit bounded view; an absent row offers date-range refresh instead of guessed data (MARKET-B5).

Synchronous and queued generation are two deliberate choices, both using inclusive Market-local date strings and backend horizon/DST rules. Synchronous success rereads schedule. Queued success is labeled accepted, never completed; no own job-status read exists (MARKET-B6), so the UI offers refresh and keeps completion unverified. It never calls both commands for a single intent.

Manual creation uses a stable `manual:<UUID>` key for that submitted intent, a local schedule date and explicit-offset start/end instants. It does not imitate generated identities. Supported future occurrence revision uses exact session version and rereads. Cancellation has a native confirmation and exact version; UI explicitly says it does not issue refunds, restore inventory or notify customers. Cancelled records remain history. No delete or Vendor-order action exists.

## Vendor relationships

`marketVendorMemberships` displays existing pending, approved, suspended and withdrawn relationships with Vendor references, defaults and versions. `marketMembershipState` loads only the selected relationship, avoiding row N+1 calls. Both lists disclose caps. New relationship discovery and business display names are unavailable because no organizer-safe directory/display projection exists (MARKET-B1).

`setMarketVendorMembership` submits the existing row's Market/Vendor references, exact state and current version. Suspension and withdrawal require confirmation; success rereads list/detail. Partial grants hide forms and guarded service calls refuse unauthorized mutations. Membership status is not participation, listing approval, publication or offering state. No Seller/native Product or Vendor customer/finance traversal appears.

## Listings

Exact pending/approved/withdrawn listing state and safe Variant reference are shown. Approved/withdrawn commands use current listing version and `ManageOwnMarketListings`; withdrawal confirms and success rereads. Backend approved-membership policy remains authoritative. Product/Variant labels are unavailable (MARKET-B2). Current publication is explicitly unavailable (MARKET-B3), with approval and offering displayed separately. No publication inference, Product editing, native catalog read or Vendor publication command is exposed.

## Participation

Planned, confirmed and cancelled participation remain the exact states. Organizer create/revise uses `configureMarketParticipation`, current existing-row version and `ManageOwnMarketOccurrences`, including default participation and permitted preorder override. Cancellation confirms. Existing overrides are preserved when override controls are not available. Future/date, membership and active-only effects remain backend guards. No attended, no-show, booth or check-in states are invented.

## Offerings

Current preorder/walk-up flags, nullable positive `salesCap`, effective materialized window, source provenance and version are shown. Cap is labeled sales cap and explicitly separate from physical inventory. Configuration uses current offering version for existing rows and backend listing/participation/active/scheduled guards. The UI neither calculates stock nor proves purchase authorization.

Effective window is reread from the backend; current rule defaults/override permission do not cause local rematerialization. Apply current window is a separate explicit `rematerializeMarketOfferingWindow` action with version and authoritative reread. Domain-time information is described only as timing policy; the UI does not compute eligibility or claim inventory, capacity or checkout authorization.

## Operations and privacy boundaries

`ownOccurrenceCustomerOperations` is the sole operational read. It is occurrence-scoped, server-ordered placedAt DESC/id DESC, with skip/take 20 and authoritative `totalItems`. Previous/Next reads a bounded page; the 23-purchase fixture proves a complete second page without downloading all records or counting slices. An occurrence selector uses the explicitly bounded schedule view.

Selected fields are operational purchase/line references, Vendor reference, native state, pickup status, safe line labels/SKU and original/fulfilled/cancelled/remaining quantities, operational fulfillments and backend pickup promise. A customerOrderId is labeled purchase reference, not a Customer identity. There is no email, phone, name/profile, address, payment/provider payload, private financial attribution, Vendor Customer history or contact export. Injected private mock extras are explicitly tested absent from rendered output.

Multiple Vendor portions preserve independent fulfillment/cancellation/remaining state, including fulfilled 2 / cancelled 1 / remaining 2 and another Vendor awaiting pickup. Cancelled quantity is not refunded money, completed is not payout, and pickup is not financial settlement. The view is read only: no fulfillment, Vendor cancellation, refund, stock or communication commands.

## Analytics and optional capability behavior

`ownMarketAnalytics` and `ownMarketOccurrenceAnalytics` use exact generated ranges and cursors only after current analytics grant and neutral `analytics.market.read` ALLOWED state. The optional boundary read requires `ReadOwnBilling`; missing that grant remains UNKNOWN with no billing UI. DENIED/UNKNOWN/UNCONFIGURED render distinct states and retain all core modules. Suspended Markets are manageable but analytics is denied. There is no inferred plan or featureCode binding.

The 13 exposed exact string counters are purchaseCount, marketPurchaseCount, purchasingVendors, participatingVendors, originalUnits, fulfilledUnits, cancelledUnits, awaitingPortions, completedPortions, cancelledPortions, plannedParticipations, confirmedParticipations and cancelledParticipations. Daily and occurrence buckets remain separate; no distinct Vendor totals or bucket sums are calculated. Cursor history resets on range, view, occurrence filter or refresh, preserving backend generation semantics.

Projection status, completeness, sourceAsOf/asOf, active generation, last success and reconciliation are visible. ACTIVE, BUILDING, REBUILDING, RECONCILING, FAILED and UNBUILT are tested; non-current snapshots show a stale/rebuilding warning instead of being presented as fresh truth. No GMV/revenue, Vendor attributed money, refund-dollar metric, financial ranking, Customer profile, profit/payout, communication or campaign metric is selected/rendered.

## Timezone, versions and safe errors

IANA configuration is validated without conversion to the browser's timezone. Recurrence local dates/times are submitted unchanged. Generation uses local calendar dates; bounded read/analytics ranges use UTC midnight [start,end). Manual/revision instants require Z or a numeric offset. Returned local/UTC/timezone/provenance facts remain authoritative. Backend DST ambiguity, nonexistent local time, schedule horizon and temporal/version rules are never reimplemented as frontend commerce decisions.

Every supported existing-resource command uses its exact version field and rereads authoritative state after success. Pending submission disables duplicate intent; dirty forms show Unsaved changes. Conflict/validation refusal requires refresh; uncertain network outcomes prompt checking records and are never automatically retried. A known `STALE_DOMAIN_VERSION` backend sentinel inside BAD_USER_INPUT is mapped to safe conflict. Unknown/raw backend messages, stack, SQL and provider payloads are discarded. Shared safe loading, empty, validation, network, authentication, forbidden, conflict and unavailable states are reused.

## Accessibility and responsive behavior

The existing platform palette, typography, shell, UI primitives and focus states are reused. Market route code is lazy-loaded; forms are labeled and validation messages associated, state announcements use live regions, tables have accessible labels and headers, paging is keyboard operable and native dialogs restore invoking focus after Escape. Mobile navigation remains a semantic disclosure. No eyebrows, numbered card labels, breadcrumbs or new design system was added.

All six Market modules passed axe at 390, 768 and 1280 pixels, with document overflow assertions and 18 Market screenshots, including [desktop Overview](evidence/phase13c/market-overview-1280.png), [mobile Settings](evidence/phase13c/market-settings-390.png), [tablet Vendors](evidence/phase13c/market-vendors-768.png) and [mobile Operations](evidence/phase13c/market-operations-390.png). These representative screenshots were visually inspected. Occurrence cancellation dialog, selected Vendor relationship detail and paged operational detail also passed axe in workflow tests. Existing Vendor pages and public Market fixture passed responsive/axe checks. Automated axe is representative WCAG coverage, not a claim of exhaustive manual accessibility certification.

## Testing and builds

| Check                                        | Result / evidence                                                                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema/codegen repeatability                 | PASS. Two consecutive extraction/codegen runs reproduced all five current schema/provenance/generated artifacts; [hashes](evidence/phase13c/contract-reproducibility.json). No backend bootstrap. |
| TypeScript and Astro checks                  | PASS; zero errors/warnings/hints in 14 Astro files; [log](evidence/phase13c/typecheck.log).                                                                                                       |
| ESLint, package boundaries, Prettier         | PASS; [log](evidence/phase13c/lint.log).                                                                                                                                                          |
| Unit/component contracts and regressions     | 154 PASS: 74 Market, 43 Vendor, 18 Admin and 19 foundation/platform utility tests; [results](evidence/phase13c/unit-results.json).                                                                |
| Browser regressions                          | 33 PASS: 12 new Market tests plus 21 existing Storefront/Vendor/shared-shell tests; [results](evidence/phase13c/browser-results.json).                                                            |
| Market accessibility/responsive              | All six modules at three widths, zero axe violations and no page overflow; screenshots and browser results above.                                                                                 |
| Production Admin and Storefront / root build | PASS with fixture mode disabled; [log](evidence/phase13c/build.log).                                                                                                                              |
| Production fixture/credential marker checks  | PASS; [bundle result](evidence/phase13c/bundle-validation.json). This is bounded marker inspection, not exhaustive secret scanning.                                                               |
| Backend bytes and Git state                  | PASS: 6,393 files unchanged; [result](evidence/phase13c/backend-verification.json).                                                                                                               |

New unit tests validate every Market document against the extracted Admin schema and compile-time factory restrictions. They cover exact bootstrap/grants, suspended/multiple contexts, mandatory workflows, conflicts, states, bounded paging, privacy, optional analytics, late responses and revocation. Browser tests include fixture-disabled production HTTP GraphQL execution against the extracted schema with frontend resolvers, native login/me/identity, generated named operations, actual-shaped stale errors, delayed Market A responses and Market B revocation. Those two tests are production frontend adapter evidence with mocked HTTP, not a new backend full-stack run.

The browser harness uses ports 4521..4524 to preserve existing development servers. Its direct Astro/Vite CLI avoids duplicate port flags. An existing canonical assertion was corrected to the fixture's configured canonical URL, which is independent of the test server's shifted listen port. No Storefront source was modified. The full regression rerun passed. An earlier targeted Market run passed 12 tests; the final 33-test report is authoritative. Local loopback browser execution required normal process approval; no cloud environment or external service was used.

The lazy Market chunk is approximately 40.61 kB (10.20 kB gzip). Vite still emits its advisory for the existing main Admin chunk at approximately 503.16 kB (121.17 kB gzip). The build succeeds; this phase does not refactor Vendor workflows just to eliminate that advisory.

## New MARKET-B blockers

All six are OPEN. The [capability report](frontend-phase13c-capabilities.md) supplies the required workflow, current source evidence, missing narrow contract, rejected unsafe workaround, suggested future API and frontend consequence for each.

| ID        | Unsupported part / safe disposition                                                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MARKET-B1 | Organizer-safe Vendor labels/eligible new relationship directory absent. Existing relationships use references; no arbitrary Vendor lookup.                                                  |
| MARKET-B2 | Market-authorized Product/Variant label read absent. Listing reference remains usable without native catalog.                                                                                |
| MARKET-B3 | Market publication read absent; Vendor-only publication root rejected. Publication unavailable and separate from approval/offering.                                                          |
| MARKET-B4 | Occurrence/membership/state arrays cap 1,000 with no true pages/totals/summary. Bounded views and returned-set counts disclosed. Gate Z remains INCONCLUSIVE for complete occurrence paging. |
| MARKET-B5 | No single own occurrence lookup. Detail requires explicit bounded date view, otherwise unavailable with refresh guidance.                                                                    |
| MARKET-B6 | No own queued-generation status. Accepted receipt only, completion unverified, manual refresh and synchronous alternative.                                                                   |

Supported portions continue working. No missing workflow was repaired in backend source or bypassed through Vendor/global native APIs.

## Existing deferred blockers

Phase13A B1 public hostname/theme/discovery, B3 reviewed production many-domain cookie/CORS/CSRF and B4 Market communications remain OPEN. Phase13A-B2 and VENDOR-B1 through VENDOR-B6 remain CLOSED by Phase 13B.5; their identifiers were not reused. Platform Admin implementation, storefront phases, checkout/customer-account work, Market CRM, billing/POS/communications/provider flows and deployment remain deferred. No applications, booth assignment/fees/maps, waivers, attendance proof or consolidated pickup domain was invented.

## Repository isolation and local files changed

The only write root used for implementation/evidence is the currently opened frontend folder. No backend diff, Git push, remote repository/branch/PR, deployment, hosting project, DNS or provider call occurred. No protected database was used. Generated build/test/schema output stays local here.

| Area                      | Local paths added or modified                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market modules            | `apps/admin/src/market/{MarketRoutes,common,overview,occurrences,vendors,operations,analytics,settings}.tsx`, `service.ts`, `fixture.ts`, `apps/admin/src/market.css`                                                                                                     |
| Shared integration        | `apps/admin/src/AdminApp.tsx`, `AdminShell.tsx`, `FixtureAdmin.tsx`, `packages/admin-core/src/index.ts`                                                                                                                                                                   |
| Typed API / safe conflict | `packages/api/operations/market.graphql`, `packages/api/src/market.ts`, `index.ts`, `transport.ts`, `errors.ts`, generated `admin.ts`, `codegen.ts`                                                                                                                       |
| Tests / harness           | `tests/market.test.tsx`, `tests/e2e/market.spec.ts`, `market-live-mock.spec.ts`, `playwright.phase13c.config.ts`, `vitest.config.ts`; existing `foundation.spec.ts`, `vendor.spec.ts`, `vendor-live-mock.spec.ts`, `urls.ts` only adjust test evidence/canonical behavior |
| Audit / scripts           | `scripts/verify-backend.ts`, `verify-market-backend.ts`, `verify-market-contracts.ts`, `check-bundles.ts`, `package.json`                                                                                                                                                 |
| Documentation / evidence  | `README.md`, `docs/frontend-architecture.md`, `docs/backend-contract.md`, capability report, this report and `docs/evidence/phase13c/*`                                                                                                                                   |

Schema extraction/codegen refreshed local artifacts without manual generated edits. Repeated generation verified byte stability of Admin/Shop schema, provenance and generated outputs. No package installation or lockfile change was necessary. No Vendor module source or public Storefront source was changed.

Frontend Git was already `M README.md` with the application/packages/docs/config/scripts/tests mostly untracked. It remains that state, plus the new untracked Phase 13C Playwright configuration. [Initial frontend status](evidence/phase13c/frontend-status-before.txt) and [final frontend status](evidence/phase13c/frontend-status-after.txt) record this explicitly. No commit was created and existing local files were preserved.

## Reproduction commands

```powershell
npm run dev:fixtures
# In another terminal, after stopping conflicting preview sessions if needed:
$env:FRONTEND_EVIDENCE_DIR = 'docs/evidence/phase13c'
$env:FRONTEND_TEST_PORT_OFFSET = '200'
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e:market
npm run check:bundles
npm run verify:contracts:market
npm run verify:backend:market
```

Clear the two frontend test environment variables afterward. Do not run the historical live backend harness for this phase or recapture the backend baseline over unexpected changes. Select Market scope in the fixture Admin at localhost:4322. Live `npm run dev:admin` uses configured native cookie/API authority and never falls back to synthetic records.

## Acceptance table

All supplied A through DX gates are preserved below. PASS refers to the supported frontend implementation and stated fixture/mock/build evidence, not an unperformed new backend integration. INCONCLUSIVE is only the missing complete occurrence paging contract MARKET-B4; the date-bound portion of Z passes. Additional unsupported workflow portions are explicitly described by MARKET-B1..B6 above.

| Gate | Requirement                                            | Result       | Evidence / limit                                                                                                                                   |
| ---- | ------------------------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Backend repo strictly read-only                        | PASS         | [Backend verification](evidence/phase13c/backend-verification.json): 6,393 bytes/hash records and exact HEAD/status unchanged.                     |
| B    | Backend status/hash unchanged                          | PASS         | [Backend verification](evidence/phase13c/backend-verification.json): 6,393 bytes/hash records and exact HEAD/status unchanged.                     |
| C    | No protected vendure DB use                            | PASS         | No backend startup, database connection, test database or protected vendure operation; read-only command scope.                                    |
| D    | Frontend architecture preserved                        | PASS         | [Architecture](frontend-architecture.md), shared shell and package-boundary check.                                                                 |
| E    | Market capability characterization complete            | PASS         | [Pre-implementation capability matrix](frontend-phase13c-capabilities.md), current source and extracted schema.                                    |
| F    | ownMarketIdentity bootstrap                            | PASS         | Market authority unit tests and fixture-disabled HTTP browser bootstrap/revocation; exact Channel/principal/membership/grants.                     |
| G    | No Market inference from URL/Channel alone             | PASS         | Market authority unit tests and fixture-disabled HTTP browser bootstrap/revocation; exact Channel/principal/membership/grants.                     |
| H    | Multiple Market context selection                      | PASS         | Market authority unit tests and fixture-disabled HTTP browser bootstrap/revocation; exact Channel/principal/membership/grants.                     |
| I    | Bootstrap loading state                                | PASS         | Market authority unit tests and fixture-disabled HTTP browser bootstrap/revocation; exact Channel/principal/membership/grants.                     |
| J    | Bootstrap anonymous state                              | PASS         | Market authority unit tests and fixture-disabled HTTP browser bootstrap/revocation; exact Channel/principal/membership/grants.                     |
| K    | Bootstrap forbidden state                              | PASS         | Market authority unit tests and fixture-disabled HTTP browser bootstrap/revocation; exact Channel/principal/membership/grants.                     |
| L    | Suspended Market policy preserved                      | PASS         | Market authority unit tests and fixture-disabled HTTP browser bootstrap/revocation; exact Channel/principal/membership/grants.                     |
| M    | Membership revocation clears content                   | PASS         | Market authority unit tests and fixture-disabled HTTP browser bootstrap/revocation; exact Channel/principal/membership/grants.                     |
| N    | Market navigation permission-aware                     | PASS         | Exact grant presets, route/service guards and browser hidden-module/direct-forbidden tests.                                                        |
| O    | Partial Market roles supported                         | PASS         | Exact grant presets, route/service guards and browser hidden-module/direct-forbidden tests.                                                        |
| P    | Direct forbidden routes safe                           | PASS         | Exact grant presets, route/service guards and browser hidden-module/direct-forbidden tests.                                                        |
| Q    | Market Overview implemented                            | PASS         | Mandatory 2/3/2 Overview fixture; bounded labels and all four optional states; no finance.                                                         |
| R    | Overview works without analytics                       | PASS         | Mandatory 2/3/2 Overview fixture; bounded labels and all four optional states; no finance.                                                         |
| S    | No financial metrics on Overview                       | PASS         | Mandatory 2/3/2 Overview fixture; bounded labels and all four optional states; no finance.                                                         |
| T    | ownMarket settings read                                | PASS         | Settings/recurrence unit and browser flows, IANA local inputs, authoritative reread and actual-shaped stale refusal.                               |
| U    | Market settings update                                 | PASS         | Settings/recurrence unit and browser flows, IANA local inputs, authoritative reread and actual-shaped stale refusal.                               |
| V    | IANA timezone preserved                                | PASS         | Settings/recurrence unit and browser flows, IANA local inputs, authoritative reread and actual-shaped stale refusal.                               |
| W    | Recurrence update                                      | PASS         | Settings/recurrence unit and browser flows, IANA local inputs, authoritative reread and actual-shaped stale refusal.                               |
| X    | Recurrence stale-version handling                      | PASS         | Settings/recurrence unit and browser flows, IANA local inputs, authoritative reread and actual-shaped stale refusal.                               |
| Y    | Occurrence list                                        | PASS         | Generated/manual list, source/lifecycle/local/UTC fields and explicit bounded date view.                                                           |
| Z    | Occurrence paging/date bounds                          | INCONCLUSIVE | Date bounds PASS; complete paging unavailable because marketOccurrences caps 1,000 without total/cursor (MARKET-B4).                               |
| AA   | Generate occurrences                                   | PASS         | Generation/manual/revise/cancel unit and browser flows; queue accepted only (MARKET-B6); confirmation excludes refund/restock/contact; no delete.  |
| AB   | Queued generation handled if exposed                   | PASS         | Generation/manual/revise/cancel unit and browser flows; queue accepted only (MARKET-B6); confirmation excludes refund/restock/contact; no delete.  |
| AC   | Manual occurrence creation                             | PASS         | Generation/manual/revise/cancel unit and browser flows; queue accepted only (MARKET-B6); confirmation excludes refund/restock/contact; no delete.  |
| AD   | Occurrence revision                                    | PASS         | Generation/manual/revise/cancel unit and browser flows; queue accepted only (MARKET-B6); confirmation excludes refund/restock/contact; no delete.  |
| AE   | Occurrence cancellation                                | PASS         | Generation/manual/revise/cancel unit and browser flows; queue accepted only (MARKET-B6); confirmation excludes refund/restock/contact; no delete.  |
| AF   | Cancellation not called refund                         | PASS         | Generation/manual/revise/cancel unit and browser flows; queue accepted only (MARKET-B6); confirmation excludes refund/restock/contact; no delete.  |
| AG   | Cancellation not called restock                        | PASS         | Generation/manual/revise/cancel unit and browser flows; queue accepted only (MARKET-B6); confirmation excludes refund/restock/contact; no delete.  |
| AH   | Cancellation not called communication                  | PASS         | Generation/manual/revise/cancel unit and browser flows; queue accepted only (MARKET-B6); confirmation excludes refund/restock/contact; no delete.  |
| AI   | No occurrence delete                                   | PASS         | Generation/manual/revise/cancel unit and browser flows; queue accepted only (MARKET-B6); confirmation excludes refund/restock/contact; no delete.  |
| AJ   | Vendor membership list                                 | PASS         | Existing relationship list/status/version tests, tenant guards and private-field absence; safe Vendor references (MARKET-B1).                      |
| AK   | Vendor membership state management                     | PASS         | Existing relationship list/status/version tests, tenant guards and private-field absence; safe Vendor references (MARKET-B1).                      |
| AL   | Vendor relationship tenant isolation                   | PASS         | Existing relationship list/status/version tests, tenant guards and private-field absence; safe Vendor references (MARKET-B1).                      |
| AM   | No Seller exposure                                     | PASS         | Existing relationship list/status/version tests, tenant guards and private-field absence; safe Vendor references (MARKET-B1).                      |
| AN   | No Vendor private finance                              | PASS         | Existing relationship list/status/version tests, tenant guards and private-field absence; safe Vendor references (MARKET-B1).                      |
| AO   | No Vendor customer data                                | PASS         | Existing relationship list/status/version tests, tenant guards and private-field absence; safe Vendor references (MARKET-B1).                      |
| AP   | Listing states displayed                               | PASS         | Listing approve/withdraw/reread tests; no Product edit; publication unavailable (MARKET-B3), separate approval/offering.                           |
| AQ   | Listing approval                                       | PASS         | Listing approve/withdraw/reread tests; no Product edit; publication unavailable (MARKET-B3), separate approval/offering.                           |
| AR   | Vendor cannot gain Product edit authority              | PASS         | Listing approve/withdraw/reread tests; no Product edit; publication unavailable (MARKET-B3), separate approval/offering.                           |
| AS   | Listing approval distinct from publication             | PASS         | Listing approve/withdraw/reread tests; no Product edit; publication unavailable (MARKET-B3), separate approval/offering.                           |
| AT   | Listing approval distinct from offering                | PASS         | Listing approve/withdraw/reread tests; no Product edit; publication unavailable (MARKET-B3), separate approval/offering.                           |
| AU   | Participation states                                   | PASS         | Exact planned/confirmed/cancelled states and organizer permission tests; no invented attendance states.                                            |
| AV   | Participation management where authorized              | PASS         | Exact planned/confirmed/cancelled states and organizer permission tests; no invented attendance states.                                            |
| AW   | No fake attendance/check-in states                     | PASS         | Exact planned/confirmed/cancelled states and organizer permission tests; no invented attendance states.                                            |
| AX   | Offering state                                         | PASS         | Offering configuration/rematerialization/version tests; backend windows/provenance; cap separate from stock and authorization.                     |
| AY   | Offering configuration                                 | PASS         | Offering configuration/rematerialization/version tests; backend windows/provenance; cap separate from stock and authorization.                     |
| AZ   | salesCap distinct from physical inventory              | PASS         | Offering configuration/rematerialization/version tests; backend windows/provenance; cap separate from stock and authorization.                     |
| BA   | Effective preorder window authoritative                | PASS         | Offering configuration/rematerialization/version tests; backend windows/provenance; cap separate from stock and authorization.                     |
| BB   | Domain-time eligibility labeled correctly              | PASS         | Offering configuration/rematerialization/version tests; backend windows/provenance; cap separate from stock and authorization.                     |
| BC   | Window rematerialization where supported               | PASS         | Offering configuration/rematerialization/version tests; backend windows/provenance; cap separate from stock and authorization.                     |
| BD   | Occurrence operations view                             | PASS         | 23-purchase server paging, explicit private-extra absence and operational quantity tests; named read-only factory, no Vendor order/refund actions. |
| BE   | Bounded complete operations paging                     | PASS         | 23-purchase server paging, explicit private-extra absence and operational quantity tests; named read-only factory, no Vendor order/refund actions. |
| BF   | Vendor portions displayed safely                       | PASS         | 23-purchase server paging, explicit private-extra absence and operational quantity tests; named read-only factory, no Vendor order/refund actions. |
| BG   | Customer contact absent                                | PASS         | 23-purchase server paging, explicit private-extra absence and operational quantity tests; named read-only factory, no Vendor order/refund actions. |
| BH   | Addresses absent                                       | PASS         | 23-purchase server paging, explicit private-extra absence and operational quantity tests; named read-only factory, no Vendor order/refund actions. |
| BI   | Payment/provider data absent                           | PASS         | 23-purchase server paging, explicit private-extra absence and operational quantity tests; named read-only factory, no Vendor order/refund actions. |
| BJ   | Vendor finance absent                                  | PASS         | 23-purchase server paging, explicit private-extra absence and operational quantity tests; named read-only factory, no Vendor order/refund actions. |
| BK   | Operational vs financial semantics preserved           | PASS         | 23-purchase server paging, explicit private-extra absence and operational quantity tests; named read-only factory, no Vendor order/refund actions. |
| BL   | Market cannot use Vendor fulfillment commands          | PASS         | 23-purchase server paging, explicit private-extra absence and operational quantity tests; named read-only factory, no Vendor order/refund actions. |
| BM   | No refund controls                                     | PASS         | 23-purchase server paging, explicit private-extra absence and operational quantity tests; named read-only factory, no Vendor order/refund actions. |
| BN   | Market Analytics implemented                           | PASS         | Analytics permission, neutral boundary, four availability states, six freshness states and cursor-reset tests; core reads independent.             |
| BO   | ReadOwnMarketAnalytics respected                       | PASS         | Analytics permission, neutral boundary, four availability states, six freshness states and cursor-reset tests; core reads independent.             |
| BP   | analytics.market.read capability used                  | PASS         | Analytics permission, neutral boundary, four availability states, six freshness states and cursor-reset tests; core reads independent.             |
| BQ   | Analytics ALLOWED                                      | PASS         | Analytics permission, neutral boundary, four availability states, six freshness states and cursor-reset tests; core reads independent.             |
| BR   | Analytics DENIED                                       | PASS         | Analytics permission, neutral boundary, four availability states, six freshness states and cursor-reset tests; core reads independent.             |
| BS   | Analytics UNKNOWN                                      | PASS         | Analytics permission, neutral boundary, four availability states, six freshness states and cursor-reset tests; core reads independent.             |
| BT   | Analytics UNCONFIGURED                                 | PASS         | Analytics permission, neutral boundary, four availability states, six freshness states and cursor-reset tests; core reads independent.             |
| BU   | Core Admin independent of analytics                    | PASS         | Analytics permission, neutral boundary, four availability states, six freshness states and cursor-reset tests; core reads independent.             |
| BV   | Projection freshness displayed                         | PASS         | Analytics permission, neutral boundary, four availability states, six freshness states and cursor-reset tests; core reads independent.             |
| BW   | No GMV                                                 | PASS         | Generated selections and rendered metric tests: 13 count fields, no money, financial rankings or Customer identity/profile.                        |
| BX   | No Vendor attributed money                             | PASS         | Generated selections and rendered metric tests: 13 count fields, no money, financial rankings or Customer identity/profile.                        |
| BY   | No refund-dollar metrics                               | PASS         | Generated selections and rendered metric tests: 13 count fields, no money, financial rankings or Customer identity/profile.                        |
| BZ   | No Vendor financial ranking                            | PASS         | Generated selections and rendered metric tests: 13 count fields, no money, financial rankings or Customer identity/profile.                        |
| CA   | No Customer identities/count profiling beyond safe DTO | PASS         | Generated selections and rendered metric tests: 13 count fields, no money, financial rankings or Customer identity/profile.                        |
| CB   | No payout/profit metrics                               | PASS         | Generated selections and rendered metric tests: 13 count fields, no money, financial rankings or Customer identity/profile.                        |
| CC   | Market A/B state isolation                             | PASS         | Single browser lifecycle all modules, delayed production Market A HTTP response and Market B revocation; pending service reads discarded.          |
| CD   | Tenant switch clears prior state                       | PASS         | Single browser lifecycle all modules, delayed production Market A HTTP response and Market B revocation; pending service reads discarded.          |
| CE   | Late response cannot repopulate old Market             | PASS         | Single browser lifecycle all modules, delayed production Market A HTTP response and Market B revocation; pending service reads discarded.          |
| CF   | Permission loss safe                                   | PASS         | Single browser lifecycle all modules, delayed production Market A HTTP response and Market B revocation; pending service reads discarded.          |
| CG   | No communications UI                                   | PASS         | Six-module navigation, route/factory boundary tests and no excluded domain controls.                                                               |
| CH   | No Market CRM/Customers module                         | PASS         | Six-module navigation, route/factory boundary tests and no excluded domain controls.                                                               |
| CI   | No Product management                                  | PASS         | Six-module navigation, route/factory boundary tests and no excluded domain controls.                                                               |
| CJ   | No Inventory management                                | PASS         | Six-module navigation, route/factory boundary tests and no excluded domain controls.                                                               |
| CK   | No Channel management                                  | PASS         | Six-module navigation, route/factory boundary tests and no excluded domain controls.                                                               |
| CL   | No Seller management                                   | PASS         | Six-module navigation, route/factory boundary tests and no excluded domain controls.                                                               |
| CM   | No POS configuration                                   | PASS         | Six-module navigation, route/factory boundary tests and no excluded domain controls.                                                               |
| CN   | No billing UI                                          | PASS         | Six-module navigation, route/factory boundary tests and no excluded domain controls.                                                               |
| CO   | No exports                                             | PASS         | Six-module navigation, route/factory boundary tests and no excluded domain controls.                                                               |
| CP   | Accessible Overview                                    | PASS         | Axe and document-overflow assertions for all six Market modules at 390/768/1280; 18 screenshots.                                                   |
| CQ   | Accessible Occurrences                                 | PASS         | Axe and document-overflow assertions for all six Market modules at 390/768/1280; 18 screenshots.                                                   |
| CR   | Accessible Vendors                                     | PASS         | Axe and document-overflow assertions for all six Market modules at 390/768/1280; 18 screenshots.                                                   |
| CS   | Accessible Operations                                  | PASS         | Axe and document-overflow assertions for all six Market modules at 390/768/1280; 18 screenshots.                                                   |
| CT   | Accessible Analytics                                   | PASS         | Axe and document-overflow assertions for all six Market modules at 390/768/1280; 18 screenshots.                                                   |
| CU   | Accessible Settings                                    | PASS         | Axe and document-overflow assertions for all six Market modules at 390/768/1280; 18 screenshots.                                                   |
| CV   | Keyboard navigation                                    | PASS         | Mobile disclosure, keyboard actions and native dialog Escape/focus-return browser checks.                                                          |
| CW   | Dialog focus management                                | PASS         | Mobile disclosure, keyboard actions and native dialog Escape/focus-return browser checks.                                                          |
| CX   | 390px responsive                                       | PASS         | Axe and document-overflow assertions for all six Market modules at 390/768/1280; 18 screenshots.                                                   |
| CY   | 768px responsive                                       | PASS         | Axe and document-overflow assertions for all six Market modules at 390/768/1280; 18 screenshots.                                                   |
| CZ   | 1280px responsive                                      | PASS         | Axe and document-overflow assertions for all six Market modules at 390/768/1280; 18 screenshots.                                                   |
| DA   | GraphQL schema generation reproducible                 | PASS         | [Repeatability hashes](evidence/phase13c/contract-reproducibility.json): two runs reproduce schemas, provenance and generated Admin/Shop output.   |
| DB   | GraphQL codegen reproducible                           | PASS         | [Repeatability hashes](evidence/phase13c/contract-reproducibility.json): two runs reproduce schemas, provenance and generated Admin/Shop output.   |
| DC   | Typecheck                                              | PASS         | [Typecheck log](evidence/phase13c/typecheck.log), zero errors/warnings/hints.                                                                      |
| DD   | Lint                                                   | PASS         | [Lint log](evidence/phase13c/lint.log), ESLint/boundaries/Prettier.                                                                                |
| DE   | Unit/component tests                                   | PASS         | [Unit results](evidence/phase13c/unit-results.json): 154 passed including 74 Market.                                                               |
| DF   | Browser tests                                          | PASS         | [Browser results](evidence/phase13c/browser-results.json): 33 passed, zero axe violations.                                                         |
| DG   | Accessibility checks                                   | PASS         | [Browser results](evidence/phase13c/browser-results.json): 33 passed, zero axe violations.                                                         |
| DH   | Admin production build                                 | PASS         | [Build log](evidence/phase13c/build.log): fixture-disabled Admin, Storefront and root build pass.                                                  |
| DI   | Storefront production build                            | PASS         | [Build log](evidence/phase13c/build.log): fixture-disabled Admin, Storefront and root build pass.                                                  |
| DJ   | Root build                                             | PASS         | [Build log](evidence/phase13c/build.log): fixture-disabled Admin, Storefront and root build pass.                                                  |
| DK   | Vendor Admin regressions                               | PASS         | 43 Vendor unit tests and existing browser regressions; public Bulverde fixture remains MARKET; Platform shell unchanged.                           |
| DL   | Storefront regressions                                 | PASS         | 43 Vendor unit tests and existing browser regressions; public Bulverde fixture remains MARKET; Platform shell unchanged.                           |
| DM   | Bulverde Market Day remains MARKET                     | PASS         | 43 Vendor unit tests and existing browser regressions; public Bulverde fixture remains MARKET; Platform shell unchanged.                           |
| DN   | Platform shell regression                              | PASS         | 43 Vendor unit tests and existing browser regressions; public Bulverde fixture remains MARKET; Platform shell unchanged.                           |
| DO   | No fake production fallback                            | PASS         | Fixture-disabled unavailable/anonymous/live HTTP adapter tests and production bundle marker check; no fallback.                                    |
| DP   | Missing backend contract becomes MARKET-B blocker      | PASS         | [MARKET-B1..B6](frontend-phase13c-capabilities.md) documented; no native global or Vendor-owner workarounds.                                       |
| DQ   | No backend workaround through native global APIs       | PASS         | [MARKET-B1..B6](frontend-phase13c-capabilities.md) documented; no native global or Vendor-owner workarounds.                                       |
| DR   | README/docs updated                                    | PASS         | README, architecture, backend contract and this complete implementation report.                                                                    |
| DS   | Phase 13C capability report complete                   | PASS         | [Pre-implementation capability matrix](frontend-phase13c-capabilities.md), current source and extracted schema.                                    |
| DT   | Phase 13C implementation report complete               | PASS         | README, architecture, backend contract and this complete implementation report.                                                                    |
| DU   | No backend changes                                     | PASS         | [Backend verification](evidence/phase13c/backend-verification.json): 6,393 bytes/hash records and exact HEAD/status unchanged.                     |
| DV   | No deployment                                          | PASS         | All implementation/evidence local frontend only; no deployment/provider call or Phase 13D work.                                                    |
| DW   | No provider calls                                      | PASS         | All implementation/evidence local frontend only; no deployment/provider call or Phase 13D work.                                                    |
| DX   | No Phase 13D+ scope creep                              | PASS         | All implementation/evidence local frontend only; no deployment/provider call or Phase 13D work.                                                    |
