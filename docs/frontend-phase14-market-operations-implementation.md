# Phase 14: Market operations implementation

## Summary

Phase 14A through 14D are implemented locally in the backend and frontend. The final dedicated qualification passed **21 backend scenarios and 14 real browser scenarios, 35 total**. Frontend unit/component tests passed **207 tests across 11 files**, including six new operations component tests. All twelve backend regression categories passed their recorded scopes, and 73 permanent frontend cases/flows passed. The production build, 75-file artifact marker check and 26 production-hardening gates passed. The legacy CRM nested build limitation and unavailable Firefox/WebKit engines are recorded below.

This work stops before Stripe configuration. There is no Vendor sales reconciliation domain, screen or endpoint.

## Architecture

The four records remain independent: reusable layout, Market Vendor Directory, occurrence-specific assignment and Market billing. Application submissions retain independent applicant identity. An assignment requires an approved occurrence and a compatible space from that occurrence's published layout version. Accepted rentals become occurrence allocations. The assignment creates a draft local invoice. Only a deliberate manager action issues it.

Canonical Vendor, Market, MarketOccurrence, OccurrenceParticipation, MarketListing, OccurrenceOffering, Direct Regular Orders and Market Aggregate/Seller Orders retain their existing meanings. External businesses never become fake canonical Vendors. A deliberately linked business uses an approved native Market membership and canonical OccurrenceParticipation for future approved dates. Operational check-in/final attendance are separate because existing participation status does not express those states.

## New entities

All fifteen entities are in backend `src/plugins/market-operations/entities.ts`:

| Entity                           | Responsibility                                                                |
| -------------------------------- | ----------------------------------------------------------------------------- |
| MarketApplicationTemplate        | Market-scoped name, opaque URL and advertised visibility                      |
| MarketApplicationTemplateVersion | Draft/published/retired immutable form definition                             |
| MarketApplicationSubmission      | Applicant, answers, definition, requested dates and rental snapshots          |
| MarketVendorDirectoryEntry       | External business/contact or deliberate canonical Vendor link                 |
| MarketRentalOption               | Rental/add-on price, quantity, finite capacity and amenity requirement        |
| MarketLayout                     | Reusable named venue                                                          |
| MarketLayoutVersion              | Stable logical geometry and area version                                      |
| MarketSpace                      | First-class physical booth within one version                                 |
| MarketOccurrencePlan             | Occurrence's pinned layout version, publication snapshot and closeout         |
| MarketOccurrenceApproval         | Approved business/date, optional native participation, arrival and attendance |
| MarketOccurrenceSpaceAssignment  | One business in a booth on one occurrence                                     |
| MarketRentalAllocation           | Confirmed occurrence quantity and accepted price snapshot                     |
| MarketInvoice                    | Local draft/issued obligation, immutable lines and recipient                  |
| MarketPayment                    | Exact offline settlement/coverage, actor, date and idempotency                |
| MarketOperationsAudit            | Append-only operational action history                                        |

MarketSpace has no permanent paymentStatus or currentVendor field. Invoice lines are typed immutable JSON snapshots within the separate invoice entity, rather than Customer Order lines.

## New migrations

Exactly one new forward-only migration:

`E:\\coding\\farmers-market-platform\\src\\migrations\\1791400000000-MarketOperationsPhase14.ts`

Class: `MarketOperationsPhase141791400000000`.

It creates the fifteen tables, scoped indexes, compound Market foreign keys, unique occurrence/space occupancy, unique occurrence/directory approval, active invoice uniqueness, payment retry uniqueness and database snapshot/append-only triggers. Published space records are protected. It adds a compatible `(id, marketId)` occurrence reference constraint. Its down method refuses destructive rollback. Historical migrations are unchanged. synchronize is not used.

The existing production-hardening seed now includes this migration so its all-migrations-applied preservation check stays valid.

## New permissions

- ReadOwnMarketApplications
- ManageOwnMarketApplications
- ReadOwnMarketLayouts
- ManageOwnMarketLayouts
- ReadOwnMarketAssignments
- ManageOwnMarketAssignments
- ReadOwnMarketBilling
- ManageOwnMarketBilling
- OperateOwnMarketDay

The plugin registers these permissions; the Market Admin preset includes them. Existing stored roles are not silently elevated. They need deliberate grants before using the new modules. Applications/directory/rental management uses the application permission pair. Market Day financial and placement actions still require the corresponding billing/assignment permission.

## Application versioning

Definitions start DRAFT, publish explicitly and retire when superseded or retired. Edits to published definitions require a clone/new draft. Submissions keep the precise labels, help, options, semantics, answers, identity, requirements, requested dates and rental prices from submission time.

The submission review states are SUBMITTED, UNDER_REVIEW, NEEDS_INFO, WAITLISTED, ACCEPTED, DECLINED and WITHDRAWN. Pre-submission draft work is the applicant's form input; resumable persisted applicant drafts are not implemented. Acceptance freezes the explicitly selected requested-date subset. Later scheduling uses explicit occurrence approval.

## Application builder

Routes under `/market/applications` provide template creation, versions, safe system-field label/help/placement changes, sections, mouse reorder, keyboard move controls, required/hidden controls, all twelve question types, options editing, preview, publication, clone and retirement. There is no raw JSON editor.

Business name, first/last contact name and valid email remain required and typed. Optional semantics can be hidden. Public `/apply` uses the advertised application; `/apply/:slug` supports the opaque direct link. The public form waits for hydration before enabling submission and submits through a same-origin bounded BFF. No platform account, fee, checkout or provider session is created.

## Market Vendor Directory

Businesses can be created manually, accepted from an application or deliberately linked to an existing canonical Vendor. Email/name matching never auto-links them. A later link preserves prior submissions, assignments and invoice recipient snapshots. The Vendor own projection checks fresh Vendor authority and returns only that Vendor's upcoming safe assignments and its own invoice status.

## Rental catalog and allocation

Catalog entries contain description, enabled state, integer minor price, explicit currency, default/max quantity, optional occurrence capacity, optional required space amenity and ordering. Applications request the same quantities for their requested dates; accepted quantities and price overrides can differ per occurrence.

Requests reserve nothing. Assignment confirmation checks finite capacity under the Market transaction lock and commits allocations. Submitted catalog prices remain snapshotted after later catalog price changes. An electric-hookup line requiring ELECTRICITY must have a physically compatible booth.

## Layout designer architecture

`packages/ui/src/MarketMap.tsx` supplies the shared native SVG primitive renderer and gestures. `Layouts.tsx` persists domain geometry and first-class space details. Geometry is logical x/y/width/height/rotation/zIndex, independent of viewport. A pixelsPerFoot scale keeps visual resize and physical feet consistent.

The editor supports multiple areas, select, move, corner resize, exact inspector dimensions, rotation, grid/snap, pan/zoom/fit, copy/paste/duplicate/delete, bounded undo/redo and z-order. Rectangle, circle, triangle, line, text, image/logo and booth elements share the same model. Image decorations use public-safe URLs. The DOM element list and inspector are keyboard alternatives to pointer editing.

## React-Konva/library decision

Installed React and ReactDOM were inspected: both are **19.3.0**. Konva/react-konva were absent. A compatible package lookup failed with registry DNS ENOTFOUND, so no dependency or React upgrade was made.

The allowed comparable primitive option was used: browser-native SVG with the existing React runtime. It has no separate drawing-library commercial license, opaque serialized library state or floor-plan application dependency. This is a documented deviation from the Konva preference, with equivalent required core primitives and measured real-browser move/resize behavior. No tldraw, openWarehouse, Marketspread code, branding, scraping or reverse engineering was used.

## Layout versioning

Published layouts and their space records are immutable through the commands and database guards. Cloning produces a new draft with stable element identities and copied space details. Occurrences pin a published version. Version 2 publication cannot rewrite an occurrence using version 1. Published public maps also retain their explicit occurrence snapshot.

## Occurrence assignments

Review, scheduler/list and selected map booth all call the same ASSIGN/ACCEPT_ASSIGN commands. Approval, Market ownership, published plan, compatible space, physical requirements, active linked membership and rental capacity are rechecked. Unique occurrence/space occupancy is enforced by the database. Additional spaces need explicit manager confirmation.

Preferred businesses are suggestions. Copy-previous returns draft proposals, nonparticipants, new businesses and placement/capacity conflicts. It checks combined proposed rental quantities and commits no assignments or allocations until individually confirmed. A day-of move updates the location under the lock and preserves audit history. Issued invoices require explicit KEEP; unpaid replacement is a separate deliberate action.

## Public map projection

Only explicit publication exposes `/occurrences/:occurrenceId/map`. The stored allowlist contains public geometry, booth labels/dimensions/amenities, public business name/category/description and instructions. It excludes contact email/phone, private linked IDs, manager notes, application answers, rental costs, invoice totals/payment status, check-in and attendance.

The shared renderer supplies business/booth search, result selection, highlight/centering and a semantic DOM list. Search can find businesses across areas. Vendor rendering emphasizes the Vendor's own element and uses the public map when published.

## Billing model

MarketInvoice is separate from all commerce Orders, Products, carts and Vendor financial allocations. Confirmation creates a DRAFT obligation with exact booth and accepted rental line snapshots. Money uses checked integer minor units and explicit currency. Currency mismatches are rejected.

Actual persisted states are DRAFT, OPEN, PAID and VOID. Manual issuance records issuedAt and optional dueAt. PAST_DUE is an authoritative derived status, not a simulated provider transition. Fully complimentary/waived coverage projects COMPLIMENTARY. Summaries separate expected, actually collected, waived and outstanding amounts per currency.

Draft changes recalculate. Issued recipient, lines, amounts, currency and financial identity cannot silently change. KEEP preserves the existing invoice after a move. Void/reissue supports only an unpaid manually issued OPEN invoice; it creates a linked replacement draft. Partial-payment credits and refunds are deferred.

## Provider boundary

MarketInvoiceProvider defines createAndSendInvoice, refreshInvoice and voidInvoice. The runtime implementation is UnconfiguredMarketInvoiceProvider, state NOT_CONFIGURED. Online issue requests are rejected and the browser send button is disabled. Manual local issuance works without provider transport. No Stripe SDK, Customer, Connect account, Hosted Invoice Page, application fee or FundsFlowPolicy choice is introduced by Phase 14.

## Manual payments

Cash, Check, External, Complimentary, Waived and Other record amount, UTC date, note and recordedBy. Payment rows and audit rows are append-only. A Market-scoped idempotency key and canonical input hash prevent duplicate settlement or reuse with different input. Overpayment, zero amounts, future dates, fractional amounts and non-OPEN invoice payments are rejected. Complimentary/waived coverage settles the obligation without inflating collected cash.

## Market Day Mode

`/market/day/:occurrenceId` uses the same plan and map. It shows expected/assigned/unassigned businesses, arrival counts, all five attendance counts, rental quantities, billing summary and private overlays. Check-in is independent of ATTENDED, APPROVED_ABSENCE, UNAPPROVED_ABSENCE, NO_SHOW or NOT_RECORDED.

The DOM cards support search, check-in, attendance, compatible booth move, accepted rentals, private notes, invoice viewing and offline payment. Closeout summarizes missing attendance, unpaid invoices, unassigned businesses and notes, and can mark operations complete after the occurrence starts. This does not alter Order financial truth.

## Security and tenant isolation

Every manager root checks a current authenticated native Administrator, current active Market derived from selected channel, fresh active Market membership and the exact purpose permission. All referenced records are queried with Market scope. Permission/membership revocation is effective on the next request in the same session.

Public inputs never establish Market authority. The existing approved hostname/Shop context resolves the Market; the slug/version resolves that Market's application. The BFF rejects extra client authority keys, bounds request bytes and requires same origin/content type. Answers, lists, strings, quantities, options, geometry and money have server-side bounds.

The durable limiter permits ten successful new submissions per Market/source address/hour; identical retries remain idempotent. It deliberately trusts the immediate backend peer rather than client-supplied forwarding headers. Behind the current BFF, multiple applicants can share that conservative source quota. A trusted proxy-aware applicant limiter and public-link delivery workflow remain follow-up operational work.

Known domain sentinels are mapped to safe client classifications. Unexpected exceptions become a generic unavailable error; browser UI receives no SQL/stack/provider detail. Existing Shop/default-deny and commerce interceptors received only the three narrow operations-root exceptions.

## Concurrency

Every manager mutation and public submission runs in a transaction with a pessimistic Market-row write lock. This serializes acceptance, occupancy, capacity, issuance and offline-payment effects within a Market. Database uniqueness and compound scoped foreign keys provide independent integrity protection.

Measured competing-request scenarios cover application acceptance, booth occupancy, rental capacity across different free booths, invoice issuance and duplicate offline payment. The coarse per-Market lock favors correctness at current local scale; a future finer lock scheme needs equivalent race qualification.

## Full-stack tests

`npm run test:live:market-operations` passed 35 dedicated scenarios:

- 21 real HTTP/backend/PostgreSQL scenarios: templates, anonymous identity/no charge, snapshots, partial acceptance race, geometry/plan, electricity conflict/exact 6500 invoice, occupancy/capacity, public privacy, separate rental race, layout history, issuance/KEEP/immutability, duplicate cash, day closeout, tenant attacks, private link/retirement/bounds/rate limit, draft replacement, waived/past-due summary, deliberate platform link/Vendor isolation, copy proposals, no-sales assertion and fresh revocation.
- 14 real Chromium scenarios: existing builder edit; new template customization/preview/publication; anonymous submission; subset acceptance/assignment; second-area shapes/booths/drag/resize/preference/rotation/copy/undo/publish/reload; public search/privacy; Market Day at 390, 768 and 1280; attendance/notes persistence; map move with paid invoice retained; manual issuance/payment; Vendor own view; provider-unconfigured billing.

The runner uses fixture mode false, separate anonymous/manager/Vendor contexts, native cookies and a fresh guarded loopback `vendure_test_operations_*` database. Successful runs drop their database. It saves no browser media, trace or result files.

All dedicated backend scenarios in `test/market-operations/run.ts`:

| Scenario                                                                             | Result |
| ------------------------------------------------------------------------------------ | ------ |
| Application builder persistence, typed identity and rental catalog                   | PASS   |
| Anonymous external application, no fake Vendor, no billing and no rental reservation | PASS   |
| Immutable template versions and submitted rental-price snapshots                     | PASS   |
| Partial date acceptance race produces one external directory entry                   | PASS   |
| Reusable layout, areas, first-class spaces, geometry reload and plan                 | PASS   |
| Electricity conflict denied; compatible assignment creates exact 6500 draft          | PASS   |
| Double-booking and final rental capacity races commit only one                       | PASS   |
| Unpublished public denial and allowlisted published map                              | PASS   |
| Finite rental race on two different free booths                                      | PASS   |
| Layout v2 preserves occurrence history at v1                                         | PASS   |
| Issuance idempotency, unconfigured provider and immutable issued total               | PASS   |
| Duplicate cash payment settles once with manager audit                               | PASS   |
| Market Day check-in, attendance, notes, summary and closeout                         | PASS   |
| Cross-Market application, layout, assignment, invoice and day denial                 | PASS   |
| Private link, retirement, input bounds and source rate limit                         | PASS   |
| Draft recalculation and deliberate unpaid void replacement                           | PASS   |
| Waived coverage, past-due projection and exact currency summary                      | PASS   |
| Deliberate platform link, canonical participation and Vendor own isolation           | PASS   |
| Copy-previous conflict proposals create no allocations                               | PASS   |
| No Vendor sales reconciliation roots, entities or UI                                 | PASS   |
| Same-session exact permission and active membership revocation                       | PASS   |

All dedicated browser scenarios in `scripts/test-phase14.ts`:

| Scenario                                                                | Result |
| ----------------------------------------------------------------------- | ------ |
| Live Market Admin navigation and application builder                    | PASS   |
| Create, customize, preview and publish reusable application             | PASS   |
| Anonymous external submission without payment                           | PASS   |
| Accept external application and assign approved subset/date             | PASS   |
| Add area, shapes and booth; move/resize, undo/redo, save/publish/reload | PASS   |
| Public search highlights booth without operational controls             | PASS   |
| Market Day responsive and axe at 390 pixels                             | PASS   |
| Market Day responsive and axe at 768 pixels                             | PASS   |
| Market Day responsive and axe at 1280 pixels                            | PASS   |
| Market Day attendance and manager-note persistence                      | PASS   |
| Move through selected map booth while preserving paid invoice           | PASS   |
| Issue and settle manual invoice                                         | PASS   |
| Linked Vendor sees its own safe booth projection                        | PASS   |
| Provider stays unconfigured; manual invoices remain available           | PASS   |

Earlier development runs exposed editor refresh loss, duplicate headings, browser sequencing and offscreen pointer-test issues. Those were corrected and the final full dedicated run passed. One simultaneous Astro dev run was rejected by Astro's per-project dev-server guard; the final run was sequenced correctly.

## Regressions

The initial backend orchestration returned 9 passing and 3 failing commands. POS/Communications failures came from the first evidence-suppression shim not sharing virtual fixture files across child processes. Replacing it with the existing permanent cross-process in-memory helper allowed both focused reruns to pass. The original full CRM wrapper's nested build uses NODE_ENV=production with APP_ENV=test and is rejected by existing hardening. Its direct acceptance/worker qualification is recorded separately; the entire production build already passed.

| Backend permanent suite | Scope                                                                   | Final result |
| ----------------------- | ----------------------------------------------------------------------- | ------------ |
| Identity                | Full permanent command                                                  | PASS         |
| Market                  | Full permanent command                                                  | PASS         |
| Catalog                 | Full permanent command                                                  | PASS         |
| Inventory               | Full permanent command, local race checks                               | PASS         |
| Commerce                | Full permanent command                                                  | PASS         |
| Finance/refunds         | Full deterministic command                                              | PASS         |
| Customer relationships  | 59 direct acceptance/worker checks, separately from legacy nested build | PASS         |
| Payments                | Focused deterministic provider adapter                                  | PASS         |
| POS                     | Focused deterministic, fresh-process recovery rerun                     | PASS         |
| Communications          | Focused deterministic, recovery rerun                                   | PASS         |
| Billing                 | Focused deterministic                                                   | PASS         |
| Analytics               | Rebuild-only permanent command                                          | PASS         |

The fixture/browser regression orchestration initially returned 6 passing commands and one failing Market Admin command. The separately repeated complete Market Admin command passed all 12 browser tests.

The original full CRM wrapper is **FAIL** at its nested build environment gate. It is not included as a passing command. The table records the separately passing `--workers-only` scope; complete production build qualification is independent.

| Frontend regression                                      | Final browser totals/result                |
| -------------------------------------------------------- | ------------------------------------------ |
| Fixture foundation, Vendor Admin, Market Admin and mocks | 33 PASS                                    |
| Live Vendor Admin                                        | 8 PASS                                     |
| Live Market Admin, separate complete rerun               | 12 PASS                                    |
| Live Vendor Storefront                                   | 7 PASS                                     |
| Live Market Storefront                                   | 5 PASS                                     |
| Live checkout/account/SSO                                | 1 composite full-stack flow PASS           |
| Live Platform Admin                                      | 7 PASS                                     |
| Phase 13H production hardening                           | 26 gates PASS; Firefox/WebKit INCONCLUSIVE |

There are 73 passing permanent frontend browser cases/flows outside the 14 dedicated Phase 14 scenarios. External provider qualification remains NOT_EXECUTED. The Payments/POS/Communications/Billing suites use controlled local adapters, and Analytics uses the rebuild scope; this does not claim every optional provider/stress mode was executed.

The first production-hardening seed failed its all-migrations-already-applied assertion because its explicit migration list omitted the new Phase 14 migration. Adding that migration to the local seed fixed the assertion; the final complete run passed all 26 gates. These cover startup rejection, backup/restore, built server/worker, hostname/HTTPS/CORS/body/debug policies, real local HTTPS identity/SSO and secure cookies, cart isolation, administrative authority, inert XSS, CSP/cache, representative accessibility/responsive behavior, session/revocation across restarts, authenticated concurrency, memory across switches, SSR concurrency, worker restart, database outage recovery, bounded pool size and synthetic secret absence. The SSR exercise completed 100 requests with concurrency 20, p50 159.4 ms and p95 408.2 ms. Firefox and WebKit qualification remains INCONCLUSIVE because their local runtimes were unavailable.

The separate deliberate HTTP 500 checks also passed: sanitized correlated request/error events and headers, the Admin ErrorBoundary with preserved shell/retry, recovery to a normal 200 tenant read, normal-production fault-path exclusion and disposable database cleanup. The invocation uses `npx tsx scripts/test-production-hardening.ts --deliberate-500-only`; passing that flag through this installation's npm run wrapper is rejected, so the direct script invocation was used.

## Builds

| Command/check                                         | Result                                 |
| ----------------------------------------------------- | -------------------------------------- |
| GraphQL source schema extraction                      | PASS, no backend bootstrap/DB          |
| GraphQL codegen                                       | PASS                                   |
| Backend tsc and Phase 14 test typecheck               | PASS                                   |
| Frontend tsc and Astro check                          | PASS, 52 Astro files, zero diagnostics |
| ESLint, package boundaries and Prettier               | PASS                                   |
| Frontend unit/component tests                         | PASS, 207/207 across 11 files          |
| Root, Storefront and Admin production build           | PASS                                   |
| Backend dashboard, server and worker production build | PASS                                   |
| Production artifact marker check                      | PASS, 75 files                         |

The source extractor now reads PermissionDefinition names using the TypeScript AST, so formatting/quote style cannot silently omit the new permission enum members. The final production build uses the existing synthetic production-local helper, with providers disabled and no database bootstrap.

## Accessibility and responsive behavior

Representative application builder/preview, public application, public map, Vendor booth view, billing and Market Day routes passed axe. Market Day passed at 390/768/1280 with no document overflow. Essential operations use labeled native forms, buttons and selects. Arrival, attendance, notes and payments were exercised in a real browser. Layout pointer gestures were tested, with keyboard alternatives through the DOM list and inspector.

This is measured representative accessibility qualification, not a claim of an exhaustive screen-reader or every-device audit. No screenshots were taken. No new UI breadcrumbs, eyebrow headings, leading-zero section numbering or em dashes were added.

## Known limits

- Native SVG is the documented alternative to the preferred Konva dependency; there is no advanced full floor-plan/CAD tool.
- Image/logo elements use public URLs. Private uploads and signatures remain deferred.
- Applicant drafts are not persisted/resumable and status changes do not send email/SMS.
- Directory candidates and management reads are bounded (100 canonical Vendor choices, up to 2000 operation rows); large-scale paging is a future extension.
- Accepted rentals are per occurrence. Applicant rental selection initially applies uniformly to selected dates.
- Published maps are explicit snapshots. Managers must republish to expose later location changes; drafts never leak into public rendering.
- Linked Vendor maps await public publication and show only that Vendor's private financial projection.
- Credit/refund handling after partial payment, online invoice delivery and provider reconciliation remain deferred.
- Closeout records operational completion; it does not enforce a financial lock or reconcile Vendor sales.
- Rate limiting is conservative at the immediate backend peer/BFF boundary.
- PostgreSQL concurrency qualification used competing HTTP requests under the transaction lock, not a production-scale load test.
- The original full CRM regression command still rejects its legacy nested build environment. Its 59 direct acceptance/worker checks passed, and the complete production build passed independently.
- Firefox and WebKit production-hardening checks are INCONCLUSIVE because the installed local browser runtimes were unavailable; dedicated Phase 14 browser coverage used Chromium.
- Some unsuccessful development and legacy regression runs retain guarded disposable test databases by the existing failed-run policy. No protected or pre-existing database was used or removed.

## Local files and commands

Backend additions are `src/plugins/market-operations/*`, the single migration, and `test/market-operations/*` plus `test/no-evidence.cjs`. Additive integration edits are plugin registration, Market permission presets and the two narrow Shop guard exceptions. Package scripts add operations test/typecheck commands; the existing hardening seed adds the new migration.

Frontend additions are typed operations APIs/documents, the shared map/forms, `apps/admin/src/market/phase14/*`, Vendor booth projection/view, public application/map/BFF routes, dedicated tests and local regression runners. Integration edits cover navigation, live service/route wiring, Market storefront application link, scoped styles, source schema extraction/codegen and evidence-free Playwright output suppression. Existing local work remains in place.

For local verification:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
$env:APP_ENV='test'
$env:DB_HOST='127.0.0.1'
# From the frontend folder:
npm run test:live:market-operations
npm run graphql:schema
npm run graphql:codegen
npm run typecheck
npm run lint
npm test
npm run build:production-local
npm run check:bundles
# From the backend folder:
npm run test:market-operations:types
npm run test:market-operations
# Backend permanent regression scopes listed above:
node test/market-operations/regressions.cjs
# From the frontend folder, permanent browser regressions and hardening:
npx tsx scripts/test-phase14-regressions.ts
npm run test:live:production-hardening
npx tsx scripts/test-production-hardening.ts --deliberate-500-only
```

The backend runner executes `test/<suite>/run.ts` with each suite's ts-node project and the in-memory no-evidence preload. Full suites are `platform-identity`, `farmers-market`, `catalog-publication`, `inventory-capacity`, `marketplace-commerce` and `paid-attribution-refund`. `customer-relationships` uses `--workers-only`; `payments-stripe`, `pos-integrations`, `communications` and `billing-entitlements` use `--focused`; `analytics` uses `--rebuild-only`. These are the exact scopes qualified above. The frontend runner executes the seven existing permanent browser command categories sequentially with evidence disabled.

Run the migration only against a deliberately selected local database using the existing guarded migration workflow. This task did not migrate the database named vendure. Existing manager roles need deliberate new grants. No deployment or remote Git command follows this work.

## Acceptance matrix

PASS below means the stated implementation and listed qualification scope passed. It does not imply every possible optional provider, browser or load mode was tested.

### Repository and safety

| Code | Requirement                                       | Result | Qualification                                              |
| ---- | ------------------------------------------------- | ------ | ---------------------------------------------------------- |
| A1   | Pre-existing backend work preserved               | PASS   | Initial status captured; additive edits, unchanged HEAD    |
| A2   | Pre-existing frontend work preserved              | PASS   | Initial status captured; no reset, clean, stash or discard |
| A3   | Protected vendure database untouched              | PASS   | Guarded loopback disposable test targets only              |
| A4   | Historical migrations untouched                   | PASS   | One new migration; historical migration files not edited   |
| A5   | Authorized new migrations only                    | PASS   | 1791400000000-MarketOperationsPhase14.ts                   |
| A6   | FRONTEND_NO_EVIDENCE first                        | PASS   | Set before every frontend generation, build and test       |
| A7   | Historical evidence untouched                     | PASS   | Console-only runs and in-memory legacy reporters           |
| A8   | Exactly one Phase 14 report                       | PASS   | This file; no backend report                               |
| A9   | No evidence folder, screenshots, videos or traces | PASS   | Playwright media off; report writers suppressed            |
| A10  | No remote Git                                     | PASS   | Local status and HEAD reads only                           |
| A11  | No deployment                                     | PASS   | Local files, servers and builds only                       |

### Applications

| Code | Requirement                            | Result | Qualification                                                                  |
| ---- | -------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| B1   | Market-scoped templates                | PASS   | Backend template persistence and tenant attacks                                |
| B2   | Draft, published and retired lifecycle | PASS   | Backend private-link/retirement and browser publication                        |
| B3   | Immutable historical template versions | PASS   | Backend v1/v2 and published-edit rejection                                     |
| B4   | Safe customization of system fields    | PASS   | Typed identity invariant; browser label/help edit                              |
| B5   | Custom sections                        | PASS   | Backend sections; builder controls                                             |
| B6   | Custom question types                  | PASS   | All 12 types; semantic field rendering component tests                         |
| B7   | Reorder                                | PASS   | Drag controls and keyboard controls; v2 reorder persistence                    |
| B8   | Preview                                | PASS   | Real browser preview and axe                                                   |
| B9   | Public application                     | PASS   | Real anonymous browser submission                                              |
| B10  | Private direct-link application        | PASS   | Opaque URL, advertised lookup exclusion and retirement denial                  |
| B11  | External applicant                     | PASS   | Anonymous business/contact snapshot                                            |
| B12  | No fake platform Vendor                | PASS   | Canonical Vendor count unchanged on submission                                 |
| B13  | Requested dates                        | PASS   | Bounded future own occurrences; browser multiple dates                         |
| B14  | Partial date acceptance                | PASS   | Backend subset; browser deselects a requested date                             |
| B15  | Review lifecycle                       | PASS   | Submitted, under review, needs info, waitlisted, accepted, declined, withdrawn |
| B16  | Deliberate existing-Vendor link        | PASS   | Confirmation required; canonical participation tested                          |
| B17  | Market Vendor Directory                | PASS   | External creation, manual entry and later linking                              |
| B18  | Historical submissions preserved       | PASS   | Immutable definitions, answers, contact and rental snapshots                   |
| B19  | No application-time charge             | PASS   | No invoice, payment or rental allocation on submit                             |

### Rentals

| Code | Requirement                      | Result | Qualification                                                            |
| ---- | -------------------------------- | ------ | ------------------------------------------------------------------------ |
| C1   | Configurable rental catalog      | PASS   | Names, enablement, amounts, quantities, amenities, capacity and ordering |
| C2   | Exact minor-unit pricing         | PASS   | Integer bounds; fractional money rejected                                |
| C3   | Application rental requests      | PASS   | Two tables and one electric hookup                                       |
| C4   | Requests do not reserve capacity | PASS   | Allocation count stays zero at submission                                |
| C5   | Occurrence accepted allocation   | PASS   | Allocation created only with accepted assignment                         |
| C6   | Finite capacity protected        | PASS   | Two different free booths compete for finite resource                    |
| C7   | Rental price snapshot            | PASS   | Submitted 1000 survives catalog change to 1200                           |
| C8   | Electricity compatibility        | PASS   | Physical amenity conflict rejected                                       |
| C9   | Manager quantity override        | PASS   | Review and assignment controls use accepted quantities                   |
| C10  | Rental invoice lines             | PASS   | Exact 4000 + 2000 + 500 = 6500                                           |

### Layout designer

| Code | Requirement                     | Result | Qualification                                                  |
| ---- | ------------------------------- | ------ | -------------------------------------------------------------- |
| D1   | Reusable layouts                | PASS   | Named templates and occurrence plans                           |
| D2   | Immutable layout versions       | PASS   | Published edit rejected; clone to v2                           |
| D3   | Multiple areas                  | PASS   | Browser creates second area and switches canvas                |
| D4   | Permissive primitive justified  | PASS   | Native SVG plus installed React 19.3.0; decision below         |
| D5   | No tldraw commercial dependency | PASS   | No tldraw or full floor-plan runtime                           |
| D6   | Pan and zoom                    | PASS   | Shared viewBox gestures, zoom and fit controls                 |
| D7   | Drag and resize                 | PASS   | Real pointer movement and resize assertions                    |
| D8   | Rotation                        | PASS   | Browser inspector sets rotation                                |
| D9   | Snap and grid                   | PASS   | Logical pixels-per-foot snap and grid controls                 |
| D10  | Undo and redo                   | PASS   | Reducer tests and browser undo/redo                            |
| D11  | Copy, paste and duplicate       | PASS   | Real browser and local domain cloning                          |
| D12  | Z-order                         | PASS   | Persisted zIndex, sorted shared renderer, inspector            |
| D13  | Rectangle                       | PASS   | Browser creation; shared primitive                             |
| D14  | Circle                          | PASS   | Browser creation; shared primitive                             |
| D15  | Triangle                        | PASS   | Browser creation; shared primitive                             |
| D16  | Line                            | PASS   | Browser creation; shared primitive                             |
| D17  | Text                            | PASS   | Browser creation; shared text primitive                        |
| D18  | Image and logo                  | PASS   | URL inspector and bounded safe image primitive                 |
| D19  | First-class MarketSpace         | PASS   | Separate relational entity linked to layout element            |
| D20  | Physical dimensions             | PASS   | Resize updates feet using pixelsPerFoot; exact inspector entry |
| D21  | Amenities                       | PASS   | Typed amenities; browser electricity toggle                    |
| D22  | Booth inspector                 | PASS   | DOM form with geometry and operational fields                  |
| D23  | Default fee                     | PASS   | Exact minor-unit inspector; draft invoice snapshot             |
| D24  | Preferred Vendor                | PASS   | Browser preference selector; map/list suggestions only         |
| D25  | Private manager notes           | PASS   | Excluded from public allowlist projection                      |
| D26  | Geometry reload                 | PASS   | Backend exact persisted geometry; browser save/publish/reload  |

### Assignments and public map

| Code | Requirement                    | Result | Qualification                                                                 |
| ---- | ------------------------------ | ------ | ----------------------------------------------------------------------------- |
| E1   | Occurrence-specific assignment | PASS   | Own approval plus plan and space required                                     |
| E2   | Double-book constraint         | PASS   | Unique occurrence/space and locked competing requests                         |
| E3   | Accept and assign              | PASS   | Real browser acceptance and assignment command                                |
| E4   | Hard compatibility validation  | PASS   | Size, electricity, vehicle, food truck and capacity checks                    |
| E5   | Preferred Vendor suggestion    | PASS   | Map selects suggested business; explicit confirmation required                |
| E6   | Copy previous occurrence       | PASS   | Conflict proposals; no allocation until confirmation                          |
| E7   | Draft and unpublished          | PASS   | Public query denied before publication                                        |
| E8   | Published state                | PASS   | Explicit stored public snapshot                                               |
| E9   | Shared renderer                | PASS   | MarketMap used by editor, operations, Vendor and public pages                 |
| E10  | Public map                     | PASS   | Anonymous browser loads published occurrence                                  |
| E11  | Vendor search                  | PASS   | Browser searches and selects Orchard                                          |
| E12  | Public privacy                 | PASS   | Backend negative assertions for private keys; no operational browser controls |
| E13  | Vendor own assignment map      | PASS   | Real Vendor session and own-only backend projection                           |
| E14  | Historical layout stability    | PASS   | Occurrence A retains v1 while B uses v2                                       |
| E15  | Semantic DOM alternative       | PASS   | Labeled list, search, buttons and inspector; representative axe               |

### Billing

| Code | Requirement                          | Result | Qualification                                                     |
| ---- | ------------------------------------ | ------ | ----------------------------------------------------------------- |
| F1   | Separate Market billing domain       | PASS   | MarketInvoice and MarketPayment                                   |
| F2   | No Customer Order misuse             | PASS   | No Product, cart, Order or VendorFinancialAllocation creation     |
| F3   | Draft after accepted assignment only | PASS   | Submission/acceptance alone do not issue or charge                |
| F4   | Booth invoice line                   | PASS   | Booth description/fee snapshot                                    |
| F5   | Rental invoice lines                 | PASS   | Accepted quantities and price snapshots                           |
| F6   | Exact totals                         | PASS   | 6500 fixture and currency mismatch rejection                      |
| F7   | Draft recalculation                  | PASS   | Manager removes rentals; draft becomes 4000                       |
| F8   | Issued invoice immutable             | PASS   | Explicit KEEP move; database total mutation rejected              |
| F9   | Deliberate void and reissue          | PASS   | Unpaid manual OPEN invoice becomes VOID; linked replacement draft |
| F10  | Manual payments                      | PASS   | Cash, check, external, complimentary, waived and other            |
| F11  | Audit history                        | PASS   | Actor and append-only payment/audit records                       |
| F12  | Provider-neutral boundary            | PASS   | createAndSendInvoice, refreshInvoice and voidInvoice interface    |
| F13  | Production provider NOT_CONFIGURED   | PASS   | Online sends rejected; browser send disabled                      |
| F14  | No invented platform fee             | PASS   | FundsFlowPolicy NOT_CONFIGURED                                    |
| F15  | Authoritative map billing projection | PASS   | Invoice-derived status, past due and complimentary projection     |
| F16  | Occurrence billing summary           | PASS   | Separate currencies, expected, collected, waived and outstanding  |

### Market Day

| Code | Requirement                    | Result | Qualification                                                        |
| ---- | ------------------------------ | ------ | -------------------------------------------------------------------- |
| G1   | Occurrence-centric route       | PASS   | /market/day/:occurrenceId                                            |
| G2   | Mobile and tablet usability    | PASS   | 390/768/1280 browser overflow and axe checks                         |
| G3   | Expected and assigned counts   | PASS   | Approval-based readiness summary                                     |
| G4   | Check-in                       | PASS   | Independent checked-in state; browser persistence                    |
| G5   | Attendance statuses            | PASS   | Five final attendance states; no-show browser update                 |
| G6   | Private operational overlays   | PASS   | Arrival, attendance, billing, rental count and note indicator        |
| G7   | Booth move                     | PASS   | Real map-based day move; compatibility and explicit KEEP             |
| G8   | Rental visibility              | PASS   | Accepted per-occurrence rentals and summary quantities               |
| G9   | Billing visibility             | PASS   | Own occurrence invoices and billing summary                          |
| G10  | Manual payment                 | PASS   | Real browser issues and settles a manual invoice                     |
| G11  | Manager notes                  | PASS   | Private occurrence note persists after reload                        |
| G12  | Closeout summary               | PASS   | Missing attendance, unpaid invoices, unassigned businesses and notes |
| G13  | No Vendor sales reconciliation | PASS   | Static assertion and runtime route inspection                        |

### Security and isolation

| Code | Requirement                              | Result | Qualification                                                               |
| ---- | ---------------------------------------- | ------ | --------------------------------------------------------------------------- |
| H1   | Purpose-specific permissions             | PASS   | Nine exact new permissions                                                  |
| H2   | Fresh authority                          | PASS   | Current Administrator, Market, membership and grant on every request        |
| H3   | Application isolation                    | PASS   | Market A/B targeted mutation and read denial                                |
| H4   | Layout isolation                         | PASS   | Foreign layout edit/read denied                                             |
| H5   | Assignment isolation                     | PASS   | Foreign occurrence/space/directory denied                                   |
| H6   | Billing isolation                        | PASS   | Foreign invoice issue/read denied; Vendor cannot read manager billing       |
| H7   | Market Day isolation                     | PASS   | Foreign approval/day action denied                                          |
| H8   | Public inputs do not establish authority | PASS   | Market derived from resolved Shop context; BFF rejects extra authority keys |
| H9   | Applicant bounds                         | PASS   | Invalid email, oversized text and foreign date denied                       |
| H10  | Submission rate limiting                 | PASS   | Ten successful submissions per Market/source/hour; retry-safe               |
| H11  | Same-session revocation                  | PASS   | Next read and mutation denied without login renewal                         |
| H12  | Safe errors                              | PASS   | Domain sentinels and generic unavailable; no stack/provider body forwarded  |

### Concurrency and history

| Code | Requirement                   | Result | Qualification                                                             |
| ---- | ----------------------------- | ------ | ------------------------------------------------------------------------- |
| I1   | Application acceptance race   | PASS   | Exactly one acceptance and one directory entry                            |
| I2   | Booth assignment race         | PASS   | Exactly one competing booth assignment                                    |
| I3   | Rental allocation race        | PASS   | Allowed finite quantity only; different free booths                       |
| I4   | Invoice issuance idempotent   | PASS   | Concurrent issue returns same invoice                                     |
| I5   | Manual payment duplicate safe | PASS   | One payment, one settlement, hashed retry conflict                        |
| I6   | Old submissions immutable     | PASS   | Snapshot fields guarded in database and service                           |
| I7   | Old maps immutable            | PASS   | Pinned layout version plus published occurrence snapshot                  |
| I8   | Issued billing immutable      | PASS   | Issued lines, recipient, money and identity guarded; payments append-only |

### Full-stack, regressions and builds

| Code | Requirement                                                           | Result | Qualification                                                                    |
| ---- | --------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| J1   | Dedicated real application/rental/layout/assignment/billing/day flows | PASS   | 21 backend + 14 browser scenarios                                                |
| J2   | Backend permanent regressions                                         | PASS   | Twelve categories in recorded scopes; CRM 59 direct checks and independent build |
| J3   | Frontend permanent regressions                                        | PASS   | 73 cases/flows across seven command categories, after Market rerun               |
| J4   | Relevant production hardening                                         | PASS   | 26 gates; optional Firefox/WebKit engines INCONCLUSIVE                           |
| J5   | Extraction, generation, typecheck, lint and unit tests                | PASS   | Commands and totals above                                                        |
| J6   | Backend, Admin, Storefront/root builds and artifact markers           | PASS   | Synthetic production build; 75 artifact files                                    |
| J7   | Accessibility and responsive qualification                            | PASS   | Representative axe and 390/768/1280 Market Day                                   |

## Stripe handoff

The later Stripe phase still requires Market Connect onboarding/configuration, Market payment-account readiness, real Stripe invoice creation, Hosted Invoice Page, application_fee_amount policy, on_behalf_of/connected-account invoice context, Stripe Customer ownership, processing-fee responsibility, refund/dispute policy, invoice webhook signature verification, invoice paid/void/refund reconciliation, provider idempotency and real TEST invoice payment qualification. None was executed.

- CHECKOUT-B1 = OPEN
- FundsFlowPolicy = NOT_CONFIGURED
- Real Stripe Connect = NOT_EXECUTED
- Real Stripe Billing = NOT_EXECUTED
- Real shopper Stripe confirmation = NOT_EXECUTED

No deployment, hosting configuration or remote Git operation was performed.
