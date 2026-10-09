# Frontend platform architecture

One reusable Astro SSR storefront serves Vendor and Market contexts at request time. One Vite React Admin app serves Vendor, Market and platform workspaces. Phase 13B/13B.5 adds Vendor workflows; Phase 13C adds organizer Market workflows in this same app. Public storefront commerce and deployment remain deferred.

## Package graph

| Workspace                | Responsibility                                                     | Allowed platform dependencies            |
| ------------------------ | ------------------------------------------------------------------ | ---------------------------------------- |
| apps/storefront          | SSR public content/metadata and React islands                      | api, config, storefront-core, theme, ui  |
| apps/admin               | Authenticated React SPA and route boundaries                       | api, auth, admin-core, config, theme, ui |
| packages/api             | Generated Shop/Admin operations, private transport and safe errors | none                                     |
| packages/auth            | Native customer/Admin session adapters and permission helpers      | api                                      |
| packages/config          | Validated env, exact money/date/pagination utilities               | none                                     |
| packages/theme           | Validated tenant tokens/assets and bounded Admin branding          | none                                     |
| packages/ui              | Typed accessible primitives and safe states                        | api                                      |
| packages/storefront-core | Request context, kind/template composition and tenant SEO          | api, config, theme                       |
| packages/admin-core      | Scope identity, navigation and optional entitlement boundary       | api, auth                                |

Apps are leaves. Packages never import apps, use only declared exports, and cannot cross boundaries with relative paths. API feature callers get named methods, not raw queries or private generated documents. Tests deliberately inspect transport/generated internals to verify separation. check-boundaries checks graph allowlists, actual imports, export access, relative escapes, cycles and unsafe storage/database patterns. Strict TypeScript, ESLint and Prettier supply remaining validation.

## Rendering and state

Astro server output uses the official Node adapter. Public content and SEO are server-rendered. Only an occurrence explainer dialog hydrates in React; the button becomes usable after hydration. It does not book/select a real occurrence. Astro sessions are disabled. A minimal native mjs entry imports typed config settings to avoid a Windows Vite config-loader issue. Node 24+ supports this native TypeScript import. Application/domain source is TypeScript or typed Astro.

Admin is a Vite React SPA. Local React state owns session/view state; history/URL state owns route boundaries. Future server data belongs to named GraphQL methods/hooks. There is no extra server facade, database, server-action layer or large global state library. Cart foundation exposes only backend snapshots; price/tax/discount/capacity/availability/checkout validity and financial totals stay backend-owned.

## Context, templates and isolation

Frontend StorefrontKind is VENDOR or MARKET. Backend uses exclusive vendorId/marketId relations rather than a GraphQL enum. BackendStorefrontResolver is an injected approved host-resolution port. Its installed live implementation fails safely as unavailable until B1 exists. It cannot invent tokens from hosts, public numeric query parameters or role names, or use Admin credentials to read public data.

Fixtures are dynamically imported only in development with explicit FRONTEND_FIXTURE_MODE=true. localhost, loopback and market.localhost select Bulverde Market Day as MARKET; vendor.localhost selects Synthetic Vendor Fixture as VENDOR. Unknown contexts return 404. Live failures never return fixtures. Builds and production runtime reject true. Fresh per-request context/theme objects avoid process-global current-tenant state. SSR uses private/no-store until host-aware caching is characterized.

Market composition has occurrence and participating-Vendor regions; Vendor composition has catalog/pickup boundaries. The Market does not own merchandise. Templates are controlled: community for Market, modern for Vendor and minimal for either. Minimal Market changes hero layout/removes illustration. Invalid kind/template combinations fail. No core code compares the fixture business name. Future onboarding requires data/theme/configuration after B1, not another repo or tenant build.

Themes validate hex colors, allowlisted heading/body font tokens and local logo/favicon references. Unknown fields fail. CSS variables carry primary/secondary/accent, background/surface/text/muted and fonts. There is no arbitrary CSS, script, HTML, font URL or block editor. Admin stays on the platform palette/typography/layout, with optional validated logo/primary accent and tenant name. It cannot receive a whole storefront reskin.

## Sessions, permissions and entitlements

Native login/logout/me use browser JSON POST with credentials. Signed HTTP-only cookies remain backend-managed. Customer session adapters require approved Shop context. Admin gets Channels/tokens/permissions from me and validates Vendor or Market identity with an owned projection. ownMarketIdentity closed B2 in Phase 13B.5. Market identity must match the selected Channel, current principal, active marketAdmin membership and current ReadOwnMarket grant. Returned SuperAdmin state selects the platform shell. Passwords/tokens are not persisted or logged. No parallel Astro authentication exists.

Initial session/context loading hides tenant content. Channel switching clears old context and restores fresh identity. Sign-out hides the shell immediately, then checks the backend. Navigation and direct route checks are convenience; backend membership/ownership/permissions remain authoritative. Role caches or a hidden link cannot confer access.

Entitlement presentation consumes generated neutral ownEntitlements results. Allowed, denied and unloaded remain distinct. FeaturePanel permits only analytics/marketing/POS slots with approved feature codes. No production plan/price/code mapping is invented. Safety operations (refund, inventory correction/reconciliation, cancellation, compensation, unsubscribe, STOP, transactional communication, purchase history) are not optional slots. UI entitlement visibility is not backend enforcement.

## API, errors and diagnostics

Distinct Shop/Admin TypedDocumentNodes sit behind named factories. Private operation tags prevent cross-client execution at compile time and runtime. Transport uses approved Channel header, credentials, JSON POST and bounded timeout, checks HTTP/GraphQL envelopes and returns generated result types. Its result assertion is not a full runtime DTO validator. Schema snapshots and provenance are backend-derived; optional profile extensions do not prove running capability.

Errors distinguish network, GraphQL, authentication, forbidden, business validation, conflict/stale, unavailable, tenant missing, entitlement and unknown. Only known safe codes remain; backend message/stack/provider/SQL objects are discarded. Shared ErrorState renders approved copy. Loading/progress, empty, denied and unavailable patterns share primitives. Diagnostics log only local UUID plus event/API and safe kind. No auth secrets, private customer data, payment/provider payloads or external telemetry service are used. No general backend HTTP correlation header was found.

## Environment and routes

| Variable               | Audience / behavior                                           |
| ---------------------- | ------------------------------------------------------------- |
| SHOP_API_URL           | Server/config, validated HTTP(S) Shop endpoint                |
| PUBLIC_ADMIN_API_URL   | Browser-safe explicit Admin endpoint constant                 |
| FRONTEND_FIXTURE_MODE  | Server/build flag; dev/test only, production rejects true     |
| BACKEND_REFERENCE_PATH | Read-only schema/verification tool reference; default sibling |

Root env is ignored; example includes only placeholders. Config load and SSR runtime validate required URLs and fixture constraints. API URLs cannot contain credentials. No provider/database secrets enter config or bundles. Codegen source refresh uses exported BACKEND_REFERENCE_PATH, not backend env files. Production output removes fixture modules. Cookie/CORS/CSRF limitations are characterized in backend-contract B3 rather than weakened here.

Storefront owns /, customer /account boundary, 404, robots.txt and sitemap.xml. Account response is noindex and deferred to Phase 13F. Fixture/error contexts are not indexed or included in sitemap. Admin owns noindex SPA operation boundaries. No public tenant ID query switch, breadcrumb or copied app exists. Future public routes prefer backend-approved stable slugs. Origin-validated canonical URLs remain tenant-specific.

## Values, SEO, UI and security

formatMoney accepts exact integer strings/bigints or checked safe numbers, splits whole/fraction with bigint and uses Intl formatting. There is no floating-point financial arithmetic or inferred earnings/profit/payout/MRR/ARR. Dates need explicit timezone; pagination is bounded. Backend exact analytics strings stay exact until display.

SEO derives title, safe description, canonical, robots, Open Graph/social metadata and favicon per request. Structured-data slot and sitemap routes are extension points for approved facts. No invented dates, addresses, hours, social links or schema.org business claims appear. React/Astro escape text; local theme references and HTTP(S) external-link handling are controlled; unsafe HTML/script injection is absent.

Mobile-first storefront and responsive Admin support 390/768/1280 pixels without overflow. Admin mobile navigation is a semantic disclosure. UI includes buttons/links, typed input/textarea/select/checkbox/radio/fields/errors, card/badge/alert, native dialog/drawer, disclosure dropdown, keyboard tabs, table/pagination, skeleton/progress, safe empty/error states and responsive headers/containers. Tests cover landmarks, labels, visible focus, keyboard tabs/dialog/Escape/focus return, fixture contrast and reduced-motion defaults. Local original SVG is development artwork, not official branding or remote imagery.

## Verification and extensions

Vitest covers exact utilities, environment safety, host/theme/name/logo/template/SEO isolation, API typing/errors, initial/anonymous auth, permissions, bounded branding, optional features and tabs. Playwright checks routes/hosts, responsive overflow, axe, dialog keyboard/focus and fixture-disabled SSR plus mocked live anonymous Admin. Output is separately production-built with fixtures disabled. Backend isolation uses exact porcelain status and hashes of 356 baseline tracked/nonignored untracked files.

Phase 13C extends Market Admin after Phase 13B.5 closed identity discovery B2. Vendor/Market storefront phases still need B1. Multi-Vendor cart/checkout must call backend coordinators and preserve one Market/occurrence. Customer account, Market CRM, billing, POS/Stripe wizards, platform workflows and deployment stay deferred. No source plugin depends on frontend and no backend file is changed.

## Phase 13B Vendor workspace

The shared AdminShell routes Vendor Overview, Products, Inventory, Orders, Customers, Markets and Analytics under /vendor. No additional app, package, tenant repository, runtime backend or commerce authority was introduced. The named createVendorApi factory owns generated Admin documents and requires the authenticated channel token. Current membership role and native grants control command presentation; backend guards remain authoritative.

Production explicitly rejects missing catalog and order-list read ports. Development-only adapters provide API-shaped synthetic reads and server-command simulations for those workflows, and are removed from fixture-disabled production builds. They do not become fabricated GraphQL fields. The remaining routes use generated DTOs directly. Generation-bound cursor paging, bounded CRM skip/take and Market occurrence date ranges follow the backend contracts.

Read results are scoped to the service instance, request key and route. Cleanup discards late responses; channel changes, endpoint changes, logout and refreshed/revoked authority hide old content and construct a fresh service. No browser persistence stores Vendor records, credentials, authority or operation keys. Confirmed commands invalidate reads; uncertain outcomes are not automatically retried; version and validation refusals require refresh before another submitted intent.

Exact prices parse through integer decimal strings and BigInt before bounded GraphQL Int conversion. Backend money strings remain exact and currency-separated. Stock counters, attribution and financial statuses are never reconstructed from orders or presentation state. See the Phase 13B report and capability matrix for deliberate live blockers and deferred work.

## Phase 13B.5 addendum

The preceding content records the historical phase and remains historical evidence. Phase 13B.5 adds later backend and real integration proof in [the new implementation report](frontend-phase13b5-integration-implementation.md). VENDOR-B1 through VENDOR-B6 and Phase13A-B2 are CLOSED: owned catalog list/detail/canonical currency/options, independent operational inventory, owned operational orders, current Market display names, native publication state, exact optional boundary availability and current own Market identity. Phase13A-B1 public hostname/discovery, B3 production many-domain cookie/CORS/CSRF and B4 Market communications remain OPEN.

The production adapters use named generated contracts. Inventory requires ManageOwnInventory under the existing owner policy and remains usable when analytics is denied or unconfigured. Market uses ownMarketIdentity for shared bootstrap only. Publication state is reread from actual native/domain facts. ownEntitlements stays separate from ownFeatureAvailability. Eight bound and one unbound real browser tests, ten backend contract groups per profile, full recursive Phase1-11 plus Phase12 backend regressions, eighty frontend unit tests, twenty-one frontend browser regressions and both builds pass. The protected vendure DB was untouched; no real provider, remote Git or deployment operation occurred. [Evidence](evidence/phase13b5/acceptance.json) contains the full A through DC list.

## Phase 13C Market workspace

The lazy Market route bundle serves Overview, Occurrences, Vendors, Operations, Analytics and Settings under /market. Existing Vendor modules and the Platform shell remain intact. createMarketApi exposes only named generated Admin operations, with no Vendor factory, Shop transport or raw query method. ReadOwnMarket permits core reads; exact organizer command grants independently control forms. Suspended Markets remain manageable while active-only generation, enabled offering and analytics policies stay backend-owned.

Read state is scoped to the service instance, request key and route. Switching Channel, refreshing authority or signing out clears the service and shell before new bootstrap. Cleanup and generation guards discard late responses. A core protected authentication/forbidden result invalidates the whole Market service; even an earlier pending read cannot restore it. Optional analytics refusal rechecks core identity so denied analytics does not discard valid administration. No tenant records or tokens are persisted in browser storage.

Commands include current backend versions, require confirmation for cancellation, withdrawal, suspension and recurrence removal, and reread authoritative projections. No automatic write retries occur. Market recurrence is stored as local dates/times and an IANA timezone; occurrence instants require explicit offsets. Backend code owns DST, generation, preorder materialization, eligibility and purchase authorization. Sales caps remain distinct from physical inventory.

Operations use only ownOccurrenceCustomerOperations with bounded server paging and its true total. No Market Customer module, customer contacts, address, payment/provider payload, finance, fulfillment/refund action or native global graph appears. Analytics consumes only operational counters and source/generation/completeness metadata through analytics.market.read. Capped schedule/relationship views disclose limitations instead of fabricating totals or fetching every Vendor row. The six missing narrow contracts and future API recommendations are in the [capability report](frontend-phase13c-capabilities.md). Phase 13C verification, responsive/accessibility evidence and all acceptance gates are in the [implementation report](frontend-phase13c-market-admin-implementation.md).

## Phase 13C.5 closure addendum

Market production screens now consume bounded own-Market collection contracts and authoritative operational summary counts. Vendors use joined canonical safe identities and a searchable eligible directory; relationship detail independently pages listings, participations, offerings and attendance-linked occurrence history. Operations/participation selectors use occurrence pages. Direct occurrence detail uses `ownMarketOccurrence` independently of the list date range. Current listing labels/publication arrive in the protected detail projection. Generation status observes the existing durable queue with bounded active-page polling and authoritative completion refresh.

The existing generated named-operation boundary remains in `packages/api/operations/market.graphql` and `packages/api/src/market.ts`. New state keys include the guarded service's unique readKey and selected Market identity; route/service changes invalidate prior pages and job observations, and late responses are discarded. No Vendor factory, broad executor, frontend-created domain truth or production fixture fallback is added. All new reads require fresh backend ReadOwnMarket authority, while existing mutation permissions remain separate.

The shared Pagination component gains only an optional accessible label for distinct Market detail landmarks. Public Storefront and Vendor Admin source are unchanged. The dedicated `test:live:market` profile extends the Phase 13B.5 disposable harness; Vendor bound/unbound profiles retain their original coverage. See [Phase 13C.5 report](frontend-phase13c5-integration-implementation.md) for source-of-truth, isolation, test and audit evidence. Original Phase 13C limitations above are historical and superseded only for MARKET-B1 through MARKET-B6; Phase13A-B1/B3/B4 remain OPEN.
