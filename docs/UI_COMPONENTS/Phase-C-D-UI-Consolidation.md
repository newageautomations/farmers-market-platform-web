# Phase C/D: Dashboard and approved presentation consolidation

Implementation date: 2026-10-14. **Implementation complete; developer manual review pending.** Phase B's developer-reported visual acceptance is recorded separately in its existing report and the registry. It does not certify additional native browser lifecycle behavior.

## Overview

This combined task implements DSH-01, SID-01 and HDR-01, followed by all twelve approved Phase D categories. The existing AdminShell, Phase A presentation helpers and controls, Phase B Dialog, market StatusBadge, vendor DataTable, customer empty states/KPI tiles and shared Spinner/Tabs/Pagination are the foundations. No design IDs or pending categories were selected or changed.

`packages/ui/src/presentation.ts` provides renderer-neutral classes, common icon paths and a DOM-only native-menu enhancer. It imports no React, services, privileges, authentication or API clients. Shared React DashboardFrame/DashboardMenu live in `packages/ui/src/dashboard.tsx`. Native Astro adapters in `apps/storefront/src/components/ui/` consume the same contract. CustomerLayout remains Astro SSR with its existing islands; it never imports AdminShell, AdminApp or administrative services.

Existing primitives were extended rather than duplicated. The new frame/menu adapters are necessary because the former AdminShell combined presentation with React role routing, while Astro needs native slots. The new Astro EmptyState shares existing EMP-02 classes because a React-only export would require unnecessary hydration. InvoiceTable is a local TBL-03 presentation adapter because shared Table applies the ordinary TBL-02 design. Separate status helpers contain only feature-owned presentation mappings and preserve unknown labels with neutral tones.

## Baseline and inventory

The workspace started with extensive modified and untracked work: Phase A/B, customer accounts, commerce, API projections, operational editors, tests and documentation. Task edits were compared against a temporary snapshot of the actual working files, not clean HEAD. Existing work was preserved. Temporary bookkeeping is removed at completion.

Mandatory reading used the current files under `docs/UI_COMPONENTS/`: audit profiles/category tables and architecture risks, migration plan Phase C/D, second-round decisions, Phase A foundations/remediation/alignment contract, Phase B record, root AGENTS.md and UI_COMPONENTS.md. Historical documents' stale `docs/` links were resolved to the existing files; audit and gallery files were not modified.

The source inventory below classifies direct React and native consumers. Shared delegates also migrate their existing consumers without redundant source rewrites. MIGRATE means ordinary source presentation changed; ALREADY COMPLIANT means existing markup/components consume the consolidated foundation. Retained specialists are listed explicitly below. No ordinary consumer is classified as a specialist merely to avoid migration. Read/error/query/command controllers remain feature-owned.

Main conflicts removed or narrowed:

- The independent customer brand, KPI, section-toolbar, search and pager appearances.
- Separate 600px mobile navigation and market 767px menu visibility rules.
- Market-only sidebar/navigation styles and broad role-based alert overrides.
- Ordinary table minimum widths of 640px/580px, duplicate table wrapper surfaces and market row hover overrides.
- Duplicate booth/canvas disclosure surfaces and indicators, ordinary filter button stretching and catalog button margins.
- Designer span styling overriding status colors and contextual button hover styling overriding ordinary tabs.

The retained invoice's 640px natural baseline and editor/saved-layout geometry are explicitly separate from ordinary table/surface cleanup.

## Phase C implementation

| Category | Implementation                                                                                                       | Coverage and exception                                                                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DSH-01   | Shared DashboardFrame and native Astro slot adapter use the existing admin-shell/main/content structure.             | Platform, Vendor, Market and Customer. AdminShell owns current routing, role grants and service boundaries.                                                                                         |
| SID-01   | Common width/padding/background, text/icons, grouping, current/hover/focus treatment and collapse/subpage animation. | CustomerNavigation supplies only its five existing customer links. Market collapse/inert behavior remains. Admin and customer icons share the same common SVG paths.                                |
| HDR-01   | Common topbar slots, branding, borders, padding and action layout.                                                   | Existing account/workspace controls stay in their caller. The full-screen editor keeps its own header, save/version/dirty controls and canvas geometry; no duplicate ordinary header is introduced. |

Direct integration files are AdminShell, NavigationIcon, CustomerLayout, CustomerNavigation and the new frame/menu adapters. Shared styles own the approved common presentation; role styles retain their business content layouts. Customer queries, identity, order projections, follows and upcoming events were not changed.

## Phase D implementation

Every row below has **FOUNDATION COMPLETE / CONSUMER MIGRATION COMPLETE / DEVELOPER MANUAL REVIEW PENDING**.

| Category          | Approved standard     | Implemented changes                                                                                                                                                                                                                                                                                   | Retained specialists                                                                                                                                                   | Status   |
| ----------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Disclosures       | DDN-03                | Existing ui-disclosure foundation reused for native ordinary and nested disclosures. Each surface has its own summary, border, indicator, padding and content wrapper. Dropdown delegates; existing expansion/draft mounting stays intact.                                                            | CRD-04/DDN-02 saved-layout and occurrence-choice animated cards retain appearance, hover, lazy mounting and inert behavior.                                            | Complete |
| Status            | BDG-02                | Badge accepts a supplied tone; market StatusBadge uses shared classes. Vendor order, Vendor relationship, customer purchase and management meanings stay in separate feature maps. Readiness/operational labels use actual existing facts.                                                            | BDG-03 booth labels/colors/map cues remain; only decorative pill dots removed. BDG-04 cards/content/calculations remain. Non-status tags keep their tag contract.      | Complete |
| Alerts            | ALT-01                | Success, partial, warning, error, info and neutral variants; safe ErrorState/ErrorBoundary and native account/customer/commerce feedback share styling. Severity does not determine role/live urgency. Stable empty live regions avoid blank feedback surfaces where their existing message is empty. | Field-validation text remains the existing FLD contract. Outcome uncertainty, partial responses, retries, locks and safe messages stay feature-owned. No toast system. | Complete |
| Empty states      | EMP-02                | Shared React and native Astro heading/action contracts plus existing native class adapters. Empty lists, table rows, carts, catalogs and customer sections use supplied contextual copy/actions. Customer nested headings are configurable.                                                           | Missing configuration, unavailable purchases, API failures and loading remain distinct feature states, never converted to empty success.                               | Complete |
| Loading           | LOD-01                | Existing Spinner ring animates with one shared keyframe. ReadState and applicable pending displays delegate; reduced motion disables animation.                                                                                                                                                       | Skeleton remains a separate placeholder. Text-only progress, retry/error wrappers, stale projections and busy locks remain.                                            | Complete |
| Tables            | TBL-02                | DataTable moved to shared UI with vendor/market compatibility exports. Native captions, scopes and sort announcements remain. Ordinary cells wrap with smaller/lighter text, white/off-white striping and shared hover/focus treatment.                                                               | TBL-03 invoice and genuinely wide financial analytics use keyboard-accessible constrained scrolling. Invoice details below.                                            | Complete |
| Statistics        | KPI-01                | Shared linked/static tile typography, spacing and surfaces on customer/platform/vendor summaries and occurrence/billing statistics. Existing supplementary facts remain visible, accessible to keyboard and touch.                                                                                    | No hover-only tooltip, synthetic score, thresholds, combined currencies or recalculated business totals. Definition-list semantics remain.                             | Complete |
| Filters           | FIL-01 through FIL-05 | Existing five forms retain their models. Phase A field/action tracks align date/search/select controls and natural-width primary actions. Public/customer GET forms share the same classes, including discovery Search.                                                                               | SEL-02 status choice and SEL-07 combobox retain their own approved behavior. Domain query/filter/sort/paging controllers remain distinct.                              | Complete |
| Tabs              | TAB-01                | Stronger labels, lighter hover underline, clear selected state; explicit non-submit buttons, roving keyboard navigation and disabled-item skipping. Billing catalog route tabs use real RouteLink anchors with current-page state.                                                                    | TAB-02 remains exclusively the layout editor. Ordinary action/navigation links retain BTN/NAV semantics rather than receiving tab roles.                               | Complete |
| Pagination        | PAG-01                | Secondary Previous, shared spacing/labels and supplied totals/ranges. Management Pager receives actual item counts; empty/final ranges are truthful. Native catalog/customer links preserve query builders and independent regions.                                                                   | Cursor pages without a global count show only their actual page count. PAG-03 totals/ranges and all paging controllers remain.                                         | Complete |
| Mobile navigation | MOB-01                | One right-aligned native hamburger disclosure contains role navigation and the single existing account toolbar, account/business controls, refresh and logout. React/Astro share the enhancer and classes.                                                                                            | Customer native POST logout; administrative callback logout; permission filtering and editor header are retained.                                                      | Complete |
| Section headings  | SCH-03 / SCH-01       | Shared SectionHeader level/variant/action slots and native section-title classes. Dashboard sections retain CRD-02; consumer sections retain native structure. Customer lists use appropriate nested heading levels.                                                                                  | PGH/h1 typography is unchanged. Product/line-item/editor specialists retain their content hierarchy and constraints.                                                   | Complete |

### Invoice allocation and exceptional overflow

The original invoice has no explicit description-column percentage. Its table uses natural content allocation, 0.9rem text and 0.4rem cell padding, with the original Market table minimum of 640px. Guessing 50% or subtracting twenty percentage points would misrepresent that baseline.

InvoiceTable first lays out the same native caption/thead/tbody at that natural baseline, reads the four actual header widths, and allocates **0.8 times the measured description width**. It distributes the released width equally among the other three columns. Container-width changes trigger remeasurement; zero-width hidden content waits for a measurable layout. All original descriptions and monetary rendering stay in Billing unchanged. The DOM test uses a deliberately supplied 300/100/100/100 baseline, expecting 240/120/120/120; this verifies arithmetic, not actual browser geometry.

Print CSS returns to the original natural allocation. The invoice retains a labelled, focusable scroll region on narrow screens, preserving readable description/quantity/unit-price/amount columns. Vendor analytics totals/dimensions also retain constrained scrolling because their many independent financial/count columns would become unreadable when divided across a phone. No columns, values, headers or row order are hidden, truncated or converted into cards. Ordinary operational/product/customer/tenant tables wrap without these minimum widths.

## Responsive and mobile implementation

The shared dashboard boundary is **767px and below mobile, 768px and above desktop**. This resolves the prior 601px to 767px split. The existing 800px desktop sidebar density rule (240px to 190px), 600px form-control wrapping contract and public storefront/editor breakpoints remain separate.

The topbar has one hamburger on the right at mobile widths. Required existing actions live inside its scrollable native disclosure. Desktop hides the summary and mobile links and leaves the same toolbar open in the topbar. AccountModes is mounted once, avoiding duplicate IDs, duplicate account requests and lost selection across viewport changes. Menus do not implement ARIA menu roles for ordinary links/forms.

Native details/summary supplies keyboard/touch expansion. The shared enhancer synchronizes aria-expanded, closes on Escape with summary focus return, closes local unmodified navigation with main focus, preserves modifier clicks, and handles focus before hiding navigation on a viewport change. Native Astro SSR initially emits the disclosure open so all links/actions remain usable without JS; the enhancer initializes mobile collapsed and desktop open. With JS disabled, mobile starts expanded and the native summary still toggles it. No React hydration was added to customer layouts.

Customer logout remains `POST /api/account` with hidden `action=logout` and an explicit native submit button. Administrative logout remains the existing onLogout callback. Customer menu destinations are exactly the original account sections plus the existing Visit storefront/Explore markets action. There is no new account-switching capability or administrative customer link.

## Preserved functional boundaries

Protected calls and native form/command handlers were compared against the working-source baseline. Customer authentication/session handling, customer queries/follows/order history, role/tenant/grant authority, AdminContext bootstrap, cart ownership, checkout orchestration, Stripe/local payment, exact financial formatting, inventory, market scheduling, fulfillment, application commands and layout geometry/publishing remain in their original layers. No backend, API/schema/generated, configuration, dependency or lockfile edits were made by this task.

Phase A's `--ui-control-height: calc(3rem + 2px)` remains authoritative, including natural-width actions and wrapping gaps. Phase B's `packages/ui/src/dialog.tsx` is unchanged: native lifecycle, focus restoration, busy/dirty guards, drawer behavior, animation, native footer submission and primary/secondary 0.8rem spacing are preserved. Existing dialog regression cases were rerun as compatibility checks; they do not prove native top-layer behavior.

## Testing

All checks used `FRONTEND_NO_EVIDENCE=true`.

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npm run typecheck
npx vitest run tests/phase-cd-presentation.test.tsx tests/admin.test.tsx tests/customer-dashboard.test.ts tests/vendor.test.tsx tests/market-dashboard.test.tsx tests/dialog-lifecycle.test.tsx
npx tsx scripts/check-boundaries.ts
git diff --check
```

- TypeScript passed. Initial Astro diagnostics identified six presentation-only errors (dynamic heading tag types and nullable display offset); fixed and reran only the failed workspace check: `npm run typecheck --workspace @market/storefront`, **82 files, zero errors/warnings/hints**. Targeted `npx tsc --noEmit` checks passed after final TSX refinements.
- Grouped Vitest run: **114 passed, one assertion failed** because Vendor KPI markup now separates its label/value. Updated that existing assertion to verify the same labelled value. Reran only `tests/vendor.test.tsx -t 'keeps Overview core reads usable without analytics'`: passed.
- Final count/focus review added two management empty/final-page cases. Reran only `tests/phase-cd-presentation.test.tsx -t 'actual management pager count|retains control state'`: three passed, including the existing focus/state case. Total: **117 distinct passing focused cases** across the six selected files. No unresolved failure remains. JSDOM logged its unsupported document navigation for a deliberately unprevented modifier click; no browser or network navigation was performed.
- Boundaries: **nine workspaces valid**. Scope review confirms shared presentation has no administrative service imports and package exports need no manifest/config change.
- Protected-call/form-handler comparison and unchanged-dialog comparison passed. Final source review covered 74 changed app files with zero protected-call/form-handler differences. Shared dialog source is unchanged. Final TypeScript and scoped CSS parser checks passed, and git diff --check passed (including the existing tracked working tree). The eight new source files and new tests were inspected directly because git diff omits untracked files.

Limitations: menu widths in DOM tests exercise state decisions, not computed CSS geometry. Customer SSR tests inspect source structure/security boundaries; they do not execute live authentication or POST logout. Invoice widths are mocked for the ratio test. Native focus/inert/top-layer behavior, no-JS rendering, visual contrast, table readability, long names, reduced motion and print output require developer review. No screenshot, browser automation, gallery harness, evidence directory, full unit/E2E suite, build, live signup/SMS, purchase/payment mutation or backend seeding was run.

## Manual review checklist

Use the existing local servers/data. If needed: `npm run dev:admin` and `npm run dev:storefront`. No deployment step is required.

| Role/routes                                                                                                                          | Inspect                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform `/platform/tenants`, existing overview/billing/integrations                                                                 | Shell/sidebar/header, actual KPI totals, tenant/readiness badges, wrapping tables, filters, range/Previous states and mobile account controls.                                    |
| Vendor `/vendor/products`, `/vendor/orders`, `/vendor/orders/{actualId}`, `/vendor/inventory`                                        | Product/order statuses, remote filtering, exact values, ordinary tables, independent nested disclosures, empty/loading/retry states and mobile navigation.                        |
| Market `/market`, `/market/vendors`, `/market/settings`, `/market/occurrences`, `/market/application-submissions`, `/market/layouts` | Section titles, statuses, filter alignment, paging, disclosure padding, retained saved-layout hover/motion and existing DLG-02 footer geometry.                                   |
| Market `/market/booth-billing/{actualOccurrenceId}`                                                                                  | Natural baseline versus 0.8 description target, space for quantity/unit-price/amount headings, full descriptions, exact totals, keyboard overflow and unchanged print allocation. |
| Customer `/account`, `/account/orders`, `/account/markets`, `/account/vendors`, `/account/settings`                                  | Shared shell, only customer links, correct identity/order/follow/event data, KPI/empty states, discovery Search alignment, native no-JS navigation and actual POST logout.        |
| Public `/products`, existing Vendor storefront and Market occurrence catalog, `/cart`                                                | Consumer headings, all native GET fields and query values, counts/real pagination links, alerts/empty/loading states and complete mobile content.                                 |
| Editor `/market/layouts/{actualId}/edit`                                                                                             | Single specialized header, version/save/dirty actions, retained TAB-02 panels, canvas dimensions, disclosure controls, status colors and dialog compatibility.                    |

Check **390, 600, 601, 767, 768 and 1280px**, long labels, 200% zoom, reduced motion and keyboard/touch use. Confirm one visible navigation system, right-aligned hamburger, reachable role-specific controls, clean focus after Escape/navigation/resizing, no customer admin links, readable wrapping tables and aligned natural-width Search actions. Modal primary/secondary buttons must retain matching heights, primary first, natural widths and 0.8rem gaps. Inspector/canvas and invoice print geometry especially need real-browser review.

## Final implementation status

| Approved category     | Foundation | Ordinary consumers | Retained specialists                                   | Manual review |
| --------------------- | ---------- | ------------------ | ------------------------------------------------------ | ------------- |
| DSH-01                | Complete   | Complete           | React role/SSR adapters, full-screen editor            | Pending       |
| SID-01                | Complete   | Complete           | Permission-filtered links, Market collapse/inert       | Pending       |
| HDR-01                | Complete   | Complete           | Full-screen editor controls                            | Pending       |
| DDN-03                | Complete   | Complete           | CRD-04/DDN-02                                          | Pending       |
| BDG-02                | Complete   | Complete           | BDG-03/BDG-04, non-status tags                         | Pending       |
| ALT-01                | Complete   | Complete           | Feature outcomes and inline field validation           | Pending       |
| EMP-02                | Complete   | Complete           | Failures/unavailable/configuration facts stay distinct | Pending       |
| LOD-01                | Complete   | Complete           | Skeleton, read/retry controllers, text progress        | Pending       |
| TBL-02                | Complete   | Complete           | TBL-03 and wide financial projections                  | Pending       |
| KPI-01                | Complete   | Complete           | Supplied facts/counts/currencies                       | Pending       |
| FIL-01 through FIL-05 | Complete   | Complete           | All five controllers, SEL-02/SEL-07                    | Pending       |
| TAB-01                | Complete   | Complete           | TAB-02, real route links                               | Pending       |
| PAG-01                | Complete   | Complete           | PAG-03, cursor/offset/native adapters                  | Pending       |
| MOB-01                | Complete   | Complete           | Native POST and React callback logout                  | Pending       |
| SCH-03 / SCH-01       | Complete   | Complete           | Consumer/dashboard variants, PGH unchanged             | Pending       |

No known ordinary consumer remains blocked. These are source implementation statuses, not developer visual acceptance or native runtime certification. The registry still records **20 approved designs and 27 pending selections**, with all historical candidate IDs preserved. Only approved implementation tracking and developer-reported Phase B acceptance were updated. No commits, pushes, remote branches, PRs, deployments, hosting or external services were used.

## Source coverage and changed files

The final inventory is appended below. Paths are relative to the repository root. Each row groups the source consumers in one file; foundational exports and retained-specialist reasons are described above rather than counted as rendered instances.

Source sites below are literal component/class references, not rendered instances or runtime certification. A native menu's details is MOB, saved-layout AnimatedDisclosure is retained DDN-02/CRD-04, the designer-tabs reference is TAB-02, and booth-state is BDG-03. Those explicit specialist reasons override a file's ordinary MIGRATE classification only for those named surfaces. Shared wrappers/classes account for their unchanged direct consumers.

| Source file                                                                     | Category references                                                    | Classification                      |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| apps/admin/src/AdminApp.tsx                                                     | ALT (3), LOD (2)                                                       | ALREADY COMPLIANT (shared delegate) |
| apps/admin/src/AdminShell.tsx                                                   | DSH (1), SID (1), HDR (1), ALT (1), EMP (2), LOD (2), MOB (1), SCH (1) | MIGRATE                             |
| apps/admin/src/FeaturePanel.tsx                                                 | ALT (1)                                                                | ALREADY COMPLIANT (shared delegate) |
| apps/admin/src/main.tsx                                                         | ALT (1)                                                                | ALREADY COMPLIANT (shared delegate) |
| apps/admin/src/management/AccountOnboardingReview.tsx                           | EMP (1), LOD (1)                                                       | MIGRATE                             |
| apps/admin/src/management/billing.tsx                                           | BDG (1), EMP (2), LOD (1), SCH (3)                                     | MIGRATE                             |
| apps/admin/src/management/catalog.tsx                                           | BDG (1), EMP (1), LOD (1), TAB (1), PAG (1), SCH (1)                   | MIGRATE                             |
| apps/admin/src/management/common.tsx                                            | BDG (2), PAG (1), SCH (2)                                              | MIGRATE                             |
| apps/admin/src/management/payments.tsx                                          | BDG (1), LOD (1), SCH (2)                                              | MIGRATE                             |
| apps/admin/src/management/platform.tsx                                          | BDG (5), EMP (1), LOD (4), TBL (1), KPI (1), FIL (1), PAG (1), SCH (3) | MIGRATE                             |
| apps/admin/src/management/pos.tsx                                               | DDN (2), BDG (4), EMP (1), LOD (2), SCH (3)                            | MIGRATE                             |
| apps/admin/src/market/analytics.tsx                                             | ALT (2), EMP (1), LOD (2), TBL (1), FIL (2), PAG (1)                   | MIGRATE                             |
| apps/admin/src/market/CommandForm.tsx                                           | ALT (3), SCH (1)                                                       | MIGRATE                             |
| apps/admin/src/market/common.tsx                                                | ALT (3), LOD (1), FIL (1)                                              | MIGRATE                             |
| apps/admin/src/market/generation-status.tsx                                     | BDG (1), ALT (2)                                                       | MIGRATE                             |
| apps/admin/src/market/OccurrenceMap.tsx                                         | ALT (1), LOD (1), SCH (1)                                              | MIGRATE                             |
| apps/admin/src/market/occurrences.tsx                                           | BDG (2), EMP (1), LOD (3), TBL (1), FIL (1), PAG (1)                   | MIGRATE                             |
| apps/admin/src/market/operations.tsx                                            | BDG (3), EMP (3), LOD (2), TBL (2), FIL (1), PAG (2)                   | MIGRATE                             |
| apps/admin/src/market/overview.tsx                                              | BDG (1), EMP (2), LOD (2), TBL (1), SCH (2)                            | MIGRATE                             |
| apps/admin/src/market/phase14/ApplicationBuilder.tsx                            | BDG (1)                                                                | ALREADY COMPLIANT (shared delegate) |
| apps/admin/src/market/phase14/ApplicationReview.tsx                             | ALT (4), SCH (1)                                                       | MIGRATE                             |
| apps/admin/src/market/phase14/Applications.tsx                                  | BDG (2), EMP (2), TBL (2)                                              | MIGRATE                             |
| apps/admin/src/market/phase14/Assignments.tsx                                   | DDN (2), ALT (1), KPI (1), FIL (4), SCH (3)                            | MIGRATE                             |
| apps/admin/src/market/phase14/Billing.tsx                                       | BDG (1), TBL (1), KPI (1), SCH (1)                                     | MIGRATE                             |
| apps/admin/src/market/phase14/Directory.tsx                                     | BDG (1), ALT (2), SCH (2)                                              | MIGRATE                             |
| apps/admin/src/market/phase14/InvoiceTable.tsx                                  | TBL (1)                                                                | FOUNDATION / ADAPTER                |
| apps/admin/src/market/phase14/LayoutInspector.tsx                               | DDN (1), BDG (1)                                                       | MIGRATE                             |
| apps/admin/src/market/phase14/LayoutLayers.tsx                                  | DDN (1)                                                                | MIGRATE                             |
| apps/admin/src/market/phase14/Layouts.tsx                                       | HDR (1), DDN (2), BDG (3), EMP (2), TAB (1)                            | MIGRATE                             |
| apps/admin/src/market/phase14/OccurrenceLayoutActions.tsx                       | DDN (1), ALT (4)                                                       | MIGRATE                             |
| apps/admin/src/market/phase14/OperationsRoutes.tsx                              | ALT (2), LOD (2)                                                       | MIGRATE                             |
| apps/admin/src/market/presentation.tsx                                          | BDG (1)                                                                | MIGRATE                             |
| apps/admin/src/market/settings.tsx                                              | BDG (1), ALT (1), LOD (1)                                              | ALREADY COMPLIANT (shared delegate) |
| apps/admin/src/market/vendors.tsx                                               | BDG (9), EMP (4), LOD (5), TBL (4), FIL (3), PAG (4), SCH (1)          | MIGRATE                             |
| apps/admin/src/vendor/analytics.tsx                                             | ALT (5), EMP (2), LOD (3), TBL (2), FIL (1), PAG (1)                   | MIGRATE                             |
| apps/admin/src/vendor/booths.tsx                                                | BDG (1), ALT (1), EMP (1), LOD (1), SCH (1)                            | MIGRATE                             |
| apps/admin/src/vendor/catalog.tsx                                               | DDN (1), BDG (1), EMP (1), LOD (2), TBL (2), FIL (2), PAG (1)          | MIGRATE                             |
| apps/admin/src/vendor/common.tsx                                                | ALT (6), LOD (1), SCH (1)                                              | MIGRATE                             |
| apps/admin/src/vendor/customers.tsx                                             | BDG (5), EMP (2), LOD (3), TBL (3), FIL (2), PAG (2), SCH (2)          | MIGRATE                             |
| apps/admin/src/vendor/inventory.tsx                                             | EMP (1), LOD (1), TBL (1), PAG (1)                                     | MIGRATE                             |
| apps/admin/src/vendor/markets.tsx                                               | BDG (7), ALT (4), EMP (2), LOD (6), TBL (4), FIL (2), PAG (1), SCH (3) | MIGRATE                             |
| apps/admin/src/vendor/orders.tsx                                                | DDN (1), BDG (7), EMP (1), LOD (2), TBL (3), FIL (2), PAG (1), SCH (1) | MIGRATE                             |
| apps/admin/src/vendor/overview.tsx                                              | LOD (6), KPI (3), SCH (2)                                              | MIGRATE                             |
| apps/storefront/src/components/CentralAccount.astro                             | DDN (2), ALT (6), SCH (1)                                              | MIGRATE                             |
| apps/storefront/src/components/Checkout.tsx                                     | ALT (14), SCH (2)                                                      | MIGRATE                             |
| apps/storefront/src/components/CommunicationPreferences.tsx                     | ALT (2), SCH (1)                                                       | MIGRATE                             |
| apps/storefront/src/components/CustomerEvents.astro                             | BDG (1), EMP (1), SCH (1)                                              | MIGRATE                             |
| apps/storefront/src/components/CustomerFollows.astro                            | SCH (1)                                                                | MIGRATE                             |
| apps/storefront/src/components/CustomerOrders.astro                             | BDG (1), EMP (1), SCH (2)                                              | MIGRATE                             |
| apps/storefront/src/components/MarketApplication.tsx                            | ALT (2), SCH (2)                                                       | MIGRATE                             |
| apps/storefront/src/components/MarketCart.tsx                                   | ALT (6), EMP (1), SCH (4)                                              | MIGRATE                             |
| apps/storefront/src/components/MarketHome.astro                                 | EMP (2), SCH (2)                                                       | MIGRATE                             |
| apps/storefront/src/components/MarketPublicHome.astro                           | ALT (1), EMP (1), PAG (1), SCH (1)                                     | MIGRATE                             |
| apps/storefront/src/components/MarketPurchase.tsx                               | ALT (6)                                                                | MIGRATE                             |
| apps/storefront/src/components/ProductCards.astro                               | SCH (1)                                                                | MIGRATE                             |
| apps/storefront/src/components/ProductPurchase.tsx                              | ALT (4)                                                                | MIGRATE                             |
| apps/storefront/src/components/PurchaseDetail.astro                             | BDG (2), SCH (1)                                                       | MIGRATE                             |
| apps/storefront/src/components/PurchaseSuccess.tsx                              | ALT (2)                                                                | MIGRATE                             |
| apps/storefront/src/components/ResilientSurfaces.tsx                            | ALT (5)                                                                | ALREADY COMPLIANT (shared delegate) |
| apps/storefront/src/components/ui/DashboardMenu.astro                           | DDN (1), MOB (2)                                                       | FOUNDATION / ADAPTER                |
| apps/storefront/src/components/ui/EmptyState.astro                              | EMP (1)                                                                | FOUNDATION / ADAPTER                |
| apps/storefront/src/components/VendorCart.tsx                                   | ALT (6), EMP (1), SCH (3)                                              | MIGRATE                             |
| apps/storefront/src/components/VendorHome.astro                                 | ALT (1), EMP (1), SCH (1)                                              | MIGRATE                             |
| apps/storefront/src/layouts/CustomerLayout.astro                                | DSH (1), SID (3), HDR (1), ALT (2), MOB (1)                            | MIGRATE                             |
| apps/storefront/src/pages/account/admin-phone.astro                             | ALT (4)                                                                | MIGRATE                             |
| apps/storefront/src/pages/account/communications.astro                          | ALT (2)                                                                | MIGRATE                             |
| apps/storefront/src/pages/account/index.astro                                   | EMP (2), KPI (1), SCH (12)                                             | MIGRATE                             |
| apps/storefront/src/pages/account/login.astro                                   | ALT (6)                                                                | MIGRATE                             |
| apps/storefront/src/pages/account/onboarding/[role].astro                       | ALT (2)                                                                | MIGRATE                             |
| apps/storefront/src/pages/account/orders/index.astro                            | PAG (1)                                                                | MIGRATE                             |
| apps/storefront/src/pages/account/orders/[id].astro                             | ALT (2)                                                                | MIGRATE                             |
| apps/storefront/src/pages/account/phone.astro                                   | ALT (2)                                                                | MIGRATE                             |
| apps/storefront/src/pages/account/recover.astro                                 | ALT (2)                                                                | MIGRATE                             |
| apps/storefront/src/pages/account/settings.astro                                | SCH (2)                                                                | MIGRATE                             |
| apps/storefront/src/pages/account/sign-in.astro                                 | ALT (4)                                                                | MIGRATE                             |
| apps/storefront/src/pages/account/signup.astro                                  | ALT (2)                                                                | MIGRATE                             |
| apps/storefront/src/pages/account/verify.astro                                  | ALT (6)                                                                | MIGRATE                             |
| apps/storefront/src/pages/account/[section].astro                               | EMP (2), FIL (2), PAG (3), SCH (3)                                     | MIGRATE                             |
| apps/storefront/src/pages/apply/[...applicationSlug].astro                      | ALT (1)                                                                | ALREADY COMPLIANT (shared delegate) |
| apps/storefront/src/pages/auth/claim.astro                                      | ALT (2)                                                                | MIGRATE                             |
| apps/storefront/src/pages/cart.astro                                            | ALT (1)                                                                | ALREADY COMPLIANT (shared delegate) |
| apps/storefront/src/pages/index.astro                                           | ALT (1)                                                                | ALREADY COMPLIANT (shared delegate) |
| apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro                | ALT (1), EMP (1), FIL (2), PAG (1), SCH (2)                            | MIGRATE                             |
| apps/storefront/src/pages/occurrences/[occurrenceId]/map.astro                  | ALT (1)                                                                | ALREADY COMPLIANT (shared delegate) |
| apps/storefront/src/pages/occurrences/[occurrenceId]/products/[variantId].astro | ALT (1)                                                                | ALREADY COMPLIANT (shared delegate) |
| apps/storefront/src/pages/products/index.astro                                  | ALT (1), EMP (1), FIL (2), PAG (1), SCH (1)                            | MIGRATE                             |
| apps/storefront/src/pages/products/[slug].astro                                 | ALT (1)                                                                | ALREADY COMPLIANT (shared delegate) |
| packages/ui/src/dashboard.tsx                                                   | DDN (1), MOB (2)                                                       | FOUNDATION / ADAPTER                |
| packages/ui/src/index.tsx                                                       | DDN (1), BDG (1), ALT (3), EMP (1), TBL (2), TAB (1), PAG (2)          | MIGRATE                             |
| packages/ui/src/MarketMap.tsx                                                   | DDN (1), BDG (1)                                                       | MIGRATE                             |

### Task-touched source files

87 existing source/presentation files changed and 8 new source adapters/helpers were created. This is a comparison with the working-source baseline, including pre-existing untracked files.

- apps/admin/src/AdminShell.tsx
- apps/admin/src/NavigationIcon.tsx
- apps/admin/src/management.css
- apps/admin/src/management/AccountOnboardingReview.tsx
- apps/admin/src/management/billing.tsx
- apps/admin/src/management/catalog.tsx
- apps/admin/src/management/common.tsx
- apps/admin/src/management/payments.tsx
- apps/admin/src/management/platform.tsx
- apps/admin/src/management/pos.tsx
- apps/admin/src/management/status-presentation.ts
- apps/admin/src/market.css
- apps/admin/src/market/CommandForm.tsx
- apps/admin/src/market/OccurrenceMap.tsx
- apps/admin/src/market/analytics.tsx
- apps/admin/src/market/common.tsx
- apps/admin/src/market/dashboard.css
- apps/admin/src/market/generation-status.tsx
- apps/admin/src/market/occurrences.tsx
- apps/admin/src/market/operations.tsx
- apps/admin/src/market/overview.tsx
- apps/admin/src/market/phase14/ApplicationReview.tsx
- apps/admin/src/market/phase14/Applications.tsx
- apps/admin/src/market/phase14/Assignments.tsx
- apps/admin/src/market/phase14/Billing.tsx
- apps/admin/src/market/phase14/Directory.tsx
- apps/admin/src/market/phase14/InvoiceTable.tsx
- apps/admin/src/market/phase14/LayoutInspector.tsx
- apps/admin/src/market/phase14/LayoutLayers.tsx
- apps/admin/src/market/phase14/Layouts.tsx
- apps/admin/src/market/phase14/OccurrenceLayoutActions.tsx
- apps/admin/src/market/phase14/OperationsRoutes.tsx
- apps/admin/src/market/phase14/designer.css
- apps/admin/src/market/presentation.tsx
- apps/admin/src/market/vendors.tsx
- apps/admin/src/phase15.css
- apps/admin/src/phase15b.css
- apps/admin/src/vendor.css
- apps/admin/src/vendor/analytics.tsx
- apps/admin/src/vendor/booths.tsx
- apps/admin/src/vendor/catalog.tsx
- apps/admin/src/vendor/common.tsx
- apps/admin/src/vendor/customers.tsx
- apps/admin/src/vendor/inventory.tsx
- apps/admin/src/vendor/markets.tsx
- apps/admin/src/vendor/orders.tsx
- apps/admin/src/vendor/overview.tsx
- apps/admin/src/vendor/status-presentation.ts
- apps/storefront/src/components/CentralAccount.astro
- apps/storefront/src/components/Checkout.tsx
- apps/storefront/src/components/CommunicationPreferences.tsx
- apps/storefront/src/components/CustomerEvents.astro
- apps/storefront/src/components/CustomerFollows.astro
- apps/storefront/src/components/CustomerNavigation.astro
- apps/storefront/src/components/CustomerOrders.astro
- apps/storefront/src/components/MarketApplication.tsx
- apps/storefront/src/components/MarketCart.tsx
- apps/storefront/src/components/MarketHome.astro
- apps/storefront/src/components/MarketPublicHome.astro
- apps/storefront/src/components/MarketPurchase.tsx
- apps/storefront/src/components/ProductCards.astro
- apps/storefront/src/components/ProductPurchase.tsx
- apps/storefront/src/components/PurchaseDetail.astro
- apps/storefront/src/components/PurchaseSuccess.tsx
- apps/storefront/src/components/VendorCart.tsx
- apps/storefront/src/components/VendorHome.astro
- apps/storefront/src/components/purchase-status.ts
- apps/storefront/src/components/ui/DashboardFrame.astro
- apps/storefront/src/components/ui/DashboardMenu.astro
- apps/storefront/src/components/ui/EmptyState.astro
- apps/storefront/src/layouts/CustomerLayout.astro
- apps/storefront/src/pages/account/[section].astro
- apps/storefront/src/pages/account/admin-phone.astro
- apps/storefront/src/pages/account/communications.astro
- apps/storefront/src/pages/account/index.astro
- apps/storefront/src/pages/account/login.astro
- apps/storefront/src/pages/account/onboarding/[role].astro
- apps/storefront/src/pages/account/orders/[id].astro
- apps/storefront/src/pages/account/orders/index.astro
- apps/storefront/src/pages/account/phone.astro
- apps/storefront/src/pages/account/recover.astro
- apps/storefront/src/pages/account/settings.astro
- apps/storefront/src/pages/account/sign-in.astro
- apps/storefront/src/pages/account/signup.astro
- apps/storefront/src/pages/account/verify.astro
- apps/storefront/src/pages/auth/claim.astro
- apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro
- apps/storefront/src/pages/products/index.astro
- apps/storefront/src/styles/customer-dashboard.css
- apps/storefront/src/styles/vendor.css
- packages/ui/src/MarketMap.tsx
- packages/ui/src/dashboard.tsx
- packages/ui/src/index.tsx
- packages/ui/src/presentation.ts
- packages/ui/src/styles.css

Tests: tests/phase-cd-presentation.test.tsx (new), tests/vendor.test.tsx (one KPI semantic assertion). Documentation: this report, UI_COMPONENTS.md (approved implementation tracking), docs/UI_COMPONENTS/Phase-B-Dialog-Consolidation.md (developer-reported acceptance). Original audit/gallery, AGENTS.md, Phase A and migration/decision documents remain unchanged.

## Post-Implementation Foundation Refinements - 2026-10-14

The developer considers the implemented foundation sufficient for feature development. This bounded follow-up corrects desktop/header consistency and table striping; final design polishing and manual review of these refinements remain pending.

- Platform, Market and Vendor now use the existing React shell collapse state with the shared Lucide `panel-left` SVG path, BTN-01 icon sizing, Collapse sidebar/Expand sidebar labels and expanded/inert state. The icon is supplied by the renderer-neutral navigation path contract.
- CustomerLayout reuses the native Button adapter and shared sidebar-toggle presentation, with a small native enhancer rather than React hydration. Existing customer links and active state remain. Without JavaScript, the enhancement button stays hidden and the sidebar remains usable.
- The customer desktop action group shows a single disabled Customer account-mode select, using the existing shared account-control layout and SEL-03 presentation. CustomerLayout has no authorized affiliation data. Existing central/merchant settings-page workspace links remain available; no new API, authorization inference or account-switching controller was introduced. Shared base account-mode CSS moved from the admin-only stylesheet into shared UI CSS.
- Shared TBL-02 even-row striping is now `#f2f4f2`, previously `#fafbf9`. White rows, hover/focus, selected states, text, borders, row actions and table semantics remain. TBL-03 invoice/printing, wide financial scrolling and unrelated surfaces were preserved.
- Root [COMPONENT_USAGE_GUIDE.md](../../COMPONENT_USAGE_GUIDE.md) documents all 20 approved categories, actual exports/native adapters, React/Astro examples, dashboard and alignment rules, dialogs, specialists, 27 pending categories and a feature checklist. UI_COMPONENTS.md remains the authoritative design registry.
- Root AGENTS.md gained one short instruction to read the guide and consult the registry, reuse the documented shared components/adapters and preserve specialist/authority boundaries without approving pending categories.
- MOB-01 keeps the same right-aligned hamburger, menu implementation, role navigation, toolbar and secure customer POST logout at 767px and below. Desktop panel controls and customer read-only mode are hidden on mobile. The shared menu enhancer returns focus to its summary when a focused desktop toggle disappears at the existing breakpoint.

Task-touched files: `apps/admin/src/AdminShell.tsx`, `apps/admin/src/account-modes.css`, `apps/storefront/src/layouts/CustomerLayout.astro`, `packages/ui/src/presentation.ts`, `packages/ui/src/styles.css`, `tests/phase-cd-presentation.test.tsx`, root `COMPONENT_USAGE_GUIDE.md`, root `AGENTS.md`, root `UI_COMPONENTS.md` and this report. Existing work is preserved.

Verification used `FRONTEND_NO_EVIDENCE=true`. `npm run typecheck` passed, including 82 Astro files with zero errors, warnings or hints. The single focused `npx vitest run tests/phase-cd-presentation.test.tsx` invocation passed 22 cases and found one whitespace-sensitive source assertion after Astro formatting. The assertion now permits formatting whitespace; rerunning only that case with `-t 'keeps customer native SSR slots'` passed. All 23 distinct focused cases pass, including three-role keyboard collapse, shared panel/mobile icon contracts, native customer collapse/focus/state, POST logout/current-only account presentation, existing menus/tables and invoice allocation. `npx tsx scripts/check-boundaries.ts` passed for nine workspaces. `git diff --check` passed. Final Git/hash comparison with the task-start working files found exactly the ten intended changed files and no removals; all other pre-existing files, including the Phase B lifecycle, are unchanged. Source comparison confirms one AGENTS.md paragraph, five registry implementation-only additions with all selections intact, and an append-only update to this report. DOM/source checks do not establish visual acceptance or actual browser geometry.

Manual check: at 768px and above, inspect the panel icon, keyboard collapse/expand, customer header/control alignment and ordinary row contrast. At 767px and below, verify one right-aligned hamburger with the existing actions. Check keyboard focus across that breakpoint, customer settings handoffs and existing POST sign-out. Confirm invoice/print appearance and wide tables are unaffected. **Developer manual review remains pending.**

No authentication, session, role/grant, backend/API, commerce, payment or domain logic was changed. No screenshots, evidence directories, browser automation/suites, UI gallery, full unit/E2E suite, builds, live login/payment tests, commits, pushes, PRs or deployments were performed.
