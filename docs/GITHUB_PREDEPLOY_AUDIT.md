# GitHub pre-deployment audit

November 22, 2026. Read-only review of the two local repositories and their GitHub-based Railway deployment inputs.

## Executive summary

**Backend GitHub verdict: Hold.** A committed `.env` contains literal database, superadmin and authentication-cookie credentials. The local Git reflog records a push of a branch tip containing both revisions of the file. Treat the values as previously shared. Determine where they are still accepted, revoke or rotate active credentials, and decide how to handle the affected history before another push. The committed Dockerfile also copies the entire repository into a single build stage.

**Frontend GitHub verdict: Hold.** The committed tree includes reusable-looking credentials for seeded local demo accounts and captured output from local account, finance and admin workflows. Git records a prior push containing those paths. The inspected demo manifests use reserved email domains, and the audit found no confirmed production secret in the frontend. Verify demo account isolation and review or sanitize the captured output before further synchronization.

**Railway verdict: Hold both repositories at their current commits.** The working-tree Docker allowlists substantially restrict the build context, and the earlier Phase B3/C qualification documented successful builds and layer checks for all four release images. GitHub would currently supply the backend's legacy single-stage Dockerfile without its allowlist, and the frontend has no committed release Dockerfiles. Commit the coordinated release inputs after the security and packaging cleanup. The frontend allowlist also needs exclusions for sensitive file types and local artifacts placed inside admitted source or public asset directories.

**Critical security findings: One.** The count is by exposure issue. The backend `.env` is one finding covering three credential types. The frontend demo credentials and private-data review are separate high-priority findings. No credential validity or account access was tested.

| Local snapshot before this report | Backend | Frontend |
| --- | --- | --- |
| Repository | `E:/coding/farmers-market-platform` | `E:/coding/farmers-market-platform-web` |
| Branch and locally cached upstream | `main` at `75092f1`, `origin/main` at the same tip | `main` at `073475b`, `origin/main` at the same tip |
| Staged changes | 0 | 0 |
| Unstaged tracked paths | 74 | 276 |
| Committed and indexed paths | 864, 9.84 MiB | 2,117, 130.27 MiB |
| Addable untracked paths | 33, 0.15 MiB | 75, 0.72 MiB |
| Ignored untracked paths | 229,014, 2.47 GiB | 73,470, 2.53 GiB |
| Tracked despite effective ignore rules | 32 | 0 |
| Unique blobs reachable from `main` | 1,334, 25.10 MiB | 3,075, 143.44 MiB |
| History-only blobs reachable from `main` | 473, 15.26 MiB | 1,060, 19.24 MiB |
| Working-tree Docker context estimate | 487 admitted payload files, 5.33 MiB | 887 admitted payload files, 62.83 MiB |

Committed size sums Git blob sizes per path. Reachable size counts each blob once across 13 commits per branch. Local counts use filesystem logical sizes and include ignored dependencies and build output. Docker counts model the current root ignore files against disk paths and omit the Dockerfile and ignore-file control inputs. Actual archive, compressed transfer and image sizes differ. Creating this report adds one untracked frontend file.

## Git inventory and push behavior

Both repos have an HTTPS `origin` on `github.com` with the expected repository name, no embedded user info or query credentials detected, and an upstream configured for `main`. Both show zero ahead and zero behind their cached remote-tracking tips. The backend reflog records 12 `update by push` entries and the frontend records 11. The latest recorded push in each repo is the current tip. Treat paths reachable from those tips as historically shared with the configured destination. Current server-side refs, access, repository visibility and retained copies require owner verification.

An ordinary branch push sends the commit graph and reachable objects that the destination needs. With the cached refs as observed, there are zero local commits ahead. An initial push of these branches to an empty destination would include older reachable revisions and deleted paths. A staged change becomes eligible for transfer after commit. Unstaged edits and addable untracked files require explicit selection or a broad add followed by commit. Ignored local files normally stay out of Git, while tracked files remain eligible regardless of ignore rules. A local Docker build uses directory contents and Docker's own filters, so tracked, untracked and Git-ignored files all need to be considered.

Neither index had symlinks, gitlinks or a submodule declaration. The project-tree walk identified no nested Git repositories or relevant symlinks outside pruned dependency, build and cache trees. Git LFS filters are installed in Git configuration. No current tracked LFS attributes or pointer blobs were found. Neither repository is shallow. Repository-local `.git/info/exclude` has no active rules, and no effective global ignore file was found.

### Backend inventory

- `src/` has 463 tracked files, 4.51 MiB, including 86 migrations. `test/` has 309, 3.30 MiB. `docs/` has 20, 0.74 MiB. `scripts/` has 51, 0.53 MiB. The three checked-in email templates total about 5 KiB.
- The largest tracked blobs are `package-lock.json` (700 KiB), `src/gql/graphql-env.d.ts` (624 KiB), `src/plugins/market-operations/service.ts` (139 KiB), `docs/backend-architecture-proposal.md` (119 KiB) and the initial native Vendure migration (118 KiB). No substantial tracked binary or exact duplicate blob above 100 KiB was found.
- Of 33 untracked paths, 17 are under `src/`, 11 under `test/`, two under `scripts/`, and three at the root. The largest is `test/production-hardening/storefront-forms.ts` at 19 KiB. The untracked `.dockerignore` and both staging templates are intended release material. The hosted entry points, platform modules and five migrations need review with their corresponding tracked edits. The new SQL fixture is addressed below.
- The largest ignored groups are `node_modules/` (1.79 GiB), `dist/` (423 MiB), `.demo-market-operations/` (186 MiB), test runtime output (51 MiB), and npm caches. Preserve the local demo dataset, uploaded documents and backups. They have different retention needs from restorable dependency and build caches.
- The Git object store reports about 7.84 MiB of loose objects. The largest historical-only blobs are older lockfiles and GraphQL declarations. History cleanup for size alone has little payoff.

### Frontend inventory

- `apps/` has 655 tracked paths, 60.34 MiB. `docs/` has 703, 47.14 MiB. `.tmp/` has 100, 12.59 MiB. `design-references/pipers_premium/` has 17, 3.74 MiB. `tests/`, `packages/` and `scripts/` contribute 5.24 MiB combined. Within `docs/`, `docs/evidence/` accounts for 38.15 MiB across 384 paths, including 287 screenshots. `docs/UI_COMPONENTS/evidence/` adds 82 paths, including 72 screenshots.
- Public assets account for 40.71 MiB in `apps/storefront/public/` and 14.72 MiB in `apps/admin/public/`. Examples among the largest are `apps/storefront/public/assets/editorial-market/categories/Rustic Golden Loaf with Sliced Bread.png` (2.32 MiB), `Warm Painterly Egg Carton Still Life.png` in that directory (2.28 MiB), `docs/evidence/phase13c5/live-market-listings-1280.png` (2.04 MiB), and `apps/admin/public/rental-stock/canopy-weights-illustration.png` (1.96 MiB). The storefront art and Admin stock imagery have application uses. Evaluate references and format or resolution changes before optimizing them.
- `docs/evidence/phase13c/backend-before.json` and `backend-after.json` are byte-identical, about 1.19 MiB each. They are repository status and path inventories, with local repository metadata. Identical screenshots also recur under `docs/evidence/phase13b*`, `docs/evidence/phase13c*` and `docs/UI_COMPONENTS/evidence/phase-a-*`. Two financial suite results are identical. Git stores identical blobs once. Removing redundant paths helps checkout size and navigability.
- Of 75 addable untracked paths, 26 are under `apps/`, 20 under `docs/`, nine under `scripts/`, eight under `packages/`, five under `tests/`, six at the root, and one under `.vendure/`. The largest is `apps/storefront/src/styles/pasture.css` at 84 KiB. `.vendure/.installation-id` is generated local metadata. The six root release files are intentional once reviewed. The new theme, checkout, security and UI files need selective review with their associated changes.
- `mobile/` accounts for 1.89 GiB of ignored content, mostly dependencies and native Android build products. This includes a 206 MiB debug APK. Root `node_modules/` is 502 MiB, app ignored output is 82 MiB, and `.runtime/` is 48 MiB. No unusually large addable file was found. Retain companion app source and its own mobile ignore rules for the separate workflow.
- The Git store reports about 65.27 MiB of loose objects and a 68.15 MiB pack. These include local objects beyond `main`. History-only blobs on `main` are mainly older generated API types, schemas, lockfiles and text. Prioritize the current screenshot/archive footprint and asset optimization. LFS and a size-driven rewrite are unwarranted on the observed history.

## Secrets and private data

1. **Backend, critical, already recorded as pushed.** `.env` is tracked, clean, and has no ignore protection in Git. `DB_PASSWORD`, `SUPERADMIN_PASSWORD` and `COOKIE_SECRET` are literal in both revisions, `3ea5777` and `75092f1`. The database host is loopback. The database value also matches the committed demo example, and the three literals are unchanged across those revisions. Confirm every use and any reuse across hosts or environments. Rotate affected active credentials and consider session invalidation where the cookie secret was used. Keep any local replacement outside Git and generate independent hosted values. A removal commit leaves the existing revisions reachable.
2. **Frontend, high, already recorded as pushed.** `docs/demo-customer-account.json`, `docs/testing-vendors.json` and `docs/testing-vendor-manna-roots.json` contain seed output with login passwords, account identifiers and contact fields. `.tmp/check-loyalty-api.cjs` has a hardcoded demo login and local API request settings. `docs/manna-roots-demo-orders.md`, `docs/testing-vendors.md` and `docs/boerne-test-market.md` contain local demo account or setup information and warrant a credential review. The three manifests appeared together in `6f0386c`, and the scratch script in `5886fab`. Preserve the seed tooling. Make populated manifest output local-only and use synthetic placeholders in published setup instructions. Confirm the passwords grant access only to isolated local or disposable demo environments. Rotate or disable known credentials wherever the accounts can be reached over a network.
3. **Frontend, high privacy review, committed.** `.tmp/customers-details-refinement/` contains a browser failure snapshot with contact and purchase detail. `docs/evidence/phase13c5/` includes live-named market screenshots and browser evidence. `docs/financial-reporting/browser-export.csv` is a committed browser export with 178 data rows and no email match. Related finance screenshots and JSON reports include browser captures, test outputs and expected totals. The inspected customer snapshot used a reserved email domain. Filenames and text scans cannot establish provenance for every screenshot, account field, address, or financial row. Review these evidence sets locally for actual buyer, vendor, transaction and contact data before retaining or redistributing them.
4. **Backend, sensitive local files adequately excluded today.** Ignored `.env.demo-market-operations` holds Stripe sandbox and webhook-shaped credentials and QuickBooks configuration. Ignored `.env.documents.local` contains document encryption material. `.vendure/backups/` includes a database dump, and `.runtime/private-documents/`, `.runtime/finance-private/` and `.demo-market-operations/` contain local documents, finance fixtures, uploads or operational state. Leave these in local storage under their existing protections. The committed `test/analytics/.runtime/` and `test/frontend-integration/.runtime/` are a separate exposure surface for historical test logs and structured outputs. No strong provider-secret marker was found in the sampled text.
5. **Frontend, sensitive local files adequately excluded today.** Ignored `.env` contains a literal platform account bridge key. Ignored `.runtime/` and demo manifests contain local test session and account metadata. Representative ignored build output, reports and logs had fixture values and normal transport references. Keep them out of Git and Docker. Prevent local test outputs from landing in application public directories.
6. **Templates and qualification input.** Both backend staging examples and both frontend staging examples use example endpoints and empty sensitive assignments. The web `.env.example` leaves the bridge key blank. The backend `.env.demo-market-operations.example` uses a literal local DB default. Replace it with a clear placeholder once local runner expectations are checked. `test/production-hardening/vendure-38-order-fixture.sql` is an addable 2.7 KiB SQL fixture with three targeted insert tables, a reserved-domain address and test markers. No dump header, bulk COPY, or live credential signature was found. Confirm it is an intended repeatable test input before committing it.

The local scan used filename checks and targeted patterns for provider keys, PATs, tunnel tokens, OAuth and API secrets, authentication headers and cookies, private keys and certificates, connection strings, fixture passwords, private exports and secret assignments. It covered matching text in both committed tips, changed or addable paths, selected ignored environments and outputs, and targeted historic paths. There was no confirmed committed live Stripe, Cloudflare Tunnel, Railway, AWS, Resend or Twilio credential, private key, private document upload or database dump. Credential values and private records were withheld from output. Unknown token formats, binary content, encoded payloads, files outside the scan bounds, and arbitrary revisions were outside this targeted result.

## Git ignore assessment and proposals

**Backend.** Existing rules protect dependencies, build output, local assets, demo files, Vendure local state and the known local environment overrides. The root `.runtime/` rule covers nested runtime directories, including all 32 already tracked outputs in `test/analytics/.runtime/` and `test/frontend-integration/.runtime/`. The individual runtime rules and `test/frontend-integration/.gitignore` entry for `ready.json` repeat that protection. The real gap is a general environment guard and generic output protection. The local `admin-ui` and `static/assets` patterns serve generated assets. Keep these rules while checking any future need to version a specific source asset there.

Add to backend `.gitignore`. Remove the two existing exact dotenv exclusions after the new rules cover them. A future checked-in `.env.example` must be sanitized.

```gitignore
.env
.env.*
!/.env.example
!/.env.demo-market-operations.example
!/.env.staging.api.example
!/.env.staging.worker.example
/.tmp/
*.log
coverage/
test-results/
playwright-report/
```

**Frontend.** The current root rules cover dotenv variants, caches, dependency trees, test runner output, logs, demo directories and the local finance fixture. The two staging-example exceptions are unstaged. `tests/fixtures/ui-component-gallery/.gitignore` keeps gallery review output local. `mobile/companion/.gitignore` excludes generated native trees and local configuration, including the ignored Android tree's own generated ignore file. `.github/modernize/java-upgrade/.gitignore` excludes contents of its local-only tooling subtree. No approved frontend source was found hidden by these nested policies. Add the following root rules after the evidence and credentials review. Preserve all existing dotenv template exceptions.

```gitignore
/.vendure/
/.tmp/
/docs/demo-customer-account.json
/docs/testing-vendor-manna-roots.json
/docs/testing-vendors.json
/docs/evidence/phase13c/backend-before.json
/docs/evidence/phase13c/backend-after.json
```

For both repositories, add the following guardrails for local output and reserved credential locations. Keep real provider configuration, encrypted key stores and temporary backups outside approved source and public asset paths. Use exact path exceptions if a legitimate public certificate or sanitized fixture is later required.

```gitignore
/.cloudflared/
/.railway/
/.aws/
/.ssh/
/.certs/
/.netrc
/.git-credentials
/backups/
/db-dumps/
/uploads/
**/playwright/.auth/
*.dump
*.dump.gz
*.pem
*.key
*.p12
*.pfx
*.jks
*.har
.vite/
*.tsbuildinfo
*.tmp
.DS_Store
Thumbs.db
```

Git matching against the current indexes found only the expected backend dotenv and logs and the frontend scratch tree and five named evidence or fixture outputs among the new matches. The backend's broad log pattern also matches five root logs beginning `.loyalty-rewards-`. The proposed patterns leave migrations, deployment files, generated contracts, static assets and the proposed SQL test fixture outside their scope. Keep SQL migrations and fixtures, documentation, screenshots and JSON source eligible for tracking by default. Put future local-only scans, screenshots, captures and financial exports under the ignored runtime directory or a reviewed exact path.

## Docker contexts and release images

The current working-tree `.dockerignore` files start with `**` and reopen build inputs. Both retain a final case-insensitive dotenv exclusion. Neither admits any of the observed Git-ignored paths in the static path model. There are no Dockerfile-specific ignore overrides. Keep repository-root build contexts for the npm workspaces and backend. Git filters what a remote checkout receives. Docker filters what a build can read in that checkout or working directory.

| Release target | Build context and stages | Final runtime and assessment |
| --- | --- | --- |
| Backend API, worker, migration and hostname operator | Current `.dockerignore` permits manifests, two TypeScript configs, `src/**/*.ts` and `static/email/templates/**/*.hbs`. The build stage installs all npm dependencies and builds server TypeScript. The runtime-dependency stage uses `npm ci --omit=dev`. Debug artifacts, docs, tests, local environment, uploads, dashboard build output and root scripts are outside the allowlist. Some dashboard and generated type inputs are available to the build context and excluded by the server TypeScript project. | Runtime has the package manifest, production `node_modules`, compiled `dist/` including migrations and four entry points, three templates, and an empty writable asset cache. Runs as `node`. No secret build arguments. The committed legacy image uses Node 20, full `npm ci`, `COPY . .` and the general build in one stage. With no committed `.dockerignore`, that recipe admits the committed `.env`, tests and reports. Treat builds of that recipe as potentially containing secrets if built or shared. |
| Frontend React Admin | The current `Dockerfile` brings in root manifests and TypeScript config, both app manifests/configs/sources/public trees, workspace manifests/sources, and named release scripts. `MARKET_WEB_APP=admin` selects the Vite build. Build dependencies are installed with the lockfile. Application compilation runs offline, with fixture mode and Astro telemetry disabled. Docs, tests, mobile, local dotenv and generated output outside explicitly allowed paths are excluded. | Copies selected Admin `dist/`, production installation and both workspace app manifests, any workspace-local production modules, shared workspace sources, and four launcher/helper scripts. Runs as `node`. Set the Admin launcher explicitly in Railway. Both app workspace dependency graphs are installed, so build libraries declared as production dependencies and Storefront dependencies can still add Admin image size. |
| Frontend Astro SSR | Same source context and production dependency install. `MARKET_WEB_APP=storefront` selects the Astro standalone production build. Tested build inputs include checked-in generated GraphQL source and the Linux lockfile entries. | Selected Storefront `dist/` supplies server and client output and public assets. The same shared workspace runtime manifest and dependency layout, including production `tsx`, supports the launcher and server. Keep Sharp and its Linux native bindings. Admin dependencies and shared source can add weight to this image. |
| Caddy and Cloudflare gateway | `Dockerfile.gateway` uses the same root context filter, so web source and art are eligible context payload even though this recipe references only three gateway scripts. It copies Caddy and cloudflared binaries from versioned upstream images and performs no npm install. | Node base, the two binaries, `scripts/Caddyfile.hosted`, `scripts/hosted-gateway.mjs` and `scripts/run-hosted-gateway.sh`. Runs as `node`. No tests, application packages or web art copied into its final image. The Bash supervisor uses the runtime `TUNNEL_TOKEN`. Caddy loopback readiness and tunnel connectivity are separate checks. |

Only public origins, endpoints and the app/environment selector are declared as frontend build arguments. Database credentials, cookie/bridge secrets, internal SSR and ingress keys, provider credentials and Tunnel credentials belong in runtime service variables. The prior Phase B3/C report recorded successful builds and runtime smoke checks of four Linux/amd64 release images, and a layer scan found no injected synthetic credentials or private runtime addresses. That is evidence for the locally qualified recipes. This audit did not rebuild the images, inspect Railway or verify the remote Linux checkout.

The frontend allowlist includes application fixture modules such as `apps/admin/src/FixtureAdmin.tsx` and `packages/storefront-core/src/fixtures.ts`. The Admin entry point references its fixture branch, and the release image copies shared workspace source, including the Storefront fixture module, even with fixture mode disabled. Keep those inputs synthetic and preserve the hardened fixture-mode controls. Excluding fixture filenames from the build context would risk breaking imports. This audit did not measure whether individual fixture modules survive bundling into browser assets.

### Proposed Docker ignore hardening

Keep the current allowlists. Append these rules after the allowlist and existing environment filters. The backend's TypeScript and Handlebars filters already exclude common standalone credential files. The common block adds defense in depth there and closes an actual admission gap under frontend `apps/*/src/`, `apps/*/public/` and `packages/*/src/`.

```dockerignore
**/.[nN][pP][mM][rR][cC]
**/.netrc
**/.git-credentials
**/.ssh/**
**/.aws/**
**/.cloudflared/**
**/.railway/**
**/.certs/**
**/*.pem
**/*.key
**/*.p12
**/*.pfx
**/*.jks
**/*.har
**/*.dump
**/*.dump.gz
**/playwright/.auth/**
```

For the frontend also append these exclusions inside allowlisted source and public asset trees.

```dockerignore
**/.runtime/**
**/.cache/**
**/coverage/**
**/test-results/**
**/playwright-report/**
**/.astro/**
**/.vite/**
**/dist/**
**/*.tsbuildinfo
```

The modeled rule additions would suppress no tracked or addable files currently admitted by these recipes. The present frontend rule admits example paths such as `apps/storefront/public/local-cert.pem`, `apps/storefront/public/debug.har` and `apps/admin/src/.runtime/example.json`. The proposed filters cover those placements. Keep credential-bearing source or JSON from entering an approved tree through code review and secret scanning. The backend still admits arbitrary `.ts` in `src/`; an extension rule cannot distinguish a source-embedded credential from legitimate TypeScript.

A recipe-specific `Dockerfile.gateway.dockerignore` is an optional later optimization if Railway context transfer or build caching proves costly. Use default deny with just the three referenced gateway files plus Docker's control files. Preserve the root context and the launcher's LF line endings. Measure final app images before changing workspace dependency pruning or swapping the Node base. Preserve runtime imports and startup validation when qualifying any reduction.

## Deployment files and development workflows to preserve

- **Backend build and runtime.** Keep `Dockerfile`, `.dockerignore`, `package.json`, `package-lock.json`, `tsconfig.json` and `tsconfig.dashboard.json`. Preserve `src/index.ts`, `src/index-worker.ts`, `src/vendure-config.ts`, `src/runtime-environment.ts`, `src/deployment-environment.ts`, `src/database-options.ts`, `src/hosted-api.ts`, `src/hosted-database.ts` and `src/database-migrations.ts`. The release includes `src/migrate-hosted.ts`, the full migration chain, `src/register-storefront-hostname.ts` and `src/plugins/platform-identity/storefront-host-registration.ts`. Retain the development hostname wrapper under `scripts/` separately. Keep plugin entity definitions, tenancy and authorization code, generated development GraphQL declarations, and checked-in `static/email/templates/`. Preserve sanitized `.env.staging.api.example` and `.env.staging.worker.example` in Git. Inspect local-only `docker-compose.yml` as a separate change.
- **Frontend build and runtime.** Keep both Dockerfiles, `.dockerignore`, `.gitattributes`, the root manifests and `tsconfig.json`. Preserve `apps/admin/` and `apps/storefront/` build configs, source and referenced public assets, plus `packages/{admin-core,api,auth,config,storefront-core,theme,ui}/` manifest/source contracts. Keep `packages/api/src/generated/{admin,shop}.ts` and, in Git, `packages/api/{operations,schema}/` for contract regeneration and review. Keep `scripts/frontend-build-environment.mjs`, `scripts/frontend-build-manifest.ts`, `scripts/frontend-production-http.ts`, `scripts/frontend-tooling.ts`, `scripts/serve-admin.ts` and `scripts/start-storefront.ts`. Preserve private API, ingress, authentication and tenant routing code and both sanitized staging templates.
- **Gateway.** Keep `scripts/Caddyfile.hosted`, `scripts/hosted-gateway.mjs`, `scripts/run-hosted-gateway.sh` and the LF policy in `.gitattributes`. The named Tunnel's routes and Access policy are remote configuration described by the deployment runbook. Keep the checked-in gateway wiring free of a Tunnel credential.
- **Tests and scripts.** Retain backend `test/`, frontend `tests/`, native mobile code, build and contract tooling, and guarded seed, replay and qualification scripts. Backend test SQL requires a provenance check, and frontend reusable fixtures should use synthetic data independently of the populated demo outputs. Keep test execution outputs in ignored paths. Move a genuinely reusable `.tmp/` utility to the existing scripts or fixtures tree only after checking references and removing any credential or machine-specific dependency. Keep the persistent `vendure_demo_market_ops` database and local storage out of hosted qualification.
- **Documentation.** Keep backend architecture, security boundaries, migration and financial proof decisions, especially `docs/backend-architecture-proposal.md` and the `docs/vendure-3.7.3-*-proof.md` series. Keep the frontend UI standards, backend contract and authentication and security decisions, and the four staging documents in Git after sanitization. Phase B3/C is the release runbook for provisioning and migration ordering. The original staging audit and phases B1/B2 explain the earlier decisions. The older `docs/CLOUDFLARE_TUNNEL_*.md` series describes an earlier remote-demo workflow and belongs in local workflow history. Summarize overlapping `docs/frontend-phase13*-implementation.md` evidence in an index as time allows, preserving unique decisions. Review `docs/evidence/`, `docs/UI_COMPONENTS/evidence/` and `design-references/pipers_premium/` for duplicate and superseded media. Keep representative sanitized evidence linked from reports, and move excess captures to an owner-controlled archive if needed. The Markdown prose has modest footprint and stays outside the current Docker contexts.

## Prioritized remediation

Classes A and B are gates for GitHub synchronization and Railway deployment respectively. Class C covers repository hygiene. Class D identifies intentional assets to preserve.

| Class and priority | Repo and exact path or scope | Git state and proposed action | Impact, history and safe verification |
| --- | --- | --- | --- |
| A, critical | Backend `.env`, `.gitignore`, `.env.demo-market-operations.example` | Tracked and in recorded pushed history. Ignore and explicitly untrack `.env` while keeping a local copy. Remove the published literal DB default from the demo example after checking the runner. Determine reuse of DB and superadmin credentials and cookie secret. Rotate or revoke active values and assess sessions. | GitHub and legacy Docker. A new commit fixes future checkouts; a separate coordinated history decision is required. Verify index state and rescan intended refs with value redaction. Use the approved Docker recipe and clean checkout for the next release. |
| A, high | Frontend `docs/demo-customer-account.json`, `docs/testing-vendors.json`, `docs/testing-vendor-manna-roots.json`, `.tmp/check-loyalty-api.cjs`, `docs/{manna-roots-demo-orders,testing-vendors,boerne-test-market}.md` | Committed. Ignore and untrack the three generated manifests and scratch script after preserving necessary workflow inputs. Sanitize Markdown. Review where these accounts can authenticate and rotate active or reused credentials. | GitHub. New commit for current exposure. Decide whether history cleanup is justified by actual access or sensitive data. Verify no literal login remains in tracked examples or the sanitized seed workflow. No release-image impact. |
| A, high | Frontend `.tmp/customers-details-refinement/`, `docs/evidence/phase13c5/`, `docs/financial-reporting/browser-export.csv` and neighboring `vendor-*.png` | Committed. Determine data provenance. Replace confirmed or ambiguous private captures with sanitized equivalents and archive retained originals privately. | GitHub. Current cleanup uses a new commit. Coordinate history removal if real private data is confirmed. Verify evidence locally without sharing screenshots or raw CSV. No release-image impact. |
| A, high | Backend `.env.demo-market-operations`, `.env.documents.local`, `.vendure/backups/`, `.runtime/private-documents/`, `.runtime/finance-private/`; frontend `.env`, `.runtime/`, root `.gitignore` in each repo | Current local secrets and data are ignored, with weaker coverage for new filename variants in the backend. Keep local copies and add the proposed rules to prevent mistakes. | GitHub and local Docker. Rules are ordinary commits. Verify with `git check-ignore -v --no-index` and confirm the current allowlists continue excluding these paths. |
| B, required | Backend `Dockerfile`, `.dockerignore`, manifests, `src/`, `.env.staging.{api,worker}.example` | Dockerfile and release runtime edits are unstaged. Allowlist, templates, hosted entry points and migrations are untracked in part. Commit a reviewed, complete release set together. | GitHub and Docker. New commits. Verify from the candidate Git tree that all COPY inputs, startup scripts, migration/hostname commands and templates exist. Requalify only after remediation approval. |
| B, required | Frontend `Dockerfile`, `Dockerfile.gateway`, `.dockerignore`, `.gitattributes`, `.env.staging.frontend-{build,runtime}.example`, `scripts/`, `apps/`, `packages/` and manifests | Both recipes, filters, examples, gateway scripts and related source are untracked in part. Launchers and manifests have unstaged edits. Commit the candidate release together and append the Docker exclusions. | GitHub and Docker. New commits. Verify both app configurations, all named COPY inputs, LF gateway script, workspace contracts and Linux lockfile entries. Qualify the exact release revision. |
| C, recommended | Backend `test/analytics/.runtime/`, `test/frontend-integration/.runtime/`, and root `.loyalty-rewards-{build,focused,server-build,test,types}.log` | 32 tracked outputs already ignored, plus five tracked root logs. Untrack only these reviewed generated outputs. The automated test sources and local test data remain available. | GitHub. New commit, no rewrite for hygiene alone. Verify the affected paths remain on disk and show only intended index deletions. Current release context already excludes them. |
| C, recommended | Frontend `.vendure/.installation-id`, `.tmp/`, `docs/evidence/phase13c/backend-{before,after}.json` | Installation ID is addable. Scratch files and duplicate Git inventories are tracked. Add the proposed ignore rules. Untrack reviewed disposable files and retain any necessary sanitized tooling in the appropriate existing directory. | GitHub. New commit for rule or index changes. Verify test/script links before moving references. No release-image impact. This is the largest clearly disposable group. |
| C, recommended | Frontend `docs/evidence/`, `docs/UI_COMPONENTS/evidence/`, `design-references/pipers_premium/` | Tracked. Remove or archive selected duplicate evidence after the privacy review, and maintain links to retained records. Review the design reference files individually for continuing need and redistribution rights. | GitHub. New commit. Compare hashes and cross-references. No release-image impact. |
| C, optional | Frontend `apps/storefront/public/assets/editorial-market/`, `apps/admin/public/rental-stock/`, `Dockerfile`, `Dockerfile.gateway` | Application art is tracked. Measure asset loading and image size before optimizing art, pruning dependencies or adding a recipe-specific ignore. | GitHub and Docker. New commit if needed. Preserve visual assets and package/runtime behavior. Verify image contents and app startup from the approved release. |
| C, optional local disk cleanup | Backend `dist/`; frontend `apps/admin/dist/`, `apps/storefront/dist/` and `mobile/companion/android/app/build/` | Ignored and reproducible. Remove these generated copies only if local disk space is needed and after confirming a build can regenerate them. Preserve local uploads, backups and data. | Local only. No Git or history change. Keep this separate from push readiness. Verify ignored status and the exact path before removal. |
| D, retain after review | Backend `test/production-hardening/vendure-38-order-fixture.sql`, both repositories' test source, contracts and approved deployment references | SQL fixture is addable and appears synthetic. Confirm ownership and reproducibility. Keep the authored test inputs, generated contracts, migrations, useful security history and sanitized examples. | GitHub. Verify that they remain eligible for tracking. Keep tests and fixtures outside release images except generated contracts and required runtime assets. |

### Removing files from the index while keeping local copies

After owner approval, add the matching ignore rules, then review the exact paths in the index. Run commands from the corresponding repository root. Do not apply these examples to an unreviewed working tree.

```powershell
# Backend example after credentials and history review
git ls-files -- .env test/analytics/.runtime test/frontend-integration/.runtime
git rm --cached -- .env
git rm -r --cached -- test/analytics/.runtime test/frontend-integration/.runtime
Test-Path -LiteralPath .env

# Frontend example after confirming local outputs are reproducible
git ls-files -- docs/demo-customer-account.json docs/testing-vendors.json docs/testing-vendor-manna-roots.json
git rm --cached -- docs/demo-customer-account.json docs/testing-vendors.json docs/testing-vendor-manna-roots.json
Test-Path -LiteralPath docs/demo-customer-account.json

# Verify in each repo before any commit
git diff --cached --name-status
git ls-files -ci --exclude-standard
git status --short
```

`git rm --cached` updates the index and preserves the working file. The next commit removes the path from new checkouts. Existing history and remote copies remain. Review directories and staged deletions individually and avoid a whole-index refresh or a broad `git add .`.

## History limitations and owner checklists

Historical checks included reachable path names, historical blob sizes, both backend dotenv revisions, and focused content checks of demo credential fixtures, captured artifacts and selected test histories. There are local tool checkpoint tree refs outside `main` and `origin/main`. They add objects to the local store and are outside the normal branch push. Use explicit branch refspecs. Avoid mirror pushes and bulk ref publication. A focused historical secret scan of every intended ref is still warranted following the backend finding.

If active credentials were shared, rotate first. A coordinated rewrite may be justified for confirmed confidential data or past secrets that should no longer be present on any intended branch. Rewriting changes commit IDs, disrupts existing clones and automation, and requires coordination across refs, forks, caches and backups. It cannot recall existing copies. Decide scope with whoever administers GitHub, then request a separate cleanup phase.

### Before the next GitHub push

- [ ] Verify both repositories' current visibility, access and branch tips in GitHub. Review historical access and treat locally recorded pushed exposures accordingly.
- [ ] Complete the A-class actions and review the exact candidate history and index with redacted output. Verify intended staged changes contain no generated screenshots, demo passwords, exports, backup files or live configuration.
- [ ] Select the reviewed code, templates and release files by path. Review the proposed commit boundary for related API, migration, workspace and lockfile changes.
- [ ] Use private repository visibility, appropriate branch protection, and secret scanning or push protection where available. Private access limits readers. It leaves committed secrets available to authorized users, integrations, clones and history.

### Before connecting either repo to Railway

- [ ] Complete the B-class actions and confirm the approved commit in each GitHub repository includes the matching Dockerfiles, allowlists and release sources. Verify the exact snapshot from a clean checkout.
- [ ] Restrict Railway's GitHub access to these two repositories. Use the repository root and approved Dockerfile for each service. Select the Admin or Storefront app through the documented public build argument and use the respective production launcher. The gateway points to `Dockerfile.gateway`.
- [ ] Configure isolated staging PostgreSQL and roles. Qualify the temporary migration job with the same release revision before API and worker. Use the scoped hostname registration command for the operator workflow. Keep the persistent local test database out of provisioning.
- [ ] Put private origins and secrets in scoped runtime variables. Verify Admin, Astro and API readiness, worker startup, and separate gateway and Cloudflare Access/Tunnel checks using the release runbook. Review image contents for environment files, unnecessary test artifacts and runtime credential leaks.

The four local architectural references are [Staging readiness](STAGING_DEPLOYMENT_AUDIT.md), [Phase B1](STAGING_DEPLOYMENT_PHASE_B1.md), [Phase B2](STAGING_DEPLOYMENT_PHASE_B2.md), and [Phase B3/C and Linux image qualification](STAGING_DEPLOYMENT_PHASE_B3_C_PREPARATION.md). This review used local Git and filesystem evidence. GitHub, Railway and provider state, credentials' current validity, and comprehensive image and historical secret coverage remain unverified. The only file created was this report.
