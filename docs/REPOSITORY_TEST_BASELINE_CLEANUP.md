# Repository test baseline cleanup

Verified locally on October 15, 2026. This maintenance pass establishes a trustworthy frontend test, lint and formatting baseline after Documents and Compliance Phases 1 through 3. No feature, interface redesign, dependency, permission policy or production configuration was introduced.

## Starting working tree

The frontend started with 36 modified tracked files and 28 untracked status entries, including directories. Expanding those entries produced 69 existing changed/untracked files. The sibling backend started with 14 modified tracked files and eight untracked status entries. Both contained unfinished Documents and Compliance work.

Before source edits, Git status, the frontend binary diff and SHA-256 hashes of existing changed/untracked files were saved under the ignored `test-results/repository-baseline-cleanup/` directory. Checks use that directory or evidence-free reporters so historical Phase 3 evidence is preserved. No reset, clean, stash, revert, commit, remote Git operation or deployment was performed.

Final hash comparison found only the intentionally formatted `tests/e2e/documents-live.spec.ts` changed among the 69 existing frontend files. All other existing changed/untracked frontend files retained their starting hashes. Backend starting-file hashes and exact Git status remained unchanged. Backend tests used existing local fixtures and only their own guarded `vendure_test_*` databases, never a persistent development database.

Guidance reviewed: root `AGENTS.md`, `COMPONENT_USAGE_GUIDE.md`, `UI_COMPONENTS.md`, README verification instructions, `docs/ACCOUNT_SWITCHING_AUTH_ARCHITECTURE.md`, the Phase 14 implementation/manual testing guides and `docs/DOCUMENTS_COMPLIANCE_PHASE_3.md`. Backend authorization and fixture sources were inspected where necessary.

## Measured verification

| Verification                              | Before correction                                                   | After correction                                                           |
| ----------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Complete frontend Vitest suite            | 448 passed, four failed; 35 files, 452 cases                        | 452 passed, zero failed; all 35 files                                      |
| `market-c5.test.tsx`                      | Eight passed, two failed                                            | Ten passed                                                                 |
| `market.test.tsx`                         | 72 passed, two failed                                               | 74 passed                                                                  |
| Shared dialog lifecycle                   | 25 passed in the baseline suite                                     | 25 passed in targeted and complete suites                                  |
| Full ESLint                               | Six errors, two warnings                                            | Zero errors, zero warnings                                                 |
| Workspace source/dependency boundaries    | Combined lint stopped before this stage                             | All nine workspaces pass                                                   |
| Repository Prettier check                 | Six failing files                                                   | All matched files pass                                                     |
| Frontend TypeScript and Astro             | Not separately measured before edits                                | Pass; 84 Astro files, zero errors, warnings or hints                       |
| Frontend local builds                     | Not separately measured before edits                                | Astro SSR and Admin Vite builds pass                                       |
| Production artifact marker check          | Not separately measured before edits                                | 111 files pass                                                             |
| Existing backend Market HTTP suite        | 19 scenarios passed during investigation                            | Same 19 passing scenarios remain applicable; backend unchanged             |
| Additional Market revocation coverage     | Not present                                                         | Ten real backend/cookie groups pass                                        |
| Existing Vendor/Market HTTP regression    | Raw legacy fixture denied its unverified staff actor                | Ten original groups pass through the documented fixture-completion adapter |
| Existing account-switching Chromium suite | Not separately measured before edits                                | Six groups pass, desktop and mobile                                        |
| Existing native-dialog Chromium case      | Additional investigation found an animation/contrast timing failure | Three consecutive repetitions pass with all original assertions            |

The combined targeted run of Market, C5 and dialog lifecycle tests passed all 109 cases. No test was deleted, skipped or isolated with `.only`; the full Vitest count remains 452.

## Original four test failures

1. **C5: selects a safe directory Vendor with deliberate pending status and authoritative relationship reread.** `findByLabelText('Vendor business')` matched both the labeled combobox and the named listbox. The rendered structure is the approved SEL-07 searchable control: `aria-controls` connects the combobox to its listbox, expanded/hidden/inert state controls exposure, and options express committed selection. A generic label query also finds the hidden listbox. This was test ambiguity, not duplicate visible controls or an accessibility defect. The test now scopes accessible role/name queries to the Add Vendor dialog and listbox, clicks the actual option, verifies its displayed label, and retains the exact pending mutation and authoritative reread assertions. Setting the old numeric select value is no longer the correct interaction.
2. **C5: requests page two of the eligible directory from the server adapter.** It failed at the same ambiguous label query, before reaching an obsolete Next button expectation. Current `AddVendor` uses debounced bounded server search, with an instruction to narrow results, instead of a paged dropdown. The corrected case verifies the 20-row initial request, absence of Vendor 21 from that initial page, the exact server search parameters, a single returned option and its committed selection. It also retains an explicit adapter page-two assertion with `skip: 20`. The UI and backend paging contract are unchanged.
3. **Market Operations: renders allowed operational fields only even when an HTTP mock injects private extras.** The test expected `Partially Completed` and `Awaiting`. Current `OperationalPurchases` displays the native order state `PartiallyDelivered` and pickup values `PARTIALLY_COMPLETED` and `AWAITING`. Existing `vendorOrderStatus` owns their semantic colors; unknown pickup values remain neutral. The test now checks these exact visible values and their existing neutral/warning classes, while retaining private-data exclusion, quantity, no-action and financial-claim assertions. The approved BDG-02 registry keeps domain mappings feature-owned. Neither status meanings, mappings nor backend transitions changed.
4. **Market authority loss: next protected forbidden request clears loaded content and requires fresh bootstrap.** Losing all native business-read grants correctly renders Admin's existing `Your account` view. `Workspace unavailable` is used when a business workspace remains selectable but its context cannot be authorized. The test now triggers an actual protected configuration mutation denial, verifies the personal dashboard link and Sign out, verifies protected content disappears, then remounts at a stale Market Channel URL. It verifies no Market read or account-switching control is restored and no private error details appear. Production account switching and login code remain unchanged.

## Permission revocation and isolation findings

The personal-account fallback is intentional and safe within the tested boundaries. A navigation choice is not authority. `resolveAdminContext` intersects native Channel grants with fresh own-business identity and validates Market membership, principal, role and Channel. Backend `TenantAccessPolicy` reloads current grants and active membership. `AdminApp.refreshSession` clears role services/context and advances its request generation. `guardMarketService` permanently rejects an invalidated service and also checks revocation after awaited results. Existing read hooks discard outdated service/tenant results.

The frontend-owned `scripts/test-workspace-authorization.mjs` reuses the installed sibling backend's `startOperationsHarness`, `CookieClient`, account services and guarded database lifecycle. It introduces no authentication implementation or response mocks. Its default mode creates separate fixture grants for Market A and B so revoking A can be checked independently. It exercises both membership revocation and native `ReadOwnMarket` grant removal, then loss of all Market memberships.

| Required security property                                  | Evidence executed                                                                                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Revoked Market management authorization disappears          | Existing Market bootstrap invalid-membership/principal/role/Channel cases, fresh-grant intersection, real backend membership/grant denial and affiliation removal                                                              |
| Direct protected API access is denied                       | Existing Market suite checks twelve protected reads after each revocation type; additional runner checks own identity/configuration with the existing cookie and a new login                                                   |
| Cached Market content does not reach the personal workspace | Corrected UI denial case asserts removal of the Market fields/name; all six Market route-switch cases assert old-tenant removal                                                                                                |
| Switching cannot restore revoked access                     | Real same-cookie A to B to A checks deny A throughout; fresh contexts exclude A; Vendor access cannot read either Market's protected resources                                                                                 |
| Late asynchronous data cannot repopulate protected content  | Existing delayed C5 tenant-read, generation-polling and Market service in-flight revocation cases pass; stale service results reject after revocation                                                                          |
| Other Market and Vendor accounts remain isolated            | B stays readable while A is revoked; Vendor retains its own identity and is denied Market reads; existing cross-Market resource attacks and Vendor ownership suite pass                                                        |
| Refresh cannot restore revoked access                       | UI remount at `/market/settings?channel=1` performs no protected Market read; real fresh native sessions still receive runtime denials                                                                                         |
| Authorized personal functionality remains available         | Existing central capability still reads the same personal profile after each revocation and after all Market affiliations disappear; personal navigation/Sign out remain available; six existing switching browser groups pass |

The HTTP denial helper rejects GraphQL validation errors as proof of authorization. Only valid runtime denials count. No authorization defect was found, so no production permission, account bridging, login, backend source or database schema change was needed.

### Legacy Vendor fixture completion

The raw sibling `test/frontend-integration/run.ts` failed at its first scenario's `staff.ok(catalog)` call, after the owner reads succeeded. Its harness creates `frontend-staff@test.invalid` after the existing verified-phone fixture has run. Current account authorization correctly denies that actor without its required synthetic phone proof.

The frontend runner's `--vendor-regression` mode completes the existing guarded `verifiedFixturePhones` helper after harness setup, then runs every original Vendor/Market HTTP assertion unchanged. It creates no role or membership for the staff actor and changes no production policy. All ten original groups then pass, including same-cookie Vendor membership/native-role loss, Market bootstrap/revocation, owned catalog/order/inventory projections and foreign-resource rejection. This is a test-data adapter within the current frontend folder. The raw sibling command still needs that fixture completion upstream; no backend source fix is claimed.

## ESLint corrections

| Starting location                                   | Rule and correction                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/admin/src/market/phase14/InvoiceTable.tsx:49` | `jsx-a11y-x/no-noninteractive-tabindex`: retained keyboard focus on the labeled horizontal scroll region. Moved its existing exact-rule suppression to the actual `tabIndex` line. A scroll region needs keyboard access and must not be mislabeled as a button. This also removes the unused-directive warning at line 43.                |
| `apps/admin/src/market/schedule.tsx:69`             | `jsx-a11y-x/label-has-associated-control`: reused approved `SelectField` for Repeat, retaining controlled value, optional native form semantics, options and change handler. No scheduling logic changed.                                                                                                                                  |
| `packages/ui/src/dialog.tsx:143`                    | `react-hooks/exhaustive-deps` warning: capture the close-event counter object during effect setup for use by its cleanup.                                                                                                                                                                                                                  |
| `packages/ui/src/dialog.tsx:158`                    | `react-hooks/set-state-in-effect`: reset transition presentation when the controlled `open` prop changes; update animated-close state from events/timer callbacks. Native synchronization effects now only synchronize native state and cancel timers.                                                                                     |
| `packages/ui/src/dialog.tsx:212`                    | `jsx-a11y-x/click-events-have-key-events` and `jsx-a11y-x/no-noninteractive-element-interactions`: subscribe to the native dialog backdrop click in an effect, preserving pointer-origin checks, opt-in dismissal and the existing Escape/cancel path. The dialog is not assigned fake interactive semantics.                              |
| `packages/ui/src/dialog.tsx:245`                    | `react-hooks/refs`: a private, markup-free `DialogContent` adapter passes the existing event-only dismissal callback to the render prop. No lifecycle ref is read to compute children during Dialog rendering. No new UI primitive, style or public API was needed; existing primitives do not provide this internal render-prop boundary. |

No lint configuration was changed. No broad suppression was added. The only suppression touched was the existing single-rule invoice scroll-region exception, repositioned and explained above.

All 25 existing dialog lifecycle tests pass, covering busy/draft veto, native and programmatic close, delayed native events, StrictMode, unmount, parent close/reopen, render-prop dismissal, reduced motion, nested dialogs, backdrop checks and focus restoration.

### Additional browser timing correction

The native-dialog browser regression initially sampled the 180 ms entry fade before its final colors. Axe reported a transient Close-button contrast of 4.37:1. The test now waits for the dialog's actual animations to finish before running the unchanged whole-page Axe assertion. It retains keyboard opening, Escape dismissal and trigger/tab focus checks. Three consecutive Chromium repetitions pass. No CSS, color token, accessibility rule, animation or Axe scope was changed.

## Formatting and local files

The initial full Prettier check reported exactly:

- `docs/UI_COMPONENTS/Phase-A-Shared-Foundations.md`
- `docs/UI_COMPONENTS/Phase-B-Dialog-Consolidation.md`
- `docs/vendor-application-account-identity-audit.md`
- `scripts/seed-demo-customer.cjs`
- `tests/e2e/documents-live.spec.ts`
- `UI_COMPONENTS.md`

Only those files and legitimately edited cleanup files were passed to `prettier --write`. Changes are wrapping, table alignment, blank lines and newline normalization. Phase A's newline normalization leaves no normalized Git content diff. No formatter config, registry decision, historical Phase 1 through 3 finding, seed behavior or Documents browser assertion changed.

Files with substantive maintenance changes:

- `tests/market-c5.test.tsx`: scoped combobox selection, current bounded search and retained explicit page-two coverage.
- `tests/market.test.tsx`: exact native statuses/colors and stronger denial/personal-fallback/refresh assertions.
- `tests/e2e/foundation.spec.ts`: wait for the real dialog entry animation before accessibility inspection.
- `apps/admin/src/market/schedule.tsx`: reuse `SelectField` for the existing recurrence choice.
- `apps/admin/src/market/phase14/InvoiceTable.tsx`: repair the existing keyboard-scroll lint annotation location.
- `packages/ui/src/dialog.tsx`: native lifecycle, transition-state and render-prop lint corrections.
- `scripts/test-workspace-authorization.mjs`: ten real-cookie Market revocation groups and a narrowly scoped legacy Vendor fixture adapter.
- `docs/REPOSITORY_TEST_BASELINE_CLEANUP.md`: this report.

Existing shared dashboard shells, SEL-07, status maps, specialist interactions, Astro SSR and frontend/backend authority boundaries remain intact. Documents, digital agreements, notifications, scanning, storage, commerce and operational scheduling logic were not changed.

## Commands executed

Node `v24.19.0`, npm `12.2.0`, existing installed dependencies. Commands below ran from `E:\coding\farmers-market-platform-web` unless a backend directory is shown. Output was redirected to the ignored log directory named above. Vitest JSON reports used separate `baseline`, `targeted` and `final` subdirectories.

```powershell
git status --short
git diff --binary --output=test-results/repository-baseline-cleanup/initial-worktree.patch
node --version
npm --version

$env:FRONTEND_EVIDENCE_DIR='E:\coding\farmers-market-platform-web\test-results\repository-baseline-cleanup\baseline'
npm run test
npm run lint
npx --no-install prettier --check .

npx --no-install eslint packages/ui/src/dialog.tsx apps/admin/src/market/phase14/InvoiceTable.tsx apps/admin/src/market/schedule.tsx tests/market-c5.test.tsx tests/market.test.tsx
npx --no-install prettier --write tests/market-c5.test.tsx tests/market.test.tsx packages/ui/src/dialog.tsx apps/admin/src/market/schedule.tsx apps/admin/src/market/phase14/InvoiceTable.tsx docs/UI_COMPONENTS/Phase-A-Shared-Foundations.md docs/UI_COMPONENTS/Phase-B-Dialog-Consolidation.md docs/vendor-application-account-identity-audit.md scripts/seed-demo-customer.cjs tests/e2e/documents-live.spec.ts UI_COMPONENTS.md

$env:FRONTEND_EVIDENCE_DIR='E:\coding\farmers-market-platform-web\test-results\repository-baseline-cleanup\targeted'
npx --no-install vitest run tests/market-c5.test.tsx tests/market.test.tsx tests/dialog-lifecycle.test.tsx
$env:FRONTEND_EVIDENCE_DIR='E:\coding\farmers-market-platform-web\test-results\repository-baseline-cleanup\final'
npm run test
npm run lint
npm run typecheck
npm run build
$env:FRONTEND_NO_EVIDENCE='true'
npm run check:bundles
npx --no-install tsx scripts/test-account-switching.ts

node scripts/test-workspace-authorization.mjs
node scripts/test-workspace-authorization.mjs --vendor-regression
npx --no-install eslint scripts/test-workspace-authorization.mjs
npx --no-install prettier --write scripts/test-workspace-authorization.mjs tests/e2e/foundation.spec.ts docs/REPOSITORY_TEST_BASELINE_CLEANUP.md
npm run lint
npx --no-install prettier --check .
git diff --check
```

The default revocation runner initially ran under the temporary name `scripts/test-market-permission-revocation.mjs`; it was renamed to `test-workspace-authorization.mjs` when the Vendor fixture adapter was included. An initial regression setup mistake omitted `ownMarket`'s required `id` argument; that validation failure was corrected before any authorization result was counted.

Existing backend HTTP suite commands:

```powershell
Set-Location E:\coding\farmers-market-platform
$env:FRONTEND_NO_EVIDENCE='true'
$env:FRONTEND_INTEGRATION_RUNTIME='E:\coding\farmers-market-platform-web\test-results\repository-baseline-cleanup\backend-market'
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/frontend-integration/tsconfig.json test/frontend-integration/market-run.ts
$env:FRONTEND_INTEGRATION_RUNTIME='E:\coding\farmers-market-platform-web\test-results\repository-baseline-cleanup\backend-vendor'
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/frontend-integration/tsconfig.json test/frontend-integration/run.ts
Set-Location E:\coding\farmers-market-platform-web
$env:FRONTEND_INTEGRATION_RUNTIME='E:\coding\farmers-market-platform-web\test-results\repository-baseline-cleanup\backend-vendor-adapted'
node scripts/test-workspace-authorization.mjs --vendor-regression
```

Native-dialog browser commands:

```powershell
$env:FRONTEND_NO_EVIDENCE='true'
$env:FRONTEND_TEST_PORT_OFFSET='600'
node --require ./scripts/playwright-no-evidence.cjs ./node_modules/@playwright/test/cli.js test tests/e2e/foundation.spec.ts --grep 'dialog supports keyboard'
node --require ./scripts/playwright-no-evidence.cjs ./node_modules/@playwright/test/cli.js test --config test-results/repository-baseline-cleanup/dialog-playwright.config.ts tests/e2e/foundation.spec.ts --grep 'dialog supports keyboard' --repeat-each 3
```

The ordinary Astro CLI refused startup because an existing user-owned development session was already running. That server was preserved. The ignored local browser config reuses the normal config, assertions and servers on ports 4921 through 4924, replacing only the first command with programmatic Astro `dev` startup in the same storefront root. It passes the `dev` argument required by existing environment validation. An initial missing-argument startup rejection was corrected without changing validation. No production configuration was changed.

## Documents and Compliance regression

The complete frontend run includes 24 passing Documents/application-integration tests, 15 notification tests and seven Phase 3 compliance tests, 46 total. This covers Phase 2A application warning/sharing/identity boundaries, Phase 2B notifications, agreements/readiness/reporting and the shared upload adapters. It also includes 12 UI foundation tests, 25 dialog lifecycle tests, 13 Phase A tests, 23 Phase C/D tests, six Market Operations component tests, their contract test, 43 Vendor tests, six account-switching tests and 18 Admin tests. These are subsets of the 452 passing cases, not additional counts.

No backend authorization, document upload or scanning boundary changed. Backend Documents and real ClamAV suites were therefore not repeated; no new claim about scanner integration is made.

## Remaining issues and limits

- No frontend unit, ESLint, formatting, type, build or selected browser failure remains in the completed scopes. The full browser matrix and a synthetic production-profile backend build were not run. No backend source changed, so backend TypeScript/build verification was not required for this cleanup.
- The raw sibling Vendor runner still has the fixture-ordering issue described above. Use the frontend fixture adapter for the passing regression result; do not count the raw failed run as a pass.
- Existing Vite advisories about chunks over 500 kB remain. Existing backend pg concurrent-query deprecation warnings and browser `NO_COLOR`/`FORCE_COLOR` warnings remain. Expected invalid-input/denied-request logs were not hidden. ESLint has zero warnings.
- Initial sandbox loopback PostgreSQL access was denied with `EACCES`; the authorized local-network rerun completed successfully. No code failure was inferred from that infrastructure rejection.
- The original fixture lifecycle retained two diagnostic databases from unsuccessful runs: `vendure_test_operations_1792112852120_772cfa` for the new runner's corrected GraphQL setup mistake, and `vendure_test_frontend_1792112876720_2d6e15` for the raw Vendor fixture failure. They were not deleted or reused. Every successful backend run dropped its own database.
- Tests establish the enumerated local authorization and isolation properties. They do not establish production deployment, external-provider behavior, full assistive-technology acceptance or scanner health.

No additional user command is needed to apply the cleanup. Normal frontend checks remain `npm run test`, `npm run lint`, `npm run typecheck` and `npm run build`. The two `test-workspace-authorization.mjs` modes require the sibling backend's existing dependencies and local PostgreSQL. Clear task-specific environment variables after an interactive verification session.
