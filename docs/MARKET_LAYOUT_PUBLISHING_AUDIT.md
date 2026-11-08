# Market layout publishing and interactive maps audit

Audit date: November 7, 2026.

Scope: static inspection of the current local working trees, including uncommitted changes, in `E:/coding/farmers-market-platform-web` and `E:/coding/farmers-market-platform`. Only this report was written. No implementation, database access, migrations, test execution, browser automation, screenshots, or runtime verification was performed.

“Implemented” below means supported by inspected source, not newly demonstrated in a running environment. “Partial” identifies a specific implemented subset. “Missing” means absent from the inspected feature routes, renderer, or API contract. Recommendations are judgments, separately identified from implementation facts.

## Executive summary

Farmstand already has an interactive market map system. Public, vendor, and manager views reuse `MarketMap`, backed by the same `MapCanvas` and `KonvaElement` renderer as the layout designer. Booth selection, vendor/booth text search, cross-area result location, highlighting, zoom, pan, fit, mobile gestures, decorations, and occurrence-specific geometry already exist. Managers have map-based assignments, occurrence management integration, Market Day, and a physical-booth scheduling matrix with recurring rules.

The principal gaps are discovery and composition. A public map is available at the market storefront's `/occurrences/:occurrenceId/map`, but no link to it was found in the inspected storefront routes/components. The public map has no date picker or date context, category filter, vendor logos, or storefront links. Clicking a booth highlights it without opening its existing business-description disclosure. Vendors have a working dedicated booth-map page, but their market/date pages and Market Day show booth or attendance information without embedding that map.

The main architectural concern is mixed publication behavior. Public maps are stored snapshots: ordinary assignment changes do not refresh them, while an occurrence-layout save refreshes an already-published map automatically. Managers therefore see current assignments that can differ from the public map and from the map accompanying a vendor's current assignment. There is no direct published-versus-current comparison or dedicated republish button in the inspected manager UI.

A bounded Phase 4 is justified for public map discovery, occurrence context, selected-booth details, filtering, vendor entry points, and publication clarity. A new renderer, editor, physical-booth model, assignment service, or scheduler is not justified.

## Relevant architecture and source paths

Frontend paths below are relative to `E:/coding/farmers-market-platform-web`; backend paths are relative to `E:/coding/farmers-market-platform`.

| Area | Important sources and responsibility |
| --- | --- |
| Shared map | `packages/ui/src/MarketMap.tsx`: area selector, search, booth disclosures, selection, hover cards and caller-supplied details/statuses. `packages/ui/src/map/MapCanvas.tsx`, `KonvaElement.tsx`, `visuals.ts`, `smart-design.ts`, `assets.ts`: gestures, geometry, appearance, legends and artwork. |
| Layout authoring | `apps/admin/src/market/phase14/Layouts.tsx`, `LayoutInspector.tsx`, `OccurrenceLayoutActions.tsx`: library, designer, appearance preview, physical identity handling and occurrence edits. |
| Manager operations | `apps/admin/src/market/OccurrenceMap.tsx`, `OccurrenceDetail.tsx`; `apps/admin/src/market/phase14/Assignments.tsx`, `OperationsRoutes.tsx`, `BoothSchedule.tsx`, `booth-status.ts`: live assignments, dialogs, publication and scheduling. |
| Public route | `apps/storefront/src/pages/occurrences/[occurrenceId]/map.astro`, `apps/storefront/src/lib/shop.ts`: SSR map fetch and hydrated shared map. `pages/occurrences/[occurrenceId]/index.astro` is the separate commerce occurrence page. |
| Vendor consumers | `apps/admin/src/vendor/booths.tsx`, `VendorRoutes.tsx`, `MarketDetail.tsx`, `MarketOccurrence.tsx`, `markets-data.ts`: dedicated map, newer booth summaries and assignment lookup. |
| Frontend API | `packages/api/src/market-operations.ts`, `packages/api/operations/public-market-operations.graphql`, `packages/api/operations/market-operations.graphql`: public projection types, reads and command transport. |
| Backend authority | `src/plugins/market-operations/api.ts`, `service.ts`, `model.ts`, `entities.ts`: GraphQL roots, publication/assignment commands, validation, safe projection and persistence. |
| Authorization | Backend `src/plugins/market-operations/permissions.ts`, `src/plugins/platform-identity/tenant-access-policy.ts`, `shop-context.middleware.ts`, and `src/plugins/marketplace-commerce/market-browse.interceptor.ts`. |

Documentation consulted: `docs/frontend-phase14-market-operations-implementation.md`, `occurrence-layouts.md`, `BOOTH_LAYOUT_AND_SCHEDULING_AUDIT.md`, `BOOTH_IDENTITY_PHASE_A.md` including Phase A.1, `BOOTH_SCHEDULING_PHASE_B.md`, and the layout visual enhancements, smart design, and editor UI Phase 1 through 3 reports. Historical documents are context, not proof of current behavior. In particular, the older booth audit predates physical identities and recurring scheduling, and the original Phase 14 report predates occurrence-edit snapshot refresh. Current source takes precedence. Historical test claims were not revalidated.

### Storage, identity and occurrence resolution

- `MarketLayout` is the named, market-owned reusable layout. `MarketLayoutVersion` stores areas and graphical elements as JSON, a version number, `DRAFT/PUBLISHED/RETIRED` status, and an optional occurrence scope. `MarketSpace` stores version-specific booth details and joins a `SPACE` graphical element through `elementId`. Decorative objects do not create operational booths.
- `MarketPhysicalBooth` is the permanent market-owned identity. Every space has `physicalBoothId`; labels, coordinates and element IDs are not substitutes for it. A version cannot represent the same physical booth twice. Retired physical identities cannot receive new assignments.
- Retained elements inherit physical identity from their actual source version. New and duplicated objects receive new identities. Whole-layout copying offers a variation preserving physical identities or an independent copy creating new identities. The manager dialog defaults to variation; older API callers omitting `copyMode` retain independent-copy behavior. There is no label-based identity inference.
- `MarketOccurrencePlan` pins an occurrence to one layout version. `MarketOccurrenceApproval` records the vendor/date approval. `MarketOccurrenceSpaceAssignment` joins occurrence, space, directory entry and approval, with accepted booth/business snapshots. One vendor can have multiple booths through the existing explicit confirmation path; active occupancy is unique per occurrence/space.
- Rendering resolves the occurrence plan, its version and spaces, then that occurrence's assignments by `spaceId`. Assignment copying and recurring scheduling resolve physical identities into the target plan's spaces. They do not match booth labels. Different occurrences can select different layouts or have individually edited geometry.

Sources: backend `entities.ts`, `service.ts` (`SAVE_LAYOUT`, `CLONE_LAYOUT`, `SET_PLAN`, `COPY_ASSIGNMENTS`, `assign`, `saveOccurrenceLayout`, scheduling methods); frontend `Assignments.tsx`, `OccurrenceMap.tsx`, `Layouts.tsx`.

### Publication and draft separation

There are two distinct publication states: reusable layout publication and occurrence map publication. Publishing a layout makes it selectable for an occurrence; it does not publish an occurrence map. `PUBLISH_MAP` builds `MarketOccurrencePlan.publicSnapshot` through `projectMap`. Unpublishing sets the plan to draft and clears its public snapshot. Anonymous reads return only a published plan's stored snapshot.

Saving a draft shared layout changes that draft. Saving an already-published shared layout retires the old version and creates a new published version; occurrences retain their pinned historical version. Thus “Save” on an existing published shared layout is not a separate unpublished review stage.

An occurrence edit creates a dedicated published version, remaps active assignments by retained element ID, preserves assignment identities and accepted/financial snapshots, and rejects assigned-booth removal, incompatibility, identity changes and stale revisions. If the occurrence map is published, the save also rebuilds its public snapshot. Unsaved editor content remains local; appearance Preview does not publish it.

Switching an occurrence to another shared layout uses the existing confirmation/clearing workflow, not automatic physical-booth remapping. It archives assignments, removes allocations, voids draft invoices, clears map publication/instructions/closeout, and preserves issued billing history. This is distinct from safely editing the selected occurrence layout.

Sources: backend `service.ts` publication and layout commands, `saveOccurrenceLayout`; `entities.ts`; frontend `OccurrenceLayoutActions.tsx`.

## Customer-facing capabilities

The public map route requires a resolved market storefront, not a customer login. Its server-side fetch calls the Shop API `publicMarketOccurrenceMap(occurrenceId: Int!)`. Invalid IDs, unavailable maps, and denied reads produce a 404 response. It is not a map route for an arbitrary vendor storefront.

| Capability | Status | Verified behavior or limit |
| --- | --- | --- |
| Public map access | Implemented | Anonymous published occurrence route with instructions and a hydrated React map. |
| Discover maps through normal navigation | Missing | No link to the map route found in storefront sources. Market homepage dates lead to the commerce occurrence page, which also has no map link. |
| Select a market occurrence | Partial | Customer commerce pages support choosing dates; the map itself has only an **area** selector. No map date picker or connected map-date navigation. |
| See the selected date/venue on the map page | Missing | Page shows “Market map” and instructions; the map payload does not carry occurrence date, venue or timezone metadata. |
| Click or tap a booth | Implemented | Canvas selects/highlights `SPACE` objects. Read-only gestures distinguish a tap from dragging. |
| Open business details from a canvas booth | Partial | Pointer hover shows label, size, amenities and business name. Canvas selection only highlights; it does not open the matching disclosure or a details panel. |
| Business information | Partial | Canvas/list show business name; expanded DOM disclosures show description, booth size and amenities. Category is returned but not displayed. No rich public vendor panel. |
| Vendor logos and storefront links | Missing | Public vendor contract contains only business name, description and category. No logo, public profile/storefront URL or verified public link mapping. Decorative image/logo objects are not vendor profile logos. |
| Search vendors or booths | Implemented | Case-insensitive substring search over booth label and business name. With a search term, results span areas. It filters the booth list, not all canvas objects. |
| Filter vendors | Partial | Text search and map area selection exist. Category/product-type/amenity vendor facets are absent from the map. Product catalog filters on the separate commerce page do not filter map vendors. |
| Locate/highlight a result | Implemented | Opening a result highlights and centers its booth; cross-area results change the area before locating it. |
| Map navigation | Implemented | Zoom buttons, wheel zoom, fit, reset, drag pan, responsive sizing, and two-finger pinch/pan. DOM disclosures provide a keyboard-accessible information and location alternative. |
| Decorations and saved appearance | Implemented in source | Shared renderer supports shapes, paths, text, built-in artwork, images, z-order, fills, strokes, opacity, background and derived legends. Runtime image loading and visual fidelity were not checked. |
| Shareable map URL | Implemented | Ordinary market-origin URL `/occurrences/:occurrenceId/map`; publication is required. No copy/share control or selected-booth deep link. |

Public serialization deliberately removes editor locks, groups, editor-hidden state and grid settings; ordinary editor-hidden objects still appear publicly. Reference-only images are excluded from both public projection and read-only rendering. They are the explicit nonpublic reference mechanism, unlike the editor visibility toggle.

Sources: public `map.astro`, `MarketPublicHome.astro`, occurrence `index.astro`, `MarketMap.tsx`, `map/MapCanvas.tsx`, `map/KonvaElement.tsx`, `map/visuals.ts`; backend `model.ts: publicLayout`, `service.ts: projectMap/publicMap`; frontend `PublicOccurrenceMap` type.

## Vendor-facing capabilities

`/vendor/booths` renders `VendorBooths`. Each upcoming assignment has its occurrence start, accepted booth dimensions/amenities, instructions, accepted rentals and own invoice statuses. A published map displays surrounding booths and their public business names/descriptions, with the vendor's own element selected and its area initially active. Without publication, assignment information remains available and the page explains that the map awaits publication.

Assignments are occurrence-specific and come from `ownVendorBoothAssignments` on the Admin API. The dedicated page renders one card per assignment, so multiple booths are retained there. It uses the shared search, area selector and navigation. The supplied controlled `selectedId` keeps the own booth emphasized even when another result is located. Initial own-booth highlighting exists; there is no explicit initial centering call for that prop.

Integration is partial elsewhere:

- `/vendor/markets/:membershipId` and `/vendor/markets/:membershipId/dates/:occurrenceId` show the reusable `BoothAssignment` summary, not `MarketMap`. Upcoming dates show booth labels. There is no map action in those summaries.
- `/vendor/day` renders attendance history and packing extras, not the booth map. Vendor packing is not another map implementation.
- Application detail views link to `/vendor/booths`, including scoped channel handling. A dedicated route therefore exists despite limited integration with everyday date views.
- `markets-data.ts: readBoothAssignments` stores a single assignment per occurrence in a `Map`, overwriting earlier entries for that date. The newer market/date summaries can consequently show only one booth even though the backend and dedicated map page support several.

Desktop and mobile use the same vendor map component and data, with responsive sizing and touch gestures. No separate mobile vendor map workflow was found. Actual small-screen usability is unverified.

Sources: `vendor/booths.tsx`, `VendorRoutes.tsx`, `MarketDetail.tsx`, `MarketOccurrence.tsx`, `markets-data.ts`, `application-detail.tsx`; `packages/ui/src/ApplicantApplications.tsx`; backend `service.ts: vendorAssignments`.

## Market manager capabilities

| Route/view | Existing functionality |
| --- | --- |
| `/market/layouts`, `/market/layouts/:layoutId/edit` | Draft/published library previews, editor, copy variation/independent layout, archive, and public-appearance Preview. |
| `/market/occurrences/:occurrenceId` | `OccurrenceDetail` embeds `OccurrenceMap`, with selected occurrence geometry, current business assignments, status colors, booth list and assignment dialog. |
| `/market/assignments/:occurrenceId` | Shared map, booth selection/dialog, approvals, assignment/move/rentals/billing workflows, change/edit layout, publish/unpublish map. |
| `/market/day/:occurrenceId` | Map and attendance plus Schedule tabs. Reuses `Assignments`, with private rental/billing/note overlays and the dedicated attendance workflow. |
| `/market/assignments/:occurrenceId/edit-layout` and day edit-layout route | Protected occurrence-specific designer; saves preserve existing assignment/financial relationships. |
| `/market/day` Schedule tab | Physical booth/date table on desktop, selected-date list on mobile, assignment drawer, recurring preview/confirmation, overrides, cancellation and links to occurrence maps. |
| `/market/operations` and detail | Readiness, counts and operational shortcuts; not another embedded public map. |

Managers can select booths to inspect or change assignments, including restricted read-only dialog behavior when they lack write permission. Invoice-derived paid/assigned/available statuses and optional private overlays are operational presentation, not public bookability. Authorized billing data is loaded separately. Successful assignment commands refresh the local read; no map subscription or automatic cross-session synchronization was found.

Preview is **partial** for publication comparison. The designer already offers an appearance preview of current, potentially unsaved content, excludes references and private status overlays, and deliberately omits vendor assignments. It is not a fetched preview of the actual stored occurrence snapshot. Library/picker previews also exist. There is no side-by-side current/published comparison or direct “View public map” action in the inspected operational controls.

Sources: manager components in the architecture table, `market/operations.tsx`, `market/MarketRoutes.tsx`, `market/occurrences.tsx`, and `vendor/common.tsx: useRead`.

## Existing security and data boundaries

| Boundary | Verified protection |
| --- | --- |
| Published versus draft | Shop resolver is public, but `publicMap` checks the current market channel, scheduled occurrence ownership, published plan state and stored snapshot. It does not read draft editor content. Cancelled occurrences fail the normal occurrence guard. |
| Public payload | `projectMap` explicitly constructs geometry, instructions, booth labels/sizes/amenities and business snapshots. `assign` constructs those business snapshots from only name, description and category. Contact details, linked vendor IDs, application answers, private notes, fees, invoices, attendance and check-in are not included. |
| Geometry boundary | `validateLayout` validates bounded geometry, supported asset IDs, appearance fields and image URL syntax. `publicLayout` allowlists appearance fields and excludes reference images and authoring state. Public decoration URLs are client-loaded resources; their actual availability was not inspected. |
| Manager authority | Resolver permissions are supplemented by service-level current grants, active market/channel membership, administrator checks and market-scoped record lookups. Commands use a transaction and pessimistic market-row lock. Layout and plan revisions reject stale writes. |
| Vendor authority | `ownVendorBoothAssignments` requires vendor identity permission and fresh `requireVendor` authority. Projection selects active, verified linked directory entries and assignments stamped with that vendor's verified ID. Only scheduled, not-ended dates are returned. Other vendors are visible only through the public map snapshot, not their private assignment/invoice records. |
| Assignment integrity | Service requires a space belonging to the selected occurrence plan, eligible approval, active physical identity, compatibility and rental capacity. Database scoped foreign keys, physical-booth uniqueness and active occurrence/space uniqueness reinforce it. Issued billing changes require the existing explicit policies. |
| Shop scope | Shop context middleware and commerce interceptor explicitly allow the public map root within market browse policy; the frontend also requires a market storefront. Passing another market's occurrence ID does not change tenant authority. |

No concrete draft/private-data exposure was established in the inspected map projection. These are source-level protections, not a fresh runtime security qualification.

The concrete consistency concerns are:

- `assign` updates assignments without rebuilding `publicSnapshot`. The manager map refreshes current data, while the public map and the public map attached to a vendor assignment retain old attribution until rebuilt.
- `saveOccurrenceLayout` rebuilds an already-published snapshot, incorporating current assignments as well as new geometry. An occurrence edit can therefore publish assignment changes made since the last explicit map publication. Application-date release and scheduling release instead return the plan to draft and require deliberate republication. The policy is inconsistent across commands, not a demonstrated authorization bypass.
- The manager toggle offers publish/unpublish only. Although `PUBLISH_MAP` can rebuild a published snapshot with `published: true`, no dedicated refresh/republish action or publication freshness indicator is present.
- The public map page omits `SiteLayout.path`; that layout defaults to `/` and derives canonical and Open Graph URLs from it. Thus the shareable browser route exists, but metadata identifies the market homepage rather than the map route.

Sources: backend `service.ts: assign/saveOccurrenceLayout/PUBLISH_MAP/projectMap/publicMap/vendorAssignments`, `api.ts`, `model.ts`, `entities.ts`; migrations `1791400000000-MarketOperationsPhase14.ts`, `1791500000000-OccurrenceLayoutEditing.ts`, `1791600000000-LayoutLibrary.ts`, `1795000000000-PermanentBoothIdentity.ts`; frontend `Assignments.tsx`, public `map.astro`, `SiteLayout.astro`.

## Feature gap matrix

This matrix evaluates the proposed interactive-map capabilities, not the completeness of unrelated commerce or attendance systems.

| Proposed feature | Overall status | Remaining gap |
| --- | --- | --- |
| Interactive booth selection | Implemented | Public click-to-details connection is separate and incomplete. |
| Vendor information panel | Partial | Existing hover/disclosures provide names/descriptions; no synchronized selected panel, displayed category, logo or storefront action. |
| Occurrence selection | Partial | Manager selector and vendor per-date cards exist. Public map date selection is absent. |
| Vendor search and filtering | Partial | Search and cross-area location work; category/facet filtering is absent. |
| Booth highlighting | Implemented | Canvas selection, result location and vendor own-booth emphasis exist. |
| Map navigation | Implemented | Pan, zoom, fit, reset, area changes and mobile gestures exist. |
| Public presentation | Partial | Anonymous styled renderer exists; discovery, date context and details integration are incomplete. Visual fidelity remains unverified. |
| Shareable map links | Implemented | Stable occurrence URL exists; entry points, metadata and copy-link convenience need refinement. |
| Manager integration | Implemented | Occurrence, assignment, Market Day and scheduler integration exist; publication comparison/freshness is partial. |
| Vendor integration | Partial | Dedicated published-map view exists; market/date/Market Day entry points and multiple-booth summaries need work. |

## Duplication risks

Rebuilding the proposed interactive map phase in full would duplicate most core capabilities. Preserve and extend these boundaries:

- Reuse `MarketMap` for public and vendor map composition and its existing DOM search/disclosures. Extend selection/details behavior there rather than introducing another booth list or navigation engine.
- Reuse `MapCanvas`, `KonvaElement`, `visuals`, `assets` and `smart-design` for rendering, gestures, appearance, reference exclusion and legends. The designer already uses these lower-level pieces directly for specialist authoring interactions.
- Reuse `OccurrenceMap`, `Assignments`, `BoothAssignmentDialog`, `OccurrenceLayoutActions` and `boothStatus` for manager operations. Do not move privileged command controllers into customer UI.
- Reuse `MarketOperationsService`, `projectMap/publicLayout`, physical booth identities, occurrence plans, ordinary assignments and recurring rules. Do not infer identity from labels or build a parallel vendor-location table.
- Preserve the distinction between market directory businesses and verified platform vendors. External businesses can occupy booths without having a storefront. Public logo/link enrichment would require an explicit safe projection, not exposing linked internal IDs or assuming every business is a platform vendor.
- Reuse the current approved shared controls and dashboard shell. Future UI work must consult root `COMPONENT_USAGE_GUIDE.md` and `UI_COMPONENTS.md`, retain Astro SSR with a map island, and avoid unrelated UI consolidation.

## Prioritized recommendations

Recommendations below are ordered by practical value within each group. They are proposed work, not implementation authorization.

### A. Existing functionality to preserve

1. Preserve occurrence-pinned versions, physical booth identities, safe occurrence edits and billing/assignment safeguards. These protect manager operations and vendor commitments.
2. Preserve shared rendering, search/location, highlights, mobile gestures, semantic booth disclosures and the recent visual/legend capabilities. No replacement map engine is needed.
3. Preserve manager occurrence/Market Day/scheduler integration and the dedicated vendor assignment page, including unpublished-map messaging and private own-assignment details.
4. Preserve explicit safe public projection, verified vendor links, tenant checks and separate public/operational data contracts.

### B. Small improvements

1. **High value, customers and managers:** add public-map entry points to occurrence pages and a manager “View/copy public map” action using the correct market origin. Show links only with authoritative publication availability. Correct the map canonical path at the same time.
2. **High value, customers:** show date, venue and timezone on the map page, and connect booth clicks to the existing description/details presentation. Keep equivalent keyboard and touch access. Category is already in the payload and can be displayed without exposing new private fields.
3. **High value, vendors:** link the existing booth map from market/date summaries and Market Day. Fix the single-assignment-per-occurrence summary reduction to retain all assigned booths. An inline map can follow if its value warrants it.
4. **High value, managers:** expose a deliberate republish action using the existing command and clearly explain when an occurrence edit refreshes a public map. Accurate “changed since publication” detection is separate backend work, not just a label.
5. **Moderate value, customers:** add category filtering over the existing public business category, with area/search state composed predictably and useful empty states.

### C. Significant missing functionality

1. **Highest value within this group:** define a consistent publication policy and implement reliable current-versus-published freshness/comparison if managers need to stage changes. This must cover ordinary moves, recurring assignment changes, releases and occurrence edits. It requires coordinated backend/UI work; the existing snapshot mechanism should remain the foundation.
2. **Moderate to high value:** provide a public map occurrence chooser backed by a safe published-map availability projection and occurrence metadata. Current commerce dates are not proof that a map is published. Reuse occurrence scheduling rather than building a new date model.
3. **Moderate value:** richer vendor discovery with approved public logos and validated storefront/profile links for verified vendors, while retaining useful external-business entries. This needs a deliberate public contract and fallback behavior. It is more than rendering the existing category field.

### D. Features to defer

1. Defer a new renderer, new editor, new physical identity model or replacement recurring scheduler. They duplicate working architecture.
2. Defer GPS indoor positioning, route finding, live crowd/occupancy tracking and real-time map subscriptions unless a concrete operational need is demonstrated.
3. Defer favorites, custom share tokens, selected-booth deep links, QR management and offline map packages until public discovery and ordinary details work well. The existing URL can already be shared.
4. Defer public “available/bookable booth” claims and payment/attendance overlays. A missing public assignment is not authoritative customer-facing availability, and operational states already have private consumers.

## Proposed scope for a potential Phase 4

**Recommendation: a focused map access and publication enhancement phase, not a new interactive-map implementation.**

Core scope:

- Public occurrence-to-map links, correct route metadata, selected date/venue context and a safe published-date chooser.
- Booth selection connected to the existing business details, displayed categories and category filtering, preserving search, location, areas, touch gestures and the DOM alternative.
- Vendor date/Market Day links to existing maps and preservation of multiple assigned booths in summaries.
- Manager view/copy-public-link and republish controls. Agree on snapshot refresh rules before changing them; add publication freshness support only through the existing backend authority.

Optional separate increment: public vendor logos and storefront/profile links, after defining verified linking, external-business fallbacks and public data approval. This need not block the core scope.

Acceptance for a future implementation should cover anonymous publication access, rejected draft/cross-market reads, current-versus-published assignment behavior for each change path, multiple vendor booths, keyboard/touch details and cross-area search. Those checks were not run in this audit. Do not add a migration, change the persistent test database, or broaden the phase simply to recreate capabilities listed as implemented.
