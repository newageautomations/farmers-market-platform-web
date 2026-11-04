# Vendor markets overview

The local vendor workspace at `/vendor/markets` opens its overview by default. Its persistent segmented menu links to `#overview`, `#applications` and `#upcoming-dates`. Browser history, direct hash entry and modified native link clicks are retained. Content uses Loyalty's 360ms opacity entrance and reduced-motion opt-out.

## Reuse and scope

`MarketsWorkspace.tsx` composes existing Farmstand panels, links, icons, search/select controls and native DataTable, plus shared Field, Badge and read/empty states within AdminShell. Its membership overview and next-date preview are feature compositions because no existing component combines those authorized reads. No primitive or design library is introduced.

`WorkspaceMenu.tsx` extracts the existing Loyalty segmented menu's presentation and link behavior. `LoyaltyMenu` now composes it with the original items, routes and current-page state. Importing the whole Loyalty dashboard into Markets would couple its unrelated data and workflows. Loyalty's existing responsive layout and content animations remain intact. This extraction does not approve a universal tab category.

Applications now uses the [Applications workspace design](VENDOR_MARKET_APPLICATIONS_DESIGN.md), while retaining existing application detail and continuation destinations. The existing identity verification and relationship request forms remain accessible under Applications. Upcoming Dates retains its existing attendance controller and supplies an optional initial date to `AttendanceHistory`; existing consumers keep their previous defaults, filters, pagination and physical check-in behavior. Fixture environments without that API use the existing membership occurrence reads for a simple date listing.

The existing `/vendor/applications` list entry also opens `#applications` inside the Markets workspace. Individual application, draft and continuation routes retain their existing destinations.

## Data and behavior

- Membership rows use `memberships()` and the authorized per-membership projection. Reads are batched to at most six memberships at a time. A failed read displays the existing retry state rather than fabricated totals.
- Next scheduled dates come from a bounded 90-day occurrence query, sorted by start instant and excluding cancelled and past dates. The next-market preview selects the earliest date across approved memberships, even if the vendor has not configured attendance.
- Three summary cards show approved memberships, pending memberships and scheduled dates across approved memberships in the next 30 days. Pending membership is labeled explicitly; it is not presented as an application submission count. Membership and occurrence projections retain their backend 1,000-row caps.
- Search matches market name and the next venue. Membership filtering and next-date/name sorting affect the list independently of the next-market preview and totals.
- Only confirmed participation is labeled Attending. Planned, cancelled and absent participation remain distinct. Membership approval never implies attendance.
- An approved market with an upcoming date and no confirmed participation offers Request attendance to users allowed to manage their participation. In the side panel this opens the existing participation form with that exact occurrence selected, extending its initial query to 90 days for this entry path. Navigation never submits a command. Save retains existing version checks, validation and backend authority.
- The overview has no booth statistic, assignment column, assignment detail or booth navigation. No market-specific image is exposed by the membership contract, so the preview uses the existing decorative market icon.
- Narrow screens retain a full readable native table in its existing keyboard-accessible horizontal scroll region. Shared palette and status tokens supply colors.

No API, backend, migration or persistent database change is required.

## Local validation

- `tests/markets-workspace.test.tsx` covers membership display, filters, empty/error states, attendance destinations without mutation, permissions, hash navigation and scheduled-date selection.
- Existing Loyalty overview tests cover the extracted menu consumer.
- `scripts/check-markets-overview.mjs` uses synthetic data, blocks API and external network requests, checks layout and accessibility at 1800, 1280, 768 and 390 pixels, and saves previews under `.tmp/markets-overview-preview`.
- Start the local admin with `npm run demo:market-operations:admin`, then open `/vendor/markets` in the existing test environment. The populated test database is not modified by this feature.

## Changed local files

- Markets: `apps/admin/src/vendor/MarketsWorkspace.tsx`, `markets-data.ts`, `markets-workspace.css`, `markets.tsx` and `VendorRoutes.tsx`.
- Shared navigation: `apps/admin/src/WorkspaceMenu.tsx`, `workspace-menu.css`, `vendor/LoyaltyDashboard.tsx` and `vendor/loyalty-dashboard.css`.
- Shell and retained date controller: `apps/admin/src/AdminShell.tsx` and `market/phase14/Attendance.tsx`.
- Qualification: `tests/markets-workspace.test.tsx` and `scripts/check-markets-overview.mjs`.
- Documentation: this file and `COMPONENT_USAGE_GUIDE.md`.

## Table refinement

The membership table omits attendance and venue/address details; those remain in the next-market side panel. Each row supplies Configure for the relationship editor and Website with the shared external-link utility icon. Configure never submits a participation command. The actions retain 20px of right padding inside the table and a 10px gap.

Website destinations use current market origins from the existing authorized applicant-application projection, joined by market ID and checked by `safeStorefrontUrl`. Paginated reads include drafts and submissions; failure or missing URLs leaves Website disabled rather than guessing a hostname. The side panel retains Request attendance for unconfirmed participation. No backend or database changes are needed.
