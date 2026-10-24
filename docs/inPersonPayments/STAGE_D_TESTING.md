# Stage D testing and manual walkthrough

Stage D qualification uses fresh randomized PostgreSQL databases through the existing guarded harness. Neither `vendure` nor `vendure_demo_market_ops` is a test target. Controlled Clover and real Sandbox are separate modes. No screenshots, image snapshots, videos, traces or visual-regression artifacts were generated.

## Results

| Check                                                              | Result                                                                               | Retained log                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Clover adapter plus native coordinator, Layer B                    | 22 groups passed                                                                     | [clover-backend.log](stageDTestLogs/clover-backend.log)         |
| Focused frontend Clover/Square/POS/payment suites                  | 50 tests passed in four files                                                        | [frontend-focused.log](stageDTestLogs/frontend-focused.log)     |
| Full frontend unit suite                                           | 552 tests passed in 44 files                                                         | [frontend-all.log](stageDTestLogs/frontend-all.log)             |
| Clover browser, including settings, native sale, reload and refund | 6 groups and native audit passed                                                     | [clover-browser.log](stageDTestLogs/clover-browser.log)         |
| Existing Square browser regression in the separate Stage D demo    | 5 groups passed                                                                      | [clover-browser.log](stageDTestLogs/clover-browser.log)         |
| Existing POS browser regression on separate 4592/4374 ports        | 15 groups passed                                                                     | [pos-browser.log](stageDTestLogs/pos-browser.log)               |
| Stage A backend                                                    | 22 checks passed                                                                     | [pos-a.log](stageDTestLogs/pos-a.log)                           |
| Stage B cash/simulator/payments                                    | 27 groups passed                                                                     | [pos-b.log](stageDTestLogs/pos-b.log)                           |
| Stage C Square SDK fixtures                                        | 28 groups passed, zero Square API calls                                              | [square.log](stageDTestLogs/square.log)                         |
| Financial attribution and RefundCoordinator                        | 62 groups passed, with nested commerce/inventory/catalog/market/identity regressions | [financial-commerce.log](stageDTestLogs/financial-commerce.log) |
| Vendor loyalty                                                     | 33 groups passed                                                                     | [vendor-loyalty.log](stageDTestLogs/vendor-loyalty.log)         |
| Market loyalty                                                     | 38 groups passed                                                                     | [market-loyalty.log](stageDTestLogs/market-loyalty.log)         |
| TypeScript and Astro                                               | Passed, 95 Astro files with zero errors/warnings/hints                               | [typecheck.log](stageDTestLogs/typecheck.log)                   |
| Backend test TypeScript                                            | Passed                                                                               | [backend-types.log](stageDTestLogs/backend-types.log)           |
| Frontend local build                                               | Passed, existing chunk-size warnings                                                 | [frontend-build.log](stageDTestLogs/frontend-build.log)         |
| Synthetic production local builds                                  | Passed after final callback and credential revision changes                          | [production-build.log](stageDTestLogs/production-build.log)     |
| GraphQL source extraction/codegen                                  | Passed, no database bootstrap                                                        | [schema.log](stageDTestLogs/schema.log)                         |
| Production bundle markers                                          | Passed, 125 artifacts checked                                                        | [bundles.log](stageDTestLogs/bundles.log)                       |
| Formatting of Stage D changed files                                | Passed                                                                               | [format-check.log](stageDTestLogs/format-check.log)             |
| ESLint and package boundaries                                      | Passed; nine workspaces valid                                                        | [lint.log](stageDTestLogs/lint.log)                             |
| Full formatting check                                              | Existing unrelated `packages/ui/package.json` formatting failure                     | [lint.log](stageDTestLogs/lint.log)                             |
| Actual Clover Sandbox, Layer C                                     | SKIPPED, configuration/credentials absent; zero real API calls                       | [clover-sandbox.log](stageDTestLogs/clover-sandbox.log)         |
| Physical device, Layer D                                           | Unverified                                                                           | [Hardware matrix](STAGE_D_HARDWARE_QUALIFICATION.md)            |

The full frontend run preceded the final OAuth callback-handoff extension. The focused suites and final type checks were rerun after that extension. Raw output is retained once, in `stageDTestLogs`, instead of duplicated across reports.

## Automated coverage and limits

Clover Layer B covers confidential code exchange, forged/expired/replayed state, wrong vendor/session and merchant, encrypted persistence, serialized concurrent refresh, single-use recovery, merchant device provisioning, unsupported/missing device, missing RAID, defaults and availability. It exercises real native orders, capacity, payments, financial units and stock; partial/multiple refunds, over-refund rejection, no restock; decline, cancellation races, lost response, pending reload, terminal conflicts, removal/disconnect protection, amount/currency/merchant/device/reference/ID mismatches, immutable SQL guards, encrypted HTTPS callback handoff, independently paid finalization retry, authenticated duplicate webhooks, revocation/reconnect, pending/voided refunds and lost-refund-ID quarantine. Cash and simulator coexist in the same suite.

Existing Stage B regressions provide actor/refund privilege checks, quote expiry/staleness, current inventory, original-unit tax/discount accounting, completed-sale guest invitations, customer linkage, market occurrence attribution and both loyalty exclusions. Existing financial regressions include RefundCoordinator, native-commerce, canonical capacity, publication and identity phases. Tests were not weakened or skipped to accept a new implementation. The Stage B simulator guard admits the additional strictly randomized `vendure_test_pos_clover_<timestamp>_<hex>` disposable name, with the same loopback/public/runtime protections.

The browser tests inspect DOM, keyboard controls, serious/critical axe findings and computed geometry at 1280, 768 and 390px. Expected contracts are 24px composition gaps and footer separation, at least 12px action gaps, 44px ordinary touch controls, at least 16px contained-card padding, and no horizontal overflow. Native dialog padding is 32px, 23.04px and 16px at those widths. Clover settings, registration, payment/receipt and original-unit refund dialogs passed these checks. The same run also passed the original Square browser suite and the read-only native payment/unit/inventory audit.

Fixture responses are controlled HTTP contracts. They do not establish that Clover's actual provider expands every required field for this test merchant, or that a supported terminal is available. Incomplete real evidence fails closed. Refunds with a lost ID cannot currently be safely matched to an original operation automatically; they remain protected and require independently correlated provider evidence. General webhook registration/verification and real delivery are not qualified. See the architecture and hardware matrix for exact limitations.

## Reproduce automated checks

Run these one-line PowerShell commands individually from the web directory. No protected database migration is needed.

```powershell
Set-Location E:\coding\farmers-market-platform-web
```

```powershell
$env:APP_ENV='test'; $env:NODE_ENV='test'; $env:FRONTEND_NO_EVIDENCE='true'; $env:DB_HOST='127.0.0.1'; npm run test:pos:clover
```

```powershell
npm run test:pos:clover-browser
```

```powershell
npm test
```

```powershell
npm run typecheck
```

```powershell
npm run build
```

```powershell
npm run build:production-local
```

The last helper supplies ephemeral synthetic Production build values and never bootstraps a database, deploys or calls a payment provider. Direct backend dashboard builds require the repository's existing explicit environment policy and should use this helper.

```powershell
npm run lint
```

The unrelated already-modified UI manifest remains a formatting failure. Do not run repository-wide format to change unrelated work just to clear it.

## Controlled manual walkthrough

Start `npm run demo:pos:clover-fixtures` using the exact environment command in [setup](STAGE_D_CLOVER_SETUP.md). It creates one new disposable database and uses 4372/4590. Keep it running. Use its printed credentials and `.pos-stage-d-demo/ready.json`, not an earlier demo manifest.

1. Log in at `http://auth.platform.localhost:4372/account/login` as `identity-owner-0@test.invalid`. The supervisor prints the fictional password. Open the first vendor dashboard on `http://localhost:4590` using its manifest channel/account bridge.
2. Open Settings, Payment Integrations. Inspect Clover's Sandbox, controlled-test and Remote App ID indicators. Square remains a separate integration on the same page.
3. Choose Connect Clover controlled test. This exercises state/code consumption, credential encryption and merchant verification against the controlled backend HTTP adapter. It is not genuine merchant authorization or Clover Sandbox.
4. Choose Add Clover device. Keep prefilled serial `CONTROLLED_FLEX_2`, enter a label, register, then choose Use as default. Its availability is unverified until Check Clover connectivity succeeds. That check is timestamped reachability, not a guarantee the terminal remains online.
5. Open In-Person Checkout. Add products, choose variants where necessary and change a quantity to at least two for a later partial refund. Product labels, totals and inventory are real native fixture data.
6. Optionally select a saved market-context draft or choose the fixture occurrence. Optionally associate the manifest's existing customer email/phone, or select guest invitation intent. No OTP or customer-session privilege is granted. Review the authoritative quote and continue to payment.
7. Choose Clover - Controlled Test and the registered device. Send to Clover. It remains uncertain because the controlled terminal starts pending. No real card is charged.
8. Reload the browser before approval. Choose Check payment for order on the register. Confirm that the same pending operation and amount reappear. Do not start another charge.
9. Choose Approve controlled Clover payment. The backend adapter retrieves the original fixture transaction, verifies it independently and completes the native sale. Inspect the receipt's Clover merchant/payment/reference, context, customer and amount.
10. Choose View Order. Verify the existing Vendor Orders surface shows the in-person completed sale and its financial units. In a second terminal in the web directory, run `npm run demo:pos:clover:verify`. This guarded read-only audit selects only the current Stage D disposable database from its manifest and verifies one native payment, original paid-unit totals and an exact physical SALE movement for each handed-off quantity. It also verifies declined/cancelled sales have no payment or handoff. The browser suite runs the same audit before teardown.
11. Choose Record refund, select one original unit and enter a reason. Submit Request Clover refund. Confirm SETTLED history, the remaining unreserved units and partially refunded status. Selecting all remaining units issues an exact remaining-amount refund through the same original payment. Delivered stock is not automatically restored.
12. Start a new checkout and send it through Clover, then choose Decline controlled Clover payment. It must not show a completed receipt or decrement physical stock. Start a fresh draft for a new sale; the original one-attempt-per-draft invariant remains.
13. Start another pending Clover sale, leave it uncertain, reload and check its original status. This exercises the UI's unknown-outcome/reload path. Transport timeouts and lost responses are exercised by `test:pos:clover`; there is no browser force-success operation for real providers.
14. While a Clover sale is unresolved, try another register checkout on that device, device removal or disconnect. The backend prevents conflicts. Request Clover cancellation and check the original result. Approval winning a cancellation race is covered by the controlled backend suite.
15. Complete an associated-customer/market-context sale. Confirm receipt attribution and existing customer purchase behavior. Guest invitations follow completed sales only. In-person vendor points and market challenge progress remain excluded; their native regression suites verify this boundary.
16. Switch a new checkout to Cash and confirm actual fixture cash receipt, or use the Stage B simulator's clearly labelled test outcomes. Square's independently labelled fixture remains available in this disposable demo. Its original browser suite runs after Clover's checks under `test:pos:clover-browser`.
17. Inspect desktop/tablet/mobile layouts through browser resizing without capturing images. Check dialog padding, action wrapping, keyboard focus and no horizontal overflow. The automated geometry/accessibility assertions cover the exact sizes above.
18. Stop through `npm run demo:pos:clover:stop`. The supervisor removes only its own successful disposable database. No screenshots, recordings or traces are produced.

## Actual Sandbox walkthrough

Follow [developer setup](STAGE_D_CLOVER_SETUP.md) for the account, app, RAID, merchant, permissions, secret input, encryption keyring, exact registered HTTPS callback and original local return URL. Run `demo:pos:clover-sandbox`, authenticate as the fictional vendor, open Payment Integrations and complete genuine Clover authorization. Inspect the merchant and accessible device list. Real Sandbox does not get controlled buttons or a fabricated virtual Clover device.

Use the optional nonfinancial Sandbox script only with explicit opt-in and a separate fresh unconsumed code. Record actual results separately from fixtures. Without supported hardware, do not claim a successful card-present payment. Defer card authorization, cancellation, physical receipt/refund and payout tests to the hardware checklist. Missing webhook delivery cannot complete a payment.

## Diagnostics and remaining issues

Early local qualification runs exposed incorrect test assumptions about the existing anonymous invitation marker, test-module resolution, fixture refund keys and the extra disposable database label. These were corrected without weakening commerce assertions. Failed diagnostic databases were retained by their owning harnesses. Successful qualification databases were removed by their creators.

Initial browser geometry caught a missing existing `pos-payment-dialog` class in Clover settings dialogs. Reusing that class restored the approved touch height and footer gap; shared components and CSS contracts were not redefined. An initial direct backend build was refused by its existing environment policy; synthetic local build configuration passes. The older financial regression target required replacing the new helper's `replaceAll` with an equivalent regular expression. Existing React act/navigation test notices, PostgreSQL concurrent-query deprecation, JSX AST diagnostic and build chunk warnings remain diagnostic output rather than suppressed failures.

No actual Clover Sandbox APIs or hardware were qualified. Production and non-US regions remain disabled. The ambiguous lost-refund-ID path and external webhook setup handshake remain explicit limits, not silently successful features. No protected database, credential, deployment, commit, push or remote Git action was performed.

## Current manual instance

At handoff on October 19, 2026, a fresh controlled demo remains running on 4372/4590 with database `vendure_test_pos_demo_1792389881053_7da6ee`. Sign in as `identity-owner-0@test.invalid` with fictional password `local-identity-regression-only-password`. This instance starts with no connected Clover merchant; follow the controlled connection/device walkthrough. Its existing Square fixture and native cash/simulator sale histories are seeded independently. The current manifest is authoritative after any restart. See [manual-demo.log](stageDTestLogs/manual-demo.log) and [manual-audit.log](stageDTestLogs/manual-audit.log). The prior noninteractive launch safely shut down and removed only its own database when stdin closed; this instance uses a persistent terminal.
