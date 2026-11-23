# Phase H backend runtime and parser remediation

November 18, 2026

The `linux/amd64` release built on Node.js **24.22.3 LTS** with npm **11.19.1**. The installed Express 5 and Apollo/Express 4 parser copies are **2.4.0** and **1.20.9**, respectively. Both meet the patched floors for GHSA-27r3-jxmh-p828, which was also absent from the production audit. [Node.js security release](https://nodejs.org/en/blog/release/v24.22.3/) · [Upstream body-parser advisory](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828)

## Release changes

- The backend `Dockerfile` uses one shared base for compilation, production dependencies, and release. The tag is `node:24.22.3-bookworm-slim`, pinned to image index `sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54`. Docker Hub resolved its `linux/amd64` manifest to `sha256:0e2646ab57e77b7a384a0cb59b6815b182c77e1f9c3ba36bd8435bd9c4e6680e`. The pin retains the official index's platform selection. The two `npm ci` commands use `--no-audit` so the build leaves registry auditing to the single explicit production-only command.
- The explicit copy paths, separate production install, deny-by-default `.dockerignore`, and runtime-injected configuration from [Phase F](SECURITY_AUDIT_PHASE_F.md) remain in effect. The disposable context had six build inputs and 466 tracked source and template files copied from the working tree. It contained no project environment files, local dependencies, npm configuration, or runtime data. The build used that snapshot, including earlier security edits. A later local edit to `src/plugins/market-operations/service.ts` remained in the checkout and is outside this image's verification.
- The backend `package-lock.json` changed at exactly three package paths. Express 5.2.1's `^2.2.1` admits root `body-parser` **2.4.0**, and Express 4.22.3's `~1.20.5` admits nested `body-parser` **1.20.9**. The 2.x parser raised its floors for `content-type`, `iconv-lite`, and `qs`. Existing `content-type` **2.1.0** and `iconv-lite` **0.7.3** satisfy the new ranges. The shared `qs` moved from **6.16.0** to **6.16.1**, within every existing consumer range. Express, Vendure, and the direct dependency manifest stayed at their existing versions. Final lock SHA-256 is `bcd9c1961de5dc5e5c0736a1f174a2424f794d61d8c1ac18bfa5b1ce92a8173c`.

## Built release verification

The actual Dockerfile built successfully with Docker Desktop 29.8.2. The local image exported `linux/amd64` manifest `sha256:34348007aee4558708750eaba09aee82318dd58236409ea8326550812e8df9b4` and 10 filesystem layers. The final application directory contained both compiled entry points, compiled configuration, 86 migration files, three email templates, the production tree, and `package.json`. The TypeScript source tree, build lockfile, and dev-only Vendure CLI were absent from the release application directory.

| Check | Result |
| --- | --- |
| Runtime | The base and final image both reported Node.js `v24.22.3` and npm `11.19.1`. |
| Dependency installs | The build stage installed 1,327 packages and the production stage installed 1,297. Each installed production path matched the lock version. Both logs had zero `EBADENGINE` warnings, including for `abbrev` 5.0.0 and `nopt` 10.0.1. npm 11 reported lifecycle-script allowlist notices for six packages, including the existing native packages. |
| Physical parser inventory | The package named `body-parser` appeared only at `node_modules/body-parser` (2.4.0) and `node_modules/@apollo/server/node_modules/body-parser` (1.20.9). The inventory also checked the global npm package tree. The initial filename match included `@types/body-parser`; matching the package manifest name corrected the inventory. |
| Native compatibility | `sharp` 0.34.5 loaded and generated and decoded a synthetic one-pixel PNG. It reported libvips 8.17.3, libheif 1.20.2, and librsvg 2.61.2. `bcrypt` 6.0.0 loaded and passed a synthetic hash and comparison. The sharp results establish Node 24 compatibility. Its known security findings remain open. |

The API and worker ran the normal release entry points with `APP_ENV=production` and `NODE_ENV=production`. A fresh PostgreSQL 16 container on a Docker network inspected as internal used a tmpfs data directory and zero published ports. PostgreSQL reported `phase_h_release:0` before the API started. Each app container had zero published ports and zero mounts. Configuration used generated synthetic values, `.invalid` origins, and disabled Vendure telemetry. No provider credentials or live-operation flags were supplied. All three containers remained running with zero restarts after the checks.

- **API and migrations.** The API logged `server_started` after 86 `migration_applied` events. PostgreSQL contained 86 rows in `public.migrations`. The worker logged `worker_started`, which follows successful job-queue startup.
- **HTTP and parser.** Loopback requests used the configured test API host and the application’s trusted loopback HTTPS forwarding policy. Plain JSON and valid gzip JSON POSTs reached the Admin GraphQL handler and each returned HTTP 200 with `data.__typename = Query`. One eight-byte invalid gzip input returned HTTP 400 with `REQUEST_BODY_INVALID` and a request ID from the production body-parser error handler. Both health endpoints returned HTTP 200 with their expected status before and after the rejection. A subsequent plain JSON POST returned HTTP 200 with the expected GraphQL result. This fixture verifies routine decompression error handling through the patched middleware. The physical inventory and registry audit establish advisory closure.
- **Production webhook admission.** With Stripe unconfigured, an unsigned POST to the actual platform webhook route returned HTTP 400 with `INVALID_WEBHOOK`. This checks admission in the production startup configuration.

## Stripe signature harness

A separate container from the built release ran with `--network none`. The harness mounted the compiled Payments plugin's real Express raw-body middleware on loopback, backed by the compiled `StripeWebhookService` and the real Stripe SDK verifier. It used a synthetic signing secret and an event containing whitespace and UTF-8 text. A wrapper captured the verifier arguments and delegated to the original SDK implementation.

| Request | Result |
| --- | --- |
| Original body and valid signature | HTTP 200 with `received: true`. |
| Changed body and original signature | HTTP 400 with `INVALID_WEBHOOK`. |
| Original body and invalid signature | HTTP 400 with `INVALID_WEBHOOK`. |

For all three requests the verifier received a Buffer equal byte for byte to the corresponding HTTP request body. The single valid verification reached a stubbed receipt store, which recorded the expected payload hash. There were zero provider calls and zero queue calls. The harness covers signature verification and handoff to persistence. Live delivery, actual receipt persistence, retry handling, and worker effects remain outside this check.

## Production audit

One approved registry audit ran from the final release with the matching lock mounted read-only. npm returned a valid version 2 audit report and exit **1** for findings at approximately 2:02 p.m. CST. All 97 package paths referenced by the report existed in the installed production tree. The report contained neither a `body-parser` entry nor GHSA-27r3-jxmh-p828.

The audit reported **81 package entries** across 3 critical, 23 high, and 55 moderate findings. Critical entries were Handlebars, Seroval, and the Solid parent entry for Seroval. High entries still include `sharp`, the Vendure and Apollo dependency chains, `follow-redirects`, Multer, and `ws`. Vendure's own security notices remain tracked separately in [Phase G](SECURITY_AUDIT_PHASE_G.md#vendure-security-notices-outside-the-npm-count). OS package scanning was outside the checkpoint.

## Commands and cleanup

The PowerShell commands below use the run's disposable `$phase` folder, `$context` allowlist copy, local `$tag`, and run-owned container and network names. The three temporary Node checkers performed the assertions described above.

```powershell
docker buildx imagetools inspect node:24.22.3-bookworm-slim
docker build --platform linux/amd64 --progress=plain --file "$context\Dockerfile" --tag $tag $context
docker image inspect --format '{{.Os}}/{{.Architecture}} {{len .RootFS.Layers}} {{.Id}}' $tag

docker network create --internal --label "phase-h.run=$runId" $network
docker pull --platform linux/amd64 postgres:16-alpine
docker run --pull never --platform linux/amd64 -d --name $db --label "phase-h.run=$runId" --network $network --mount type=tmpfs,destination=/var/lib/postgresql/data -e POSTGRES_DB=phase_h_release -e "POSTGRES_PASSWORD=$pgPass" postgres:16-alpine
docker exec $db pg_isready -q -h 127.0.0.1 -U postgres -d phase_h_release
docker exec $db psql -U postgres -d phase_h_release -Atqc "select current_database() || ':' || count(*) from pg_tables where schemaname = 'public'"
docker run --pull never --platform linux/amd64 -d --name $api --label "phase-h.run=$runId" --network $network --env-file "$phase\runtime-settings.txt" $tag npm run start:server
docker logs $api
docker exec $db psql -U postgres -d phase_h_release -Atqc 'select count(*) from public.migrations'
docker run --pull never --platform linux/amd64 -d --name $worker --label "phase-h.run=$runId" --network $network --env-file "$phase\runtime-settings.txt" $tag npm run start:worker
docker logs $worker
Get-Content -LiteralPath "$phase\release-http.cjs" -Raw -Encoding utf8 | docker exec -i $api node -
Get-Content -LiteralPath "$phase\webhook-harness.cjs" -Raw -Encoding utf8 | docker run --pull never --rm --platform linux/amd64 --network none -i $tag node -

$lock = Join-Path $context 'package-lock.json'
docker run --pull never --rm --platform linux/amd64 --label "phase-h.run=$runId" --mount "type=bind,source=$lock,target=/usr/src/app/package-lock.json,readonly" --entrypoint npm $tag audit --omit=dev --json --registry=https://registry.npmjs.org/ --fetch-retries=0 1> "$phase\audit.json" 2> "$phase\audit.stderr.txt"
Get-Content -LiteralPath "$phase\release-inventory.cjs" -Raw -Encoding utf8 | docker run --pull never --rm --platform linux/amd64 --network none --mount "type=bind,source=$lock,target=/tmp/phase-h-lock.json,readonly" --mount "type=bind,source=$phase\audit.json,target=/tmp/phase-h-audit.json,readonly" -i $tag node -
git diff --check -- Dockerfile package-lock.json
```

The build, startup, HTTP, signature, final inventory and diff checks exited 0. Cleanup removed the run's three containers, private network, three image references, context, synthetic settings, and temporary logs and checkers. The pre-existing Docker image and shared build cache were left in place. The persistent test database, existing accounts, and live services were outside the run.

## Checkpoint decision

**Ready to close.** No owner action or browser test is needed for Phase H. The verification covers this snapshot on `linux/amd64` with a fresh database.

Before launch, complete the aligned Vendure security upgrade and verify `sharp` **0.35.5** or later patched **0.35.x** in the final native image. Qualify a representative populated 3.7 database upgrade, session and permission boundaries, asset processing, and worker job consumption. Refresh Handlebars to **4.7.10** or a compatible patched release separately and test account email rendering. Refresh `follow-redirects` to **1.16.2** or a compatible patched release before enabling affected credential-bearing provider traffic. Production ingress, actual provider delivery and effects, and the existing Stripe launch authorization remain separate launch work. [Phase G launch checklist](SECURITY_AUDIT_PHASE_G.md#launch-decision-and-first-remediation-batch)
