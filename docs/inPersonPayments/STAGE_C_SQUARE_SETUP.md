# Stage C Square setup and manual walkthrough

The credential-free demo works now. Real Square Sandbox requires your own developer application and Sandbox token or OAuth authorization. No physical terminal is required for Terminal API virtual-device testing. No Production API calls are authorized by this development task.

## Local prerequisites and fixture demonstration

Use local PostgreSQL and the backend's existing loopback test connection settings. From PowerShell:

```powershell
Set-Location E:\coding\farmers-market-platform-web
$env:APP_ENV = 'test'
$env:NODE_ENV = 'test'
$env:FRONTEND_FIXTURE_MODE = 'false'
$env:FRONTEND_NO_EVIDENCE = 'true'
npm run demo:pos:square-fixtures
```

The owning process creates only a fresh vendure_test_pos_demo_<timestamp>_<random> database, runs migrations and seeds real Vendure commerce fixtures. It starts its API and a 30-second recovery sweep, account storefront and vendor dashboard. Keep that terminal running. Existing Stage B ports 4368/4586 and protected databases are untouched. No separate worker is needed for this disposable demo.

| Destination                          | URL                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Central login                        | [Sign in](http://auth.platform.localhost:4370/account/login)           |
| First vendor workspace after sign-in | [Hill Country Honey](http://localhost:4588/vendor?channel=2&account=1) |
| Payment Integrations                 | [Square settings](http://localhost:4588/vendor/settings/payments)      |
| Register                             | [In-Person Checkout](http://localhost:4588/vendor/pos)                 |
| Orders                               | [Vendor Orders](http://localhost:4588/vendor/orders)                   |
| Fictional vendor storefront          | [Honey storefront](http://pos-honey.localhost:4370)                    |

| Vendor account                             | Email                         | Password                                |
| ------------------------------------------ | ----------------------------- | --------------------------------------- |
| Hill Country Honey owner                   | identity-owner-0@test.invalid | local-identity-regression-only-password |
| Green Acres Farm / Wildflower Bakery owner | identity-owner-1@test.invalid | local-identity-regression-only-password |

The second account owns two vendors; use the existing account selector. Actual channel IDs and dynamic API endpoints appear in startup output and the ignored .pos-stage-c-demo/ready.json. That file contains local application runtime metadata, never Square tokens. A fixture-only connection is seeded for the first vendor; it is not a Square-authorized account. Other vendors remain isolated. No real customer email is sent.

Existing customers: email@pos.test.invalid, phone lookup +12105550142, or both@pos.test.invalid / +12105550143. For a guest invitation use a fresh .invalid email. Products include Honey variants, Beeswax Candle, unavailable Seasonal Honey, Vegetable Box and Sourdough. Independent and approved Cedar Meadow market contexts are retained.

Stop with Enter/Ctrl+C in the owning terminal, or from a second web terminal:

```powershell
npm run demo:pos:square:stop
```

The owner stops only its child processes and drops only its own fresh database. Restart the same command for fresh data. Do not reset, reseed, migrate or drop vendure or vendure_demo_market_ops. A failed diagnostic database can be retained by the existing harness; no blanket cleanup command is supplied. Occupied ports cause refusal, not termination of someone else's session.

## What you must configure in Square Developer Console

1. Sign into the [Square Developer Console](https://developer.squareup.com/apps), create/select your own application and choose Sandbox. This work has not created or modified an external application.
2. Obtain the Sandbox application ID and Sandbox access token. Keep the token on the backend process only. Use a Sandbox test seller with an active USD location that supports CREDIT_CARD_PROCESSING. The disposable demo allows one merchant to belong to only one vendor, so use separate test sellers when testing multiple vendor ownership contexts.
3. For OAuth qualification, obtain that environment's application secret and register the exact redirect used below: http://localhost:4588/vendor/settings/payments. Square may require an approved HTTPS callback for a particular console/application policy; supply an exact secure URL and matching local routing if needed. A changed hostname/path/port is a different redirect. Keep the initiating browser session/vendor active. Application secret is unnecessary for the guarded personal Sandbox token import path.
4. For actual webhook delivery, separately provide an authorized externally reachable HTTPS endpoint forwarding the backend path /in-person/square/Sandbox. The dynamic backend API origin is in the local runtime manifest. Register its exact public notification URL in the application's Sandbox webhook subscription and copy the subscription signature key to the backend. No tunnel, hosting project, deployment or external service has been created here. Polling works without external webhook delivery.
5. Subscribe to terminal.checkout.created, terminal.checkout.updated, payment.created, payment.updated, refund.created, refund.updated, device.code.paired and oauth.authorization.revoked where offered. Real device-code pairing is Production-only and remains physically unqualified; do not try to pair a terminal in Sandbox. Use API version 2026-09-16 for this pinned integration.
6. Keep Production credentials and enablement unset. Mobile POS app registration/HTTPS callback, installed app and reader belong to a separately authorized physical pilot. Do not enable them for the hardware-free Sandbox demo.

The backend requests only MERCHANT_PROFILE_READ, PAYMENTS_READ, PAYMENTS_WRITE, ORDERS_READ, ORDERS_WRITE and DEVICE_CREDENTIAL_MANAGEMENT for OAuth. No customer, catalog or inventory access is needed. OAuth token status and merchant identity are verified before encrypted persistence.

## Start the real Sandbox demonstration

Stop the fixture demo first. In the PowerShell terminal that will own the backend/demo process, set the test environment above, then:

```powershell
Remove-Item Env:SQUARE_FIXTURE_MODE -ErrorAction SilentlyContinue
$env:SQUARE_ENVIRONMENT = 'Sandbox'
$env:SQUARE_SANDBOX_OPT_IN = 'true'
$env:SQUARE_APPLICATION_ID = Read-Host 'Sandbox application ID'
$env:SQUARE_SANDBOX_ACCESS_TOKEN = Read-Host -MaskInput 'Sandbox access token'
$env:SQUARE_ACTIVE_KEY_ID = 'sandbox-local-v1'
$squareLocalKey = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:SQUARE_ENCRYPTION_KEYS = @{ 'sandbox-local-v1' = $squareLocalKey } | ConvertTo-Json -Compress
Remove-Variable squareLocalKey
$env:SQUARE_REDIRECT_URL = 'http://localhost:4588/vendor/settings/payments'
npm run demo:pos
```

Read-Host -MaskInput requires PowerShell 7. Use your approved secret-injection mechanism if unavailable. Do not paste secrets into source, shell command history, documentation or browser forms. The demo wrapper removes all SQUARE_* variables from frontend child processes. Preserve the encryption key for the lifetime of any database whose credentials it encrypts; a new disposable database may use a new key. For retained environments use a backend secret store/environment keyring and retain older decrypt keys during rotation.

For OAuth instead of personal-token import, additionally set SQUARE_APPLICATION_SECRET through a masked backend-only prompt. For webhooks, set SQUARE_WEBHOOK_URL and SQUARE_WEBHOOK_SIGNATURE_KEY through the same secure configuration process. No sample signature key or fake usable token is supplied. Select the same Sandbox application for all values.

The vendor opens Payment Integrations and chooses **Connect configured Sandbox test account** to verify/import the backend token, or **Connect Square** for actual OAuth when configured. No token is entered into the dashboard. Select an eligible location and save it. Add a labelled Sandbox virtual terminal and make it default. Without credentials the settings correctly report the missing configuration; they cannot manufacture a successful Square authorization.

Disconnecting an imported personal Sandbox token removes encrypted local access only. Revoke/rotate that personal token yourself in Square Developer Console. OAuth disconnect revokes the app grant. Unresolved payments/refunds block connection mutation, so reconcile those first. A different merchant requires a reviewed ownership migration rather than reusing historical records.

After stopping a credential-bearing demo, remove sensitive process environment values or close that terminal:

```powershell
Remove-Item Env:SQUARE_SANDBOX_ACCESS_TOKEN, Env:SQUARE_APPLICATION_SECRET, Env:SQUARE_WEBHOOK_SIGNATURE_KEY, Env:SQUARE_ENCRYPTION_KEYS -ErrorAction SilentlyContinue
```

## Make and refund a Sandbox sale without hardware

1. Sign in as the Honey owner, open Settings, then Payment Integrations. Verify the label is Sandbox and qualification is real Square API, rather than controlled SDK fixture. Import/authorize your test seller and select its eligible USD location.
2. Add **Sandbox card success (up to $25)** as a virtual terminal, give it a label and make it default. The provider ID is 9fa747a2-25ff-48ee-b078-04381f7c828f. This never represents physical pairing.
3. Open In-Person Checkout, add one Beeswax Candle, optionally associate an existing customer or continue anonymously, and choose Independent Sale or the approved market occurrence. Review the native subtotal/tax/total. Keep the complete total at $25 or less, including tax.
4. Continue to Payment, choose Square Terminal - Sandbox and the virtual terminal. Send to Square Terminal once. Await the original result. Use Check Payment Status when pending; the server retrieves the original checkout and Payment. No callback or manual success button can complete it.
5. Confirm Sale completed, the same native order in Orders, retained Square payment/location IDs, and one inventory decrement. The Square Developer Console Sandbox transaction view can independently confirm the external test payment. No real money or payout occurs in Sandbox.
6. Open that order, choose Record refund, select original units and enter a reason. Request Square refund once. A pending refund is not settled; check the original refund until the server retrieves COMPLETED. Confirm original units/amount and no automatic stock increase. Use a multi-unit sale below $25 to test multiple partial refunds.
7. Repeat using buyer cancellation (841100b9-ee60-4537-9bcf-e30b2ba5e215), immediate timeout (0a956d49-619a-4530-8e5e-8eac603ffc5e) or offline/unavailable (da40d603-c2ea-4a65-8cfd-f42e36dab0c7). These are the intentionally restricted device allowlist. Other gift-card, tipping and unsupported virtual behaviors are not enabled. Not every timeout proves absence of payment; retain and reconcile the original attempt.
8. Reload during an unresolved payment, check its original status, and confirm there is no second checkout. Cancel through Request terminal cancellation where available; capacity is released only after independently verified cancellation without a payment. A terminal can remain busy until the original outcome is known.

The fixture demo exercises the same local workflow with explicit fixture labels and zero Square API access. It does not qualify actual Square arithmetic, delivery, OAuth or hardware. Real Sandbox device scenarios must be checked against current [official Sandbox values](https://developer.squareup.com/docs/devtools/sandbox/testing) before extending the allowlist.

For automated real Sandbox qualification, with the same explicit environment/credentials:

```powershell
npm run test:pos:square-sandbox
```

This creates its own guarded disposable database, verifies an actual virtual Terminal sale and full original-unit refund, and never selects Production. Missing prerequisites produce a clear skip before database/API access. Full/partial provider behavior and physical readiness still require the separate qualification checklist.
