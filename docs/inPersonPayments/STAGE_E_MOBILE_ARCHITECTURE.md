# Stage E mobile architecture

## Scope and selected architecture

The browser register remains the normal checkout experience. `mobile/companion` is an isolated React Native application built through local Expo prebuild and development builds. It does not use Expo Go or a cloud build service. Isolation keeps its React 19.2 / React Native 0.83.10 dependencies out of the browser workspaces. Expo 55.0.31 supplies native secure storage, app lifecycle and local native project generation. The official `mobile-payments-sdk-react-native` 2026.8.1 plugin supplies Square's native Android 2.6.1 and iOS 2.6.x integration. Package versions and the native lockfile are pinned.

This is a payment companion, with platform login, workspace selection, handoff, merchant authorization, reader setup, payment and recovery. It has no catalog editor, second cart, inventory writer or financial ledger. `packages/api/src/native-mobile.ts` supplies renderer-neutral contracts and status/link parsing. `mobile/core` supplies testable lifecycle and SDK request mappings. Metro resolves React from the isolated native package.

## Authority and identity

The existing native platform login returns an authenticated Vendure bearer session and its permitted channels. The companion stores that bearer, an installation secret, its selected channel and native session proof in Expo SecureStore. iOS uses device-only unlocked Keychain accessibility. Android uses Keystore-backed storage and a generated backup policy excluding application data from cloud backup and device transfer. Sensitive material never enters a URL, browser storage, a WebView or test logs.

`ownPosNativeAction` requires the existing POS permission, a bearer request without browser Origin/cookies, and a native session proof for every operation after registration. This is a native transport boundary, not device attestation. A hostile native client that already holds valid platform credentials is not turned into a trusted hardware device. Stage F must qualify device integrity, distribution and attestation requirements. Cookie-based dashboard authentication and central account handoffs retain their existing contracts.

The backend hashes installation, installation secret and authenticated platform session identities. It binds the native session to the actor, vendor and channel. The native session expires after twelve hours. Expired native grants may recover existing payments while the original platform bearer remains valid; they cannot launch another SDK operation. Logout revokes the native grant and deauthorizes native SDK state. Workspace switching performs native cleanup and fresh registration. Unresolved operations block changing the original merchant authorization or registering another workspace for that installation.

## Handoff and preparation

The web register submits only draft, version, quote identity and the selected native method. `createOwnPosNativeHandoff` checks the existing cashier-owned draft and current quote, validates the merchant and creates a two-minute locator. Its `market-pos://checkout/<uuid>` URL carries no credential, amount or financial authorization. The companion must authenticate as the same actor in the same vendor workspace and prove its installation before claiming it.

One installation consumes the handoff through a locked database row. Its UUID becomes the stable platform payment request key. The existing InPersonPaymentCoordinator validates the quote again and creates its normal capacity hold and provider intent before the companion can request launch permission. The amount, currency, order, quote, actor and merchant are server owned. `SQUARE_MOBILE` / `pos-square-mobile` and `CLOVER_GO` / `pos-clover-go` are distinct from every existing terminal and app-switch method.

`1793200000000-NativeMobileInPerson.ts` creates native session, handoff and operation tables. Database triggers protect immutable session, merchant, transport, reference and installation bindings. A unique capture identity prevents attaching one provider payment to two native attempts. Foreign-key and recovery-path indexes support bounded lookups. No protected database is migrated by Stage E commands.

## Launch and recovery

Merchant authorization credentials are issued only by the native action after proof verification. Square scope checks require MERCHANT_PROFILE_READ, PAYMENTS_READ, PAYMENTS_WRITE and PAYMENTS_WRITE_IN_PERSON, with application, merchant and active USD location checks. Existing insufficient grants require the existing explicit Reconnect Square consent flow, which now requests the in-person scope. The normal web settings expose only a setup explanation.

Before starting the SDK, the companion persists the handoff locator in secure storage. A database compare-and-set grants launch once. Both native `paymentAttemptId` and provider `referenceId` are generated and frozen separately. The installed official plugin maps `paymentAttemptId` into the native SDK payment-attempt field; its legacy `idempotencyKey` field is not used as a substitute. Restart, reload, backgrounding, lost responses and duplicate taps cannot obtain a second launch for the original attempt.

An SDK completion or error triggers backend retrieval only. Callback amounts, success flags and payment IDs are not accepted. Square verification uses the original merchant token, confirms the merchant through the Merchants API and retrieves Payments API records for the frozen location/reference. A missing callback can recover by a bounded scan of up to 500 records beginning just before preparation. Missing, older or ambiguous evidence stays unresolved. No absence-based decline is inferred. Final verification checks application, location, reference, provider payment identity, integer amount, currency, completed total, card-present entry, online status and zero tip/application fee/surcharge. Completed evidence enters ProviderFactsService; the existing coordinator performs native payment, inventory, original financial units and receipt completion.

Cancellation before a launch was issued is atomically definitive and releases the hold through the common coordinator. Cancellation after launch is a request for recovery, never proof of non-capture. Missing or contradictory provider evidence retains the original hold. A stale empty provider retrieval cannot overwrite a concurrent verified success. Verified capture followed by failed native finalization remains PAID for original-operation completion.

There is deliberately no automatic reissue after a lost one-use launch response. Such an attempt remains protected and may require reviewed resolution if the SDK never began. Expired platform bearer sessions, lost device secrets and revoked actors can require recovery from the original authorized web checkout. These operator/device recovery cases remain qualification work.

## Native providers and presentation

Square authorization, location verification, permissions, reader status/events, settings-based pairing, cancellation, cleanup and online-only payment invocation use the official plugin. Additional payment methods are empty; partial authorization, surcharges, tips and application fees are disabled. Tap to Pay acceptance remains disabled; iOS capability querying is exposed by the adapter. The debug Sandbox Mock Reader UI is explicitly labelled and guarded. Release tasks fail pending Stage F, so this development package cannot accidentally become a qualified production application.

Clover Go has a distinct native availability module in Kotlin and Swift, plus a testable request/lifecycle boundary. It fails closed because required developer credentials and a distributable native authorization model are not configured. It does not reuse a REST Pay Display serial or RAID. Its controlled adapter is an in-process provider fixture restricted to randomized local POS databases. Fixture outcomes update simulated provider records; they still pass independent retrieval and the original coordinator. The actual Clover SDK is not claimed to be linked or executed.

The web composition reuses existing Dialog, Button, SelectField, Alert, receipt and dashboard components. Native components cannot render DOM components, so their small renderer adapters use generated approved color tokens and the existing semantic and touch contracts. No competing web component standard or dashboard is introduced.

## Refunds and excluded work

All refunds still enter RefundCoordinator with original unit IDs, ownership and reservation checks. Square mobile uses linked Payments/Refunds API identities. Controlled Clover Go reversals preserve the original payment reference and exact reserved amount. Delivered inventory is not automatically restocked. Neither loyalty engine receives in-person earning or challenge progress. Stage G remains excluded.

Provider references and qualification limits are recorded in [the gap register](STAGE_E_PROVIDER_GAPS.md). Actual execution evidence is recorded once in [testing](STAGE_E_TESTING.md).
