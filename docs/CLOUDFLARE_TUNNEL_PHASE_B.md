# Cloudflare Quick Tunnel remote demo: Phase B (application compatibility)

Phase B makes the whole application usable through the Phase A Quick Tunnel (`https://<random>.trycloudflare.com`). It builds on [CLOUDFLARE_TUNNEL_PHASE_A.md](CLOUDFLARE_TUNNEL_PHASE_A.md) and [CLOUDFLARE_TUNNEL_DEMO_AUDIT.md](CLOUDFLARE_TUNNEL_DEMO_AUDIT.md). Everything is opt-in: it is active only behind `demo:remote:proxy` and in the `demo:remote:admin` dev server. Normal localhost development, the backend, the database and the payment guards are unchanged.

## 1. What was implemented

**Core idea.** Locally the application already has one origin per role: admin `http://localhost:4322`, central account `http://auth.platform.localhost:4321`, one Astro authority per storefront (`http://manna-roots.localhost:4321`, `http://boerne-farmers-market.localhost:4321`, bare `http://localhost:4321`), and Vendure assets at `http://localhost:3000/assets/`. Phase B keeps all of those as the application's identities. The loopback proxy maps the single public origin onto them, in both directions, at the trust boundary Phase A already built. As a result, tenant resolution, Astro `checkOrigin`, middleware Origin checks, account handoffs and the backend's `Origin === ADMIN_ORIGIN` checks run unchanged, against values the proxy has validated.

| File                                                                                         | Change                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/config/src/remote-demo.ts` (new, exported)                                         | Pure URL mapping shared by the proxy and the remote admin: site ids, internal-to-public URLs, text rewriting                                                                                                                                               |
| `scripts/remote-demo-proxy-core.ts`                                                          | `/store/<site>` selection, virtual-host Host/Origin/Referer translation, per-site cookie partitions, Secure cookies, Location/CSP/body URL translation, Vendure asset round-trip                                                                           |
| `scripts/remote-demo-proxy.ts`                                                               | Also reads the non-secret `ADMIN_ORIGIN` and `PLATFORM_ACCOUNT_ORIGIN` from `.env` (the local identities it maps to)                                                                                                                                       |
| `scripts/remote-demo-admin.ts`                                                               | Sets `REMOTE_DEMO_ADMIN=true` for its own Vite process                                                                                                                                                                                                     |
| `apps/admin/vite.config.ts`, `src/env.d.ts`                                                  | Only with `REMOTE_DEMO_ADMIN=true` from the process (not `.env`) on the dev server: `__ADMIN_API_URL__ = "/admin-api"` and `__REMOTE_DEMO__` (the local origins). Otherwise `__REMOTE_DEMO__` is `null`, so builds and `:4322` are byte-for-byte as before |
| `apps/admin/src/remote-demo.ts` (new)                                                        | `browserUrl`, `browserOrigin`, `adminIdentityOrigin`, `installRemoteDemoLinks`; all are the identity when `__REMOTE_DEMO__` is unset                                                                                                                       |
| `apps/admin/src/main.tsx`                                                                    | Resolves the endpoint against `window.location.origin` (absolute URLs unchanged); installs the link translator                                                                                                                                             |
| `apps/admin/src/account-login.ts`, `AccountModes.tsx`                                        | Handoff `origin` = the local admin identity; account navigations through `browserUrl`                                                                                                                                                                      |
| `apps/admin/src/VisualStorefrontEditor.tsx`                                                  | Preview iframe `src` through `browserUrl`; postMessage target/origin checks through `browserOrigin`                                                                                                                                                        |
| `tests/remote-demo-phase-b.test.ts` (new), `tests/remote-demo-proxy.test.ts`, `package.json` | Focused tests; two Phase A expectations updated (Vendure Host/Origin, see section 2); `test:remote-demo` now runs both files                                                                                                                               |

Astro (`apps/storefront`) and the sibling backend repository have **no code changes**.

**1. API connectivity and CORS.** The remote admin calls the same-origin `https://<tunnel>/admin-api`, which it resolves at runtime from the relative `/admin-api`. With no cross-origin request, the browser needs no CORS. Phase A already strips upstream `Access-Control-*` headers. The proxy presents the validated `Origin: https://<tunnel>` to Vendure as `http://localhost:4322`, the admin origin the backend's handoff and applicant checks expect. `vendure-token`, session cookies, `Apollo-Require-Preflight` and multipart upload bodies are forwarded unchanged. Astro SSR still uses `SHOP_API_URL=http://localhost:3000/shop-api` over loopback. The normal admin keeps `http://localhost:3000/admin-api`.

**2. Public origin handling.** Astro deliberately keeps seeing its local origin (`http://<site>.localhost:4321`), so its `checkOrigin` and middleware comparisons stay strict. For each request the proxy does the following:

- Sets `Host` to the selected site's local authority. Vendure gets `localhost:3000`, so its guessed asset URLs keep their stored local form.
- Translates `Origin` and `Referer` only when they equal the exact public origin. `Origin` is checked first, as in Phase A, for every unsafe method. A `null`, missing or foreign Origin passes untouched and is still rejected.
- Maps internal URLs in responses to the public origin: `Location`, `Content-Security-Policy` (`ws:` becomes `wss:`), and HTML/JSON/XML bodies (absolute links and asset URLs).
- Adds `Secure` to every cookie and drops `Domain`.

Client-supplied forwarding headers are still dropped, and Astro proxy trust (`TRUSTED_PROXY_CIDRS`) stays off. The proxy reads the public origin from the Phase A tunnel file on each request, so a new Quick Tunnel URL takes effect immediately.

**3. Authentication on one host.**

- The proxy-owned `__Host-remote-demo-site` cookie says which local authority the browser is "on". It is set by `/store/<site>/...` and defaults to the central account (`auth.platform`).
- Redirects between authorities become public URLs automatically:
  - Tenant to central login: `/store/auth.platform/account/login?origin=http://manna-roots.localhost:4321&correlation=…`.
  - Central back to a tenant callback: `/store/manna-roots/auth/callback?code=…`.
  - Central to admin: `https://<tunnel>/auth/account?code=…`.
- Handoff identities (`origin=` values, hidden form fields, canonical origins) stay local, exactly as the backend validates them. Correlation cookies, one-time codes, principal checks and role checks are untouched.
- **Cookie collisions:** locally each `*.localhost` site has its own cookie jar, while admin, Vendure and bare `localhost:4321` share host `localhost`. The proxy reproduces that separation:
  - A site's cookies are stored as `rd~<site>~<name>` and returned to that site only, unprefixed.
  - Admin and Vendure cookies stay unprefixed and are never sent to a site.
  - Callback path cookies (`Path=/auth/callback`, `Path=/auth/account`) are unchanged.

**4. Routing.** Phase A's segment-aware inventory still routes admin prefixes, `/admin-api`, assets and everything else. Only one rule was added: `GET|HEAD /store/<site>[/<path>]` sets the site cookie and 303-redirects to `/<path>`. `<site>` is the storefront's local hostname without `.localhost` (`manna-roots`, `boerne-farmers-market`, `auth.platform`), or `localhost` for the bare `localhost:4321` market. The proxy does not need to know whether a site is a vendor or a market, because the backend resolves that exactly as it does locally. No stored domain or canonical URL is changed. The overlaps are unchanged:

- `/vendor/application-{continue,help,return}` go to Astro.
- `/vendors` and `/market-dates` go to Astro.
- `/store` is not used by Astro or the admin.

**5. Assets, uploads, previews.**

- Vendure `http://localhost:3000/assets/…` URLs become `https://<tunnel>/assets/…` in admin GraphQL responses and storefront pages. In admin GraphQL request JSON they are mapped back, so saving a form never stores the tunnel hostname. No other GraphQL data is rewritten.
- Uploads (multipart) stream unchanged to `/admin-api`, within the 25 MB proxy and 20 MB Vendure limits, and keep the ClamAV scanning path.
- The storefront editor preview works through the tunnel:
  - The iframe loads `/store/<site>/storefront-editor-preview/`.
  - Its CSP `frame-ancestors`, `form-action` and `connect-src` are translated to the public origin.
  - The embedded admin `parent` origin becomes the public origin.
  - Both sides of the `postMessage` protocol check the public origin.

**6. Safety.** Payments, POS, billing and provider network guards, `vendure_demo_market_ops`, accounts and permissions are untouched. `/shop-api`, `/graphiql`, `/mailbox`, `/health`, `/assets/cache` and every other Vendure route stay unreachable, and the access gate still covers every route, including `/store/*`.

## 2. Architectural and security decisions

- **Translate at the boundary instead of teaching the app a public origin.** The alternative would add a trusted forwarded-origin header to Astro, plus coordinated tunnel-origin settings in both repositories' account configuration, re-applied for every new URL. That means broader trust, guard changes in the backend demo environment, and restarts. Translation keeps every existing check and needs no backend or Astro changes.
- **Origin translation is not trust escalation.** The proxy translates only an `Origin` it has already verified is exactly the public origin. Which local origin it presents is decided from the `Referer` path: admin pages present the admin origin, any other page presents the current site's origin, and with no Referer the target's own origin is used. This reproduces local behavior. A non-browser client could fake those headers, but it could equally send a fake local `Origin` directly. Origin checks protect browsers against CSRF, and that protection holds, because cross-site pages cannot produce `Origin: https://<tunnel>`.
- **One browser origin.** All virtual hosts share the tunnel origin. Cookies are partitioned by the proxy, but the browser's same-origin policy no longer separates tenant pages from admin pages (scripts on one page could read another). All pages are first-party application code and the demo is gated, so this is acceptable for a demo only. It is the main reason this mode must never become a deployment model.
- **Body rewriting is bounded.** Only `text/html`, `application/*json` and XML responses up to 16 MB are rewritten, with `Accept-Encoding: identity` requested from Astro and Vendure. Only exact local hosts on known ports are matched. Look-alike hosts, other ports, `https:` local URLs and userinfo tricks are left alone. Admin Vite modules are never rewritten.
- **Phase A test expectations that changed.** Vendure now sees `Host: localhost:<port>` (was `127.0.0.1:<port>`) and `Origin: http://localhost:4322` (was the tunnel origin). Both are deliberate.

## 3. Intentionally unsupported

- **Two storefronts at once in one browser.** The site cookie applies to every tab. Switching sites in one tab changes what another tab's next navigation shows. Use a second browser or a private window for side-by-side tenants.
- **Email, SMS and invitation links** still point at local hosts. Communications are disabled in this demo anyway.
- **Provider flows** (Stripe Connect, Square, Clover, QuickBooks OAuth, webhooks) stay disabled and show their existing unavailable states. Their callback routes are not routed to Vendure.
- **Data-driven `window.open` or `location.assign` calls in the admin with absolute storefront or account URLs** other than the ones adapted here. Anchors are translated on click, and none of these other calls were found that target internal origins.
- **Per-client rate limits**: every request still reaches Astro from `127.0.0.1` (Phase A).

## 4. Configuration and startup

There are no new settings. The proxy additionally reads `ADMIN_ORIGIN` (default `http://localhost:4322`) and `PLATFORM_ACCOUNT_ORIGIN` (default `http://auth.platform.localhost:4321`) from the root `.env`, the same values the guarded demo scripts require. The startup sequence is the Phase A one, each command in its own terminal:

```
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:storefront

npm run demo:remote:admin
npm run demo:remote:proxy
npm run demo:remote:tunnel
```

- **After pulling Phase B**, restart `demo:remote:admin` and `demo:remote:proxy`. The tunnel and the three demo processes can keep running.
- **When the tunnel URL changes**, nothing needs a restart or rebuild. The proxy picks up the new origin from `.remote-demo/tunnel-origin.json`. The admin API path is relative, and no process stores the hostname. The only manual step is entering the access code again on the new URL, because the gate and site cookies belong to the old hostname.

## 5. Automated verification

All commands were run from the web repository with `FRONTEND_NO_EVIDENCE=true`, so no evidence files were written.

| Check                                                                                 | Result                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run test:remote-demo` (Phase A suite plus the new `remote-demo-phase-b.test.ts`) | **91 passed** (64 Phase A including one new regression assertion, 27 Phase B)                                                                                                                                                                          |
| `eslint` and `prettier --check` on every changed or new file                          | Clean                                                                                                                                                                                                                                                  |
| `tsc --noEmit -p tsconfig.json`                                                       | No errors in changed files. Unrelated pre-existing errors remain, for example `apps/admin/src/vendor/LoyaltyDashboard.tsx` and several `tests/*.test.tsx`                                                                                              |
| Existing admin tests touching the edited admin files (14 files)                       | 22 failures, an **identical set with and without the Phase B hunks** (A/B run). They are pre-existing copy and fixture drift, for example "Overview" vs "Dashboard" labels. Not investigated                                                           |
| `scripts/check-boundaries.ts`                                                         | Stops on a pre-existing `Unsafe platform pattern` in `apps/admin/src/DashboardWidgets.tsx` (untouched). The new files were checked against its rules manually: declared `@market/config` import, no relative cross-package imports, no unsafe patterns |

Phase B test coverage (`tests/remote-demo-phase-b.test.ts`):

- **Same-origin API:** the admin Vite config gives `/admin-api` only with `REMOTE_DEMO_ADMIN=true` on `serve`, `null` for builds, and the absolute local URL otherwise.
- **Origin handling:** the Origin and Referer are translated from the initiating page. Admin pages present `http://localhost:4322` to Vendure and Astro, and site pages present their site origin. `null`, foreign and look-alike origins are refused before any upstream.
- **Login, logout and handoff URLs:** tenant-to-central `Location` keeps the local `origin=` identity, central-to-admin `Location` becomes the public URL, and no response header mentions `localhost`.
- **Tenant resolution:** `/store/<site>` selection, its gate requirement and redirect target, site and default-central Host, and rejection of malformed or encoded ids and unsafe methods.
- **Route conflicts:** `/vendor/application-*`, `/stores`, editor preview routes and provider callbacks are routed as before.
- **Cookies:** per-site partitions, rename, `Secure` and `Domain` removal; proxy cookies are never forwarded.
- **Asset URL mapping:** HTML and JSON, `srcset`, the GraphQL round-trip, and that canonical origins in GraphQL data are not rewritten.
- **Uploads:** a byte-exact multipart upload with headers and admin Origin.
- **Internal endpoints:** still 404 with a site selected.
- **Payment safeguards:** provider callback paths never reach Vendure.
- **Remote-demo mode off:** the admin helpers are the identity.

**Loopback smoke test against the running persistent demo.** This was a CLI check, not browser automation: a temporary proxy on `127.0.0.1:18790` with a throwaway access code and a fake tunnel origin, sending read-only requests to the real Astro, Vendure and admin servers.

- `/store/manna-roots/` returned 303 with the site cookie.
- These pages returned 200 with the right title and no remaining `localhost` URLs:
  - Manna Roots `/` and `/products`
  - Boerne Farmers Market `/`, with its vendor links translated to `/store/<vendor>`
  - the bare `localhost` market `/`
  - central `/account/login`
  - `/test-storefronts`, which links to `/store/<site>/`
- Product images via `/assets/preview/…` returned 200 `image/jpeg`.
- Tenant `/account/sign-in` returned 302 to `/store/auth.platform/account/login?origin=http%3A%2F%2Fmanna-roots.localhost%3A4321…`, with `rd~manna-roots~account-correlation` cookies marked `Secure`.
- `POST /admin-api` returned `{"data":{"__typename":"Query"}}` with no CORS headers.
- `/vendor/orders` served the admin SPA with modules under `/__admin/`.
- `/shop-api`, `/graphiql/admin`, `/mailbox` and `/health` returned 404.

The real tunnel, a browser, sign-in, uploads and the editor iframe were not exercised. Your running proxy and tunnel were not touched.

## 6. Manual testing on the MacBook

Use the existing demo accounts. `demo.customer@example.test` has orders and follows Manna Roots. `manna-roots@example.test` is the Manna Roots vendor. Use the existing Boerne market manager account. The shared demo password is `demoPassword` in the backend's `scripts/market-operations-demo/environment.ts`. Ideally test from a different network, such as a phone hotspot. Keep Safari or Chrome developer tools open on the Network and Console tabs.

1. **On the PC:** stop `demo:remote:admin` and `demo:remote:proxy` (Ctrl+C) and start them again. Leave the other processes running. If you restart the tunnel too, note the new URL it prints.
2. **Gate.** Open `https://<tunnel>/test-storefronts`, enter the access code, and you should land on "Test storefront links". Hover a link: it should be `https://<tunnel>/store/<site>/`, never `localhost`.
3. **Vendor storefront.** Click **Manna Roots**. The address bar should become `https://<tunnel>/`, with Manna Roots branding and product images. Open a product, the shop and About. Reload, and the same storefront should remain. Paste `https://<tunnel>/store/manna-roots/products` directly: the Manna Roots shop should open.
4. **Market storefront.** Open `https://<tunnel>/store/boerne-farmers-market/`. Open market dates and vendors. A vendor card link should go to `/store/<vendor>` and open that vendor's storefront.
5. **Customer sign-in.** On Manna Roots, choose Sign in. You should reach the central sign-in at `/account/login`, still on the tunnel host. Sign in as `demo.customer@example.test` and you should return to the storefront's account page. `https://<tunnel>/store/auth.platform/account/orders` should list orders. In DevTools → Application → Cookies, the cookies should be named `rd~manna-roots~…` and `rd~auth.platform~…`, all `Secure`.
6. **Workspaces.** Sign out of the customer (central sign-in is shared), then sign in as `manna-roots@example.test` at `https://<tunnel>/store/auth.platform/account/login` and open **Workspaces**. Choosing Manna Roots should open `https://<tunnel>/vendor?channel=…` and the vendor dashboard should load data. The Console should show no CORS or `localhost:3000` errors, and the Network tab should show `POST /admin-api` to the tunnel host only.
7. **Admin depth.** Open several nested vendor pages (products, orders, documents, markets, storefront editor). Reload one and paste its URL into a new tab: it should open directly.
8. **Switching.** Use the account mode menu. Customer should go back to the central account. Sign in as the Boerne market manager, open Market Manager, and check `/market/...` nested routes (applications, layouts and the layout editor, occurrences). If your account is a platform administrator, open `/platform`.
9. **Upload.** In vendor Documents, upload a small PDF. It should upload and show its scan state. Delete it afterwards if you do not want it kept: uploads write to the test DB.
10. **Editor preview.** Open the vendor visual storefront editor. The iframe preview should load the Manna Roots storefront and update while you edit. Do not publish unless you intend to change the test data.
11. **Payments.** Start a checkout on a storefront. Card payment should show its existing unavailable or disabled state, and no Stripe or Square page should open.
12. **Logout.** Sign out from the admin and from the central account. You should end on tunnel pages such as `/auth/signed-out`, never `localhost`.
13. **Blocked endpoints.** `https://<tunnel>/shop-api`, `/graphiql/admin`, `/mailbox` and `/health` should return 404.
14. **New hostname.** Restart only `demo:remote:tunnel`. Open the new URL and enter the code. Repeat step 3 and step 6. Both should work with no other restart.
15. **Localhost unchanged (on the PC).** `http://localhost:4322/vendor` (normal admin) and `http://manna-roots.localhost:4321/` should behave as before.

## 7. Known limitations and follow-ups

- **One site per browser** at a time; see section 3. A per-tab site in the URL would need path-preserving HTML and script rewriting and was not attempted.
- **Shared browser origin** across tenants, central and admin is a demo-only trade-off; see section 2.
- **Data-driven absolute URLs** that reach the browser other than through anchors, `Location` headers, Astro HTML/JSON, CSP or the adapted admin calls would keep their local form. None are known; report any `localhost` you see in the address bar or Network tab.
- **Buffered responses.** Rewritten HTML and JSON responses are buffered (up to 16 MB), so streamed SSR pages arrive in one piece.
- **Not yet verified through the real tunnel.** Real-browser behavior was not verified here: Safari ITP, the iframe preview, HMR over `wss`, ClamAV upload results. Use section 6.
- **Pre-existing failures** to address separately: the 22 admin test failures, the `DashboardWidgets.tsx` boundary violation, and the `tsc` errors listed in section 5.

## Storefront editor image fix (November 12, 2026)

The reported `INVALID_STOREFRONT_IMAGE` was traced to the automatic preview authorization path. `ConnectedPreview` in `apps/admin/src/VisualStorefrontEditor.tsx` sends the loaded draft to the iframe. `apps/storefront/src/lib/editor-preview-client.ts` posts URL-encoded JSON in the `payload` field to `/storefront-editor-preview/render`. `authorizeEditorRender` in `editor-preview-server.ts` then calls the local Admin API directly with:

```graphql
query AuthorizePreview($token: String!, $host: String!, $config: JSON!) {
  authorizeStorefrontPreview(token: $token, host: $host, config: $config)
}
```

Vendure's `StorefrontAppearanceService.authorizePreview` calls `validateStoryAssets`, including through `validateFarmhouseReferences` and `validateEditorialReferences`. It checks each selected image against the authorized Asset's exact local preview/source URL. The relevant fields are authored section `image`/`imageAssetId` pairs and template photo/logo `url`/`assetId` pairs. A tunnel URL fails that equality check even when the asset ID is valid. The homepage image also travels in the same draft, but its URL syntax validator accepts HTTPS; it is not the exact-asset comparison responsible for this failure.

Phase B already reverse-translated asset URLs in `/admin-api` JSON, including nested JSON, for saves. It did not translate the iframe's form-encoded payload. Astro's server-to-server `AuthorizePreview` request bypasses the proxy's `/admin-api` handling, so its config still contained tunnel URLs. Initialization starts an ephemeral preview grant and authorizes the draft for rendering; it does not unexpectedly save a draft. This transport mismatch explains the remote-only failure without requiring a persistent data rewrite.

`scripts/remote-demo-proxy-core.ts` now decodes the form only for storefront `POST /storefront-editor-preview/render` requests with `application/x-www-form-urlencoded`. It restores the exact current public `/assets/` prefix inside `payload` to the configured local Vendure prefix, re-encodes the form and recalculates Content-Length. This handles nested sections and theme assets through the existing asset translation helper. Other fields and routes retain their values. Normal localhost requests never use this proxy.

Backend image validation, MIME checks, ownership/channel and theme-asset authorization, preview capabilities, gate checks, origin checks, body limits, cookies and route restrictions are unchanged. Foreign URLs and relative references are not converted into trusted URLs. A wrong asset path remains a wrong asset path even if its tunnel prefix is restored. No database records, image files, backend files or editor UI were changed.

Verification from the web directory with `FRONTEND_NO_EVIDENCE=true`:

- `npx vitest run tests/remote-demo-proxy.test.ts tests/remote-demo-phase-b.test.ts --reporter=default`: 93 passed. New HTTP proxy regressions cover nested story/theme/logo URLs, local URL preservation, invalid foreign/look-alike/relative references, wrong asset paths, unchanged IDs/token/path/scroll, Unicode/form escaping, updated Content-Length and unchanged unrelated form routes. Existing tests cover GraphQL image round-trips, byte-exact multipart uploads, localhost admin mode and Phase A/B restrictions. The initial sandbox run encountered loopback `EACCES`; the same focused command passed with loopback access enabled.
- `npx eslint scripts/remote-demo-proxy-core.ts tests/remote-demo-phase-b.test.ts`: passed.
- `npx prettier --check scripts/remote-demo-proxy-core.ts tests/remote-demo-phase-b.test.ts docs/CLOUDFLARE_TUNNEL_PHASE_B.md`: passed.
- `npx tsc --noEmit --strict --noUncheckedIndexedAccess --noUnusedLocals --noUnusedParameters --verbatimModuleSyntax --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --types node scripts/remote-demo-proxy-core.ts`: passed.

Manual retest:

1. Restart only `npm run demo:remote:proxy` to load this fix. Keep the existing tunnel and guarded persistent-demo processes running. No migration, reseed or hostname-specific data update is needed.
2. Through the tunnel, sign in with the existing vendor account, choose its workspace and open its existing storefront editor. Confirm the saved configuration and existing story/theme images appear, the preview reaches its up-to-date state, and the backend no longer reports `INVALID_STOREFRONT_IMAGE` for `AuthorizePreview`.
3. Open image-related settings. Select an existing authorized vendor image and, where available, a theme image/logo. Confirm both the picker preview and rendered storefront update. Save the draft, reload the editor and confirm the saved selection remains. Test a small PNG/JPEG upload if desired. These explicit actions change test data; record the previous selection and restore it afterward. Publishing is unnecessary.
4. Open normal `http://localhost:4322/vendor` and confirm the same editor loads, previews and saves with local images as before.
5. Confirm the tunnel access gate and blocked `/shop-api`, `/graphiql/admin`, `/mailbox` and `/health` routes still behave as documented above.

Remaining limitations: no browser automation, full test suite, real-tunnel manual retest or database mutation was performed for this fix. The proxy tests verify transport restoration against local mock upstreams; they do not execute Vendure's database-backed asset authorization. Backend validation remains intact by inspection. Existing invalid/missing/unowned asset references will still be rejected and require separate investigation if encountered. The pre-existing limitations above continue to apply.
