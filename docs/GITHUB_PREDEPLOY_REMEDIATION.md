# GitHub pre-deployment remediation

November 22, 2026. This report covers the local backend and frontend working trees and the authorized Git index changes. It follows the [pre-deployment audit](GITHUB_PREDEPLOY_AUDIT.md).

## Executive summary

The backend's credential-bearing `.env` and the frontend's three generated demo-account manifests are out of their Git indexes and protected by ignore rules. Their local copies are byte-for-byte unchanged. The frontend documentation now points to local account information in place of the shared demo password. Both current Docker contexts exclude local credentials and artifacts from allowlisted locations while keeping the previously qualified release payloads.

| Decision | Backend | Frontend |
| --- | --- | --- |
| Prepare for commit | Yes. Review the 38 staged deletions and stage the remediation and release files selectively. | Yes. Review the 13 staged deletions and stage the redactions and release files selectively. |
| Push to GitHub | **Blocked.** Coordinate rotation for active or reused credentials and decide the disposition of committed history. | **Blocked.** Confirm the remaining test-tooling credentials are isolated, resolve the evidence review, and decide the disposition of any confirmed sensitive history. |
| Build on Railway from GitHub | **Blocked at current `HEAD`.** The working-tree candidate passes static context checks. The committed tip still has the legacy Dockerfile. | **Blocked at current `HEAD`.** The working-tree candidate passes static context checks. The release and gateway Dockerfiles are still untracked. |

## Implemented locally

| Repository | Working-tree changes | Index-only deletions |
| --- | --- | --- |
| Backend | Updated `.gitignore` and `.dockerignore`. Added a sanitized ordinary-development `.env.example`. Cleared the literal DB password from `.env.demo-market-operations.example` and documented filling it in locally. Both existing staging examples remain addable. | `.env`, 18 outputs under `test/analytics/.runtime/`, 14 under `test/frontend-integration/.runtime/`, and the five `.loyalty-rewards-*.log` files. |
| Frontend | Updated `.gitignore` and `.dockerignore`. Redacted the shared password from 29 Markdown files, including `docs/manna-roots-demo-orders.md`, `docs/testing-vendors.md` and `docs/boerne-test-market.md`. The three named guides now use local manifest or account references. The Boerne guide uses a placeholder for its private application link. Updated `docs/frontend-phase13c-market-admin-implementation.md` to explain where the raw Git inventories are generated. | Three account manifests, two scratch login scripts, five customer-browser artifacts, two redundant backend Git inventories, and one finance CSV. All originals remain on disk. |

The frontend local files removed from the index are:

- `docs/demo-customer-account.json`, `docs/testing-vendors.json` and `docs/testing-vendor-manna-roots.json`. The seed tools continue using these paths. Vendor-scoped output under `docs/testing-vendor-*.json` is also ignored.
- `.tmp/check-loyalty-api.cjs` and `.tmp/verify-manna-loyalty.mjs`. Both used the same demo password. No project references requiring these scratch scripts were found.
- `.tmp/customers-details-refinement/.last-run.json`, the nested `error-context.md`, and the three `customers-{390,768,1280}.png` files in its responsive test output. The error snapshot included contact and purchase detail from a demo login. These were generated scratch outputs.
- `docs/evidence/phase13c/backend-before.json` and `docs/evidence/phase13c/backend-after.json`. They were identical Git inventories. The associated report and validation summaries remain in Git.
- `docs/financial-reporting/browser-export.csv`. The browser tooling writes a local copy to this path. The capture contains financial totals. No email, street, or customer-name fields were found in the targeted check. Financial test instructions and expected totals remain available.

### Git and Docker protection

- Backend Git ignores dotenv files at any level and explicitly keeps the ordinary, demo and two staging examples at the root. It also protects generic logs, temporary files, coverage and browser test output. Existing ignore rules continue to cover persistent demo state, generated Vendure assets and nested test runtime directories.
- Frontend Git retains the current dotenv and staging exceptions. It now ignores root `.vendure/` and `.tmp/`, the credential manifests, the two raw Git inventories and the finance export. There are 93 other already-tracked files under `.tmp/`. The targeted pass preserved those existing screenshots and artifacts.
- Both Git ignore files protect designated local credential and backup directories, private key and certificate formats, dumps, browser auth state and HAR captures. Representative migration, source, public asset, test-fixture and release paths remain eligible for tracking. The SQL test fixture remains visible for review.
- Both Docker contexts retain default-deny allowlists. Final exclusions reject credential stores and key files, backup artifacts and browser auth captures even under admitted paths. The frontend also blocks nested runtime directories, caches, test output, build output, and named credential and session-state JSON inside `apps/*/src/`, `apps/*/public/` and `packages/*/src/`. The Dockerfiles, package dependencies and image layouts were preserved.

## Owner review required before push

### Credentials and history

- **Backend.** The local recorded push at `75092f1` includes both `.env` revisions, `3ea5777` and `75092f1`. The exposed types are PostgreSQL password, SuperAdmin password and cookie signing secret. Verify where each value is or was accepted. Rotate the active or reused DB and administrator credentials, replace the cookie secret where used, and coordinate session invalidation if needed. The old demo example at `9fb3631` repeated the local DB default. That default is still present in local Compose, the guarded demo runner and some test tooling. Confirm these cannot authenticate to shared systems. Coordinate any change to local development configuration with the account owner so existing data remains usable.
- **Frontend.** The recorded push at `073475b` includes the demo manifests from `6f0386c`, the scratch scripts and browser artifact from `5886fab`, and the finance CSV from `4e6873e`. Determine whether the seeded customer, vendor, manager or platform accounts can be reached through a shared or remote environment. Rotate or disable the exposed credentials wherever they are active or reused. Keep staging credentials independent of all known local defaults.
- **Remaining exact demo-password copies.** The local candidate still contains the shared literal in the tooling below. They are outside the release Docker contexts. Some exercise running demo workflows. Before push, confirm the values are confined to isolated or disposable environments. If any authenticate to a reachable account, replace the source fallback with locally supplied credentials with the owner's approval and rotate the exposed credential. This pass preserved how those test workflows sign in.

| Location | Exact paths |
| --- | --- |
| `scripts/` | `finance-browser.ts`, `production-hardening-environment.ts`, `test-account-signup-onboarding.ts`, `test-account-switching.ts`, `test-operations-live.ts`, `test-unified-account.ts` |
| `tests/e2e/` | `compliance-phase3-live.spec.ts`, `documents-live.spec.ts`, `market-live.spec.ts`, `notifications-live.spec.ts`, `platform-admin-live.spec.ts`, `ui-refinement-live.spec.ts`, `vendor-live.spec.ts` |

The index deletions leave the old blobs reachable through existing commits. GitHub repository privacy limits access but still gives authorized readers and integrations access to committed history. After rotation, assess whether to remove historic secrets or confirmed private evidence from the intended refs. A coordinated rewrite would change commit IDs and require agreement on protected branches, automation, clones, forks and cached copies. It cannot recall pre-existing copies. Verify the current GitHub refs and access with the owner before making that decision.

### Evidence

Targeted text inspection of the retained Phase 13C.5 JSON found reference metadata and test results. It did not establish the provenance of the images or every captured record. The following exact scopes are **requiring owner review before push**:

- `docs/evidence/phase13c5/`. Prioritize `live-market-*.png`, `live-browser-results.json`, `live-integration.json`, `live-market-browser-results.json`, `live-market-integration.json`, `live-unbound-browser-results.json`, `live-unbound-integration.json`, and `vendor-fixture/{customers,orders}-*.png`. Existing implementation and test documents reference this evidence. Keep representative sanitized records and decide separately about any private originals.
- `docs/financial-reporting/vendor-desktop.png`, `docs/financial-reporting/vendor-mobile.png`, `docs/financial-reporting/browser-results.json` and `docs/financial-reporting/browser-failure.json`. Check whether the captures or report rows came entirely from synthetic fixtures. The CSV is out of the index and requires a separate history decision if it contained private amounts.

The affected current and historical artifacts should be reviewed locally. This pass preserved the evidence that could not be classified confidently and left architecture, security decisions and referenced historical records available.

## Release candidate

The release set is the reviewed current application revision plus the packaging additions. Staging only the Dockerfiles would omit source used by the qualified images.

| Repository | Required candidate paths and decisions |
| --- | --- |
| Backend | Stage the current `Dockerfile`, new `.dockerignore`, `package.json`, `package-lock.json`, and both `.env.staging.*.example` files. Review and stage the full `src/` change set, including the API and worker, `src/{database-options,deployment-environment,hosted-api,hosted-database,runtime-environment,migrate-hosted,register-storefront-hostname}.ts`, the existing migration gate, hostname operator plugin, deployment policies, and all five new `src/migrations/1797*.ts` or `1798*.ts` files. Preserve the checked-in TypeScript configs and three email templates. Review the local-only `docker-compose.yml` separately. Include the SQL fixture at `test/production-hardening/vendure-38-order-fixture.sql` only once its provenance and need as a reproducible test input have been accepted. |
| Frontend | Stage `Dockerfile`, `Dockerfile.gateway`, `.dockerignore`, `.gitattributes`, both `.env.staging.frontend-*.example` files, `.env.example`, and the root and workspace package manifest and lock changes. Review and stage the complete `apps/admin/`, `apps/storefront/` and `packages/` change sets, including the private API helper, hosted configuration, storefront resolver and preview flows, generated GraphQL clients, UI/theme and checkout dependencies, and checked-in public artwork. The existing local deletion of `apps/storefront/src/lib/prepare-market-checkout.ts` belongs in the review. No remaining path or name references were found in application, package, script or test source. |
| Frontend release scripts | Preserve `scripts/serve-admin.ts`, `scripts/start-storefront.ts`, `scripts/frontend-build-environment.mjs`, `scripts/frontend-build-manifest.ts`, `scripts/frontend-production-http.ts`, `scripts/frontend-tooling.ts`, `scripts/Caddyfile.hosted`, `scripts/hosted-gateway.mjs` and `scripts/run-hosted-gateway.sh`. Review `scripts/test-hosted-topology.ts` and `scripts/test-gateway-release.ps1` with the qualification sources. |
| Separate review | The pre-existing edits to local demo and test tooling, front-end `.claude/launch.json`, and new security, UI and theme documentation should be reviewed on their own merits. Deployment guidance from the four staging reports can be committed after editorial and privacy review. Keep this remediation report and the audit local until the owner decides whether to publish them. |

## Automated verification

| Check | Result |
| --- | --- |
| `git diff --cached --name-status` and `git ls-files` against the planned paths | Exactly 38 backend and 13 frontend deletions. No staged additions or modifications. All 51 paths are out of the indexes. |
| SHA-256 comparison, `git show-ref`, reflog comparison and Git configuration file comparison | 42 protected backend files and 14 protected frontend files match the pre-change bytes. This includes all 51 local copies, frontend and backend local environments, and the sampled local backup paths. Both branch tips, refs, reflogs and configs match the pre-change state. |
| `git check-ignore -q --no-index` against sensitive and addable controls | 45 excluded and 11 visible paths in the backend. 22 excluded and 12 visible paths in the web repo. Staging examples remain addable and sensitive template fields are blank. |
| `git diff --cached --check` and scoped `git diff --check` | Both repositories passed the index and remediation-edit checks. |
| Static Docker allowlist replay against index paths and addable files | 487 backend and 886 frontend payload paths. The filter changes removed no existing payload paths and admitted no Git-ignored files. Nineteen backend and 31 frontend named input checks passed, including all 91 migration sources, generated clients, packages, app configs, operator script and gateway files. Seventeen backend and 21 frontend sensitive and output controls were excluded. |
| Dockerfiles, lock files and launch script | Working backend Dockerfile verified as the multi-stage release replacement. The three Dockerfiles declare only the eight existing public frontend build args. Manifest and lock declarations agree. Linux x64 Tailwind Oxide, Satteri, Sharp and libvips entries were verified. `git check-attr eol` and a byte check confirmed the gateway shell script stays LF. |
| Focused syntax | `node --check scripts/hosted-gateway.mjs`, `node --check scripts/frontend-build-environment.mjs`, and `bash --noprofile --norc -n scripts/run-hosted-gateway.sh` passed. Git Bash required execution outside the sandbox after a Windows permission error. |
| Redacted pattern and exact-value checks | Scanned 110 changed or addable backend text paths and 355 frontend paths before adding this report. No confirmed provider credential was found in those candidates. Fixture and policy-test literals, the backend local DB default, and the 13 exact frontend tooling copies are reported separately. No exact demo-password copy remained in candidate frontend Markdown, scratch files or deployable app/workspace source. `git merge-base --is-ancestor` verified the affected history against the latest locally recorded push for each repo. |

The Docker check was static. It used existing local files and the working-tree recipes, with the historical [Phase B3/C release qualification](STAGING_DEPLOYMENT_PHASE_B3_C_PREPARATION.md) as build evidence. GitHub and Railway state, provider-side validity, binary evidence provenance and exhaustive historical secret coverage remain unverified. The persistent `vendure_demo_market_ops` database, local uploads, runtime recipes, existing accounts and credential values were preserved. No service or database connection was used in verification.

## Selective staging and commit sequence for owner approval

Run these in the indicated repository roots only after reviewing the proposed commits. The 51 authorized deletions are already staged. `--name-status` views show paths without printing the deleted secret content.

### Backend

```powershell
# Commit 1 after review: index removals and template/ignore protection.
git diff --cached --name-status
git add -- .gitignore .env.example .env.demo-market-operations.example
git diff --cached --check
git diff --cached --name-status
git commit -m "Protect local environment and generated test output"

# Commit 2: review the application and test sets before staging.
git diff --name-status -- src scripts test static/email/templates
git ls-files --others --exclude-standard -- src scripts test static/email/templates
git add -- Dockerfile .dockerignore package.json package-lock.json .env.staging.api.example .env.staging.worker.example
git add -A -- src static/email/templates
# Stage reviewed test and tooling paths by name, including the applicable hosted checks.
git add -- scripts/register-storefront-hostname.ts test/database-startup/hosted.ts test/database-startup/release-smoke.ps1
git diff --cached --check
git diff --cached --name-status
git commit -m "Prepare the Vendure Railway release"
```

The second batch requires review of all accompanying code, migrations and legitimate test changes before its final commit. Include the intended test and tooling paths using explicit path arguments. Keep any unapproved changes out of that commit, and resolve any required dependency before committing a partial release.

### Frontend

```powershell
# Commit 1 after review: index removals, ignore rules and exact Markdown edits.
git add -- .gitignore
$redactions = @(
    'docs/boerne-test-market.md'
    'docs/DOCUMENTS_AND_COMPLIANCE.md'
    'docs/DOCUMENTS_COMPLIANCE_PHASE_3.md'
    'docs/DOCUMENTS_PHASE_2A_APPLICATION_INTEGRATION.md'
    'docs/EXPENSE_HISTORY_REFUND_DETAILS_UI.md'
    'docs/financial-reporting/implementation-report.md'
    'docs/financial-reporting/manual-testing.md'
    'docs/frontend-phase13c-market-admin-implementation.md'
    'docs/inPersonPayments/STAGE_A_TESTING.md'
    'docs/inPersonPayments/STAGE_B_TESTING.md'
    'docs/inPersonPayments/STAGE_C_SQUARE_SETUP.md'
    'docs/inPersonPayments/STAGE_D_IMPLEMENTATION_SUMMARY.md'
    'docs/inPersonPayments/STAGE_D_TESTING.md'
    'docs/inPersonPayments/STAGE_G_MANUAL_TESTING.md'
    'docs/LOYALTY_REWARDS_TESTING.md'
    'docs/manna-roots-demo-orders.md'
    'docs/MARKET_DAY_PACKING.md'
    'docs/MARKET_LOYALTY_TESTING.md'
    'docs/phase14-manual-testing.md'
    'docs/phone-verified-accounts-platform-input-validation.md'
    'docs/PLATFORM_NOTIFICATIONS_PHASE_2B.md'
    'docs/POS_CHECKOUT_FINANCIAL_DISPLAY_CORRECTIONS.md'
    'docs/PRODUCT_CATEGORY_PHASE_D.md'
    'docs/QUICKBOOKS_ONLINE_INTEGRATION.md'
    'docs/sms-verification-signup-ux-fixes.md'
    'docs/testing-vendors.md'
    'docs/UI_COMPONENTS/Local-Test-Checkout.md'
    'docs/unified-account-signup-onboarding-implementation.md'
    'docs/UNIFIED_AUTHENTICATION_IMPLEMENTATION.md'
    'docs/VENDOR_CATEGORY_MANAGEMENT.md'
)
git add -- $redactions
git diff --cached --check
git diff --cached --name-status
git commit -m "Keep generated demo credentials and captures local"

# Commit 2: approve the complete workspace source sets before staging.
git diff --name-status -- apps packages scripts tests
git ls-files --others --exclude-standard -- apps packages scripts tests
git add -- Dockerfile Dockerfile.gateway .dockerignore .gitattributes .env.example .env.staging.frontend-build.example .env.staging.frontend-runtime.example package.json package-lock.json
git add -A -- apps/admin apps/storefront packages
git add -- scripts/Caddyfile.hosted scripts/frontend-build-environment.mjs scripts/frontend-build-manifest.ts scripts/frontend-production-http.ts scripts/frontend-tooling.ts scripts/hosted-gateway.mjs scripts/run-hosted-gateway.sh scripts/serve-admin.ts scripts/start-storefront.ts scripts/test-gateway-release.ps1 scripts/test-hosted-topology.ts
# Stage the remaining approved qualification scripts and tests by exact path.
git diff --cached --check
git diff --cached --name-status
git commit -m "Prepare the Admin, Storefront and gateway Railway releases"
```

Review the staged output before each commit and include any additional approved dependencies before the final release commit. Stage changes that serve separate work in their own reviewed commit. These sequences prepare snapshots. The rotation, privacy and history gates still apply to any push.

## Owner checklist

- [ ] Verify GitHub visibility, branch tips, historical access and integration access for both repos. Confirm that no additional ref containing exposed material will be published.
- [ ] Coordinate backend DB, SuperAdmin and cookie remediation where active or reused. Confirm local demo account isolation, replace reachable scripted defaults, and rotate or disable exposed demo accounts as applicable.
- [ ] Review the named browser and finance evidence. Agree on sanitized copies and determine whether sensitive historic artifacts warrant removal from intended refs.
- [ ] Approve the candidate commit boundaries, perform a redacted scan of the actual staged tree and intended history, and authorize any GitHub synchronization separately.
- [ ] Use the reviewed release commits at the repository roots. Pin the backend API, worker and temporary migration job to the same release. Select the correct Stage B3/C build args and launchers for the frontend Admin, Astro and gateway services.
- [ ] Provision isolated staging runtime credentials and database settings. Qualify the exact committed release images, migration sequencing, readiness and Tunnel/Access routing before staging traffic. Keep the persistent local demo environment outside this provisioning.

## Final GitHub Release Preparation

November 22, 2026. This update records the subsequent local commits and supersedes the earlier readiness holds. The owner confirmed the previously exposed backend values are local-only, approved known demo credentials in legitimate test tooling, and confirmed the browser evidence contains no sensitive personal information. The targeted scan found no different external credential that blocks push.

| Repository | Local commit | Message |
| --- | --- | --- |
| Backend | `40f88b8` | Protect local environment and generated test output |
| Backend | `ddd3251` | Prepare Vendure for the Railway staging release |
| Frontend | `5dd61d8` | Keep generated browser evidence and demo outputs local |
| Frontend | `6a5a6b4` | Prepare Admin, Storefront and gateway for Railway |

Final backend SHA `ddd325103096afa7c3cf488cf3f9555997b92368`. Final frontend SHA `6a5a6b40c1c5a7011e41e8e2b45862f05e6bfb26`. Both branches are `main`, two commits ahead of their locally cached `origin/main` refs.

### Cleanup and retained files

- **Frontend.** Untracked 572 additional local files, about 51.72 MiB. This includes 93 scratch files, 382 generated files under `docs/evidence/`, 82 UI gallery evidence files, and 15 browser and automated-test outputs under `docs/financial-reporting/`. The earlier 13 removals were preserved, for 585 total index deletions. Of these, 582 evidence and scratch paths represented about 54.72 MiB of the previous tracked snapshot. The eight one-off utilities under `.tmp/` remain usable at their original local paths. Finance expected totals and authored status summaries remain tracked. Application assets, design references, fixture source and tests remain tracked.
- **Backend.** Preserved the 38 authorized index deletions, including `.env` and 37 generated test and log files. The output accounts for about 101.8 KiB of the previous tracked snapshot. The sanitized ordinary and demo environment examples are committed.
- **Ignore and reference changes.** Frontend Git rules now ignore `docs/evidence/`, `docs/UI_COMPONENTS/evidence/`, and the named browser and test output patterns within `docs/financial-reporting/`. Existing `.tmp/`, Playwright, credential, upload and backup protections remain. Authored docs remain available. Evidence links now identify local output where needed. The Phase 13C.5 historical audit helper can still use the preserved local before-snapshots. Docker filters retain the already qualified default-deny structure and exclude the evidence directories.
- **History.** The affected paths still account for about 48.76 MiB across 488 unique reachable frontend blobs and 104.3 KiB across 37 unique reachable backend blobs. These are uncompressed, path-scoped estimates. Removing tracking reduced current checkout size. Historical blobs remain accessible in the existing commits.

### Committed release contents and verification

- The backend commit includes the multi-stage Dockerfile, context filter, production API and worker startup, hosted DB and migration compatibility, all 91 migrations, hostname operator command, ingress and staging storage policies, Vendure plugins, GraphQL declarations, static email templates, manifests, templates and qualification tests.
- The frontend commit includes the Admin and Astro workspace sources and public assets, generated GraphQL clients, hosted launchers and request validation, storefront and checkout changes, both Dockerfiles, Caddy and its gateway supervisor, Linux lockfile entries, staging templates and the deployment qualification scripts. The deleted checkout helper has no source references in the committed snapshot. The active checkout status module is committed.
- Each commit passed explicit staged path review, `git diff --cached --check`, and a redacted staged-content scan. The final committed snapshots passed local `COPY` and Docker context checks covering 487 backend and 886 frontend payload paths. The committed manifests match the lockfile declarations. Gateway launcher LF and the four Linux x64 lockfile entries were checked. `node --check` passed for both gateway and frontend build-environment JavaScript entry points.
- All 623 index-removed local files and three additional local env files matched their original bytes. Ignore checks passed for the removed paths and representative new credentials, dumps, uploads and evidence. Sanitized examples, legitimate test inputs, public artwork and generated GraphQL contracts remained trackable. Both indexes are empty of staged changes. The persistent development database and local credentials were preserved. Image verification relies on the existing Phase B3/C runs and static checks of the committed source.

### Readiness and owner actions

Both reviewed tips are ready for a separately authorized GitHub push and are complete Railway build inputs under the existing Phase B3/C recipes. The backend working tree is clean. The frontend has three intentionally local changes, the pre-existing `.claude/launch.json` edit and the two untracked `docs/GITHUB_PREDEPLOY_*.md` reports. Local history, remotes and accounts were preserved, with four new local commits. GitHub visibility and hosted Railway behavior remain unverified.

1. Confirm both GitHub repositories are private and verify their actual branch tips and access. Review the four commit summaries above.
2. Approve a separate push of the two reviewed `main` tips. Keep the local audit reports and launcher change outside the release.
3. After synchronization, connect the approved repositories to Railway at the documented root contexts. Use the same backend release for API, worker and the temporary migration service. Use the frontend app selector and the gateway Dockerfile as documented.
4. Generate independent staging credentials and qualify the hosted migrations, readiness endpoints and Tunnel/Access routing against the synchronized commits.
