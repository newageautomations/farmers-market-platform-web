# Settings and Integrations consolidation plan

Status: **implemented (November 5, 2026).** Frontend-only; no migrations, no change to `vendure_demo_market_ops`.
Implementation notes: the Payments panel keeps the "Marketplace Stripe Connect" title and Notifications keeps "Notification preferences" so existing names and e2e selectors carry over. Under 600px the Settings menu wraps onto rows of three (`--workspace-tabs-narrow`), because five labels overflow at 375px. The Clover return link now reads "Return to Payments settings". Fixture mode supplies no POS, notification or management services, so those tabs only appear against the live backend.
Decisions are recorded in section 8 (Payments and POS stay two tabs; Subscription stays its own sidebar entry; Preferences is the vendor default tab; a shared `WorkspaceFrame` is extracted first).

Goal: one **Settings** workspace per role, with tabs inside it, built the same way Finances was
(single sidebar entry, `WorkspaceMenu` tabs, URL-driven view, tabs filtered by permission, role-specific
content passed in as slots). Integrations stops being a separate destination.

## 1. What exists today

### Sidebar entries (`packages/admin-core/src/index.ts:239-350`)

| Role | Entries |
| --- | --- |
| Vendor | Settings, Integrations, Integrations > Payments, Integrations > POS (plus Subscription, Website as separate entries) |
| Market | Settings (plus Subscription, Storefront Appearance) |
| Platform | Integrations, Settings |

### What each page really renders

| Route | Renders | Source |
| --- | --- | --- |
| `/vendor/settings` | Dashboard colors, account time zone, business notification preferences, **then** a link hub (Taxes, Payment Integrations, Stripe Connect, POS, Subscription) | `AdminShell.tsx:431-458`, `ManagementRoutes.tsx:68-104` |
| `/vendor/integrations` | The **same link hub** again (duplicate of the bottom of Settings) | `management/routes.ts` falls through to the hub |
| `/vendor/integrations/payments` | Marketplace Stripe Connect (test/live) | `management/payments.tsx` |
| `/vendor/integrations/pos` | POS provider catalog, connections, runtime state | `management/pos.tsx` |
| `/vendor/settings/payments` | Square + Clover (owner only), titled "Payment Integrations" | `vendor/square.tsx`, `vendor/clover.tsx` |
| `/vendor/settings/taxes` | Tax rates | `vendor/tax.tsx` |
| `/market/settings` | Dashboard colors, account time zone, market notification preferences, market configuration form | `AdminShell.tsx`, `market/settings.tsx` |
| `/platform/settings` | Dashboard colors, account time zone, **the whole Integrations readiness panel**, a note, a link to access policies | `ManagementRoutes.tsx:47-60` |
| `/platform/integrations` | Readiness panel (duplicate of the above) | `management/platform.tsx:74` |

### The problems this plan fixes

1. Vendor has two overlapping hubs (Settings and Integrations) that link to each other's children.
2. "Payments" means two unrelated things in two places: **Stripe Connect** under Integrations, **Square/Clover** under Settings.
3. POS provider catalog (Integrations > POS) and Square/Clover (Settings > Payment Integrations) are the same providers, shown on different pages.
4. Platform Settings embeds the entire Integrations page, so the sidebar shows the same content twice.
5. Settings is one long stack of cards composed inside `AdminShell`, not a workspace, so each section can't be navigated to or linked.
6. Settings pages use the generic `PageHeader` plus ad hoc paragraphs, not the heading and tab pattern Finances uses.
7. Business notification preferences (`NotificationPreferences`) and the personal inbox settings (`/notifications/settings`) are both called "notification settings" with no explanation of the difference.

## 2. Target structure

Same shape as Finances: one sidebar entry, tabs inside, default tab first, unauthorized tabs omitted.

### Vendor: `/vendor/settings`

| Tab | Route | Content | Gate |
| --- | --- | --- | --- |
| Preferences | `/vendor/settings` | Dashboard colors, account time zone | `ReadOwnVendorIdentity` |
| Notifications | `/vendor/settings/notifications` | `NotificationPreferences` (business document notifications) | same; write still needs `ManageOwnStorefront` |
| Taxes | `/vendor/settings/taxes` (exists) | `VendorTaxSettings` | `ManageOwnCatalog` |
| Payments | `/vendor/settings/payments` (exists) | Sections: Marketplace Stripe Connect, Square, Clover | tab visible if `ReadOwnPaymentAccount` or owner `ManageOwnPosIntegrations`; each section keeps its own gate |
| POS | `/vendor/settings/pos` | POS provider catalog and connections | `ReadOwnPosIntegrations` |

Sidebar loses `Integrations`, `Payments`, `POS`. The hub page is deleted; its two caveat sentences
("POS connection does not establish physical inventory authority", "Stripe connection does not qualify shopper
payment confirmation") move into the Payments and POS tabs where they belong.

### Market: `/market/settings`

| Tab | Route | Content |
| --- | --- | --- |
| Market | `/market/settings` | Market configuration form (`market/settings.tsx`), the actual business setting, so it is the default |
| Preferences | `/market/settings/preferences` | Dashboard colors, account time zone |
| Notifications | `/market/settings/notifications` | Market notification preferences |

Market has no integration pages today. QuickBooks already lives in Finances and stays there.

### Platform: `/platform/settings`

| Tab | Route | Content |
| --- | --- | --- |
| Preferences | `/platform/settings` | Dashboard colors, account time zone |
| Integrations | `/platform/settings/integrations` | `PlatformIntegrations` readiness panel |
| Access policies | link only | Existing link to `/platform/billing/policies` becomes a short note on the Integrations tab, not a tab (it is Billing catalog content) |

Sidebar loses `Integrations`.

### Deliberately left out of scope (recommended)

- **Subscription** (`/vendor/billing`, `/market/billing`): different permission, purpose and data. Keep as its own entry; Settings may link to it.
- **Website / Storefront Appearance**: already its own editor workspace.
- **QuickBooks**: consolidated into Finances already. Do not duplicate; optionally show a one-line "connected" status that links there.
- **Team**: unchanged.
- **`/notifications/settings`**: personal inbox settings, unchanged. Add one sentence on the Notifications tab pointing to it.

## 3. Routing and compatibility

Legacy URLs keep working (Finances did this for `/analytics`): the route resolver accepts them and
`history.replaceState`s to the new one.

| Old | New |
| --- | --- |
| `/vendor/integrations` | `/vendor/settings` |
| `/vendor/integrations/payments` | `/vendor/settings/payments` |
| `/vendor/integrations/pos` | `/vendor/settings/pos` |
| `/platform/integrations` | `/platform/settings/integrations` |

**Must not move:** `/vendor/settings/clover-return` and `/vendor/pos/square-return`. These are OAuth redirect
URIs registered with the providers (also hard-coded in `scripts/clover-browser.ts`). Their handlers stay as separate
routes and `routeAllowed` rules stay as they are.

Code touch points:
- `packages/admin-core/src/index.ts`: remove three vendor nav items and one platform item, update the vendor `order` array, add `routeAllowed` rules for the new subroutes, keep the existing `taxes`/`payments`/`clover-return` rules.
- `apps/admin/src/management/routes.ts`: `isManagementRoute` matches the new settings subroutes.
- `apps/admin/src/AdminShell.tsx`: remove the stacked Appearance/Timezone/Notification blocks and the special `Payment Integrations` title; skip `PageHeader` for settings paths like Finances does.
- `apps/admin/src/management/ManagementRoutes.tsx`: delete the hub; route to the new workspace.

## 4. Components

Reuse before creating (AGENTS.md reuse rules):

- **Tabs:** `WorkspaceMenu` (`apps/admin/src/WorkspaceMenu.tsx`), exactly as Finances and Loyalty use it.
- **Heading, panels, buttons:** `FarmstandIcon`, `FarmstandPanel`, `markets-workspace` / `markets-heading` classes from `markets-workspace.css`.
- **Sections inside a tab:** existing `Card` + `ui-section-title-dashboard`.
- **Forms:** unchanged `CommandForm`, `TaxRateField`, `SearchSelect`.

Two new components:

1. **`WorkspaceFrame`** (`apps/admin/src/WorkspaceFrame.tsx`, next to `WorkspaceMenu`). Approved extraction. It owns the
   `<div className="markets-workspace">` + `<header className="markets-heading">` (icon, `h1`, subtitle, optional actions slot)
   + `WorkspaceMenu` (rendered only when more than one tab) + content region. Existing consumers that duplicate this
   markup today: `Finances.tsx:277-338` (adds `finance-heading` / `finance-workspace` classes, an actions slot, and the
   `--finance-tabs` CSS variable) and `vendor/MarketsWorkspace.tsx:67-95` (no extras). `LoyaltyDashboard` uses
   `WorkspaceMenu` with its own `loyalty-menu` heading and is **not** migrated.
   Props: `{ icon, title, description, menuLabel, tabs, value, onChange, actions?, className?, children }`.
   Extra classes and the tab-count variable are passed through so Finances renders identically.
2. **`SettingsWorkspace`** (`apps/admin/src/settings/SettingsWorkspace.tsx`), built on `WorkspaceFrame`. It takes
   `{ scope, path, tabs }` where each tab is `{ value, label, icon, node }`; the shell and role route files supply the
   nodes, and it resolves the requested tab from the URL, falling back to the first allowed tab (same as
   `Finances` `tabs.some(...) ? requested : 'overview'`).

Why existing components were not enough: nothing shared owns the "heading + tab list + permission-filtered view + slots"
contract; Finances and Markets each inline it. `WorkspaceMenu` covers only the tab strip.

`WorkspaceFrame` rules: migrate Finances and MarketsWorkspace only (bounded; no Loyalty, no other refactoring),
and prove no visual change with before/after screenshots at desktop, tablet and 375px plus the existing
`finance.test.tsx` / `markets-workspace.test.tsx`.

Also: extract `SquarePaymentIntegration` / `CloverPaymentIntegration` / `Payments` into one `PaymentsTab` composition
with three `Card` sections and no new primitives. Note `vendor/square.tsx` reads `code`/`state` from the URL on
mount for OAuth, so the Payments tab must mount on `/vendor/settings/payments` with the query intact.

Check `COMPONENT_USAGE_GUIDE.md` / `UI_COMPONENTS.md` before building, and add `SettingsWorkspace` to the registry
with the reason above. Verify `dl`/`dd` rows (POS capability details, Readiness) against the label/value alignment
rule in AGENTS.md in the browser if their markup changes.

## 5. Phases

Each phase leaves the app working and shippable.

0. **`WorkspaceFrame` extraction (no visual change).** Create the component, migrate `Finances` and `MarketsWorkspace` to it, and prove identical output (screenshots + existing tests). Ship before anything below, so a Finances regression is isolated from Settings work.
1. **Route model (no visual change).** admin-core nav + `routeAllowed` + `isManagementRoute` accept the new paths; legacy redirects; update `tests/admin.test.tsx`, `tests/management.test.tsx`.
2. **Settings workspace shell.** `SettingsWorkspace` on `WorkspaceFrame`; move Preferences and Notifications out of `AdminShell` for all three roles; Market form becomes the Market tab. Vendor default tab is Preferences.
3. **Vendor Payments and POS (two tabs).** Combine Stripe Connect, Square, Clover into the Payments tab; move POS to its own `/vendor/settings/pos` tab; delete the hub and the three sidebar entries. Subscription stays a separate sidebar entry. Update `tests/square.test.tsx`, `tests/clover.test.tsx` (OAuth return routes must still pass).
4. **Platform.** Fold Integrations into Settings; drop the sidebar entry.
5. **Cleanup and docs.** Remove dead code (`PlatformIntegrations` duplicate render, hub JSX, special-cased titles), register `WorkspaceFrame` and `SettingsWorkspace` in `UI_COMPONENTS.md` and `COMPONENT_USAGE_GUIDE.md` with the reuse rationale, correct stale route references in `docs/`.

## 6. Verification

- Unit: nav per role/permission (owner vs staff vs analytics-only), each tab hidden without its grant, direct URL to a forbidden tab falls back to the first allowed tab (backend remains the authority), every legacy URL redirects, OAuth return routes unchanged.
- E2E: update `platform-admin-live.spec.ts` (lines ~169, 493, 587), `ui-refinement-live.spec.ts` (settings at each width), `notifications-live.spec.ts` (market settings), `market.spec.ts`.
- Browser pass at desktop, tablet and 375px: tab bar wraps/scrolls like Finances, active tab matches URL, keyboard and `aria-current`.
- Run the automated checks only against disposable databases. **Do not touch `vendure_demo_market_ops`**; no schema work is involved.

## 7. Risks

- Tabs unmount their content, so an unsaved `CommandForm` draft is lost on tab switch (same as Finances). Acceptable; consider a dirty-state confirm only if the Market form proves painful.
- The Payments tab merges three permission models (`ReadOwnPaymentAccount` read, owner-only `ManageOwnPosIntegrations`, `ManageOwnPaymentAccount`). Sections must hide independently, and the tab must not show empty.
- Bookmarked URLs and the e2e suites reference the old routes; the redirect layer covers users, the test updates cover the suites.
- Staff without owner access will lose a visible but disabled "Payment Integrations" warning page; they will simply not see that section.

## 8. Decisions (resolved)

1. **Payments and POS:** two separate tabs.
2. **Subscription:** stays its own sidebar entry for now; revisit later.
3. **Vendor default tab:** Preferences.
4. **Shared frame:** extract `WorkspaceFrame` first (Phase 0), migrating Finances and MarketsWorkspace only. Loyalty keeps its own heading.
