# Clover developer setup

Stage D currently permits US Sandbox only. Controlled tests need no Clover account. Real Sandbox requires your own developer account, confidential application, test merchant and exact HTTPS callback. No public endpoint, tunnel, hosting project, Production app or real charge was created. Do not send credentials in chat.

## Start with the controlled demo

Use a new Windows PowerShell terminal. Each block is one paste-ready command, compatible with Windows PowerShell 5.1.

```powershell
Set-Location E:\coding\farmers-market-platform-web
```

```powershell
$env:APP_ENV='test'; $env:NODE_ENV='test'; $env:FRONTEND_NO_EVIDENCE='true'; $env:DB_HOST='127.0.0.1'; npm run demo:pos:clover-fixtures
```

Expected: a fresh guarded `vendure_test_pos_demo_<timestamp>_<random>` database, account storefront on port 4372 and vendor dashboard on 4590. The process stays running. It seeds existing real commerce fixtures and includes separate controlled Square and Clover adapters, cash and the Stage B simulator. It does not alter an already running Square demo on 4370/4588 or the protected persistent database.

Open `http://auth.platform.localhost:4372/account/login`. Use fictional vendor `identity-owner-0@test.invalid` and the password printed by the supervisor. The ignored `.pos-stage-d-demo/ready.json` is authoritative for the current API endpoints and fixture identities. Open `http://localhost:4590/vendor?channel=2&account=1` after login; use the actual first vendor channel from the manifest if it differs.

Choose Settings, Payment Integrations, Connect Clover controlled test, then Add Clover device. The controlled serial is prefilled as `CONTROLLED_FLEX_2`; enter a friendly label, register it and choose Use as default. Follow [the manual walkthrough](STAGE_D_TESTING.md).

Stop only this disposable demo from another terminal:

To inspect completed Clover sales first, run this read-only native payment/unit/inventory audit in the web directory:

```powershell
npm run demo:pos:clover:verify
```

Expected: original paid totals, quantities and native payment counts for Clover sales in the current Stage D manifest, followed by PASS. No database or provider changes are made. An empty list means no Clover sale has been submitted yet.

```powershell
Set-Location E:\coding\farmers-market-platform-web
```

```powershell
npm run demo:pos:clover:stop
```

Expected: the owning supervisor gracefully stops its children and removes only the database it created. A failed qualification database is retained by its creating harness. Never substitute the persistent demo's migrate/reset/seed commands.

## Create the Clover application

Consult Clover's [account/development checklist](https://docs.clover.com/dev/docs/rest-pay-development-basics) and [semi-integrated application guide](https://docs.clover.com/dev/docs/creating-a-sandbox-app). Dashboard navigation may change; the linked official guides are authoritative.

1. Create a global developer account and sign in to the Global Developer Dashboard linked from the checklist.
2. Enable the Sandbox toggle. Confirm the environment before every app/merchant operation.
3. Choose Create new app. Supply name and United States country, Payment app type and Web platform. Confirm that it integrates an existing external POS.
4. Open My Apps, your app, App Settings. Record the Clover App ID. Open App Type and record its Remote App ID, also called RAID. These are different identifiers.
5. Under Requested Permissions, enable Read Merchant. This implementation also needs Read Payments for independent v3 payment/refund verification and payment webhooks. Do not enable customer, inventory, catalog or ecommerce permissions for this stage's card-present flow.
6. Select or create a US test merchant through the developer dashboard merchant selector. Its Merchant Dashboard is separate from App Settings. Record its merchant ID and verify USD configuration.
7. In App Settings, REST Configuration, set an HTTPS Site URL covering the callback path and an Alternate Launch Path for app launch. Select Code as the default OAuth response. Use the exact callback below as the authorized redirect. No browser-to-Clover CORS configuration is needed because merchant API calls are server-side.
8. Obtain the app client secret from its server-side credentials/settings. Keep it local and private.
9. In the test merchant's app tools, connect/install your application. If permissions change later, Clover may require uninstall/reinstall before they take effect.

## Exact HTTPS callback and local session return

You must supply a registered HTTPS URL whose path ends `/in-person/clover/oauth/callback` and which routes to the disposable backend's current port. The backend API address is in `.pos-stage-d-demo/ready.json`. Clover's documented HTTPS requirement does not inherit Square's working localhost HTTP redirect exception.

A developer-operated secure tunnel or equivalent HTTPS development reverse proxy is an external prerequisite. Its setup and network exposure are a separately authorized task. No tunnel provider was installed, contacted or selected here. Do not put a placeholder public URL into Clover settings. Configure the actual URL only after you have one.

The callback controller encrypts the short-lived code, responds with no-store/no-referrer headers and redirects to `CLOVER_RETURN_URL`. Set that return URL to your original local dashboard, `http://localhost:4590/vendor/settings/clover-return`. It contains only state. The same authenticated vendor session that began authorization completes the exchange. This keeps the dashboard, account bridge and cookies on their original origin. Do not sign out, switch vendor/channel or change browser sessions during authorization.

For the existing local Caddy proxy, run `npm run demo:pos:clover:proxy` after the disposable Sandbox demo is ready. It generates `.pos-stage-d-demo/clover-oauth.Caddyfile` using the current manifest's backend port and prints the Caddy reload command. Run that command against the existing local Caddy process. Repeat after each demo restart because the backend port changes. The generated listener uses `http://:8787` with `bind 127.0.0.1`, so the tunnel's forwarded Host reaches the callback. A site address of `http://127.0.0.1:8787` introduces a host matcher that can return an empty HTTP 200 for the tunnel hostname. Keep the exact GET callback matcher and 404 fallback. See [the callback fix report](STAGE_D_OAUTH_CALLBACK_FIX.md).

App launches without an existing platform-owned state do not link merchants. Start Connect Clover from our Payment Integrations page. An app launched through Clover must first return to that authenticated settings workflow. Failed, expired or replayed callbacks require a fresh Connect action.

## Configure real Sandbox locally

Stop the controlled demo first so port 4590 is free. Use a new PowerShell terminal and retain the existing backend's local PostgreSQL configuration. These commands set process environment variables only, never credential values in files or command history. Prompted secret input is not echoed.

```powershell
Set-Location E:\coding\farmers-market-platform-web
```

```powershell
$env:APP_ENV='test'; $env:NODE_ENV='test'; $env:FRONTEND_NO_EVIDENCE='true'; $env:DB_HOST='127.0.0.1'; $env:CLOVER_ENVIRONMENT='Sandbox'; $env:CLOVER_REGION='US'; $env:CLOVER_SANDBOX_OPT_IN='true'; Remove-Item Env:CLOVER_FIXTURE_MODE -ErrorAction SilentlyContinue
```

Expected: no output.

```powershell
$env:CLOVER_APPLICATION_ID=Read-Host 'Clover Sandbox App ID'
```

```powershell
$cloverSecretInput=Read-Host 'Clover Sandbox client secret' -AsSecureString; $cloverSecretPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($cloverSecretInput); try { $env:CLOVER_APPLICATION_SECRET=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($cloverSecretPointer) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($cloverSecretPointer); $cloverSecretInput.Dispose(); Remove-Variable cloverSecretInput,cloverSecretPointer }
```

```powershell
$env:CLOVER_REMOTE_APP_ID=Read-Host 'Remote App ID (RAID), distinct from App ID'
```

```powershell
$env:CLOVER_POS_ID=Read-Host 'Stable nonsecret POS/register identity'
```

```powershell
$env:CLOVER_REDIRECT_URL=Read-Host 'Exact registered HTTPS backend callback URL'
```

```powershell
$env:CLOVER_RETURN_URL='http://localhost:4590/vendor/settings/clover-return'; $env:CLOVER_ACTIVE_KEY_ID='local'
```

```powershell
$cloverKeyBytes=New-Object byte[] 32; $cloverRng=[Security.Cryptography.RandomNumberGenerator]::Create(); try { $cloverRng.GetBytes($cloverKeyBytes); $env:CLOVER_ENCRYPTION_KEYS=@{local=([BitConverter]::ToString($cloverKeyBytes).Replace('-','').ToLowerInvariant())} | ConvertTo-Json -Compress } finally { $cloverRng.Dispose(); [Array]::Clear($cloverKeyBytes,0,$cloverKeyBytes.Length); Remove-Variable cloverKeyBytes,cloverRng }
```

Expected: no output. This keyring remains in the current process environment and is inherited only by the backend child. The supervisor strips all Clover/Square environment variables before starting frontend children. Keep the same keyring for the lifetime of this disposable environment. Production secret storage and rotation are outside this task.

```powershell
npm run demo:pos:clover-sandbox
```

Expected: a separate fresh disposable database and the same Clover demo ports. Register the current backend callback endpoint through your already configured HTTPS route. Sign in through the local account page, open Payment Integrations and select Connect Clover. Authorize the US test merchant, then return to the local dashboard. Confirm its merchant ID/status. Browser code never receives merchant access or refresh tokens.

Without hardware, merchant authorization, token exchange/rotation and available merchant/device metadata can be qualified. Do not submit a card payment to satisfy a software test. If no device exists, leave the device list empty. There is no Square-style virtual Clover device in real Sandbox mode.

## Nonfinancial actual Sandbox script

`npm run test:pos:clover-sandbox` is separate from controlled tests. With missing opt-in or credentials it prints SKIP and makes zero API calls. It does not invent provider success.

To run its optional real exchange check, obtain a fresh authorization code for the same app and test merchant through an independently initiated, valid Clover OAuth flow. Do not reuse a code already consumed by our dashboard. Use secure input:

```powershell
$env:CLOVER_SANDBOX_MERCHANT_ID=Read-Host 'Clover US Sandbox test merchant ID'
```

```powershell
$cloverCodeInput=Read-Host 'Fresh unconsumed Clover OAuth authorization code' -AsSecureString; $cloverCodePointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($cloverCodeInput); try { $env:CLOVER_SANDBOX_AUTHORIZATION_CODE=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($cloverCodePointer) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($cloverCodePointer); $cloverCodeInput.Dispose(); Remove-Variable cloverCodeInput,cloverCodePointer }
```

```powershell
npm run test:pos:clover-sandbox
```

The script exchanges that code, validates the merchant and device-list response, rotates the refresh token once and checks the rotated access token. It never calls a payment/refund/device action endpoint and never logs or persists tokens. A code is single-use; obtain a new one after an exchange attempt. Remove it from the parent environment afterwards:

```powershell
Remove-Item Env:CLOVER_SANDBOX_AUTHORIZATION_CODE -ErrorAction SilentlyContinue
```

## Hardware and optional webhooks

A supported merchant/device/region combination and Cloud Pay Display are required for real card-present work. Clover's [cloud installation steps](https://docs.clover.com/dev/docs/configuring-a-cloud-connection) describe More Tools, Apps by Clover, searching Cloud Pay Display, Connect, then launching the app and choosing Start on the device. Get its actual serial from Setup/Devices or the merchant dashboard, register it in our settings and choose a default. Phone Bluetooth pairing and Clover Go are not Stage D.

The optional `/in-person/clover/Sandbox` receiver expects the documented app-specific `X-Clover-Auth` value, supplied as `CLOVER_WEBHOOK_AUTH`. General REST webhook subscriptions use Read Payments and Read Merchant, with P payment and A app notifications. Live HTTPS registration/verification and delivery remain unqualified. The unauthenticated verification-code handshake is intentionally not exposed or logged by this implementation. Coordinate that bootstrap as a separate developer setup task; recovery polling does not depend on webhooks.

Actual card authorization, settlement, refunds, receipts, device generation/firmware behavior, interrupted connections, multi-register behavior and merchant payouts all require the qualification in [the hardware matrix](STAGE_D_HARDWARE_QUALIFICATION.md). App approval/certification may require Clover's prescribed demonstrations; do not create screenshots or videos without separate authorization.
