# Component usage guide

Read this before implementing or significantly changing frontend UI. Reuse approved components before introducing feature-local replacements. [UI_COMPONENTS.md](UI_COMPONENTS.md) is the authoritative design-decision registry; this guide describes current imports and practical usage, not new approvals.

The UI foundation from Phases A through D is established for feature development. Final design polishing may happen later. There are **20 approved and implemented categories**, retained specialists with intentional interactions, and **27 categories pending developer selection**. Implementation does not establish manual visual acceptance. Historical source descriptions in the registry record the approval baseline; use the current implementations below.

## Quick reference

React symbols below are named exports from `@market/ui`, implemented in [packages/ui/src/index.tsx](packages/ui/src/index.tsx), with form controls in [form-controls.tsx](packages/ui/src/form-controls.tsx), dashboards in [dashboard.tsx](packages/ui/src/dashboard.tsx), and dialogs in [dialog.tsx](packages/ui/src/dialog.tsx). Pure helpers are named exports from `@market/ui/presentation`, implemented in [presentation.ts](packages/ui/src/presentation.ts). All approved presentation uses `@market/ui/styles.css`, already loaded by the application entry/layout.

Astro adapters are default imports from `apps/storefront/src/components/ui/`; use the relative path appropriate to the caller. CSS classes are presentation contracts, not exported React components.

| Category              | Approved component                                           | Source/import                                                                                                                                                                                 | Important variants                                                                                                                             |
| --------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| BTN-01                | `Button`; native Button adapter; action anchors              | `@market/ui`; `components/ui/Button.astro`; `buttonClassName` from `@market/ui/presentation`                                                                                                  | `variant`: primary, secondary, destructive, disclosure; `size`: default, compact; `iconOnly`, `loading`; explicit native submit                |
| INP-02                | `Input` with existing `inputContract`; native input classes  | `@market/ui`; `inputClassName` from `@market/ui/presentation`                                                                                                                                 | Ordinary text-like inputs; native constraints and controlled/default values; OTP is INP-03                                                     |
| SEL-03                | `Select`, `SelectField`; native select classes               | `@market/ui`; `selectClassName` from `@market/ui/presentation`                                                                                                                                | Ordinary or status presentation; optional/required; native multiple/size semantics; SEL-07 remains separate                                    |
| CRD-02                | `Card`; native semantic card classes                         | `@market/ui`; `cardClassName` from `@market/ui/presentation`                                                                                                                                  | `as`: div, article, section, li, fieldset; `spacing`: block/contained; `padding`: default/none; `surface`: card/embedded                       |
| DLG-02                | `Dialog`, `Drawer`, `DialogProps`                            | `@market/ui`                                                                                                                                                                                  | Wide 900px default; standard 480px; Drawer defaults standard; `busy`, `beforeClose`, `focusTitle`, description, actions, render-prop dismissal |
| DSH-01                | `DashboardFrame`; native frame adapter                       | `@market/ui`; `components/ui/DashboardFrame.astro`; `dashboardClasses`                                                                                                                        | React sidebar/header/children and `collapsed`; Astro sidebar/header/default slots; role controllers remain separate                            |
| SID-01                | Shared sidebar classes and icon paths                        | `dashboardClasses`, `navigationIconPaths`, `installDashboardSidebarToggle` from `@market/ui/presentation`; AdminShell and CustomerNavigation adapters                                         | Role-owned links, active/grouped navigation, collapse/inert state; desktop `panel-left` icon; no standalone Sidebar export                     |
| HDR-01                | Shared topbar presentation                                   | `dashboardClasses.header`; AdminShell; `layouts/CustomerLayout.astro`                                                                                                                         | Context/title beside desktop toggle, one action toolbar; existing account controls; specialist editor header retained                          |
| DDN-03                | `Dropdown`; native details presentation                      | `@market/ui`; `disclosureClassName` from `@market/ui/presentation`; `.ui-disclosure-content`                                                                                                  | Native ordinary/nested disclosures; feature-owned expansion/drafts; saved-layout animation remains DDN-02                                      |
| BDG-02                | `Badge` with supplied tone; native status classes            | `@market/ui`; `statusBadgeClassName` from `@market/ui/presentation`                                                                                                                           | success, warning, danger, info, neutral; without `tone`, Badge retains non-status tag appearance                                               |
| ALT-01                | `Alert`, `ErrorState`, `ErrorBoundary`; native alert classes | `@market/ui`; `alertClassName` from `@market/ui/presentation`                                                                                                                                 | success, partial, warning, error, info, neutral; live urgency is separate from severity                                                        |
| EMP-02                | `EmptyState`; native empty-state adapter                     | `@market/ui`; `components/ui/EmptyState.astro`; `.empty-state`                                                                                                                                | Title, explanation, contextual action; React `level` defaults 3, Astro defaults 2; choose hierarchy explicitly                                 |
| LOD-01                | `Spinner`, separate `Skeleton`                               | `@market/ui`; `.progress`, `.spinner`, `.skeleton` in shared CSS                                                                                                                              | Spinner `label`; reduced motion; retain read/retry and request-lock controllers                                                                |
| TBL-02                | `DataTable`, `Table`, `TableHead`, `TableBody`               | `@market/ui`; vendor/market common re-export DataTable; `.ui-table`, `.table-scroll` for native adapters                                                                                      | Caption/scopes, supplied `sort` announcement, ordinary wrapping; `wide` opt-in only for justified accessible overflow                          |
| KPI-01                | CSS tile contract on native markup                           | `.ui-kpi-grid` in shared CSS; existing `pages/account/index.astro` and `vendor/overview.tsx` patterns                                                                                         | Static/linked tiles, dl/dt/dd, visible supplementary facts; no KPI React export                                                                |
| FIL-01 through FIL-05 | Existing five feature forms, composed from approved controls | FIL-01 `RangeForm` in `apps/admin/src/market/common.tsx`; FIL-02 vendor/management forms; FIL-03 public catalog GET forms; FIL-04 operations toolbars; FIL-05 `pages/account/[section].astro` | `.ui-control-row`, `.ui-control-row-lookup`, `.ui-field-action`; no universal FilterBar export or query controller                             |
| TAB-01                | `Tabs`; real route links with shared presentation            | `@market/ui`; `.ui-tabs` and `.ui-route-tab`; admin `RouteLink` in `vendor/common.tsx`                                                                                                        | In-page items with label/content/disabled; route links keep href/current-page state; TAB-02 editor retained                                    |
| PAG-01                | `Pagination`; existing native paging links                   | `@market/ui`; `.ui-pagination`; admin management `Pager` and existing customer/catalog adapters                                                                                               | Supplied summary, callbacks, Previous/Next labels and availability; actual counts/ranges retained                                              |
| MOB-01                | `DashboardMenu`; native menu adapter                         | `@market/ui`; `components/ui/DashboardMenu.astro`; `installDashboardMenu` from `@market/ui/presentation`                                                                                      | One right-aligned hamburger at 767px and below; desktop toolbar at 768px and above; same mounted actions                                       |
| SCH-03 / SCH-01       | `SectionHeader`; native heading classes                      | `@market/ui`; `sectionHeadingClassName` from `@market/ui/presentation`; `.ui-section-title-dashboard`, `.ui-section-title-consumer`                                                           | `variant`: dashboard/consumer; `level`: 2/3/4; `id`, action/content children; page headings remain pending                                     |

FIL source families: `apps/admin/src/vendor/{catalog,customers,orders,analytics,markets}.tsx`, `apps/admin/src/management/{platform,catalog}.tsx`, `apps/storefront/src/pages/products/index.astro`, `apps/storefront/src/pages/occurrences/[occurrenceId]/index.astro`, and `apps/admin/src/market/phase14/{Directory,Assignments}.tsx`. They retain separate query models; reuse the applicable form rather than importing a controller across role or renderer boundaries.

## React examples

These examples use current APIs. Callback and data props belong to the calling feature. Import the shared stylesheet once through the existing entry, not per control. Form labels and native semantics are retained even though the broader FLD category is pending.

Ordinary buttons, form fields, selects, cards, section headings and aligned filters:

```tsx
import type { FormEvent } from 'react';
import {
  Button,
  Card,
  Field,
  Input,
  SelectField,
  SectionHeader,
} from '@market/ui';

export function SearchFilters({
  onApply,
}: {
  onApply: (query: string, visibility: string) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onApply(String(data.get('q') ?? ''), String(data.get('visibility') ?? ''));
  }
  return (
    <Card as="section" aria-labelledby="filter-title">
      <SectionHeader title="Filter records" id="filter-title" />
      <form className="ui-control-row" onSubmit={submit}>
        <Field id="record-query" label="Search records">
          <Input id="record-query" name="q" type="search" />
        </Field>
        <SelectField
          id="record-visibility"
          name="visibility"
          label="Visibility"
        >
          <option value="">All visibility</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </SelectField>
        <div className="ui-field-action">
          <Button type="submit">Search</Button>
        </div>
        <div className="ui-field-action">
          <Button type="reset" variant="secondary">
            Reset
          </Button>
        </div>
      </form>
    </Card>
  );
}
```

The sample option values are owned by this example's callback. Real features must keep their existing backend identifiers, allowed values, validation and paging resets. `SelectField` is optional by default; set `required` only when the feature requires it. `Field` does not automatically associate errors for arbitrary children: supply `aria-invalid` and `aria-describedby` on `Input` when needed. `SelectField` supplies its error association. `Input` applies the existing name-based `inputContract`; inspect that contract before choosing field names or overriding native constraints.

Dialogs preserve native submit validation and form association. Pass existing save/pending/close policies from the feature:

```tsx
import { useId, type FormEventHandler } from 'react';
import { Button, Dialog, Field, Input } from '@market/ui';

export function EditNameDialog({
  open,
  busy,
  onClose,
  onSave,
  beforeClose,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: FormEventHandler<HTMLFormElement>;
  beforeClose?: () => boolean;
}) {
  const formId = useId();
  const nameId = useId();
  return (
    <Dialog
      open={open}
      title="Edit name"
      onClose={onClose}
      busy={busy}
      beforeClose={beforeClose}
      actions={
        <Button type="submit" form={formId} loading={busy}>
          Save
        </Button>
      }
    >
      <form id={formId} onSubmit={onSave}>
        <Field id={nameId} label="Name">
          <Input id={nameId} name="name" required disabled={busy} />
        </Field>
      </form>
    </Dialog>
  );
}
```

`onSave` keeps the existing command handling and prevents default navigation when appropriate. Dialog adds the secondary Close after `actions`. Avoid an extra independent Close footer. Use `children={(dismiss) => ...}` for embedded dismissal and preserve `showClose={false}` only when the caller already provides the whole action row.

Status, table, empty-state and pagination presentation uses caller-owned facts:

```tsx
import { Badge, DataTable, EmptyState, Pagination } from '@market/ui';
import type { StatusTone } from '@market/ui/presentation';

type Row = { id: string; name: string; statusLabel: string; tone: StatusTone };
export function Records({
  rows,
  summary,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: {
  rows: readonly Row[];
  summary: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <>
      {rows.length ? (
        <DataTable label="Records" headings={['Name', 'Status']}>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.name}</th>
              <td>
                <Badge tone={row.tone}>{row.statusLabel}</Badge>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="No records match" level={3}>
          <p>Try another search.</p>
        </EmptyState>
      )}
      <Pagination
        label="Record pages"
        summary={summary}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </>
  );
}
```

Render this branch only after a successful read; loading, denied, unavailable and failed requests retain their own states. Supply truthful `summary` from the current page/count. `sort={{ heading: 'Name', direction: 'ascending' }}` announces existing sorting; DataTable does not implement sorting. Keep status labels and tones in the existing feature mapping; approval of BDG-02 does not approve a universal enum map. An EmptyState action can be a real anchor styled with `buttonClassName({ variant: 'secondary' })` or an existing Button callback.

## Astro SSR examples

Use native adapters and pure helpers. Do not import AdminShell/AdminApp or administrative services, or hydrate a whole page just to share styles. Keep each route's existing authentication, verification, private/no-store headers, data reads, URLs and session authority outside presentation examples.

The following markup fits a file under `apps/storefront/src/pages/account/`, after its existing authenticated route setup. It demonstrates native forms and presentation; preserve the actual route's query names and values:

```astro
---
import Button from '../../components/ui/Button.astro';
import CustomerLayout from '../../layouts/CustomerLayout.astro';
import {
  buttonClassName,
  inputClassName,
  cardClassName,
  sectionHeadingClassName,
} from '@market/ui/presentation';
---

<CustomerLayout title="Followed Markets" path="/account/markets">
  <section class={cardClassName()} aria-labelledby="market-search-title">
    <header class={sectionHeadingClassName('dashboard')}>
      <h2 id="market-search-title">Find markets</h2>
    </header>
    <form method="get" action="/account/markets" class="ui-control-row">
      <div class="field">
        <label for="market-search">Search markets</label>
        <input
          id="market-search"
          name="search"
          type="search"
          maxlength="100"
          class={inputClassName('search')}
        />
      </div>
      <div class="ui-field-action">
        <Button type="submit">Search</Button>
      </div>
    </form>
    <a
      class={buttonClassName({ variant: 'secondary' })}
      href="/account/settings"
    >
      Account settings
    </a>
  </section>
</CustomerLayout>
```

Additional native snippets use these imports. Place feedback and empty-state snippets only in the existing truthful outcome branches; these are presentation examples, not unconditional success or empty-data logic:

```astro
---
import EmptyState from '../../components/ui/EmptyState.astro';
import {
  buttonClassName,
  selectClassName,
  alertClassName,
} from '@market/ui/presentation';
---

<div class="field">
  <label for="page-size">Results per page</label>
  <select id="page-size" name="take" class={selectClassName()}>
    <option value="10">10</option>
    <option value="20">20</option>
  </select>
</div>
<p role="status" class={alertClassName('success')}>
  Preferences updated.
</p>
<p role="alert" class={alertClassName('error')}>
  The request could not be completed.
</p>
<EmptyState title="No followed markets" level={3}>
  <p>Explore markets to find an upcoming event.</p>
  <a
    slot="action"
    href="/account/markets"
    class={buttonClassName({ variant: 'secondary' })}
  >
    Explore markets
  </a>
</EmptyState>
```

The select demonstrates markup only; retain the feature's supported choices and query handling. `sectionHeadingClassName('consumer')` is for consumer sections; use `.ui-section-title-dashboard` or `.ui-section-title-consumer` on an existing h2/h3/h4 when no action header wrapper is needed. Native helpers add presentation only, so preserve constraints, associated feedback IDs, names/values and autocomplete explicitly. Import only helpers actually used in the final file.

CustomerLayout composes the native DashboardFrame sidebar/header slots and DashboardMenu navigation/default slots. Keep CustomerNavigation's established role links. Its desktop sidebar enhancement does not hydrate React. The header loads authorized affiliations through the existing server-side customer account API and hydrates only the shared `AccountModeSelect` island. Admin `AccountModes` uses that same select presentation with its existing controller. Customer choices navigate to the existing purpose-bound Admin handoff; no Admin API or controller is imported into customer UI. Native links remain available without JavaScript. See [account switching and authentication](docs/ACCOUNT_SWITCHING_AUTH_ARCHITECTURE.md).

CustomerLayout already contains secure logout. Do not add a second header logout or change `POST /api/account` with hidden `action=logout` into a GET link. Native customer GET search, follow POST actions and existing account forms keep their original destinations and authority.

## Dashboard development rules

- Reuse DSH-01 DashboardFrame, SID-01 sidebar presentation and HDR-01 topbar structure. Administrative Platform/Market/Vendor dashboards remain React AdminShell consumers; customers remain Astro CustomerLayout consumers.
- Use SCH-03 ordinary internal section headings, CRD-02 cards, KPI-01 `.ui-kpi-grid`, TBL-02 ordinary tables and BDG-02 status presentation. Keep semantic heading levels and dl/table/list structures.
- Desktop sidebar controls use `navigationIconPaths['panel-left']`, BTN-01 icon sizing and `dashboardClasses.sidebarToggle`. Labels describe Collapse sidebar or Expand sidebar, with `aria-controls`, `aria-expanded` and inert collapsed navigation.
- Preserve role-specific authorization/navigation sources. Shared presentation must not import admin services or act as tenant, role, entitlement or session authority.
- Keep MOB-01: one right-aligned hamburger at 767px and below, desktop sidebar control at 768px and above. Keep the single toolbar mounted and native details/summary behavior. Do not duplicate account controls or create a second mobile menu.
- Customer account switching is available inside the same mounted toolbar on desktop and the existing mobile menu. Administrative account/workspace controls keep their existing placement and controller.
- Preserve the full-screen editor header, layout tools, dirty/save/version policies and canvas geometry. Do not force these specialists into ordinary dashboard markup.

## Permanent control alignment contract

The ordinary reference is `--ui-control-height: calc(3rem + 2px)`, 50px at a 16px root. Use border-box sizing, shared font metrics and native border/padding. Inputs and ordinary single-value selects have this outer height; ordinary buttons have the same minimum and can grow for wrapped labels. Icon/disclosure/compact specialists, OTP, textarea and native listboxes retain their own geometry.

| Existing class                 | Use                                                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.ui-inline-controls`          | Unlabelled adjacent input/action row, 0.5rem gap; flexible zero-minimum-width input and natural-width button. Labels/feedback outside the row.            |
| `.ui-control-row`              | Labelled search/filter form; Field, SelectField or compatible `.field`/`.ops-field` wrappers share label/control/feedback tracks and responsive wrapping. |
| `.ui-field-action`             | Action inside a control row, aligned to the control track; never put it in a label/helper paragraph.                                                      |
| `.ui-control-row-lookup`       | Add to `.ui-control-row` for one flexible lookup field and one natural-width action. Uses `minmax(0, 1fr) max-content`; stacks below 600px.               |
| `.ui-actions.ui-modal-actions` | Modal primary then secondary Close/Cancel; flex wrapping, equal stretched heights, 0.8rem horizontal and vertical gaps.                                   |

Keep action widths natural, `min-width: 0` on flexible fields, correct horizontal/vertical gaps and feedback associations. Do not add arbitrary negative margins, translations, full-width lookup buttons, equal-width action columns or competing contextual height rules. Semantic primary/secondary/destructive appearance is separate from geometry. See the [Phase A alignment contract](docs/UI_COMPONENTS/Phase-A-Shared-Foundations.md#c-permanent-form-control-alignment-contract).

## Dialog construction rules

Use shared Dialog/Drawer or the existing delegating MarketDialog adapter. There is no separate native Astro dialog adapter today. Reuse an existing appropriate React island for interactive dialog behavior; do not invent another lifecycle or hydrate the entire Astro page.

Keep DLG-02 native showModal, focus behavior/restoration, enter/exit animation, reduced motion, callbacks, busy protection and existing `beforeClose` veto policy. Backdrop dismissal is false by default. `focusTitle` defaults true. Parent `open=false` is authoritative; changing parent state directly bypasses guarded user dismissal, so embedded user Close controls must use the supplied `dismiss` render callback.

Primary submit/confirm precedes secondary Close. Use `actions` for the primary action and shared automatic Close, or the existing composed `.ui-actions.ui-modal-actions` pattern when the body owns its action row. Maintain equal ordinary heights, natural widths and 0.8rem gaps. Footer submitters preserve `type="submit"`, `form={formId}`, native validation, names/values and feature callbacks. Preserve existing pending and draft-discard/veto semantics rather than inventing new policy for presentation. See [Phase B](docs/UI_COMPONENTS/Phase-B-Dialog-Consolidation.md).

## Retained specialists

| Specialist                                 | Preserve                                                                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INP-03 OTP in `pages/account/verify.astro` | Six digits, paste, keyboard navigation, aggregation, autofill, verification and approved focus cue.                                                                                               |
| SEL-02 status selects                      | Exact values/labels and domain colors; shared Select `variant="status"` or `selectClassName('', 'status')` retains specialist appearance.                                                         |
| SEL-07 `SearchSelect`                      | Searchable combobox selection/keyboard/active-descendant/blur and clear behavior; placeholder is not an option. Shared export is in `@market/ui`; Market presentation re-exports it.              |
| CRD-04 / DDN-02 saved layouts              | `AnimatedDisclosure` in `apps/admin/src/market/presentation.tsx`, heading hover, animation, lazy mounting, inert state and existing operations.                                                   |
| Drawer                                     | Shared Dialog lifecycle with retained edge placement, scrolling and compact default; do not replace with a competing modal.                                                                       |
| BDG-03 booth status                        | Existing text, mapping, colors and map cues; approved decorative dot removal does not remove actual state information.                                                                            |
| TBL-03 invoice                             | `InvoiceTable` in `apps/admin/src/market/phase14/InvoiceTable.tsx`, original data/money formatting, measured description allocation, printing and accessible scrolling. Do not apply `.ui-table`. |
| Wide financial tables                      | Existing `DataTable wide` only where many independent columns require readable, labelled keyboard-accessible scrolling; do not hide or truncate data.                                             |
| TAB-02 layout editor                       | Tool/panel state, specialized tabs and route editor interactions.                                                                                                                                 |
| Map/canvas presentation                    | Existing viewport/coordinates, ResizeObserver, text alternatives, keyboard/touch controls, tooltip bounds and read/edit distinction. MAP remains pending selection.                               |
| Native Astro account/forms                 | SSR, original form actions, submitters, session/verification authority and secure POST logout.                                                                                                    |

Do not destroy specialist functionality to force reuse. Approval of a surface does not approve domain mappings, merge controllers or authorize a migration. Document why an existing primitive/adapter cannot serve a new reusable pattern before creating one; preserve the same approved presentation contract where renderer differences require native markup.

## Pending categories

**27 UI categories remain pending developer selection.** Do not choose or canonicalize them automatically. Examples include page headings, checkbox/radio behavior, quantity controls, commerce UI and account-switching controllers. Existing shared exports in these categories are reusable code, not proof of design approval. Reuse relevant existing implementations and preserve their behavior; consult the developer before introducing a competing design standard. The registry's recommendations and the migration plan do not authorize implementation.

## New feature checklist

1. Read this guide and consult UI_COMPONENTS.md.
2. Search for relevant existing approved components and consumers.
3. Use shared imports, classes and appropriate renderer adapters.
4. Preserve specialist interactions and domain logic.
5. Avoid duplicate CSS and ancestor overrides of approved variants.
6. Preserve React/Astro boundaries and backend/session authority.
7. Add only necessary focused tests and perform task-required checks.
8. Document new reusable patterns, deviations or API changes without silently approving pending categories.
