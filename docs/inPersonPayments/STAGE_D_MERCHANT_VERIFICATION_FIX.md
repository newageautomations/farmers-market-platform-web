# Clover Sandbox merchant verification fix

October 19, 2026. Status: code corrected and controlled tests passed. The existing real Sandbox merchant has not been reverified by this process. No inherited Sandbox app credentials or fresh authorization code were available. No real provider API calls, charges, screenshots, videos, traces, deployments, commits or pushes were made. Neither `vendure` nor `vendure_demo_market_ops` was modified. The running manual Sandbox demo and its manifest were left alone.

## Exact finding and evidence limits

The displayed message came from `CloverConnectionService.complete`, reached through `finishOwnCloverConnection` and `finish`. The precise former condition was:

```typescript
merchant.id !== merchantId || merchant.currency !== 'USD';
```

`merchant` was the parsed result of `GET /v3/merchants/{authorizedOAuthMerchantId}`. Consequently, a correct merchant ID with no `currency` field also failed that check. The code never requested `/properties`. The existing controlled fixture supplied a root `currency: "USD"` field, which masked this contract error.

The reported message occurs after successful OAuth token response parsing/validation and a successful merchant API response parse. Previously, HTTP 401/403, network errors or invalid JSON threw inside the earlier catch and produced the different message `Clover authorization could not be verified. Start Connect Clover again`. Therefore the reported message is not evidence of an HTTP permission rejection. Its exact runtime cause could have been a missing/different `id`, a missing `currency`, or a different currency value. The original sensitive response was not available and was not retrieved from the other running process, so this report does not assert which operand was true for that merchant.

The incorrect currency lookup is established independently by official documentation and controlled reproduction. An official-shaped merchant with the correct ID, plus properties containing `defaultCurrency: "USD"`, failed the old condition because `merchant.currency` was absent. It now completes the original-session connection. The real merchant's identity and USD status remain subject to the next actual API responses after a fresh authorization.

## Official API comparison

| Source                                                                                                                                                                | Relevant contract                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Get a single merchant](https://docs.clover.com/dev/reference/merchantgetmerchant)                                                                                    | GET `/v3/merchants/{mId}` retrieves merchant identity. `properties` is also an expandable resource, so an unexpanded merchant response must not be assumed to contain its properties. |
| [Get a merchant's properties](https://docs.clover.com/dev/reference/merchantgetmerchantproperties)                                                                    | GET `/v3/merchants/{mId}/properties` retrieves the same merchant's properties as a direct JSON object.                                                                                |
| [Merchant properties field definition](https://docs.clover.com/dev/reference/merchantupdatemerchantproperties)                                                        | Defines `defaultCurrency` as a string and `merchantRef` as an object. This page was read for its schema only; no write request was made.                                              |
| [Official Clover MerchantProperties model](https://clover.github.io/clover-android-sdk/clover-android-sdk/com.clover.sdk.v3.merchant/-merchant-properties/index.html) | Defines `defaultCurrency` and `merchantRef` on the properties model.                                                                                                                  |
| [Official Clover Merchant model](https://clover.github.io/clover-android-sdk/clover-android-sdk/com.clover.sdk.v3.merchant/-merchant/index.html)                      | Exposes `defaultCurrency` and `properties`; a transaction-style `currency` assumption is inappropriate for this connection check.                                                     |
| [Set app permissions](https://docs.clover.com/dev/docs/permissions)                                                                                                   | Read Merchant is required to read merchant properties. Permission changes after installation require uninstall/reinstall of that same app for the merchant, including test merchants. |

The implementation deliberately uses the dedicated properties endpoint rather than depending on expansion or inventing fallback paths. The expected body is `{ "defaultCurrency": "USD" }`, optionally with `merchantRef: { "id": "..." }`. An unexpected wrapped body, array, numeric currency or object currency is rejected. A three-letter string is case-normalized, so `USD` and `usd` identify the same currency. Country, locale, addresses, and a root `merchant.currency` are never substitutes for this authoritative field. An API error is never bypassed using another field.

## Corrected behavior

The pending-state, vendor, actor, session, channel, app, environment and callback guards remain unchanged. The public HTTPS callback still encrypts the temporary code, responds with 303 and a state-only dashboard Location, and retains its cache/referrer protections. The frontend still finishes through the original authenticated session. Caddy and Cloudflare configuration were not changed by this patch.

After code exchange, verification now proceeds as follows:

1. GET `/v3/merchants/{originalAuthorizedMerchantId}` with the newly issued OAuth access token.
2. Require a direct object with a nonempty string `id` exactly equal to the original OAuth merchant ID. Stop before requesting properties on an identity failure.
3. GET `/v3/merchants/{sameOriginalAuthorizedMerchantId}/properties` with the same token. If a merchant reference is supplied, require its ID to match too.
4. Require a three-letter `defaultCurrency` string whose normalized value is exactly USD. Missing, malformed and non-USD values fail separately. No USD default exists.
5. Only after both reads verify, persist the existing connection and encrypted tokens in the existing transaction. The helper returns only the ID, display name and verified USD currency, not the full merchant or properties response.

The transport allowlist now permits the exact merchant `/properties` resource. It retains the Sandbox US host guard, redirects disabled, endpoint/query restrictions, and no automatic effect retries. Invalid JSON now retains its actual HTTP status and a fixed failure reason instead of being indistinguishable from a network failure. Financial writers, authorization policy, payment/refund coordinators, stock guards and Square implementations were not changed.

| Failure                         | Dashboard distinction                                           | Optional diagnostic                                  |
| ------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------- |
| Missing merchant ID             | Merchant API did not provide an ID                              | `missing-merchant-id`, expected field `id`           |
| Different merchant ID/reference | Does not match the authorized OAuth merchant                    | `merchant-id-mismatch`                               |
| Missing currency                | Properties did not provide `defaultCurrency`                    | `missing-currency`, expected field `defaultCurrency` |
| Invalid currency type/format    | Unexpected `defaultCurrency` format                             | `invalid-currency-format`                            |
| Non-USD                         | Only USD merchants are supported                                | `non-usd-currency`                                   |
| HTTP 401/403 on either read     | Authorization/Read Merchant permission denied, with HTTP status | `authorization-or-permission` and the read stage     |
| Other HTTP error                | API verification failed, with HTTP status                       | `api-error`                                          |
| Invalid JSON/unexpected object  | Unexpected API response                                         | `unexpected-response`                                |
| Connection/timeout failure      | API could not be reached                                        | `network-error`, status 0                            |

A 401 or 403 is treated as authorization or permission failure, not proof of a specific missing scope or a merchant mismatch. The safe message directs the user to check authorization and the existing app's Read Merchant permission. It does not include provider payloads or actual identifiers.

State remains single-use even when verification fails after exchange. Start a new Connect action; the old authorization code or return URL cannot be retried.

## Temporary diagnostics

`CLOVER_MERCHANT_DIAGNOSTICS=true` enables failure-only diagnostics in the backend for the next demo start. It is off by default and passed through the existing server-side Clover configuration. The frontend receives no credentials or diagnostic configuration. A representative line contains only fixed labels, numeric HTTP status, and expected missing field names, plus normal logging metadata:

```json
{
  "level": "warn",
  "event": "clover_merchant_verification",
  "stage": "properties",
  "failure": "missing-currency",
  "httpStatus": 200,
  "missingFields": "defaultCurrency"
}
```

It never logs code, OAuth state, access/refresh tokens, application secret, encryption keys, merchant identifiers, currency values, URLs, headers, provider errors or full responses. Success emits no diagnostic response data. The controlled tests capture these lines and check their allowed keys and absence of credential/merchant canaries. After qualification, remove the environment flag before the next restart. An earlier token-exchange failure retains its existing generic safe message; the merchant-specific diagnostic begins only after token exchange succeeds.

## Files changed

Backend repository, `E:\coding\farmers-market-platform`:

- `src/plugins/marketplace-commerce/in-person/clover/connection.service.ts`: replace the incorrect merchant currency check with strict read-only verification after exchange.
- `src/plugins/marketplace-commerce/in-person/clover/merchant-verification.ts`: shared merchant/properties verifier with distinct safe failures and opt-in diagnostics.
- `src/plugins/marketplace-commerce/in-person/clover/transport.ts`: exact properties endpoint allowlist and invalid-JSON status preservation.
- `src/plugins/marketplace-commerce/in-person/clover/contracts.ts`: temporary diagnostic option.
- `src/vendure-config.ts`: read the diagnostic flag into Clover plugin options.
- `test/in-person/clover-fixture.ts`: controlled properties endpoint and diagnostic option for the manual Sandbox runner. Existing payment fixture fields remain for the unchanged financial regressions; new connection cases explicitly omit root `currency`.
- `test/in-person/clover-merchant-verification.ts`: 25 controlled merchant contract/session cases and diagnostic redaction assertions.
- `test/in-person/clover.ts`: run those cases within the existing guarded disposable harness.
- `test/in-person/clover-sandbox.ts`: use the same corrected verifier in the optional nonfinancial real Sandbox qualification script; this script was not run against real credentials.

Web repository, `E:\coding\farmers-market-platform-web`:

- `docs/inPersonPayments/STAGE_D_MERCHANT_VERIFICATION_FIX.md`: this report and restart/retest instructions.

No migration, shared UI component, frontend workaround or database schema change was needed. Existing uncommitted work was preserved.

## Controlled tests and results

| Check                                         | Result                                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm run test:pos:clover`                     | 24 controlled integration groups passed, including 25 merchant-verification cases and the final replay assertions |
| `npm run test:pos:square`                     | 28 controlled groups passed; real Square API calls 0                                                              |
| Focused Clover, Square and POS frontend tests | 41 tests passed                                                                                                   |
| Backend test TypeScript                       | Passed                                                                                                            |
| Synthetic local frontend/backend builds       | Passed: storefront, admin, backend dashboard, server and worker                                                   |
| Changed-file formatting                       | Passed                                                                                                            |
| Windows PowerShell 5.1 command validation     | All 13 PowerShell blocks are single lines and parsed successfully under Windows PowerShell 5.1.26100.9711         |

The 25 merchant cases cover authorized US/USD, properties-only USD without any merchant currency field, safe case normalization, missing/null/numeric/object currency, non-USD despite a misleading USD field on the merchant, missing/different merchant ID, wrong/missing properties reference, null/array/wrapped responses, HTTP 401 and 403 on both reads, HTTP 500, HTTP 200 invalid JSON, and network failure. They execute the real `begin` / encrypted public-return receipt / original authenticated-session `finish` / connection storage path. Failed verifications cannot create connection rows or store credentials. Successful cases verify CONNECTED, the original merchant ID, USD storage and encrypted credentials. Replays are rejected.

The existing registered Nest/Express callback HTTP regression also passed, including 303/Location, state-only redirect, cache/no-referrer protections, original authenticated Admin API completion and wrong-session rejection. The full Clover suite continues its cash/simulator, payment, refund, stock, webhook and recovery regressions. These are controlled API fixtures, not real Sandbox or hardware qualification.

Browser demo automation was not started because it shares the manual demo manifest and ports with the running real Sandbox environment. Focused frontend tests and the registered HTTP integration regression verify the unchanged return handler without disturbing that instance. Connection success does not qualify physical Clover payment processing.

## Restart the existing Sandbox demo

All PowerShell command blocks below contain exactly one physical line and use Windows PowerShell 5.1 syntax. Run each block separately. Keep the existing app, merchant, tunnel, HTTPS callback registration, Caddy listener and original local dashboard origin. Do not create another app or merchant, and do not run migration, reset or reseed commands.

1. In the terminal currently running `demo:pos:clover-sandbox`, press Ctrl+C and wait for its normal shutdown. This stops only that supervisor's disposable environment. It normally removes its own disposable database and the next start creates a fresh disposable dataset. Neither protected database is targeted. Do not stop the existing Cloudflare tunnel or Caddy process. Use this original terminal afterward so its securely entered app credentials and encryption keyring remain in its process environment.

2. Set the directory and test-only runtime values in that terminal. These commands leave your existing app ID, secret, RAID, POS ID, encryption keyring and exact registered callback URL intact:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'
```

```powershell
$env:APP_ENV='test'; $env:NODE_ENV='test'; $env:FRONTEND_NO_EVIDENCE='true'; $env:DB_HOST='127.0.0.1'; $env:CLOVER_ENVIRONMENT='Sandbox'; $env:CLOVER_REGION='US'; $env:CLOVER_SANDBOX_OPT_IN='true'; $env:CLOVER_RETURN_URL='http://localhost:4590/vendor/settings/clover-return'; $env:CLOVER_MERCHANT_DIAGNOSTICS='true'; Remove-Item Env:CLOVER_FIXTURE_MODE -ErrorAction SilentlyContinue
```

3. Check that the existing configuration is present without printing its values:

```powershell
@('CLOVER_APPLICATION_ID','CLOVER_APPLICATION_SECRET','CLOVER_REMOTE_APP_ID','CLOVER_POS_ID','CLOVER_REDIRECT_URL','CLOVER_ACTIVE_KEY_ID','CLOVER_ENCRYPTION_KEYS') | ForEach-Object { if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_,'Process'))) { throw ('Missing existing configuration: '+$_) } }
```

If that fails, re-enter the same existing configuration using the secure-input instructions in [Stage D setup](STAGE_D_CLOVER_SETUP.md). Do not print the secret, keyring or an old OAuth code. A new app or merchant is unnecessary. The registered HTTPS callback must still end exactly `/in-person/clover/oauth/callback`, with no OAuth query parameters. If the existing quick tunnel has stopped and a replacement gets another hostname, update the existing app's callback and `CLOVER_REDIRECT_URL` to that exact new URL; this is a configuration update to the same app, not app recreation.

4. Start the corrected local Sandbox demo and wait for its ready message:

```powershell
npm run demo:pos:clover-sandbox
```

5. In a second PowerShell terminal, generate Caddy's configuration from the new demo manifest. The disposable backend port changes after restart, so the old upstream port must not be reused:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; npm run demo:pos:clover:proxy
```

6. Reload the existing Caddy process with the printed command. If `caddy` is on PATH:

```powershell
caddy reload --config 'E:\coding\farmers-market-platform-web\.pos-stage-d-demo\clover-oauth.Caddyfile' --adapter caddyfile
```

For this computer's previously verified WinGet executable, use this equivalent command if it is not on PATH:

```powershell
& "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\CaddyServer.Caddy_Microsoft.Winget.Source_8wekyb3d8bbwe\caddy.exe" reload --config 'E:\coding\farmers-market-platform-web\.pos-stage-d-demo\clover-oauth.Caddyfile' --adapter caddyfile
```

The generated site must retain `http://:8787` and `bind 127.0.0.1`, the exact GET callback matcher, and the 404 fallback. Do not reload the older temporary host-qualified Caddyfile from before the callback fix. Do not add a tunnel Host override or expose the Admin API through the callback proxy.

7. Optionally verify the tunnel-host route locally without any OAuth parameters. At the prompt, enter only the configured base HTTPS callback URL, without code or state. Expect HTTP 400. This command does not contact Cloudflare or Clover:

```powershell
$cloverCallbackHost=([uri](Read-Host 'Existing HTTPS callback URL without query parameters')).Host; curl.exe --silent --output NUL --write-out '%{http_code}' --header "Host: $cloverCallbackHost" 'http://127.0.0.1:8787/in-person/clover/oauth/callback'
```

## Repeat the existing merchant connection

1. Sign in using the new disposable demo's printed fictional vendor credentials and channel link, then open Settings, Payment Integrations. Begin Connect Clover from there. Do not reuse the failed callback URL, state or authorization code. Keep that original browser session and vendor/channel unchanged.
2. Authorize the same existing US Sandbox test merchant through the same application. The existing tunnel and Caddy proxy should return the browser through HTTP 303 to `http://localhost:4590/vendor/settings/clover-return`, carrying only opaque state. The dashboard clears that state from browser history and finishes using its authenticated session.
3. On success, expect the merchant-authorization success message. Return to Payment Integrations and verify CONNECTED and the intended merchant ID. This confirms the actual Sandbox merchant, not merely its assumed location. Do not make a charge for this test.
4. If verification fails, inspect only the `clover_merchant_verification` diagnostic line in the backend terminal. A missing currency, non-USD response, identity mismatch and 401/403 are now distinct. Do not copy full merchant responses, codes, tokens or secrets into chat or logs.
5. For HTTP 401/403, check Read Merchant on the existing app and its installation/authorization for the existing test merchant. If permissions were changed after installation, Clover documents uninstalling and reinstalling that same app for that same merchant before authorizing again. Do not broaden permissions or create another app to work around a schema or identity failure. For missing or non-USD `defaultCurrency`, verification remains blocked until the authoritative response is valid USD; no location-based override exists.
6. After successful real qualification, remove the temporary diagnostic flag from the original terminal before its next start. The already-running backend keeps its current options until restarted:

```powershell
Remove-Item Env:CLOVER_MERCHANT_DIAGNOSTICS -ErrorAction SilentlyContinue
```

Real Sandbox verification remains a manual follow-up, accurately separated from the passing controlled tests above.

## Reproduce the controlled checks

From the web directory, each command below is one line. They create only guarded disposable test databases and do not use the running manual demo's database:

```powershell
$env:APP_ENV='test'; $env:NODE_ENV='test'; $env:FRONTEND_NO_EVIDENCE='true'; $env:DB_HOST='127.0.0.1'; npm run test:pos:clover
```

```powershell
$env:APP_ENV='test'; $env:NODE_ENV='test'; $env:FRONTEND_NO_EVIDENCE='true'; $env:DB_HOST='127.0.0.1'; npm run test:pos:square
```

```powershell
$env:FRONTEND_NO_EVIDENCE='true'; node node_modules/vitest/vitest.mjs run tests/clover.test.tsx tests/square.test.tsx tests/pos-payments.test.tsx
```

```powershell
$env:FRONTEND_NO_EVIDENCE='true'; npm run build:production-local
```

The last command supplies ephemeral synthetic production build values, runs local builds in both repositories, and does not bootstrap a database, deploy, or call a payment provider. Existing chunk-size and PostgreSQL query-deprecation notices are not evidence of real provider qualification.
