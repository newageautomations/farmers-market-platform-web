# Booth layout and scheduling audit

Static source audit, October 30, 2026. This document describes code inspected locally; runtime behavior and database contents were not verified. Backend paths below refer to `E:/coding/farmers-market-platform`, the API repository; other paths refer to `E:/coding/farmers-market-platform-web`.

## Executive Summary

A market owns reusable, versioned layouts. Each layout version stores its drawing and has separate version-scoped booth (`MarketSpace`) rows. An occurrence plan references one layout version, and each assignment references an occurrence and a booth row. Several dates can reference the same version and therefore the same booth row. Editing a single occurrence creates a new version and new booth rows, then moves its assignments to those rows by matching graphical element IDs. Editing a published shared layout also preserves the older version for dates already using it.

This gives useful continuity for edits that retain the same element IDs, but there is no independent, market-scoped physical-booth identity across all versions and layouts. Matching is by element ID, not booth label; deleting and recreating a booth breaks that link. Switching layouts explicitly clears active assignments rather than mapping them. A calendar can build on existing date-specific assignments, but reliable cross-layout rows and recurring rules need additional capabilities.

## Current Feature Inventory

| Functionality | Status | Evidence and limits |
| --- | --- | --- |
| Layout drawing, save, publish, copy and archive | Implemented | Shared layouts and occurrence editor in `apps/admin/src/market/phase14/Layouts.tsx`; commands in backend `src/plugins/market-operations/service.ts`. |
| Booth and non-booth drawing objects | Implemented | Only `SPACE` produces `MarketSpace` rows; other geometry is drawing only. |
| Versioned layouts and per-date edits | Implemented | Shared published edits preserve old versions; occurrence edits create dedicated versions. |
| Stable physical booth identity across all layouts | Partial | Same-version database ID or retained element ID permits limited matching; no canonical physical booth or general mapping found. |
| Date-specific booth assignments and moves | Implemented | `ASSIGN`, assignment UI, and occurrence plan; subject to approval, compatibility and billing rules. |
| Multiple booths per vendor | Implemented | Explicit `allowMultipleSpaces` confirmation; each is a separate assignment. |
| Multiple vendors sharing one booth on one date | Missing | Active uniqueness on occurrence and space, plus service check, prevents it. |
| Recurring assignment rules or permanent reservations | Missing | Assignments are occurrence-specific; copying produces proposals, not a recurrence rule. |
| Booth preference | Partial | Manager sets a preferred directory entry on a booth; UI shows it. This is not a vendor-submitted preference or automatic reservation. |
| Copy assignments between dates | Implemented | Proposal and conflict preview matched by element ID; manager confirms individual assignments. |
| Attendance and vendor self-check-in | Implemented | Dedicated attendance service and manager/vendor views, with restrictions and audit history. |
| Manager cancellation of one application date and release | Partial | Supported for accepted application date decisions before start, with explicit release and billing checks. Coverage of every other participation path is not established. |
| Automatic booth release on absence | Missing | Attendance status and assignment are separate; attendance has no automatic financial or reassignment action. |
| Assignment change history | Partial | Command audit and snapshots exist; not a dedicated complete temporal assignment history. |
| Booth/date grid and recurring overrides | Missing | No such scheduling interface or recurring rule model was found in the inspected paths. |

## Existing Architecture

- `apps/admin/src/market/phase14/Layouts.tsx`, `LayoutInspector.tsx`, `LayoutLayers.tsx` and `packages/ui/src/map/` implement the reusable editor and map. Create starts a draft with a main area and 10 pixels per foot. Save sends the drawing and booth details; publish makes a shared draft selectable. Copy creates a separate layout and draft version; archive hides a layout while retaining references. The editor provides booth, rectangle, circle, triangle, line, text and image objects. Only booths create space rows on save.
- `packages/ui/src/map/model.ts` creates a default booth label beginning at `A01`, incrementing until unused in the current drawing. `Layouts.tsx` generates an element UUID using `crypto.randomUUID()`. Labels are editable, and are not a cross-market identity guarantee. Copied individual objects get new UUIDs and a locally unique label. Booth defaults include 10-by-10 feet, type, amenities, fee, currency, preference and private notes.
- Backend `src/plugins/market-operations/model.ts` defines geometry: element ID, area, x/y, width/height, rotation, z-order, text, appearance, optional image, group and editor properties. The version's JSON definition holds geometry and areas. `MarketSpace.details` JSON holds label, dimensions in feet, type, description, amenities, fee, preference and notes. Save aligns booth pixel width/height to feet times the layout scale. See backend `entities.ts` and `service.ts`.
- `MarketLayout` and `MarketLayoutVersion` belong to a market; `MarketSpace` has a database ID, `marketId`, `layoutVersionId`, `elementId` and details, unique per version and element. `MarketOccurrencePlan` has one occurrence and a version reference, map state, instructions and an optional published public snapshot. `MarketOccurrenceApproval` links a directory entry and date to its decision and, where applicable, canonical participation. `MarketOccurrenceSpaceAssignment` references the space, approval, directory and occurrence, with booth and business snapshots. Rental allocations and invoices reference the assignment; payments reference invoices. Operations audits record command results. See backend `src/plugins/market-operations/entities.ts`, `service.ts`, and `api.ts`; frontend API adapter is `packages/api/src/market-operations.ts`.
- Access checks and market-scoped lookups guard these commands. A label such as A01 is display data, not a globally shared key. Each market's rows are separately scoped, so identical labels in different markets do not identify the same space.

## Booth Identity and Layout Changes

A booth database ID is separate from the graphical element ID, but is scoped to a layout version, not an independent physical space. If two dates select the same version, both can refer to the same `MarketSpace` ID. The active-assignment uniqueness constraint is per occurrence and space, so this does not prevent use on different dates. Different versions have distinct booth rows, even when their element IDs match.

Moving, rotating or renaming an existing element preserves its element ID. Resizing updates geometry and booth dimensions. Saving a draft updates matching space rows in that draft and removes rows for deleted elements. Saving a published shared layout retires its old version and creates a new published version and new space rows; existing occurrence plans continue pointing to the old version. New selections can use the updated version. An occurrence-specific save creates another version and new rows, maps active assignments from old spaces to new spaces by element ID, and rejects removal or incompatible changes to an assigned booth and stale revisions. Assignment IDs, snapshots and financial references remain; a published public map is refreshed. Thus the assignment's accepted booth snapshot can differ from the edited booth's current details. See `SAVE_LAYOUT` and `saveOccurrenceLayout` in backend `src/plugins/market-operations/service.ts`.

Deleting and recreating an object generates a new element ID, even if its label is identical. The occurrence editor rejects deletion of an assigned booth, including replacement with a new ID; unassigned recreated booths have no continuity. A copied layout has independent space rows; its copied element IDs can allow the existing copy-assignment matcher to find corresponding spaces, but that is not an explicit, validated physical-space mapping. Labels alone do not join them. No general normalization or mapping mechanism was found in the inspected layout and assignment paths.

An occurrence references a version rather than embedding a complete private layout snapshot in its plan. Published maps additionally have `publicSnapshot`; assignments separately retain business and booth-detail snapshots. Older shared versions and their rows preserve layouts for dates already referencing them. The system does not automatically change other occurrences when a new shared version or occurrence edit is saved. Selecting a different shared layout for an occurrence with existing operational data requires confirmation and clears active assignments, rental allocations, instructions, publication and completion state; assignments are soft-deleted and draft invoices voided, while issued billing records remain. It is not a transparent remap. See `SET_PLAN` in backend `service.ts` and `apps/admin/src/market/phase14/OccurrenceLayoutActions.tsx`.

Historical consistency is consequently strongest when old versions remain referenced and assignments are archived. It is not a full immutable event history: moving an assignment updates its space reference and snapshots in place, while command audits provide supporting records. The generic audit stores command result; do not assume it captures a complete before/after history for every assignment change. Historical occurrence editing restrictions should be verified per operation before relying on a stronger guarantee.

## Market Day Integration

`apps/admin/src/market/phase14/OperationsRoutes.tsx` composes the occurrence selector, `Attendance`, and the existing `Assignments` specialist on Market Day. `Assignments.tsx` resolves the occurrence plan's version and spaces, combines active assignments and approved vendors, and renders `MarketMap`, booth and vendor lists, selection and assignment controls. Managers with the relevant permissions can assign or move vendors from this view, select/change the layout, edit an occurrence-specific version, and publish its map. `apps/admin/src/market/OccurrenceMap.tsx` also loads `ASSIGNMENTS` for an occurrence and renders its plan's version with assigned business information and a Manage Booths link.

The attendance service materializes expected attendees from confirmed participation and eligible approved external directory entries. It supports awaiting, checked-in, excused and no-show states, manager notes, history, finalization and reasoned corrections; eligible vendors can self-check in during the occurrence. Attendance snapshots include a booth label from an assignment, and freeze for ended appearances under the implemented rules. Vendor `/vendor/day` displays the vendor's own appearance and booth label through `AttendanceHistory`; this is not evidence of a vendor-facing editable map. See `apps/admin/src/market/phase14/Attendance.tsx`, `apps/admin/src/vendor/VendorRoutes.tsx`, backend `attendance.service.ts` and `attendance.entities.ts`.

Potential reuse for a future scheduler includes the dashboard shell, `MarketMap`, occurrence selector, assignment controls, layout actions, shared `Card`, `DataTable`, `Badge`, `Button`, fields, select and dialog. A calendar grid would still need its own interaction and accessibility design; approval of existing components does not approve a new visual standard.

## Calendar Scheduling Feasibility

Existing plans, spaces, approvals, assignments, compatibility checks, invoice protections and manager actions provide the building blocks for a date grid. The backend already has an application-scoped multi-occurrence read in `service.ts`, and `COPY_ASSIGNMENTS` previews proposals and conflicts using matching element IDs and date approvals. The UI confirms proposals through ordinary assignment commands. These are not automatic recurring assignments. Verify the exact read payload, permissions and paging needed for a potentially large grid before using it as a production schedule API.

A practical addition would be a scoped schedule read returning dates, their selected versions, mapped booth identities, assignment and availability states, and explicit reasons when a booth is absent or mapping is ambiguous. Writes should reuse or extend existing transactional assignment, eligibility, conflict, revision and billing checks. A recurring rule would need a persisted rule, effective date range, generation/reconciliation policy, conflict reporting, and explicit per-date overrides; no current rule engine was found. Use server-side atomicity for bulk changes and avoid silently overwriting manual assignments.

For continuity, the smallest robust extension is a market-owned physical booth identity referenced by each version's space, with a unique per-version mapping and an explicit migration/reconciliation process for existing rows. Retained element IDs can suggest matches within a layout lineage; labels can suggest candidates but should not silently establish identity. An explicit mapping table between versioned spaces is another option with less initial change, but becomes harder to reason about across many versions. Continuing to use `(layout lineage, elementId)` is the smallest interim approach and works where IDs are retained, but cannot safely reconcile deletion/recreation or independent layouts. None is implemented here.

The calendar should show a booth as unavailable or absent on dates whose version lacks its mapped space, rather than treating it as a free bookable booth. New spaces appear only on dates that include them; removing an assigned space should require a deliberate resolution, preserving past versions and records. The existing Market Day view can link to the selected date/cell and remain the place to inspect the map and edit a date-specific layout. Layout switches currently clear assignments, so preserving them across switches would require an explicit, conflict-checked mapping and billing policy.

## Manager-Controlled Cancellations

For accepted application submissions, `REVIEW_OCCURRENCE` can cancel one confirmed requested date before it starts. The manager must explicitly release existing assignments; draft invoices require explicit void and billing permission, and open or paid invoices block cancellation until resolved. The assignment is soft-deleted, the plan returns to draft for deliberate republication, and linked canonical participation is cancelled with the appropriate permission. The approval and audit remain. The UI is in `apps/admin/src/market/phase14/ApplicationReview.tsx`; backend logic is in `service.ts`. This is date-specific, not a recurring schedule edit. The separate participation UI in `apps/admin/src/market/vendors.tsx` also exposes a cancelled status, but its complete effects on booth release and financial records were not established in this audit.

Attendance can record excused absence or no-show, including reasoned correction after finalization, but marking attendance alone does not release a booth, cancel the booking, refund or adjust invoices. Existing issued invoices and payments need explicit financial handling; no automatic refund was established. Attendance history freezes ended appearances, while cancellation before materialization may remove someone from the expected roster. A future manager action should make the desired booking, booth-release, attendance and billing consequences explicit and preserve history. No vendor cancellation-request workflow is needed for the requested process.

## Recommendations

1. Introduce a market-scoped stable physical booth identity and explicit version-space mapping before relying on cross-version calendar rows. Preserve versioned geometry and existing assignment and billing references. Review ambiguous matches manually.
2. Add a bounded schedule read and use existing assignment validation and optimistic revisions for date-specific changes. Expose conflicts and distinguish unavailable booths from open booths.
3. If recurring assignments are desired, add rules and date overrides with explicit application, conflict and change-history policies. Do not treat a preference or copy preview as a reservation.
4. Extend the manager-controlled date cancellation path where needed to coordinate release, attendance and billing with explicit choices, preserving issued invoices, payments and audit evidence. Do not automatically equate an absence with a cancellation.
5. Preserve existing version snapshots and reject or explicitly resolve assigned booth removals and layout switches. Document how added and retired booth identities appear in future dates.

## Open Questions

- Should a physical booth identity remain the same when its size, amenities or location change substantially, and who resolves ambiguous matches?
- When a recurring rule conflicts with a date override, approval change, layout change or issued invoice, which outcome should take precedence?
- For a manager-reported cancellation, should the attendance record remain as an excused absence, be recorded separately as cancelled, or depend on timing? What billing and refund policy applies?
- Should booth sharing ever be allowed, and if so what allocation and conflict rules should govern it?

