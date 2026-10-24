# Stage E native request timeout fix

Validated locally on October 19, 2026 (America/Chicago).

The companion login crashed because `NativePlatformClient.execute()` called `AbortSignal.timeout(20000)`. The installed React Native 0.83.10 implementation comes from `abort-controller`: it supports controllers, `signal.aborted` and abort events, but has no static `timeout` or `any`, abort reason, or `throwIfAborted`. TypeScript's browser types did not establish Android runtime support.

The fix uses supported abort events and timers without installing a global polyfill or adding dependencies. It is JavaScript-only and can load into the existing development APK through Metro. No Android rebuild, prebuild or APK installation was performed or is required for this fix.

## Implementation and changed files

| File                                            | Change                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/api/src/request-timeout.ts`           | Shared request scope using `AbortController`, `setTimeout`, `clearTimeout`, abort event forwarding and `finally` cleanup. A separate `TimeoutError` identifies deadlines without requiring `DOMException` or abort reasons.                                                                                                                                 |
| `mobile/companion/src/api.ts`                   | Applies that scope to fetch and JSON consumption with the original 20-second limit. Login, registration, actions and logout accept an optional caller signal. Authentication changes occur only after successful completion of the scope, so late responses cannot update the bearer. Timeout messages direct the operator to recover the original payment. |
| `packages/api/src/transport.ts`                 | Uses the same scope with the original 8-second limit and optional per-request cancellation. Keeps existing cookie, channel, GraphQL validation, safe error and diagnostic contracts. Deadline errors still normalize to `unavailable`; other transport failures normalize to `network`. Removes the runtime `DOMException` dependency.                      |
| `tests/request-timeout.test.ts`                 | Four web tests with `AbortSignal.timeout` explicitly undefined: success/failure cleanup, synchronous exceptions, caller reasons, pre-cancellation, stalled work, timeout classification, cookie and channel behavior.                                                                                                                                       |
| `mobile/companion/__tests__/transport.test.tsx` | Eleven native transport/controller tests using React Native's actual abort implementation, Expo's URL implementation and no global `DOMException`. Covers login, invalid credentials, deadlines, stalled body decoding, generic fetch abort errors, caller cancellation, late responses, cleanup, logout and payment recovery.                              |
| `mobile/companion/__tests__/session.test.tsx`   | Three native app tests using the real client, controller and storage wrapper. Only network, native SDK and secure-storage/crypto device boundaries are mocked. Covers successful login and workspace selection, secure session persistence and restoration, invalid credentials and late successful responses after timeout.                                |
| This report                                     | Records scope, audit, validation and reload instructions.                                                                                                                                                                                                                                                                                                   |

The request scope aborts its own controller when either deadline or caller cancellation wins. It never aborts the caller's controller. Where a caller signal supports a reason, that reason is preserved; older native signals receive an `AbortError` with a cancellation message. A pre-cancelled request does not invoke fetch. Timers and forwarding listeners are removed after success, failure, timeout or cancellation.

The scope races interruption against the complete fetch/body operation, so a transport or body reader that ignores abort cannot leave its caller hanging. Late work is observed by the race but cannot publish a result. Native bearer updates happen outside the work callback, after the race succeeds. No automatic retry was introduced. This also prevents an aborted or timed-out login from reaching workspace registration or session persistence.

No UI components, styles or interactions were changed, and no new presentation component was needed.

## API audit

The source search found eight original `AbortSignal.timeout()` call sites:

| Original location                               | Limit      | Execution scope and disposition                                                                                                                                       |
| ----------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mobile/companion/src/api.ts`                   | 20 seconds | Native runtime. Replaced.                                                                                                                                             |
| `packages/api/src/transport.ts`                 | 8 seconds  | Existing typed web API transport. Replaced with the same helper to exercise it in both runtimes. The native companion continues to use its separate bearer transport. |
| `packages/api/src/document-upload.ts`           | 60 seconds | Web file-upload API, not imported by the companion. Retained.                                                                                                         |
| `packages/api/src/inbox.ts`                     | 10 seconds | Customer browser BFF transport, not imported by the companion. Retained.                                                                                              |
| `packages/storefront-core/src/backend.ts`       | 8 seconds  | Node SSR storefront resolver, not imported by the companion. Retained.                                                                                                |
| `apps/storefront/src/lib/account.ts`            | 8 seconds  | Server account bridge, not imported by the companion. Retained.                                                                                                       |
| `apps/storefront/src/lib/account-form.ts`       | 15 seconds | DOM account forms, not imported by the companion. Retained.                                                                                                           |
| `apps/storefront/src/lib/phone-verification.ts` | 15 seconds | DOM phone-verification forms, not imported by the companion. Retained.                                                                                                |

There are no remaining calls to `AbortSignal.timeout()` or `AbortSignal.any()` in native runtime source or its imported request helper. Tests refer to the missing properties only to assert the restricted environment.

The runtime audit covered the companion entry point, login client, storage wrapper, payment controller, native provider adapters and shared native contracts. Expo's `Expo.fx` initializes its Winter runtime before root registration and supplies the WHATWG URL implementation used by endpoint validation. React Native provides fetch, basic abort events and timers. Installation UUIDs and cryptographic bytes already use `expo-crypto`; sessions and pending locators already use `expo-secure-store`. No Node imports, browser storage or DOM operations are introduced on the native path. Browser-only `crypto.randomUUID()` in the cookie transport is not imported into the companion; it is not a replacement for native installation identity.

## Authentication and payment safety

Platform login still uses the existing mutation with `rememberMe:false`, consumes the platform bearer header, filters channels by `OperateOwnPos` and omits cookies. Selected channel and installation proof remain bound to subsequent authenticated native requests. Session content and SecureStore options are unchanged, including device-only unlocked accessibility. Passwords are cleared from the form and are not persisted.

The payment tests execute the real `NativePlatformClient` and `CompanionController` against controlled responses modelling the existing server's one-use launch permission. They independently lose each of the launch, reconciliation and cancellation responses. They verify:

- A lost launch response invokes no native SDK payment, including after the late response arrives.
- A lost reconciliation or cancellation response leaves the original payment unresolved and does not invoke a second SDK payment.
- Late payloads claiming completion cannot finalize controller state after their request timed out.
- Repeated pay/recover calls and a restarted controller retain the original pending locator, merchant, provider reference and SDK attempt identity. Consumed launch permission remains unavailable.
- Every payment action carries only the original action, proof and handoff identity. Timeout handling adds no financial facts or client completion mutation.

Backend inspection confirmed that `mobile/service.ts` grants launch through an atomic `UPDATE` requiring `launch_claimed_at IS NULL`, an uncancelled operation, the bound native session and an `UNCERTAIN` attempt. It returns `canStart:false` once consumed. Reconciliation still enters the existing payment coordinator; callback or cancellation messages are not capture evidence. No backend defect requiring changes was found.

Aborting an HTTP request cannot undo processing that the server already performed. A lost one-use launch response therefore continues to require original-operation recovery and may leave an attempt protected even if the SDK never began. This existing Stage E restriction is preserved. No timeout infers a decline, cancellation, capture or completed transaction.

The authority boundaries, merchant authorization, Square/Clover SDK adapters, payment amounts and references, stock/financial finalization and unrelated POS methods were not changed. No protected database, migration, seed or backend test harness was run. Backend launch guarantees were inspected and modelled in focused client tests; this run does not claim a new live backend or real provider transaction qualification.

## Validation results

| Check                                                                                 | Result                                                                                                                                                                                |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test --prefix mobile/companion`                                              | Passed: 19 tests across three suites, including the existing five screen tests. New transport tests run with React Native's missing timeout/any/reason support and no `DOMException`. |
| `$env:FRONTEND_NO_EVIDENCE='true'; npm test`                                          | Passed: 577 tests across 46 files, including the existing native lifecycle and unrelated POS regression tests.                                                                        |
| `npm run typecheck --prefix mobile/companion`                                         | Passed.                                                                                                                                                                               |
| `npm run typecheck`                                                                   | Passed; Astro checked 95 files with zero errors, warnings or hints.                                                                                                                   |
| ESLint on all changed TypeScript/TSX files                                            | Passed.                                                                                                                                                                               |
| `node node_modules/tsx/dist/cli.mjs scripts/check-boundaries.ts`                      | Passed: nine workspace boundaries.                                                                                                                                                    |
| Prettier check on changed files                                                       | Passed.                                                                                                                                                                               |
| `npm run build` with `syntheticProductionEnvironment()` applied to that child process | Passed: storefront and admin builds. No backend build or connection. Non-fatal framework/chunk-size warnings were emitted.                                                            |
| Offline Android Metro export with Hermes bytecode                                     | Passed: 609 modules, one Android `.hbc` bundle. No native compilation or APK rebuild.                                                                                                 |

The first export attempt lacked the public Square application identifier and stopped at the existing configuration guard. For export validation only, the retry used `sandbox-stage-e-build-only`. Hermes then encountered sandbox temporary-directory write restrictions; setting `TEMP` and `TMP` to the project-local `.expo/timeout-temp` resolved that issue without escalation. The final export is under `mobile/companion/.expo/timeout-check`, with its log at `.expo/timeout-export.log`. The synthetic identifier was not applied to the installed APK or used for payment authorization.

The full web suite emitted React act warnings in document dashboard tests and a JSDOM navigation limitation; all tests passed. No emulator UI login, physical SecureStore/Keystore operation, real reader launch or genuine provider transaction was performed during this fix. Native tests mock device boundaries, and the Android export establishes bundle compatibility rather than runtime or hardware qualification.

## Reloading the existing emulator app

Keep the existing configured Metro development server and backend environment. Press `r` in Metro, or use Reload in the emulator's development menu, to load the updated JavaScript. A full reload is preferable to retaining the failed login's state through Fast Refresh. The existing Metro configuration already watches `packages/api/src`, so it includes the new helper.

If Metro is stopped, run `npm run start --prefix mobile/companion` from the web project with the same public Sandbox application ID and endpoint environment that was used for the running companion. Do not substitute the build-only export identifier for the actual configured SDK application ID. No prebuild, Gradle task, APK rebuild or reinstall is needed. If an environment server needs restarting, retain the documented `demo:market-operations:*` scripts and persistent-database safeguards.

No deployment, hosting access, Git command, remote operation, protected-data modification or unrelated POS change was performed.
