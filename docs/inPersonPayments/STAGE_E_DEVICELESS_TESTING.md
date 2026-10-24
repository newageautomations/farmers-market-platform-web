# Stage E testing without readers

All commands below are single-line Windows PowerShell 5.1 commands. They run locally. None migrates, resets or seeds `vendure` or `vendure_demo_market_ops`.

## Controlled qualification

Run mobile domain, lifecycle, UI and request-contract tests:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; $env:FRONTEND_NO_EVIDENCE='true'; npm run test:pos:mobile:unit
```

Run isolated React Native screen tests with mocked SDK/OS services and zero snapshots:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; npm run test:pos:mobile:native-ui
```

Run controlled Square mobile and Clover Go against actual disposable Vendure orders, inventory and original-unit refunds:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; npm run test:pos:mobile
```

Run the combined Stage A to E, commerce, refund, inventory, identity and loyalty regressions:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; npm run test:pos:mobile:regression
```

Run browser handoff, central login/account transition, reload/recovery, DOM geometry and accessibility checks at 1280, 768 and 390 pixels:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; npm run test:pos:mobile:browser
```

No screenshots, videos, visual snapshots or browser traces are generated. Results are text under `docs/inPersonPayments/stageETestLogs/`. Controlled adapter records are not real Square SDK or Clover Go transactions.

## Interactive controlled demonstration

Start the separate disposable Stage E demo:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; npm run demo:pos:mobile
```

The register is at `http://localhost:4592/vendor/pos`. The supervisor prints fictional disposable login details and its randomized database name. Use the first vendor, add merchandise, review checkout and continue to payment. Cash, simulated terminal and the existing Square fixture terminal retain their normal behavior. Choose Square mobile reader or Clover Go. The dialog clearly states that a companion app is required and that this account is a controlled fixture. Prepare a handoff and copy its nonsecret handoff reference. The deep link cannot install or pretend to detect a native app.

In a second PowerShell window, replace `HANDOFF_UUID` with that reference. The commands drive the controlled native adapter in the disposable backend process, without invoking a real SDK or reader. Session proofs remain in that process's memory.

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; npm run demo:pos:mobile:success HANDOFF_UUID
```

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; npm run demo:pos:mobile:decline HANDOFF_UUID
```

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; npm run demo:pos:mobile:cancel HANDOFF_UUID
```

For an interrupted native operation, prepare another fresh handoff and run:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; npm run demo:pos:mobile:interrupt HANDOFF_UUID
```

Reload the browser. Its original payment remains unresolved. Recovery does not create another SDK launch:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; npm run demo:pos:mobile:recover HANDOFF_UUID
```

Run the success command against that same reference to supply controlled provider evidence. Check the original payment status in the browser. The original order completes once. Orders exposes its existing receipt and original-unit partial refund flow. Repeat the same controlled command or reload to verify that no new sale or inventory movement is created. A decline/cancellation requires a fresh sale; an unresolved payment must be recovered before collecting again.

Stop only the owned Stage E environment with Enter/Ctrl+C in its supervisor or:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; npm run demo:pos:mobile:stop
```

## Real Square SDK Sandbox Mock Reader

This is a separate qualification layer. It was not executed as a Sandbox transaction. Configure the existing backend Square Sandbox settings and encryption keys securely, including explicit Sandbox opt-in, for a disposable native demo. Register the exact callback `http://localhost:4592/vendor/settings/payments` for this separate local demo. Enable the Mobile Payments SDK application configuration and grant PAYMENTS_WRITE_IN_PERSON through explicit consent. Do not use Production credentials or copy protected-database token envelopes into fixtures.

Configure the following in the backend demo shell. These commands use Windows PowerShell 5.1 secure prompts and do not print the secret. Use this temporary encryption key only for the new disposable demo, and keep that shell open while it runs. The Square application secret remains backend-only.

```powershell
$env:SQUARE_ENVIRONMENT='Sandbox'; $env:SQUARE_APPLICATION_ID=Read-Host 'Public Square Sandbox application ID'; $env:SQUARE_REDIRECT_URL='http://localhost:4592/vendor/settings/payments'
```

```powershell
$stageESecret=Read-Host 'Square Sandbox application secret' -AsSecureString; $stageESecretPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($stageESecret); try { $env:SQUARE_APPLICATION_SECRET=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($stageESecretPointer) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($stageESecretPointer); $stageESecret.Dispose(); Remove-Variable stageESecretPointer,stageESecret }
```

```powershell
$stageEKeyBytes=New-Object byte[] 32; $stageERandom=[Security.Cryptography.RandomNumberGenerator]::Create(); try { $stageERandom.GetBytes($stageEKeyBytes); $env:SQUARE_ACTIVE_KEY_ID='stage-e-disposable'; $env:SQUARE_ENCRYPTION_KEYS=@{ 'stage-e-disposable'=([BitConverter]::ToString($stageEKeyBytes).Replace('-','').ToLowerInvariant()) } | ConvertTo-Json -Compress } finally { $stageERandom.Dispose(); [Array]::Clear($stageEKeyBytes,0,$stageEKeyBytes.Length); Remove-Variable stageEKeyBytes,stageERandom }
```

Start the dedicated Sandbox demo in that shell, then sign in to its Square settings, use Connect/Reconnect Square for consent, and select the authorized seller location. The companion login uses the disposable platform vendor account. A Sandbox personal-token import is optional and still must pass the native scope checks.

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; $env:SQUARE_SANDBOX_OPT_IN='true'; npm run demo:pos:mobile-sandbox
```

Install the isolated native dependencies:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web\mobile\companion'; npm ci --ignore-scripts
```

In that shell set `SQUARE_MOBILE_APPLICATION_ID` to the public Sandbox application ID. It is not an access token.

```powershell
$env:SQUARE_MOBILE_APPLICATION_ID=Read-Host 'Public Square Sandbox application ID'
```

Set the emulator API endpoint using the nonsecret disposable manifest, and generate the local Android project:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web'; $stageEReady=Get-Content -LiteralPath '.pos-stage-e-demo\ready.json' -Raw | ConvertFrom-Json; $env:MOBILE_PLATFORM_ENDPOINT=$stageEReady.endpoint.Replace('127.0.0.1','10.0.2.2'); $env:MOBILE_DASHBOARD_ORIGIN='http://localhost:4592'; Set-Location -LiteralPath 'mobile\companion'; $env:NODE_ENV='development'; $env:EXPO_NO_TELEMETRY='1'; node node_modules/expo/bin/cli prebuild --no-install --platform android
```

Compile an x86_64 emulator debug build with the installed JDK 17 and Android SDK 36:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web\mobile\companion\android'; .\gradlew.bat :app:assembleDebug --console=plain --no-daemon -PreactNativeArchitectures=x86_64 --max-workers=2
```

Start an existing compatible Android emulator through Android Studio. Install the generated APK and connect its local Metro development server:

```powershell
Set-Location -LiteralPath 'E:\coding\farmers-market-platform-web\mobile\companion'; adb install -r 'android\app\build\outputs\apk\debug\app-debug.apk'; adb reverse tcp:8081 tcp:8081; adb reverse tcp:4592 tcp:4592; adb reverse tcp:4374 tcp:4374; $stageEManifest=Get-Content -LiteralPath '..\..\.pos-stage-e-demo\ready.json' -Raw | ConvertFrom-Json; $stageEApiPort=([uri]$stageEManifest.endpoint).Port; adb reverse "tcp:$stageEApiPort" "tcp:$stageEApiPort"; node node_modules/expo/bin/cli start --dev-client --localhost
```

The native process inherits the same public application ID and endpoint environment. Sign in with the disposable vendor's platform account, select its workspace and open a fresh web handoff. Authorize the merchant, grant requested device permissions, open Square Sandbox Mock Reader and connect its virtual reader in the provider UI. Start the exact backend amount and use the provider's mock-reader controls to complete or decline. The application reports success only after backend Payments API verification and Vendure completion. Repeat with cancellation, app backgrounding and process restart. Compare the same reference, one provider payment ID, one native payment/order and one inventory decrement. No physical reader is required for this provider-supported Sandbox layer.

An Android APK compiled with the clearly labelled `sandbox-stage-e-build-only` identifier is only build evidence. It cannot authorize a seller or establish a Sandbox transaction. Regenerate with the actual public application ID before SDK execution. iOS source/build configuration is present, but Xcode, CocoaPods, signing and native runtime qualification require macOS. No iOS build or execution is claimed from Windows.
