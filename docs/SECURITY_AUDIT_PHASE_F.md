# Phase F backend Docker release hardening

Addressed [Phase A finding A-01](SECURITY_AUDIT_PHASE_A.md) on November 18, 2026. Docker Desktop built the actual backend release Dockerfile for `linux/amd64`. All 12 synthetic sentinels were absent from the copyable context and from all 10 image filesystem layers. The API and worker both started in production mode against a new, isolated PostgreSQL instance. The API returned HTTP 200 for liveness and readiness, and the database recorded all 86 migrations.

## Release inputs and image contents

- The backend repository root is the context for the documented `docker build ... .` command. There is no `Dockerfile.dockerignore` override for the root `Dockerfile`. The backend Compose file starts supporting services and has no backend image build or run entry.
- The new backend `.dockerignore` starts with a deny-all rule and admits `package.json`, `package-lock.json`, the two TypeScript configurations, TypeScript files under `src/`, and Handlebars files under `static/email/templates/`. The Dockerfile and ignore file are read as build controls. Root and nested environment files and local variants, Git data, local dependencies, logs, caches, runtime data, and temporary files are excluded. The allowlist also excludes repository scripts, tests, docs, prior build output, uploads, and generated email.
- The Dockerfile uses explicit inputs and separate stages for compilation, lockfile-based production dependency installation, and the release image. `npm run build:server` compiles the shared TypeScript project that emits `dist/index.js`, `dist/index-worker.js`, `dist/vendure-config.js`, and the migration files. The image uses Node 20 Bookworm Slim and adds `package.json`, the `npm ci --omit=dev` dependency tree, compiled `dist/`, and the three email templates under `static/email/templates/`. It keeps the documented `npm run start:server` and `npm run start:worker` commands. The legacy Vite dashboard build and the local `vendure start all` CLI are outside this API/worker image. Dashboard packages that are already declared as production dependencies remain in the dependency tree. Asset uploads and private documents use runtime storage.
- Production settings are injected at container launch. The Dockerfile has no application configuration build arguments. The tracked backend `.env` is reserved for test variables and must never be repurposed for real credentials. Its contents were neither read nor copied during this work.

## Docker verification

The disposable context copied the working-tree Dockerfile, `.dockerignore`, manifests, TypeScript configurations, and only the eligible files enumerated by `git ls-files -- src static/email/templates`. The selected inputs were checked to be regular files. The copy started with 472 intended files, including the two build controls and any existing working-tree edits to the selected sources. Synthetic sentinels were created only inside this copy. They covered `.env`, `.env.local.<id>`, `src/migrations/.env`, an unrelated `.txt` file under `src/`, nested TypeScript-shaped and mixed-case environment variants, a file inside an environment-named directory, files under root and nested `.git`, a nested `node_modules` file, a nested `tmp` file, and a log. Each file had a distinct marker sharing a run-specific prefix.

The first scratch probe found that directory-only patterns let two TypeScript sentinels through under `src/node_modules/` and `src/tmp/`. The final ignore rules explicitly exclude the descendants of those directories and the other reserved directories. The probe and actual release build were rerun on the corrected context.

These were the commands for the final build and inspections on PowerShell. `$phase` was the run's disposable directory under the backend repository. `verify.py` was the temporary checker described below.

```powershell
$phase = 'E:\coding\farmers-market-platform\.phase-f-73f7759b21344f28aa88ec5fb8170be0'
$tag = 'phase-f-release:73f7759b2134-final'
docker version
docker build --progress=plain --file "$phase\context\Dockerfile" --tag $tag "$phase\context"
"FROM scratch`nCOPY . /`n" | docker buildx build --progress=plain --file - --output "type=local,dest=$phase\copyable-final" "$phase\context"
python "$phase\verify.py" $phase context
docker image inspect --format '{{.Os}}/{{.Architecture}} {{len .RootFS.Layers}}' $tag
docker image save --platform linux/amd64 --output "$phase\release.tar" $tag
python "$phase\verify.py" $phase layers
```

- `docker version` succeeded with local Desktop engine access. The actual release build exited 0. The inspected platform image manifest was `sha256:9d91ad63a435bb170bc9b9fc0ea8c2165157fa4d2231391bb3f00952ea07bdcf`.
- The scratch `COPY . /` probe used the same context and effective `.dockerignore`. The checker verified the sentinels existed in the input copy, matched the exported file list exactly to the 470 expected copyable paths, and found zero sentinel paths or markers in the export. The `Dockerfile` and `.dockerignore` were absent from the copyable inventory.
- `docker image inspect` reported `linux/amd64 10`. For `docker image save`, the checker opened each filesystem layer referenced by the saved image manifest, including the base layers, and checked member paths, link names, and streamed regular-file contents for the sentinel paths or markers. It reported 10 layers scanned with zero hits. The image contained both entry points, compiled configuration, all 86 migration files, all three templates, and the Vendure and PostgreSQL packages. The repository source tree, build controls, build lockfile, and Vendure CLI were absent from the application paths in every layer. The checker emitted counts and pass/fail results without dumping file contents or image configuration.

## API and worker startup

PostgreSQL 16 ran in a new container with a tmpfs data directory and zero published ports. The Docker network was verified as internal, and a query confirmed the synthetic `phase_f_release` database was empty before startup. Both app containers were verified on that network with zero published ports and no mounts. Runtime options used production mode, generated synthetic secrets, `.invalid` origins, the private database transport policy, and the existing paid-attribution and refund-policy settings required by production customer accounts. Vendure telemetry was disabled for the successful smoke test. Provider integrations received no credentials or authorization flags.

The first API attempt returned `startup_failed`. A network-disabled load of `dist/vendure-config` identified `CUSTOMER_ACCOUNT_REQUIRES_PAID_COMMERCE_AND_PURCHASE_HISTORY`. The database was still empty afterward. Supplying `ENABLE_PAID_ATTRIBUTION=true` and a synthetic `REFUND_POLICY_VERSION` in the test container's runtime options resolved the existing configuration requirement. No application behavior or deployment setting changed.

The successful smoke test used the following commands. `$options` contained the synthetic Docker `-e` arguments described above, and `$pgPassword` was the same synthetic password passed to the database and both app containers.

```powershell
$network = 'phase-f-73f7759b2134'
$db = "$network-db"
$api = "$network-api"
$worker = "$network-worker"
docker network create --internal $network
docker network inspect --format '{{.Internal}}' $network
docker run -d --name $db --network $network --pull missing --mount type=tmpfs,destination=/var/lib/postgresql/data -e POSTGRES_DB=phase_f_release -e "POSTGRES_PASSWORD=$pgPassword" postgres:16-alpine
docker inspect --format '{{.HostConfig.NetworkMode}} {{len .HostConfig.PortBindings}} {{range .Mounts}}{{.Type}} {{end}}' $db
docker exec $db pg_isready -q -h 127.0.0.1 -U postgres -d phase_f_release
docker exec $db psql -U postgres -d phase_f_release -Atqc "select current_database() || ':' || count(*) from pg_tables where schemaname = 'public'"
docker run --pull never -d --name $api --network $network @options $tag npm run start:server
docker logs $api
docker exec $api node -e 'Promise.all(["live", "ready"].map(async state => { const response = await fetch("http://127.0.0.1:3000/health/" + state); if (response.status !== 200 || (await response.json()).status !== state) throw new Error(state); console.log("HTTP 200 " + state); })).catch(() => { process.exitCode = 1; })'
docker run --pull never -d --name $worker --network $network @options $tag npm run start:worker
docker logs $worker
docker exec $db psql -U postgres -d phase_f_release -Atqc "select count(*) from public.migrations"
```

The startup checker matched `server_started` and `worker_started` while the containers were running. The worker emits that event after starting the job queue. The two API health checks returned their expected JSON status and HTTP 200. PostgreSQL returned `86` migration records. The persistent demo database and live services were outside the smoke test.

## Owner action and remaining scope

No manual preparation is required for A-01 before the first production build. From the backend root, run `docker build --file Dockerfile --tag farmers-market-backend:release .` and supply the required production settings at container launch. A manual browser test adds no evidence for this packaging change.

The smoke test covers a fresh database on `linux/amd64`. Other platforms, upgrades of existing databases, production ingress and storage, providers, and individual worker jobs remain unverified. During dependency installation, npm reported engine warnings for `abbrev` and `nopt` on Node 20 and 83 audit findings in the production install, including three rated critical. Those dependency findings were outside the A-01 verification.

The disposable context, scratch export, saved image archive and checkers, three containers, internal network, both local release test tags, and the PostgreSQL tag pulled for this run were removed. The shared Docker build cache was left in place. The test images were never pushed.
