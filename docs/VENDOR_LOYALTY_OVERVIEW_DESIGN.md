# Vendor loyalty overview

The [leaderboard extension](VENDOR_LOYALTY_LEADERBOARD_DESIGN.md) supersedes the leaderboard routing and presentation statements below: overview and leaderboard now share this workspace and menu, with fragment-based in-page switching. The original overview behavior remains intact.

The November 3, 2026 redesign applies only to the existing loyalty overview at `/vendor/loyalty`. Rewards, reward creation/editing, leaderboard and redemption subpages retain their existing controllers and presentation. AdminShell suppresses its generic heading only on the overview so the page can supply the requested star and title without duplicate headings or breadcrumbs.

`LoyaltyDashboard.tsx` composes existing FarmstandPanel, FarmstandButton, FarmstandLink and FarmstandSelect adapters, UtilityIcon, Dialog, Alert and vendor read states. No existing composition supplied the requested program summary and single-metric area chart. The feature-owned SVG chart is necessary because the existing finance chart owns financial units, report types and finance-specific interactions. It uses existing theme tokens, keeps daily zeros, recalculates rounded integer Y-axis ticks for every metric, supports negative values and adjusts its width and label density to its container. Pointer inspection is supplemented by the shared daily-values dialog for keyboard and screen-reader access.

`LoyaltyMenu` is the explicitly requested new menu selector. It is a bounded route-navigation variant with real links, modifier-click support and current-page semantics. In-page Tabs cannot replace route destinations, and existing underline route tabs do not provide the requested inset segmented appearance. It adds no universal tab approval or competing button primitive. The original subpage navigation remains unchanged.

The existing customer-detail star artwork is reused, alongside the supplied users-round and gift artwork. Existing utility icons cover the leaderboard, calendar and other controls. Ordinary actions reuse the existing buttons. There is no Program Settings action because no such settings destination exists in this feature.

`OrdersDateRange` is reused directly with optional subject wording and a 366-day limit. Existing Orders consumers retain their original behavior and unrestricted range selection. Loyalty requests use inclusive UTC dates through the existing exclusive next-day boundary. Cancel preserves the current range. Selecting another metric does not issue another report request.

Data remains authoritative. The API's member count, net issued points and orders using rewards are lifetime metrics. Those labels remain truthful rather than presenting them as active members, monthly issuance or a count of individual redemption events. The bottom totals are summed from the selected activity period. Prior-period percentages are omitted because a prior-period report has not been loaded. No screenshot sample numbers or invented growth figures are used.

Program enable/pause still uses the existing API with permission checks, pending protection, safe errors and a fresh read after success. Create Reward points to the existing wizard. No API, backend, schema, migration, seed or persistent database change is introduced.

Validation:

- `npx vitest run tests/loyalty-dashboard.test.tsx tests/loyalty.test.tsx tests/orders-workspace.test.tsx`
- `npm run build --workspace @market/admin`
- Focused ESLint and Prettier checks on changed source, test and browser-check files.
- `node scripts/check-loyalty-dashboard.mjs` with the existing local admin server and installed Playwright browser. This check blocks backend and external traffic, injects in-memory loyalty fixtures and verifies desktop/mobile layouts, overflow, Axe accessibility, metric scaling, custom dates, daily values, pause/enable and the existing Rewards destination. Screenshots are saved in `.tmp/loyalty-dashboard-preview`.

Whole-project TypeScript is currently blocked by existing errors in `packages/ui/src/table-navigation.ts` and unrelated application/layout test fixtures. The boundary check is blocked by an existing undeclared `@market/config` import in `packages/ui/src/ApplicantApplications.tsx`.
