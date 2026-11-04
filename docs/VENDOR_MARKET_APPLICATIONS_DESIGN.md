# Vendor market applications

The Applications view lives at `/vendor/markets#applications`. The existing `/vendor/applications` entry opens the same workspace, retaining its header, segmented menu and AdminShell. The supplied image is a visual reference; the requested columns and workflows govern this implementation.

## Reuse

`MarketApplications.tsx` composes the existing Farmstand panel, table, search, select, button, link and icon adapters plus shared SearchSelect, Field, Badge, Pagination and read/empty states. It reuses the overview's layout and detail-panel styles. `MarketsSummary.tsx` extracts the overview's existing metric composition so both views share it. Application selection and discovery are feature compositions because no existing component combines discovery results, application records and authoritative next-step links. No UI primitive, library or competing standard is added.

The requested full table columns are an explicit feature composition. They do not change the default record-summary table policy elsewhere. Native tables remain keyboard-scrollable on narrow screens. Positioning the feature's existing scroll wrapper relatively contains the absolute table caption and prevents it from enlarging the document at tablet widths. Colors use existing palette/status tokens. No breadcrumbs, eyebrow labels or numbered sections are introduced.

## Behavior

- Discovery starts with at most three markets. View more markets changes the same section to ten results per page, with shared pagination. It does not navigate. Search is debounced by 250 milliseconds, and city changes and searches reset the page. The city combobox searches supplied market cities locally, without an unrelated geography lookup.
- Discovery columns are Market, Location, Next market, Application deadline, Apply and Website. Location contains city/state only. No season, application status or market-type filter is rendered. Dates use the supplied timezone. Missing next dates/deadlines are labeled explicitly. Apply retains a safe backend-supplied form URL; Website uses a validated market origin.
- Applications show only Market, Location, Submitted date, Status and Action. Search, status and submission-date/name sorting act on the vendor's complete paginated application read. Drafts and submissions with the same numeric ID remain separate. Counts cover all loaded records and do not change when the table is filtered. Drafts display Not submitted, with their last-saved date in the preview. Submitted date uses the submission record's `createdAt`, never its latest update timestamp.
- Application pages show ten records. Native preview buttons and row-surface clicks select the details panel, while row actions navigate directly to the next step. Selection follows the current table page/filter. Per-row details are read in batches of at most six, only for the ten visible records. Loading or failed detail reads retain safe application-review links and a shared retry state.
- Awaiting-response information requests link to their existing request anchors. Accepted applications use the first backend onboarding step marked Action needed with a usable vendor destination. Otherwise Review acceptance opens the existing application detail. Pending applications offer review status, waitlisted records offer updates, and current drafts continue through the existing market handoff. Retired drafts open their saved read-only preview.
- The side panel always includes a next-step action, Open application and View market for a selected record. Missing website origins retain a disabled View market button. Open application opens saved draft answers for drafts, and the existing complete detail controller for submissions. Current draft previews now explain that the draft is editable through continuation; retired forms retain their existing warning.
- Acceptance never implies approved membership, attendance, compliance or a booth assignment. Navigation does not submit commands. Individual application withdrawal, information responses and continuation keep their existing controllers and backend authority.
- No private market-manager notes or category/season facts are invented from the reference image.

Draft discard moves from the former application cards to the saved-draft preview reached through Open application. It uses the same shared Dialog/Button primitives, explicit confirmation, revision-bound `DISCARD_DRAFT` command and uncertain-outcome guidance. This small draft-specific composition is necessary because the former shared list keeps that control inside its complete list controller, rather than exporting a standalone draft action. No draft is discarded merely by opening or previewing it.

## Missing API, intentionally deferred

The developer chose to build the UI and document the API gaps, without editing the sibling backend project. No live discovery request is fabricated and no privileged management directory is used as a substitute. `VendorService.marketDiscovery` is optional. Live service construction leaves it unset, showing a clear unavailable state while saved applications remain usable.

The proposed adapter contract is in `market-applications-data.ts`:

```ts
interface MarketDiscoveryApi {
  cities(): Promise<Array<{ value: string; label: string }>>;
  search(input: {
    search: string;
    city: string;
    skip: number;
    take: number;
  }): Promise<{ items: DiscoverableMarket[]; totalItems: number }>;
}
```

Backend work must supply a vendor-authorized/public discovery projection with stable market IDs, market names, authoritative city/state, safe website and application-form destinations, next scheduled public date/timezone, and the current application deadline/timezone. City options must be unique city/state choices with attached discoverable markets, never a general city directory. Filtering and totals must cover the full eligible set before pagination. `take` must support 3 and 10, with bounded search and pagination inputs. The backend must own visibility, open/closed application availability and next-date eligibility. The frontend adapter must use existing transport/context conventions once that endpoint exists.

Existing applicant list/detail reads do not expose authoritative city/state. Their frontend row interface has optional `city` and `state` fields for additive metadata. Until supplied by the backend, the application location displays Location unavailable. It is never parsed from a street address, venue name, application answers or market name. Market photographs and applicant-visible manager notes are also absent from the contract, so the existing decorative market icon and actual next-step guidance are used.

## Local validation

- `tests/market-applications.test.tsx` covers three-to-ten expansion, inline pagination, city options, exact columns, draft identity/date handling, complete reads, filters, next-step destinations and safe fallbacks.
- Existing overview, information-response and Loyalty dashboard tests cover the retained workflows and extracted summary consumer.
- `scripts/check-market-applications.mjs` injects synthetic read-only data into AdminShell. It blocks API and external requests, checks accessibility, overflow and inline pagination at 1800, 1280, 768 and 390 pixels, and saves screenshots to `.tmp/market-applications-preview`.
- Admin production build passes. Repository-wide TypeScript checking still reports existing errors in LoyaltyDashboard, table-navigation and unrelated application-review/layout test fixtures; the new Applications files have no reported TypeScript errors.

Run the local admin through `npm run demo:market-operations:admin`, then visit `/vendor/markets#applications`. To run the checks, use `npx vitest run tests/market-applications.test.tsx tests/markets-workspace.test.tsx` and `node scripts/check-market-applications.mjs` with the local admin server running. If Playwright's sandbox lookup differs from the installed browser cache, set `PLAYWRIGHT_BROWSERS_PATH` to the existing local cache before the browser check.

No backend files, migrations or persistent test database records are changed.

## Changed local files

- `apps/admin/src/vendor/MarketApplications.tsx`, `market-applications-data.ts` and `market-applications.css`: discovery, application records, next-step selection and detail preview.
- `apps/admin/src/vendor/MarketsWorkspace.tsx` and `MarketsSummary.tsx`: Applications integration and reused summary composition.
- `apps/admin/src/vendor/service.ts`: optional discovery adapter contract, deliberately not connected in the live service.
- `apps/admin/src/vendor/application-continuation.tsx`: truthful current/retired draft preview and existing continuation destination.
- `packages/api/src/applicant-applications.ts`: optional city/state metadata.
- `packages/ui/src/index.tsx`: re-export the existing shared application status formatter.
- `tests/market-applications.test.tsx` and `scripts/check-market-applications.mjs`: behavior and local browser verification.
- `COMPONENT_USAGE_GUIDE.md`, `docs/VENDOR_MARKETS_OVERVIEW_DESIGN.md` and this document: reuse and deferred API documentation.
