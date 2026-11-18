# Market Day Mode Phase A architecture audit

Audit date: November 12, 2026. Scope: the current local web working tree and associated local API repository. This is a focused source and documentation review, not a runtime, database, permission penetration, or data-quality audit. No application changes, migrations, tests, browser automation, or operational data changes were made. Paths are relative to the repository named. **Confirmed** means observed in source or project documentation; **proposed** means a recommendation; **unknown** means not established in this review.

## 1. Executive summary

**Confirmed:** The existing occurrence model already connects scheduling, participation, attendance, manager assignments and published maps, vendor packing, orders and pickup, POS, billing, rentals, customer accounts, and scoped finance and analytics. `/market/day/:occurrenceId` and `/vendor/day` exist, but are not yet the proposed three-view workspaces. Vendor-owned private locations use occurrences and participation without a manager or booth.

**Missing:** occurrence-specific custom tasks and a readiness-sharing contract; independent vendor and manager completion; assistance and incident records; equipment handoff and returns; storefront mode activation; an authenticated customer pickup projection with authoritative map location; and synchronized cross-interface updates. Related data already exists and should remain owned by existing services.

**Critical findings:** existing `CLOSE_DAY` sets `operationsComplete` and affects assignment and scheduling behavior; it is not automatically a safe completion action. Published maps are snapshots, and the reviewed assignment path does not visibly republish them. Pickup promises expose descriptive venue, instructions and time, but no confirmed stable fulfillment-to-map-element reference. Manager analytics currently allow counts rather than vendor monetary sales. Anonymous POS, missing occurrence attribution, refunds and incomplete costs prevent universal sales, customer and profit claims.

**Recommendation:** extend existing routes and domain services, make phases freely selectable views, and store only new occurrence-specific facts. Keep commerce and payment operations independently authorized. Start with scoped polling and authoritative rereads. Phase B can begin after the readiness and sharing choices in section 9 are agreed; later phases require additional decisions.

## 2. Existing architecture and relevant file paths

**Web** means `farmers-market-platform-web`; **API** means `farmers-market-platform`.

| Area | Confirmed architecture and entry points |
| --- | --- |
| Occurrences | API `src/plugins/farmers-market/entities/market.entities.ts` defines `MarketOccurrence` with start/end, timezone, version and `scheduled`/`cancelled` status, `MarketVendorMembership`, and `OccurrenceParticipation` with `planned`, `confirmed` and `cancelled` statuses. `services/occurrence.service.ts`, `occurrence-generation.service.ts` and `participation.service.ts` own relevant scheduling and participation. Web `apps/admin/src/market/occurrences.tsx`, `OccurrenceDetail.tsx` and `vendor/MarketOccurrence.tsx`, `UpcomingMarketDates.tsx` consume these facts. |
| Private markets | Web `docs/VENDOR_MANAGED_MARKETS.md` describes implemented vendor-owned locations (`Market.ownerVendorId`), owner-only participation and scheduling, without manager accounts, a public market website or booths. It says rescheduling preserves occurrence ID and order association. This review did not rerun its verification. |
| Manager day | Web `apps/admin/src/market/phase14/OperationsRoutes.tsx` routes `day` to `DAY` and selects an occurrence. `Assignments.tsx` shares assignment/map and closeout compositions, and `Attendance.tsx` handles attendance. `market/operations.tsx`, `ReadinessChecklist.tsx`, `operations-data.ts` and API `src/plugins/platform-notifications/inbox-operations-api.ts` expose `ownMarketDayChecklist`, a generated status/action summary, not a persisted custom checklist. |
| Attendance | API `src/plugins/market-operations/attendance.entities.ts`, `attendance.service.ts`, `attendance.api.ts`; web `packages/api/src/attendance.ts`, `market/phase14/Attendance.tsx`, `vendor/VendorRoutes.tsx`. `ownMarketAttendance`, `ownVendorAttendance`, `vendorSelfCheckIn` and `marketAttendanceCommand` provide scoped reads, check-in, manager updates, finalization and corrections with revisions. Vendor `/vendor/day` currently shows attendance history and optional packing status. Self-check-in is restricted to the scheduled start-inclusive/end-exclusive interval and other eligibility checks. |
| Packing and pickup | API `src/plugins/market-operations/packing.entity.ts`, `packing.service.ts`, `packing.api.ts`; web `packages/api/src/packing.ts`, `vendor/packing.tsx`, `vendor/pickup.tsx`, `pickup-data.ts`, `orders.tsx`, `order-operations.tsx`. `ownPackingOccurrences`, `ownMarketPacking`, `updateOwnMarketPacking` use vendor/occurrence data, revision and source version, with planning, packing, line/customer completion and reopening commands. Packing progress is self-reported even when based on verified preorder quantities. API `src/plugins/marketplace-commerce/commerce/topology.api.ts` exposes scoped portion, line and pickup statuses. |
| POS and finance | Web `apps/admin/src/vendor/pos.tsx`, `finance/Finances.tsx`, `vendor/BoothInvoicePayment.tsx`; API `src/plugins/marketplace-commerce/in-person/service.ts`, `financial/*`, `src/plugins/financial-reporting/{api,service}.ts`. POS supports an occurrence context, which may be absent. Canonical financial attribution records purchase/vendor/line allocations and refunds. Finance supports market/occurrence filtering subject to permissions and source completeness. |
| Maps and billing | API `src/plugins/market-operations/{entities,service,api}.ts` defines versioned `MarketLayoutVersion`, `MarketSpace`, `MarketPhysicalBooth`, `MarketOccurrencePlan`, assignments, `MarketRentalOption`, `MarketRentalAllocation`, `MarketInvoice`, `MarketPayment`, adjustments and refunds. `ownMarketOperations` and `marketOperationsCommand` include `ASSIGN`, `PUBLISH_MAP`, `RECORD_PAYMENT`, `DAY_UPDATE`, `CLOSE_DAY` and invoice commands. Web `market/phase14/{Layouts,Assignments,Attendance,Billing,Rentals,RentalWizard}.tsx`, `BoothSchedule.tsx`, vendor `booths.tsx`, and `packages/api/src/market-operations.ts` are integration points. |
| Customer site | Web `apps/storefront/src/middleware.ts`, `pages/index.astro`, `layouts/SiteLayout.astro`, `components/MarketPublicHome.astro`, and `lib/market-website.ts` select tenant and themed content. `MarketVendorCards.astro` and market shop readers supply directory facts. `pages/account/orders/index.astro`, `CustomerOrderDetails.astro`, `lib/customer-dashboard.ts`, and API `customer-account/{api,service}.ts` supply authenticated purchases. Shop API `publicMarketOccurrenceMap` has a web client in `packages/api/src/market-operations.ts`; `packages/ui/src/MarketMap.tsx` and `map/MapCanvas.tsx` are candidate renderers. |
| Reporting and events | API `src/plugins/analytics/{api,source.service,projection.service,types}.ts` contains occurrence-dimensioned projections and role-specific metric allowlists. `src/plugins/platform-notifications/{events,inbox-operations,inbox-projector}.ts` supplies platform event/inbox infrastructure, not evidence of a browser live subscription. |

## 3. Reusable functionality

- Keep occurrence ID, time, timezone, version, membership and participation authoritative. Attendance records physical presence; confirmed participation is not check-in. Preserve existing reschedule and cancellation rules.
- Extend manager `Phase14Routes` and its `DAY` read, `Assignments` map, `Attendance`, billing and rental controllers. Rental allocations establish allocated equipment, not proof of handoff or return. Reuse existing payment and correction commands with their permissions and revision checks.
- Extend vendor `/vendor/day` and existing occurrence navigation. Reuse packing, self-check-in, `VendorPickup`, orders, POS, booth invoice and vendor assignment readers. Deep links do not themselves establish authority.
- Reuse `publicMarketOccurrenceMap(occurrenceId)`, the published definition and element IDs, existing vendor directory and customer session/purchase projections. Assess `MarketMap`/`MapCanvas` for a safe storefront adapter; never import admin controllers. Preserve Astro SSR, theme and editor boundaries, with small interactive islands where needed.
- Follow web `COMPONENT_USAGE_GUIDE.md` and `UI_COMPONENTS.md`: reuse approved workspace shell, tabs, buttons, fields, dialogs, tables and renderer adapters. Reuse specialist packing, map and payments interactions. Document any new feature composition and do not create a competing primitive or alter business authority.
- Reuse `ownVendorOccurrenceAnalytics`, `ownMarketOccurrenceAnalytics`, scoped financial reports and canonical allocations where their contracts support the requested metric. Attendance, invoice/payment and rentals remain their respective domains.

## 4. Missing functionality and data

| Need | Findings and limitations |
| --- | --- |
| Preparation | Manager checklist is derived and packing has occurrence-specific progress. No general reusable supplies template, custom occurrence tasks, explicit vendor readiness declaration, or manager visibility contract was established. Completion of self-reported items is not verified overall readiness. |
| Day views | Existing screens and specialist routes are useful building blocks, but the requested Setup, Market and Closing compositions are incomplete. Existing attendance windows and finalization rules are independent of navigation. |
| Equipment and issues | Rental options, allocations and snapshots exist. A reviewed source of equipment handoff/return confirmation or market-day assistance/incident records was not established. Inbox and events are delivery infrastructure, not request records. |
| Completion | `CLOSE_DAY` sets `operationsComplete` after an occurrence starts. The service closes some booth scheduling decisions and the assignment UI disables actions when it is set. Attendance finalization is separate. Vendor participation completion was not confirmed. A new recap finish should be independent until these semantics are intentionally reconciled. |
| Storefront | An occurrence-scoped enabled/scheduled/override mode and alternate experience were not established. Existing theme, page customization and normal market storefront remain reusable. |
| Maps and pickup | `projectMap` constructs the allowlisted `publicSnapshot` from a plan's layout and assignments. `publicMarketOccurrenceMap` returns a published plan in the current public market context. `PUBLISH_MAP` and published layout editing rebuild the snapshot; the reviewed assignment command does not visibly do so. `pickupPromise` currently exposes mode, venue, instructions and times; `order-context.service.ts` uses `VENDOR_BOOTH_PICKUP`. A stable actual fulfillment map element was not confirmed. A booth assignment alone is not proof of pickup location. |
| Live updates | Attendance history polls every 30 seconds and visible billing every 5 seconds. Booth changes publish a platform notification event; that outbox/inbox is not a confirmed client push or complete change stream. No relevant browser subscription or WebSocket was found in the inspected paths. |
| Recaps | No ready-made recap, comparable-occurrence rule, new/returning classification or operational incident aggregate was established. Analytics may lag, and manager metric allowlists constrain disclosure. Show unavailable where attribution or access is incomplete. |

### Metrics available and limitations

- **Vendor sales and orders:** paid canonical allocations and contexts can support currency-separated figures for captured purchases reliably attributed to an occurrence. Distinguish gross, refunds, net, capture and pickup times. POS can lack an occurrence and customers can be anonymous. `analytics/source.service.ts` explicitly treats external POS observed unit movements as observations, not provider revenue. State coverage, freshness and exclusions; count customer purchases and vendor portions distinctly.
- **Products:** line allocations and quantities can support rankings for attributed platform sales, subject to occurrence coverage, cancellations, returns and a defined units-versus-revenue basis. Avoid duplicate parent/child orders. Complete external POS product sales are not established.
- **Customers:** some analytics expose distinct identified purchasers. New/returning needs a defined vendor-relative identity, history and treatment of guests, anonymous POS, identity merges and repeat purchases. Do not classify unknowns as new or claim complete counts without coverage.
- **Manager metrics:** attendance can count checked-in vendors, participation can count confirmations, and invoice/payment/refund records can support scoped fee collection and balances by currency and effective time. Label external businesses, attendance finalization, cash recorded and settled funds appropriately. The existing market analytics allowlist exposes counts rather than vendor monetary sales; require explicit permission and policy before broadening it.
- **Profit:** costs and expenses exist, but complete occurrence attribution, labor and other costs are not established. Revenue, fees and cash collected are not profit. Do not present profit until completeness and allocation rules are verified.
- **Comparison:** propose the preceding non-cancelled comparable occurrence of the same market ordered by actual scheduled start, with an explicit selection/override when needed and private locations scoped to their owner. Show no comparison when absent or incomparable. Align currency, coverage, reporting cutoff and definitions; distinguish a finish-time snapshot from later corrections.

## 5. Recommended architecture and lifecycle behavior

### Preparation

**Proposed:** compose occurrence preparation reads from existing sources. Store vendor/occurrence task instances separately from verified systems, with optional vendor-owned reusable templates copied into an occurrence on explicit use. Distinguish task kind, phase, responsible workspace, completion actor/time and revision. Manager-owned tasks are market-scoped; managers see vendor details only under an explicit sharing policy. An explicit vendor readiness declaration is self-reported and timestamped separately from system facts such as invoice balance, attendance confirmation, booth assignment and packing progress. Unknown, unavailable, not applicable and stale are distinct from complete. Do not duplicate calculated invoice, attendance or order truth.

Private occurrences show applicable vendor preparation, their own tasks, packing, orders and location information, without fabricated booths, manager approvals, invoices, equipment or assistance recipients. Check occurrence ID, workspace ownership and existing permissions server-side on every operation.

### Day views and completion

Keep `/market/day/:id` and `/vendor/day` compatible and add an occurrence-specific vendor entry if needed. Setup, Market and Closing are navigational tabs, accessible in any order at any time. Selection does not mutate occurrence status, attendance, commerce permissions or provider state. Existing order, POS, billing, correction and refund routes remain reachable.

Record vendor finish per occurrence/vendor and manager finish per occurrence independently, with actor/time and audit history. Neither implies the other, attendance finalization or the legacy `CLOSE_DAY` flag. Allow a controlled correction/reopen if needed. Recaps should read authorized current sources, identify generation time and permit later adjustments. Finishing must not lock order fulfillment, POS, refunds, payment adjustments, invoice corrections or other authorized operations. Trace every `CLOSE_DAY` consumer and explicitly decide whether to retain, decouple or refactor its scheduling closeout before attaching a new finish control. Attendance finalization and corrections remain separate.

**After scheduled end:** time passing does not manually finish the market or block ordinary authorized operations. Countdown reaches zero and says scheduled time ended; it does not go negative or declare completion. Existing self-check-in closes at `endsAt`; manager corrections follow their existing rules. Automatic customer mode may end at the scheduled boundary, with a bounded authorized extension; staff can still operate and finish manually.

### Storefront activation and occurrence selection

**Proposed:** manager enables mode for each occurrence, default off. Server time determines automatic visibility during a defined interval, initially `[startsAt, endsAt)` unless a different offset is agreed. Separate audited `force on` and `force off` overrides are occurrence-scoped and expire explicitly; ownership and permission checks apply. Force-on expiry can extend past `endsAt` without changing the schedule or marking completion. Cancellation suppresses automatic mode; default to disallowing force-on for cancelled dates pending a product decision. Finishing ends automatic presentation, while an authorized bounded override may support recovery if approved. API returns effective state, reason, occurrence ID, authoritative `endsAt`, server time, expiry and version. Client calculates the countdown using server-time offset and resynchronizes; timers are presentation only.

Use occurrence-explicit URLs and preserve an obvious regular-storefront link or opt-out. At the market homepage select the sole active occurrence or offer a chooser if active occurrences overlap; never blend maps or orders. Validate selected occurrence against the current market. When rescheduled, retain occurrence ID, tasks and orders, refresh version and recalculate activation. Cancelled or unavailable mode data falls safely back to the regular site. Handle history, direct links, editor preview, timezones/DST and absent published maps without overwriting theme customization.

### Map and pickup resolution

Render the occurrence's published snapshot, not a draft or separately authored map. Extend its existing presentation contract for accessible highlighting and textual alternatives. Establish a canonical fulfillment-location reference at the commerce portion/order level, with stable identity resolvable against the **published** layout element for the same occurrence and version. Join customer order data only after customer ownership and tenant checks. A location may be a booth, shared pickup point, off-map venue or unknown. Never infer a booth as pickup unless the authoritative fulfillment record explicitly establishes that location. Missing elements, versions or maps produce instructions and an honest unavailable marker rather than guessed coordinates. Decide whether order promises are immutable snapshots, corrected through an audited operational override, or both; preserve customer-visible promises and notify on material changes.

Published assignment freshness needs an explicit policy: either re-project the allowlisted snapshot transactionally for relevant assignment changes, or require manager republishing and label version/time. Immediate updates require the former only if compatible with existing publication intent, billing and privacy. Public projections must exclude private assignments, invoices and other customers' orders.

### Live operations

Start with bounded, visibility-aware polling of role-scoped authoritative reads, modeled on existing attendance/billing polling. Refresh after local mutations, on focus/reconnect and schedule changes; prevent overlapping requests, back off on errors, stop while hidden, display last successful update/staleness and offer manual refresh. On recovery reread a full snapshot; never depend on missed deltas or browser time for authorization. Reject stale commands with revisions and reread conflicts. Do not queue financial, fulfillment or attendance mutations offline; retry only with existing idempotency semantics. Keep critical workflows usable when live state is stale.

`MarketOperationsService` owns assignments, map publication, fees and rental facts; `MarketAttendanceService` owns attendance; commerce topology/fulfillment services own pickup status and location; a small occurrence operations service may own new tasks, completion and requests; occurrence scheduling owns times. Existing notifications/outbox can deliver durable alerts after a change but are not cross-client data authority. If measured polling is insufficient, evaluate existing infrastructure first. A later stream should transmit minimal invalidation IDs, authorize connections and tenants, reread after reconnect and retain polling fallback. Never put customer orders on a public event channel.

## 6. Data model/API changes anticipated

These are candidates for later work, not approved schema or migration details. Add only what a phase requires and enforce ownership on the backend.

| Candidate | Purpose and boundary |
| --- | --- |
| Checklist templates and occurrence tasks | Vendor- or manager-owned templates and copied occurrence-specific task instances, phase, label, ordering, completion actor/time, owner, optional visibility and revision. A private date uses vendor ownership. Do not duplicate packing, invoice or attendance facts. |
| Vendor readiness | Optional occurrence/vendor self-report with actor/time and revision; derive system facts separately. Decide manager visibility and whether material changes invalidate it or mark it stale. |
| Completion | Separate vendor/occurrence and manager/occurrence records or fields with actor, time, corrections and revision. Do not repurpose attendance finalization or `operationsComplete` without resolving compatibility. |
| Assistance/incident | Small occurrence-scoped record with market/vendor, bounded text/category, open/resolved timestamps, actor and revision; extend to manager-created issues only if needed. Existing inbox may notify. Define tenancy, privacy, limits and retention. |
| Equipment handoff | Per-allocation issued/returned quantities, actor/time and corrections if required; retain `MarketRentalAllocation` as allocation authority. Verify existing records before adding fields. |
| Mode configuration | Occurrence enabled flag, optional automatic window policy and audited bounded override/expiry; derive effective state from authoritative schedule and server time. Do not duplicate scheduled end. |
| Fulfillment location | Stable occurrence-scoped location/element association or audited override owned by commerce, independent of vendor booth and supporting shared/off-map/unknown cases and version changes. Historical promise semantics need design. |
| Reads and commands | Narrow scoped preparation/day projections and task/readiness/completion/request mutations with revisions, idempotency and server ownership checks. Customer Shop read returns only the authenticated customer's occurrence portions and resolved public markers. Public read contains only schedule and published map facts. Existing operational commands remain authoritative. |
| Recap projection | Reuse scoped finance, analytics and attendance, adding narrow occurrence aggregation only where necessary. Expose currency, basis, coverage, freshness and unknowns. Immutable finish totals must not be the sole truth when refunds or adjustments occur. |

## 7. Authorization and reliability considerations

- Derive market/vendor identity from authenticated workspace and verified relationships, not route IDs. Check current permission and occurrence ownership for every operation. `OperateOwnMarketDay` does not grant billing, POS, customer identity, orders or sales permissions.
- Customers see only their own authenticated relevant portions. Guest access needs an existing approved proof/claim flow, not an order ID or public map. Use existing session/BFF patterns, no-store private responses, CSRF protections and safe errors. Public map and directory remain explicitly allowlisted and market-scoped.
- Manager assistance should expose only minimum vendor-provided issue details; task text and finance require explicit sharing. Avoid customer data in events/notifications. External businesses and private owner-only dates need explicit handling, not synthetic user identities.
- Preserve revision checks, transactional publication, idempotency, audited corrections and authorized after-market refunds and adjustments. Missing or stale data is not zero; show its age, preserve safe navigation and never fabricate mutation success.
- Key facts by occurrence identity across overlaps, rescheduling and cancellation. Resolve activation using server time, not visitor local date. Offer a chooser where multiple occurrences are eligible.
- Animation is presentation only, with reduced-motion support, keyboard access and nonanimated equivalent. Existing notifications are asynchronous and cannot prove current operational state.

## 8. Phase B–F implementation roadmap

Each phase is proposed work, not authorization to implement it. Verification describes future focused checks; none were run for this audit. Manual testing should use existing accounts and the persistent `vendure_demo_market_ops` environment through the web directory's `demo:market-operations:serve`, `:worker`, `:admin` and `:storefront` scripts. Do not reset or reseed that database.

### Phase B: Market Preparation

- **Reuse:** occurrence/participation, manager derived checklist, packing, vendor assignments/invoices, rentals, shared workspace components and private scheduling authorization.
- **Changes:** add narrow task instances and optional templates/readiness declaration; compose vendor and manager preparation reads from existing sources; distinguish system facts, self-reports, unavailable and not-applicable. Add occurrence-specific preparation links without replacing existing workflows.
- **Dependencies:** agree readiness definitions, manager visibility, template-copy semantics and private-market applicability. Customer mode and push infrastructure are not prerequisites.
- **Risks:** disclosure of vendor notes or finance, stale packing after orders change, duplicate tasks and confusing confirmation with check-in.
- **Verify:** focused domain/API checks for ownership, stale writes, private dates, template copying, derivation and unavailable facts, plus component and accessibility checks.
- **Manual:** select an upcoming manager market and participating vendor, add/check tasks, compare packing and invoice facts with existing pages, refresh and switch accounts, then inspect a private vendor date. Confirm tasks do not change payments, attendance or orders.

### Phase C: Administrative Market Day

- **Reuse:** `/market/day/:id`, `/vendor/day`, `DAY` reads, attendance, assignment/map, billing, rentals, packing, pickup, POS, shared shell and tabs.
- **Changes:** compose free Setup, Market and Closing views with occurrence links and permission-aware partial states. Add minimal equipment verification only once its meaning and ownership are agreed. Preserve specialist routes and existing closeout separately.
- **Dependencies:** B's task model for custom setup/teardown tasks; existing role and source contracts.
- **Risks:** treating tab selection as lifecycle, silently invoking `CLOSE_DAY` or finalizing attendance, hiding POS/pickup and exposing manager-only data.
- **Verify:** role and occurrence isolation, direct routes, keyboard navigation, re-entry and arbitrary tab order; verify checkout, fulfillment, billing and attendance retain existing authorization and behavior.
- **Manual:** switch tabs as vendor and manager before and after scheduled end, open existing POS, pickup, attendance and invoice pages, and verify access does not depend on the other user's tab.

### Phase D: Live Operations and Recaps

- **Reuse:** event/inbox infrastructure for appropriate notifications, finance/analytics, attendance, billing, POS, order, refund and correction services.
- **Changes:** scoped assistance/issues, optional equipment handoff, independent audited vendor/manager finish and correction, accessible animated recaps. Show coverage and freshness for each metric; provide only authorized, supported aggregates. Review all `CLOSE_DAY` consequences first.
- **Dependencies:** C views and decisions on completion, issue visibility, equipment, comparable occurrences and metrics. Do not claim complete new/returning or profit without evidence.
- **Risks:** finish blocking commerce, duplicate parent/vendor portion counts, unauthorized monetary disclosure, anonymous POS, delayed analytics and later refunds/adjustments.
- **Verify:** independent finishes and retries, permissions, partial data, post-finish fulfillment/refunds and invoice adjustments, issue lifecycle, source reconciliation and reduced motion.
- **Manual:** open and resolve a request; finish vendor and manager independently; revisit pickup/POS and authorized payment/refund pages; compare recap labels and values to source reports, including missing and comparable data.

### Phase E: Customer Storefront Mode

- **Reuse:** market SSR shell, theme/editor, published map and renderer, public directory, authenticated purchases/portions and occurrence schedule.
- **Changes:** manager enable and bounded override, server effective-state read, occurrence-aware alternate view, countdown, directory, secure customer orders, published map and actual pickup markers, regular-site escape and accessible text fallback. Add fulfillment-location model/projection only after authority is agreed.
- **Dependencies:** map freshness and pickup-location decisions, secure customer identity/session, and completion signal if automatic visibility uses it. Never expose a guessed booth as pickup.
- **Risks:** private order leakage through public APIs or cache, wrong layout version/location, theme/editor regression, overlaps, reschedules, expired overrides and absent maps.
- **Verify:** customer/anonymous isolation, supported themes/editor previews, no-store behavior, clock boundaries, overlap selection, changed locations and missing/off-map fallback.
- **Manual:** enable an occurrence and exercise schedule and override, compare published map, sign in as two customers with different orders, check pickup instructions/markers and normal-site escape, then safely reschedule or disable the mode.

### Phase F: Real-Time Integration and Refinement

- **Reuse:** scoped authoritative reads, existing polling, revision conflicts, notification events and mutation refresh.
- **Changes:** visibility-aware bounded polling, focus/reconnect/mutation refresh, stale indicators and backoff across map publication, assignments, attendance, pickup, requests and completion. Consider event-driven invalidation only if measurements justify it; retain full-read fallback.
- **Dependencies:** B–E authorities/projections, publication policy, pickup mapping and permissions. Earlier phases may use polling; F harmonizes it.
- **Risks:** polling load, stale published snapshots presented as live, missed reconnect changes, cross-tenant events, duplicate retries and emergency lockout.
- **Verify:** multiple sessions and roles, reconnect/focus behavior, concurrent revisions, overlap/reschedule/cancellation, rate/load limits, safe offline failure and critical-route access.
- **Manual:** use separate manager, vendor and customer sessions; change a published assignment, attendance, pickup and request; observe updates/timestamps, disconnect/reconnect, and confirm refresh without cross-user leakage. Check behavior when an assignment has not been republished.

## 9. Unresolved questions and potential blockers

1. **Phase B:** which readiness facts and optional task details may managers see, what makes a self-report stale, and are templates vendor-specific, market-specific or both? Confirm initial checklist scope and private-date behavior.
2. **Completion:** should legacy `operationsComplete`/`CLOSE_DAY` remain separate scheduling closeout, be renamed, or be safely refactored? Identify all affected operations and correction paths. Should reopening change customer-mode eligibility?
3. **Activation:** exact window, early start and late extension, override expiry and authority, cancellation behavior and whether finish suppresses mode. How long should a regular-storefront choice persist?
4. **Pickup blocker:** identify authoritative actual fulfillment location and whether order-specific overrides are required; decide how changes interact with historical promises, shared points, layout versioning and notifications. The reviewed API does not prove map coordinates are available today.
5. **Publication:** assignment change versus explicit republish, avoiding disclosure of unpublished changes. Verify all assignment/layout commands including cancellations and conflicts.
6. **Reporting:** define sales, order, product and comparable-market criteria; agree whether managers may access aggregate monetary sales. Audit POS attribution, completeness and identity coverage before claiming totals or new/returning customers. Decide finish-time snapshot versus corrected recap.
7. **Assistance/equipment:** recipients, escalation, retention, visibility, partial handoff/return, whether manager-created incidents are in scope, and behavior for external businesses or private markets.
8. **Operational constraints:** this review did not establish push infrastructure, production polling capacity, all theme support for the candidate map renderer, or a complete customer order-by-occurrence API. Verify narrowly when implementing; absence here is not proof of repository-wide absence.
9. **Time rules:** self-check-in stops at scheduled end and attendance sessions have their own lifecycle. Decide whether late self-check-in remains unavailable or needs a separately authorized exception; tabs and finish do not override existing rules.

## 10. Recommended immediate next step

Agree the Phase B readiness and sharing contract, including vendor-private occurrences and unknown/not-applicable cases, then begin a bounded implementation using existing occurrence, packing, assignment, billing and checklist reads. In parallel as design prerequisites for later phases, trace `CLOSE_DAY` consumers and decide fulfillment-location and published-map freshness semantics. Do not block Phase B on push infrastructure or a completed customer storefront design.
