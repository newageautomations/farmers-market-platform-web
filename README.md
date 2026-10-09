# Farmers Market Frontend Platform

For the persistent Phase 14 local demo, see [the manual testing tutorial](docs/phase14-manual-testing.md). From this folder, run `npm run demo:market-operations:reset`, then start `demo:market-operations:serve`, `demo:market-operations:admin`, and `demo:market-operations:storefront` in separate terminals. This explicitly authorized local workflow uses the sibling backend's normal application and migrations on only `vendure_demo_market_ops`, with providers disabled. It is separate from the disposable historical test suites and their earlier phase-specific backend read-only restrictions.

Phase 13A foundation, Phase 13B/13B.5 Vendor Admin and Phase 13C Market Admin: one multi-tenant Astro storefront, one shared React Admin and seven reusable packages. Backend APIs remain authoritative. No database or frontend commerce engine exists.

Requires Node 24+ (verified 24.19.0) and npm (verified 12.2.0). Pinned frameworks: Astro 7.3.5, React 19.3.0, Tailwind 4.3.3, Vite 8.3.2, TypeScript 5.9.3. See [implementation report](docs/frontend-phase13a-implementation.md) for every dependency and acceptance gate.

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Use `npm ci` for later reproducible installs. Root .env is ignored. Never copy backend env, database credentials or provider keys here. TypeScript uses a stable toolchain-compatible release.

## Local preview

```powershell
npm run dev:fixtures
```

| Preview                          | URL                                                   |
| -------------------------------- | ----------------------------------------------------- |
| Bulverde Market Day, MARKET      | http://localhost:4321 or http://market.localhost:4321 |
| Synthetic Vendor Fixture, VENDOR | http://vendor.localhost:4321                          |
| Admin with scope selector        | http://localhost:4322                                 |

Storefront fixtures use placeholder branding and empty content regions. Vendor Admin has seven operational modules and two synthetic Vendors. Select Market scope in Admin to preview Overview, Occurrences, Vendors, Operations, Analytics and Settings with two synthetic Markets, explicit grant presets and optional analytics states. All records and dates are simulated. Unknown hosts fail safely. Chromium resolves .localhost to loopback without DNS/hosts changes. Bindings are loopback only. Production builds/runtime reject fixture mode.

```powershell
npm run dev
npm run dev:storefront
npm run dev:admin
```

These start live-mode apps. The storefront shows unavailable until an approved backend host/theme projection exists. It never falls back to fixtures. Admin uses native cookie sessions, current own Vendor/Market identity and exact selected native Channel grants. Market modules use named generated Admin contracts. Use localhost consistently with backend http://localhost:3000 for real cookie tests. 127.0.0.1 and localhost are different sites. Backend startup/credentials are not managed here. See [contracts/blockers](docs/backend-contract.md).

Astro 7 permits one supervised dev session per project. Stop with Ctrl+C before another storefront dev session. A detached session can be stopped with `npm exec --workspace @market/storefront -- astro dev stop`. Browser tests use built SSR for their second context rather than a second Astro dev session.

## GraphQL

```powershell
npm run graphql:codegen
npm run graphql:schema
```

Codegen runs offline from committed Shop/Admin snapshots and operations. Add documents in packages/api/operations, regenerate and consume named API factories. Schema refresh reads the sibling backend source and its installed Vendure utilities. Override with exported `$env:BACKEND_REFERENCE_PATH` if needed. It does not read backend env, import backend configuration, bootstrap a server or connect to a database. Snapshots/provenance characterize an enabled Phase 12 profile; conditional fields still require runtime flags and authorization. Review refreshed schema/generated artifacts together.

## Checks and builds

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm exec -- playwright install chromium
npm run test:e2e
npm run verify:backend
```

Phase 13C checks use separate evidence and independent local test ports:

```powershell
$env:FRONTEND_EVIDENCE_DIR = 'docs/evidence/phase13c'
$env:FRONTEND_TEST_PORT_OFFSET = '200'
npm run test
npm run test:e2e:market
npm run check:bundles
npm run verify:contracts:market
npm run verify:backend:market
```

Run `npm run build` before browser and bundle checks. The Market browser configuration runs all Storefront, Vendor and Market regressions on ports 4521 through 4524. Clear the test variables afterward. Contract verification repeats offline schema extraction/codegen twice. Backend verification compares the existing Phase 13C baseline, including ignored runtime/build files and Git state; it never writes in the backend. Do not recapture that baseline to hide drift.

E2E requires built output and free ports 4321 through 4324. It starts/stops local fixture and production-preview servers and mocks Admin HTTP contracts. JSON evidence and screenshots are in docs/evidence. `npm run test:e2e:vendor` runs only Vendor fixtures on port 4332. `npm run format` formats source/docs. Vitest uses isolated threads to avoid Windows sandbox temporary-file drift; browser loopback servers may require normal process approval in that sandbox.

If development servers already occupy the default ports, preserve them and run the test servers on independent ports. An existing Storefront fixture can be reused explicitly after verifying its fixture identity:

```powershell
$env:FRONTEND_TEST_PORT_OFFSET = '100'
$env:FRONTEND_TEST_REUSE_STOREFRONT = 'true'
npm run test:e2e
```

This uses the existing Storefront on 4321 and creates test Admin/production previews on 4422, 4423 and 4424. Clear these two test variables afterward. Leave reuse unset when no Storefront server exists. The test offset affects only the harness.

Build produces Astro SSR and static Admin output. For local built storefront preview, run `npm run preview --workspace @market/storefront` with fixture mode false and documented API env. Live context remains blocked by B1. No deployment/hosting command exists.

## Boundaries and next phases

Only modify `E:\coding\farmers-market-platform-web`. Backend `E:\coding\farmers-market-platform` is read only. Never run its bootstrap/migrations/seeds/tests in this phase or touch protected vendure DB. Preserve the user's existing backend changes. `verify:backend:market` compares 6,393 baseline files plus HEAD and exact porcelain status, including dirty, untracked and ignored files and .git, excluding installed node_modules directories. The older `verify:backend` command remains available for historical phase evidence.

Apps and api/auth/ui/storefront-core/admin-core/theme/config packages have checked [dependency boundaries](docs/frontend-architecture.md). Future tenants extend data/theme/configuration, not copied repositories. Vendor routes remain under `/vendor`; their original blockers were closed in [Phase 13B.5](docs/frontend-phase13b5-integration-implementation.md). Market routes under `/market` support organizer settings, recurrence, occurrence commands, existing Vendor relationships, listing approval, participation, offering windows and read-only operations. Analytics remains optional and operational only. The [Market capability matrix](docs/frontend-phase13c-capabilities.md) records six OPEN MARKET-B blockers; the [Market implementation report](docs/frontend-phase13c-market-admin-implementation.md) contains every A through DX acceptance gate and evidence. Public hostname discovery, production cross-domain cookie policy and communications remain deferred. Phase 13D has not begun. No push, PR, hosting, DNS or deployment was performed.

## Phase 13C.5 Market integration

MARKET-B1 through MARKET-B6 are now CLOSED through safe backend organizer projections and production Market Admin integration. The original Phase 13C read-only implementation and its acceptance history remain documented; Phase 13C.5 supplies the subsequent bounded API closure. See [implementation report](docs/frontend-phase13c5-integration-implementation.md) and [closure addendum](docs/frontend-phase13c-capabilities.md#phase-13c5-closure-addendum).

Run `npm run test:live:market` for the dedicated real local Market suite. It owns a fresh guarded disposable `vendure_test_frontend_*` PostgreSQL database, real Vendure, fixture-disabled Admin and Chromium; successful databases are dropped, and KEEP_TEST_DB=1 preserves the existing diagnostic behavior. Existing `test:live` and `test:live:unbound` retain Vendor coverage. New evidence is under `docs/evidence/phase13c5/`. Run `node scripts/audit-phase13c5.mjs` to compare both local repositories against the captured phase baselines. No deployment or remote Git action is part of this workflow.

Unit, browser, live and bundle checks now default to the Phase 13C.5 evidence directory. FRONTEND_EVIDENCE_DIR can explicitly select another run folder; historical Phase 13C/B.5 evidence is preserved by ordinary current commands.
