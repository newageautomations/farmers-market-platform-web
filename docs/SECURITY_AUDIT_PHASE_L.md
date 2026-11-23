# Phase L: A-07 local Docker port hardening

November 18, 2026

## Change and workflow

| Service | Before | After | Reason |
| --- | --- | --- | --- |
| PostgreSQL | Host `6543` to container `5432`, with no explicit host IP | `127.0.0.1:6543:5432/tcp` | The backend README documents Compose PostgreSQL as a local database option. Host-side Vendure and PostgreSQL tooling can use the existing published port. |
| Redis | Host `6479` to container `6379`, with no explicit host IP | No host port | The README documents starting the optional Redis service. No host-side Redis consumer was found in the reviewed backend or web startup and database tooling. Vendure initializes `DefaultJobQueuePlugin` with database buffering. Redis remains on the default Compose network at `redis:6379` for a client on that network. |

The only configuration edit is in [docker-compose.yml](../../farmers-market-platform/docker-compose.yml). PostgreSQL retains `postgres_db_data` at `/var/lib/postgresql/data`, and Redis retains `redis_data` at `/data`. Both services remain on the default Compose network. A peer container on that network would use `postgres_db:5432` or `redis:6379`. The standalone container examples in the backend README use `host.docker.internal` for a host database and do not join the Compose network. That path was not verified against the new Compose binding.

The guarded market-operations demo starts Vendure API and worker as host processes and targets the separate native PostgreSQL listener on port `5432` with database `vendure_demo_market_ops`. The backend demo loader defaults to `localhost:5432`, and the checked local demo file and shell had no database endpoint override. The web admin and storefront talk to Vendure over HTTP on port `3000`. The web API launcher calls the scanner script, which uses the backend directory and default Compose discovery to start only `clamav`. The native demo therefore needs no database setting change. If a host-side client for the optional Compose PostgreSQL instance currently uses `localhost:6543` and tries IPv6, set that client's `DB_HOST=127.0.0.1` and keep `DB_PORT=6543`. Apply those values only to the Compose client, never to the configured persistent demo.

[Backend startup examples](../../farmers-market-platform/README.md#using-docker) · [Vendure database and queue config](../../farmers-market-platform/src/vendure-config.ts) · [Demo environment](../../farmers-market-platform/scripts/market-operations-demo/environment.ts) · [Web demo launcher](../scripts/demo-market-operations.ts) · [Scanner Compose launcher](../../farmers-market-platform/scripts/documents/clamav.ts)

## Verification

Docker Compose v5.6.0 and Docker Engine 29.8.2 were available locally. Docker and the local HTTP probe required access outside the command sandbox. No Compose override file or active Compose file, project, profile, or environment-file selector was found for the documented workflow.

From the backend directory, these checks resolve both the default-discovery configuration and the explicitly selected base file. JSON stayed in memory. The displayed fields were limited to project, ports, mounts, and networks.

```powershell
docker compose config --quiet
docker compose -f docker-compose.yml config --quiet
$workflow = docker compose config --format json | ConvertFrom-Json
$base = docker compose -f docker-compose.yml config --format json | ConvertFrom-Json
foreach ($config in @($workflow, $base)) {
    foreach ($name in 'postgres_db', 'redis') {
        $service = $config.services.$name
        [pscustomobject]@{
            Project = $config.name
            Service = $name
            Ports = $service.ports
            Mounts = $service.volumes
            Networks = $service.networks.PSObject.Properties.Name
        } | ConvertTo-Json -Depth 5
    }
}
git diff --check -- docker-compose.yml
```

Before the edit, default discovery resolved both published ports without a `host_ip`. After the edit, both validation modes exited successfully and resolved project `farmers-market-platform`, exactly one PostgreSQL TCP port at `127.0.0.1:6543` targeting `5432`, and zero Redis published ports. The mount targets and default network resolved as listed above. The Git whitespace check passed.

`docker compose ps -a postgres_db redis` returned no containers. `docker compose ps --format '{{.Service}} | {{.Status}} | {{.Ports}}'` returned only healthy ClamAV at `127.0.0.1:3310`. The project's volume listing returned only `farmers-market-platform_clamav_signatures`. There was no actual PostgreSQL or Redis Compose bind or mount to inspect in the existing project. The native `postgres` process was listening on port `5432` at `0.0.0.0` and `::`. That is a separate listener outside the scope of these Compose mappings. Local listeners were also observed on the API, storefront, and admin ports.

### Disposable PostgreSQL check

Checked that no container, Docker network, or named volume carried the project label `farmers-phase-l-a07`. A temporary `.phase-l-disposable.compose.yml` overrode the PostgreSQL port with `127.0.0.1::5432`, replaced all service volume mounts with a single tmpfs at `/var/lib/postgresql/data`, and set a test-only database, user and generated password. Before startup, the effective config verified the isolated project, tmpfs-only storage, the loopback-only port with no fixed host port, and no Redis port mapping. These were the Docker commands used, with `$cid` obtained from the disposable project.

```powershell
$compose = @('compose', '-p', 'farmers-phase-l-a07', '-f', 'docker-compose.yml', '-f', '.phase-l-disposable.compose.yml')
$testConfig = docker @compose config --format json | ConvertFrom-Json
docker @compose up -d --no-deps --no-build --pull never postgres_db
$cid = docker @compose ps -q postgres_db
docker inspect --format '{{json (index .NetworkSettings.Ports "5432/tcp")}}' $cid
docker inspect --format '{{json .Mounts}}' $cid
docker inspect --format '{{json .HostConfig.Mounts}}' $cid
# Host-side probe used the installed Node pg client against the inspected port.
# SQL: SELECT current_database() AS db, 1 AS ok
docker @compose down
```

Docker reported one binding, `127.0.0.1:51393 -> 5432/tcp`, with the data path on tmpfs and zero named-volume or bind mounts. The SQL probe over IPv4 loopback returned `{"db":"phase_l_disposable","ok":1}`. The disposable container and network were removed, the temporary override was deleted, and post-test Docker listings found no disposable resources.

`docker image inspect redis:7-alpine --format '{{.Id}}'` returned “No such image.” Redis's absent host mapping and default-network membership were verified in the resolved configuration. An actual Redis bind inspection and Docker-network `PING` remain unverified. No image was pulled. No live schema or row query was run against the populated demo database. Scope was limited to local configuration and runtime checks.

## Apply and check the existing local project

**No running service needed recreation when inspected.** This PowerShell command applies the new mappings to either affected service if it is running when you execute it. It scopes recreation to the selected services, uses cached images, and preserves the project's named volumes. It skips both services when the project is in the observed ClamAV-only state.

```powershell
Set-Location E:\coding\farmers-market-platform
$compose = @('compose', '-p', 'farmers-market-platform', '-f', 'docker-compose.yml')
$running = @(docker @compose ps --status running --services postgres_db redis)
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the local Compose project' }
$targets = @($running | Where-Object { $_ -in 'postgres_db', 'redis' })
if ($targets.Count) {
    docker @compose up -d --no-deps --pull never @targets
    if ($LASTEXITCODE -ne 0) { throw 'Could not apply the Compose port mappings' }
}
docker @compose ps -a
```

The next normal start of either optional service will use the edited file. If PostgreSQL is running, `docker @compose port postgres_db 5432` should return `127.0.0.1:6543`. If Redis is running, `docker @compose port redis 6379` should report no published port. You can confirm each affected container's original named data mount using `docker inspect --format '{{range .Mounts}}{{println .Name .Destination}}{{end}}' <container-id>` before and after. ClamAV should still be healthy in the Compose listing.

For a read-only check of the populated **native** database, run this with local `psql` (or use the PostgreSQL installation's `bin\psql.exe` if it is outside PATH). Enter the existing local database password at the prompt. Expect `vendure_demo_market_ops` and a nonzero account count.

```powershell
psql -X -h 127.0.0.1 -p 5432 -U postgres -d vendure_demo_market_ops -W -v ON_ERROR_STOP=1 -c 'SELECT current_database() AS database, count(*) AS accounts FROM public."user";'
```

Leave an already running API and worker in place. The guarded `demo:market-operations:serve` and `demo:market-operations:worker` runners check for pending migrations and stop if any are found. They do not apply them. The ordinary backend server and worker entry points call the migration runner during startup. The current pending-migration status was not checked. If a guarded process is already down, use its corresponding web-directory demo script and stop if it reports pending migrations. The worker's expected readiness message is `Persistent demo worker ready` in its terminal. This change does not require a restart or migration.

For one normal demo smoke test, open [the Boerne storefront](http://boerne-farmers-market.localhost:4321/) and confirm that it shows “Boerne Farmers Market.” No sign-in or data entry is needed. The following local GET returned HTTP 200 and the expected market name during this phase, with the existing stack still in place.

```powershell
$response = curl.exe --noproxy '*' --resolve 'boerne-farmers-market.localhost:4321:127.0.0.1' --max-time 10 --silent --show-error --write-out '\n%{http_code}' 'http://boerne-farmers-market.localhost:4321/'
[pscustomobject]@{ Status = $response[-1]; ExpectedMarketName = [bool]($response -match 'Boerne Farmers Market') }
```
