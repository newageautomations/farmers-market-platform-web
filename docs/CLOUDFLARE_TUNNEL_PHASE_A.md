# Cloudflare Quick Tunnel remote demo: Phase A (infrastructure)

Phase A adds an opt-in, loopback-only ingress so the persistent demo running on the Windows PC can be reached through one temporary `https://*.trycloudflare.com` URL. It follows [CLOUDFLARE_TUNNEL_DEMO_AUDIT.md](CLOUDFLARE_TUNNEL_DEMO_AUDIT.md). It changes no application code, database, account, origin, or existing startup script. **The application is not expected to work end to end remotely until Phase B** (see section 7).

## 1. What was implemented

| File                                | Purpose                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/remote-demo-proxy-core.ts` | Proxy library: configuration validation, route inventory, header trust boundary, access gate, HTTP and WebSocket forwarding, loopback binding |
| `scripts/remote-demo-proxy.ts`      | `demo:remote:proxy` entry point                                                                                                               |
| `scripts/remote-demo-tunnel.ts`     | `demo:remote:tunnel`: starts `cloudflared` Quick Tunnel, detects the random URL, hands it to the proxy                                        |
| `scripts/remote-demo-admin.ts`      | `demo:remote:admin`: second admin Vite dev server on `127.0.0.1:4342` under base `/__admin/`                                                  |
| `tests/remote-demo-proxy.test.ts`   | Focused tests (`test:remote-demo`)                                                                                                            |
| `package.json`                      | Four new scripts only                                                                                                                         |
| `.gitignore`                        | Ignores `.remote-demo/` (per-run tunnel origin file)                                                                                          |

**Reverse proxy.** Plain Node `http`, no new dependencies. Listens on `127.0.0.1:8790` and fails closed if the bound address is anything else. It dispatches by an explicit, segment-aware route inventory taken from `apps/storefront/src/pages` and the admin SPA:

| Request                                                                                                                                                                               | Methods                             | Upstream                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `/__remote-demo/login`, `/__remote-demo/logout`                                                                                                                                       | GET/HEAD/POST, POST                 | Proxy itself (access gate)                                     |
| `/admin-api` (exact, query allowed)                                                                                                                                                   | POST only                           | Vendure `127.0.0.1:3000`                                       |
| `/assets/source/**`, `/assets/preview/**`                                                                                                                                             | GET/HEAD                            | Vendure (uploaded asset files only)                            |
| `/vendor[/**]`, `/market[/**]`, `/platform[/**]`, `/auth/account`, `/rental-stock/**`                                                                                                 | GET/HEAD                            | Remote admin Vite, rewritten to `/__admin/<path>`              |
| `/__admin/**` (admin Vite modules, HMR)                                                                                                                                               | GET/HEAD                            | Remote admin Vite                                              |
| `/vendor/application-continue`, `/vendor/application-help`, `/vendor/application-return`                                                                                              | Astro methods                       | Astro (these Astro pages sit under the admin `/vendor` prefix) |
| Everything else: storefront pages, `/account/**`, `/auth/callback`, `/auth/claim`, `/auth/logout`, `/auth/signed-out`, `/api/**`, `/_astro/**`, other `/assets/**`, Astro dev modules | GET, HEAD, POST, PUT, PATCH, DELETE | Astro `127.0.0.1:4321`                                         |

Prefix matching is by path segment, so `/vendors`, `/market-dates` stay with Astro. Nested routes need no per-page rules.

**Why a second admin dev server.** Astro dev and admin Vite dev both serve `/@vite/client`, `/@id/*`, `/@fs/*`, `/src/*` and `/node_modules/*`. One origin cannot route those unambiguously. `demo:remote:admin` runs the same admin app with Vite `--base /__admin/` on a separate loopback port, so its modules and HMR socket live under `/__admin/`. The browser URL stays `/vendor/...`; the admin router is unaffected. Normal `demo:market-operations:admin` on `:4322` is unchanged and can keep running.

**WebSockets.** The application has no WebSocket endpoint. Only Vite HMR sockets are upgraded: `/` (Astro) and `/__admin/` (admin), with `Sec-WebSocket-Protocol` `vite-hmr`/`vite-ping`, a valid access cookie and a same-origin `Origin`. Anything else is refused.

**Public API preparation.** The same-origin `https://<tunnel>/admin-api` route exists and forwards to Vendure with cookies, `vendure-token` and the multipart upload body intact. The admin build still targets `http://localhost:3000/admin-api`; switching it is Phase B.

**Quick Tunnel.** `demo:remote:tunnel` checks the proxy is listening, runs `cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8790` (no Cloudflare account, no domain, nothing on the Mac), extracts the `trycloudflare.com` URL, writes it atomically to `.remote-demo/tunnel-origin.json`, and prints it. The proxy reads that file when it changes and accepts only that exact host. When the tunnel stops, the file is removed and the proxy goes back to refusing all requests.

## 2. Configuration and environment variables

All optional except the access code. Set them in the shell or the ignored root `.env`; only `REMOTE_DEMO_*` and `CLOUDFLARED_*` keys are read from `.env` by these scripts.

| Variable                          | Default                 | Meaning                                                                                       |
| --------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `REMOTE_DEMO_ACCESS_CODE`         | none (**required**)     | Shared demo access code, at least 20 characters, not one repeated character. Never commit it. |
| `REMOTE_DEMO_PROXY_PORT`          | `8790`                  | Proxy port on `127.0.0.1` (also used by the tunnel script)                                    |
| `REMOTE_DEMO_ADMIN_PORT`          | `4342`                  | Remote admin Vite port (used by both admin script and proxy)                                  |
| `REMOTE_DEMO_STOREFRONT_UPSTREAM` | `http://127.0.0.1:4321` | Astro; must be loopback `http://host:port`                                                    |
| `REMOTE_DEMO_VENDURE_UPSTREAM`    | `http://127.0.0.1:3000` | Vendure; must be loopback `http://host:port`                                                  |
| `REMOTE_DEMO_PUBLIC_ORIGIN`       | unset                   | Optional fixed exact `https://` origin overriding the tunnel file (for manual testing)        |
| `REMOTE_DEMO_MAX_BODY_MB`         | `25`                    | Request body limit (Vendure upload limit is 20 MB)                                            |
| `CLOUDFLARED_PATH`                | `cloudflared` on `PATH` | Path to `cloudflared.exe`                                                                     |

Generate an access code in PowerShell and add it to the root `.env`:

```powershell
$code = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
Add-Content .env "REMOTE_DEMO_ACCESS_CODE=$code"
```

Read it back from `.env` when you need to share it; the scripts never print or log it.

## 3. Commands

Install `cloudflared` on Windows once (it is already present on this PC at `C:\Program Files (x86)\cloudflared\cloudflared.exe`):

```powershell
winget install --id Cloudflare.cloudflared
```

Alternatively, download `cloudflared-windows-amd64.msi` from Cloudflare's official GitHub releases page. Do not run `cloudflared login`; Quick Tunnels need no account. If `%USERPROFILE%\.cloudflared\config.yml` exists, rename it while using a Quick Tunnel, because cloudflared does not start a Quick Tunnel when a config file is present.

Start, each in its own terminal, from the web repository:

1. Existing persistent demo, unchanged: `npm run demo:market-operations:serve`, `npm run demo:market-operations:worker`, `npm run demo:market-operations:storefront` (and `demo:market-operations:admin` if you also want local admin on `:4322`).
2. `npm run demo:remote:admin`
3. `npm run demo:remote:proxy`
4. `npm run demo:remote:tunnel` prints `Remote demo URL: https://<random>.trycloudflare.com`.

Stop with Ctrl+C, the tunnel first. Restarting the tunnel gives a new URL. Restarting the proxy invalidates every access session.

## 4. Security protections

- **Loopback only.** The proxy listens on `127.0.0.1` and verifies the bound address. Every upstream must be a loopback `http://host:port`. Nothing exposes PostgreSQL, Redis, the worker, the document scanner, or other Vendure routes.
- **Host allowlist.** Until a tunnel origin exists, every request gets 503. After that, only the exact tunnel `Host` is accepted; others get 421. The origin file must match `https://<label>.trycloudflare.com`; the env override must be an exact HTTPS origin. Nothing is hard-coded.
- **Forwarded-header boundary.** `Forwarded`, `X-Forwarded-*`, `X-Real-IP`, `X-Client-IP`, `True-Client-IP`, `Via`, `CDN-Loop`, all `CF-*`, `X-Original-*`, method-override headers, hop-by-hop headers, and the app's server-to-server headers (`x-account-bridge`, `x-account-origin`, `x-storefront-bridge`, `x-contact-client`) are dropped, not re-derived. Upstreams receive their own loopback `Host`, so Vite host checks pass without a tunnel or wildcard `allowedHosts`, and Astro proxy trust stays off. `Origin` and `Referer` pass through unchanged, so Astro `checkOrigin` and backend checks still run.
- **Demo access gate.** Every route except the login page needs a signed access cookie, including assets, Vite modules, `/admin-api`, Astro `/api/*` and HMR sockets. Unauthenticated page navigations redirect to `/__remote-demo/login`; everything else gets 401 without reaching an upstream. The cookie is `__Host-remote-demo-access`, `HttpOnly; Secure; SameSite=Lax; Path=/`, expires after 8 hours, and is an HMAC over the expiry and current tunnel origin. The signing key is random per process, so a new tunnel URL or a proxy restart revokes it. The code is compared in constant time after hashing. Failed attempts share a global budget of 10 per 10 minutes, then the gate returns 429. The gate cookie is removed before forwarding, so the application never sees it. The application's own login, sessions and permissions are untouched.
- **Method and path restrictions.** Vendure gets only `POST /admin-api` and GET/HEAD for `/assets/source|preview`. Admin paths are GET/HEAD only. `TRACE`, `CONNECT` and `OPTIONS` are refused (no CORS preflight is needed for same-origin requests). `/shop-api`, `/graphiql`, `/mailbox`, `/health` and `/assets/cache` are refused. The proxy also refuses the following paths: dotfiles and dot segments (except Vite's `.vite`/`.astro`), `..`, encoded `/`, `\` or NUL, double encoding, and absolute-form targets. Vite `/@fs/` reads are limited to the repo's `node_modules`, `packages` and that app's own directory.
- **CSRF hardening at the edge.** Unsafe methods (POST, PUT, PATCH, DELETE) need `Origin` equal to the tunnel origin; otherwise they get 403. This adds to the application's CSRF checks and replaces none of them.
- **CORS.** Upstream `Access-Control-*` response headers are stripped. The dev Vendure CORS reflection cannot grant cross-origin access through the tunnel. `Server`/`X-Powered-By` are dropped and `X-Robots-Tag: noindex, nofollow` is added.
- **Limits and logging.** The body limit is enforced on `Content-Length` and while streaming. Logs show only method, path without query string, upstream and status. Headers, cookies, bodies, handoff codes and the access code are never logged.
- **Payments and data unchanged.** The existing demo scripts, `vendure_demo_market_ops`, Stripe/Square/POS guards and the outbound network guard are not touched. Nothing is migrated, seeded or reset.

## 5. Automated verification performed

- `npm run test:remote-demo`: **64 passed** (63 originally plus the login regression test in section 6a). Coverage:
  - Route selection for representative admin, account, auth, API and asset paths, including `/vendor` vs Astro `/vendor/application-*`, `/vendors`, `/market-dates`, and `/assets` Astro vs Vendure.
  - Denial of internal endpoints, traversal, encoded separators, dotfiles and out-of-root `/@fs/`.
  - Loopback-only upstream and HTTPS public-origin validation, and access-code requirements.
  - Quick Tunnel URL extraction and origin-file validation.
  - A live in-process proxy with three fake upstreams, checking:
    - It binds to `127.0.0.1`.
    - Wrong or look-alike hosts get 421 and no upstream is hit.
    - Unauthenticated pages, assets, Vite modules, `/admin-api` and `/api` are rejected, as are forged cookies.
    - Wrong codes and cross-origin logins are rejected, and the access code never appears in logs.
    - Forwarded and bridge headers are stripped, the `Host` header is rewritten, the gate cookie is removed while app cookies are kept, and `vendure-token` and the request body reach Vendure.
    - CORS and `X-Powered-By` response headers are stripped.
    - Internal endpoints are still unreachable after sign-in.
    - Cross-origin or Origin-less unsafe requests get 403 and oversized bodies get 413.
    - Upgrades without a cookie, from a foreign origin, or with a non-HMR protocol are refused.
- `eslint` and `prettier --check` on the five new files: clean.
- `tsc --noEmit -p tsconfig.json`: no errors in the new files. The project currently has unrelated pre-existing errors, for example in `apps/admin/src/vendor/LoyaltyDashboard.tsx` and several tests.
- CLI smoke test with a throwaway code on port 18790:
  - Listening as `127.0.0.1:18790` only (`netstat`).
  - Returns 503 before a tunnel origin exists.
  - Refuses to start with a short access code.

**Not verified here:**

- The Cloudflare Quick Tunnel was not started. Doing so publishes a public endpoint, so it was left for a deliberate manual step.
- The base-prefixed admin Vite server, real Astro/Vendure traffic, HMR through the tunnel, and multipart uploads were not exercised against the running demo.
- No browser automation was run.

## 6. Manual testing instructions

1. Start the commands in section 3. Note the printed URL.
2. Local fail-closed checks on the PC (PowerShell; substitute your host):
   - `curl.exe -i http://127.0.0.1:8790/` should return **421** (wrong host).
   - `curl.exe -i -H "Host: <random>.trycloudflare.com" http://127.0.0.1:8790/api/shop` should return **401**.
   - `curl.exe -i https://<random>.trycloudflare.com/shop-api` should return **401** (and 404 once signed in).
3. On the MacBook (ideally on a different network, such as a phone hotspot), open the URL in Safari or Chrome. The access page should appear. Enter the code. You should land on the requested path.
4. Check that `https://<url>/graphiql/admin`, `/mailbox`, `/health` and `/.env` return 404/405 while signed in.
5. Open `https://<url>/vendor`. The admin shell should load from `/__admin/...` modules. Data calls are expected to fail until Phase B, because the build still targets `localhost:3000`.
6. Storefront pages will mostly show storefront-not-found or account errors, because Astro sees `127.0.0.1:4321` as the authority. This is expected Phase B work.
7. Stop the tunnel and confirm the URL stops working. Confirm the proxy then answers 503 locally.

## 6a. Fix: access-code login returned 403 Forbidden

**Symptom.** Through the tunnel URL the access page loaded, but submitting the correct code showed a bare `Forbidden` at `/__remote-demo/login`.

**Root cause.** The proxy's gate pages were sent with `Referrer-Policy: no-referrer`. Under the Fetch standard, a browser submitting a form POST from a page with that policy sets `Origin: null` rather than the page's origin. The login handler requires `Origin` to equal the exact tunnel origin, so every submission got a 403 before the code was checked. The other candidates were ruled out:

- A wrong tunnel host returns 421, not 403.
- The form already posts to `/__remote-demo/login` with `method="post"`.
- The access code and cookie are only evaluated after the Origin check passes.

**Fix.** The gate pages now send `Referrer-Policy: same-origin` (`scripts/remote-demo-proxy-core.ts`, `GATE_HEADERS`). Same-origin form POSTs then carry `Origin: https://<tunnel>`, and no referrer is ever sent to other sites. Nothing else changed:

- The exact-origin check still applies to login and logout.
- `Origin: null`, a missing `Origin`, and foreign origins are still rejected with 403.
- Wrong codes still get 401, with the same failure budget.
- The host allowlist, cookie flags and access-code requirements are unchanged.

**Regression test.** `serves the login page with a policy that keeps the form POST Origin` checks the following:

- The login page's `Referrer-Policy` is `same-origin`.
- The form's method, action and `next` value are correct.
- POSTs with `Origin: null` or no `Origin` are still refused without a cookie.

The existing tests still cover the rest: a correct same-origin login gets 303 to `next` with the cookie, a wrong code gets 401, and a cross-origin login gets 403.

**Manual retest.**

1. Restart `npm run demo:remote:proxy` to load the fix. The tunnel can keep running, because the proxy re-reads `.remote-demo/tunnel-origin.json`.
2. On the MacBook, open `https://<current>.trycloudflare.com/vendor`. You should be redirected to `/__remote-demo/login?next=%2Fvendor`.
3. Enter a wrong code. You should see "That access code was not accepted." (HTTP 401) and no cookie should be set.
4. Enter the correct code. You should land on `/vendor`. Developer tools should show the `__Host-remote-demo-access` cookie, marked `HttpOnly` and `Secure`.
5. Cross-origin login should still be refused. On the PC, run the following. It should return `403`.

```powershell
curl.exe -i -X POST -H "Host: <current>.trycloudflare.com" -H "Origin: https://evil.example" -H "Content-Type: application/x-www-form-urlencoded" --data "code=x" http://127.0.0.1:8790/__remote-demo/login
```

## 7. Known limitations and remaining Phase B work

**Required application changes:**

- **Admin API URL.** Set `PUBLIC_ADMIN_API_URL` for the remote admin to `https://<tunnel>/admin-api`. It is a compile-time Vite constant, `config.ts` requires an absolute URL, and the `/__admin` dev server must restart for each new tunnel URL. Also set `SHOP_API_URL` for SSR, which stays on loopback. A same-origin relative endpoint would avoid restarts but needs a config-schema change.
- **Request origin for Astro.** Astro receives `Host: 127.0.0.1:4321` over HTTP. With unmodified `Origin: https://<tunnel>`, `checkOrigin` and the middleware Origin comparison reject POSTs, and redirects, `Secure` cookies and canonical URLs use the loopback origin. Phase B needs a deliberate trusted mechanism, set only by this proxy after its own Host and Origin validation. Do not enable broad proxy trust.
- **Tenant resolution on one host.** Storefront resolution keys on authority. Phase B must add the explicit path- or fixed-tenant mapping described in the audit, plus canonical links, without rewriting saved `*.localhost` domains.
- **Account and handoff origins.** `PLATFORM_ACCOUNT_ORIGIN` and `ADMIN_ORIGIN` are pinned to `http://auth.platform.localhost:4321` and `http://localhost:4322` by `scripts/local-account-environment.ts` and the backend demo `environment.ts`. Login, logout, workspace switching and handoff validation need a coordinated, guarded opt-in for the exact tunnel origin in both repositories, re-applied whenever the URL changes. The tunnel origin is available in `.remote-demo/tunnel-origin.json`, the `origin` field, for that wiring.
- **Absolute URLs.** Vendure-generated asset URLs (`assetUrlPrefix`), stored theme or image URLs on `localhost`, and email or invitation links still point to local hosts. Admin redirects in upstream `Location` headers are passed through unchanged.

**Infrastructure limits:**

- **Client address.** Every request reaches Astro from `127.0.0.1`. Any per-client rate limiting sees one client. Forwarded IPs are deliberately not trusted.
- **Dev tooling exposure.** Astro and admin Vite dev servers, including module source and HMR, are reachable by anyone who passes the access gate. This is acceptable only for a short, small-audience demo.
- **Gate scope.** The gate is one shared code with a global failure budget. It is not per-user access control. Rotate the code, and restart the proxy to revoke sessions.
- **Tunnel lifetime.** Quick Tunnels have no SLA, change URL on every restart, and are public to anyone with the URL. Stop the tunnel after the demo.
- **Vendure binding.** Vendure's own listener binding (its `hostname` default) is unchanged by Phase A. Keep the Windows firewall closed to port 3000, as the audit recommends.
