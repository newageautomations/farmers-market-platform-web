/** Fixture presentation evidence, not design decisions or production adapters. */
export interface AdditionalCandidate {
  context: 'base' | 'admin' | 'storefront' | 'customer';
  rendering: 'imported' | 'partial' | 'evidence';
  limitation: string;
  route: string;
  css: string;
  ancestor?: 'vendor' | 'management' | 'operations';
}
const shared = 'packages/ui/src/styles.css';
const market = `${shared}; apps/admin/src/market/dashboard.css; apps/admin/src/phase15b.css`;
const customer = `${shared}; apps/storefront/src/styles/customer-dashboard.css; .customer-dashboard .admin-content`;
const publicCss = `${shared}; apps/storefront/src/styles/vendor.css; apps/storefront/src/styles/market.css; apps/storefront/src/styles/checkout.css`;
export const additionalCandidates: Record<string, AdditionalCandidate> = {
  'DDN-01': {
    context: 'base',
    rendering: 'imported',
    route: 'No current app consumer; shared Dropdown export',
    css: shared,
    limitation:
      'Imported Dropdown with native details/summary. No chevron, animation or disabled API. Open manually with Enter/Space; nested Dropdown is also actual.',
  },
  'DDN-02': {
    context: 'admin',
    rendering: 'imported',
    route: '/market/layouts',
    css: market,
    limitation:
      'Imported AnimatedDisclosure. Expanded fixture state supplies defaultOpen; original chevron, lazy mount, inertness and reduced-motion CSS remain. No disabled prop.',
  },
  'DDN-03': {
    context: 'admin',
    rendering: 'partial',
    ancestor: 'operations',
    route: '/market/assignments/:id',
    css: `${market}; .ops-workspace .booth-list-item; apps/admin/src/NavigationIcon.tsx Chevron`,
    limitation:
      'Partial Assignments booth-list-item details/summary and original Chevron. AssignmentCard, invoice commands and projected booth data omitted. Native expansion is real; fixture text replaces projected values.',
  },
  'BDG-01': {
    context: 'base',
    rendering: 'imported',
    route: '/account (native span.badge in CustomerEvents)',
    css: shared,
    limitation:
      'Imported Badge and native span.badge counterpart. Text only, no severity mapping. Synthetic Active/Pending text does not imply supported status tones.',
  },
  'BDG-02': {
    context: 'admin',
    rendering: 'imported',
    route: '/market/vendors',
    css: market,
    limitation:
      'Imported StatusBadge using its unchanged friendlyLabel/statusTone mapping. ACTIVE, PENDING, APPROVED, DECLINED, SCHEDULED and UNAVAILABLE demonstrate real mappings, including neutral fallback. No new rejected mapping.',
  },
  'BDG-03': {
    context: 'admin',
    rendering: 'partial',
    ancestor: 'operations',
    route: '/market/assignments/:id',
    css: `${shared}; .booth-state.available/.assigned/.paid`,
    limitation:
      'Partial MarketMap span.booth-state markup only, using its three actual CSS classes and labels. Map/canvas and assignment/payment status derivation omitted.',
  },
  'BDG-04': {
    context: 'admin',
    rendering: 'imported',
    ancestor: 'management',
    route: '/platform/integrations',
    css: `${shared}; apps/admin/src/management.css; .management-workspace`,
    limitation:
      'Imported Readiness with synthetic NOT_CONFIGURED/READY records. Original plain text and source formatting, no badge tones. Other operational/financial callers remain source evidence.',
  },
  'ALT-01': {
    context: 'base',
    rendering: 'imported',
    route: 'Shared Alert/ErrorState exports',
    css: shared,
    limitation:
      'Imported Alert (role=status, no severity prop) and ErrorState with a synthetic AppError. ErrorBoundary controller is not mounted and no crash is triggered. No success/warning variants fabricated.',
  },
  'ALT-02': {
    context: 'admin',
    rendering: 'imported',
    ancestor: 'vendor',
    route: '/vendor/analytics',
    css: `${shared}; apps/admin/src/vendor.css; .capability-note`,
    limitation:
      'Imported Unavailable with synthetic copy and its original role=status. No availability checks or services.',
  },
  'ALT-03': {
    context: 'storefront',
    rendering: 'partial',
    route: '/checkout; /account?followSaved; /account?followError',
    css: publicCss,
    limitation:
      'Partial Checkout role=status/role=alert paragraphs plus native CustomerLayout .alert feedback examples. Severity comes from actual roles, not a new severity API. Customer ancestor shown locally; no API errors triggered.',
  },
  'ALT-04': {
    context: 'admin',
    rendering: 'imported',
    ancestor: 'vendor',
    route: '/vendor/analytics',
    css: `${shared}; apps/admin/src/vendor.css; .projection-status`,
    limitation:
      'Imported Metadata with synthetic ACTIVE/BUILDING/FAILED metadata. Existing timestamps and stale-snapshot notices only; no analytics reads or aggregation.',
  },
  'EMP-01': {
    context: 'base',
    rendering: 'imported',
    route: 'Shared EmptyState export; /market',
    css: shared,
    limitation:
      'Imported EmptyState retains h3 and caller children. Synthetic no-markets/no-search-results copy; local fragment actions only.',
  },
  'EMP-02': {
    context: 'customer',
    rendering: 'imported',
    route: '/account/orders; /products; /cart',
    css: customer,
    limitation:
      'Imported Astro CustomerOrders with an empty purchases array. Additional product/cart family markup is partial native evidence. Original h2 and CTA semantics; all navigation blocked.',
  },
  'EMP-03': {
    context: 'admin',
    rendering: 'partial',
    ancestor: 'management',
    route: '/platform/tenants; public market home',
    css: `${shared}; apps/admin/src/management.css`,
    limitation:
      'Partial TenantDirectory plain no-results paragraph, plus public MarketPublicHome wording. No empty wrapper, fake loading or query controller.',
  },
  'LOD-01': {
    context: 'base',
    rendering: 'imported',
    route: 'Shared Spinner/Skeleton exports',
    css: shared,
    limitation:
      'Imported Spinner and Skeleton. Spinner is an existing static ring, not a newly animated spinner. Skeleton is aria-hidden; fixture caller adds a loading status. No network delay.',
  },
  'LOD-02': {
    context: 'admin',
    rendering: 'imported',
    ancestor: 'vendor',
    route: '/vendor/products',
    css: `${shared}; apps/admin/src/vendor.css`,
    limitation:
      'Imported vendor ReadState. Synthetic caller sets loading or AppError; Refresh records changes local fixture state only. No useRead or retry request.',
  },
  'LOD-03': {
    context: 'admin',
    rendering: 'imported',
    route: '/market/occurrences',
    css: market,
    limitation:
      'Imported market ReadState. Synthetic caller sets loading or AppError; Try Again changes local fixture state only. No request or useRead mounted.',
  },
  'LOD-04': {
    context: 'storefront',
    rendering: 'partial',
    route: '/cart; /checkout',
    css: publicCss,
    limitation:
      'Partial VendorCart aria-busy container and polite status text. Caller pending is simulated. Cart mutation, locks, purchase and account navigation controllers omitted.',
  },
  'TBL-01': {
    context: 'base',
    rendering: 'imported',
    route: 'Shared Table/TableHead/TableBody exports',
    css: shared,
    limitation:
      'Imported table primitives with synthetic short/long rows and semantic headings. No sorting or empty-state API. Focusable original overflow wrapper preserved.',
  },
  'TBL-02': {
    context: 'admin',
    rendering: 'imported',
    ancestor: 'vendor',
    route: '/vendor/products; /market/vendors; /platform/tenants',
    css: `${shared}; apps/admin/src/vendor.css; apps/admin/src/market.css; apps/admin/src/phase15b.css`,
    limitation:
      'Imported DataTable with synthetic rows. Selected state supplies its real aria-sort metadata only, not functional sorting. A second empty tbody shows caller-owned empty data, without inventing an empty-row component.',
  },
  'TBL-03': {
    context: 'admin',
    rendering: 'imported',
    ancestor: 'operations',
    route: '/market/booth-billing/:id',
    css: `${shared}; .ops-workspace .ops-invoice`,
    limitation:
      'Imported Invoice with synthetic lines and canManage=false. Original native table, caption and moneyLabel remain. No issue/payment/void forms or commands. Existing native mobile overflow limits retained.',
  },
  'KPI-01': {
    context: 'customer',
    rendering: 'partial',
    route: '/account',
    css: customer,
    limitation:
      'Partial account overview customer-stats links with synthetic counts. Original three-column layout and anchor semantics. Data projection and live navigation omitted.',
  },
  'KPI-02': {
    context: 'admin',
    rendering: 'partial',
    ancestor: 'operations',
    route: '/market/day/:id; /market/assignments/:id',
    css: `${shared}; .ops-workspace .ops-day-summary`,
    limitation:
      'Partial Assignments dl.ops-day-summary, including detail dd and polite live region. Synthetic values replace projected counts. Assignment/occurrence controllers omitted.',
  },
  'KPI-03': {
    context: 'admin',
    rendering: 'partial',
    ancestor: 'management',
    route: '/platform',
    css: `${shared}; apps/admin/src/management.css; .management-workspace .facts`,
    limitation:
      'Partial PlatformOverview dl.facts with its four original labels and synthetic counts. Readiness is demonstrated separately as BDG-04. No tenant service or aggregate reads.',
  },
  'KPI-04': {
    context: 'admin',
    rendering: 'imported',
    ancestor: 'operations',
    route: '/market/booth-billing/:id',
    css: `${shared}; .ops-workspace .ops-summary`,
    limitation:
      'Imported Billing with synthetic billingSummary and no invoices. Real currency-separated moneyLabel output; no financial aggregation, invoice forms or commands.',
  },
  'FIL-01': {
    context: 'admin',
    rendering: 'imported',
    route: '/market/occurrences',
    css: market,
    limitation:
      'Imported RangeForm rendered read-only as React SSR. Native fields are editable, but all form submissions are blocked before its handler. Date validation/onChange are explicitly not exercised; no query requests.',
  },
  'FIL-02': {
    context: 'admin',
    rendering: 'partial',
    ancestor: 'vendor',
    route: '/vendor/products; /platform/tenants',
    css: `${shared}; apps/admin/src/vendor.css; apps/admin/src/management.css; .filter-bar`,
    limitation:
      'Partial vendor catalog and management directory filter-bar forms using actual TextField/Choice/Button. Original max lengths and alignment retained. Submissions, query normalization and paging resets omitted.',
  },
  'FIL-03': {
    context: 'storefront',
    rendering: 'partial',
    route: '/products; /occurrences/:occurrenceId',
    css: publicCss,
    limitation:
      'Partial native catalog-filters GET markup with original search/sort and market-filter-options facet classes. Synthetic local options; native selections work. Submission and URL/query handling blocked.',
  },
  'FIL-04': {
    context: 'admin',
    rendering: 'partial',
    ancestor: 'operations',
    route: '/market/rentals; /market/assignments/:id',
    css: `${shared}; .ops-workspace .ops-toolbar/.ops-field`,
    limitation:
      'Partial Assignments ops-toolbar form plus Directory stock selector using imported Control. Synthetic local select state; no approval, directory reads or operational commands. Submission blocked.',
  },
  'FIL-05': {
    context: 'customer',
    rendering: 'partial',
    route: '/account/markets; /account/vendors',
    css: customer,
    limitation:
      'Partial native customer-search GET form with actual labels, search length and button classes. No discovery query, independent paging or follow actions. Submission blocked.',
  },
  'TAB-01': {
    context: 'base',
    rendering: 'imported',
    route: 'No current app consumer; shared Tabs export',
    css: shared,
    limitation:
      'Imported Tabs with its actual roving focus, ArrowLeft/Right/Home/End and hidden mounted panels. No selected/disabled prop; select the second tab manually. Long-label wrapping limitations preserved.',
  },
  'TAB-02': {
    context: 'admin',
    rendering: 'partial',
    ancestor: 'operations',
    route: '/market/layouts/:id/edit',
    css: `${market}; apps/admin/src/market/phase14/designer.css; .designer .designer-sidebar .designer-tabs`,
    limitation:
      'Partial designer Inspector/Layers native buttons and aria-pressed, with explicitly simulated local panel selection. Actual LayoutInspector/LayoutLayers, map, revisions and commands omitted. No roving tab/arrow-key behavior exists.',
  },
  'TAB-03': {
    context: 'admin',
    rendering: 'partial',
    ancestor: 'management',
    route: '/platform/billing/plans',
    css: `${shared}; apps/admin/src/management.css; .overview-links .route-button`,
    limitation:
      'Partial billing catalog overview-links with the existing native route-button classes. Original RouteLink history controller omitted; hrefs replaced with inert local fragments. No tab roles or fake active-page rule.',
  },
  'PAG-01': {
    context: 'base',
    rendering: 'imported',
    route: '/vendor/products',
    css: shared,
    limitation:
      'Imported Pagination; actual callbacks update only synthetic page state (three pages). Disabled boundaries are real. Fixture page label is separate caller content, not an intrinsic feature.',
  },
  'PAG-02': {
    context: 'admin',
    rendering: 'imported',
    ancestor: 'management',
    route: '/platform/tenants',
    css: `${shared}; apps/admin/src/management.css`,
    limitation:
      'Imported Pager with synthetic total=45 and its original take=20 arithmetic/range/secondary buttons. setSkip is local state, no paginated API.',
  },
  'PAG-03': {
    context: 'admin',
    rendering: 'partial',
    route: '/market/vendors/:id',
    css: market,
    limitation:
      'PageControls is private. Partial original region/range markup composes actual imported Pagination. Local callbacks simulate skip/record counts; production query resets and paginated reads omitted.',
  },
  'PAG-04': {
    context: 'storefront',
    rendering: 'partial',
    route: '/products',
    css: publicCss,
    limitation:
      'Partial native catalog pagination links and current page label. Selected state shows page 2, disabled state shows last-page boundary by omitting Next. Local fragment links are inert; no fake paging or query builder.',
  },
  'PAG-05': {
    context: 'customer',
    rendering: 'partial',
    route: '/account/markets',
    css: customer,
    limitation:
      'Partial native customer-pagination secondary links. Selected state shows both directions; default omits Previous; disabled state omits Next. Native links have no disabled prop. No independent collection paging or real navigation.',
  },
  'PGH-01': {
    context: 'admin',
    rendering: 'imported',
    route: 'AdminShell page title',
    css: `${shared}; apps/admin/src/phase15.css; .admin-content .page-header`,
    limitation:
      'Imported PageHeader h1 and caller description/action children. No built-in action alignment prop or state API. Distinct from HDR topbar; synthetic common title.',
  },
  'PGH-02': {
    context: 'customer',
    rendering: 'imported',
    route: '/account',
    css: customer,
    limitation:
      'Actual Astro CustomerLayout title h1, synthetic common title and caller description. Topbar remains separately visible; no heading adapter or hydration.',
  },
  'PGH-03': {
    context: 'storefront',
    rendering: 'partial',
    route: '/; /account/login',
    css: publicCss,
    limitation:
      'Partial MarketPublicHome hero/market-title h1 plus authentication account-panel h1, with the same synthetic title. Native markup and original contextual CSS only; no SiteLayout navigation or auth controller.',
  },
  'PGH-04': {
    context: 'admin',
    rendering: 'evidence',
    ancestor: 'operations',
    route: '/market/layouts/:layoutId/edit',
    css: `${market}; apps/admin/src/market/phase14/designer.css; .designer .designer-header`,
    limitation:
      'Evidence only. The local LayoutEditor h1/header depends on version, dirty, area, history and save/publish closures. No designer heading is fabricated; inspect exact source and historical editor screenshots separately.',
  },
  'SCH-01': {
    context: 'base',
    rendering: 'imported',
    route: 'No current app consumer; shared SectionHeader export',
    css: shared,
    limitation:
      'Imported SectionHeader h2, title-only and with caller action. No built-in action alignment, responsive variant or state prop.',
  },
  'SCH-02': {
    context: 'customer',
    rendering: 'partial',
    route: '/account',
    css: customer,
    limitation:
      'Partial customer-section > header > h2 with optional adjacent native action link. Original heading hierarchy and content alignment, synthetic copy. No overview data controller.',
  },
  'SCH-03': {
    context: 'admin',
    rendering: 'partial',
    route: '/market; /vendor',
    css: `${market}; .dashboard-card h2`,
    limitation:
      'Partial market overview dashboard-card h2 plus vendor card title family. Original h2/content markup with synthetic copy; command forms and projections excluded.',
  },
  'SCH-04': {
    context: 'storefront',
    rendering: 'partial',
    route: 'Public market home',
    css: publicCss,
    limitation:
      'Partial MarketPublicHome market-occurrences section with aria-labelledby and h2. Original title-only presentation, no invented adjacent action layout. Synthetic section content.',
  },
};

export const additionalCategoryCounts = {
  DDN: 3,
  BDG: 4,
  ALT: 4,
  EMP: 3,
  LOD: 4,
  TBL: 3,
  KPI: 4,
  FIL: 5,
  TAB: 3,
  PAG: 5,
  MOB: 2,
  PGH: 4,
  SCH: 4,
} as const;
