# Stage E implementation summary

Stage E implements local mobile-payment infrastructure through the existing payment coordinator. It does not establish physical-reader compatibility or production readiness. Neither protected database was migrated, seeded or modified. No production payment API call, real charge, device purchase, deployment or Git mutation was performed.

## Implemented behavior

The browser keeps cart and quote preparation. It can prepare an expiring companion locator, explain missing native/provider setup and recover the original mobile payment after reload. Existing shared dialogs, receipts, refund views and Square settings are extended in place. Cash, simulator, Square Terminal and Clover REST Pay Display retain their separate methods and existing behavior.

The backend adds native session, installation and handoff bindings; immutable merchant/method/reference mappings; one-use launch claims; scope and location checks; independent provider retrieval; conservative unknown/cancellation handling; original-operation recovery; and existing RefundCoordinator integration. It accepts no client amount or success callback as settlement. A before-launch cancellation is definitive; after launch, capture may still win and inventory remains protected until evidence resolves it. Captured-but-unfinalized orders reuse their original payment for completion. In-person application fees remain zero, and both loyalty engines remain excluded.

The narrowly scoped companion uses React Native through local Expo prebuild. It shares TypeScript contracts and payment lifecycle code, stores sensitive session material in native secure storage, selects an existing vendor workspace and delegates card acceptance to native SDK code. It has no second cart or dashboard. The official Square plugin integrates authorization, native permissions, reader settings/events, online payment, cancellation, debug Sandbox Mock Reader UI and cleanup. iOS Tap to Pay capability querying is present; acceptance remains disabled.

Square consent requests `PAYMENTS_WRITE_IN_PERSON` only when native mobile support is enabled. Terminal-only installations retain their existing scopes. An insufficient native grant requires explicit reauthorization after pending operations are resolved.

## Evidence and remaining provider work

The Android x86_64 debug APK successfully compiled with Square Mobile Payments SDK 2.6.1 and the React Native plugin 2026.8.1. Local Metro export also passed. The compilation used an explicit noncredential build-only application ID. No native seller authorization or real Square Mock Reader Sandbox transaction was executed. Configure a real Sandbox seller/location and the in-person OAuth permission, regenerate with the actual public application ID, then run the documented SDK procedure.

Clover Go uses a distinct compiled Android availability module, Swift source boundary, controlled provider contract and request mapping. The published Android 1.5.1 distribution resolved independently through Gradle. It is excluded from the app runtime. Current iOS 1.5.0 and the external-token NoOAuth direction are documented. Real Go discovery, pairing, charging, cancellation and linked reversals remain blocked by developer-issued API credentials, the native credential-distribution decision and absent supported hardware. No fabricated reader serial or SDK transaction is presented as real.

iOS compilation requires macOS/Xcode and was not performed. Stage F retains real-device, firmware, Tap to Pay entitlement/eligibility, lost-device/operator recovery, provider certification, external webhook/payout behavior and production distribution qualification. Release build tasks are intentionally blocked in this development companion. Stage G is unchanged and out of scope.

## Local files changed

| Area                                   | Local paths                                                                                                                                                                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend transport and session boundary | `farmers-market-platform/src/plugins/marketplace-commerce/in-person/mobile/`                                                                                                                                                                  |
| Existing backend integration           | `in-person/payment-coordinator.ts`, `payment-adapter.ts`, `payment-scope.ts`, `square/contracts.ts`, `square/connection.service.ts`, `marketplace-commerce.plugin.ts`, plugin `types.ts`, `src/vendure-config.ts`                             |
| Data-preserving migration source       | `farmers-market-platform/src/migrations/1793200000000-NativeMobileInPerson.ts`                                                                                                                                                                |
| Controlled backend qualification/demo  | `farmers-market-platform/test/in-person/mobile*.ts`, existing `fixture.ts`, `demo.ts`, constructor test in `payments.ts`                                                                                                                      |
| Native application                     | `farmers-market-platform-web/mobile/companion/`, including pinned package/lockfile, local prebuild plugin, secure storage, SDK adapter, native availability modules and native renderer adapters                                              |
| Shared mobile domain                   | `farmers-market-platform-web/mobile/core/`, `packages/api/src/native-mobile.ts`                                                                                                                                                               |
| Browser/API integration                | `apps/admin/src/vendor/pos-payments.tsx`, `square.tsx`, API in-person exports/contracts, extracted schema/provenance and generated types                                                                                                      |
| Commands and checks                    | `scripts/stage-e.ts`, `mobile-browser.ts`, `mobile-control.ts`, `native-tokens.ts`, existing `in-person.ts`, `extract-schema.ts`, `package.json`, `.gitignore`, renderer-appropriate lint/format configuration, mobile and existing POS tests |
| Guidance and reports                   | `COMPONENT_USAGE_GUIDE.md`, these Stage E documents and the existing roadmap                                                                                                                                                                  |

Existing unrelated uncommitted work was preserved. Generated native build directories, native dependencies and the disposable demo manifest remain local ignored runtime material.

## Commands and manual review

From `E:\coding\farmers-market-platform-web`, use `npm run test:pos:mobile`, `npm run test:pos:mobile:unit`, `npm run test:pos:mobile:browser` and `npm run test:pos:mobile:regression`. `npm run demo:pos:mobile` starts the interactive controlled demonstration on its own ports and randomized database. The [deviceless guide](STAGE_E_DEVICELESS_TESTING.md) provides complete one-line PowerShell commands, controlled success/decline/interruption/recovery steps, SDK configuration and Android installation instructions. No protected-database migration is needed for these procedures.

The [testing report](STAGE_E_TESTING.md) is the source for final results and execution limits. Raw logs are retained only in `stageETestLogs/`.

Final qualification passed all eleven backend suites, 24 Stage E backend groups, 573 frontend tests, five additional controlled React Native screen tests, eight browser geometry/recovery groups, type checks, bounded lint/boundaries, both synthetic production builds, Android debug compilation and Metro export. SDK payment execution and hardware/production qualification remain separate unverified work.
