# Stage D implementation summary

Local Clover support has been added across the backend and web repositories using REST Pay Display over Clover Cloud. Native commerce remains owned by Vendure and the existing Stage B coordinator. The supported rollout is a guarded US Sandbox/disposable environment with a separately labelled controlled adapter. Genuine Clover Sandbox and physical-device qualification remain incomplete.

## Implemented behavior

Clover confidential OAuth v2 includes random session/vendor/channel/app/environment-bound one-time state, server-side code exchange, independently verified merchant/USD identity, encrypted access/refresh tokens, provider expiration timestamps, atomic refresh leases, rotation and interrupted-refresh recovery. Stage C's existing AES-GCM envelope implementation is reused with independent Clover keys and associated data. The exact HTTPS backend callback can return state to the original local dashboard after temporarily encrypting the code; the original authenticated session must consume it. Owner-only integration management remains `ManageOwnPosIntegrations`. Merchant reassignment across unrelated vendors is prevented, and same-merchant reconnection can recover an unresolved operation after revocation.

Device registration verifies actual merchant-provisioned serials and eligible Flex/Mini/Compact families. Friendly labels, defaults, soft removal and timestamped connectivity checks are supported. Registration does not imply online status. Unsupported families and first-generation Flex/Mini serial prefixes are rejected conservatively. Active operation reservations prevent conflicting registers or removal of an unresolved terminal. No Bluetooth pairing, Square-style pairing code or browser-held merchant token is introduced.

Payments use durable original operation keys/references, exact USD totals, closed card-present sales, zero tips, no cashback and disabled offline payment. The coordinator commits authoritative quote/capacity/payment preparation before Clover requests. The adapter independently retrieves original external ID/payment ID/merchant payment evidence before ProviderFactsService permits native finalization. Original native Payment, order, capacity conversion, financial units and handoff remain unchanged. Mismatches, timeouts and ambiguous results retain capacity and original identity without another create. Paid native finalization can retry without another charge. Cancellation is a provider request followed by retrieval, including capture winning the race.

Full, partial and multiple refunds select existing original financial units and call Clover's linked original-payment refund endpoint. Independent original-payment/refund evidence is required before settlement. Pending and voided/failed results preserve the existing financial rules; delivered inventory is never automatically restocked. A lost response without a durable provider refund ID is quarantined instead of guessed or resent. The provider's ordinary API does not expose the original refund idempotency key; independently correlated evidence and reviewed future remediation remain necessary in that case.

Optional general REST webhooks verify `X-Clover-Auth`, app, merchant and supported P/A resources, retain durable digested receipts and trigger existing stored-actor recovery. Notifications never prove payment success. Clover's external verification handshake/subscriptions/delivery are not configured or qualified, so polling remains required. App uninstall/revocation handling and same-merchant reconnect preserve original transaction ownership.

The frontend adds Clover to the existing Payment Integrations page, with controlled/Sandbox labels and device controls. Existing POS payment selection, receipt, recovery, Orders and original-unit refund dialogs are extended in place. New `clover.tsx` is a domain controller because Square's location/pairing/OAuth behavior cannot supply Clover's lifecycle. It reuses the shared dashboard, contained Card, Badge, Button, Field, Input, Alert, Spinner and Dialog. It introduces no new primitive, UI library, cart, refund engine, section labels or competing styling system. Existing `pos-payment-dialog` spacing/touch contracts are reused.

## Official interfaces and provider differences

The narrowly scoped HTTPS transport uses Clover `/oauth/v2/token`, `/oauth/v2/refresh`, `/oauth/v2/recovery`, `/connect/v1/payments`, external-ID/payment-ID lookups, linked refunds and device cancellation/ping, plus merchant-scoped v3 merchant/device/payment/refund retrieval. The official Remote Pay Cloud SDK and examples were evaluated but not installed because supported REST endpoints fit the backend-owned coordinator. The [architecture report](STAGE_D_CLOVER_ARCHITECTURE.md) links the primary sources and explains evidence requirements.

Square retains its existing SDK, Terminal checkout, location/pairing, virtual Sandbox terminals, OAuth and signed webhook implementation. Clover instead uses a merchant-provisioned serial, Cloud Pay Display, a separate RAID and single-use refresh/recovery behavior. Both use the same native evidence/payment/refund boundaries. Cash, the Stage B simulator, optional customer association, guest invitation timing, market context and exclusion from both loyalty engines are preserved.

## Qualification

The authoritative [testing report](STAGE_D_TESTING.md) and its `stageDTestLogs` links contain commands, final counts and limitations. The new backend suite passes 22 controlled groups. The focused frontend run passes 50 tests, and the complete frontend suite passes 552 tests. Stage A, B and Square backend suites pass 22, 27 and 28 groups; financial attribution/RefundCoordinator passes 62 groups with nested prior commerce/inventory/catalog/market/identity regressions; vendor and market loyalty pass 33 and 38 groups. The original POS browser suite passes 15 groups. Clover and Square browser qualification uses DOM, keyboard/accessibility and computed geometry only.

Padding and action geometry use 24px composition/footer gaps, 12.8px action gaps, 44px ordinary controls, responsive shared dialog padding of 32/23.04/16px and no horizontal overflow at 1280/768/390px. Checkbox touch geometry measures its complete clickable label, following the existing Square test. Native backend assertions prove one payment, original-unit totals and one inventory decrement; the read-only `demo:pos:clover:verify` helper provides equivalent manual evidence from the current disposable manifest.

TypeScript/Astro, source-only schema extraction/codegen and local builds are qualified as recorded in the testing report. Full lint retains an unrelated existing Prettier failure in the already-modified `packages/ui/package.json`; ESLint and all nine package boundaries pass. Early fixture/harness assumptions and a missing existing dialog class were corrected. Successful disposable databases are removed by their creators; failed diagnostic databases remain retained by their harnesses. No protected database cleanup was attempted.

No actual Clover Sandbox API was tested: the optional Layer C script reports SKIP without explicit configuration, credentials and a fresh code. No physical device was tested. Closed transaction field availability, supported terminal/gateway/firmware behavior, actual refunds, external callbacks/webhooks, receipts, settlement, payouts and app approval/certification remain unverified. Production and non-US configurations fail closed. This is not a claim of production readiness.

## Local files and migration

Backend, `E:/coding/farmers-market-platform`:

- New `src/migrations/1793100000000-CloverInPerson.ts`: additive Clover connection/secret/OAuth/device/operation/webhook tables, indexes, ownership/history guards and provider vocabulary extension. It was applied only to freshly created disposable databases. Its downgrade refuses to erase payment history.
- New `src/plugins/marketplace-commerce/in-person/clover/{contracts,transport,connection.service,provider.service,api,webhooks,oauth.controller}.ts`.
- Targeted additions in existing `in-person/payment-adapter.ts`, `payment-coordinator.ts`, `payment-scope.ts`, plugin `types.ts`, `marketplace-commerce.plugin.ts` and `vendure-config.ts`.
- New `test/in-person/clover.ts`, `clover-fixture.ts`, `clover-sandbox.ts`, `clover-audit.ts`; existing fixture configuration and the adapter-constructor test were extended. No existing payment assertion was weakened.

Web, `E:/coding/farmers-market-platform-web`:

- New `apps/admin/src/vendor/clover.tsx`, `tests/clover.test.tsx` and `scripts/clover-browser.ts`.
- Targeted additions in existing vendor `square.tsx` wrapper, `VendorRoutes.tsx`, `pos-payments.tsx`, `pos.css`, `packages/admin-core/src/index.ts` and `packages/api/src/in-person.ts`.
- Extended `scripts/in-person.ts`, `package.json`, `.gitignore`, `scripts/extract-schema.ts`, source-extracted schemas/provenance and generated API contracts; updated typed POS test fixture.
- Root `COMPONENT_USAGE_GUIDE.md` and `UI_COMPONENTS.md` document the feature composition and existing shared contracts without approving any pending category.

The six Stage D documents are `STAGE_D_IMPLEMENTATION_PLAN.md`, `STAGE_D_CLOVER_ARCHITECTURE.md`, this summary, `STAGE_D_CLOVER_SETUP.md`, `STAGE_D_TESTING.md` and `STAGE_D_HARDWARE_QUALIFICATION.md`. The roadmap is updated. All Stage D implementation reports and retained raw logs are under this directory. Existing unrelated uncommitted work is preserved.

## Manual handoff and remaining stages

From the web directory, use `$env:APP_ENV='test'; $env:NODE_ENV='test'; $env:FRONTEND_NO_EVIDENCE='true'; $env:DB_HOST='127.0.0.1'; npm run demo:pos:clover-fixtures`. Sign in at `http://auth.platform.localhost:4372/account/login`, then use the vendor dashboard on port 4590. The supervisor prints fictional credentials and writes its current `.pos-stage-d-demo/ready.json`. Connect controlled Clover, register `CONTROLLED_FLEX_2`, choose a default, send a sale, reload its uncertainty if desired and approve/decline through the labelled controlled buttons. Inspect native Orders and issue an original-unit refund. `npm run demo:pos:clover:verify` audits native records read-only; `npm run demo:pos:clover:stop` stops only this supervisor's environment.

The [setup guide](STAGE_D_CLOVER_SETUP.md) supplies exact one-line Windows PowerShell 5.1-compatible commands for real Sandbox configuration, secure secret entry and cryptographic key generation. You must obtain the account, semi-integrated Web payment app, App ID, RAID, US test merchant, Read Merchant/Read Payments permissions, Site URL, Alternate Launch Path, secret and exact publicly routed HTTPS callback. No credential values or public URL were invented. A secure callback route and hardware are external prerequisites.

Stage E remains Clover Go/native phone-reader work through supported SDKs, without another commerce coordinator. Stage F remains hardware/provider/production qualification. Stage G remains final in-person vendor/market loyalty integration. No deployment, Production Clover call, real card charge, production credential change, commit, push, remote branch/PR, screenshot, recording or trace occurred. Neither protected database was modified.

A controlled manual instance is left running on ports 4372/4590. Its current database is `vendure_test_pos_demo_1792389881053_7da6ee`; the ignored Stage D manifest remains authoritative. Login is `identity-owner-0@test.invalid`, with fictional password `local-identity-regression-only-password`. The [testing report](STAGE_D_TESTING.md#current-manual-instance) records its current status and logs.
