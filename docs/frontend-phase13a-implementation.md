# Phase 13A frontend implementation

Implemented locally on October 4, 2026. Phase 13A runnable foundation is complete with explicit backend integration blockers. No Phase 13B work, backend change, database access, remote Git operation or deployment was performed.

Acceptance totals: **81 PASS, 0 FAIL, 2 INCONCLUSIVE**, across all 83 gates. INCONCLUSIVE identifies live authenticated Market bootstrap and live host resolution. This is not a claim of complete production integration.

## Delivered files and repository structure

Two apps under apps/storefront and apps/admin, seven packages under packages/api, auth, ui, storefront-core, admin-core, theme and config. Root scripts/config, exact dependency lockfile, environment example, generated schemas/types, unit/browser tests and docs/evidence accompany the apps. README was expanded. Local .env contains only the example URLs and false fixture flag and is ignored. Generated build output/node_modules/test temporary files are ignored. No local commit or push was made.

## Versions and selection

Official npm metadata/dist tags and peer requirements were checked before framework installation. Stable packages are pinned exactly; package-lock.json captures transitive resolution. Node 24.19.0 and npm 12.2.0 were used; Node 24+ is required for the native typed Astro configuration import. Latest TypeScript metadata was 7.0.2, while typescript-eslint supports less than 6.1.0: 5.9.3 was selected as a supported stable toolchain release. GraphQL 16.14.2 was selected in the stable 16 series compatible with the installed backend transforms. ESLint 10 and the compatible jsx-a11y-x plugin avoid deprecated ESLint 9 and the older plugin's incompatible peer range. No legacy-peer-deps or force install was used.

| Dependency                             | Pinned version |
| -------------------------------------- | -------------- |
| @astrojs/check                         | 0.9.10         |
| @astrojs/node                          | 11.1.6         |
| @astrojs/react                         | 7.0.0          |
| @axe-core/playwright                   | 4.13.0         |
| @graphql-codegen/cli                   | 7.4.3          |
| @graphql-codegen/typed-document-node   | 7.1.1          |
| @graphql-codegen/typescript            | 6.1.0          |
| @graphql-codegen/typescript-operations | 6.1.9          |
| @graphql-tools/merge                   | 9.2.6          |
| @graphql-typed-document-node/core      | 3.2.0          |
| @playwright/test                       | 1.63.0         |
| @tailwindcss/vite                      | 4.3.3          |
| @testing-library/jest-dom              | 7.0.1          |
| @testing-library/react                 | 16.3.3         |
| @testing-library/user-event            | 14.6.7         |
| @types/node                            | 26.6.4         |
| @types/react                           | 19.3.0         |
| @types/react-dom                       | 19.3.0         |
| astro                                  | 7.3.5          |
| concurrently                           | 10.0.5         |
| eslint                                 | 10.12.0        |
| eslint-plugin-astro                    | 3.2.1          |
| eslint-plugin-jsx-a11y-x               | 0.2.0          |
| eslint-plugin-react-hooks              | 7.1.1          |
| graphql                                | 16.14.2        |
| jsdom                                  | 30.1.2         |
| prettier                               | 3.9.9          |
| prettier-plugin-astro                  | 1.1.0          |
| react                                  | 19.3.0         |
| react-dom                              | 19.3.0         |
| tailwindcss                            | 4.3.3          |
| tsx                                    | 4.23.15        |
| typescript                             | 5.9.3          |
| typescript-eslint                      | 8.71.0         |
| vite                                   | 8.3.2          |
| vitest                                 | 5.0.3          |
| zod                                    | 4.6.5          |

The base TypeScript codegen plugin is installed as tooling but operations output uses the current standalone typescript-operations plus typed-document-node plugins to avoid duplicate enum/input declarations. Official framework guidance used: [Astro on-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/), [Tailwind Astro integration](https://tailwindcss.com/docs/installation/framework-guides/astro), [TypedDocumentNode](https://the-guild.dev/graphql/codegen/plugins/typescript/typed-document-node). Version authority is the verified npm metadata and pinned manifest/lockfile, rather than search snippets.

## Backend inspection and API characterization

The backend is Vendure 3.7.3. Config, required plugin areas, migrations, native auth/schema transforms and architecture reports were inspected before freezing frontend contracts. [Backend contract](backend-contract.md) maps auth, Storefront/Channel, occurrences/catalog, cart/checkout/history, Vendor/Market/platform Admin, CRM, inventory, communications, analytics, entitlements, billing, POS and payments. No native operation is considered safe solely because it appears in SDL.

Shop context is approved by persisted Storefront and Channel token before authentication. Default Channel/inactive/unapproved contexts are denied. Market uses occurrence-aware catalog roots and guarded commerce coordinators. Vendor catalog uses approved native Shop queries. Custom permission and fresh membership/ownership guards remain authoritative. Market technical Seller is never treated as a merchandise Vendor. Snapshot optional extensions characterize a reviewed enabled Phase 12 profile, not all possible running environment flags.

## Auth, permission and entitlement foundation

Backend supports signed HTTP-only cookie and bearer sessions, default Lax cookie, credentialed CORS with reflected dev origins and production allowlist. Frontend uses cookie credentials; native login/logout/me adapters exist for Admin and customer contexts. No bearer/password persistence, localStorage/sessionStorage, auth proxy or Astro session is introduced. Origin/secure/CSRF limitations and the lack of live credentialed testing are documented. Native me permissions are per-Channel Role grants; Overview does not require an invented Authenticated role grant. Vendor identity calls its guarded projection, Market automatic discovery fails safely pending B2, platform uses returned SuperAdmin state.

One Admin shell renders three fixture scopes with differing permitted navigation. Initial session/context loading suppresses tenant content. Direct disallowed routes render safe permission states. This is presentation convenience; backend authorization is required for all future requests. Tenant name and validated logo/accent are bounded; platform typography/surfaces/layout remain shared.

Optional features consume generated ownEntitlements and neutral codes/evaluations. Allowed, denied and unloaded remain distinct. Only analytics/marketing/POS presentation slots are available; no safety-critical gate or invented production plan/pricing/mapping exists.

## Storefront, fixtures, themes and templates

One request-time resolution port serves MARKET/VENDOR kinds. It does not derive Channel tokens from a hostname or query parameter. Missing B1 deliberately produces unavailable in live mode. Unknown local fixture host returns 404 and no fallback. Production builds/runtime reject a true fixture flag, and bundle checks find no fixture business names.

Bulverde Market Day is exactly MARKET with community template, warm placeholder theme, occurrence and participating-Vendor regions. No dates, address, Vendor list, catalog, prices or real branding are invented. Synthetic Vendor Fixture uses VENDOR, modern template, separate palette/fonts/assets/name/SEO/canonical. Tests verify fresh objects and isolation. Minimal Market changes composition styling without another source tree. CSS properties come from strict hex/font/local-asset validation, never arbitrary CSS/scripts/HTML.

Storefront content/SEO uses Astro SSR with one small React dialog island; Admin is a legitimate data-app React SPA. History/URL and local React state are sufficient. Later cart state must retain backend authority. Full workflows are intentionally absent.

## GraphQL, values and errors

Distinct generated Shop/Admin TypedDocumentNodes and named API factories build/typecheck. Internal literal API tags reject cross-client execution in type and runtime tests. No raw query escape hatch is exported to feature code. graphql:codegen runs without live services and identical output hashes prove reproducibility. graphql:schema reads backend SDL/source through bounded AST extraction and pure native transforms, with provenance hashes. It never imports vendure-config, plugin classes or backend env and never starts Vendure or accesses a database. Live schema parity/custom-field exposure remains a later verification step.

Money display uses checked integer minor units and bigint splitting, including values beyond Number precision and negative subunit values. Dates use explicit timezone; pagination is bounded. No frontend financial aggregation or invented earnings/profit/payout/MRR/ARR exists. Error taxonomy and safe presentation discard raw provider/SQL/stack/exception details. Diagnostics log local request UUID and safe event/API/kind only. No general backend HTTP correlation header was found.

## Environment, security, SEO, accessibility and responsive behavior

SHOP_API_URL is server/config; PUBLIC_ADMIN_API_URL is explicitly browser-safe; FRONTEND_FIXTURE_MODE is dev/test only; BACKEND_REFERENCE_PATH is a read-only schema/verification tool reference. Required HTTP(S) endpoints reject embedded credentials. Example env has no secrets and backend env is never copied. Production artifact marker scan checks 28 js/mjs/html/css files for fixture names and credential signatures; it is not exhaustive secret detection. Source/dependency boundaries forbid database access and unsafe token storage.

Tenant SEO includes title, safe description, canonical, robots, OG/social metadata, favicon, sitemap and structured-data extension slot. Fixtures/errors are noindex; account response is noindex; no business structured facts are fabricated. Canonicals are isolated by approved context rather than a global business name. Public/customer/Admin route ownership is documented.

Semantic landmarks, labeled forms, visible focus, keyboard tabs, native modal focus/Escape/return, fixture contrast, reduced-motion defaults and responsive overflow are checked. Market and Admin screenshots were visually inspected at representative sizes. Axe checks pass for Market, Vendor, Admin, mocked anonymous sign-in and the open dialog. Supported widths tested are 390, 768 and 1280 pixels. This establishes a baseline, not universal assistive-technology certification.

## Executed commands and results

| Command / check                                        | Final result                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| git status and baseline SHA-256 capture                | Preserved exact pre-existing backend status and 356 file hashes       |
| npm view framework/tool versions and peer metadata     | Verified stable pins and compatibility                                |
| npm install / package-lock synchronization             | Successful, no forced peer resolution                                 |
| npm run graphql:schema                                 | Shop/Admin snapshots generated without backend startup/database       |
| npm run graphql:codegen, repeated with hash comparison | Successful; byte-identical Shop/Admin generated files                 |
| npm run format                                         | Successful                                                            |
| npm run typecheck                                      | Exit 0; root TS and Astro 14 files, zero errors/warnings/hints        |
| npm run lint                                           | Exit 0; ESLint, nine-workspace graph/import checks, Prettier          |
| npm run test                                           | 36 tests in two files pass (17 Admin, 19 utility/context/API)         |
| npm run build                                          | Both SSR storefront and static Admin production builds pass           |
| npm run check:bundles                                  | 28 production files pass fixture/credential-marker scan               |
| playwright install chromium                            | Local test runtime installed; no hosted service/deployment            |
| npm run test:e2e                                       | Eight browser checks pass, zero axe violations on checked views       |
| npm run dev:fixtures                                   | Both frontend apps start; loopback HTTP 200 saved as startup evidence |
| npm run verify:backend                                 | Exact status and all 356 baseline hashes unchanged                    |

Unit/component evidence is docs/evidence/unit-results.json. Browser evidence is browser-results.json plus Market/Admin screenshots for the three widths. codegen-reproducibility.json, bundle-validation.json, development-startup.json and backend-verification.json record independent checks. Execution required ordinary process approval for Windows sandbox worker-temp and loopback restrictions. No automatic approval rejection remains. npm blocked an esbuild postinstall by default; the package's available executable ran successfully in the verified tooling, so no install-script policy was weakened. Transitive node-domexception emits a deprecation notice; direct frameworks/tooling use supported stable versions.

The production Admin output is about 331 kB JavaScript (100 kB gzip). It contains foundation GraphQL/runtime infrastructure, without fixture identities. Optimization and wider performance/cross-browser hardening belong to 13H. Public content is server-rendered with only the interactive island hydrated.

## Blockers and known limits

B1: no approved public host-to-Storefront/Channel/theme/discovery projection. Live storefront remains unavailable rather than guessing authority.

B2: no authenticated own-Market identity discovery projection. Market fixture shell works, but live automatic Market bootstrap is unverified/unavailable.

B3: cross-site cookie/CORS/CSRF deployment policy is uncharacterized. No production policy was modified and no real credentials were used.

B4: inspected Market communication resolver roots appear inconsistent with the whole-route consent/preference roots. No frontend communication workflow is exposed.

Each blocker in backend-contract records required capability, existing behavior, missing contract, architectural reason to reject a frontend workaround and suggested extension. Live endpoint parity, real auth revocation/cookie behavior, real tenant configuration, inventory/catalog/cart/checkout mutations and operational feature workflows were not integration-tested. Field types are generated; transport runtime validation covers the envelope rather than every DTO. No backend test infrastructure or protected vendure DB was used.

## Deferred Phase 13B+

Vendor product/inventory/orders, Market occurrences/Vendor onboarding, CRM/marketing campaigns, analytics dashboards, POS/Stripe wizards, SaaS billing/full platform Admin, multi-Vendor cart/checkout, purchase-history/account UI, loyalty/recurring commerce and production deployment remain deferred. The existing route and package boundaries support those phases without copied tenant repositories. No operational stub pretends to be complete functionality.

## Acceptance gates

PASS means the stated foundation has source inspection or executable evidence appropriate to that gate. It does not claim live integration or backend security proven by UI mocks. K/R remain INCONCLUSIVE because the required authoritative live contracts are missing.

| Gate | Requirement                             | Result       | Evidence / limit                                                                                               |
| ---- | --------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| A    | Repository isolation                    | PASS         | Backend status and 356 file hashes unchanged; all source/output here.                                          |
| B    | Backend inspected                       | PASS         | backend-contract inspection map and schema provenance hashes.                                                  |
| C    | Backend remains authoritative           | PASS         | Named backend API adapters; no commerce/domain calculators.                                                    |
| D    | No direct database access               | PASS         | Workspace dependencies/source boundary check; no frontend DB access.                                           |
| E    | Monorepo established                    | PASS         | Astro storefront and Vite Admin workspaces both build.                                                         |
| F    | Shared packages established             | PASS         | Seven packages, architecture responsibility table.                                                             |
| G    | Dependency graph valid                  | PASS         | check-boundaries: nine workspace graph/import checks pass.                                                     |
| H    | TypeScript strict                       | PASS         | Strict root TS and Astro diagnostics: zero errors/warnings.                                                    |
| I    | Astro storefront                        | PASS         | Astro dev/SSR production build and browser Market shell.                                                       |
| J    | React interactivity                     | PASS         | React occurrence island and tested dialog hydration.                                                           |
| K    | Admin React foundation                  | INCONCLUSIVE | React auth/loading shell passes mocks; complete live Market bootstrap blocked by B2; live login not exercised. |
| L    | No Next.js                              | PASS         | No Next dependency/app; manifests and graph.                                                                   |
| M    | One storefront app                      | PASS         | One SSR app renders both kinds by context.                                                                     |
| N    | MARKET fixture                          | PASS         | Bulverde Market Day fixture has kind MARKET; unit/browser checks.                                              |
| O    | Market-specific composition             | PASS         | Browser data-composition=market, occurrence/Vendor regions.                                                    |
| P    | Generic architecture                    | PASS         | Kind/template dispatch, no core name comparisons.                                                              |
| Q    | Secondary isolation fixture             | PASS         | Synthetic Vendor host tests isolate name/title/palette/assets/template.                                        |
| R    | Host/context abstraction                | INCONCLUSIVE | Host port implemented and tested; authoritative live resolution unavailable without B1.                        |
| S    | Backend context authoritative           | PASS         | No host-derived Channel identity; live fails closed; backend guard unchanged.                                  |
| T    | Theme system                            | PASS         | Validated tokens and per-request CSS properties.                                                               |
| U    | No arbitrary CSS injection              | PASS         | Theme strict schema rejects CSS/font/asset injection.                                                          |
| V    | Template architecture                   | PASS         | Controlled kind/template mapping; minimal Market layout branch.                                                |
| W    | Admin shared shell                      | PASS         | One AdminShell handles three tested scopes.                                                                    |
| X    | Admin branding bounded                  | PASS         | Validated logo/primary accent; stable platform surfaces/fonts.                                                 |
| Y    | Shop/Admin GraphQL separation           | PASS         | Distinct generated documents and named factories.                                                              |
| Z    | GraphQL codegen                         | PASS         | Offline codegen passes; regenerated hashes identical.                                                          |
| AA   | No large handwritten schema duplication | PASS         | AST-derived SDL and generated operation types.                                                                 |
| AB   | Auth characterization                   | PASS         | Source/native auth defaults and session behavior documented.                                                   |
| AC   | Safe auth storage                       | PASS         | Cookies managed by Vendure; no browser token/password persistence.                                             |
| AD   | Permission plumbing                     | PASS         | Generated me Channel permissions feed session/navigation.                                                      |
| AE   | Permission is not authorization         | PASS         | Route/navigation convenience; backend membership/resource guards untouched.                                    |
| AF   | Entitlement plumbing                    | PASS         | Generated ownEntitlements API plus neutral allowed/denied/unknown boundary.                                    |
| AG   | Safety operations not gated             | PASS         | Only analytics/marketing/POS optional slots; no safety workflows gated.                                        |
| AH   | Exact money handling                    | PASS         | Exact bigint formatting and safe-number rejection tests.                                                       |
| AI   | Financial vocabulary preserved          | PASS         | No calculated earnings/profit/payout/MRR/ARR or fake metrics.                                                  |
| AJ   | Error taxonomy                          | PASS         | Ten reusable safe error classes with tests.                                                                    |
| AK   | Safe error rendering                    | PASS         | Backend stack/message/provider detail discarded; raw exception test.                                           |
| AL   | Loading state foundation                | PASS         | Spinner/Skeleton/progress and initial session-loading test.                                                    |
| AM   | Empty state foundation                  | PASS         | Shared EmptyState and empty storefront/Admin regions.                                                          |
| AN   | Forbidden state foundation              | PASS         | Forbidden direct route and ErrorState tested.                                                                  |
| AO   | Entitlement-denied presentation         | PASS         | Denied FeaturePanel tested with neutral backend mock.                                                          |
| AP   | Backend-unavailable presentation        | PASS         | Production-preview 503 and transport failure tests.                                                            |
| AQ   | Design-system primitives                | PASS         | Typed UI primitives build with both apps.                                                                      |
| AR   | Accessibility baseline                  | PASS         | Axe checks plus labels/landmarks/native dialog/focus styles.                                                   |
| AS   | Keyboard navigation                     | PASS         | Browser Enter/Escape/focus return and unit arrow-key tabs.                                                     |
| AT   | Responsive storefront                   | PASS         | 390/768/1280 Market screenshots and overflow checks.                                                           |
| AU   | Responsive Admin                        | PASS         | 390/768/1280 Admin screenshots, navigation disclosure and overflow checks.                                     |
| AV   | SEO metadata                            | PASS         | SSR title/description/robots/OG/social/favicon and extension slots.                                            |
| AW   | Canonical isolation                     | PASS         | Distinct host canonical tests; no global fixture metadata.                                                     |
| AX   | No fake production fallback             | PASS         | Fixture-disabled built SSR 503; no fallback.                                                                   |
| AY   | Explicit development fixture mode       | PASS         | Dev-only dynamic fixture imports; production flag rejection tests.                                             |
| AZ   | Environment validation                  | PASS         | Endpoint/credential/fixture validation at config/runtime.                                                      |
| BA   | `.env.example`                          | PASS         | .env.example with local placeholders, ignored root .env.                                                       |
| BB   | No provider secrets                     | PASS         | No provider key config; production marker scan of 28 files.                                                    |
| BC   | No DB secret                            | PASS         | No DB driver/config/credential; source and bundle boundary scans.                                              |
| BD   | CORS/auth transport documented          | PASS         | Actual CORS/Lax/secure/CSRF/default origins documented; live cross-site unverified.                            |
| BE   | Backend blocker discipline              | PASS         | B1-B4 record capability, current behavior, missing contract, invalid workaround, suggested extension.          |
| BF   | No protected DB use                     | PASS         | No backend startup, database connection, migration/seed/test.                                                  |
| BG   | Typecheck                               | PASS         | npm run typecheck exit 0; Astro 14 files, zero diagnostics.                                                    |
| BH   | Lint                                    | PASS         | ESLint, graph/import checks and Prettier pass.                                                                 |
| BI   | Unit tests                              | PASS         | 36 Vitest unit/component tests pass.                                                                           |
| BJ   | Storefront tests                        | PASS         | Host/kind/theme/SEO/fixture-safety tests and browser storefront cases.                                         |
| BK   | Admin tests                             | PASS         | 17 Admin component tests plus scope/sign-in browser cases.                                                     |
| BL   | Theme isolation test                    | PASS         | Fresh fixtures, distinct token maps and browser host isolation.                                                |
| BM   | StorefrontKind test                     | PASS         | Deterministic MARKET/VENDOR and allowed-template tests.                                                        |
| BN   | GraphQL typing test                     | PASS         | Generated operations compile; cross-client @ts-expect-error plus runtime denial.                               |
| BO   | Permission rendering test               | PASS         | Permission-filtered nav/direct-route component and browser tests.                                              |
| BP   | Entitlement rendering test              | PASS         | Allowed/denied/unloaded neutral feature tests.                                                                 |
| BQ   | Error-state tests                       | PASS         | All major safe error presentations and transport classes tested.                                               |
| BR   | Accessibility tests                     | PASS         | Eight browser tests with zero axe violations on checked views.                                                 |
| BS   | Build storefront                        | PASS         | Storefront Node SSR build exit 0.                                                                              |
| BT   | Build Admin                             | PASS         | Admin static Vite build exit 0.                                                                                |
| BU   | Root build                              | PASS         | Root build completes both apps.                                                                                |
| BV   | Development startup                     | PASS         | Individual apps in Playwright; combined dev:fixtures HTTP 200 evidence.                                        |
| BW   | Backend unchanged                       | PASS         | Matching before/after porcelain plus 356 SHA-256 hashes.                                                       |
| BX   | Backend-contract doc                    | PASS         | docs/backend-contract.md includes map, auth, codegen and B1-B4.                                                |
| BY   | Frontend architecture doc               | PASS         | docs/frontend-architecture.md covers required permanent boundaries.                                            |
| BZ   | Phase 13A report                        | PASS         | This report includes versions, results, limits and all 83 gates.                                               |
| CA   | README                                  | PASS         | README installation/dev/codegen/test/build/boundaries/fixture warnings.                                        |
| CB   | No deployment                           | PASS         | No hosting/DNS/deployment/remote Git action.                                                                   |
| CC   | No real production branding dependency  | PASS         | Local original SVG and explicitly development-only branding.                                                   |
| CD   | No Phase 13B+ scope creep               | PASS         | Only shell/route/transport foundations; no Phase 13B+ operational screens.                                     |
| CE   | Reusable onboarding architecture        | PASS         | Request/config/theme extension points, one app per surface.                                                    |

## Git isolation

Frontend status contains the expanded README and new local configuration/apps/packages/scripts/tests/docs/lockfile. Full final status is recorded in docs/evidence/frontend-status.txt. Changes are intentionally uncommitted.

Backend before and after have exactly these pre-existing entries:

```text
 M README.md
 M package.json
 M src/index-worker.ts
 M src/index.ts
 M src/plugins/billing-entitlements/billing-entitlements.plugin.ts
 M src/plugins/communications/communications.plugin.ts
 M src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts
 M src/plugins/payments/payments.plugin.ts
 M src/plugins/pos-integration/pos-integration.plugin.ts
?? scripts/
?? src/database-migrations.ts
?? test/database-startup/
```

The baseline and final manifests confirm no added Phase 13A backend change. No reset/clean was performed. No database, remote repository, hosting account, DNS or deployment state was changed.

## Phase 13B.5 addendum

The preceding content records the historical phase and remains historical evidence. Phase 13B.5 adds later backend and real integration proof in [the new implementation report](frontend-phase13b5-integration-implementation.md). VENDOR-B1 through VENDOR-B6 and Phase13A-B2 are CLOSED: owned catalog list/detail/canonical currency/options, independent operational inventory, owned operational orders, current Market display names, native publication state, exact optional boundary availability and current own Market identity. Phase13A-B1 public hostname/discovery, B3 production many-domain cookie/CORS/CSRF and B4 Market communications remain OPEN.

The production adapters use named generated contracts. Inventory requires ManageOwnInventory under the existing owner policy and remains usable when analytics is denied or unconfigured. Market uses ownMarketIdentity for shared bootstrap only. Publication state is reread from actual native/domain facts. ownEntitlements stays separate from ownFeatureAvailability. Eight bound and one unbound real browser tests, ten backend contract groups per profile, full recursive Phase1-11 plus Phase12 backend regressions, eighty frontend unit tests, twenty-one frontend browser regressions and both builds pass. The protected vendure DB was untouched; no real provider, remote Git or deployment operation occurred. [Evidence](evidence/phase13b5/acceptance.json) contains the full A through DC list.

Phase13A gate K's automatic Market bootstrap limitation is resolved by the exact-channel, current-role and current-human-membership projection and real cookie login/revocation tests. Other historical live storefront, communications and production authentication limitations remain deferred. This addendum does not reclassify unrelated original evidence.
