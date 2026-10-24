# Clover OAuth callback fix

Verified locally on October 19, 2026. No real Clover payments, Production APIs, screenshots, recordings or traces were used. Neither `vendure` nor `vendure_demo_market_ops` was modified.

## Exact root cause

The empty HTTP 200 came from Caddy before the request reached the backend. The supplied temporary Caddyfile began with `http://127.0.0.1:8787`. Caddy compiled that address into a virtual-host matcher for `127.0.0.1`. The tunnel forwards its public hostname in the HTTP Host header, which did not match that virtual host. No route ran, including the nested 404 fallback, and Caddy finalized an empty HTTP 200 without Location.

This was reproduced against the running local Caddy process using parameter-free requests through Node's HTTP client with explicit Host headers. No authorization code or state from a real callback was used. Reading Caddy's active loopback configuration confirmed `match: [{host: ["127.0.0.1"]}]` around the callback routes.

| Local probe before the fix                  | Result                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| Callback with loopback Host                 | 502, because the old disposable backend on port 54697 was no longer listening |
| Same callback with the supplied tunnel Host | 200, content-length 0, no Location                                            |

The distinction explains why a direct loopback request could reach the backend while the actual authorization return produced a blank page. A reachable route under one Host does not prove it matches the tunnel Host.

The existing `CloverOAuthController` was already registered in `MarketplaceCommercePlugin.controllers` and correctly used `@Res()` with `res.redirect(303, destination)`. A new real HTTP regression passed against that controller before changing its source. It did not return an empty value for framework serialization, mix passthrough and manual response handling, or lose its redirect to an interceptor. Vendure's HTTP handling and the project's GraphQL-only interceptors allow this response through. Missing or invalid dashboard return configuration fails with 400 before claiming the pending state. The frontend return handler correctly calls authenticated completion using the original session.

## Correction and response contract

The corrected local Caddy site uses:

```caddyfile
http://:8787 {
  bind 127.0.0.1
  @oauth {
    path /in-person/clover/oauth/callback
    method GET
  }
  handle @oauth {
    reverse_proxy 127.0.0.1:<current-disposable-backend-port>
  }
  # Existing local launch redirects and the 404 fallback follow.
}
```

The socket remains bound to loopback, and only the exact GET callback is proxied. Other API paths and callback POST requests return 404. The site has no host matcher that excludes the forwarded tunnel hostname. This changes local routing only. No tunnel, domain, DNS or hosting project was created or changed.

The existing Caddy process was validated and reloaded with the corrected project-local `.pos-stage-d-demo/clover-oauth.Caddyfile`, preserving its old upstream. The original temporary Caddyfile was left unchanged. After reload, both Host probes reached the old upstream and returned 502 instead of an unmatched 200. A separate real Caddy instance against a fresh disposable backend then verified 400 for missing parameters and the complete successful browser redirect. Do not reload the old temporary file, which still contains the faulty host-qualified site address.

For a valid pending callback, the service still verifies the state hash, expiry, one-time receipt, application, environment, region and registered callback context. It seals the authorization code and merchant/application identifiers in the existing authenticated encrypted envelope. It does not exchange the code on the public route. The HTTP response is:

```http
HTTP/1.1 303 See Other
Location: http://localhost:4590/vendor/settings/clover-return?state=<opaque-pending-state>
Cache-Control: no-cache, no-store, max-age=0
Pragma: no-cache
Expires: 0
Referrer-Policy: no-referrer
```

Only the opaque state is added to the configured dashboard return URL. Codes, tokens and secrets are absent from response headers and URLs. The vendor dashboard removes state from browser history and calls `finishOwnCloverConnection` through its existing authenticated API transport. Completion verifies the original vendor, actor, channel and session, atomically consumes the state, exchanges the code, verifies the merchant and USD currency, stores encrypted credentials, and clears the temporary envelope. Invalid, expired, duplicate, replayed and wrong-session returns fail safely.

## Files changed

Paths are relative to their repository roots. Existing uncommitted work was preserved.

| Repository             | File                                                                    | Change                                                                                                |
| ---------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Backend                | `src/plugins/marketplace-commerce/in-person/clover/oauth.controller.ts` | Explicit no-cache, Pragma and expiry headers alongside the existing redirect and no-referrer handling |
| Backend                | `test/in-person/clover.ts`                                              | Registered-controller HTTP assertions and invocation of the expanded HTTP/session regression          |
| Backend                | `test/in-person/clover-oauth-http.ts`                                   | Real Nest/Express callback responses and authenticated Admin API begin/finish tests                   |
| Web                    | `scripts/clover-oauth-proxy.ts`                                         | Guarded manifest-based Caddyfile generator and isolated real-Caddy regression helper                  |
| Web                    | `scripts/clover-browser.ts`                                             | Browser navigates through the real callback and completes with its original authenticated session     |
| Web                    | `tests/clover.test.tsx`                                                 | Opaque-state return, missing state, safe errors, URL cleanup and StrictMode single completion         |
| Web                    | `package.json`                                                          | `demo:pos:clover:proxy` local configuration command                                                   |
| Web                    | `docs/inPersonPayments/STAGE_D_CLOVER_SETUP.md`                         | Corrected local Caddy setup and restart instructions                                                  |
| Web                    | `docs/inPersonPayments/STAGE_D_OAUTH_CALLBACK_FIX.md`                   | This report                                                                                           |
| Local runtime, ignored | `.pos-stage-d-demo/clover-oauth.Caddyfile`                              | Corrected configuration loaded into the existing local Caddy process                                  |

No connection-service security checks, controller registration, frontend production behavior, Square implementation, cash, refunds, inventory or shared payment coordinator were rewritten. No UI primitive was added.

## Tests and results

All database suites use their existing guarded, randomized loopback disposable databases. Successful databases are removed by their owning harnesses. One failed diagnostic backend run was retained by its normal guard after a test assertion incorrectly treated the encrypted JSON envelope as a string; that assertion was corrected. No protected database was used.

Run database commands from `E:\coding\farmers-market-platform-web` with `APP_ENV=test`, `NODE_ENV=test`, `FRONTEND_NO_EVIDENCE=true`, and `DB_HOST=127.0.0.1`.

| Command or verification                                                                                           | Result                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run test:pos:clover`                                                                                         | 23 groups passed, including final cache-header and pre-completion replay assertions                            |
| `node node_modules/vitest/vitest.mjs run tests/clover.test.tsx tests/square.test.tsx tests/pos-payments.test.tsx` | 41 tests passed                                                                                                |
| `npm run test:pos:square`                                                                                         | 28 groups passed, zero Square API calls                                                                        |
| `npm run test:pos:clover-browser`, with `CLOVER_OAUTH_CADDY_BINARY` set to the installed local executable         | 6 Clover groups, 5 Square groups and the read-only native payment/unit/inventory audit passed                  |
| Web `tsc --noEmit`                                                                                                | Passed                                                                                                         |
| Backend `tsc --noEmit --project test/in-person/tsconfig.json`                                                     | Passed                                                                                                         |
| Targeted ESLint                                                                                                   | Passed                                                                                                         |
| `npm run build:production-local`                                                                                  | Passed: storefront, admin, backend dashboard, server and worker; synthetic build values, no database bootstrap |
| Local Caddy validate/reload and Host probes                                                                       | Passed; original mismatch reproduced and eliminated                                                            |

The HTTP suite explicitly fails an empty HTTP 200, requires 303 and Location, checks the exact configured dashboard path and state-only query, checks cache/referrer headers and credential absence, and exercises missing/invalid/unknown/expired state, wrong app, malformed merchant, duplicate callback, replay, wrong vendor, different session, anonymous completion and invalid/missing return URLs. It also verifies that an `Accept: application/json` request retains redirect status and Location even when Express selects an empty redirect body.

The browser run with `CLOVER_OAUTH_CADDY_BINARY` launches an isolated real Caddy on a temporary loopback port, exercises a non-loopback Host against the actual registered callback, rejects non-callback and non-GET proxy access, then navigates a controlled successful callback through Caddy into the dashboard. The existing Clover, Square and native financial/inventory audit checks continue afterward. No external Clover or Cloudflare request is needed for these regressions.

## Restart and manual retest

Yes, restart the local Clover Sandbox demonstration. Its former backend port 54697 and dashboard port 4590 were not listening when inspected, and the old demo manifest was absent. Restarting Caddy alone cannot restore that backend. The corrected Caddy process is already loaded, but its upstream must be updated to the next demo's port. The existing quick tunnel can remain running if its hostname has not changed. No new developer application or test merchant is needed.

1. In the terminal holding the existing Sandbox environment variables, run `npm run demo:pos:clover-sandbox`. If those variables are gone, re-enter the same existing app ID, secret, RAID, POS identity and Sandbox configuration using the secure-input instructions in [Stage D setup](STAGE_D_CLOVER_SETUP.md). Use the registered HTTPS callback ending `/in-person/clover/oauth/callback` and `CLOVER_RETURN_URL=http://localhost:4590/vendor/settings/clover-return`. Keep the appropriate encryption keyring for the running disposable environment. Do not use either protected database or reset/seed commands.
2. Wait for the fresh disposable demo's ready message. In a second terminal in the web directory, run `npm run demo:pos:clover:proxy`. It reads the current guarded disposable manifest and writes the corrected callback Caddyfile with the actual backend port.
3. Run the printed `caddy reload --config ... --adapter caddyfile` command against the existing local Caddy process. If `caddy` is not on PATH, use the installed executable at `C:\Users\jake_\AppData\Local\Microsoft\WinGet\Packages\CaddyServer.Caddy_Microsoft.Winget.Source_8wekyb3d8bbwe\caddy.exe`. Do not reload `C:\Users\jake_\AppData\Local\Temp\clover-oauth-Caddyfile`.
4. Verify a parameter-free GET through the local proxy using the tunnel Host. Expect 400, not 200. Use GET rather than HEAD; only GET is forwarded. The probe contains no OAuth code or state:

   ```powershell
   $cloverCallbackHost=([uri]$env:CLOVER_REDIRECT_URL).Authority
   curl.exe --silent --output NUL --write-out "%{http_code}" --header "Host: $cloverCallbackHost" http://127.0.0.1:8787/in-person/clover/oauth/callback
   ```

5. Sign into the local platform account and open the intended vendor dashboard from the new demo's printed credentials/channel link. Open Settings, Payment Integrations, then Connect Clover. Keep that browser session and vendor/channel unchanged. Authorize the existing US Sandbox test merchant through the existing app.
6. Expect automatic navigation through a 303 response to `http://localhost:4590/vendor/settings/clover-return?state=...`, followed by removal of the query and the merchant-authorization success message. Return to Payment Integrations and verify CONNECTED and the intended merchant identity. Do not copy callback codes or states into chat, logs or test files.
7. If authorization expired or a callback was already received, start a fresh Connect action. Never replay a previously shared callback. Do not make a payment to test OAuth.

Real Sandbox authorization was not repeated during this fix. Controlled provider responses verified the complete HTTP/browser/session behavior; the manual retest above is the remaining check against the existing external Sandbox account.
