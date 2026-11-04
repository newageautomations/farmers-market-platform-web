# Vendor upcoming market dates

`/vendor/markets#upcoming-dates` lists scheduled dates for the vendor's approved market memberships. It uses the same layout as the Applications view: summary cards, a filtered native table with pagination, and a sticky details panel for the selected row.

## Reuse and scope

`UpcomingMarketDates.tsx` composes the existing Farmstand panels, table, search/select controls, buttons, links and icons, along with the shared Field, Badge, Alert, Dialog, EmptyState and read states. It also reuses:

- `MarketsSummary` for the cards. It gains an optional `className` (used for the four-card grid) and a `danger` tone. Existing consumers are unchanged.
- `MarketsPagination` for the footer, ten rows per page.
- The Applications layout and row classes (`market-applications-columns`, `market-applications-main`, `market-applications-list`, `market-application-name`, `market-application-status-content`, `market-application-facts`, `market-application-details`). This gives the same row hover underline, keyboard row selection, chevron cell, right-panel field/value grid and responsive stacking. The selected row also gets the existing `market-application-selected` background.
- `ApplicationStatusBadge`, an alias export of the existing Applications status badge.
- `PackingBadge`, now exported from `packing.tsx`.

A feature composition is needed because no existing component combines memberships, occurrences, participations, booth assignments, application status and packing progress for a date list. `market-dates.css` holds only the four-card grid, the danger stat tone, the four-filter grid, the six-column table width, and location and packing cell layout. No new primitive or UI standard is introduced.

## Data and behavior

- `readUpcomingMarketDates` uses `readMarketsOverview`: only `approved` memberships, scheduled occurrences that have not started, within a 90-day bounded query, in batches of six memberships. Pending, suspended and withdrawn memberships contribute no dates.
- Attendance maps participation as follows: `confirmed` is Attending, `planned` is Tentative, `cancelled` is Not attending, and no participation is Needs RSVP.
- Booth labels come from `boothAssignments()` (gated by `ReadOwnVendorIdentity`) and are joined by occurrence ID. If that read fails or is unavailable, the page shows Unavailable, never Not assigned.
- Application status and city/state come from the existing applicant-application read. Per market, the current submission is preferred, then the current draft, then the newest record. Without city/state, Location falls back to the occurrence venue.
- Filters cover search (market, venue, location, booth, date), market, range (next 7/30/60/90 days, default 30) and attendance. The summary cards follow the selected range only. Changing a filter resets to page one.
- The table has no packing indicator. The details panel shows the selected date's packing status and units through `PackingBadge`. Packing is read only when `packing.occurrences()` lists that date, so no packing row is created for dates the vendor cannot pack. Packing list links to `/vendor/orders/packing?occurrence=<id>`. It is disabled when no packing list exists yet, and hidden without `ReadOwnOrders`.
- Mark attending and Not attending call the existing `attendance` command with the participation's current version, preserving its pickup instructions and preorder override. Not attending asks for confirmation in a shared Dialog first. Both buttons are hidden without `ManageOwnMarketParticipation`. If a save fails, the page reloads the authoritative state and shows an error. View market opens the existing membership detail route.
- Physical check-in is unchanged and remains on `/vendor/day`.

No API, backend, migration or persistent database change is required.

## Local validation

- `tests/upcoming-market-dates.test.tsx` covers approved-only listing, no packing in the table, range and attendance filters, the packing side panel and its link, attendance commands with version preservation, read-only authority, and optional booth reads.
- The existing `tests/markets-workspace.test.tsx` overview tests are unchanged.
