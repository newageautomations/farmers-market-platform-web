# Phase 13D Vendor Storefront implementation

## Summary

Phase13A-B1 is CLOSED. The generic backend-authoritative public Storefront resolver is `GET /storefront-context/resolve`. One Astro application now renders real Vendor home, catalog, Product detail and direct cart routes from the approved Shop context. Market hosts retain the existing Market foundation.

Integration classification: **REAL FULL-STACK PASS**. Final acceptance used fixture mode OFF, real Chromium, production Astro SSR, real hostname resolution, Vendure Shop HTTP and guarded disposable PostgreSQL, without response mocking.

Functional implementation and required regressions passed. Reporting governance has one exception: the first unit-test invocation used the existing JSON reporter and overwrote the pre-existing, untracked `docs/evidence/phase13c5/unit-results.json`. Its original bytes were not recoverable. The report therefore marks C, H and DY FAIL. No Phase 13D evidence directory, screenshots, acceptance JSON or extra phase report was created.

## Scope and repository write boundaries

Frontend work remains local to `E:\\coding\\farmers-market-platform-web`: `apps/storefront`, shared Shop API/core/theme packages, generated Shop types and test/configuration plumbing. Vendor Admin and Market Admin feature source, routing and API semantics were unchanged.

Backend work is confined to Phase13A-B1 and its disposable test infrastructure in `E:\\coding\\farmers-market-platform`. There are seven intentional changed paths:

- `src/plugins/platform-identity/public-storefront.controller.ts`
- `src/plugins/platform-identity/storefront-host.ts`
- `src/plugins/platform-identity/entities.ts`
- `src/plugins/platform-identity/platform-identity.plugin.ts`
- `src/migrations/1791230000000-StorefrontPublicHostname.ts`
- `test/frontend-integration/storefront-run.ts`
- `test/frontend-integration/market-run.ts`

The last file now honors the existing runtime-directory environment override so the required Market Admin regression can use a process-owned transient directory. No catalog, inventory, cart, checkout, payment, communication, billing, analytics, POS or Admin business implementation was added.

## Pre-existing Git state

Both `git status --porcelain` and `git rev-parse HEAD` were read before implementation. File-content comparisons stayed in memory and terminal output; no audit manifest was written.

Frontend baseline HEAD: `f7a87c7f6d0d59a86c91e77535aff270a1991008`. The only tracked modification was `README.md`. The existing application, packages, docs, tests and configuration were predominantly untracked: `.env.example`, `.gitignore`, formatter files, `apps/`, `codegen.ts`, `docs/`, ESLint/package files, `packages/`, five Playwright configurations, `scripts/`, `tests/`, TypeScript and Vitest configuration. These were existing work, not newly created by this phase.

Backend baseline HEAD: `d0f2e0a97823b5bfb6f2320c96c2d7af7a2e0993`. Existing tracked modifications comprised README/package/schema/startup files; Analytics; Billing Entitlements; Communications plugin; Farmers Market API/plugin/read/worker files; Marketplace Commerce publication/topology/plugin files; Payments plugin; Platform Identity API/entitlement/access policy; POS plugin; and `test/analytics/.runtime/results-full.json`. Existing untracked work included two Phase 13B.5/13C.5 backend reports, `scripts/`, migration discovery, Market organizer reads, owned Admin reads, Analytics runtime files, database-startup tests and the frontend integration infrastructure.

No baseline code change was reverted. The historical unit-results overwrite above is the sole unexpected frontend path. All other baseline file contents, including old migrations and pre-existing backend changes, compare unchanged except intentional Phase 13D paths.

## Phase13A-B1 characterization

Inspection covered Storefront entity/key/route/status, IdentityService, OwnershipDirectory, ShopContextMiddleware and the Phase 3 Market evolution.

Storefront `key` is stable and immutable. Persisted `routeKey` is a route slug: IdentityService normalizes it as a lowercase slug, length is 120 and the database enforces `^[a-z0-9]+(-[a-z0-9]+)*$`. It cannot represent a dotted hostname, a bracketed IPv6 address or a canonical IDN hostname. Overloading it would break its route-slug contract and existing configuration behavior.

The single Storefront entity uses Vendor/Market subject XOR, approved Channel linkage, Vendor primary Channel/Seller linkage and Market Channel linkage. Existing database guards reject mismatches. ShopContextMiddleware already supplies the public eligibility policy; its enforcement was not weakened.

### Migration status

An additive migration was necessary because existing routing semantics explicitly exclude hostnames.

1. The current route slug and stable key are insufficient for HTTP hostname identity.
2. Reinterpreting a slug as a domain would change established business semantics and constraints.
3. Nullable `hostname` becomes permanent public routing truth, separate from the stable key and route slug.
4. Stored identities are lowercase canonical ASCII DNS names or canonical supported IP hosts, without port or trailing dot. A partial unique index protects non-null hostname identity. Database checks reject malformed routing values; the resolver independently verifies canonical normalization.
5. Existing rows remain nullable and unavailable through hostname resolution until explicitly configured. There is no automatic backfill, fixture routing, activation or default Channel assignment.
6. Down migration refuses to remove configured hostname routing. No previous migration was edited.

The entity column is excluded from normal select/insert/update so existing slug configuration cannot overwrite it and existing permanent test schemas remain compatible. The resolver explicitly projects it. Hostname configuration management remains later Admin/settings work. Only disposable harness databases received this migration here. The protected development database was not migrated.

## Backend Storefront-resolution implementation

### Exact endpoint and authority

`PublicStorefrontController.resolve` exposes **GET /storefront-context/resolve**, backed by `PublicStorefrontService.resolve` in PlatformIdentityPlugin. It is a narrow public HTTP root outside the Shop middleware boundary and requires no Channel token.

Only the direct request `Host` selects persisted routing. The endpoint ignores `Forwarded` and `X-Forwarded-Host`. Future trusted-proxy configuration belongs to Phase 13H.

The resolver requires an active Storefront; subject XOR; a real non-default Channel; active Vendor with matching primary Channel and Seller; or active Market with matching Market Channel. This repeats the existing Shop eligibility policy. Suspended Vendor/Market and inactive Storefront fail closed. It does not introduce new suspension/deletion policy.

The hostname grants public context only. It grants no membership, ownership, customer identity, permissions or Admin authority. ShopContextMiddleware remains authoritative for each Shop request. Missing, invalid, default, conflicting and inactive direct Channel contexts remain denied.

### Host normalization

`normalizeStorefrontHost` uses WHATWG URL parsing, Node `domainToASCII` and `net.isIP`.

| Input class                                       | Behavior                       |
| ------------------------------------------------- | ------------------------------ |
| DNS case                                          | Lowercase canonical DNS        |
| Optional valid port                               | Removed from routing identity  |
| One trailing dot                                  | Removed                        |
| International DNS                                 | Canonical ASCII IDN            |
| Canonical dotted IPv4                             | Supported                      |
| Bracketed IPv6                                    | Supported and normalized       |
| localhost and subdomains                          | Supported for loopback testing |
| Shortened, hex or octal IPv4                      | Rejected                       |
| Empty, whitespace, controls                       | Rejected                       |
| Scheme, path, userinfo, query, fragment           | Rejected                       |
| Invalid labels, repeated dots, empty/invalid port | Rejected                       |

HTTP tests exercise uppercase Host, trailing dot and port against one stored hostname. Unit assertions also cover canonical IPv4/IPv6, IDN and 22 malformed inputs. Real HTTP Host injection and forwarded-host spoof attempts fail safely.

Canonical origins use the approved stored hostname. Non-local origins use HTTPS. Supported loopback origins use HTTP and the validated direct request port. No arbitrary unresolved Host becomes SEO authority.

### Safe public response

Only these fields are returned:

- `storefrontId`, `storefrontKey`, `kind`, `displayName`
- `canonicalHostname`, `canonicalOrigin`
- `subject: { id, name }`
- `shopContext: { channelToken }`

The Channel token is a **public Shop routing selector**, not an authentication secret. It is neither logged nor serialized into interactive-island props nor persisted as a user secret. Its presence confers no Admin authority. The subject ID is needed for returned DIRECT_VENDOR context verification.

No Seller, Administrator, membership, permission, StockLocation, provisioning key, Stripe account, POS information, private Channel configuration or credential is returned. Backend Storefront has no persisted public theme/logo/font configuration to expose.

### Vendor/Market and failure behavior

Both VENDOR and MARKET use the same resolver. A configured Market resolves as MARKET and retains its existing composition. Unknown/inactive/ineligible hosts return stable 404 `STOREFRONT_UNAVAILABLE`; malformed Host returns 400; transport/database outage returns safe 503. Resolver and Astro responses use `private, no-store`. Unknown hosts never fall back to a default Channel, first Vendor, synthetic fixture or Bulverde Market Day.

## Frontend Storefront architecture

One `apps/storefront` Astro application remains. Middleware resolves context afresh for every SSR request, using the direct incoming Host against the configured backend. Node native HTTP is used for resolver transport because the current Node fetch implementation discards an explicit Host header. The network destination remains the configured backend, not the incoming hostname. Transport has a timeout and response-size bound.

Context lives in request-local Astro locals. Shop transports forward only that request's native cookie and approved Channel selector. No mutable global tenant singleton or response cache exists. HTML, resolver and Shop reads use no-store. There is therefore no shared route-only cache key to leak tenant data.

Interactive islands receive public Storefront ID and safe Product/cart facts only. A narrow same-origin `/api/shop` transport bridge allows session, native login, cart read, add, adjust and remove. It resolves the host again, verifies same-origin against approved canonical origin, rejects foreign Storefront ID and does not accept client Vendor/Channel selection. It has no pricing engine, inventory database, reservation or cart authority. Vendure owns every commerce decision.

### Routes and Vendor homepage

| Route              | Implemented behavior                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `/`                | Backend display name, Vendor composition and current featured catalog                         |
| `/products`        | SSR native catalog, search, name sort, server paging and empty/error states                   |
| `/products/[slug]` | Native Product detail, assets, facets, options, exact Variant price, quantity and Add to cart |
| `/cart`            | Native active Order, cart edits and existing verified-customer sign-in where required         |
| `/robots.txt`      | Public indexing policy; cart/API/account exclusions; failed context disallowed                |

Market `/` retains the Phase 13A foundation. Vendor commerce routes return 404 for MARKET and do not instantiate Vendor cart composition. Bulverde Market Day remains the explicit MARKET fixture. No real Bulverde data was fabricated.

### Exact Shop schema and catalog

Source-derived, generated Shop documents are:

- `VendorProducts` uses `products(options: ProductListOptions)`, `skip`/`take`, `filter.name.contains` and `sort.name`.
- `StorefrontProduct` uses `product(slug: String)` with native assets, Variant options, facets and prices.
- `ShopCustomerSession` uses `me`; `ShopLogin` uses native `login`.
- `CartSnapshot` uses `activeOrder`.
- `StorefrontSelectContext` uses `selectCommerceContext` with no occurrence selector.
- `StorefrontAdd`, `StorefrontAdjust`, `StorefrontRemove` use `addItemToOrder`, `adjustOrderLine`, `removeOrderLine`.

Catalog pages request 12 items from the backend. Home requests only its featured subset. The browser does not receive the entire catalog for pagination. Search and name sorting use native approved ProductList filters rather than a frontend index or Market occurrence catalog.

Cards render name, slug, escaped description excerpt, safe featured image, public facets and exact Variant price range. Product pages render SSR content without requiring JavaScript, and hydrate only purchase controls. Variant labels include the native options. SKU is publicly available but is not needed in the UI.

Protected ownership custom fields, canonicalSource, StockLocation, private Channel assignments and raw stock counters are not requested or displayed. Product presence is not advertised as availability. Foreign and unknown slugs return 404/noindex, not home content.

Assets accept safe HTTP(S) or approved relative asset paths, reserve dimensions/aspect ratio and use appropriate alt behavior. Missing images use a stable placeholder. Broken optional images are replaced with an accessible placeholder without changing layout dimensions. Real local backend Asset, missing asset and broken asset cases were tested.

### Direct cart and money handling

Existing Shop policy requires a verified customer for direct commerce context and cart edits. Anonymous catalog browsing remains supported; the cart offers only native sign-in for an existing verified customer. No registration, account dashboard, profile, history or guest checkout was added.

Each mutation first establishes `DIRECT_VENDOR` through the current approved Shop Channel and verifies the returned Vendor identity, with no Market or occurrence identity. Client input cannot change that Vendor. Add, adjust and remove then reread the native active Order. Cart totals, discounts, surcharges, tax and shipping values are rendered directly from backend amounts.

Shared exact-money formatting and BigInt price comparisons are reused. There is no floating-point pricing arithmetic or browser total calculation. Submission locks and disabled pending controls prevent duplicate clicks. Final quantity/total truth is not optimistic. Rejected quantity mutations display safe backend-derived error codes and reread actual backend state, including any native partial result. The frontend does not independently clamp quantities. Held/non-AddingItems state disables editing and does not release checkout attempts.

The real same-browser test copied a native session from A to B to exercise the backend strategy beyond normal host cookie isolation. Vendor B received a separate Order; no A metadata appeared. Returning to A preserved its original Order. No cart merging, clearing or nonempty context morphing was added.

There is no checkout button, placement, payment, shipping/pickup selection, provider call, coupon flow or order-completion claim. The cart explains that online checkout is not yet available.

### SEO, theme and tenant isolation

Titles, descriptions, canonical and OpenGraph/social URLs derive from resolved public context. Product titles/descriptions derive from safe catalog facts. Product structured data includes only name, description, approved URL and safe image when present. It contains no invented availability, reviews, brand, shipping or return policy.

Unknown/resolution-failed pages have no tenant canonical and are noindex. Product/catalog errors are noindex; foreign Products are 404. A transport outage is distinct from unknown Storefront and does not cause fixture/default identity fallback.

Backend presentation configuration currently consists of display identity and routing. Live Vendors therefore use controlled platform Vendor default accent, fonts, favicon and modern template; live Markets use the existing community/platform foundation. No backend theme fields or fabricated tenant branding were introduced. Request-local theme copies avoid mutation leakage. Unit tests mutate A's copy and prove B is unchanged; real SSR tests render A then B in one process and verify names, default tokens, canonical and Product separation.

### Fixture safety

`FRONTEND_FIXTURE_MODE` remains explicit dev/test only. Synthetic fixtures exercise multiple Products/Variants, prices and facets. All fixture imports are development-gated and production builds reject fixture enablement. Production failures never fall back to fixtures. Production bundle marker checks passed.

## Storefront-B blockers

No new missing backend contract requiring a STOREFRONT-B# blocker was found. Existing verified-customer commerce restrictions and absent checkout are respected scope boundaries. Public inventory counts/availability and configurable tenant theme management are not fabricated.

## Full-stack integration

Reproducible frontend command: `npm run test:live:vendor-storefront`.

It owns disposable backend startup, guarded PostgreSQL provisioning/migration, synthetic A/B/empty/inactive/Market fixtures, production Astro startup, Chromium, shutdown and successful database cleanup. It uses neither GraphQL nor HTTP response mocks. The Storefront-specific Playwright configuration uses screenshot/video/trace OFF and terminal list reporting.

The fixture supplies multiple A Products, two Harvest Variants with distinct prices/options, B Product, facets, safe stock for native cart validation, a real local Asset and an existing verified customer. Trusted fixture controls test revocation, Product name/price/enabled changes and broken optional Asset. No real client branding or external Asset scraping was used.

Final Storefront run: **7 browser tests passed**, plus the backend normalization/resolver/authority assertions. It dropped `vendure_test_storefront_1791237293911_61d250` through process-owned cleanup.

### Unit tests, browser tests, accessibility and responsive checks

| Command/check                                                              | Final result                                                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm run graphql:schema`                                                   | PASS, source extraction reproduced                                                                                        |
| `npm run graphql:codegen`                                                  | PASS, exact Shop types regenerated; Admin generated output unchanged                                                      |
| `npm run typecheck`                                                        | PASS, TypeScript and Astro, zero errors                                                                                   |
| `npm run lint`                                                             | PASS, ESLint, API boundaries, formatting                                                                                  |
| `FRONTEND_NO_EVIDENCE=true npm run test`                                   | PASS, 176 tests in 6 files, including 12 new Storefront tests                                                             |
| `FRONTEND_NO_EVIDENCE=true FRONTEND_TEST_PORT_OFFSET=100 npm run test:e2e` | PASS, 33 browser tests                                                                                                    |
| `npm run test:live:vendor-storefront`                                      | PASS, 7 real Storefront browser tests                                                                                     |
| `FRONTEND_NO_EVIDENCE=true npm run test:live`                              | PASS, 8 real Vendor Admin browser tests and 10 backend contract groups                                                    |
| `FRONTEND_NO_EVIDENCE=true npm run test:live:market`                       | PASS, 12 real Market Admin browser tests and 19 backend contract groups                                                   |
| Storefront axe                                                             | PASS, zero violations across 13 analyses: four views at each width plus unknown-host error                                |
| Responsive checks                                                          | PASS, home/catalog/Product/cart at 390, 768 and 1280; no horizontal page overflow; navigation/control visibility verified |
| Keyboard checks                                                            | PASS, Product option arrow navigation, Tab to quantity, and existing foundation keyboard/focus regressions                |

There are **60 passing browser tests** across the final foundation and real Storefront/Admin runs. Foundation/Admin mock tests remain regression tests; the Vendor Storefront acceptance path itself uses real HTTP and database state.

### Backend regressions and builds

`npm run test:customer-relationships` equivalent runner completed the permanent recursive Phase 7 suite: **66 top-level gates PASS**, including Phase 6 Financial Attribution, Phase 5 Marketplace Commerce, Phase 4 Inventory Capacity, Phase 3 Catalog Publication, Phase 2 Farmers Market, Phase 1 Platform Identity and its build gate. The first concurrently loaded attempt exceeded an existing child teardown deadline after Identity assertions; the serial retry passed without changing domain source or timeouts.

Backend `npm run test:frontend-integration:types` passed. Backend `npm run build` passed dashboard/server/worker, both standalone and in the recursive gate. Frontend `npm run build` passed Storefront and Admin/root. Production marker inspection passed for 43 output files.

Approximate Admin production output: main JavaScript 529.04 kB / 122.51 kB gzip, CSS 18.14 kB / 4.75 kB gzip, Market route chunk 45.69 kB / 11.48 kB gzip. The existing main-bundle size warning remains. The final standalone Storefront build completed in approximately 0.46 seconds in the local warm build. No unrelated Admin bundle optimization was performed.

### Protected DB, runtime and provider/deployment confirmation

All test targets use existing loopback-only `vendure_test_*` guards and process-owned cleanup. Exact `vendure` is explicitly forbidden. No operation targeted, migrated or modified the protected database. Successful final Storefront, Vendor Admin, Market Admin and recursive databases were dropped.

Earlier failed startup/regression attempts retained their isolated databases under the existing failure policy. They were not manually dropped from another process. This is not a production or protected DB change.

Successful Phase 13D runtime directories and this session's identified failed-attempt transient files were cleaned. Pre-existing backend runtime bytes were preserved/restored around existing regressions. No logs, machine-readable acceptance, screenshots, videos or traces were added as deliverables. The one historical frontend JSON overwrite remains disclosed.

The Storefront harness disables local verified checkout and supplies no payment handlers. Existing commerce/Admin regression fixtures still exercise their pre-existing local verification doubles; no external provider, Stripe or deployment service was called. No production cookie/CORS/CSRF policy, DNS, hosting or remote Git state was changed.

## Git diff summary

Final `git status --porcelain`, `git diff --name-status` and HEAD checks were run in both repositories. Because much of the existing frontend is untracked, file-content baseline comparisons were also used to distinguish this phase from prior work.

| Audit item                      | Result                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Backend HEAD unchanged?         | Yes                                                                                                                 |
| Frontend HEAD unchanged?        | Yes                                                                                                                 |
| Pre-existing backend paths      | Identity/API-gap/Admin integration and earlier plugin/startup/runtime work listed above, preserved                  |
| Intentional backend paths       | Seven resolver/entity/plugin/migration/harness paths listed above                                                   |
| Unexpected backend paths count  | 0                                                                                                                   |
| Pre-existing frontend paths     | Existing untracked frontend foundation/Admin work and tracked README, preserved except historical unit-results JSON |
| Intentional frontend paths      | 26 modified existing paths and 19 added paths, including this sole report                                           |
| Unexpected frontend paths count | 1: `docs/evidence/phase13c5/unit-results.json`                                                                      |
| Old migrations edited           | None                                                                                                                |
| New Markdown files              | Exactly this report                                                                                                 |
| Commits/push/PR/remote branches | None                                                                                                                |

Intentional frontend changes are concentrated in Storefront middleware/layout/home/robots, new Product/catalog/cart routes and components, request-local Shop transport, shared API operations/generated Shop types, Storefront core/default theme, and tests. Test configuration/scripts suppress existing evidence reporters and explicit screenshot calls when `FRONTEND_NO_EVIDENCE=true`. No Vendor/Market Admin feature source changed. Schema extraction reproduced the existing schemas; generated Admin output, package lock, README and historical Markdown remain unchanged.

## Acceptance table

| Gate | Acceptance gate                                    | Status | Result                                                                                                              |
| ---- | -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| A    | Frontend baseline captured                         | PASS   | Initial status, HEAD and in-memory file comparison.                                                                 |
| B    | Backend baseline captured                          | PASS   | Initial status, HEAD and in-memory file comparison.                                                                 |
| C    | Pre-existing dirty work preserved                  | FAIL   | historical Phase 13C.5 unit-results JSON overwritten by first existing reporter; all other baseline work preserved. |
| D    | Backend modifications limited to Phase13A-B1       | PASS   | Seven resolver/routing/migration/harness paths.                                                                     |
| E    | Protected vendure DB untouched                     | PASS   | Guarded loopback disposable targets only.                                                                           |
| F    | No old migration edited                            | PASS   | Baseline comparison and Git inspection.                                                                             |
| G    | No unexpected backend changes                      | PASS   | Zero unexpected backend paths.                                                                                      |
| H    | No unexpected frontend changes                     | FAIL   | one unexpected path, docs/evidence/phase13c5/unit-results.json.                                                     |
| I    | Public Storefront resolver exists                  | PASS   | GET /storefront-context/resolve.                                                                                    |
| J    | Resolver usable before Shop Channel context        | PASS   | Dedicated public HTTP controller outside Shop middleware.                                                           |
| K    | Resolver supports VENDOR                           | PASS   | Real HTTP A/B resolution.                                                                                           |
| L    | Resolver supports MARKET                           | PASS   | Real HTTP Market resolution.                                                                                        |
| M    | Unknown host fails closed                          | PASS   | 404; forwarded spoof ignored; no fallback.                                                                          |
| N    | Inactive Storefront fails closed                   | PASS   | 404 and fresh revocation tested.                                                                                    |
| O    | Default Channel fails closed                       | PASS   | Resolver predicate, DB linkage guard and Shop regression.                                                           |
| P    | Invalid subject/Channel relation fails closed      | PASS   | Explicit resolver XOR/link predicates and real DB mismatch rejection.                                               |
| Q    | Host normalization deterministic                   | PASS   | WHATWG, domainToASCII, isIP assertions.                                                                             |
| R    | Malformed host rejected                            | PASS   | 22 invalid forms plus real HTTP injection checks.                                                                   |
| S    | Host does not grant Admin authority                | PASS   | Actual Host Admin request without credentials denied.                                                               |
| T    | Safe public DTO only                               | PASS   | Exact key/privacy assertions.                                                                                       |
| U    | No technical Seller exposure                       | PASS   | No Seller in resolver/UI DTO.                                                                                       |
| V    | No credential/private config exposure              | PASS   | Only public Shop selector; no private fields.                                                                       |
| W    | Phase13A-B1 production adapter wired               | PASS   | Real production Astro resolver transport.                                                                           |
| X    | Phase13A-B1 CLOSED accurately                      | PASS   | All six requested B1 closure conditions passed.                                                                     |
| Y    | SSR resolves context per request                   | PASS   | Middleware resolves every request.                                                                                  |
| Z    | No mutable global tenant singleton                 | PASS   | Request-local Astro locals and transports.                                                                          |
| AA   | Vendor A/B SSR isolated                            | PASS   | Same server, JavaScript-disabled A then B.                                                                          |
| AB   | Theme isolated                                     | PASS   | Default controlled tokens and independent per-request theme objects.                                                |
| AC   | SEO isolated                                       | PASS   | Tenant titles/descriptions and Product metadata.                                                                    |
| AD   | Canonical isolated                                 | PASS   | Approved A/B hostname outputs.                                                                                      |
| AE   | Catalog isolated                                   | PASS   | A excludes B Product and vice versa.                                                                                |
| AF   | Cache keys tenant-safe                             | PASS   | No response cache; private/no-store across layers.                                                                  |
| AG   | Unknown host no fallback                           | PASS   | No fixture/default Vendor identity or canonical.                                                                    |
| AH   | Market host does not use Vendor composition        | PASS   | MARKET home; Vendor commerce routes 404.                                                                            |
| AI   | Bulverde Market Day remains MARKET                 | PASS   | Foundation browser regressions.                                                                                     |
| AJ   | Real Vendor homepage                               | PASS   | Live approved identity and native featured catalog.                                                                 |
| AK   | Real Vendor catalog                                | PASS   | Native Shop products.                                                                                               |
| AL   | Server-side catalog paging                         | PASS   | Backend skip/take, page size 12.                                                                                    |
| AM   | Catalog empty state                                | PASS   | Real empty Vendor and search miss.                                                                                  |
| AN   | Catalog search/sort uses backend where supported   | PASS   | Native name.contains and name ASC/DESC.                                                                             |
| AO   | Product detail                                     | PASS   | Real slug query and SSR content.                                                                                    |
| AP   | Variant selection                                  | PASS   | Native option labels and two real Variant prices.                                                                   |
| AQ   | Exact price formatting                             | PASS   | Shared exact-money formatter.                                                                                       |
| AR   | Product assets safe                                | PASS   | Real/missing/broken Asset tests; stable dimensions.                                                                 |
| AS   | Unknown Product safe                               | PASS   | 404/noindex.                                                                                                        |
| AT   | Cross-Vendor Product denied                        | PASS   | B slug hidden under A Shop context.                                                                                 |
| AU   | No protected Product fields                        | PASS   | Shop operation source/privacy checks.                                                                               |
| AV   | No raw inventory display                           | PASS   | No stock counters requested/rendered.                                                                               |
| AW   | No fabricated availability                         | PASS   | No availability claim/structured property.                                                                          |
| AX   | DIRECT_VENDOR context authoritative                | PASS   | selectCommerceContext and returned subject verification.                                                            |
| AY   | Active cart loads                                  | PASS   | Native activeOrder under verified Shop session.                                                                     |
| AZ   | Add Variant                                        | PASS   | Real HTTP/browser mutation.                                                                                         |
| BA   | Adjust quantity                                    | PASS   | Backend reread and totals.                                                                                          |
| BB   | Remove line                                        | PASS   | Backend reread and empty cart.                                                                                      |
| BC   | Backend cart totals authoritative                  | PASS   | Browser UI matched native 4500 returned total.                                                                      |
| BD   | No floating-point money arithmetic                 | PASS   | Integer/BigInt shared money handling.                                                                               |
| BE   | No optimistic final cart truth                     | PASS   | Pending then authoritative response/reread.                                                                         |
| BF   | Duplicate submission protected                     | PASS   | Ref lock, disabled controls, real double click and component test.                                                  |
| BG   | Invalid quantity handled safely                    | PASS   | Real insufficient quantity response and backend reread.                                                             |
| BH   | Foreign Variant add denied                         | PASS   | Real B Variant attack, no foreign cart line.                                                                        |
| BI   | Vendor A/B cart UI isolated                        | PASS   | Same browser and copied native session test.                                                                        |
| BJ   | Nonempty context not silently morphed              | PASS   | Separate B Order; original A Order preserved.                                                                       |
| BK   | No Market occurrence context entered               | PASS   | No occurrence selector; direct context response asserted.                                                           |
| BL   | No checkout implementation                         | PASS   | No checkout route or placement.                                                                                     |
| BM   | No payment implementation                          | PASS   | No payment UI/operations.                                                                                           |
| BN   | No Stripe/provider calls                           | PASS   | Storefront fixture has no handlers/provider operations.                                                             |
| BO   | No shipping/pickup finalization                    | PASS   | No selection/finalization operations.                                                                               |
| BP   | No Customer Account implementation                 | PASS   | Only existing native sign-in required for cart.                                                                     |
| BQ   | No myPurchases UI                                  | PASS   | No history/account views.                                                                                           |
| BR   | No Vendor-origin Market preorder                   | PASS   | Deferred.                                                                                                           |
| BS   | No Market multi-Vendor cart                        | PASS   | Deferred.                                                                                                           |
| BT   | No Phase 13E work                                  | PASS   | Market foundation preserved.                                                                                        |
| BU   | No Phase 13F work                                  | PASS   | Checkout/account deferred.                                                                                          |
| BV   | Tenant title                                       | PASS   | Resolved display identity.                                                                                          |
| BW   | Tenant description                                 | PASS   | Resolved identity or native Product text.                                                                           |
| BX   | Canonical uses approved resolved identity          | PASS   | Backend approved canonical origin.                                                                                  |
| BY   | OpenGraph tenant-safe                              | PASS   | Same approved canonical and public facts.                                                                           |
| BZ   | Unknown/error pages noindex                        | PASS   | Unknown/inactive/Product/transport failures.                                                                        |
| CA   | Product structured data contains only real facts   | PASS   | Name, description, approved URL, safe image only.                                                                   |
| CB   | No untrusted Host reflected as canonical authority | PASS   | Only successful resolver output supplies origin.                                                                    |
| CC   | No Admin API used by public storefront             | PASS   | Shop-tag boundary and static/runtime tests.                                                                         |
| CD   | No direct DB access                                | PASS   | Astro calls resolver/Shop only.                                                                                     |
| CE   | No fixture production fallback                     | PASS   | Production guard and bundle marker scan.                                                                            |
| CF   | No raw backend errors                              | PASS   | Safe codes/messages; no public stack traces.                                                                        |
| CG   | Vendor home accessibility                          | PASS   | Axe zero violations at three widths.                                                                                |
| CH   | Catalog accessibility                              | PASS   | Axe zero violations at three widths.                                                                                |
| CI   | Product detail accessibility                       | PASS   | Axe zero violations at three widths.                                                                                |
| CJ   | Cart accessibility                                 | PASS   | Axe zero violations at three widths.                                                                                |
| CK   | Keyboard navigation                                | PASS   | Native option navigation, Tab quantity and foundation focus tests.                                                  |
| CL   | Product option controls labeled                    | PASS   | Visible native select label.                                                                                        |
| CM   | Quantity controls accessible                       | PASS   | Labels, whole-number inputs, pending states.                                                                        |
| CN   | 390px usable                                       | PASS   | Four public views exercised.                                                                                        |
| CO   | 768px usable                                       | PASS   | Four public views exercised.                                                                                        |
| CP   | 1280px usable                                      | PASS   | Four public views exercised.                                                                                        |
| CQ   | No page-level overflow in tested views             | PASS   | Programmatic document width assertions.                                                                             |
| CR   | Real hostname resolution full-stack                | PASS   | Fixture OFF, direct Host, real resolver.                                                                            |
| CS   | Real Vendor catalog full-stack                     | PASS   | Native Vendure HTTP/PostgreSQL.                                                                                     |
| CT   | Real Product detail full-stack                     | PASS   | Native Vendure HTTP/PostgreSQL.                                                                                     |
| CU   | Real direct cart full-stack                        | PASS   | Native verified session and Order.                                                                                  |
| CV   | Real cross-Vendor Product attack denied            | PASS   | Foreign slug and Variant scenarios.                                                                                 |
| CW   | Real inactive Storefront denial                    | PASS   | Initial inactive and trusted revocation.                                                                            |
| CX   | Real Vendor A/B tenant isolation                   | PASS   | SSR and cart lifecycle.                                                                                             |
| CY   | Market-host regression                             | PASS   | MARKET resolved; no Vendor composition.                                                                             |
| CZ   | Platform Identity regression                       | PASS   | Serial recursive permanent chain passed.                                                                            |
| DA   | Catalog Publication regression                     | PASS   | Serial recursive permanent chain passed.                                                                            |
| DB   | Commerce regression                                | PASS   | Serial recursive permanent chain passed.                                                                            |
| DC   | Vendor Admin regression                            | PASS   | Eight real browser tests and ten contract groups.                                                                   |
| DD   | Market Admin regression                            | PASS   | Twelve real browser tests and nineteen contract groups.                                                             |
| DE   | Storefront foundation regression                   | PASS   | 33-test frontend browser run includes foundation/Market shell.                                                      |
| DF   | GraphQL schema extraction reproducible             | PASS   | Source schema extraction passed.                                                                                    |
| DG   | GraphQL codegen reproducible                       | PASS   | Generated Shop operations passed.                                                                                   |
| DH   | Frontend typecheck                                 | PASS   | TypeScript and Astro passed.                                                                                        |
| DI   | Frontend lint                                      | PASS   | ESLint, boundaries and Prettier passed.                                                                             |
| DJ   | Frontend unit/component tests                      | PASS   | 176 tests passed.                                                                                                   |
| DK   | Frontend browser tests                             | PASS   | 60 final browser tests passed across suites.                                                                        |
| DL   | Accessibility checks                               | PASS   | 13 live axe analyses, zero violations.                                                                              |
| DM   | Backend relevant tests                             | PASS   | B1 assertions, Admin contracts and recursive permanent suite passed.                                                |
| DN   | Backend build                                      | PASS   | Dashboard/server/worker passed.                                                                                     |
| DO   | Frontend Admin build                               | PASS   | Root production build passed.                                                                                       |
| DP   | Frontend Storefront build                          | PASS   | Root and real integration production builds passed.                                                                 |
| DQ   | Frontend root build                                | PASS   | Both workspaces passed.                                                                                             |
| DR   | Exactly one new Phase13D Markdown report           | PASS   | This file only.                                                                                                     |
| DS   | No Phase13D evidence folder                        | PASS   | None created.                                                                                                       |
| DT   | No screenshots created for Phase13D evidence       | PASS   | Screenshot/video/trace off; explicit regression captures suppressed.                                                |
| DU   | No acceptance JSON                                 | PASS   | Acceptance is this Markdown table.                                                                                  |
| DV   | No separate backend report                         | PASS   | None created.                                                                                                       |
| DW   | No separate capability report                      | PASS   | None created.                                                                                                       |
| DX   | No new committed test logs/evidence files          | PASS   | No commits or retained new test logs/evidence deliverables.                                                         |
| DY   | Historical evidence untouched                      | FAIL   | existing Phase 13C.5 unit-results JSON overwritten; no original byte backup exists.                                 |
| DZ   | No deployment                                      | PASS   | Local builds/servers/tests only.                                                                                    |
| EA   | No remote Git action                               | PASS   | No commit, push, PR or remote branch change.                                                                        |
| EB   | Remaining Phase13A blockers reported accurately    | PASS   | B1 CLOSED; B3/B4 OPEN.                                                                                              |

Acceptance totals: **129 PASS, 3 FAIL, 0 INCONCLUSIVE**. The three failures are the single disclosed historical-evidence overwrite, counted against preservation, unexpected changes and historical evidence requirements. Functional B1, Vendor storefront and integration gates passed.

## Remaining Phase13A blockers and deferred work

- Phase13A-B1: CLOSED, permanent authoritative Vendor/Market public host resolution consumed by production SSR with real full-stack tenant isolation.
- Phase13A-B2: previously closed by completed API-gap work; no new claim/change in this phase.
- Phase13A-B3: OPEN. Production many-domain cookie/CORS/CSRF policy remains unchanged. Local loopback native-session tests do not prove production cross-domain authentication.
- Phase13A-B4: OPEN. Market communications API inconsistency remains outside scope; no communications implementation was performed.

Phase 13E Market catalog/cart, Vendor-origin Market preorder and multi-Vendor cart remain deferred. Phase 13F checkout, shipping/pickup finalization, payments, customer account and purchase history remain deferred. Phase 13H trusted-proxy/deployment configuration remains deployment work.

## Commands to run locally

From the frontend root, use PowerShell `$env:FRONTEND_NO_EVIDENCE='true'` before existing regression commands to suppress historical evidence reporters.

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
npm run graphql:schema
npm run graphql:codegen
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run check:bundles
npm run test:live:vendor-storefront
npm run test:live
npm run test:live:market
```

The real integration commands require the existing local PostgreSQL test credentials/configuration and adjacent backend checkout. The new Storefront command owns its local services and successful disposable DB cleanup. For a manually started production storefront, configure `SHOP_API_URL` and keep `FRONTEND_FIXTURE_MODE=false`; configure a canonical persisted public hostname through trusted backend routing administration, not a frontend hostname-to-Channel map.

Implementation stops at Phase 13D.
